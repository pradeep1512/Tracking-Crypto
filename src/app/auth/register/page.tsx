'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Registration failed. Please try again.');
      } else {
        router.push('/auth/login?registered=true');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, hsl(262,83%,58%) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, hsl(199,89%,48%) 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, hsl(199,89%,48%), hsl(221,83%,53%))' }}>
              <span className="text-white font-bold">TC</span>
            </div>
            <span className="text-2xl font-bold">
              <span className="gradient-text">Tracking</span>
              <span className="text-white">Crypt</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-muted-foreground mt-1">Start tracking price gaps today</p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            {[
              { id: 'name', label: 'Full name', type: 'text', placeholder: 'Arjun Sharma', auto: 'name' },
              { id: 'email', label: 'Email address', type: 'email', placeholder: 'you@example.com', auto: 'email' },
              { id: 'password', label: 'Password', type: 'password', placeholder: '••••••••', auto: 'new-password' },
              { id: 'confirmPassword', label: 'Confirm password', type: 'password', placeholder: '••••••••', auto: 'new-password' },
            ].map((field) => (
              <div key={field.id}>
                <label htmlFor={field.id} className="block text-sm font-medium text-foreground mb-2">
                  {field.label}
                </label>
                <input
                  id={field.id}
                  type={field.type}
                  autoComplete={field.auto}
                  required
                  value={form[field.id as keyof typeof form]}
                  onChange={update(field.id)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  placeholder={field.placeholder}
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              id="register-submit"
              className="w-full py-3 px-6 rounded-lg font-semibold text-white transition-all hover:opacity-90 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{ background: 'linear-gradient(135deg, hsl(199,89%,48%), hsl(221,83%,53%))' }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-muted-foreground/60 text-xs mt-6 max-w-xs mx-auto">
          TrackingCrypt defaults to paper trading. No real funds are ever risked without your explicit authorization.
        </p>
      </div>
    </div>
  );
}
