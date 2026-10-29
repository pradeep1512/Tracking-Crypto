import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { authRepository, StoredUser } from './store';
import { authRateLimiter } from './rate-limiter';
import {
  signUpSchema,
  resetPasswordSchema,
  forgotPasswordSchema,
} from '@/lib/validation/schemas';

export interface AuthResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: unknown;
}

export class AuthService {
  /**
   * Securely register a standard user.
   * Guarantees:
   * - Strong validation
   * - Bcrypt password hashing (rounds = 12)
   * - Forced 'USER' role (prevents privilege escalation)
   * - Duplicate email check
   */
  async registerUser(input: unknown, ipAddress?: string): Promise<AuthResult<Omit<StoredUser, 'passwordHash'>>> {
    const parse = signUpSchema.safeParse(input);
    if (!parse.success) {
      return {
        success: false,
        error: parse.error.issues[0]?.message ?? 'Invalid registration input',
        code: 'VALIDATION_ERROR',
        details: parse.error.issues,
      };
    }

    const { name, email, password } = parse.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check rate limit on registration from this IP
    if (ipAddress) {
      const rateCheck = authRateLimiter.isAllowed('register', ipAddress, 15, 60 * 60 * 1000);
      if (!rateCheck.allowed) {
        return {
          success: false,
          error: 'Too many registration requests. Please try again later.',
          code: 'RATE_LIMITED',
        };
      }
    }

    // Check duplicate email
    const existing = await authRepository.getUserByEmail(normalizedEmail);
    if (existing) {
      if (ipAddress) authRateLimiter.recordAttempt('register', ipAddress);
      return {
        success: false,
        error: 'An account with this email address already exists.',
        code: 'EMAIL_EXISTS',
      };
    }

    // Hash password with salt 12
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user (strictly USER role)
    const newUser = await authRepository.createUser({
      name,
      email: normalizedEmail,
      passwordHash,
    });

    // Record audit event
    await authRepository.recordAuditLog({
      userId: newUser.id,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: newUser.id,
      metadata: { email: normalizedEmail, role: 'USER' },
      ipAddress: ipAddress ?? '127.0.0.1',
    });

    const { passwordHash: _, ...userSafe } = newUser;
    return {
      success: true,
      data: userSafe,
    };
  }

  /**
   * Authenticate user credentials.
   * Supports optional role restriction (e.g. requiredRole: 'ADMIN').
   */
  async authenticate(
    email: string,
    password: string,
    requiredRole?: 'USER' | 'ADMIN',
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult<Omit<StoredUser, 'passwordHash'>>> {
    const normalizedEmail = (email || '').toLowerCase().trim();
    const rateKey = `${normalizedEmail}:${ipAddress || 'unknown'}`;

    // Rate limit check: 5 attempts per 15 minutes
    const rate = authRateLimiter.isAllowed('login', rateKey, 5, 15 * 60 * 1000);
    if (!rate.allowed) {
      await authRepository.recordAuditLog({
        action: 'LOGIN_RATE_LIMITED',
        entityType: 'User',
        metadata: { email: normalizedEmail, requiredRole },
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
      return {
        success: false,
        error: `Too many failed login attempts. Please wait ${Math.ceil(rate.retryAfterMs / 60000)} minutes before trying again.`,
        code: 'RATE_LIMITED',
      };
    }

    const user = await authRepository.getUserByEmail(normalizedEmail);

    if (!user || !user.passwordHash) {
      authRateLimiter.recordAttempt('login', rateKey);
      await authRepository.recordAuditLog({
        action: 'LOGIN_FAILED_UNKNOWN_USER',
        metadata: { email: normalizedEmail, requiredRole },
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
      return {
        success: false,
        error: 'Invalid email address or password.',
        code: 'INVALID_CREDENTIALS',
      };
    }

    // Check if account is active
    if (!user.isActive) {
      await authRepository.recordAuditLog({
        userId: user.id,
        action: 'LOGIN_BLOCKED_INACTIVE_USER',
        metadata: { email: normalizedEmail },
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
      return {
        success: false,
        error: 'Your account has been deactivated. Please contact an administrator.',
        code: 'ACCOUNT_DEACTIVATED',
      };
    }

    // Verify password hash
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      authRateLimiter.recordAttempt('login', rateKey);
      await authRepository.recordAuditLog({
        userId: user.id,
        action: 'LOGIN_FAILED_BAD_PASSWORD',
        metadata: { email: normalizedEmail },
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
      return {
        success: false,
        error: 'Invalid email address or password.',
        code: 'INVALID_CREDENTIALS',
      };
    }

    // Role check if admin login
    if (requiredRole === 'ADMIN' && user.role !== 'ADMIN') {
      authRateLimiter.recordAttempt('login', rateKey);
      await authRepository.recordAuditLog({
        userId: user.id,
        action: 'ADMIN_ACCESS_DENIED_NOT_ADMIN',
        metadata: { email: normalizedEmail, actualRole: user.role },
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
      return {
        success: false,
        error: 'Access Denied: Administrator privileges are required to access this portal.',
        code: 'FORBIDDEN',
      };
    }

    // Success: Reset rate limiter and update lastLoginAt
    authRateLimiter.reset('login', rateKey);
    const updated = await authRepository.updateUser(user.id, {
      lastLoginAt: new Date(),
    });

    await authRepository.recordAuditLog({
      userId: user.id,
      action: user.role === 'ADMIN' ? 'ADMIN_LOGIN_SUCCESS' : 'USER_LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user.id,
      metadata: { role: user.role },
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });

    const activeUser = updated || user;
    const { passwordHash: _, ...safeUser } = activeUser;

    return {
      success: true,
      data: safeUser,
    };
  }

  /**
   * Request password reset token.
   * Guarantees:
   * - Single use cryptographically secure token (SHA-256 stored)
   * - 20 minute expiry
   * - Generic return message regardless of account existence
   * - Rate limiting (3 attempts per 15 minutes)
   */
  async requestPasswordReset(
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ message: string; devResetUrl?: string }> {
    const parse = forgotPasswordSchema.safeParse({ email });
    const genericResponse = {
      message: 'If an account with that email address exists, password reset instructions have been generated.',
    };

    if (!parse.success) return genericResponse;

    const normalizedEmail = parse.data.email.toLowerCase().trim();
    const rateKey = `${normalizedEmail}:${ipAddress || 'unknown'}`;

    // Rate limit
    const rate = authRateLimiter.isAllowed('reset_request', rateKey, 3, 15 * 60 * 1000);
    if (!rate.allowed) {
      return genericResponse;
    }

    const user = await authRepository.getUserByEmail(normalizedEmail);
    if (!user) {
      authRateLimiter.recordAttempt('reset_request', rateKey);
      return genericResponse;
    }

    // Generate random 32-byte hex token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes

    await authRepository.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    await authRepository.recordAuditLog({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'PasswordResetToken',
      metadata: { email: normalizedEmail },
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });

    // In development or if no email service configured, provide devResetUrl
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    return {
      message: genericResponse.message,
      // Provide devResetUrl only in non-production for testing/developer ergonomics
      ...(process.env.NODE_ENV !== 'production' ? { devResetUrl: resetUrl } : {}),
    };
  }

  /**
   * Reset user password using token.
   */
  async resetPassword(
    input: unknown,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult<{ message: string }>> {
    const parse = resetPasswordSchema.safeParse(input);
    if (!parse.success) {
      return {
        success: false,
        error: parse.error.issues[0]?.message ?? 'Invalid password reset input',
        code: 'VALIDATION_ERROR',
        details: parse.error.issues,
      };
    }

    const { token, password } = parse.data;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const storedToken = await authRepository.getPasswordResetToken(tokenHash);

    if (!storedToken) {
      return {
        success: false,
        error: 'This password reset link is invalid or has expired.',
        code: 'INVALID_TOKEN',
      };
    }

    if (storedToken.usedAt) {
      return {
        success: false,
        error: 'This password reset link has already been used.',
        code: 'TOKEN_ALREADY_USED',
      };
    }

    if (new Date() > storedToken.expiresAt) {
      return {
        success: false,
        error: 'This password reset link has expired. Please request a new one.',
        code: 'TOKEN_EXPIRED',
      };
    }

    const user = await authRepository.getUserById(storedToken.userId);
    if (!user) {
      return {
        success: false,
        error: 'Associated user account not found.',
        code: 'USER_NOT_FOUND',
      };
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update user password
    await authRepository.updateUser(user.id, { passwordHash });

    // Invalidate reset token immediately
    await authRepository.consumePasswordResetToken(tokenHash);

    await authRepository.recordAuditLog({
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: user.id,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    });

    return {
      success: true,
      data: {
        message: 'Password has been successfully updated. You may now sign in with your new password.',
      },
    };
  }

  /**
   * Get all users for admin dashboard
   */
  async getAdminUsers(adminUserId: string): Promise<AuthResult<Omit<StoredUser, 'passwordHash'>[]>> {
    const admin = await authRepository.getUserById(adminUserId);
    if (!admin || admin.role !== 'ADMIN') {
      return {
        success: false,
        error: 'Unauthorized: Admin privileges required',
        code: 'FORBIDDEN',
      };
    }

    const users = await authRepository.getAllUsers();
    return {
      success: true,
      data: users,
    };
  }

  /**
   * Update user status (Admin action)
   */
  async setAccountStatus(
    adminUserId: string,
    targetUserId: string,
    isActive: boolean
  ): Promise<AuthResult<StoredUser>> {
    const admin = await authRepository.getUserById(adminUserId);
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized', code: 'FORBIDDEN' };
    }

    if (adminUserId === targetUserId) {
      return {
        success: false,
        error: 'Administrators cannot deactivate their own account.',
        code: 'CANNOT_DEACTIVATE_SELF',
      };
    }

    const updated = await authRepository.updateUser(targetUserId, { isActive });
    if (!updated) {
      return { success: false, error: 'User not found', code: 'USER_NOT_FOUND' };
    }

    await authRepository.recordAuditLog({
      userId: adminUserId,
      action: isActive ? 'USER_ACTIVATED_BY_ADMIN' : 'USER_DEACTIVATED_BY_ADMIN',
      entityType: 'User',
      entityId: targetUserId,
      metadata: { targetUserId, isActive },
    });

    return { success: true, data: updated };
  }

  /**
   * Update user role (Admin action)
   */
  async setAccountRole(
    adminUserId: string,
    targetUserId: string,
    role: 'USER' | 'ADMIN'
  ): Promise<AuthResult<StoredUser>> {
    const admin = await authRepository.getUserById(adminUserId);
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized', code: 'FORBIDDEN' };
    }

    if (adminUserId === targetUserId && role !== 'ADMIN') {
      return {
        success: false,
        error: 'Administrators cannot demote their own account.',
        code: 'CANNOT_DEMOTE_SELF',
      };
    }

    const updated = await authRepository.updateUser(targetUserId, { role });
    if (!updated) {
      return { success: false, error: 'User not found', code: 'USER_NOT_FOUND' };
    }

    await authRepository.recordAuditLog({
      userId: adminUserId,
      action: 'USER_ROLE_CHANGED_BY_ADMIN',
      entityType: 'User',
      entityId: targetUserId,
      metadata: { targetUserId, newRole: role },
    });

    return { success: true, data: updated };
  }

  /**
   * Get audit logs for admin dashboard
   */
  async getAuditLogs(adminUserId: string, limit = 50) {
    const admin = await authRepository.getUserById(adminUserId);
    if (!admin || admin.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized', code: 'FORBIDDEN' };
    }
    const logs = await authRepository.getAuditLogs(limit);
    return { success: true, data: logs };
  }
}

export const authService = new AuthService();
