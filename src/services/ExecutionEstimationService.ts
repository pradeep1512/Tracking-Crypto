/**
 * ExecutionEstimationService
 *
 * Estimates order execution details from order book depth.
 * Simulates paper trading order outcomes without touching real exchange.
 */

import type { OrderBook, Side, OrderType, ExecutionEstimate } from '@/types';
import { PriceGapDetectionService } from './PriceGapDetectionService';

const DEFAULT_FEE_PCT = 0.1; // 0.1% taker fee

export class ExecutionEstimationService {
  private gapService = new PriceGapDetectionService();

  /**
   * Estimate execution for a given order against current order book.
   */
  estimate(params: {
    orderBook: OrderBook;
    side: Side;
    orderType: OrderType;
    quantity: number;
    limitPrice?: number;
    feePct?: number;
  }): ExecutionEstimate {
    const { orderBook, side, orderType, quantity, limitPrice, feePct = DEFAULT_FEE_PCT } = params;

    // Filter order book levels by limit price
    let levels =
      side === 'BUY'
        ? [...orderBook.asks].sort((a, b) => a.price - b.price)
        : [...orderBook.bids].sort((a, b) => b.price - a.price);

    if (limitPrice !== undefined) {
      levels =
        side === 'BUY'
          ? levels.filter((l) => l.price <= limitPrice)
          : levels.filter((l) => l.price >= limitPrice);
    }

    // For POST_ONLY: only fill if price is at or better than best bid/ask
    if (orderType === 'POST_ONLY') {
      const bestBid = orderBook.bids[0]?.price ?? 0;
      const bestAsk = orderBook.asks[0]?.price ?? Infinity;

      if (side === 'BUY' && limitPrice !== undefined && limitPrice >= bestAsk) {
        return this.unfillableEstimate(orderBook, side, quantity, limitPrice, feePct,
          'POST_ONLY order would cross the spread and be rejected by the exchange.');
      }
      if (side === 'SELL' && limitPrice !== undefined && limitPrice <= bestBid) {
        return this.unfillableEstimate(orderBook, side, quantity, limitPrice, feePct,
          'POST_ONLY order would cross the spread and be rejected by the exchange.');
      }
    }

    // VWAP calculation
    const vwap = this.gapService.calculateVWAP(orderBook, side, quantity);

    if (vwap.fillableQuantity === 0) {
      return this.unfillableEstimate(orderBook, side, quantity, limitPrice, feePct,
        'No matching orders available in the order book at the current price.');
    }

    const fillableQty = Math.min(quantity, vwap.fillableQuantity);
    const estimatedPrice = vwap.estimatedPrice;
    const estimatedTotal = fillableQty * estimatedPrice;
    const estimatedFee = estimatedTotal * (feePct / 100);

    // Slippage vs best price
    const bestPrice =
      side === 'BUY'
        ? orderBook.asks[0]?.price ?? estimatedPrice
        : orderBook.bids[0]?.price ?? estimatedPrice;
    const slippage = estimatedPrice - bestPrice;
    const slippagePct = bestPrice > 0 ? (slippage / bestPrice) * 100 : 0;

    let liquidityWarning: string | undefined;
    if (vwap.remainingQuantity > 0) {
      liquidityWarning = `Only ${fillableQty.toFixed(6)} of ${quantity} can be filled. Remaining ${vwap.remainingQuantity.toFixed(6)} would be left unfilled or partially queued.`;
    } else if (Math.abs(slippagePct) > 0.5) {
      liquidityWarning = `High market impact: estimated slippage of ${Math.abs(slippagePct).toFixed(3)}%. Consider splitting the order.`;
    }

    return {
      symbol: orderBook.symbol,
      side,
      requestedQuantity: quantity,
      limitPrice,
      estimatedPrice,
      estimatedTotal: side === 'BUY' ? estimatedTotal + estimatedFee : estimatedTotal - estimatedFee,
      estimatedFee,
      estimatedFeePercentage: feePct,
      slippage: Math.abs(slippage),
      slippagePercentage: Math.abs(slippagePct),
      fillableQuantity: fillableQty,
      unfilledQuantity: vwap.remainingQuantity,
      wouldFill: vwap.remainingQuantity === 0,
      liquidityWarning,
      orderBookDepthUsed: vwap.levels.map((l) => ({
        price: l.price,
        quantity: l.qty,
        total: l.price * l.qty,
        depthPercentage: 0,
      })),
      timestamp: new Date(),
    };
  }

  private unfillableEstimate(
    orderBook: OrderBook,
    side: Side,
    quantity: number,
    limitPrice: number | undefined,
    feePct: number,
    reason: string
  ): ExecutionEstimate {
    const bestPrice =
      side === 'BUY'
        ? orderBook.asks[0]?.price ?? 0
        : orderBook.bids[0]?.price ?? 0;

    return {
      symbol: orderBook.symbol,
      side,
      requestedQuantity: quantity,
      limitPrice,
      estimatedPrice: bestPrice,
      estimatedTotal: 0,
      estimatedFee: 0,
      estimatedFeePercentage: feePct,
      slippage: 0,
      slippagePercentage: 0,
      fillableQuantity: 0,
      unfilledQuantity: quantity,
      wouldFill: false,
      liquidityWarning: reason,
      orderBookDepthUsed: [],
      timestamp: new Date(),
    };
  }
}

export const executionEstimationService = new ExecutionEstimationService();
