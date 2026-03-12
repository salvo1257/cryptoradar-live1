# CryptoRadar v1.4 - Product Requirements Document

## Original Problem Statement
Build CryptoRadar - a professional BTC market intelligence dashboard that reads multiple market signals and summarizes the market situation for Bitcoin.

## Architecture
- **Frontend**: React 18 with TailwindCSS, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Data Sources**: 
  - **Kraken API**: Market data, orderbook, OHLC
  - **Coinbase API**: Order book, ticker (added v1.4)
  - **Bitstamp API**: Order book, ticker (added v1.4)
  - **CryptoCompare API**: News
  - **CoinGlass API**: Open Interest, Funding Rate/Liquidations
- **Chart**: TradingView Lightweight Charts v5.1
- **Real-time**: WebSocket for live price streaming

## Core Intelligence Modules

### Market Bias Engine ✅
- Combines: order book imbalance, volume, RSI, trend
- Output: BULLISH/BEARISH/NEUTRAL with confidence %
- Shows: Next target price, estimated move, trap risk, squeeze probability
- **NEW v1.4**: Exchange consensus (per-exchange bias from Kraken, Coinbase, Bitstamp)
- Data Source: Aggregated (Kraken, Coinbase, Bitstamp)

### Open Interest Module ✅ (CoinGlass - REAL DATA)
- Total OI (~$47B) with 1H/4H/24H changes
- Trend indicator (increasing/decreasing/stable)
- Exchange distribution chart
- Signal interpretation text
- Data Source: CoinGlass API

### Funding Rate Module ✅ (CoinGlass - REAL DATA)
- Current rate and annualized rate
- Payer identification (longs/shorts)
- Sentiment analysis (bullish/bearish/neutral)
- Derived from CoinGlass liquidation data
- Data Source: CoinGlass (Liquidation-derived)

### Liquidity Direction ✅ (ENHANCED v1.4)
- UP/DOWN/BALANCED indicator with detailed explanation
- **NEW**: Exchange Depth comparison (per-exchange imbalance %)
- **NEW**: Cluster explanations (what each level means)
- **NEW**: Multi-exchange data source (Kraken, Coinbase, Bitstamp)
- Clusters show price, volume (USD), exchanges, and distance %

### Support & Resistance ✅ (ENHANCED v1.4)
- Price pivot detection with touch count
- Order book wall detection with volume
- **NEW**: Per-level explanations (why this level matters)
- **NEW**: Exchange information (which exchanges show this level)
- **NEW**: Volume at level ($6.6M in sell orders, etc.)
- Data Source: Aggregated (Kraken, Coinbase, Bitstamp)

### Whale Alerts ✅ (ENHANCED v1.4)
- Volume spike detection from Kraken candles
- Order book imbalance alerts from aggregated data
- **NEW**: Stop loss levels
- **NEW**: Risk/Reward ratio
- **NEW**: Exchanges detected field
- **NEW**: Detailed reason text

### Pattern Detection ✅ (ENHANCED v1.4)
- Double Top/Bottom, Bull/Bear Flags, Triangles
- **NEW**: Pattern strength (forming/confirmed/completed)
- **NEW**: Stop loss levels
- **NEW**: Detailed explanation text
- Data Source: Kraken OHLC

### News Module ✅ (Real Data)
- CryptoCompare integration
- Importance levels (high/medium/low)
- Sentiment analysis
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

### v1.3 - CoinGlass Integration (December 2025)
- Real Open Interest data from CoinGlass API
- Real Funding Rate derived from liquidation data

### v1.4 - Multi-Exchange & Enhanced Cards (December 2025)
- ✅ Added Coinbase API integration (ticker + orderbook)
- ✅ Added Bitstamp API integration (ticker + orderbook)
- ✅ Multi-exchange order book aggregation
- ✅ Per-exchange comparison endpoint (/api/exchange-comparison)
- ✅ Exchange consensus in Market Bias card
- ✅ Exchange Depth comparison in Liquidity card
- ✅ Enhanced S/R levels with explanations and exchange info
- ✅ Enhanced Liquidity clusters with explanations
- ✅ Enhanced Whale Alerts with stop loss, R/R ratio
- ✅ Enhanced Patterns with strength status and explanations
- ✅ 100% backend tests passing (15/15)
- ✅ 100% frontend integration tests passing

## API Keys Used
- CoinGlass API: `858c52fb63b04008ab6633a913c32c7d` (Hobbyist plan)
- Kraken, Coinbase, Bitstamp: No API keys required (public endpoints)

## New Endpoints (v1.4)
- `GET /api/exchange-comparison` - Per-exchange market data comparison

## P1 - Next Tasks
1. Telegram notification backend logic
2. Active price alert monitoring system

## P2 - Future Tasks
1. Multi-language translations (IT/DE files)
2. Learn Mode content implementation

## Test Reports
- `/app/test_reports/iteration_5.json` - Multi-exchange tests (100% pass)
- `/app/backend/tests/test_multi_exchange.py` - Pytest test suite
- `/app/backend/tests/test_coinglass_integration.py` - CoinGlass tests

## Known Limitations
- CoinGlass Hobbyist plan has rate limits
- Whale Alerts and Pattern Detection depend on market conditions (may show "no signals" during quiet periods)
- Exchange distribution in OI is estimated based on typical market share
