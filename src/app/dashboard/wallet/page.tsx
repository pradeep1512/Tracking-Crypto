'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  Building2,
  Smartphone,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Info,
  X,
  Plus,
  Landmark,
  ArrowRight,
  TrendingDown,
  Zap,
} from 'lucide-react';
import type { WalletSummary, WalletTransactionItem, WalletTransactionStatus, WalletTransactionType } from '@/types';
import { cn } from '@/lib/utils';
import { ToastNotification, type ToastType } from '@/components/ui/ToastNotification';

export default function WalletDashboardPage() {
  const [summary, setSummary] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Add Money Form state
  const [selectedPreset, setSelectedPreset] = useState<number | null>(5000);
  const [customAmount, setCustomAmount] = useState<string>('5000');
  const [paymentMethod, setPaymentMethod] = useState<'SANDBOX' | 'UPI' | 'CARD' | 'NET_BANKING'>('SANDBOX');

  // Allocate Form state
  const [allocateAction, setAllocateAction] = useState<'RESERVE' | 'RELEASE'>('RESERVE');
  const [allocateAmount, setAllocateAmount] = useState<string>('5000');
  const [allocateTarget, setAllocateTarget] = useState<string>('Delta Exchange Trading Reserve');

  // Toast state
  const [toast, setToast] = useState<{ title: string; message: string; type: ToastType } | null>(null);

  const fetchWalletData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/wallet');
      const json = await res.json();
      if (json.success) {
        setSummary(json.data.wallet);
        setTransactions(json.data.transactions);
      }
    } catch {
      setToast({
        title: 'Network Error',
        message: 'Failed to load wallet ledger data.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  // Handle Preset Amount Select
  const handleSelectPreset = (amount: number) => {
    setSelectedPreset(amount);
    setCustomAmount(amount.toString());
  };

  // Helper to dynamically load official Razorpay Checkout script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve(true);

      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Add Money / Deposit Submission
  const handleAddMoneySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(customAmount);
    if (!amount || amount < 10) {
      setToast({ title: 'Invalid Amount', message: 'Minimum deposit is $10.', type: 'error' });
      return;
    }

    setActionLoading(true);
    try {
      // Step 1: Create backend payment order
      const orderRes = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUSD: amount, amountINR: amount, paymentMethod }),
      });
      const orderJson = await orderRes.json();

      if (!orderJson.success) {
        throw new Error(orderJson.error || 'Failed to initiate payment gateway order.');
      }

      const orderData = orderJson.data.order;
      const checkoutOptions = orderJson.data.checkoutOptions;

      // Check if actual Razorpay credentials (test or live) are present
      const isConfiguredRazorpay =
        Boolean(checkoutOptions?.key) &&
        !checkoutOptions.key.includes('TC_Sim') &&
        checkoutOptions.key !== 'rzp_test_TC_Sim_001';

      if (paymentMethod === 'UPI' || paymentMethod === 'CARD' || paymentMethod === 'NET_BANKING') {
        if (!isConfiguredRazorpay) {
          setToast({
            title: 'Razorpay Keys Pending',
            message: 'RAZORPAY_KEY_ID is not configured in .env. Falling back to Instant Sandbox Credit.',
            type: 'info',
          });
        } else {
          const isLoaded = await loadRazorpayScript();
          if (!isLoaded) {
            throw new Error('Unable to load official Razorpay checkout script. Check internet connectivity.');
          }

          const RazorpayClass = (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void } }).Razorpay;
          const rzp = new RazorpayClass({
            ...checkoutOptions,
            theme: {
              color: '#FFE600',
            },
            handler: async function (response: {
              razorpay_payment_id?: string;
              razorpay_order_id?: string;
              razorpay_signature?: string;
            }) {
              try {
                const verifyRes = await fetch('/api/wallet/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    orderId: orderData.orderId,
                    gatewayPaymentId: response.razorpay_payment_id || `pay_live_${Date.now()}`,
                    gatewaySignature: response.razorpay_signature || 'verified_sig_ok',
                    paymentMethod: 'RAZORPAY',
                  }),
                });
                const verifyJson = await verifyRes.json();
                if (verifyJson.success) {
                  setShowAddMoneyModal(false);
                  setToast({
                    title: 'Deposit Successful',
                    message: `$${amount.toLocaleString()} has been verified by Razorpay and credited to your wallet ledger.`,
                    type: 'success',
                  });
                  fetchWalletData();
                } else {
                  throw new Error(verifyJson.error || 'Server signature verification rejected payment.');
                }
              } catch (vErr: unknown) {
                const vMsg = vErr instanceof Error ? vErr.message : 'Verification rejected';
                setToast({ title: 'Verification Rejected', message: vMsg, type: 'error' });
              } finally {
                setActionLoading(false);
              }
            },
            modal: {
              ondismiss: function () {
                setToast({
                  title: 'Payment Cancelled',
                  message: 'Razorpay checkout dismissed. No wallet balance changes were made.',
                  type: 'info',
                });
                setActionLoading(false);
              },
            },
          });
          rzp.open();
          return;
        }
      }

      // Step 2 Instant Sandbox Simulation: Instantly verify and credit ledger
      const verifyRes = await fetch('/api/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.orderId,
          gatewayPaymentId: `pay_sim_${Date.now()}`,
          gatewaySignature: 'sandbox_verified_sig_ok',
          paymentMethod,
        }),
      });
      const verifyJson = await verifyRes.json();

      if (verifyJson.success) {
        setShowAddMoneyModal(false);
        setToast({
          title: 'Deposit Successful',
          message: `$${amount.toLocaleString()} has been safely credited to your wallet ledger.`,
          type: 'success',
        });
        fetchWalletData();
      } else {
        throw new Error(verifyJson.error || 'Simulation verification failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment failed';
      setToast({ title: 'Payment Error', message: msg, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Fund Allocation (Reserve / Release)
  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(allocateAmount);
    if (!amount || amount <= 0) {
      setToast({ title: 'Invalid Amount', message: 'Please enter a valid amount.', type: 'error' });
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/wallet/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: allocateAction,
          amountUSD: amount,
          amountINR: amount,
          narration: `${allocateAction === 'RESERVE' ? 'Allocated to' : 'Released from'} ${allocateTarget}`,
        }),
      });
      const json = await res.json();

      if (json.success) {
        setShowAllocateModal(false);
        setToast({
          title: allocateAction === 'RESERVE' ? 'Funds Reserved' : 'Funds Released',
          message:
            allocateAction === 'RESERVE'
              ? `$${amount.toLocaleString()} reserved for ${allocateTarget}.`
              : `$${amount.toLocaleString()} returned to available balance.`,
          type: 'success',
        });
        fetchWalletData();
      } else {
        throw new Error(json.error || 'Allocation action failed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Allocation failed';
      setToast({ title: 'Allocation Error', message: msg, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || t.transactionType === typeFilter;
    const matchesSearch =
      searchQuery === '' ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.gatewayReference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.paymentMethod?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  const getStatusBadge = (status: WalletTransactionStatus) => {
    switch (status) {
      case 'SUCCESSFUL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Successful</span>
          </span>
        );
      case 'PENDING':
      case 'PROCESSING':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3 animate-spin" />
            <span>{status === 'PENDING' ? 'Pending' : 'Processing'}</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            Refunded
          </span>
        );
      case 'REVERSED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
            Reversed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Notification */}
      {toast && (
        <ToastNotification
          title={toast.title}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-wide flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-yellow-400/15 border border-yellow-400/40 text-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.3)]">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-white uppercase">Application Wallet & Payment Ledger</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage your trading capital, instant gateway deposits, double-entry audit ledgers, and margin allocations in native <strong>USD</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAllocateModal(true)}
            className="px-4 py-2.5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-300 font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-yellow-400" />
            <span>Allocate to Margin</span>
          </button>

          <button
            onClick={() => setShowAddMoneyModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black text-xs transition-all shadow-lg shadow-yellow-500/25 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Deposit Funds ($)</span>
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Wallet Balance */}
        <div className="glass-card p-4 border-yellow-400/40 shadow-[0_0_20px_rgba(250,204,21,0.12)] bg-[#0d0d10]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-yellow-400 font-black uppercase tracking-wider">Wallet Balance</span>
            <Wallet className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-2xl font-black font-mono text-white mt-2">
            ${summary ? summary.walletBalance.toLocaleString() : '50,000'}
          </p>
          <span className="text-[10px] text-yellow-400/70 font-semibold">Available + Reserved (USD)</span>
        </div>

        {/* Available Balance */}
        <div className="glass-card p-4 border-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider">Available Balance</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black font-mono text-emerald-300 mt-2">
            ${summary ? summary.availableBalance.toLocaleString() : '40,000'}
          </p>
          <span className="text-[10px] text-muted-foreground">Ready for trading / allocation</span>
        </div>

        {/* Reserved Balance */}
        <div className="glass-card p-4 border-amber-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider">Reserved Margin</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black font-mono text-amber-300 mt-2">
            ${summary ? summary.reservedBalance.toLocaleString() : '10,000'}
          </p>
          <span className="text-[10px] text-muted-foreground">Committed in active orders</span>
        </div>

        {/* Total Deposits */}
        <div className="glass-card p-4 border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Total Deposits</span>
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-black font-mono text-white mt-2">
            ${summary ? summary.totalDeposits.toLocaleString() : '75,000'}
          </p>
          <span className="text-[10px] text-muted-foreground">Cumulative verified top-ups</span>
        </div>

        {/* Total Trading Charges */}
        <div className="glass-card p-4 border-rose-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-rose-400 font-semibold uppercase tracking-wider">Trading Fees Paid</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black font-mono text-rose-300 mt-2">
            ${summary ? summary.totalTradingCharges.toLocaleString() : '500'}
          </p>
          <span className="text-[10px] text-muted-foreground">Exchange fees & commissions</span>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="glass-card p-6 border-white/10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Wallet Transaction History</h2>
            <p className="text-xs text-muted-foreground">
              Immutable financial ledger records for all credits, debits, reservations, and settlements in USD.
            </p>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search transaction ID, method..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-black/60 border border-yellow-500/20 text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:border-yellow-400 focus:shadow-[0_0_10px_rgba(250,204,21,0.2)] w-52"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-yellow-500/20 text-xs text-white focus:outline-none focus:border-yellow-400"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESSFUL">Successful</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
              <option value="REVERSED">Reversed</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-yellow-500/20 text-xs text-white focus:outline-none focus:border-yellow-400"
            >
              <option value="ALL">All Types</option>
              <option value="DEPOSIT">Deposits</option>
              <option value="TRADING_RESERVATION">Reservations</option>
              <option value="TRADING_RELEASE">Releases</option>
              <option value="TRADING_FEE">Trading Fees</option>
              <option value="REFUND">Refunds</option>
            </select>

            <button
              onClick={fetchWalletData}
              title="Refresh Ledger"
              className="p-2 rounded-lg border border-yellow-500/20 hover:bg-yellow-400/10 text-muted-foreground hover:text-yellow-400 transition-colors cursor-pointer"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto rounded-xl border border-yellow-500/10 bg-[#09090c]">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#121216] text-[11px] text-zinc-400 uppercase font-bold border-b border-yellow-500/10">
              <tr>
                <th className="p-3">Transaction ID</th>
                <th className="p-3">Type</th>
                <th className="p-3">Amount (USD)</th>
                <th className="p-3">Payment Method</th>
                <th className="p-3">Gateway Ref</th>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No wallet transactions match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isCredit = tx.transactionType === 'DEPOSIT' || tx.transactionType === 'TRADING_RELEASE';
                  return (
                    <tr key={tx.id} className="hover:bg-yellow-400/5 transition-colors">
                      <td className="p-3 font-medium text-white">{tx.id}</td>
                      <td className="p-3 font-medium">
                        <span className="text-zinc-300 font-sans">{tx.transactionType.replace('_', ' ')}</span>
                        {tx.description && (
                          <div className="text-[10px] text-muted-foreground/80 truncate max-w-xs">{tx.description}</div>
                        )}
                      </td>
                      <td className="p-3 font-bold">
                        <span className={isCredit ? 'text-yellow-400 font-black' : 'text-rose-400'}>
                          {isCredit ? '+' : '-'}${tx.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-black/60 text-[10px] font-mono border border-yellow-500/20 text-yellow-300 font-bold">
                          {tx.paymentMethod || 'SYSTEM'}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-muted-foreground">
                        {tx.gatewayReference || tx.referenceId || '—'}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleString(undefined, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-3">{getStatusBadge(tx.status)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD MONEY / DEPOSIT MODAL */}
      {showAddMoneyModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 border-yellow-400/40 bg-[#0c0c0f] shadow-[0_0_35px_rgba(250,204,21,0.2)] animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-yellow-400/15 border border-yellow-400/40 text-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.3)]">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wide">Deposit Funds to Wallet</h3>
                  <p className="text-xs text-zinc-400">Instant Sandbox & Verified Payment Gateway</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddMoneyModal(false)}
                className="text-muted-foreground hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMoneySubmit} className="space-y-4">
              {/* Preset Chips in USD */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-bold uppercase tracking-wider text-[11px]">
                  Suggested Deposit Amounts ($ USD)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[100, 500, 1000, 2500, 5000, 10000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={cn(
                        'py-2 px-1 rounded-lg text-xs font-black border transition-all text-center cursor-pointer font-mono',
                        selectedPreset === preset
                          ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.4)]'
                          : 'bg-black/50 border-white/10 text-zinc-300 hover:text-yellow-300 hover:border-yellow-400/30'
                      )}
                    >
                      ${preset.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount Field */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1 font-bold uppercase tracking-wider text-[11px]">Custom Deposit Amount ($ USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400 font-black text-base">$</span>
                  <input
                    type="number"
                    min="10"
                    max="500000"
                    required
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setSelectedPreset(null);
                    }}
                    className="w-full pl-8 pr-4 py-2.5 rounded-lg bg-black/60 border border-yellow-500/20 text-sm font-mono font-bold text-white focus:outline-none focus:border-yellow-400 focus:shadow-[0_0_10px_rgba(250,204,21,0.25)]"
                  />
                </div>
                <span className="text-[10px] text-zinc-500 mt-1 block">
                  Min: $10 • Max: $500,000 per transaction
                </span>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-bold uppercase tracking-wider text-[11px]">Deposit Gateway Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('SANDBOX')}
                    className={cn(
                      'p-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer text-center',
                      paymentMethod === 'SANDBOX'
                        ? 'bg-yellow-400/20 border-yellow-400 text-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.25)]'
                        : 'border-white/10 text-muted-foreground hover:text-white bg-black/40'
                    )}
                  >
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span>Instant Credit (Sandbox)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI')}
                    className={cn(
                      'p-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer text-center',
                      paymentMethod === 'UPI'
                        ? 'bg-yellow-400/20 border-yellow-400 text-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.25)]'
                        : 'border-white/10 text-muted-foreground hover:text-white bg-black/40'
                    )}
                  >
                    <CreditCard className="w-4 h-4 text-yellow-400" />
                    <span>Razorpay Live Gateway</span>
                  </button>
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 rounded-lg bg-yellow-400/5 border border-yellow-400/20 text-[11px] text-zinc-300">
                <span className="text-yellow-400 font-bold">Instant Balance Settlement: </span>
                Sandbox Mode simulates server cryptographic HMAC verification and instantly credits your wallet ledger in native USD.
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMoneyModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-muted-foreground hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black text-xs font-black shadow-lg shadow-yellow-500/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>CONFIRM DEPOSIT (${Number(customAmount || 0).toLocaleString()})</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ALLOCATE FUNDS MODAL */}
      {showAllocateModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 border-yellow-400/40 bg-[#0c0c0f] shadow-[0_0_35px_rgba(250,204,21,0.2)] animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-yellow-400/15 border border-yellow-400/40 text-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.3)]">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wide">Allocate Trading Margin</h3>
                  <p className="text-xs text-zinc-400">Internal wallet reservation management</p>
                </div>
              </div>
              <button
                onClick={() => setShowAllocateModal(false)}
                className="text-muted-foreground hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAllocateSubmit} className="space-y-4">
              {/* Action Toggle */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-bold uppercase tracking-wider text-[11px]">Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAllocateAction('RESERVE')}
                    className={cn(
                      'p-2.5 rounded-lg border text-xs font-black transition-all cursor-pointer',
                      allocateAction === 'RESERVE'
                        ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.35)]'
                        : 'border-white/10 text-muted-foreground hover:text-white bg-black/40'
                    )}
                  >
                    Reserve for Trading
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllocateAction('RELEASE')}
                    className={cn(
                      'p-2.5 rounded-lg border text-xs font-black transition-all cursor-pointer',
                      allocateAction === 'RELEASE'
                        ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.35)]'
                        : 'border-white/10 text-muted-foreground hover:text-white bg-black/40'
                    )}
                  >
                    Release to Available
                  </button>
                </div>
              </div>

              {/* Amount Field */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1 font-bold uppercase tracking-wider text-[11px]">Amount ($ USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400 font-black text-base">$</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={allocateAmount}
                    onChange={(e) => setAllocateAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-lg bg-black/60 border border-yellow-500/20 text-sm font-mono font-bold text-white focus:outline-none focus:border-yellow-400 focus:shadow-[0_0_10px_rgba(250,204,21,0.25)]"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-muted-foreground hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black text-xs font-black shadow-lg shadow-yellow-500/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {actionLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Allocating...</span>
                    </>
                  ) : (
                    <span>CONFIRM ALLOCATION</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
