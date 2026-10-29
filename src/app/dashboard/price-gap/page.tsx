'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Database,
  CheckCircle,
  Layers,
  ArrowRight,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils/api';
import type { PriceGapAnalysis, OrderBook, Side } from '@/types';
import { orderBookService, type DetailedVWAPResult } from '@/services/OrderBookService';

const SYMBOL_LIST = [
  { symbol: 'BTCUSDT', name: 'Bitcoin / USDT', currency: 'USDT' },
  { symbol: 'ETHUSDT', name: 'Ethereum / USDT', currency: 'USDT' },
  { symbol: 'SOLUSDT', name: 'Solana / USDT', currency: 'USDT' },
  { symbol: 'BNBUSDT', name: 'BNB / USDT', currency: 'USDT' },
  { symbol: 'BTCINR', name: 'Bitcoin / INR (Est.)', currency: 'INR' },
  { symbol: 'ETHINR', name: 'Ethereum / INR (Est.)', currency: 'INR' },
];

interface HistoricalGapRecord {
  id: string;
  symbol: string;
  side: Side;
  referencePrice: number;
  observedPrice: number;
  estimatedExecutionPrice: number;
  gapAmount: number;
  gapPercentage: number;
  gapClassification: string;
  isWithinTolerance: boolean;
  createdAt: string;
}

export default function PriceGapPage() {
  const [exchangeId, setExchangeId] = useState<'binance' | 'mock'>('binance');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [side, setSide] = useState<Side>('BUY');
  const [referencePrice, setReferencePrice] = useState('');
  const [quantity, setQuantity] = useState('0.1');
  const [tolerance, setTolerance] = useState('1.5');

  const [gap, setGap] = useState<PriceGapAnalysis | null>(null);
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [vwapDetails, setVwapDetails] = useState<DetailedVWAPResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');

  const [history, setHistory] = useState<HistoricalGapRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const activeMeta = SYMBOL_LIST.find((s) => s.symbol === symbol) ?? SYMBOL_LIST[0];

  // Fetch current market price to help prefill reference price
  const prefillWithMarketPrice = async () => {
    try {
      const res = await fetch(`/api/market/tickers?exchange=${exchangeId}&symbols=${symbol}`);
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        const currentTicker = json.data[0];
        setReferencePrice(currentTicker.lastPrice.toString());
      }
    } catch {
      // ignore
    }
  };

  // Fetch historical price gap records from database
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/price-gap/history?limit=10`);
      const json = await res.json();
      if (json.success) {
        setHistory(json.data);
      }
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Main gap calculation and VWAP decomposition
  const analyze = async () => {
    setError('');
    setSavedSuccess(false);
    const refNum = parseFloat(referencePrice);
    if (!refNum || refNum <= 0) {
      setError('Please enter a valid reference price.');
      return;
    }

    setLoading(true);
    try {
      const qtyNum = parseFloat(quantity) || 0.1;

      // 1. Fetch current gap analysis
      const params = new URLSearchParams({
        exchange: exchangeId,
        symbol,
        referencePrice: String(refNum),
        side,
        tolerance,
        quantity: String(qtyNum),
      });

      const [gapRes, obRes] = await Promise.all([
        fetch(`/api/price-gap/current?${params}`),
        fetch(`/api/market/orderbook?exchange=${exchangeId}&symbol=${symbol}&depth=20`),
      ]);

      const gapData = await gapRes.json();
      const obData = await obRes.json();

      if (gapData.success) {
        setGap(gapData.data);
      } else {
        setError(gapData.error || 'Failed to analyze gap.');
      }

      if (obData.success) {
        setOrderBook(obData.data);
        // Phase 3 VWAP engine calculation
        const vwapCalc = orderBookService.calculateDetailedVWAP(obData.data, side, qtyNum);
        setVwapDetails(vwapCalc);
      }
    } catch {
      setError('Network error while analyzing price gap.');
    } finally {
      setLoading(false);
    }
  };

  // Persist current analysis to SQL Server / database
  const persistAnalysis = async () => {
    if (!gap) return;
    setSaving(true);
    try {
      const res = await fetch('/api/price-gap/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis: gap,
          symbol,
          exchangeId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        loadHistory();
      }
    } catch {
      setError('Could not record gap event to database.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Price Gap Monitor & VWAP Engine</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Phase 3 Persistence
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Compare target prices against normalized order book depth, compute volume-weighted slippage, and audit gap events in SQL Server.
          </p>
        </div>

        {/* Exchange Selector Toggle */}
        <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 self-start md:self-auto">
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

      {/* Input Parameters Box */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          Price Gap Parameters & Configuration
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Symbol */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Pair</label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:ring-1 focus:ring-cyan-400"
            >
              {SYMBOL_LIST.map((s) => (
                <option key={s.symbol} value={s.symbol} className="bg-gray-900 text-white">
                  {s.symbol}
                </option>
              ))}
            </select>
          </div>

          {/* Trade Direction */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Direction</label>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              <button
                type="button"
                onClick={() => setSide('BUY')}
                className={`flex-1 py-1.5 text-xs font-semibold transition-all ${
                  side === 'BUY'
                    ? 'bg-emerald-500/20 text-emerald-400 border-r border-emerald-500/30'
                    : 'bg-white/5 text-muted-foreground'
                }`}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setSide('SELL')}
                className={`flex-1 py-1.5 text-xs font-semibold transition-all ${
                  side === 'SELL'
                    ? 'bg-rose-500/20 text-rose-400 border-l border-rose-500/30'
                    : 'bg-white/5 text-muted-foreground'
                }`}
              >
                SELL
              </button>
            </div>
          </div>

          {/* Reference Price */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs text-muted-foreground">Reference Price ({activeMeta.currency})</label>
              <button
                type="button"
                onClick={prefillWithMarketPrice}
                className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-2.5 h-2.5" />
                Use Market Price
              </button>
            </div>
            <input
              type="number"
              value={referencePrice}
              onChange={(e) => setReferencePrice(e.target.value)}
              placeholder="e.g. 80000"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-xs focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Order Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.1"
              step="0.01"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-xs focus:ring-1 focus:ring-cyan-400"
            />
          </div>

          {/* Tolerance */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Max Tolerance (%)</label>
            <input
              type="number"
              value={tolerance}
              onChange={(e) => setTolerance(e.target.value)}
              placeholder="1.5"
              step="0.1"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-xs focus:ring-1 focus:ring-cyan-400"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={analyze}
            disabled={loading}
            className="py-2.5 px-6 rounded-lg font-semibold text-xs text-black transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, hsl(199, 89%, 48%), hsl(160, 84%, 48%))' }}
          >
            {loading ? 'Evaluating Order Book...' : 'Analyze Price Gap & VWAP'}
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {gap && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Price Gap Comparison Card */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Execution Gap Results</h3>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  gap.isWithinTolerance
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {gap.isWithinTolerance ? 'Within Tolerance' : 'Exceeds Tolerance'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between pb-2 border-b border-white/5">
                <span className="text-muted-foreground">Reference Target Price</span>
                <span className="font-mono text-white font-semibold">
                  {formatCurrency(gap.referencePrice, activeMeta.currency)}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-white/5">
                <span className="text-muted-foreground">Market Best {side === 'BUY' ? 'Ask' : 'Bid'}</span>
                <span className="font-mono text-white">
                  {formatCurrency(gap.observedPrice, activeMeta.currency)}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-white/5">
                <span className="text-muted-foreground">Estimated Execution Price (VWAP)</span>
                <span className="font-mono text-cyan-300 font-bold">
                  {formatCurrency(gap.estimatedExecutionPrice, activeMeta.currency)}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-white/5">
                <span className="text-muted-foreground">Absolute Price Gap</span>
                <span
                  className={`font-mono font-bold ${
                    gap.gapAmount > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {gap.gapAmount > 0 ? '+' : ''}
                  {formatCurrency(gap.gapAmount, activeMeta.currency)}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-white/5">
                <span className="text-muted-foreground">Gap Percentage</span>
                <span
                  className={`font-mono font-bold ${
                    gap.gapPercentage > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {formatPercent(gap.gapPercentage)}
                </span>
              </div>

              {gap.additionalCost !== undefined && (
                <div className="flex justify-between pb-2 border-b border-white/5">
                  <span className="text-muted-foreground">Total Additional Cost</span>
                  <span className="font-mono text-rose-400 font-semibold">
                    {formatCurrency(gap.additionalCost, activeMeta.currency)}
                  </span>
                </div>
              )}
            </div>

            {/* Root Cause Diagnostic Box */}
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5" />
                Root Cause: {gap.classification.replace(/_/g, ' ')}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {gap.classificationDetails}
              </p>
            </div>

            {/* SQL Server Save Button */}
            <div className="pt-2">
              <button
                onClick={persistAnalysis}
                disabled={saving || savedSuccess}
                className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  savedSuccess
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                }`}
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    Saved to SQL Server (Prisma)
                  </>
                ) : saving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5" />
                    Record Analysis to Database
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right 2 Columns: Order Book VWAP Decomposition Ladder */}
          <div className="lg:col-span-2 glass-card p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Order Book VWAP Execution Ladder
                </h3>
                <p className="text-xs text-muted-foreground">
                  Simulated multi-level order book depth traversal for {quantity} {symbol}
                </p>
              </div>

              {vwapDetails && (
                <div className="text-right">
                  <span className="text-[11px] text-muted-foreground">Effective VWAP: </span>
                  <span className="font-mono text-cyan-300 font-bold text-sm">
                    {formatCurrency(vwapDetails.estimatedVWAP, activeMeta.currency)}
                  </span>
                </div>
              )}
            </div>

            {vwapDetails && (
              <div className="space-y-4">
                {/* Metrics bar */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-white/5 border border-white/5 text-xs font-mono">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Best Market Price</span>
                    <span className="text-white font-medium">
                      {formatCurrency(vwapDetails.bestPrice, activeMeta.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Depth Slippage</span>
                    <span className="text-amber-400 font-medium">
                      {formatCurrency(vwapDetails.slippageAmount, activeMeta.currency)} ({vwapDetails.slippagePercentage.toFixed(3)}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Fill Status</span>
                    <span className={vwapDetails.wouldFullyFill ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                      {vwapDetails.wouldFullyFill ? '100% Fillable' : `Partial (${vwapDetails.fillableQuantity} filled)`}
                    </span>
                  </div>
                </div>

                {/* Level-by-level step table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono text-left">
                    <thead>
                      <tr className="text-muted-foreground border-b border-white/10 pb-1">
                        <th className="py-1 px-2 font-medium">Level</th>
                        <th className="py-1 px-2 font-medium">Price</th>
                        <th className="py-1 px-2 font-medium">Qty Consumed</th>
                        <th className="py-1 px-2 font-medium">Cumulative Qty</th>
                        <th className="py-1 px-2 font-medium">Level Cost</th>
                        <th className="py-1 px-2 font-medium">Running VWAP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vwapDetails.steps.map((step) => (
                        <tr key={step.levelIndex} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-1.5 px-2 text-cyan-400">Level {step.levelIndex}</td>
                          <td className="py-1.5 px-2 text-white font-semibold">
                            {step.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-1.5 px-2 text-emerald-400">{step.quantityFilled.toFixed(4)}</td>
                          <td className="py-1.5 px-2 text-muted-foreground">{step.cumulativeFilled.toFixed(4)}</td>
                          <td className="py-1.5 px-2 text-white">
                            {formatCurrency(step.price * step.quantityFilled, activeMeta.currency)}
                          </td>
                          <td className="py-1.5 px-2 text-cyan-300 font-bold">
                            {step.effectiveVWAP.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historical Audit Table from SQL Server */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Recorded Price Gap History (SQL Server Audit)
            </h3>
            <p className="text-xs text-muted-foreground">
              Auditable event records logged to the database schema
            </p>
          </div>

          <button
            onClick={loadHistory}
            disabled={historyLoading}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-all text-xs flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead>
                <tr className="text-muted-foreground border-b border-white/10">
                  <th className="py-2 px-3 font-medium">Timestamp</th>
                  <th className="py-2 px-3 font-medium">Pair</th>
                  <th className="py-2 px-3 font-medium">Side</th>
                  <th className="py-2 px-3 font-medium">Reference</th>
                  <th className="py-2 px-3 font-medium">Execution</th>
                  <th className="py-2 px-3 font-medium">Gap %</th>
                  <th className="py-2 px-3 font-medium">Classification</th>
                  <th className="py-2 px-3 font-medium">Tolerance</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 px-3 text-muted-foreground">
                      {new Date(h.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3 text-white font-semibold">{h.symbol}</td>
                    <td className="py-2 px-3">
                      <span className={h.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
                        {h.side}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-white">
                      {h.referencePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3 text-cyan-300 font-semibold">
                      {h.estimatedExecutionPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 px-3">
                      <span className={h.gapPercentage > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                        {formatPercent(h.gapPercentage)}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        {h.gapClassification}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={h.isWithinTolerance ? 'text-emerald-400' : 'text-rose-400'}>
                        {h.isWithinTolerance ? '✓ OK' : '✗ Exceeded'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-xs text-muted-foreground">
            No price gap events recorded yet. Perform an analysis and click &quot;Record Analysis to Database&quot; above.
          </div>
        )}
      </div>
    </div>
  );
}
