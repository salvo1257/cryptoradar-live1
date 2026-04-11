# CryptoRadar Changelog

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
