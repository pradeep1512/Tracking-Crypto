import { auth } from '@/lib/auth/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default auth((req: NextRequest & { auth: unknown }) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;

  // Public routes
  const publicRoutes = ['/auth/login', '/auth/register', '/auth/error', '/'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  const isApiAuthRoute = pathname.startsWith('/api/auth');
  const isPublicApiRoute =
    pathname.startsWith('/api/market') ||
    pathname.startsWith('/api/exchanges') ||
    pathname.startsWith('/api/price-gap/current');

  if (isApiAuthRoute || isPublicRoute || isPublicApiRoute) {
    return NextResponse.next();
  }

  // Protect dashboard and all private API routes
  if (!isLoggedIn) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', timestamp: new Date().toISOString() },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
