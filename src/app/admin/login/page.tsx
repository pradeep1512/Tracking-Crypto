'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import {
  AuthLayout,
  AuthInput,
  PasswordInput,
  SubmitButton,
  AuthError,
  AuthSuccess,
} from '@/components/auth';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/admin/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim() || !password) {
      setError('Please provide administrative credentials.');
      return;
    }

    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email: email.trim(),
        password,
        role: 'ADMIN',
        redirect: false,
        callbackUrl,
      });

      if (res?.error) {
        setError('Administrative authentication failed. Ensure you have administrator privileges.');
      } else {
        setSuccess('Administrator identity verified. Opening control panel...');
        setTimeout(() => {
          router.push(callbackUrl);
          router.refresh();
        }, 800);
      }
    } catch {
      setError('An error occurred during administrative authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Admin Terminal"
      subtitle="Restricted to authorized system operators"
      isAdmin={true}
    >
      <div className="mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0" />
        <span>All administrative logins and actions are logged for security audits.</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthError message={error} />
        <AuthSuccess message={success} />

        <AuthInput
          id="admin-email"
          label="Admin Email"
          type="email"
          placeholder="admin@trackingcrypt.com"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <PasswordInput
          id="admin-password"
          label="Admin Password"
          placeholder="••••••••••••"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <AuthInput
          id="admin-pin"
          label="Security PIN / Token (Optional)"
          type="password"
          placeholder="6-digit PIN if MFA enabled"
          maxLength={6}
          autoComplete="off"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          helperText="Optional secondary PIN if multi-factor authentication is configured."
        />

        <SubmitButton
          loading={loading}
          loadingText="Authenticating Admin..."
          variant="admin"
        >
          Sign In as Admin
        </SubmitButton>

        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-muted-foreground">
          <Link
            href="/signin"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to User Login</span>
          </Link>

          <Link
            href="/forgot-password"
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            Forgot Password?
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AdminLoginContent />
    </Suspense>
  );
}
