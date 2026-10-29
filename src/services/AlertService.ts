/**
 * AlertService — Configurable alerts and notification engine.
 *
 * Implements:
 * - Alert types: PRICE_TARGET, MAX_BUY_EXCEEDED, MIN_SELL_BELOW, GAP_EXCEEDED, DATA_STALE, WS_DISCONNECT, ORDER_FAIL, FILL
 * - Cooldown mechanism & event deduplication to prevent notification spam
 * - Severity levels: INFO, WARNING, CRITICAL
 * - In-memory and Prisma database persistence
 */

import { prisma } from '@/lib/database/prisma';
import type { AlertType, AlertSeverity } from '@/types';

export interface AlertRule {
  id: string;
  userId?: string | null;
  alertType: AlertType;
  symbol: string;
  exchangeId?: string;
  thresholdValue?: number;
  triggerValue?: number;
  message: string;
  severity: AlertSeverity;
  isEnabled: boolean;
  isRead: boolean;
  cooldownSeconds: number;
  lastTriggeredAt?: Date | null;
  triggeredCount: number;
  createdAt: Date;
}

export class AlertService {
  private inMemoryRules: AlertRule[] = [];

  constructor() {
    this.seedDefaultRules();
  }

  private seedDefaultRules() {
    const now = new Date();
    this.inMemoryRules = [
      {
        id: 'rule_gap_exceeded',
        userId: 'dev_user',
        alertType: 'GAP_EXCEEDED',
        symbol: 'BTCUSDT',
        exchangeId: 'binance',
        thresholdValue: 1.5,
        message: 'Price gap exceeds 1.5% tolerance threshold',
        severity: 'WARNING',
        isEnabled: true,
        isRead: false,
        cooldownSeconds: 300,
        lastTriggeredAt: new Date(now.getTime() - 15 * 60 * 1000),
        triggeredCount: 3,
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      },
      {
        id: 'rule_data_stale',
        userId: 'dev_user',
        alertType: 'DATA_STALE',
        symbol: 'BTCUSDT',
        exchangeId: 'binance',
        thresholdValue: 3000,
        message: 'Market data feed latency exceeded 3000ms',
        severity: 'CRITICAL',
        isEnabled: true,
        isRead: false,
        cooldownSeconds: 600,
        lastTriggeredAt: null,
        triggeredCount: 0,
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      },
      {
        id: 'rule_price_target_btc',
        userId: 'dev_user',
        alertType: 'PRICE_TARGET',
        symbol: 'BTCUSDT',
        exchangeId: 'binance',
        thresholdValue: 82000,
        message: 'Bitcoin target price crossed $82,000',
        severity: 'INFO',
        isEnabled: true,
        isRead: true,
        cooldownSeconds: 3600,
        lastTriggeredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        triggeredCount: 1,
        createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      },
      {
        id: 'rule_max_buy_exceeded',
        userId: 'dev_user',
        alertType: 'MAX_BUY_EXCEEDED',
        symbol: 'ETHUSDT',
        exchangeId: 'binance',
        thresholdValue: 2400,
        message: 'ETH market ask exceeded configured limit price of $2,400',
        severity: 'WARNING',
        isEnabled: true,
        isRead: false,
        cooldownSeconds: 300,
        lastTriggeredAt: new Date(now.getTime() - 40 * 60 * 1000),
        triggeredCount: 2,
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      },
    ];
  }

  async getAlerts(userId?: string): Promise<AlertRule[]> {
    try {
      const dbAlerts = await prisma.alert.findMany({
        orderBy: { createdAt: 'desc' },
      });

      if (dbAlerts.length > 0) {
        return dbAlerts.map((a) => ({
          id: a.id,
          userId: a.userId,
          alertType: a.alertType as AlertType,
          symbol: a.tradingPairId || 'ALL',
          exchangeId: a.exchangeId || undefined,
          thresholdValue: a.thresholdValue ? Number(a.thresholdValue) : undefined,
          triggerValue: a.triggerValue ? Number(a.triggerValue) : undefined,
          message: a.message,
          severity: a.severity as AlertSeverity,
          isEnabled: a.isEnabled,
          isRead: a.isRead,
          cooldownSeconds: a.cooldownSeconds,
          lastTriggeredAt: a.lastTriggeredAt,
          triggeredCount: a.triggeredCount,
          createdAt: a.createdAt,
        }));
      }
    } catch {
      // Database offline fallback
    }

    return this.inMemoryRules;
  }

  async createAlert(params: {
    userId?: string;
    alertType: AlertType;
    symbol: string;
    exchangeId?: string;
    thresholdValue?: number;
    severity?: AlertSeverity;
    cooldownSeconds?: number;
    message?: string;
  }): Promise<AlertRule> {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const msg =
      params.message ||
      `${params.alertType.replace(/_/g, ' ')} rule for ${params.symbol} (${params.thresholdValue ?? ''})`;

    const newRule: AlertRule = {
      id,
      userId: params.userId ?? 'dev_user',
      alertType: params.alertType,
      symbol: params.symbol.toUpperCase(),
      exchangeId: params.exchangeId ?? 'binance',
      thresholdValue: params.thresholdValue,
      message: msg,
      severity: params.severity ?? 'INFO',
      isEnabled: true,
      isRead: false,
      cooldownSeconds: params.cooldownSeconds ?? 300,
      lastTriggeredAt: null,
      triggeredCount: 0,
      createdAt: new Date(),
    };

    this.inMemoryRules.unshift(newRule);

    // Try database persistence
    try {
      await prisma.alert.create({
        data: {
          id,
          userId: newRule.userId || 'dev_user',
          alertType: newRule.alertType,
          exchangeId: newRule.exchangeId,
          tradingPairId: newRule.symbol,
          message: newRule.message,
          severity: newRule.severity,
          isEnabled: newRule.isEnabled,
          isRead: newRule.isRead,
          thresholdValue: newRule.thresholdValue,
          cooldownSeconds: newRule.cooldownSeconds,
        },
      });
    } catch {
      // offline fallback
    }

    return newRule;
  }

  async markAsRead(id: string): Promise<boolean> {
    const rule = this.inMemoryRules.find((r) => r.id === id);
    if (rule) {
      rule.isRead = true;
    }

    try {
      await prisma.alert.update({
        where: { id },
        data: { isRead: true },
      });
    } catch {
      // ignore
    }

    return true;
  }

  async markAllAsRead(): Promise<boolean> {
    this.inMemoryRules.forEach((r) => (r.isRead = true));
    try {
      await prisma.alert.updateMany({
        data: { isRead: true },
      });
    } catch {
      // ignore
    }
    return true;
  }

  async toggleAlert(id: string, isEnabled: boolean): Promise<boolean> {
    const rule = this.inMemoryRules.find((r) => r.id === id);
    if (rule) {
      rule.isEnabled = isEnabled;
    }

    try {
      await prisma.alert.update({
        where: { id },
        data: { isEnabled },
      });
    } catch {
      // ignore
    }

    return true;
  }

  async deleteAlert(id: string): Promise<boolean> {
    this.inMemoryRules = this.inMemoryRules.filter((r) => r.id !== id);

    try {
      await prisma.alert.delete({
        where: { id },
      });
    } catch {
      // ignore
    }

    return true;
  }

  /**
   * Evaluates active rules against incoming tick and checks cooldown window.
   */
  evaluateCondition(params: {
    symbol: string;
    currentPrice: number;
    gapPercentage?: number;
    dataAgeMs?: number;
  }): AlertRule[] {
    const triggered: AlertRule[] = [];
    const now = Date.now();

    for (const rule of this.inMemoryRules) {
      if (!rule.isEnabled) continue;
      if (rule.symbol !== 'ALL' && rule.symbol !== params.symbol.toUpperCase()) continue;

      // Check cooldown window
      if (rule.lastTriggeredAt) {
        const elapsed = (now - new Date(rule.lastTriggeredAt).getTime()) / 1000;
        if (elapsed < rule.cooldownSeconds) continue;
      }

      let didTrigger = false;

      switch (rule.alertType) {
        case 'PRICE_TARGET':
          if (rule.thresholdValue && params.currentPrice >= rule.thresholdValue) {
            didTrigger = true;
          }
          break;
        case 'MAX_BUY_EXCEEDED':
          if (rule.thresholdValue && params.currentPrice > rule.thresholdValue) {
            didTrigger = true;
          }
          break;
        case 'MIN_SELL_BELOW':
          if (rule.thresholdValue && params.currentPrice < rule.thresholdValue) {
            didTrigger = true;
          }
          break;
        case 'GAP_EXCEEDED':
          if (
            rule.thresholdValue !== undefined &&
            params.gapPercentage !== undefined &&
            Math.abs(params.gapPercentage) > rule.thresholdValue
          ) {
            didTrigger = true;
          }
          break;
        case 'DATA_STALE':
          if (rule.thresholdValue && params.dataAgeMs && params.dataAgeMs > rule.thresholdValue) {
            didTrigger = true;
          }
          break;
      }

      if (didTrigger) {
        rule.lastTriggeredAt = new Date();
        rule.triggeredCount++;
        rule.isRead = false;
        triggered.push(rule);
      }
    }

    return triggered;
  }
}

export const alertService = new AlertService();
