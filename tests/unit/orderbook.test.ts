import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OrderBookService } from '../../src/services/OrderBookService';

describe('OrderBookService', () => {
  const service = new OrderBookService();

  const rawBids: [number, number][] = [
    [50000, 1.5],
    [49900, 3.0],
    [50100, 0.5], // Unsorted bid to test sort ordering
  ];

  const rawAsks: [number, number][] = [
    [50200, 2.0],
    [50150, 1.0], // Unsorted ask to test sort ordering
    [50300, 5.0],
  ];

  it('normalizes and sorts bids descending and asks ascending', () => {
    const ob = service.normalize('binance', 'BTC/USDT', rawBids, rawAsks);

    // Bids should be sorted highest to lowest
    assert.equal(ob.bids[0].price, 50100);
    assert.equal(ob.bids[1].price, 50000);
    assert.equal(ob.bids[2].price, 49900);

    // Asks should be sorted lowest to highest
    assert.equal(ob.asks[0].price, 50150);
    assert.equal(ob.asks[1].price, 50200);
    assert.equal(ob.asks[2].price, 50300);

    // Verify cumulative totals
    assert.equal(ob.bids[0].total, 0.5);
    assert.equal(ob.bids[1].total, 2.0);
    assert.equal(ob.bids[2].total, 5.0);

    // Verify depth percentage is between 0 and 100
    assert.ok(ob.bids[2].depthPercentage > 0 && ob.bids[2].depthPercentage <= 100);
  });

  it('calculates detailed VWAP execution steps accurately', () => {
    const ob = service.normalize('binance', 'BTC/USDT', rawBids, rawAsks);

    // Buy 2.5 BTC:
    // Ask 1: 1.0 @ 50,150 = $50,150
    // Ask 2: 1.5 @ 50,200 = $75,300
    // Total = $125,450 for 2.5 BTC -> VWAP = 50,180
    const vwapResult = service.calculateDetailedVWAP(ob, 'BUY', 2.5);

    assert.equal(vwapResult.requestedQuantity, 2.5);
    assert.equal(vwapResult.fillableQuantity, 2.5);
    assert.equal(vwapResult.unfilledQuantity, 0);
    assert.equal(vwapResult.wouldFullyFill, true);
    assert.equal(vwapResult.bestPrice, 50150);
    assert.equal(vwapResult.estimatedVWAP, 50180);
    assert.equal(vwapResult.slippageAmount, 30);
    assert.equal(vwapResult.steps.length, 2);
  });

  it('reports unfilledQuantity when order quantity exceeds total book depth', () => {
    const ob = service.normalize('binance', 'BTC/USDT', rawBids, rawAsks);

    // Total ask quantity in book = 1.0 + 2.0 + 5.0 = 8.0 BTC
    // Request 10.0 BTC
    const vwapResult = service.calculateDetailedVWAP(ob, 'BUY', 10.0);

    assert.equal(vwapResult.fillableQuantity, 8.0);
    assert.equal(vwapResult.unfilledQuantity, 2.0);
    assert.equal(vwapResult.wouldFullyFill, false);
  });

  it('computes liquidity depth bands and imbalance ratio accurately', () => {
    const ob = service.normalize('binance', 'BTC/USDT', rawBids, rawAsks);
    const analytics = service.analyzeLiquidity(ob);

    // Best bid: 50,100, Best ask: 50,150 -> Mid: 50,125
    assert.equal(analytics.midPrice, 50125);
    assert.equal(analytics.spread, 50);

    // Bid volume = 0.5 + 1.5 + 3.0 = 5.0
    // Ask volume = 1.0 + 2.0 + 5.0 = 8.0
    // Total = 13.0
    assert.equal(analytics.totalBidVolume, 5.0);
    assert.equal(analytics.totalAskVolume, 8.0);

    // Imbalance ratio = (5.0 - 8.0) / 13.0 = -3 / 13 ~= -0.2307 (ask dominance)
    assert.ok(analytics.imbalanceRatio < 0);
    assert.equal(Math.round(analytics.imbalanceRatio * 1000) / 1000, -0.231);

    // Check depth bands structure
    assert.ok(analytics.depthBands.withinHalfPercent.bidVolume >= 0);
    assert.ok(analytics.depthBands.withinOnePercent.askVolume >= 0);
  });
});
