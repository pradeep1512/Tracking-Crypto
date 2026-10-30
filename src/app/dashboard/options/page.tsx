'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  BarChart3,
  Sliders,
  DollarSign,
} from 'lucide-react';
import type { OptionsChainData, OptionContractDetails, OptionType, Side } from '@/types';
import { formatPercent, cn } from '@/lib/utils';

export default function OptionsTradingPage() {
  const [underlying, setUnderlying] = useState('BTC');
  const [chainData, setChainData] = useState<OptionsChainData | null>(null);
  const [selectedExpiry, setSelectedExpiry] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<OptionContractDetails | null>(null);
  const [currencyMode, setCurrencyMode] = useState<'INR' | 'USD'>('INR');
  const [usdtRate, setUsdtRate] = useState<number>(95.02);

  // Order placement state
  const [orderSide, setOrderSide] = useState<Side>('BUY');
  const [orderQty, setOrderQty] = useState(1);
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [targetPrice, setTargetPrice] = useState<number>(0);
  const [stopLossPrice, setStopLossPrice] = useState<number>(0);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  const fetchConversionRate = useCallback(async () => {
    try {
      const res = await fetch('/api/market/conversion-rate');
      const json = await res.json();
      if (json.success && json.data?.rate) {
        setUsdtRate(json.data.rate);
      }
    } catch {
      // Use fallback
    }
  }, []);

  const fetchOptionsChain = useCallback(async () => {
    try {
      const expiryParam = selectedExpiry ? `&expiry=${selectedExpiry}` : '';
      const res = await fetch(`/api/options/chain?underlying=${underlying}${expiryParam}`);
      const json = await res.json();
      if (json.success && json.data.chain) {
        setChainData(json.data.chain);
        if (!selectedExpiry && json.data.chain.availableExpiries.length > 0) {
          setSelectedExpiry(json.data.chain.selectedExpiry);
        }
        setLoading(false);
      }
    } catch {
      // Handled
    }
  }, [underlying, selectedExpiry]);

  useEffect(() => {
    fetchConversionRate();
    fetchOptionsChain();
    const interval = setInterval(fetchOptionsChain, 3500);
    const rateInterval = setInterval(fetchConversionRate, 30000);
    return () => {
      clearInterval(interval);
      clearInterval(rateInterval);
    };
  }, [fetchOptionsChain, fetchConversionRate]);

  const formatPriceDisplay = useCallback((val: number, isCrypto: boolean) => {
    if (currencyMode === 'INR') {
      const inrVal = isCrypto ? val * usdtRate : val;
      return `₹${inrVal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    }
    const usdVal = isCrypto ? val : val / usdtRate;
    return `$${usdVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [currencyMode, usdtRate]);

  // When a contract is selected, populate order entry defaults
  const handleSelectContract = (contract: OptionContractDetails) => {
    setSelectedContract(contract);
    const isCrypto = chainData?.category === 'CRYPTO';
    const mult = (currencyMode === 'INR' && isCrypto) ? usdtRate : 1;
    const ask = Number((contract.askPrice * mult).toFixed(2));
    setEntryPrice(ask);
    setTargetPrice(Number((ask * 1.35).toFixed(2)));
    setStopLossPrice(Number((ask * 0.75).toFixed(2)));
    setOrderSuccessMsg(null);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract) return;

    setOrderSubmitting(true);
    setOrderSuccessMsg(null);

    try {
      const res = await fetch('/api/brokers/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId: 'port_options_yield',
          brokerId: 'broker_paper_sim',
          symbol: selectedContract.id,
          category: 'OPTION',
          side: orderSide,
          orderType: 'LIMIT',
          quantity: orderQty,
          price: entryPrice,
          stopLoss: stopLossPrice,
          takeProfit: targetPrice,
          isPaperTrade: true,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setOrderSuccessMsg(
          `Order ${json.data.order.orderId} executed! Filled ${orderQty} lots of ${selectedContract.id} at ${currencyMode === 'INR' ? '₹' : '$'}${json.data.order.executionPrice}`
        );
      }
    } catch {
      // Handled
    } finally {
      setOrderSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Options Chain & Strike Selection</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-300">
              Derivatives Terminal
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Dynamic Black-Scholes options chain for Crypto and MCX Commodities • Listed strikes with full Greek metrics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Currency Toggle */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-1 text-xs font-medium">
            <button
              onClick={() => setCurrencyMode('INR')}
              className={cn(
                'px-3 py-1 rounded-md transition-all',
                currencyMode === 'INR' ? 'bg-purple-600 text-white font-bold shadow' : 'text-muted-foreground hover:text-white'
              )}
            >
              INR (₹)
            </button>
            <button
              onClick={() => setCurrencyMode('USD')}
              className={cn(
                'px-3 py-1 rounded-md transition-all',
                currencyMode === 'USD' ? 'bg-purple-600 text-white font-bold shadow' : 'text-muted-foreground hover:text-white'
              )}
            >
              USD ($)
            </button>
          </div>

          {/* Underlying Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {[
              { sym: 'BTC', label: 'BTC Crypto', cat: 'CRYPTO' },
              { sym: 'ETH', label: 'ETH Crypto', cat: 'CRYPTO' },
              { sym: 'SOL', label: 'SOL Crypto', cat: 'CRYPTO' },
              { sym: 'GOLD', label: 'MCX Gold', cat: 'MCX' },
              { sym: 'SILVER', label: 'MCX Silver', cat: 'MCX' },
              { sym: 'CRUDEOIL', label: 'MCX Crude', cat: 'MCX' },
              { sym: 'NATURALGAS', label: 'MCX Gas', cat: 'MCX' },
            ].map((item) => (
              <button
                key={item.sym}
                onClick={() => {
                  setUnderlying(item.sym);
                  setSelectedExpiry('');
                  setSelectedContract(null);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap',
                  underlying === item.sym
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow'
                    : 'glass border-transparent text-muted-foreground hover:text-white hover:border-white/10'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Expiry Selector Bar & Underlying Spot Price */}
      {chainData && (
        <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-4 border-purple-500/20">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Underlying Spot ({chainData.underlying})</span>
              <p className="text-xl font-mono font-black text-white">
                {formatPriceDisplay(chainData.underlyingPrice, chainData.category === 'CRYPTO')}
              </p>
            </div>
            <div className="h-8 w-px bg-white/10 hidden sm:block" />
            <div className="hidden sm:block">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">Exchange Venue</span>
              <p className="text-xs font-mono font-bold text-purple-300">{chainData.exchange}</p>
            </div>
            {chainData.category === 'CRYPTO' && currencyMode === 'INR' && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-[11px] font-mono text-purple-300">
                <span>1 USDT = ₹{usdtRate.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              Contract Expiry:
            </span>
            <div className="flex items-center gap-1">
              {chainData.availableExpiries.map((exp) => (
                <button
                  key={exp}
                  onClick={() => setSelectedExpiry(exp)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all border',
                    selectedExpiry === exp
                      ? 'bg-purple-600 text-white border-purple-400'
                      : 'bg-white/5 border-white/10 text-muted-foreground hover:text-white'
                  )}
                >
                  {exp}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Options Chain Table */}
      <div className="glass-card p-4 overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header Row */}
          <div className="grid grid-cols-13 text-center text-[11px] font-bold py-2 border-b border-white/10">
            {/* CALLS (6 cols) */}
            <div className="col-span-6 bg-emerald-500/10 text-emerald-400 rounded-l py-1.5 border border-emerald-500/20">
              CALL OPTIONS (CE)
            </div>
            {/* STRIKE (1 col) */}
            <div className="col-span-1 bg-purple-500/15 text-purple-300 py-1.5 border-y border-purple-500/30">
              STRIKE
            </div>
            {/* PUTS (6 cols) */}
            <div className="col-span-6 bg-rose-500/10 text-rose-400 rounded-r py-1.5 border border-rose-500/20">
              PUT OPTIONS (PE)
            </div>
          </div>

          {/* Subheader Columns */}
          <div className="grid grid-cols-13 text-center text-[10px] text-muted-foreground font-mono py-1.5 border-b border-white/5">
            <span>IV%</span>
            <span>OI</span>
            <span>Vol</span>
            <span>Bid</span>
            <span>Ask</span>
            <span className="font-bold text-emerald-400">LTP ({currencyMode === 'INR' ? '₹' : '$'})</span>

            <span className="font-extrabold text-white">Strike ({currencyMode === 'INR' ? '₹' : '$'})</span>

            <span className="font-bold text-rose-400">LTP ({currencyMode === 'INR' ? '₹' : '$'})</span>
            <span>Bid</span>
            <span>Ask</span>
            <span>Vol</span>
            <span>OI</span>
            <span>IV%</span>
          </div>

          {/* Chain Strike Rows */}
          {chainData ? (
            <div className="divide-y divide-white/5 text-xs font-mono">
              {chainData.strikes.map((row) => {
                const isSelectedCall = selectedContract?.id === row.call.id;
                const isSelectedPut = selectedContract?.id === row.put.id;
                const isCrypto = chainData.category === 'CRYPTO';
                const mult = (currencyMode === 'INR' && isCrypto) ? usdtRate : 1;
                const formatVal = (v: number) => {
                  const val = v * mult;
                  return val >= 1000 ? Math.round(val).toLocaleString('en-IN') : val.toFixed(2);
                };

                return (
                  <div
                    key={row.strikePrice}
                    className={cn(
                      'grid grid-cols-13 text-center py-2 items-center transition-colors',
                      row.isATM && 'bg-purple-500/10'
                    )}
                  >
                    {/* CALL CELLS */}
                    <span className="text-muted-foreground">{row.call.impliedVolatility}%</span>
                    <span className="text-muted-foreground">{row.call.openInterest.toLocaleString()}</span>
                    <span className="text-muted-foreground">{row.call.volume}</span>
                    <span className="text-muted-foreground">{formatVal(row.call.bidPrice)}</span>
                    <span className="text-muted-foreground">{formatVal(row.call.askPrice)}</span>
                    <button
                      onClick={() => handleSelectContract(row.call)}
                      className={cn(
                        'py-1 px-1.5 rounded font-bold transition-all text-emerald-400 hover:bg-emerald-500/20',
                        isSelectedCall && 'bg-emerald-500 text-black font-extrabold'
                      )}
                    >
                      {formatVal(row.call.lastTradedPrice)}
                    </button>

                    {/* STRIKE CELL */}
                    <span
                      className={cn(
                        'font-bold py-1 rounded text-white',
                        row.isATM ? 'bg-purple-600 font-extrabold text-white shadow' : 'bg-black/30'
                      )}
                    >
                      {formatVal(row.strikePrice)}
                      {row.isATM && <span className="block text-[8px] font-mono text-purple-200">ATM</span>}
                    </span>

                    {/* PUT CELLS */}
                    <button
                      onClick={() => handleSelectContract(row.put)}
                      className={cn(
                        'py-1 px-1.5 rounded font-bold transition-all text-rose-400 hover:bg-rose-500/20',
                        isSelectedPut && 'bg-rose-500 text-white font-extrabold'
                      )}
                    >
                      {formatVal(row.put.lastTradedPrice)}
                    </button>
                    <span className="text-muted-foreground">{formatVal(row.put.bidPrice)}</span>
                    <span className="text-muted-foreground">{formatVal(row.put.askPrice)}</span>
                    <span className="text-muted-foreground">{row.put.volume}</span>
                    <span className="text-muted-foreground">{row.put.openInterest.toLocaleString()}</span>
                    <span className="text-muted-foreground">{row.put.impliedVolatility}%</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-400" />
              <span>Calculating Black-Scholes strike chain...</span>
            </div>
          )}
        </div>
      </div>

      {/* Selected Contract Order Configuration Modal / Panel */}
      {selectedContract && (
        <div className="glass-card p-6 border-purple-500/40 space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded text-xs font-black',
                    selectedContract.optionType === 'CE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  )}
                >
                  {selectedContract.optionType === 'CE' ? 'CALL OPTION (CE)' : 'PUT OPTION (PE)'}
                </span>
                <span className="text-xs text-muted-foreground font-mono">{selectedContract.moneyness}</span>
              </div>
              <h3 className="text-xl font-extrabold text-white mt-1">{selectedContract.id}</h3>
              <p className="text-xs text-muted-foreground font-mono">
                Strike: {selectedContract.strikePrice} • Expiry: {selectedContract.expiryDate} • Lot Size: {selectedContract.lotSize}
              </p>
            </div>

            {/* Greeks Bar */}
            <div className="flex items-center gap-3 bg-black/40 border border-white/10 p-3 rounded-xl text-xs font-mono">
              <div>
                <span className="text-[10px] text-muted-foreground">Delta (Δ)</span>
                <p className="font-bold text-white">{selectedContract.delta ?? 0.52}</p>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div>
                <span className="text-[10px] text-muted-foreground">Gamma (Γ)</span>
                <p className="font-bold text-white">{selectedContract.gamma ?? 0.003}</p>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div>
                <span className="text-[10px] text-muted-foreground">Theta (Θ)</span>
                <p className="font-bold text-rose-400">{selectedContract.theta ?? -12.4}</p>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div>
                <span className="text-[10px] text-muted-foreground">Vega (ν)</span>
                <p className="font-bold text-cyan-400">{selectedContract.vega ?? 8.5}</p>
              </div>
            </div>
          </div>

          {/* Order Placement Form */}
          <form onSubmit={handlePlaceOrder} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Side</label>
                <div className="grid grid-cols-2 gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => setOrderSide('BUY')}
                    className={cn('py-1.5 rounded text-xs font-bold', orderSide === 'BUY' ? 'bg-emerald-500 text-black' : 'text-muted-foreground')}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderSide('SELL')}
                    className={cn('py-1.5 rounded text-xs font-bold', orderSide === 'SELL' ? 'bg-rose-500 text-white' : 'text-muted-foreground')}
                  >
                    SELL
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Entry Price (Limit)</label>
                <input
                  type="number"
                  step="0.05"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Target Price</label>
                <input
                  type="number"
                  step="0.05"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-emerald-400 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">Stop Loss</label>
                <input
                  type="number"
                  step="0.05"
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-rose-400 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {orderSuccessMsg && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{orderSuccessMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground font-mono">
                Total Margin: {currencyMode === 'INR' ? '₹' : '$'}{(entryPrice * orderQty * selectedContract.lotSize).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>

              <button
                type="submit"
                disabled={orderSubmitting}
                className="px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50"
              >
                {orderSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                <span>Execute Option Trade</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
