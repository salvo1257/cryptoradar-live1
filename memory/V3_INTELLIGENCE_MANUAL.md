# CryptoRadar V3.4 Intelligence Manual

**Version:** 3.4.0  
**Last Updated:** 2026-04-12

---

## Overview

CryptoRadar V3.3 introduces enhanced intelligence modules that integrate CoinGlass derivatives data to provide more accurate market analysis and target validation. 

**V3.4** adds a critical **Signal Validation Layer** that acts as the final defensive gate before execution.

This manual explains how each module works and how they connect together.

---

## Module 1: Market Bias (V3.3 Enhanced)

### What It Does
Market Bias determines the directional lean of the market by combining:
1. **Exchange Order Book Consensus** - Multi-exchange bid/ask imbalance
2. **CoinGlass Derivatives Positioning** - Long/short ratios from futures markets

### CoinGlass Data Used
| Endpoint | Data | Purpose |
|----------|------|---------|
| `/futures/global-long-short-account-ratio/history` | Global L/S Ratio | Crowd positioning (contrarian) |
| `/futures/top-long-short-account-ratio/history` | Top Trader L/S Ratio | Smart money direction |
| `/futures/top-long-short-position-ratio/history` | Top Position L/S Ratio | Institutional positioning |

### Logic Rules

**Crowd Positioning (Contrarian Signal):**
- Ratio > 1.5 → "overcrowded_long" → Contrarian BEARISH signal
- Ratio < 0.67 → "overcrowded_short" → Contrarian BULLISH signal
- Ratio 1.2-1.5 → "leaning_long" → Mild bearish signal
- Ratio 0.67-0.83 → "leaning_short" → Mild bullish signal

**Top Traders (Follow Smart Money):**
- Ratio > 1.3 → Top traders BULLISH → Follow with BULLISH bias
- Ratio < 0.77 → Top traders BEARISH → Follow with BEARISH bias

### Output Fields
```json
{
  "bias": "BULLISH|BEARISH|NEUTRAL",
  "confidence": 0-100,
  "derivatives_bias": "BULLISH|BEARISH|NEUTRAL",
  "derivatives_strength": 0-100,
  "crowd_positioning": "overcrowded_long|leaning_long|balanced|leaning_short|overcrowded_short",
  "top_accounts_bias": "BULLISH|BEARISH|NEUTRAL",
  "top_positions_bias": "BULLISH|BEARISH|NEUTRAL",
  "derivatives_explanation": "Human-readable explanation"
}
```

### Why It Matters
- **Strong bullish bias:** Crowd not overcrowded long + Top traders/positions supportive
- **Strong bearish bias:** Crowd not overcrowded short + Top traders/positions supportive
- **Neutral bias:** Conflicting signals or balanced positioning

---

## Module 2: Market Energy (V3.3 Enhanced)

### What It Does
Market Energy measures whether the market has sufficient "fuel" to move toward targets by analyzing:
1. **Price compression/range analysis**
2. **CoinGlass derivatives pressure data**

### CoinGlass Data Used
| Endpoint | Data | Purpose |
|----------|------|---------|
| `/futures/aggregated-taker-buy-sell-volume/history` | Buy/Sell Volume | Aggressive participation |
| `/futures/liquidation/detail` | Liquidation Data | Squeeze/acceleration potential |
| `/futures/openInterest/history` | OI Change | New positioning = fuel |

### Logic Rules

**Buy/Sell Aggression:**
- Buy ratio > 58% → "aggressive_buying" → +25 fuel score
- Sell ratio > 58% → "aggressive_selling" → +25 fuel score
- 53-58% → Mild pressure → +10 fuel score

**Liquidation Acceleration:**
- Total liquidations > $100M → "ACTIVE" → +30 fuel score
- Total liquidations > $50M → "BUILDING" → +15 fuel score
- Long liquidations > 60% → Downward pressure
- Short liquidations > 60% → Upward pressure (short squeeze)

**OI Expansion:**
- OI change > 3% → New positions = fuel → +25 fuel score
- OI change 1-3% → Moderate fuel → +10 fuel score
- OI change < -3% → Positions closing = less fuel → -15 fuel score

### Energy State Calculation
```
fuel_score = buy_sell_score + liquidation_score + oi_score
energy_state = HIGH if fuel_score >= 60 else MEDIUM if fuel_score >= 30 else LOW
```

### Output Fields
```json
{
  "energy_score": 0-100,
  "energy_state": "LOW|MEDIUM|HIGH",
  "fuel_score": 0-100,
  "buy_sell_pressure": "BUY|SELL|BALANCED",
  "buy_sell_ratio": 0-100,
  "liquidation_acceleration": "NONE|BUILDING|ACTIVE",
  "liquidation_pressure_side": "LONG|SHORT|BALANCED",
  "fuel_explanation": "Human-readable explanation"
}
```

### Why It Matters
- **HIGH energy:** Strong directional pressure + OI expansion + liquidation cascade → Move is likely
- **MEDIUM energy:** Some pressure but not overwhelming → Proceed with caution
- **LOW energy:** Flat OI + weak imbalance + no liquidations → Expect choppy action

---

## Module 3: Liquidity Magnet (V3.3 Enhanced)

### What It Does
Liquidity Magnet identifies which liquidity clusters are most likely to be "attacked" by:
1. **Finding strongest orderbook clusters** (not just nearest)
2. **Validating clusters with CoinGlass derivatives pressure**

### Cluster Validation Logic

Each cluster is scored based on derivatives support:

| Factor | Condition | Score |
|--------|-----------|-------|
| Liquidation Pressure | Aligns with target direction | +30 |
| Liquidation Pressure | Conflicts with target direction | -15 |
| Buy/Sell Aggression | Supports direction | +25 |
| Buy/Sell Aggression | Conflicts with direction | -10 |
| OI Expansion | OI growing > 2% | +15 |
| OI Contraction | OI shrinking > 2% | -5 |
| Top Traders | Aligned with direction | +20 |

### Validation Status
```
validation_score >= 50 → cluster_validated=true, derivatives_support="STRONG"
validation_score >= 25 → cluster_validated=true, derivatives_support="MODERATE"
validation_score >= 0  → cluster_validated=false, derivatives_support="WEAK"
validation_score < 0   → cluster_validated=false, derivatives_support="CONFLICTING"
```

### Output Fields
```json
{
  "magnet_score": 0-100,
  "target_direction": "UP|DOWN|BALANCED",
  "cluster_validated": true|false,
  "derivatives_support": "STRONG|MODERATE|WEAK|CONFLICTING",
  "liquidation_pressure_direction": "UP|DOWN|BALANCED",
  "buy_sell_aggression": "BUYING|SELLING|BALANCED",
  "cluster_validation_reason": "Human-readable explanation"
}
```

### Why It Matters
The magnet no longer just identifies "where liquidity is" but also "which liquidity is most likely to be hit".

---

## Module 4: Market Regime (V3.3 Enhanced)

### What It Does
Market Regime classifies market context and **determines target permissiveness** - how far targets can be set.

### Target Profiles

| Regime | Condition | Profile | Max Distance |
|--------|-----------|---------|--------------|
| COMPRESSION | No breakout confirmation | CONSERVATIVE | 1.5% |
| COMPRESSION | High breakout probability + energy | EXTENDED | 3.5% |
| RANGE | No strong pressure | CONSERVATIVE | 1.5% |
| RANGE | Strong directional pressure | BALANCED | 2.0% |
| TREND | Weak bias alignment | CONSERVATIVE | 1.5% |
| TREND | Good bias alignment | BALANCED | 2.5% |
| TREND | Strong bias + energy | EXTENDED | 4.0% |
| EXPANSION | Partial alignment | BALANCED | 2.5% |
| EXPANSION | Full alignment (whale + liquidity) | EXTENDED | 4.5% |

### Output Fields
```json
{
  "regime": "TREND|RANGE|COMPRESSION|EXPANSION",
  "target_profile": "CONSERVATIVE|BALANCED|EXTENDED",
  "max_target_distance_pct": 1.5-4.5,
  "target_constraint_reason": "Human-readable explanation"
}
```

### Why It Matters
Regime is now an **operational constraint** for target distance, not just a descriptive label.

---

## Module Integration

### Decision Hierarchy

When validating a target, modules are evaluated in this order:

```
1. REGIME → Decides target permissiveness (conservative/balanced/extended)
2. BIAS → Decides allowed directional side (UP/DOWN/ANY)
3. LIQUIDITY MAGNET → Selects the most relevant validated cluster
4. ENERGY → Decides whether the move is realistically reachable
```

### Integration Quality Assessment

| Quality | Condition |
|---------|-----------|
| STRONG | All modules aligned + cluster validated |
| MODERATE | Partial alignment OR weak cluster validation |
| WEAK | Conflicting modules (e.g., magnet direction vs bias) |

### API Endpoint

`GET /api/v3/intelligence-status`

Returns complete status of all modules with integration summary:

```json
{
  "status": "V3.3_INTELLIGENCE_ACTIVE",
  "market_bias": { ... },
  "market_energy": { ... },
  "liquidity_magnet": { ... },
  "market_regime": { ... },
  "module_integration": {
    "integration_quality": "STRONG|MODERATE|WEAK",
    "allowed_direction": "UP|DOWN|null",
    "magnet_bias_aligned": true|false,
    "energy_supports_move": true|false,
    "cluster_validated": true|false,
    "recommendation": "Conditions favorable|Proceed with caution|Wait for alignment",
    "decision_hierarchy": {
      "step_1_regime": "...",
      "step_2_bias": "...",
      "step_3_magnet": "...",
      "step_4_energy": "..."
    }
  }
}
```

---

## Learn Mode Explanations

All modules provide Learn Mode explanations in the configured language (IT, EN, DE, PL):

### Market Bias
- **Cosa succede:** Il bias di mercato analizza il posizionamento dei trader
- **Perché:** Combinando dati orderbook e derivati
- **Azione:** Se bias forte e validato, seguire la direzione

### Market Energy
- **Cosa succede:** L'energia misura il "carburante" disponibile per un movimento
- **Perché:** Basato su buy/sell aggressivo, liquidazioni, OI
- **Azione:** Energia alta = movimento probabile; bassa = mercato choppy

### Liquidity Magnet
- **Cosa succede:** Il magnete identifica cluster di liquidità più probabili da colpire
- **Perché:** Validato con pressione derivati
- **Azione:** Cluster validato = target più affidabile

### Market Regime
- **Cosa succede:** Il regime determina quanto lontani possono essere i target
- **Perché:** Compressione limita; trend permette estensione
- **Azione:** Rispettare i limiti di distanza del regime

---

## Limitations

### CoinGlass HOBBYIST Plan Limits
- API rate limits may cause temporary data unavailability
- Some endpoints may return 429 (rate limited) during high traffic
- System gracefully degrades when derivatives data unavailable

### Graceful Degradation
When CoinGlass data is unavailable:
- Market Bias uses only exchange orderbook consensus
- Market Energy uses only price/OI analysis
- Liquidity Magnet uses only orderbook clusters (not validated)
- All modules continue to function with reduced accuracy

---

## Troubleshooting

### "derivatives_bias" is null
- CoinGlass rate limit (429) - wait a few minutes
- API key issue - check COINGLASS_API_KEY in .env

### "cluster_validated" is false but magnet shows direction
- Derivatives pressure conflicts with cluster direction
- Check `derivatives_support` field for explanation

### "integration_quality" is WEAK
- Modules are conflicting (e.g., bearish bias but UP magnet)
- Wait for better alignment before taking positions

---

## Summary

V3.3 Intelligence Modules provide:
1. **Market Bias** with derivatives positioning (crowd, top traders, top positions)
2. **Market Energy** with fuel analysis (buy/sell, liquidations, OI)
3. **Liquidity Magnet** with cluster validation (derivatives pressure check)
4. **Market Regime** with target permissiveness (operational constraint)
5. **Module Integration** with decision hierarchy and quality assessment

All modules work together to provide more intelligent, validated targets with clear reasoning.

---

## 🔴 V3.4 Signal Validation Layer (Final Defensive System)

### Overview

V3.4 introduces a **final validation layer** inside `record_v3_entry_signal()` that acts as a **hard execution gate**.
No signal can be recorded or sent to the user if it fails these checks.

This ensures **execution integrity**, even if upstream logic fails.

---

### 🛑 Blocking Conditions (Hard Filters)

A signal is **blocked and not executed** if any of the following conditions are met:

#### 1. Low Risk/Reward

```
R:R < 0.5 → BLOCKED_LOW_RR
```

**Rationale:** Signals with R:R below 0.5 offer poor risk-adjusted returns. A minimum of 0.5 ensures at least a 1:2 risk/reward ratio is achievable.

#### 2. Upstream Validation Failure

```
target_block_reason != None → BLOCKED_UPSTREAM
```

**Rationale:** If `create_setup_event()` already identified a problem (e.g., bias conflict, no clusters), the signal should not proceed.

**Common Upstream Blocks:**
- `LOW_RR_{value}` - R:R too low at setup creation
- `NO_VALID_CLUSTERS` - No valid liquidity cluster targets found
- `BIAS_CONFLICT_{direction}_vs_{bias}` - Signal conflicts with strong market bias

#### 3. Liquidity Magnet Conflict

```
signal_direction != magnet_direction → BLOCKED_MAGNET_CONFLICT
```

**Logic:**
| Signal | Magnet Direction | Result |
|--------|------------------|--------|
| LONG | UP | ✅ ALIGNED |
| LONG | DOWN | ❌ BLOCKED |
| SHORT | DOWN | ✅ ALIGNED |
| SHORT | UP | ❌ BLOCKED |
| ANY | BALANCED | ✅ ALLOWED |

**Rationale:** Price is attracted toward liquidity. Going against the magnet increases the probability of the trade failing.

#### 4. Squeeze Risk (Derivatives Data)

```
overcrowded positioning + same-direction signal → BLOCKED_SQUEEZE_RISK
```

**Conditions:**

| Scenario | Trigger | Block |
|----------|---------|-------|
| Shorts Overcrowded | L/S ratio > 1.5 OR funding < -0.05% | ❌ Cannot SHORT |
| Longs Overcrowded | L/S ratio < 0.67 OR funding > 0.05% | ❌ Cannot LONG |

**Rationale:** When too many traders are on one side, the market often squeezes them. Don't join the crowded side.

#### 5. No Valid Targets

```
has_valid_targets == False → BLOCKED_NO_VALID_TARGETS
```

**Rationale:** Without valid liquidity cluster targets, the signal has no meaningful exit points.

---

### ⚙️ Execution Behavior

When a signal is blocked:

| Action | Result |
|--------|--------|
| Database Insert | ❌ NOT saved |
| Telegram Alert | ❌ NOT sent |
| Signal History | ❌ NOT recorded |
| Internal Log | ✅ Logged with reason |

**Log Format:**
```
[V3 Signal] ❌ BLOCKED_SIGNAL - {REASON}: {details}
```

---

### 🧠 Design Principle

> "No signal reaches the user unless it is logically consistent across all modules."

This layer ensures alignment between:

| Module | Must Align |
|--------|------------|
| Market Bias | Signal direction |
| Liquidity Magnet | Signal direction |
| Market Energy | Minimum fuel available |
| Derivatives Context | Not overcrowded |

---

### 🔁 Validation Hierarchy (V3.4)

```
┌─────────────────────────────────────────────────────────┐
│                    SIGNAL FLOW                          │
├─────────────────────────────────────────────────────────┤
│  4H Event Detection                                     │
│         ↓                                               │
│  Setup Creation (create_setup_event)                    │
│         ↓                                               │
│  Upstream Validation (R:R, Clusters, Bias)              │
│         ↓                                               │
│  5M Confirmation                                        │
│         ↓                                               │
│  ┌───────────────────────────────────────────────┐      │
│  │  V3.4 VALIDATION LAYER (FINAL GATE)           │      │
│  │                                               │      │
│  │  ✓ Check upstream block reason                │      │
│  │  ✓ Check R:R >= 0.5                           │      │
│  │  ✓ Check magnet alignment                     │      │
│  │  ✓ Check squeeze risk                         │      │
│  │  ✓ Check valid targets                        │      │
│  │                                               │      │
│  │  If ANY fails → BLOCK                         │      │
│  └───────────────────────────────────────────────┘      │
│         ↓                                               │
│  Signal Recording (record_v3_entry_signal)              │
│         ↓                                               │
│  Telegram Alert                                         │
│         ↓                                               │
│  USER EXECUTION                                         │
└─────────────────────────────────────────────────────────┘
```

The **Validation Layer is final and non-bypassable**.

---

### 📊 Impact

| Metric | Effect |
|--------|--------|
| Signal Frequency | ↓ Fewer signals |
| Signal Quality | ↑ Higher quality |
| Win Rate (expected) | ↑ Improved |
| User Trust | ↑ No contradictory signals |
| Dataset Quality | ↑ Clean validation data |

---

### 🧪 Testing Endpoint

**POST /api/v3/test-signal-validation**

Tests all validation scenarios without affecting the database:

```json
{
  "test_results": [
    {"test": "LOW_RR", "result": "BLOCKED", "reason": "BLOCKED_LOW_RR_0.14"},
    {"test": "UPSTREAM_BLOCK", "result": "BLOCKED", "reason": "BLOCKED_UPSTREAM_..."},
    {"test": "MAGNET_CONFLICT", "result": "BLOCKED", "reason": "BLOCKED_MAGNET_CONFLICT_SHORT_vs_UP"},
    {"test": "VALID_SIGNAL", "result": "PASSED"}
  ]
}
```

---

### ⚠️ Important Notes

1. **Defensive System:** This is a filter, not a signal generator
2. **Quality Over Quantity:** System produces fewer but better signals
3. **No Overrides:** Validation cannot be bypassed
4. **Graceful Degradation:** If derivatives data is unavailable, squeeze risk check is skipped (not blocked)
5. **Logging:** All blocks are logged for monitoring and debugging

---

### 📝 Block Reason Reference

| Code | Meaning |
|------|---------|
| `BLOCKED_UPSTREAM_{reason}` | Setup already blocked during creation |
| `BLOCKED_LOW_RR_{value}` | R:R below 0.5 minimum |
| `BLOCKED_MAGNET_CONFLICT_{dir}_vs_{magnet}` | Signal conflicts with magnet |
| `BLOCKED_SQUEEZE_RISK_SHORTS_OVERCROWDED` | Too many shorts, can't SHORT |
| `BLOCKED_SQUEEZE_RISK_LONGS_OVERCROWDED` | Too many longs, can't LONG |
| `BLOCKED_NO_VALID_TARGETS` | No valid cluster targets found |

---

## End of Manual

---

## 🔵 V3.5 Contrarian Logic (Trap Detection System)

### Overview

V3.5 introduces a **Contrarian Logic System** that activates ONLY when a V3 signal is BLOCKED.
This is NOT a general reversal engine - it is a highly selective trap detection mechanism.

When a normal signal is blocked due to directional conflicts (magnet, squeeze), V3.5 evaluates 
whether the opposite direction represents a high-conviction trap/squeeze opportunity.

---

### 🎯 Activation Precondition

V3.5 Contrarian can ONLY activate if:

```
Original V3 signal was BLOCKED
```

**Eligible Block Reasons:**
| Block Reason | Eligible | Why |
|--------------|----------|-----|
| `BLOCKED_MAGNET_CONFLICT` | ✅ YES | Directional conflict |
| `BLOCKED_SQUEEZE_RISK` | ✅ YES | Positioning conflict |
| `BLOCKED_UPSTREAM_BIAS_CONFLICT` | ✅ YES | Directional conflict |
| `BLOCKED_LOW_RR` | ❌ NO | Not a directional conflict |
| `BLOCKED_NO_VALID_TARGETS` | ❌ NO | No targets available |

---

### 🛡️ Required Conditions (ALL Must Be True)

A contrarian signal is generated ONLY if ALL conditions pass:

#### 1. Magnet Direction Supports Contrarian

```
Contrarian LONG  → Magnet must be UP
Contrarian SHORT → Magnet must be DOWN
```

#### 2. Squeeze Risk Supports Contrarian

```
Contrarian LONG  → Shorts overcrowded (ratio > 1.5) OR extreme negative funding
Contrarian SHORT → Longs overcrowded (ratio < 0.67) OR extreme positive funding
```

#### 3. Market Energy >= MEDIUM

```
energy_score >= 40 OR compression_level in [HIGH, VERY_HIGH]
```

#### 4. Regime Compatible

```
Regime must be: RANGE, COMPRESSION, or EXPANSION
NOT: TREND (strong directional markets don't trap easily)
```

#### 5. Valid R:R >= 0.5

```
Contrarian trade must have R:R >= 0.5
Uses swing levels inverted from blocked signal
```

#### 6. Meaningful Target Distance

```
Target must be >= 0.3% from current price
```

---

### 📊 Contrarian Signal Output

If all conditions pass, V3.5 generates:

```json
{
  "contrarian_active": true,
  "contrarian_direction": "CONTRARIAN_LONG",
  "original_blocked_direction": "SHORT",
  "blocked_original_signal_reason": "BLOCKED_MAGNET_CONFLICT_SHORT_vs_UP",
  "contrarian_entry": 71000,
  "contrarian_stop": 69400,
  "contrarian_target_1": 72600,
  "contrarian_rr": 1.0,
  "contrarian_magnet_direction": "UP",
  "squeeze_context": {
    "overcrowded_side": "SHORTS",
    "global_ratio": 1.7,
    "squeeze_probability": "MODERATE"
  },
  "contrarian_quality": 75,
  "risk_warning": "CONTRARIAN SETUP: This is a trap-based reversal trade."
}
```

---

### 🚫 Safety Filters (6 Total)

| Filter | Condition | If Failed |
|--------|-----------|-----------|
| 1. Eligible Block | Block reason must be directional | No evaluation |
| 2. Magnet Alignment | Must support contrarian direction | NO_CONTRARIAN |
| 3. Squeeze Setup | Must have overcrowded positioning | NO_CONTRARIAN |
| 4. Energy Level | Must be >= MEDIUM | NO_CONTRARIAN |
| 5. Regime Compatibility | Must NOT be TREND | NO_CONTRARIAN |
| 6. R:R Validity | Must be >= 0.5 | NO_CONTRARIAN |

---

### 📈 Tracking & Statistics

Contrarian signals are tracked SEPARATELY from normal V3 signals:

**API Endpoints:**
- `GET /api/v3/contrarian-stats` - Performance statistics
- `GET /api/v3/contrarian-signals` - List of contrarian signals
- `POST /api/v3/test-contrarian-evaluation` - Test scenarios

**Tracked Metrics:**
- Total contrarian signals
- Win rate
- Average R:R
- T1 hit rate
- By direction (CONTRARIAN_LONG vs CONTRARIAN_SHORT)

---

### ⚠️ Important Notes

1. **Rare Signals:** Contrarian is designed to be RARE (< 5% of blocks should generate contrarian)
2. **High Risk:** Contrarian trades are trap-based and carry higher risk
3. **Clear Labeling:** UI and Telegram must clearly identify CONTRARIAN signals
4. **No Weakening:** V3.4 blocking rules are NEVER bypassed or weakened
5. **Separate Tracking:** Contrarian signals do NOT mix with normal V3 statistics

---

### 🔄 Decision Flow

```
Normal V3 Signal Generated
         │
         ▼
    V3.4 Validation
         │
    ┌────┴────┐
    │         │
  PASSED   BLOCKED
    │         │
    ▼         ▼
 Record   ┌──────────────────┐
 Signal   │ V3.5 Contrarian  │
          │ Evaluation       │
          └──────────────────┘
                  │
         ┌───────┴───────┐
         │               │
    ALL CONDITIONS   ANY CONDITION
       PASS            FAILS
         │               │
         ▼               ▼
    CONTRARIAN      final_action
     SIGNAL          = ATTENDI
    GENERATED
```

---

### 🧪 Test Scenarios

Use `/api/v3/test-contrarian-evaluation` to verify logic:

| Scenario | Result |
|----------|--------|
| Ideal setup (all conditions met) | CONTRARIAN_LONG_GENERATED |
| Energy too low | NO_CONTRARIAN |
| TREND regime | NO_CONTRARIAN |
| No squeeze setup | NO_CONTRARIAN |

---

## Summary

V3.5 Contrarian Logic provides:
1. **Trap Detection** - Identifies when blocked signals indicate opposite opportunities
2. **6 Safety Filters** - Ensures only high-conviction contrarian signals
3. **Separate Tracking** - Contrarian performance isolated from normal V3
4. **Clear Labeling** - UI clearly distinguishes contrarian from normal signals
5. **Rare Activation** - System is designed to be highly selective