import { describe, it } from 'node:test';
import assert from 'node:assert';
import { expiryManagementService } from '../../src/services/ExpiryManagementService';

describe('Delta Exchange Expiry Management & Calendar Engine', () => {
  it('builds live expiry calendar populated with Delta Exchange crypto options maturities', async () => {
    const calendar = await expiryManagementService.getExpiryCalendar();
    assert.ok(calendar.length > 0, 'Expected options expiries in calendar');

    const btcContracts = calendar.filter((c) => c.symbol.includes('BTC'));
    assert.ok(btcContracts.length > 0, 'Expected BTC options expiries');

    for (const item of calendar) {
      assert.ok(item.category === 'OPTION' || item.category === 'CRYPTO');
      assert.strictEqual(item.settlementType, 'CASH_SETTLED');
      assert.ok(item.daysRemaining >= 0);
    }
  });

  it('strictly disallows new order submissions on expired contracts', () => {
    const expiredCheck = expiryManagementService.canTradeContract('2020-01-01');
    assert.strictEqual(expiredCheck.allowed, false);
    assert.strictEqual(expiredCheck.reason?.includes('expired'), true);

    const futureCheck = expiryManagementService.canTradeContract('2030-12-31');
    assert.strictEqual(futureCheck.allowed, true);
  });

  it('calculates rollover spread between crypto contract expiries in USD', () => {
    const rollover = expiryManagementService.calculateRollover('BTC', '2026-11-05', '2026-12-05');
    assert.strictEqual(typeof rollover.spreadAmount, 'number');
    assert.strictEqual(typeof rollover.spreadPct, 'number');
    assert.strictEqual(typeof rollover.estimatedCost, 'number');
  });
});
