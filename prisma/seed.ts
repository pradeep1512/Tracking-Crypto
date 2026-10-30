/**
 * Database seed script for TrackingCrypt development & administrator bootstrapping
 * Run with: npm run db:seed or npx prisma db seed
 *
 * Creates:
 * - Default exchanges (mock, binance placeholder)
 * - Common trading pairs
 * - Initial System Administrator account (configurable via ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD)
 * - Standard User account (user@trackingcrypt.com)
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
      isEnabled: false,
      isMock: false,
    },
  });

  console.log('✅ Exchanges verified:', mockExchange.name, binanceExchange.name);

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

  console.log(`✅ ${pairs.length} trading pairs verified`);

  // ── Initial Administrator Account ──────────────────────────────────────────
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@trackingcrypt.com').toLowerCase().trim();
  const adminRawPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@123456';
  const adminPasswordHash = await bcrypt.hash(adminRawPassword, 12);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      email: adminEmail,
      name: 'System Administrator',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      isActive: true,
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

  console.log(`✅ Initial Administrator Account: ${adminUser.email} (Role: ADMIN)`);

  // ── Standard User Account ──────────────────────────────────────────────────
  const userEmail = 'user@trackingcrypt.com';
  const userRawPassword = 'User@123456';
  const userPasswordHash = await bcrypt.hash(userRawPassword, 12);

  const regularUser = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      role: 'USER',
      isActive: true,
    },
    create: {
      email: userEmail,
      name: 'Standard Trader',
      passwordHash: userPasswordHash,
      role: 'USER',
      isActive: true,
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

  console.log(`✅ Standard User Account: ${regularUser.email} (Role: USER)`);

  // ── Dev User Account ───────────────────────────────────────────────────────
  const devEmail = 'dev@trackingcrypt.local';
  const devRawPassword = 'DevPassword123!';
  const devPasswordHash = await bcrypt.hash(devRawPassword, 12);

  const devUser = await prisma.user.upsert({
    where: { email: devEmail },
    update: {
      role: 'USER',
      isActive: true,
    },
    create: {
      email: devEmail,
      name: 'Development User',
      passwordHash: devPasswordHash,
      role: 'USER',
      isActive: true,
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

  console.log(`✅ Dev User Account: ${devUser.email} (Role: USER)`);

  console.log('');
  console.log('🚀 Database seeded successfully!');
  console.log('');
  console.log('   User Login:  http://localhost:3000/signin');
  console.log(`   Admin Login: http://localhost:3000/admin/login`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
