import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, hsl(199,89%,48%) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, hsl(262,83%,58%) 0%, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, hsl(221,83%,53%) 0%, transparent 70%)' }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, hsl(199,89%,48%), hsl(221,83%,53%))' }}>
            <span className="text-white font-bold text-sm">TC</span>
          </div>
          <span className="text-xl font-bold tracking-tight">
            <span className="gradient-text">Tracking</span>
            <span className="text-white">Crypt</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/auth/login"
            className="text-muted-foreground hover:text-foreground transition-colors text-sm">
            Sign In
          </Link>
          <Link href="/auth/register"
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 hover:scale-105"
            style={{ background: 'linear-gradient(135deg, hsl(199,89%,48%), hsl(221,83%,53%))' }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-8 pt-24 pb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-dot" />
          Real-Time Market Intelligence
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 max-w-4xl">
          <span className="text-white">Stop Losing Money</span>
          <br />
          <span className="gradient-text">to Price Gaps</span>
        </h1>

        <p className="text-muted-foreground text-lg sm:text-xl max-w-2xl mb-10 leading-relaxed">
          TrackingCrypt monitors the difference between the price you see and the price 
          you pay — detecting spread, slippage, fees, and stale data in real time.
        </p>

        {/* Example scenario card */}
        <div className="glass-card p-6 mb-10 w-full max-w-md text-left">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4 font-medium">
            Example Scenario
          </p>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Seller&apos;s quoted price</span>
              <span className="text-white font-mono font-semibold">₹101.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Market ask price</span>
              <span className="text-white font-mono font-semibold">₹103.00</span>
            </div>
            <div className="h-px bg-white/5" />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Price gap</span>
              <span className="text-red-400 font-mono font-bold">+₹2.00 (+1.98%)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Gap cause</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-xs font-medium">
                Market Movement
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link href="/auth/register"
            className="px-8 py-3.5 rounded-xl text-white font-semibold transition-all hover:scale-105 hover:shadow-xl glow-cyan"
            style={{ background: 'linear-gradient(135deg, hsl(199,89%,48%), hsl(221,83%,53%))' }}>
            Start Tracking Free
          </Link>
          <Link href="/auth/login"
            className="px-8 py-3.5 rounded-xl border border-white/10 text-foreground font-semibold transition-all hover:border-white/30 hover:bg-white/5">
            Sign In to Dashboard
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-8 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-4">
          <span className="text-white">Built for </span>
          <span className="gradient-text">Precision Trading</span>
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
          Every millisecond and every paisa counts. TrackingCrypt gives you the tools to understand exactly what&apos;s happening.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '⚡',
              title: 'Real-Time Price Gap Detection',
              desc: 'Compares reference price vs best bid/ask vs estimated execution price with VWAP analysis.',
              color: 'cyan',
            },
            {
              icon: '📊',
              title: 'Gap Classification Engine',
              desc: 'Identifies whether gaps are caused by spread, market movement, liquidity, fees, or stale data.',
              color: 'purple',
            },
            {
              icon: '🎯',
              title: 'Execution Simulator',
              desc: 'Simulate buy/sell orders against live order book depth to estimate slippage before trading.',
              color: 'emerald',
            },
            {
              icon: '🔗',
              title: 'WebSocket Streaming',
              desc: 'Persistent real-time connections with automatic reconnect, heartbeat, and stale-data detection.',
              color: 'blue',
            },
            {
              icon: '🛡️',
              title: 'Paper Trading',
              desc: 'Test strategies risk-free with simulated fills. Live trading disabled by default — always.',
              color: 'amber',
            },
            {
              icon: '📈',
              title: 'Latency Analytics',
              desc: 'Measures p50/p95/p99 latency at each pipeline stage. Never fabricates measurements.',
              color: 'rose',
            },
          ].map((f) => (
            <div key={f.title} className="glass-card p-6 transition-all hover:border-white/15 hover:-translate-y-1">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer */}
      <footer className="relative z-10 border-t border-white/5 px-8 py-8 text-center">
        <p className="text-muted-foreground text-xs max-w-2xl mx-auto leading-relaxed">
          TrackingCrypt is an informational and analytical tool. It does not provide financial or investment advice.
          Paper trading simulates outcomes but does not guarantee real execution. Live trading is disabled by default
          and requires explicit configuration. Exchange fees, slippage, and unfilled orders are clearly disclosed.
          Always verify data with your exchange before making trading decisions.
        </p>
        <p className="text-muted-foreground/50 text-xs mt-4">
          © {new Date().getFullYear()} TrackingCrypt. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
