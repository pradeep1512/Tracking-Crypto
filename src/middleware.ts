import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const userRole = (session?.user as { role?: string })?.role?.toUpperCase();
  const pathname = req.nextUrl.pathname;

  // 1. Explicitly Public Routes
  const publicExactRoutes = [
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

  const isPublicExact = publicExactRoutes.includes(pathname);
  const isApiAuthRoute = pathname.startsWith('/api/auth');
  const isPublicApiRoute =
    pathname.startsWith('/api/market') ||
    pathname.startsWith('/api/exchanges') ||
    pathname.startsWith('/api/price-gap/current');

  if (isPublicExact || isApiAuthRoute || isPublicApiRoute) {
    // If an already logged-in admin visits admin login, send to admin dashboard
    if (isLoggedIn && pathname === '/admin/login' && userRole === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // 2. Admin Protected Routes (/admin/dashboard, /admin/...)
  if (pathname.startsWith('/admin')) {
    if (!isLoggedIn) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (userRole !== 'ADMIN') {
      // Non-admin user attempting to enter admin portal -> redirect to user dashboard
      const userDashboardUrl = new URL('/dashboard', req.url);
      userDashboardUrl.searchParams.set('denied', 'admin_only');
      return NextResponse.redirect(userDashboardUrl);
    }

    return NextResponse.next();
  }

  // 3. Admin Protected API Routes (/api/admin/...)
  if (pathname.startsWith('/api/admin')) {
    if (!isLoggedIn || userRole !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Administrator privileges required', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  // 4. Protected User Dashboard & Private APIs
  if (!isLoggedIn) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED', timestamp: new Date().toISOString() },
        { status: 401 }
      );
    }
    const signinUrl = new URL('/signin', req.url);
    signinUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signinUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.pdf$).*)'],
};
