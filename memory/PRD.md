# CryptoRadar v2.3 - Product Requirements Document
**Last Updated:** 2025-12-14

## DEPLOYMENT READINESS: VERIFIED (2025-12-14)
- System Health Endpoint: `/api/system/health` - All APIs OK
- Background Scheduler: Active (outcome check every 1 hour)
- Dynamic Signal Timing: Active

---

## v2.3 DYNAMIC SIGNAL TIMING ✅ (NEW)

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
