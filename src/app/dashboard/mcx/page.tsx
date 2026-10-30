'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  Clock,
  ShieldCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  BarChart2,
  Sparkles,
} from 'lucide-react';
import type { CommodityTicker, CommodityCategory } from '@/types';
import { formatPercent, cn } from '@/lib/utils';

export default function MCXCommoditiesPage() {
  const [tickers, setTickers] = useState<CommodityTicker[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CommodityCategory | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedTicker, setSelectedTicker] = useState<CommodityTicker | null>(null);
  const [marketStatus, setMarketStatus] = useState<{ status: string; sessionName: string }>({
    status: 'OPEN',
    sessionName: 'MCX Regular Trading Session',
  });

  const fetchCommodities = useCallback(async () => {
    try {
      const url =
        selectedCategory === 'ALL'
          ? '/api/mcx/tickers'
          : `/api/mcx/tickers?category=${selectedCategory}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTickers(json.data);
        if (!selectedTicker && json.data.length > 0) {
          setSelectedTicker(json.data[0]);
        }
        setLoading(false);
      }

      // Fetch status
      const specRes = await fetch('/api/mcx/specifications');
      const specJson = await specRes.json();
      if (specJson.success && specJson.data.marketStatus) {
        setMarketStatus(specJson.data.marketStatus);
      }
    } catch {
      // Handled
    }
  }, [selectedCategory, selectedTicker]);

  useEffect(() => {
    fetchCommodities();
    const interval = setInterval(fetchCommodities, 2500);
    return () => clearInterval(interval);
  }, [fetchCommodities]);

  const filteredTickers = tickers.filter(
    (t) =>
      t.contractName.toLowerCase().includes(search.toLowerCase()) ||
      t.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">MCX Commodities Terminal</h1>
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5',
                marketStatus.status === 'OPEN'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              )}
            >
              <span className={cn('w-2 h-2 rounded-full', marketStatus.status === 'OPEN' ? 'bg-emerald-400 pulse-dot' : 'bg-amber-400')} />
              {marketStatus.sessionName}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Official Multi Commodity Exchange of India (MCX) listed contracts • Gold, Silver, Crude & Base Metals
          </p>
        </div>

        {/* Data Source Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Feed: Authorized Broker / Member Gateway</span>
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Commodities' },
            { id: 'PRECIOUS_METALS', label: 'Precious Metals (Gold & Silver)' },
            { id: 'ENERGY', label: 'Energy (Crude & Gas)' },
            { id: 'BASE_METALS', label: 'Base Metals' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as CommodityCategory | 'ALL')}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border',
                selectedCategory === cat.id
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 shadow'
                  : 'glass border-transparent text-muted-foreground hover:text-white hover:border-white/10'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search MCX contract..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-muted-foreground focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Main Grid: Contracts Table & Active Contract Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Tickers Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredTickers.map((t) => {
              const isSelected = selectedTicker?.symbol === t.symbol;
              const isPositive = t.changeAmount >= 0;

              return (
                <div
                  key={t.symbol}
                  onClick={() => setSelectedTicker(t)}
                  className={cn(
                    'p-4 rounded-xl border transition-all cursor-pointer text-left',
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-lg'
                      : 'glass border-transparent hover:border-white/10 hover:bg-white/[0.03]'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-sm">{t.contractName}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        Lot: {t.unit} • Expiry: {t.expiryDate} ({t.daysToExpiry}d left)
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-mono font-extrabold text-white text-base">
                        ₹{t.lastPrice.toLocaleString('en-IN')}
                      </p>
                      <p className={cn('text-xs font-mono font-medium', isPositive ? 'text-emerald-400' : 'text-rose-400')}>
                        {isPositive ? '+' : ''}{t.changeAmount} ({formatPercent(t.changePercentage, false)})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/5 text-[11px] text-muted-foreground font-mono">
                    <span>Bid: ₹{t.bestBid.toLocaleString('en-IN')}</span>
                    <span>Ask: ₹{t.bestAsk.toLocaleString('en-IN')}</span>
                    <span>OI: {t.openInterest.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Contract Deep Inspector */}
        <div className="space-y-4">
          {selectedTicker ? (
            <div className="glass-card p-6 border-amber-500/30 space-y-5 sticky top-6">
              <div className="border-b border-white/10 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-bold tracking-wider text-amber-400">
                    {selectedTicker.category.replace('_', ' ')}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                    {selectedTicker.dataSource}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-white mt-1">{selectedTicker.contractName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  Symbol: {selectedTicker.symbol} • Active Delivery
                </p>
              </div>

              {/* Price Highlight */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-center">
                <span className="text-xs text-muted-foreground uppercase font-medium">Last Traded Price</span>
                <div className="text-3xl font-mono font-black text-white mt-1">
                  ₹{selectedTicker.lastPrice.toLocaleString('en-IN')}
                </div>
                <p className={cn('text-xs font-mono font-medium mt-1', selectedTicker.changeAmount >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                  {selectedTicker.changeAmount >= 0 ? '▲ +' : '▼ '}{selectedTicker.changeAmount} ({formatPercent(selectedTicker.changePercentage, false)}) Today
                </p>
              </div>

              {/* Contract Specs Grid */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-muted-foreground">Lot Size:</span>
                  <span className="font-mono font-bold text-white">{selectedTicker.unit}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-muted-foreground">Contract Expiry:</span>
                  <span className="font-mono font-bold text-amber-400">{selectedTicker.expiryDate} ({selectedTicker.daysToExpiry} days left)</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-muted-foreground">Market Spread:</span>
                  <span className="font-mono font-bold text-white">₹{selectedTicker.spread} ({formatPercent(selectedTicker.spreadPercentage, false)})</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-muted-foreground">Open Interest:</span>
                  <span className="font-mono font-bold text-white">{selectedTicker.openInterest.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-muted-foreground">Day Range:</span>
                  <span className="font-mono font-bold text-white">₹{selectedTicker.lowPrice.toLocaleString()} - ₹{selectedTicker.highPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-muted-foreground">Trading Session:</span>
                  <span className="font-mono font-bold text-emerald-400">09:00 - 23:30 IST</span>
                </div>
              </div>

              {/* Quick Action Button to Add to Portfolio */}
              <div className="pt-2">
                <a
                  href={`/dashboard/portfolio?addSymbol=${selectedTicker.symbol}&name=${encodeURIComponent(selectedTicker.contractName)}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors shadow-lg"
                >
                  <Layers className="w-4 h-4" />
                  <span>Add Contract to Portfolio</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="glass-card p-8 text-center text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
              <p>Loading MCX contracts...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
