'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Wifi,
  WifiOff,
  Zap,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useMarketStream } from '@/hooks/useMarketStream';
import { formatCurrency, formatPercent, formatLatency } from '@/lib/utils/api';
import type { Ticker } from '@/types';

const SYMBOL_OPTIONS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin / USDT', currency: 'USDT' },
  { symbol: 'ETHUSDT', name: 'Ethereum / USDT', currency: 'USDT' },
  { symbol: 'SOLUSDT', name: 'Solana / USDT', currency: 'USDT' },
  { symbol: 'BNBUSDT', name: 'BNB / USDT', currency: 'USDT' },
  { symbol: 'BTCINR', name: 'Bitcoin / INR (Est.)', currency: 'INR' },
  { symbol: 'ETHINR', name: 'Ethereum / INR (Est.)', currency: 'INR' },
];

export default function MarketsPage() {
  const [exchangeId, setExchangeId] = useState<'binance' | 'mock'>('binance');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSDT');
  const [allTickers, setAllTickers] = useState<Record<string, Ticker>>({});
  const [priceFlash, setPriceFlash] = useState<Record<string, 'up' | 'down' | null>>({});

  // Real-time live stream for selected symbol
  const stream = useMarketStream({
    symbol: selectedSymbol,
    exchangeId,
  });

  // Track price flashing when ticker updates
  const prevPriceRef = useRef<number | null>(null);
  useEffect(() => {
    if (stream.ticker) {
      const curPrice = stream.ticker.lastPrice;
      const prevPrice = prevPriceRef.current;
      if (prevPrice !== null && curPrice !== prevPrice) {
        const direction = curPrice > prevPrice ? 'up' : 'down';
        setPriceFlash((prev) => ({ ...prev, [selectedSymbol]: direction }));
        const t = setTimeout(() => {
          setPriceFlash((prev) => ({ ...prev, [selectedSymbol]: null }));
        }, 600);
        return () => clearTimeout(t);
      }
      prevPriceRef.current = curPrice;
    }
  }, [stream.ticker, selectedSymbol]);

  // Poll tickers for the top selector cards
  useEffect(() => {
    let mounted = true;
    async function fetchAll() {
      try {
        const symbols = SYMBOL_OPTIONS.map((s) => s.symbol).join(',');
        const res = await fetch(`/api/market/tickers?exchange=${exchangeId}&symbols=${symbols}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && mounted) {
          const map: Record<string, Ticker> = {};
          json.data.forEach((t: Ticker) => {
            map[t.symbol] = t;
          });
          setAllTickers(map);
        }
      } catch (err) {
        console.error('Error fetching market tickers:', err);
      }
    }

    fetchAll();
    const interval = setInterval(fetchAll, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [exchangeId]);

  const activeTicker = stream.ticker ?? allTickers[selectedSymbol];
  const activeOrderBook = stream.orderBook;
  const currentSymbolMeta = SYMBOL_OPTIONS.find((s) => s.symbol === selectedSymbol) ?? SYMBOL_OPTIONS[0];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Live Markets & Order Book</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Phase 2 Streaming
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time public exchange WebSocket & REST feeds with millisecond latency diagnostics.
          </p>
        </div>

        {/* Exchange Selector & Connection Status */}
        <div className="flex items-center gap-3">
          <div className="glass px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs">
            {stream.status === 'connected' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
                <span className="text-emerald-400 font-medium">WS Live</span>
                <span className="text-muted-foreground border-l border-white/10 pl-2">
                  {stream.latencyMs}ms latency
                </span>
              </>
            ) : stream.status === 'connecting' ? (
              <>
                <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                <span className="text-amber-400">Connecting...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-rose-400" />
                <span className="text-rose-400">Disconnected</span>
              </>
            )}
          </div>

          <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setExchangeId('binance')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                exchangeId === 'binance'
                  ? 'bg-cyan-500 text-black shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              Binance Public
            </button>
            <button
              onClick={() => setExchangeId('mock')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                exchangeId === 'mock'
                  ? 'bg-amber-500 text-black shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              Mock (Dev)
            </button>
          </div>
        </div>
      </div>

      {/* Symbol Selection Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {SYMBOL_OPTIONS.map((opt) => {
          const t = allTickers[opt.symbol];
          const isSelected = opt.symbol === selectedSymbol;
          const flash = priceFlash[opt.symbol];

          return (
            <button
              key={opt.symbol}
              onClick={() => setSelectedSymbol(opt.symbol)}
              className={`glass-card p-3 text-left transition-all relative overflow-hidden ${
                isSelected
                  ? 'ring-2 ring-cyan-500/60 bg-cyan-500/5'
                  : 'hover:bg-white/5 opacity-80 hover:opacity-100'
              } ${flash === 'up' ? 'flash-up' : flash === 'down' ? 'flash-down' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-semibold text-white">{opt.symbol}</span>
                {t?.isMock && (
                  <span className="text-[10px] text-amber-400/80 bg-amber-400/10 px-1 rounded">
                    MOCK
                  </span>
                )}
              </div>
              <p className="text-base font-bold font-mono text-white">
                {t ? formatCurrency(t.lastPrice, opt.currency) : '—'}
              </p>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                <span>Spread:</span>
                <span className="font-mono text-cyan-400">
                  {t ? `${t.spreadPercentage.toFixed(3)}%` : '—'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Focus: Live Pair Overview + Live Order Book */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Ticker Detail & Quick Actions */}
        <div className="space-y-6">
          {/* Active Ticker Hero Card */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  {selectedSymbol}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({currentSymbolMeta.name})
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Feed Source: {activeTicker?.exchangeName ?? exchangeId}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-muted-foreground">Last Traded</span>
                <p className="text-2xl font-bold font-mono text-white">
                  {activeTicker ? formatCurrency(activeTicker.lastPrice, currentSymbolMeta.currency) : '—'}
                </p>
              </div>
            </div>

            {/* 24h Stats Grid */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5 text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground">Best Bid</span>
                <p className="font-mono text-emerald-400 font-semibold">
                  {activeTicker ? formatCurrency(activeTicker.bestBid, currentSymbolMeta.currency) : '—'}
                </p>
                <span className="text-[10px] text-muted-foreground">
                  Qty: {activeTicker?.bidQuantity ?? '—'}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-muted-foreground">Best Ask</span>
                <p className="font-mono text-rose-400 font-semibold">
                  {activeTicker ? formatCurrency(activeTicker.bestAsk, currentSymbolMeta.currency) : '—'}
                </p>
                <span className="text-[10px] text-muted-foreground">
                  Qty: {activeTicker?.askQuantity ?? '—'}
                </span>
              </div>

              <div className="space-y-1 pt-2 border-t border-white/5">
                <span className="text-muted-foreground">Spread</span>
                <p className="font-mono text-cyan-400">
                  {activeTicker ? `${formatCurrency(activeTicker.spread, currentSymbolMeta.currency)} (${activeTicker.spreadPercentage.toFixed(3)}%)` : '—'}
                </p>
              </div>

              <div className="space-y-1 pt-2 border-t border-white/5">
                <span className="text-muted-foreground">24h Volume</span>
                <p className="font-mono text-white">
                  {activeTicker?.volume24h ? activeTicker.volume24h.toLocaleString() : '—'}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <Link
                href={`/dashboard/price-gap?symbol=${selectedSymbol}&exchange=${exchangeId}`}
                className="w-full py-2.5 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                Analyze Price Gap for {selectedSymbol}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                href={`/dashboard/orders?symbol=${selectedSymbol}&exchange=${exchangeId}`}
                className="w-full py-2.5 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
              >
                Simulate Paper Order
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Latency & Telemetry Box */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Activity className="w-4 h-4 text-cyan-400" />
              Stream Freshness & Telemetry
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client Latency</span>
                <span className="font-mono text-emerald-400 font-medium">
                  {stream.latencyMs} ms
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Exchange Age</span>
                <span className="font-mono text-white">
                  {activeTicker ? `${activeTicker.dataAgeMs} ms` : '—'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Exchange Timestamp</span>
                <span className="font-mono text-muted-foreground text-[11px]">
                  {activeTicker?.exchangeTimestamp
                    ? new Date(activeTicker.exchangeTimestamp).toLocaleTimeString()
                    : '—'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Stale Threshold</span>
                <span className="font-mono text-muted-foreground">3,000 ms</span>
              </div>
            </div>

            {stream.isStale && (
              <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-[11px] text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Data stream is older than 3 seconds. Check network connection.
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Live Order Book Depth Ladder */}
        <div className="lg:col-span-2 glass-card p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-white">Live Order Book Depth</h3>
              <p className="text-xs text-muted-foreground">
                Level 2 order ladder streaming at 100ms intervals
              </p>
            </div>

            {/* Mid Price Spread Badge */}
            {activeTicker && (
              <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono">
                Mid Price:{' '}
                <span className="text-white font-semibold">
                  {formatCurrency((activeTicker.bestBid + activeTicker.bestAsk) / 2, currentSymbolMeta.currency)}
                </span>
              </div>
            )}
          </div>

          {/* Depth Table */}
          <div className="grid grid-cols-2 gap-4">
            {/* Bids Side (Green) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-emerald-400/80 font-semibold px-2 pb-1 border-b border-white/5">
                <span>Bid Price</span>
                <span>Amount</span>
                <span>Total</span>
              </div>

              <div className="space-y-1">
                {(activeOrderBook?.bids ?? []).slice(0, 12).map((bid, i) => (
                  <div
                    key={`bid-${i}`}
                    className="relative flex justify-between text-xs font-mono py-1 px-2 rounded overflow-hidden"
                  >
                    {/* Depth visualization background bar */}
                    <div
                      className="absolute inset-y-0 right-0 bg-emerald-500/10 transition-all pointer-events-none"
                      style={{ width: `${Math.min(100, bid.depthPercentage)}%` }}
                    />
                    <span className="text-emerald-400 font-semibold z-10">
                      {bid.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-white/80 z-10">{bid.quantity.toFixed(4)}</span>
                    <span className="text-muted-foreground z-10">{bid.total.toFixed(4)}</span>
                  </div>
                ))}
                {(!activeOrderBook || activeOrderBook.bids.length === 0) && (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    Waiting for live bids stream...
                  </div>
                )}
              </div>
            </div>

            {/* Asks Side (Red) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-rose-400/80 font-semibold px-2 pb-1 border-b border-white/5">
                <span>Ask Price</span>
                <span>Amount</span>
                <span>Total</span>
              </div>

              <div className="space-y-1">
                {(activeOrderBook?.asks ?? []).slice(0, 12).map((ask, i) => (
                  <div
                    key={`ask-${i}`}
                    className="relative flex justify-between text-xs font-mono py-1 px-2 rounded overflow-hidden"
                  >
                    {/* Depth visualization background bar */}
                    <div
                      className="absolute inset-y-0 left-0 bg-rose-500/10 transition-all pointer-events-none"
                      style={{ width: `${Math.min(100, ask.depthPercentage)}%` }}
                    />
                    <span className="text-rose-400 font-semibold z-10">
                      {ask.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-white/80 z-10">{ask.quantity.toFixed(4)}</span>
                    <span className="text-muted-foreground z-10">{ask.total.toFixed(4)}</span>
                  </div>
                ))}
                {(!activeOrderBook || activeOrderBook.asks.length === 0) && (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    Waiting for live asks stream...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
