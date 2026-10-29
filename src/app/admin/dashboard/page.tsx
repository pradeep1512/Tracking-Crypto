'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import {
  Shield,
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  LogOut,
  ArrowLeft,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  AlertTriangle,
} from 'lucide-react';

interface UserData {
  id: string;
  name: string | null;
  email: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface AuditLogData {
  id: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const currentAdminId = session?.user?.id;

  const [users, setUsers] = useState<UserData[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogData[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    adminCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'USER' | 'ADMIN'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, logsRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/audit-logs?limit=30'),
      ]);

      const usersJson = await usersRes.json();
      const logsJson = await logsRes.json();

      if (usersJson.success) {
        setUsers(usersJson.data.users);
        setStats(usersJson.data.stats);
      }

      if (logsJson.success) {
        setAuditLogs(logsJson.data.logs);
      }
    } catch {
      setNotice({ type: 'error', message: 'Failed to load administrative telemetry data.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleStatus = async (user: UserData) => {
    if (user.id === currentAdminId) {
      setNotice({ type: 'error', message: 'You cannot deactivate your own administrative account.' });
      return;
    }

    const nextStatus = !user.isActive;
    const confirmMsg = nextStatus
      ? `Re-activate account for ${user.email}?`
      : `Are you sure you want to suspend access for ${user.email}?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(user.id);
    setNotice(null);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextStatus }),
      });
      const data = await res.json();

      if (data.success) {
        setNotice({
          type: 'success',
          message: `Account status for ${user.email} updated to ${nextStatus ? 'Active' : 'Suspended'}.`,
        });
        await fetchData();
      } else {
        setNotice({ type: 'error', message: data.error || 'Failed to update user status.' });
      }
    } catch {
      setNotice({ type: 'error', message: 'An error occurred updating user status.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleRole = async (user: UserData) => {
    if (user.id === currentAdminId && user.role === 'ADMIN') {
      setNotice({ type: 'error', message: 'You cannot demote your own administrative account.' });
      return;
    }

    const nextRole: 'USER' | 'ADMIN' = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    const confirmMsg =
      nextRole === 'ADMIN'
        ? `Promote ${user.email} to System Administrator? They will have full administrative privileges.`
        : `Demote ${user.email} to standard user role?`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(user.id);
    setNotice(null);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();

      if (data.success) {
        setNotice({
          type: 'success',
          message: `Role for ${user.email} successfully updated to ${nextRole}.`,
        });
        await fetchData();
      } else {
        setNotice({ type: 'error', message: data.error || 'Failed to update user role.' });
      }
    } catch {
      setNotice({ type: 'error', message: 'An error occurred updating user role.' });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      (u.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && u.isActive) ||
      (statusFilter === 'INACTIVE' && !u.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Admin Header */}
      <header className="border-b border-purple-500/20 bg-card/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-pink-600 to-rose-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">Admin Terminal</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                  Root Controller
                </span>
              </div>
              <p className="text-xs text-muted-foreground">TrackingCrypt Security & User Governance</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:text-white transition-colors"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Trader Dashboard</span>
            </Link>

            <button
              onClick={() => signOut({ callbackUrl: '/admin/login' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {notice && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between animate-fadeIn ${
              notice.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            <span>{notice.message}</span>
            <button onClick={() => setNotice(null)} className="text-muted-foreground hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Telemetry Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 border border-white/10 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                Total Users
              </span>
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold font-mono text-white">{stats.totalUsers}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Registered accounts</p>
          </div>

          <div className="glass-card p-5 border border-white/10 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                Active Accounts
              </span>
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold font-mono text-emerald-400">{stats.activeUsers}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Authorized trading sessions</p>
          </div>

          <div className="glass-card p-5 border border-white/10 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                Administrators
              </span>
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold font-mono text-purple-400">{stats.adminCount}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Elevated privilege accounts</p>
          </div>

          <div className="glass-card p-5 border border-white/10 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                Audit Events
              </span>
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold font-mono text-amber-400">{auditLogs.length}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Recent security triggers</p>
          </div>
        </div>

        {/* User Management Section */}
        <section className="glass-card border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>User Account Governance</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage roles, activate/suspend user access, and audit registration metadata
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, email, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as 'ALL' | 'USER' | 'ADMIN')}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="ALL" className="bg-slate-900">All Roles</option>
                <option value="USER" className="bg-slate-900">Users</option>
                <option value="ADMIN" className="bg-slate-900">Admins</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
                className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="ALL" className="bg-slate-900">All Statuses</option>
                <option value="ACTIVE" className="bg-slate-900">Active</option>
                <option value="INACTIVE" className="bg-slate-900">Suspended</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 text-muted-foreground uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground font-sans text-xs">
                      No accounts matched your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = u.id === currentAdminId;
                    return (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 font-sans">
                          <div className="font-semibold text-white">{u.name || 'Anonymous User'}</div>
                          <div className="text-muted-foreground text-[11px] font-mono">{u.email}</div>
                          <div className="text-[10px] text-muted-foreground/50 font-mono">ID: {u.id}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'ADMIN'
                                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                            }`}
                          >
                            {u.role === 'ADMIN' ? <Shield className="w-3 h-3" /> : null}
                            {u.role}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              u.isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                          >
                            {u.isActive ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {u.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('en-IN') : 'Never'}
                        </td>

                        <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString('en-IN')}
                        </td>

                        <td className="py-3.5 px-4 text-right font-sans space-x-2">
                          <button
                            disabled={actionLoading === u.id || isSelf}
                            onClick={() => handleToggleRole(u)}
                            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title={isSelf ? 'Cannot modify own role' : undefined}
                          >
                            {u.role === 'ADMIN' ? 'Demote to User' : 'Promote to Admin'}
                          </button>

                          <button
                            disabled={actionLoading === u.id || isSelf}
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2.5 py-1 rounded text-[11px] font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${
                              u.isActive
                                ? 'bg-red-500/10 text-red-300 hover:bg-red-500/20 border border-red-500/20'
                                : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/20'
                            }`}
                            title={isSelf ? 'Cannot deactivate own account' : undefined}
                          >
                            {u.isActive ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Security & Audit Logs Section */}
        <section className="glass-card border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>Security Audit Log Trail</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cryptographically tracked authentication events, role escalations, and reset tokens
              </p>
            </div>
            <span className="text-xs text-muted-foreground">Showing last {auditLogs.length} events</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-2 font-mono text-xs">
            {auditLogs.length === 0 ? (
              <p className="text-muted-foreground text-xs font-sans py-4">No audit logs recorded yet.</p>
            ) : (
              auditLogs.map((log) => {
                const isFail = log.action.includes('FAILED') || log.action.includes('BLOCKED');
                const isSuccess = log.action.includes('SUCCESS') || log.action.includes('REGISTERED');

                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start justify-between gap-4 hover:border-white/10 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isFail
                              ? 'bg-red-500/20 text-red-300'
                              : isSuccess
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-purple-500/20 text-purple-300'
                          }`}
                        >
                          {log.action}
                        </span>
                        {log.userId && (
                          <span className="text-muted-foreground text-[11px]">User: {log.userId}</span>
                        )}
                      </div>
                      {log.metadata && (
                        <p className="text-[11px] text-muted-foreground font-mono break-all">
                          {log.metadata}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0 text-[10px] text-muted-foreground space-y-0.5">
                      <div>{new Date(log.createdAt).toLocaleString('en-IN')}</div>
                      <div>IP: {log.ipAddress || 'Internal'}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
