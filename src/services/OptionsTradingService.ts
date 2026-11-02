/**
 * OptionsTradingService — Delta Exchange Crypto Options Chain & Strike Selector Engine.
 *
 * Integrates directly with Delta Exchange as the single source of truth for crypto options.
 *
 * Features:
 * - Dynamic options chain with Delta Exchange listed contracts (BTC, ETH)
 * - Dynamic expiry dates retrieval from Delta Exchange (no hardcoded expiries)
 * - Exchange-calculated Greeks (Delta, Gamma, Theta, Vega) & Implied Volatility (IV)
 * - Real-world listed strikes & ATM / ITM / OTM moneyness classification
 * - Strike selection with exact Delta Exchange product ID and symbol resolution
 * - Order preview with margin and fee calculation in contract currency (USD)
 * - Complete removal of MCX commodities and INR conversion
 */

import type {
  OptionsChainData,
  OptionChainStrikeRow,
  OptionContractDetails,
} from '@/types';
import { deltaExchangeService } from './DeltaExchangeService';

export class OptionsTradingService {
  /**
   * Fetch complete dynamic Options Chain from Delta Exchange.
   */
  async getOptionsChain(underlying = 'BTC', requestedExpiry?: string): Promise<OptionsChainData> {
    const clean = underlying.toUpperCase().trim();
    return await deltaExchangeService.getOptionsChain(clean, requestedExpiry);
  }

  /**
   * Fetch all available future expiry dates for underlying asset.
   */
  async getAvailableExpiries(underlying = 'BTC') {
    return await deltaExchangeService.getAvailableExpiries(underlying);
  }

  /**
   * Resolve exact Delta Exchange contract by underlying, expiry, strike, and option type.
   */
  async resolveOptionProduct(params: {
    underlying: string;
    expiryIso: string;
    strikePrice: number;
    optionType: 'CE' | 'PE';
  }) {
    return await deltaExchangeService.resolveOptionProduct(params);
  }

  /**
   * Order preview for Delta Exchange option contracts.
   */
  async previewOptionOrder(params: {
    productId: number;
    size: number;
    side: 'buy' | 'sell';
    orderType: 'market_order' | 'limit_order' | 'stop_market_order' | 'stop_limit_order';
    limitPrice?: number;
    availableBalanceUSD?: number;
  }) {
    return await deltaExchangeService.previewOptionOrder(params);
  }

  /**
   * Submit an option order.
   */
  async submitOrder(
    userId: string,
    req: {
      productId: number;
      size: number;
      side: 'buy' | 'sell';
      orderType: 'market_order' | 'limit_order' | 'stop_market_order' | 'stop_limit_order';
      limitPrice?: number;
      stopPrice?: number;
      clientOrderId?: string;
      isTestnet?: boolean;
    },
    credentials?: { apiKey: string; apiSecret: string; isLiveAuthorized?: boolean }
  ) {
    return await deltaExchangeService.submitOrder(userId, req, credentials);
  }
}

export const optionsTradingService = new OptionsTradingService();
