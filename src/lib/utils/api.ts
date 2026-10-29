import { type ApiError, type ApiSuccess } from '@/types';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    { success: true, data, timestamp: new Date().toISOString() },
    { status }
  );
}

export function apiError(
  error: string,
  status = 500,
  code?: string,
  details?: unknown
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      error,
      code,
      details: process.env.NODE_ENV === 'development' ? details : undefined,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function handleZodError(err: ZodError): NextResponse<ApiError> {
  return apiError(
    'Validation failed',
    400,
    'VALIDATION_ERROR',
    err.issues || (err as unknown as { errors: unknown }).errors
  );
}

export function handleUnknownError(err: unknown): NextResponse<ApiError> {
  if (err instanceof ZodError) return handleZodError(err);
  const message =
    err instanceof Error ? err.message : 'An unexpected error occurred';
  console.error('[API Error]', err);
  return apiError(message, 500, 'INTERNAL_ERROR');
}

/** Format currency to INR or USDT string */
export function formatCurrency(
  value: number,
  currency = 'INR',
  decimals = 2
): string {
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }
  return `${value.toFixed(decimals)} ${currency}`;
}

/** Format a percentage with +/- sign */
export function formatPercent(value: number, decimals = 4): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/** Format milliseconds to human-readable latency string */
export function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/** Calculate percentile from sorted array */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}
