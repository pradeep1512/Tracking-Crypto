'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  ArrowUpDown,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Radio,
  Layers,
} from 'lucide-react';
import type { Ticker } from '@/types';
import { formatPercent, formatLatency, formatAge, cn } from '@/lib/utils';

const DELTA_CRYPTO_ASSETS = [
  { symbol: 'BTCUSD', name: 'Bitcoin', icon: '₿', base: 'BTC', description: 'Delta BTC/USD Perpetual & Options Benchmark' },
  { symbol: 'ETHUSD', name: 'Ethereum', icon: 'Ξ', base: 'ETH', description: 'Delta ETH/USD Perpetual & Options Benchmark' },
  { symbol: 'SOLUSD', name: 'Solana', icon: '◎', base: 'SOL', description: 'Delta SOL/USD Perpetual' },
  { symbol: 'XRPUSD', name: 'XRP', icon: '✕', base: 'XRP', description: 'Delta XRP/USD Perpetual' },
  { symbol: 'DOGEUSD', name: 'Dogecoin', icon: 'Ð', base: 'DOGE', description: 'Delta DOGE/USD Perpetual' },
];

export default function CryptoMarketsPage() {
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSD');
  const [search, setSearch] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [priceFlash, setPriceFlash] = useState<Record<string, 'up' | 'down' | null>>({});

  const fetchTickers = useCallback(async () => {
    try {
      const symbolsParam = DELTA_CRYPTO_ASSETS.map((c) => c.symbol).join(',');
      const res = await fetch(`/api/market/tickers?exchange=delta&symbols=${symbolsParam}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const map: Record<string, Ticker> = {};
        for (const t of json.data) {
          map[t.symbol] = t;
        }
        setTickers(map);
        setLastUpdate(new Date());
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to fetch Delta Exchange tickers:', err);
    }
  }, []);

  useEffect(() => {
    fetchTickers();
    const interval = setInterval(fetchTickers, 2500);
    return () => clearInterval(interval);
  }, [fetchTickers]);

  const activeTicker = tickers[selectedSymbol];
  const activeAsset = DELTA_CRYPTO_ASSETS.find((c) => c.symbol === selectedSymbol) || DELTA_CRYPTO_ASSETS[0];

  const filteredAssets = DELTA_CRYPTO_ASSETS.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-5 border-yellow-500/20">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-400" />
              <span>Delta Exchange Crypto Markets</span>
            </h1>
            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-400 pulse-dot" />
              Sole Source: Delta Exchange India
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time live feeds with exchange timestamps and native USD contract quotes (no currency conversion).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-muted-foreground">Provider:</span>
            <span className="font-bold text-white">Delta Exchange India (api.india.delta.exchange)</span>
          </div>
        </div>
      </div>

      {/* Grid: Assets Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {DELTA_CRYPTO_ASSETS.map((asset) => {
          const ticker = tickers[asset.symbol];
          const isSelected = selectedSymbol === asset.symbol;
          const price = ticker?.lastPrice;

          return (
            <button
              key={asset.symbol}
              onClick={() => setSelectedSymbol(asset.symbol)}
              className={cn(
                'p-4 rounded-xl border text-left transition-all relative overflow-hidden',
                isSelected
                  ? 'bg-yellow-400/15 border-yellow-400/50 shadow-lg shadow-yellow-500/10'
                  : 'glass border-transparent hover:border-white/10'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{asset.icon}</span>
                  <span className="font-bold text-white text-xs">{asset.base}</span>
                </div>
                <span className="text-[10px] font-mono text-yellow-400 font-bold">USD</span>
              </div>

              <div className="text-base font-black font-mono text-white mb-1">
                {price ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '...'}
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Spread:</span>
                <span className="font-mono text-zinc-300">
                  {ticker ? `${ticker.spreadPercentage.toFixed(3)}%` : '-'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail Showcase Card */}
      {activeTicker && (
        <div className="glass-card p-6 border-yellow-500/30 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{activeAsset.icon}</span>
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2 font-mono">
                  <span>{activeAsset.name}</span>
                  <span className="text-sm font-normal text-muted-foreground">({activeTicker.symbol})</span>
                </h2>
                <p className="text-xs text-muted-foreground">{activeAsset.description}</p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-black font-mono text-white">
                ${activeTicker.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </div>
              <div className="flex items-center justify-end gap-2 text-xs font-mono text-emerald-400 mt-1">
                <span>Delta Mark: ${activeTicker.lastPrice.toFixed(2)}</span>
                <span>•</span>
                <span>Spread: ${activeTicker.spread.toFixed(2)} ({activeTicker.spreadPercentage.toFixed(3)}%)</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
            <div className="p-3 rounded-lg bg-black/40 border border-white/10">
              <span className="text-muted-foreground text-[10px] block">BEST BID</span>
              <span className="text-base font-bold text-emerald-400">${activeTicker.bestBid.toFixed(2)}</span>
              <span className="text-[10px] text-zinc-500 block mt-0.5">Size: {activeTicker.bidQuantity.toLocaleString()}</span>
            </div>

            <div className="p-3 rounded-lg bg-black/40 border border-white/10">
              <span className="text-muted-foreground text-[10px] block">BEST ASK</span>
              <span className="text-base font-bold text-rose-400">${activeTicker.bestAsk.toFixed(2)}</span>
              <span className="text-[10px] text-zinc-500 block mt-0.5">Size: {activeTicker.askQuantity.toLocaleString()}</span>
            </div>

            <div className="p-3 rounded-lg bg-black/40 border border-white/10">
              <span className="text-muted-foreground text-[10px] block">24H VOLUME</span>
              <span className="text-base font-bold text-white">{(activeTicker.volume24h || 0).toLocaleString()}</span>
              <span className="text-[10px] text-zinc-500 block mt-0.5">Contracts traded</span>
            </div>

            <div className="p-3 rounded-lg bg-black/40 border border-white/10">
              <span className="text-muted-foreground text-[10px] block">DATA FRESHNESS</span>
              <span className="text-base font-bold text-yellow-400">{activeTicker.dataAgeMs} ms</span>
              <span className="text-[10px] text-zinc-500 block mt-0.5">Exchange latency</span>
            </div>
          </div>

          {/* Exchange Attribution Banner */}
          <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <span className="text-zinc-300">
                Official exchange data supplied directly by <strong>Delta Exchange India</strong> REST and WebSocket streams.
              </span>
            </div>
            <div className="text-muted-foreground font-mono text-[11px]">
              Timestamp: {new Date(activeTicker.exchangeTimestamp).toUTCString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
