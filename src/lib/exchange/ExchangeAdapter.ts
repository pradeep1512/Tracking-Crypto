import type { Ticker, OrderBook } from '@/types';

/**
 * Base interface every exchange adapter must implement.
 * Real adapters connect to live exchange APIs.
 * The MockExchangeAdapter simulates data for development.
 */
export interface ExchangeAdapter {
  readonly id: string;
  readonly displayName: string;
  readonly isMock: boolean;

  /** Fetch current ticker for a symbol */
  getTicker(symbol: string): Promise<Ticker>;

  /** Fetch order book snapshot */
  getOrderBook(symbol: string, depth?: number): Promise<OrderBook>;

  /** Subscribe to ticker updates via WebSocket (returns cleanup fn) */
  subscribeToTicker(
    symbol: string,
    callback: (ticker: Ticker) => void
  ): () => void;

  /** Subscribe to order book updates (returns cleanup fn) */
  subscribeToOrderBook(
    symbol: string,
    callback: (orderBook: OrderBook) => void
  ): () => void;

  /** Get list of supported symbols */
  getSupportedSymbols(): Promise<string[]>;

  /** Check connectivity */
  ping(): Promise<boolean>;

  /** Clean up WebSocket connections */
  disconnect(): void;
}
