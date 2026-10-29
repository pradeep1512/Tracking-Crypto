'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Ticker, OrderBook } from '@/types';

interface UseMarketStreamOptions {
  symbol: string;
  exchangeId?: string;
  enabled?: boolean;
}

export interface StreamState {
  ticker: Ticker | null;
  orderBook: OrderBook | null;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  latencyMs: number;
  lastUpdated: Date | null;
  isStale: boolean;
}

export function useMarketStream({
  symbol,
  exchangeId = 'binance',
  enabled = true,
}: UseMarketStreamOptions) {
  const [state, setState] = useState<StreamState>({
    ticker: null,
    orderBook: null,
    status: 'connecting',
    latencyMs: 0,
    lastUpdated: null,
    isStale: false,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState((prev) => ({ ...prev, status: 'connecting' }));

    const url = `/api/market/stream?symbol=${encodeURIComponent(symbol)}&exchange=${encodeURIComponent(exchangeId)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      setState((prev) => ({ ...prev, status: 'connected' }));
    });

    es.addEventListener('ticker', (e) => {
      try {
        const ticker: Ticker = JSON.parse(e.data);
        const now = new Date();
        const latency = ticker.exchangeTimestamp
          ? Math.max(0, now.getTime() - new Date(ticker.exchangeTimestamp).getTime())
          : 0;

        setState((prev) => ({
          ...prev,
          ticker,
          status: 'connected',
          latencyMs: latency,
          lastUpdated: now,
          isStale: false,
        }));
      } catch (err) {
        console.error('[useMarketStream] Failed to parse ticker:', err);
      }
    });

    es.addEventListener('orderbook', (e) => {
      try {
        const orderBook: OrderBook = JSON.parse(e.data);
        setState((prev) => ({
          ...prev,
          orderBook,
          status: 'connected',
          lastUpdated: new Date(),
        }));
      } catch (err) {
        console.error('[useMarketStream] Failed to parse orderbook:', err);
      }
    });

    es.addEventListener('error', () => {
      setState((prev) => ({ ...prev, status: 'error', isStale: true }));
      es.close();
      eventSourceRef.current = null;

      // Reconnect after 3 seconds
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, 3000);
      }
    });
  }, [symbol, exchangeId, enabled]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  return state;
}
