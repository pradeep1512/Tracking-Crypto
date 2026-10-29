'use client';

import { Bell, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';

export function DashboardHeader() {
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [time, setTime] = useState<string>('');

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
          <h2 className="text-sm font-medium text-white">Live Dashboard</h2>
          <p className="text-xs text-muted-foreground">{time} IST</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* WS Status */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
          wsStatus === 'connected'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : wsStatus === 'connecting'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {wsStatus === 'connected' ? (
            <Wifi className="w-3 h-3" />
          ) : wsStatus === 'connecting' ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
          {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting…' : 'Disconnected'}
        </div>

        {/* Alerts bell */}
        <button
          id="header-alerts-btn"
          className="relative p-2 rounded-lg hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-400" />
        </button>
      </div>
    </header>
  );
}
