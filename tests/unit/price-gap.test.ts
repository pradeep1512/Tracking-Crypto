import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PriceGapDetectionService } from '../../src/services/PriceGapDetectionService';
import type { Ticker, OrderBook } from '../../src/types';

describe('PriceGapDetectionService', () => {
  const service = new PriceGapDetectionService();

  const mockTicker: Ticker = {
    exchangeId: 'binance',
    exchangeName: 'Binance Spot',
    symbol: 'BTC/USDT',
    lastPrice: 50010,
    bestBid: 50000,
    bestAsk: 50020,
    bidQuantity: 1.0,
    askQuantity: 1.0,
    spread: 20,
    spreadPercentage: (20 / 50010) * 100,
    exchangeTimestamp: new Date(),
    receivedAt: new Date(),
    dataAgeMs: 50,
    isMock: false,
  };

  const mockOrderBook: OrderBook = {
    exchangeId: 'binance',
    symbol: 'BTC/USDT',
    bids: [
      { price: 50000, quantity: 1.0, total: 1.0, depthPercentage: 20 },
      { price: 49950, quantity: 2.0, total: 3.0, depthPercentage: 60 },
      { price: 49900, quantity: 2.0, total: 5.0, depthPercentage: 100 },
    ],
    asks: [
      { price: 50020, quantity: 0.5, total: 0.5, depthPercentage: 10 },
      { price: 50050, quantity: 1.5, total: 2.0, depthPercentage: 40 },
      { price: 50100, quantity: 3.0, total: 5.0, depthPercentage: 100 },
    ],
    timestamp: new Date(),
    receivedAt: new Date(),
    dataAgeMs: 50,
  };

  it('calculates VWAP correctly when order exhausts multiple ask levels for BUY', () => {
    // Want to BUY 1.0 BTC
    // Level 1: 0.5 BTC @ 50,020 = $25,010
    // Level 2: 0.5 BTC @ 50,050 = $25,025
    // Total cost = $50,035 for 1.0 BTC => VWAP = 50,035
    const vwap = service.calculateVWAP(mockOrderBook, 'BUY', 1.0);
    assert.equal(vwap.fillableQuantity, 1.0);
    assert.equal(vwap.remainingQuantity, 0);
    assert.equal(vwap.estimatedPrice, 50035);
    assert.equal(vwap.levels.length, 2);
  });

  it('calculates VWAP correctly when order exhausts multiple bid levels for SELL', () => {
    // Want to SELL 2.0 BTC
    // Level 1: 1.0 BTC @ 50,000 = $50,000
    // Level 2: 1.0 BTC @ 49,950 = $49,950
    // Total cost = $99,950 for 2.0 BTC => VWAP = 49,975
    const vwap = service.calculateVWAP(mockOrderBook, 'SELL', 2.0);
    assert.equal(vwap.fillableQuantity, 2.0);
    assert.equal(vwap.remainingQuantity, 0);
    assert.equal(vwap.estimatedPrice, 49975);
    assert.equal(vwap.levels.length, 2);
  });

  it('classifies STALE_DATA when data age exceeds threshold', () => {
    const staleTicker: Ticker = {
      ...mockTicker,
      dataAgeMs: 6500, // exceeds default 5000ms
    };

    const analysis = service.analyze({
      side: 'BUY',
      referencePrice: 50000,
      ticker: staleTicker,
      orderBook: mockOrderBook,
      quantity: 0.1,
    });

    assert.equal(analysis.classification, 'STALE_DATA');
    assert.ok(analysis.classificationDetails.includes('Market data is 6500ms old'));
  });

  it('classifies SPREAD when difference is within bid-ask spread', () => {
    // Reference price 50,010 (mid price), best ask 50,020, zero fee for pure spread test
    const analysis = service.analyze({
      side: 'BUY',
      referencePrice: 50010,
      ticker: mockTicker,
      feePct: 0,
      quantity: 0.1, // small quantity fits inside top ask
    });

    assert.equal(analysis.classification, 'SPREAD');
  });

  it('classifies SLIPPAGE when order incurs deep order book slippage', () => {
    // Order 4.0 BTC exceeds level 1 (0.5) and level 2 (1.5), pushing into level 3 (50100)
    const analysis = service.analyze({
      side: 'BUY',
      referencePrice: 50020, // reference is top of book
      ticker: mockTicker,
      orderBook: mockOrderBook,
      quantity: 4.0,
      feePct: 0,
    });

    assert.equal(analysis.classification, 'SLIPPAGE');
    assert.ok(analysis.gapPercentage > 0);
  });

  it('classifies LIQUIDITY when order quantity exceeds total order book depth', () => {
    // Order 10.0 BTC exceeds total asks in book (0.5 + 1.5 + 3.0 = 5.0 BTC)
    const analysis = service.analyze({
      side: 'BUY',
      referencePrice: 50020,
      ticker: mockTicker,
      orderBook: mockOrderBook,
      quantity: 10.0,
      feePct: 0,
    });

    assert.equal(analysis.classification, 'LIQUIDITY');
    assert.ok(analysis.classificationDetails.includes('Insufficient order book depth'));
  });

  it('classifies MARKET_MOVEMENT when market price has diverged significantly from quote', () => {
    // Reference price was 48,000, but market has moved up to 50,020 (> 4% movement)
    const analysis = service.analyze({
      side: 'BUY',
      referencePrice: 48000,
      ticker: mockTicker,
      feePct: 0,
    });

    assert.equal(analysis.classification, 'MARKET_MOVEMENT');
  });

  it('correctly calculates additional cost for BUY order when gap exists', () => {
    const analysis = service.analyze({
      side: 'BUY',
      referencePrice: 50000,
      ticker: mockTicker,
      quantity: 2.0,
      feePct: 0,
    });

    assert.ok(analysis.additionalCost !== undefined);
    assert.ok(analysis.additionalCost > 0);
    assert.equal(analysis.additionalCost, analysis.gapAmount * 2.0);
  });
});
