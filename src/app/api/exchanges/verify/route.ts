import { NextResponse, type NextRequest } from 'next/server';
import { exchangeTradingService } from '@/services/ExchangeTradingService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brokerId } = body;

    if (!brokerId) {
      return NextResponse.json({ success: false, error: 'brokerId is required' }, { status: 400 });
    }

    const verification = await exchangeTradingService.verifyExchangeConnection(brokerId);
    return NextResponse.json({
      success: true,
      data: verification,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Connection verification failed';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
