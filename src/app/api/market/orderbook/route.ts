import { type NextRequest } from 'next/server';
import { exchangeRegistry } from '@/lib/exchange/ExchangeRegistry';
import { apiSuccess, apiError, handleUnknownError } from '@/lib/utils/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exchangeId = searchParams.get('exchange') ?? 'mock';
    const symbol = searchParams.get('symbol') ?? 'BTCINR';
    const depth = parseInt(searchParams.get('depth') ?? '20', 10);

    if (depth < 1 || depth > 100) {
      return apiError('depth must be between 1 and 100', 400, 'INVALID_DEPTH');
    }

    const adapter = exchangeRegistry.get(exchangeId) ?? exchangeRegistry.getDefault();
    if (!adapter) {
      return apiError(`Exchange '${exchangeId}' not found`, 404, 'EXCHANGE_NOT_FOUND');
    }

    const orderBook = await adapter.getOrderBook(symbol.toUpperCase(), depth);
    return apiSuccess(orderBook);
  } catch (err) {
    return handleUnknownError(err);
  }
}
