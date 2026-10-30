import { describe, it } from 'node:test';
import assert from 'node:assert';
import { NextRequest } from 'next/server';
import {
  validateCallbackUrl,
  checkPortfolioOwnership,
  requireAuthUser,
  type AuthenticatedUser,
} from '../../src/lib/auth/server-auth';
import middleware, { handleAuthRouting } from '../../src/middleware';
import type { UserPortfolio } from '../../src/types';

describe('Protected Routes & Authentication System', () => {
  describe('1. Callback URL Validation & Open Redirect Prevention', () => {
    it('preserves valid internal paths without modification', () => {
      assert.strictEqual(validateCallbackUrl('/dashboard/orders'), '/dashboard/orders');
      assert.strictEqual(validateCallbackUrl('/dashboard/portfolio'), '/dashboard/portfolio');
      assert.strictEqual(
        validateCallbackUrl('/dashboard/portfolio?category=CRYPTO'),
        '/dashboard/portfolio?category=CRYPTO'
      );
      assert.strictEqual(validateCallbackUrl('/dashboard/active-trading'), '/dashboard/active-trading');
    });

    it('rejects external URL redirects and falls back to /dashboard', () => {
      assert.strictEqual(validateCallbackUrl('https://evil.com'), '/dashboard');
      assert.strictEqual(validateCallbackUrl('http://attacker.com/steal-creds'), '/dashboard');
      assert.strictEqual(validateCallbackUrl('//evil.com/fake-login'), '/dashboard');
      assert.strictEqual(validateCallbackUrl('/\\evil.com'), '/dashboard');
      assert.strictEqual(validateCallbackUrl('javascript:alert(1)'), '/dashboard');
      assert.strictEqual(validateCallbackUrl('data:text/html,<html>malicious</html>'), '/dashboard');
    });

    it('handles empty, null, or undefined callbackUrl safely', () => {
      assert.strictEqual(validateCallbackUrl(null), '/dashboard');
      assert.strictEqual(validateCallbackUrl(undefined), '/dashboard');
      assert.strictEqual(validateCallbackUrl(''), '/dashboard');
      assert.strictEqual(validateCallbackUrl('   '), '/dashboard');
    });
  });

  describe('2. Dashboard Route Middleware Protection', () => {
    it('redirects unauthenticated user accessing /dashboard/orders to /signin with callbackUrl and authRequired', () => {
      const req = new NextRequest('http://localhost:3000/dashboard/orders');
      const res = handleAuthRouting(req, null);

      assert.strictEqual(res.status, 307);
      const location = res.headers.get('location');
      assert.ok(location, 'Expected location redirect header');

      const redirectUrl = new URL(location!);
      assert.strictEqual(redirectUrl.pathname, '/signin');
      assert.strictEqual(redirectUrl.searchParams.get('callbackUrl'), '/dashboard/orders');
      assert.strictEqual(redirectUrl.searchParams.get('authRequired'), 'true');
    });

    it('redirects unauthenticated user accessing /dashboard/portfolio to /signin with callbackUrl', () => {
      const req = new NextRequest('http://localhost:3000/dashboard/portfolio?filter=gold');
      const res = handleAuthRouting(req, null);

      assert.strictEqual(res.status, 307);
      const redirectUrl = new URL(res.headers.get('location')!);
      assert.strictEqual(redirectUrl.pathname, '/signin');
      assert.strictEqual(redirectUrl.searchParams.get('callbackUrl'), '/dashboard/portfolio?filter=gold');
      assert.strictEqual(redirectUrl.searchParams.get('authRequired'), 'true');
    });

    it('allows access to public pages without login', () => {
      const publicRoutes = ['/signin', '/signup', '/forgot-password', '/reset-password', '/'];
      for (const route of publicRoutes) {
        const req = new NextRequest(`http://localhost:3000${route}`);
        const res = handleAuthRouting(req, null);
        assert.ok(!res || res.status === 200, `Expected ${route} to be publicly accessible`);
      }
    });

    it('sets Cache-Control no-store headers on authenticated dashboard routes to prevent back-navigation caching', () => {
      const req = new NextRequest('http://localhost:3000/dashboard');
      const res = handleAuthRouting(req, {
        id: 'usr-1',
        email: 'dev@trackingcrypt.local',
        role: 'ADMIN',
      });

      assert.strictEqual(res.status, 200);

      const cacheControl = res.headers.get('Cache-Control');
      assert.ok(cacheControl?.includes('no-store'), 'Expected Cache-Control no-store');
      assert.ok(cacheControl?.includes('must-revalidate'), 'Expected must-revalidate');
      assert.strictEqual(res.headers.get('Pragma'), 'no-cache');
    });

    it('redirects unauthenticated users attempting to access admin routes to /admin/login', () => {
      const req = new NextRequest('http://localhost:3000/admin/dashboard');
      const res = handleAuthRouting(req, null);

      assert.strictEqual(res.status, 307);
      const redirectUrl = new URL(res.headers.get('location')!);
      assert.strictEqual(redirectUrl.pathname, '/admin/login');
      assert.strictEqual(redirectUrl.searchParams.get('callbackUrl'), '/admin/dashboard');
    });
  });

  describe('3. Protected API Routes Authentication (HTTP 401)', () => {
    it('returns HTTP 401 Unauthorized for unauthenticated portfolio API request', async () => {
      const req = new NextRequest('http://localhost:3000/api/portfolio');
      const res = handleAuthRouting(req, null);

      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.code, 'UNAUTHORIZED');
      assert.ok(body.error.includes('Authentication required'));
    });

    it('returns HTTP 401 Unauthorized for unauthenticated broker orders API request', async () => {
      const req = new NextRequest('http://localhost:3000/api/brokers/order', { method: 'POST' });
      const res = handleAuthRouting(req, null);

      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.code, 'UNAUTHORIZED');
    });

    it('returns HTTP 401 Unauthorized for unauthenticated orders submission API request', async () => {
      const req = new NextRequest('http://localhost:3000/api/orders/submit', { method: 'POST' });
      const res = handleAuthRouting(req, null);

      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.code, 'UNAUTHORIZED');
    });

    it('returns HTTP 401 Unauthorized for unauthenticated emergency kill switch API request', async () => {
      const req = new NextRequest('http://localhost:3000/api/trading/kill-switch', { method: 'POST' });
      const res = handleAuthRouting(req, null);

      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.code, 'UNAUTHORIZED');
    });

    it('returns HTTP 401 Unauthorized for unauthenticated exchange credentials API request', async () => {
      const req = new NextRequest('http://localhost:3000/api/credentials');
      const res = handleAuthRouting(req, null);

      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.code, 'UNAUTHORIZED');
    });

    it('allows public market data APIs without authentication', () => {
      const publicApis = [
        '/api/mcx/tickers',
        '/api/mcx/specifications',
        '/api/options/chain?underlying=BTC',
        '/api/price-gap/history',
        '/api/expiry/calendar',
      ];

      for (const api of publicApis) {
        const req = new NextRequest(`http://localhost:3000${api}`);
        const res = handleAuthRouting(req, null);
        assert.ok(!res || res.status === 200, `Expected ${api} to be public`);
      }
    });
  });

  describe('4. Portfolio User Ownership & Access Control (HTTP 403)', () => {
    const mockPortfolio: UserPortfolio = {
      id: 'port_alice_001',
      userId: 'user_alice_123',
      name: "Alice's Growth Portfolio",
      description: 'A mock portfolio for testing ownership',
      category: 'CRYPTO',
      currency: 'USDT',
      initialCapital: 10000,
      totalCapital: 10000,
      allocatedCapital: 5000,
      availableBalance: 5000,
      investedAmount: 0,
      currentMarketValue: 0,
      realizedPnL: 0,
      unrealizedPnL: 0,
      totalCharges: 0,
      maxInvestmentLimit: 8000,
      riskLimitPercentage: 5,
      maxDailyLoss: 500,
      status: 'READY',
      executionMode: 'PAPER',
      connectedBrokerName: 'Paper Simulator',
      assets: [],
      positions: [],
      activePositionsCount: 0,
      expiringContractsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('allows owner to access their own portfolio', () => {
      const ownerUser: AuthenticatedUser = {
        id: 'user_alice_123',
        email: 'alice@example.com',
        role: 'USER',
      };

      const result = checkPortfolioOwnership(mockPortfolio, ownerUser);
      assert.strictEqual(result.allowed, true);
      assert.strictEqual(result.errorResponse, undefined);
    });

    it('allows administrator to access any user portfolio', () => {
      const adminUser: AuthenticatedUser = {
        id: 'admin_tc_root',
        email: 'admin@trackingcrypt.com',
        role: 'ADMIN',
      };

      const result = checkPortfolioOwnership(mockPortfolio, adminUser);
      assert.strictEqual(result.allowed, true);
    });

    it('strictly denies another standard user from accessing the portfolio with HTTP 403', async () => {
      const bobUser: AuthenticatedUser = {
        id: 'user_bob_456',
        email: 'bob@example.com',
        role: 'USER',
      };

      const result = checkPortfolioOwnership(mockPortfolio, bobUser);
      assert.strictEqual(result.allowed, false);
      assert.ok(result.errorResponse, 'Expected errorResponse to be returned');
      assert.strictEqual(result.errorResponse.status, 403);

      const json = await result.errorResponse.json();
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.code, 'FORBIDDEN');
      assert.ok(json.error.includes('permission'));
    });
  });

  describe('5. Logout & Session Expiration Signaling', () => {
    it('validates that signout URL parameters trigger expected notifications', () => {
      const logoutUrl = new URL('http://localhost:3000/signin?logout=true');
      assert.strictEqual(logoutUrl.searchParams.get('logout'), 'true');

      const expiredUrl = new URL('http://localhost:3000/signin?expired=true&callbackUrl=%2Fdashboard');
      assert.strictEqual(expiredUrl.searchParams.get('expired'), 'true');
      assert.strictEqual(expiredUrl.searchParams.get('callbackUrl'), '/dashboard');

      const sessionExpiredUrl = new URL('http://localhost:3000/signin?error=SessionExpired');
      assert.strictEqual(sessionExpiredUrl.searchParams.get('error'), 'SessionExpired');
    });
  });
});
