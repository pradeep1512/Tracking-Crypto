/**
 * Database seed script for TrackingCrypt development
 * Run with: npx prisma db seed
 *
 * Creates:
 * - Default exchanges (mock, binance placeholder)
 * - Common trading pairs
 * - A dev user account
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding TrackingCrypt database...');

  // ── Exchanges ───────────────────────────────────────────────────────────────
  const mockExchange = await prisma.exchange.upsert({
    where: { name: 'mock' },
    update: {},
    create: {
      name: 'mock',
      displayName: 'Mock Exchange (Dev)',
      baseApiUrl: 'http://localhost:3000/api',
      wsUrl: null,
      isEnabled: true,
      isMock: true,
    },
  });

  const binanceExchange = await prisma.exchange.upsert({
    where: { name: 'binance' },
    update: {},
    create: {
      name: 'binance',
      displayName: 'Binance',
      baseApiUrl: 'https://api.binance.com',
      wsUrl: 'wss://stream.binance.com:9443',
      isEnabled: false, // disabled until API key configured
      isMock: false,
    },
  });

  console.log('✅ Exchanges created:', mockExchange.name, binanceExchange.name);

  // ── Trading Pairs ────────────────────────────────────────────────────────────
  const pairs = [
    { symbol: 'BTCINR', base: 'BTC', quote: 'INR' },
    { symbol: 'ETHINR', base: 'ETH', quote: 'INR' },
    { symbol: 'BNBINR', base: 'BNB', quote: 'INR' },
    { symbol: 'USDTINR', base: 'USDT', quote: 'INR' },
    { symbol: 'BTCUSDT', base: 'BTC', quote: 'USDT' },
    { symbol: 'ETHUSDT', base: 'ETH', quote: 'USDT' },
  ];

  for (const pair of pairs) {
    await prisma.tradingPair.upsert({
      where: { exchangeId_symbol: { exchangeId: mockExchange.id, symbol: pair.symbol } },
      update: {},
      create: {
        exchangeId: mockExchange.id,
        symbol: pair.symbol,
        baseCurrency: pair.base,
        quoteCurrency: pair.quote,
        isEnabled: true,
      },
    });
  }

  console.log(`✅ ${pairs.length} trading pairs seeded`);

  // ── Dev User ────────────────────────────────────────────────────────────────
  const devPassword = await bcrypt.hash('DevPassword123!', 12);

  const devUser = await prisma.user.upsert({
    where: { email: 'dev@trackingcrypt.local' },
    update: {},
    create: {
      email: 'dev@trackingcrypt.local',
      name: 'Dev User',
      passwordHash: devPassword,
      role: 'ADMIN',
      userSettings: {
        create: {
          preferredCurrency: 'INR',
          enablePaperTrading: true,
          enablePriceAlerts: true,
          maximumAllowedGapPct: 2.0,
        },
      },
    },
  });

  console.log(`✅ Dev user: ${devUser.email} (password: DevPassword123!)`);
  console.log('');
  console.log('🚀 Database seeded successfully!');
  console.log('');
  console.log('   Login: http://localhost:3000/auth/login');
  console.log('   Email: dev@trackingcrypt.local');
  console.log('   Pass:  DevPassword123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
