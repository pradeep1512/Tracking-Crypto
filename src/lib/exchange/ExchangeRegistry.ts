/**
 * ExchangeRegistry — Manages available exchange adapters.
 *
 * Configures Delta Exchange as the sole crypto market data provider.
 */

import type { ExchangeAdapter } from './ExchangeAdapter';
import { DeltaExchangeAdapter } from './DeltaExchangeAdapter';
import { MockExchangeAdapter } from './MockExchangeAdapter';

class ExchangeRegistry {
  private adapters = new Map<string, ExchangeAdapter>();

  constructor() {
    // Register Delta Exchange as sole crypto market data provider
    this.register(new DeltaExchangeAdapter());
    // Register mock adapter for isolated offline test simulation
    this.register(new MockExchangeAdapter());
  }

  register(adapter: ExchangeAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  get(id: string): ExchangeAdapter | undefined {
    if (id === 'binance' || id === 'coindcx') {
      // Gracefully redirect any old vendor requests strictly to Delta Exchange
      return this.adapters.get('delta');
    }
    return this.adapters.get(id);
  }

  getDefault(): ExchangeAdapter {
    // Delta Exchange is the primary provider
    const delta = this.adapters.get('delta');
    if (delta) return delta;
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

if (!exchangeRegistry.get('delta')) {
  exchangeRegistry.register(new DeltaExchangeAdapter());
}
if (!exchangeRegistry.get('mock')) {
  exchangeRegistry.register(new MockExchangeAdapter());
}

if (process.env.NODE_ENV !== 'production') {
  globalForRegistry.exchangeRegistry = exchangeRegistry;
}
