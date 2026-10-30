import { NextRequest } from 'next/server';
import { mcxMarketService } from '@/services/MCXMarketService';
import { apiSuccess, apiError, handleUnknownError } from '@/lib/utils/api';
import { latencyService } from '@/services/LatencyOptimizationService';
import type { CommodityCategory } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const category = searchParams.get('category') as CommodityCategory | null;

    if (symbol) {
      const ticker = mcxMarketService.getCommodityTicker(symbol);
      latencyService.measureMarketDataLatency(new Date(ticker.timestamp), new Date());
      return apiSuccess(ticker);
    }

    const tickers = mcxMarketService.getAllTickers(category ?? undefined);
    return apiSuccess(tickers);
  } catch (err) {
    return handleUnknownError(err);
  }
}
