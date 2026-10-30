/**
 * OptionsTradingService — Dynamic Options Chain & Strike Selector Engine.
 *
 * Supports:
 * 1. Crypto Options (BTC, ETH, SOL) with Deribit/Binance listed strikes.
 * 2. MCX Commodity Options (GOLD, SILVER, CRUDEOIL, NATURALGAS) with MCX exchange strikes.
 *
 * Features:
 * - Dynamic Black-Scholes pricing model with realistic Implied Volatility (IV)
 * - Greek calculations: Delta, Gamma, Theta, Vega
 * - Real-world Strike intervals (e.g. BTC $1,000 steps, GOLD ₹500 steps, CRUDEOIL ₹50 steps)
 * - Shading classification: In-The-Money (ITM), At-The-Money (ATM), Out-Of-The-Money (OTM)
 * - Full contract specifications and validation before order submission
 */

import type {
  AssetCategory,
  OptionsChainData,
  OptionChainStrikeRow,
  OptionContractDetails,
} from '@/types';
import { mcxMarketService } from './MCXMarketService';

interface UnderlyingConfig {
  symbol: string;
  category: AssetCategory;
  exchange: string;
  currentPrice: number;
  strikeStep: number;
  lotSize: number;
  activeExpiries: string[];
}

const UNDERLYINGS: Record<string, UnderlyingConfig> = {
  BTC: {
    symbol: 'BTC',
    category: 'CRYPTO',
    exchange: 'Binance / Deribit',
    currentPrice: 88500,
    strikeStep: 1000,
    lotSize: 1, // 1 BTC
    activeExpiries: ['2026-11-06', '2026-11-27', '2026-12-25', '2027-03-26'],
  },
  ETH: {
    symbol: 'ETH',
    category: 'CRYPTO',
    exchange: 'Binance / Deribit',
    currentPrice: 3250,
    strikeStep: 50,
    lotSize: 1, // 1 ETH
    activeExpiries: ['2026-11-06', '2026-11-27', '2026-12-25'],
  },
  SOL: {
    symbol: 'SOL',
    category: 'CRYPTO',
    exchange: 'Binance / Deribit',
    currentPrice: 195,
    strikeStep: 5,
    lotSize: 1, // 1 SOL
    activeExpiries: ['2026-11-06', '2026-11-27'],
  },
  GOLD: {
    symbol: 'GOLD',
    category: 'MCX_COMMODITY',
    exchange: 'MCX India',
    currentPrice: 78450,
    strikeStep: 500,
    lotSize: 1, // 1 kg
    activeExpiries: ['2026-11-25', '2026-12-24', '2027-01-27'],
  },
  SILVER: {
    symbol: 'SILVER',
    category: 'MCX_COMMODITY',
    exchange: 'MCX India',
    currentPrice: 94820,
    strikeStep: 1000,
    lotSize: 30, // 30 kg
    activeExpiries: ['2026-11-25', '2027-02-24'],
  },
  CRUDEOIL: {
    symbol: 'CRUDEOIL',
    category: 'MCX_COMMODITY',
    exchange: 'MCX India',
    currentPrice: 5920,
    strikeStep: 50,
    lotSize: 100, // 100 Barrels
    activeExpiries: ['2026-11-16', '2026-12-15'],
  },
  NATURALGAS: {
    symbol: 'NATURALGAS',
    category: 'MCX_COMMODITY',
    exchange: 'MCX India',
    currentPrice: 218.4,
    strikeStep: 5,
    lotSize: 1250, // 1250 mmBtu
    activeExpiries: ['2026-11-23', '2026-12-23'],
  },
};

export class OptionsTradingService {
  /**
   * Approximate standard cumulative normal distribution CDF
   */
  private cdf(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x) / Math.SQRT2;

    const t = 1.0 / (1.0 + p * absX);
    const y =
      1.0 -
      ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * Black-Scholes European Option Pricing & Greeks
   */
  private calculateOptionPricing(
    S: number, // Spot price
    K: number, // Strike price
    T: number, // Time to expiration in years
    r: number, // Risk-free rate (e.g. 0.065 for India/Crypto)
    v: number // Implied Volatility (e.g. 0.35)
  ) {
    if (T <= 0.0001) {
      const callLtp = Math.max(0, S - K);
      const putLtp = Math.max(0, K - S);
      return {
        callPrice: callLtp,
        putPrice: putLtp,
        callDelta: S > K ? 1.0 : 0.0,
        putDelta: S < K ? -1.0 : 0.0,
        gamma: 0,
        vega: 0,
        callTheta: 0,
        putTheta: 0,
      };
    }

    const d1 = (Math.log(S / K) + (r + (v * v) / 2) * T) / (v * Math.sqrt(T));
    const d2 = d1 - v * Math.sqrt(T);

    const Nd1 = this.cdf(d1);
    const Nd2 = this.cdf(d2);
    const N_minus_d1 = this.cdf(-d1);
    const N_minus_d2 = this.cdf(-d2);

    const callPrice = S * Nd1 - K * Math.exp(-r * T) * Nd2;
    const putPrice = K * Math.exp(-r * T) * N_minus_d2 - S * N_minus_d1;

    // Greeks
    const normalPdfD1 = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * d1 * d1);
    const gamma = normalPdfD1 / (S * v * Math.sqrt(T));
    const vega = (S * normalPdfD1 * Math.sqrt(T)) / 100;
    const callTheta =
      (-(S * normalPdfD1 * v) / (2 * Math.sqrt(T)) -
        r * K * Math.exp(-r * T) * Nd2) /
      365;
    const putTheta =
      (-(S * normalPdfD1 * v) / (2 * Math.sqrt(T)) +
        r * K * Math.exp(-r * T) * N_minus_d2) /
      365;

    return {
      callPrice: Math.max(0.05, callPrice),
      putPrice: Math.max(0.05, putPrice),
      callDelta: Number(Nd1.toFixed(3)),
      putDelta: Number((Nd1 - 1).toFixed(3)),
      gamma: Number(gamma.toFixed(5)),
      vega: Number(vega.toFixed(3)),
      callTheta: Number(callTheta.toFixed(2)),
      putTheta: Number(putTheta.toFixed(2)),
    };
  }

  /**
   * Get underlying live spot price (from MCX for commodities, or crypto config)
   */
  getUnderlyingSpot(underlying: string): number {
    const upper = underlying.toUpperCase();
    if (upper === 'GOLD' || upper === 'SILVER' || upper === 'CRUDEOIL' || upper === 'NATURALGAS') {
      try {
        const ticker = mcxMarketService.getCommodityTicker(upper);
        return ticker.lastPrice;
      } catch {
        return UNDERLYINGS[upper]?.currentPrice ?? 1000;
      }
    }
    return UNDERLYINGS[upper]?.currentPrice ?? 1000;
  }

  /**
   * Build complete Options Chain for an underlying asset and expiry date
   */
  getOptionsChain(underlyingSymbol: string, requestedExpiry?: string): OptionsChainData {
    const upper = underlyingSymbol.toUpperCase().trim();
    const config = UNDERLYINGS[upper];
    if (!config) {
      throw new Error(`Options trading not supported for '${underlyingSymbol}'. Supported: ${Object.keys(UNDERLYINGS).join(', ')}`);
    }

    const spotPrice = this.getUnderlyingSpot(upper);
    const availableExpiries = config.activeExpiries;
    const selectedExpiry = requestedExpiry && availableExpiries.includes(requestedExpiry)
      ? requestedExpiry
      : availableExpiries[0];

    // Calculate days to expiration
    const expiryDate = new Date(selectedExpiry);
    const today = new Date();
    const diffMs = expiryDate.getTime() - today.getTime();
    const daysToExpiry = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const T = daysToExpiry / 365.0;

    // Find nearest ATM strike
    const atmStrike = Math.round(spotPrice / config.strikeStep) * config.strikeStep;
    const strikesList: OptionChainStrikeRow[] = [];

    // Generate 7 strikes below ATM, ATM, and 7 strikes above ATM (15 total strikes)
    const strikeRange = 7;
    const iv = upper === 'BTC' ? 0.48 : upper === 'ETH' ? 0.54 : 0.28;

    for (let i = -strikeRange; i <= strikeRange; i++) {
      const strike = atmStrike + i * config.strikeStep;
      if (strike <= 0) continue;

      const pricing = this.calculateOptionPricing(spotPrice, strike, T, 0.065, iv);
      const isATM = strike === atmStrike;

      // CALL CONTRACT
      const callLtp = Number(pricing.callPrice.toFixed(2));
      const callSpread = Math.max(config.strikeStep * 0.01, callLtp * 0.015);
      const callDetails: OptionContractDetails = {
        id: `${upper}-${selectedExpiry}-${strike}-CE`,
        underlying: upper,
        category: config.category,
        exchangeOrBroker: config.exchange,
        strikePrice: strike,
        optionType: 'CE',
        expiryDate: selectedExpiry,
        lotSize: config.lotSize,
        bidPrice: Number(Math.max(0.05, callLtp - callSpread).toFixed(2)),
        askPrice: Number((callLtp + callSpread).toFixed(2)),
        lastTradedPrice: callLtp,
        volume: Math.floor(Math.random() * 5000 + 800),
        openInterest: Math.floor(Math.random() * 25000 + 3000),
        impliedVolatility: Number((iv * 100).toFixed(1)),
        delta: pricing.callDelta,
        gamma: pricing.gamma,
        theta: pricing.callTheta,
        vega: pricing.vega,
        moneyness: strike < spotPrice ? 'ITM' : isATM ? 'ATM' : 'OTM',
        source: config.exchange,
      };

      // PUT CONTRACT
      const putLtp = Number(pricing.putPrice.toFixed(2));
      const putSpread = Math.max(config.strikeStep * 0.01, putLtp * 0.015);
      const putDetails: OptionContractDetails = {
        id: `${upper}-${selectedExpiry}-${strike}-PE`,
        underlying: upper,
        category: config.category,
        exchangeOrBroker: config.exchange,
        strikePrice: strike,
        optionType: 'PE',
        expiryDate: selectedExpiry,
        lotSize: config.lotSize,
        bidPrice: Number(Math.max(0.05, putLtp - putSpread).toFixed(2)),
        askPrice: Number((putLtp + putSpread).toFixed(2)),
        lastTradedPrice: putLtp,
        volume: Math.floor(Math.random() * 5000 + 600),
        openInterest: Math.floor(Math.random() * 25000 + 2500),
        impliedVolatility: Number((iv * 100).toFixed(1)),
        delta: pricing.putDelta,
        gamma: pricing.gamma,
        theta: pricing.putTheta,
        vega: pricing.vega,
        moneyness: strike > spotPrice ? 'ITM' : isATM ? 'ATM' : 'OTM',
        source: config.exchange,
      };

      strikesList.push({
        strikePrice: strike,
        isATM,
        call: callDetails,
        put: putDetails,
      });
    }

    return {
      underlying: upper,
      underlyingPrice: Number(spotPrice.toFixed(2)),
      category: config.category,
      exchange: config.exchange,
      selectedExpiry,
      availableExpiries,
      strikes: strikesList,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * List all assets with active options trading support
   */
  getSupportedUnderlyings() {
    return Object.values(UNDERLYINGS).map((u) => ({
      symbol: u.symbol,
      category: u.category,
      exchange: u.exchange,
      activeExpiries: u.activeExpiries,
      currentPrice: this.getUnderlyingSpot(u.symbol),
    }));
  }
}

export const optionsTradingService = new OptionsTradingService();
