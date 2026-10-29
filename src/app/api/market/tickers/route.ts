import { type NextRequest } from 'next/server';
import { exchangeRegistry } from '@/lib/exchange/ExchangeRegistry';
import { apiSuccess, apiError, handleUnknownError } from '@/lib/utils/api';
import { latencyService } from '@/services/LatencyOptimizationService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exchangeId = searchParams.get('exchange') ?? 'binance';
    const defaultSymbols = exchangeId === 'binance' 
      ? ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'BTCINR'] 
      : ['BTCINR', 'ETHINR', 'USDTINR'];
    const symbols = searchParams.get('symbols')?.split(',') ?? defaultSymbols;

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
