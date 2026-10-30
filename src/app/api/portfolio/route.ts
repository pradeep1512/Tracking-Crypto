import { NextRequest } from 'next/server';
import { portfolioService } from '@/services/PortfolioService';
import { apiSuccess, apiError, handleUnknownError } from '@/lib/utils/api';
import { requireAuthUser } from '@/lib/auth/server-auth';
import { z } from 'zod';

const createPortfolioSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  category: z.enum([
    'CRYPTO',
    'GOLD',
    'SILVER',
    'MCX_COMMODITY',
    'OPTIONS_TRADING',
    'MULTI_ASSET',
    'CUSTOM',
  ]),
  currency: z.enum(['INR', 'USDT']).optional(),
  initialCapital: z.number().positive(),
  maxInvestmentLimit: z.number().positive().optional(),
  riskLimitPercentage: z.number().min(0.5).max(50).optional(),
  maxDailyLoss: z.number().positive().optional(),
  executionMode: z.enum(['PAPER', 'LIVE']).optional(),
  connectedBrokerName: z.string().optional(),
});

export async function GET() {
  try {
    const authCheck = await requireAuthUser();
    if (authCheck.errorResponse) return authCheck.errorResponse;
    const { user } = authCheck;

    const portfolios = portfolioService.getPortfolios(user.role === 'ADMIN' ? undefined : user.id);
    return apiSuccess(portfolios);
  } catch (err) {
    return handleUnknownError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAuthUser();
    if (authCheck.errorResponse) return authCheck.errorResponse;
    const { user } = authCheck;

    const body = await request.json();
    const parsed = createPortfolioSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? 'Invalid portfolio parameters', 400);
    }

    const created = portfolioService.createPortfolio({
      ...parsed.data,
      userId: user.id,
    });
    return apiSuccess(created, 201);
  } catch (err) {
    return handleUnknownError(err);
  }
}
