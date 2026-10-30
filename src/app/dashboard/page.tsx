'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, Activity, Zap, Clock,
  AlertTriangle, ArrowUpDown, BarChart3, RefreshCw,
  Coins, Flame, Layers, Briefcase, Calendar, ChevronRight
} from 'lucide-react';
import type { Ticker, PriceGapAnalysis, LatencyStats } from '@/types';
import { formatPrice, formatPercent, formatLatency, formatAge, getGapColor, getGapBgColor, cn } from '@/lib/utils';

const SYMBOLS = ['BTCINR', 'ETHINR', 'BNBINR'];
const EXCHANGE = 'mock';
const POLL_INTERVAL = 1500; // ms

function StatCard({
  title, value, subtitle, icon: Icon, trend, color = 'cyan',
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'cyan' | 'emerald' | 'rose' | 'amber' | 'purple';
}) {
  const colors = {
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  return (
    <div className="glass-card p-5 transition-all hover:border-white/15">
      <div className="flex items-start justify-between mb-3">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{title}</p>
        <div className={cn('p-2 rounded-lg border', colors[color])}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white font-mono mb-1">{value}</p>
      {subtitle && (
        <p className={cn('text-xs', trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-muted-foreground')}>
          {trend === 'up' && '▲ '}
          {trend === 'down' && '▼ '}
          {subtitle}
        </p>
      )}
    </div>
  );
}

function TickerRow({ ticker, selected, onClick }: { ticker: Ticker; selected: boolean; onClick: () => void }) {
  const prevPrice = useRef(ticker.lastPrice);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (ticker.lastPrice !== prevPrice.current) {
      setFlash(ticker.lastPrice > prevPrice.current ? 'up' : 'down');
      prevPrice.current = ticker.lastPrice;
      const t = setTimeout(() => setFlash(null), 400);
      return () => clearTimeout(t);
    }
  }, [ticker.lastPrice]);

  const priceDiff = ticker.lastPrice - (prevPrice.current || ticker.lastPrice);
  const isPositive = priceDiff >= 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left',
        selected
          ? 'bg-cyan-500/10 border-cyan-500/30'
          : 'glass border-transparent hover:border-white/10',
        flash === 'up' && 'flash-up',
        flash === 'down' && 'flash-down'
      )}>
      <div>
        <p className="font-semibold text-white text-sm">{ticker.symbol}</p>
        <p className="text-muted-foreground text-xs">{ticker.exchangeName}</p>
      </div>
      <div className="text-right">
        <p className="font-mono font-bold text-white text-sm">
          ₹{ticker.lastPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </p>
        <div className="flex items-center justify-end gap-1">
          {isPositive ? (
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3 h-3 text-rose-400" />
          )}
          <p className={cn('text-xs font-mono', isPositive ? 'text-emerald-400' : 'text-rose-400')}>
            {formatPercent(ticker.spreadPercentage, false)} spread
          </p>
        </div>
      </div>
    </button>
  );
}

function GapPanel({ gap }: { gap: PriceGapAnalysis }) {
  const gapColor = getGapColor(gap.gapPercentage);
  const gapBg = getGapBgColor(gap.gapPercentage);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-cyan-400" />
        <h3 className="font-semibold text-white text-sm">Price Gap Analysis</h3>
        {gap.isWithinTolerance ? (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">Within tolerance</span>
        ) : (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs">⚠ Exceeds tolerance</span>
        )}
      </div>

      <div className="space-y-3">
        {[
          { label: 'Reference price', value: formatPrice(gap.referencePrice), note: 'Seller\'s quoted price' },
          { label: 'Market ask price', value: formatPrice(gap.observedPrice), note: gap.side === 'BUY' ? 'Best ask (you pay this)' : 'Best bid (you receive this)' },
          { label: 'Est. execution price', value: formatPrice(gap.estimatedExecutionPrice), note: 'Including fees & slippage' },
        ].map((row) => (
          <div key={row.label} className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-xs">{row.label}</p>
              <p className="text-muted-foreground/60 text-xs">{row.note}</p>
            </div>
            <p className="font-mono font-semibold text-white text-sm">{row.value}</p>
          </div>
        ))}

        <div className={cn('border rounded-lg p-3 mt-1', gapBg)}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-white">Price Gap</span>
            <span className={cn('font-mono font-bold', gapColor)}>
              {gap.gapAmount >= 0 ? '+' : ''}₹{Math.abs(gap.gapAmount).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Gap %</span>
            <span className={cn('font-mono text-sm font-bold', gapColor)}>
              {gap.gapPercentage >= 0 ? '+' : ''}{gap.gapPercentage.toFixed(4)}%
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-white/3 border border-white/5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 text-xs font-medium capitalize mb-0.5">
              {gap.classification.replace('_', ' ')}
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">{gap.classificationDetails}</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Data age</span>
          <span className={cn('font-mono', gap.dataAgeMs > 5000 ? 'text-red-400' : 'text-emerald-400')}>
            {formatAge(gap.dataAgeMs)}
          </span>
        </div>
      </div>
    </div>
  );
}

function OrderBookPanel({ orderBook }: {
  orderBook: { bids: Array<{ price: number; quantity: number; total: number }>; asks: Array<{ price: number; quantity: number; total: number }> } | null
}) {
  if (!orderBook) return (
    <div className="glass-card p-5 flex items-center justify-center h-48">
      <RefreshCw className="w-5 h-5 text-muted-foreground animate-spin" />
    </div>
  );

  const maxTotal = Math.max(
    ...orderBook.bids.slice(0, 8).map((b) => b.total),
    ...orderBook.asks.slice(0, 8).map((a) => a.total)
  );

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <ArrowUpDown className="w-4 h-4 text-cyan-400" />
        <h3 className="font-semibold text-white text-sm">Order Book</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-emerald-400 text-xs font-medium mb-2">BIDS</p>
          <div className="space-y-1">
            {orderBook.bids.slice(0, 8).map((bid, i) => (
              <div key={i} className="relative">
                <div className="absolute inset-0 rounded bg-emerald-500/10"
                  style={{ width: `${(bid.total / maxTotal) * 100}%` }} />
                <div className="relative flex justify-between text-xs px-1 py-0.5">
                  <span className="text-emerald-400 font-mono">₹{bid.price.toLocaleString('en-IN')}</span>
                  <span className="text-muted-foreground font-mono">{bid.quantity.toFixed(4)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-rose-400 text-xs font-medium mb-2">ASKS</p>
          <div className="space-y-1">
            {orderBook.asks.slice(0, 8).map((ask, i) => (
              <div key={i} className="relative">
                <div className="absolute inset-0 rounded bg-rose-500/10"
                  style={{ width: `${(ask.total / maxTotal) * 100}%` }} />
                <div className="relative flex justify-between text-xs px-1 py-0.5">
                  <span className="text-rose-400 font-mono">₹{ask.price.toLocaleString('en-IN')}</span>
                  <span className="text-muted-foreground font-mono">{ask.quantity.toFixed(4)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('BTCINR');
  const [gap, setGap] = useState<PriceGapAnalysis | null>(null);
  const [latency, setLatency] = useState<LatencyStats | null>(null);
  const [orderBook, setOrderBook] = useState<{
    bids: Array<{ price: number; quantity: number; total: number }>;
    asks: Array<{ price: number; quantity: number; total: number }>;
  } | null>(null);
  const [referencePrice, setReferencePrice] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchTickers = useCallback(async () => {
    try {
      const res = await fetch(`/api/market/tickers?exchange=${EXCHANGE}&symbols=${SYMBOLS.join(',')}`);
      const data = await res.json();
      if (data.success) setTickers(data.data);
    } catch (e) {
      console.error('Ticker fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrderBook = useCallback(async (symbol: string) => {
    try {
      const res = await fetch(`/api/market/orderbook?exchange=${EXCHANGE}&symbol=${symbol}&depth=20`);
      const data = await res.json();
      if (data.success) setOrderBook(data.data);
    } catch (e) {
      console.error('OrderBook error:', e);
    }
  }, []);

  const fetchGap = useCallback(async (symbol: string, refPrice: number) => {
    if (!refPrice || refPrice <= 0) return;
    try {
      const res = await fetch(
        `/api/price-gap/current?exchange=${EXCHANGE}&symbol=${symbol}&referencePrice=${refPrice}&side=BUY&tolerance=2`
      );
      const data = await res.json();
      if (data.success) setGap(data.data);
    } catch (e) {
      console.error('Gap error:', e);
    }
  }, []);

  const fetchLatency = useCallback(async () => {
    try {
      const res = await fetch('/api/latency/metrics?type=MARKET_DATA&window=5');
      const data = await res.json();
      if (data.success) setLatency(data.data);
    } catch (e) {
      console.error('Latency error:', e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTickers();
    fetchOrderBook(selectedSymbol);
    fetchLatency();
  }, [fetchTickers, fetchOrderBook, fetchLatency, selectedSymbol]);

  // Poll tickers
  useEffect(() => {
    const interval = setInterval(fetchTickers, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTickers]);

  // Poll order book
  useEffect(() => {
    const interval = setInterval(() => fetchOrderBook(selectedSymbol), 2000);
    return () => clearInterval(interval);
  }, [fetchOrderBook, selectedSymbol]);

  // Poll latency
  useEffect(() => {
    const interval = setInterval(fetchLatency, 5000);
    return () => clearInterval(interval);
  }, [fetchLatency]);

  // Auto set reference price when ticker loads
  const selectedTicker = tickers.find((t) => t.symbol === selectedSymbol);
  useEffect(() => {
    if (selectedTicker && !referencePrice) {
      setReferencePrice(selectedTicker.lastPrice.toFixed(2));
    }
  }, [selectedTicker, referencePrice]);

  // Fetch gap when ref price or ticker changes
  useEffect(() => {
    const refNum = parseFloat(referencePrice);
    if (refNum > 0 && selectedTicker) {
      fetchGap(selectedSymbol, refNum);
    }
  }, [referencePrice, selectedSymbol, selectedTicker, fetchGap]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Connecting to market data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Market Overview</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Real-time price gap monitoring • Crypto & MCX Commodities
            <span className="ml-2 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs">
              Multi-Asset Active
            </span>
          </p>
        </div>

        {/* Quick Asset Launchers */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Link
            href="/dashboard/crypto"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/20 transition-colors whitespace-nowrap"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Crypto</span>
          </Link>
          <Link
            href="/dashboard/mcx"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold hover:bg-amber-500/20 transition-colors whitespace-nowrap"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>MCX Commodities</span>
          </Link>
          <Link
            href="/dashboard/options"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold hover:bg-purple-500/20 transition-colors whitespace-nowrap"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Options Chain</span>
          </Link>
          <Link
            href="/dashboard/portfolio"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/20 transition-colors whitespace-nowrap"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>My Portfolio</span>
          </Link>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="BTC/INR Price"
          value={selectedTicker ? `₹${selectedTicker.lastPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}
          subtitle={selectedTicker ? `Spread: ${selectedTicker.spread.toFixed(2)}` : undefined}
          icon={TrendingUp}
          color="cyan"
        />
        <StatCard
          title="Price Gap"
          value={gap ? `${gap.gapAmount >= 0 ? '+' : ''}₹${Math.abs(gap.gapAmount).toFixed(2)}` : '—'}
          subtitle={gap ? `${gap.gapPercentage >= 0 ? '+' : ''}${gap.gapPercentage.toFixed(4)}%` : undefined}
          trend={gap ? (gap.gapAmount > 0 ? 'down' : 'up') : undefined}
          icon={Activity}
          color={gap && Math.abs(gap.gapPercentage) > 2 ? 'rose' : 'emerald'}
        />
        <StatCard
          title="Market Latency"
          value={latency && latency.sampleCount > 0 ? formatLatency(latency.p50) : '—'}
          subtitle={latency && latency.sampleCount > 0 ? `p95: ${formatLatency(latency.p95)} | n=${latency.sampleCount}` : 'No samples yet'}
          icon={Zap}
          color="purple"
        />
        <StatCard
          title="Data Freshness"
          value={selectedTicker ? formatAge(selectedTicker.dataAgeMs) : '—'}
          subtitle={selectedTicker && selectedTicker.dataAgeMs > 5000 ? '⚠ Stale' : 'Fresh'}
          icon={Clock}
          trend={selectedTicker && selectedTicker.dataAgeMs > 5000 ? 'down' : 'up'}
          color={selectedTicker && selectedTicker.dataAgeMs > 5000 ? 'rose' : 'emerald'}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Ticker list + controls */}
        <div className="space-y-4">
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Watchlist</h3>
            <div className="space-y-2">
              {tickers.map((t) => (
                <TickerRow
                  key={t.symbol}
                  ticker={t}
                  selected={t.symbol === selectedSymbol}
                  onClick={() => {
                    setSelectedSymbol(t.symbol);
                    setReferencePrice('');
                    setGap(null);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Reference price control */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Reference Price</h3>
            <p className="text-muted-foreground text-xs mb-3">
              Enter the price you were quoted or your target price to analyze the gap.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                <input
                  id="reference-price-input"
                  type="number"
                  value={referencePrice}
                  onChange={(e) => setReferencePrice(e.target.value)}
                  className="w-full pl-7 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 font-mono"
                  placeholder="e.g. 7800000"
                />
              </div>
              <button
                id="analyze-gap-btn"
                onClick={() => {
                  const refNum = parseFloat(referencePrice);
                  if (refNum > 0) fetchGap(selectedSymbol, refNum);
                }}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ background: 'linear-gradient(135deg, hsl(199,89%,48%), hsl(221,83%,53%))' }}>
                Analyze
              </button>
            </div>
          </div>
        </div>

        {/* Center: Gap analysis */}
        <div>
          {gap ? (
            <GapPanel gap={gap} />
          ) : (
            <div className="glass-card p-5 flex flex-col items-center justify-center h-64 text-center">
              <Activity className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-white text-sm font-medium mb-1">No gap analysis yet</p>
              <p className="text-muted-foreground text-xs">Enter a reference price to analyze the price gap</p>
            </div>
          )}
        </div>

        {/* Right: Order book */}
        <div>
          <OrderBookPanel orderBook={orderBook} />
        </div>
      </div>

      {/* Latency breakdown */}
      {latency && latency.sampleCount > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <h3 className="font-semibold text-white text-sm">Latency Distribution (Last 5 min)</h3>
            <span className="ml-auto text-xs text-muted-foreground">{latency.sampleCount} samples</span>
          </div>
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: 'p50 (Median)', value: formatLatency(latency.p50) },
              { label: 'p95', value: formatLatency(latency.p95) },
              { label: 'p99', value: formatLatency(latency.p99) },
              { label: 'Min', value: formatLatency(latency.min) },
              { label: 'Max', value: formatLatency(latency.max) },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-muted-foreground text-xs mb-1">{stat.label}</p>
                <p className="font-mono font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
