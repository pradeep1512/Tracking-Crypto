/**
 * ExchangeRegistry — Manages available exchange adapters.
 *
 * Selects mock adapter in development unless real credentials are configured.
 */

import type { ExchangeAdapter } from './ExchangeAdapter';
import { MockExchangeAdapter } from './MockExchangeAdapter';
import { BinanceAdapter } from './BinanceAdapter';

class ExchangeRegistry {
  private adapters = new Map<string, ExchangeAdapter>();

  constructor() {
    // Register mock adapter
    this.register(new MockExchangeAdapter());
    // Register Binance live adapter
    this.register(new BinanceAdapter());
  }

  register(adapter: ExchangeAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): ExchangeAdapter | undefined {
    return this.adapters.get(id);
  }

  getDefault(): ExchangeAdapter {
    const useMock = process.env.USE_MOCK_EXCHANGE === 'true' ||
      process.env.NODE_ENV === 'development';

    if (useMock) {
      return this.adapters.get('mock')!;
    }

    // Return first non-mock adapter if available
    for (const adapter of this.adapters.values()) {
      if (!adapter.isMock) return adapter;
    }

    // Fall back to mock
    console.warn('[ExchangeRegistry] No real exchange configured, falling back to mock');
    return this.adapters.get('mock')!;
  }

  getAll(): ExchangeAdapter[] {
    return Array.from(this.adapters.values());
  }

  listIds(): string[] {
    return Array.from(this.adapters.keys());
  }
}

const globalForRegistry = globalThis as unknown as {
  exchangeRegistry: ExchangeRegistry | undefined;
};

export const exchangeRegistry =
  globalForRegistry.exchangeRegistry ?? new ExchangeRegistry();

if (!exchangeRegistry.get('binance')) {
  exchangeRegistry.register(new BinanceAdapter());
}
if (!exchangeRegistry.get('mock')) {
  exchangeRegistry.register(new MockExchangeAdapter());
}

if (process.env.NODE_ENV !== 'production') {
  globalForRegistry.exchangeRegistry = exchangeRegistry;
}
