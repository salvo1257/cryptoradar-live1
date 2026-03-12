# CryptoRadar v1.0 - Product Requirements Document

## Original Problem Statement
Build CryptoRadar - a complete professional BTC market intelligence dashboard that analyzes BTC/USDT market and presents trading intelligence signals through a modern dashboard.

## Architecture
- **Frontend**: React 18 with TailwindCSS, Shadcn/UI, Framer Motion
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (for alerts, notes, settings)
- **Data Source**: CoinGecko API (primary), Mock data for orderbook and news
- **Chart**: TradingView Lightweight Charts v5.1

## User Personas
1. **Active Trader**: Needs real-time market data, S/R levels, patterns
2. **Long-term Investor**: Uses market bias, liquidity analysis
3. **Beginner**: Uses Learn Mode for education

## Core Requirements (Static)
- [x] BTC/USDT candlestick chart with overlays
- [x] Market Bias Engine (BULLISH/BEARISH/NEUTRAL)
- [x] Support & Resistance detection
- [x] Liquidity clusters and direction
- [x] Whale Alert signals
- [x] Pattern detection (Double Top/Bottom, Flags, Triangle)
- [x] Candlestick pattern detection
- [x] Order Book analysis
- [x] News module
- [x] Price alerts with Telegram integration
- [x] Notes module
- [x] Multi-language support (EN/IT/DE)
- [x] Learn Mode with explanations
- [x] Mobile responsive design

## What's Been Implemented (March 12, 2026)
1. Full dashboard with live BTC price from CoinGecko
2. TradingView Lightweight Charts v5.1 integration
3. Market Bias Engine with 70%+ confidence
4. Support/Resistance levels with chart overlays
5. Liquidity direction analysis
6. Order book imbalance detection (MOCKED)
7. Whale alerts based on volume analysis
8. Pattern and candlestick detection
9. News feed (MOCKED)
10. Price alerts CRUD with Telegram option
11. Notes CRUD
12. Settings with language and notification preferences
13. Mobile hamburger menu navigation
14. Learn Mode toggle

## Prioritized Backlog
### P0 (Critical)
- None remaining

### P1 (High Priority)
- Real Binance API integration (currently blocked by geo-restriction)
- Real CoinGlass API for liquidation data
- Real news API integration

### P2 (Medium Priority)  
- WebSocket for real-time price updates
- Alert triggering with actual notifications
- Historical alert tracking
- Pattern visualization on chart

## Next Tasks
1. Integrate real-time WebSocket for live price updates
2. Add CoinGlass API for actual liquidation data
3. Implement actual Telegram notification sending
4. Add chart drawing tools
5. Export/import alerts and notes
