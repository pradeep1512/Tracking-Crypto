import { type NextRequest } from 'next/server';
import { exchangeRegistry } from '@/lib/exchange/ExchangeRegistry';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') ?? 'BTCUSDT';
  const exchangeId = searchParams.get('exchange') ?? 'binance';

  const adapter = exchangeRegistry.get(exchangeId) ?? exchangeRegistry.getDefault();
  if (!adapter) {
    return new Response(JSON.stringify({ error: 'Adapter not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  const sendEvent = (event: string, data: unknown) => {
    try {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      writer.write(encoder.encode(payload));
    } catch {
      // Stream closed or error
    }
  };

  // Immediate handshake
  sendEvent('connected', {
    exchangeId: adapter.id,
    exchangeName: adapter.displayName,
    symbol: symbol.toUpperCase(),
    timestamp: new Date().toISOString(),
  });

  // Send initial snapshot
  adapter.getTicker(symbol.toUpperCase()).then((ticker) => {
    sendEvent('ticker', ticker);
  }).catch(() => {});

  adapter.getOrderBook(symbol.toUpperCase(), 20).then((ob) => {
    sendEvent('orderbook', ob);
  }).catch(() => {});

  // Subscribe to live ticker stream
  const unsubTicker = adapter.subscribeToTicker(symbol.toUpperCase(), (ticker) => {
    sendEvent('ticker', ticker);
  });

  // Subscribe to live orderbook stream
  const unsubBook = adapter.subscribeToOrderBook(symbol.toUpperCase(), (orderBook) => {
    sendEvent('orderbook', orderBook);
  });

  // Keep-alive heartbeat ping every 15 seconds
  const pingInterval = setInterval(() => {
    sendEvent('ping', { timestamp: Date.now() });
  }, 15_000);

  // Cleanup on client abort
  request.signal.addEventListener('abort', () => {
    clearInterval(pingInterval);
    unsubTicker();
    unsubBook();
    try {
      writer.close();
    } catch {
      // ignore
    }
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
