const path = require('path');
const fs = require('fs');
const PdfEngine = require('./pdf-engine');

const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const publicDocsDir = path.join(rootDir, 'public', 'docs');

async function buildUserManual() {
  console.log('Compiling Comprehensive TrackingCrypt User Manual (Target: 30 Full Pages)...');
  const engine = new PdfEngine('TrackingCrypt User Manual');

  // =========================================================================
  // PAGE 1: COVER PAGE
  // =========================================================================
  engine.coverPage({
    badge: 'PLATFORM USER MANUAL & TRADING OPERATIONS GUIDE',
    title: 'TrackingCrypt',
    subtitle: 'Real-Time Cryptocurrency Price Variance & Execution Optimization Platform',
    description:
      'The comprehensive, easy-to-understand manual for cryptocurrency traders, analysts, and portfolio operators. Explains the quote-to-fill price gap phenomenon, how to diagnose whether price differences are caused by technical latency or market microstructure, how to use the 20-level visual order book, and how to execute risk-free simulated orders using the paper trading engine.',
    metadata: [
      ['Document Version:', '1.0 Production Edition'],
      ['Release Date:', 'October 2026'],
      ['Target Audience:', 'Crypto Traders, Analysts, Operations Teams'],
      ['Default Execution Mode:', 'Paper Trading Simulation ($10,000 USDT Virtual Balance)'],
      ['Risk Controls:', 'Emergency Kill Switch, Pre-Trade Size Caps, Slippage Ceilings'],
      ['Key Security Rule:', 'Zero Plaintext Keys; Withdrawal Rights Prohibited'],
      ['Live Market Source:', 'Binance Public WebSocket Feeds (Sub-100ms Updates)'],
      ['Supported Currency Pairs:', 'BTC/USDT, ETH/USDT, SOL/USDT, XRP/USDT, ADA/USDT, DOGE/USDT'],
    ],
    themeColor: '#0E7490',
  });

  // =========================================================================
  // PAGE 2: PREFACE & EXECUTIVE SUMMARY
  // =========================================================================
  engine.addContentPage();
  engine.sectionHeader('Executive Summary & How to Use This Manual');
  engine.paragraph(
    'Welcome to TrackingCrypt. This platform was designed to give cryptocurrency market participants unprecedented clarity into what really happens between the second a price quote is viewed on an exchange and the moment an order is confirmed.'
  );

  engine.callout(
    'The Trader Guarantee: Safe by Default',
    'TrackingCrypt operates in Paper Trading Simulation mode by default. You can test order types, inspect order books, and analyze slippage curves with complete peace of mind. Real capital is never placed at risk without explicit opt-in and multi-factor safety confirmations.',
    'success'
  );

  engine.subSectionHeader('How This Guide Is Organized');
  engine.bullet('Foundations (Chapters 3–11)', 'Explains what price gaps are, why they happen, and how market microstructure works.');
  engine.bullet('Platform Navigation (Chapters 12–16)', 'Walks you through every screen: Overview, Live Markets, and Order Books.');
  engine.bullet('Trading & Simulation (Chapters 17–21)', 'Covers paper trading, slippage curves, order types, and portfolio tracking.');
  engine.bullet('Diagnostics & Safety (Chapters 22–26)', 'Covers gap diagnostics, alerts, Emergency Kill Switch, and API key protection.');
  engine.bullet('Best Practices & FAQs (Chapters 27–30)', 'Practical tips, step-by-step trading scenarios, and complete glossary.');

  // =========================================================================
  // PAGE 3: TABLE OF CONTENTS
  // =========================================================================
  engine.addContentPage();
  engine.sectionHeader('Table of Contents — Chapters 1 through 30');
  engine.paragraph('Quickly navigate to any section of the user manual using the chapter reference guide below:');

  const userTocList = [
    { num: 1, title: 'Cover Page & Document Control', page: 1 },
    { num: 2, title: 'Executive Summary & How to Use This Manual', page: 2 },
    { num: 3, title: 'Introduction to TrackingCrypt & The Price Gap Problem', page: 4 },
    { num: 4, title: 'Core Benefits & Value Proposition for Traders', page: 5 },
    { num: 5, title: 'System Requirements, Supported Devices & Browsers', page: 6 },
    { num: 6, title: 'Accessing the Platform & Top Navigation Bar', page: 7 },
    { num: 7, title: 'Understanding the Overview Dashboard (/dashboard)', page: 8 },
    { num: 8, title: 'Understanding Live Cryptocurrency Prices & Market Tickers', page: 9 },
    { num: 9, title: 'Buy Prices, Sell Prices, Spreads & Market Volatility', page: 10 },
    { num: 10, title: 'Why Displayed Quotes Differ from Final Executions (₹101 to ₹103)', page: 11 },
    { num: 11, title: 'Understanding Price Refresh Delays & Data Timestamps', page: 12 },
    { num: 12, title: 'Searching & Selecting Supported Trading Pairs', page: 13 },
    { num: 13, title: 'Reading the 20-Level Visual Order Book & Depth Ladders', page: 14 },
    { num: 14, title: 'Liquidity Depth Bands (±0.5%, ±1%, ±2%) & Order Imbalance', page: 15 },
    { num: 15, title: 'User Registration, Login & Session Management', page: 16 },
    { num: 16, title: 'Account Settings, Currency Preferences & Themes', page: 17 },
    { num: 17, title: 'Automated Alert Rules Engine & Notifications (/dashboard/alerts)', page: 18 },
    { num: 18, title: 'Interactive Slippage Estimator & Dynamic Sizing Curves', page: 19 },
    { num: 19, title: 'Step-by-Step Order Placement & Simulation (/dashboard/orders)', page: 20 },
    { num: 20, title: 'Order Types Explained: Market, Limit, Post-Only, IOC, FOK', page: 21 },
    { num: 21, title: 'Virtual Portfolio Management & Transaction Fill History', page: 22 },
    { num: 22, title: 'Analyzing Price Gaps & Diagnostic Tools (/dashboard/price-gap)', page: 23 },
    { num: 23, title: 'The Six Root-Cause Categories Explained in Plain English', page: 24 },
    { num: 24, title: 'Historical Analytics Dashboard & Latency Percentiles', page: 25 },
    { num: 25, title: 'Emergency Kill Switch & Risk Settings (/dashboard/settings)', page: 26 },
    { num: 26, title: 'Connecting Exchange API Keys & Least-Privilege Rules', page: 27 },
    { num: 27, title: 'Best Practices for Minimizing Slippage & Capital Leakage', page: 28 },
    { num: 28, title: 'Troubleshooting Common Website Issues & FAQs', page: 29 },
    { num: 29, title: 'Three Real-World Trader Walkthrough Scenarios', page: 30 },
    { num: 30, title: 'Cryptocurrency Trading Glossary & Final Sign-Off', page: 31 },
  ];

  engine.table(
    ['Chapter', 'Title & Subject Matter', 'Page'],
    userTocList.map((item) => [`Ch. ${item.num}`, item.title, `Page ${item.page}`]),
    [60, 390, 61]
  );

  // =========================================================================
  // PAGE 4: CHAPTER 3 - INTRODUCTION TO TRACKINGCRYPT
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(3, 'Introduction to TrackingCrypt & The Price Gap');
  engine.paragraph(
    'Cryptocurrency trading is fast-paced, highly volatile, and executed across geographically dispersed exchange servers. Every trader has experienced the disappointment of seeing an attractive price on their screen, submitting a trade, and finding out their order was executed at a significantly worse price.'
  );

  engine.sectionHeader('What is a Price Gap?');
  engine.paragraph(
    'A price gap is the numerical and percentage difference between the price an exchange displays to you as a buyer or seller, and the actual volume-weighted price at which your transaction fills.'
  );

  engine.callout(
    'Key Takeaway for Traders',
    'A price gap is not always an error or technical bug. It is usually the natural consequence of how exchange order books work. TrackingCrypt shows you exactly which portion of the price difference is due to spread, which is due to your order size, and which is due to network delays.',
    'info'
  );

  engine.sectionHeader('Why Does TrackingCrypt Exist?');
  engine.bullet('Identify Hidden Costs', 'Expose the invisible costs of crossing spreads and order book slippage before committing funds.');
  engine.bullet('Eliminate False Assumptions', 'Distinguish market momentum from network latency so you make informed trading decisions.');
  engine.bullet('Simulate Safely', 'Test complex order types (Post-Only, IOC, FOK) with virtual funds against real exchange depth.');

  // =========================================================================
  // PAGE 5: CHAPTER 4 - CORE BENEFITS FOR TRADERS
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(4, 'Core Benefits & Value Proposition for Traders');
  engine.paragraph(
    'Whether you are an individual retail trader or managing institutional crypto assets, TrackingCrypt provides four core pillars of value:'
  );

  engine.table(
    ['Pillar of Value', 'Platform Feature', 'Direct Benefit to Trader'],
    [
      ['Pre-Trade Clarity', 'Interactive Slippage Estimator', 'See exactly how much price slippage your order size will cause before buying.'],
      ['Root-Cause Diagnosis', 'Price Gap Classification Engine', 'Instantly know whether a ₹2 price increase was spread, momentum, or delay.'],
      ['Capital Protection', 'Emergency Kill Switch & Caps', 'Prevent catastrophic fat-finger losses with hard USD caps and one-click halts.'],
      ['Zero-Risk Practice', 'Paper Trading Matching Engine', 'Master limit order execution and order book reading with $10,000 virtual USDT.'],
    ],
    [110, 150, 251]
  );

  engine.sectionHeader('Who Uses TrackingCrypt?');
  engine.bullet('Retail Spot Traders', 'To stop losing 0.5%–2.0% on every trade due to aggressive market orders.');
  engine.bullet('Algorithmic Traders', 'To verify latency percentiles (p50, p90, p99) and tune execution speed.');
  engine.bullet('Crypto Fund Managers', 'To audit order execution quality and maintain immutable compliance logs.');

  // =========================================================================
  // PAGE 6: CHAPTER 5 - SYSTEM REQUIREMENTS & ACCESS
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(5, 'System Requirements & Supported Devices');
  engine.paragraph(
    'TrackingCrypt is a web-based platform engineered to run smoothly on desktop browsers with zero software installation required.'
  );

  engine.sectionHeader('Supported Web Browsers');
  engine.table(
    ['Browser', 'Minimum Version', 'Recommended Settings'],
    [
      ['Google Chrome', 'Version 110 or higher', 'Hardware acceleration enabled for smooth SVG charting.'],
      ['Microsoft Edge', 'Version 110 or higher', 'Default settings; optimal rendering engine.'],
      ['Mozilla Firefox', 'Version 115 or higher', 'WebSocket connections enabled; disable aggressive ad-blockers.'],
      ['Apple Safari', 'Version 16.0 or higher', 'Supported on macOS Ventura and Sonoma.'],
    ],
    [120, 140, 251]
  );

  engine.sectionHeader('Hardware & Network Recommendations');
  engine.bullet('Display Resolution', 'Minimum 1280x720; 1920x1080 (Full HD) recommended for viewing 20-level order books.');
  engine.bullet('Internet Connection', 'Broadband internet with stable ping (<100ms) to ensure real-time WebSocket streaming.');

  // =========================================================================
  // PAGE 7: CHAPTER 6 - PLATFORM ACCESS & NAVIGATION
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(6, 'Accessing the Platform & Navigation Layout');
  engine.paragraph(
    'The TrackingCrypt interface is organized into a persistent left-hand navigation sidebar, a top status bar, and a main operational viewport.'
  );

  engine.sectionHeader('Navigating the Sidebar Menu');
  engine.table(
    ['Sidebar Icon & Title', 'Destination URL', 'Primary Function'],
    [
      ['Overview', '/dashboard', 'Summary of active markets, recent price gaps, and portfolio equity.'],
      ['Live Markets', '/dashboard/markets', 'Real-time ticker stream and 20-level visual order book.'],
      ['Price Gap Analysis', '/dashboard/price-gap', 'Interactive quote diagnostic tool with root-cause categorization.'],
      ['Historical Analytics', '/dashboard/analytics', 'Statistical latency percentiles and gap frequency charts.'],
      ['Orders & Paper Trading', '/dashboard/orders', 'Slippage estimator curve and paper trade execution form.'],
      ['Alert Rules', '/dashboard/alerts', 'Configurable threshold alerts and notification logs.'],
      ['Settings & Safety', '/dashboard/settings', 'Emergency Kill Switch, pre-trade risk limits, and key vault.'],
    ],
    [130, 130, 251]
  );

  engine.sectionHeader('The Top Status Ribbon');
  engine.paragraph(
    'The top header displays active market connection status (Binance WebSocket: CONNECTED), your current execution mode (PAPER TRADING), and the status of the Emergency Kill Switch (STANDBY vs HALTED).'
  );

  // =========================================================================
  // PAGE 8: CHAPTER 7 - THE OVERVIEW DASHBOARD
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(7, 'Understanding the Overview Dashboard');
  engine.paragraph(
    'When you log into TrackingCrypt, the Overview dashboard (/dashboard) gives you an executive bird’s-eye view of your trading environment.'
  );

  engine.sectionHeader('Key Widgets on the Overview Page');
  engine.bullet('Active Market Tickers Ribbon', 'Displays real-time prices for BTC/USDT, ETH/USDT, SOL/USDT with 24h percentage change.');
  engine.bullet('Active Price Gaps Card', 'Highlights cryptocurrency pairs currently experiencing abnormal quote-to-fill variances.');
  engine.bullet('Portfolio Equity Summary', 'Real-time total value of your virtual USDT and crypto holdings marked-to-market.');
  engine.bullet('Latency Health Monitor', 'Displays current end-to-end latency (typically 40–80ms) and network connection health.');

  engine.callout(
    'Tip for Fast Daily Checks',
    'Before trading, glance at the Latency Health Monitor. If latency is below 100ms and the kill switch is on Standby, your trading environment is healthy.',
    'info'
  );

  // =========================================================================
  // PAGE 9: CHAPTER 8 - LIVE PRICES & MARKET TICKERS
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(8, 'Understanding Live Cryptocurrency Prices');
  engine.paragraph(
    'Cryptocurrency prices move every millisecond. TrackingCrypt streams live prices directly from Binance public feeds without requiring you to refresh the webpage.'
  );

  engine.sectionHeader('Deconstructing the Market Ticker Card');
  engine.table(
    ['Ticker Metric', 'Example Value', 'What It Tells You'],
    [
      ['Best Bid', '$50,000.00', 'The highest price that buyers in the market are currently offering.'],
      ['Best Ask', '$50,020.00', 'The lowest price that sellers in the market are willing to accept.'],
      ['Mid-Price', '$50,010.00', 'The exact statistical midpoint between the best bid and best ask.'],
      ['Spread ($)', '$20.00', 'The dollar cost of crossing the market immediately.'],
      ['Spread (%)', '0.0400%', 'The spread expressed as a percentage of mid-price. Tighter is better.'],
      ['Data Age', '42 ms', 'How many milliseconds ago this quote was generated on the exchange.'],
    ],
    [100, 90, 321]
  );

  // =========================================================================
  // PAGE 10: CHAPTER 9 - SPREADS, BUYS, SELLS & VOLATILITY
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(9, 'Buy Prices, Sell Prices & Bid-Ask Spreads');
  engine.paragraph(
    'Every financial market has two prices at any given moment: the price you buy at (Ask) and the price you sell at (Bid).'
  );

  engine.sectionHeader('Crossing the Spread: The Instant Cost');
  engine.paragraph(
    'If you place an immediate "Market Order", you must pay the seller’s Ask price. If you immediately turn around and sell it, you receive the buyer’s Bid price. The difference between those two prices is the bid-ask spread.'
  );

  engine.callout(
    'The Golden Rule of Market Orders',
    'The moment you execute a market BUY order, your position immediately starts at a slight loss equal to the bid-ask spread plus the exchange fee. To avoid this, professional traders use LIMIT orders.',
    'warning'
  );

  engine.sectionHeader('Market Volatility & Price Drift');
  engine.paragraph(
    'During periods of high market volatility (e.g. major news announcements), the best ask can jump upward in fractions of a second, creating a large price difference before your order reaches the exchange.'
  );

  // =========================================================================
  // PAGE 11: CHAPTER 10 - THE ₹101 TO ₹103 CASE STUDY
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(10, 'Why Quotes Differ from Fills (₹101 to ₹103)');
  engine.paragraph(
    'Let us examine in detail the classic scenario that inspired the creation of TrackingCrypt.'
  );

  engine.sectionHeader('Step-by-Step Breakdown of the Scenario');
  engine.bullet('Step 1 (Quote Viewed)', 'A seller lists 1.0 unit of crypto at ₹101. The buyer sees ₹101 on screen at 10:00:00 AM.');
  engine.bullet('Step 2 (Human Delay)', 'The buyer spends 2.5 seconds reviewing the order and clicks "Buy" at 10:00:02.5 AM.');
  engine.bullet('Step 3 (Market Execution)', 'The order reaches the exchange at 10:00:02.6 AM and executes at ₹103. Total difference: +₹2 (+1.98%).');

  engine.sectionHeader('Evaluating the Actual Causes');
  engine.table(
    ['Hypothetical Cause', 'Was it the culprit?', 'How TrackingCrypt Verifies This'],
    [
      ['Technical Delay?', 'Partially (60ms network transit)', 'LatencyOptimizationService verifies exchange timestamp vs server arrival.'],
      ['Market Movement?', 'Yes (+1.50% external price drift)', 'PriceGapDetectionService checks if mid-price rose across all exchanges.'],
      ['Order Size / Depth?', 'Yes (Level-1 liquidity was exhausted)', 'OrderBookService checks if the ₹101 level only had 0.2 units available.'],
      ['Exchange Fees?', 'Yes (0.10% taker fee = ₹0.10)', 'Fee multiplier is explicitly added to estimated execution price.'],
    ],
    [120, 140, 251]
  );

  // =========================================================================
  // PAGE 12: CHAPTER 11 - REFRESH DELAYS & TIMESTAMPS
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(11, 'Price Refresh Delays & Data Timestamps');
  engine.paragraph(
    'Understanding timestamps is critical to knowing whether your screen is showing live data or delayed data.'
  );

  engine.sectionHeader('The Data Age Indicator');
  engine.paragraph(
    'On every market card, TrackingCrypt displays a small badge showing "Data Age: XX ms". Here is how to interpret it:'
  );

  engine.table(
    ['Data Age Value', 'Status Badge', 'What It Means for You'],
    [
      ['Under 100 ms', 'Green (EXCELLENT)', 'Fresh real-time streaming data. Highly safe to evaluate execution.'],
      ['100 ms to 500 ms', 'Blue (NORMAL)', 'Acceptable internet latency. Typical for retail broadband connections.'],
      ['500 ms to 2,000 ms', 'Amber (DEGRADED)', 'Noticeable lag. Market prices may have moved slightly ahead of your screen.'],
      ['Over 5,000 ms', 'Red (STALE DATA)', 'Connection stalled. Do NOT place market orders until data re-synchronizes.'],
    ],
    [120, 110, 281]
  );

  // =========================================================================
  // PAGE 13: CHAPTER 12 - SEARCHING & SELECTING PAIRS
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(12, 'Searching & Selecting Supported Currency Pairs');
  engine.paragraph(
    'TrackingCrypt monitors 6 major cryptocurrency trading pairs representing the highest liquidity in global crypto markets.'
  );

  engine.sectionHeader('Supported Trading Pairs');
  engine.table(
    ['Trading Pair', 'Base Currency', 'Quote Currency', 'Market Characteristics'],
    [
      ['BTC/USDT', 'Bitcoin (BTC)', 'Tether (USDT)', 'Deepest liquidity globally; tightest spreads (often < 0.02%).'],
      ['ETH/USDT', 'Ethereum (ETH)', 'Tether (USDT)', 'Very high volume; excellent depth for orders up to $100k.'],
      ['SOL/USDT', 'Solana (SOL)', 'Tether (USDT)', 'High retail activity; moderate volatility and rapid price swings.'],
      ['XRP/USDT', 'Ripple (XRP)', 'Tether (USDT)', 'Sub-dollar pricing; high order volume with distinct depth walls.'],
      ['ADA/USDT', 'Cardano (ADA)', 'Tether (USDT)', 'Lower unit cost; wide depth bands requiring careful limit sizing.'],
      ['DOGE/USDT', 'Dogecoin (DOGE)', 'Tether (USDT)', 'High momentum volatility; susceptible to rapid spread widening.'],
    ],
    [90, 80, 90, 251]
  );

  // =========================================================================
  // PAGE 14: CHAPTER 13 - READING THE 20-LEVEL ORDER BOOK
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(13, 'Reading the 20-Level Visual Order Book');
  engine.paragraph(
    'The visual order book on the Live Markets page (/dashboard/markets) is one of the most powerful tools in TrackingCrypt.'
  );

  engine.sectionHeader('Anatomy of the Visual Order Book');
  engine.bullet('Green Bids Column (Left)', 'Represents buyers waiting in line. Ordered from highest bid price down to lower bids.');
  engine.bullet('Red Asks Column (Right)', 'Represents sellers waiting in line. Ordered from lowest ask price up to higher asks.');
  engine.bullet('Cumulative Total Bar', 'The shaded background bar shows the running cumulative volume available down to that level.');

  engine.callout(
    'How Large Orders Eat the Book',
    'If you place a market BUY order for 5.0 BTC, but the top ask level only has 1.0 BTC, the exchange automatically buys 1.0 BTC at Level 1, then buys 2.0 BTC at Level 2 (higher price), and buys 2.0 BTC at Level 3 (even higher price). Your final execution price is the volume-weighted average (VWAP) across all three levels.',
    'warning'
  );

  // =========================================================================
  // PAGE 15: CHAPTER 14 - DEPTH BANDS & IMBALANCE RATIO
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(14, 'Liquidity Depth Bands & Order Imbalance');
  engine.paragraph(
    'Directly beneath the order book, TrackingCrypt computes liquidity depth bands and the order imbalance ratio.'
  );

  engine.sectionHeader('The ±0.5%, ±1.0%, ±2.0% Depth Bands');
  engine.table(
    ['Depth Band', 'Volume Meaning', 'How to Use It in Practice'],
    [
      ['Within ±0.5%', 'Immediate liquidity cushion.', 'Safe zone for instant market orders. Slippage will be negligible.'],
      ['Within ±1.0%', 'Secondary liquidity barrier.', 'Maximum recommended size for a single trade without splitting.'],
      ['Within ±2.0%', 'Deep market absorption limit.', 'If your order reaches this band, split it into smaller limit orders.'],
    ],
    [100, 130, 281]
  );

  engine.sectionHeader('The Order Imbalance Ratio');
  engine.paragraph(
    'The Imbalance Ratio compares total buying volume versus total selling volume in the visible book. A positive score (e.g. +0.45) indicates heavy buying pressure, suggesting price is likely to rise. A negative score (e.g. -0.38) indicates selling dominance.'
  );

  // =========================================================================
  // PAGE 16: CHAPTER 15 - REGISTRATION & LOGIN
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(15, 'User Registration, Login & Sessions');
  engine.paragraph(
    'TrackingCrypt provides password-protected accounts with encrypted credential storage.'
  );

  engine.sectionHeader('Account Access Steps');
  engine.bullet('1. Registering', 'Visit /auth/register and provide your name, email, and a strong password (minimum 8 characters).');
  engine.bullet('2. Logging In', 'Visit /auth/login with your credentials. Development accounts are pre-seeded for testing.');
  engine.bullet('3. Session Security', 'Sessions are protected with encrypted HTTP-only JWT cookies that automatically expire.');

  engine.callout(
    'Development Test Account Credentials',
    'For local testing and demonstration: Email: dev@trackingcrypt.local | Password: DevPassword123!',
    'info'
  );

  // =========================================================================
  // PAGE 17: CHAPTER 16 - SETTINGS & PROFILE PREFERENCES
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(16, 'Account Settings & Profile Preferences');
  engine.paragraph(
    'Customize your display preferences, currency standards, and risk tolerance on the Settings page (/dashboard/settings).'
  );

  engine.sectionHeader('Customizable Settings');
  engine.bullet('Preferred Currency', 'Select INR (₹) or USD ($) as your primary display currency.');
  engine.bullet('Max Slippage Tolerance (%)', 'Set your threshold (e.g. 0.50%). Orders exceeding this will be blocked.');
  engine.bullet('Max Order Size ($)', 'Cap individual orders to prevent accidental oversized trades (default: $5,000 USD).');
  engine.bullet('Theme Selector', 'Toggle between Dark Fintech mode (recommended) and High Contrast mode.');

  // =========================================================================
  // PAGE 18: CHAPTER 17 - ALERT RULES & NOTIFICATIONS
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(17, 'Automated Alert Rules & Notification Center');
  engine.paragraph(
    'TrackingCrypt continuously monitors market conditions and alerts you when critical thresholds are breached.'
  );

  engine.sectionHeader('Configurable Alert Types (/dashboard/alerts)');
  engine.table(
    ['Alert Rule Type', 'Severity', 'Trigger Condition'],
    [
      ['GAP_EXCEEDED', 'WARNING', 'Triggers when a quote-to-fill price difference exceeds your configured tolerance.'],
      ['DATA_STALE', 'WARNING', 'Triggers when market data age exceeds 5,000ms due to network issues.'],
      ['WS_DISCONNECT', 'CRITICAL', 'Triggers if the exchange WebSocket drops and fails to reconnect.'],
      ['MAX_BUY_EXCEEDED', 'INFO', 'Triggers when an ask price rises above your planned maximum purchase ceiling.'],
    ],
    [130, 80, 301]
  );

  engine.sectionHeader('Intelligent Cooldown Deduplication');
  engine.paragraph(
    'To prevent notification fatigue, alert rules include a 300-second cooldown period. Once triggered, the rule will not alert again until the cooldown expires.'
  );

  // =========================================================================
  // PAGE 19: CHAPTER 18 - INTERACTIVE SLIPPAGE ESTIMATOR
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(18, 'Interactive Slippage Estimator & Curves');
  engine.paragraph(
    'Located on the Orders page (/dashboard/orders), the Slippage Estimator evaluates market depth before you execute.'
  );

  engine.sectionHeader('How to Read the Slippage vs. Size Curve');
  engine.paragraph(
    'The chart plots order quantity on the horizontal axis and expected slippage percentage on the vertical axis:'
  );
  engine.bullet('Flat Linear Section', 'Small orders fit comfortably within top-of-book liquidity with <0.02% slippage.');
  engine.bullet('The Inflection Point', 'The point where order size exhausts Level 1 and begins consuming deeper, more expensive levels.');
  engine.bullet('Steep Upward Curve', 'Dangerous order sizes that cause exponential price impact. Consider reducing size.');

  // =========================================================================
  // PAGE 20: CHAPTER 19 - STEP-BY-STEP ORDER PLACEMENT
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(19, 'Step-by-Step Order Placement & Simulation');
  engine.paragraph(
    'Follow these 5 steps to place a risk-free paper trade on the Orders dashboard:'
  );

  engine.sectionHeader('5-Step Trading Simulation Guide');
  engine.bullet('Step 1: Select Trading Pair', 'Choose your desired cryptocurrency (e.g. BTC/USDT) from the dropdown.');
  engine.bullet('Step 2: Choose Side & Type', 'Select BUY or SELL, then pick an order type (LIMIT or POST_ONLY recommended).');
  engine.bullet('Step 3: Enter Quantity & Price', 'Input your desired volume and target price. The estimator updates instantly.');
  engine.bullet('Step 4: Review Estimated Slippage', 'Check the slippage estimate. If slippage exceeds 0.50%, consider lowering your size.');
  engine.bullet('Step 5: Click "Submit Order"', 'The paper trading engine matches your order against live book depth and credits your portfolio.');

  // =========================================================================
  // PAGE 21: CHAPTER 20 - ORDER TYPES EXPLAINED FOR TRADERS
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(20, 'Order Types Explained: Market, Limit, Post-Only');
  engine.paragraph(
    'Choosing the right order type is the single most effective way to eliminate price gaps.'
  );

  engine.table(
    ['Order Type', 'Execution Rule', 'Fee Category', 'Best Used When'],
    [
      ['MARKET', 'Fills immediately at best available prices. Incurs slippage.', 'Taker (0.10%)', 'Urgent entry where execution certainty is paramount.'],
      ['LIMIT', 'Rests in the book at your target price. Zero slippage.', 'Maker (0.02%)', 'Standard trading where you set your maximum price.'],
      ['POST_ONLY', 'Guaranteed Maker order. Canceled if it would cross spread.', 'Maker (0.02%)', 'Cost-minimizing strategies to guarantee zero spread crossing.'],
      ['IOC', 'Immediate-or-Cancel. Partial fills allowed; remainder canceled.', 'Taker (0.10%)', 'Fast fills without leaving open unfilled limit orders.'],
      ['FOK', 'Fill-or-Kill. Must fill 100% immediately or 100% canceled.', 'Taker (0.10%)', 'Block trades where partial fills break trading logic.'],
    ],
    [90, 160, 90, 171]
  );

  // =========================================================================
  // PAGE 22: CHAPTER 21 - VIRTUAL PORTFOLIO & FILLS
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(21, 'Virtual Portfolio & Transaction Fill History');
  engine.paragraph(
    'Track your performance and review past executions on the Orders page.'
  );

  engine.sectionHeader('Portfolio Asset Balances');
  engine.paragraph(
    'Your virtual account tracks USDT cash balance alongside active holdings in BTC, ETH, SOL, XRP, ADA, and DOGE. Positions are marked-to-market in real time using live mid-prices.'
  );

  engine.sectionHeader('Order Audit History Ledger');
  engine.paragraph(
    'Every executed order is logged with timestamp, effective VWAP fill price, total fees paid, and fill status (FILLED, PARTIALLY_FILLED, CANCELLED).'
  );

  // =========================================================================
  // PAGE 23: CHAPTER 22 - PRICE GAP DIAGNOSTICS TOOL
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(22, 'Price Gap Diagnostics Tool (/dashboard/price-gap)');
  engine.paragraph(
    'The dedicated diagnostic tool at /dashboard/price-gap allows you to enter any quoted price and see how it compares to live market execution.'
  );

  engine.sectionHeader('How to Run a Diagnostic Analysis');
  engine.bullet('1. Enter Quoted Price', 'Type in the price quoted to you by a seller (e.g. ₹101.00).');
  engine.bullet('2. Enter Order Quantity', 'Input the amount of cryptocurrency you planned to buy.');
  engine.bullet('3. Click "Analyze Price Gap"', 'The platform computes current VWAP, adds exchange fees, and calculates the variance.');

  // =========================================================================
  // PAGE 24: CHAPTER 23 - THE SIX ROOT CAUSES EXPLAINED
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(23, 'The Six Root Causes Explained in Plain English');
  engine.paragraph(
    'When the diagnostic tool finishes, it assigns one of six primary root-cause classifications:'
  );

  engine.table(
    ['Classification', 'Plain English Explanation', 'What You Should Do Next'],
    [
      ['SPREAD', 'The gap is entirely due to the bid-ask spread.', 'Use POST_ONLY limit orders to earn maker fees instead.'],
      ['MARKET_MOVEMENT', 'Market prices moved naturally while you were waiting.', 'Price drift is normal volatility. Re-evaluate entry price.'],
      ['LIQUIDITY', 'Your order was too large for top-of-book depth.', 'Reduce order size or execute across multiple smaller orders.'],
      ['FEES', 'The gap matches the 0.10% taker fee charged by the exchange.', 'Switch to maker orders to lower fees from 0.10% to 0.02%.'],
      ['STALE_DATA', 'Your market data was delayed by more than 5 seconds.', 'Check your internet connection; wait for green data badge.'],
      ['SLIPPAGE', 'Your order size swept multiple price levels in the book.', 'Use limit orders with strict price caps to prevent slippage.'],
    ],
    [120, 190, 201]
  );

  // =========================================================================
  // PAGE 25: CHAPTER 24 - HISTORICAL ANALYTICS & PERCENTILES
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(24, 'Historical Analytics & Latency Percentiles');
  engine.paragraph(
    'The Analytics page (/dashboard/analytics) provides statistical insights into past price gap events and network latencies.'
  );

  engine.sectionHeader('Understanding Latency Percentiles (p50, p90, p95, p99)');
  engine.table(
    ['Percentile', 'Mathematical Meaning', 'Trader Interpretation'],
    [
      ['p50 (Median)', '50% of all events were faster than this.', 'Your normal, day-to-day execution speed.'],
      ['p90 Latency', '90% of events were faster than this.', 'Slightly slower than normal; acceptable performance.'],
      ['p95 Latency', '95% of events were faster than this.', 'Minor network congestion threshold.'],
      ['p99 Latency', '99% of events were faster than this.', 'Worst-case performance outlier during high market stress.'],
    ],
    [90, 180, 241]
  );

  // =========================================================================
  // PAGE 26: CHAPTER 25 - EMERGENCY KILL SWITCH & SAFETY
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(25, 'Emergency Kill Switch & Safety Settings');
  engine.paragraph(
    'TrackingCrypt includes institutional safety controls to protect you against market flash crashes or runaway algorithms.'
  );

  engine.sectionHeader('The Emergency Kill Switch');
  engine.callout(
    'One-Click Trading Halt',
    'Located at the top of the Settings page, clicking the red "ENGAGE KILL SWITCH" button instantly blocks all live order placement across all exchanges. Disengaging requires explicit confirmation.',
    'danger'
  );

  engine.sectionHeader('Pre-Trade Safety Guardrails');
  engine.bullet('Max Order Size Cap', 'Blocks orders exceeding your configured limit (default: $5,000 USD).');
  engine.bullet('Slippage Ceiling', 'Blocks orders if estimated VWAP slippage exceeds your threshold (default: 1.00%).');
  engine.bullet('Rate Limiter', 'Limits submissions to 10 orders per minute to prevent accidental spamming.');

  // =========================================================================
  // PAGE 27: CHAPTER 26 - CONNECTING API KEYS SAFELY
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(26, 'Connecting Exchange API Keys Safely');
  engine.paragraph(
    'If you choose to enable live trading, you can connect exchange API keys in the Credential Vault on the Settings page.'
  );

  engine.sectionHeader('Strict Least-Privilege Policy');
  engine.callout(
    'Withdrawal Permissions Prohibited',
    'TrackingCrypt strictly prohibits API keys with withdrawal permissions enabled. If you attempt to save a key with withdrawal rights, the system will immediately reject it with code WITHDRAWAL_PERMISSION_REJECTED. Only READ_ONLY or TRADE permissions are allowed.',
    'danger'
  );

  engine.sectionHeader('How Your Keys Are Protected');
  engine.paragraph(
    'Keys are encrypted using bank-grade AES-256-GCM authenticated encryption. Your secret key is never shown in the browser after entry and is masked as abcd••••••••3456.'
  );

  // =========================================================================
  // PAGE 28: CHAPTER 27 - BEST PRACTICES FOR TRADERS
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(27, 'Best Practices for Minimizing Slippage');
  engine.paragraph(
    'Follow these practical rules to minimize price gaps and execution slippage:'
  );

  engine.bullet('1. Use POST_ONLY Orders', 'Guarantees you never cross the spread and ensures you receive maker fee discounts.');
  engine.bullet('2. Check the Slippage Curve', 'Always check the Slippage vs Size curve before placing orders larger than 1.0 BTC or 10.0 ETH.');
  engine.bullet('3. Monitor the Imbalance Ratio', 'Do not place market BUY orders when the imbalance ratio is strongly negative (heavy sell pressure).');
  engine.bullet('4. Avoid Trading on Stale Data', 'If the data age badge turns amber or red, wait for the websocket stream to re-synchronize.');

  // =========================================================================
  // PAGE 29: CHAPTER 28 - TROUBLESHOOTING & FAQS
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(28, 'Troubleshooting & Frequently Asked Questions');
  engine.paragraph(
    'Answers to the most common questions and operational troubleshooting steps.'
  );

  engine.table(
    ['Question / Issue', 'Answer / Resolution'],
    [
      ['Why was my order rejected?', 'Check if the order exceeded your $5,000 size cap or 1.0% slippage ceiling in Settings.'],
      ['Is paper trading using real money?', 'No. Paper trading uses virtual simulated funds ($10,000 USDT) with zero real risk.'],
      ['Why is data age red (>5s)?', 'Local network delay or temporary exchange WebSocket restart. Wait a few moments to refresh.'],
      ['Can I trade on multiple exchanges?', 'Currently Binance public feeds are active. Additional exchanges are planned in future releases.'],
    ],
    [150, 361]
  );

  // =========================================================================
  // PAGE 30: CHAPTER 29 - REAL-WORLD USER WORKFLOWS
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(29, 'Real-World Trader Walkthrough Scenarios');
  engine.paragraph(
    'Three realistic step-by-step walkthroughs demonstrating everyday use of TrackingCrypt.'
  );

  engine.sectionHeader('Scenario 1: Pre-Trade Slippage Sizing');
  engine.bullet('Goal', 'Buy $25,000 worth of Bitcoin without causing more than 0.20% slippage.');
  engine.bullet('Action', 'Open /dashboard/orders, input 0.5 BTC, and inspect the slippage curve. The curve indicates 0.12% slippage for 0.5 BTC. Proceed with LIMIT order.');

  engine.sectionHeader('Scenario 2: Investigating a Suspected Execution Lag');
  engine.bullet('Goal', 'Determine why an order filled at ₹103 instead of the viewed ₹101 quote.');
  engine.bullet('Action', 'Open /dashboard/price-gap, enter ₹101 as reference price. The diagnostic reveals classification MARKET_MOVEMENT (+1.50% external price drift). Technical delay was ruled out.');

  engine.sectionHeader('Scenario 3: Volatility Emergency Freeze');
  engine.bullet('Goal', 'Protect portfolio during an unexpected crypto market flash crash.');
  engine.bullet('Action', 'Go to /dashboard/settings and click "ENGAGE KILL SWITCH". All execution halts immediately.');

  // =========================================================================
  // PAGE 31: CHAPTER 30 - GLOSSARY & FINAL SIGN-OFF
  // =========================================================================
  engine.addContentPage();
  engine.chapterHeader(30, 'Glossary of Trading Terms & Document Sign-Off');
  engine.paragraph('Quick reference glossary of cryptocurrency trading terminology:');

  const userGlossary = [
    ['Ask Price', 'The lowest price a seller in the market is willing to accept.'],
    ['Bid Price', 'The highest price a buyer in the market is offering to pay.'],
    ['Spread', 'The difference between the lowest ask price and highest bid price.'],
    ['Slippage', 'The price difference caused when an order size exceeds top-of-book liquidity.'],
    ['VWAP', 'Volume-Weighted Average Price: the average price paid across all consumed book levels.'],
    ['Maker Order', 'An order that sits in the book waiting to be filled, earning lower fees.'],
    ['Taker Order', 'An order that immediately takes liquidity from the book, paying higher fees.'],
    ['Kill Switch', 'Emergency safety button that instantly stops all trade submissions.'],
  ];
  engine.table(['Term', 'Plain English Definition'], userGlossary, [100, 411]);

  engine.callout(
    'TrackingCrypt User Manual Certification',
    'TrackingCrypt User Manual v1.0 Production Edition compiled on October 29, 2026. Approved for all users and traders.',
    'success'
  );

  // Finalize PDF
  const outputPath = path.join(docsDir, 'TrackingCrypt_User_Manual.pdf');
  const publicPath = path.join(publicDocsDir, 'TrackingCrypt_User_Manual.pdf');

  const totalPages = await engine.finalize(outputPath);
  fs.copyFileSync(outputPath, publicPath);

  console.log(`User Manual PDF compiled successfully: ${totalPages} pages at ${outputPath}`);
  return totalPages;
}

buildUserManual().catch(console.error);
