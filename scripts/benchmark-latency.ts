/**
 * Latency & Processing Performance Benchmark
 *
 * Runs 10,000 synthetic market data ticks and deep order books through:
 * 1. Order book normalization
 * 2. VWAP ladder computation
 * 3. Gap classification & root cause analysis
 * 4. Liquidity depth band & imbalance calculation
 *
 * Measures: p50, p90, p95, p99 latencies, throughput (ops/sec), and memory footprint.
 */

import { OrderBookService } from '../src/services/OrderBookService';
import { PriceGapDetectionService } from '../src/services/PriceGapDetectionService';
import { percentile } from '../src/lib/utils/api';
import type { Ticker } from '../src/types';

async function runBenchmark() {
  const NUM_TICKS = 10_000;
  console.log(`\n===============================================================`);
  console.log(`🚀 Starting TrackingCrypt Latency Benchmark (${NUM_TICKS.toLocaleString()} ticks)`);
  console.log(`===============================================================\n`);

  const orderBookService = new OrderBookService();
  const priceGapService = new PriceGapDetectionService();

  // Pre-generate 20-level synthetic order books
  const baseMid = 50000;
  const generateLevels = (isBids: boolean): [number, number][] => {
    const levels: [number, number][] = [];
    for (let i = 1; i <= 20; i++) {
      const price = isBids ? baseMid - i * 5 : baseMid + i * 5;
      const qty = 0.5 + Math.random() * 2.0;
      levels.push([price, qty]);
    }
    return levels;
  };

  const syntheticTicks: Array<{
    bids: [number, number][];
    asks: [number, number][];
    ticker: Ticker;
    orderQty: number;
    refPrice: number;
  }> = [];

  for (let i = 0; i < NUM_TICKS; i++) {
    const bids = generateLevels(true);
    const asks = generateLevels(false);
    const bestBid = bids[0][0];
    const bestAsk = asks[0][0];
    const spread = bestAsk - bestBid;

    syntheticTicks.push({
      bids,
      asks,
      ticker: {
        exchangeId: 'binance',
        exchangeName: 'Binance Spot',
        symbol: 'BTC/USDT',
        lastPrice: (bestBid + bestAsk) / 2,
        bestBid,
        bestAsk,
        bidQuantity: 1.0,
        askQuantity: 1.0,
        spread,
        spreadPercentage: (spread / ((bestBid + bestAsk) / 2)) * 100,
        exchangeTimestamp: new Date(),
        receivedAt: new Date(),
        dataAgeMs: Math.floor(Math.random() * 200),
        isMock: false,
      },
      orderQty: 0.1 + Math.random() * 5.0,
      refPrice: bestAsk * (1 - 0.002 + Math.random() * 0.004),
    });
  }

  // Force garbage collection / take initial memory baseline
  const memBefore = process.memoryUsage().heapUsed;
  const latenciesMicroseconds: number[] = new Array(NUM_TICKS);

  const startTotal = process.hrtime.bigint();

  // Execute benchmark loop
  for (let i = 0; i < NUM_TICKS; i++) {
    const tick = syntheticTicks[i];
    const t0 = process.hrtime.bigint();

    // 1. Order book normalization
    const ob = orderBookService.normalize('binance', 'BTC/USDT', tick.bids, tick.asks);

    // 2. Liquidity analytics
    orderBookService.analyzeLiquidity(ob);

    // 3. Price gap & VWAP execution analysis
    priceGapService.analyze({
      side: 'BUY',
      referencePrice: tick.refPrice,
      ticker: tick.ticker,
      orderBook: ob,
      quantity: tick.orderQty,
    });

    const t1 = process.hrtime.bigint();
    latenciesMicroseconds[i] = Number(t1 - t0) / 1000; // convert ns to µs
  }

  const endTotal = process.hrtime.bigint();
  const totalMs = Number(endTotal - startTotal) / 1_000_000;
  const memAfter = process.memoryUsage().heapUsed;

  // Compute statistics
  latenciesMicroseconds.sort((a, b) => a - b);
  const minUs = latenciesMicroseconds[0];
  const maxUs = latenciesMicroseconds[latenciesMicroseconds.length - 1];
  const meanUs =
    latenciesMicroseconds.reduce((acc, v) => acc + v, 0) / latenciesMicroseconds.length;
  const p50Us = percentile(latenciesMicroseconds, 50);
  const p90Us = percentile(latenciesMicroseconds, 90);
  const p95Us = percentile(latenciesMicroseconds, 95);
  const p99Us = percentile(latenciesMicroseconds, 99);
  const opsPerSec = Math.round((NUM_TICKS / (totalMs / 1000)));
  const heapDeltaMB = ((memAfter - memBefore) / 1024 / 1024).toFixed(2);

  // Display results
  console.log(`⏱️  Benchmark Results:`);
  console.log(`---------------------------------------------------------------`);
  console.log(`Total Ticks Processed:   ${NUM_TICKS.toLocaleString()} ticks`);
  console.log(`Total Processing Time:   ${totalMs.toFixed(2)} ms`);
  console.log(`Throughput:              ${opsPerSec.toLocaleString()} ops/sec`);
  console.log(`Memory Delta:            ${heapDeltaMB} MB\n`);

  console.log(`📊 Processing Latency Percentiles (Microseconds):`);
  console.log(`---------------------------------------------------------------`);
  console.log(`Min:                     ${minUs.toFixed(2)} µs   (${(minUs / 1000).toFixed(4)} ms)`);
  console.log(`p50 (Median):            ${p50Us.toFixed(2)} µs   (${(p50Us / 1000).toFixed(4)} ms)`);
  console.log(`p90:                     ${p90Us.toFixed(2)} µs   (${(p90Us / 1000).toFixed(4)} ms)`);
  console.log(`p95:                     ${p95Us.toFixed(2)} µs   (${(p95Us / 1000).toFixed(4)} ms)`);
  console.log(`p99:                     ${p99Us.toFixed(2)} µs   (${(p99Us / 1000).toFixed(4)} ms)`);
  console.log(`Mean:                    ${meanUs.toFixed(2)} µs   (${(meanUs / 1000).toFixed(4)} ms)`);
  console.log(`Max:                     ${maxUs.toFixed(2)} µs   (${(maxUs / 1000).toFixed(4)} ms)`);
  console.log(`===============================================================\n`);

  // Performance SLA verification
  if (p99Us < 5000) {
    console.log(`✅ SLA PASS: p99 latency (${(p99Us / 1000).toFixed(3)}ms) is well under the 5ms real-time limit!`);
  } else {
    console.warn(`⚠️ SLA WARNING: p99 latency exceeded 5ms target.`);
  }
}

runBenchmark().catch(console.error);
