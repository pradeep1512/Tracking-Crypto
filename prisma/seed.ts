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

  const deltaExchange = await prisma.exchange.upsert({
    where: { name: 'delta' },
    update: {
      displayName: 'Delta Exchange India',
      baseApiUrl: 'https://api.india.delta.exchange',
      wsUrl: 'wss://socket.india.delta.exchange',
      isEnabled: true,
      isMock: false,
    },
    create: {
      name: 'delta',
      displayName: 'Delta Exchange India',
      baseApiUrl: 'https://api.india.delta.exchange',
      wsUrl: 'wss://socket.india.delta.exchange',
      isEnabled: true,
      isMock: false,
    },
  });

  console.log('✅ Exchanges verified:', mockExchange.name, deltaExchange.name);

  // ── Trading Pairs ────────────────────────────────────────────────────────────
  const pairs = [
    { symbol: 'BTCUSD', base: 'BTC', quote: 'USD' },
    { symbol: 'ETHUSD', base: 'ETH', quote: 'USD' },
    { symbol: 'SOLUSD', base: 'SOL', quote: 'USD' },
    { symbol: 'XRPUSD', base: 'XRP', quote: 'USD' },
    { symbol: 'DOGEUSD', base: 'DOGE', quote: 'USD' },
  ];

  for (const pair of pairs) {
    for (const ex of [mockExchange, deltaExchange]) {
      await prisma.tradingPair.upsert({
        where: { exchangeId_symbol: { exchangeId: ex.id, symbol: pair.symbol } },
        update: {},
        create: {
          exchangeId: ex.id,
          symbol: pair.symbol,
          baseCurrency: pair.base,
          quoteCurrency: pair.quote,
          isEnabled: true,
        },
      });
    }
  }

  console.log(`✅ ${pairs.length} trading pairs verified for each exchange`);

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
          preferredCurrency: 'USD',
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
          preferredCurrency: 'USD',
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
          preferredCurrency: 'USD',
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
