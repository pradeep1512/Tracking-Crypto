'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, TrendingUp } from 'lucide-react';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  isAdmin?: boolean;
}

export function AuthLayout({ title, subtitle, children, isAdmin = false }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      {/* Dynamic ambient background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{
            background: isAdmin
              ? 'radial-gradient(circle, hsl(280,85%,55%) 0%, transparent 70%)'
              : 'radial-gradient(circle, hsl(199,89%,48%) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-15 blur-3xl"
          style={{
            background: isAdmin
              ? 'radial-gradient(circle, hsl(330,85%,55%) 0%, transparent 70%)'
              : 'radial-gradient(circle, hsl(221,83%,53%) 0%, transparent 70%)',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4 group focus:outline-none">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105"
              style={{
                background: isAdmin
                  ? 'linear-gradient(135deg, hsl(280,85%,55%), hsl(330,85%,55%))'
                  : 'linear-gradient(135deg, hsl(199,89%,48%), hsl(221,83%,53%))',
              }}
            >
              {isAdmin ? (
                <Shield className="w-6 h-6 text-white" />
              ) : (
                <TrendingUp className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-2xl font-bold tracking-tight">
                <span className="gradient-text">Tracking</span>
                <span className="text-white">Crypt</span>
              </span>
              {isAdmin && (
                <span className="text-[10px] tracking-widest uppercase font-semibold text-purple-400 -mt-1">
                  Administrator Portal
                </span>
              )}
            </div>
          </Link>

          <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
        </div>

        {/* Card Body */}
        <div className="glass-card p-8 border border-white/10 shadow-2xl backdrop-blur-xl relative rounded-2xl">
          {children}
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-muted-foreground/60 space-y-1">
          <p>Institutional-Grade Latency & Price Gap Intelligence</p>
          <p>© 2026 TrackingCrypt. Strictly non-custodial and secure.</p>
        </div>
      </div>
    </div>
  );
}
