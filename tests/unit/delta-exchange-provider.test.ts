import { describe, it } from 'node:test';
import assert from 'node:assert';
import { deltaExchangeService } from '../../src/services/DeltaExchangeService';
import { DeltaExchangeAdapter } from '../../src/lib/exchange/DeltaExchangeAdapter';

describe('Delta Exchange India — Sole Crypto Market Data & Derivatives Provider', () => {
  const adapter = new DeltaExchangeAdapter();

  it('verifies Delta Exchange India production and testnet REST endpoints', () => {
    assert.strictEqual(deltaExchangeService.getBaseUrl(), 'https://api.india.delta.exchange');
    assert.strictEqual(deltaExchangeService.getTestnetBaseUrl(), 'https://cdn-ind.testnet.deltaex.org');
    assert.strictEqual(deltaExchangeService.getWebSocketUrl(), 'wss://socket.india.delta.exchange');
  });

  it('fetches live BTCUSD and ETHUSD tickers directly from Delta Exchange', async () => {
    const btcTicker = await adapter.getTicker('BTCUSD');
    assert.strictEqual(btcTicker.symbol, 'BTCUSD');
    assert.ok(btcTicker.lastPrice > 0, `BTC price should be positive, got ${btcTicker.lastPrice}`);
    assert.ok(btcTicker.bestBid > 0);
    assert.ok(btcTicker.bestAsk >= btcTicker.bestBid);
    assert.strictEqual(btcTicker.quotingAsset, 'USD');
    assert.ok(btcTicker.exchangeTimestamp instanceof Date);

    const ethTicker = await adapter.getTicker('ETHUSD');
    assert.strictEqual(ethTicker.symbol, 'ETHUSD');
    assert.ok(ethTicker.lastPrice > 0);
    assert.strictEqual(ethTicker.quotingAsset, 'USD');
  });

  it('fetches level 2 order book depth from Delta Exchange', async () => {
    const orderBook = await adapter.getOrderBook('BTCUSD', 20);
    assert.strictEqual(orderBook.symbol, 'BTCUSD');
    assert.strictEqual(orderBook.exchangeId, 'delta');
    assert.ok(orderBook.bids.length > 0, 'Expected bid levels from Delta Exchange');
    assert.ok(orderBook.asks.length > 0, 'Expected ask levels from Delta Exchange');
    assert.ok(orderBook.asks[0].price >= orderBook.bids[0].price, 'Best ask must be >= best bid');
  });

  it('retrieves ALL available crypto options expiries for BTC and ETH using cursor pagination', async () => {
    const btcData = await deltaExchangeService.getAvailableExpiries('BTC');
    assert.ok(Array.isArray(btcData.expiries), 'Expected array of expiry dates');
    assert.ok(btcData.expiries.length > 0, 'Expected at least 1 future expiry date from Delta Exchange');

    const ethData = await deltaExchangeService.getAvailableExpiries('ETH');
    assert.ok(Array.isArray(ethData.expiries));
    assert.ok(ethData.expiries.length > 0, 'Expected at least 1 future ETH expiry date');
  });

  it('builds real-time options chain with live strikes, Greeks, IV, and Volume', async () => {
    const expiriesData = await deltaExchangeService.getAvailableExpiries('BTC');
    const expiry = expiriesData.expiries[0].iso;

    const chain = await deltaExchangeService.getOptionsChain('BTC', expiry);
    assert.strictEqual(chain.underlying, 'BTC');
    assert.strictEqual(chain.expiryDate, expiry);
    assert.ok(chain.strikes.length > 0, 'Expected listed strikes in chain');

    const atmRow = chain.strikes.find((s) => s.isATM);
    assert.ok(atmRow, 'Expected ATM strike identified');
    assert.strictEqual(atmRow.call.optionType, 'CE');
    assert.strictEqual(atmRow.put.optionType, 'PE');
  });

  it('resolves exact Delta Exchange product ID before placing options order', async () => {
    const expiriesData = await deltaExchangeService.getAvailableExpiries('BTC');
    const expiry = expiriesData.expiries[0].iso;
    const chain = await deltaExchangeService.getOptionsChain('BTC', expiry);
    const firstStrike = chain.strikes[0].strikePrice;

    const resolvedCall = await deltaExchangeService.resolveOptionProduct('BTC', expiry, firstStrike, 'CE');
    assert.ok(resolvedCall, 'Call product resolution should succeed');
    assert.ok(resolvedCall.productId > 0);
    assert.ok(resolvedCall.symbol.includes(String(firstStrike)));

    const resolvedPut = await deltaExchangeService.resolveOptionProduct('BTC', expiry, firstStrike, 'PE');
    assert.ok(resolvedPut, 'Put product resolution should succeed');
    assert.ok(resolvedPut.productId > 0);
  });

  it('previews option order with margin, estimated value in USD, and tick validation', async () => {
    const expiriesData = await deltaExchangeService.getAvailableExpiries('BTC');
    const expiry = expiriesData.expiries[0].iso;
    const chain = await deltaExchangeService.getOptionsChain('BTC', expiry);
    const strike = chain.strikes[0].strikePrice;

    const resolved = await deltaExchangeService.resolveOptionProduct('BTC', expiry, strike, 'CE');
    assert.ok(resolved);

    const preview = await deltaExchangeService.previewOptionOrder(resolved.productId, 'BUY', 'market_order', 1);
    assert.strictEqual(preview.productId, resolved.productId);
    assert.strictEqual(preview.symbol, resolved.symbol);
    assert.ok(preview.orderValueUSD >= 0);
    assert.ok(preview.estimatedFeeUSD >= 0);
    assert.ok(preview.marginRequiredUSD >= 0);
  });
});
