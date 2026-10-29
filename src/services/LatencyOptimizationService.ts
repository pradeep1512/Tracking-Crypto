/**
 * LatencyOptimizationService
 *
 * Measures and tracks latency at each stage of market data pipeline:
 * Exchange event → Server receive → Browser receive → Order → Ack → Fill
 *
 * Reports p50, p95, p99 percentiles. Never manufactures missing measurements.
 */

import type { LatencyStats, MetricType } from '@/types';
import { percentile } from '@/lib/utils/api';

interface LatencySample {
  measuredMs: number;
  timestamp: number; // unix ms
  metricType: MetricType;
}

export class LatencyOptimizationService {
  private samples: Map<MetricType, LatencySample[]> = new Map();
  private readonly MAX_SAMPLES = 1000; // per metric type

  /**
   * Record a latency measurement.
   */
  record(metricType: MetricType, measuredMs: number): void {
    if (!this.samples.has(metricType)) {
      this.samples.set(metricType, []);
    }

    const list = this.samples.get(metricType)!;
    list.push({ measuredMs, timestamp: Date.now(), metricType });

    // Trim oldest samples to keep memory bounded
    if (list.length > this.MAX_SAMPLES) {
      list.splice(0, list.length - this.MAX_SAMPLES);
    }
  }

  /**
   * Calculate statistics for a metric type within a time window.
   */
  getStats(metricType: MetricType, windowMinutes = 5): LatencyStats {
    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    const list = this.samples.get(metricType) ?? [];
    const filtered = list
      .filter((s) => s.timestamp >= cutoff)
      .map((s) => s.measuredMs)
      .sort((a, b) => a - b);

    if (filtered.length === 0) {
      return {
        p50: 0, p95: 0, p99: 0, mean: 0, min: 0, max: 0,
        sampleCount: 0, metricType, windowMinutes,
      };
    }

    const mean = filtered.reduce((a, b) => a + b, 0) / filtered.length;

    return {
      p50: percentile(filtered, 50),
      p95: percentile(filtered, 95),
      p99: percentile(filtered, 99),
      mean: Math.round(mean * 100) / 100,
      min: filtered[0],
      max: filtered[filtered.length - 1],
      sampleCount: filtered.length,
      metricType,
      windowMinutes,
    };
  }

  /**
   * Get all metric type stats.
   */
  getAllStats(windowMinutes = 5): Record<MetricType, LatencyStats> {
    const types: MetricType[] = ['MARKET_DATA', 'ORDER_SUBMIT', 'ORDER_ACK', 'ORDER_FILL'];
    return Object.fromEntries(
      types.map((t) => [t, this.getStats(t, windowMinutes)])
    ) as Record<MetricType, LatencyStats>;
  }

  /**
   * Measure latency between exchange timestamp and now (server receive time).
   * Returns null if timestamps are implausible (e.g., future exchange time).
   */
  measureMarketDataLatency(
    exchangeTimestamp: Date,
    serverReceivedAt: Date = new Date()
  ): number | null {
    const ms = serverReceivedAt.getTime() - exchangeTimestamp.getTime();

    // Reject implausible measurements
    if (ms < 0) {
      console.warn(
        '[LatencyService] Exchange timestamp is in the future — clocks may be unsynchronized. Not recording.'
      );
      return null;
    }
    if (ms > 60_000) {
      console.warn(
        `[LatencyService] Measured latency of ${ms}ms is unusually high — possible stale data.`
      );
    }

    this.record('MARKET_DATA', ms);
    return ms;
  }

  /**
   * Clear all samples (useful for testing).
   */
  reset(): void {
    this.samples.clear();
  }
}

// Singleton
const globalForLatency = globalThis as unknown as {
  latencyService: LatencyOptimizationService | undefined;
};

export const latencyService =
  globalForLatency.latencyService ?? new LatencyOptimizationService();

if (process.env.NODE_ENV !== 'production') {
  globalForLatency.latencyService = latencyService;
}
