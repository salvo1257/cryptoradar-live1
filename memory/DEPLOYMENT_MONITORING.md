# CryptoRadar v3.2 - Deployment & Monitoring Guide

**Deployment Date:** 2026-04-09
**Version:** v3.2.8
**Status:** READY FOR PRODUCTION DEPLOYMENT

---

## Pre-Deployment Verification (COMPLETE)

### System Health Check
| Component | Status | Details |
|-----------|--------|---------|
| Backend (FastAPI) | ✅ HEALTHY | Port 8001, Version 3.0.0 |
| Frontend (React) | ✅ HEALTHY | Port 3000 |
| MongoDB | ✅ CONNECTED | Signal history accessible |
| Kraken API | ✅ CONNECTED | Live price: ~$72,445 |
| Coinbase API | ✅ CONNECTED | Public orderbook aggregation |
| Bitstamp API | ✅ CONNECTED | Public orderbook aggregation |
| CoinGlass API | ✅ CONNECTED | OI/Funding/Liquidations |

### Configuration Verified
- ✅ No hardcoded environment variables
- ✅ No localhost references
- ✅ CORS configured for production
- ✅ MongoDB uses `MONGO_URL` from environment
- ✅ Frontend uses `REACT_APP_BACKEND_URL`
- ✅ API keys loaded from `.env`

---

## Post-Deployment Monitoring (24-48 Hours)

### 1. V3 Signal Generation
**What to Monitor:**
- Signals are generating when conditions met
- Signal history is being recorded in MongoDB
- Setup phases progress correctly (DETECTED → ENTRY_READY → etc.)

**Key Endpoints:**
```bash
GET /api/v3/trade-signal
GET /api/v3/signal-history
```

**Expected Behavior:**
- `has_active_setup: true/false` based on market conditions
- `operational_signal` appears when setup is ENTRY_READY
- Signal ID format: UUID

**Red Flags:**
- No signals generated for 24+ hours during volatile market
- Setup stuck in single phase
- Missing signal history records

---

### 2. R:R Operational Protection
**What to Monitor:**
- Signals with R:R < 0.3 are blocked
- R:R 0.3-0.5 marked as "weak"
- R:R >= 0.5 fully operational

**Key Endpoints:**
```bash
GET /api/v3/trade-signal
# Check: operational_signal.risk_reward
```

**Expected Behavior:**
- `is_operational: false` when R:R < 0.3
- Warning message in `operational_notes` for weak R:R
- Normal operation for R:R >= 0.5

**Red Flags:**
- Low R:R signals being marked as operational
- R:R calculation returning 0 or null

---

### 3. Final Action / Decision Engine Behavior
**What to Monitor:**
- DecisionEngineCard displays correct LONG/SHORT/WAIT
- Alignment calculation works correctly
- Whale data N/A handled gracefully

**Frontend Location:**
- DecisionEngineCard.js in dashboard

**Expected Behavior:**
- Shows aggregated recommendation
- Explains conflicts when WAIT
- Does NOT override V3 logic

**Red Flags:**
- Always showing WAIT regardless of signals
- Alignment count incorrect
- Missing conflict explanations

---

### 4. CoinGlass / Kraken / MongoDB Connectivity
**What to Monitor:**
- API connections remain stable
- No rate limiting or 429 errors
- Graceful degradation on failures

**Key Endpoints:**
```bash
GET /api/system/data-sources
GET /api/system/data-freshness
GET /api/system/test-connection/{source}
```

**Expected Behavior:**
- All critical sources show CONNECTED
- Data freshness < 120s for orderbook
- Fallbacks activate on temporary failures

**Red Flags:**
- CoinGlass 403 errors (plan limitation - KNOWN)
- Kraken rate limiting
- MongoDB connection drops
- Data freshness > 5 minutes

**Known Issues:**
- CoinGlass Heatmap (`/api/futures/liquidation/heatmap/model2`) returns 403 due to Hobbyist plan tier. This is expected and handled gracefully.

---

### 5. Multi-Exchange Aggregated Orderbook Stability
**What to Monitor:**
- All 3 exchanges contributing data
- Aggregation calculation correct
- Depth values reasonable

**Key Endpoints:**
```bash
GET /api/orderbook
GET /api/liquidity
GET /api/support-resistance
```

**Expected Behavior:**
- `data_source: "Aggregated (Kraken, Coinbase, Bitstamp)"`
- `exchange_comparison` shows all 3 exchanges
- Total depth > $5M combined (varies with market)

**Red Flags:**
- Missing exchange from aggregation
- Single source fallback activating frequently
- Depth values at 0 or null

---

## Monitoring Commands

### Quick Health Check
```bash
API_URL="https://your-production-url.com"

# Full system check
curl "$API_URL/api/system/health"

# V3 Signal status
curl "$API_URL/api/v3/trade-signal" | jq '.has_active_setup, .market_regime'

# Orderbook aggregation
curl "$API_URL/api/orderbook" | jq '.data_source, .exchange_comparison | keys'

# Signal lock status
curl "$API_URL/api/v3/signal-lock-status"
```

### Log Monitoring (Backend)
```bash
# Check for errors
tail -f /var/log/supervisor/backend.err.log

# Check for API issues
grep -i "error\|warning\|failed" /var/log/supervisor/backend.out.log | tail -50
```

---

## Success Criteria (After 48 Hours)

1. **V3 Engine:** At least 1-2 signals generated (if market conditions warrant)
2. **R:R Protection:** No low R:R signals marked operational
3. **Connectivity:** All data sources maintained 95%+ uptime
4. **Orderbook:** Aggregation from all 3 exchanges consistent
5. **No Critical Errors:** Backend logs clean of fatal errors

---

## Escalation Path

**If Issues Found:**
1. Check backend logs first
2. Verify MongoDB connection
3. Test individual API connections via `/api/system/test-connection/{source}`
4. Check CoinGlass API key validity
5. Verify Kraken rate limits not exceeded

**Do NOT:**
- Modify V3 signal generation logic
- Change scoring parameters
- Add new features during monitoring phase

---

## Post-Monitoring Next Steps (After 48h Validation)

If all monitoring criteria pass:
1. ✅ Mark deployment as STABLE
2. Consider P1 tasks:
   - Refactor server.py monolith
   - Add Binance/Bybit integrations
