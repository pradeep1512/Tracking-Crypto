import { NextRequest } from 'next/server';
import { apiSuccess, handleUnknownError } from '@/lib/utils/api';
import { currencyConversionService } from '@/services/CurrencyConversionService';

export async function GET(request: NextRequest) {
  try {
    const rateData = await currencyConversionService.getUsdtInrRate();
    return apiSuccess(rateData);
  } catch (err) {
    return handleUnknownError(err);
  }
}
