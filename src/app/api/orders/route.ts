import { type NextRequest } from 'next/server';
import { paperTradingService } from '@/services/PaperTradingService';
import { apiSuccess, handleUnknownError } from '@/lib/utils/api';
import { requireAuthUser } from '@/lib/auth/server-auth';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAuthUser();
    if (authCheck.errorResponse) return authCheck.errorResponse;

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
