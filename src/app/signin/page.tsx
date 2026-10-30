'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import {
  AuthLayout,
  AuthInput,
  PasswordInput,
  SubmitButton,
  AuthError,
  AuthSuccess,
} from '@/components/auth';
import { ToastNotification, ToastType } from '@/components/ui/ToastNotification';
import { validateCallbackUrl } from '@/lib/auth/server-auth';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get('callbackUrl');
  const safeCallbackUrl = validateCallbackUrl(rawCallbackUrl);

  const isRegistered = searchParams.get('registered') === 'true';
  const isReset = searchParams.get('reset') === 'true';
  const isLogout = searchParams.get('logout') === 'true';
  const isExpired =
    searchParams.get('expired') === 'true' || searchParams.get('error') === 'SessionExpired';
  const isAuthRequired =
    searchParams.get('authRequired') === 'true' ||
    (!!rawCallbackUrl && rawCallbackUrl.startsWith('/dashboard'));
  const deniedParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{
    title: string;
    message: string;
    type: ToastType;
  } | null>(null);

  const hasTriggeredInitialToast = useRef(false);

  useEffect(() => {
    if (hasTriggeredInitialToast.current) return;
    hasTriggeredInitialToast.current = true;

    if (isAuthRequired) {
      setError('Authentication Required! Please sign in to access this page.');
      setToast({
        title: 'Authentication Required',
        message: 'Please sign in first to access your requested page.',
        type: 'warning',
      });
    } else if (isExpired) {
      setError('Your session has expired. Please sign in again.');
      setToast({
        title: 'Session Expired',
        message: 'Your session has expired. Please sign in again.',
        type: 'error',
      });
    } else if (isLogout) {
      setSuccess('You have been successfully signed out.');
      setToast({
        title: 'Signed Out',
        message: 'You have been successfully signed out.',
        type: 'success',
      });
    } else if (isRegistered) {
      setSuccess('Account created successfully! Please sign in with your credentials.');
    } else if (isReset) {
      setSuccess('Your password has been reset. Please sign in with your new password.');
    } else if (deniedParam === 'CredentialsSignin') {
      setError('Invalid email address or password. Please try again.');
    }
  }, [isAuthRequired, isExpired, isLogout, isRegistered, isReset, deniedParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please provide both your email address and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl: safeCallbackUrl,
      });

      if (res?.error) {
        setError('Invalid email address or password. Please try again.');
      } else {
        router.push(safeCallbackUrl);
        router.refresh();
      }
    } catch {
      setError('An unexpected sign-in error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {toast && (
        <ToastNotification
          title={toast.title}
          message={toast.message}
          type={toast.type}
          durationMs={4000}
          onClose={() => setToast(null)}
        />
      )}

      <AuthLayout
        title="Welcome back"
        subtitle="Sign in to access real-time crypto & multi-asset trading"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthError message={error} />
          <AuthSuccess message={success} />

          <AuthInput
            id="email"
            label="Email Address"
            type="email"
            placeholder="you@domain.com"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <PasswordInput
            id="password"
            label="Password"
            placeholder="••••••••"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground select-none">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/30"
              />
              <span>Remember me</span>
            </label>

            <Link
              href="/forgot-password"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          <SubmitButton
            loading={loading}
            loadingText="Verifying credentials..."
          >
            Sign In to Platform
          </SubmitButton>
        </form>

        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col gap-3 text-center">
          <p className="text-xs text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              Create Account
            </Link>
          </p>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
            <span>Encrypted Session & Multi-Asset Access</span>
          </div>
        </div>
      </AuthLayout>
    </>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
          Loading authentication gateway...
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
