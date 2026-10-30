'use client';

import { Bell, RefreshCw, Wifi, WifiOff, LogOut, Shield, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export function DashboardHeader() {
  const { data: session } = useSession();
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [time, setTime] = useState<string>('');

  const user = session?.user;
  const userRole = (user as { role?: string })?.role?.toUpperCase() || 'USER';
  const isAdmin = userRole === 'ADMIN';

  useEffect(() => {
    // Simulate WS connection after mount
    const t = setTimeout(() => setWsStatus('connected'), 1200);

    // Live clock
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    tick();
    const interval = setInterval(tick, 1000);

    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Live Dashboard</h2>
          <p className="text-xs text-muted-foreground">{time} IST</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* WS Status */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
            wsStatus === 'connected'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : wsStatus === 'connecting'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {wsStatus === 'connected' ? (
            <Wifi className="w-3 h-3" />
          ) : wsStatus === 'connecting' ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
          {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting…' : 'Disconnected'}
        </div>

        {/* Admin Shortcut if Admin */}
        {isAdmin && (
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 text-xs font-semibold transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span>Admin Terminal</span>
          </Link>
        )}

        {/* Alerts bell */}
        <button
          id="header-alerts-btn"
          className="relative p-2 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-400" />
        </button>

        {/* User Profile Pill & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-white/10">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {user?.name ? user.name[0].toUpperCase() : <User className="w-3.5 h-3.5" />}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-medium text-white max-w-[120px] truncate">
                {user?.name || user?.email || 'Trader'}
              </span>
              <span
                className={`text-[9px] font-bold uppercase tracking-wider ${
                  isAdmin ? 'text-purple-400' : 'text-emerald-400'
                }`}
              >
                {userRole}
              </span>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: '/signin?logout=true' })}
            id="header-logout-btn"
            title="Sign out of TrackingCrypt"
            className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-muted-foreground transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
