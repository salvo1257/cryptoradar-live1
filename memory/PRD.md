# CryptoRadar v1.9.4 - Product Requirements Document
**Last Updated:** 2025-12-14

## DEPLOYMENT READINESS: VERIFIED (2025-12-14)
- System Health Endpoint: `/api/system/health` - All APIs OK
- Readiness Endpoint: `/api/system/ready` - For load balancer health checks
- Config Endpoint: `/api/system/config` - Configuration verification
- All 6 PDF manuals downloadable
- Dashboard fully operational

## v1.9.4 ENHANCED Whale Activity Engine v2.0 ✅

**NEW ANALYSIS FEATURES:**
1. **OI Divergence Analysis**
   - Price UP + OI DOWN = Short Closing (bullish continuation)
   - Price DOWN + OI UP = Short Opening (bearish pressure)
   - Price UP + OI UP = Long Opening (strong bullish)
   - Price DOWN + OI DOWN = Long Closing (bearish continuation)

2. **Accumulation/Distribution Detection**
   - High volume + small candle body = Absorption pattern
   - Long upper wick = Selling absorbed (bullish accumulation)
   - Long lower wick = Buying absorbed (bearish distribution)

3. **Liquidation Cluster Targeting**
   - Identifies major liquidation zones above and below price
   - Estimates stop-hunt targets based on recent high/low levels
   - Alerts when price approaches liquidation clusters

4. **Smart Whale Behavior Inference**
   - "accumulating", "distributing", "hunting_stops"
   - "position_building", "position_closing", "absorbing"

**NEW MODEL FIELDS:**
- `oi_divergence`: short_closing, short_opening, long_closing, long_opening
- `oi_divergence_strength`: 0-100 score
- `accumulation_distribution`: accumulation, distribution, absorption
- `absorption_detected`: boolean
- `liquidation_zones`: List of nearby liquidation targets
- `whale_behavior`: Inferred large player behavior

**REDUCED NEUTRAL TENDENCY:**
- Lowered threshold from 20 to 15 pressure points
- Leans toward stronger side even in neutral range
- More actionable signals instead of "no clear bias"

## v1.9.3 COMPLETE Multilingual System ✅
- All API endpoints accept `?lang=it|en|de|pl` parameter
- ALL cards fully localized (Trade Signal, Market Bias, OI, Funding, Liquidity, Whale Activity)
- Language change triggers automatic data refresh

## v1.9 Multilingual UI System
- **Supported Languages**: Italian (default), English, German, Polish
- **UI Components**: All navigation, labels, buttons translated
- **In-App Manual**: Complete system manual + trading guide
- **Frontend**: Uses i18next via translations.js
- **Manual Page**: /manual route with collapsible sections

## v1.8 Signal Confirmation System
- **3 Signal States**: NO_TRADE, SETUP_IN_CONFIRMATION, OPERATIONAL
- **Confirmation Rules**: 2+ consecutive signals, no contradictions, stable confidence
- **Volatility Filter**: Prevents premature signals during high volatility
- **Sweep-Reversal Fix**: Shows "IN CONFERMA" until sweep + rejection confirmed
- **Auto-Recording**: Tracks setup_detected, confirmed, invalidated, expired

## Original Problem Statement
Build CryptoRadar - a professional BTC market intelligence dashboard that reads multiple market signals and summarizes the market situation for Bitcoin.

## Architecture
- **Frontend**: React 18 with TailwindCSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Data Sources**: 
  - Kraken, Coinbase, Bitstamp (multi-exchange order books)
  - CryptoCompare (news)
  - CoinGlass (Open Interest, Liquidations, Funding Rate)
- **Chart**: TradingView Lightweight Charts v5.1
- **Real-time**: WebSocket for live price streaming
- **Core Timeframe**: 4H (240 minutes) - All trading intelligence anchored to 4H

## SYSTEM STATUS

### FULLY COMPLETE MODULES

| Module | Status | Description |
|--------|--------|-------------|
| **Trade Signal Module** | Complete | 9-factor scoring, 4H based, smart stops, sweep detection, MULTILINGUAL |
| **Whale Activity Engine** | Complete | Volume spikes, OB pressure, liquidations, OI momentum, MULTILINGUAL |
| **Liquidity Ladder** | Complete | Path analysis, sweep expectations, multi-exchange, MULTILINGUAL |
| **Market Bias** | Complete | Multi-exchange order book analysis, MULTILINGUAL |
| **Open Interest** | Complete | CoinGlass API integration, MULTILINGUAL |
| **Funding Rate** | Complete | CoinGlass API integration, MULTILINGUAL |
| **Support & Resistance** | Complete | 4H levels, 0.3% min spacing, merged duplicates |
| **Signal History** | Complete | MongoDB storage, pagination, stats, performance tracking |
| **Multilingual System** | Complete | IT/EN/DE/PL for UI and backend |
| **In-App Manual** | Complete | System manual + trading guide in all 4 languages |

### SIMPLIFIED/MOCKED MODULES

| Module | Status | Notes |
|--------|--------|-------|
| **Pattern Detection** | Simplified | Basic pivot detection, not ML-based |

### NOT YET IMPLEMENTED

| Module | Priority | Notes |
|--------|----------|-------|
| Telegram Notifications | P1 | UI exists, backend logic missing |
| Price Alert Monitoring | P2 | Background process needed |
| Learn Mode Content | P3 | Toggle exists, content missing |

## API Endpoints with Localization

| Endpoint | Lang Param | Localized Fields |
|----------|-----------|------------------|
| `/api/trade-signal` | `?lang=it\|en\|de\|pl` | reasoning, warnings, invalidation_reason |
| `/api/open-interest` | `?lang=it\|en\|de\|pl` | signal |
| `/api/funding-rate` | `?lang=it\|en\|de\|pl` | signal_text |
| `/api/market/bias` | `?lang=it\|en\|de\|pl` | analysis_text |
| `/api/whale-alerts` | `?lang=it\|en\|de\|pl` | explanation (in whale_activity) |
| `/api/liquidity` | `?lang=it\|en\|de\|pl` | path_analysis (in liquidity_ladder) |
| `/api/news` | `?lang=it\|en\|de\|pl` | Future enhancement |

## Key Technical Files
- `/app/backend/server.py` - All backend logic (~5400 lines)
- `/app/backend/server.py:377` - BACKEND_TRANSLATIONS dictionary
- `/app/backend/server.py:988` - get_translation() helper
- `/app/frontend/src/translations.js` - Frontend UI translations
- `/app/frontend/src/contexts/AppContext.js` - State management, API calls with lang param

## Test Reports
- `/app/test_reports/iteration_9.json` - Multilingual localization (100% pass)
- `/app/test_reports/iteration_8.json` - Whale & Liquidity Ladder v1.7 (100% pass)

## Documentation
- `/app/PRODUCTION_DEPLOYMENT.md` - Deployment guide
- `/manual` route - In-app documentation

## P1 - Next Tasks
1. Telegram notification backend logic
2. Price alert monitoring (background process)

## P2 - Future Tasks
1. Real Pattern Detection Engine (ML-based)
2. Learn Mode content popups
3. Support/Resistance explanations localization
4. Auto-recording of signals on schedule (cron job)
5. Signal outcome tracking (win/loss calculation)
