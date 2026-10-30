import { describe, it } from 'node:test';
import assert from 'node:assert';
import { optionsTradingService } from '../../src/services/OptionsTradingService';

describe('Options Trading & Dynamic Options Chain', () => {
  it('generates options chain with realistic strikes around ATM for BTC', () => {
    const chain = optionsTradingService.getOptionsChain('BTC');
    assert.strictEqual(chain.underlying, 'BTC');
    assert.strictEqual(chain.strikes.length > 10, true);

    const atmRow = chain.strikes.find((s) => s.isATM);
    assert.strictEqual(Boolean(atmRow), true);
    assert.strictEqual(atmRow!.call.optionType, 'CE');
    assert.strictEqual(atmRow!.put.optionType, 'PE');
  });

  it('calculates Black-Scholes Greeks including Delta, Gamma, Theta, and Vega', () => {
    const chain = optionsTradingService.getOptionsChain('BTC');
    const atmRow = chain.strikes.find((s) => s.isATM)!;

    // Call delta for ATM is approx 0.50
    assert.strictEqual(atmRow.call.delta! > 0.3 && atmRow.call.delta! < 0.7, true);
    // Put delta for ATM is approx -0.50
    assert.strictEqual(atmRow.put.delta! < -0.3 && atmRow.put.delta! > -0.7, true);
    // Theta should be negative (time decay)
    assert.strictEqual(atmRow.call.theta! <= 0, true);
    assert.strictEqual(atmRow.call.vega! >= 0, true);
  });

  it('supports MCX Commodity Options for Gold and Crude Oil', () => {
    const goldChain = optionsTradingService.getOptionsChain('GOLD');
    assert.strictEqual(goldChain.underlying, 'GOLD');
    assert.strictEqual(goldChain.category, 'MCX_COMMODITY');
    assert.strictEqual(goldChain.strikes.length > 5, true);

    const crudeChain = optionsTradingService.getOptionsChain('CRUDEOIL');
    assert.strictEqual(crudeChain.underlying, 'CRUDEOIL');
    assert.strictEqual(crudeChain.category, 'MCX_COMMODITY');
  });
});
