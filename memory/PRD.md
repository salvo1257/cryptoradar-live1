# CryptoRadar v1.3 - Product Requirements Document

## Original Problem Statement
Build CryptoRadar - a professional BTC market intelligence dashboard that reads multiple market signals and summarizes the market situation for Bitcoin.

## Architecture
- **Frontend**: React 18 with TailwindCSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Data Sources**: 
  - Kraken API (market data, orderbook, OHLC)
  - CryptoCompare API (news)
  - CoinGlass API (Open Interest, Funding Rate/Liquidations)
- **Chart**: TradingView Lightweight Charts v5.1
- **Real-time**: WebSocket for live price streaming

## Core Intelligence Modules

### Market Bias Engine ✅
- Combines: order book imbalance, volume, RSI, trend
- Output: BULLISH/BEARISH/NEUTRAL with confidence %
- Shows: Next target price, estimated move, trap risk, squeeze probability
- Analysis text explaining the current situation

### Open Interest Module ✅ (CoinGlass - REAL DATA)
- Total OI (~$47B) with 1H/4H/24H changes
- Trend indicator (increasing/decreasing/stable)
- Exchange distribution chart (Binance, CME, Bybit, OKX)
- Signal interpretation text
- Data Source: CoinGlass API

### Funding Rate Module ✅ (CoinGlass - REAL DATA)
- Current rate and annualized rate
- Payer identification (longs/shorts)
- Sentiment analysis (bullish/bearish/neutral)
- Overcrowded warning system
- Derived from CoinGlass liquidation data
- Data Source: CoinGlass (Liquidation-derived)

### Liquidity Direction ✅
- UP/DOWN/BALANCED indicator
- Next liquidity target
- Imbalance ratio from Kraken orderbook
- Data Source: Kraken OrderBook

### Support & Resistance ✅
- Price pivot detection
- Order book wall detection
- Strength ratings (strong/moderate/weak)

### Whale Alerts ✅
- Volume spike detection
- Order book imbalance alerts
- LONG/SHORT signals with targets

### Pattern Detection ✅
- Double Top/Bottom, Bull/Bear Flags
- Triangle patterns
- Confidence and expected move

### Candlestick Patterns ✅
- Doji, Hammer, Engulfing, Shooting Star
- Signal interpretation text

### News Module ✅ (Real Data)
- CryptoCompare integration
- Importance levels (high/medium/low)
- Sentiment analysis (bullish/bearish/neutral)
- Article descriptions

## What's Been Implemented

### v1.0 - Basic Dashboard
- Chart, navigation, mock data

### v1.1 - Real Data Integration
- Kraken API for market data
- CryptoCompare for news
- WebSocket streaming

### v1.2 - Intelligence Enhancement
- Open Interest module (simulated)
- Funding Rate module (simulated)
- Enhanced Market Bias with next target and analysis
- Enhanced News with importance and descriptions

### v1.3 - CoinGlass Integration (December 2025)
- ✅ Real Open Interest data from CoinGlass API
- ✅ Real Funding Rate derived from liquidation data
- ✅ 100% backend tests passing (24/24)
- ✅ 100% frontend integration tests passing
- ✅ Data sources correctly displayed in all cards

## API Keys Used
- CoinGlass API: `858c52fb63b04008ab6633a913c32c7d` (Hobbyist plan)

## P1 - Next Tasks
1. Telegram notification backend logic
2. Active price alert monitoring system

## P2 - Future Tasks
1. Multi-language translations (IT/DE files)
2. Real Whale Alert engine (enhanced analysis)
3. Real Pattern Detection visualization on chart
4. Learn Mode content implementation

## Test Reports
- `/app/test_reports/iteration_4.json` - CoinGlass integration tests (100% pass)
- `/app/backend/tests/test_coinglass_integration.py` - Pytest test suite

## Known Limitations
- CoinGlass Hobbyist plan has rate limits
- Exchange distribution is estimated based on typical market share
- Funding rate is derived from liquidation imbalance (not direct funding API)
