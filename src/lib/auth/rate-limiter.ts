/**
 * TrackingCrypt Authentication Rate Limiter
 * Implements sliding-window rate limiting for authentication endpoints:
 * - Login attempts: max 5 per 15 minutes per IP/email
 * - Password reset requests: max 3 per 15 minutes per IP/email
 * - Registration attempts: max 10 per hour per IP
 */

interface RateLimitEntry {
  timestamps: number[];
}

class AuthRateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map();

  private getKey(action: string, identifier: string): string {
    return `${action}:${identifier.toLowerCase().trim()}`;
  }

  /**
   * Check whether an action is allowed for an identifier under the specified limit and window.
   */
  isAllowed(
    action: string,
    identifier: string,
    maxAttempts: number = 5,
    windowMs: number = 15 * 60 * 1000
  ): { allowed: boolean; remaining: number; retryAfterMs: number } {
    const key = this.getKey(action, identifier);
    const now = Date.now();
    const entry = this.attempts.get(key) ?? { timestamps: [] };

    // Filter out timestamps outside window
    const recent = entry.timestamps.filter((ts) => now - ts < windowMs);
    this.attempts.set(key, { timestamps: recent });

    if (recent.length >= maxAttempts) {
      const oldest = recent[0];
      const retryAfterMs = Math.max(0, windowMs - (now - oldest));
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs,
      };
    }

    return {
      allowed: true,
      remaining: maxAttempts - recent.length,
      retryAfterMs: 0,
    };
  }

  /**
   * Record a failed attempt
   */
  recordAttempt(action: string, identifier: string): void {
    const key = this.getKey(action, identifier);
    const entry = this.attempts.get(key) ?? { timestamps: [] };
    entry.timestamps.push(Date.now());
    this.attempts.set(key, entry);
  }

  /**
   * Reset rate limit on successful authentication
   */
  reset(action: string, identifier: string): void {
    const key = this.getKey(action, identifier);
    this.attempts.delete(key);
  }

  /**
   * Clear all stored rate limits (useful for test isolation)
   */
  clear(): void {
    this.attempts.clear();
  }
}

export const authRateLimiter = new AuthRateLimiter();
