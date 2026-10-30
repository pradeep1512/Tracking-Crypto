'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  PlayCircle,
  ShieldAlert,
  Zap,
  TrendingUp,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  DollarSign,
  ShoppingCart,
  Wifi,
  Lock,
} from 'lucide-react';
import type { BrokerAccountInfo, UserPortfolio, Side, OrderType, AssetCategory } from '@/types';
import { formatPercent, formatLatency, cn } from '@/lib/utils';

export default function ActiveTradingPage() {
  const [brokers, setBrokers] = useState<BrokerAccountInfo[]>([]);
  const [portfolios, setPortfolios] = useState<UserPortfolio[]>([]);
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>('broker_paper_sim');
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');

  // Form states
  const [symbol, setSymbol] = useState('GOLD');
  const [category, setCategory] = useState<AssetCategory>('MCX_COMMODITY');
  const [side, setSide] = useState<Side>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(78450);
  const [stopLoss, setStopLoss] = useState(77900);
  const [takeProfit, setTakeProfit] = useState(79500);
  const [isPaperTrade, setIsPaperTrade] = useState(true);

  const [loading, setLoading] = useState(false);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    orderId: string;
    message: string;
    priceGap?: unknown;
    latencyMs?: number;
  } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [brokerRes, portRes] = await Promise.all([
        fetch('/api/brokers'),
        fetch('/api/portfolio'),
      ]);
      const brokerJson = await brokerRes.json();
      const portJson = await portRes.json();

      if (brokerJson.success) setBrokers(brokerJson.data);
      if (portJson.success && portJson.data.length > 0) {
        setPortfolios(portJson.data);
        if (!selectedPortfolioId) setSelectedPortfolioId(portJson.data[0].id);
      }
    } catch {
      // Handled
    }
  }, [selectedPortfolioId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedBroker = brokers.find((b) => b.brokerId === selectedBrokerId);

  const handleToggleAuthorization = async () => {
    if (!selectedBroker) return;
    const nextAuth = !selectedBroker.isLiveTradingAuthorized;
    try {
      const res = await fetch('/api/brokers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brokerId: selectedBroker.brokerId,
          isLiveTradingAuthorized: nextAuth,
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchData();
      }
    } catch {
      // Handled
    }
  };

  const handleExecuteTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setExecutionResult(null);

    try {
      const res = await fetch('/api/brokers/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId: selectedPortfolioId,
          brokerId: selectedBrokerId,
          symbol,
          category,
          side,
          orderType,
          quantity: Number(quantity),
          price: orderType === 'LIMIT' ? Number(price) : undefined,
          stopLoss: Number(stopLoss),
          takeProfit: Number(takeProfit),
          isPaperTrade,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setExecutionResult({
          orderId: json.data.order.orderId,
          message: json.data.order.message,
          priceGap: json.data.priceGap,
          latencyMs: json.data.latencyMs,
        });
      } else {
        alert(json.error || 'Trade rejected');
      }
    } catch {
      alert('Network error submitting order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Active Trading & Broker Routing</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              Execution Control
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Real-time order submission with high-fidelity paper simulation or authorized broker execution
          </p>
        </div>

        {/* Emergency Kill Switch */}
        <button
          onClick={() => setKillSwitchActive(!killSwitchActive)}
          className={cn(
            'px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all self-start sm:self-auto',
            killSwitchActive
              ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/30'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
          )}
        >
          <ShieldAlert className="w-4 h-4 text-rose-400 fill-current" />
          <span>{killSwitchActive ? 'EMERGENCY KILL SWITCH ENGAGED' : 'ENGAGE EMERGENCY KILL SWITCH'}</span>
        </button>
      </div>

      {/* Grid: Broker Connection Selector & Order Ticket */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Connected Brokers */}
        <div className="space-y-4">
          <div className="glass-card p-5 space-y-4">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span>Authorized Broker Integrations</span>
            </h3>

            <div className="space-y-2.5">
              {brokers.map((b) => {
                const isSelected = selectedBrokerId === b.brokerId;
                return (
                  <button
                    key={b.brokerId}
                    onClick={() => {
                      setSelectedBrokerId(b.brokerId);
                      setIsPaperTrade(b.brokerType === 'PAPER_SIMULATOR');
                    }}
                    className={cn(
                      'w-full p-3.5 rounded-xl border text-left transition-all',
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/40 shadow'
                        : 'glass border-transparent hover:border-white/10'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-white text-xs">{b.displayName}</p>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-muted-foreground font-mono mt-1.5">
                      <span>User: {b.accountUserId}</span>
                      <span className="text-white font-bold">
                        {b.currency === 'INR' ? '₹' : '$'}{b.availableMargin.toLocaleString()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedBroker && selectedBroker.brokerType !== 'PAPER_SIMULATOR' && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300">Live Trading Permission</span>
                  <button
                    onClick={handleToggleAuthorization}
                    className={cn(
                      'px-3 py-1 rounded text-xs font-extrabold transition-colors',
                      selectedBroker.isLiveTradingAuthorized
                        ? 'bg-emerald-500 text-black'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    )}
                  >
                    {selectedBroker.isLiveTradingAuthorized ? 'AUTHORIZED' : 'ENABLE LIVE'}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  SEBI / Exchange Compliance: Real order dispatch requires manual verification.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Cols: Order Ticket & Execution Preview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 border-cyan-500/30 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-cyan-400" />
                  <span>Order Execution Ticket</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Route through {selectedBroker?.displayName}
                </p>
              </div>

              {/* Trading Mode Badge */}
              <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 p-1 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setIsPaperTrade(true)}
                  className={cn('px-3 py-1 rounded font-bold transition-all', isPaperTrade ? 'bg-cyan-500 text-black' : 'text-muted-foreground')}
                >
                  PAPER MODE
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedBroker?.isLiveTradingAuthorized) {
                      alert('Please authorize Live Trading on the selected broker first.');
                      return;
                    }
                    setIsPaperTrade(false);
                  }}
                  className={cn('px-3 py-1 rounded font-bold transition-all', !isPaperTrade ? 'bg-rose-500 text-white' : 'text-muted-foreground')}
                >
                  LIVE MODE
                </button>
              </div>
            </div>

            <form onSubmit={handleExecuteTrade} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Target Portfolio</label>
                  <select
                    value={selectedPortfolioId}
                    onChange={(e) => setSelectedPortfolioId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {portfolios.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Asset Category</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const c = e.target.value as AssetCategory;
                      setCategory(c);
                      setSymbol(c === 'CRYPTO' ? 'BTCUSDT' : c === 'MCX_COMMODITY' ? 'GOLD' : 'BTC-30OCT26-85000-CE');
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="MCX_COMMODITY">MCX Commodity</option>
                    <option value="CRYPTO">Spot Crypto</option>
                    <option value="OPTION">Options Contract</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Instrument Symbol</label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Side</label>
                  <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
                    <button
                      type="button"
                      onClick={() => setSide('BUY')}
                      className={cn('py-1.5 rounded text-xs font-bold', side === 'BUY' ? 'bg-emerald-500 text-black' : 'text-muted-foreground')}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setSide('SELL')}
                      className={cn('py-1.5 rounded text-xs font-bold', side === 'SELL' ? 'bg-rose-500 text-white' : 'text-muted-foreground')}
                    >
                      SELL
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Order Type</label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as OrderType)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="MARKET">MARKET</option>
                    <option value="LIMIT">LIMIT</option>
                    <option value="IOC">IOC</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Quantity (Lots)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Limit Price</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    disabled={orderType === 'MARKET'}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-white disabled:opacity-40 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Stop Loss Trigger</label>
                  <input
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-rose-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Take Profit Target</label>
                  <input
                    type="number"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-emerald-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || killSwitchActive}
                  className={cn(
                    'w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all',
                    side === 'BUY' ? 'bg-emerald-500 hover:bg-emerald-400 text-black' : 'bg-rose-500 hover:bg-rose-400 text-white',
                    killSwitchActive && 'opacity-30 cursor-not-allowed'
                  )}
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
                  <span>SUBMIT {side} ORDER ({isPaperTrade ? 'PAPER SIMULATOR' : 'LIVE BROKER ROUTING'})</span>
                </button>
              </div>
            </form>

            {executionResult && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{executionResult.message}</span>
                </div>
                <div className="flex gap-4 font-mono text-[11px] text-muted-foreground pt-1 border-t border-emerald-500/20">
                  <span>Order Ref: {executionResult.orderId}</span>
                  {executionResult.latencyMs && <span>Measured Latency: {formatLatency(executionResult.latencyMs)}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
