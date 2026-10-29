import { type NextRequest } from 'next/server';
import { liveTradingService } from '@/services/LiveTradingService';
import { apiSuccess, handleUnknownError } from '@/lib/utils/api';

export async function GET(request: NextRequest) {
  try {
    const config = liveTradingService.getConfig();
    return apiSuccess(config);
  } catch (err) {
    return handleUnknownError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const updated = liveTradingService.updateConfig(body);
    return apiSuccess(updated);
  } catch (err) {
    return handleUnknownError(err);
  }
}
