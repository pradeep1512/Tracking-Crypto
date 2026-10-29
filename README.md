# TrackingCrypt

> **Real-Time Cryptocurrency Price Gap & Execution Optimization Platform**

TrackingCrypt monitors the difference between the price you see and the price you actually pay when executing cryptocurrency trades. It detects spread, market movement, liquidity gaps, fee impact, and stale data — distinguishing actual technical delays from normal market behavior.

---

## ⚠️ Important Disclaimers

- TrackingCrypt is an analytical and informational tool. It does not constitute financial or investment advice.
- **Paper trading is the default.** No real orders are ever placed without your explicit authorization.
- Live trading requires manually configuring exchange API credentials and explicitly enabling it.
- Exchange fees, slippage, and unfilled orders are clearly disclosed.
- Do not commit real API keys. Never store private keys or seed phrases.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 App Router, React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4, custom dark fintech design system |
| Database | Microsoft SQL Server + Prisma ORM |
| Auth | Auth.js v5 (next-auth) with Credentials provider |
| Validation | Zod |
| Exchange Data | REST polling + WebSocket (Mock adapter in dev; Binance in Phase 2) |

---

## Prerequisites

- Node.js v18+
- Microsoft SQL Server (local or cloud)
- npm

---

## Setup Instructions

### 1. Install dependencies

```bash
cd tracking-crypt
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="sqlserver://localhost:1433;database=TrackingCrypt;user=sa;password=YourPassword123!;encrypt=false;trustServerCertificate=true"
AUTH_SECRET="your-random-32-char-secret"
CREDENTIAL_ENCRYPTION_KEY="your-64-hex-char-key"
USE_MOCK_EXCHANGE="true"
```

### 3. Create SQL Server database

```sql
CREATE DATABASE TrackingCrypt;
```

### 4. Run migrations

```bash
npm run db:migrate
# or for quick dev:
npm run db:push
```

### 5. Seed database

```bash
npm install -g tsx   # if not already installed
npm run db:seed
```

Creates: mock exchange, 6 trading pairs, dev user (`dev@trackingcrypt.local` / `DevPassword123!`)

### 6. Start development server

```bash
npm run dev
```

Open: http://localhost:3000

---

## Project Structure

```
tracking-crypt/
├── src/
│   ├── app/
│   │   ├── api/                 # Route handlers
│   │   ├── auth/                # Login & register pages
│   │   └── dashboard/           # Protected dashboard pages
│   ├── components/dashboard/    # Sidebar, Header
│   ├── lib/
│   │   ├── auth/auth.ts         # Auth.js v5 config
│   │   ├── database/prisma.ts   # Prisma singleton
│   │   ├── exchange/            # Adapter pattern
│   │   └── validation/schemas.ts
│   ├── services/                # Business logic
│   └── types/index.ts           # TypeScript types
├── prisma/
│   ├── schema.prisma            # 16-table SQL Server schema
│   └── seed.ts
└── README.md
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/exchanges` | No | List adapters |
| GET | `/api/market/tickers` | No | Current tickers |
| GET | `/api/market/orderbook` | No | Order book |
| GET | `/api/price-gap/current` | No | Gap analysis |
| GET | `/api/latency/metrics` | No | p50/p95/p99 |
| POST | `/api/orders/simulate` | Yes | Paper trade sim |
| GET/PATCH | `/api/settings` | Yes | Pre-trade risk controls & safety config |
| POST | `/api/trading/kill-switch` | Yes | Emergency Kill Switch instant halt/resume |
| GET/POST/DELETE | `/api/credentials` | Yes | AES-256-GCM encrypted credential vault |

---

## Implementation Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ **Complete** | Project setup, auth, DB schema, dashboard UI, mock adapter |
| 2 | ✅ **Complete** | Real exchange WebSocket streaming, Binance public adapter, SSE endpoint, live Markets page |
| 3 | ✅ **Complete** | Order book normalization, VWAP execution engine, SQL Server Prisma persistence & audit history |
| 4 | ✅ **Complete** | Historical analytics dashboard, statistical percentiles, alert rules engine with cooldowns & notifications |
| 5 | ✅ **Complete** | Interactive execution estimator, slippage vs size curve, paper trading engine with portfolio & order book fills |
| 6 | ✅ **Complete** | Optional live limit execution, AES-256-GCM credential vault, Emergency Kill Switch, pre-trade risk controls & settings UI |
| 7 | ✅ **Complete** | Automated unit & integration tests, latency benchmark suite (57,556 ops/sec, p99: 0.068ms), final security & performance audit |

---

## Testing & Performance Benchmarks

### 1. Run Automated Unit Test Suite (29 tests across 5 suites)

```bash
npm test
```

Verifies:
- **`PriceGapDetectionService`**: VWAP ladder execution, fee calculations, and root-cause classification (`SPREAD`, `MARKET_MOVEMENT`, `LIQUIDITY`, `SLIPPAGE`, `STALE_DATA`).
- **`OrderBookService`**: Cross-exchange normalization, sorting (bids desc / asks asc), depth bands, and order imbalance ratios.
- **`LatencyOptimizationService`**: Statistical percentiles (p50, p90, p95, p99), jitter, outlier detection, and clock desync rejection.
- **`ExchangeCredentialService`**: Authenticated AES-256-GCM encryption/decryption, ciphertext tampering detection, tag verification, and API key masking.
- **`LiveTradingService`**: Safety guardrails, max order size ceiling, slippage threshold, sliding window rate limiter, and Emergency Kill Switch.

### 2. Run High-Throughput Latency Benchmark (10,000 synthetic ticks)

```bash
npm run benchmark
```

**Measured Latency & Throughput Results:**
- **Throughput**: ~57,500 operations / second
- **p50 (Median) Latency**: 10.70 µs (0.0107 ms)
- **p90 Latency**: 26.50 µs (0.0265 ms)
- **p95 Latency**: 34.40 µs (0.0344 ms)
- **p99 Latency**: 68.00 µs (0.0680 ms)
- **SLA**: Well within the sub-5ms real-time latency target (p99 is 0.068ms, exceeding SLA by 73x).

---

## Security Architecture

- **Strict Least-Privilege Guardrail**: API keys with withdrawal permissions are unconditionally rejected at ingestion (`WITHDRAWAL_PERMISSION_REJECTED`).
- **AES-256-GCM Key Vault**: Symmetric encryption with 12-byte IVs and 16-byte authentication tags; zero plaintext secrets stored.
- **Safe Defaults**: Paper trading is strictly the default; live execution requires explicit opt-in and acknowledgement of risk.
- **Pre-Trade Risk Engine**: Max order sizes, maximum slippage tolerance limits, and sliding window submission rate limiting.
- **Emergency Kill Switch**: Instant global trade freeze triggerable via UI banner and `POST /api/trading/kill-switch`.

---

## Comprehensive PDF Documentation (30-Page Editions)

The repository includes two complete, 30-page PDF documents generated in vector binary format:

1. **`TrackingCrypt_Developer_Guide.pdf`** (30 Pages):
   - **Target**: Full-stack developers, quant engineers, DevOps, and security auditors.
   - **Content**: 30 comprehensive chapters detailing system architecture, Next.js 16 App Router, 16-table SQL Server schema, core algorithms (VWAP, normalization, 6-factor classification), AES-256-GCM vault, 29-test test suite, and microsecond latency benchmark.
   - **Web Download**: `http://localhost:3000/docs/TrackingCrypt_Developer_Guide.pdf`
   - **Local File**: `docs/TrackingCrypt_Developer_Guide.pdf`

2. **`TrackingCrypt_User_Manual.pdf`** (31 Pages):
   - **Target**: Cryptocurrency traders, analysts, and portfolio operators.
   - **Content**: 30 plain-English chapters explaining the ₹101 to ₹103 price gap case study, reading 20-level order book depth, ±0.5%/±1%/±2% depth bands, order imbalance ratios, paper trading simulation, alert rules, Emergency Kill Switch, and step-by-step trading workflows.
   - **Web Download**: `http://localhost:3000/docs/TrackingCrypt_User_Manual.pdf`
   - **Local File**: `docs/TrackingCrypt_User_Manual.pdf`

To re-compile both PDF documents at any time:

```bash
npm run docs:build
```
