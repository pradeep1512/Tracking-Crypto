import { NextResponse } from 'next/server';
import { exchangeTradingService } from '@/services/ExchangeTradingService';

export async function GET() {
  try {
    const balances = await exchangeTradingService.getAllExchangeBalances();
    return NextResponse.json({
      success: true,
      data: balances,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve exchange balances';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
