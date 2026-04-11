# CryptoRadar V3.3 Intelligence Manual

**Version:** 3.3.0  
**Last Updated:** 2026-04-11

---

## Overview

CryptoRadar V3.3 introduces enhanced intelligence modules that integrate CoinGlass derivatives data to provide more accurate market analysis and target validation. This manual explains how each module works and how they connect together.

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
