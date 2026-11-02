import { type NextRequest } from 'next/server';
import { exchangeRegistry } from '@/lib/exchange/ExchangeRegistry';
import { apiSuccess, apiError, handleUnknownError } from '@/lib/utils/api';
import { latencyService } from '@/services/LatencyOptimizationService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exchangeId = searchParams.get('exchange') ?? 'delta';
    const defaultSymbols = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'DOGEUSD'];
    const rawSymbols = searchParams.get('symbols')?.split(',') ?? defaultSymbols;

    // Normalize any legacy symbols
    const symbols = rawSymbols.map((s) => {
      const clean = s.trim().toUpperCase();
      if (clean === 'BTCUSDT' || clean === 'BTCINR') return 'BTCUSD';
      if (clean === 'ETHUSDT' || clean === 'ETHINR') return 'ETHUSD';
      return clean;
    });

    const adapter = exchangeRegistry.get(exchangeId) ?? exchangeRegistry.getDefault();
    if (!adapter) {
      return apiError(`Exchange '${exchangeId}' not found`, 404, 'EXCHANGE_NOT_FOUND');
    }

    const tickers = await Promise.all(
      symbols.map(async (symbol) => {
        const ticker = await adapter.getTicker(symbol.toUpperCase());

        // Record latency
        latencyService.measureMarketDataLatency(
          ticker.exchangeTimestamp,
          ticker.receivedAt
        );

        return ticker;
      })
    );

    return apiSuccess(tickers);
  } catch (err) {
    return handleUnknownError(err);
  }
}
