# CryptoRadar v3.6.2 - BTC Market Intelligence Dashboard

## Original Problem Statement
Build a professional BTC market intelligence dashboard with multi-timeframe signal engine, pattern detection, and AI-powered insights.

## Core Requirements
1. **V3 Multi-Timeframe Signal Engine** - Primary trading logic
2. **The Sentinel** - Autonomous pattern detection with Elliott Wave & Fractals
3. **Manual Anchor Mode** - On-demand pattern drawing
4. **Radar Mentor AI** - Educational trading insights
5. **Liquidity Zone Engine** - Liquidation heatmap and magnet detection

## What's Been Implemented

### ✅ Completed - V3.6 Opportunity Mode (April 18, 2025)
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
