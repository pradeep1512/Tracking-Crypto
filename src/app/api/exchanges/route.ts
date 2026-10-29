import { NextResponse } from 'next/server';
import { exchangeRegistry } from '@/lib/exchange/ExchangeRegistry';
import { apiSuccess, handleUnknownError } from '@/lib/utils/api';

export async function GET() {
  try {
    const adapters = exchangeRegistry.getAll();
    const exchanges = adapters.map((a) => ({
      id: a.id,
      displayName: a.displayName,
      isMock: a.isMock,
      isEnabled: true,
    }));

    return apiSuccess(exchanges);
  } catch (err) {
    return handleUnknownError(err);
  }
}
