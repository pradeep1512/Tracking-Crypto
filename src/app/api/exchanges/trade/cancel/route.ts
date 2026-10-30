import { NextResponse, type NextRequest } from 'next/server';
import { exchangeTradingService } from '@/services/ExchangeTradingService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brokerId, orderId } = body;

    if (!brokerId || !orderId) {
      return NextResponse.json(
        { success: false, error: 'brokerId and orderId are required.' },
        { status: 400 }
      );
    }

    const cancelResult = await exchangeTradingService.cancelOrder(brokerId, orderId);
    return NextResponse.json({
      success: cancelResult.success,
      data: cancelResult,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Order cancellation failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
