import { NextRequest } from 'next/server';
import { portfolioService } from '@/services/PortfolioService';
import { apiSuccess, handleUnknownError } from '@/lib/utils/api';
import { requireAuthUser } from '@/lib/auth/server-auth';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await requireAuthUser();
    if (authCheck.errorResponse) return authCheck.errorResponse;

    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId') ?? undefined;
    const transactions = portfolioService.getTransactions(portfolioId);
    return apiSuccess(transactions);
  } catch (err) {
    return handleUnknownError(err);
  }
}
