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

#### Cluster Target Rules (Enforced):
- Minimum distance: 0.5%
- Minimum volume: $500K
- Minimum R:R: 0.5
- Signals failing these checks are marked as BLOCKED (NO_VALID_CLUSTERS)

#### Files Modified:
- `/app/backend/server.py` - Added cluster validation engine, APIs, startup tasks
- `/app/frontend/src/components/pages/ReliabilityAnalyticsPage.js` - Added cluster tab

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
