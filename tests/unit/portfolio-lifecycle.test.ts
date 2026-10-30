import { describe, it } from 'node:test';
import assert from 'node:assert';
import { portfolioService } from '../../src/services/PortfolioService';

describe('Portfolio Management & Strategy Lifecycle', () => {
  it('creates and retrieves user portfolios with correct capital and risk metrics', () => {
    const p = portfolioService.createPortfolio({
      name: 'Test Growth Portfolio',
      category: 'CRYPTO',
      currency: 'USDT',
      initialCapital: 25000,
      riskLimitPercentage: 3.5,
    });

    assert.strictEqual(p.name, 'Test Growth Portfolio');
    assert.strictEqual(p.initialCapital, 25000);
    assert.strictEqual(p.status, 'READY');

    const fetched = portfolioService.getPortfolioById(p.id);
    assert.strictEqual(fetched?.id, p.id);
  });

  it('runs 12-step verification when starting trading on a portfolio', async () => {
    const p = portfolioService.createPortfolio({
      name: 'Verification Target Portfolio',
      category: 'MCX_COMMODITY',
      currency: 'INR',
      initialCapital: 500000,
    });

    const result = await portfolioService.startTrading(p.id, true);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.verificationLog.length, 12);
    assert.strictEqual(result.portfolio?.status, 'RUNNING');
  });

  it('executes Pause, Resume, Stop, and Position Close lifecycle controls', () => {
    const p = portfolioService.createPortfolio({
      name: 'State Machine Portfolio',
      category: 'GOLD',
      currency: 'INR',
      initialCapital: 1000000,
    });

    const paused = portfolioService.pauseTrading(p.id);
    assert.strictEqual(paused.status, 'PAUSED');

    const resumed = portfolioService.resumeTrading(p.id);
    assert.strictEqual(resumed.status, 'RUNNING');

    const stopped = portfolioService.stopTrading(p.id);
    assert.strictEqual(stopped.status, 'STOPPED');
  });

  it('adds an open position and closes it realizing profit and loss', () => {
    const p = portfolioService.createPortfolio({
      name: 'Trading Test Portfolio',
      category: 'MCX_COMMODITY',
      currency: 'INR',
      initialCapital: 500000,
    });

    const pos = portfolioService.addPosition(p.id, {
      symbol: 'GOLD26NOV',
      name: 'Gold Nov Fut',
      category: 'MCX_COMMODITY',
      side: 'BUY',
      quantity: 1,
      entryPrice: 78000,
      currentPrice: 78500,
      investedAmount: 78000,
      currentMarketValue: 78500,
      unrealizedPnL: 500,
      unrealizedPnLPct: 0.64,
      realizedPnL: 0,
      totalCharges: 25,
    });

    assert.strictEqual(pos.status, 'OPEN');

    const closed = portfolioService.closePosition(p.id, pos.id);
    assert.strictEqual(closed.position.status, 'CLOSED');
    assert.strictEqual(closed.position.realizedPnL, 500);

    const txs = portfolioService.getTransactions(p.id);
    assert.strictEqual(txs.length >= 2, true); // Open tx + Close tx
  });
});
