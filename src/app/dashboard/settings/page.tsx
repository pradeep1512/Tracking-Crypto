'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Lock,
  AlertOctagon,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  Plus,
  Trash2,
  RefreshCw,
  X,
  AlertTriangle,
  Zap,
  FileText,
  Download,
} from 'lucide-react';
import type { MaskedCredential } from '@/services/ExchangeCredentialService';
import type { TradingSafetyConfig } from '@/services/LiveTradingService';

export default function SettingsPage() {
  const [config, setConfig] = useState<TradingSafetyConfig | null>(null);
  const [credentials, setCredentials] = useState<MaskedCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Kill switch loading state
  const [killSwitchLoading, setKillSwitchLoading] = useState(false);

  // New Credential Modal state
  const [showCredModal, setShowCredModal] = useState(false);
  const [newExchange, setNewExchange] = useState('binance');
  const [newLabel, setNewLabel] = useState('My Binance Key');
  const [newApiKey, setNewApiKey] = useState('');
  const [newApiSecret, setNewApiSecret] = useState('');
  const [newPermissions, setNewPermissions] = useState<'READ_ONLY' | 'TRADE'>('TRADE');
  const [storingCred, setStoringCred] = useState(false);
  const [credError, setCredError] = useState('');

  // Editable config fields
  const [maxOrderUSD, setMaxOrderUSD] = useState('5000');
  const [maxSlippage, setMaxSlippage] = useState('1.0');
  const [rateLimit, setRateLimit] = useState('10');

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, credsRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/credentials'),
      ]);
      const settingsData = await settingsRes.json();
      const credsData = await credsRes.json();

      if (settingsData.success) {
        setConfig(settingsData.data);
        setMaxOrderUSD(settingsData.data.maxOrderQuantityUSD.toString());
        setMaxSlippage(settingsData.data.maxBuySlippageTolerancePct.toString());
        setRateLimit(settingsData.data.rateLimitOrdersPerMinute.toString());
      }
      if (credsData.success) {
        setCredentials(credsData.data);
      }
    } catch (err) {
      console.error('Failed to load settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSafetySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxOrderQuantityUSD: parseFloat(maxOrderUSD),
          maxBuySlippageTolerancePct: parseFloat(maxSlippage),
          rateLimitOrdersPerMinute: parseInt(rateLimit, 10),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch {
      // ignore
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleLiveTrading = async (enabled: boolean) => {
    if (enabled) {
      const confirmed = window.confirm(
        'WARNING: Live trading routes real orders to exchange APIs. Ensure you understand financial risks, slippage, and that paper trading is tested first. Proceed?'
      );
      if (!confirmed) return;
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLiveTradingEnabled: enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.data);
      }
    } catch {
      // ignore
    }
  };

  const handleKillSwitch = async () => {
    if (!config) return;
    const targetState = !config.killSwitchActive;
    if (targetState) {
      const confirmed = window.confirm(
        'ENGAGE EMERGENCY KILL SWITCH? This immediately halts all live trading submissions.'
      );
      if (!confirmed) return;
    }

    setKillSwitchLoading(true);
    try {
      const res = await fetch('/api/trading/kill-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: targetState }),
      });
      const data = await res.json();
      if (data.success) {
        loadData();
      }
    } catch {
      // ignore
    } finally {
      setKillSwitchLoading(false);
    }
  };

  const handleAddCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredError('');
    if (!newApiKey.trim() || !newApiSecret.trim()) {
      setCredError('Please enter both API key and secret.');
      return;
    }

    setStoringCred(true);
    try {
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exchangeId: newExchange,
          label: newLabel,
          apiKey: newApiKey,
          apiSecret: newApiSecret,
          permissions: newPermissions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCredModal(false);
        setNewApiKey('');
        setNewApiSecret('');
        loadData();
      } else {
        setCredError(data.error || 'Failed to encrypt and store credential.');
      }
    } catch {
      setCredError('Network error while saving credentials.');
    } finally {
      setStoringCred(false);
    }
  };

  const handleDeleteCredential = async (id: string) => {
    if (!window.confirm('Revoke and delete this exchange API key?')) return;
    try {
      await fetch(`/api/credentials?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      setCredentials((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Trading Safety & Security Vault</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Phase 6 Guardrails
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Configure financial safety guardrails, AES-256-GCM encrypted credentials, and the Emergency Kill Switch.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-white transition-all text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Emergency Kill Switch Banner */}
      {config && (
        <div
          className={`p-5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            config.killSwitchActive
              ? 'bg-rose-500/20 border-rose-500/40 ring-2 ring-rose-500/30'
              : 'bg-white/3 border-white/10'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <AlertOctagon
                className={`w-5 h-5 ${
                  config.killSwitchActive ? 'text-rose-400 animate-pulse' : 'text-muted-foreground'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Emergency Trading Kill Switch</h3>
                <span
                  className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                    config.killSwitchActive
                      ? 'bg-rose-500 text-white'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {config.killSwitchActive ? 'HALTED (ENGAGED)' : 'STANDBY (READY)'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {config.killSwitchActive
                  ? 'All live trade submissions are strictly blocked. No orders will reach exchange APIs.'
                  : 'Instantly block all order placement across all exchanges in case of market volatility or technical delay.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleKillSwitch}
            disabled={killSwitchLoading}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              config.killSwitchActive
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30'
            }`}
          >
            {killSwitchLoading
              ? 'Updating...'
              : config.killSwitchActive
              ? 'Disengage Kill Switch'
              : 'ENGAGE KILL SWITCH'}
          </button>
        </div>
      )}

      {/* Mode Selector & Safety Guardrails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trading Mode & Opt-In */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            Execution Mode & Financial Risk Consent
          </h2>

          <div className="space-y-3">
            {/* Paper Trading Option */}
            <div
              onClick={() => handleToggleLiveTrading(false)}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                !config?.isLiveTradingEnabled
                  ? 'bg-cyan-500/10 border-cyan-500/40 ring-1 ring-cyan-500/30'
                  : 'bg-white/3 border-white/5 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Paper Trading Mode (Default &amp; Recommended)
                </span>
                {!config?.isLiveTradingEnabled && (
                  <span className="text-[10px] bg-cyan-400 text-black font-bold px-1.5 py-0.5 rounded">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Orders are simulated in memory against live order-book depth. No real capital is ever risked, and no exchange API credentials are required.
              </p>
            </div>

            {/* Live Trading Option */}
            <div
              onClick={() => handleToggleLiveTrading(true)}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                config?.isLiveTradingEnabled
                  ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                  : 'bg-white/3 border-white/5 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Live Exchange Trading (Opt-In)
                </span>
                {config?.isLiveTradingEnabled && (
                  <span className="text-[10px] bg-amber-400 text-black font-bold px-1.5 py-0.5 rounded">
                    ENABLED
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Routes verified limit orders to exchange trading APIs. Requires explicit user confirmation per order and verified API keys.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white/3 border border-white/5 text-[11px] text-muted-foreground space-y-1">
            <p className="font-semibold text-white">Pre-Trade Guarantee:</p>
            <p>
              TrackingCrypt will <strong className="text-white">never</strong> automatically increase your maximum buy limit price. Orders that cannot fill within your specified ceiling remain unfilled or are rejected.
            </p>
          </div>
        </div>

        {/* Safety Guardrails Configuration Form */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-cyan-400" />
            Safety Guardrails Configuration
          </h2>

          <form onSubmit={handleSaveSafetySettings} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-muted-foreground mb-1">
                Max Order Value Cap ($ USD)
              </label>
              <input
                type="number"
                value={maxOrderUSD}
                onChange={(e) => setMaxOrderUSD(e.target.value)}
                placeholder="5000"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono focus:ring-1 focus:ring-cyan-400"
              />
              <span className="text-[10px] text-muted-foreground">
                Prevents accidental fat-finger orders above this size.
              </span>
            </div>

            <div>
              <label className="block text-muted-foreground mb-1">
                Max Buy Slippage Tolerance (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={maxSlippage}
                onChange={(e) => setMaxSlippage(e.target.value)}
                placeholder="1.0"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono focus:ring-1 focus:ring-cyan-400"
              />
              <span className="text-[10px] text-muted-foreground">
                Rejects orders if estimated book depth slippage exceeds this threshold.
              </span>
            </div>

            <div>
              <label className="block text-muted-foreground mb-1">
                Submission Rate Limit (Orders / Minute)
              </label>
              <input
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimit(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono focus:ring-1 focus:ring-cyan-400"
              />
              <span className="text-[10px] text-muted-foreground">
                Protects against accidental duplicate automated orders.
              </span>
            </div>

            {saveSuccess && (
              <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                Safety guardrails saved successfully.
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="py-2 px-4 rounded-lg font-semibold text-xs text-black bg-cyan-400 hover:bg-cyan-300 transition-all"
              >
                {savingSettings ? 'Saving...' : 'Save Guardrails'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Exchange Credentials Vault */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              Encrypted Exchange API Credential Vault
            </h3>
            <p className="text-xs text-muted-foreground">
              Stored with AES-256-GCM authenticated encryption. Withdrawal permissions are strictly rejected.
            </p>
          </div>

          <button
            onClick={() => setShowCredModal(true)}
            className="py-2 px-3 rounded-lg text-xs font-semibold text-black bg-cyan-400 hover:bg-cyan-300 transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Connect Exchange Key
          </button>
        </div>

        {/* Credentials Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead>
              <tr className="text-muted-foreground border-b border-white/10">
                <th className="py-2.5 px-3 font-sans font-medium">Label</th>
                <th className="py-2.5 px-3 font-sans font-medium">Exchange</th>
                <th className="py-2.5 px-3 font-sans font-medium">Masked Key</th>
                <th className="py-2.5 px-3 font-sans font-medium">Permissions</th>
                <th className="py-2.5 px-3 font-sans font-medium">Status</th>
                <th className="py-2.5 px-3 font-sans font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {credentials.map((c) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2.5 px-3 font-bold text-white font-sans">{c.label}</td>
                  <td className="py-2.5 px-3 text-cyan-300 uppercase">{c.exchangeId}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{c.maskedApiKey}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-white border border-white/10">
                      {c.permissions}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Verified
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <button
                      onClick={() => handleDeleteCredential(c.id)}
                      className="p-1.5 rounded hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 transition-all"
                      title="Revoke and delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {credentials.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No API credentials configured. All trades run in Paper Trading mode by default.
            </div>
          )}
        </div>
      </div>

      {/* Platform Documentation & PDF Manuals */}
      <div className="glass-card p-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            Platform Documentation &amp; Architecture Blueprints
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Download comprehensive documentation in PDF format detailing the TrackingCrypt platform from scratch to end, including complete dashboard user manuals, operational trading strategies, technical architecture, and algorithmic specifications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* User Manual Card */}
          <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-950/10 hover:bg-cyan-950/20 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300">
                  User Perspective
                </span>
                <span className="text-[10px] text-muted-foreground">PDF Format • 10.0 KB</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1">TrackingCrypt User Manual</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Complete trader guide covering price gap diagnosis, VWAP ladders, reading 20-level order book depth, multi-order paper trading simulation, alert rules, and risk guardrails.
              </p>
            </div>
            <div className="pt-4">
              <a
                href="/docs/TrackingCrypt_User_Manual.pdf"
                download="TrackingCrypt_User_Manual.pdf"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download User Manual (PDF)
              </a>
            </div>
          </div>

          {/* Developer Guide Card */}
          <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/10 hover:bg-indigo-950/20 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300">
                  Developer Perspective
                </span>
                <span className="text-[10px] text-muted-foreground">PDF Format • 10.7 KB</span>
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Technical Architecture Blueprint</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                In-depth engineering manual covering the reactive WebSocket/SSE pipeline, 16-table SQL Server schema, AES-256-GCM vault, 29 unit tests, and 57,556 ops/sec latency benchmark.
              </p>
            </div>
            <div className="pt-4">
              <a
                href="/docs/TrackingCrypt_Developer_Guide.pdf"
                download="TrackingCrypt_Developer_Guide.pdf"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-xs transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download Developer Guide (PDF)
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for adding credential */}
      {showCredModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-4 border border-white/10">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                Connect Exchange API Key
              </h3>
              <button
                onClick={() => setShowCredModal(false)}
                className="p-1 rounded text-muted-foreground hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCredential} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">Exchange</label>
                <select
                  value={newExchange}
                  onChange={(e) => setNewExchange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:ring-1 focus:ring-cyan-400"
                >
                  <option value="binance" className="bg-gray-900 text-white">Binance Spot</option>
                  <option value="coinbase" className="bg-gray-900 text-white">Coinbase</option>
                  <option value="coindcx" className="bg-gray-900 text-white">CoinDCX</option>
                </select>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Key Label</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Primary Spot Key"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">API Key</label>
                <input
                  type="text"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="Paste your public API key"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">API Secret</label>
                <input
                  type="password"
                  value={newApiSecret}
                  onChange={(e) => setNewApiSecret(e.target.value)}
                  placeholder="Paste your secret key (encrypted on save)"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white font-mono focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Permissions</label>
                <select
                  value={newPermissions}
                  onChange={(e) => setNewPermissions(e.target.value as 'READ_ONLY' | 'TRADE')}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:ring-1 focus:ring-cyan-400"
                >
                  <option value="READ_ONLY" className="bg-gray-900 text-white">Read-Only (Market Data &amp; Balances)</option>
                  <option value="TRADE" className="bg-gray-900 text-white">Spot Trade (Limit Order Execution)</option>
                </select>
              </div>

              <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300">
                ⚠ Never enable &quot;Withdrawal&quot; permissions on your exchange key. Keys with withdrawal permissions will be rejected.
              </div>

              {credError && (
                <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  {credError}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCredModal(false)}
                  className="py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={storingCred}
                  className="py-2 px-4 rounded-lg font-semibold text-black bg-cyan-400 hover:bg-cyan-300"
                >
                  {storingCred ? 'Encrypting & Saving...' : 'Save & Encrypt Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
