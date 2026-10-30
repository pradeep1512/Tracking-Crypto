import { NextRequest } from 'next/server';
import { portfolioService } from '@/services/PortfolioService';
import { apiSuccess, apiError, handleUnknownError } from '@/lib/utils/api';
import { requireAuthUser, checkPortfolioOwnership } from '@/lib/auth/server-auth';

export async function GET(
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

    // Enforce ownership: 403 if not owner and not admin
    const ownership = checkPortfolioOwnership(portfolio, user);
    if (!ownership.allowed) {
      return ownership.errorResponse!;
    }

    return apiSuccess(portfolio);
  } catch (err) {
    return handleUnknownError(err);
  }
}

export async function PUT(
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
    const updated = portfolioService.updatePortfolio(id, body);
    return apiSuccess(updated);
  } catch (err) {
    return handleUnknownError(err);
  }
}

export async function DELETE(
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

    const success = portfolioService.deletePortfolio(id);
    if (!success) {
      return apiError(`Portfolio '${id}' not found`, 404, 'PORTFOLIO_NOT_FOUND');
    }
    return apiSuccess({ deleted: true, id });
  } catch (err) {
    return handleUnknownError(err);
  }
}
