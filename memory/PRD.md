# CryptoRadar v1.9.2 - Product Requirements Document
**Last Updated:** 2025-12-14

## DEPLOYMENT READINESS: VERIFIED (2025-12-14)
- System Health Endpoint: `/api/system/health` - All APIs OK
- Readiness Endpoint: `/api/system/ready` - For load balancer health checks
- Config Endpoint: `/api/system/config` - Configuration verification
- All 6 PDF manuals downloadable
- Dashboard fully operational

## v1.9.2 COMPLETE Multilingual System ✅
**Backend Localization COMPLETE:**
- All API endpoints accept `?lang=it|en|de|pl` parameter
- All explanatory text translated in all 4 languages
- Localized Functions:
  - `generate_trade_signal()` - All reasoning text
  - `generate_open_interest()` - Signal descriptions
  - `generate_funding_rate()` - Signal text
  - `calculate_market_bias()` - Analysis text
  - `analyze_whale_activity()` - Explanation
  - `build_liquidity_ladder()` - Path analysis
  - `generate_liquidity_clusters_enhanced()` - Cluster explanations + direction
  - `generate_whale_alerts_enhanced()` - Alert reasons

**Frontend Localization COMPLETE:**
- Language change triggers data refresh via useEffect
- `fetchAnalysisData` has `language` dependency
- All cards display backend data in selected language

**Translation Dictionary:** `BACKEND_TRANSLATIONS` with 100+ keys per language

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
