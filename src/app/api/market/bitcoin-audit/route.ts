import { apiSuccess, handleUnknownError } from '@/lib/utils/api';
import { currencyConversionService } from '@/services/CurrencyConversionService';

export async function GET() {
  try {
    const audit = await currencyConversionService.getBitcoinPriceAudit();
    return apiSuccess(audit);
  } catch (err) {
    return handleUnknownError(err);
  }
}
