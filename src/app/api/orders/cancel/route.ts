import { type NextRequest } from 'next/server';
import { paperTradingService } from '@/services/PaperTradingService';
import { apiSuccess, apiError, handleUnknownError } from '@/lib/utils/api';
import { requireAuthUser } from '@/lib/auth/server-auth';

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAuthUser();
    if (authCheck.errorResponse) return authCheck.errorResponse;

    const body = await request.json();
    const { orderId } = body as { orderId?: string };

    if (!orderId) {
      return apiError('Missing orderId in request body', 400, 'INVALID_BODY');
    }

    const cancelled = await paperTradingService.cancelOrder(orderId);
    if (!cancelled) {
      return apiError(`Order '${orderId}' not found or cannot be cancelled`, 404, 'ORDER_NOT_FOUND');
    }

    return apiSuccess({ orderId, status: 'CANCELLED' });
  } catch (err) {
    return handleUnknownError(err);
  }
}
