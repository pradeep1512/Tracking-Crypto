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
  conversionRate?: number;
  conversionSource?: string;
}

export interface CryptoPriceTransparency {
  symbol: string;
  inrPrice: number;
  btcUsdtPrice: number;
  usdtInrRate: number;
  marketDataSource: string;
  conversionSource: string;
  exchangeTimestamp: string;
  receivedAt: string;
  lastUpdated: string;
  dataStatus: 'LIVE' | 'DELAYED' | 'STALE' | 'DISCONNECTED';
  referenceInrPrice?: number;
  referenceSource?: string;
  priceDifferencePct?: number;
  latencyMs: number;
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

// ─── Multi-Asset & MCX Commodity Types ────────────────────────────────────────

export type AssetCategory = 'CRYPTO' | 'MCX_COMMODITY' | 'OPTION';

export type CommodityCategory = 'PRECIOUS_METALS' | 'ENERGY' | 'BASE_METALS';

export interface MCXContractSpec {
  symbol: string;
  name: string;
  category: CommodityCategory;
  lotSize: number;
  unit: string; // e.g. "1 kg", "100 grams", "100 BBL", "1250 mmBtu", "1 MT"
  tickSize: number;
  tradingHours: string; // e.g. "09:00 - 23:30 IST"
  quoteUnit: string; // e.g. "₹ per 10 grams", "₹ per 1 kg", "₹ per BBL"
  activeExpiries: string[];
}

export interface CommodityTicker {
  symbol: string;
  contractName: string;
  category: CommodityCategory;
  expiryDate: string;
  daysToExpiry: number;
  lotSize: number;
  unit: string;
  lastPrice: number;
  bestBid: number;
  bestAsk: number;
  bidQty: number;
  askQty: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  closePrice: number;
  changeAmount: number;
  changePercentage: number;
  volume: number;
  openInterest: number;
  openInterestChange: number;
  spread: number;
  spreadPercentage: number;
  marketStatus: 'OPEN' | 'CLOSED' | 'PRE_OPEN';
  dataSource: 'MCX_OFFICIAL_FEED' | 'AUTHORIZED_BROKER' | 'DELAYED_15MIN' | 'SIMULATED';
  isLive: boolean;
  timestamp: string;
}

// ─── Options Trading & Chain Types ───────────────────────────────────────────

export type OptionType = 'CE' | 'PE';

export interface OptionContractDetails {
  id: string;
  underlying: string;
  category: AssetCategory;
  exchangeOrBroker: string;
  strikePrice: number;
  optionType: OptionType;
  expiryDate: string;
  lotSize: number;
  bidPrice: number;
  askPrice: number;
  lastTradedPrice: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  moneyness: 'ITM' | 'ATM' | 'OTM';
  source: string;
}

export interface OptionChainStrikeRow {
  strikePrice: number;
  isATM: boolean;
  call: OptionContractDetails;
  put: OptionContractDetails;
}

export interface OptionsChainData {
  underlying: string;
  underlyingPrice: number;
  category: AssetCategory;
  exchange: string;
  selectedExpiry: string;
  availableExpiries: string[];
  strikes: OptionChainStrikeRow[];
  timestamp: string;
}

// ─── Portfolio & Strategy Trading Types ────────────────────────────────────────

export type PortfolioCategory =
  | 'CRYPTO'
  | 'GOLD'
  | 'SILVER'
  | 'MCX_COMMODITY'
  | 'OPTIONS_TRADING'
  | 'MULTI_ASSET'
  | 'CUSTOM';

export type PortfolioStatus =
  | 'READY'
  | 'RUNNING'
  | 'PAUSED'
  | 'STOPPING'
  | 'STOPPED'
  | 'EXPIRED'
  | 'ERROR';

export type TradingExecutionMode = 'PAPER' | 'LIVE';

export interface PortfolioAssetAllocation {
  id: string;
  symbol: string;
  name: string;
  category: AssetCategory;
  targetAllocationPct: number;
  currentValue: number;
  currentAllocationPct: number;
}

export interface PortfolioPosition {
  id: string;
  portfolioId: string;
  symbol: string;
  name: string;
  category: AssetCategory;
  side: Side;
  optionType?: OptionType;
  strikePrice?: number;
  expiryDate?: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  investedAmount: number;
  currentMarketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  realizedPnL: number;
  stopLossPrice?: number;
  targetPrice?: number;
  totalCharges: number;
  openedAt: string;
  closedAt?: string;
  lastUpdatedAt: string;
  status: 'OPEN' | 'CLOSED';
}

export interface UserPortfolio {
  id: string;
  userId: string;
  name: string;
  description: string;
  category: PortfolioCategory;
  currency: 'INR' | 'USDT';
  initialCapital: number;
  totalCapital: number;
  allocatedCapital: number;
  availableBalance: number;
  investedAmount: number;
  currentMarketValue: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalCharges: number;
  maxInvestmentLimit: number;
  riskLimitPercentage: number;
  maxDailyLoss: number;
  reviewDate?: string;
  status: PortfolioStatus;
  executionMode: TradingExecutionMode;
  connectedBrokerId?: string;
  connectedBrokerName?: string;
  assets: PortfolioAssetAllocation[];
  positions: PortfolioPosition[];
  activePositionsCount: number;
  expiringContractsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioTransaction {
  id: string;
  portfolioId: string;
  portfolioName: string;
  orderId?: string;
  symbol: string;
  assetCategory: AssetCategory;
  side: Side;
  quantity: number;
  price: number;
  totalAmount: number;
  fees: number;
  pnl?: number;
  isPaperTrade: boolean;
  brokerOrderId?: string;
  status: OrderStatus;
  timestamp: string;
}

// ─── Broker Integration Types ────────────────────────────────────────────────

export type SupportedBroker =
  | 'ZERODHA'
  | 'ANGEL_ONE'
  | 'UPSTOX'
  | 'DHAN'
  | 'BINANCE'
  | 'COINDCX'
  | 'PAPER_SIMULATOR';

export interface BrokerAccountInfo {
  brokerId: string;
  brokerType: SupportedBroker;
  displayName: string;
  accountUserId: string;
  isConnected: boolean;
  isLiveTradingAuthorized: boolean;
  totalBalance: number;
  availableMargin: number;
  usedMargin: number;
  currency: string;
  lastSyncAt: string;
  supportedSegments: Array<'EQUITY' | 'COMMODITY' | 'CRYPTO' | 'FUTURES' | 'OPTIONS'>;
}

export interface BrokerOrderSubmission {
  portfolioId: string;
  brokerId: string;
  symbol: string;
  category: AssetCategory;
  side: Side;
  orderType: OrderType;
  quantity: number;
  price?: number;
  triggerPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  isPaperTrade: boolean;
  clientOrderId?: string;
}

// ─── Expiry Calendar & Notification Types ─────────────────────────────────────

export interface ExpiryCalendarItem {
  id: string;
  symbol: string;
  contractName: string;
  category: AssetCategory;
  expiryDate: string;
  daysRemaining: number;
  openInterest: number;
  settlementType: 'PHYSICAL_DELIVERY' | 'CASH_SETTLED';
  status: 'ACTIVE' | 'TENDER_PERIOD' | 'EXPIRED';
  rolloverEligible: boolean;
  currentLTP: number;
  userPosition?: {
    portfolioId: string;
    portfolioName: string;
    quantity: number;
    side: Side;
    pnl: number;
  };
}

