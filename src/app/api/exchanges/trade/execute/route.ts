import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { exchangeTradingService } from '@/services/ExchangeTradingService';
import type { LiveOrderExecutionRequest } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || 'dev_user';

    const body: LiveOrderExecutionRequest = await req.json();

    if (!body.brokerId || !body.tradingPair || !body.side || !body.orderType) {
      return NextResponse.json(
        { success: false, error: 'brokerId, tradingPair, side, and orderType are required.' },
        { status: 400 }
      );
    }

    const orderResult = await exchangeTradingService.executeLiveOrder(userId, body);
    return NextResponse.json({
      success: true,
      data: orderResult,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Live order execution failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
