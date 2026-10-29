'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Layers,
  ArrowUpRight,
  Zap,
} from 'lucide-react';
import type { AnalyticsSummary } from '@/services/AnalyticsService';
import { formatPercent } from '@/lib/utils/api';

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d'>('24h');
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async (tf = timeframe) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/summary?timeframe=${tf}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(timeframe);
  }, [timeframe]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Execution & Latency Analytics</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Phase 4 Intelligence
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Historical price gap distributions, exchange latency percentiles, and root-cause diagnostics.
          </p>
        </div>

        {/* Timeframe selector & refresh */}
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
            {(['1h', '24h', '7d'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                  timeframe === tf
                    ? 'bg-cyan-500 text-black font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => loadData(timeframe)}
            disabled={loading}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-white transition-all text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="glass-card p-4 space-y-1">
          <span className="text-xs text-muted-foreground flex items-center justify-between">
            Avg Price Gap
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          </span>
          <p className="text-xl font-bold font-mono text-white">
            {data ? formatPercent(data.overview.averageGapPercentage) : '—'}
          </p>
          <p className="text-[10px] text-muted-foreground">Mean deviation from target</p>
        </div>

        <div className="glass-card p-4 space-y-1">
          <span className="text-xs text-muted-foreground flex items-center justify-between">
            Median Gap (P50)
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
          </span>
          <p className="text-xl font-bold font-mono text-cyan-300">
            {data ? formatPercent(data.overview.medianGapPercentage) : '—'}
          </p>
          <p className="text-[10px] text-muted-foreground">50th percentile gap</p>
        </div>

        <div className="glass-card p-4 space-y-1">
          <span className="text-xs text-muted-foreground flex items-center justify-between">
            P95 Latency
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </span>
          <p className="text-xl font-bold font-mono text-amber-300">
            {data ? `${data.latency.p95}ms` : '—'}
          </p>
          <p className="text-[10px] text-muted-foreground">95% of ticks faster than</p>
        </div>

        <div className="glass-card p-4 space-y-1">
          <span className="text-xs text-muted-foreground flex items-center justify-between">
            Tolerance Pass Rate
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </span>
          <p className="text-xl font-bold font-mono text-emerald-400">
            {data ? `${data.overview.tolerancePassRate.toFixed(1)}%` : '—'}
          </p>
          <p className="text-[10px] text-muted-foreground">Within user tolerance</p>
        </div>

        <div className="glass-card p-4 space-y-1 col-span-2 lg:col-span-1">
          <span className="text-xs text-muted-foreground flex items-center justify-between">
            Stale Incidents
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </span>
          <p className="text-xl font-bold font-mono text-rose-400">
            {data ? data.overview.staleDataIncidents : '—'}
          </p>
          <p className="text-[10px] text-muted-foreground">Ticks delayed &gt;3000ms</p>
        </div>
      </div>

      {/* Main Row: Classification Breakdown + Latency Percentiles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Root Cause Classification Breakdown */}
        <div className="lg:col-span-2 glass-card p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Price Gap Root-Cause Classification
              </h3>
              <p className="text-xs text-muted-foreground">
                Algorithmic attribution of price variance based on order-book depth and exchange timestamps
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {data?.overview.totalEvaluations} events evaluated
            </span>
          </div>

          {/* Stacked bar visualization */}
          <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden flex">
            {(data?.classificationDistribution ?? []).map((item) => (
              <div
                key={item.classification}
                style={{ width: `${item.percentage}%` }}
                title={`${item.classification}: ${item.percentage.toFixed(1)}%`}
                className={`h-full transition-all ${
                  item.classification === 'SPREAD'
                    ? 'bg-cyan-500'
                    : item.classification === 'MARKET_MOVEMENT'
                    ? 'bg-blue-500'
                    : item.classification === 'FEES'
                    ? 'bg-emerald-500'
                    : item.classification === 'SLIPPAGE'
                    ? 'bg-purple-500'
                    : item.classification === 'LIQUIDITY'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
              />
            ))}
          </div>

          {/* Classification Detail Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {(data?.classificationDistribution ?? []).map((item) => (
              <div
                key={item.classification}
                className="p-3 rounded-lg bg-white/3 border border-white/5 flex items-start justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {item.classification.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      ({item.count} events)
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{item.description}</p>
                </div>
                <span className="font-mono font-bold text-cyan-400 text-sm">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Latency Percentiles Box */}
        <div className="glass-card p-5 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Latency Percentiles (SLA)
            </h3>
            <p className="text-xs text-muted-foreground">
              End-to-end feed latency distribution
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {[
              { label: 'P50 (Median)', value: data?.latency.p50 ?? 0, target: '< 150ms', ok: true },
              { label: 'P90 (Typical Peak)', value: data?.latency.p90 ?? 0, target: '< 250ms', ok: true },
              { label: 'P95 (Slowest 5%)', value: data?.latency.p95 ?? 0, target: '< 350ms', ok: true },
              { label: 'P99 (Tail Latency)', value: data?.latency.p99 ?? 0, target: '< 500ms', ok: (data?.latency.p99 ?? 0) < 500 },
            ].map((p) => (
              <div key={p.label} className="p-3 rounded-lg bg-white/3 border border-white/5 text-xs font-mono">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-muted-foreground font-sans">{p.label}</span>
                  <span className="font-bold text-white text-sm">{p.value} ms</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-muted-foreground">SLA Target: {p.target}</span>
                  <span className={p.ok ? 'text-emerald-400' : 'text-rose-400'}>
                    {p.ok ? '✓ Compliant' : '⚠ Exceeded'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20 text-[11px] text-cyan-300 leading-relaxed">
            Measurements capture the delta between the exchange execution event timestamp and the local server receipt timestamp.
          </div>
        </div>
      </div>

      {/* Exchange Performance Comparison Matrix */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          Exchange Feed Performance Matrix
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead>
              <tr className="text-muted-foreground border-b border-white/10">
                <th className="py-2.5 px-3 font-sans font-medium">Exchange</th>
                <th className="py-2.5 px-3 font-sans font-medium">Feed Type</th>
                <th className="py-2.5 px-3 font-sans font-medium">Avg Latency</th>
                <th className="py-2.5 px-3 font-sans font-medium">Avg Spread</th>
                <th className="py-2.5 px-3 font-sans font-medium">SLA Reliability</th>
                <th className="py-2.5 px-3 font-sans font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.exchangeComparison ?? []).map((exc) => (
                <tr key={exc.exchangeId} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 px-3 font-sans font-bold text-white flex items-center gap-2">
                    {exc.name}
                    {exc.isMock && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
                        DEV MOCK
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-muted-foreground">
                    {exc.isMock ? 'Synthetic Random Walk' : 'Public WebSocket + REST v3'}
                  </td>
                  <td className="py-3 px-3 text-cyan-300 font-semibold">{exc.avgLatencyMs} ms</td>
                  <td className="py-3 px-3 text-white">{exc.avgSpreadPct.toFixed(3)}%</td>
                  <td className="py-3 px-3 text-emerald-400 font-semibold">{exc.reliabilityScore}%</td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
