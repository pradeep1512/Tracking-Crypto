'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Info,
  Clock,
  ShieldAlert,
  Power,
  RefreshCw,
  X,
} from 'lucide-react';
import type { AlertRule } from '@/services/AlertService';
import type { AlertType, AlertSeverity } from '@/types';

const ALERT_TYPES: { type: AlertType; label: string; unit: string; placeholder: string }[] = [
  { type: 'GAP_EXCEEDED', label: 'Price Gap Exceeded', unit: '%', placeholder: '1.5' },
  { type: 'PRICE_TARGET', label: 'Price Target Crossed', unit: '$', placeholder: '85000' },
  { type: 'MAX_BUY_EXCEEDED', label: 'Max Buy Price Exceeded', unit: '$', placeholder: '82000' },
  { type: 'MIN_SELL_BELOW', label: 'Min Sell Price Dropped Below', unit: '$', placeholder: '78000' },
  { type: 'DATA_STALE', label: 'Market Feed Latency Stale', unit: 'ms', placeholder: '3000' },
];

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'BTCINR', 'ETHINR', 'ALL'];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // New rule state
  const [newType, setNewType] = useState<AlertType>('GAP_EXCEEDED');
  const [newSymbol, setNewSymbol] = useState('BTCUSDT');
  const [newThreshold, setNewThreshold] = useState('1.5');
  const [newSeverity, setNewSeverity] = useState<AlertSeverity>('WARNING');
  const [newCooldown, setNewCooldown] = useState('300');
  const [creating, setCreating] = useState(false);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/alerts');
      const json = await res.json();
      if (json.success) {
        setAlerts(json.data.alerts);
        setUnreadCount(json.data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertType: newType,
          symbol: newSymbol,
          thresholdValue: parseFloat(newThreshold),
          severity: newSeverity,
          cooldownSeconds: parseInt(newCooldown, 10),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        loadAlerts();
      }
    } catch (err) {
      console.error('Failed to create alert:', err);
    } finally {
      setCreating(false);
    }
  };

  const toggleEnabled = async (id: string, current: boolean) => {
    try {
      await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isEnabled: !current }),
      });
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isEnabled: !current } : a))
      );
    } catch {
      // ignore
    }
  };

  const markRead = async (id: string) => {
    try {
      await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isRead: true }),
      });
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const deleteRule = async (id: string) => {
    try {
      await fetch(`/api/alerts?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // ignore
    }
  };

  const selectedMeta = ALERT_TYPES.find((t) => t.type === newType) ?? ALERT_TYPES[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Alerts & Notification Engine</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Phase 4 Dispatcher
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Configure threshold rules for price gaps, execution limits, and feed latency with deduplication cooldowns.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-muted-foreground hover:text-white transition-all flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Mark all read ({unreadCount})
            </button>
          )}

          <button
            onClick={() => setShowModal(true)}
            className="py-2 px-4 rounded-lg text-xs font-semibold text-black transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center gap-1.5"
            style={{ background: 'linear-gradient(135deg, hsl(199, 89%, 48%), hsl(221, 83%, 53%))' }}
          >
            <Plus className="w-4 h-4" />
            New Alert Rule
          </button>
        </div>
      </div>

      {/* Triggered Notifications Feed */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyan-400" />
            Active Alert Notifications
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {unreadCount} unread
              </span>
            )}
          </h3>

          <button
            onClick={loadAlerts}
            disabled={loading}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="space-y-2.5">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3.5 rounded-lg border transition-all flex items-start justify-between gap-4 ${
                !alert.isRead
                  ? 'bg-cyan-500/5 border-cyan-500/30'
                  : 'bg-white/3 border-white/5 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {alert.severity === 'CRITICAL' ? (
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                  ) : alert.severity === 'WARNING' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Info className="w-4 h-4 text-cyan-400" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{alert.symbol}</span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                        alert.severity === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300'
                          : alert.severity === 'WARNING'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-cyan-500/20 text-cyan-300'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {alert.alertType.replace(/_/g, ' ')}
                    </span>
                    {!alert.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-dot" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{alert.message}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono pt-0.5">
                    <span>Triggered {alert.triggeredCount} times</span>
                    <span>•</span>
                    <span>Cooldown: {alert.cooldownSeconds}s</span>
                    {alert.lastTriggeredAt && (
                      <>
                        <span>•</span>
                        <span>Last: {new Date(alert.lastTriggeredAt).toLocaleTimeString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {!alert.isRead && (
                  <button
                    onClick={() => markRead(alert.id)}
                    className="p-1.5 rounded hover:bg-white/10 text-muted-foreground hover:text-white transition-all text-xs"
                    title="Mark as read"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => toggleEnabled(alert.id, alert.isEnabled)}
                  className={`p-1.5 rounded transition-all text-xs ${
                    alert.isEnabled
                      ? 'text-emerald-400 hover:bg-emerald-500/10'
                      : 'text-muted-foreground hover:bg-white/10'
                  }`}
                  title={alert.isEnabled ? 'Disable rule' : 'Enable rule'}
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteRule(alert.id)}
                  className="p-1.5 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-all text-xs"
                  title="Delete rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {alerts.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No alert rules configured yet. Click &quot;New Alert Rule&quot; to set up your first monitor.
            </div>
          )}
        </div>
      </div>

      {/* Modal for Creating New Rule */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-4 border border-white/10">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                Create New Alert Rule
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded text-muted-foreground hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">Rule Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as AlertType)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:ring-1 focus:ring-cyan-400"
                >
                  {ALERT_TYPES.map((t) => (
                    <option key={t.type} value={t.type} className="bg-gray-900 text-white">
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Trading Pair</label>
                  <select
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:ring-1 focus:ring-cyan-400"
                  >
                    {SYMBOLS.map((s) => (
                      <option key={s} value={s} className="bg-gray-900 text-white">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1">
                    Threshold ({selectedMeta.unit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(e.target.value)}
                    placeholder={selectedMeta.placeholder}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1">Severity</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as AlertSeverity)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:ring-1 focus:ring-cyan-400"
                  >
                    <option value="INFO" className="bg-gray-900 text-cyan-300">INFO</option>
                    <option value="WARNING" className="bg-gray-900 text-amber-300">WARNING</option>
                    <option value="CRITICAL" className="bg-gray-900 text-rose-300">CRITICAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1">Cooldown (Seconds)</label>
                  <input
                    type="number"
                    value={newCooldown}
                    onChange={(e) => setNewCooldown(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="py-2 px-4 rounded-lg font-semibold text-black bg-cyan-400 hover:bg-cyan-300"
                >
                  {creating ? 'Creating...' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
