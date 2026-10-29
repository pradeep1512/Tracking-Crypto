import { type NextRequest } from 'next/server';
import { paperTradingService } from '@/services/PaperTradingService';
import { apiSuccess, handleUnknownError } from '@/lib/utils/api';

export async function GET(request: NextRequest) {
  try {
    const orders = await paperTradingService.getOrders();
    const portfolio = paperTradingService.getPortfolio();

    return apiSuccess({
      orders,
      portfolio,
    });
  } catch (err) {
    return handleUnknownError(err);
  }
}
