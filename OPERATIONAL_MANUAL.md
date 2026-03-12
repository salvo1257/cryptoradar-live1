# CryptoRadar Operational Manual
## Trader's Guide to BTC Market Intelligence

**Version:** 1.7  
**Core Timeframe:** 4H (4-Hour)  
**Last Updated:** December 2025

---

## Table of Contents

1. [Introduction](#introduction)
2. [Understanding the Trade Signal](#understanding-the-trade-signal)
3. [Intelligence Modules Explained](#intelligence-modules-explained)
4. [Reading a Complete Signal](#reading-a-complete-signal)
5. [Action Guidelines](#action-guidelines)
6. [The 4H Timeframe](#the-4h-timeframe)
7. [Risk Management](#risk-management)

---

## Introduction

CryptoRadar is a professional BTC market intelligence system designed to analyze multiple market signals and synthesize them into actionable trading recommendations. The system operates on the **4-hour (4H) timeframe**, making it suitable for swing trading and position management.

### What CryptoRadar Does

- Aggregates order book data from **3 exchanges** (Kraken, Coinbase, Bitstamp)
- Analyzes derivatives data from **CoinGlass** (Open Interest, Funding Rate, Liquidations)
- Detects institutional (whale) activity patterns
- Maps liquidity levels above and below current price
- Produces a final **LONG / SHORT / NO TRADE** recommendation

### What CryptoRadar Does NOT Do

- Execute trades automatically (manual execution required)
- Guarantee profitable trades (all trading involves risk)
- Replace fundamental analysis or news awareness
- Work for timeframes other than 4H without adjustment

---

## Understanding the Trade Signal

The **Trade Signal** is the central output of CryptoRadar. It synthesizes all intelligence modules into one actionable recommendation.

### Signal Directions

| Direction | Meaning | Action |
|-----------|---------|--------|
| **LONG** | Bullish setup detected | Consider entering a long position |
| **SHORT** | Bearish setup detected | Consider entering a short position |
| **NO TRADE** | Insufficient edge | Stay flat, wait for clearer setup |

### Confidence Percentage

The **Confidence %** indicates how strongly the factors align in one direction.

| Confidence | Interpretation |
|------------|----------------|
| **80-95%** | Strong alignment - high conviction setup |
| **65-79%** | Moderate alignment - acceptable setup |
| **50-64%** | Weak alignment - proceed with caution |
| **Below 50%** | Very weak - typically NO TRADE |

**Important:** High confidence does NOT guarantee the trade will work. It indicates factor alignment, not prediction accuracy.

### Entry Zone Calculation

The **Entry Zone** provides a price range for position entry:

- **For LONG signals:**
  - Entry Zone Low = Nearest support level
  - Entry Zone High = Current price
  - *Interpretation:* Look to enter between the support and current price

- **For SHORT signals:**
  - Entry Zone Low = Current price
  - Entry Zone High = Nearest resistance level
  - *Interpretation:* Look to enter between current price and resistance

### Stop Loss Placement (Smart Stop / Sweep Protection)

CryptoRadar uses **smart stop loss placement** designed to survive liquidity sweeps:

#### The Problem with Obvious Stops
Most traders place stops just below support (for longs) or above resistance (for shorts). Market makers know this and often "sweep" these levels before the real move.

#### CryptoRadar's Solution
1. **Identify the obvious stop zone** - where most traders have stops
2. **Calculate the sweep zone** - 0.3% beyond the obvious level
3. **Place stop beyond the sweep zone** - using the second S/R level as true invalidation

**Example (LONG):**
```
Current Price:     $70,000
First Support:     $69,500 (obvious stop zone)
Sweep Zone:        $69,291 (0.3% below first support)
Second Support:    $68,800
Smart Stop:        $68,456 (0.5% below second support)
```

This approach means:
- Your stop survives most liquidity sweeps
- You only exit when the structure truly breaks
- Wider stops require smaller position sizes

### Target Calculation

Targets are based on the next significant resistance (for longs) or support (for shorts):

- **Target 1:** First major level in the direction of the trade
- **Target 2:** Second major level (for scaling out)

The **Risk/Reward Ratio** is calculated as:
```
R:R = (Target 1 - Entry) / (Entry - Stop Loss)
```

| R:R Ratio | Quality |
|-----------|---------|
| ≥ 2.0:1 | Good - favorable risk/reward |
| 1.5-2.0:1 | Acceptable - proceed with discipline |
| < 1.5:1 | Poor - reconsider or skip |

### Minimum Move Filter (≥ 0.50%)

CryptoRadar will NOT generate a LONG or SHORT signal if the expected move to Target 1 is less than **0.50%**.

**Why this matters:**
- BTC commonly moves 0.3-0.5% on noise alone
- After fees and slippage, sub-0.5% moves rarely profit
- This filter prevents "trading noise"

**If you see:** "Move too small: 0.35% < 0.50% minimum"  
**Meaning:** The setup might be technically valid, but the potential reward doesn't justify the risk.

---

## Intelligence Modules Explained

### Market Bias

**What it measures:** Overall market sentiment based on order book imbalance and recent price action.

| Bias | Meaning |
|------|---------|
| BULLISH | More buying pressure than selling |
| BEARISH | More selling pressure than buying |
| NEUTRAL | Balanced or indecisive market |

**Key Metrics:**
- **Confidence %** - Strength of the bias
- **Exchange Consensus** - Per-exchange breakdown (Kraken/Coinbase/Bitstamp)
- **Next Target** - Price level the bias points toward

**How to use:**
- BULLISH bias supports LONG signals
- BEARISH bias supports SHORT signals
- NEUTRAL suggests waiting or expecting chop

### Liquidity Direction

**What it measures:** Where price is likely to move based on liquidity distribution.

| Direction | Meaning |
|-----------|---------|
| UP | More liquidity above - price attracted upward |
| DOWN | More liquidity below - price attracted downward |
| BALANCED | Similar liquidity both sides |

**Key Metrics:**
- **Imbalance Ratio** - Ratio of bid vs ask depth
- **Next Target** - The liquidity pool price is seeking

**Principle:** Price tends to seek liquidity. If there's significantly more liquidity above, price often moves up to "fill" that liquidity before reversing.

### Liquidity Ladder

**What it measures:** The sequence of liquidity levels above and below current price.

**Components:**
- **Levels Above** - Resistance/sell liquidity levels ranked by distance
- **Levels Below** - Support/buy liquidity levels ranked by distance
- **More Attractive Side** - Which side has more liquidity to sweep
- **Sweep Expectation** - Predicted sweep direction before the real move

| Sweep Expectation | Meaning |
|-------------------|---------|
| sweep_above_first | Price likely to spike up before moving down |
| sweep_below_first | Price likely to dip down before moving up |
| no_clear_sweep | No obvious sweep setup |
| balanced | Equal liquidity distribution |

**How to use:**
- If expecting "sweep_below_first" and you want to go LONG, wait for the sweep before entering
- The sweep expectation helps with entry timing

### Whale Activity

**What it measures:** Institutional or large trader activity based on volume, order book, and liquidation data.

| Direction | Meaning |
|-----------|---------|
| BUY | Large players are accumulating |
| SELL | Large players are distributing |
| NEUTRAL | No clear institutional bias |

**Key Indicators:**
- **Strength %** - How strong the whale activity is (0-100)
- **Buy Pressure** - Score of buying signals (0-100)
- **Sell Pressure** - Score of selling signals (0-100)
- **Volume Spike** - Whether current volume is 2.5x+ average
- **Liquidation Bias** - Whether longs or shorts are being liquidated
- **Order Book Aggression** - Aggressive buying or selling in the order book

**Detected Signals Examples:**
- "Large bullish volume (3.2x average)"
- "Heavy buy-side order book (25.3% imbalance)"
- "Heavy short liquidations (72% of total)"
- "4 large bid walls detected"

**How to use:**
- Whale BUY during a LONG signal = confirmation
- Whale SELL during a LONG signal = caution
- Volume spike + direction alignment = stronger conviction

### Order Book Imbalance

**What it measures:** The balance between buy orders (bids) and sell orders (asks) across all exchanges.

**Calculation:**
```
Imbalance % = (Bid Depth - Ask Depth) / (Bid Depth + Ask Depth) × 100
```

| Imbalance | Interpretation |
|-----------|----------------|
| > +20% | Heavy buy-side - bullish |
| +10% to +20% | Moderate buy-side |
| -10% to +10% | Balanced |
| -10% to -20% | Moderate sell-side |
| < -20% | Heavy sell-side - bearish |

### Open Interest (CoinGlass)

**What it measures:** Total value of outstanding futures contracts.

**Trends:**
| OI Trend | With Rising Price | With Falling Price |
|----------|-------------------|-------------------|
| Increasing | New longs entering (bullish) | New shorts entering (bearish) |
| Decreasing | Longs taking profit | Shorts covering |
| Stable | Consolidation | Consolidation |

**Key Metrics:**
- **Total OI** - Current open interest in USD
- **1H/4H/24H Change** - Recent OI changes
- **Exchange Distribution** - OI breakdown by exchange

### Funding Rate (CoinGlass)

**What it measures:** The periodic payment between long and short traders in perpetual futures.

| Funding Rate | Payer | Market Sentiment |
|--------------|-------|------------------|
| Positive | Longs pay shorts | Bullish (longs crowded) |
| Negative | Shorts pay longs | Bearish (shorts crowded) |
| Near zero | Balanced | Neutral |

**Extreme Readings:**
- **Highly positive (>0.05%)** - Longs overcrowded, potential squeeze DOWN
- **Highly negative (<-0.05%)** - Shorts overcrowded, potential squeeze UP

**How to use:**
- Extreme funding often precedes reversals
- CryptoRadar flags "overcrowded" conditions as warnings

### Support & Resistance

**What it measures:** Key price levels where buying or selling pressure has historically occurred.

**Level Types:**
| Type | Source | Reliability |
|------|--------|-------------|
| 4H | Price pivot detection | Historical price reaction |
| Multi-Exchange | Order book walls | Current liquidity |

**Strength Ratings:**
| Strength | Meaning |
|----------|---------|
| Strong | Multiple touches, high volume |
| Moderate | Some history or moderate volume |
| Weak | Single touch, may break easily |

**How to use:**
- Strong support = good level for LONG entries
- Strong resistance = good level for SHORT entries
- Weak levels may break on first test

### Pattern Detection

**What it measures:** Chart patterns that suggest future price direction.

**Current Status:** Simplified pivot-based detection (not ML-based)

**Pattern Types:**
- Double Top/Bottom
- Higher Highs / Lower Lows
- Range Breakouts

**Note:** Pattern detection is the least reliable module. Use as supplementary confirmation only.

---

## Reading a Complete Signal

### Example Signal Analysis

```
═══════════════════════════════════════════════════
TRADE SIGNAL: LONG
═══════════════════════════════════════════════════

Direction:        LONG
Confidence:       72%
Setup Type:       SWEEP_REVERSAL
Estimated Move:   +2.35%

Entry Zone:       $69,200 - $69,450
Smart Stop:       $68,150
Target 1:         $71,000
Target 2:         $72,500
Risk/Reward:      2.4:1

LIQUIDITY SWEEP ZONE:
Stop Hunt Zone:   $69,050
Safe Invalidation: $68,150

FACTORS:
• Market Bias: BULLISH (+3/3)
• Liquidity: UP (+2/2)
• Exchange Consensus: 3/3 bullish (+2/2)
• Funding Rate: Neutral (0/1)
• Open Interest: Increasing (+1/1)
• Patterns: Higher Low detected (+1/2)
• Whale Activity: BUY (+2/2)
• Liquidity Ladder: Below (+1/1)

Total Score: +12/15

REASONING:
Strong bullish alignment across factors. Price approaching
$69,200 support with heavy bid liquidity. Sweep expected
to $69,050 before continuation higher. Wait for price to
reclaim $69,200 after sweep for confirmation entry.

WARNINGS:
⚠️ Sweep expected: Price may dip to $69,050 before moving up
═══════════════════════════════════════════════════
```

### How to Interpret This Signal

1. **Direction is LONG** - Look for long entries
2. **72% confidence** - Moderate-to-good alignment
3. **Setup Type is SWEEP_REVERSAL** - Don't enter immediately; wait for the sweep
4. **Entry Zone $69,200-$69,450** - Look to buy in this range AFTER the sweep
5. **Stop at $68,150** - This is beyond the sweep zone for safety
6. **Targets at $71,000 and $72,500** - Take profit levels
7. **R:R of 2.4:1** - Good risk/reward
8. **Sweep warning** - Expect price to dip to $69,050 first

### Execution Plan
1. Set alerts at $69,050 (sweep zone)
2. Wait for price to sweep below $69,200
3. Enter when price reclaims $69,200
4. Stop loss at $68,150
5. Take partial profit at $71,000
6. Trail remainder to $72,500

---

## Action Guidelines

### When Signal Shows: LONG

**Do:**
- Identify the entry zone
- Note the sweep warning if present
- Calculate position size based on stop distance
- Set alerts for entry and stop levels
- Wait for entry confirmation if sweep expected

**Don't:**
- Enter immediately without checking sweep expectation
- Use a tighter stop than recommended (sweep risk)
- Over-leverage based on high confidence

### When Signal Shows: SHORT

**Do:**
- Same process as LONG but inverted
- Pay attention to funding rate (shorts crowded = squeeze risk)
- Note that BTC has a long-term bullish bias (shorts are counter-trend)

**Don't:**
- Short into oversold conditions
- Ignore short squeeze warnings
- Hold shorts through high volume bullish candles

### When Signal Shows: NO TRADE

**Do:**
- Stay flat and preserve capital
- Review why there's no signal (mixed factors? small move?)
- Set alerts for when conditions change
- Use the time to analyze the market without pressure

**Don't:**
- Force a trade because you're bored
- Override the system with your own bias
- Assume NO TRADE means "nothing is happening"

### When Signal Shows: Sweep Expected

**What it means:** Price is likely to trigger stop losses at an obvious level before the real move.

**Do:**
- Wait for the sweep to complete
- Enter after price reclaims the level
- Use the smart stop (beyond sweep zone)

**Don't:**
- Enter before the sweep
- Place stops at obvious levels
- Panic if price sweeps your intended entry

### When Signal Shows: High Trap Risk

**What it means:** The setup might be a false signal designed to trap traders.

**Do:**
- Reduce position size
- Use wider stops
- Wait for additional confirmation
- Consider skipping the trade entirely

**Don't:**
- Ignore the warning
- Go full size
- Place stops at obvious levels

---

## The 4H Timeframe

### Why 4H?

CryptoRadar is calibrated for the **4-hour timeframe** because:

1. **Noise Reduction** - 4H candles filter out intraday noise
2. **Meaningful Moves** - 4H levels represent significant market structure
3. **Manageable Monitoring** - Only need to check every 4 hours
4. **Swing Trading** - Suitable for holding positions for days to weeks
5. **Bot-Ready** - Signals change slowly enough for automation

### Signal Validity

Each trade signal is valid for approximately **4 hours** (until the next 4H candle closes).

**Check Timing:**
- New 4H candle: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC
- Best to evaluate signals shortly after a new candle opens

### When NOT to Use 4H Signals

- **Scalping** - Use 15m or 1H instead (not recommended with CryptoRadar)
- **Day Trading** - 4H is too slow
- **News Events** - Suspend trading during high-impact news
- **Low Liquidity Periods** - Weekend signals are less reliable

---

## Risk Management

### Position Sizing

**Never risk more than 1-2% of your account on a single trade.**

Formula:
```
Position Size = (Account × Risk %) / (Entry - Stop Loss)

Example:
Account:    $10,000
Risk:       1% ($100)
Entry:      $70,000
Stop:       $68,500 (2.14% away)

Position = $100 / ($70,000 - $68,500)
Position = $100 / $1,500
Position = 0.067 BTC ($4,690 at $70,000)
```

### Maximum Exposure

- **Single trade:** Max 1-2% account risk
- **Total open risk:** Max 5% across all positions
- **Correlation:** BTC trades are 100% correlated - don't stack

### Stop Loss Discipline

- **Always use stops** - No exceptions
- **Use the smart stop** - Don't move it closer
- **Accept losses** - They are part of trading

### When to Override the System

**Almost never.** The few exceptions:

1. **Major news event** - Fed decision, ETF ruling, hack
2. **Exchange issues** - Data feed problems, exchange down
3. **Extreme market conditions** - Flash crash, 50%+ daily move

Even in these cases, the safer action is to close positions and wait rather than trade against the system.

---

## Quick Reference Card

```
╔═══════════════════════════════════════════════════════════════╗
║                    CRYPTORADAR QUICK REFERENCE                ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  SIGNAL ACTIONS:                                              ║
║  • LONG + High Conf + Good R:R = Strong buy setup             ║
║  • SHORT + High Conf + Good R:R = Strong sell setup           ║
║  • NO TRADE = Wait, preserve capital                          ║
║                                                               ║
║  ENTRY RULES:                                                 ║
║  • Check sweep expectation before entering                    ║
║  • Enter in the entry zone, not at extremes                   ║
║  • If sweep expected, wait for reclaim confirmation           ║
║                                                               ║
║  STOP RULES:                                                  ║
║  • Use the smart stop (beyond sweep zone)                     ║
║  • Never move stop closer                                     ║
║  • Accept stop-outs as cost of business                       ║
║                                                               ║
║  PROFIT RULES:                                                ║
║  • Take partial at Target 1                                   ║
║  • Trail remainder to Target 2                                ║
║  • Don't get greedy beyond Target 2                           ║
║                                                               ║
║  RISK RULES:                                                  ║
║  • Max 1-2% per trade                                         ║
║  • Max 5% total exposure                                      ║
║  • Calculate size BEFORE entering                             ║
║                                                               ║
║  TIMEFRAME: 4H - Check signals every 4 hours                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

*Document Version: 1.7*  
*System: CryptoRadar BTC Intelligence*  
*Disclaimer: Trading involves substantial risk. Past performance does not guarantee future results. Use this system as one input in your trading decisions, not as the sole basis for trading.*
