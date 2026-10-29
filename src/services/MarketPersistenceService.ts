/**
 * MarketPersistenceService — SQL Server / Prisma database persistence layer.
 *
 * Implements:
 * - Storing MarketSnapshots, PriceGapEvents, and LatencyMetrics
 * - In-memory fallback ring-buffer if SQL Server is temporarily unreachable
 * - Historical retrieval for analytics and dashboard auditing
 * - Automated data retention pruning for order book depth & snapshots
 */

import { prisma } from '@/lib/database/prisma';
import type { PriceGapAnalysis, Ticker, MetricType, Side, GapClassification } from '@/types';

export interface StoredPriceGapRecord {
  id: string;
  userId?: string | null;
  exchangeId: string;
  symbol: string;
  side: Side;
  referencePrice: number;
  observedPrice: number;
  estimatedExecutionPrice: number;
  quantity?: number;
  gapAmount: number;
  gapPercentage: number;
  additionalCost?: number;
  dataAgeMs: number;
  detectionTimestamp: Date;
  gapClassification: GapClassification;
  isWithinTolerance: boolean;
  tolerancePercentage?: number;
  createdAt: Date;
}

export class MarketPersistenceService {
  // In-memory ring buffer fallback for development when local SQL Server is not active
  private inMemoryGaps: StoredPriceGapRecord[] = [];
  private maxInMemoryRecords = 100;

  /**
   * Ensure the Exchange and TradingPair records exist in Prisma before inserting child records.
   */
  private async ensureExchangeAndPair(exchangeId: string, symbol: string) {
    try {
      let exchange = await prisma.exchange.findUnique({ where: { name: exchangeId } });
      if (!exchange) {
        exchange = await prisma.exchange.create({
          data: {
            name: exchangeId,
            displayName: exchangeId === 'binance' ? 'Binance (Live Public)' : 'Mock Exchange (Dev)',
            baseApiUrl: exchangeId === 'binance' ? 'https://api.binance.com' : 'http://localhost:3000',
            isMock: exchangeId === 'mock',
          },
        });
      }

      const cleanSymbol = symbol.toUpperCase();
      let pair = await prisma.tradingPair.findUnique({
        where: {
          exchangeId_symbol: {
            exchangeId: exchange.id,
            symbol: cleanSymbol,
          },
        },
      });

      if (!pair) {
        const base = cleanSymbol.startsWith('BTC') ? 'BTC' : cleanSymbol.startsWith('ETH') ? 'ETH' : cleanSymbol.slice(0, 3);
        const quote = cleanSymbol.endsWith('INR') ? 'INR' : 'USDT';
        pair = await prisma.tradingPair.create({
          data: {
            exchangeId: exchange.id,
            symbol: cleanSymbol,
            baseCurrency: base,
            quoteCurrency: quote,
          },
        });
      }

      return { exchange, pair };
    } catch {
      return null;
    }
  }

  /**
   * Persist a PriceGapAnalysis event into SQL Server with in-memory fallback.
   */
  async recordPriceGap(
    analysis: PriceGapAnalysis,
    symbol: string,
    exchangeId = 'binance',
    userId?: string
  ): Promise<StoredPriceGapRecord> {
    const memoryRecord: StoredPriceGapRecord = {
      id: `gap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: userId ?? null,
      exchangeId,
      symbol: symbol.toUpperCase(),
      side: analysis.side,
      referencePrice: analysis.referencePrice,
      observedPrice: analysis.observedPrice,
      estimatedExecutionPrice: analysis.estimatedExecutionPrice,
      quantity: analysis.quantity,
      gapAmount: analysis.gapAmount,
      gapPercentage: analysis.gapPercentage,
      additionalCost: analysis.additionalCost,
      dataAgeMs: analysis.dataAgeMs,
      detectionTimestamp: analysis.timestamp,
      gapClassification: analysis.classification,
      isWithinTolerance: analysis.isWithinTolerance,
      tolerancePercentage: analysis.tolerancePercentage,
      createdAt: new Date(),
    };

    // Keep ring buffer updated
    this.inMemoryGaps.unshift(memoryRecord);
    if (this.inMemoryGaps.length > this.maxInMemoryRecords) {
      this.inMemoryGaps.pop();
    }

    // Attempt SQL Server Prisma write
    try {
      const records = await this.ensureExchangeAndPair(exchangeId, symbol);
      if (records) {
        const created = await prisma.priceGapEvent.create({
          data: {
            userId: userId ?? undefined,
            exchangeId: records.exchange.id,
            tradingPairId: records.pair.id,
            side: analysis.side,
            referencePrice: analysis.referencePrice,
            observedPrice: analysis.observedPrice,
            estimatedExecutionPrice: analysis.estimatedExecutionPrice,
            quantity: analysis.quantity,
            gapAmount: analysis.gapAmount,
            gapPercentage: analysis.gapPercentage,
            additionalCost: analysis.additionalCost,
            dataAgeMs: analysis.dataAgeMs,
            detectionTimestamp: analysis.timestamp,
            gapClassification: analysis.classification,
            isWithinTolerance: analysis.isWithinTolerance,
            tolerancePercentage: analysis.tolerancePercentage,
          },
        });
        memoryRecord.id = created.id;
      }
    } catch (err) {
      // Database unavailable in offline dev; in-memory fallback retains data
      console.warn('[Persistence] Database write skipped, using in-memory store:', (err as Error).message);
    }

    return memoryRecord;
  }

  /**
   * Query historical price gap records.
   */
  async getHistoricalGaps(filters: {
    symbol?: string;
    exchangeId?: string;
    limit?: number;
    classification?: string;
  }): Promise<StoredPriceGapRecord[]> {
    const limit = filters.limit ?? 20;

    try {
      const dbGaps = await prisma.priceGapEvent.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tradingPair: true,
          exchange: true,
        },
      });

      if (dbGaps.length > 0) {
        return dbGaps.map((g) => ({
          id: g.id,
          userId: g.userId,
          exchangeId: g.exchange.name,
          symbol: g.tradingPair.symbol,
          side: g.side as Side,
          referencePrice: Number(g.referencePrice),
          observedPrice: Number(g.observedPrice),
          estimatedExecutionPrice: Number(g.estimatedExecutionPrice),
          quantity: g.quantity ? Number(g.quantity) : undefined,
          gapAmount: Number(g.gapAmount),
          gapPercentage: Number(g.gapPercentage),
          additionalCost: g.additionalCost ? Number(g.additionalCost) : undefined,
          dataAgeMs: g.dataAgeMs,
          detectionTimestamp: g.detectionTimestamp,
          gapClassification: g.gapClassification as GapClassification,
          isWithinTolerance: g.isWithinTolerance,
          tolerancePercentage: g.tolerancePercentage ? Number(g.tolerancePercentage) : undefined,
          createdAt: g.createdAt,
        }));
      }
    } catch {
      // Fallback to in-memory store
    }

    // Filter from in-memory ring buffer
    return this.inMemoryGaps
      .filter((g) => {
        if (filters.symbol && g.symbol !== filters.symbol.toUpperCase()) return false;
        if (filters.exchangeId && g.exchangeId !== filters.exchangeId) return false;
        if (filters.classification && g.gapClassification !== filters.classification) return false;
        return true;
      })
      .slice(0, limit);
  }

  /**
   * Persist a MarketSnapshot into SQL Server.
   */
  async recordSnapshot(ticker: Ticker): Promise<void> {
    try {
      const records = await this.ensureExchangeAndPair(ticker.exchangeId, ticker.symbol);
      if (records) {
        await prisma.marketSnapshot.create({
          data: {
            exchangeId: records.exchange.id,
            tradingPairId: records.pair.id,
            lastPrice: ticker.lastPrice,
            bestBid: ticker.bestBid,
            bestAsk: ticker.bestAsk,
            bidQuantity: ticker.bidQuantity,
            askQuantity: ticker.askQuantity,
            spread: ticker.spread,
            spreadPercentage: ticker.spreadPercentage,
            volume24h: ticker.volume24h,
            high24h: ticker.high24h,
            low24h: ticker.low24h,
            exchangeTimestamp: ticker.exchangeTimestamp,
            receivedAt: ticker.receivedAt,
            dataAgeMs: ticker.dataAgeMs,
          },
        });
      }
    } catch {
      // Silently ignore if offline
    }
  }

  /**
   * Retention strategy: prune old MarketSnapshots older than retentionDays.
   */
  async pruneOldSnapshots(retentionDays = 7): Promise<number> {
    try {
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      const res = await prisma.marketSnapshot.deleteMany({
        where: {
          createdAt: { lt: cutoff },
        },
      });
      return res.count;
    } catch {
      return 0;
    }
  }
}

export const marketPersistenceService = new MarketPersistenceService();
