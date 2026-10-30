import { NextResponse } from 'next/server';
import { mcxMarketService } from '@/services/MCXMarketService';
import { apiSuccess, handleUnknownError } from '@/lib/utils/api';

export async function GET() {
  try {
    const specs = mcxMarketService.getSpecifications();
    const market = mcxMarketService.getMarketStatus();
    return apiSuccess({
      specifications: specs,
      marketStatus: market,
    });
  } catch (err) {
    return handleUnknownError(err);
  }
}
