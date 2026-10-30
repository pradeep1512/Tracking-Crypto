'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Repeat,
  X,
} from 'lucide-react';
import type { ExpiryCalendarItem, AssetCategory } from '@/types';
import { cn } from '@/lib/utils';

export default function ExpiryCalendarPage() {
  const [calendarItems, setCalendarItems] = useState<ExpiryCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Rollover modal state
  const [selectedItemForRoll, setSelectedItemForRoll] = useState<ExpiryCalendarItem | null>(null);
  const [targetExpiry, setTargetExpiry] = useState('');
  const [rolloverLoading, setRolloverLoading] = useState(false);
  const [rolloverSuccess, setRolloverSuccess] = useState<string | null>(null);

  const fetchCalendar = useCallback(async () => {
    try {
      const res = await fetch('/api/expiry/calendar');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCalendarItems(json.data);
        setLoading(false);
      }
    } catch {
      // Handled
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
    const interval = setInterval(fetchCalendar, 10000);
    return () => clearInterval(interval);
  }, [fetchCalendar]);

  const filteredItems = calendarItems.filter((item) => {
    const matchesCategory =
      filterCategory === 'ALL' || item.category === filterCategory;
    const matchesSearch =
      item.contractName.toLowerCase().includes(search.toLowerCase()) ||
      item.symbol.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleExecuteRollover = async () => {
    if (!selectedItemForRoll || !targetExpiry) return;
    setRolloverLoading(true);
    setRolloverSuccess(null);

    try {
      const res = await fetch('/api/expiry/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId: 'port_mcx_precious',
          positionId: 'pos_gold_1',
          currentExpiry: selectedItemForRoll.expiryDate,
          nextExpiry: targetExpiry,
          userConfirmed: true,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setRolloverSuccess(json.data.message);
        setTimeout(() => {
          setSelectedItemForRoll(null);
          setRolloverSuccess(null);
        }, 1800);
      }
    } catch {
      alert('Rollover failed');
    } finally {
      setRolloverLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Contract Expiry & Rollover Calendar</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              Exchange Lifecycle Engine
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Monitor approaching contract expiries, tender periods, and execute authorized rollovers without physical delivery penalty
          </p>
        </div>
      </div>

      {/* Category Filter Pills & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Contracts' },
            { id: 'MCX_COMMODITY', label: 'MCX Commodities' },
            { id: 'CRYPTO', label: 'Crypto Options' },
            { id: 'OPTION', label: 'Commodity Options' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border',
                filterCategory === cat.id
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow'
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
            placeholder="Search expiring contract..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-muted-foreground focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Expiry Calendar Table */}
      <div className="glass-card p-6 overflow-x-auto">
        <div className="min-w-[850px]">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 text-muted-foreground text-left">
                <th className="py-3">Contract Instrument</th>
                <th className="py-3">Category</th>
                <th className="py-3">Expiry Date</th>
                <th className="py-3">Days Remaining</th>
                <th className="py-3">Settlement Type</th>
                <th className="py-3">Status</th>
                <th className="py-3 text-right">Rollover Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredItems.map((item) => {
                const isUrgent = item.daysRemaining <= 5;
                const isExpired = item.status === 'EXPIRED';

                return (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5">
                      <span className="font-bold text-white text-sm block">{item.contractName}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        LTP: ₹{item.currentLTP.toLocaleString('en-IN')} • OI: {item.openInterest.toLocaleString()}
                      </span>
                    </td>

                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-muted-foreground">
                        {item.category.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 font-bold text-white">{item.expiryDate}</td>

                    <td className="py-3.5">
                      <span
                        className={cn(
                          'px-2 py-1 rounded text-xs font-bold font-mono',
                          isExpired
                            ? 'bg-rose-500/20 text-rose-300'
                            : isUrgent
                            ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                            : 'bg-emerald-500/10 text-emerald-300'
                        )}
                      >
                        {isExpired ? '0 days (Expired)' : `${item.daysRemaining} days left`}
                      </span>
                    </td>

                    <td className="py-3.5">
                      <span className="text-muted-foreground">
                        {item.settlementType === 'PHYSICAL_DELIVERY' ? 'Physical Tender' : 'Cash Settled'}
                      </span>
                    </td>

                    <td className="py-3.5">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-bold',
                          item.status === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : item.status === 'TENDER_PERIOD'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400'
                        )}
                      >
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 text-right">
                      {item.rolloverEligible && (
                        <button
                          onClick={() => {
                            setSelectedItemForRoll(item);
                            setTargetExpiry('2026-12-05');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500 text-cyan-300 hover:text-black border border-cyan-500/30 font-bold text-xs transition-colors flex items-center gap-1.5 ml-auto"
                        >
                          <Repeat className="w-3.5 h-3.5" />
                          <span>Rollover</span>
                        </button>
                      )}
                      {isExpired && (
                        <span className="text-muted-foreground text-[11px]">Orders Disabled</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rollover Modal */}
      {selectedItemForRoll && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 border-cyan-500/40 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Repeat className="w-5 h-5 text-cyan-400" />
                <span>Contract Rollover Assistant</span>
              </h3>
              <button onClick={() => setSelectedItemForRoll(null)} className="text-muted-foreground hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-black/40 border border-white/5 space-y-1">
                <span className="text-muted-foreground">Current Expiring Contract:</span>
                <p className="font-bold text-white text-sm">{selectedItemForRoll.contractName}</p>
                <p className="text-[11px] text-amber-400">Days to expiry: {selectedItemForRoll.daysRemaining}</p>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1">Target Next-Month Expiry Date:</label>
                <input
                  type="date"
                  value={targetExpiry}
                  onChange={(e) => setTargetExpiry(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                <p className="font-bold">Estimated Rollover Spread: ₹35.00 (0.04%)</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Near month will be closed at market and next month re-opened with zero downtime.
                </p>
              </div>

              {rolloverSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{rolloverSuccess}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSelectedItemForRoll(null)}
                className="px-4 py-2 rounded-lg border border-white/10 text-xs font-semibold text-muted-foreground hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRollover}
                disabled={rolloverLoading}
                className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-colors shadow flex items-center gap-2"
              >
                {rolloverLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
                <span>Authorize & Execute Rollover</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
