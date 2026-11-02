import { NextRequest } from 'next/server';
import { expiryManagementService } from '@/services/ExpiryManagementService';
import { apiSuccess, apiError, handleUnknownError } from '@/lib/utils/api';
import { z } from 'zod';

const rolloverSchema = z.object({
  portfolioId: z.string().optional(),
  expiringContractSymbol: z.string(),
  targetContractSymbol: z.string(),
  quantity: z.number().default(1),
  currentPrice: z.number().default(78500),
  targetPrice: z.number().default(78550),
});

export async function GET() {
  try {
    const calendar = await expiryManagementService.getExpiryCalendar();
    return apiSuccess(calendar);
  } catch (err) {
    return handleUnknownError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = rolloverSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? 'Invalid rollover request', 400);
    }

    const result = expiryManagementService.executeRolloverSimulation({
      expiringContractSymbol: parsed.data.expiringContractSymbol,
      targetContractSymbol: parsed.data.targetContractSymbol,
      quantity: parsed.data.quantity,
      currentPrice: parsed.data.currentPrice,
      targetPrice: parsed.data.targetPrice,
    });
    return apiSuccess(result);
  } catch (err) {
    return handleUnknownError(err);
  }
}
