/**
 * LiveTradingService — Safety Guardrails, Pre-Trade Checks & Emergency Kill Switch.
 *
 * Implements:
 * - Strict defaults: paper trading is default; live trading is disabled
 * - Pre-trade risk validation: max order size caps, maximum slippage tolerance
 * - Rate limiting on order submissions
 * - Emergency Kill Switch that immediately blocks all live trade requests
 * - Audit logging of all safety actions
 */

import { prisma } from '@/lib/database/prisma';

export interface TradingSafetyConfig {
  isLiveTradingEnabled: boolean;
  isPaperTradingDefault: boolean;
  killSwitchActive: boolean;
  maxBuySlippageTolerancePct: number;
  maxOrderQuantityUSD: number;
  maxDailyTradeCount: number;
  rateLimitOrdersPerMinute: number;
}

export class LiveTradingService {
  private config: TradingSafetyConfig = {
    isLiveTradingEnabled: false,
    isPaperTradingDefault: true,
    killSwitchActive: false,
    maxBuySlippageTolerancePct: 1.0,
    maxOrderQuantityUSD: 5_000,
    maxDailyTradeCount: 20,
    rateLimitOrdersPerMinute: 10,
  };

  private orderTimestamps: number[] = [];

  getConfig(): TradingSafetyConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<TradingSafetyConfig>, userId = 'dev_user'): TradingSafetyConfig {
    this.config = { ...this.config, ...updates };

    // Record audit event
    prisma.auditLog.create({
      data: {
        userId,
        action: 'SAFETY_CONFIG_UPDATED',
        entityType: 'TradingSafetyConfig',
        metadata: JSON.stringify(updates),
      },
    }).catch(() => {});

    return this.getConfig();
  }

  /**
   * Emergency Kill Switch: immediately halts or resumes live order submission.
   */
  setKillSwitch(active: boolean, userId = 'dev_user'): TradingSafetyConfig {
    this.config.killSwitchActive = active;
    if (active) {
      this.config.isLiveTradingEnabled = false;
    }

    prisma.auditLog.create({
      data: {
        userId,
        action: active ? 'EMERGENCY_KILL_SWITCH_ENGAGED' : 'KILL_SWITCH_DISENGAGED',
        entityType: 'TradingSafetyConfig',
        metadata: JSON.stringify({ killSwitchActive: active }),
      },
    }).catch(() => {});

    return this.getConfig();
  }

  /**
   * Validate order request against financial safety guardrails before submission.
   */
  validateOrderSafety(params: {
    orderValueUSD: number;
    slippagePct: number;
    isPaperTrade: boolean;
  }): { allowed: boolean; reason?: string } {
    // Paper trades always permitted unless kill switch actively prevents all execution
    if (params.isPaperTrade) {
      return { allowed: true };
    }

    // 1. Kill switch check
    if (this.config.killSwitchActive) {
      return {
        allowed: false,
        reason: 'Emergency Kill Switch is engaged. All live trade submissions are blocked.',
      };
    }

    // 2. Explicit opt-in check
    if (!this.config.isLiveTradingEnabled) {
      return {
        allowed: false,
        reason: 'Live trading is disabled. You must explicitly enable live trading and accept financial risks in Settings.',
      };
    }

    // 3. Max order value cap check
    if (params.orderValueUSD > this.config.maxOrderQuantityUSD) {
      return {
        allowed: false,
        reason: `Order value ($${params.orderValueUSD.toFixed(2)}) exceeds your configured safety limit cap of $${this.config.maxOrderQuantityUSD.toLocaleString()}.`,
      };
    }

    // 4. Slippage tolerance cap
    if (params.slippagePct > this.config.maxBuySlippageTolerancePct) {
      return {
        allowed: false,
        reason: `Estimated slippage (${params.slippagePct.toFixed(3)}%) exceeds your safety limit of ${this.config.maxBuySlippageTolerancePct}%. Order aborted to protect capital.`,
      };
    }

    // 5. Rate limiting check (sliding 1-minute window)
    if (!this.checkRateLimit()) {
      return {
        allowed: false,
        reason: `Rate limit reached (${this.config.rateLimitOrdersPerMinute} orders/min). Please wait a moment before submitting again.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Sliding window rate limiter check (returns true if allowed, false if limit exceeded).
   */
  checkRateLimit(): boolean {
    const now = Date.now();
    this.orderTimestamps = this.orderTimestamps.filter((t) => now - t < 60_000);
    if (this.orderTimestamps.length >= this.config.rateLimitOrdersPerMinute) {
      return false;
    }
    this.orderTimestamps.push(now);
    return true;
  }
}

export const liveTradingService = new LiveTradingService();
