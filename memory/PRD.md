# CryptoRadar v1.6 - Product Requirements Document

## Original Problem Statement
Build CryptoRadar - a professional BTC market intelligence dashboard that reads multiple market signals and summarizes the market situation for Bitcoin.

## Architecture
- **Frontend**: React 18 with TailwindCSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Data Sources**: 
  - Kraken, Coinbase, Bitstamp (multi-exchange order books)
  - CryptoCompare (news)
  - CoinGlass (Open Interest, Liquidations)
- **Chart**: TradingView Lightweight Charts v5.1
- **Real-time**: WebSocket for live price streaming

## 🎯 TRADE SIGNAL MODULE (v1.6 Enhanced)

The centerpiece of CryptoRadar - synthesizes ALL intelligence into one actionable signal with realistic BTC trading logic.

### Signal Output
| Field | Description |
|-------|-------------|
| direction | LONG / SHORT / NO TRADE |
| confidence | 0-100% |
| estimated_move | Expected % to target |
| entry_zone | Low-High range |
| stop_loss | Smart stop (beyond sweep zone) |
| target_1, target_2 | Price targets |
| risk_reward_ratio | Calculated R:R |
| setup_type | standard / sweep_reversal / continuation |
| liquidity_sweep_zone | Where stop hunts likely occur |
| safe_invalidation | True invalidation level |
| sweep_detected | Boolean |
| sweep_analysis | Explanation of sweep context |
| reasoning | Detailed signal explanation |
| warnings | Risk warnings list |

### Enhanced BTC Trading Logic (v1.6)

#### 1. Minimum Move Filter
- **Threshold**: 0.50%
- If estimated move < 0.50%, signal is NO TRADE
- Prevents trading insignificant moves

#### 2. Smart Stop Loss Placement
- Stops placed BEYOND liquidity sweep zones
- NOT at obvious support/resistance
- Buffer: 0.3% beyond obvious levels
- Uses second S/R level for true invalidation

#### 3. Liquidity Sweep Detection
- Detects when price approaches key levels
- Identifies potential sweep-then-reversal setups
- Requires confluence (bias + sweep + reaction)
- Only signals reversal when confirmation present

#### 4. Setup Type Classification
| Type | Description |
|------|-------------|
| **standard** | Direct entry based on factor alignment |
| **sweep_reversal** | Wait for sweep, then enter on reclaim |
| **continuation** | Trend continuation move |

#### 5. NO TRADE Conditions
- Mixed factors (score between -3 and +3)
- Move too small (< 0.50%)
- Stop too vulnerable to sweep
- No clear setup type

### Factor Scoring System (7 Factors)
| Factor | Max Score | Description |
|--------|-----------|-------------|
| Market Bias | +/-3 | Order book imbalance, trend, RSI |
| Liquidity Direction | +/-2 | Multi-exchange aggregation |
| Exchange Consensus | +/-2 | Per-exchange bias agreement |
| Funding Rate | +/-1 | Sentiment from liquidations |
| Open Interest | +/-1 | Trend confirmation |
| Pattern Signals | +/-2 | Chart pattern detection |
| Whale Alerts | +/-1 | Volume/imbalance signals |

**Total Range**: -12 to +12
**Thresholds**: LONG ≥ +4, SHORT ≤ -4, else NO TRADE

## Other Intelligence Modules

### Market Bias Engine
- Multi-exchange order book analysis
- Exchange consensus per exchange
- Next target calculation

### Open Interest (CoinGlass)
- Total OI with 1H/4H/24H changes
- Trend indicator

### Funding Rate (CoinGlass)
- Current rate and annualized
- Payer identification
- Overcrowded warnings

### Liquidity Direction (Multi-Exchange)
- Direction with explanation
- Exchange Depth comparison
- Cluster explanations

### Support & Resistance (Multi-Exchange)
- Price pivots with explanations
- Volume at level
- Exchange information

### Whale Alerts
- Volume spikes
- Order book imbalances
- Stop loss, R/R ratio

### Pattern Detection
- Chart patterns with strength
- Stop loss levels
- Explanations

## Version History

### v1.0 - Basic Dashboard
### v1.1 - Real Data Integration
### v1.2 - Intelligence Enhancement
### v1.3 - CoinGlass Integration
### v1.4 - Multi-Exchange Aggregation
### v1.5 - Trade Signal Module
### v1.6 - Enhanced Trade Signal (December 2025)
- ✅ Minimum 0.50% move filter
- ✅ Smart stop loss beyond sweep zones
- ✅ Liquidity sweep detection
- ✅ Setup type classification
- ✅ Enhanced NO TRADE conditions
- ✅ 100% test pass rate (18 backend + all UI)

## API Keys
- CoinGlass: `858c52fb63b04008ab6633a913c32c7d`
- Kraken, Coinbase, Bitstamp: Public APIs

## P1 - Next Tasks
1. Telegram notification backend
2. Price alert monitoring

## P2 - Future Tasks
1. Multi-language support
2. Learn Mode content

## Test Reports
- `/app/test_reports/iteration_7.json` - Enhanced Trade Signal (100% pass)
