'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Clock,
  ArrowUpDown,
  RefreshCw,
  Coins,
  Layers,
  Briefcase,
  PlayCircle,
  ShieldCheck,
  Radio,
  Sliders,
  Calendar,
} from 'lucide-react';
import type { Ticker, LatencyStats, OrderBook } from '@/types';
import { formatPercent, formatLatency, formatAge, cn } from '@/lib/utils';

const SYMBOLS = ['BTCUSD', 'ETHUSD', 'SOLUSD'];
const EXCHANGE = 'delta';
const POLL_INTERVAL = 2500; // ms

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'cyan',
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'cyan' | 'emerald' | 'rose' | 'amber' | 'purple';
}) {
  const colors = {
    cyan: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30 shadow-[0_0_10px_rgba(250,204,21,0.15)]',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    amber: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  return (
    <div className="glass-card p-5 transition-all hover:border-yellow-400/30 bg-[#0c0c0f]">
      <div className="flex items-start justify-between mb-3">
        <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">{title}</p>
        <div className={cn('p-2 rounded-lg border', colors[color])}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <p className="text-2xl font-black text-white font-mono mb-1">{value}</p>
      {subtitle && (
        <p className={cn('text-xs font-semibold', trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-zinc-400')}>
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
        'w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left cursor-pointer',
        selected
          ? 'bg-yellow-400/15 border-yellow-400/40 shadow-[0_0_15px_rgba(250,204,21,0.2)]'
          : 'glass border-transparent hover:border-yellow-400/20',
        flash === 'up' && 'flash-up',
        flash === 'down' && 'flash-down'
      )}>
      <div>
        <p className="font-semibold text-white text-sm">{ticker.symbol}</p>
        <p className="text-muted-foreground text-xs">Delta Exchange India</p>
      </div>
      <div className="text-right">
        <p className="font-mono font-bold text-white text-sm">
          ${ticker.lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

function MarketTelemetryPanel({ ticker }: { ticker: Ticker | null }) {
  if (!ticker) {
    return (
      <div className="glass-card p-5 flex items-center justify-center h-64 text-muted-foreground text-xs">
        Connecting to Delta Exchange feed...
      </div>
    );
  }

  const spread = Math.max(0, (ticker.askPrice ?? ticker.lastPrice) - (ticker.bidPrice ?? ticker.lastPrice));

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-white text-sm">Delta Market Telemetry</h3>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
          LIVE QUOTE
        </span>
      </div>

      <div className="space-y-3 font-mono text-xs">
        <div className="flex justify-between items-center py-1 border-b border-white/5">
          <span className="text-muted-foreground">Contract Asset</span>
          <span className="font-bold text-white">{ticker.symbol}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-white/5">
          <span className="text-muted-foreground">Last Traded Price</span>
          <span className="font-bold text-cyan-400 text-sm">${ticker.lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-white/5">
          <span className="text-muted-foreground">Exchange Mark Price</span>
          <span className="font-bold text-white">${(ticker.markPrice || ticker.lastPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-white/5">
          <span className="text-muted-foreground">Best Bid / Ask</span>
          <span className="font-bold text-white">
            <span className="text-emerald-400">${(ticker.bidPrice ?? ticker.lastPrice).toFixed(2)}</span> /{' '}
            <span className="text-rose-400">${(ticker.askPrice ?? ticker.lastPrice).toFixed(2)}</span>
          </span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-white/5">
          <span className="text-muted-foreground">Bid-Ask Spread</span>
          <span className="font-bold text-amber-300">${spread.toFixed(2)} ({formatPercent(ticker.spreadPercentage)})</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-white/5">
          <span className="text-muted-foreground">24h Volume</span>
          <span className="font-bold text-white">{ticker.volume24h ? ticker.volume24h.toLocaleString() : 'N/A'}</span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-muted-foreground">Feed Latency</span>
          <span className="font-bold text-emerald-400">{ticker.dataAgeMs}ms</span>
        </div>
      </div>

      <div className="pt-2">
        <Link
          href="/dashboard/options"
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold hover:bg-cyan-500/30 transition-all cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Trade {ticker.symbol.replace('USD', '')} Options Chain →</span>
        </Link>
      </div>
    </div>
  );
}

function OrderBookPanel({ orderBook }: { orderBook: OrderBook | null }) {
  if (!orderBook) {
    return (
      <div className="glass-card p-5 flex items-center justify-center h-64 text-muted-foreground text-xs">
        Loading Delta Exchange order book...
      </div>
    );
  }

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-cyan-400" />
          <span>Delta L2 Order Book</span>
        </h3>
        <span className="text-[11px] font-mono text-muted-foreground">
          {orderBook.dataAgeMs}ms latency
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        {/* Asks (Red) */}
        <div>
          <span className="text-rose-400 text-[10px] uppercase font-bold block mb-1">Asks (Sell)</span>
          <div className="space-y-1">
            {orderBook.asks.slice(0, 5).reverse().map((a, i) => (
              <div key={i} className="flex justify-between items-center text-rose-300">
                <span>${a.price.toFixed(2)}</span>
                <span className="text-zinc-400">{a.quantity.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bids (Green) */}
        <div>
          <span className="text-emerald-400 text-[10px] uppercase font-bold block mb-1">Bids (Buy)</span>
          <div className="space-y-1">
            {orderBook.bids.slice(0, 5).map((b, i) => (
              <div key={i} className="flex justify-between items-center text-emerald-300">
                <span>${b.price.toFixed(2)}</span>
                <span className="text-zinc-400">{b.quantity.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardOverviewPage() {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState(SYMBOLS[0]);
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [latency, setLatency] = useState<LatencyStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTickers = useCallback(async () => {
    try {
      const res = await fetch(`/api/market/tickers?exchange=${EXCHANGE}&symbols=${SYMBOLS.join(',')}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTickers(data.data);
        setLoading(false);
      }
    } catch (e) {
      console.error('Tickers error:', e);
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

  const fetchLatency = useCallback(async () => {
    try {
      const res = await fetch('/api/latency/metrics?type=MARKET_DATA&window=5');
      const data = await res.json();
      if (data.success) setLatency(data.data);
    } catch (e) {
      console.error('Latency error:', e);
    }
  }, []);

  useEffect(() => {
    fetchTickers();
    fetchOrderBook(selectedSymbol);
    fetchLatency();
  }, [fetchTickers, fetchOrderBook, fetchLatency, selectedSymbol]);

  useEffect(() => {
    const interval = setInterval(fetchTickers, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchTickers]);

  useEffect(() => {
    const interval = setInterval(() => fetchOrderBook(selectedSymbol), 3000);
    return () => clearInterval(interval);
  }, [fetchOrderBook, selectedSymbol]);

  useEffect(() => {
    const interval = setInterval(fetchLatency, 6000);
    return () => clearInterval(interval);
  }, [fetchLatency]);

  const selectedTicker = tickers.find((t) => t.symbol === selectedSymbol) || tickers[0] || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin shadow-[0_0_15px_rgba(250,204,21,0.3)]" />
          <p className="text-zinc-400 text-sm font-medium">Connecting to Delta Exchange market data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2 tracking-wide uppercase">
            <span>Market Intelligence Dashboard</span>
            <span className="px-2.5 py-0.5 rounded-full bg-yellow-400/15 text-yellow-300 text-xs font-black border border-yellow-400/40 shadow-[0_0_10px_rgba(250,204,21,0.2)]">
              Delta Exchange Sole Feed
            </span>
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
            Real-time quotes, order books & options chain • Native USD Quotes
          </p>
        </div>

        {/* Quick Launchers */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Link
            href="/dashboard/crypto"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-400/15 border border-yellow-400/40 text-yellow-300 text-xs font-bold hover:bg-yellow-400/25 transition-all shadow-[0_0_10px_rgba(250,204,21,0.15)] whitespace-nowrap"
          >
            <Coins className="w-3.5 h-3.5 text-yellow-400" />
            <span>Crypto Markets</span>
          </Link>
          <Link
            href="/dashboard/options"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141418] border border-yellow-500/20 text-yellow-300 text-xs font-bold hover:bg-yellow-400/10 transition-colors whitespace-nowrap"
          >
            <Layers className="w-3.5 h-3.5 text-yellow-400" />
            <span>Crypto Options</span>
          </Link>
          <Link
            href="/dashboard/portfolio"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141418] border border-white/10 text-zinc-300 text-xs font-bold hover:bg-white/5 transition-colors whitespace-nowrap"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>My Portfolio</span>
          </Link>
          <Link
            href="/dashboard/active-trading"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141418] border border-white/10 text-zinc-300 text-xs font-bold hover:bg-white/5 transition-colors whitespace-nowrap"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Active Trading</span>
          </Link>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="BTC/USD Live"
          value={selectedTicker ? `$${selectedTicker.lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
          subtitle={selectedTicker ? `Spread: $${selectedTicker.spread.toFixed(2)}` : undefined}
          icon={TrendingUp}
          trend="up"
          color="cyan"
        />
        <StatCard
          title="Exchange Mark Price"
          value={selectedTicker ? `$${(selectedTicker.markPrice || selectedTicker.lastPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
          subtitle="Delta Exchange Official"
          icon={ShieldCheck}
          color="emerald"
        />
        <StatCard
          title="Delta P95 Latency"
          value={latency ? formatLatency(latency.p95) : '—'}
          subtitle={latency ? `Mean: ${formatLatency(latency.mean)}` : 'Measuring...'}
          icon={Zap}
          color="purple"
        />
        <StatCard
          title="Data Freshness"
          value={selectedTicker ? formatAge(selectedTicker.dataAgeMs) : '—'}
          subtitle={selectedTicker && selectedTicker.dataAgeMs > 5000 ? '⚠ Stale' : 'Live & Fresh'}
          icon={Clock}
          trend={selectedTicker && selectedTicker.dataAgeMs > 5000 ? 'down' : 'up'}
          color={selectedTicker && selectedTicker.dataAgeMs > 5000 ? 'rose' : 'emerald'}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Ticker list */}
        <div className="space-y-4">
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Delta Exchange Watchlist</h3>
            <div className="space-y-2">
              {tickers.map((t) => (
                <TickerRow
                  key={t.symbol}
                  ticker={t}
                  selected={t.symbol === selectedSymbol}
                  onClick={() => setSelectedSymbol(t.symbol)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Center: Market Telemetry */}
        <div>
          <MarketTelemetryPanel ticker={selectedTicker} />
        </div>

        {/* Right: Order book */}
        <div>
          <OrderBookPanel orderBook={orderBook} />
        </div>
      </div>
    </div>
  );
}
