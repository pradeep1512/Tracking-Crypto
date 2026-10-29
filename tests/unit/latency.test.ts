import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LatencyOptimizationService } from '../../src/services/LatencyOptimizationService';
import { percentile } from '../../src/lib/utils/api';

describe('LatencyOptimizationService & Percentiles', () => {
  it('calculates percentiles correctly on known distributions', () => {
    // Array of 100 values: 1 through 100
    const values = Array.from({ length: 100 }, (_, i) => i + 1);

    assert.equal(percentile(values, 50), 50);
    assert.equal(percentile(values, 90), 90);
    assert.equal(percentile(values, 95), 95);
    assert.equal(percentile(values, 99), 99);
  });

  it('handles edge cases in percentile calculation', () => {
    assert.equal(percentile([], 50), 0);
    assert.equal(percentile([42], 50), 42);
    assert.equal(percentile([42], 99), 42);
  });

  it('records measurements and produces accurate stats', () => {
    const service = new LatencyOptimizationService();

    // Record sample latencies
    const samples = [10, 12, 15, 18, 20, 22, 25, 30, 45, 120];
    for (const val of samples) {
      service.record('MARKET_DATA', val);
    }

    const stats = service.getStats('MARKET_DATA');

    assert.equal(stats.sampleCount, 10);
    assert.equal(stats.min, 10);
    assert.equal(stats.max, 120);
    assert.equal(stats.p50, 20); // 50th percentile of 10 sorted elements
    assert.equal(stats.p99, 120);
    assert.ok(stats.mean > 10 && stats.mean < 120);
  });

  it('rejects implausible future exchange timestamps', () => {
    const service = new LatencyOptimizationService();
    const futureDate = new Date(Date.now() + 60000); // 1 minute in the future
    const result = service.measureMarketDataLatency(futureDate, new Date());

    assert.equal(result, null);
  });

  it('accurately calculates valid market data latency', () => {
    const service = new LatencyOptimizationService();
    const now = new Date();
    const past = new Date(now.getTime() - 45); // 45ms ago
    const result = service.measureMarketDataLatency(past, now);

    assert.equal(result, 45);
  });
});
