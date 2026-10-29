/**
 * OrderExecutionService
 *
 * Handles paper trading simulation and (when enabled) real limit-order submission.
 * All live trading requires explicit user confirmation and configured credentials.
 *
 * Default mode: paper trading (simulated fills, no real orders).
 */

import type { Side, OrderType, OrderStatus, ExecutionEstimate } from '@/types';
import type { OrderBook } from '@/types';
import { ExecutionEstimationService } from './ExecutionEstimationService';
import { randomUUID } from 'crypto';

export interface OrderRequest {
  userId: string;
  exchangeId: string;
  tradingPairId: string;
  symbol: string;
  side: Side;
  orderType: OrderType;
  quantity: number;
  limitPrice?: number;
  isPaperTrade: boolean;
  clientOrderId?: string;
}

export interface OrderResult {
  orderId: string;
  clientOrderId: string;
  status: OrderStatus;
  isPaperTrade: boolean;
  estimate: ExecutionEstimate;
  fills: Array<{
    price: number;
    quantity: number;
    fee: number;
    feeCurrency: string;
    executedAt: Date;
  }>;
  averageExecutionPrice: number | null;
  filledQuantity: number;
  rejectionReason?: string;
  timestamp: Date;
}

const FEE_PCT = 0.1; // 0.1% taker fee for paper trades

export class OrderExecutionService {
  private estimator = new ExecutionEstimationService();

  /**
   * Simulate a paper trade against current order book.
   * No real orders are placed.
   */
  async simulatePaperTrade(
    request: OrderRequest,
    orderBook: OrderBook
  ): Promise<OrderResult> {
    if (!request.isPaperTrade) {
      throw new Error(
        'OrderExecutionService.simulatePaperTrade called with isPaperTrade=false. ' +
        'Real order execution is not yet implemented. Enable paper trading.'
      );
    }

    const clientOrderId = request.clientOrderId ?? randomUUID();
    const orderId = randomUUID();

    const estimate = this.estimator.estimate({
      orderBook,
      side: request.side,
      orderType: request.orderType,
      quantity: request.quantity,
      limitPrice: request.limitPrice,
      feePct: FEE_PCT,
    });

    // Reject if not fillable
    if (!estimate.wouldFill && estimate.fillableQuantity === 0) {
      return {
        orderId,
        clientOrderId,
        status: 'REJECTED',
        isPaperTrade: true,
        estimate,
        fills: [],
        averageExecutionPrice: null,
        filledQuantity: 0,
        rejectionReason: estimate.liquidityWarning ?? 'No matching orders at current price.',
        timestamp: new Date(),
      };
    }

    // Simulate fills from VWAP levels
    const fills = estimate.orderBookDepthUsed.map((level) => ({
      price: level.price,
      quantity: level.quantity,
      fee: level.price * level.quantity * (FEE_PCT / 100),
      feeCurrency: request.symbol.slice(-3), // last 3 chars = quote currency
      executedAt: new Date(),
    }));

    const filledQty = estimate.fillableQuantity;
    const avgPrice = filledQty > 0 ? estimate.estimatedPrice : null;

    const status: OrderStatus =
      estimate.unfilledQuantity > 0 ? 'PARTIALLY_FILLED' : 'FILLED';

    return {
      orderId,
      clientOrderId,
      status,
      isPaperTrade: true,
      estimate,
      fills,
      averageExecutionPrice: avgPrice,
      filledQuantity: filledQty,
      timestamp: new Date(),
    };
  }
}

export const orderExecutionService = new OrderExecutionService();
