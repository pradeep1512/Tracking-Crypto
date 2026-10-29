/**
 * PriceGapDetectionService
 *
 * Compares reference price vs market price vs estimated execution price
 * and classifies the reason for the gap.
 *
 * Does NOT assume every gap is caused by technical latency.
 * Distinguishes: spread, market movement, liquidity, fees, stale data, slippage.
 */

import type {
  OrderBook,
  Ticker,
  PriceGapAnalysis,
  Side,
  GapClassification,
} from '@/types';

export interface PriceGapInput {
  side: Side;
  referencePrice: number;       // seller's quoted or user's target price
  ticker: Ticker;               // current market data
  orderBook?: OrderBook;        // current order book
  quantity?: number;            // requested trade quantity
  feePct?: number;              // exchange fee percentage (e.g. 0.1 for 0.1%)
  tolerancePercentage?: number; // user's max acceptable gap %
  staleThresholdMs?: number;    // ms before data is considered stale
}

export interface VWAPResult {
  estimatedPrice: number;
  fillableQuantity: number;
  remainingQuantity: number;
  levels: Array<{ price: number; qty: number }>;
}

export class PriceGapDetectionService {
  private readonly DEFAULT_FEE_PCT = 0.1;        // 0.1% maker/taker default
  private readonly STALE_THRESHOLD_MS = 5000;    // 5 seconds

  /**
   * Analyze the price gap given reference price and current market conditions.
   */
  analyze(input: PriceGapInput): PriceGapAnalysis {
    const {
      side,
      referencePrice,
      ticker,
      orderBook,
      quantity,
      feePct = this.DEFAULT_FEE_PCT,
      tolerancePercentage,
      staleThresholdMs = this.STALE_THRESHOLD_MS,
    } = input;

    // Market-facing price for this side:
    // BUY → we pay the ask; SELL → we receive the bid
    const observedPrice = side === 'BUY' ? ticker.bestAsk : ticker.bestBid;

    // Estimate execution price (VWAP if order book available, else best bid/ask)
    let estimatedExecutionPrice = observedPrice;
    let vwapResult: VWAPResult | null = null;

    if (orderBook && quantity) {
      vwapResult = this.calculateVWAP(orderBook, side, quantity);
      estimatedExecutionPrice = vwapResult.estimatedPrice;
    }

    // Apply fee to estimated execution
    const feeMultiplier = side === 'BUY'
      ? 1 + feePct / 100
      : 1 - feePct / 100;
    estimatedExecutionPrice = estimatedExecutionPrice * feeMultiplier;

    // Calculate gap from reference price
    const gapAmount = estimatedExecutionPrice - referencePrice;
    const gapPercentage = (gapAmount / referencePrice) * 100;

    // Additional cost for BUY orders
    const additionalCost =
      side === 'BUY' && quantity
        ? Math.max(0, gapAmount) * quantity
        : undefined;

    // Tolerance check
    const isWithinTolerance =
      tolerancePercentage !== undefined
        ? Math.abs(gapPercentage) <= tolerancePercentage
        : true;

    // Data age
    const dataAgeMs = ticker.dataAgeMs;

    // Classify the gap
    const { classification, details } = this.classifyGap({
      side,
      referencePrice,
      observedPrice,
      estimatedExecutionPrice,
      spread: ticker.spread,
      spreadPercentage: ticker.spreadPercentage,
      gapPercentage,
      dataAgeMs,
      staleThresholdMs,
      feePct,
      quantity,
      vwapResult,
    });

    return {
      referencePrice,
      observedPrice,
      estimatedExecutionPrice,
      gapAmount,
      gapPercentage,
      additionalCost,
      side,
      quantity,
      dataAgeMs,
      classification,
      classificationDetails: details,
      isWithinTolerance,
      tolerancePercentage,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate volume-weighted average price from order book levels.
   * For BUY: consumes asks from lowest to highest.
   * For SELL: consumes bids from highest to lowest.
   */
  calculateVWAP(orderBook: OrderBook, side: Side, quantity: number): VWAPResult {
    const levels =
      side === 'BUY'
        ? [...orderBook.asks].sort((a, b) => a.price - b.price)
        : [...orderBook.bids].sort((a, b) => b.price - a.price);

    let remaining = quantity;
    let totalCost = 0;
    const usedLevels: Array<{ price: number; qty: number }> = [];

    for (const level of levels) {
      if (remaining <= 0) break;
      const fillQty = Math.min(remaining, level.quantity);
      totalCost += fillQty * level.price;
      usedLevels.push({ price: level.price, qty: fillQty });
      remaining -= fillQty;
    }

    const filledQty = quantity - remaining;
    const estimatedPrice = filledQty > 0 ? totalCost / filledQty : levels[0]?.price ?? 0;

    return {
      estimatedPrice,
      fillableQuantity: filledQty,
      remainingQuantity: remaining,
      levels: usedLevels,
    };
  }

  /**
   * Classify the primary reason for the price gap.
   */
  private classifyGap(params: {
    side: Side;
    referencePrice: number;
    observedPrice: number;
    estimatedExecutionPrice: number;
    spread: number;
    spreadPercentage: number;
    gapPercentage: number;
    dataAgeMs: number;
    staleThresholdMs: number;
    feePct: number;
    quantity?: number;
    vwapResult: VWAPResult | null;
  }): { classification: GapClassification; details: string } {
    const {
      side,
      referencePrice,
      observedPrice,
      gapPercentage,
      spreadPercentage,
      dataAgeMs,
      staleThresholdMs,
      feePct,
      vwapResult,
    } = params;

    const absGapPct = Math.abs(gapPercentage);

    // 1. Stale data: data is older than threshold
    if (dataAgeMs > staleThresholdMs) {
      return {
        classification: 'STALE_DATA',
        details: `Market data is ${dataAgeMs}ms old (threshold: ${staleThresholdMs}ms). The displayed price may not reflect current market conditions.`,
      };
    }

    // 2. Gap is almost entirely explained by the spread
    const spreadContribution = spreadPercentage;
    if (absGapPct <= spreadContribution * 1.2) {
      return {
        classification: 'SPREAD',
        details: `The gap (${absGapPct.toFixed(4)}%) is consistent with the current bid-ask spread (${spreadPercentage.toFixed(4)}%). This is normal market cost of crossing the spread.`,
      };
    }

    // 3. Gap is almost entirely explained by fees
    const feeContribution = feePct;
    if (absGapPct > 0 && Math.abs(absGapPct - feeContribution) < 0.05) {
      return {
        classification: 'FEES',
        details: `The gap is consistent with the exchange fee (${feePct}%). Consider using maker (post-only) orders to reduce fees.`,
      };
    }

    // 4. Insufficient liquidity — order would not fully fill or heavy slippage
    if (vwapResult && vwapResult.remainingQuantity > 0) {
      return {
        classification: 'LIQUIDITY',
        details: `Insufficient order book depth. Only ${vwapResult.fillableQuantity.toFixed(6)} of requested quantity can be filled at current market depth.`,
      };
    }

    // 5. VWAP significantly higher than best price → slippage
    if (vwapResult) {
      const slippagePct =
        ((vwapResult.estimatedPrice - observedPrice) / observedPrice) * 100;
      if (Math.abs(slippagePct) > 0.1) {
        return {
          classification: 'SLIPPAGE',
          details: `Market impact slippage of ${slippagePct.toFixed(4)}% estimated from ${vwapResult.levels.length} order-book levels. Consider splitting the order.`,
        };
      }
    }

    // 6. Market moved significantly vs reference
    const marketMovement = ((observedPrice - referencePrice) / referencePrice) * 100;
    if (Math.abs(marketMovement) > 0.2) {
      const dir = marketMovement > 0 ? 'risen' : 'fallen';
      return {
        classification: 'MARKET_MOVEMENT',
        details: `Market has ${dir} ${Math.abs(marketMovement).toFixed(4)}% since the reference price was set. This is normal price volatility, not a platform delay.`,
      };
    }

    // 7. Mixed / Unknown
    if (absGapPct > 0.5) {
      return {
        classification: 'MIXED',
        details: `Gap of ${absGapPct.toFixed(4)}% likely results from a combination of spread, fees, and recent market movement.`,
      };
    }

    return {
      classification: 'UNKNOWN',
      details: `Gap of ${absGapPct.toFixed(4)}% detected. Insufficient data to determine the primary cause.`,
    };
  }
}

export const priceGapService = new PriceGapDetectionService();
