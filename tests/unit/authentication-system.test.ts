import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { authService } from '../../src/lib/auth/auth-service';
import { authRepository } from '../../src/lib/auth/store';
import { authRateLimiter } from '../../src/lib/auth/rate-limiter';
import bcrypt from 'bcryptjs';

describe('Authentication System — Unit & Integration Test Suite', () => {
  beforeEach(() => {
    authRepository.resetStoreForTesting();
    authRateLimiter.clear();
  });

  // ─── 1. Registration Tests ──────────────────────────────────────────────────
  describe('1. Registration Workflows', () => {
    it('successfully registers a standard user account with default USER role', async () => {
      const res = await authService.registerUser({
        name: 'Alice Nakamoto',
        email: 'alice@trackingcrypt.test',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        acceptTerms: true,
      });

      assert.strictEqual(res.success, true);
      assert.ok(res.data);
      assert.strictEqual(res.data.email, 'alice@trackingcrypt.test');
      assert.strictEqual(res.data.name, 'Alice Nakamoto');
      assert.strictEqual(res.data.role, 'USER');
      assert.strictEqual(res.data.isActive, true);

      // Verify password was securely hashed (not stored in plaintext)
      const stored = await authRepository.getUserByEmail('alice@trackingcrypt.test');
      assert.ok(stored);
      assert.notStrictEqual(stored.passwordHash, 'Password123!');
      const matches = await bcrypt.compare('Password123!', stored.passwordHash!);
      assert.strictEqual(matches, true);
    });

    it('rejects registration with invalid email format', async () => {
      const res = await authService.registerUser({
        name: 'Bob',
        email: 'not-an-email',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        acceptTerms: true,
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'VALIDATION_ERROR');
    });

    it('rejects registration when required fields are missing', async () => {
      const res = await authService.registerUser({
        name: '',
        email: 'bob@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        acceptTerms: true,
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'VALIDATION_ERROR');
    });

    it('rejects registration when passwords do not match', async () => {
      const res = await authService.registerUser({
        name: 'Charlie',
        email: 'charlie@trackingcrypt.test',
        password: 'Password123!',
        confirmPassword: 'MismatchPassword123!',
        acceptTerms: true,
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'VALIDATION_ERROR');
      assert.match(res.error || '', /match/i);
    });

    it('rejects duplicate registration using an existing email address', async () => {
      await authService.registerUser({
        name: 'Original User',
        email: 'duplicate@trackingcrypt.test',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        acceptTerms: true,
      });

      const secondAttempt = await authService.registerUser({
        name: 'Imposter User',
        email: 'duplicate@trackingcrypt.test',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        acceptTerms: true,
      });

      assert.strictEqual(secondAttempt.success, false);
      assert.strictEqual(secondAttempt.code, 'EMAIL_EXISTS');
    });

    it('prevents privilege escalation: public registration always forces USER role', async () => {
      // Attacker attempts to inject role: 'ADMIN'
      const maliciousPayload = {
        name: 'Hacker Joe',
        email: 'hacker@trackingcrypt.test',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        acceptTerms: true,
        role: 'ADMIN',
      };

      const res = await authService.registerUser(maliciousPayload);
      assert.strictEqual(res.success, true);
      assert.ok(res.data);
      // Ensure role is strictly USER
      assert.strictEqual(res.data.role, 'USER');

      const stored = await authRepository.getUserByEmail('hacker@trackingcrypt.test');
      assert.strictEqual(stored?.role, 'USER');
    });

    it('rejects registration if terms and conditions are not accepted', async () => {
      const res = await authService.registerUser({
        name: 'No Terms',
        email: 'noterms@trackingcrypt.test',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        acceptTerms: false,
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'VALIDATION_ERROR');
    });
  });

  // ─── 2. Sign-in Tests ───────────────────────────────────────────────────────
  describe('2. Sign-In & Authentication Workflows', () => {
    it('authenticates valid user credentials successfully', async () => {
      const res = await authService.authenticate('user@trackingcrypt.com', 'User@123456');
      assert.strictEqual(res.success, true);
      assert.ok(res.data);
      assert.strictEqual(res.data.email, 'user@trackingcrypt.com');
      assert.strictEqual(res.data.role, 'USER');
    });

    it('rejects invalid password with generic error message', async () => {
      const res = await authService.authenticate('user@trackingcrypt.com', 'WrongPassword123!');
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'INVALID_CREDENTIALS');
      assert.match(res.error || '', /invalid email address or password/i);
    });

    it('rejects unknown email address with generic error message (prevents enumeration)', async () => {
      const res = await authService.authenticate('nonexistent@trackingcrypt.test', 'Password123!');
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'INVALID_CREDENTIALS');
      assert.match(res.error || '', /invalid email address or password/i);
    });

    it('rejects sign-in for deactivated / inactive accounts', async () => {
      const user = await authRepository.getUserByEmail('user@trackingcrypt.com');
      assert.ok(user);
      await authRepository.updateUser(user.id, { isActive: false });

      const res = await authService.authenticate('user@trackingcrypt.com', 'User@123456');
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'ACCOUNT_DEACTIVATED');
    });

    it('enforces rate limiting after repeated failed login attempts', async () => {
      const email = 'target@trackingcrypt.test';
      const ip = '192.168.1.100';

      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await authService.authenticate(email, 'badpass', undefined, ip);
      }

      // 6th attempt should be blocked by rate limiter
      const blocked = await authService.authenticate(email, 'badpass', undefined, ip);
      assert.strictEqual(blocked.success, false);
      assert.strictEqual(blocked.code, 'RATE_LIMITED');
    });
  });

  // ─── 3. Administrator Access Control Tests ──────────────────────────────────
  describe('3. Administrator Access Control Workflows', () => {
    it('authenticates root administrator account successfully', async () => {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@trackingcrypt.com';
      const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@123456';

      const res = await authService.authenticate(adminEmail, adminPassword, 'ADMIN');
      assert.strictEqual(res.success, true);
      assert.ok(res.data);
      assert.strictEqual(res.data.role, 'ADMIN');
    });

    it('strictly rejects standard user accounts from authenticating at administrator portal', async () => {
      const res = await authService.authenticate('user@trackingcrypt.com', 'User@123456', 'ADMIN');
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'FORBIDDEN');
      assert.match(res.error || '', /administrator privileges are required/i);
    });

    it('allows administrator to view telemetry user list', async () => {
      const admin = await authRepository.getUserByEmail('admin@trackingcrypt.com');
      assert.ok(admin);

      const res = await authService.getAdminUsers(admin.id);
      assert.strictEqual(res.success, true);
      assert.ok(Array.isArray(res.data));
      assert.ok(res.data.length >= 2);
    });

    it('blocks non-admin user from accessing admin user list', async () => {
      const regular = await authRepository.getUserByEmail('user@trackingcrypt.com');
      assert.ok(regular);

      const res = await authService.getAdminUsers(regular.id);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'FORBIDDEN');
    });

    it('prevents administrator from deactivating their own administrative account', async () => {
      const admin = await authRepository.getUserByEmail('admin@trackingcrypt.com');
      assert.ok(admin);

      const res = await authService.setAccountStatus(admin.id, admin.id, false);
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'CANNOT_DEACTIVATE_SELF');
    });

    it('allows administrator to toggle another user status', async () => {
      const admin = await authRepository.getUserByEmail('admin@trackingcrypt.com');
      const regular = await authRepository.getUserByEmail('user@trackingcrypt.com');
      assert.ok(admin && regular);

      const suspendRes = await authService.setAccountStatus(admin.id, regular.id, false);
      assert.strictEqual(suspendRes.success, true);
      assert.strictEqual(suspendRes.data?.isActive, false);

      const reactivateRes = await authService.setAccountStatus(admin.id, regular.id, true);
      assert.strictEqual(reactivateRes.success, true);
      assert.strictEqual(reactivateRes.data?.isActive, true);
    });
  });

  // ─── 4. Password Recovery Tests ─────────────────────────────────────────────
  describe('4. Password Recovery Workflows', () => {
    it('returns generic response for password reset request (prevents enumeration)', async () => {
      const unknownRes = await authService.requestPasswordReset('unknown@trackingcrypt.test');
      assert.match(unknownRes.message, /password reset instructions have been generated/i);

      const knownRes = await authService.requestPasswordReset('user@trackingcrypt.com');
      assert.match(knownRes.message, /password reset instructions have been generated/i);
    });

    it('successfully resets password with a valid, unexpired token', async () => {
      const reqRes = await authService.requestPasswordReset('user@trackingcrypt.com');
      assert.ok(reqRes.devResetUrl);

      // Extract raw token from url
      const url = new URL(reqRes.devResetUrl);
      const token = url.searchParams.get('token');
      assert.ok(token);

      const resetRes = await authService.resetPassword({
        token,
        password: 'NewStrongPassword123!',
        confirmPassword: 'NewStrongPassword123!',
      });

      assert.strictEqual(resetRes.success, true);

      // Verify sign in with old password fails
      const oldAuth = await authService.authenticate('user@trackingcrypt.com', 'User@123456');
      assert.strictEqual(oldAuth.success, false);

      // Verify sign in with new password succeeds
      const newAuth = await authService.authenticate('user@trackingcrypt.com', 'NewStrongPassword123!');
      assert.strictEqual(newAuth.success, true);
    });

    it('rejects password reset with an already-used token', async () => {
      const reqRes = await authService.requestPasswordReset('user@trackingcrypt.com');
      const url = new URL(reqRes.devResetUrl!);
      const token = url.searchParams.get('token')!;

      // First use succeeds
      await authService.resetPassword({
        token,
        password: 'FirstReset123!',
        confirmPassword: 'FirstReset123!',
      });

      // Second use with same token fails immediately
      const reuseRes = await authService.resetPassword({
        token,
        password: 'SecondReset123!',
        confirmPassword: 'SecondReset123!',
      });

      assert.strictEqual(reuseRes.success, false);
      assert.strictEqual(reuseRes.code, 'TOKEN_ALREADY_USED');
    });

    it('rejects password reset with an invalid or tampered token', async () => {
      const res = await authService.resetPassword({
        token: 'this-token-does-not-exist-in-store-123456',
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'INVALID_TOKEN');
    });

    it('rejects password reset when token has expired', async () => {
      const user = await authRepository.getUserByEmail('user@trackingcrypt.com');
      assert.ok(user);

      // Create an expired token (expired 10 minutes ago)
      const rawToken = 'expired-token-fixture-1234567890abcdef';
      const crypto = await import('crypto');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await authRepository.createPasswordResetToken({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() - 10 * 60 * 1000),
      });

      const res = await authService.resetPassword({
        token: rawToken,
        password: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      });

      assert.strictEqual(res.success, false);
      assert.strictEqual(res.code, 'TOKEN_EXPIRED');
    });
  });
});
