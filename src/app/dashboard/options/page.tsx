'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers,
  TrendingUp,
  TrendingDown,
  Calendar,
  Zap,
  ShieldCheck,
  RefreshCw,
  Search,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Sliders,
  DollarSign,
  ArrowUpDown,
  X,
  Lock,
  PauseCircle,
  PlayCircle,
  Clock,
  Radio,
  Info,
  Wallet,
  ShieldAlert,
} from 'lucide-react';
import type { OptionsChainData, OptionContractDetails, OptionType, Side, OrderType } from '@/types';
import { formatPercent, cn } from '@/lib/utils';

interface ExpiryItem {
  iso: string;
  formattedDate: string;
  settlementTimeUtc: string;
  settlementTimeIst: string;
  daysRemaining: number;
  contractCount: number;
}

interface DeltaMarginSummary {
  initialMarginUSD: number;
  maintenanceMarginUSD: number;
  positionMarginUSD: number;
  availableMarginUSD: number;
  blockedMarginUSD: number;
  remainingAvailableBalanceUSD: number;
  walletBalanceUSD: number;
  source: string;
  timestamp: string;
}

interface OrderPreviewDetails {
  product: {
    id: number;
    symbol: string;
    contract_type: string;
    tick_size?: string | number;
    contract_value?: string | number;
  };
  productId: number;
  symbol: string;
  contractType: string;
  strikePrice: number;
  selectedLeverage: number;
  orderQuantity: number;
  contractMultiplier: number;
  estimatedPrice: number;
  markPrice: number;
  spotPrice: number;
  orderValueUSD: number;
  contractValueUSD: number;
  requiredInitialMarginUSD: number;
  maintenanceMarginUSD: number;
  positionMarginUSD: number;
  availableAccountBalanceUSD: number;
  estimatedFeesUSD: number;
  remainingAvailableMarginUSD: number;
  estimatedLiquidationPrice: number | null;
  liquidationPriceDescription: string;
  isLiquidationApplicable: boolean;
  hasSufficientMargin: boolean;
  tickSizeValid: boolean;
  warning?: string;
  marginRequiredUSD: number;
}

export default function OptionsTradingPage() {
  const [underlying, setUnderlying] = useState<'BTC' | 'ETH'>('BTC');
  const [chainData, setChainData] = useState<OptionsChainData | null>(null);
  const [availableExpiries, setAvailableExpiries] = useState<ExpiryItem[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [expiriesLoading, setExpiriesLoading] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'RECONNECTING' | 'ERROR'>('CONNECTED');

  // Live Exchange Account Margins
  const [marginSummary, setMarginSummary] = useState<DeltaMarginSummary>({
    initialMarginUSD: 0,
    maintenanceMarginUSD: 0,
    positionMarginUSD: 0,
    availableMarginUSD: 50000,
    blockedMarginUSD: 0,
    remainingAvailableBalanceUSD: 50000,
    walletBalanceUSD: 50000,
    source: 'DELTA_EXCHANGE',
    timestamp: new Date().toISOString(),
  });

  // Search & Filter state
  const [searchStrike, setSearchStrike] = useState('');
  const [moneynessFilter, setMoneynessFilter] = useState<'ALL' | 'ITM' | 'ATM' | 'OTM'>('ALL');
  const [strikeSortAsc, setStrikeSortAsc] = useState(true);

  // Trading Safety state
  const [tradingPaused, setTradingPaused] = useState(false);

  // Strike Selection & Order Placement state
  const [selectedContract, setSelectedContract] = useState<OptionContractDetails | null>(null);
  const [orderSide, setOrderSide] = useState<Side>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('LIMIT');
  const [orderSize, setOrderSize] = useState<number>(1);
  const [limitPrice, setLimitPrice] = useState<number>(0);
  const [stopPrice, setStopPrice] = useState<number>(0);

  // Dynamic Leverage state from Delta Exchange
  const [allowedLeverages, setAllowedLeverages] = useState<number[]>([1, 2, 5, 10, 25, 50, 100, 200]);
  const [selectedLeverage, setSelectedLeverage] = useState<number>(1);
  const [maxProductLeverage, setMaxProductLeverage] = useState<number>(200);

  // Live Pre-flight Order Calculation
  const [previewData, setPreviewData] = useState<OrderPreviewDetails | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Order Confirmation modal & Result
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{
    success: boolean;
    orderId: string;
    exchangeOrderId: string;
    status: string;
    message: string;
    filledQuantity?: number;
    averageExecutionPrice?: number;
  } | null>(null);

  // 1. Fetch live Delta Exchange account margin summary
  const fetchMarginSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/options/order?action=margin_summary');
      const json = await res.json();
      if (json.success && json.data) {
        setMarginSummary(json.data);
      }
    } catch (err) {
      console.warn('Failed to load margin summary:', err);
    }
  }, []);

  // 2. Fetch ALL Available Expiry Dates from Delta Exchange (cursor pagination)
  const fetchExpiries = useCallback(async (asset = underlying) => {
    setExpiriesLoading(true);
    try {
      const res = await fetch(`/api/options/expiries?underlying=${asset}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data.expiries) && json.data.expiries.length > 0) {
        setAvailableExpiries(json.data.expiries);
        setSelectedExpiry((prev) => {
          const exists = json.data.expiries.some((e: ExpiryItem) => e.iso === prev);
          return exists ? prev : json.data.expiries[0].iso;
        });
      }
    } catch (err) {
      console.error('Failed to load Delta Exchange expiries:', err);
    } finally {
      setExpiriesLoading(false);
    }
  }, [underlying]);

  // 3. Fetch Dynamic Options Chain from Delta Exchange
  const fetchOptionsChain = useCallback(async () => {
    if (!selectedExpiry) return;
    try {
      const res = await fetch(`/api/options/chain?underlying=${underlying}&expiry=${encodeURIComponent(selectedExpiry)}`);
      const json = await res.json();
      if (json.success && json.data.chain) {
        setChainData(json.data.chain);
        setLastUpdateTime(new Date().toLocaleTimeString());
        setConnectionStatus('CONNECTED');
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to fetch Delta options chain:', err);
      setConnectionStatus('ERROR');
    }
  }, [underlying, selectedExpiry]);

  // Initial loads and intervals
  useEffect(() => {
    fetchExpiries(underlying);
    fetchMarginSummary();
  }, [underlying, fetchExpiries, fetchMarginSummary]);

  useEffect(() => {
    fetchOptionsChain();
    const interval = setInterval(fetchOptionsChain, 4000);
    return () => clearInterval(interval);
  }, [fetchOptionsChain]);

  // Fetch product leverage brackets when a contract is selected
  useEffect(() => {
    if (!selectedContract) return;
    const fetchBrackets = async () => {
      try {
        const res = await fetch(`/api/options/order?action=leverage_brackets&productId=${selectedContract.id}`);
        const json = await res.json();
        if (json.success && json.data) {
          const vals: number[] = json.data.allowedLeverageValues || [1, 2, 5, 10, 25, 50, 100, 200];
          setAllowedLeverages(vals);
          setMaxProductLeverage(json.data.maxLeverage || Math.max(...vals, 1));
          // Default leverage for options: 1x (or product default)
          if (!vals.includes(selectedLeverage)) {
            setSelectedLeverage(1);
          }
        }
      } catch {
        setAllowedLeverages([1, 2, 5, 10, 25, 50, 100, 200]);
      }
    };
    fetchBrackets();
  }, [selectedContract, selectedLeverage]);

  // Live recalculate Order Calculation Preview when parameters change
  useEffect(() => {
    if (!selectedContract) {
      setPreviewData(null);
      return;
    }

    let isMounted = true;
    const computePreview = async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch('/api/options/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'preview',
            productId: Number(selectedContract.id),
            size: orderSize,
            side: orderSide.toLowerCase(),
            orderType: orderType.toLowerCase().replace(' ', '_'),
            limitPrice: orderType === 'LIMIT' ? limitPrice : undefined,
            leverage: selectedLeverage,
          }),
        });
        const json = await res.json();
        if (isMounted && json.success && json.data) {
          setPreviewData(json.data);
        }
      } catch (err) {
        console.warn('Failed to calculate preview:', err);
      } finally {
        if (isMounted) setPreviewLoading(false);
      }
    };

    const timer = setTimeout(computePreview, 150);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedContract, orderSide, orderType, orderSize, limitPrice, selectedLeverage]);

  // Select a contract directly from the chain table
  const handleSelectContract = (contract: OptionContractDetails) => {
    if (tradingPaused) {
      alert('Trading is currently paused. Resume trading using the top control.');
      return;
    }
    setSelectedContract(contract);
    const defaultPrice = contract.bidPrice > 0 ? contract.bidPrice : contract.lastTradedPrice || 1;
    setLimitPrice(Number(defaultPrice.toFixed(2)));
    setStopPrice(Number((defaultPrice * 0.8).toFixed(2)));
    setOrderResult(null);
  };

  // Filtered and sorted strike rows
  const filteredRows = useMemo(() => {
    if (!chainData) return [];
    let rows = [...chainData.strikes];

    if (searchStrike.trim()) {
      const q = searchStrike.trim();
      rows = rows.filter((r) => r.strikePrice.toString().includes(q));
    }

    if (moneynessFilter !== 'ALL') {
      rows = rows.filter((r) => {
        if (moneynessFilter === 'ATM') return r.isATM;
        return r.call.moneyness === moneynessFilter || r.put.moneyness === moneynessFilter;
      });
    }

    if (!strikeSortAsc) {
      rows.reverse();
    }

    return rows;
  }, [chainData, searchStrike, moneynessFilter, strikeSortAsc]);

  // Selected expiry metadata
  const currentExpiryMeta = availableExpiries.find((e) => e.iso === selectedExpiry) || availableExpiries[0];

  // Submit confirmed order
  const handleOrderSubmission = async () => {
    if (!selectedContract || orderSubmitting) return;
    setOrderSubmitting(true);
    setOrderResult(null);

    try {
      const res = await fetch('/api/options/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          productId: Number(selectedContract.id),
          size: orderSize,
          side: orderSide.toLowerCase(),
          orderType: orderType.toLowerCase().replace(' ', '_'),
          limitPrice: orderType === 'LIMIT' ? limitPrice : undefined,
          stopPrice: orderType.includes('STOP') ? stopPrice : undefined,
          leverage: selectedLeverage,
          isTestnet: false,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setOrderResult({
          success: true,
          orderId: json.data.orderId,
          exchangeOrderId: json.data.exchangeOrderId,
          status: json.data.status,
          message: json.data.message || 'Order placed successfully on Delta Exchange.',
          filledQuantity: json.data.filledQuantity,
          averageExecutionPrice: json.data.averageExecutionPrice,
        });
        fetchMarginSummary();
      } else {
        setOrderResult({
          success: false,
          orderId: '',
          exchangeOrderId: '',
          status: 'REJECTED',
          message: json.error?.message || 'Delta Exchange order submission failed.',
        });
      }
    } catch (err: unknown) {
      setOrderResult({
        success: false,
        orderId: '',
        exchangeOrderId: '',
        status: 'FAILED',
        message: err instanceof Error ? err.message : 'Network error submitting to Delta Exchange.',
      });
    } finally {
      setOrderSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-48">
      {/* 1. Live Delta Exchange Account Margin Bar (Visible at all times) */}
      <div className="glass-card p-4 border-yellow-500/30 bg-gradient-to-r from-yellow-950/20 via-black to-yellow-950/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-yellow-400/20 text-yellow-400 border border-yellow-400/40 flex items-center justify-center font-bold shadow-[0_0_12px_rgba(250,204,21,0.25)]">
              <Wallet className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-wide">Delta Exchange Account Margin</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-yellow-400/10 text-yellow-300 border border-yellow-400/30 font-bold">
                  {marginSummary.source}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Official trading balances • Settlement in <strong>USD</strong> • Distinct from app wallet
              </p>
            </div>
          </div>

          {/* Margin Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
            <div className="p-2 rounded-lg bg-black/40 border border-white/5">
              <div className="text-[10px] text-muted-foreground uppercase">Initial Margin</div>
              <div className="font-bold text-white">${marginSummary.initialMarginUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-white/5">
              <div className="text-[10px] text-muted-foreground uppercase">Maint. Margin</div>
              <div className="font-bold text-white">${marginSummary.maintenanceMarginUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-white/5">
              <div className="text-[10px] text-muted-foreground uppercase">Position Margin</div>
              <div className="font-bold text-white">${marginSummary.positionMarginUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-white/5">
              <div className="text-[10px] text-muted-foreground uppercase">Blocked Margin</div>
              <div className="font-bold text-amber-300">${marginSummary.blockedMarginUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-white/5">
              <div className="text-[10px] text-emerald-400 uppercase">Available Margin</div>
              <div className="font-bold text-emerald-400">${marginSummary.availableMarginUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="p-2 rounded-lg bg-black/40 border border-white/5">
              <div className="text-[10px] text-yellow-400 uppercase font-bold">Total Balance</div>
              <div className="font-bold text-yellow-300">${marginSummary.walletBalanceUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-yellow-400" />
              <span>Crypto Options Chain</span>
            </h1>
            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-yellow-400/10 text-yellow-300 border border-yellow-400/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(250,204,21,0.15)]">
              <span className="w-2 h-2 rounded-full bg-yellow-400 pulse-dot shadow-[0_0_8px_#FFE600]" />
              Delta Exchange India Sole Feed
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
            <span>Official REST: <strong>api.india.delta.exchange</strong></span>
            <span>•</span>
            <span>Quote Asset: <strong>USD</strong></span>
            <span>•</span>
            <span>Sync: {lastUpdateTime || 'Syncing...'}</span>
          </p>
        </div>

        {/* Global Trading Guardrails & Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTradingPaused(!tradingPaused)}
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer',
              tradingPaused
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-white/5 text-muted-foreground border-white/10 hover:text-white'
            )}
          >
            {tradingPaused ? <PlayCircle className="w-4 h-4 text-amber-400" /> : <PauseCircle className="w-4 h-4 text-yellow-400" />}
            <span>{tradingPaused ? 'TRADING PAUSED' : 'PAUSE TRADING'}</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs">
            <Radio className={cn('w-3.5 h-3.5', connectionStatus === 'CONNECTED' ? 'text-emerald-400 animate-pulse' : 'text-rose-400')} />
            <span className="text-muted-foreground">Delta WS:</span>
            <span className="font-mono font-bold text-white">{connectionStatus}</span>
          </div>
        </div>
      </div>

      {/* Selectors Bar: Underlying Asset & Dynamic Expiries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Underlying Asset Selector */}
        <div className="glass-card p-4 space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Underlying Crypto Asset
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['BTC', 'ETH'] as const).map((asset) => {
              const isSelected = underlying === asset;
              return (
                <button
                  key={asset}
                  onClick={() => setUnderlying(asset)}
                  className={cn(
                    'py-2 px-3 rounded-xl font-black text-sm flex items-center justify-between border transition-all cursor-pointer',
                    isSelected
                      ? 'bg-yellow-400/15 text-yellow-300 border-yellow-400/50 shadow-lg shadow-yellow-500/10'
                      : 'glass border-transparent text-muted-foreground hover:text-white'
                  )}
                >
                  <span>{asset}</span>
                  <span className="text-xs font-mono font-normal">
                    {asset === 'BTC' ? 'Bitcoin' : 'Ethereum'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Dynamic Expiry Selector (Populated from Delta Exchange API with Pagination) */}
        <div className="glass-card p-4 space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Delta Exchange Expiry Date ({availableExpiries.length} Available Future Dates)
            </label>
            {currentExpiryMeta && (
              <span className="text-xs font-mono text-yellow-400">
                Settlement: {currentExpiryMeta.settlementTimeIst}
              </span>
            )}
          </div>

          {expiriesLoading ? (
            <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-yellow-400" />
              <span>Fetching all listed future maturities from Delta Exchange...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {availableExpiries.map((exp) => {
                const isSelected = selectedExpiry === exp.iso;
                return (
                  <button
                    key={exp.iso}
                    onClick={() => setSelectedExpiry(exp.iso)}
                    className={cn(
                      'px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border flex-shrink-0 transition-all text-left cursor-pointer',
                      isSelected
                        ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.35)] font-black'
                        : 'glass border-white/5 text-muted-foreground hover:text-white hover:border-white/20'
                    )}
                  >
                    <div>{exp.formattedDate}</div>
                    <div className={cn('text-[10px] font-mono', isSelected ? 'text-black/80 font-bold' : 'text-yellow-400/80')}>
                      {exp.daysRemaining}d to expiry • {exp.contractCount} contracts
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Spot Price & Chain Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-black/40 border border-white/10">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-xs text-muted-foreground">Underlying Spot ({underlying}USD):</span>
            <div className="text-2xl font-black font-mono text-white flex items-center gap-2">
              <span>${chainData?.underlyingPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '...'}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                Live Delta Feed
              </span>
            </div>
          </div>
        </div>

        {/* Search, Moneyness Filter & Sorting */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search strike..."
              value={searchStrike}
              onChange={(e) => setSearchStrike(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-black/60 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-400 w-32"
            />
          </div>

          <div className="flex items-center bg-black/60 p-0.5 rounded-lg border border-white/10 text-xs">
            {(['ALL', 'ITM', 'ATM', 'OTM'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMoneynessFilter(m)}
                className={cn(
                  'px-2.5 py-1 rounded font-bold transition-colors cursor-pointer',
                  moneynessFilter === m ? 'bg-yellow-400 text-black font-extrabold' : 'text-muted-foreground hover:text-white'
                )}
              >
                {m}
              </button>
            ))}
          </div>

          <button
            onClick={() => setStrikeSortAsc(!strikeSortAsc)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-xs text-muted-foreground hover:text-white cursor-pointer"
          >
            <ArrowUpDown className="w-3 h-3 text-yellow-400" />
            <span>{strikeSortAsc ? 'Strikes ↑' : 'Strikes ↓'}</span>
          </button>
        </div>
      </div>

      {/* Main Options Chain Table (Side-by-side Calls & Puts flanking Strike) */}
      <div className="glass-card overflow-hidden border-yellow-500/20">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs text-left border-collapse min-w-[1050px]">
            <thead>
              {/* Super Header: Calls vs Puts */}
              <tr className="border-b border-white/10 bg-black/70 font-black text-center">
                <th colSpan={7} className="py-2.5 px-4 text-emerald-400 uppercase tracking-widest border-r border-white/10">
                  Call Options (CE) — Delta Exchange India
                </th>
                <th className="py-2.5 px-4 text-yellow-400 uppercase tracking-widest bg-yellow-400/10 font-black">
                  Strike Price ($)
                </th>
                <th colSpan={7} className="py-2.5 px-4 text-rose-400 uppercase tracking-widest border-l border-white/10">
                  Put Options (PE) — Delta Exchange India
                </th>
              </tr>

              {/* Column Headers */}
              <tr className="border-b border-white/10 text-[11px] text-muted-foreground bg-black/50">
                {/* Calls */}
                <th className="py-2 px-2 text-right">Delta</th>
                <th className="py-2 px-2 text-right">IV</th>
                <th className="py-2 px-2 text-right">OI</th>
                <th className="py-2 px-2 text-right">Bid ($)</th>
                <th className="py-2 px-2 text-right">Ask ($)</th>
                <th className="py-2 px-2 text-right">LTP ($)</th>
                <th className="py-2 px-2 text-center border-r border-white/10">Call Select</th>

                {/* Strike */}
                <th className="py-2 px-4 text-center font-bold text-yellow-400 bg-yellow-400/5">
                  Strike ($)
                </th>

                {/* Puts */}
                <th className="py-2 px-2 text-center border-l border-white/10">Put Select</th>
                <th className="py-2 px-2 text-left">LTP ($)</th>
                <th className="py-2 px-2 text-left">Bid ($)</th>
                <th className="py-2 px-2 text-left">Ask ($)</th>
                <th className="py-2 px-2 text-left">OI</th>
                <th className="py-2 px-2 text-left">IV</th>
                <th className="py-2 px-2 text-left">Delta</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={15} className="py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-yellow-400" />
                      <span>Loading dynamic options chain from Delta Exchange...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-muted-foreground">
                    No options contracts matched your filter for this expiry.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isCallSelected = selectedContract?.id === row.call.id;
                  const isPutSelected = selectedContract?.id === row.put.id;

                  return (
                    <tr
                      key={row.strikePrice}
                      className={cn(
                        'transition-colors',
                        row.isATM ? 'bg-yellow-500/10 font-bold' : 'hover:bg-white/[0.02]',
                        isCallSelected && 'bg-emerald-500/10',
                        isPutSelected && 'bg-rose-500/10'
                      )}
                    >
                      {/* Call Delta */}
                      <td className="py-2.5 px-2 text-right text-zinc-400">
                        {row.call.delta !== undefined ? row.call.delta.toFixed(3) : '-'}
                      </td>

                      {/* Call IV */}
                      <td className="py-2.5 px-2 text-right text-zinc-400">
                        {row.call.impliedVolatility ? `${row.call.impliedVolatility.toFixed(1)}%` : '-'}
                      </td>

                      {/* Call OI */}
                      <td className="py-2.5 px-2 text-right text-zinc-400">
                        {row.call.openInterest.toLocaleString()}
                      </td>

                      {/* Call Bid */}
                      <td className="py-2.5 px-2 text-right text-emerald-400 font-bold">
                        {row.call.bidPrice > 0 ? `$${row.call.bidPrice.toFixed(2)}` : '-'}
                      </td>

                      {/* Call Ask */}
                      <td className="py-2.5 px-2 text-right text-rose-400 font-bold">
                        {row.call.askPrice > 0 ? `$${row.call.askPrice.toFixed(2)}` : '-'}
                      </td>

                      {/* Call LTP */}
                      <td className="py-2.5 px-2 text-right text-white font-extrabold">
                        ${row.call.lastTradedPrice.toFixed(2)}
                      </td>

                      {/* Call Select Button */}
                      <td className="py-2.5 px-2 text-center border-r border-white/10">
                        <button
                          onClick={() => handleSelectContract(row.call)}
                          className={cn(
                            'px-2.5 py-1 rounded text-[10px] font-black transition-all cursor-pointer',
                            isCallSelected
                              ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                              : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-black'
                          )}
                        >
                          {isCallSelected ? 'SELECTED' : 'CALL'}
                        </button>
                      </td>

                      {/* Strike Price (Center) */}
                      <td className="py-2.5 px-4 text-center font-black text-white bg-yellow-500/10 border-x border-white/10">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>${row.strikePrice.toLocaleString()}</span>
                          {row.isATM && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-yellow-400 text-black font-extrabold">
                              ATM
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Put Select Button */}
                      <td className="py-2.5 px-2 text-center border-l border-white/10">
                        <button
                          onClick={() => handleSelectContract(row.put)}
                          className={cn(
                            'px-2.5 py-1 rounded text-[10px] font-black transition-all cursor-pointer',
                            isPutSelected
                              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                              : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white'
                          )}
                        >
                          {isPutSelected ? 'SELECTED' : 'PUT'}
                        </button>
                      </td>

                      {/* Put LTP */}
                      <td className="py-2.5 px-2 text-left text-white font-extrabold">
                        ${row.put.lastTradedPrice.toFixed(2)}
                      </td>

                      {/* Put Bid */}
                      <td className="py-2.5 px-2 text-left text-emerald-400 font-bold">
                        {row.put.bidPrice > 0 ? `$${row.put.bidPrice.toFixed(2)}` : '-'}
                      </td>

                      {/* Put Ask */}
                      <td className="py-2.5 px-2 text-left text-rose-400 font-bold">
                        {row.put.askPrice > 0 ? `$${row.put.askPrice.toFixed(2)}` : '-'}
                      </td>

                      {/* Put OI */}
                      <td className="py-2.5 px-2 text-left text-zinc-400">
                        {row.put.openInterest.toLocaleString()}
                      </td>

                      {/* Put IV */}
                      <td className="py-2.5 px-2 text-left text-zinc-400">
                        {row.put.impliedVolatility ? `${row.put.impliedVolatility.toFixed(1)}%` : '-'}
                      </td>

                      {/* Put Delta */}
                      <td className="py-2.5 px-2 text-left text-zinc-400">
                        {row.put.delta !== undefined ? row.put.delta.toFixed(3) : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Strike Order Ticket Drawer with Full Order Calculation Panel */}
      {selectedContract && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-2xl border-t border-yellow-500/40 p-5 shadow-2xl animate-in slide-in-from-bottom duration-300">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Top Bar: Contract Details & Controls */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
              {/* Contract Info */}
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm',
                    selectedContract.optionType === 'CE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  )}
                >
                  {selectedContract.optionType}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white font-mono">
                      {selectedContract.underlying} ${selectedContract.strikePrice.toLocaleString()} {selectedContract.optionType === 'CE' ? 'Call' : 'Put'}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-zinc-300">
                      Product ID: {selectedContract.id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-300 border border-yellow-500/30">
                      Symbol: {selectedContract.symbol}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Maturity: {currentExpiryMeta?.settlementTimeUtc || selectedContract.expiryDate} • 1 Lot = {selectedContract.lotSize} {selectedContract.underlying}
                  </p>
                </div>
              </div>

              {/* Order Form Inputs */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Side BUY/SELL */}
                <div className="flex items-center p-1 rounded-lg bg-black/60 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setOrderSide('BUY')}
                    className={cn(
                      'px-3 py-1.5 rounded text-xs font-black transition-colors cursor-pointer',
                      orderSide === 'BUY' ? 'bg-emerald-500 text-black' : 'text-muted-foreground hover:text-white'
                    )}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderSide('SELL')}
                    className={cn(
                      'px-3 py-1.5 rounded text-xs font-black transition-colors cursor-pointer',
                      orderSide === 'SELL' ? 'bg-rose-500 text-white' : 'text-muted-foreground hover:text-white'
                    )}
                  >
                    SELL
                  </button>
                </div>

                {/* Order Type */}
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as OrderType)}
                  className="px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-xs font-bold text-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="LIMIT">Limit Order</option>
                  <option value="MARKET">Market Order</option>
                  <option value="STOP_MARKET">Stop-Market Order</option>
                </select>

                {/* Quantity */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Lots:</span>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={orderSize}
                    onChange={(e) => setOrderSize(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-xs font-bold font-mono text-white text-center focus:outline-none focus:border-yellow-400"
                  />
                </div>

                {/* Limit Price */}
                {orderType === 'LIMIT' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Price ($):</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/10 text-xs font-bold font-mono text-white text-right focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                )}

                {/* Close Button */}
                <button
                  onClick={() => setSelectedContract(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Middle Section: Delta Exchange Leverage Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-black/50 border border-white/10">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Delta Exchange Leverage</span>
                <span className="text-[11px] text-muted-foreground">
                  (Official exchange limits: 1x to {maxProductLeverage}x)
                </span>
              </div>

              {/* Leverage Pills populated directly from Delta Exchange */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {allowedLeverages.map((lev) => (
                  <button
                    key={lev}
                    type="button"
                    onClick={() => setSelectedLeverage(lev)}
                    className={cn(
                      'px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer font-mono',
                      selectedLeverage === lev
                        ? 'bg-yellow-400 text-black shadow-[0_0_12px_rgba(250,204,21,0.35)]'
                        : 'bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 border border-white/5'
                    )}
                  >
                    {lev}x
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Section: Order Calculation Panel (All 9 Required Fields Visible) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 font-mono text-xs">
              <div className="p-2.5 rounded-xl bg-black/60 border border-white/5">
                <div className="text-[10px] text-muted-foreground uppercase">Selected Leverage</div>
                <div className="text-sm font-bold text-yellow-400">{selectedLeverage}x</div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/60 border border-white/5">
                <div className="text-[10px] text-muted-foreground uppercase">Order Quantity</div>
                <div className="text-sm font-bold text-white">{orderSize} Lots</div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/60 border border-white/5">
                <div className="text-[10px] text-muted-foreground uppercase">Est. Order Notional</div>
                <div className="text-sm font-bold text-white">
                  ${previewData ? previewData.orderValueUSD.toFixed(2) : '...'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/60 border border-white/5">
                <div className="text-[10px] text-muted-foreground uppercase">Required Initial Margin</div>
                <div className="text-sm font-bold text-amber-300">
                  ${previewData ? previewData.requiredInitialMarginUSD.toFixed(2) : '...'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/60 border border-white/5">
                <div className="text-[10px] text-muted-foreground uppercase">Maint. Margin</div>
                <div className="text-sm font-bold text-zinc-300">
                  ${previewData ? previewData.maintenanceMarginUSD.toFixed(2) : '0.00'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/60 border border-white/5">
                <div className="text-[10px] text-muted-foreground uppercase">Available Balance</div>
                <div className="text-sm font-bold text-emerald-400">
                  ${previewData ? previewData.availableAccountBalanceUSD.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '...'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/60 border border-white/5">
                <div className="text-[10px] text-muted-foreground uppercase">Est. Fees</div>
                <div className="text-sm font-bold text-zinc-300">
                  ${previewData ? previewData.estimatedFeesUSD.toFixed(2) : '...'}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-black/60 border border-white/5">
                <div className="text-[10px] text-muted-foreground uppercase">Remaining Margin</div>
                <div className="text-sm font-bold text-yellow-300">
                  ${previewData ? previewData.remainingAvailableMarginUSD.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '...'}
                </div>
              </div>
            </div>

            {/* Liquidation Price Ribbon */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-black/60 border border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-muted-foreground">Estimated Liquidation Price:</span>
                <span className="font-mono font-bold text-white">
                  {previewData?.liquidationPriceDescription || 'Calculating with Delta Exchange risk rules...'}
                </span>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={tradingPaused || previewLoading}
                className="px-6 py-2.5 rounded-xl text-xs font-black bg-yellow-400 hover:bg-yellow-300 text-black font-extrabold shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ShoppingCart className="w-4 h-4 text-black" />
                <span>CONFIRM ORDER & SUBMIT</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explicit Order Confirmation Dialog with Verification */}
      {showConfirmModal && selectedContract && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="glass-card max-w-lg w-full p-6 border-yellow-500/40 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-yellow-400" />
                <span>Confirm Delta Exchange Live Order</span>
              </h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-muted-foreground hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Product ID & Symbol</span>
                <span className="font-bold text-white">
                  #{selectedContract.id} • {selectedContract.symbol}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Underlying & Strike</span>
                <span className="font-bold text-white">
                  {selectedContract.underlying} ${selectedContract.strikePrice} ({selectedContract.optionType})
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Side & Order Type</span>
                <span className={cn('font-bold', orderSide === 'BUY' ? 'text-emerald-400' : 'text-rose-400')}>
                  {orderSide} {orderSize} Lots • {orderType}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Selected Leverage</span>
                <span className="font-bold text-yellow-400">{selectedLeverage}x (Applied on Delta)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Est. Execution Price</span>
                <span className="font-bold text-white">${previewData.estimatedPrice.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Estimated Notional</span>
                <span className="font-bold text-white">${previewData.orderValueUSD.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Required Initial Margin</span>
                <span className="font-bold text-amber-300">${previewData.requiredInitialMarginUSD.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Maintenance Margin</span>
                <span className="font-bold text-zinc-300">${previewData.maintenanceMarginUSD.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-muted-foreground">Liquidation Risk</span>
                <span className="font-bold text-white text-[11px] text-right">
                  {previewData.liquidationPriceDescription}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Estimated Fees</span>
                <span className="font-bold text-zinc-400">${previewData.estimatedFeesUSD.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Result Message */}
            {orderResult && (
              <div
                className={cn(
                  'p-3 rounded-lg border text-xs',
                  orderResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                )}
              >
                <div className="font-bold mb-0.5">{orderResult.message}</div>
                {orderResult.exchangeOrderId && (
                  <div className="font-mono text-[10px] text-muted-foreground">
                    Exchange ID: {orderResult.exchangeOrderId} • Status: {orderResult.status}
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-muted-foreground hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOrderSubmission}
                disabled={orderSubmitting || tradingPaused}
                className="flex-1 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-black shadow-lg shadow-yellow-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {orderSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                    <span>Transmitting...</span>
                  </>
                ) : (
                  <span>AUTHORIZE & EXECUTE</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
