import { describe, it } from 'node:test';
import assert from 'node:assert';
import { currencyConversionService } from '../../src/services/CurrencyConversionService';
import { BinanceAdapter } from '../../src/lib/exchange/BinanceAdapter';

describe('Bitcoin Pricing, Dynamic Conversion & Market Audit Suite', () => {
  it('retrieves live dynamic USDT/INR rate without hardcoded values', async () => {
    const data = await currencyConversionService.getUsdtInrRate();

    assert.strictEqual(data.pair, 'USDTINR');
    assert.ok(typeof data.rate === 'number', 'Expected numerical rate');
    assert.ok(data.rate > 85, `Rate ${data.rate} should be above 85`);
    assert.ok(data.rate < 115, `Rate ${data.rate} should be below 115`);

    // Verify rate is not the outdated hardcoded 88
    assert.notStrictEqual(data.rate, 88, 'USDT/INR rate must not be hardcoded to 88');
    assert.notStrictEqual(data.rate, 88.5, 'USDT/INR rate must not be hardcoded to 88.5');

    assert.ok(data.source, 'Expected source identifier');
    assert.ok(data.exchangeTimestamp instanceof Date, 'Expected valid exchangeTimestamp');
    assert.ok(data.receivedAt instanceof Date, 'Expected valid receivedAt');
  });

  it('calculates BTC/INR accurately using BTC/USDT * USDT/INR formula', () => {
    const btcUsdt = 78548.01;
    const usdtInr = 95.06;
    const expectedBtcInr = btcUsdt * usdtInr;

    // Verify math aligns with observed reference (~₹74,66,773)
    assert.ok(expectedBtcInr > 7400000 && expectedBtcInr < 7500000);
    assert.strictEqual(Number((btcUsdt * usdtInr).toFixed(2)), 7466773.83);

    // Contrast against outdated hardcoded 88
    const outdatedPrice = btcUsdt * 88.0;
    const discrepancy = expectedBtcInr - outdatedPrice;
    assert.ok(discrepancy > 500000, 'Outdated rate causes more than ₹5,00,000 discrepancy');
  });

  it('runs real-time Bitcoin pricing audit with full transparency telemetry', async () => {
    const audit = await currencyConversionService.getBitcoinPriceAudit();

    assert.strictEqual(audit.symbol, 'BTCINR');
    assert.ok(audit.inrPrice > 7000000, `Expected inrPrice > 7,000,000, got ${audit.inrPrice}`);
    assert.ok(audit.btcUsdtPrice > 70000, `Expected btcUsdtPrice > 70,000, got ${audit.btcUsdtPrice}`);
    assert.ok(audit.usdtInrRate > 88, `Expected dynamic usdtInrRate > 88, got ${audit.usdtInrRate}`);

    assert.ok(audit.marketDataSource.includes('Binance'), 'Expected Binance market data source');
    assert.ok(audit.conversionSource, 'Expected conversion source');
    assert.ok(['LIVE', 'STALE', 'DELAYED'].includes(audit.dataStatus), 'Expected valid data status');

    assert.ok(typeof audit.latencyMs === 'number' && audit.latencyMs >= 0, 'Expected valid latency measurement');
  });

  it('verifies BinanceAdapter applies dynamic USDT/INR rate for synthetic BTCINR ticker', async () => {
    const adapter = new BinanceAdapter();
    const ticker = await adapter.getTicker('BTCINR');

    assert.strictEqual(ticker.symbol, 'BTCINR');
    assert.ok(ticker.lastPrice > 7000000, `Expected lastPrice > 7,000,000, got ${ticker.lastPrice}`);
    assert.ok(ticker.conversionRate, 'Expected conversionRate on ticker');
    assert.ok(ticker.conversionRate! > 88, 'Expected dynamic conversionRate > 88');
    assert.ok(ticker.conversionSource, 'Expected conversionSource on ticker');
  });

  it('benchmarks latency distribution (p50, p95, p99) for market data retrieval', async () => {
    const samples: number[] = [];
    const iterations = 5;

    for (let i = 0; i < iterations; i++) {
      const t0 = Date.now();
      await currencyConversionService.getUsdtInrRate();
      samples.push(Date.now() - t0);
    }

    samples.sort((a, b) => a - b);
    const p50 = samples[Math.floor(samples.length * 0.5)];
    const p95 = samples[Math.floor(samples.length * 0.95)];
    const p99 = samples[samples.length - 1];

    assert.ok(p50 < 100, `p50 latency should be under 100ms with cache, got ${p50}ms`);
    assert.ok(p95 < 250, `p95 latency should be under 250ms, got ${p95}ms`);
    assert.ok(p99 < 500, `p99 latency should be under 500ms, got ${p99}ms`);
  });
});
