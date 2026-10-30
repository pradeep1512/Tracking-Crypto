'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * SessionWatcher monitors active client session state on protected pages.
 * If the session expires or transitions to unauthenticated while viewing /dashboard/*,
 * it immediately halts data access and safely redirects to /signin?expired=true.
 */
export function SessionWatcher() {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const hasEverBeenAuthenticated = useRef(false);

  useEffect(() => {
    if (status === 'authenticated') {
      hasEverBeenAuthenticated.current = true;
    } else if (status === 'unauthenticated' && hasEverBeenAuthenticated.current) {
      // Session expired while active
      const redirectUrl = `/signin?expired=true&callbackUrl=${encodeURIComponent(pathname || '/dashboard')}`;
      router.push(redirectUrl);
    }
  }, [status, router, pathname]);

  return null;
}
