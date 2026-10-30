/**
 * ExpiryManagementService — Contract Expiry Lifecycle, Calendar & Rollover Engine.
 *
 * Implements:
 * - Real-time tracking of active MCX Commodity and Options contract expiries
 * - Settlement rules (Physical delivery tender periods vs Cash settled)
 * - Strict prohibition: No new orders allowed on expired contracts
 * - Expiry Calendar aggregator with days remaining countdown
 * - Operator-guided contract rollover with explicit user confirmation
 */

import type { ExpiryCalendarItem, AssetCategory, Side } from '@/types';
import { MCX_SPECIFICATIONS, mcxMarketService } from './MCXMarketService';
import { portfolioService } from './PortfolioService';

export class ExpiryManagementService {
  /**
   * Get all active and upcoming contract expiries across all asset classes
   */
  getExpiryCalendar(): ExpiryCalendarItem[] {
    const calendar: ExpiryCalendarItem[] = [];
    const today = new Date();

    // 1. MCX Commodity Contracts
    for (const [symbol, spec] of Object.entries(MCX_SPECIFICATIONS)) {
      for (const expiryDateStr of spec.activeExpiries) {
        const expDate = new Date(expiryDateStr);
        const daysRemaining = Math.max(0, Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24)));
        const isPrecious = spec.category === 'PRECIOUS_METALS';

        const status =
          daysRemaining <= 0
            ? 'EXPIRED'
            : isPrecious && daysRemaining <= 5
            ? 'TENDER_PERIOD'
            : 'ACTIVE';

        // Check if user has position in this
        const ltp = mcxMarketService.getCommodityTicker(symbol).lastPrice;

        calendar.push({
          id: `mcx_${symbol}_${expiryDateStr}`,
          symbol,
          contractName: `${spec.name} (${expiryDateStr})`,
          category: 'MCX_COMMODITY',
          expiryDate: expiryDateStr,
          daysRemaining,
          openInterest: Math.floor(Math.random() * 20000 + 4000),
          settlementType: isPrecious ? 'PHYSICAL_DELIVERY' : 'CASH_SETTLED',
          status,
          rolloverEligible: daysRemaining <= 10 && daysRemaining > 0,
          currentLTP: ltp,
        });
      }
    }

    // 2. Options Contracts Expiries (BTC, ETH, GOLD, CRUDEOIL)
    const optionUnderlyings = [
      { sym: 'BTC', name: 'BTC Options', cat: 'CRYPTO' as AssetCategory, exp: ['2026-11-06', '2026-11-27', '2026-12-25'] },
      { sym: 'ETH', name: 'ETH Options', cat: 'CRYPTO' as AssetCategory, exp: ['2026-11-06', '2026-11-27'] },
      { sym: 'GOLD', name: 'MCX Gold Options', cat: 'OPTION' as AssetCategory, exp: ['2026-11-25', '2026-12-24'] },
      { sym: 'CRUDEOIL', name: 'MCX Crude Options', cat: 'OPTION' as AssetCategory, exp: ['2026-11-16', '2026-12-15'] },
    ];

    for (const opt of optionUnderlyings) {
      for (const expStr of opt.exp) {
        const expDate = new Date(expStr);
        const daysRemaining = Math.max(0, Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24)));

        calendar.push({
          id: `opt_${opt.sym}_${expStr}`,
          symbol: `${opt.sym}_OPT`,
          contractName: `${opt.name} (${expStr})`,
          category: opt.cat,
          expiryDate: expStr,
          daysRemaining,
          openInterest: Math.floor(Math.random() * 35000 + 5000),
          settlementType: 'CASH_SETTLED',
          status: daysRemaining <= 0 ? 'EXPIRED' : 'ACTIVE',
          rolloverEligible: daysRemaining <= 7 && daysRemaining > 0,
          currentLTP: opt.sym === 'BTC' ? 88500 : opt.sym === 'GOLD' ? 78450 : 5920,
        });
      }
    }

    // Sort by days remaining ascending
    return calendar.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  /**
   * Validate whether a contract is permitted for new order execution
   */
  canTradeContract(expiryDateStr: string): { allowed: boolean; reason?: string } {
    const today = new Date();
    const expiry = new Date(expiryDateStr);

    if (expiry.getTime() < today.getTime()) {
      return {
        allowed: false,
        reason: 'Contract has expired. Trading on expired instruments is strictly prohibited by exchange rules.',
      };
    }

    return { allowed: true };
  }

  /**
   * Calculate roll-over spread and preview between near-month and next-month
   */
  calculateRollover(symbol: string, currentExpiry: string, nextExpiry: string): {
    nearContract: string;
    nextContract: string;
    spreadAmount: number;
    spreadPct: number;
    estimatedCost: number;
  } {
    const spec = MCX_SPECIFICATIONS[symbol.toUpperCase()];
    const currentPrice = mcxMarketService.getCommodityTicker(symbol).lastPrice;
    // Next month usually has slight contango/backwardation (approx 0.3%)
    const nextPrice = currentPrice * 1.0035;
    const spread = nextPrice - currentPrice;
    const lotSize = spec?.lotSize ?? 1;

    return {
      nearContract: `${symbol} (${currentExpiry})`,
      nextContract: `${symbol} (${nextExpiry})`,
      spreadAmount: Number(spread.toFixed(2)),
      spreadPct: Number(((spread / currentPrice) * 100).toFixed(3)),
      estimatedCost: Number((spread * lotSize).toFixed(2)),
    };
  }

  /**
   * Execute contract rollover (requires explicit user authorization)
   */
  executeRollover(params: {
    portfolioId: string;
    positionId: string;
    currentExpiry: string;
    nextExpiry: string;
    userConfirmed: boolean;
  }): { success: boolean; message: string } {
    if (!params.userConfirmed) {
      throw new Error('Rollover rejected: Explicit operator authorization required.');
    }

    const portfolio = portfolioService.getPortfolioById(params.portfolioId);
    if (!portfolio) throw new Error('Portfolio not found.');

    const pos = portfolio.positions.find((p) => p.id === params.positionId);
    if (!pos || pos.status !== 'OPEN') {
      throw new Error('Active position for rollover not found.');
    }

    // Close near month position & re-open next month position
    pos.expiryDate = params.nextExpiry;
    pos.lastUpdatedAt = new Date().toISOString();
    portfolioService.updatePortfolio(params.portfolioId, { positions: portfolio.positions });

    return {
      success: true,
      message: `Rolled over ${pos.symbol} from ${params.currentExpiry} to ${params.nextExpiry} successfully.`,
    };
  }
}

export const expiryManagementService = new ExpiryManagementService();
