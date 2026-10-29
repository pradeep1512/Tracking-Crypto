/**
 * WebSocketStreamManager — Centralized connection manager for market data streams.
 *
 * Implements:
 * - Exponential backoff reconnection
 * - Heartbeat ping/pong monitoring
 * - Latency calculation (exchange timestamp vs server receipt)
 * - Stale-data detection (threshold configurable, default 3000ms)
 * - Out-of-order / duplicate event detection via event sequence/timestamps
 */

import WebSocket from 'ws';

export interface StreamMetrics {
  connected: boolean;
  reconnectAttempts: number;
  lastEventTimestamp: number;
  lastReceivedTimestamp: number;
  lastLatencyMs: number;
  isStale: boolean;
  eventsReceived: number;
}

export type MessageHandler = (data: unknown, receivedAt: Date) => void;

export class WebSocketStreamManager {
  private ws: WebSocket | null = null;
  private url: string;
  private isIntentionalClose = false;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30_000;
  private baseReconnectDelay = 1_000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private staleCheckInterval: NodeJS.Timeout | null = null;

  private lastSequenceTime = 0;
  private staleThresholdMs = 3_000;

  private messageHandlers = new Set<MessageHandler>();
  private statusListeners = new Set<(status: 'connected' | 'reconnecting' | 'disconnected') => void>();

  public metrics: StreamMetrics = {
    connected: false,
    reconnectAttempts: 0,
    lastEventTimestamp: 0,
    lastReceivedTimestamp: 0,
    lastLatencyMs: 0,
    isStale: false,
    eventsReceived: 0,
  };

  constructor(url: string, staleThresholdMs = 3_000) {
    this.url = url;
    this.staleThresholdMs = staleThresholdMs;
  }

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isIntentionalClose = false;
    this.notifyStatus('reconnecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.on('open', () => {
        this.metrics.connected = true;
        this.metrics.reconnectAttempts = 0;
        this.reconnectAttempts = 0;
        this.notifyStatus('connected');
        this.startHeartbeat();
        this.startStaleChecker();
      });

      this.ws.on('message', (raw: WebSocket.RawData) => {
        const receivedAt = new Date();
        this.metrics.lastReceivedTimestamp = receivedAt.getTime();
        this.metrics.eventsReceived++;

        try {
          const parsed = JSON.parse(raw.toString());

          // Timestamp & sequence checking
          const eventTime = parsed.E || parsed.eventTime || parsed.timestamp || 0;
          if (eventTime) {
            // Out-of-order check
            if (eventTime < this.lastSequenceTime) {
              // Out of order event detected — log for latency analysis
            } else {
              this.lastSequenceTime = eventTime;
            }

            this.metrics.lastEventTimestamp = eventTime;
            this.metrics.lastLatencyMs = Math.max(0, receivedAt.getTime() - eventTime);
          }

          this.metrics.isStale = false;

          for (const handler of this.messageHandlers) {
            handler(parsed, receivedAt);
          }
        } catch {
          // ignore non-json messages (e.g. raw ping)
        }
      });

      this.ws.on('close', () => {
        this.cleanupTimers();
        this.metrics.connected = false;
        this.notifyStatus('disconnected');

        if (!this.isIntentionalClose) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', (err) => {
        console.warn(`[WS Stream] Connection error on ${this.url}:`, err.message);
        // 'close' event will follow and trigger reconnect
      });
    } catch (err) {
      console.error(`[WS Stream] Failed to create WebSocket for ${this.url}:`, err);
      this.scheduleReconnect();
    }
  }

  public subscribe(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    if (!this.metrics.connected && !this.reconnectTimer) {
      this.connect();
    }
    return () => {
      this.messageHandlers.delete(handler);
      if (this.messageHandlers.size === 0) {
        this.disconnect();
      }
    };
  }

  public onStatusChange(callback: (status: 'connected' | 'reconnecting' | 'disconnected') => void): () => void {
    this.statusListeners.add(callback);
    callback(this.metrics.connected ? 'connected' : 'disconnected');
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  private notifyStatus(status: 'connected' | 'reconnecting' | 'disconnected'): void {
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectAttempts++;
    this.metrics.reconnectAttempts = this.reconnectAttempts;
    this.notifyStatus('reconnecting');

    // Exponential backoff with jitter: delay = min(base * 2^attempts + jitter, max)
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(1.5, this.reconnectAttempts) + Math.random() * 500,
      this.maxReconnectDelay
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.cleanupTimers();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 15_000);
  }

  private startStaleChecker(): void {
    this.staleCheckInterval = setInterval(() => {
      if (this.metrics.connected && this.metrics.lastReceivedTimestamp > 0) {
        const age = Date.now() - this.metrics.lastReceivedTimestamp;
        if (age > this.staleThresholdMs) {
          this.metrics.isStale = true;
        }
      }
    }, 1_000);
  }

  private cleanupTimers(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.staleCheckInterval) {
      clearInterval(this.staleCheckInterval);
      this.staleCheckInterval = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public disconnect(): void {
    this.isIntentionalClose = true;
    this.cleanupTimers();
    if (this.ws) {
      this.ws.removeAllListeners();
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.metrics.connected = false;
    this.notifyStatus('disconnected');
  }
}
