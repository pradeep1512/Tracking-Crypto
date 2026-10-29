// Centralized type definitions for TrackingCrypt

export type Side = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'POST_ONLY' | 'IOC' | 'FOK';
export type OrderStatus =
  | 'PENDING'
  | 'OPEN'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'EXPIRED';

export type GapClassification =
  | 'SPREAD'
  | 'MARKET_MOVEMENT'
  | 'LIQUIDITY'
  | 'FEES'
  | 'STALE_DATA'
  | 'SLIPPAGE'
  | 'MIXED'
  | 'UNKNOWN';

export type AlertType =
  | 'PRICE_TARGET'
  | 'MAX_BUY_EXCEEDED'
  | 'MIN_SELL_BELOW'
  | 'GAP_EXCEEDED'
  | 'DATA_STALE'
  | 'WS_DISCONNECT'
  | 'ORDER_FAIL'
  | 'FILL';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type MetricType = 'MARKET_DATA' | 'ORDER_SUBMIT' | 'ORDER_ACK' | 'ORDER_FILL';

// ─── Market Data ─────────────────────────────────────────────────────────────

export interface Ticker {
  exchangeId: string;
  exchangeName: string;
  symbol: string;
  lastPrice: number;
  bestBid: number;
  bestAsk: number;
  bidQuantity: number;
  askQuantity: number;
  spread: number;
  spreadPercentage: number;
  volume24h?: number;
  high24h?: number;
  low24h?: number;
  exchangeTimestamp: Date;
  receivedAt: Date;
  dataAgeMs: number;
  isMock: boolean;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number;
  depthPercentage: number;
}

export interface OrderBook {
  exchangeId: string;
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: Date;
  receivedAt: Date;
  dataAgeMs: number;
}

// ─── Price Gap ────────────────────────────────────────────────────────────────

export interface PriceGapAnalysis {
  referencePrice: number;
  observedPrice: number;
  estimatedExecutionPrice: number;
  gapAmount: number;
  gapPercentage: number;
  additionalCost?: number;          // for BUY orders
  side: Side;
  quantity?: number;
  dataAgeMs: number;
  classification: GapClassification;
  classificationDetails: string;
  isWithinTolerance: boolean;
  tolerancePercentage?: number;
  timestamp: Date;
}

// ─── Execution Estimation ─────────────────────────────────────────────────────

export interface ExecutionEstimate {
  symbol: string;
  side: Side;
  requestedQuantity: number;
  limitPrice?: number;
  estimatedPrice: number;
  estimatedTotal: number;
  estimatedFee: number;
  estimatedFeePercentage: number;
  slippage: number;
  slippagePercentage: number;
  fillableQuantity: number;
  unfilledQuantity: number;
  wouldFill: boolean;
  liquidityWarning?: string;
  orderBookDepthUsed: OrderBookLevel[];
  timestamp: Date;
}

// ─── Latency ──────────────────────────────────────────────────────────────────

export interface LatencyStats {
  p50: number;
  p95: number;
  p99: number;
  mean: number;
  min: number;
  max: number;
  sampleCount: number;
  metricType: MetricType;
  windowMinutes: number;
}

// ─── WebSocket Events ─────────────────────────────────────────────────────────

export interface WSTickerEvent {
  type: 'TICKER';
  data: Ticker;
}

export interface WSOrderBookEvent {
  type: 'ORDER_BOOK';
  data: OrderBook;
}

export interface WSConnectionEvent {
  type: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';
  exchangeId: string;
  message?: string;
}

export interface WSAlertEvent {
  type: 'ALERT';
  data: {
    alertType: AlertType;
    severity: AlertSeverity;
    message: string;
    triggerValue?: number;
    timestamp: Date;
  };
}

export type WSEvent = WSTickerEvent | WSOrderBookEvent | WSConnectionEvent | WSAlertEvent;

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  ticker: Ticker;
  priceGap: PriceGapAnalysis;
  latency: LatencyStats;
  recentAlerts: number;
  openOrders: number;
  recentPaperTrades: number;
}
