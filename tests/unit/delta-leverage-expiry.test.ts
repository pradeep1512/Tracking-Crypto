import { describe, it } from 'node:test';
import assert from 'node:assert';
import { deltaExchangeService } from '../../src/services/DeltaExchangeService';
import fs from 'fs';
import path from 'path';

describe('Delta Exchange Leverage, Liquidation, Expiry & Options Chain Verification', () => {
  describe('1. Dynamic Cursor Pagination & Full Expiry Loading (BTC & ETH)', () => {
    it('retrieves more than 100 option products across multiple pages for BTC', async () => {
      const btcProducts = await deltaExchangeService.getAllOptionProducts(false, 'BTC');
      assert.ok(Array.isArray(btcProducts), 'Expected an array of BTC products');
      assert.ok(btcProducts.length > 100, `Expected > 100 products from cursor pagination, got ${btcProducts.length}`);

      // Verify each product has required Delta Exchange fields
      const sample = btcProducts[0];
      assert.ok(sample.id, 'Expected product id');
      assert.ok(sample.symbol, 'Expected product symbol');
      assert.ok(sample.settlement_time, 'Expected settlement_time');
      assert.ok(sample.strike_price, 'Expected strike_price');
    });

    it('loads every available future expiry date for BTC without hardcoding', async () => {
      const btcExpiries = await deltaExchangeService.getAvailableExpiries('BTC');
      assert.strictEqual(btcExpiries.underlying, 'BTC');
      assert.ok(btcExpiries.expiries.length >= 5, `Expected at least 5 future expiries, got ${btcExpiries.expiries.length}`);

      const now = Date.now();
      for (const exp of btcExpiries.expiries) {
        assert.ok(new Date(exp.iso).getTime() > now, `Expiry ${exp.iso} should be in the future`);
        assert.ok(exp.contractCount > 0, `Expected contracts for expiry ${exp.iso}`);
        assert.ok(exp.settlementTimeIst.includes('IST'), 'Expected IST settlement timestamp');
        assert.ok(exp.settlementTimeUtc.includes('UTC'), 'Expected UTC settlement timestamp');
      }
    });

    it('retrieves all available future expiry dates for ETH via pagination', async () => {
      const ethProducts = await deltaExchangeService.getAllOptionProducts(false, 'ETH');
      assert.ok(ethProducts.length > 50, `Expected > 50 ETH products, got ${ethProducts.length}`);

      const ethExpiries = await deltaExchangeService.getAvailableExpiries('ETH');
      assert.strictEqual(ethExpiries.underlying, 'ETH');
      assert.ok(ethExpiries.expiries.length >= 5, `Expected multiple ETH expiries, got ${ethExpiries.expiries.length}`);
    });
  });

  describe('2. Options Chain Table & Strike Resolution', () => {
    it('loads actual strike list for selected expiry with Calls and Puts side by side', async () => {
      const expiries = await deltaExchangeService.getAvailableExpiries('BTC');
      const targetExpiry = expiries.expiries[0].iso;

      const chain = await deltaExchangeService.getOptionsChain('BTC', targetExpiry);
      assert.strictEqual(chain.underlying, 'BTC');
      assert.ok(chain.underlyingPrice > 0, 'Expected positive underlying price');
      assert.ok(chain.strikes.length > 0, 'Expected strike rows in options chain');

      // Check numerical sorting
      for (let i = 1; i < chain.strikes.length; i++) {
        assert.ok(
          chain.strikes[i].strikePrice >= chain.strikes[i - 1].strikePrice,
          'Expected strikes to be sorted numerically in ascending order'
        );
      }

      // Check ATM strike identification
      const atmRow = chain.strikes.find((r) => r.isATM);
      assert.ok(atmRow, 'Expected an ATM strike row identified');

      // Verify side-by-side call and put contract details
      const firstRow = chain.strikes[0];
      assert.strictEqual(firstRow.call.optionType, 'CE');
      assert.strictEqual(firstRow.put.optionType, 'PE');
      assert.strictEqual(firstRow.call.strikePrice, firstRow.strikePrice);
      assert.strictEqual(firstRow.put.strikePrice, firstRow.strikePrice);
    });

    it('resolves the exact Delta Exchange product ID without guessing', async () => {
      const expiries = await deltaExchangeService.getAvailableExpiries('BTC');
      const targetExpiry = expiries.expiries[0].iso;
      const chain = await deltaExchangeService.getOptionsChain('BTC', targetExpiry);
      const testStrike = chain.strikes[0].strikePrice;

      const resolved = await deltaExchangeService.resolveOptionProduct({
        underlying: 'BTC',
        expiry: targetExpiry,
        strike: testStrike,
        optionType: 'CE',
      });

      assert.ok(resolved.productId > 0, 'Expected a positive numeric product ID');
      assert.ok(resolved.symbol.startsWith('C-BTC-'), `Expected valid symbol format, got ${resolved.symbol}`);
      assert.strictEqual(resolved.quotingAsset, 'USD');
    });
  });

  describe('3. Delta Exchange Leverage Selection & Brackets', () => {
    it('fetches exchange-supported leverage brackets from product details', async () => {
      const products = await deltaExchangeService.getAllOptionProducts(false, 'BTC');
      const sampleProduct = products[0];

      const brackets = await deltaExchangeService.getProductLeverageBrackets(sampleProduct.id);
      assert.strictEqual(brackets.productId, sampleProduct.id);
      assert.ok(Array.isArray(brackets.allowedLeverageValues), 'Expected allowed leverage values array');
      assert.ok(brackets.allowedLeverageValues.length > 0, 'Expected at least 1 leverage level');
      assert.ok(brackets.maxLeverage >= 1, 'Expected max leverage >= 1');
    });

    it('applies and records valid leverage for a product', async () => {
      const products = await deltaExchangeService.getAllOptionProducts(false, 'BTC');
      const sampleProduct = products[0];

      const res = await deltaExchangeService.setProductLeverage(sampleProduct.id, 10);
      assert.strictEqual(res.success, true);
      assert.strictEqual(res.leverage, 10);
      assert.strictEqual(deltaExchangeService.getSelectedProductLeverage(sampleProduct.id), 10);
    });

    it('rejects leverage values exceeding product limits', async () => {
      const products = await deltaExchangeService.getAllOptionProducts(false, 'BTC');
      const sampleProduct = products[0];

      await assert.rejects(
        async () => {
          await deltaExchangeService.setProductLeverage(sampleProduct.id, 500);
        },
        /outside the allowed range/i
      );
    });
  });

  describe('4. Display Amount, Margin, and Liquidation Calculations', () => {
    it('calculates long option preview: 100% premium margin and zero liquidation risk (N/A)', async () => {
      const products = await deltaExchangeService.getAllOptionProducts(false, 'BTC');
      const sampleProduct = products[0];

      const preview = await deltaExchangeService.previewOptionOrder({
        productId: sampleProduct.id,
        size: 5,
        side: 'buy',
        orderType: 'market_order',
        leverage: 1,
      });

      assert.strictEqual(preview.orderQuantity, 5);
      assert.ok(preview.orderValueUSD > 0, 'Expected positive order value');
      assert.ok(preview.requiredInitialMarginUSD >= preview.orderValueUSD, 'Long option margin must cover premium');
      assert.strictEqual(preview.maintenanceMarginUSD, 0, 'Long options have 0 maintenance margin');
      assert.strictEqual(preview.estimatedLiquidationPrice, null, 'Long options cannot be liquidated');
      assert.ok(preview.liquidationPriceDescription.includes('Long Options: Risk capped at premium paid'));
      assert.strictEqual(preview.isLiquidationApplicable, false);
    });

    it('calculates short option preview: margin scales inversely with leverage and estimates liquidation price', async () => {
      const products = await deltaExchangeService.getAllOptionProducts(false, 'BTC');
      const sampleProduct = products[0];

      // Preview with 1x leverage
      const preview1x = await deltaExchangeService.previewOptionOrder({
        productId: sampleProduct.id,
        size: 2,
        side: 'sell',
        orderType: 'market_order',
        leverage: 1,
      });

      // Preview with 10x leverage
      const preview10x = await deltaExchangeService.previewOptionOrder({
        productId: sampleProduct.id,
        size: 2,
        side: 'sell',
        orderType: 'market_order',
        leverage: 10,
      });

      assert.ok(preview10x.requiredInitialMarginUSD < preview1x.requiredInitialMarginUSD, 'Higher leverage should reduce required initial margin');
      assert.strictEqual(preview1x.isLiquidationApplicable, true);
      assert.ok(preview1x.estimatedLiquidationPrice !== null, 'Short options must have an estimated liquidation price');
      assert.ok(preview1x.liquidationPriceDescription.includes('Estimated'));
    });

    it('provides all 9 required fields in order preview calculation', async () => {
      const products = await deltaExchangeService.getAllOptionProducts(false, 'BTC');
      const sampleProduct = products[0];

      const preview = await deltaExchangeService.previewOptionOrder({
        productId: sampleProduct.id,
        size: 10,
        side: 'buy',
        orderType: 'limit_order',
        limitPrice: 50,
        leverage: 5,
        availableBalanceUSD: 25000,
      });

      // 1. Selected leverage
      assert.strictEqual(preview.selectedLeverage, 5);
      // 2. Order quantity
      assert.strictEqual(preview.orderQuantity, 10);
      // 3. Estimated order value / notional
      assert.ok(preview.orderValueUSD > 0);
      // 4. Required initial margin
      assert.ok(preview.requiredInitialMarginUSD > 0);
      // 5. Maintenance margin
      assert.strictEqual(preview.maintenanceMarginUSD, 0);
      // 6. Available account balance
      assert.strictEqual(preview.availableAccountBalanceUSD, 25000);
      // 7. Estimated liquidation price
      assert.strictEqual(preview.estimatedLiquidationPrice, null);
      // 8. Estimated fees
      assert.ok(preview.estimatedFeesUSD > 0);
      // 9. Remaining available margin after order
      assert.strictEqual(
        preview.remainingAvailableMarginUSD,
        Math.round((25000 - preview.requiredInitialMarginUSD) * 100) / 100
      );
    });
  });

  describe('5. Margin Visibility & Summary', () => {
    it('returns all required margin metrics in exchange margin summary', async () => {
      const summary = await deltaExchangeService.getExchangeMarginSummary();
      assert.ok('initialMarginUSD' in summary, 'Expected initialMarginUSD');
      assert.ok('maintenanceMarginUSD' in summary, 'Expected maintenanceMarginUSD');
      assert.ok('positionMarginUSD' in summary, 'Expected positionMarginUSD');
      assert.ok('availableMarginUSD' in summary, 'Expected availableMarginUSD');
      assert.ok('blockedMarginUSD' in summary, 'Expected blockedMarginUSD');
      assert.ok('remainingAvailableBalanceUSD' in summary, 'Expected remainingAvailableBalanceUSD');
      assert.ok('walletBalanceUSD' in summary, 'Expected walletBalanceUSD');
    });
  });

  describe('6. Cleanup Verification: Price Gap & Exchange Accounts Removal', () => {
    it('confirms Price Gap page directory is removed', () => {
      const p = path.join(process.cwd(), 'src', 'app', 'dashboard', 'price-gap');
      assert.strictEqual(fs.existsSync(p), false, 'src/app/dashboard/price-gap must not exist');
    });

    it('confirms Price Gap API routes directory is removed', () => {
      const p = path.join(process.cwd(), 'src', 'app', 'api', 'price-gap');
      assert.strictEqual(fs.existsSync(p), false, 'src/app/api/price-gap must not exist');
    });

    it('confirms Exchange Accounts page directory is removed', () => {
      const p = path.join(process.cwd(), 'src', 'app', 'dashboard', 'exchanges');
      assert.strictEqual(fs.existsSync(p), false, 'src/app/dashboard/exchanges must not exist');
    });
  });
});
