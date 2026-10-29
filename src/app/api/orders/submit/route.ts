import { type NextRequest } from 'next/server';
import { paperTradingService } from '@/services/PaperTradingService';
import { apiSuccess, apiError, handleUnknownError } from '@/lib/utils/api';
import type { Side, OrderType } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, exchangeId, side, orderType, quantity, limitPrice, clientOrderId } = body as {
      symbol: string;
      exchangeId?: string;
      side: Side;
      orderType: OrderType;
      quantity: number;
      limitPrice?: number;
      clientOrderId?: string;
    };

    if (!symbol || !side || !orderType || !quantity || quantity <= 0) {
      return apiError('Missing required order parameters', 400, 'INVALID_ORDER_PARAMS');
    }

    const order = await paperTradingService.submitPaperOrder({
      symbol,
      exchangeId,
      side,
      orderType,
      quantity,
      limitPrice,
      clientOrderId,
    });

    const portfolio = paperTradingService.getPortfolio();

    return apiSuccess(
      {
        order,
        portfolio,
        message:
          order.status === 'FILLED'
            ? `Paper trade filled: ${order.filledQuantity} ${order.symbol} @ avg ${order.averageExecutionPrice?.toFixed(2)}`
            : order.status === 'OPEN'
            ? `Paper limit order queued as OPEN @ limit ${order.limitPrice}`
            : `Order ${order.status}: ${order.rejectionReason || ''}`,
      },
      201
    );
  } catch (err) {
    return handleUnknownError(err);
  }
}
