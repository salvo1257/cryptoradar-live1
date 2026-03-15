# CryptoRadar 2.0 - Signal Engine Design Document
**Version:** 2.0-DEV
**Date:** 2025-12-15
**Status:** DEVELOPMENT PREVIEW

---

## Overview

CryptoRadar 2.0 extends the signal engine to handle **two distinct setup types**:

1. **SWEEP REVERSAL** (existing v1 logic) - Manipulation-based reversals
2. **TREND CONTINUATION** (new v2 logic) - Trend-following breakouts

This allows the system to capture both:
- Deep manipulation sweeps followed by reversals
- Smaller trend-based expansions in trending markets

---

## Setup Type Definitions

### 1. SWEEP REVERSAL (v1 - Unchanged)

**Philosophy:** Price manipulates liquidity pools (stop hunts) then reverses.

**Conditions:**
- Liquidity sweep detected (price breaks key level then reverses)
- Whale activity shows accumulation/distribution
- Market energy shows compression before expansion
- Counter-trend entry after manipulation

**Best Market Conditions:**
- Range-bound markets
- High manipulation activity
- Liquidity pools visible above/below price

---

### 2. TREND CONTINUATION (v2 - New)

**Philosophy:** Price breaks key levels and continues in trend direction.

**Conditions for LONG CONTINUATION:**
| Factor | Requirement |
|--------|-------------|
| Market Bias | BULLISH (score > 55) |
| Market Energy | MEDIUM or HIGH (energy_score >= 40) |
| Liquidity Magnet | UP direction |
| Whale Activity | BULLISH or NEUTRAL (not strongly bearish) |
| Price Action | Breaks/reclaims resistance level |
| Expected Move | >= 1.5% to next target |
| Risk/Reward | >= 1.5:1 |

**Conditions for SHORT CONTINUATION:**
| Factor | Requirement |
|--------|-------------|
| Market Bias | BEARISH (score < 45) |
| Market Energy | MEDIUM or HIGH (energy_score >= 40) |
| Liquidity Magnet | DOWN direction |
| Whale Activity | BEARISH or NEUTRAL (not strongly bullish) |
| Price Action | Breaks/loses support level |
| Expected Move | >= 1.5% to next target |
| Risk/Reward | >= 1.5:1 |

**Best Market Conditions:**
- Trending markets (clear direction)
- Breakout scenarios
- High market energy / volatility expansion

---

## Signal Engine Flow (v2)

```
┌─────────────────────────────────────────────────────────────────┐
│                    MARKET DATA COLLECTION                        │
│  (Price, OI, Funding, Order Book, Liquidations, Candles)        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ANALYSIS MODULES                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Market   │ │ Whale    │ │ Market   │ │ Liquidity│           │
│  │ Bias     │ │ Activity │ │ Energy   │ │ Magnet   │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│  │ Support/ │ │ Open     │ │ Funding  │                        │
│  │ Resist.  │ │ Interest │ │ Rate     │                        │
│  └──────────┘ └──────────┘ └──────────┘                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SETUP DETECTION                               │
│                                                                  │
│  ┌───────────────────────┐    ┌───────────────────────┐        │
│  │   SWEEP REVERSAL      │    │  TREND CONTINUATION   │        │
│  │   DETECTOR (v1)       │    │  DETECTOR (v2)        │        │
│  │                       │    │                       │        │
│  │ - Check liquidity     │    │ - Check market bias   │        │
│  │   sweep patterns      │    │ - Check energy level  │        │
│  │ - Detect manipulation │    │ - Check liq. magnet   │        │
│  │ - Find reversal zone  │    │ - Detect breakout     │        │
│  └───────────────────────┘    └───────────────────────┘        │
│              │                           │                      │
│              └───────────┬───────────────┘                      │
│                          ▼                                      │
│              ┌───────────────────────┐                         │
│              │   SETUP SELECTOR      │                         │
│              │                       │                         │
│              │ Pick best setup based │                         │
│              │ on confidence score   │                         │
│              └───────────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SIGNAL GENERATION                             │
│                                                                  │
│  Direction: LONG / SHORT / NO TRADE                             │
│  Setup Type: SWEEP_REVERSAL / TREND_CONTINUATION                │
│  Entry Zone, Stop Loss, Target 1, Target 2                      │
│  Confidence, Risk/Reward, Urgency, Validity Window              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Confidence Scoring (v2)

### TREND CONTINUATION Confidence Formula:

```python
base_score = 40  # Trend continuation base

# Market Bias alignment (+0 to +20)
if direction == "LONG" and bias == "BULLISH":
    base_score += min(20, (bias_score - 50) * 0.4)
elif direction == "SHORT" and bias == "BEARISH":
    base_score += min(20, (50 - bias_score) * 0.4)

# Market Energy contribution (+0 to +15)
if energy_score >= 70:
    base_score += 15
elif energy_score >= 50:
    base_score += 10
elif energy_score >= 40:
    base_score += 5

# Liquidity Magnet alignment (+0 to +15)
if (direction == "LONG" and liq_direction == "UP") or \
   (direction == "SHORT" and liq_direction == "DOWN"):
    base_score += min(15, liq_score * 0.15)

# Whale Activity alignment (+0 to +10)
if whale_direction matches trade_direction:
    base_score += 10
elif whale_direction == "NEUTRAL":
    base_score += 5

# Risk/Reward bonus (+0 to +10)
if rr_ratio >= 2.5:
    base_score += 10
elif rr_ratio >= 2.0:
    base_score += 7
elif rr_ratio >= 1.5:
    base_score += 4

# Volume confirmation (+0 to +5)
if volume_spike_detected:
    base_score += 5

final_confidence = min(95, base_score)
```

---

## Target Calculation (Trend Continuation)

### LONG CONTINUATION Targets:

```python
entry_price = current_price
entry_zone_low = entry_price * 0.998   # Tight entry zone
entry_zone_high = entry_price * 1.002

# Stop below recent swing low or support
stop_loss = max(
    recent_swing_low * 0.995,
    nearest_support * 0.995
)

# Targets based on ATR and resistance levels
atr = calculate_atr(candles, period=14)
target_1 = entry_price + (atr * 1.5)  # 1.5 ATR move
target_2 = entry_price + (atr * 2.5)  # 2.5 ATR move

# Adjust to nearest resistance if closer
if nearest_resistance < target_1:
    target_1 = nearest_resistance
if next_resistance < target_2:
    target_2 = next_resistance
```

### SHORT CONTINUATION Targets:

```python
entry_price = current_price
entry_zone_low = entry_price * 0.998
entry_zone_high = entry_price * 1.002

# Stop above recent swing high or resistance
stop_loss = min(
    recent_swing_high * 1.005,
    nearest_resistance * 1.005
)

# Targets based on ATR and support levels
target_1 = entry_price - (atr * 1.5)
target_2 = entry_price - (atr * 2.5)

# Adjust to nearest support if closer
if nearest_support > target_1:
    target_1 = nearest_support
if next_support > target_2:
    target_2 = next_support
```

---

## Setup Type Selection Logic

When both SWEEP_REVERSAL and TREND_CONTINUATION conditions are met:

```python
def select_best_setup(sweep_signal, continuation_signal):
    """
    Select the best setup when multiple are valid.
    
    Priority logic:
    1. If only one setup is valid, use it
    2. If both valid, compare confidence scores
    3. Prefer TREND_CONTINUATION in trending markets
    4. Prefer SWEEP_REVERSAL in ranging markets
    """
    
    if not sweep_signal.is_valid and not continuation_signal.is_valid:
        return NO_TRADE
    
    if sweep_signal.is_valid and not continuation_signal.is_valid:
        return sweep_signal
    
    if continuation_signal.is_valid and not sweep_signal.is_valid:
        return continuation_signal
    
    # Both valid - decide based on market regime
    market_regime = detect_market_regime()  # TRENDING or RANGING
    
    if market_regime == "TRENDING":
        # Prefer continuation in trends
        if continuation_signal.confidence >= sweep_signal.confidence - 10:
            return continuation_signal
        return sweep_signal
    else:
        # Prefer reversal in ranges
        if sweep_signal.confidence >= continuation_signal.confidence - 10:
            return sweep_signal
        return continuation_signal
```

---

## Market Regime Detection

```python
def detect_market_regime(candles, lookback=50):
    """
    Detect if market is TRENDING or RANGING.
    
    Uses:
    - ADX indicator (> 25 = trending)
    - Price vs moving averages
    - Higher highs / lower lows pattern
    """
    
    # ADX calculation
    adx = calculate_adx(candles, period=14)
    
    # MA alignment
    ema_20 = calculate_ema(candles, 20)
    ema_50 = calculate_ema(candles, 50)
    
    current_price = candles[-1]['close']
    
    # Trending conditions
    if adx > 25:
        if current_price > ema_20 > ema_50:
            return "TRENDING_UP"
        elif current_price < ema_20 < ema_50:
            return "TRENDING_DOWN"
    
    # Check for higher highs / lower lows
    highs = [c['high'] for c in candles[-10:]]
    lows = [c['low'] for c in candles[-10:]]
    
    higher_highs = all(highs[i] >= highs[i-1] for i in range(1, len(highs)))
    lower_lows = all(lows[i] <= lows[i-1] for i in range(1, len(lows)))
    
    if higher_highs and not lower_lows:
        return "TRENDING_UP"
    elif lower_lows and not higher_highs:
        return "TRENDING_DOWN"
    
    return "RANGING"
```

---

## Implementation Plan

### Phase 1: Core Logic (This Session)
- [ ] Add `detect_trend_continuation_setup()` function
- [ ] Add market regime detection
- [ ] Modify `generate_trade_signal()` to check both setup types
- [ ] Add `setup_type` field to signal response

### Phase 2: Target Refinement
- [ ] Implement ATR-based target calculation
- [ ] Add breakout level detection
- [ ] Refine entry zone calculation for continuations

### Phase 3: Testing & Validation
- [ ] Backtest on historical data
- [ ] Compare v1 vs v2 performance
- [ ] A/B test with real signals

### Phase 4: UI Updates
- [ ] Show setup type in TradeSignalCard
- [ ] Add setup type filter in Signal History
- [ ] Update Reliability Analytics with setup type breakdown

---

## Version Toggle

```python
# In server.py
SIGNAL_ENGINE_VERSION = os.environ.get("SIGNAL_ENGINE_VERSION", "v1")

# v1 = Original sweep reversal only (STABLE)
# v2 = Sweep reversal + Trend continuation (DEV)

def generate_trade_signal(lang="en"):
    if SIGNAL_ENGINE_VERSION == "v1":
        return generate_trade_signal_v1(lang)
    else:
        return generate_trade_signal_v2(lang)
```

---

## Risk Considerations

1. **Trend Continuation in Choppy Markets**
   - May produce more false signals in ranging conditions
   - Mitigated by market regime detection

2. **Double Signals**
   - Both setups might trigger simultaneously
   - Handled by setup selector priority logic

3. **Backward Compatibility**
   - v1 users should see no change
   - Version toggle ensures clean separation

---

## Success Metrics

| Metric | v1 Target | v2 Target |
|--------|-----------|-----------|
| Overall Win Rate | >30% | >40% |
| LONG Win Rate | >50% | >60% |
| SHORT Win Rate | >20% | >35% |
| Expired Rate | <50% | <40% |
| Avg PnL | >0% | >0.5% |
| Profit Factor | >1.0 | >1.5 |

---

## Next Steps

1. Implement `detect_trend_continuation_setup()` in server.py
2. Add version toggle mechanism
3. Test with real market data
4. Compare performance v1 vs v2
5. Gradual rollout based on results
