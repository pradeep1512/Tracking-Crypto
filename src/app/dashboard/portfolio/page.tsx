'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Plus,
  Play,
  Pause,
  Square,
  Copy,
  Trash2,
  TrendingUp,
  TrendingDown,
  Layers,
  ShieldAlert,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  DollarSign,
  PieChart,
} from 'lucide-react';
import type { UserPortfolio, PortfolioCategory, PortfolioStatus } from '@/types';
import { formatPercent, cn } from '@/lib/utils';
import { ToastNotification, type ToastType } from '@/components/ui/ToastNotification';

export default function MyPortfolioPage() {
  const [portfolios, setPortfolios] = useState<UserPortfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [portfolioToDelete, setPortfolioToDelete] = useState<UserPortfolio | null>(null);
  const [toast, setToast] = useState<{ title: string; message: string; type: ToastType } | null>(null);

  // Create form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PortfolioCategory>('CRYPTO');
  const [currency, setCurrency] = useState<'INR' | 'USDT'>('INR');
  const [initialCapital, setInitialCapital] = useState(100000);
  const [maxInvestment, setMaxInvestment] = useState(80000);
  const [riskLimit, setRiskLimit] = useState(5.0);

  const fetchPortfolios = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolio');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPortfolios(json.data);
        if (!selectedPortfolioId && json.data.length > 0) {
          setSelectedPortfolioId(json.data[0].id);
        }
        setLoading(false);
      }
    } catch {
      // Handled
    }
  }, [selectedPortfolioId]);

  useEffect(() => {
    fetchPortfolios();
    const interval = setInterval(fetchPortfolios, 3000);
    return () => clearInterval(interval);
  }, [fetchPortfolios]);

  const activePortfolio = portfolios.find((p) => p.id === selectedPortfolioId);

  const handleTradingAction = async (action: 'START' | 'PAUSE' | 'RESUME' | 'STOP', positionId?: string) => {
    if (!activePortfolio) return;
    setActionLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/portfolio/${activePortfolio.id}/trading`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, positionId, userConfirmed: true }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({ type: 'success', text: json.data.message });
        setToast({ title: 'Trading Status Updated', message: json.data.message, type: 'success' });
        fetchPortfolios();
      } else {
        setStatusMessage({ type: 'error', text: json.error || 'Action failed' });
        setToast({ title: 'Action Failed', message: json.error || 'Action failed', type: 'error' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network request error' });
      setToast({ title: 'Network Error', message: 'Unable to communicate with trading engine.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleClosePosition = async (positionId: string) => {
    if (!activePortfolio) return;
    setActionLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`/api/portfolio/${activePortfolio.id}/trading`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CLOSE_POSITION', positionId }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({ type: 'success', text: json.data.message });
        setToast({ title: 'Position Closed', message: json.data.message, type: 'info' });
        fetchPortfolios();
      } else {
        setStatusMessage({ type: 'error', text: json.error });
        setToast({ title: 'Close Failed', message: json.error, type: 'error' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to close position' });
      setToast({ title: 'Network Error', message: 'Failed to close position', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!activePortfolio) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/portfolio/${activePortfolio.id}/trading`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DUPLICATE' }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage({ type: 'success', text: 'Portfolio duplicated successfully' });
        setToast({ title: 'Portfolio Duplicated', message: `Created copy of "${activePortfolio.name}".`, type: 'success' });
        fetchPortfolios();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = () => {
    if (!activePortfolio) return;
    setPortfolioToDelete(activePortfolio);
  };

  const executeDeletePortfolio = async () => {
    if (!portfolioToDelete) return;
    const portfolioName = portfolioToDelete.name;
    const portfolioId = portfolioToDelete.id;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/portfolio/${portfolioId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setPortfolioToDelete(null);
        setSelectedPortfolioId('');
        fetchPortfolios();
        setToast({
          title: 'Portfolio Deleted',
          message: `Portfolio "${portfolioName}" has been safely archived. Historical trade ledgers are preserved.`,
          type: 'info',
        });
      } else {
        setToast({
          title: 'Delete Failed',
          message: json.error || 'Could not delete portfolio.',
          type: 'error',
        });
      }
    } catch {
      setToast({
        title: 'Connection Error',
        message: 'Network error occurred while deleting portfolio.',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          category,
          currency,
          initialCapital: Number(initialCapital),
          maxInvestmentLimit: Number(maxInvestment),
          riskLimitPercentage: Number(riskLimit),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setShowCreateModal(false);
        setName('');
        setDescription('');
        setSelectedPortfolioId(json.data.id);
        fetchPortfolios();
        setToast({
          title: 'Portfolio Created',
          message: `Portfolio "${json.data.name}" successfully created and saved in local SQL Server database.`,
          type: 'success',
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: PortfolioStatus) => {
    switch (status) {
      case 'RUNNING':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />Running</span>;
      case 'PAUSED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Paused</span>;
      case 'STOPPED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400" />Stopped</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/10 border border-white/20 text-white flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/50" />Ready</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Portfolio Trading Engine</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Create, manage, and execute multi-asset strategies across Crypto, MCX Commodities & Listed Options
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-colors shadow-lg flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Portfolio</span>
        </button>
      </div>

      {statusMessage && (
        <div
          className={cn(
            'p-3.5 rounded-xl border text-xs flex items-center gap-2.5',
            statusMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          )}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Portfolio Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10">
        {portfolios.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPortfolioId(p.id)}
            className={cn(
              'px-4 py-2.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap flex items-center gap-2.5',
              selectedPortfolioId === p.id
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow'
                : 'glass border-transparent text-muted-foreground hover:text-white hover:border-white/10'
            )}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>{p.name}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-muted-foreground">
              {p.currency}
            </span>
          </button>
        ))}
      </div>

      {/* Active Portfolio Deep Dashboard */}
      {activePortfolio && (
        <div className="space-y-6">
          {/* Top Control Header Card */}
          <div className="glass-card p-6 border-cyan-500/20 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-black text-white">{activePortfolio.name}</h2>
                {getStatusBadge(activePortfolio.status)}
                <span className="text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground font-mono">
                  {activePortfolio.executionMode} MODE
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{activePortfolio.description}</p>
            </div>

            {/* Strategy Trading Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {activePortfolio.status !== 'RUNNING' && (
                <button
                  onClick={() => handleTradingAction('START')}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Trading</span>
                </button>
              )}

              {activePortfolio.status === 'RUNNING' && (
                <button
                  onClick={() => handleTradingAction('PAUSE')}
                  disabled={actionLoading}
                  className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow transition-colors"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </button>
              )}

              {activePortfolio.status === 'PAUSED' && (
                <button
                  onClick={() => handleTradingAction('RESUME')}
                  disabled={actionLoading}
                  className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-1.5 shadow transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume</span>
                </button>
              )}

              {activePortfolio.status === 'RUNNING' && (
                <button
                  onClick={() => handleTradingAction('STOP')}
                  disabled={actionLoading}
                  className="px-3.5 py-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Trading</span>
                </button>
              )}

              <button
                onClick={handleDuplicate}
                title="Duplicate Portfolio"
                className="p-2 rounded-lg border border-white/10 hover:bg-white/10 text-muted-foreground transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>

              <button
                onClick={handleDelete}
                title="Delete Portfolio"
                className="p-2 rounded-lg border border-red-500/20 hover:bg-red-500/20 text-rose-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-card p-4">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Total Capital</span>
              <p className="text-xl font-mono font-black text-white mt-1">
                {activePortfolio.currency === 'INR' ? '₹' : '$'}{activePortfolio.totalCapital.toLocaleString()}
              </p>
              <span className="text-[10px] text-muted-foreground">Initial: {activePortfolio.initialCapital.toLocaleString()}</span>
            </div>

            <div className="glass-card p-4">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Available Balance</span>
              <p className="text-xl font-mono font-black text-cyan-400 mt-1">
                {activePortfolio.currency === 'INR' ? '₹' : '$'}{activePortfolio.availableBalance.toLocaleString()}
              </p>
              <span className="text-[10px] text-muted-foreground">Free margin</span>
            </div>

            <div className="glass-card p-4">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Invested Amount</span>
              <p className="text-xl font-mono font-black text-white mt-1">
                {activePortfolio.currency === 'INR' ? '₹' : '$'}{activePortfolio.investedAmount.toLocaleString()}
              </p>
              <span className="text-[10px] text-muted-foreground">In active positions</span>
            </div>

            <div className="glass-card p-4">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Unrealized P&L</span>
              <p className={cn('text-xl font-mono font-black mt-1', activePortfolio.unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                {activePortfolio.unrealizedPnL >= 0 ? '+' : ''}{activePortfolio.currency === 'INR' ? '₹' : '$'}{activePortfolio.unrealizedPnL.toLocaleString()}
              </p>
              <span className="text-[10px] text-muted-foreground">Realized: {activePortfolio.currency === 'INR' ? '₹' : '$'}{activePortfolio.realizedPnL.toLocaleString()}</span>
            </div>
          </div>

          {/* Active Positions Table */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Active Positions ({activePortfolio.positions.filter((p) => p.status === 'OPEN').length})</span>
              </h3>
            </div>

            {activePortfolio.positions.filter((p) => p.status === 'OPEN').length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10 text-muted-foreground text-left">
                      <th className="py-2.5">Asset / Instrument</th>
                      <th className="py-2.5">Side</th>
                      <th className="py-2.5">Qty / Lots</th>
                      <th className="py-2.5">Entry Price</th>
                      <th className="py-2.5">Current Price</th>
                      <th className="py-2.5">Market Value</th>
                      <th className="py-2.5">Unrealized P&L</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {activePortfolio.positions
                      .filter((p) => p.status === 'OPEN')
                      .map((pos) => {
                        const isPos = pos.unrealizedPnL >= 0;
                        return (
                          <tr key={pos.id} className="hover:bg-white/[0.02]">
                            <td className="py-3 font-bold text-white">
                              {pos.name}
                              {pos.expiryDate && (
                                <span className="block text-[10px] text-amber-400 font-normal">
                                  Exp: {pos.expiryDate}
                                </span>
                              )}
                            </td>
                            <td className="py-3">
                              <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', pos.side === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400')}>
                                {pos.side}
                              </span>
                            </td>
                            <td className="py-3 text-white">{pos.quantity}</td>
                            <td className="py-3 text-white">₹{pos.entryPrice.toLocaleString()}</td>
                            <td className="py-3 text-white">₹{pos.currentPrice.toLocaleString()}</td>
                            <td className="py-3 text-white">₹{pos.currentMarketValue.toLocaleString()}</td>
                            <td className={cn('py-3 font-bold', isPos ? 'text-emerald-400' : 'text-rose-400')}>
                              {isPos ? '+' : ''}₹{pos.unrealizedPnL.toLocaleString()} ({formatPercent(pos.unrealizedPnLPct, false)})
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleClosePosition(pos.id)}
                                disabled={actionLoading}
                                className="px-3 py-1 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold text-[11px] transition-colors"
                              >
                                Close
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-xs">
                No active positions in this portfolio. Start trading to execute orders.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Portfolio Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 border-cyan-500/40 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-cyan-400" />
                <span>Create New Portfolio</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePortfolio} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Portfolio Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gold Reserve Alpha"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Systematic momentum trading across MCX contracts"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as PortfolioCategory)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="CRYPTO">Crypto</option>
                    <option value="GOLD">Gold</option>
                    <option value="SILVER">Silver</option>
                    <option value="MCX_COMMODITY">MCX Commodity</option>
                    <option value="OPTIONS_TRADING">Options Trading</option>
                    <option value="CUSTOM">Custom Multi-Asset</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as 'INR' | 'USDT')}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USDT">USDT ($)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Initial Capital</label>
                  <input
                    type="number"
                    required
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Max Investment</label>
                  <input
                    type="number"
                    value={maxInvestment}
                    onChange={(e) => setMaxInvestment(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Risk Limit (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={riskLimit}
                    onChange={(e) => setRiskLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-xs font-semibold text-muted-foreground hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-colors shadow"
                >
                  Create Portfolio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {portfolioToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 border-rose-500/30 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Delete Portfolio</h3>
                  <p className="text-xs text-muted-foreground">Confirmation required</p>
                </div>
              </div>
              <button
                onClick={() => setPortfolioToDelete(null)}
                className="text-muted-foreground hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-lg bg-white/5 border border-white/10 mb-4">
              <div className="text-xs text-muted-foreground mb-1">Target Portfolio:</div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>{portfolioToDelete.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/50 text-cyan-300 border border-cyan-500/20">
                  {portfolioToDelete.currency}
                </span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-2 mb-6">
              <p>
                Are you sure you want to delete portfolio &ldquo;{portfolioToDelete.name}&rdquo;? Active automated trading and position tracking will be terminated.
              </p>
              <p className="text-emerald-400/90 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Historical transactions and ledgers will be safely preserved.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setPortfolioToDelete(null)}
                className="px-4 py-2 rounded-lg border border-white/10 text-xs font-semibold text-muted-foreground hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={executeDeletePortfolio}
                className="px-5 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition-colors shadow flex items-center gap-1.5"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Portfolio</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <ToastNotification
          title={toast.title}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
