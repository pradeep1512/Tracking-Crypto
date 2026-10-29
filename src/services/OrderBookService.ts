/**
 * OrderBookService — Order book normalization, depth analysis, and VWAP engine.
 *
 * Implements:
 * - Cross-exchange order book normalization
 * - Volume-Weighted Average Price (VWAP) depth consumption
 * - Order book depth liquidity analytics (0.5%, 1%, 2% depth bands)
 * - Order book order imbalance metric (Bids vs Asks pressure)
 */

import type { OrderBook, OrderBookLevel, Side } from '@/types';

export interface VWAPStep {
  levelIndex: number;
  price: number;
  quantityFilled: number;
  levelQuantity: number;
  cumulativeFilled: number;
  cumulativeCost: number;
  effectiveVWAP: number;
}

export interface DetailedVWAPResult {
  estimatedVWAP: number;
  requestedQuantity: number;
  fillableQuantity: number;
  unfilledQuantity: number;
  totalCost: number;
  bestPrice: number;
  slippageAmount: number;
  slippagePercentage: number;
  steps: VWAPStep[];
  wouldFullyFill: boolean;
}

export interface OrderBookAnalytics {
  midPrice: number;
  spread: number;
  spreadPercentage: number;
  totalBidVolume: number;
  totalAskVolume: number;
  imbalanceRatio: number; // -1 (pure ask dominance) to +1 (pure bid dominance)
  depthBands: {
    withinHalfPercent: { bidVolume: number; askVolume: number };
    withinOnePercent: { bidVolume: number; askVolume: number };
    withinTwoPercent: { bidVolume: number; askVolume: number };
  };
}

export class OrderBookService {
  /**
   * Normalizes raw order book levels into unified schema with cumulative depth percentages.
   */
  normalize(
    exchangeId: string,
    symbol: string,
    rawBids: [number, number][],
    rawAsks: [number, number][],
    timestamp: Date = new Date()
  ): OrderBook {
    let bidTotal = 0;
    const bids: OrderBookLevel[] = rawBids
      .sort((a, b) => b[0] - a[0])
      .map(([price, quantity]) => {
        bidTotal += quantity;
        return { price, quantity, total: bidTotal, depthPercentage: 0 };
      });

    let askTotal = 0;
    const asks: OrderBookLevel[] = rawAsks
      .sort((a, b) => a[0] - b[0])
      .map(([price, quantity]) => {
        askTotal += quantity;
        return { price, quantity, total: askTotal, depthPercentage: 0 };
      });

    const maxTotal = Math.max(bidTotal, askTotal) || 1;
    bids.forEach((b) => (b.depthPercentage = (b.total / maxTotal) * 100));
    asks.forEach((a) => (a.depthPercentage = (a.total / maxTotal) * 100));

    return {
      exchangeId,
      symbol: symbol.toUpperCase(),
      bids,
      asks,
      timestamp,
      receivedAt: new Date(),
      dataAgeMs: 0,
    };
  }

  /**
   * Computes comprehensive VWAP execution steps through the order book.
   */
  calculateDetailedVWAP(
    orderBook: OrderBook,
    side: Side,
    quantity: number
  ): DetailedVWAPResult {
    const levels =
      side === 'BUY'
        ? [...orderBook.asks].sort((a, b) => a.price - b.price)
        : [...orderBook.bids].sort((a, b) => b.price - a.price);

    const bestPrice = levels[0]?.price ?? 0;
    let remaining = quantity;
    let cumulativeCost = 0;
    let cumulativeFilled = 0;
    const steps: VWAPStep[] = [];

    for (let i = 0; i < levels.length; i++) {
      if (remaining <= 0) break;
      const level = levels[i];
      const fillQty = Math.min(remaining, level.quantity);

      cumulativeCost += fillQty * level.price;
      cumulativeFilled += fillQty;
      remaining -= fillQty;

      steps.push({
        levelIndex: i + 1,
        price: level.price,
        quantityFilled: fillQty,
        levelQuantity: level.quantity,
        cumulativeFilled,
        cumulativeCost,
        effectiveVWAP: cumulativeCost / cumulativeFilled,
      });
    }

    const estimatedVWAP = cumulativeFilled > 0 ? cumulativeCost / cumulativeFilled : bestPrice;
    const slippageAmount = Math.abs(estimatedVWAP - bestPrice);
    const slippagePercentage = bestPrice > 0 ? (slippageAmount / bestPrice) * 100 : 0;

    return {
      estimatedVWAP,
      requestedQuantity: quantity,
      fillableQuantity: cumulativeFilled,
      unfilledQuantity: Math.max(0, remaining),
      totalCost: cumulativeCost,
      bestPrice,
      slippageAmount,
      slippagePercentage,
      steps,
      wouldFullyFill: remaining <= 0,
    };
  }

  /**
   * Evaluates liquidity depth bands and order book imbalance.
   */
  analyzeLiquidity(orderBook: OrderBook): OrderBookAnalytics {
    const bestBid = orderBook.bids[0]?.price ?? 0;
    const bestAsk = orderBook.asks[0]?.price ?? 0;
    const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestBid || bestAsk || 1;
    const spread = bestAsk > bestBid ? bestAsk - bestBid : 0;
    const spreadPercentage = midPrice > 0 ? (spread / midPrice) * 100 : 0;

    let totalBidVolume = 0;
    let totalAskVolume = 0;

    const depthBands = {
      withinHalfPercent: { bidVolume: 0, askVolume: 0 },
      withinOnePercent: { bidVolume: 0, askVolume: 0 },
      withinTwoPercent: { bidVolume: 0, askVolume: 0 },
    };

    orderBook.bids.forEach((b) => {
      totalBidVolume += b.quantity;
      const diffPct = Math.abs(midPrice - b.price) / midPrice;
      if (diffPct <= 0.005) depthBands.withinHalfPercent.bidVolume += b.quantity;
      if (diffPct <= 0.01) depthBands.withinOnePercent.bidVolume += b.quantity;
      if (diffPct <= 0.02) depthBands.withinTwoPercent.bidVolume += b.quantity;
    });

    orderBook.asks.forEach((a) => {
      totalAskVolume += a.quantity;
      const diffPct = Math.abs(a.price - midPrice) / midPrice;
      if (diffPct <= 0.005) depthBands.withinHalfPercent.askVolume += a.quantity;
      if (diffPct <= 0.01) depthBands.withinOnePercent.askVolume += a.quantity;
      if (diffPct <= 0.02) depthBands.withinTwoPercent.askVolume += a.quantity;
    });

    const totalVol = totalBidVolume + totalAskVolume;
    const imbalanceRatio = totalVol > 0 ? (totalBidVolume - totalAskVolume) / totalVol : 0;

    return {
      midPrice,
      spread,
      spreadPercentage,
      totalBidVolume,
      totalAskVolume,
      imbalanceRatio,
      depthBands,
    };
  }
}

export const orderBookService = new OrderBookService();
