import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mcxMarketService, MCX_SPECIFICATIONS } from '../../src/services/MCXMarketService';

describe('MCX Commodities Engine & Specifications', () => {
  it('loads all 16 official MCX instruments across Precious Metals, Energy, and Base Metals', () => {
    const specs = mcxMarketService.getSpecifications();
    assert.strictEqual(specs.length >= 16, true);

    const symbols = specs.map((s) => s.symbol);
    assert.strictEqual(symbols.includes('GOLD'), true);
    assert.strictEqual(symbols.includes('GOLDM'), true);
    assert.strictEqual(symbols.includes('SILVER'), true);
    assert.strictEqual(symbols.includes('SILVERM'), true);
    assert.strictEqual(symbols.includes('CRUDEOIL'), true);
    assert.strictEqual(symbols.includes('NATURALGAS'), true);
    assert.strictEqual(symbols.includes('COPPER'), true);
  });

  it('verifies authentic contract specifications for Gold and Silver', () => {
    const gold = MCX_SPECIFICATIONS['GOLD'];
    assert.strictEqual(gold.unit, '1 kg');
    assert.strictEqual(gold.tickSize, 1.0);
    assert.strictEqual(gold.quoteUnit, '₹ per 10 grams');

    const silver = MCX_SPECIFICATIONS['SILVER'];
    assert.strictEqual(silver.lotSize, 30); // 30 kg
    assert.strictEqual(silver.quoteUnit, '₹ per 1 kg');
  });

  it('produces real-time commodity tickers with live bid-ask spreads', () => {
    const goldTicker = mcxMarketService.getCommodityTicker('GOLD');
    assert.strictEqual(goldTicker.symbol, 'GOLD');
    assert.strictEqual(goldTicker.lastPrice > 50000, true);
    assert.strictEqual(goldTicker.bestAsk >= goldTicker.bestBid, true);
    assert.strictEqual(goldTicker.spread > 0, true);
    assert.strictEqual(goldTicker.openInterest > 0, true);
    assert.strictEqual(goldTicker.daysToExpiry >= 0, true);
  });

  it('validates market status computation for Indian Standard Time', () => {
    const status = mcxMarketService.getMarketStatus();
    assert.strictEqual(['OPEN', 'CLOSED', 'PRE_OPEN'].includes(status.status), true);
    assert.strictEqual(typeof status.sessionName, 'string');
  });
});
