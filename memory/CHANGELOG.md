# CryptoRadar Changelog

## v3.4.0 - 2026-04-12

### V3.4 Signal Validation System (CRITICAL FIX)

**Problem Fixed:** Contradictory signals with low R:R were being recorded and sent to users.

#### Changes in `record_v3_entry_signal()`:

Added **last defensive layer** validation that blocks:
- R:R < 0.5 → BLOCKED
- Upstream block reason present → BLOCKED  
- Signal direction conflicts with magnet direction → BLOCKED
- Squeeze risk (overcrowded positioning) → BLOCKED
- No valid cluster targets → BLOCKED

#### Changes in `process_v3_signal()`:

New parameters added for V3.4 validation:
- `magnet_direction` - From LiquidityMagnet.target_direction
- `magnet_score` - Magnet strength score
- `derivatives_context` - Full CoinGlass derivatives data
- `energy_score` - Market energy score
- `compression_level` - Compression state

#### New Endpoint:
- `POST /api/v3/test-signal-validation` - Test validation rules with mock data

#### Block Reason Codes:
- `BLOCKED_UPSTREAM_{reason}`
- `BLOCKED_LOW_RR_{value}` 
- `BLOCKED_MAGNET_CONFLICT_{direction}_vs_{magnet}`
- `BLOCKED_SQUEEZE_RISK_SHORTS_OVERCROWDED`
- `BLOCKED_SQUEEZE_RISK_LONGS_OVERCROWDED`
- `BLOCKED_NO_VALID_TARGETS`

#### Impact:
- ❌ Invalid signals are NO longer recorded to database
- ❌ Invalid signals are NO longer sent via Telegram
- ✅ Proper logging of blocked signals
- ✅ Execution integrity guaranteed

---

## v3.3.0 - 2026-04-11

### V3 Cluster Target Validation Engine

**Goal:** Track and validate the new cluster-based target system to confirm it improves trade quality.

#### New Backend Features:

1. **Dedicated Cluster Target Validation System** (`server.py`)
   - New MongoDB collection: `cluster_target_validation`
   - Background tracking loop (15s interval)
   - Automatic registration of new V3 signals with cluster metadata
   - Real-time outcome tracking (T1 hit, T2 hit, Stop hit, Expired)
   - MFE/MAE calculation per signal
   - Persistence across server restarts

2. **API Endpoints Added:**
   - `GET /api/v3/cluster-validation-summary` - Comprehensive validation summary
   - `GET /api/v3/cluster-validation-signals` - List individual tracked signals

3. **Tracked Metrics:**
   - Entry, Stop, T1, T2 prices
   - R:R at creation
   - Cluster distance (%) and volume ($)
   - Outcome: T1_HIT, T2_HIT, STOP_HIT, EXPIRED, BLOCKED
   - MFE/MAE percentages
   - Time to outcome
   - Win rate by direction

4. **Validation Summary Includes:**
   - Total signals (operational vs blocked)
   - T1 hit rate, T2 hit rate, stop rate, expired rate
   - Average R:R at creation vs achieved R:R
   - Average cluster distance and volume
   - By-direction breakdown
   - Live tracking status
   - Assessment conclusion with data sufficiency indicator

#### Frontend Changes:

1. **New "Cluster Validation" Tab** (`ReliabilityAnalyticsPage.js`)
   - Shows validation summary when data available
   - "No Data Yet" state for empty collection
   - Outcome distribution (T1 HIT, T2 HIT, STOP, EXPIRED)
   - Target cluster quality metrics (distance, volume)
   - By-direction breakdown
   - Live tracking status with active signals
   - Blocked signals warning
   - Assessment section with confidence indicator

---

### Liquidity Zone Engine V2.0

**Goal:** Fix cluster quality - previous clusters were too close (0.03%-0.05%), now enforcing meaningful distances.

#### New Features:

1. **Minimum Distance Filter** (HARD ENFORCEMENT)
   - Clusters < 0.5% distance are IGNORED (noise)
   - All returned clusters are now at meaningful target distances

2. **Zone Classification**
   - Near zone: < 0.5% → FILTERED OUT
   - Mid zone: 0.5% - 2.0% → T1 CANDIDATES
   - Far zone: 2.0% - 5.0% → T2 CANDIDATES

3. **Dynamic Volume Filtering**
   - Replaced fixed 1.5x average threshold
   - Now uses top 30% by volume percentile (70th percentile cutoff)

4. **Magnet Strength Scoring**
   - Formula: `magnet_strength = volume * log(distance + 1)`
   - Higher distance = more meaningful target
   - Higher volume = stronger attraction

5. **Direction Consistency**
   - Clusters properly separated by side (above/below)
   - LONG signals only use ABOVE clusters
   - SHORT signals only use BELOW clusters

6. **New LiquidityCluster Fields**
   - `magnet_strength`: float - Attraction score
   - `zone_type`: str - "mid" or "far"
   - `volume_percentile`: float - Position in volume ranking (0-100)

#### Configuration Constants:
```python
MIN_DISTANCE_PCT = 0.5      # HARD minimum
MID_ZONE_MAX_PCT = 2.0      # T1 candidates
FAR_ZONE_MAX_PCT = 5.0      # T2 candidates
VOLUME_PERCENTILE_CUTOFF = 70  # Top 30% only
```

#### Result:
- Before: Clusters at 0.03%-0.05% (useless for targets)
- After: Clusters at 0.5%+ only (meaningful T1/T2 candidates)

---

### V3.3 Enhanced Intelligence Modules

**Goal:** Use CoinGlass data already available to make V3 modules more intelligent and connected.

#### 1. Market Bias (V3.3 Enhanced)

**New Data Sources:**
- Global Long/Short Account Ratio (contrarian signal when extreme)
- Top Trader Long/Short Ratio (follow smart money)
- Top Position Long/Short Ratio (institutional positioning)

**New Fields:**
- `derivatives_bias`: BULLISH/BEARISH/NEUTRAL from derivatives
- `derivatives_strength`: 0-100 strength of derivatives signal
- `crowd_positioning`: overcrowded_long/short, leaning_long/short, balanced
- `top_accounts_bias`: BULLISH/BEARISH/NEUTRAL
- `top_positions_bias`: BULLISH/BEARISH/NEUTRAL
- `derivatives_explanation`: Full explanation

**Logic:**
- Crowd positioning > 1.5 ratio = contrarian bearish (overcrowded long)
- Crowd positioning < 0.67 ratio = contrarian bullish (overcrowded short)
- Top traders > 1.3 = follow smart money bullish
- Top traders < 0.77 = follow smart money bearish

#### 2. Market Energy (V3.3 Enhanced)

**New Data Sources:**
- CoinGlass Buy/Sell Taker Volume (aggressive participation)
- CoinGlass Liquidation data (acceleration/squeeze potential)
- OI expansion/contraction (fuel for move)

**New Fields:**
- `energy_state`: LOW/MEDIUM/HIGH overall fuel state
- `fuel_score`: 0-100 how much fuel is available
- `buy_sell_pressure`: BUY/SELL/BALANCED
- `buy_sell_ratio`: Buy ratio percentage
- `liquidation_acceleration`: NONE/BUILDING/ACTIVE
- `liquidation_pressure_side`: LONG/SHORT/BALANCED
- `fuel_explanation`: Explanation of fuel state

**Logic:**
- Buy ratio > 58% = aggressive buying = +25 fuel
- Sell ratio > 58% = aggressive selling = +25 fuel
- Liquidations > $100M = ACTIVE acceleration = +30 fuel
- OI expansion > 3% = +25 fuel

#### 3. Liquidity Magnet (V3.3 Enhanced)

**New Data Sources:**
- Liquidation pressure direction
- Buy/Sell aggression
- Top traders positioning
- OI context

**New Fields:**
- `cluster_validated`: true/false - Is cluster validated by derivatives?
- `derivatives_support`: STRONG/MODERATE/WEAK/CONFLICTING
- `liquidation_pressure_direction`: UP/DOWN/BALANCED
- `buy_sell_aggression`: BUYING/SELLING/BALANCED
- `cluster_validation_reason`: Why cluster is/isn't validated

**Logic:**
- Liquidation pressure aligns with target direction = +30 validation
- Buy/Sell aggression supports direction = +25 validation
- OI expansion = +15 validation
- Top traders aligned = +20 validation
- Score >= 50 = STRONG support, validated
- Score >= 25 = MODERATE support, validated
- Score >= 0 = WEAK support, not validated
- Score < 0 = CONFLICTING, not validated

#### 4. Market Regime (V3.3 Enhanced)

**New Fields:**
- `target_profile`: CONSERVATIVE/BALANCED/EXTENDED
- `max_target_distance_pct`: Maximum allowed target distance
- `target_constraint_reason`: Why targets are constrained

**Target Permissiveness Logic:**
- COMPRESSION: Conservative (1.5% max) unless high breakout probability
- RANGE: Conservative (1.5% max), slightly more if strong pressure
- TREND: Extended (4% max) if bias and energy aligned
- EXPANSION: Extended (4.5% max) if fully aligned

#### 5. Module Integration

**Decision Hierarchy:**
1. Regime decides target permissiveness
2. Bias decides allowed directional side
3. Liquidity Magnet selects the most relevant cluster
4. Energy decides whether move is realistically reachable

**Integration Quality:**
- STRONG: All modules aligned, cluster validated
- MODERATE: Partial alignment or weak cluster validation
- WEAK: Conflicting modules (e.g., magnet vs bias)

#### New API Endpoint

`GET /api/v3/intelligence-status`

Returns complete status of all V3 intelligence modules with:
- Market Bias with derivatives positioning
- Market Energy with fuel analysis
- Liquidity Magnet with cluster validation
- Market Regime with target permissiveness
- Module Integration summary with decision hierarchy

#### CoinGlass Endpoints Used:
- `/futures/global-long-short-account-ratio/history` - Crowd positioning
- `/futures/top-long-short-account-ratio/history` - Top traders
- `/futures/top-long-short-position-ratio/history` - Top positions
- `/futures/aggregated-taker-buy-sell-volume/history` - Buy/Sell pressure
- `/futures/openInterest/history` - OI data (existing)
- `/futures/liquidation/detail` - Liquidation data (existing)

#### Limitations (HOBBYIST Plan):
- Rate limits may cause temporary data unavailability
- Some endpoints may return 429 during high traffic
- System gracefully degrades when derivatives data unavailable

---

## v3.2.9 - 2026-04-09

### Full Language Consistency Implementation

**Goal:** Ensure every visible text element matches the selected language (EN, IT, DE, PL) with zero mixed-language content.

#### Changes:

1. **Created Complete Centralized Translation System** (`/app/frontend/src/translations.js`)
   - 400+ translation keys per language
   - Full coverage: EN, IT, DE, PL
   - Includes: Navigation, status labels, market terms, settings, errors, Learn Mode

2. **Updated Components to Use Centralized Translations:**
   - `DecisionEngineCard.js` - Final Action labels, warnings, conflict messages
   - `SettingsPage.js` - Telegram settings, signal notifications, API settings
   - `DataFreshnessIndicator.js` - Data integrity labels, status indicators
   - `TradeSignalCard.js` - Target labels, quality gate, risk/reward
   - `HelpOverlay.js` - Learn Mode labels (What/Why/Action)

3. **Translation Categories Added:**
   - Navigation items (Dashboard, Settings, etc.)
   - Connection status (LIVE, CONNECTED, OFFLINE)
   - General status (ACTIVE, ENABLED, CONFIGURED)
   - Market terms (BULLISH, BEARISH, LONG, SHORT, WAIT)
   - Decision Engine (Final Action, Warnings, Conflicts)
   - Quality Gate (EXCELLENT, GOOD, WEAK, POOR)
   - Data Integrity (Fresh, Stale, Warning, Critical)
   - Whale Activity (Buy Pressure, Sell Pressure, etc.)
   - Settings (Telegram, Notifications, API Keys)
   - Error messages (Connection failed, Error fetching)

4. **Verified Languages:**
   - Italian (IT): Full navigation, Decision Engine, Settings
   - German (DE): Full navigation, Decision Engine, Settings
   - Polish (PL): Full navigation, Decision Engine, Settings
   - English (EN): Reference/fallback language

#### Known Limitations:
- Some backend API responses contain English terms (e.g., "ENTRY", "trend_continuation")
- These require backend translation support (outside scope of UI-only fix)
- Backend changes would modify `/api/v3/trade-signal` response structure

#### Files Modified:
- `/app/frontend/src/translations.js` - Complete rewrite with all 4 languages
- `/app/frontend/src/components/cards/DecisionEngineCard.js`
- `/app/frontend/src/components/cards/DataFreshnessIndicator.js`
- `/app/frontend/src/components/cards/TradeSignalCard.js`
- `/app/frontend/src/components/pages/SettingsPage.js`
- `/app/frontend/src/components/ui/HelpOverlay.js`

---

## v3.2.8 - 2026-04-09

### Data Source Transparency Fix
- Updated Settings page to correctly show Kraken, Coinbase, Bitstamp as active data sources
- Backend `/api/system/data-sources` returns accurate multi-exchange aggregation status
- Fixed syntax error in `SettingsPage.js` (extra closing `</div>` tag)

### Deployment Preparation
- Pre-deployment health check passed
- Created `/app/memory/DEPLOYMENT_MONITORING.md` with 24-48h monitoring checklist
- All critical systems verified healthy

---

## v3.2.7 - 2026-04-08

### Pre-Deploy Improvements
- Learn Mode consistency across all modules
- Whale Activity N/A handling
- R:R Operational Protection (blocks signals < 0.3 R:R)
- Same-Direction Signal Lock Rule
- Admin API & Data Sources Settings page
