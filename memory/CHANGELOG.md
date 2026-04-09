# CryptoRadar Changelog

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
