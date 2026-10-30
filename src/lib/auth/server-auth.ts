import { auth } from '@/lib/auth/auth';
import { apiError } from '@/lib/utils/api';
import { NextResponse } from 'next/server';
import type { UserPortfolio } from '@/types';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  role: 'USER' | 'ADMIN';
  isActive?: boolean;
}

/**
 * Validate that a callback URL is a safe internal application path.
 * Strictly prevents open-redirect vulnerabilities to external domains.
 */
export function validateCallbackUrl(url: string | null | undefined): string {
  if (!url) return '/dashboard';

  try {
    const trimmed = decodeURIComponent(url).trim();

    // Must start with single slash and NOT double slash or protocol
    if (
      trimmed.startsWith('/') &&
      !trimmed.startsWith('//') &&
      !trimmed.startsWith('/\\') &&
      !trimmed.includes('://') &&
      !trimmed.includes('\\') &&
      !trimmed.startsWith('/api') &&
      !trimmed.startsWith('/signin')
    ) {
      return trimmed;
    }
  } catch {
    return '/dashboard';
  }

  return '/dashboard';
}

/**
 * Retrieve the current authenticated server-side session user.
 */
export async function getServerSessionUser(): Promise<AuthenticatedUser | null> {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return null;
    }
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      role: ((session.user as { role?: string }).role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER') as 'USER' | 'ADMIN',
      isActive: (session.user as { isActive?: boolean }).isActive ?? true,
    };
  } catch {
    return null;
  }
}

/**
 * Guard for protected API routes requiring an authenticated user.
 * Returns HTTP 401 structured error if no active session is found.
 */
export async function requireAuthUser(): Promise<
  | { user: AuthenticatedUser; errorResponse: null }
  | { user: null; errorResponse: NextResponse }
> {
  const user = await getServerSessionUser();
  if (!user) {
    return {
      user: null,
      errorResponse: apiError(
        'Authentication required: Please sign in to access this resource',
        401,
        'UNAUTHORIZED'
      ),
    };
  }
  return { user, errorResponse: null };
}

/**
 * Guard for administrator-only API routes.
 * Returns HTTP 401 if unauthenticated, HTTP 403 if authenticated but not an administrator.
 */
export async function requireAdminUser(): Promise<
  | { user: AuthenticatedUser; errorResponse: null }
  | { user: null; errorResponse: NextResponse }
> {
  const user = await getServerSessionUser();
  if (!user) {
    return {
      user: null,
      errorResponse: apiError('Authentication required', 401, 'UNAUTHORIZED'),
    };
  }
  if (user.role !== 'ADMIN') {
    return {
      user: null,
      errorResponse: apiError(
        'Forbidden: Administrator privileges required',
        403,
        'FORBIDDEN'
      ),
    };
  }
  return { user, errorResponse: null };
}

/**
 * Check if the authenticated user owns the portfolio or has administrator override.
 * Returns 403 Forbidden response if user is unauthorized.
 */
export function checkPortfolioOwnership(
  portfolio: UserPortfolio,
  user: AuthenticatedUser
): { allowed: boolean; errorResponse?: NextResponse } {
  // Administrators have global management access
  if (user.role === 'ADMIN') {
    return { allowed: true };
  }

  // User owns the portfolio
  if (portfolio.userId === user.id) {
    return { allowed: true };
  }

  return {
    allowed: false,
    errorResponse: apiError(
      'Forbidden: You do not have permission to access or modify this portfolio',
      403,
      'FORBIDDEN'
    ),
  };
}
