import { type NextRequest } from 'next/server';
import { priceGapService } from '@/services/PriceGapDetectionService';
import { exchangeRegistry } from '@/lib/exchange/ExchangeRegistry';
import { apiSuccess, apiError, handleUnknownError } from '@/lib/utils/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exchangeId = searchParams.get('exchange') ?? 'mock';
    const symbol = searchParams.get('symbol') ?? 'BTCINR';
    const referencePrice = parseFloat(searchParams.get('referencePrice') ?? '0');
    const side = (searchParams.get('side') ?? 'BUY') as 'BUY' | 'SELL';
    const quantity = searchParams.get('quantity')
      ? parseFloat(searchParams.get('quantity')!)
      : undefined;
    const tolerancePct = searchParams.get('tolerance')
      ? parseFloat(searchParams.get('tolerance')!)
      : undefined;

    if (!referencePrice || referencePrice <= 0) {
      return apiError('referencePrice must be a positive number', 400, 'INVALID_REFERENCE_PRICE');
    }

    if (!['BUY', 'SELL'].includes(side)) {
      return apiError('side must be BUY or SELL', 400, 'INVALID_SIDE');
    }

    const adapter = exchangeRegistry.get(exchangeId);
    if (!adapter) {
      return apiError(`Exchange '${exchangeId}' not found`, 404, 'EXCHANGE_NOT_FOUND');
    }

    const [ticker, orderBook] = await Promise.all([
      adapter.getTicker(symbol),
      quantity ? adapter.getOrderBook(symbol, 50) : Promise.resolve(undefined),
    ]);

    const analysis = priceGapService.analyze({
      side,
      referencePrice,
      ticker,
      orderBook,
      quantity,
      tolerancePercentage: tolerancePct,
    });

    return apiSuccess(analysis);
  } catch (err) {
    return handleUnknownError(err);
  }
}
