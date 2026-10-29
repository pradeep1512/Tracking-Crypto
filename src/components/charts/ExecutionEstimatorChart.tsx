'use client';

import { useMemo } from 'react';
import type { OrderBook, Side } from '@/types';
import { orderBookService } from '@/services/OrderBookService';
import { formatCurrency, formatPercent } from '@/lib/utils/api';

interface ExecutionEstimatorChartProps {
  orderBook: OrderBook | null;
  side: Side;
  baseQuantity: number;
  limitPrice?: number;
  currency: string;
}

export function ExecutionEstimatorChart({
  orderBook,
  side,
  baseQuantity,
  limitPrice,
  currency,
}: ExecutionEstimatorChartProps) {
  // Generate multi-size simulation curve (0.2x, 0.5x, 1x, 2x, 5x, 10x quantity)
  const curvePoints = useMemo(() => {
    if (!orderBook) return [];

    const multipliers = [0.2, 0.5, 0.8, 1.0, 1.5, 2.0, 3.0, 5.0];
    return multipliers.map((m) => {
      const q = Math.max(0.001, parseFloat((baseQuantity * m).toFixed(4)));
      const vwap = orderBookService.calculateDetailedVWAP(orderBook, side, q);
      return {
        multiplier: m,
        quantity: q,
        estimatedPrice: vwap.estimatedVWAP,
        slippagePct: vwap.slippagePercentage,
        wouldFill: vwap.wouldFullyFill,
      };
    });
  }, [orderBook, side, baseQuantity]);

  if (!orderBook || curvePoints.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-xs text-muted-foreground">
        Awaiting live order book depth to render slippage impact curve...
      </div>
    );
  }

  const maxSlippage = Math.max(...curvePoints.map((p) => p.slippagePct), 0.1);
  const bestPrice = side === 'BUY' ? orderBook.asks[0]?.price ?? 0 : orderBook.bids[0]?.price ?? 0;

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-sm font-bold text-white">Slippage vs Order Size Curve</h4>
          <p className="text-[11px] text-muted-foreground">
            Non-linear market impact as order quantity consumes available book liquidity
          </p>
        </div>

        <div className="text-right text-xs font-mono">
          <span className="text-muted-foreground">Best Market {side === 'BUY' ? 'Ask' : 'Bid'}: </span>
          <span className="text-white font-semibold">{formatCurrency(bestPrice, currency)}</span>
        </div>
      </div>

      {/* Slippage Bars Visualizer */}
      <div className="space-y-2 pt-2">
        {curvePoints.map((pt) => {
          const isBase = Math.abs(pt.multiplier - 1.0) < 0.05;
          const barWidth = Math.min(100, Math.max(4, (pt.slippagePct / maxSlippage) * 100));

          return (
            <div
              key={pt.multiplier}
              className={`p-2 rounded-lg transition-all text-xs font-mono ${
                isBase
                  ? 'bg-cyan-500/10 border border-cyan-500/30 ring-1 ring-cyan-500/40'
                  : 'bg-white/3 hover:bg-white/5 border border-white/5'
              }`}
            >
              <div className="flex justify-between items-center mb-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className={isBase ? 'text-cyan-300 font-bold' : 'text-white'}>
                    {pt.quantity} {orderBook.symbol.replace(/USDT|INR/g, '')}
                  </span>
                  <span className="text-muted-foreground text-[10px]">
                    ({pt.multiplier}x size)
                  </span>
                  {isBase && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-400 text-black font-bold">
                      YOUR ORDER
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">
                    Avg: {formatCurrency(pt.estimatedPrice, currency)}
                  </span>
                  <span
                    className={`font-bold ${
                      pt.slippagePct > 0.2
                        ? 'text-rose-400'
                        : pt.slippagePct > 0.05
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    +{pt.slippagePct.toFixed(4)}% slip
                  </span>
                </div>
              </div>

              {/* Progress slippage bar */}
              <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  style={{ width: `${barWidth}%` }}
                  className={`h-full rounded-full transition-all ${
                    pt.slippagePct > 0.2
                      ? 'bg-rose-500'
                      : pt.slippagePct > 0.05
                      ? 'bg-amber-400'
                      : 'bg-cyan-400'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {limitPrice !== undefined && limitPrice > 0 && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-300">
            <span className="font-semibold">Price Protection Limit Active:</span>
            <span>Order execution capped strictly at {formatCurrency(limitPrice, currency)}</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
            GUARANTEED CEILING
          </span>
        </div>
      )}
    </div>
  );
}
