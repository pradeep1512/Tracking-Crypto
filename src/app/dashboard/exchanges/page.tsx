'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Landmark,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Play,
  Pause,
  Key,
  ExternalLink,
  Layers,
  ArrowRight,
  X,
  Info,
  DollarSign,
  TrendingUp,
  Sliders,
  Lock,
} from 'lucide-react';
import type {
  ExchangeAccountBalanceDetails,
  SupportedBroker,
  Side,
  OrderType,
  OrderPreviewResult,
  ExchangeOrderResult,
} from '@/types';
import { cn } from '@/lib/utils';
import { ToastNotification, type ToastType } from '@/components/ui/ToastNotification';

export default function ExchangeConnectionsPage() {
  const [exchanges, setExchanges] = useState<ExchangeAccountBalanceDetails[]>([]);
  const [selectedExchangeId, setSelectedExchangeId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [previewResult, setPreviewResult] = useState<OrderPreviewResult | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Connect Exchange form state
  const [brokerType, setBrokerType] = useState<SupportedBroker>('COINDCX');
  const [displayName, setDisplayName] = useState('');
  const [accountUserId, setAccountUserId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  // Quick Order Execution state
  const [tradingPair, setTradingPair] = useState('BTCUSDT');
  const [side, setSide] = useState<Side>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [investmentINR, setInvestmentINR] = useState('5000');
  const [limitPrice, setLimitPrice] = useState('');

  // Toast state
  const [toast, setToast] = useState<{ title: string; message: string; type: ToastType } | null>(null);

  const fetchExchanges = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/exchanges/balances');
      const json = await res.json();
      if (json.success) {
        setExchanges(json.data);
        if (json.data.length > 0 && !selectedExchangeId) {
          setSelectedExchangeId(json.data[0].brokerId);
        }
      }
    } catch {
      setToast({
        title: 'Network Error',
        message: 'Failed to retrieve exchange balances.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedExchangeId]);

  useEffect(() => {
    fetchExchanges();
  }, [fetchExchanges]);

  const selectedExchange = exchanges.find((e) => e.brokerId === selectedExchangeId) || exchanges[0];

  // Verify Connection
  const handleVerifyConnection = async (brokerId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/exchanges/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brokerId }),
      });
      const json = await res.json();
      if (json.success) {
        setToast({
          title: 'Handshake Verified',
          message: `${json.data.exchangeName} responded in ${json.data.latencyMs}ms. API credentials valid & active.`,
          type: 'success',
        });
        fetchExchanges();
      } else {
        throw new Error(json.error || 'Verification failed');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setToast({ title: 'Verification Failed', message: msg, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Live Trading Authorization
  const handleToggleAuthorization = async (brokerId: string, currentStatus: boolean) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/exchanges/auth-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brokerId, authorized: !currentStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setToast({
          title: !currentStatus ? 'Live Trading Authorized' : 'Live Trading Disabled',
          message: !currentStatus
            ? `Live real-market order execution enabled for ${json.data.displayName}.`
            : `Orders will now be executed in simulated/paper mode for safety.`,
          type: !currentStatus ? 'warning' : 'info',
        });
        fetchExchanges();
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Connect Exchange Form Submit
  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/exchanges/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brokerType,
          displayName: displayName || `${brokerType} Official Account`,
          accountUserId,
          apiKey,
          apiSecret,
          permissions: 'TRADE',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowConnectModal(false);
        setApiKey('');
        setApiSecret('');
        setAccountUserId('');
        setToast({
          title: 'Exchange Connected',
          message: `${json.data.displayName} connected. Credentials encrypted with AES-256-GCM.`,
          type: 'success',
        });
        fetchExchanges();
      } else {
        throw new Error(json.error || 'Failed to connect exchange');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setToast({ title: 'Connection Error', message: msg, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Request Order Preview
  const handleRequestPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExchange) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/exchanges/trade/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brokerId: selectedExchange.brokerId,
          tradingPair,
          side,
          orderType,
          investmentAmountINR: Number(investmentINR),
          limitPrice: limitPrice ? Number(limitPrice) : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPreviewResult(json.data);
        setShowPreviewModal(true);
      } else {
        throw new Error(json.error || 'Preview calculation failed');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Preview error';
      setToast({ title: 'Preview Error', message: msg, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Confirmed Order
  const handleExecuteConfirmedOrder = async () => {
    if (!selectedExchange || !previewResult) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/exchanges/trade/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brokerId: selectedExchange.brokerId,
          tradingPair: previewResult.tradingPair,
          side: previewResult.side,
          orderType: previewResult.orderType,
          quantity: previewResult.quantity,
          investmentAmountINR: previewResult.estimatedOrderValueINR,
          limitPrice: previewResult.estimatedPrice,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowPreviewModal(false);
        setShowTradeModal(false);
        const data: ExchangeOrderResult = json.data;
        setToast({
          title: 'Order Executed & Synchronized',
          message: `Order #${data.exchangeOrderId} filled on ${data.exchangeName}. Qty: ${data.filledQuantity} at ${data.averageExecutionPrice}.`,
          type: 'success',
        });
        fetchExchanges();
      } else {
        throw new Error(json.error || 'Order execution failed');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Execution error';
      setToast({ title: 'Order Failed', message: msg, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Landmark className="w-5 h-5" />
            </div>
            <span>Connected Exchange & Broker Accounts</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage official API connections to CoinDCX, Binance, and Indian Commodity Brokers (Zerodha/Angel One).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowTradeModal(true)}
            className="px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/10 text-white font-bold text-xs transition-colors flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Place Exchange Order</span>
          </button>

          <button
            onClick={() => setShowConnectModal(true)}
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs transition-colors shadow-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Exchange</span>
          </button>
        </div>
      </div>

      {/* STRICT SEPARATION NOTICE */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-muted-foreground leading-relaxed">
          <span className="text-amber-300 font-bold">Important Balance Separation: </span>
          The balances shown below are queried directly from the connected exchanges/brokers via authenticated REST APIs. They are{' '}
          <strong className="text-white">completely separate</strong> from your TrackingCrypt application wallet. TrackingCrypt does not custody exchange funds.
        </div>
      </div>

      {/* Exchange Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {exchanges.map((b) => {
          const isSelected = selectedExchange?.brokerId === b.brokerId;
          return (
            <div
              key={b.brokerId}
              onClick={() => setSelectedExchangeId(b.brokerId)}
              className={cn(
                'glass-card p-5 cursor-pointer transition-all border',
                isSelected
                  ? 'border-cyan-500/50 shadow-lg bg-cyan-500/5'
                  : 'border-white/10 hover:border-white/20'
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-white/10 text-cyan-300 border border-white/10">
                    {b.exchangeName}
                  </span>
                  <h3 className="text-base font-bold text-white mt-2">{b.displayName}</h3>
                  <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                    ID: {b.accountUserId}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1',
                      b.status === 'CONNECTED'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    )}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{b.status}</span>
                  </span>

                  <span
                    className={cn(
                      'text-[9px] font-bold px-1.5 py-0.5 rounded border',
                      b.isLiveTradingAuthorized
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-white/5 text-muted-foreground border-white/10'
                    )}
                  >
                    {b.isLiveTradingAuthorized ? 'LIVE AUTHORIZED' : 'PAPER SIMULATED'}
                  </span>
                </div>
              </div>

              {/* Native Balance & INR Equivalent */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase">Available Balance</span>
                  <div className="text-lg font-mono font-black text-white">
                    {b.nativeCurrency === 'INR' ? '₹' : '$'}
                    {b.availableBalance.toLocaleString('en-IN')}
                    <span className="text-xs text-muted-foreground font-normal ml-1">{b.nativeCurrency}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground uppercase">INR Equivalent</span>
                  <div className="text-sm font-mono font-bold text-cyan-300">
                    ₹{b.inrEquivalent.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Exchange Details & Asset Breakdown */}
      {selectedExchange && (
        <div className="glass-card p-6 border-white/10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-white">{selectedExchange.displayName}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono">
                  {selectedExchange.permissions} ONLY (No Withdrawal)
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Account ID: <span className="font-mono text-white">{selectedExchange.accountUserId}</span> • Last Sync:{' '}
                {new Date(selectedExchange.lastSyncAt).toLocaleTimeString()}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleVerifyConnection(selectedExchange.brokerId)}
                disabled={actionLoading}
                className="px-3.5 py-2 rounded-lg border border-white/10 hover:bg-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={cn('w-3.5 h-3.5 text-cyan-400', actionLoading && 'animate-spin')} />
                <span>Verify Connection</span>
              </button>

              <button
                onClick={() =>
                  handleToggleAuthorization(selectedExchange.brokerId, selectedExchange.isLiveTradingAuthorized)
                }
                disabled={actionLoading}
                className={cn(
                  'px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors border shadow',
                  selectedExchange.isLiveTradingAuthorized
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30'
                    : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                )}
              >
                {selectedExchange.isLiveTradingAuthorized ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Disable Live Orders</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Authorize Live Trading</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Supported Assets Table */}
          <div>
            <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">
              Supported Assets & Actual API Balances
            </h3>
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-xs text-left">
                <thead className="bg-white/5 text-[11px] text-muted-foreground uppercase font-semibold border-b border-white/10">
                  <tr>
                    <th className="p-3">Asset</th>
                    <th className="p-3">Available</th>
                    <th className="p-3">Reserved</th>
                    <th className="p-3">Total Account Balance</th>
                    <th className="p-3">INR Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {selectedExchange.supportedAssets.map((asset) => (
                    <tr key={asset.asset} className="hover:bg-white/5">
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        <span>{asset.asset}</span>
                      </td>
                      <td className="p-3 text-emerald-400">{asset.available.toLocaleString()}</td>
                      <td className="p-3 text-amber-400">{asset.reserved.toLocaleString()}</td>
                      <td className="p-3 text-white font-bold">{asset.total.toLocaleString()}</td>
                      <td className="p-3 text-cyan-300">
                        ₹{(asset.inrValue || asset.total).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONNECT EXCHANGE MODAL */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 border-cyan-500/30 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Connect Trading Account</h3>
                  <p className="text-xs text-muted-foreground">Official Exchange / Broker Authentication</p>
                </div>
              </div>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-muted-foreground hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConnectSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Exchange or Broker Provider</label>
                <select
                  value={brokerType}
                  onChange={(e) => setBrokerType(e.target.value as SupportedBroker)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="COINDCX">CoinDCX (Official Indian Crypto Exchange)</option>
                  <option value="BINANCE">Binance Global API</option>
                  <option value="ZERODHA">Zerodha Kite Connect (Commodity & Derivatives)</option>
                  <option value="ANGEL_ONE">Angel One SmartAPI</option>
                  <option value="UPSTOX">Upstox API v2</option>
                  <option value="DHAN">DhanHQ API</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Account Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My CoinDCX Trading Key"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Account User ID / Client ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DCX-129048 or Kite User ID"
                  value={accountUserId}
                  onChange={(e) => setAccountUserId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">API Key</label>
                <input
                  type="password"
                  required
                  placeholder="Paste official API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">API Secret</label>
                <input
                  type="password"
                  required
                  placeholder="Paste official API secret"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-[11px] text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                  <Lock className="w-3.5 h-3.5" />
                  <span>AES-256-GCM Vault Encryption</span>
                </div>
                <p>
                  Credentials are encrypted at rest with military-grade AES-256-GCM. TrackingCrypt enforces{' '}
                  <strong className="text-white">Trade-Only</strong> permissions and strictly rejects withdrawal keys.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-xs text-muted-foreground hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs transition-colors shadow flex items-center gap-1.5"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save Connection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PLACE EXCHANGE ORDER FORM MODAL */}
      {showTradeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-lg w-full p-6 border-cyan-500/30 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Execute Exchange Order</h3>
                  <p className="text-xs text-muted-foreground">Direct Order Submission via Official Exchange API</p>
                </div>
              </div>
              <button
                onClick={() => setShowTradeModal(false)}
                className="text-muted-foreground hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRequestPreview} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Target Exchange</label>
                  <select
                    value={selectedExchangeId}
                    onChange={(e) => setSelectedExchangeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {exchanges.map((ex) => (
                      <option key={ex.brokerId} value={ex.brokerId}>
                        {ex.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Trading Pair</label>
                  <select
                    value={tradingPair}
                    onChange={(e) => setTradingPair(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="BTCUSDT">BTC/USDT</option>
                    <option value="ETHUSDT">ETH/USDT</option>
                    <option value="SOLUSDT">SOL/USDT</option>
                    <option value="GOLD_MCX">GOLD (MCX Commodity)</option>
                    <option value="SILVER_MCX">SILVER (MCX Commodity)</option>
                  </select>
                </div>
              </div>

              {/* Side (BUY / SELL) */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">Order Side</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSide('BUY')}
                    className={cn(
                      'py-2.5 rounded-lg text-xs font-black transition-all',
                      side === 'BUY'
                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                        : 'bg-black/30 text-muted-foreground border border-white/10 hover:text-white'
                    )}
                  >
                    BUY (Long)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSide('SELL')}
                    className={cn(
                      'py-2.5 rounded-lg text-xs font-black transition-all',
                      side === 'SELL'
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                        : 'bg-black/30 text-muted-foreground border border-white/10 hover:text-white'
                    )}
                  >
                    SELL (Short)
                  </button>
                </div>
              </div>

              {/* Order Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Order Type</label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as OrderType)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="MARKET">Market Order</option>
                    <option value="LIMIT">Limit Order</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Investment Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="100"
                    value={investmentINR}
                    onChange={(e) => setInvestmentINR(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {orderType === 'LIMIT' && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Limit Price</label>
                  <input
                    type="number"
                    required
                    placeholder="Enter limit price"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowTradeModal(false)}
                  className="px-4 py-2 rounded-lg border border-white/10 text-xs text-muted-foreground hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs transition-colors shadow flex items-center gap-1.5"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  <span>Calculate & Preview Order</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ORDER PREVIEW CONFIRMATION MODAL */}
      {showPreviewModal && previewResult && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 border-cyan-500/40 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-black',
                      previewResult.side === 'BUY' ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'
                    )}
                  >
                    {previewResult.side}
                  </span>
                  <span>{previewResult.tradingPair}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Pre-Trade Execution Verification</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-muted-foreground hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-muted-foreground font-sans">Order Type:</span>
                <span className="text-white font-bold">{previewResult.orderType}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-muted-foreground font-sans">Calculated Order Qty:</span>
                <span className="text-cyan-300 font-bold">{previewResult.quantity}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-muted-foreground font-sans">Executable Price:</span>
                <span className="text-white">
                  {previewResult.estimatedPrice} {previewResult.nativeCurrency}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-muted-foreground font-sans">Order Value (INR):</span>
                <span className="text-white font-bold">
                  ₹{previewResult.estimatedOrderValueINR.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-muted-foreground font-sans">Estimated Fees:</span>
                <span className="text-rose-300">₹{previewResult.applicableFeesINR}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-muted-foreground font-sans">Available Exchange Balance:</span>
                <span className="text-emerald-400">
                  {previewResult.availableExchangeBalance.toLocaleString()} {previewResult.nativeCurrency}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-muted-foreground font-sans">Est. Remaining Balance:</span>
                <span className="text-white">
                  {previewResult.estimatedRemainingBalance.toLocaleString()} {previewResult.nativeCurrency}
                </span>
              </div>
            </div>

            {previewResult.warningMessage && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{previewResult.warningMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 rounded-lg border border-white/10 text-xs text-muted-foreground hover:text-white"
              >
                Back
              </button>
              <button
                type="button"
                disabled={actionLoading || !previewResult.isExecutable}
                onClick={handleExecuteConfirmedOrder}
                className={cn(
                  'px-5 py-2 rounded-lg font-black text-xs transition-colors shadow flex items-center gap-1.5',
                  previewResult.side === 'BUY'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                    : 'bg-rose-500 hover:bg-rose-400 text-white'
                )}
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Transmitting to Exchange...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Send Order</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
