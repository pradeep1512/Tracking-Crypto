import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { exchangeTradingService } from '@/services/ExchangeTradingService';
import type { SupportedBroker } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id || 'dev_user';

    const body = await req.json();
    const { brokerType, displayName, accountUserId, apiKey, apiSecret, permissions } = body;

    if (!brokerType || !accountUserId || !apiKey || !apiSecret) {
      return NextResponse.json(
        { success: false, error: 'brokerType, accountUserId, apiKey, and apiSecret are required.' },
        { status: 400 }
      );
    }

    const connected = await exchangeTradingService.connectExchange({
      userId,
      brokerType: brokerType as SupportedBroker,
      displayName: displayName || `${brokerType} Trading Account`,
      accountUserId,
      apiKey,
      apiSecret,
      permissions: permissions || 'TRADE',
    });

    return NextResponse.json({
      success: true,
      data: connected,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to connect exchange';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
