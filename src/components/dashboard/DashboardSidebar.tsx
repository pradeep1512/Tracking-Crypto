'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  TrendingUp,
  Activity,
  ShoppingCart,
  Bell,
  Settings,
  BarChart3,
  Zap,
  Shield,
  LogOut,
  Coins,
  Layers,
  Briefcase,
  PlayCircle,
  Calendar,
  Flame,
  Wallet,
  Landmark,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/wallet', label: 'Wallet & Payments', icon: Wallet },
  { href: '/dashboard/exchanges', label: 'Exchange Accounts', icon: Landmark },
  { href: '/dashboard/crypto', label: 'Crypto Markets', icon: Coins },
  { href: '/dashboard/mcx', label: 'MCX Commodities', icon: Flame },
  { href: '/dashboard/options', label: 'Options Trading', icon: Layers },
  { href: '/dashboard/portfolio', label: 'My Portfolio', icon: Briefcase },
  { href: '/dashboard/active-trading', label: 'Active Trading', icon: PlayCircle },
  { href: '/dashboard/orders', label: 'Orders & Trade History', icon: ShoppingCart },
  { href: '/dashboard/expiry-calendar', label: 'Expiry Calendar', icon: Calendar },
  { href: '/dashboard/price-gap', label: 'Price Gap', icon: Activity },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/alerts', label: 'Alerts', icon: Bell },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role?.toUpperCase() === 'ADMIN';

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col border-r border-white/5 bg-card">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md"
            style={{ background: 'linear-gradient(135deg, hsl(199,89%,48%), hsl(221,83%,53%))' }}
          >
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold">
            <span className="gradient-text">Tracking</span>
            <span className="text-white">Crypt</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive ? 'text-cyan-400' : 'text-muted-foreground')} />
              {item.label}
              {item.label === 'Alerts' && (
                <span className="ml-auto w-2 h-2 rounded-full bg-red-400 pulse-dot" />
              )}
            </Link>
          );
        })}

        {/* Admin portal nav if user is admin */}
        {isAdmin && (
          <div className="pt-2 mt-2 border-t border-white/5">
            <Link
              href="/admin/dashboard"
              id="nav-admin-dashboard"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all',
                pathname.startsWith('/admin')
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                  : 'text-purple-400/80 hover:text-purple-300 hover:bg-purple-500/10'
              )}
            >
              <Shield className="w-4 h-4 text-purple-400" />
              <span>Admin Terminal</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 pb-6 border-t border-white/5 space-y-2.5">
        <button
          id="sidebar-signout-btn"
          onClick={() => signOut({ callbackUrl: '/signin?logout=true' })}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-semibold text-zinc-300 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-red-400/80" />
          <span>Sign Out</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <span className="w-2 h-2 rounded-full bg-amber-400 pulse-dot flex-shrink-0" />
          <span className="text-amber-400 text-[11px] font-medium tracking-tight truncate">Dev Mode — Mock Data</span>
        </div>
      </div>
    </aside>
  );
}
