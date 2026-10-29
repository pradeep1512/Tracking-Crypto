'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, KeyRound, ExternalLink } from 'lucide-react';
import {
  AuthLayout,
  AuthInput,
  SubmitButton,
  AuthError,
  AuthSuccess,
} from '@/components/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setDevResetUrl(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(
          data.data?.message ||
            'If an account with that email exists, password reset instructions have been generated.'
        );
        if (data.data?.devResetUrl) {
          setDevResetUrl(data.data.devResetUrl);
        }
      } else {
        setError(data.error || 'Unable to request password reset. Please try again.');
      }
    } catch {
      setError('A network error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email to receive a secure recovery link"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthError message={error} />
        <AuthSuccess message={success} />

        {/* Development preview card for instant testing */}
        {devResetUrl && (
          <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 space-y-2 animate-fadeIn">
            <div className="flex items-center gap-2 font-semibold">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              <span>Development Simulation Token Generated</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              In development mode without an SMTP provider, you can proceed directly using the link below:
            </p>
            <Link
              href={devResetUrl}
              className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-semibold underline break-all"
            >
              <span>Open Reset Password Link</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        <AuthInput
          id="email"
          label="Email Address"
          type="email"
          placeholder="you@domain.com"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          helperText="A single-use recovery link valid for 20 minutes will be generated."
        />

        <SubmitButton loading={loading} loadingText="Sending recovery link...">
          Send Recovery Link
        </SubmitButton>

        <div className="pt-2 text-center text-xs text-muted-foreground">
          <Link
            href="/signin"
            className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Sign In</span>
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
