# CryptoRadar v1.2 - Product Requirements Document

## Original Problem Statement
Build CryptoRadar - a professional BTC market intelligence dashboard that reads multiple market signals and summarizes the market situation for Bitcoin.

## Architecture
- **Frontend**: React 18 with TailwindCSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Data Sources**: 
  - Kraken API (market data, orderbook, OHLC)
  - CryptoCompare API (news)
  - Simulated (Open Interest, Funding Rate) - pending CoinGlass
- **Chart**: TradingView Lightweight Charts v5.1
- **Real-time**: WebSocket for live price streaming

## Core Intelligence Modules

### Market Bias Engine ✅
- Combines: order book imbalance, volume, RSI, trend
- Output: BULLISH/BEARISH/NEUTRAL with confidence %
- Shows: Next target price, estimated move, trap risk, squeeze probability
- Analysis text explaining the current situation

### Open Interest Module ✅ (Simulated)
- Total OI with 1H/4H/24H changes
- Trend indicator (increasing/decreasing/stable)
- Exchange distribution chart
- Signal interpretation text

### Funding Rate Module ✅ (Simulated)
- Current rate and annualized rate
- Payer identification (longs/shorts)
- Sentiment analysis
- Overcrowded warning system

### Liquidity Direction ✅
- UP/DOWN/BALANCED indicator
- Next liquidity target
- Imbalance ratio from real orderbook

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

### v1.2 - Intelligence Enhancement (Current)
- ✅ Open Interest module (simulated)
- ✅ Funding Rate module (simulated)
- ✅ Enhanced Market Bias with next target and analysis
- ✅ Enhanced News with importance and descriptions
- ✅ All 41 backend API tests passing
- ✅ 95% frontend tests passing

## Pending CoinGlass Integration
When API key is available:
- Real Open Interest data
- Real Funding Rate data
- Liquidation clusters
- Open Interest by exchange

## Next Tasks
1. CoinGlass API integration (when key provided)
2. Telegram notification sending
3. Alert price monitoring and triggering
4. Pattern visualization on chart
