# CryptoRadar v3.0.0 - Product Requirements Document
**Last Updated:** 2026-03-22

## ✅ FIX: V3 Signal Tracking Integration (2026-03-22)

### Problem Identified
- V3 ENTRY_READY signals existed only in `setup_events_v3` collection
- They were NOT being saved to `signal_history` collection
- V3 signals were excluded from:
  - Performance statistics
  - Outcome engine processing
  - Win rate calculations
- Created inconsistency between setup tracking and signal history

### Root Cause
- `record_v3_entry_signal()` function was missing
- When V3 setup transitioned to ENTRY_READY, only Telegram alert was sent
- No persistence to main `signal_history` collection

### Fixes Applied

#### 1. New Function: `record_v3_entry_signal()`
Records V3 ENTRY_READY signals to main `signal_history` collection:
- Matches V2 signal format for consistency
- Includes V3-specific fields (`v3_setup_id`, `v3_confirmation_type`, etc.)
- Sets `outcome: "PENDING"` for outcome engine processing
- Deduplication by `setup_id`

#### 2. Integration Point
When V3 setup reaches ENTRY_READY:
```python
asyncio.create_task(record_v3_entry_signal(setup_dict, current_price, market_context))
asyncio.create_task(send_v3_entry_alert(setup_dict, current_price))
```

#### 3. New Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v3/signal-tracking-status` | GET | Shows V3 signals in history vs setups |
| `/api/v3/backfill-missing-signals` | POST | Backfills existing ENTRY_READY setups |
| `/api/v3/test-record-signal` | POST | Test signal recording |

#### 4. Engine Comparison Statistics
Added to `/api/signal-history/statistics`:
```json
"by_engine": {
  "v1": { "total_signals": 66, "win_rate": 7.6 },
  "v2": { "total_signals": 96, "win_rate": 0.0 },
  "v3": { "total_signals": 3, "win_rate": 0.0 }
}
```

### Results After Fix
| Metric | Before | After |
|--------|--------|-------|
| V3 in signal_history | 0 | 3 |
| V3 in outcome engine | No | Yes |
| V3 in statistics | No | Yes |
| Unified tracking | No | **Yes** |

### Data Architecture (Fixed)
- `signal_history` = **Single source of truth** for all signals (V1, V2, V3)
- `setup_events_v3` = **Lifecycle tracking only** for V3 setups
- Outcome engine processes ALL signals with `outcome: "PENDING"`

---

## ✅ FIX: Signal History Statistics Consistency (2026-03-19)

### Problem Identified
- Dashboard showed 1426+ total signals but only 31 had outcomes
- Signals created without `outcome` field (NULL instead of "PENDING")
- Performance stats based on incomplete data subset

### Root Cause
- Legacy signals saved without `outcome` field
- Outcome engine only processed signals with `outcome: "PENDING"`
- NULL outcomes were ignored, creating data inconsistency

### Fixes Applied

#### 1. New Endpoint: `/api/signal-history/fix-missing-outcomes`
Fixes signals with missing outcomes:
- NO TRADE signals → `outcome: "NO_TRADE"`
- Recent LONG/SHORT (<24h) → `outcome: "PENDING"`
- Old LONG/SHORT (>24h) → `outcome: "EXPIRED"`

#### 2. Data Health Diagnostics
Added to `/api/signal-history/statistics` response:
```json
"data_health": {
  "total_signals": 221,
  "tradeable_signals": 142,
  "signals_with_outcome": 142,
  "signals_missing_outcome": 0,
  "outcome_coverage_percent": 100.0,
  "pending_analysis": 0,
  "analyzed_signals": 142
}
```

#### 3. UI Data Health Indicator
- Shows "Segnali Tradabili" vs "Analizzati"
- Badge showing "100% Copertura" (green) or warning (yellow/red)
- Tooltip explaining missing outcome count

### Results After Fix
| Metric | Before | After |
|--------|--------|-------|
| Tradeable Signals | 142 | 142 |
| Signals with Outcome | 31 | 142 |
| Missing Outcomes | 111 | 0 |
| Coverage | 21.8% | **100%** |

### Statistics Breakdown (Correct)
- 2 WIN
- 3 PARTIAL_WIN
- 7 LOSS
- 130 EXPIRED
- 0 PENDING

---

## ✅ NEW: V3 Telegram Alerts (2026-03-19)

### Overview
High-quality Telegram alerts for V3 ENTRY_READY signals only.

### Alert Triggers
| Phase | Alert? | Reason |
|-------|--------|--------|
| NO_TRADE | NO | Bad conditions |
| WATCH | NO | Not actionable |
| SETUP_DETECTED | NO | Just detected, no confirmation |
| WAITING_FOR_RETEST | NO | Still waiting |
| **ENTRY_READY** | **YES** | 5M confirmation received |

### Message Format
```
Direction (LONG/SHORT)
Price
Entry zone
Stop loss (structure type)
Target 1 & 2
Confidence %
Risk level (LOW/MEDIUM/HIGH)
Quality score
Setup type
Market regime
5M Confirmation type
```

### Deduplication
- 1 hour cooldown per setup_id
- Tracks last 50 alerts
- Won't repeat same setup within cooldown

### Risk Level Calculation
| Quality | R:R | Risk Level |
|---------|-----|------------|
| ≥80 | ≥1.5 | LOW |
| ≥60 | ≥1.2 | MEDIUM |
| <60 or <1.2 | - | HIGH |

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/telegram/test-v3-alert` | POST | Test V3 alert with sample data |
| `/api/telegram/v3-alerts-status` | GET | Check alert system status |

### Configuration
Settings → `notify_v3_entry_ready: true` (default)

### Languages Supported
IT, EN, DE, PL (auto-detected from settings)

---

## ✅ NEW: V3 Signal Card UI (2026-03-18)

### V3 Signal Card Overview
Professional UI card displaying the full lifecycle of V3 MTF setups.

### Key Features
| Feature | Description |
|---------|-------------|
| **Position** | Side-by-side with V2 card for real-time comparison |
| **Phase Badge** | Prominent status (SETUP/WAITING/ENTRY_READY) - readable in <2s |
| **Detail Level** | Hybrid (compact default, expandable for full details) |
| **No Setup State** | Shows market context (regime, bias, energy) |

### Phase Visual Styling
| Phase | Color | Icon | Animation |
|-------|-------|------|-----------|
| SETUP_DETECTED | Blue | Eye | - |
| WAITING_FOR_RETEST | Yellow | Timer | Pulse |
| ENTRY_READY | Green | CheckCircle | Pulse |
| EXECUTED | Purple | CheckCircle | - |
| EXPIRED | Gray | XCircle | - |
| INVALIDATED | Red | XCircle | - |

### Compact View Shows
- Phase badge with description
- Direction badge (LONG/SHORT)
- Setup type with event icon
- Entry zone, stop loss, targets (T1/T2)
- Quality score, R:R ratio
- 5M confirmation status
- Time remaining

### Expanded View Adds
- Structure details (swing high/low, buffer, stop type)
- Target details with types (resistance, support, percentage)
- Liquidity context (above/below totals, imbalance)
- Whale context (direction, strength)
- Phase history timeline
- Reasoning text

### No Setup State Shows
- "Nessun Setup Attivo" / "No Active Setup"
- Market regime (TREND/RANGE/COMPRESSION/EXPANSION)
- Bias with confidence %
- Energy level with compression
- "In attesa di evento 4H" message

### Component Details
- **File:** `/app/frontend/src/components/cards/V3SignalCard.js`
- **Refresh Rate:** 30 seconds
- **data-testid:** `v3-signal-card`, `v3-signal-card-loading`

---

## ✅ NEW: V3 Multi-Timeframe Signal Engine (2026-03-18)

### V3 Engine Overview
The V3 Signal Engine is a professional multi-timeframe (MTF) trading architecture:
- **4H Timeframe (Context):** Market regime detection, structure/event detection
- **5M Timeframe (Execution):** Entry confirmation patterns

### V3 Architecture
```
4H Context → Event Detection → Wait for Retest → 5M Confirmation → Entry Signal
     │              │                │                  │              │
  Regime    Breakout/Sweep    Price approaches    Rejection/         ENTRY_READY
 Detection       detected          zone         Stabilization/
                                                Micro-break
```

### V3 Event Types
| Event Type | Direction | Trigger |
|------------|-----------|---------|
| resistance_breakout | LONG | Price closes above structural resistance |
| support_breakout | SHORT | Price closes below structural support |
| liquidity_sweep_high | SHORT | Price spikes above swing high, closes back inside |
| liquidity_sweep_low | LONG | Price spikes below swing low, closes back inside |
| trend_continuation | LONG/SHORT | Strong momentum candle in trend direction |

### V3 Setup Phases
| Phase | Description | Next Step |
|-------|-------------|-----------|
| SETUP_DETECTED | 4H event detected | Wait for price to approach zone |
| WAITING_FOR_RETEST | Price near/in zone | Monitor 5M for confirmation |
| ENTRY_READY | 5M confirmation received | Execute trade |
| EXECUTED | Trade taken | Track outcome |
| EXPIRED | 8h timeout | Setup removed |
| INVALIDATED | Price moved >2% from zone | Setup removed |

### V3 5M Confirmation Patterns
| Pattern | Description |
|---------|-------------|
| rejection_candle | Wick > body (bullish/bearish rejection) |
| stabilization | 2-3 candles in zone with compression |
| micro_structure_break | Break of 5M swing high/low within zone |

### V3 Stop Loss (Structure-Based)
- **LONG:** Below swing low or sweep level (whichever is lower)
- **SHORT:** Above swing high or sweep level (whichever is higher)
- Buffer: 0.1% - 0.25% adaptive based on volatility

### V3 Targets (Liquidity-Based)
- **T1:** Nearest valid S/R or swing level in trade direction
- **T2:** Next major liquidity zone
- Validates targets are in correct direction (above entry for LONG, below for SHORT)

### V3 API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v3/trade-signal` | GET | Main V3 signal with context and active setup |
| `/api/v3/active-setups` | GET | List all active setups with phases |
| `/api/v3/expire-setup/{id}` | POST | Manually expire a setup |
| `/api/v3/clear-setups` | DELETE | Clear all setups (testing) |

### V3 Response Fields
```json
{
  "engine_version": "v3",
  "current_price": 74000.00,
  "market_regime": "COMPRESSION",
  "market_bias": "BEARISH",
  "bias_confidence": 78.6,
  "has_active_setup": true,
  "recommended_action": "PREPARE_ENTRY",
  "setups_detected_count": 1,
  "setups_waiting_count": 0,
  "setups_ready_count": 0,
  "context_summary": "Retest in corso - distanza dalla zona: 0.57%",
  "active_setup": { ... },
  "market_regime_details": { ... },
  "whale_context": { ... },
  "liquidity_context": { ... },
  "energy_context": { ... }
}
```

### V3 S/R Detection Logic (User Requirement)
1. **Primary:** Swing high/low from recent candles (structural levels)
2. **Secondary:** Volume/liquidity reinforcement (orderbook walls, liquidity clusters)
3. Structure remains the **primary reference**, volume/liquidity strengthens the level

### V3 Configuration
- `V3_SETUP_VALIDITY_HOURS = 8` (2 x 4H candles)
- `V3_5M_CACHE_TTL = 30` seconds
- `V3_STOP_BUFFER_MIN = 0.1%`
- `V3_STOP_BUFFER_MAX = 0.25%`

---

## ✅ DEPLOYED: CryptoRadar v2.9.2 (2025-12-17)

### Deployment Status
| Component | Status | Details |
|-----------|--------|---------|
| Backend | ✅ RUNNING | FastAPI on port 8001 |
| Frontend | ✅ RUNNING | React on port 3000 |
| MongoDB | ✅ CONNECTED | Emergent-managed |
| API Health | ✅ HEALTHY | All endpoints responding |

### v2.9.2 Changes - RELAXED THRESHOLDS
| Parameter | Before | After | Rationale |
|-----------|--------|-------|-----------|
| Min Move | 0.40% | 0.25% | Allow smaller high-quality moves |
| Min Move (High Quality) | N/A | 0.15% | Even smaller for excellent setups |
| R:R (Quality >= 80) | 1.0 | **0.6** | Adaptive threshold |
| R:R (Quality >= 60) | 1.0 | **0.8** | Adaptive threshold |
| R:R (Quality < 60) | 1.0 | 1.0 | Unchanged |
| Target T1 Min | 0.50% | 0.40% | Micro-move targets |
| Target T2 Min | 1.00% | 0.80% | Micro-move targets |

### Adaptive R:R Logic
```
if quality_level == "EXCELLENT": min_rr = 0.6
elif quality_level == "GOOD":    min_rr = 0.8
else:                            min_rr = 1.0
```

### High-Quality Override
When all conditions align (strong bias + whale aligned + no trap risk):
- Move threshold reduced to 0.15%
- Smaller moves accepted with ✅ message

### Version Features
- ✅ Market Regime Detection (TREND/RANGE/COMPRESSION/EXPANSION)
- ✅ Trade Quality Gate (0-100 score system)
- ✅ 4H Timeframe Calibration (realistic targets)
- ✅ Data Freshness Indicator
- ✅ Signal Engine v1/v2 tracking
- ✅ Multi-language support (IT/EN/DE/PL)

---

## 📋 BACKLOG (Post-Deployment)

### P1 - High Priority
| Task | Description | Status |
|------|-------------|--------|
| Refactoring server.py | Split >10,850 lines into modules | 📝 Planned |
| Pattern Detection Engine | Real TA with talib-binary | 📝 Planned |

### P2 - Medium Priority
| Task | Description | Status |
|------|-------------|--------|
| Aggregated Multi-Exchange Price | Use weighted avg of Kraken+Coinbase+Bitstamp | 📝 Planned |
| Stale Data Warning UI | Show warning when data_freshness > threshold | 📝 Planned |
| Telegram Configuration | UI guide for bot setup | 📝 Planned |

### P3 - Low Priority / Future Versions
| Task | Description | Status |
|------|-------------|--------|
| Snapshot Synchronization | Master timestamp for all data | 📝 Future |
| PDF Export | Analytics and Rules export | 📝 Future |
| Learn Mode | Informational popups | 📝 Future |
| Trading Bot Integration | Automated execution | 📝 Future |

---

## SYSTEM HEALTH CHECK (2025-12-17)
- System Health Endpoint: `/api/system/health` - All APIs OK
- Background Scheduler: Active (outcome check every 1 hour)
- Dynamic Signal Timing: Active
- Telegram Notifications: Available (user configurable)
- Outcome Engine: OHLC-based (accurate historical analysis)
- Signal Engine Version Tracking: Active (v1 vs v2 comparison)
- 4H Timeframe Calibration: Active (realistic targets/R:R)
- Trade Quality Gate: Active (signal validation before publishing)
- UI/Manual Language Check: COMPLETED (2025-12-16)
- Market Regime Detection: Active (context interpretation)
- **Data Layer Audit: COMPLETED (2025-12-17)**

---

## 🆕 v2.9.1 DATA LAYER AUDIT ✅ (2025-12-17)

**COMPREHENSIVE DATA SYNCHRONIZATION REVIEW:**

### Audit Summary
Full audit of CryptoRadar data layer completed. Report available at `/app/memory/DATA_AUDIT_REPORT.md`

### Issues Identified & Fixed

#### 🔴 FIXED: OI Cache Too Long
- **Before:** 60s cache for CoinGlass OI data
- **After:** 30s cache (aligned better with 15s price cache)
- **Impact:** OI data now max 30s stale vs 60s before

#### 🟢 ADDED: Data Freshness Indicator
New `data_freshness` field in API response:
```json
{
  "signal_generation_time_ms": 2319,
  "price_cache_ttl_s": 15,
  "oi_cache_ttl_s": 30,
  "max_data_age_s": 30,
  "sync_warning": true,
  "data_sources": {...}
}
```

### Data Sources Summary
| Data | Source | Cache TTL | Reliability |
|------|--------|-----------|-------------|
| Price | Kraken | 15s | ⭐⭐⭐⭐⭐ |
| Orderbook | Multi-exchange | 10s | ⭐⭐⭐⭐⭐ |
| Open Interest | CoinGlass | 30s | ⭐⭐⭐⭐ |
| Liquidation | CoinGlass | 30s | ⭐⭐⭐ |
| Candles | Kraken 4H | 15s | ⭐⭐⭐⭐⭐ |

### Remaining Issues (Low Priority)
1. Single-source price (Kraken only) - consider aggregating
2. Sequential liquidation fetch adds ~500ms latency
3. No master timestamp for all data points

---

## 🆕 v2.9 MARKET REGIME DETECTION ✅ (2025-12-17)

**CLASSIFIES MARKET CONTEXT FOR BETTER SIGNAL INTERPRETATION:**

### Why Added:
- NO TRADE situations were unclear - users didn't know if it was ranging, trending, or compressing
- Need to explain what type of market environment we're in
- Help users understand which setup is most appropriate

### 4 Market Regimes:
| Regime | Description | Suggested Setup |
|--------|-------------|-----------------|
| **TREND** | Strong directional bias, aligned factors | Trend Continuation |
| **RANGE** | Neutral/mixed bias, price between S/R | Sweep Reversal |
| **COMPRESSION** | Low volatility, OI rising, pre-breakout | Wait for Breakout |
| **EXPANSION** | High energy, strong move in progress | Continuation (avoid late entries) |

### Regime Detection Logic:
Uses existing internal data:
- Market Bias (direction & confidence)
- Market Energy (compression level)
- Liquidity Magnet/Ladder (direction & balance)
- Whale Activity (direction & strength)
- Open Interest (rising/falling)
- Expected Move
- Trap Risk
- Distance to S/R

### Regime Scores (0-100 each):
Each regime is scored based on how many conditions match:
- TREND: Strong bias + whale aligned + liquidity aligned + OI supportive + no trap
- RANGE: Neutral bias + low energy + balanced liquidity + price in middle
- COMPRESSION: Low volatility + OI rising + whales active + liquidity both sides
- EXPANSION: High energy + strong move + dominant liquidity + near key level

### New UI Component: MarketRegimeCard
Displays:
- Regime Name (with icon)
- Regime Strength (0-100%)
- Directional Bias (BULLISH/BEARISH/NEUTRAL)
- Suggested Setup with explanation
- 4-column score breakdown (TREND/RANGE/COMP/EXP)
- Key Factors grid (6 factors with ✅/❌)
- Detected Signals list

### Key Implementation Details:
- Does NOT change signal logic (interpretive only)
- Multilingual (IT/EN/DE/PL)
- Refreshes every 60 seconds
- Located after Market Energy row in dashboard

---

## 🆕 v2.8.1 UI & MANUAL LANGUAGE CHECK ✅ (2025-12-16)

### Pre-deployment Language & Documentation Verification

#### UI Language Issues Found & Fixed:
| Issue | Status |
|-------|--------|
| Warning messages hardcoded in Italian | ✅ Fixed - now multilingual (IT/EN/DE/PL) |
| Quality Gate directional consistency errors too technical | ✅ Fixed - user-friendly messages |
| R:R and move warnings not translated | ✅ Fixed - all languages supported |

#### Manual Sections Added:
| Section | Language | Status |
|---------|----------|--------|
| Calibrazione Timeframe 4H | IT | ✅ Added |
| 4H Timeframe Calibration | EN | ✅ Added |
| Quality Gate (Cancello Qualità) | IT | ✅ Added |
| Quality Gate | EN | ✅ Added |
| Come CryptoRadar Valuta un Trade | IT | ✅ Added |
| How CryptoRadar Evaluates a Trade | EN | ✅ Added |

#### Translations Added:
| Key | IT | EN |
|-----|-----|-----|
| qualityGate | Cancello Qualità | Quality Gate |
| qualityScore | Punteggio Qualità | Quality Score |
| qualityExcellent | ECCELLENTE | EXCELLENT |
| qualityGood | BUONA | GOOD |
| qualityWeak | DEBOLE | WEAK |
| qualityPoor | SCARSA | POOR |

#### Warning Messages Verified:
- ✅ "Long affollati" / "Crowded longs" - clear
- ✅ "Alto rischio trappola" / "High trap risk" - clear
- ✅ "Sweep atteso" / "Sweep expected" - clear
- ✅ "R:R insufficiente" / "R:R insufficient" - clear
- ✅ "Movimento atteso basso" / "Expected move low" - clear

#### No Debug/Developer Text Found:
- ✅ No console.log visible in UI
- ✅ No technical error messages exposed

---

## 🆕 v2.8 TRADE QUALITY GATE ✅ (2025-12-16)

**IMPROVED SIGNAL QUALITY WITH COMPREHENSIVE VALIDATION:**

### Why Added:
- Engine sometimes decided direction too early, then tried to fit parameters around it
- Produced inconsistent setups (T1 below entry for LONG, poor R:R, sweep misalignment)
- Need fewer but cleaner, more coherent signals

### Quality Gate Validation Steps:

#### 1. Directional Consistency Check
| Direction | Rules |
|-----------|-------|
| **LONG** | T1 > entry_high, T2 > T1, stop < entry_low |
| **SHORT** | T1 < entry_low, T2 < T1, stop > entry_high |

If rules not satisfied → **NO TRADE**

#### 2. Sweep-Direction Alignment
| Sweep Expected | Immediate Signal | Result |
|----------------|------------------|--------|
| Sweep Below First | LONG | ⚠️ Risky - wait for sweep |
| Sweep Above First | SHORT | ⚠️ Risky - wait for sweep |

#### 3. Quality Score Calculation (0-100 points)
| Component | Max Points |
|-----------|------------|
| Directional Consistency | 25 |
| Risk/Reward Ratio | 20 |
| Expected Move | 15 |
| Whale Confirmation | 10 |
| Liquidity Path Alignment | 10 |
| Sweep Alignment | 10 |
| Factor Alignment | 10 |

#### 4. Quality Levels
| Level | Score | Action |
|-------|-------|--------|
| **EXCELLENT** | >= 80 | ✅ Publish signal |
| **GOOD** | 60-79 | ✅ Publish with caution |
| **WEAK** | 40-59 | 🔄 Confirmation only |
| **POOR** | < 40 | ❌ NO TRADE |

#### 5. Additional Filters
- High trap risk + non-excellent quality → NO TRADE
- R:R < 1.2 + GOOD quality → Confirmation only
- Sweep misalignment + non-excellent → Confirmation only

### New API Response Fields:
| Field | Type | Description |
|-------|------|-------------|
| `quality_score` | int | 0-100 quality score |
| `quality_level` | string | EXCELLENT/GOOD/WEAK/POOR |
| `quality_gate_passed` | bool | Whether signal passed all checks |

### UI Updates:
- New **Quality Gate** card in TradeSignalCard showing:
  - Score (e.g., "83/100")
  - Level badge (EXCELLENT/GOOD/WEAK/POOR)
  - Check mark if gate passed
  - Warning messages for weak/poor quality

### What Changed:
- ✅ Signals now validated for directional consistency
- ✅ Sweep logic aligned with signal direction
- ✅ R:R filtering integrated into quality gate
- ✅ Quality score exposed in API and UI
- ❌ Core detection logic UNCHANGED (sweep/continuation detection)

---

## 🆕 v2.7 4H TIMEFRAME CALIBRATION ✅ (2025-12-16)

**CALIBRATED SIGNAL ENGINE FOR REALISTIC 4H TRADING:**

### Why Added:
- BTC on 4H timeframe moves in smaller ranges compared to daily charts
- Previous targets (2-4%) were unrealistic for 4H signals
- Need better move/R:R filtering to improve signal quality

### 4H Move Ranges Defined:
| Move Type | Range | Action |
|-----------|-------|--------|
| Very Small | < 0.4% | NO TRADE / Confirmation mode |
| Normal Tradable | 0.5% – 1.2% | Standard signal |
| Strong 4H | 1.2% – 2.5% | Extended targets allowed |
| Exceptional | > 2.5% | Rare, cap expectations |

### 4H Target Calibration:
| Target | Normal Conditions | Strong Conditions |
|--------|-------------------|-------------------|
| **T1** | 0.5% – 0.9% | 1.2% |
| **T2** | 1.0% – 1.8% | 2.5% |

**Strong conditions** = High market energy OR Strong liquidity magnet OR Trend continuation setup

### 4H Risk/Reward Requirements:
| R:R Level | Value | Action |
|-----------|-------|--------|
| Minimum | < 1.0 | NO TRADE (rejected) |
| Acceptable | 1.0 – 1.2 | Warning added |
| Good | 1.2 – 1.5 | No warning |
| Ideal | >= 1.5 | Optimal |

### Implementation Details:
- `MINIMUM_MOVE_PERCENT = 0.40` (was 0.50)
- `MIN_RISK_REWARD = 1.0` (new filter)
- `is_strong_market_condition()` helper function added
- Targets capped to nearest S/R levels when closer
- Move quality classification: weak/normal/strong/exceptional

### What Changed:
- ✅ Expected move now realistic for 4H (0.5-1.2% typical)
- ✅ Targets T1/T2 calibrated for 4H ranges
- ✅ R:R minimum filter prevents bad risk setups
- ✅ Strong conditions allow extended targets
- ❌ Core signal logic UNCHANGED (sweep/continuation detection)

---

## 🆕 v2.6 SIGNAL ENGINE VERSION TRACKING ✅ (2025-12-15)

**COMPARE V1 (SWEEP ONLY) VS V2 (SWEEP + CONTINUATION) PERFORMANCE:**

### Why Added:
- User wants to scientifically validate whether the new Trend Continuation logic improves overall signal quality
- Need to compare v1 (legacy sweep_reversal only) vs v2 (sweep + trend_continuation)

### Implementation:

#### 1. New Database Field:
| Field | Type | Values |
|-------|------|--------|
| `signal_engine_version` | string | "v1" or "v2" |

#### 2. Migration Endpoint:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/signal-history/migrate-to-v1` | POST | Tag all existing signals without version as v1 |

**Migration Result:** 103 historical signals tagged as v1

#### 3. Enhanced Signal History:
- New filter dropdown: **Engine Version** (All / V1 / V2)
- **V1 Badge** (gray) and **V2 Badge** (purple) displayed on each signal

#### 4. Enhanced Reliability Analytics:
**New Tab: "v1 vs v2"** with:
- Side-by-side V1 and V2 cards showing:
  - Total signals
  - Win Rate
  - Avg PnL
  - Profit Factor
  - WIN/PARTIAL/LOSS/EXPIRED breakdown
- **Performance per Version + Setup** table
- **Performance per Version + Direction** table
- Data collection status message

#### 5. New API Response Fields:
| Field | Description |
|-------|-------------|
| `by_engine_version` | Stats grouped by v1/v2 |
| `by_version_setup` | Stats grouped by version + setup_type |
| `by_version_direction` | Stats grouped by version + direction |

### Current Data (2025-12-15):
| Version | Signals | Win Rate | Avg PnL | Profit Factor |
|---------|---------|----------|---------|---------------|
| V1 | 31 | 16.1% | -0.23% | 0.32 |
| V2 | 0 | - | - | - |

**Note:** All new signals generated will be tracked as v2. As data accumulates, performance comparison will become statistically significant.

### Signal Engine Logic:
- **V1 (Frozen):** Only `sweep_reversal` detection
- **V2 (Active):** `sweep_reversal` + `trend_continuation` detection, with intelligent setup selection

---

## 🔒 LOGIC FREEZE (2025-12-14)

**Trading logic is FROZEN until 150-200 signals are collected during weekday trading (Mon-Fri).**

### Frozen Components:
- ❄️ Signal generation logic
- ❄️ Market bias scoring
- ❄️ Whale activity detection
- ❄️ Liquidity magnet calculations
- ❄️ Target/stop calculations
- ❄️ Confidence scoring

### Why Frozen:
- Current data (95 signals) collected mostly during weekend
- Weekend = low volatility, more EXPIRED setups
- Need weekday data to accurately assess system performance

### Current Stats (to be re-evaluated at 150-200 signals):
- Total signals: 95 (60 with targets)
- LONG: 5 (80% win rate) ✅
- SHORT: 55 (1.8% win rate) ⚠️
- EXPIRED: 68% of outcomes

### Resume Conditions:
- [ ] Collect 150-200 signals
- [ ] Primarily weekday data (Mon-Fri)
- [ ] Re-run root cause analysis
- [ ] Determine if SHORT bias is systemic or market-driven

---

## v2.5 OHLC-BASED OUTCOME ENGINE ✅ (CRITICAL FIX)

**ACCURATE TRADE OUTCOME DETECTION USING HISTORICAL CANDLE DATA:**

### Problem Fixed:
The previous outcome engine only checked the **current price** to determine if targets/stops were hit. This caused:
- All 31 signals to show as EXPIRED (0 WIN, 0 LOSS)
- Missed cases where price touched target/stop and then moved away

### New Implementation:
Uses `analyze_ohlc_for_outcome()` function that:
1. Fetches 1-hour OHLC candles from Kraken
2. Filters candles within the signal's validity window
3. Checks **candle HIGH** and **candle LOW** against targets/stops
4. For LONG: HIGH >= target (win), LOW <= stop (loss)
5. For SHORT: LOW <= target (win), HIGH >= stop (loss)

### Results After Fix:
| Outcome | Before | After |
|---------|--------|-------|
| WIN | 0 | 2 |
| LOSS | 0 | 5 |
| PARTIAL_WIN | 0 | 3 |
| EXPIRED | 31 | 21 |

### New API Endpoint:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/signal-history/recalculate-with-ohlc` | POST | Re-analyze EXPIRED signals using OHLC |

### Technical Details:
- Analysis method now returns `"analysis_method": "OHLC_CANDLE_DATA"`
- Outcome notes include timestamp of when target/stop was hit
- `candles_analyzed` field shows how many candles were checked
- Both manual and scheduler checks use the new OHLC logic

---

## v2.4 TELEGRAM NOTIFICATIONS ✅

**REAL-TIME TELEGRAM ALERTS FOR TRADING SIGNALS:**

### Implementation:
- **Backend:** Async notification system with templates
- **Frontend:** Comprehensive settings panel with instructions
- **Languages:** IT, EN, DE, PL (all templates translated)
- **Default State:** Disabled (user must enable and configure)

### Notification Types:
| Type | Template Key | Trigger |
|------|--------------|---------|
| Operational Signal | `operational_signal` | When LONG/SHORT signal becomes OPERATIONAL |
| Signal Invalidation | `signal_invalidation` | When signal is invalidated (future) |
| WIN | `outcome_win` | Target 2 reached |
| LOSS | `outcome_loss` | Stop loss hit |
| Partial Win | `outcome_partial_win` | Target 1 reached, T2 expired |
| Expired | `outcome_expired` | Signal validity window elapsed |

### New Settings Fields:
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `telegram_bot_token` | string | null | Telegram Bot API token |
| `telegram_chat_id` | string | null | Target chat/channel ID |
| `telegram_enabled` | bool | false | Master toggle |
| `notify_operational_signals` | bool | true | Send operational alerts |
| `notify_signal_invalidations` | bool | true | Send invalidation alerts |
| `notify_signal_outcomes` | bool | true | Send WIN/LOSS alerts |

### API Endpoints:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/settings` | GET | Get all settings including Telegram |
| `/api/settings` | PUT | Update settings |
| `/api/telegram/test` | POST | Send test message |

### Frontend Settings UI:
- Instructions box with @BotFather setup guide
- Bot Token input (password masked)
- Chat ID input
- "Testa Connessione" button (Telegram blue color)
- Signal Notifications section:
  - Segnali Operativi
  - Invalidazioni Segnali
  - Esiti Trade (WIN/LOSS)
- Other Notifications section (existing toggles)

### Message Templates:
Each template includes:
- Emoji indicators (🚀 signals, ❌ loss, 🎉 win, etc.)
- Direction, Price, Confidence
- Entry/Exit prices, P&L percentage
- HTML formatting for Telegram
- Hashtags (#CryptoRadar #BTC)

### How to Get Telegram Credentials:
1. Open Telegram and search for @BotFather
2. Send `/newbot` and follow instructions
3. Copy the Bot Token provided
4. For Chat ID, send a message to your bot, then visit:
   `https://api.telegram.org/bot<TOKEN>/getUpdates`

---

## v2.3 DYNAMIC SIGNAL TIMING ✅

**INTELLIGENT SIGNAL URGENCY & VALIDITY WINDOWS:**

### New TradeSignal Fields:
| Field | Type | Description |
|-------|------|-------------|
| `signal_urgency` | string | LOW / MEDIUM / HIGH |
| `valid_for_minutes` | int | 30-150 minutes (dynamically calculated) |
| `setup_status` | string | SETUP_IN_CONFIRMATION / OPERATIONAL / EXPIRED / INVALIDATED |
| `urgency_reason` | string | Explanation of urgency factors |
| `entry_distance_percent` | float | Distance from current price to entry zone |
| `time_sensitivity` | string | URGENT / NORMAL / RELAXED |

### Base Rule:
- **4H timeframe** = 90 minutes default validity

### Factors that REDUCE validity (more urgent):
- High confidence (>75%): -30 min
- Price at entry zone (<0.3%): -30 min
- Price near entry zone (<0.7%): -15 min
- High Market Energy (>70): -20 min
- Strong aligned Liquidity Magnet: -15 min
- sweep_reversal setup: -20 min
- Whale confirms direction (>50%): -15 min
- Expansion readiness HIGH: -10 min

### Factors that INCREASE validity (less urgent):
- Entry zone far (>1.5%): +20 min
- Low Market Energy (<50): +10 min
- Balanced Liquidity Magnet: +10 min
- continuation setup: +15 min
- Neutral whale activity: +5 min
- Low confidence (<55%): +15 min

### Urgency Determination:
- **HIGH** (score ≥8): Act immediately, signal may trigger soon
- **MEDIUM** (score 4-7): Valid setup, reasonable window
- **LOW** (score <4): Early setup, time available

### Frontend Display:
New "URGENZA SEGNALE" section in TradeSignalCard:
- Urgency badge (HIGH=orange/pulse, MEDIUM=yellow, LOW=gray)
- Valid for X minutes
- Entry distance %
- Reason text

### Telegram Compatibility:
Fields designed for future Telegram notifications:
- `signal_urgency`: Easy to convert to emoji (🔥HIGH, ⏱️MEDIUM, ⌛LOW)
- `valid_for_minutes`: Can show countdown
- `urgency_reason`: Human-readable context

---

## v2.2 AUTOMATIC OUTCOME TRACKING SCHEDULER ✅

**AUTOMATIC BACKGROUND JOB FOR SIGNAL OUTCOME TRACKING:**

### Implementation:
- **Technology:** APScheduler (AsyncIOScheduler)
- **Interval:** Every 1 hour
- **Max Instances:** 1 (prevents overlapping runs)

### Startup Behavior:
1. Scheduler starts on backend startup
2. Runs initial check immediately
3. Then runs every hour automatically

### Monitoring:
- **`scheduler_status`** global variable tracks:
  - `running`: Boolean
  - `last_run`: ISO timestamp
  - `last_result`: Check results
  - `total_runs`: Cumulative count
  - `total_updates`: Total signals updated

### New API Endpoints:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/signal-history/scheduler-status` | GET | Get scheduler status and statistics |
| `/api/signal-history/trigger-check` | POST | Manually trigger immediate outcome check |

### Frontend Indicator:
- **"AUTO" badge** in Performance Trading panel
- Green = Active, with pulsing timer icon
- Tooltip shows: Status, Interval, Runs, Updated, Next check time

### Logs:
```
✅ Background Scheduler: Started (outcome check every 1 hour)
🔄 [SCHEDULER] Starting automatic outcome check...
📊 [SCHEDULER] Found X pending signals to check (BTC: $XX,XXX)
✅ [SCHEDULER] Outcome check complete: Y/X signals updated
```

---

## v2.1 SIGNAL OUTCOME TRACKING ✅

**AUTOMATIC SIGNAL PERFORMANCE TRACKING:**

### 1. **Outcome Types:**
- `WIN` - Target 2 reached before stop loss
- `PARTIAL_WIN` - Target 1 reached but not Target 2
- `LOSS` - Stop loss hit
- `EXPIRED` - Neither target nor stop hit within validity window (24h for 4H timeframe)
- `PENDING` - Signal still active, outcome not yet determined
- `NO_TRADE` - No trade signal (neutral)

### 2. **Signal Record Fields:**
Each recorded signal now includes:
- `timestamp`, `direction`, `confidence`, `estimated_move`
- `entry_zone_low`, `entry_zone_high`, `stop_loss`, `target_1`, `target_2`
- `risk_reward_ratio`, `setup_type`, `timeframe`
- `btc_price`, `market_bias`, `whale_direction`, `whale_strength`
- `liquidity_direction`, `magnet_direction`, `magnet_score`
- `energy_score`, `compression_level`
- `outcome`, `outcome_timestamp`, `outcome_price`, `pnl_percent`
- `target_1_hit`, `target_2_hit`, `stop_hit`
- `validity_hours`, `outcome_notes`

### 3. **Outcome Logic:**
**For LONG signals:**
- WIN: `current_price >= target_2`
- PARTIAL_WIN: `current_price >= target_1` (after validity expires)
- LOSS: `current_price <= stop_loss`
- EXPIRED: No target/stop hit within validity window

**For SHORT signals:**
- WIN: `current_price <= target_2`
- PARTIAL_WIN: `current_price <= target_1` (after validity expires)
- LOSS: `current_price >= stop_loss`
- EXPIRED: No target/stop hit within validity window

### 4. **New API Endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/signal-history/statistics` | GET | Comprehensive performance statistics |
| `/api/signal-history/check-outcomes` | POST | Check and update pending signal outcomes |
| `/api/signal-history/{id}/outcome` | PUT | Manually update signal outcome |
| `/api/signal-history/migrate-outcomes` | POST | Migrate legacy signals to new format |

### 5. **Performance Statistics:**
The `/api/signal-history/statistics` endpoint returns:
- **Totals**: total_signals, total_long, total_short, total_no_trade
- **Outcomes**: wins, losses, partial_wins, expired, pending
- **Win Rates**: overall, long, short, last_7d, last_30d
- **Performance**: avg_winning_confidence, avg_losing_confidence, avg_pnl_percent, best/worst_trade_pnl, avg_rr_ratio
- **By Setup Type**: Performance breakdown by setup_type
- **By Market Condition**: Performance by compression_level

### 6. **Frontend Updates:**
- **Performance Trading Panel**: Shows win rates, PnL, outcome distribution
- **Outcome Badges**: WIN (green), PARTIAL (light green), LOSS (red), EXPIRED (yellow), PENDING (blue)
- **Filters**: Filter signals by direction AND outcome
- **"Verifica Outcomes" Button**: Trigger outcome check for pending signals

---

## v2.0.1 LOGIC IMPROVEMENTS ✅

### 1. **Liquidity Magnet Score Scale:**
- BALANCED now shows neutral score (40-60) instead of 0
- `magnet_strength` for BALANCED is always "MODERATE"
- Score interpretation:
  - 0-30: WEAK (low directional attraction)
  - 40-60: MODERATE (balanced or neutral)
  - 65-80: STRONG (clear directional pull)
  - 81-100: VERY_STRONG (high directional pull)

### 2. **Conflict Handling:**
When Market Energy is HIGH + Liquidity Magnet is BALANCED + Whale Activity is NEUTRAL:
- Active signals downgraded to SETUP_IN_CONFIRMATION
- Confidence reduced by 15 points
- Warning displayed about unclear direction

---

## v2.0 LIQUIDITY MAGNET SCORE ✅

**Intelligence module measuring price attraction toward liquidity zones.**

### Key Metrics:
- `magnet_score`: 0-100
- `target_direction`: UP / DOWN / BALANCED
- `magnet_strength`: WEAK / MODERATE / STRONG / VERY_STRONG
- `nearest_magnet_price`, `nearest_magnet_distance_percent`
- `sweep_expectation`: SWEEP_UP_FIRST / SWEEP_DOWN_FIRST / NO_CLEAR_SWEEP

### API Endpoint:
- `/api/liquidity-magnet?lang=it|en|de|pl`

---

## v1.9.5 MARKET ENERGY / COMPRESSION DETECTOR ✅

**Intelligence module detecting energy buildup before significant moves.**

### Key Metrics:
- `energy_score`: 0-100
- `compression_level`: LOW / MEDIUM / HIGH
- `compression_threshold`: Dynamic threshold
- `expansion_readiness`: LOW / MEDIUM / HIGH
- `breakout_probability`: LOW / MEDIUM / HIGH

### API Endpoint:
- `/api/market-energy?lang=it|en|de|pl`

---

## Key API Endpoints Summary

| Endpoint | Description |
|----------|-------------|
| `/api/trade-signal` | Main trade signal with all intelligence data |
| `/api/market-energy` | Market energy/compression analysis |
| `/api/liquidity-magnet` | Liquidity magnet score |
| `/api/whale-alerts` | Whale activity v2.0 |
| `/api/signal-history` | Signal history list |
| `/api/signal-history/statistics` | Performance statistics |
| `/api/signal-history/check-outcomes` | Check pending outcomes |

---

## Dashboard Layout
1. **Top Row**: Trade Signal + TradingView Chart
2. **Intelligence Row**: Market Bias, Open Interest, Funding Rate
3. **Advanced Analysis Row**: Market Energy, Liquidity Magnet, Whale Activity
4. **Data Row**: Order Book, Liquidity Direction, Support/Resistance

---

## Test Reports
- `/app/test_reports/iteration_10.json` - Liquidity Magnet module (100% pass)

---

## P1 - Next Tasks
1. **Telegram notification backend** - Send alerts when signals are generated
2. **Refactor server.py** - Extract BACKEND_TRANSLATIONS to JSON files

## P2 - Future Tasks
1. Real Pattern Detection Engine (ML-based)
2. Learn Mode content popups
3. Semi-automatic trading bot integration
4. Price alert monitoring background process
5. Signal charts visualization

---

## Architecture Note
The `server.py` file has grown to ~7600+ lines. Recommended refactoring:
- Extract `BACKEND_TRANSLATIONS` to `/app/backend/locales/{lang}.json`
- Extract analysis functions to `/app/backend/analysis/` modules
- Extract API routes to `/app/backend/routes/` modules
