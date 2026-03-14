# CryptoRadar v2.0 - Product Requirements Document
**Last Updated:** 2025-12-14

## DEPLOYMENT READINESS: VERIFIED (2025-12-14)
- System Health Endpoint: `/api/system/health` - All APIs OK
- Readiness Endpoint: `/api/system/ready` - For load balancer health checks
- Config Endpoint: `/api/system/config` - Configuration verification
- All 6 PDF manuals downloadable
- Dashboard fully operational

## v2.0 LIQUIDITY MAGNET SCORE MODULE ✅ (NEW)

**NEW INTELLIGENCE MODULE:**
1. **Core Logic:**
   - Measures how strongly BTC price is attracted toward nearby liquidity zones
   - Considers: liquidity size above/below price, distance to zones, liquidation clusters
   - Multi-exchange order book confirmation + CoinGlass data integration

2. **Key Metrics:**
   - `magnet_score`: 0-100 overall attraction strength
   - `target_direction`: UP / DOWN / BALANCED
   - `magnet_strength`: WEAK / MODERATE / STRONG / VERY_STRONG
   - `nearest_magnet_price`: Price level of strongest magnet
   - `nearest_magnet_distance_percent`: Distance to magnet
   - `secondary_magnet_price/distance`: Opposite side magnet
   - `sweep_expectation`: SWEEP_UP_FIRST / SWEEP_DOWN_FIRST / NO_CLEAR_SWEEP
   - `attraction_ratio`: Ratio of up vs down attraction

3. **Trade Signal Integration:**
   - Strong UP magnet = bullish context contribution
   - Strong DOWN magnet = bearish context contribution
   - Adjusts confidence based on magnet alignment with signal direction

4. **Market Energy Interaction:**
   - High Energy + Strong Magnet = Higher directional probability
   - Low Energy + Strong Magnet = Attraction exists but timing not ready
   - High Energy + Balanced Magnet = Possible fake move / uncertain

**NEW API ENDPOINT:**
- `/api/liquidity-magnet?lang=it|en|de|pl`

**FRONTEND COMPONENT:**
- `LiquidityMagnetCard.js` - Dashboard card with full visualization

## v1.9.5 MARKET ENERGY / COMPRESSION DETECTOR ✅

**ANALYSIS FEATURES:**
1. **Price Range Compression** - Detects narrowing trading ranges
2. **Volatility Compression** - ATR-based volatility analysis
3. **Open Interest Behavior** - Rising OI during compression = energy buildup
4. **Liquidity Buildup** - Monitoring both sides for squeeze setups
5. **Order Book Pressure** - Wall detection on both sides

**KEY METRICS:**
- `energy_score`: 0-100 overall energy score
- `compression_level`: LOW / MEDIUM / HIGH
- `compression_threshold`: Dynamic threshold based on longer-term range
- `expansion_readiness`: LOW / MEDIUM / HIGH
- `breakout_probability`: LOW / MEDIUM / HIGH
- `expansion_warning`: Boolean for imminent expansion

## v1.9.4 ENHANCED Whale Activity Engine v2.0 ✅

**ANALYSIS FEATURES:**
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

4. **Smart Whale Behavior Inference**
   - "accumulating", "distributing", "hunting_stops"
   - "position_building", "position_closing", "absorbing"

## v1.9.3 COMPLETE Multilingual System ✅
- All API endpoints accept `?lang=it|en|de|pl` parameter
- ALL cards fully localized (Trade Signal, Market Bias, OI, Funding, Liquidity, Whale Activity, Market Energy, Liquidity Magnet)
- Language change triggers automatic data refresh

## v1.9 Multilingual UI System
- **Supported Languages**: Italian (default), English, German, Polish
- **UI Components**: All navigation, labels, buttons translated
- **In-App Manual**: Complete system manual + trading guide
- **Frontend**: Uses i18next via translations.js
- **Manual Page**: /manual route with collapsible sections

## v1.8 Signal Confirmation System
- **3 Signal States**: NO_TRADE, SETUP_IN_CONFIRMATION, OPERATIONAL
- **Confirmation Logic**: Requires consistent signals before activation
- **Volatility Protection**: No directional changes during high volatility

## Key API Endpoints

| Endpoint | Lang Support | Translates |
|----------|--------------|------------|
| `/api/trade-signal` | `?lang=it\|en\|de\|pl` | Full response + whale_activity + market_energy + liquidity_magnet |
| `/api/market-energy` | `?lang=it\|en\|de\|pl` | explanation, signals |
| `/api/liquidity-magnet` | `?lang=it\|en\|de\|pl` | explanation, signals |
| `/api/market-bias` | `?lang=it\|en\|de\|pl` | summary, signals |
| `/api/open-interest` | `?lang=it\|en\|de\|pl` | explanation, implications |
| `/api/funding-rate` | `?lang=it\|en\|de\|pl` | explanation, sentiment |
| `/api/whale-alerts` | `?lang=it\|en\|de\|pl` | explanation (in whale_activity) |
| `/api/liquidity` | `?lang=it\|en\|de\|pl` | path_analysis (in liquidity_ladder) |

## Dashboard Layout
1. **Top Row**: Trade Signal + TradingView Chart
2. **Intelligence Row**: Market Bias, Open Interest, Funding Rate
3. **Advanced Analysis Row**: Market Energy, Liquidity Magnet, Whale Activity
4. **Data Row**: Order Book, Liquidity Direction, Support/Resistance

## Key Technical Files
- `/app/backend/server.py` - All backend logic (~7000+ lines)
- `/app/backend/server.py:428` - BACKEND_TRANSLATIONS dictionary
- `/app/backend/server.py:1458` - get_translation() helper
- `/app/frontend/src/translations.js` - Frontend UI translations (~800 lines)
- `/app/frontend/src/contexts/AppContext.js` - State management, API calls with lang param

## Test Reports
- `/app/test_reports/iteration_10.json` - Liquidity Magnet module (100% pass)
- `/app/test_reports/iteration_9.json` - Multilingual localization (100% pass)
- `/app/test_reports/iteration_8.json` - Whale & Liquidity Ladder v1.7 (100% pass)

## Documentation
- `/app/PRODUCTION_DEPLOYMENT.md` - Deployment guide
- `/manual` route - In-app documentation

## P1 - Next Tasks
1. Telegram notification backend logic
2. Price alert monitoring (background process)
3. **Refactor server.py** - Extract BACKEND_TRANSLATIONS to JSON files

## P2 - Future Tasks
1. Real Pattern Detection Engine (ML-based)
2. Learn Mode content popups
3. Support/Resistance explanations localization
4. Auto-recording of signals on schedule (cron job)
5. Signal outcome tracking (win/loss calculation)
6. Automated trading bot integration

## Architecture Note
The `server.py` file has grown to ~7000+ lines. Recommended refactoring:
- Extract `BACKEND_TRANSLATIONS` to `/app/backend/locales/{lang}.json`
- Extract analysis functions to `/app/backend/analysis/` modules
- Extract API routes to `/app/backend/routes/` modules
