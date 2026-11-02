/**
 * DeltaExchangeAdapter — Official Delta Exchange India Market Data Adapter.
 *
 * Implements:
 * - Real-time REST endpoints (GET /v2/tickers/:symbol, GET /v2/l2orderbook/:symbol)
 * - Persistent WebSocket streams (v2/ticker, l2_orderbook)
 * - Exchange latency tracking (exchange event timestamp vs server receive time)
 * - Reconnection with exponential backoff & heartbeat monitoring
 * - Sole source of truth for crypto market & derivatives data (no third-party vendor mixing)
 * - Native USD quote currency (no INR conversion)
 */

import type { ExchangeAdapter } from './ExchangeAdapter';
import type { Ticker, OrderBook, OrderBookLevel } from '@/types';
import { WebSocketStreamManager } from '../websocket/WebSocketStreamManager';
import { deltaExchangeService } from '@/services/DeltaExchangeService';

export class DeltaExchangeAdapter implements ExchangeAdapter {
  readonly id = 'delta';
  readonly displayName = 'Delta Exchange India';
  readonly isMock = false;

  private streamManagers = new Map<string, WebSocketStreamManager>();

  private normalizeSymbol(symbol: string): string {
    const clean = symbol.toUpperCase().trim();
    if (clean === 'BTCUSDT' || clean === 'BTCINR') return 'BTCUSD';
    if (clean === 'ETHUSDT' || clean === 'ETHINR') return 'ETHUSD';
    return clean;
  }

  async getTicker(symbol: string): Promise<Ticker> {
    const deltaSymbol = this.normalizeSymbol(symbol);
    return await deltaExchangeService.getTicker(deltaSymbol);
  }

  async getOrderBook(symbol: string, depth = 20): Promise<OrderBook> {
    const deltaSymbol = this.normalizeSymbol(symbol);
    return await deltaExchangeService.getOrderBook(deltaSymbol, depth);
  }

  subscribeToTicker(symbol: string, callback: (ticker: Ticker) => void): () => void {
    const deltaSymbol = this.normalizeSymbol(symbol);
    const wsUrl = deltaExchangeService.productionWsUrl;

    let manager = this.streamManagers.get(`ticker_${deltaSymbol}`);
    if (!manager) {
      manager = new WebSocketStreamManager(wsUrl);

      // Subscribe payload on connection and reconnect
      manager.onOpen(() => {
        manager?.send(
          JSON.stringify({
            type: 'subscribe',
            payload: {
              channels: [{ name: 'v2/ticker', symbols: [deltaSymbol] }],
            },
          })
        );
      });

      this.streamManagers.set(`ticker_${deltaSymbol}`, manager);
    }

    return manager.subscribe((rawMessage, receivedAt) => {
      try {
        const msg = rawMessage as {
          type?: string;
          symbol?: string;
          close?: number;
          mark_price?: string | number;
          quotes?: {
            best_bid?: string | number;
            best_ask?: string | number;
            bid_size?: string | number;
            ask_size?: string | number;
          };
          volume?: number;
          high?: number;
          low?: number;
          timestamp?: number;
        };

        if (msg.symbol === deltaSymbol && (msg.close !== undefined || msg.mark_price !== undefined)) {
          const lastPrice = Number(msg.close || msg.mark_price || 0);
          const bestBid = Number(msg.quotes?.best_bid || lastPrice);
          const bestAsk = Number(msg.quotes?.best_ask || lastPrice);
          const spread = Math.max(0, bestAsk - bestBid);
          const spreadPercentage = lastPrice > 0 ? (spread / lastPrice) * 100 : 0;
          const exchangeTimestamp = msg.timestamp ? new Date(Number(msg.timestamp) / 1000) : receivedAt;
          const dataAgeMs = Math.max(0, receivedAt.getTime() - exchangeTimestamp.getTime());

          callback({
            exchangeId: this.id,
            exchangeName: this.displayName,
            symbol: deltaSymbol,
            lastPrice,
            bestBid,
            bestAsk,
            bidQuantity: Number(msg.quotes?.bid_size || 0),
            askQuantity: Number(msg.quotes?.ask_size || 0),
            spread,
            spreadPercentage,
            volume24h: Number(msg.volume || 0),
            high24h: msg.high ? Number(msg.high) : undefined,
            low24h: msg.low ? Number(msg.low) : undefined,
            exchangeTimestamp,
            receivedAt,
            dataAgeMs,
            isMock: false,
          });
        }
      } catch (err) {
        console.error('[DeltaExchangeAdapter] Error parsing ticker message:', err);
      }
    });
  }

  subscribeToOrderBook(symbol: string, callback: (orderBook: OrderBook) => void): () => void {
    const deltaSymbol = this.normalizeSymbol(symbol);
    const wsUrl = deltaExchangeService.productionWsUrl;

    let manager = this.streamManagers.get(`orderbook_${deltaSymbol}`);
    if (!manager) {
      manager = new WebSocketStreamManager(wsUrl);

      manager.onOpen(() => {
        manager?.send(
          JSON.stringify({
            type: 'subscribe',
            payload: {
              channels: [{ name: 'l2_orderbook', symbols: [deltaSymbol] }],
            },
          })
        );
      });

      this.streamManagers.set(`orderbook_${deltaSymbol}`, manager);
    }

    return manager.subscribe((rawMessage, receivedAt) => {
      try {
        const msg = rawMessage as {
          type?: string;
          symbol?: string;
          buy?: Array<{ limit_price?: string; price?: string; size: number }>;
          sell?: Array<{ limit_price?: string; price?: string; size: number }>;
          last_updated_at?: number;
        };

        if (msg.symbol === deltaSymbol && (msg.buy || msg.sell)) {
          const rawBids = msg.buy || [];
          const rawAsks = msg.sell || [];

          let cumBidTotal = 0;
          const bids: OrderBookLevel[] = rawBids.slice(0, 20).map((b) => {
            const price = Number(b.limit_price || b.price || 0);
            const quantity = Number(b.size || 0);
            cumBidTotal += quantity;
            return {
              price,
              quantity,
              total: cumBidTotal,
              depthPercentage: 0,
            };
          });

          let cumAskTotal = 0;
          const asks: OrderBookLevel[] = rawAsks.slice(0, 20).map((a) => {
            const price = Number(a.limit_price || a.price || 0);
            const quantity = Number(a.size || 0);
            cumAskTotal += quantity;
            return {
              price,
              quantity,
              total: cumAskTotal,
              depthPercentage: 0,
            };
          });

          const maxTotal = Math.max(cumBidTotal, cumAskTotal, 1);
          bids.forEach((b) => (b.depthPercentage = Math.round((b.total / maxTotal) * 100)));
          asks.forEach((a) => (a.depthPercentage = Math.round((a.total / maxTotal) * 100)));

          const timestamp = msg.last_updated_at ? new Date(Number(msg.last_updated_at) / 1000) : receivedAt;
          const dataAgeMs = Math.max(0, receivedAt.getTime() - timestamp.getTime());

          callback({
            exchangeId: this.id,
            symbol: deltaSymbol,
            bids,
            asks,
            timestamp,
            receivedAt,
            dataAgeMs,
          });
        }
      } catch (err) {
        console.error('[DeltaExchangeAdapter] Error parsing orderbook message:', err);
      }
    });
  }

  async getSupportedSymbols(): Promise<string[]> {
    return ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'DOGEUSD'];
  }

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${deltaExchangeService.productionRestUrl}/v2/products?page_size=1`, {
        cache: 'no-store',
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  disconnect(): void {
    for (const manager of this.streamManagers.values()) {
      manager.disconnect();
    }
    this.streamManagers.clear();
  }
}
