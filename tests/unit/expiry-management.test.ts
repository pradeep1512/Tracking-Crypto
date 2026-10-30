import { describe, it } from 'node:test';
import assert from 'node:assert';
import { expiryManagementService } from '../../src/services/ExpiryManagementService';

describe('Expiry Management & Calendar Engine', () => {
  it('builds aggregated expiry calendar across MCX commodities and options', () => {
    const calendar = expiryManagementService.getExpiryCalendar();
    assert.strictEqual(calendar.length > 10, true);

    const hasGold = calendar.some((c) => c.symbol === 'GOLD');
    assert.strictEqual(hasGold, true);

    const hasBtc = calendar.some((c) => c.symbol === 'BTC_OPT');
    assert.strictEqual(hasBtc, true);
  });

  it('strictly disallows new order submissions on expired contracts', () => {
    const expiredCheck = expiryManagementService.canTradeContract('2020-01-01');
    assert.strictEqual(expiredCheck.allowed, false);
    assert.strictEqual(expiredCheck.reason?.includes('expired'), true);

    const futureCheck = expiryManagementService.canTradeContract('2030-12-31');
    assert.strictEqual(futureCheck.allowed, true);
  });

  it('calculates rollover spread between contract months', () => {
    const rollover = expiryManagementService.calculateRollover('GOLD', '2026-11-05', '2026-12-05');
    assert.strictEqual(typeof rollover.spreadAmount, 'number');
    assert.strictEqual(typeof rollover.spreadPct, 'number');
    assert.strictEqual(typeof rollover.estimatedCost, 'number');
  });
});
