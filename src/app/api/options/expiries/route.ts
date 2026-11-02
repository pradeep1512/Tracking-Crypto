import { NextRequest } from 'next/server';
import { deltaExchangeService } from '@/services/DeltaExchangeService';
import { apiSuccess, handleUnknownError } from '@/lib/utils/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const underlying = searchParams.get('underlying') ?? 'BTC';

    const data = await deltaExchangeService.getAvailableExpiries(underlying);

    return apiSuccess({
      underlying: data.underlying,
      expiries: data.expiries,
      source: 'Delta Exchange India',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return handleUnknownError(err);
  }
}
