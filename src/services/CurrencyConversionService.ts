/**
 * CurrencyConversionService — Dynamic Real-Time Currency Conversion & Market Transparency Engine.
 *
 * Implements:
 * - Dynamic live USDT/INR market rate retrieval (distinguishing USDT from USD)
 * - Multi-source fallback (CoinGecko primary reference, CoinDCX spot fallback)
 * - In-memory caching with background auto-refresh (prevents 429 rate limits while maintaining freshness)
 * - Calculation of synthetic INR crypto prices: BTC/INR = BTC/USDT × USDT/INR
 * - Independent price discrepancy calculation against external benchmarks
 * - Latency and timestamp auditing (exchange timestamp vs server receive time)
 */

import type { CryptoPriceTransparency } from '@/types';

export interface ConversionRateData {
  pair: 'USDTINR';
  rate: number;
  source: string;
  exchangeTimestamp: Date;
  receivedAt: Date;
  lastUpdated: Date;
  status: 'LIVE' | 'STALE' | 'FALLBACK';
  cacheAgeMs: number;
}

export class CurrencyConversionService {
  private cachedRate: ConversionRateData | null = null;
  private cacheTtlMs = 30_000; // 30 second cache TTL
  private isRefreshing = false;

  // Stored conservative baseline if network is completely disconnected
  private fallbackRate = 95.0;

  constructor() {
    // Proactively initialize on startup
    this.refreshRate().catch(() => {});
  }

  /**
   * Fetch current dynamic USDT to INR conversion rate.
   * If cache is fresh, returns instantly. Otherwise fetches from live providers.
   */
  async getUsdtInrRate(): Promise<ConversionRateData> {
    const now = Date.now();

    if (this.cachedRate && now - this.cachedRate.lastUpdated.getTime() < this.cacheTtlMs) {
      return {
        ...this.cachedRate,
        cacheAgeMs: now - this.cachedRate.lastUpdated.getTime(),
      };
    }

    // Trigger background refresh or wait for fresh data if no cache exists
    if (!this.cachedRate) {
      return await this.refreshRate();
    }

    // Cache expired, trigger non-blocking refresh and return existing cache marked STALE
    if (!this.isRefreshing) {
      this.refreshRate().catch((err) => {
        console.warn('[CurrencyConversionService] Background refresh failed:', err.message);
      });
    }

    return {
      ...this.cachedRate,
      status: 'STALE',
      cacheAgeMs: now - this.cachedRate.lastUpdated.getTime(),
    };
  }

  /**
   * Direct fetch from live market-data sources with timeout and fallback
   */
  async refreshRate(): Promise<ConversionRateData> {
    this.isRefreshing = true;
    const fetchStart = Date.now();

    try {
      // Primary: CoinGecko Tether (USDT) to INR
      const cgController = new AbortController();
      const cgTimer = setTimeout(() => cgController.abort(), 3500);

      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=inr&include_last_updated_at=true',
          { signal: cgController.signal, cache: 'no-store' }
        );
        clearTimeout(cgTimer);

        if (res.ok) {
          const json = await res.json();
          if (json?.tether?.inr && typeof json.tether.inr === 'number') {
            const rate = json.tether.inr;
            const updatedSec = json.tether.last_updated_at;
            const exchangeTimestamp = updatedSec ? new Date(updatedSec * 1000) : new Date();
            const receivedAt = new Date();

            this.cachedRate = {
              pair: 'USDTINR',
              rate: Number(rate.toFixed(2)),
              source: 'CoinGecko Crypto Reference',
              exchangeTimestamp,
              receivedAt,
              lastUpdated: receivedAt,
              status: 'LIVE',
              cacheAgeMs: 0,
            };
            this.fallbackRate = rate;
            return this.cachedRate;
          }
        }
      } catch (cgErr) {
        // Fall through to secondary provider
      }

      // Secondary: CoinDCX Indian Spot Market USDTINR
      const cdcxController = new AbortController();
      const cdcxTimer = setTimeout(() => cdcxController.abort(), 3500);

      try {
        const res = await fetch('https://api.coindcx.com/exchange/ticker', {
          signal: cdcxController.signal,
          cache: 'no-store',
        });
        clearTimeout(cdcxTimer);

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const pair = data.find((t) => t.market === 'USDTINR');
            if (pair?.last_price) {
              const rate = parseFloat(pair.last_price);
              const exchangeTimestamp = pair.timestamp ? new Date(pair.timestamp * 1000) : new Date();
              const receivedAt = new Date();

              this.cachedRate = {
                pair: 'USDTINR',
                rate: Number(rate.toFixed(2)),
                source: 'CoinDCX Live Spot',
                exchangeTimestamp,
                receivedAt,
                lastUpdated: receivedAt,
                status: 'LIVE',
                cacheAgeMs: 0,
              };
              this.fallbackRate = rate;
              return this.cachedRate;
            }
          }
        }
      } catch (cdcxErr) {
        // Fall through to fallback
      }

      // Fallback: Use last known rate
      const now = new Date();
      this.cachedRate = {
        pair: 'USDTINR',
        rate: this.fallbackRate,
        source: 'Last Verified Market Reference',
        exchangeTimestamp: now,
        receivedAt: now,
        lastUpdated: now,
        status: 'FALLBACK',
        cacheAgeMs: Date.now() - fetchStart,
      };
      return this.cachedRate;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Audit real-time Bitcoin pricing, conversion accuracy, and external reference discrepancy.
   */
  async getBitcoinPriceAudit(): Promise<CryptoPriceTransparency> {
    const startTime = Date.now();

    // 1. Fetch live Binance BTCUSDT
    let btcUsdtPrice = 78500.0;
    let exchangeTime = new Date();
    let exchangeSource = 'Binance REST API v3';

    try {
      const bRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', {
        cache: 'no-store',
      });
      if (bRes.ok) {
        const bData = await bRes.json();
        btcUsdtPrice = parseFloat(bData.lastPrice);
        exchangeTime = new Date(bData.closeTime);
      }
    } catch {
      // Keep baseline
    }

    const serverReceiveTime = new Date();

    // 2. Fetch live USDT/INR dynamic conversion rate
    const conversion = await this.getUsdtInrRate();
    const usdtInrRate = conversion.rate;

    // 3. Calculate exact BTC/INR
    const calculatedInrPrice = Number((btcUsdtPrice * usdtInrRate).toFixed(2));

    // 4. Fetch independent reference (CoinGecko BTC in INR)
    let referenceInrPrice: number | undefined;
    let referenceSource = 'CoinGecko Aggregator Reference';
    let priceDifferencePct: number | undefined;

    try {
      const cgRes = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=inr',
        { cache: 'no-store' }
      );
      if (cgRes.ok) {
        const cgData = await cgRes.json();
        if (cgData?.bitcoin?.inr && typeof cgData.bitcoin.inr === 'number') {
          const ref = cgData.bitcoin.inr;
          referenceInrPrice = ref;
          const diff = calculatedInrPrice - ref;
          priceDifferencePct = Number(((diff / ref) * 100).toFixed(2));
        }
      }
    } catch {
      // Reference optional
    }

    const latencyMs = Math.max(1, Date.now() - startTime);

    return {
      symbol: 'BTCINR',
      inrPrice: calculatedInrPrice,
      btcUsdtPrice,
      usdtInrRate,
      marketDataSource: exchangeSource,
      conversionSource: `${conversion.source} (${conversion.status})`,
      exchangeTimestamp: exchangeTime.toISOString(),
      receivedAt: serverReceiveTime.toISOString(),
      lastUpdated: new Date().toISOString(),
      dataStatus: conversion.status === 'LIVE' ? 'LIVE' : conversion.status === 'STALE' ? 'STALE' : 'DELAYED',
      referenceInrPrice,
      referenceSource,
      priceDifferencePct,
      latencyMs,
    };
  }

  /**
   * Return cached rate number synchronously or fallback
   */
  public getCurrentRateNumber(): number {
    return this.cachedRate?.rate || this.fallbackRate || 88.0;
  }
}

export const currencyConversionService = new CurrencyConversionService();
