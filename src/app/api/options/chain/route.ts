import { NextRequest } from 'next/server';
import { optionsTradingService } from '@/services/OptionsTradingService';
import { apiSuccess, apiError, handleUnknownError } from '@/lib/utils/api';
import { latencyService } from '@/services/LatencyOptimizationService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const underlying = searchParams.get('underlying') ?? 'BTC';
    const expiry = searchParams.get('expiry') ?? undefined;

    const chain = optionsTradingService.getOptionsChain(underlying, expiry);
    latencyService.measureMarketDataLatency(new Date(chain.timestamp), new Date());

    return apiSuccess({
      chain,
      supportedUnderlyings: optionsTradingService.getSupportedUnderlyings(),
    });
  } catch (err) {
    return handleUnknownError(err);
  }
}
