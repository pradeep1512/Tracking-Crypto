import { describe, it } from 'node:test';
import assert from 'node:assert';
import { optionsTradingService } from '../../src/services/OptionsTradingService';

describe('Delta Exchange Dynamic Crypto Options Chain & Greeks Engine', () => {
  it('generates dynamic options chain from Delta Exchange for BTC with ATM identification', async () => {
    const chain = await optionsTradingService.getOptionsChain('BTC');
    assert.strictEqual(chain.underlying, 'BTC');
    assert.ok(chain.strikes.length > 0, 'Expected strikes to be populated from Delta Exchange');

    const atmRow = chain.strikes.find((s) => s.isATM);
    assert.ok(atmRow, 'Expected ATM strike to be identified');
    assert.strictEqual(atmRow!.call.optionType, 'CE');
    assert.strictEqual(atmRow!.put.optionType, 'PE');
    assert.ok(atmRow!.call.strikePrice > 0);
  });

  it('generates dynamic options chain from Delta Exchange for ETH with ATM identification', async () => {
    const chain = await optionsTradingService.getOptionsChain('ETH');
    assert.strictEqual(chain.underlying, 'ETH');
    assert.ok(chain.strikes.length > 0, 'Expected ETH strikes from Delta Exchange');
  });

  it('calculates options Greeks (Delta, Gamma, Theta, Vega) and quotes', async () => {
    const chain = await optionsTradingService.getOptionsChain('BTC');
    const atmRow = chain.strikes.find((s) => s.isATM);
    assert.ok(atmRow);

    // Call delta is positive and within valid range
    assert.ok(atmRow.call.delta! > 0.1 && atmRow.call.delta! < 0.95, `Call delta ${atmRow.call.delta} should be valid`);
    // Put delta is negative and within valid range
    assert.ok(atmRow.put.delta! < -0.05 && atmRow.put.delta! > -0.95, `Put delta ${atmRow.put.delta} should be valid`);
    // Theta should be negative (time decay)
    assert.ok(atmRow.call.theta! <= 0, `Theta ${atmRow.call.theta} should be <= 0`);
    // Vega should be non-negative
    assert.ok(atmRow.call.vega! >= 0, `Vega ${atmRow.call.vega} should be >= 0`);
  });

  it('dynamically resolves exact Delta Exchange product ID from selected strike and expiry', async () => {
    const expiriesData = await optionsTradingService.getAvailableExpiries('BTC');
    assert.ok(expiriesData.expiries.length > 0, 'Expected live expiries from Delta Exchange');

    const expiry = expiriesData.expiries[0].iso;
    const chain = await optionsTradingService.getOptionsChain('BTC', expiry);
    const strike = chain.strikes[0].strikePrice;

    const resolved = await optionsTradingService.resolveOptionProduct({
      underlying: 'BTC',
      expiryIso: expiry,
      strikePrice: strike,
      optionType: 'CE',
    });
    assert.ok(resolved, 'Expected product resolution');
    assert.ok(resolved.productId > 0, 'Expected positive numeric product ID');
    assert.ok(resolved.symbol.includes('BTC'), `Resolved symbol ${resolved.symbol}`);
    assert.strictEqual(resolved.quotingAsset, 'USD');
  });
});
