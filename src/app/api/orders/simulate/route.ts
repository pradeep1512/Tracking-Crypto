import { type NextRequest } from 'next/server';
import { executionEstimationService } from '@/services/ExecutionEstimationService';
import { exchangeRegistry } from '@/lib/exchange/ExchangeRegistry';
import { orderSimulateSchema } from '@/lib/validation/schemas';
import { apiSuccess, apiError, handleUnknownError } from '@/lib/utils/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = orderSimulateSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('Validation failed', 400, 'VALIDATION_ERROR', parsed.error.issues);
    }

    const { exchangeId, side, orderType, quantity, limitPrice } = parsed.data;

    // Get trading pair symbol from request (simplified — use symbol directly)
    const symbol = (body.symbol as string | undefined) ?? 'BTCINR';

    const adapter = exchangeRegistry.get(exchangeId);
    if (!adapter) {
      return apiError(`Exchange '${exchangeId}' not found`, 404, 'EXCHANGE_NOT_FOUND');
    }

    const orderBook = await adapter.getOrderBook(symbol.toUpperCase(), 50);

    const estimate = executionEstimationService.estimate({
      orderBook,
      side,
      orderType,
      quantity,
      limitPrice,
    });

    return apiSuccess({
      ...estimate,
      isPaperTrade: true,
      disclaimer:
        'This is a paper trade simulation. No real order has been placed. Estimated prices are based on current order book depth and may differ from actual execution.',
    });
  } catch (err) {
    return handleUnknownError(err);
  }
}
