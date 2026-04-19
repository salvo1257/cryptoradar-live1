# CryptoRadar v4.0 - BTC Market Intelligence Dashboard

## Original Problem Statement
Build a professional BTC market intelligence dashboard with multi-timeframe signal engine, pattern detection, and AI-powered insights.

## Core Requirements
1. **V3 Multi-Timeframe Signal Engine (SNIPER)** - Primary trading logic with single entry
2. **V3 Hunter Engine (10-20-70)** - Stop-loss hunting strategy with layered capital allocation
3. **The Sentinel** - Autonomous pattern detection with Elliott Wave & Fractals
4. **Manual Anchor Mode** - On-demand pattern drawing
5. **Radar Mentor AI** - Educational trading insights
6. **Liquidity Zone Engine** - Liquidation heatmap and magnet detection
7. **V4 Analytics Suite** - Signal Journal, Analytics Hub, Strategy Lab

## What's Been Implemented

### ✅ Completed - V4 Analytics Suite (April 19, 2025)
Complete reconstruction of History/Backtest modules:

**AUTO-RECORDING ACTIVE**:
- V3 Normal (SNIPER): Auto-records every ENTRY_READY signal with full market context
- V3 Hunter (10-20-70): Auto-records every activated hunt with all legs
- Context Captured: Bias, Regime, Liquidity, Quality Score, BTC price at signal

**AUTOMATIC OUTCOME TRACKING**:
- Background scheduler monitors all PENDING signals
- Checks 4H OHLC for stop/target hits
- Updates outcomes automatically: WIN, LOSS, PARTIAL
- Calculates final PnL for equity curve

**Signal Journal V4** (replaces old Storico Segnali):
- Dual view tabs: SNIPER / HUNTER
- Interactive Deal Cards with mini-charts (sparklines)
- Advanced filtering: outcome, direction
- CSV Export functionality
- Premium neon color scheme
- LIVE DATA: Shows real HUNTER signals as they're activated

**Analytics Hub V4** (new unified metrics center):
- Aggregated metrics: Total Signals, Win Rate, P&L, R:R
- Direction-specific performance (LONG/SHORT)
- Equity Curve visualization
- Mentor AI Summary with Claude integration (Emergent LLM Key)
- Tabs: COMBINATO / SNIPER / HUNTER

**Strategy Lab V4** (replaces old Backtest):
- Static Timeline Replay with event visualization
- 90 days historical data support (540 x 4H candles)
- SNIPER and HUNTER strategy simulation
- Full 10-20-70 Simulation: Shows leg fills, average entry, TP/SL hits
- Visual timeline with colored icons for each event

**Backend V4 Schema**:
- `v4_signals` collection (MongoDB)
- `v4_analytics` collection
- `v4_equity_curve` collection
- `v4_mentor_summaries` collection
- Optimized MongoDB aggregation pipelines
- `check_v4_signal_outcomes()` background task

### ✅ Completed - V3 HUNTER Engine (April 19, 2025)
Professional stop-loss hunting strategy:
- **Liquidity Lead Logic**: Override neutral bias when liquidity imbalance > 2x
- **Bias Sensitivity**: Lowered threshold from 70% to 55%
- **Removed Hard Blocks**: NEUTRAL liquidity and COMPRESSION regime now warnings, not blocks
- **Opportunity Mode**: Higher weight on Energy + Liquidity vs Regime
- **Frontend Integration**: DecisionEngineCard now shows V3 setup when active
- **Result**: Dashboard shows "LONG" instead of "ATTENDI" when setup detected

### ✅ Completed - Manual Anchor Mode (April 18, 2025)
- React Context `AnchoredPatternsContext` for state management
- "Draw" button in Pattern Feed to anchor patterns
- SVG Overlay only renders anchored patterns
- Toast notifications on anchor/remove

### ✅ Completed - The Sentinel Engine
- 816+ patterns detected across timeframes
- Elliott Wave Theory (1-5, A-B-C) with visual numbering
- Fractal Intelligence (nested sub-waves)
- Confluence detection across timeframes
- High probability setup highlighting

### ✅ Completed - Base V3 Engine
- 4H event detection (breakout, sweep, continuation)
- Quality scoring system
- Structure-based stops
- Liquidity-based targets

## Architecture
```
/app/
├── backend/
│   ├── server.py              # Main FastAPI (26k+ lines)
│   ├── sentinel_engine.py     # Pattern detection engine
│   └── mentor_engine.py       # AI mentor logic
├── frontend/
│   └── src/
│       ├── contexts/
│       │   ├── AnchoredPatternsContext.js
│       │   └── AccessContext.js
│       └── components/
│           ├── TradingChartWithSentinel.js
│           └── cards/
│               ├── DecisionEngineCard.js
│               └── SentinelPatternFeed.js
```

## Prioritized Backlog

### P1 - Live Forward Testing
- Configure TELEGRAM_BOT_TOKEN in .env
- Add real chat IDs to whitelist
- Monitor signals 2-4 weeks

### P2 - After Validation
- Refactor server.py (BLOCKED until validation complete)
- Stripe integration for monetization

### P3 - Future Enhancements
- talib pattern detection (may be superseded by Sentinel)
- Advanced backtesting UI

## Key Credentials
- Admin Password: `cr4pt0r4d4r_4dm1n_2024`
- Language: Italian (primary)

## Known Constraints
- Binance Global API blocked (451) - using Binance.US
- Bybit API blocked (403) - using KuCoin instead
- CoinGlass rate limits occasionally (403)

---
## Update: April 18, 2025 - Structural Sidebar Separation

### ✅ Completed - Three Dedicated Pages
1. **Pattern Page** (`/patterns`)
   - Displays ONLY chart patterns (Triangles, Wedges, H&S, Double/Triple Tops)
   - 21 patterns filtered from Sentinel
   - Chart + Feed layout

2. **Candele Page** (`/candlesticks`)  
   - Displays ONLY Japanese candlestick patterns (Engulfing, Doji, Hammer, Stars)
   - 728 patterns filtered
   - Legend included

3. **Onde di Elliott Page** (`/elliott-waves`)
   - Displays ONLY Elliott Wave counts (1-5, A-B-C, Fractals)
   - 64 waves detected
   - Impulse/Corrective sections separated
   - Fractal toggle

### Backend Endpoints Added
- `/api/sentinel/patterns/chart` - Chart patterns only
- `/api/sentinel/patterns/candlestick` - Candlestick patterns only
- `/api/sentinel/patterns/elliott` - Elliott waves only

### Sidebar Updated
- Added "Onde di Elliott" with TrendingUp icon after "Candele"

---
## Update: April 19, 2025 - V3.7 Single Source of Truth

### ✅ Completed - System Synchronization
**Problem**: Dashboard showed inconsistent data (UNKNOWN, NEUTRAL 0%, conflicts)

**Solution**: Created "Intelligence State" cache as Single Source of Truth

### Changes Made:
1. **Backend - Intelligence State Cache**
   - Global `intelligence_state` object updated by V3 engine
   - New endpoint `/api/intelligence-state` (public)
   - Liquidity Zones > Legacy Magnet hierarchy (if >2x imbalance)

2. **Backend - Computed Final Action**
   - `compute_final_action()` - Maps V3 phase to UI action
   - `compute_action_reason()` - Human-readable reason with warnings
   - Whale Flow integration: LONG_CAUTION if whale selling < 35%

3. **Frontend - DecisionEngineCard**
   - Uses `/api/intelligence-state` as primary source
   - Falls back to original logic if state not synced

4. **Frontend - V3SignalCard**  
   - Merges intelligence-state with trade-signal
   - Shows synchronized regime/bias values

### Result:
- Regime: UNKNOWN → **TREND**
- Bias: NEUTRAL (0%) → **BEARISH (71%)**
- Liquidity: Conflict → **BULLISH (122.9x)**
- Action: Inconsistent → **LONG + Whale caution**

---
## Update: April 19, 2025 - V3 Signal Engine Isolation Complete

### ✅ V3 Engine Independence
**Verified**: V3 operates ONLY on:
- 4H Market Structure
- 5M Retest Confirmation  
- 5-Exchange Liquidity Zones

**No dependencies** on Sentinel, Elliott Waves, or Candlestick patterns.

### ✅ Educational Module Isolation
- **The Sentinel**: Visual patterns only, isolated in `/patterns` page
- **Candele**: Candlestick education, isolated in `/candlesticks` page
- **Onde di Elliott**: Wave counts, isolated in `/elliott-waves` page

### ✅ Data Integrity Fixed
- V3SignalCard now uses admin headers for full data access
- Entry Zone: $75,064 - $75,818 (no more "$ -")
- Stop Loss: $75,064
- Target 1: $77,432
- Target 2: $78,344
- R:R: 5.28

### Architecture Summary
```
V3 Signal Engine (PURE)
├── Input: 4H Events + 5M Retest + Liquidity Zones
├── Output: Entry/Stop/Targets/Quality
└── No dependencies on educational modules

Educational Layer (ISOLATED)
├── Sentinel Pattern Feed
├── Candlestick Patterns  
└── Elliott Wave Counts
    └── Visual/Educational only
    └── No influence on V3 or Final Action
```

---
## Update: April 19, 2025 - V3SignalCard High-Contrast UI Redesign

### ✅ "Mostra dettagli" Premium Cockpit Design
Redesigned the expandable details section with high-contrast, premium aesthetics.

### Visual Elements Implemented:
1. **Neon Color Palette**
   - Green: `#00FF9D` (targets, bullish data)
   - Red: `#FF1E56` (stop loss, bearish data)
   - Blue: `#00D4FF` (buffer, neutral metrics)
   - Yellow: `#FFD93D` (warnings)

2. **Glow Effects**
   - `drop-shadow-[0_0_8px_rgba(0,255,157,0.6)]` for green elements
   - `drop-shadow-[0_0_8px_rgba(255,30,86,0.6)]` for red elements

3. **Structural Grouping (Card-in-Card)**
   - Each section wrapped in `bg-gradient-to-br from-zinc-900/80 to-zinc-800/40`
   - Borders: `border-zinc-700/50 backdrop-blur-sm`

4. **Sections Redesigned**
   - **STRUTTURA - STOP LOSS LOGIC**: Swing High/Low, Buffer, Stop Type badge
   - **TARGET - LIQUIDITY BASED**: Target 1/2/3 with type labels
   - **LIQUIDITÀ CONTEXT**: Sopra/Sotto with animated dots, Imbalance direction
   - **WHALE FLOW CONTEXT**: Direction + Strength percentage
   - **PHASE HISTORY**: Color-coded phase badges

5. **Footer**
   - Italicized V3 Setup conclusion with purple gradient background
   - Technical context: "V3 Signal Engine • Struttura 4H + Retest 5M + Liquidità 5-Exchange"

### Result:
- High legibility with clear visual hierarchy
- Premium aesthetic matching CryptoRadar brand
- Consistent neon theming across all data points

---
## Update: April 19, 2025 - V3 HUNTER Engine (10-20-70 Strategy)

### ✅ NEW ENGINE: V3 Hunter - The 10-20-70 Predator

**Purpose**: Professional stop-loss hunting strategy using layered capital allocation to profit from retail liquidations.

### Strategy Logic:
1. **Leg 1 (10%)**: Market Entry at 4H structural point
2. **Leg 2 (20%)**: Limit order at first liquidation cluster
3. **Leg 3 (70%)**: Limit order at Primary Institutional Wall

### Risk Management:
- **Default Leverage**: 1x
- **LONG Trades**: No hard stop - macro invalidation only
- **SHORT Trades**: Mandatory stop 0.5% above 70% wall

### Backend Implementation:
- New models: `HunterLeg`, `HunterDeal`, `V3HunterSignal`
- Engine: `generate_v3_hunter_signal()` - identifies liquidation clusters
- Functions: `identify_liquidation_clusters_for_hunter()`, `create_hunter_deal()`, `calculate_hunter_deal_metrics()`
- Endpoints:
  - `GET /api/v3/hunter-signal` - Get current hunter analysis
  - `POST /api/v3/hunter-deal/activate` - Activate a hunt
  - `GET /api/v3/hunter-deals` - List all deals

### Frontend Implementation:
- `V3HunterCard.js` - Premium card showing 10-20-70 legs
- `V3HunterPage.js` - Dedicated page with educational panel
- Sidebar: "V3 Hunter" in ADMIN section

### CoinGlass Integration Ready:
- Structure prepared for CoinGlass Startup plan ($79)
- Falls back to orderbook-based cluster detection when CoinGlass unavailable
- `coinglass_connected` status badge in UI

### Visual Features:
- Neon color palette (#00FF9D, #FF1E56, #00D4FF)
- Color-coded allocation badges (10% blue, 20% orange, 70% purple)
- Dynamic metrics: Average Entry, Take Profit, Stop Loss
- Liquidation clusters list with values and distances

---
## Update: April 19, 2025 - Telegram V4 Settings UI

### ✅ Completed - Frontend Telegram V4 Configuration
Full UI integration for autonomous Telegram configuration:

**Settings Page Enhancements**:
- New `TelegramV4SettingsSection` component in `/app/frontend/src/components/pages/SettingsPage.js`
- Located after Sound Settings, before Documentation

**Configuration Options**:
1. **Bot Token**: Masked input with show/hide toggle
2. **Chat ID Principale**: Primary chat ID for notifications
3. **Chat ID Aggiuntivi**: Comma-separated additional recipients
4. **Notifiche SNIPER** (green): Toggle for SNIPER signals and outcomes
5. **Notifiche HUNTER** (orange): Toggle for HUNTER signals and outcomes
6. **Segnali LONG/SHORT**: Direction filters
7. **Soglia Qualità Minima**: Slider 0-100% quality threshold

**Actions**:
- **Salva Impostazioni**: Save all V4 settings to MongoDB
- **Test SNIPER**: Send test SNIPER notification
- **Test HUNTER**: Send test HUNTER notification

**Statistics Display**:
- Total notifications sent
- SNIPER notifications sent
- HUNTER notifications sent

**Backend Endpoints (already implemented)**:
- `GET /api/telegram/v4-settings`
- `POST /api/telegram/v4-settings`
- `POST /api/telegram/v4-test-sniper`
- `POST /api/telegram/v4-test-hunter`

**Authentication Fix**:
- Updated `AppContext.fetchSettings()` to include admin headers
- Default settings fallback when admin not authenticated
- All Telegram V4 API calls use proper `X-Admin-Key` authentication

