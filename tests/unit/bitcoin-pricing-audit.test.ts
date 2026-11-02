import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DeltaExchangeAdapter } from '../../src/lib/exchange/DeltaExchangeAdapter';

describe('Delta Exchange — Bitcoin & Ethereum Market Data Audit', () => {
  const adapter = new DeltaExchangeAdapter();

  it('retrieves live BTCUSD ticker directly from Delta Exchange India', async () => {
    const ticker = await adapter.getTicker('BTCUSD');

    assert.strictEqual(ticker.symbol, 'BTCUSD');
    assert.ok(typeof ticker.lastPrice === 'number' && ticker.lastPrice > 0, 'Expected positive numeric price');
    assert.strictEqual(ticker.quotingAsset, 'USD');
    assert.strictEqual(ticker.exchangeId, 'delta');
    assert.ok(ticker.exchangeTimestamp instanceof Date, 'Expected valid exchangeTimestamp');
    assert.ok(ticker.receivedAt instanceof Date, 'Expected valid receivedAt');
  });

  it('retrieves live ETHUSD ticker directly from Delta Exchange India', async () => {
    const ticker = await adapter.getTicker('ETHUSD');

    assert.strictEqual(ticker.symbol, 'ETHUSD');
    assert.ok(ticker.lastPrice > 0);
    assert.strictEqual(ticker.quotingAsset, 'USD');
  });

  it('verifies bid-ask spread integrity from Delta Exchange', async () => {
    const ticker = await adapter.getTicker('BTCUSD');

    assert.ok(ticker.bestBid > 0, 'Bid price should be positive');
    assert.ok(ticker.bestAsk > 0, 'Ask price should be positive');
    assert.ok(ticker.bestAsk >= ticker.bestBid, 'Ask price must be >= Bid price');
    assert.ok(ticker.spread >= 0, 'Spread must be non-negative');
  });

  it('benchmarks latency distribution (p50, p95, p99) for Delta Exchange market data', async () => {
    const samples: number[] = [];
    const iterations = 5;

    for (let i = 0; i < iterations; i++) {
      const t0 = Date.now();
      await adapter.getTicker('BTCUSD');
      samples.push(Date.now() - t0);
    }

    samples.sort((a, b) => a - b);
    const p50 = samples[Math.floor(samples.length * 0.5)];
    const p95 = samples[Math.floor(samples.length * 0.95)];
    const p99 = samples[samples.length - 1];

    assert.ok(typeof p50 === 'number' && p50 >= 0, `Valid p50 latency ${p50}ms`);
    assert.ok(typeof p95 === 'number' && p95 >= 0, `Valid p95 latency ${p95}ms`);
    assert.ok(typeof p99 === 'number' && p99 >= 0, `Valid p99 latency ${p99}ms`);
  });
});
