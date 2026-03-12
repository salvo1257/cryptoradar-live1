# CryptoRadar v1.5 - Product Requirements Document

## Original Problem Statement
Build CryptoRadar - a professional BTC market intelligence dashboard that reads multiple market signals and summarizes the market situation for Bitcoin.

## Architecture
- **Frontend**: React 18 with TailwindCSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Data Sources**: 
  - **Kraken API**: Market data, orderbook, OHLC
  - **Coinbase API**: Order book, ticker
  - **Bitstamp API**: Order book, ticker
  - **CryptoCompare API**: News
  - **CoinGlass API**: Open Interest, Funding Rate/Liquidations
- **Chart**: TradingView Lightweight Charts v5.1
- **Real-time**: WebSocket for live price streaming

## Core Intelligence Modules

### 🎯 TRADE SIGNAL (NEW v1.5) - Main Feature
The centerpiece of CryptoRadar - synthesizes ALL intelligence into one actionable signal.

**Output:**
- Direction: LONG / SHORT / NO TRADE
- Confidence: 0-100%
- Estimated Move: Expected % to target
- Entry Zone: Low-High range
- Stop Loss: Invalidation level
- Target 1 & Target 2: Price targets
- Risk/Reward Ratio: Calculated R:R
- Detailed Reasoning: Why this signal
- Warnings: Trap risk, squeeze risk, etc.

**Scoring System (7 Factors, -12 to +12 range):**
1. Market Bias (+/-3): Order book, trend, momentum
2. Liquidity Direction (+/-2): Multi-exchange aggregation
3. Exchange Consensus (+/-2): Per-exchange bias agreement
4. Funding Rate (+/-1): Sentiment from liquidations
5. Open Interest (+/-1): Trend confirmation
6. Pattern Signals (+/-2): Chart pattern detection
7. Whale Alerts (+/-1): Volume/imbalance signals

**Thresholds:**
- LONG: score >= 4
- SHORT: score <= -4
- NO TRADE: -3 to +3 (mixed signals)

### Market Bias Engine ✅
- Combines: order book imbalance, volume, RSI, trend
- Output: BULLISH/BEARISH/NEUTRAL with confidence %
- Exchange consensus per exchange
- Data Source: Aggregated (Kraken, Coinbase, Bitstamp)

### Open Interest Module ✅ (CoinGlass)
- Total OI (~$47B) with 1H/4H/24H changes
- Trend indicator (increasing/decreasing/stable)
- Data Source: CoinGlass API

### Funding Rate Module ✅ (CoinGlass)
- Current rate and annualized rate
- Payer identification (longs/shorts)
- Sentiment analysis
- Data Source: CoinGlass (Liquidation-derived)

### Liquidity Direction ✅ (Multi-Exchange)
- Direction: UP/DOWN/BALANCED
- Exchange Depth comparison per exchange
- Cluster explanations
- Data Source: Aggregated (Kraken, Coinbase, Bitstamp)

### Support & Resistance ✅ (Multi-Exchange)
- Price pivot detection with explanations
- Volume at level
- Exchange information
- Data Source: Aggregated (Kraken, Coinbase, Bitstamp)

### Whale Alerts ✅ (Enhanced)
- Volume spike detection
- Order book imbalance alerts
- Stop loss, Risk/Reward ratio
- Data Source: Aggregated exchanges

### Pattern Detection ✅ (Enhanced)
- Double Top/Bottom, Bull/Bear Flags, Triangles
- Pattern strength, stop loss, explanations
- Data Source: Kraken OHLC

### News Module ✅
- CryptoCompare integration
- Importance levels, sentiment analysis
- Data Source: CryptoCompare

## What's Been Implemented

### v1.0 - Basic Dashboard
- Chart, navigation, mock data

### v1.1 - Real Data Integration
- Kraken API for market data
- CryptoCompare for news
- WebSocket streaming

### v1.2 - Intelligence Enhancement
- Open Interest module
- Funding Rate module
- Enhanced Market Bias

### v1.3 - CoinGlass Integration
- Real Open Interest data
- Real Funding Rate from liquidations

### v1.4 - Multi-Exchange & Enhanced Cards
- Coinbase + Bitstamp APIs
- Multi-exchange aggregation
- Enhanced S/R, Liquidity, Whale, Pattern cards
- Per-exchange comparison endpoint

### v1.5 - Trade Signal Module (December 2025)
- ✅ Final actionable LONG/SHORT/NO TRADE signal
- ✅ Synthesizes all 7 intelligence factors
- ✅ Entry zone, stop loss, targets, R/R ratio
- ✅ Detailed reasoning with factor breakdown
- ✅ TradeSignalCard prominently displayed on dashboard
- ✅ 100% test pass rate (24 backend + all UI tests)

## API Endpoints

### Main Intelligence
- `GET /api/trade-signal` - Final actionable trading signal
- `GET /api/market/bias` - Market bias with exchange consensus
- `GET /api/liquidity` - Liquidity direction with exchange stats
- `GET /api/support-resistance` - S/R levels with explanations
- `GET /api/exchange-comparison` - Per-exchange comparison

### Market Data
- `GET /api/market/status` - Current price/status
- `GET /api/chart/candles` - OHLC data
- `GET /api/orderbook` - Aggregated order book

### Derivatives
- `GET /api/open-interest` - CoinGlass OI data
- `GET /api/funding-rate` - CoinGlass funding data

### Analysis
- `GET /api/patterns` - Chart patterns
- `GET /api/candlesticks` - Candlestick patterns
- `GET /api/whale-alerts` - Whale signals

## API Keys Used
- CoinGlass API: `858c52fb63b04008ab6633a913c32c7d` (Hobbyist plan)
- Kraken, Coinbase, Bitstamp: No API keys required (public endpoints)

## P1 - Next Tasks
1. Telegram notification backend logic
2. Active price alert monitoring system

## P2 - Future Tasks
1. Multi-language translations (IT/DE files)
2. Learn Mode content implementation

## Test Reports
- `/app/test_reports/iteration_6.json` - Trade Signal tests (100% pass)
- `/app/backend/tests/test_trade_signal.py` - Trade signal test suite

## Known Behavior
- Signal direction (LONG/SHORT/NO TRADE) changes based on live market conditions - this is expected and correct behavior
- "NO TRADE" signal appears when factors are mixed (score between -3 and +3)
