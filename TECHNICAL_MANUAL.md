# CryptoRadar Technical Intelligence Manual
## System Architecture & Logic Documentation

**Version:** 1.7  
**Core Timeframe:** 4H (240 minutes)  
**Last Updated:** December 2025

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Data Pipeline](#data-pipeline)
3. [Trade Signal Scoring System](#trade-signal-scoring-system)
4. [Intelligence Modules](#intelligence-modules)
5. [Signal Generation Logic](#signal-generation-logic)
6. [API Reference](#api-reference)
7. [Bot Integration Guide](#bot-integration-guide)

---

## System Overview

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                              │
├─────────────────────────────────────────────────────────────────┤
│  Kraken API    │  Coinbase API  │  Bitstamp API  │  CoinGlass   │
│  (Price, OB,   │  (Order Book)  │  (Order Book)  │  (OI, FR,    │
│   Candles)     │                │                │   Liq)       │
└───────┬────────┴───────┬────────┴───────┬────────┴──────┬───────┘
        │                │                │               │
        └────────────────┼────────────────┼───────────────┘
                         │                │
                         ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AGGREGATION LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  • Order Book Aggregation (3 exchanges)                         │
│  • Volume-weighted bid/ask depths                               │
│  • Per-exchange statistics                                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   INTELLIGENCE ENGINES                           │
├─────────────────────────────────────────────────────────────────┤
│  Market Bias    │  Whale Activity  │  Liquidity    │  S/R       │
│  Engine         │  Engine          │  Ladder       │  Engine    │
│                 │                  │               │            │
│  OI Analysis    │  Funding Rate    │  Pattern      │  Liquidity │
│  Engine         │  Analysis        │  Detection    │  Clusters  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TRADE SIGNAL GENERATOR                           │
├─────────────────────────────────────────────────────────────────┤
│  • Factor Scoring (-15 to +15)                                  │
│  • Direction Determination (LONG/SHORT/NO TRADE)                │
│  • Entry Zone Calculation                                       │
│  • Smart Stop Placement                                         │
│  • Target Calculation                                           │
│  • Sweep Detection                                              │
│  • Risk/Reward Analysis                                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OUTPUT: TradeSignal                         │
├─────────────────────────────────────────────────────────────────┤
│  {                                                               │
│    direction: "LONG" | "SHORT" | "NO TRADE",                    │
│    confidence: 0-100,                                           │
│    entry_zone_low, entry_zone_high,                             │
│    stop_loss, target_1, target_2,                               │
│    risk_reward_ratio, reasoning, factors, warnings,             │
│    whale_activity, liquidity_ladder_summary,                    │
│    sweep_detected, sweep_analysis, setup_type                   │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology |
|-----------|------------|
| Backend | FastAPI (Python 3.11+) |
| Frontend | React 18, TailwindCSS, Shadcn/UI |
| Database | MongoDB (alerts storage) |
| Charts | TradingView Lightweight Charts v5.1 |
| HTTP Client | httpx (async) |
| Data Models | Pydantic v2 |

---

## Data Pipeline

### Exchange Data Fetching

#### Kraken API (Primary)
```python
# Ticker Data
GET https://api.kraken.com/0/public/Ticker?pair=XBTUSD

# OHLC Data (4H = 240 minutes)
GET https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=240

# Order Book
GET https://api.kraken.com/0/public/Depth?pair=XBTUSD&count=100
```

#### Coinbase API
```python
# Order Book
GET https://api.exchange.coinbase.com/products/BTC-USD/book?level=2
```

#### Bitstamp API
```python
# Order Book
GET https://www.bitstamp.net/api/v2/order_book/btcusd/
```

#### CoinGlass API
```python
# Open Interest
GET https://open-api-v3.coinglass.com/api/futures/openInterest/chart?symbol=BTC
Headers: {"coinglassSecret": API_KEY}

# Funding Rate
GET https://open-api-v3.coinglass.com/api/futures/funding-rate/info?symbol=BTC

# Liquidations
GET https://open-api-v3.coinglass.com/api/futures/liquidation/detail?symbol=BTC
```

### Order Book Aggregation

The system aggregates order books from 3 exchanges into a unified view:

```python
def aggregate_orderbooks(kraken_ob, coinbase_ob, bitstamp_ob):
    # Combine all bids
    all_bids = []
    for exchange, ob in [("Kraken", kraken_ob), ...]:
        for price, qty in ob["bids"]:
            all_bids.append((float(price), float(qty), exchange))
    
    # Sort by price (highest first)
    all_bids.sort(key=lambda x: x[0], reverse=True)
    
    # Merge bids at same price levels
    merged_bids = merge_by_price(all_bids, tolerance=0.01%)
    
    # Same for asks (lowest first)
    all_asks.sort(key=lambda x: x[0])
    merged_asks = merge_by_price(all_asks, tolerance=0.01%)
    
    return {
        "bids": merged_bids[:100],
        "asks": merged_asks[:100],
        "total_bid_depth": sum(p * q for p, q, _ in merged_bids[:100]),
        "total_ask_depth": sum(p * q for p, q, _ in merged_asks[:100]),
        "exchanges_active": ["Kraken", "Coinbase", "Bitstamp"],
        "exchange_stats": per_exchange_breakdown
    }
```

---

## Trade Signal Scoring System

### Factor Weights

The Trade Signal is determined by a **9-factor scoring system**:

| Factor | Max Score | Scoring Logic |
|--------|-----------|---------------|
| Market Bias | ±3 | +3 if BULLISH ≥70% conf, +2 if ≥55%, +1 otherwise |
| Liquidity Direction | ±2 | +2 if UP with imbalance >1.5, +1 otherwise |
| Exchange Consensus | ±2 | +2 if all exchanges agree, +1 if majority |
| Funding Rate | ±1 | +1 bullish, -1 bearish, ±1 overcrowded bonus |
| Open Interest | ±1 | +1 if increasing with trend |
| Pattern Signals | ±2 | +1 per bullish pattern (max 2) |
| Whale Alerts (legacy) | ±1 | +1 if more long signals than short |
| Whale Activity Engine | ±2 | +2 if BUY ≥70% strength, +1 if ≥40% |
| Liquidity Ladder | ±1 | +1 if more_attractive_side aligns with score |

**Total Range:** -15 to +15

### Direction Thresholds

```python
if score >= 4:
    direction = "LONG"
elif score <= -4:
    direction = "SHORT"
else:
    direction = "NO TRADE"
```

### Confidence Calculation

```python
max_score = 15
raw_confidence = (abs(score) / max_score) * 100

# Alignment bonus: % of non-zero factors that agree with direction
aligned_factors = count(factors where sign(factor.score) == sign(total_score))
total_factors = count(factors where score != 0)
alignment_bonus = (aligned_factors / total_factors) * 15

confidence = min(95, raw_confidence + alignment_bonus)

# Sweep detection bonus
if sweep_detected and setup_type == "sweep_reversal":
    confidence = min(95, confidence + 5)

# NO TRADE confidence penalty
if direction == "NO TRADE":
    confidence = max(30, 60 - abs(score) * 5)
```

---

## Intelligence Modules

### Market Bias Engine

**Purpose:** Determine overall market sentiment from order book and price action.

**Inputs:**
- 4H candle data (200 candles)
- Aggregated order book

**Algorithm:**
```python
def calculate_market_bias(candles, orderbook):
    # 1. Order Book Imbalance
    bid_depth = sum(price * qty for price, qty in bids[:30])
    ask_depth = sum(price * qty for price, qty in asks[:30])
    imbalance = (bid_depth - ask_depth) / (bid_depth + ask_depth) * 100
    
    # 2. Price Momentum (recent candles)
    close_5 = average(last 5 closes)
    close_20 = average(last 20 closes)
    momentum = (close_5 - close_20) / close_20 * 100
    
    # 3. RSI Calculation
    gains = [max(0, close[i] - close[i-1]) for i in range(14)]
    losses = [max(0, close[i-1] - close[i]) for i in range(14)]
    rsi = 100 - (100 / (1 + avg(gains) / avg(losses)))
    
    # 4. Determine Bias
    bias_score = 0
    if imbalance > 10: bias_score += 2
    elif imbalance > 5: bias_score += 1
    if momentum > 1: bias_score += 1
    if rsi > 55: bias_score += 1
    # (inverse for negative values)
    
    if bias_score >= 3:
        return "BULLISH", confidence
    elif bias_score <= -3:
        return "BEARISH", confidence
    else:
        return "NEUTRAL", confidence
```

**Output:** `MarketBias` object with bias, confidence, estimated_move, trap_risk, squeeze_probability

### Whale Activity Engine

**Purpose:** Detect institutional/large trader activity.

**Inputs:**
- 4H candle data (volume analysis)
- Aggregated order book (pressure analysis)
- CoinGlass liquidation data
- Open interest data

**Algorithm:**
```python
def analyze_whale_activity(candles, orderbook, liquidations, oi_data):
    buy_pressure = 0
    sell_pressure = 0
    signals = []
    
    # 1. Volume Spike Detection
    avg_volume = average(volumes[-20:])
    current_volume = volumes[-1]
    volume_ratio = current_volume / avg_volume
    
    if volume_ratio >= 2.5:
        volume_spike = True
        if candle_is_bullish:
            buy_pressure += 25
            signals.append(f"Large bullish volume ({volume_ratio:.1f}x)")
        else:
            sell_pressure += 25
    
    # 2. Order Book Pressure
    ob_imbalance = calculate_imbalance(orderbook)
    if ob_imbalance > 25:
        buy_pressure += 30
        orderbook_aggression = "aggressive_buying"
    elif ob_imbalance < -25:
        sell_pressure += 30
        orderbook_aggression = "aggressive_selling"
    
    # 3. Large Wall Detection
    avg_bid_volume = average(bid_volumes[:30])
    large_bid_walls = count(bids where qty > avg * 4)
    if large_bid_walls > 0:
        buy_pressure += 10
        signals.append(f"{large_bid_walls} large bid walls detected")
    
    # 4. Liquidation Analysis
    long_liq_ratio = long_liq_24h / (long_liq_24h + short_liq_24h)
    if long_liq_ratio > 0.65:
        sell_pressure += 20
        liquidation_bias = "longs_liquidated"
    elif long_liq_ratio < 0.35:
        buy_pressure += 20
        liquidation_bias = "shorts_liquidated"
    
    # 5. OI + Price Momentum
    if oi_change_1h > 0.5 and price_change > 0.2:
        buy_pressure += 15
        signals.append("Rising OI with bullish price")
    
    # 6. Determine Direction
    if buy_pressure > sell_pressure + 20:
        direction = "BUY"
    elif sell_pressure > buy_pressure + 20:
        direction = "SELL"
    else:
        direction = "NEUTRAL"
    
    return WhaleActivity(
        direction=direction,
        strength=min(100, buy_pressure + sell_pressure),
        buy_pressure=buy_pressure,
        sell_pressure=sell_pressure,
        signals=signals,
        ...
    )
```

### Liquidity Ladder

**Purpose:** Map the sequence of liquidity levels above and below current price.

**Inputs:**
- Support/Resistance levels
- Liquidity clusters
- Aggregated order book (whale orders)

**Algorithm:**
```python
def build_liquidity_ladder(current_price, sr_levels, clusters, orderbook):
    ladder_above = []
    ladder_below = []
    
    # 1. Add S/R Levels
    for level in sr_levels:
        distance = (level.price - current_price) / current_price * 100
        if level.price > current_price:
            ladder_above.append(LiquidityLevel(
                price=level.price,
                distance_percent=distance,
                strength=level.strength,
                type="resistance_liquidity" if level.timeframe == "Multi-Exchange" else "stop_cluster"
            ))
        else:
            ladder_below.append(...)
    
    # 2. Add Liquidity Clusters
    for cluster in clusters:
        # Check for duplicates (within 0.1%)
        if not is_duplicate(cluster, existing_levels):
            add_to_appropriate_ladder(cluster)
    
    # 3. Add Whale Orders ($500k+)
    for price, qty in orderbook["bids"][:50]:
        value = price * qty
        if value > 500_000 and price < current_price:
            ladder_below.append(LiquidityLevel(
                price=price,
                type="whale_level",
                strength="major" if value > 2_000_000 else "moderate",
                estimated_value=value
            ))
    
    # 4. Determine More Attractive Side
    above_total = sum(level.estimated_value for level in ladder_above)
    below_total = sum(level.estimated_value for level in ladder_below)
    
    if above_total > below_total * 1.5:
        more_attractive_side = "above"
    elif below_total > above_total * 1.5:
        more_attractive_side = "below"
    else:
        more_attractive_side = "balanced"
    
    # 5. Determine Sweep Expectation
    if more_attractive_side == "above" and nearest_above.distance < nearest_below.distance * 1.5:
        sweep_expectation = "sweep_above_first"
        path_analysis = f"Upper ladder stronger. Price likely to sweep ${nearest_above.price} before reversal."
    elif more_attractive_side == "below":
        sweep_expectation = "sweep_below_first"
        path_analysis = f"Lower ladder stronger. Price likely to sweep ${nearest_below.price} before reversal."
    
    return LiquidityLadder(...)
```

### Support & Resistance Engine

**Purpose:** Identify key price levels with buying/selling pressure.

**Algorithm:**
```python
MIN_LEVEL_DISTANCE_PCT = 0.3  # Minimum 0.3% between levels

def calculate_support_resistance(candles, current_price, orderbook):
    levels = []
    
    # 1. Pivot Detection (4H candles)
    for i in range(2, len(candles) - 2):
        # Pivot High (Resistance)
        if high[i] > high[i-1] and high[i] > high[i-2] and 
           high[i] > high[i+1] and high[i] > high[i+2]:
            touches = count_touches(high[i], all_highs, tolerance=0.5%)
            strength = "strong" if touches >= 3 else "moderate" if touches >= 2 else "weak"
            levels.append(SupportResistanceLevel(
                price=high[i],
                level_type="resistance",
                strength=strength,
                timeframe="4H"
            ))
        
        # Pivot Low (Support)
        if low[i] < low[i-1] ... (inverse logic)
    
    # 2. Order Book Walls
    avg_bid_vol = average(bid_volumes[:50])
    for price, vol in bids[:50]:
        if vol > avg_bid_vol * 2.5:  # Significant wall
            levels.append(SupportResistanceLevel(
                price=price,
                level_type="support",
                strength="strong" if vol > avg_bid_vol * 4 else "moderate",
                timeframe="Multi-Exchange",
                volume_at_level=price * vol
            ))
    
    # 3. Merge Close Levels (within 0.3%)
    levels_sorted = sorted(levels, key=lambda x: x.price)
    merged = []
    for level in levels_sorted:
        if merged and distance(level, merged[-1]) < MIN_LEVEL_DISTANCE_PCT:
            # Keep stronger level
            if level.strength > merged[-1].strength:
                merged[-1] = level
        else:
            merged.append(level)
    
    # 4. Return balanced levels (max 4 support, 4 resistance)
    return top_4_supports + top_4_resistances
```

---

## Signal Generation Logic

### Minimum Move Filter

```python
MINIMUM_MOVE_PERCENT = 0.50

def apply_minimum_move_filter(direction, estimated_move):
    if direction != "NO TRADE":
        if abs(estimated_move) < MINIMUM_MOVE_PERCENT:
            return "NO TRADE", f"Move too small ({abs(estimated_move):.2f}% < {MINIMUM_MOVE_PERCENT}%)"
    return direction, None
```

**Rationale:**
- BTC noise typically 0.3-0.5% in a 4H period
- After fees (0.05-0.1%) and slippage, sub-0.5% moves rarely profit
- Filter prevents "trading noise"

### Smart Stop Loss Placement

```python
LIQUIDITY_SWEEP_BUFFER = 0.003  # 0.3%

def calculate_smart_stop(direction, supports, resistances, current_price):
    if direction == "LONG":
        # Obvious stop = just below first support
        obvious_stop = supports[0].price
        
        # Sweep zone = 0.3% below obvious stop
        sweep_zone = obvious_stop * (1 - LIQUIDITY_SWEEP_BUFFER)
        
        # Safe invalidation = below second support
        if len(supports) > 1:
            safe_invalidation = supports[1].price * 0.995
        else:
            safe_invalidation = sweep_zone * 0.995
        
        stop_loss = safe_invalidation
        
    elif direction == "SHORT":
        obvious_stop = resistances[0].price
        sweep_zone = obvious_stop * (1 + LIQUIDITY_SWEEP_BUFFER)
        
        if len(resistances) > 1:
            safe_invalidation = resistances[1].price * 1.005
        else:
            safe_invalidation = sweep_zone * 1.005
        
        stop_loss = safe_invalidation
    
    return stop_loss, sweep_zone, safe_invalidation
```

**Visual Example (LONG):**
```
Price Level                    Significance
─────────────────────────────────────────────
$70,500                        Target 1
$70,000 ←──────────────────── Current Price
$69,800                        Entry Zone High
$69,500 ←──────────────────── First Support (obvious stop)
$69,291 ←──────────────────── Sweep Zone (0.3% below)
$68,800 ←──────────────────── Second Support
$68,456 ←──────────────────── Smart Stop (0.5% below 2nd support)
```

### Sweep Detection

```python
def detect_liquidity_sweep(current_price, supports, resistances, market_bias):
    nearest_support_dist = abs(supports[0].distance_percent) if supports else 100
    nearest_resistance_dist = abs(resistances[0].distance_percent) if resistances else 100
    
    sweep_detected = False
    setup_type = "standard"
    sweep_analysis = None
    
    # Approaching support with bullish bias = potential sweep & reversal up
    if nearest_support_dist < 0.5 and supports:
        if market_bias.bias == "BULLISH" and market_bias.confidence >= 60:
            sweep_detected = True
            setup_type = "sweep_reversal"
            sweep_analysis = f"Price approaching ${supports[0].price} support. " \
                           f"Likely sweep below before bullish reversal."
    
    # Approaching resistance with bearish bias = potential sweep & reversal down
    elif nearest_resistance_dist < 0.5 and resistances:
        if market_bias.bias == "BEARISH" and market_bias.confidence >= 60:
            sweep_detected = True
            setup_type = "sweep_reversal"
            sweep_analysis = f"Price approaching ${resistances[0].price} resistance. " \
                           f"Likely sweep above before bearish reversal."
    
    return sweep_detected, setup_type, sweep_analysis
```

### Target Calculation

```python
def calculate_targets(direction, current_price, supports, resistances):
    if direction == "LONG":
        target_1 = resistances[0].price if resistances else current_price * 1.02
        target_2 = resistances[1].price if len(resistances) > 1 else current_price * 1.04
        estimated_move = (target_1 - current_price) / current_price * 100
        
    elif direction == "SHORT":
        target_1 = supports[0].price if supports else current_price * 0.98
        target_2 = supports[1].price if len(supports) > 1 else current_price * 0.96
        estimated_move = (target_1 - current_price) / current_price * 100  # Negative
    
    return target_1, target_2, estimated_move
```

### Risk/Reward Calculation

```python
def calculate_risk_reward(entry, stop_loss, target_1):
    risk = abs(entry - stop_loss)
    reward = abs(target_1 - entry)
    
    if risk > 0:
        risk_reward_ratio = reward / risk
    else:
        risk_reward_ratio = 0
    
    return round(risk_reward_ratio, 2)
```

### Trap Risk Assessment

```python
def assess_trap_risk(market_bias, funding_rate, volume_ratio):
    trap_risk = "low"
    
    # High trap risk conditions:
    # 1. Extreme funding with opposite price action
    if funding_rate.overcrowded and volume_ratio < 1.2:
        trap_risk = "high"
    
    # 2. Weak bias with high squeeze probability
    if market_bias.confidence < 55 and market_bias.squeeze_probability > 60:
        trap_risk = "high"
    
    # 3. Recent failed breakout
    if recent_failed_breakout_detected():
        trap_risk = "high"
    
    return trap_risk
```

---

## API Reference

### Main Endpoints

#### GET /api/trade-signal
Returns the complete trade signal with all analysis.

**Response:**
```json
{
  "direction": "LONG",
  "confidence": 72.5,
  "estimated_move": 2.35,
  "entry_zone_low": 69200.00,
  "entry_zone_high": 69450.00,
  "stop_loss": 68150.00,
  "invalidation_reason": "True invalidation below $68,150...",
  "target_1": 71000.00,
  "target_2": 72500.00,
  "risk_reward_ratio": 2.4,
  "reasoning": "Strong bullish alignment...",
  "factors": {
    "market_bias": {"bias": "BULLISH", "confidence": 75, "score": 3, "max": 3},
    "liquidity": {"direction": "UP", "score": 2, "max": 2},
    "exchange_consensus": {"description": "3/3 bullish", "score": 2, "max": 2},
    "funding_rate": {"rate": 0.01, "sentiment": "neutral", "score": 0, "max": 1},
    "open_interest": {"trend": "increasing", "score": 1, "max": 1},
    "patterns": {"count": 1, "score": 1, "max": 2},
    "whale_alerts": {"count": 2, "score": 1, "max": 1},
    "whale_engine": {"direction": "BUY", "strength": 65, "score": 2, "max": 2},
    "liquidity_ladder": {"more_attractive_side": "below", "score": 1, "max": 1}
  },
  "timestamp": "2025-12-12T12:00:00Z",
  "valid_for": "4H",
  "warnings": ["Sweep expected: Price may dip..."],
  "setup_type": "sweep_reversal",
  "liquidity_sweep_zone": 69050.00,
  "safe_invalidation": 68150.00,
  "sweep_detected": true,
  "sweep_analysis": "Price approaching $69,200 support...",
  "whale_activity": {
    "direction": "BUY",
    "strength": 65,
    "buy_pressure": 55,
    "sell_pressure": 10,
    "signals": ["Buy-side order book dominance (18%)"],
    "explanation": "Buy pressure detected..."
  },
  "liquidity_ladder_summary": {
    "current_price": 69400,
    "more_attractive_side": "below",
    "sweep_expectation": "sweep_below_first",
    "path_analysis": "Lower liquidity ladder stronger...",
    "nearest_above": {"price": 70100, "strength": "moderate"},
    "nearest_below": {"price": 69200, "strength": "strong"},
    "levels_above_count": 6,
    "levels_below_count": 7
  },
  "sweep_first_expected": true,
  "whale_confirms_direction": true
}
```

#### GET /api/market/bias?interval=4h
#### GET /api/support-resistance?interval=4h
#### GET /api/liquidity?interval=4h
#### GET /api/whale-alerts?interval=4h
#### GET /api/patterns?interval=4h
#### GET /api/open-interest
#### GET /api/funding-rate

---

## Bot Integration Guide

### Recommended Bot Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       TRADING BOT                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Scheduler  │───▶│  Signal      │───▶│  Position    │      │
│  │  (4H cron)   │    │  Fetcher     │    │  Manager     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                             │                    │               │
│                             ▼                    ▼               │
│                      GET /api/trade-signal       │               │
│                             │                    │               │
│                             ▼                    ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Risk       │◀───│  Decision    │───▶│  Execution   │      │
│  │  Manager     │    │  Engine      │    │  Engine      │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                  │               │
│                                                  ▼               │
│                                          Exchange API            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Signal Polling Strategy

```python
import asyncio
import httpx

CRYPTORADAR_API = "https://your-cryptoradar-instance.com/api"
POLL_INTERVAL = 300  # 5 minutes (check multiple times per 4H candle)

async def poll_signal():
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{CRYPTORADAR_API}/trade-signal")
        return response.json()

async def trading_loop():
    current_position = None
    last_signal_direction = None
    
    while True:
        signal = await poll_signal()
        
        # Only act on signal changes
        if signal["direction"] != last_signal_direction:
            last_signal_direction = signal["direction"]
            
            if signal["direction"] == "LONG" and signal["confidence"] >= 65:
                if current_position is None:
                    await enter_long(signal)
                    current_position = "LONG"
            
            elif signal["direction"] == "SHORT" and signal["confidence"] >= 65:
                if current_position is None:
                    await enter_short(signal)
                    current_position = "SHORT"
            
            elif signal["direction"] == "NO TRADE":
                if current_position is not None:
                    # Optionally close position on NO TRADE
                    # Or just wait for opposite signal
                    pass
        
        await asyncio.sleep(POLL_INTERVAL)
```

### Position Sizing Logic

```python
def calculate_position_size(account_balance, risk_percent, entry, stop_loss):
    """
    Calculate position size based on fixed risk percentage.
    
    Args:
        account_balance: Total account value in USD
        risk_percent: Risk per trade (e.g., 0.01 for 1%)
        entry: Entry price
        stop_loss: Stop loss price
    
    Returns:
        position_size_btc: BTC amount to trade
    """
    risk_amount = account_balance * risk_percent
    price_risk = abs(entry - stop_loss)
    position_size_btc = risk_amount / price_risk
    
    return position_size_btc
```

### Entry Logic with Sweep Handling

```python
async def enter_long(signal):
    if signal["sweep_first_expected"]:
        # Wait for sweep confirmation
        sweep_zone = signal["liquidity_sweep_zone"]
        entry_level = signal["entry_zone_low"]
        
        # Set alert for sweep zone touch
        await set_price_alert(sweep_zone, "sweep_touched")
        
        # Wait for sweep and reclaim
        await wait_for_condition(
            condition=lambda price: price < sweep_zone,
            timeout=4 * 60 * 60  # 4 hours max
        )
        
        # Wait for reclaim
        await wait_for_condition(
            condition=lambda price: price > entry_level,
            timeout=1 * 60 * 60  # 1 hour to reclaim
        )
        
        # Now enter
        await execute_market_order("BUY", position_size)
        await set_stop_loss(signal["stop_loss"])
        await set_take_profit(signal["target_1"])
    
    else:
        # Standard entry
        await execute_limit_order("BUY", signal["entry_zone_high"], position_size)
        await set_stop_loss(signal["stop_loss"])
        await set_take_profit(signal["target_1"])
```

### Monitoring & Alerts

```python
# Key signals to monitor for bot notifications

def should_alert(signal, previous_signal):
    alerts = []
    
    # Direction change
    if signal["direction"] != previous_signal["direction"]:
        alerts.append(f"DIRECTION CHANGE: {previous_signal['direction']} → {signal['direction']}")
    
    # Confidence change
    if abs(signal["confidence"] - previous_signal["confidence"]) > 10:
        alerts.append(f"CONFIDENCE SHIFT: {signal['confidence']:.0f}%")
    
    # New sweep detection
    if signal["sweep_detected"] and not previous_signal["sweep_detected"]:
        alerts.append(f"SWEEP DETECTED: {signal['sweep_analysis']}")
    
    # Whale activity change
    if signal["whale_activity"]["direction"] != previous_signal["whale_activity"]["direction"]:
        alerts.append(f"WHALE DIRECTION: {signal['whale_activity']['direction']}")
    
    return alerts
```

---

## Data Model Reference

### TradeSignal

```python
class TradeSignal(BaseModel):
    direction: str  # "LONG", "SHORT", "NO TRADE"
    confidence: float  # 0-100
    estimated_move: float  # Expected % move
    entry_zone_low: float
    entry_zone_high: float
    stop_loss: float
    invalidation_reason: str
    target_1: float
    target_2: float
    risk_reward_ratio: float
    reasoning: str
    factors: Dict[str, Any]
    timestamp: datetime
    valid_for: str  # "4H"
    warnings: List[str]
    setup_type: str  # "standard", "sweep_reversal", "continuation"
    liquidity_sweep_zone: Optional[float]
    safe_invalidation: Optional[float]
    sweep_detected: bool
    sweep_analysis: Optional[str]
    whale_activity: Optional[Dict[str, Any]]
    liquidity_ladder_summary: Optional[Dict[str, Any]]
    sweep_first_expected: bool
    whale_confirms_direction: bool
```

### WhaleActivity

```python
class WhaleActivity(BaseModel):
    direction: str  # "BUY", "SELL", "NEUTRAL"
    strength: float  # 0-100
    confidence: float  # 0-100
    signals: List[str]
    explanation: str
    volume_spike: bool
    volume_ratio: float
    buy_pressure: float  # 0-100
    sell_pressure: float  # 0-100
    liquidation_bias: Optional[str]  # "longs_liquidated", "shorts_liquidated"
    orderbook_aggression: Optional[str]  # "aggressive_buying", "aggressive_selling"
```

### LiquidityLadder

```python
class LiquidityLadder(BaseModel):
    current_price: float
    ladder_above: List[LiquidityLevel]
    ladder_below: List[LiquidityLevel]
    nearest_above: Optional[LiquidityLevel]
    nearest_below: Optional[LiquidityLevel]
    major_above: Optional[LiquidityLevel]
    major_below: Optional[LiquidityLevel]
    more_attractive_side: str  # "above", "below", "balanced"
    sweep_expectation: str  # "sweep_below_first", "sweep_above_first", "no_clear_sweep"
    path_analysis: str
```

---

*Document Version: 1.7*  
*System: CryptoRadar BTC Intelligence Engine*  
*For technical support: Refer to /app/backend/server.py for implementation details*
