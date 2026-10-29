import { type NextRequest } from 'next/server';
import { latencyService } from '@/services/LatencyOptimizationService';
import { apiSuccess, handleUnknownError } from '@/lib/utils/api';
import type { MetricType } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metricType = (searchParams.get('type') ?? 'MARKET_DATA') as MetricType;
    const windowMinutes = parseInt(searchParams.get('window') ?? '5', 10);

    const stats = latencyService.getStats(metricType, windowMinutes);
    return apiSuccess(stats);
  } catch (err) {
    return handleUnknownError(err);
  }
}
