import { type NextRequest } from 'next/server';
import { marketPersistenceService } from '@/services/MarketPersistenceService';
import { apiSuccess, handleUnknownError } from '@/lib/utils/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') ?? undefined;
    const exchangeId = searchParams.get('exchange') ?? undefined;
    const classification = searchParams.get('classification') ?? undefined;
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);

    const history = await marketPersistenceService.getHistoricalGaps({
      symbol,
      exchangeId,
      classification,
      limit,
    });

    return apiSuccess(history);
  } catch (err) {
    return handleUnknownError(err);
  }
}
