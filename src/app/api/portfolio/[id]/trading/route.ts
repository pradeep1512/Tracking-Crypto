import { NextRequest } from 'next/server';
import { portfolioService } from '@/services/PortfolioService';
import { apiSuccess, apiError, handleUnknownError } from '@/lib/utils/api';
import { requireAuthUser, checkPortfolioOwnership } from '@/lib/auth/server-auth';
import { z } from 'zod';

const actionSchema = z.object({
  action: z.enum(['START', 'PAUSE', 'RESUME', 'STOP', 'CLOSE_POSITION', 'DUPLICATE']),
  positionId: z.string().optional(),
  userConfirmed: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await requireAuthUser();
    if (authCheck.errorResponse) return authCheck.errorResponse;
    const { user } = authCheck;

    const { id } = await params;
    const portfolio = portfolioService.getPortfolioById(id);
    if (!portfolio) {
      return apiError(`Portfolio '${id}' not found`, 404, 'PORTFOLIO_NOT_FOUND');
    }

    const ownership = checkPortfolioOwnership(portfolio, user);
    if (!ownership.allowed) {
      return ownership.errorResponse!;
    }

    const body = await request.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? 'Invalid trading action', 400);
    }

    const { action, positionId, userConfirmed } = parsed.data;

    switch (action) {
      case 'START': {
        const result = await portfolioService.startTrading(id, userConfirmed ?? true);
        if (!result.success) {
          return apiError(result.error ?? 'Start trading validation failed', 400, 'START_FAILED', result.verificationLog);
        }
        return apiSuccess({
          message: 'Portfolio trading started successfully',
          portfolio: result.portfolio,
          verificationLog: result.verificationLog,
        });
      }

      case 'PAUSE': {
        const portfolio = portfolioService.pauseTrading(id);
        return apiSuccess({ message: 'Portfolio trading paused', portfolio });
      }

      case 'RESUME': {
        const portfolio = portfolioService.resumeTrading(id);
        return apiSuccess({ message: 'Portfolio trading resumed', portfolio });
      }

      case 'STOP': {
        const portfolio = portfolioService.stopTrading(id);
        return apiSuccess({ message: 'Portfolio trading stopped', portfolio });
      }

      case 'CLOSE_POSITION': {
        if (!positionId) {
          return apiError('positionId is required for CLOSE_POSITION', 400);
        }
        const res = portfolioService.closePosition(id, positionId);
        return apiSuccess({
          message: `Position ${res.position.symbol} closed successfully. Realized PnL: ${res.position.realizedPnL}`,
          position: res.position,
          portfolio: res.portfolio,
        });
      }

      case 'DUPLICATE': {
        const copy = portfolioService.duplicatePortfolio(id);
        return apiSuccess({ message: 'Portfolio duplicated', portfolio: copy }, 201);
      }

      default:
        return apiError('Unsupported action', 400);
    }
  } catch (err) {
    return handleUnknownError(err);
  }
}
