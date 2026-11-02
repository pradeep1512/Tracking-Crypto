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
    <header className="flex items-center justify-between px-6 py-4 border-b border-yellow-500/10 bg-[#08080a]/90 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 pulse-dot shadow-[0_0_8px_#FFE600]" />
            Live Terminal
          </h2>
          <p className="text-xs text-zinc-400 font-mono">{time} IST</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* WS Status */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
            wsStatus === 'connected'
              ? 'bg-yellow-400/15 border-yellow-400/40 text-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.25)]'
              : wsStatus === 'connecting'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {wsStatus === 'connected' ? (
            <Wifi className="w-3.5 h-3.5 text-yellow-400" />
          ) : wsStatus === 'connecting' ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <WifiOff className="w-3.5 h-3.5" />
          )}
          {wsStatus === 'connected' ? 'DELTA LIVE' : wsStatus === 'connecting' ? 'SYNCING…' : 'DISCONNECTED'}
        </div>

        {/* Admin Shortcut if Admin */}
        {isAdmin && (
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20 text-xs font-semibold transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-yellow-400" />
            <span>Admin Terminal</span>
          </Link>
        )}

        {/* Alerts bell */}
        <button
          id="header-alerts-btn"
          className="relative p-2 rounded-lg hover:bg-white/5 transition-colors text-zinc-400 hover:text-yellow-400"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-[0_0_6px_#FFE600]" />
        </button>

        {/* User Profile Pill & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-white/10">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#141417] border border-yellow-500/20">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-500 flex items-center justify-center text-black text-xs font-black shadow-[0_0_8px_rgba(250,204,21,0.4)]">
              {user?.name ? user.name[0].toUpperCase() : <User className="w-3.5 h-3.5 text-black" />}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-white max-w-[120px] truncate">
                {user?.name || user?.email || 'Trader'}
              </span>
              <span
                className={`text-[9px] font-black uppercase tracking-wider ${
                  isAdmin ? 'text-yellow-400' : 'text-yellow-400'
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
            className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-zinc-400 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
