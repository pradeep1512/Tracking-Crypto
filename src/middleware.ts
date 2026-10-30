import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth/auth.config';
import { NextResponse, type NextRequest } from 'next/server';

const { auth } = NextAuth(authConfig);

export interface RouteSessionUser {
  id?: string;
  email?: string | null;
  role?: string | null;
}

/**
 * Core routing & security policy engine.
 * Exported for modular testing and used directly by NextAuth middleware wrapper.
 */
export function handleAuthRouting(req: NextRequest, sessionUser?: RouteSessionUser | null) {
  const isLoggedIn = !!sessionUser?.id;
  const userRole = sessionUser?.role?.toUpperCase();
  const { pathname, search } = req.nextUrl;

  // 1. Explicitly Public Web Pages
  const publicPages = [
    '/',
    '/signin',
    '/signup',
    '/admin/login',
    '/forgot-password',
    '/reset-password',
    '/auth/login',
    '/auth/register',
    '/auth/error',
  ];

  if (publicPages.includes(pathname)) {
    // If an already logged-in admin visits admin login, send to admin dashboard
    if (isLoggedIn && pathname === '/admin/login' && userRole === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // 2. Explicitly Public API Routes (Market data, public quotes, NextAuth callbacks)
  const isPublicApiRoute =
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/market') ||
    pathname.startsWith('/api/exchanges') ||
    pathname.startsWith('/api/price-gap') ||
    pathname.startsWith('/api/mcx') ||
    pathname.startsWith('/api/options') ||
    pathname.startsWith('/api/expiry');

  if (isPublicApiRoute) {
    return NextResponse.next();
  }

  // 3. Admin Protected Routes (/admin/dashboard, /admin/...)
  if (pathname.startsWith('/admin')) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname + search);
      return NextResponse.redirect(loginUrl);
    }

    if (userRole !== 'ADMIN') {
      const userDashboardUrl = new URL('/dashboard', req.url);
      userDashboardUrl.searchParams.set('denied', 'admin_only');
      return NextResponse.redirect(userDashboardUrl);
    }

    return NextResponse.next();
  }

  // 4. Admin Protected API Routes (/api/admin/...)
  if (pathname.startsWith('/api/admin')) {
    if (!isLoggedIn) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Administrator privileges required',
          code: 'FORBIDDEN',
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  // 5. Dashboard Routes (/dashboard/*)
  if (pathname.startsWith('/dashboard')) {
    if (!isLoggedIn) {
      const fullRequestedUrl = pathname + search;
      const signinUrl = new URL('/signin', req.url);
      signinUrl.searchParams.set('callbackUrl', fullRequestedUrl);
      signinUrl.searchParams.set('authRequired', 'true');
      return NextResponse.redirect(signinUrl);
    }

    // Authenticated dashboard response:
    // Strictly prevent browser back-button caching after logout
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  // 6. Protected Private APIs (/api/portfolio, /api/brokers, /api/orders, /api/trading, etc.)
  if (pathname.startsWith('/api/')) {
    if (!isLoggedIn) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required: Please sign in to access this API',
          code: 'UNAUTHORIZED',
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export default auth((req) => {
  return handleAuthRouting(req, req.auth?.user as RouteSessionUser | undefined);
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.pdf$).*)'],
};
