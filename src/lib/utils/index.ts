import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat('en-IN', options).format(value);
}

export function formatPrice(value: number, currency = 'INR'): string {
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  return `${value.toFixed(2)} ${currency}`;
}

export function formatCrypto(value: number, symbol = 'BTC'): string {
  const decimals = value < 0.001 ? 8 : value < 1 ? 6 : 4;
  return `${value.toFixed(decimals)} ${symbol}`;
}

export function formatPercent(value: number, includeSign = true): string {
  const sign = includeSign && value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(4)}%`;
}

export function formatAge(ms: number): string {
  if (ms < 1000) return `${ms}ms ago`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s ago`;
  return `${Math.floor(ms / 60000)}m ago`;
}

export function formatLatency(ms: number): string {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function getGapColor(gapPercent: number, tolerance = 2): string {
  const abs = Math.abs(gapPercent);
  if (abs <= tolerance * 0.5) return 'text-emerald-400';
  if (abs <= tolerance) return 'text-yellow-400';
  return 'text-red-400';
}

export function getGapBgColor(gapPercent: number, tolerance = 2): string {
  const abs = Math.abs(gapPercent);
  if (abs <= tolerance * 0.5) return 'bg-emerald-500/20 border-emerald-500/40';
  if (abs <= tolerance) return 'bg-yellow-500/20 border-yellow-500/40';
  return 'bg-red-500/20 border-red-500/40';
}

export function truncate(str: string, length: number): string {
  return str.length > length ? `${str.slice(0, length)}...` : str;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
