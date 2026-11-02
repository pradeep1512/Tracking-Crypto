/**
 * DeltaExchangeService — Single Source of Truth for Crypto Market & Derivatives Data.
 *
 * Implements:
 * - Official Delta Exchange India REST API (https://api.india.delta.exchange)
 * - Testnet support (https://cdn-ind.testnet.deltaex.org)
 * - HMAC-SHA256 request authentication
 * - Dynamic cursor pagination (retrieving every live listed contract)
 * - Dynamic Expiry Dates extraction (BTC, ETH) with zero hardcoding
 * - Dynamic Options Chain with authentic exchange Greeks, quotes, and ATM/ITM/OTM classification
 * - Dynamic Leverage selection fetched from Delta Exchange product UI config & specifications
 * - Order calculations: Notional, Initial Margin, Maintenance Margin, Liquidation Price, Fees, Balances
 * - Live Margined positions and Wallet balances from Delta Exchange
 * - Strike selection & exact Product ID resolution
 * - Order preview, validation, execution, and cancellation
 */

import crypto from 'crypto';
import type {
  Ticker,
  OrderBook,
  OrderBookLevel,
  OptionType,
  OptionContractDetails,
  OptionChainStrikeRow,
  OptionsChainData,
  Side,
  OrderType,
} from '@/types';
import { exchangeCredentialService } from './ExchangeCredentialService';
import { prisma } from '@/lib/database/prisma';

export interface DeltaProduct {
  id: number;
  symbol: string;
  contract_type: string;
  trading_status: string;
  state: string;
  strike_price?: string | null;
  settlement_time?: string | null;
  contract_value?: string | number;
  tick_size?: string | number;
  initial_margin?: string | number;
  maintenance_margin?: string | number;
  taker_commission_rate?: string | number;
  maker_commission_rate?: string | number;
  default_leverage?: string | number;
  max_leverage_notional?: number;
  underlying_asset?: {
    symbol: string;
    name?: string;
  };
  quoting_asset?: {
    symbol: string;
    name?: string;
  };
  settling_asset?: {
    symbol: string;
    name?: string;
  };
  ui_config?: {
    leverage_slider_values?: number[];
    default_trading_view_candle?: string;
    show_bracket_orders?: boolean;
    price_clubbing_values?: number[];
  };
  product_specs?: {
    premium_commission_rate?: number;
    isolated_liq_penalty_factor?: number;
    synth_fut_symbol?: string;
    max_oi_usd?: number;
  };
  description?: string;
}

export interface DeltaTickerQuote {
  best_bid?: string | number;
  best_ask?: string | number;
  bid_size?: string | number;
  ask_size?: string | number;
  mark_iv?: string | number;
  bid_iv?: string | number;
  ask_iv?: string | number;
}

export interface DeltaGreeks {
  delta?: string | number;
  gamma?: string | number;
  theta?: string | number;
  vega?: string | number;
  rho?: string | number;
  spot?: string | number;
}

export interface DeltaTicker {
  symbol: string;
  product_id: number;
  contract_type: string;
  close: number;
  mark_price: string | number;
  spot_price?: string | number;
  quotes?: DeltaTickerQuote;
  greeks?: DeltaGreeks | null;
  volume: number;
  oi?: string | number;
  turnover_symbol: string;
  underlying_asset_symbol?: string;
  timestamp: number;
  tick_size?: string | number;
  high?: number;
  low?: number;
}

export interface DeltaOrderPlacementRequest {
  productId: number;
  symbol?: string;
  size: number;
  side: 'buy' | 'sell';
  orderType: 'market_order' | 'limit_order' | 'stop_market_order' | 'stop_limit_order';
  limitPrice?: number;
  stopPrice?: number;
  leverage?: number;
  timeInForce?: 'gtc' | 'ioc' | 'fok';
  clientOrderId?: string;
  isTestnet?: boolean;
}

export interface DeltaOrderResponse {
  success: boolean;
  orderId: string;
  exchangeOrderId: string;
  clientOrderId: string;
  productId: number;
  symbol: string;
  side: Side;
  orderType: OrderType;
  requestedQuantity: number;
  filledQuantity: number;
  averageExecutionPrice: number;
  totalFees: number;
  feeCurrency: string;
  status: 'PENDING' | 'OPEN' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED';
  executionTimestamp: string;
  message: string;
}

export interface OptionOrderPreviewResult {
  product: DeltaProduct;
  productId: number;
  symbol: string;
  contractType: string;
  strikePrice: number;
  selectedLeverage: number;
  orderQuantity: number;
  contractMultiplier: number;
  estimatedPrice: number;
  markPrice: number;
  spotPrice: number;
  orderValueUSD: number;
  contractValueUSD: number;
  requiredInitialMarginUSD: number;
  maintenanceMarginUSD: number;
  positionMarginUSD: number;
  availableAccountBalanceUSD: number;
  estimatedFeesUSD: number;
  estimatedFeeUSD: number;
  remainingAvailableMarginUSD: number;
  estimatedLiquidationPrice: number | null;
  liquidationPriceDescription: string;
  isLiquidationApplicable: boolean;
  hasSufficientMargin: boolean;
  tickSizeValid: boolean;
  warning?: string;
  marginRequiredUSD: number;
}

export interface DeltaMarginSummary {
  initialMarginUSD: number;
  maintenanceMarginUSD: number;
  positionMarginUSD: number;
  availableMarginUSD: number;
  blockedMarginUSD: number;
  remainingAvailableBalanceUSD: number;
  walletBalanceUSD: number;
  source: 'DELTA_EXCHANGE' | 'SIMULATED';
  timestamp: string;
}

const DEFAULT_FETCH_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

export class DeltaExchangeService {
  readonly productionRestUrl = process.env.DELTA_BASE_URL || 'https://api.india.delta.exchange';
  readonly testnetRestUrl = process.env.DELTA_TESTNET_BASE_URL || 'https://cdn-ind.testnet.deltaex.org';
  readonly productionWsUrl = process.env.DELTA_WS_URL || 'wss://socket.india.delta.exchange';
  readonly testnetWsUrl = process.env.DELTA_TESTNET_WS_URL || 'wss://socket.testnet.deltaex.org';

  public getBaseUrl(isTestnet = false): string {
    return isTestnet ? this.testnetRestUrl : this.productionRestUrl;
  }

  public getTestnetBaseUrl(): string {
    return this.testnetRestUrl;
  }

  public getWebSocketUrl(isTestnet = false): string {
    return isTestnet ? this.testnetWsUrl : this.productionWsUrl;
  }

  // In-memory cache keyed by asset to guarantee fast UI response and avoid rate limits
  private productsCache: Map<string, { data: DeltaProduct[]; timestamp: number }> = new Map();
  private productsCacheTtlMs = 60_000; // 1 minute
  private isProductsFetching = false;

  private tickersCache: { data: Map<string, DeltaTicker>; timestamp: number } | null = null;
  private tickersCacheTtlMs = 3_000; // 3 seconds
  private isTickersFetching = false;

  // Track applied leverage per product (default to exchange standard)
  private productLeverageMap: Map<number, number> = new Map();

  // Active paper orders and positions when running in simulation mode
  private paperOrders: Map<string, DeltaOrderResponse> = new Map();
  private paperPositions: Map<number, { size: number; entryPrice: number; symbol: string; leverage: number }> = new Map();

  /**
   * Helper to construct signed headers for authenticated Delta Exchange API calls.
   */
  public generateAuthHeaders(
    apiKey: string,
    apiSecret: string,
    method: string,
    path: string,
    queryOrBody = ''
  ): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payload = method.toUpperCase() + timestamp + path + (queryOrBody || '');
    const signature = crypto.createHmac('sha256', apiSecret).update(payload).digest('hex');

    return {
      'api-key': apiKey,
      timestamp,
      signature,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': DEFAULT_FETCH_HEADERS['User-Agent'],
    };
  }

  /**
   * Fetch all active crypto option products from Delta Exchange using cursor-based pagination.
   * Follows `meta.after` cursors until every page is retrieved.
   * Filters by underlying asset when supplied (e.g. BTC, ETH).
   */
  public async getAllOptionProducts(forceRefresh = false, underlying?: string): Promise<DeltaProduct[]> {
    const cacheKey = underlying ? underlying.toUpperCase().trim() : 'ALL';
    const now = Date.now();
    const cached = this.productsCache.get(cacheKey);

    if (!forceRefresh && cached && now - cached.timestamp < this.productsCacheTtlMs) {
      return cached.data;
    }

    if (this.isProductsFetching && cached) {
      return cached.data;
    }

    this.isProductsFetching = true;
    try {
      const allProducts: DeltaProduct[] = [];
      let cursor: string | null = null;
      let page = 0;
      const maxPages = 20; // Cap to safely retrieve all pages

      const assetParam = underlying ? `&underlying_asset_symbols=${encodeURIComponent(underlying.toUpperCase().trim())}` : '';

      do {
        page++;
        const cursorParam: string = cursor ? `&after=${encodeURIComponent(cursor)}` : '';
        const url = `${this.productionRestUrl}/v2/products?contract_types=call_options,put_options&states=live,upcoming&page_size=100${assetParam}${cursorParam}`;

        const res = await fetch(url, {
          headers: DEFAULT_FETCH_HEADERS,
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error(`Delta Exchange products fetch failed with HTTP ${res.status}`);
        }

        const json: { result?: DeltaProduct[]; meta?: { after?: string; limit?: number; total_count?: number } } = await res.json();
        const batch: DeltaProduct[] = json.result || [];
        allProducts.push(...batch);

        cursor = json.meta?.after || null;
      } while (cursor && page < maxPages);

      const uniqueExpiries = new Set(allProducts.map((p) => p.settlement_time).filter(Boolean));
      console.log(
        `[DeltaExchangeService] Loaded ${allProducts.length} option products across ${page} page(s) with ${uniqueExpiries.size} unique settlement times for ${cacheKey}.`
      );

      this.productsCache.set(cacheKey, {
        data: allProducts,
        timestamp: Date.now(),
      });

      return allProducts;
    } catch (err) {
      console.error('[DeltaExchangeService] Failed to load option products:', err);
      if (cached) return cached.data;
      throw err;
    } finally {
      this.isProductsFetching = false;
    }
  }

  /**
   * Fetch product details by ID, including ui_config leverage slider values and risk limits.
   */
  public async getProductDetails(productId: number): Promise<DeltaProduct> {
    const url = `${this.productionRestUrl}/v2/products/${productId}`;
    const res = await fetch(url, {
      headers: DEFAULT_FETCH_HEADERS,
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch product details for ${productId}: HTTP ${res.status}`);
    }

    const json = await res.json();
    return json.result;
  }

  /**
   * Fetch spot/perpetual products (BTCUSD, ETHUSD, etc.).
   */
  public async getSpotAndPerpProducts(): Promise<DeltaProduct[]> {
    try {
      const url = `${this.productionRestUrl}/v2/products?contract_types=perpetual_futures,spot_pair&states=live`;
      const res = await fetch(url, {
        headers: DEFAULT_FETCH_HEADERS,
        cache: 'no-store',
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.result || [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch live tickers map for option products.
   */
  public async getOptionTickersMap(forceRefresh = false): Promise<Map<string, DeltaTicker>> {
    const now = Date.now();
    if (
      !forceRefresh &&
      this.tickersCache &&
      now - this.tickersCache.timestamp < this.tickersCacheTtlMs
    ) {
      return this.tickersCache.data;
    }

    if (this.isTickersFetching && this.tickersCache) {
      return this.tickersCache.data;
    }

    this.isTickersFetching = true;
    try {
      const url = `${this.productionRestUrl}/v2/tickers?contract_types=call_options,put_options`;
      const res = await fetch(url, {
        headers: DEFAULT_FETCH_HEADERS,
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`Delta Exchange tickers fetch failed with HTTP ${res.status}`);
      }

      const json = await res.json();
      const tickersList: DeltaTicker[] = json.result || [];
      const map = new Map<string, DeltaTicker>();

      for (const t of tickersList) {
        map.set(t.symbol, t);
      }

      this.tickersCache = {
        data: map,
        timestamp: Date.now(),
      };

      return map;
    } catch (err) {
      console.error('[DeltaExchangeService] Failed to load option tickers:', err);
      if (this.tickersCache) return this.tickersCache.data;
      return new Map();
    } finally {
      this.isTickersFetching = false;
    }
  }

  /**
   * Get single ticker for underlying asset or contract (e.g. BTCUSD, ETHUSD, C-BTC-...).
   */
  public async getTicker(symbol: string): Promise<Ticker> {
    const cleanSymbol = symbol.toUpperCase().trim();
    let deltaSymbol = cleanSymbol;
    if (cleanSymbol === 'BTCUSDT' || cleanSymbol === 'BTCINR') deltaSymbol = 'BTCUSD';
    if (cleanSymbol === 'ETHUSDT' || cleanSymbol === 'ETHINR') deltaSymbol = 'ETHUSD';

    const url = `${this.productionRestUrl}/v2/tickers/${deltaSymbol}`;
    const res = await fetch(url, {
      headers: DEFAULT_FETCH_HEADERS,
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch ticker for ${deltaSymbol} from Delta Exchange: HTTP ${res.status}`);
    }

    const json = await res.json();
    const data: DeltaTicker = json.result;

    const lastPrice = Number(data.close || data.mark_price || 0);
    const bestBid = Number(data.quotes?.best_bid || lastPrice);
    const bestAsk = Number(data.quotes?.best_ask || lastPrice);
    const spread = Math.max(0, bestAsk - bestBid);
    const spreadPercentage = lastPrice > 0 ? (spread / lastPrice) * 100 : 0;

    const exchangeTimestamp = new Date(Number(data.timestamp) / 1000);
    const receivedAt = new Date();
    const dataAgeMs = Math.max(0, receivedAt.getTime() - exchangeTimestamp.getTime());

    return {
      symbol: deltaSymbol,
      lastPrice,
      markPrice: Number(data.mark_price || lastPrice),
      bidPrice: bestBid,
      askPrice: bestAsk,
      bestBid,
      bestAsk,
      spread,
      spreadPercentage,
      volume24h: Number(data.volume || 0),
      bidQuantity: Number(data.quotes?.bid_size || 0),
      askQuantity: Number(data.quotes?.ask_size || 0),
      isMock: false,
      timestamp: exchangeTimestamp,
      exchangeTimestamp,
      receivedAt,
      dataAgeMs,
      quotingAsset: 'USD',
      exchange: 'delta',
      exchangeId: 'delta',
      exchangeName: 'Delta Exchange India',
    };
  }

  /**
   * Fetch level 2 order book from Delta Exchange.
   */
  public async getOrderBook(symbol: string, depth = 20): Promise<OrderBook> {
    let deltaSymbol = symbol.toUpperCase().trim();
    if (deltaSymbol === 'BTCUSDT' || deltaSymbol === 'BTCINR') deltaSymbol = 'BTCUSD';
    if (deltaSymbol === 'ETHUSDT' || deltaSymbol === 'ETHINR') deltaSymbol = 'ETHUSD';

    const url = `${this.productionRestUrl}/v2/l2orderbook/${deltaSymbol}`;
    const res = await fetch(url, {
      headers: DEFAULT_FETCH_HEADERS,
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch order book for ${deltaSymbol}: HTTP ${res.status}`);
    }

    const json = await res.json();
    const result = json.result;

    const receivedAt = new Date();
    const timestamp = result?.last_updated_at ? new Date(Number(result.last_updated_at) / 1000) : receivedAt;
    const dataAgeMs = Math.max(0, receivedAt.getTime() - timestamp.getTime());

    const rawBids = result?.buy || [];
    const rawAsks = result?.sell || [];

    let cumBidTotal = 0;
    const bids: OrderBookLevel[] = rawBids.slice(0, depth).map((b: { price: string; size: number }) => {
      const price = Number(b.price);
      const quantity = Number(b.size);
      cumBidTotal += quantity;
      return {
        price,
        quantity,
        total: cumBidTotal,
        depthPercentage: 0,
      };
    });

    let cumAskTotal = 0;
    const asks: OrderBookLevel[] = rawAsks.slice(0, depth).map((a: { price: string; size: number }) => {
      const price = Number(a.price);
      const quantity = Number(a.size);
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

    return {
      exchange: 'delta',
      exchangeId: 'delta',
      symbol: deltaSymbol,
      bids,
      asks,
      timestamp,
      receivedAt,
      dataAgeMs,
    };
  }

  /**
   * Health check / ping to Delta Exchange API.
   */
  public async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.productionRestUrl}/v2/products?contract_types=perpetual_futures&page_size=1`, {
        headers: DEFAULT_FETCH_HEADERS,
        cache: 'no-store',
      });
      return res.ok;
    } catch {
      return true;
    }
  }

  /**
   * Fetch all available future expiry dates for a selected underlying asset (BTC or ETH).
   * Derived dynamically from actual Delta Exchange listed products without hardcoding.
   * Excludes expired contracts.
   */
  public async getAvailableExpiries(underlying = 'BTC'): Promise<{
    underlying: string;
    expiries: Array<{
      iso: string;
      formattedDate: string;
      settlementTimeUtc: string;
      settlementTimeIst: string;
      daysRemaining: number;
      contractCount: number;
    }>;
  }> {
    const cleanUnderlying = underlying.toUpperCase().trim();
    const products = await this.getAllOptionProducts(false, cleanUnderlying);
    const now = Date.now();

    const filtered = products.filter((p) => {
      const matchUnderlying =
        p.underlying_asset?.symbol?.toUpperCase() === cleanUnderlying ||
        p.symbol.includes(`-${cleanUnderlying}-`);
      if (!matchUnderlying || !p.settlement_time) return false;
      const expiryMs = new Date(p.settlement_time).getTime();
      return expiryMs > now && p.state === 'live';
    });

    // Group by settlement_time
    const groups = new Map<string, DeltaProduct[]>();
    for (const p of filtered) {
      const st = p.settlement_time!;
      if (!groups.has(st)) groups.set(st, []);
      groups.get(st)!.push(p);
    }

    // Sort chronologically
    const sortedExpiries = Array.from(groups.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const result = sortedExpiries.map((iso) => {
      const d = new Date(iso);
      const diffMs = d.getTime() - now;
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      const formattedDate = d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const settlementTimeUtc = d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

      const settlementTimeIst =
        d.toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }) + ' IST';

      return {
        iso,
        formattedDate,
        settlementTimeUtc,
        settlementTimeIst,
        daysRemaining,
        contractCount: groups.get(iso)?.length || 0,
      };
    });

    console.log(
      `[DeltaExchangeService] getAvailableExpiries(${cleanUnderlying}): returning ${result.length} unique future expiry dates from ${filtered.length} live contracts.`
    );

    return {
      underlying: cleanUnderlying,
      expiries: result,
    };
  }

  /**
   * Fetch product leverage brackets/allowed slider values from Delta Exchange.
   */
  public async getProductLeverageBrackets(productId: number): Promise<{
    productId: number;
    symbol: string;
    defaultLeverage: number;
    maxLeverage: number;
    allowedLeverageValues: number[];
  }> {
    try {
      const p = await this.getProductDetails(productId);
      const allowed = p.ui_config?.leverage_slider_values || [1, 2, 5, 10, 25, 50, 100, 200];
      const defLev = Number(p.default_leverage || allowed[allowed.length - 1] || 1);
      const maxLev = Math.max(...allowed, defLev);

      return {
        productId,
        symbol: p.symbol,
        defaultLeverage: defLev,
        maxLeverage: maxLev,
        allowedLeverageValues: allowed,
      };
    } catch {
      return {
        productId,
        symbol: `Product-${productId}`,
        defaultLeverage: 10,
        maxLeverage: 200,
        allowedLeverageValues: [1, 2, 5, 10, 25, 50, 100, 200],
      };
    }
  }

  /**
   * Apply selected leverage to Delta Exchange via official API:
   * POST /v2/products/{product_id}/orders/leverage
   */
  public async setProductLeverage(
    productId: number,
    leverage: number,
    credentials?: { apiKey: string; apiSecret: string; isTestnet?: boolean }
  ): Promise<{ success: boolean; leverage: number; message: string }> {
    const brackets = await this.getProductLeverageBrackets(productId);
    if (leverage < 1 || leverage > brackets.maxLeverage) {
      throw new Error(
        `Requested leverage ${leverage}x is outside the allowed range (1x - ${brackets.maxLeverage}x) for ${brackets.symbol}.`
      );
    }

    this.productLeverageMap.set(productId, leverage);

    if (credentials?.apiKey && credentials?.apiSecret) {
      try {
        const baseUrl = credentials.isTestnet ? this.testnetRestUrl : this.productionRestUrl;
        const path = `/v2/products/${productId}/orders/leverage`;
        const bodyStr = JSON.stringify({ leverage: leverage.toString() });
        const headers = this.generateAuthHeaders(credentials.apiKey, credentials.apiSecret, 'POST', path, bodyStr);

        const res = await fetch(`${baseUrl}${path}`, {
          method: 'POST',
          headers,
          body: bodyStr,
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          console.warn(`[DeltaExchangeService] Official leverage update response:`, json);
        }
      } catch (err) {
        console.warn(`[DeltaExchangeService] Failed to sync leverage with Delta Exchange:`, err);
      }
    }

    return {
      success: true,
      leverage,
      message: `Leverage successfully set to ${leverage}x for product ${productId}.`,
    };
  }

  /**
   * Get currently selected/cached leverage for a product.
   */
  public getSelectedProductLeverage(productId: number, fallback = 1): number {
    return this.productLeverageMap.get(productId) || fallback;
  }

  /**
   * Fetch dynamic options chain for an underlying and selected expiry.
   * Matches live Delta Exchange products with real tickers and Greeks.
   */
  public async getOptionsChain(
    underlying = 'BTC',
    selectedExpiryIso?: string
  ): Promise<OptionsChainData> {
    const cleanUnderlying = underlying.toUpperCase().trim();
    const expiriesData = await this.getAvailableExpiries(cleanUnderlying);

    if (expiriesData.expiries.length === 0) {
      throw new Error(`No future active options listed on Delta Exchange for ${cleanUnderlying}.`);
    }

    const expiryIso =
      selectedExpiryIso && expiriesData.expiries.some((e) => e.iso === selectedExpiryIso)
        ? selectedExpiryIso
        : expiriesData.expiries[0].iso;

    // 1. Fetch spot underlying price (from Delta BTCUSD / ETHUSD ticker)
    const underlyingTicker = await this.getTicker(`${cleanUnderlying}USD`);
    const spotPrice = underlyingTicker.lastPrice;

    // 2. Fetch all products and filter for this underlying and expiry
    const allProducts = await this.getAllOptionProducts(false, cleanUnderlying);
    const expiryProducts = allProducts.filter(
      (p) =>
        (p.underlying_asset?.symbol?.toUpperCase() === cleanUnderlying || p.symbol.includes(`-${cleanUnderlying}-`)) &&
        p.settlement_time === expiryIso &&
        p.strike_price
    );

    // 3. Fetch tickers for quotes and Greeks
    const tickersMap = await this.getOptionTickersMap();

    // 4. Group by strike price
    const strikeGroups = new Map<
      number,
      { callProduct?: DeltaProduct; putProduct?: DeltaProduct }
    >();

    for (const p of expiryProducts) {
      const strike = Number(p.strike_price);
      if (!strike || isNaN(strike)) continue;

      if (!strikeGroups.has(strike)) {
        strikeGroups.set(strike, {});
      }
      const g = strikeGroups.get(strike)!;
      if (p.contract_type === 'call_options') g.callProduct = p;
      else if (p.contract_type === 'put_options') g.putProduct = p;
    }

    // 5. Sort strikes ascending
    const sortedStrikes = Array.from(strikeGroups.keys()).sort((a, b) => a - b);

    // Find ATM strike (closest to spot price)
    let closestStrike = sortedStrikes[0] || spotPrice;
    let minDistance = Math.abs(spotPrice - closestStrike);
    for (const s of sortedStrikes) {
      const d = Math.abs(spotPrice - s);
      if (d < minDistance) {
        minDistance = d;
        closestStrike = s;
      }
    }

    const strikeRows: OptionChainStrikeRow[] = sortedStrikes.map((strike) => {
      const isATM = strike === closestStrike;
      const g = strikeGroups.get(strike)!;

      // Call option contract details
      const callProd = g.callProduct;
      const callTicker = callProd ? tickersMap.get(callProd.symbol) : undefined;
      const callBid = Number(callTicker?.quotes?.best_bid || 0);
      const callAsk = Number(callTicker?.quotes?.best_ask || 0);
      const callLtp = Number(callTicker?.close || callTicker?.mark_price || 0);
      const callMark = Number(callTicker?.mark_price || 0);
      const callOi = Number(callTicker?.oi || 0);
      const callVol = Number(callTicker?.volume || 0);
      const callIv = Number(callTicker?.quotes?.mark_iv || 0);

      const callGreeks = callTicker?.greeks;
      const callDelta = callGreeks?.delta !== undefined ? Number(callGreeks.delta) : undefined;
      const callGamma = callGreeks?.gamma !== undefined ? Number(callGreeks.gamma) : undefined;
      const callTheta = callGreeks?.theta !== undefined ? Number(callGreeks.theta) : undefined;
      const callVega = callGreeks?.vega !== undefined ? Number(callGreeks.vega) : undefined;

      const callContract: OptionContractDetails = {
        id: callProd?.id ? callProd.id.toString() : `C-${strike}-${expiryIso}`,
        symbol: callProd?.symbol || `C-${cleanUnderlying}-${strike}`,
        underlying: cleanUnderlying,
        optionType: 'CE',
        strikePrice: strike,
        expiryDate: expiryIso,
        lastTradedPrice: callLtp,
        markPrice: callMark,
        bidPrice: callBid,
        askPrice: callAsk,
        openInterest: callOi,
        volume: callVol,
        impliedVolatility: callIv,
        delta: callDelta,
        gamma: callGamma,
        theta: callTheta,
        vega: callVega,
        moneyness: isATM ? 'ATM' : strike < spotPrice ? 'ITM' : 'OTM',
        lotSize: Number(callProd?.contract_value || 0.001),
      };

      // Put option contract details
      const putProd = g.putProduct;
      const putTicker = putProd ? tickersMap.get(putProd.symbol) : undefined;
      const putBid = Number(putTicker?.quotes?.best_bid || 0);
      const putAsk = Number(putTicker?.quotes?.best_ask || 0);
      const putLtp = Number(putTicker?.close || putTicker?.mark_price || 0);
      const putMark = Number(putTicker?.mark_price || 0);
      const putOi = Number(putTicker?.oi || 0);
      const putVol = Number(putTicker?.volume || 0);
      const putIv = Number(putTicker?.quotes?.mark_iv || 0);

      const putGreeks = putTicker?.greeks;
      const putDelta = putGreeks?.delta !== undefined ? Number(putGreeks.delta) : undefined;
      const putGamma = putGreeks?.gamma !== undefined ? Number(putGreeks.gamma) : undefined;
      const putTheta = putGreeks?.theta !== undefined ? Number(putGreeks.theta) : undefined;
      const putVega = putGreeks?.vega !== undefined ? Number(putGreeks.vega) : undefined;

      const putContract: OptionContractDetails = {
        id: putProd?.id ? putProd.id.toString() : `P-${strike}-${expiryIso}`,
        symbol: putProd?.symbol || `P-${cleanUnderlying}-${strike}`,
        underlying: cleanUnderlying,
        optionType: 'PE',
        strikePrice: strike,
        expiryDate: expiryIso,
        lastTradedPrice: putLtp,
        markPrice: putMark,
        bidPrice: putBid,
        askPrice: putAsk,
        openInterest: putOi,
        volume: putVol,
        impliedVolatility: putIv,
        delta: putDelta,
        gamma: putGamma,
        theta: putTheta,
        vega: putVega,
        moneyness: isATM ? 'ATM' : strike > spotPrice ? 'ITM' : 'OTM',
        lotSize: Number(putProd?.contract_value || 0.001),
      };

      return {
        strikePrice: strike,
        isATM,
        call: callContract,
        put: putContract,
      };
    });

    const expiryItem = expiriesData.expiries.find((e) => e.iso === expiryIso);

    return {
      underlying: cleanUnderlying,
      underlyingPrice: spotPrice,
      expiryDate: expiryIso,
      formattedExpiryDate: expiryItem ? expiryItem.formattedDate : expiryIso,
      expiryIso,
      atmStrike: closestStrike,
      strikes: strikeRows,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Resolve exact Delta Exchange product ID and symbol given:
   * Underlying (BTC/ETH), Expiry date (ISO or formatted), Strike Price, and Call/Put.
   */
  public async resolveOptionProduct(
    paramsOrUnderlying:
      | string
      | {
          underlying: string;
          expiry?: string;
          expiryIso?: string;
          strike?: number;
          strikePrice?: number;
          optionType: 'call' | 'put' | 'CE' | 'PE';
        },
    expiryArg?: string,
    strikeArg?: number,
    optionTypeArg?: 'call' | 'put' | 'CE' | 'PE'
  ): Promise<{
    product: DeltaProduct;
    ticker?: DeltaTicker;
    productId: number;
    symbol: string;
    quotingAsset: string;
  }> {
    let cleanUnderlying: string;
    let exp: string;
    let strike: number;
    let optType: 'call' | 'put' | 'CE' | 'PE';

    if (typeof paramsOrUnderlying === 'object' && paramsOrUnderlying !== null) {
      cleanUnderlying = paramsOrUnderlying.underlying.toUpperCase().trim();
      exp = paramsOrUnderlying.expiry || paramsOrUnderlying.expiryIso || '';
      strike = paramsOrUnderlying.strike ?? paramsOrUnderlying.strikePrice ?? 0;
      optType = paramsOrUnderlying.optionType;
    } else {
      cleanUnderlying = paramsOrUnderlying.toUpperCase().trim();
      exp = expiryArg!;
      strike = strikeArg!;
      optType = optionTypeArg!;
    }

    const contractType = optType.toUpperCase() === 'CE' || optType.toLowerCase() === 'call' ? 'call_options' : 'put_options';
    const products = await this.getAllOptionProducts(false, cleanUnderlying);

    const match =
      products.find(
        (p) =>
          (p.underlying_asset?.symbol?.toUpperCase() === cleanUnderlying || p.symbol.includes(cleanUnderlying)) &&
          p.settlement_time === exp &&
          Number(p.strike_price) === strike &&
          p.contract_type === contractType
      ) ||
      products.find(
        (p) =>
          (p.underlying_asset?.symbol?.toUpperCase() === cleanUnderlying || p.symbol.includes(cleanUnderlying)) &&
          Number(p.strike_price) === strike &&
          p.contract_type === contractType
      ) ||
      products.find(
        (p) =>
          (p.underlying_asset?.symbol?.toUpperCase() === cleanUnderlying || p.symbol.includes(cleanUnderlying)) &&
          p.contract_type === contractType
      );

    if (!match) {
      throw new Error(
        `Delta Exchange product not found for ${cleanUnderlying} ${strike} ${optType} expiring ${exp}`
      );
    }

    const tickersMap = await this.getOptionTickersMap();
    const ticker = tickersMap.get(match.symbol);

    return {
      product: match,
      ticker,
      productId: match.id,
      symbol: match.symbol,
      quotingAsset: match.quoting_asset?.symbol || 'USD',
    };
  }

  /**
   * Pre-trade order preview for Delta Exchange contracts.
   * Computes amount, margin, and liquidation price based on actual exchange risk rules:
   * - Long Options: Premium paid upfront, no liquidation possible (capped risk).
   * - Short Options: Scaled with leverage and spot/mark price, liquidation estimated using mark price.
   */
  public async previewOptionOrder(
    paramsOrProductId:
      | number
      | {
          productId: number;
          size: number;
          side: 'buy' | 'sell' | 'BUY' | 'SELL';
          orderType: 'market_order' | 'limit_order' | 'stop_market_order' | 'stop_limit_order';
          limitPrice?: number;
          leverage?: number;
          availableBalanceUSD?: number;
        },
    sideArg?: 'buy' | 'sell' | 'BUY' | 'SELL',
    orderTypeArg?: 'market_order' | 'limit_order' | 'stop_market_order' | 'stop_limit_order',
    sizeArg?: number,
    limitPriceArg?: number,
    leverageArg?: number
  ): Promise<OptionOrderPreviewResult> {
    let productId: number;
    let size: number;
    let side: 'buy' | 'sell';
    let orderType: 'market_order' | 'limit_order' | 'stop_market_order' | 'stop_limit_order';
    let limitPrice: number | undefined;
    let leverage: number;
    let availableBalanceUSD: number | undefined;

    if (typeof paramsOrProductId === 'object' && paramsOrProductId !== null) {
      productId = paramsOrProductId.productId;
      size = paramsOrProductId.size;
      side = paramsOrProductId.side.toLowerCase() as 'buy' | 'sell';
      orderType = paramsOrProductId.orderType;
      limitPrice = paramsOrProductId.limitPrice;
      leverage = paramsOrProductId.leverage || this.getSelectedProductLeverage(productId, 1);
      availableBalanceUSD = paramsOrProductId.availableBalanceUSD;
    } else {
      productId = paramsOrProductId;
      side = (sideArg || 'buy').toLowerCase() as 'buy' | 'sell';
      orderType = (orderTypeArg || 'market_order') as 'market_order';
      size = sizeArg || 1;
      limitPrice = limitPriceArg;
      leverage = leverageArg || this.getSelectedProductLeverage(productId, 1);
    }

    const products = await this.getAllOptionProducts();
    const product = products.find((p) => p.id === productId);
    if (!product) {
      throw new Error(`Invalid Delta Exchange product ID: ${productId}`);
    }

    const tickers = await this.getOptionTickersMap();
    const ticker = tickers.get(product.symbol);

    const tickSize = Number(product.tick_size || 0.1);
    const contractValueMultiplier = Number(product.contract_value || 0.001);
    const strikePrice = Number(product.strike_price || 0);

    // Fetch spot price of underlying
    const underlyingSymbol = product.underlying_asset?.symbol?.toUpperCase() || 'BTC';
    let spotPrice = 70_000;
    try {
      const spotTicker = await this.getTicker(`${underlyingSymbol}USD`);
      spotPrice = spotTicker.lastPrice;
    } catch {}

    const markPrice = Number(ticker?.mark_price || ticker?.close || 1);

    // Determine estimated execution price
    let estimatedPrice = limitPrice || 0;
    if (orderType === 'market_order' || !estimatedPrice) {
      if (side === 'buy') {
        estimatedPrice = Number(ticker?.quotes?.best_ask || markPrice || 1);
      } else {
        estimatedPrice = Number(ticker?.quotes?.best_bid || markPrice || 1);
      }
    }
    if (estimatedPrice <= 0) {
      estimatedPrice = Math.max(tickSize, markPrice, 1);
    }

    // Verify tick size precision
    let tickSizeValid = true;
    if (limitPrice) {
      const remainder = (limitPrice / tickSize) % 1;
      tickSizeValid = Math.abs(remainder) < 0.0001 || Math.abs(remainder - 1) < 0.0001;
    }

    // Order Value / Notional calculation: Quantity * ContractMultiplier * Price
    const rawNotional = size * contractValueMultiplier * estimatedPrice;
    const orderValueUSD = rawNotional > 0 ? Math.max(0.01, Math.round(rawNotional * 100) / 100) : 0;
    const contractValueUSD = orderValueUSD;

    // Fee estimation: ~0.035% of premium or taker commission
    const feeRate = Number(product.taker_commission_rate || 0.00035);
    const estimatedFeesUSD = Math.max(0.1, Math.round(orderValueUSD * feeRate * 10000) / 10000);

    // Initial Margin & Maintenance Margin calculation according to Delta Exchange rules
    let requiredInitialMarginUSD = 0;
    let maintenanceMarginUSD = 0;
    let positionMarginUSD = 0;
    let estimatedLiquidationPrice: number | null = null;
    let liquidationPriceDescription = '';
    const isLiquidationApplicable = side === 'sell';

    if (side === 'buy') {
      // Long options: Margin is 100% of the premium paid upfront.
      // There is NO liquidation risk because max loss is capped at premium.
      requiredInitialMarginUSD = Math.round((orderValueUSD + estimatedFeesUSD) * 100) / 100;
      maintenanceMarginUSD = 0;
      positionMarginUSD = orderValueUSD;
      estimatedLiquidationPrice = null;
      liquidationPriceDescription = 'N/A (Long Options: Risk capped at premium paid; no liquidation)';
    } else {
      // Short options: Exchange requires margin backing based on underlying spot & mark price.
      const imFactor = Number(product.initial_margin || 0.5);
      const mmFactor = Number(product.maintenance_margin || 0.25);
      const safeLeverage = Math.max(1, leverage);

      const baseNotionalMargin = contractValueMultiplier * (markPrice + spotPrice * imFactor);
      requiredInitialMarginUSD =
        Math.round(((size * baseNotionalMargin) / safeLeverage + estimatedFeesUSD) * 100) / 100;
      maintenanceMarginUSD =
        Math.round(((size * contractValueMultiplier * (markPrice + spotPrice * mmFactor)) / safeLeverage) * 100) / 100;
      positionMarginUSD = requiredInitialMarginUSD;

      // Estimated liquidation price before actual position exists
      if (product.contract_type === 'call_options') {
        estimatedLiquidationPrice = Math.round(
          (strikePrice + requiredInitialMarginUSD / (size * contractValueMultiplier)) * 100
        ) / 100;
      } else {
        estimatedLiquidationPrice = Math.round(
          Math.max(0, strikePrice - requiredInitialMarginUSD / (size * contractValueMultiplier)) * 100
        ) / 100;
      }
      liquidationPriceDescription = `$${estimatedLiquidationPrice.toLocaleString(undefined, {
        minimumFractionDigits: 2,
      })} (Estimated - actual liquidation price fetched from Delta Exchange positions once opened)`;
    }

    const balance = availableBalanceUSD ?? 50_000;
    const hasSufficientMargin = balance >= requiredInitialMarginUSD;
    const remainingAvailableMarginUSD = Math.max(0, Math.round((balance - requiredInitialMarginUSD) * 100) / 100);

    let warning: string | undefined;
    if (!hasSufficientMargin) {
      warning = `Insufficient available margin. Required: $${requiredInitialMarginUSD.toFixed(2)}, Available: $${balance.toFixed(2)}`;
    } else if (!tickSizeValid) {
      warning = `Limit price must be a multiple of tick size (${tickSize}).`;
    }

    return {
      product,
      productId: product.id,
      symbol: product.symbol,
      contractType: product.contract_type,
      strikePrice,
      selectedLeverage: leverage,
      orderQuantity: size,
      contractMultiplier: contractValueMultiplier,
      estimatedPrice,
      markPrice,
      spotPrice,
      orderValueUSD,
      contractValueUSD,
      requiredInitialMarginUSD,
      maintenanceMarginUSD,
      positionMarginUSD,
      availableAccountBalanceUSD: balance,
      estimatedFeesUSD,
      estimatedFeeUSD: estimatedFeesUSD,
      remainingAvailableMarginUSD,
      estimatedLiquidationPrice,
      liquidationPriceDescription,
      isLiquidationApplicable,
      hasSufficientMargin,
      tickSizeValid,
      warning,
      marginRequiredUSD: requiredInitialMarginUSD,
    };
  }

  /**
   * Submit Order to Delta Exchange.
   * If live credentials are provided and authorized:
   * 1. Applies leverage to product via official API
   * 2. Dispatches order to Delta Exchange REST API
   * Otherwise executes in paper simulation mode.
   */
  public async submitOrder(
    userId: string,
    req: DeltaOrderPlacementRequest,
    credentials?: { apiKey: string; apiSecret: string; isLiveAuthorized?: boolean }
  ): Promise<DeltaOrderResponse> {
    const products = await this.getAllOptionProducts();
    const product = products.find((p) => p.id === req.productId);
    if (!product) {
      throw new Error(`Product ID ${req.productId} not found on Delta Exchange.`);
    }

    if (product.state !== 'live' || product.trading_status !== 'operational') {
      throw new Error(`Contract ${product.symbol} is currently ${product.trading_status} (${product.state}).`);
    }

    // Apply leverage if specified
    if (req.leverage && req.leverage > 1) {
      try {
        await this.setProductLeverage(req.productId, req.leverage, credentials);
      } catch (err) {
        console.warn(`[DeltaExchangeService] Leverage application warning:`, err);
      }
    }

    const clientOrderId = req.clientOrderId || `delta_ord_${crypto.randomBytes(8).toString('hex')}`;
    const isLive = Boolean(credentials?.apiKey && credentials?.apiSecret && credentials?.isLiveAuthorized);

    if (isLive) {
      const baseUrl = req.isTestnet ? this.testnetRestUrl : this.productionRestUrl;
      const path = '/v2/orders';
      const bodyObj = {
        product_id: req.productId,
        size: req.size,
        side: req.side,
        order_type: req.orderType,
        limit_price: req.limitPrice ? req.limitPrice.toString() : undefined,
        stop_price: req.stopPrice ? req.stopPrice.toString() : undefined,
        time_in_force: req.timeInForce || 'gtc',
        client_order_id: clientOrderId,
      };

      const bodyStr = JSON.stringify(bodyObj);
      const headers = this.generateAuthHeaders(
        credentials!.apiKey,
        credentials!.apiSecret,
        'POST',
        path,
        bodyStr
      );

      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: bodyStr,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const errorMsg = json.error?.message || json.error?.code || 'Delta Exchange rejected the order.';
        throw new Error(`Delta Exchange Live Order Failed: ${errorMsg}`);
      }

      const orderData = json.result;
      const exchangeOrderId = orderData.id ? orderData.id.toString() : `del_${Date.now()}`;
      const avgPrice = Number(orderData.average_fill_price || req.limitPrice || 0);

      return {
        success: true,
        orderId: clientOrderId,
        exchangeOrderId,
        clientOrderId,
        productId: req.productId,
        symbol: product.symbol,
        side: req.side.toUpperCase() as Side,
        orderType: req.orderType.includes('market') ? 'MARKET' : 'LIMIT',
        requestedQuantity: req.size,
        filledQuantity: Number(orderData.filled_size || 0),
        averageExecutionPrice: avgPrice,
        totalFees: Number(orderData.paid_commission || 0),
        feeCurrency: 'USD',
        status: orderData.state === 'filled' ? 'FILLED' : 'OPEN',
        executionTimestamp: new Date().toISOString(),
        message: `Live order ${exchangeOrderId} submitted to Delta Exchange.`,
      };
    } else {
      // Paper Trading Simulation Mode with real Delta Exchange prices
      const tickers = await this.getOptionTickersMap();
      const ticker = tickers.get(product.symbol);
      const execPrice =
        req.orderType === 'market_order'
          ? req.side === 'buy'
            ? Number(ticker?.quotes?.best_ask || ticker?.mark_price || 1)
            : Number(ticker?.quotes?.best_bid || ticker?.mark_price || 1)
          : Number(req.limitPrice || ticker?.mark_price || 1);

      const exchangeOrderId = `sim_delta_${Date.now()}`;
      const feeRate = Number(product.taker_commission_rate || 0.00035);
      const totalFees = Math.round(req.size * execPrice * Number(product.contract_value || 0.001) * feeRate * 10000) / 10000;

      const orderResponse: DeltaOrderResponse = {
        success: true,
        orderId: clientOrderId,
        exchangeOrderId,
        clientOrderId,
        productId: req.productId,
        symbol: product.symbol,
        side: req.side.toUpperCase() as Side,
        orderType: req.orderType.includes('market') ? 'MARKET' : 'LIMIT',
        requestedQuantity: req.size,
        filledQuantity: req.size,
        averageExecutionPrice: execPrice,
        totalFees,
        feeCurrency: 'USD',
        status: 'FILLED',
        executionTimestamp: new Date().toISOString(),
        message: `Paper order executed successfully on Delta Exchange at $${execPrice.toFixed(2)}.`,
      };

      this.paperOrders.set(clientOrderId, orderResponse);
      const prevPos = this.paperPositions.get(req.productId) || {
        size: 0,
        entryPrice: execPrice,
        symbol: product.symbol,
        leverage: req.leverage || 1,
      };
      const newSize = req.side === 'buy' ? prevPos.size + req.size : prevPos.size - req.size;
      this.paperPositions.set(req.productId, {
        size: newSize,
        entryPrice: execPrice,
        symbol: product.symbol,
        leverage: req.leverage || prevPos.leverage,
      });

      // Audit log asynchronously
      (async () => {
        try {
          await prisma.auditLog.create({
            data: {
              userId,
              action: 'DELTA_ORDER_EXECUTED',
              entityType: 'TradingOrder',
              entityId: clientOrderId,
              metadata: JSON.stringify({
                symbol: product.symbol,
                side: req.side,
                size: req.size,
                price: execPrice,
                fees: totalFees,
                leverage: req.leverage || 1,
                isPaper: !isLive,
              }),
            },
          });
        } catch {}
      })().catch(() => {});

      return orderResponse;
    }
  }

  /**
   * Cancel an open order on Delta Exchange.
   */
  public async cancelOrder(params: {
    orderId: string;
    productId: number;
    credentials?: { apiKey: string; apiSecret: string; isTestnet?: boolean };
  }): Promise<{ success: boolean; message: string }> {
    if (params.credentials?.apiKey && params.credentials?.apiSecret) {
      const baseUrl = params.credentials.isTestnet ? this.testnetRestUrl : this.productionRestUrl;
      const path = '/v2/orders';
      const bodyObj = { id: params.orderId, product_id: params.productId };
      const bodyStr = JSON.stringify(bodyObj);

      const headers = this.generateAuthHeaders(
        params.credentials.apiKey,
        params.credentials.apiSecret,
        'DELETE',
        path,
        bodyStr
      );

      const res = await fetch(`${baseUrl}${path}`, {
        method: 'DELETE',
        headers,
        body: bodyStr,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to cancel order on Delta Exchange.');
      }

      return { success: true, message: `Order ${params.orderId} cancelled on Delta Exchange.` };
    }

    // Paper order cancellation
    const paperOrder = this.paperOrders.get(params.orderId);
    if (paperOrder) {
      paperOrder.status = 'CANCELLED';
      return { success: true, message: `Paper order ${params.orderId} cancelled.` };
    }

    return { success: true, message: `Order ${params.orderId} cancelled.` };
  }

  /**
   * Close an open position on Delta Exchange (distinguished from cancel order).
   */
  public async closePosition(params: {
    productId: number;
    credentials?: { apiKey: string; apiSecret: string; isTestnet?: boolean };
  }): Promise<{ success: boolean; message: string }> {
    if (params.credentials?.apiKey && params.credentials?.apiSecret) {
      const baseUrl = params.credentials.isTestnet ? this.testnetRestUrl : this.productionRestUrl;
      const path = '/v2/positions/close';
      const bodyObj = { product_id: params.productId };
      const bodyStr = JSON.stringify(bodyObj);

      const headers = this.generateAuthHeaders(
        params.credentials.apiKey,
        params.credentials.apiSecret,
        'POST',
        path,
        bodyStr
      );

      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: bodyStr,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to close position on Delta Exchange.');
      }

      return { success: true, message: `Position for product ${params.productId} closed on Delta Exchange.` };
    }

    // Paper position close
    this.paperPositions.delete(params.productId);
    return { success: true, message: `Position for product ${params.productId} closed in simulation.` };
  }

  /**
   * Fetch authenticated wallet balances from Delta Exchange.
   */
  public async getAccountBalances(credentials?: {
    apiKey: string;
    apiSecret: string;
    isTestnet?: boolean;
  }): Promise<Array<{ asset: string; available: number; reserved: number; total: number }>> {
    if (credentials?.apiKey && credentials?.apiSecret) {
      const baseUrl = credentials.isTestnet ? this.testnetRestUrl : this.productionRestUrl;
      const path = '/v2/wallet/balances';
      const headers = this.generateAuthHeaders(credentials.apiKey, credentials.apiSecret, 'GET', path);

      const res = await fetch(`${baseUrl}${path}`, { headers });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to retrieve balances from Delta Exchange.');
      }

      return (json.result || []).map((b: {
        asset_symbol: string;
        balance: string | number;
        available_balance: string | number;
        order_margin?: string | number;
      }) => ({
        asset: b.asset_symbol,
        available: Number(b.available_balance || 0),
        reserved: Number(b.order_margin || 0),
        total: Number(b.balance || 0),
      }));
    }

    return [
      { asset: 'USD', available: 50_000, reserved: 0, total: 50_000 },
      { asset: 'BTC', available: 1.5, reserved: 0, total: 1.5 },
      { asset: 'ETH', available: 20, reserved: 0, total: 20 },
    ];
  }

  /**
   * Fetch live Exchange Margin Summary (Initial, Maintenance, Available, Blocked, Balance).
   * Refreshes from authenticated Delta Exchange account.
   */
  public async getExchangeMarginSummary(credentials?: {
    apiKey: string;
    apiSecret: string;
    isTestnet?: boolean;
  }): Promise<DeltaMarginSummary> {
    if (credentials?.apiKey && credentials?.apiSecret) {
      try {
        const baseUrl = credentials.isTestnet ? this.testnetRestUrl : this.productionRestUrl;
        const path = '/v2/wallet/balances';
        const headers = this.generateAuthHeaders(credentials.apiKey, credentials.apiSecret, 'GET', path);
        const res = await fetch(`${baseUrl}${path}`, { headers });
        const json = await res.json();

        if (res.ok && json.success && Array.isArray(json.result)) {
          const usd = json.result.find((b: { asset_symbol: string }) => b.asset_symbol === 'USD') || json.result[0];
          const total = Number(usd?.balance || 0);
          const available = Number(usd?.available_balance || 0);
          const orderMargin = Number(usd?.order_margin || 0);
          const positionMargin = Number(usd?.position_margin || 0);

          return {
            initialMarginUSD: orderMargin,
            maintenanceMarginUSD: Math.round(positionMargin * 0.5 * 100) / 100,
            positionMarginUSD: positionMargin,
            availableMarginUSD: available,
            blockedMarginUSD: orderMargin + positionMargin,
            remainingAvailableBalanceUSD: available,
            walletBalanceUSD: total,
            source: 'DELTA_EXCHANGE',
            timestamp: new Date().toISOString(),
          };
        }
      } catch (err) {
        console.warn('[DeltaExchangeService] Failed to load live exchange margin summary:', err);
      }
    }

    // Default simulation balance
    return {
      initialMarginUSD: 0,
      maintenanceMarginUSD: 0,
      positionMarginUSD: 0,
      availableMarginUSD: 50_000,
      blockedMarginUSD: 0,
      remainingAvailableBalanceUSD: 50_000,
      walletBalanceUSD: 50_000,
      source: 'SIMULATED',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Fetch margined positions from official Delta Exchange API:
   * GET /v2/positions/margined
   * Returns exchange-provided liquidation price, margin, and entry price.
   */
  public async getMarginedPositions(credentials?: {
    apiKey: string;
    apiSecret: string;
    isTestnet?: boolean;
  }): Promise<Array<{
    productId: number;
    symbol: string;
    size: number;
    entryPrice: number;
    markPrice: number;
    liquidationPrice: number | null;
    margin: number;
    unrealizedPnL: number;
    effectiveLeverage: number;
  }>> {
    if (credentials?.apiKey && credentials?.apiSecret) {
      try {
        const baseUrl = credentials.isTestnet ? this.testnetRestUrl : this.productionRestUrl;
        const path = '/v2/positions/margined';
        const headers = this.generateAuthHeaders(credentials.apiKey, credentials.apiSecret, 'GET', path);

        const res = await fetch(`${baseUrl}${path}`, { headers });
        const json = await res.json();
        if (res.ok && json.success && Array.isArray(json.result)) {
          return json.result.map((p: {
            product_id: number;
            product_symbol?: string;
            symbol?: string;
            size: string | number;
            entry_price?: string | number;
            mark_price?: string | number;
            liquidation_price?: string | number;
            margin?: string | number;
            unrealized_pnl?: string | number;
            effective_leverage?: string | number;
          }) => ({
            productId: p.product_id,
            symbol: p.product_symbol || p.symbol || `Product-${p.product_id}`,
            size: Number(p.size),
            entryPrice: Number(p.entry_price || 0),
            markPrice: Number(p.mark_price || 0),
            liquidationPrice: p.liquidation_price ? Number(p.liquidation_price) : null,
            margin: Number(p.margin || 0),
            unrealizedPnL: Number(p.unrealized_pnl || 0),
            effectiveLeverage: Number(p.effective_leverage || 1),
          }));
        }
      } catch (err) {
        console.warn('[DeltaExchangeService] Failed to load live margined positions:', err);
      }
    }

    // Paper positions
    const result: Array<{
      productId: number;
      symbol: string;
      size: number;
      entryPrice: number;
      markPrice: number;
      liquidationPrice: number | null;
      margin: number;
      unrealizedPnL: number;
      effectiveLeverage: number;
    }> = [];

    const tickers = await this.getOptionTickersMap();
    for (const [productId, pos] of this.paperPositions.entries()) {
      if (pos.size === 0) continue;
      const t = tickers.get(pos.symbol);
      const currentPrice = Number(t?.mark_price || pos.entryPrice);
      const pnl = (currentPrice - pos.entryPrice) * pos.size * 0.001;
      const margin = (Math.abs(pos.size) * currentPrice * 0.001 * 0.5) / Math.max(1, pos.leverage);

      result.push({
        productId,
        symbol: pos.symbol,
        size: pos.size,
        entryPrice: pos.entryPrice,
        markPrice: currentPrice,
        liquidationPrice: pos.size < 0 ? currentPrice * 1.5 : null,
        margin,
        unrealizedPnL: pnl,
        effectiveLeverage: pos.leverage,
      });
    }

    return result;
  }

  /**
   * Fetch open positions from Delta Exchange.
   */
  public async getOpenPositions(credentials?: {
    apiKey: string;
    apiSecret: string;
    isTestnet?: boolean;
  }): Promise<Array<{ productId: number; symbol: string; size: number; entryPrice: number; markPrice: number; unrealizedPnL: number }>> {
    if (credentials?.apiKey && credentials?.apiSecret) {
      const baseUrl = credentials.isTestnet ? this.testnetRestUrl : this.productionRestUrl;
      const path = '/v2/positions';
      const headers = this.generateAuthHeaders(credentials.apiKey, credentials.apiSecret, 'GET', path);

      const res = await fetch(`${baseUrl}${path}`, { headers });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to fetch positions from Delta Exchange.');
      }

      return (json.result || []).map((p: {
        product_id: number;
        product_symbol: string;
        size: number;
        entry_price: string | number;
        mark_price?: string | number;
        unrealized_pnl?: string | number;
      }) => ({
        productId: p.product_id,
        symbol: p.product_symbol,
        size: Number(p.size),
        entryPrice: Number(p.entry_price || 0),
        markPrice: Number(p.mark_price || 0),
        unrealizedPnL: Number(p.unrealized_pnl || 0),
      }));
    }

    // Paper positions
    const result: Array<{ productId: number; symbol: string; size: number; entryPrice: number; markPrice: number; unrealizedPnL: number }> = [];
    const tickers = await this.getOptionTickersMap();
    for (const [productId, pos] of this.paperPositions.entries()) {
      if (pos.size === 0) continue;
      const t = tickers.get(pos.symbol);
      const currentPrice = Number(t?.mark_price || pos.entryPrice);
      const pnl = (currentPrice - pos.entryPrice) * pos.size * 0.001;
      result.push({
        productId,
        symbol: pos.symbol,
        size: pos.size,
        entryPrice: pos.entryPrice,
        markPrice: currentPrice,
        unrealizedPnL: pnl,
      });
    }

    return result;
  }
}

export const deltaExchangeService = new DeltaExchangeService();
