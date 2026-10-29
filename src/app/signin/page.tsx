'use client';

import React, { useState, useEffect, Suspense } from 'react';
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

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const isRegistered = searchParams.get('registered') === 'true';
  const isReset = searchParams.get('reset') === 'true';
  const deniedParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isRegistered) {
      setSuccess('Account created successfully! Please sign in with your credentials.');
    } else if (isReset) {
      setSuccess('Your password has been reset. Please sign in with your new password.');
    } else if (deniedParam === 'CredentialsSignin') {
      setError('Invalid email address or password.');
    }
  }, [isRegistered, isReset, deniedParam]);

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
        callbackUrl,
      });

      if (res?.error) {
        setError('Invalid email address or password. Please try again.');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError('An unexpected sign-in error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access real-time crypto price gap tracking"
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

        <SubmitButton loading={loading} loadingText="Signing in...">
          Sign In
        </SubmitButton>

        <div className="pt-3 border-t border-white/10 space-y-3">
          <div className="text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 font-medium">
              Create an account
            </Link>
          </div>

          <div className="text-center">
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 text-xs text-purple-400/80 hover:text-purple-300 transition-colors py-1 px-3 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:border-purple-500/40"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Administrator Portal Login</span>
            </Link>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SignInContent />
    </Suspense>
  );
}
