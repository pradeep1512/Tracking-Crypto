import { NextRequest } from 'next/server';
import { expiryManagementService } from '@/services/ExpiryManagementService';
import { apiSuccess, apiError, handleUnknownError } from '@/lib/utils/api';
import { z } from 'zod';

const rolloverSchema = z.object({
  portfolioId: z.string(),
  positionId: z.string(),
  currentExpiry: z.string(),
  nextExpiry: z.string(),
  userConfirmed: z.boolean(),
});

export async function GET() {
  try {
    const calendar = expiryManagementService.getExpiryCalendar();
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

    const result = expiryManagementService.executeRollover(parsed.data);
    return apiSuccess(result);
  } catch (err) {
    return handleUnknownError(err);
  }
}
