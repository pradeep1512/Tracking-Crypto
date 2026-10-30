import { NextResponse, type NextRequest } from 'next/server';
import { exchangeTradingService } from '@/services/ExchangeTradingService';
import type { LiveOrderExecutionRequest } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body: LiveOrderExecutionRequest = await req.json();

    if (!body.brokerId || !body.tradingPair || !body.side || !body.orderType) {
      return NextResponse.json(
        { success: false, error: 'brokerId, tradingPair, side, and orderType are required.' },
        { status: 400 }
      );
    }

    const preview = await exchangeTradingService.previewOrder(body);
    return NextResponse.json({
      success: true,
      data: preview,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to calculate order preview';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
