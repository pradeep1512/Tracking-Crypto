'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AuthLayout,
  AuthInput,
  PasswordInput,
  SubmitButton,
  AuthError,
  AuthSuccess,
  PasswordStrengthMeter,
} from '@/components/auth';

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.name.trim() || form.name.trim().length < 2) {
      errors.name = 'Full Name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim() || !emailRegex.test(form.email.trim())) {
      errors.email = 'Please provide a valid email address';
    }

    if (!form.password || form.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      errors.password = 'Must include at least 1 uppercase, 1 lowercase, and 1 number';
    }

    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!form.acceptTerms) {
      errors.acceptTerms = 'You must accept the terms and conditions';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setSuccessMessage(null);

    if (!validate()) return;

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          confirmPassword: form.confirmPassword,
          acceptTerms: form.acceptTerms,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setGeneralError(data.error || 'Registration failed. Please review your details.');
      } else {
        setSuccessMessage('Account created successfully! Redirecting to sign in...');
        setTimeout(() => {
          router.push('/signin?registered=true');
        }, 1200);
      }
    } catch {
      setGeneralError('An unexpected network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join TrackingCrypt for real-time price gap analytics"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthError message={generalError} />
        <AuthSuccess message={successMessage} />

        <AuthInput
          id="name"
          label="Full Name"
          type="text"
          placeholder="e.g. Satoshi Nakamoto"
          required
          autoComplete="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={fieldErrors.name}
        />

        <AuthInput
          id="email"
          label="Email Address"
          type="email"
          placeholder="you@domain.com"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={fieldErrors.email}
        />

        <div>
          <PasswordInput
            id="password"
            label="Password"
            placeholder="At least 8 chars with uppercase & number"
            required
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={fieldErrors.password}
          />
          <PasswordStrengthMeter password={form.password} />
        </div>

        <PasswordInput
          id="confirmPassword"
          label="Confirm Password"
          placeholder="Re-enter your password"
          required
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
          error={fieldErrors.confirmPassword}
        />

        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-muted-foreground select-none">
            <input
              type="checkbox"
              id="acceptTerms"
              checked={form.acceptTerms}
              onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })}
              className="mt-0.5 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/30"
            />
            <span>
              I accept the{' '}
              <span className="text-cyan-400 hover:underline">Terms of Service</span> and{' '}
              <span className="text-cyan-400 hover:underline">Privacy Policy</span>. I acknowledge paper trading is default.
            </span>
          </label>
          {fieldErrors.acceptTerms && (
            <p className="text-xs text-red-400 mt-1">{fieldErrors.acceptTerms}</p>
          )}
        </div>

        <SubmitButton loading={loading} loadingText="Creating account...">
          Create Account
        </SubmitButton>

        <div className="pt-2 text-center text-xs text-muted-foreground space-y-2">
          <div>
            Already have an account?{' '}
            <Link href="/signin" className="text-cyan-400 hover:text-cyan-300 font-medium">
              Sign In
            </Link>
          </div>
          <div>
            Trouble remembering credentials?{' '}
            <Link href="/forgot-password" className="text-muted-foreground hover:text-white underline">
              Forgot Password
            </Link>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}
