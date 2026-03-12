# CryptoRadar v1.7 - Product Requirements Document

## Original Problem Statement
Build CryptoRadar - a professional BTC market intelligence dashboard that reads multiple market signals and summarizes the market situation for Bitcoin.

## Architecture
- **Frontend**: React 18 with TailwindCSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Data Sources**: 
  - Kraken, Coinbase, Bitstamp (multi-exchange order books)
  - CryptoCompare (news)
  - CoinGlass (Open Interest, Liquidations, Funding Rate)
- **Chart**: TradingView Lightweight Charts v5.1
- **Real-time**: WebSocket for live price streaming

## TRADE SIGNAL MODULE (v1.7 Enhanced with Whale & Liquidity Ladder)

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
| **whale_activity** | Whale Engine output (direction, strength, pressures) |
| **liquidity_ladder_summary** | Ladder output (path analysis, levels) |
| **whale_confirms_direction** | Boolean - whale confirms trade direction |
| **sweep_first_expected** | Boolean - expected sweep before move |
| reasoning | Detailed signal explanation |
| warnings | Risk warnings list |

### Factor Scoring System (9 Factors - v1.7)
| Factor | Max Score | Description |
|--------|-----------|-------------|
| Market Bias | +/-3 | Order book imbalance, trend, RSI |
| Liquidity Direction | +/-2 | Multi-exchange aggregation |
| Exchange Consensus | +/-2 | Per-exchange bias agreement |
| Funding Rate | +/-1 | Sentiment from liquidations |
| Open Interest | +/-1 | Trend confirmation |
| Pattern Signals | +/-2 | Chart pattern detection |
| Whale Alerts (legacy) | +/-1 | Volume/imbalance signals |
| **Whale Engine** | +/-2 | NEW: Volume spikes, OB pressure, liquidations |
| **Liquidity Ladder** | +/-1 | NEW: Path analysis for sweep direction |

**Total Range**: -15 to +15
**Thresholds**: LONG ≥ +4, SHORT ≤ -4, else NO TRADE

## NEW: Whale Activity Engine (v1.7)

Analyzes multiple whale indicators:
- **Volume Spikes**: Detects volume 1.5-2.5x+ average with bullish/bearish classification
- **Order Book Pressure**: Analyzes bid/ask depth imbalance, large walls
- **Liquidation Data**: CoinGlass long/short liquidation ratios
- **OI Momentum**: Rising OI with price direction confirmation

Output: `WhaleActivity` object with direction (BUY/SELL/NEUTRAL), strength, buy/sell pressure, explanation

## NEW: Liquidity Ladder (v1.7)

Shows sequence of liquidity levels above/below current price:
- **S/R Levels**: Support/resistance from price history
- **Liquidity Clusters**: Multi-exchange order book aggregation
- **Whale Levels**: Large single orders ($500k+)

Features:
- `more_attractive_side`: Where more liquidity exists (above/below/balanced)
- `sweep_expectation`: Predicted sweep direction before move
- `path_analysis`: Narrative explanation of likely price path
- Nearest and major levels above/below with strength ratings

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

### Pattern Detection (MOCKED)
- Chart patterns with strength
- Stop loss levels
- Explanations
- Note: Currently simplified/simulated logic

## Version History

### v1.0 - Basic Dashboard
### v1.1 - Real Data Integration
### v1.2 - Intelligence Enhancement
### v1.3 - CoinGlass Integration
### v1.4 - Multi-Exchange Aggregation
### v1.5 - Trade Signal Module
### v1.6 - Enhanced Trade Signal
- ✅ Minimum 0.50% move filter
- ✅ Smart stop loss beyond sweep zones
- ✅ Liquidity sweep detection
- ✅ Setup type classification

### v1.7 - Whale & Liquidity Ladder Integration (December 2025)
- ✅ Whale Activity Engine with multi-source analysis
- ✅ Liquidity Ladder with path analysis
- ✅ Integration into Trade Signal scoring (+3 max score range)
- ✅ Frontend display of whale activity and liquidity ladder
- ✅ CoinGlass liquidation data in whale engine
- ✅ 100% test pass rate (iteration_8.json)

## API Keys
- CoinGlass: `858c52fb63b04008ab6633a913c32c7d`
- Kraken, Coinbase, Bitstamp: Public APIs

## P1 - Next Tasks
1. Telegram notification backend logic
2. Price alert monitoring (background process)

## P2 - Future Tasks
1. Multi-language support (IT/DE translations)
2. Learn Mode content
3. Real Pattern Detection Engine (ML-based)

## Test Reports
- `/app/test_reports/iteration_8.json` - Whale & Liquidity Ladder v1.7 (100% pass)

## Key Files
- `/app/backend/server.py` - All backend logic
- `/app/frontend/src/components/cards/TradeSignalCard.js` - Trade signal UI
- `/app/frontend/src/contexts/AppContext.js` - Frontend state
