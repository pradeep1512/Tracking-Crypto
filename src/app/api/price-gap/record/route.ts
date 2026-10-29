import { type NextRequest } from 'next/server';
import { marketPersistenceService } from '@/services/MarketPersistenceService';
import { apiSuccess, apiError, handleUnknownError } from '@/lib/utils/api';
import type { PriceGapAnalysis } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { analysis, symbol, exchangeId, userId } = body as {
      analysis: PriceGapAnalysis;
      symbol: string;
      exchangeId?: string;
      userId?: string;
    };

    if (!analysis || !symbol) {
      return apiError('Missing analysis or symbol in request body', 400, 'INVALID_BODY');
    }

    const saved = await marketPersistenceService.recordPriceGap(
      analysis,
      symbol,
      exchangeId ?? 'binance',
      userId
    );

    return apiSuccess(saved, 201);
  } catch (err) {
    return handleUnknownError(err);
  }
}
