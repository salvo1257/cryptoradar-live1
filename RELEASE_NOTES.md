# CryptoRadar v3.0.0 - Stable Release
**Release Date:** 2026-03-18

## Release Overview
This is a **stable, production-ready release** of CryptoRadar with dual signal engines (V2 + V3 Multi-Timeframe) and comprehensive market intelligence features.

---

## Features Included

### Signal Engines
| Engine | Description | Status |
|--------|-------------|--------|
| **V2 Signal Engine** | Reactive signal generation with Quality Gate | STABLE |
| **V3 Multi-Timeframe Engine** | Professional MTF strategy (4H context + 5M execution) | STABLE |

### V3 Multi-Timeframe Architecture
```
4H Context → Event Detection → Wait for Retest → 5M Confirmation → Entry Signal
     │              │                │                  │              │
  Regime    Breakout/Sweep    Price approaches    Rejection/         ENTRY_READY
 Detection       detected          zone         Stabilization/
                                                Micro-break
```

### V3 Setup Phases
- `SETUP_DETECTED` - 4H event detected, waiting for retest
- `WAITING_FOR_RETEST` - Price approaching zone
- `ENTRY_READY` - 5M confirmation received
- `EXECUTED` / `EXPIRED` / `INVALIDATED` - Terminal states

### Market Intelligence Modules
- **Market Regime Detection** - TREND, RANGE, COMPRESSION, EXPANSION
- **Trade Quality Gate** - 0-100 scoring with consistency checks
- **Market Energy Analysis** - Compression/expansion detection
- **Liquidity Magnet** - Sweep expectation analysis
- **Whale Activity Tracking** - Large player positioning
- **Liquidity Ladder** - Multi-level S/R with volume context

### Data Sources
- **Price Data:** Kraken API (BTC/USDT)
- **Open Interest:** CoinGlass API
- **Orderbook:** Multi-exchange aggregation (Kraken, Binance via proxy)

### UI Components
- V2 Signal Card (TradeSignalCard)
- V3 Signal Card (V3SignalCard) - Side-by-side comparison
- Market Regime Card
- TradingView Chart Integration
- Multi-language support (IT, EN, DE, PL)

---

## API Endpoints

### V2 Engine
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/trade-signal` | GET | V2 signal with Quality Gate |

### V3 Engine
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v3/trade-signal` | GET | V3 MTF signal with setup lifecycle |
| `/api/v3/active-setups` | GET | List active V3 setups |
| `/api/v3/expire-setup/{id}` | POST | Manually expire setup |
| `/api/v3/clear-setups` | DELETE | Clear all setups (testing) |

### Market Data
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/market-bias` | GET | Market bias analysis |
| `/api/liquidity` | GET | Liquidity clusters |
| `/api/support-resistance` | GET | S/R levels |
| `/api/open-interest` | GET | OI data from CoinGlass |
| `/api/funding-rate` | GET | Funding rate analysis |
| `/api/whale-alerts` | GET | Whale activity |
| `/api/market-energy` | GET | Energy analysis |
| `/api/liquidity-magnet` | GET | Sweep expectations |

---

## Technical Specifications

### Backend
- **Framework:** FastAPI
- **Database:** MongoDB (Motor async driver)
- **Scheduler:** APScheduler
- **Python:** 3.11+

### Frontend
- **Framework:** React 18
- **Styling:** TailwindCSS
- **Components:** Shadcn UI
- **Charts:** TradingView, Recharts

### Configuration
- `V3_SETUP_VALIDITY_HOURS = 8`
- `V3_5M_CACHE_TTL = 30 seconds`
- `V3_STOP_BUFFER_MIN = 0.1%`
- `V3_STOP_BUFFER_MAX = 0.25%`

---

## Known Limitations
1. **Pattern Detection** - Uses placeholder logic (future: talib integration)
2. **Data Sync** - Independent data fetches (future: snapshot-based approach)
3. **Single Exchange** - Primary data from Kraken only

---

## What's NOT Included (Future v4)
- Unified Decision Engine
- Action Type classification (NO_TRADE, WATCH, AGGRESSIVE_ENTRY, etc.)
- Liquidity-aware stop loss
- Risk level calculation

---

## Deployment Notes
This version has been tested and verified:
- All V2 endpoints functional
- All V3 endpoints functional
- UI renders correctly
- Real-time data updates working
- Telegram notifications operational

**Commit Hash:** See git log for exact commit
**Branch:** main

---

## Rollback Instructions
If issues arise with future versions, rollback to this release using the Emergent platform's rollback feature.
