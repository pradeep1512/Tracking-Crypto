import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LiveTradingService } from '../../src/services/LiveTradingService';

describe('LiveTradingService & Safety Guardrails', () => {
  it('has safe default configuration (live trading disabled, paper trading default)', () => {
    const service = new LiveTradingService();
    const config = service.getConfig();

    assert.equal(config.isLiveTradingEnabled, false);
    assert.equal(config.isPaperTradingDefault, true);
    assert.equal(config.killSwitchActive, false);
    assert.equal(config.maxOrderQuantityUSD, 5000);
    assert.equal(config.maxBuySlippageTolerancePct, 1.0);
    assert.equal(config.rateLimitOrdersPerMinute, 10);
  });

  it('always allows paper trades regardless of live trading toggle', () => {
    const service = new LiveTradingService();
    const check = service.validateOrderSafety({
      orderValueUSD: 10000,
      slippagePct: 2.5,
      isPaperTrade: true,
    });

    assert.equal(check.allowed, true);
  });

  it('rejects live trade if user has not explicitly enabled live trading', () => {
    const service = new LiveTradingService();
    const check = service.validateOrderSafety({
      orderValueUSD: 500,
      slippagePct: 0.1,
      isPaperTrade: false,
    });

    assert.equal(check.allowed, false);
    assert.ok(check.reason?.includes('Live trading is disabled'));
  });

  it('immediately blocks live orders when Emergency Kill Switch is engaged', () => {
    const service = new LiveTradingService();
    service.updateConfig({ isLiveTradingEnabled: true });

    // Engage kill switch
    service.setKillSwitch(true);

    const check = service.validateOrderSafety({
      orderValueUSD: 500,
      slippagePct: 0.1,
      isPaperTrade: false,
    });

    assert.equal(check.allowed, false);
    assert.ok(check.reason?.includes('Emergency Kill Switch is engaged'));
    assert.equal(service.getConfig().isLiveTradingEnabled, false);
  });

  it('rejects orders exceeding the maximum USD size limit', () => {
    const service = new LiveTradingService();
    service.updateConfig({
      isLiveTradingEnabled: true,
      maxOrderQuantityUSD: 2500,
    });

    const check = service.validateOrderSafety({
      orderValueUSD: 3000, // exceeds $2500
      slippagePct: 0.2,
      isPaperTrade: false,
    });

    assert.equal(check.allowed, false);
    assert.ok(check.reason?.includes('exceeds your configured safety limit cap'));
  });

  it('rejects orders exceeding the maximum slippage tolerance', () => {
    const service = new LiveTradingService();
    service.updateConfig({
      isLiveTradingEnabled: true,
      maxBuySlippageTolerancePct: 0.5,
    });

    const check = service.validateOrderSafety({
      orderValueUSD: 1000,
      slippagePct: 0.8, // exceeds 0.5%
      isPaperTrade: false,
    });

    assert.equal(check.allowed, false);
    assert.ok(check.reason?.includes('exceeds your safety limit'));
  });

  it('enforces sliding window rate limit', () => {
    const service = new LiveTradingService();
    service.updateConfig({
      isLiveTradingEnabled: true,
      rateLimitOrdersPerMinute: 3, // allow 3 orders
    });

    // Submit 3 orders
    assert.equal(service.checkRateLimit(), true);
    assert.equal(service.checkRateLimit(), true);
    assert.equal(service.checkRateLimit(), true);

    // 4th order must be blocked by rate limiter
    assert.equal(service.checkRateLimit(), false);
  });
});
