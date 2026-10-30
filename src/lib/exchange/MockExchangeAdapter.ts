/**
 * MockExchangeAdapter — Development-only exchange adapter.
 *
 * Simulates realistic BTC/ETH price data with random walk,
 * spread simulation, and order-book depth generation.
 *
 * ⚠️  THIS IS NOT REAL MARKET DATA.
 * Every response is clearly marked with isMock: true.
 * Never use this in production.
 */

import type { ExchangeAdapter } from './ExchangeAdapter';
import type { Ticker, OrderBook, OrderBookLevel } from '@/types';

// Base prices for simulation (INR)
const BASE_PRICES: Record<string, number> = {
  BTCINR: 7_460_000,
  ETHINR: 285_000,
  BNBINR: 54_000,
  USDTINR: 95.0,
  BTCUSDT: 78_500,
  ETHUSDT: 3_000,
};

const SUPPORTED_SYMBOLS = Object.keys(BASE_PRICES);

// Per-symbol state for random walk simulation
const priceState: Record<string, { price: number; trend: number }> = {};

function initSymbol(symbol: string): void {
  if (!priceState[symbol]) {
    priceState[symbol] = {
      price: BASE_PRICES[symbol] ?? 100,
      trend: 0,
    };
  }
}

function nextPrice(symbol: string): number {
  initSymbol(symbol);
  const state = priceState[symbol];

  // Random walk with slight mean reversion
  const base = BASE_PRICES[symbol] ?? 100;
  const volatility = base * 0.0008; // 0.08% per tick
  const meanReversion = (base - state.price) * 0.001;

  state.trend = state.trend * 0.9 + (Math.random() - 0.5) * 0.1;
  state.price += state.trend * volatility + meanReversion + (Math.random() - 0.5) * volatility;
  state.price = Math.max(base * 0.9, Math.min(base * 1.1, state.price));

  return Math.round(state.price * 100) / 100;
}

function generateSpread(price: number): { bid: number; ask: number; bidQty: number; askQty: number } {
  const spreadPct = 0.0005 + Math.random() * 0.001; // 0.05–0.15% spread
  const halfSpread = price * spreadPct * 0.5;
  return {
    bid: Math.round((price - halfSpread) * 100) / 100,
    ask: Math.round((price + halfSpread) * 100) / 100,
    bidQty: parseFloat((0.1 + Math.random() * 2).toFixed(4)),
    askQty: parseFloat((0.1 + Math.random() * 2).toFixed(4)),
  };
}

function generateOrderBook(symbol: string, depth = 20): OrderBook {
  const price = priceState[symbol]?.price ?? BASE_PRICES[symbol] ?? 100;
  const { bid, ask } = generateSpread(price);

  const bids: OrderBookLevel[] = [];
  const asks: OrderBookLevel[] = [];

  let bidTotal = 0;
  let askTotal = 0;
  const tickSize = price > 10000 ? 50 : price > 1000 ? 5 : 0.5;

  for (let i = 0; i < depth; i++) {
    const bidPrice = Math.round((bid - i * tickSize) * 100) / 100;
    const bidQty = parseFloat((0.05 + Math.random() * 1.5).toFixed(6));
    bidTotal += bidQty;

    const askPrice = Math.round((ask + i * tickSize) * 100) / 100;
    const askQty = parseFloat((0.05 + Math.random() * 1.5).toFixed(6));
    askTotal += askQty;

    bids.push({ price: bidPrice, quantity: bidQty, total: bidTotal, depthPercentage: 0 });
    asks.push({ price: askPrice, quantity: askQty, total: askTotal, depthPercentage: 0 });
  }

  // Normalize depth percentages
  const maxDepth = Math.max(bidTotal, askTotal);
  bids.forEach((b) => (b.depthPercentage = (b.total / maxDepth) * 100));
  asks.forEach((a) => (a.depthPercentage = (a.total / maxDepth) * 100));

  const now = new Date();
  return {
    exchangeId: 'mock',
    symbol,
    bids,
    asks,
    timestamp: now,
    receivedAt: now,
    dataAgeMs: 0,
  };
}

export class MockExchangeAdapter implements ExchangeAdapter {
  readonly id = 'mock';
  readonly displayName = 'Mock Exchange (Dev)';
  readonly isMock = true;

  private intervals: ReturnType<typeof setInterval>[] = [];

  async getTicker(symbol: string): Promise<Ticker> {
    const upper = symbol.toUpperCase();
    initSymbol(upper);
    const price = nextPrice(upper);
    const { bid, ask, bidQty, askQty } = generateSpread(price);
    const spread = ask - bid;
    const now = new Date();

    return {
      exchangeId: this.id,
      exchangeName: this.displayName,
      symbol: upper,
      lastPrice: price,
      bestBid: bid,
      bestAsk: ask,
      bidQuantity: bidQty,
      askQuantity: askQty,
      spread,
      spreadPercentage: (spread / price) * 100,
      volume24h: parseFloat((Math.random() * 500).toFixed(4)),
      high24h: price * 1.02,
      low24h: price * 0.98,
      exchangeTimestamp: new Date(now.getTime() - Math.floor(Math.random() * 200)),
      receivedAt: now,
      dataAgeMs: Math.floor(Math.random() * 200),
      isMock: true,
    };
  }

  async getOrderBook(symbol: string, depth = 20): Promise<OrderBook> {
    const upper = symbol.toUpperCase();
    initSymbol(upper);
    nextPrice(upper); // advance state
    return generateOrderBook(upper, depth);
  }

  subscribeToTicker(
    symbol: string,
    callback: (ticker: Ticker) => void
  ): () => void {
    const upper = symbol.toUpperCase();
    initSymbol(upper);

    const interval = setInterval(async () => {
      try {
        const ticker = await this.getTicker(upper);
        callback(ticker);
      } catch {
        // swallow errors in mock
      }
    }, 1000);

    this.intervals.push(interval);
    return () => clearInterval(interval);
  }

  subscribeToOrderBook(
    symbol: string,
    callback: (orderBook: OrderBook) => void
  ): () => void {
    const upper = symbol.toUpperCase();
    initSymbol(upper);

    const interval = setInterval(async () => {
      try {
        const ob = await this.getOrderBook(upper);
        callback(ob);
      } catch {
        // swallow
      }
    }, 2000);

    this.intervals.push(interval);
    return () => clearInterval(interval);
  }

  async getSupportedSymbols(): Promise<string[]> {
    return SUPPORTED_SYMBOLS;
  }

  async ping(): Promise<boolean> {
    return true;
  }

  disconnect(): void {
    this.intervals.forEach(clearInterval);
    this.intervals = [];
  }
}
