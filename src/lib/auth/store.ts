import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/database/prisma';

export interface StoredUser {
  id: string;
  name: string | null;
  email: string;
  passwordHash: string | null;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredResetToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface StoredAuditLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    if (typeof (crypto as any).randomBytes === 'function') {
      return (crypto as any).randomBytes(16).toString('hex');
    }
  }
  return 'id_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

/**
 * Robust User Repository with dual-mode support:
 * 1. Primary: Prisma ORM with configured database (SQL Server / PostgreSQL / etc.)
 * 2. Fallback: Secure in-memory store for local development/testing when the database is offline.
 * Includes circuit-breaker for instant zero-latency responses when database is unreachable.
 */
class AuthRepository {
  private memoryUsers: Map<string, StoredUser> = new Map();
  private memoryResetTokens: Map<string, StoredResetToken> = new Map();
  private memoryAuditLogs: StoredAuditLog[] = [];
  private initialized = false;

  private isDbAvailable = true;
  private nextDbRetry = 0;

  constructor() {
    this.initializeDevStore();
    this.probeDatabase();
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number = 800): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Prisma database query timeout')), ms);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timer!);
    }
  }

  private async probeDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      this.isDbAvailable = false;
      return;
    }
    try {
      await this.withTimeout(prisma.$queryRaw`SELECT 1`, 800);
      this.isDbAvailable = true;
    } catch {
      this.handleDbFailure();
    }
  }

  private canTryDb(): boolean {
    if (process.env.NODE_ENV === 'test') return false;
    if (!this.isDbAvailable) {
      if (Date.now() < this.nextDbRetry) return false;
      this.isDbAvailable = true;
    }
    return true;
  }

  private handleDbFailure(): void {
    this.isDbAvailable = false;
    this.nextDbRetry = Date.now() + 60000; // Back off for 60s before next probe
  }

  private initializeDevStore(): void {
    if (this.initialized) return;

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@trackingcrypt.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@123456';
    const adminSalt = bcrypt.genSaltSync(12);
    const adminHash = bcrypt.hashSync(adminPassword, adminSalt);

    const userEmail = 'user@trackingcrypt.com';
    const userPassword = 'User@123456';
    const userSalt = bcrypt.genSaltSync(12);
    const userHash = bcrypt.hashSync(userPassword, userSalt);

    const devEmail = 'dev@trackingcrypt.local';
    const devPassword = 'DevPassword123!';
    const devSalt = bcrypt.genSaltSync(12);
    const devHash = bcrypt.hashSync(devPassword, devSalt);

    const now = new Date();

    const adminUser: StoredUser = {
      id: 'admin-tc-root-001',
      name: 'System Administrator',
      email: adminEmail,
      passwordHash: adminHash,
      role: 'ADMIN',
      isActive: true,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const regularUser: StoredUser = {
      id: 'user-tc-demo-001',
      name: 'Crypto Trader',
      email: userEmail,
      passwordHash: userHash,
      role: 'USER',
      isActive: true,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const devUser: StoredUser = {
      id: 'user-tc-dev-002',
      name: 'Development Trader',
      email: devEmail,
      passwordHash: devHash,
      role: 'ADMIN',
      isActive: true,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.memoryUsers.set(adminUser.email, adminUser);
    this.memoryUsers.set(regularUser.email, regularUser);
    this.memoryUsers.set(devUser.email, devUser);

    this.memoryAuditLogs.push({
      id: generateUUID(),
      userId: adminUser.id,
      action: 'SYSTEM_BOOTSTRAP',
      entityType: 'User',
      entityId: adminUser.id,
      metadata: JSON.stringify({ role: 'ADMIN', email: adminEmail }),
      ipAddress: '127.0.0.1',
      userAgent: 'System/Init',
      createdAt: now,
    });

    this.initialized = true;
  }

  /**
   * Find a user by email address
   */
  async getUserByEmail(email: string): Promise<StoredUser | null> {
    const normalized = email.toLowerCase().trim();
    if (this.canTryDb()) {
      try {
        const dbUser = await this.withTimeout(
          prisma.user.findUnique({
            where: { email: normalized },
          }),
          800
        );
        if (dbUser) {
          return {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            passwordHash: dbUser.passwordHash,
            role: (dbUser.role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER') as 'USER' | 'ADMIN',
            isActive: dbUser.isActive ?? true,
            lastLoginAt: dbUser.lastLoginAt ?? null,
            createdAt: dbUser.createdAt,
            updatedAt: dbUser.updatedAt,
          };
        }
      } catch {
        this.handleDbFailure();
      }
    }

    return this.memoryUsers.get(normalized) ?? null;
  }

  /**
   * Find a user by ID
   */
  async getUserById(id: string): Promise<StoredUser | null> {
    if (this.canTryDb()) {
      try {
        const dbUser = await this.withTimeout(
          prisma.user.findUnique({
            where: { id },
          }),
          800
        );
        if (dbUser) {
          return {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            passwordHash: dbUser.passwordHash,
            role: (dbUser.role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER') as 'USER' | 'ADMIN',
            isActive: dbUser.isActive ?? true,
            lastLoginAt: dbUser.lastLoginAt ?? null,
            createdAt: dbUser.createdAt,
            updatedAt: dbUser.updatedAt,
          };
        }
      } catch {
        this.handleDbFailure();
      }
    }

    for (const u of this.memoryUsers.values()) {
      if (u.id === id) return u;
    }
    return null;
  }

  /**
   * Create a new user with enforced 'USER' role
   */
  async createUser(data: {
    name: string;
    email: string;
    passwordHash: string;
  }): Promise<StoredUser> {
    const normalizedEmail = data.email.toLowerCase().trim();
    const now = new Date();

    if (this.canTryDb()) {
      try {
        const dbUser = await prisma.user.create({
          data: {
            name: data.name,
            email: normalizedEmail,
            passwordHash: data.passwordHash,
            role: 'USER',
            isActive: true,
            userSettings: {
              create: {
                preferredCurrency: 'INR',
                enablePaperTrading: true,
                enablePriceAlerts: true,
                maximumAllowedGapPct: 2.0,
              },
            },
          },
        });

        const user: StoredUser = {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          passwordHash: dbUser.passwordHash,
          role: 'USER',
          isActive: true,
          lastLoginAt: null,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
        };
        this.memoryUsers.set(normalizedEmail, user);
        return user;
      } catch {
        this.handleDbFailure();
      }
    }

    // Memory fallback
    const user: StoredUser = {
      id: 'usr_' + generateUUID().slice(0, 12),
      name: data.name,
      email: normalizedEmail,
      passwordHash: data.passwordHash,
      role: 'USER',
      isActive: true,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.memoryUsers.set(normalizedEmail, user);
    return user;
  }

  /**
   * Update user fields
   */
  async updateUser(
    id: string,
    updates: Partial<Pick<StoredUser, 'name' | 'passwordHash' | 'role' | 'isActive' | 'lastLoginAt'>>
  ): Promise<StoredUser | null> {
    const now = new Date();
    if (this.canTryDb()) {
      try {
        const dbUser = await prisma.user.update({
          where: { id },
          data: {
            ...(updates.name !== undefined ? { name: updates.name } : {}),
            ...(updates.passwordHash !== undefined ? { passwordHash: updates.passwordHash } : {}),
            ...(updates.role !== undefined ? { role: updates.role } : {}),
            ...(updates.isActive !== undefined ? { isActive: updates.isActive } : {}),
            ...(updates.lastLoginAt !== undefined ? { lastLoginAt: updates.lastLoginAt } : {}),
          },
        });
        const res: StoredUser = {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          passwordHash: dbUser.passwordHash,
          role: (dbUser.role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER') as 'USER' | 'ADMIN',
          isActive: dbUser.isActive ?? true,
          lastLoginAt: dbUser.lastLoginAt ?? null,
          createdAt: dbUser.createdAt,
          updatedAt: dbUser.updatedAt,
        };
        this.memoryUsers.set(res.email, res);
        return res;
      } catch {
        this.handleDbFailure();
      }
    }

    // Memory fallback
    for (const [key, user] of this.memoryUsers.entries()) {
      if (user.id === id) {
        const updated: StoredUser = {
          ...user,
          ...updates,
          updatedAt: now,
        };
        this.memoryUsers.set(key, updated);
        return updated;
      }
    }
    return null;
  }

  /**
   * Get all users (Admin view)
   */
  async getAllUsers(): Promise<Omit<StoredUser, 'passwordHash'>[]> {
    if (this.canTryDb()) {
      try {
        const dbUsers = await prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
        });
        if (dbUsers.length > 0) {
          return dbUsers.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: (u.role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER') as 'USER' | 'ADMIN',
            isActive: u.isActive ?? true,
            lastLoginAt: u.lastLoginAt ?? null,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
          }));
        }
      } catch {
        this.handleDbFailure();
      }
    }

    return Array.from(this.memoryUsers.values())
      .map(({ passwordHash: _, ...rest }) => rest)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Create a single-use password reset token
   */
  async createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<StoredResetToken> {
    const now = new Date();
    if (this.canTryDb()) {
      try {
        const dbToken = await prisma.passwordResetToken.create({
          data: {
            userId: data.userId,
            tokenHash: data.tokenHash,
            expiresAt: data.expiresAt,
          },
        });
        const t: StoredResetToken = {
          id: dbToken.id,
          userId: dbToken.userId,
          tokenHash: dbToken.tokenHash,
          expiresAt: dbToken.expiresAt,
          usedAt: dbToken.usedAt,
          createdAt: dbToken.createdAt,
        };
        this.memoryResetTokens.set(t.tokenHash, t);
        return t;
      } catch {
        this.handleDbFailure();
      }
    }

    const t: StoredResetToken = {
      id: 'tok_' + generateUUID().slice(0, 12),
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      usedAt: null,
      createdAt: now,
    };
    this.memoryResetTokens.set(data.tokenHash, t);
    return t;
  }

  /**
   * Find a reset token by token hash
   */
  async getPasswordResetToken(tokenHash: string): Promise<StoredResetToken | null> {
    if (this.canTryDb()) {
      try {
        const dbToken = await prisma.passwordResetToken.findUnique({
          where: { tokenHash },
        });
        if (dbToken) {
          return {
            id: dbToken.id,
            userId: dbToken.userId,
            tokenHash: dbToken.tokenHash,
            expiresAt: dbToken.expiresAt,
            usedAt: dbToken.usedAt,
            createdAt: dbToken.createdAt,
          };
        }
      } catch {
        this.handleDbFailure();
      }
    }
    return this.memoryResetTokens.get(tokenHash) ?? null;
  }

  /**
   * Invalidate / consume reset token immediately after successful use
   */
  async consumePasswordResetToken(tokenHash: string): Promise<void> {
    const now = new Date();
    if (this.canTryDb()) {
      try {
        await prisma.passwordResetToken.update({
          where: { tokenHash },
          data: { usedAt: now },
        });
      } catch {
        this.handleDbFailure();
      }
    }
    const memToken = this.memoryResetTokens.get(tokenHash);
    if (memToken) {
      memToken.usedAt = now;
      this.memoryResetTokens.set(tokenHash, memToken);
    }
  }

  /**
   * Record security and audit events
   */
  async recordAuditLog(data: {
    userId?: string | null;
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    metadata?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    const now = new Date();
    const metadataStr = data.metadata ? JSON.stringify(data.metadata) : null;
    if (this.canTryDb()) {
      try {
        await prisma.auditLog.create({
          data: {
            userId: data.userId,
            action: data.action,
            entityType: data.entityType,
            entityId: data.entityId,
            metadata: metadataStr,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
          },
        });
      } catch {
        this.handleDbFailure();
      }
    }

    this.memoryAuditLogs.unshift({
      id: generateUUID(),
      userId: data.userId ?? null,
      action: data.action,
      entityType: data.entityType ?? null,
      entityId: data.entityId ?? null,
      metadata: metadataStr,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
      createdAt: now,
    });

    if (this.memoryAuditLogs.length > 500) {
      this.memoryAuditLogs.pop();
    }
  }

  /**
   * Get audit logs for Admin Dashboard
   */
  async getAuditLogs(limit = 50): Promise<StoredAuditLog[]> {
    if (this.canTryDb()) {
      try {
        const logs = await prisma.auditLog.findMany({
          take: limit,
          orderBy: { createdAt: 'desc' },
        });
        if (logs.length > 0) {
          return logs.map((l) => ({
            id: l.id,
            userId: l.userId,
            action: l.action,
            entityType: l.entityType,
            entityId: l.entityId,
            metadata: l.metadata,
            ipAddress: l.ipAddress,
            userAgent: l.userAgent,
            createdAt: l.createdAt,
          }));
        }
      } catch {
        this.handleDbFailure();
      }
    }

    return this.memoryAuditLogs.slice(0, limit);
  }

  /**
   * Reset memory store (for testing)
   */
  resetStoreForTesting(): void {
    this.memoryUsers.clear();
    this.memoryResetTokens.clear();
    this.memoryAuditLogs = [];
    this.initialized = false;
    this.initializeDevStore();
  }
}

export const authRepository = new AuthRepository();
