import { NextResponse, type NextRequest } from 'next/server';
import { exchangeTradingService } from '@/services/ExchangeTradingService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { brokerId, authorized } = body;

    if (!brokerId || typeof authorized !== 'boolean') {
      return NextResponse.json({ success: false, error: 'brokerId and authorized boolean are required' }, { status: 400 });
    }

    const updated = exchangeTradingService.setLiveTradingAuthorization(brokerId, authorized);
    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update live authorization';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
