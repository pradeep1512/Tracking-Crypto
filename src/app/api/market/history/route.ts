import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { exchangeRegistry } from '@/lib/exchange/ExchangeRegistry';
import { apiSuccess, handleUnknownError } from '@/lib/utils/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') ?? 'BTCUSDT';
    const limit = parseInt(searchParams.get('limit') ?? '50', 10);

    // Try fetching from SQL Server
    try {
      const records = await prisma.marketSnapshot.findMany({
        where: {
          tradingPair: {
            symbol: symbol.toUpperCase(),
          },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });

      if (records.length > 0) {
        return apiSuccess(
          records.map((r) => ({
            lastPrice: Number(r.lastPrice),
            bestBid: Number(r.bestBid),
            bestAsk: Number(r.bestAsk),
            spread: Number(r.spread),
            spreadPercentage: Number(r.spreadPercentage),
            volume24h: r.volume24h ? Number(r.volume24h) : null,
            timestamp: r.exchangeTimestamp,
          }))
        );
      }
    } catch {
      // Offline fallback
    }

    // Fallback: generate recent sample series from active exchange
    const adapter = exchangeRegistry.get('binance') ?? exchangeRegistry.getDefault();
    const current = await adapter.getTicker(symbol.toUpperCase());
    const syntheticPoints = [];
    const base = current.lastPrice;
    const now = Date.now();

    for (let i = limit; i >= 0; i--) {
      const offset = (Math.sin(i / 3) * 0.002 + (Math.random() - 0.5) * 0.001) * base;
      syntheticPoints.push({
        lastPrice: base + offset,
        bestBid: base + offset - (current.spread || 5),
        bestAsk: base + offset + (current.spread || 5),
        spread: current.spread || 10,
        spreadPercentage: current.spreadPercentage || 0.05,
        volume24h: current.volume24h,
        timestamp: new Date(now - i * 60_000).toISOString(),
      });
    }

    return apiSuccess(syntheticPoints);
  } catch (err) {
    return handleUnknownError(err);
  }
}
