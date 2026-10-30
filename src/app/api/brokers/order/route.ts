import { NextRequest } from 'next/server';
import { brokerIntegrationService } from '@/services/BrokerIntegrationService';
import { apiSuccess, apiError, handleUnknownError } from '@/lib/utils/api';
import { latencyService } from '@/services/LatencyOptimizationService';
import { priceGapService } from '@/services/PriceGapDetectionService';
import { requireAuthUser } from '@/lib/auth/server-auth';
import { z } from 'zod';

const orderSubmissionSchema = z.object({
  portfolioId: z.string(),
  brokerId: z.string(),
  symbol: z.string(),
  category: z.enum(['CRYPTO', 'MCX_COMMODITY', 'OPTION']),
  side: z.enum(['BUY', 'SELL']),
  orderType: z.enum(['MARKET', 'LIMIT', 'POST_ONLY', 'IOC', 'FOK']),
  quantity: z.number().positive(),
  price: z.number().positive().optional(),
  triggerPrice: z.number().positive().optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  isPaperTrade: z.boolean().default(true),
  clientOrderId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireAuthUser();
    if (authCheck.errorResponse) return authCheck.errorResponse;

    const startTime = Date.now();
    const body = await request.json();
    const parsed = orderSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? 'Invalid order submission', 400);
    }

    // Submit order via broker adapter
    const result = await brokerIntegrationService.submitOrder(parsed.data);

    // Measure submission and ack latency
    const latencyMs = Math.max(1, Date.now() - startTime);
    latencyService.record('ORDER_SUBMIT', latencyMs);

    // Price gap detection against submitted reference price vs filled execution price
    if (parsed.data.price && result.executionPrice) {
      const diff = result.executionPrice - parsed.data.price;
      const diffPct = (diff / parsed.data.price) * 100;
      const priceGap = {
        referencePrice: parsed.data.price,
        executionPrice: result.executionPrice,
        gapAmount: Number(diff.toFixed(2)),
        gapPercentage: Number(diffPct.toFixed(4)),
        latencyMs,
      };

      return apiSuccess({
        order: result,
        priceGap,
        latencyMs,
      }, 201);
    }

    return apiSuccess({
      order: result,
      latencyMs: Date.now() - startTime,
    }, 201);
  } catch (err) {
    return handleUnknownError(err);
  }
}
