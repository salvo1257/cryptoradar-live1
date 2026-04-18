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
