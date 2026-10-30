import { NextRequest } from 'next/server';
import { brokerIntegrationService } from '@/services/BrokerIntegrationService';
import { apiSuccess, apiError, handleUnknownError } from '@/lib/utils/api';
import { requireAuthUser } from '@/lib/auth/server-auth';
import { z } from 'zod';

const connectBrokerSchema = z.object({
  brokerType: z.enum(['ZERODHA', 'ANGEL_ONE', 'UPSTOX', 'DHAN', 'BINANCE', 'COINDCX', 'PAPER_SIMULATOR']),
  displayName: z.string().min(2),
  accountUserId: z.string().min(2),
  apiKey: z.string().min(4),
  apiSecret: z.string().min(4),
  accessToken: z.string().optional(),
});

const authorizeSchema = z.object({
  brokerId: z.string(),
  isLiveTradingAuthorized: z.boolean(),
});

export async function GET() {
  try {
    const authCheck = await requireAuthUser();
    if (authCheck.errorResponse) return authCheck.errorResponse;

    const brokers = brokerIntegrationService.getBrokers();
    return apiSuccess(brokers);
  } catch (err) {
    return handleUnknownError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAuthUser();
    if (authCheck.errorResponse) return authCheck.errorResponse;

    const body = await request.json();
    const parsed = connectBrokerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? 'Invalid broker credentials', 400);
    }

    const connected = brokerIntegrationService.connectBroker(parsed.data);
    return apiSuccess(connected, 201);
  } catch (err) {
    return handleUnknownError(err);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authCheck = await requireAuthUser();
    if (authCheck.errorResponse) return authCheck.errorResponse;

    const body = await request.json();
    const parsed = authorizeSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('brokerId and isLiveTradingAuthorized boolean required', 400);
    }

    const updated = brokerIntegrationService.setLiveTradingAuthorization(
      parsed.data.brokerId,
      parsed.data.isLiveTradingAuthorized
    );
    return apiSuccess(updated);
  } catch (err) {
    return handleUnknownError(err);
  }
}
