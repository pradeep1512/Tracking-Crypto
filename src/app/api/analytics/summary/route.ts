import { type NextRequest } from 'next/server';
import { analyticsService } from '@/services/AnalyticsService';
import { apiSuccess, handleUnknownError } from '@/lib/utils/api';
import { requireAuthUser } from '@/lib/auth/server-auth';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAuthUser();
    if (authCheck.errorResponse) return authCheck.errorResponse;

    const { searchParams } = new URL(request.url);
    const timeframe = (searchParams.get('timeframe') as '1h' | '24h' | '7d') || '24h';

    const summary = await analyticsService.getSummary(timeframe);
    return apiSuccess(summary);
  } catch (err) {
    return handleUnknownError(err);
  }
}
