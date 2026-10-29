'use client';

import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  Clock,
  Wallet,
  Layers,
  ArrowRight,
  TrendingUp,
  XCircle,
  RefreshCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/utils/api';
import { ExecutionEstimatorChart } from '@/components/charts/ExecutionEstimatorChart';
import type { OrderBook, Side, OrderType, OrderStatus } from '@/types';
import type { PaperOrder, PaperPortfolio } from '@/services/PaperTradingService';

const ORDER_TYPES: { type: OrderType; label: string; desc: string }[] = [
  { type: 'MARKET', label: 'Market', desc: 'Fills immediately at best available book depth' },
  { type: 'LIMIT', label: 'Limit', desc: 'Guaranteed price protection; will never fill worse than limit' },
  { type: 'POST_ONLY', label: 'Post-Only', desc: 'Provides liquidity as maker; rejected if it would cross spread' },
  { type: 'IOC', label: 'IOC', desc: 'Immediate-or-Cancel; fills what is available now, cancels rest' },
  { type: 'FOK', label: 'FOK', desc: 'Fill-or-Kill; fills 100% immediately or cancels completely' },
];

const SYMBOL_OPTIONS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', currency: 'USDT' },
  { symbol: 'ETHUSDT', name: 'Ethereum', currency: 'USDT' },
  { symbol: 'SOLUSDT', name: 'Solana', currency: 'USDT' },
  { symbol: 'BNBUSDT', name: 'BNB', currency: 'USDT' },
  { symbol: 'BTCINR', name: 'Bitcoin (INR)', currency: 'INR' },
  { symbol: 'ETHINR', name: 'Ethereum (INR)', currency: 'INR' },
];

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'portfolio'>('simulator');
  const [exchangeId, setExchangeId] = useState<'binance' | 'mock'>('binance');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [side, setSide] = useState<Side>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('LIMIT');
  const [quantity, setQuantity] = useState('0.25');
  const [limitPrice, setLimitPrice] = useState('');

  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [simulationResult, setSimulationResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Portfolio & orders
  const [portfolio, setPortfolio] = useState<PaperPortfolio | null>(null);
  const [orders, setOrders] = useState<PaperOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const currentMeta = SYMBOL_OPTIONS.find((s) => s.symbol === symbol) ?? SYMBOL_OPTIONS[0];

  // Fetch live orderbook and portfolio on symbol or exchange change
  const refreshOrderBook = async () => {
    try {
      const res = await fetch(`/api/market/orderbook?exchange=${exchangeId}&symbol=${symbol}&depth=25`);
      const json = await res.json();
      if (json.success) {
        setOrderBook(json.data);
        // Pre-fill limit price with current best ask/bid if empty
        if (!limitPrice) {
          const defaultPrice =
            side === 'BUY'
              ? json.data.asks[0]?.price?.toString()
              : json.data.bids[0]?.price?.toString();
          if (defaultPrice) setLimitPrice(defaultPrice);
        }
      }
    } catch {
      // ignore
    }
  };

  const loadPortfolioAndOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch('/api/orders');
      const json = await res.json();
      if (json.success) {
        setOrders(json.data.orders);
        setPortfolio(json.data.portfolio);
      }
    } catch {
      // ignore
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    refreshOrderBook();
  }, [symbol, exchangeId, side]);

  useEffect(() => {
    loadPortfolioAndOrders();
  }, []);

  // Simulate order
  const handleSimulate = async () => {
    setError('');
    setExecutionMessage(null);
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      setError('Please enter a valid quantity.');
      return;
    }
    if (orderType !== 'MARKET' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      setError('Limit price is required for this order type.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/orders/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchangeId,
          tradingPairId: symbol,
          symbol,
          side,
          orderType,
          quantity: qty,
          limitPrice: limitPrice ? parseFloat(limitPrice) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSimulationResult(data.data);
      } else {
        setError(data.error);
      }
    } catch {
      setError('Simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  // Place simulated paper order
  const handleExecutePaperTrade = async () => {
    setError('');
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      setError('Please enter a valid quantity.');
      return;
    }

    setExecuting(true);
    try {
      const res = await fetch('/api/orders/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          exchangeId,
          side,
          orderType,
          quantity: qty,
          limitPrice: limitPrice ? parseFloat(limitPrice) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExecutionMessage(data.data.message);
        loadPortfolioAndOrders();
        // Switch to portfolio tab to show the new trade
        setTimeout(() => setActiveTab('portfolio'), 1200);
      } else {
        setError(data.error);
      }
    } catch {
      setError('Failed to submit paper order.');
    } finally {
      setExecuting(false);
    }
  };

  // Cancel order
  const handleCancelOrder = async (orderId: string) => {
    try {
      const res = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json();
      if (json.success) {
        loadPortfolioAndOrders();
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Execution Estimator & Paper Trading</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Phase 5 Simulator
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Simulate realistic order-book depth fills, test slippage curves, and manage simulated paper trades with price protection.
          </p>
        </div>

        {/* Tab Switcher & Exchange */}
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                activeTab === 'simulator'
                  ? 'bg-cyan-500 text-black font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              Order Simulator
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                activeTab === 'portfolio'
                  ? 'bg-cyan-500 text-black font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              Portfolio & Orders ({orders.length})
            </button>
          </div>
        </div>
      </div>

      {/* Virtual Portfolio Quick Bar */}
      {portfolio && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-card p-3 space-y-0.5">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-cyan-400" />
              Paper Cash (USDT)
            </span>
            <p className="text-base font-bold font-mono text-white">
              ${portfolio.cashBalanceUSDT.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="glass-card p-3 space-y-0.5">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              Paper Cash (INR)
            </span>
            <p className="text-base font-bold font-mono text-emerald-300">
              ₹{portfolio.cashBalanceINR.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="glass-card p-3 space-y-0.5">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Crypto Holdings
            </span>
            <p className="text-xs font-mono text-white truncate">
              {Object.entries(portfolio.holdings)
                .map(([k, v]) => `${v.toFixed(2)} ${k}`)
                .join(' • ')}
            </p>
          </div>

          <div className="glass-card p-3 space-y-0.5">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Simulated Trades
            </span>
            <p className="text-base font-bold font-mono text-cyan-300">
              {portfolio.totalTrades} Executed
            </p>
          </div>
        </div>
      )}

      {/* Main Tabs */}
      {activeTab === 'simulator' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Configuration Box */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-cyan-400" />
                Configure Paper Order
              </h2>

              <div className="flex bg-white/5 p-0.5 rounded border border-white/10 text-[10px]">
                <button
                  onClick={() => setExchangeId('binance')}
                  className={`px-2 py-0.5 rounded ${
                    exchangeId === 'binance' ? 'bg-cyan-500 text-black font-bold' : 'text-muted-foreground'
                  }`}
                >
                  Binance
                </button>
                <button
                  onClick={() => setExchangeId('mock')}
                  className={`px-2 py-0.5 rounded ${
                    exchangeId === 'mock' ? 'bg-amber-500 text-black font-bold' : 'text-muted-foreground'
                  }`}
                >
                  Mock
                </button>
              </div>
            </div>

            {/* Symbol & Side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Trading Pair</label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:ring-1 focus:ring-cyan-400"
                >
                  {SYMBOL_OPTIONS.map((s) => (
                    <option key={s.symbol} value={s.symbol} className="bg-gray-900 text-white">
                      {s.symbol} ({s.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Trade Direction</label>
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
            </div>

            {/* Order Types Selector */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Order Type</label>
              <div className="grid grid-cols-5 gap-1.5">
                {ORDER_TYPES.map((t) => (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => setOrderType(t.type)}
                    className={`py-1.5 px-2 rounded text-xs font-medium border text-center transition-all ${
                      orderType === t.type
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                        : 'bg-white/3 text-muted-foreground border-white/5 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {ORDER_TYPES.find((t) => t.type === orderType)?.desc}
              </p>
            </div>

            {/* Quantity and Limit Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Quantity</label>
                <input
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0.25"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-xs focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Limit Price ({currentMeta.currency})
                </label>
                <input
                  type="number"
                  step="any"
                  disabled={orderType === 'MARKET'}
                  value={orderType === 'MARKET' ? '' : limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder={orderType === 'MARKET' ? 'Market price' : 'e.g. 80100'}
                  className={`w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono text-xs focus:ring-1 focus:ring-cyan-400 ${
                    orderType === 'MARKET' ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                />
              </div>
            </div>

            {/* Price Protection Guarantee Banner */}
            {side === 'BUY' && orderType !== 'MARKET' && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong className="text-white">Price Protection:</strong> Your limit price will act as a strict ceiling. The system will never execute your buy order above this price.
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {error}
              </div>
            )}

            {executionMessage && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {executionMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleSimulate}
                disabled={loading}
                className="py-2.5 px-4 rounded-lg text-xs font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-all"
              >
                {loading ? 'Evaluating...' : 'Simulate Fill Details'}
              </button>

              <button
                type="button"
                onClick={handleExecutePaperTrade}
                disabled={executing}
                className="py-2.5 px-4 rounded-lg text-xs font-bold text-black transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: 'linear-gradient(135deg, hsl(160, 84%, 48%), hsl(199, 89%, 48%))' }}
              >
                {executing ? 'Executing Paper Trade...' : 'Execute Paper Order'}
              </button>
            </div>
          </div>

          {/* Right Column: Simulation Result & Slippage Curve */}
          <div className="space-y-4">
            {simulationResult ? (
              <div className="glass-card p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {Boolean(simulationResult.wouldFill) ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <h3 className="text-sm font-bold text-white">
                      {Boolean(simulationResult.wouldFill) ? 'Order Fillable' : 'Partial / Liquidity Warning'}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20">
                    PAPER SIMULATION
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded bg-white/3 border border-white/5">
                    <span className="text-[10px] text-muted-foreground block font-sans">Estimated VWAP</span>
                    <span className="text-white font-bold text-sm">
                      {formatCurrency(Number(simulationResult.estimatedPrice), currentMeta.currency)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-white/3 border border-white/5">
                    <span className="text-[10px] text-muted-foreground block font-sans">Total Cost</span>
                    <span className="text-cyan-300 font-bold text-sm">
                      {formatCurrency(Number(simulationResult.estimatedTotal), currentMeta.currency)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-white/3 border border-white/5">
                    <span className="text-[10px] text-muted-foreground block font-sans">Slippage Impact</span>
                    <span className="text-amber-300 font-semibold">
                      +{Number(simulationResult.slippagePercentage).toFixed(4)}%
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-white/3 border border-white/5">
                    <span className="text-[10px] text-muted-foreground block font-sans">Estimated Fee</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(Number(simulationResult.estimatedFee), currentMeta.currency)}
                    </span>
                  </div>
                </div>

                {Boolean(simulationResult.liquidityWarning) && (
                  <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                    ⚠ {String(simulationResult.liquidityWarning)}
                  </div>
                )}
              </div>
            ) : null}

            {/* Slippage Curve Chart */}
            <ExecutionEstimatorChart
              orderBook={orderBook}
              side={side}
              baseQuantity={parseFloat(quantity) || 0.1}
              limitPrice={limitPrice ? parseFloat(limitPrice) : undefined}
              currency={currentMeta.currency}
            />
          </div>
        </div>
      ) : (
        /* Portfolio & Order History Tab */
        <div className="glass-card p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Paper Order History & Active Orders
              </h3>
              <p className="text-xs text-muted-foreground">
                All simulated paper trades with fill reconciliations and cancellation controls
              </p>
            </div>

            <button
              onClick={loadPortfolioAndOrders}
              disabled={ordersLoading}
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white text-xs flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead>
                <tr className="text-muted-foreground border-b border-white/10">
                  <th className="py-2.5 px-3 font-sans font-medium">Time</th>
                  <th className="py-2.5 px-3 font-sans font-medium">Symbol</th>
                  <th className="py-2.5 px-3 font-sans font-medium">Side</th>
                  <th className="py-2.5 px-3 font-sans font-medium">Type</th>
                  <th className="py-2.5 px-3 font-sans font-medium">Qty</th>
                  <th className="py-2.5 px-3 font-sans font-medium">Limit Price</th>
                  <th className="py-2.5 px-3 font-sans font-medium">Avg Execution</th>
                  <th className="py-2.5 px-3 font-sans font-medium">Status</th>
                  <th className="py-2.5 px-3 font-sans font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {new Date(o.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">{o.symbol}</td>
                    <td className="py-2.5 px-3">
                      <span className={o.side === 'BUY' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {o.side}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">{o.orderType}</td>
                    <td className="py-2.5 px-3 text-white">
                      {o.filledQuantity} / {o.requestedQuantity}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {o.limitPrice ? o.limitPrice.toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-cyan-300 font-semibold">
                      {o.averageExecutionPrice ? o.averageExecutionPrice.toLocaleString() : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          o.status === 'FILLED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : o.status === 'OPEN'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : o.status === 'PARTIALLY_FILLED'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {o.status === 'OPEN' ? (
                        <button
                          onClick={() => handleCancelOrder(o.id)}
                          className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] transition-all flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          Cancel
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
