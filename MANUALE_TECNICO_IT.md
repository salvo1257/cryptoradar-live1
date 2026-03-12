# CryptoRadar - Manuale Tecnico di Intelligence
## Documentazione dell'Architettura e Logica del Sistema

**Versione:** 1.7  
**Timeframe Principale:** 4H (240 minuti)  
**Ultimo Aggiornamento:** Dicembre 2025

---

## Indice

1. [Panoramica del Sistema](#panoramica-del-sistema)
2. [Pipeline dei Dati](#pipeline-dei-dati)
3. [Sistema di Scoring del Segnale](#sistema-di-scoring-del-segnale)
4. [Moduli di Intelligence](#moduli-di-intelligence)
5. [Logica di Generazione del Segnale](#logica-di-generazione-del-segnale)
6. [Riferimento API](#riferimento-api)
7. [Guida all'Integrazione Bot](#guida-allintegrazione-bot)

---

## Panoramica del Sistema

### Architettura

```
┌─────────────────────────────────────────────────────────────────┐
│                      FONTI DATI                                  │
├─────────────────────────────────────────────────────────────────┤
│  Kraken API    │  Coinbase API  │  Bitstamp API  │  CoinGlass   │
│  (Prezzo, OB,  │  (Order Book)  │  (Order Book)  │  (OI, FR,    │
│   Candele)     │                │                │   Liq)       │
└───────┬────────┴───────┬────────┴───────┬────────┴──────┬───────┘
        │                │                │               │
        └────────────────┼────────────────┼───────────────┘
                         │                │
                         ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LIVELLO AGGREGAZIONE                          │
├─────────────────────────────────────────────────────────────────┤
│  • Aggregazione Order Book (3 exchange)                         │
│  • Profondità bid/ask pesata per volume                         │
│  • Statistiche per-exchange                                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MOTORI DI INTELLIGENCE                         │
├─────────────────────────────────────────────────────────────────┤
│  Bias di      │  Attività    │  Scala        │  Motore        │
│  Mercato      │  Balene      │  Liquidità    │  S/R           │
│               │              │               │                │
│  Analisi OI   │  Funding     │  Pattern      │  Cluster       │
│               │  Rate        │  Detection    │  Liquidità     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│               GENERATORE SEGNALE OPERATIVO                       │
├─────────────────────────────────────────────────────────────────┤
│  • Scoring Fattori (-15 a +15)                                  │
│  • Determinazione Direzione (LONG/SHORT/NESSUNA OP.)            │
│  • Calcolo Zona Entrata                                         │
│  • Posizionamento Stop Intelligente                             │
│  • Calcolo Target                                               │
│  • Rilevamento Sweep                                            │
│  • Analisi Rischio/Rendimento                                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     OUTPUT: SegnaleOperativo                     │
├─────────────────────────────────────────────────────────────────┤
│  {                                                               │
│    direction: "LONG" | "SHORT" | "NO TRADE",                    │
│    confidence: 0-100,                                           │
│    entry_zone_low, entry_zone_high,                             │
│    stop_loss, target_1, target_2,                               │
│    risk_reward_ratio, reasoning, factors, warnings,             │
│    whale_activity, liquidity_ladder_summary,                    │
│    sweep_detected, sweep_analysis, setup_type                   │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Stack Tecnologico

| Componente | Tecnologia |
|------------|------------|
| Backend | FastAPI (Python 3.11+) |
| Frontend | React 18, TailwindCSS, Shadcn/UI |
| Database | MongoDB (storage alert) |
| Grafici | TradingView Lightweight Charts v5.1 |
| Client HTTP | httpx (asincrono) |
| Modelli Dati | Pydantic v2 |

---

## Pipeline dei Dati

### Fetch Dati Exchange

#### Kraken API (Principale)
```python
# Dati Ticker
GET https://api.kraken.com/0/public/Ticker?pair=XBTUSD

# Dati OHLC (4H = 240 minuti)
GET https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=240

# Order Book
GET https://api.kraken.com/0/public/Depth?pair=XBTUSD&count=100
```

#### Coinbase API
```python
# Order Book
GET https://api.exchange.coinbase.com/products/BTC-USD/book?level=2
```

#### Bitstamp API
```python
# Order Book
GET https://www.bitstamp.net/api/v2/order_book/btcusd/
```

#### CoinGlass API
```python
# Open Interest
GET https://open-api-v3.coinglass.com/api/futures/openInterest/chart?symbol=BTC
Headers: {"coinglassSecret": API_KEY}

# Funding Rate
GET https://open-api-v3.coinglass.com/api/futures/funding-rate/info?symbol=BTC

# Liquidazioni
GET https://open-api-v3.coinglass.com/api/futures/liquidation/detail?symbol=BTC
```

### Aggregazione Order Book

Il sistema aggrega gli order book da 3 exchange in una vista unificata:

```python
def aggregate_orderbooks(kraken_ob, coinbase_ob, bitstamp_ob):
    # Combina tutti i bid
    all_bids = []
    for exchange, ob in [("Kraken", kraken_ob), ...]:
        for price, qty in ob["bids"]:
            all_bids.append((float(price), float(qty), exchange))
    
    # Ordina per prezzo (più alto prima)
    all_bids.sort(key=lambda x: x[0], reverse=True)
    
    # Unisci bid allo stesso livello di prezzo
    merged_bids = merge_by_price(all_bids, tolerance=0.01%)
    
    # Stesso per gli ask (più basso prima)
    all_asks.sort(key=lambda x: x[0])
    merged_asks = merge_by_price(all_asks, tolerance=0.01%)
    
    return {
        "bids": merged_bids[:100],
        "asks": merged_asks[:100],
        "total_bid_depth": sum(p * q for p, q, _ in merged_bids[:100]),
        "total_ask_depth": sum(p * q for p, q, _ in merged_asks[:100]),
        "exchanges_active": ["Kraken", "Coinbase", "Bitstamp"],
        "exchange_stats": per_exchange_breakdown
    }
```

---

## Sistema di Scoring del Segnale

### Pesi dei Fattori

Il Segnale Operativo è determinato da un **sistema di scoring a 9 fattori**:

| Fattore | Punteggio Max | Logica di Scoring |
|---------|---------------|-------------------|
| Bias di Mercato | ±3 | +3 se RIALZISTA ≥70% fid., +2 se ≥55%, +1 altrimenti |
| Direzione Liquidità | ±2 | +2 se SU con squilibrio >1.5, +1 altrimenti |
| Consenso Exchange | ±2 | +2 se tutti gli exchange concordano, +1 se maggioranza |
| Funding Rate | ±1 | +1 rialzista, -1 ribassista, ±1 bonus sovraffollamento |
| Open Interest | ±1 | +1 se in aumento con trend |
| Segnali Pattern | ±2 | +1 per pattern rialzista (max 2) |
| Alert Balene (legacy) | ±1 | +1 se più segnali long che short |
| Motore Attività Balene | ±2 | +2 se ACQUISTO ≥70% forza, +1 se ≥40% |
| Scala Liquidità | ±1 | +1 se lato_più_attraente si allinea con punteggio |

**Range Totale:** -15 a +15

### Soglie di Direzione

```python
if score >= 4:
    direction = "LONG"
elif score <= -4:
    direction = "SHORT"
else:
    direction = "NO TRADE"  # NESSUNA OPERAZIONE
```

### Calcolo della Fiducia

```python
max_score = 15
raw_confidence = (abs(score) / max_score) * 100

# Bonus allineamento: % di fattori non-zero che concordano con la direzione
aligned_factors = count(factors where sign(factor.score) == sign(total_score))
total_factors = count(factors where score != 0)
alignment_bonus = (aligned_factors / total_factors) * 15

confidence = min(95, raw_confidence + alignment_bonus)

# Bonus rilevamento sweep
if sweep_detected and setup_type == "sweep_reversal":
    confidence = min(95, confidence + 5)

# Penalità fiducia NO TRADE
if direction == "NO TRADE":
    confidence = max(30, 60 - abs(score) * 5)
```

---

## Moduli di Intelligence

### Motore Bias di Mercato

**Scopo:** Determinare il sentiment generale del mercato dall'order book e dalla price action.

**Input:**
- Dati candele 4H (200 candele)
- Order book aggregato

**Algoritmo:**
```python
def calculate_market_bias(candles, orderbook):
    # 1. Squilibrio Order Book
    bid_depth = sum(price * qty for price, qty in bids[:30])
    ask_depth = sum(price * qty for price, qty in asks[:30])
    imbalance = (bid_depth - ask_depth) / (bid_depth + ask_depth) * 100
    
    # 2. Momentum Prezzo (candele recenti)
    close_5 = average(ultimi 5 close)
    close_20 = average(ultimi 20 close)
    momentum = (close_5 - close_20) / close_20 * 100
    
    # 3. Calcolo RSI
    gains = [max(0, close[i] - close[i-1]) for i in range(14)]
    losses = [max(0, close[i-1] - close[i]) for i in range(14)]
    rsi = 100 - (100 / (1 + avg(gains) / avg(losses)))
    
    # 4. Determina Bias
    bias_score = 0
    if imbalance > 10: bias_score += 2
    elif imbalance > 5: bias_score += 1
    if momentum > 1: bias_score += 1
    if rsi > 55: bias_score += 1
    # (inverso per valori negativi)
    
    if bias_score >= 3:
        return "BULLISH", confidence  # RIALZISTA
    elif bias_score <= -3:
        return "BEARISH", confidence  # RIBASSISTA
    else:
        return "NEUTRAL", confidence  # NEUTRALE
```

### Motore Attività Balene

**Scopo:** Rilevare attività istituzionale/grandi trader.

**Input:**
- Dati candele 4H (analisi volume)
- Order book aggregato (analisi pressione)
- Dati liquidazione CoinGlass
- Dati open interest

**Algoritmo:**
```python
def analyze_whale_activity(candles, orderbook, liquidations, oi_data):
    buy_pressure = 0
    sell_pressure = 0
    signals = []
    
    # 1. Rilevamento Picco Volume
    avg_volume = average(volumes[-20:])
    current_volume = volumes[-1]
    volume_ratio = current_volume / avg_volume
    
    if volume_ratio >= 2.5:
        volume_spike = True
        if candle_is_bullish:
            buy_pressure += 25
            signals.append(f"Grande volume rialzista ({volume_ratio:.1f}x)")
        else:
            sell_pressure += 25
    
    # 2. Pressione Order Book
    ob_imbalance = calculate_imbalance(orderbook)
    if ob_imbalance > 25:
        buy_pressure += 30
        orderbook_aggression = "aggressive_buying"
    elif ob_imbalance < -25:
        sell_pressure += 30
        orderbook_aggression = "aggressive_selling"
    
    # 3. Rilevamento Grandi Muri
    avg_bid_volume = average(bid_volumes[:30])
    large_bid_walls = count(bids where qty > avg * 4)
    if large_bid_walls > 0:
        buy_pressure += 10
        signals.append(f"{large_bid_walls} grandi muri bid rilevati")
    
    # 4. Analisi Liquidazioni
    long_liq_ratio = long_liq_24h / (long_liq_24h + short_liq_24h)
    if long_liq_ratio > 0.65:
        sell_pressure += 20
        liquidation_bias = "longs_liquidated"
    elif long_liq_ratio < 0.35:
        buy_pressure += 20
        liquidation_bias = "shorts_liquidated"
    
    # 5. OI + Momentum Prezzo
    if oi_change_1h > 0.5 and price_change > 0.2:
        buy_pressure += 15
        signals.append("OI in aumento con prezzo rialzista")
    
    # 6. Determina Direzione
    if buy_pressure > sell_pressure + 20:
        direction = "BUY"  # ACQUISTO
    elif sell_pressure > buy_pressure + 20:
        direction = "SELL"  # VENDITA
    else:
        direction = "NEUTRAL"  # NEUTRALE
    
    return WhaleActivity(
        direction=direction,
        strength=min(100, buy_pressure + sell_pressure),
        buy_pressure=buy_pressure,
        sell_pressure=sell_pressure,
        signals=signals,
        ...
    )
```

### Scala Liquidità

**Scopo:** Mappare la sequenza dei livelli di liquidità sopra e sotto il prezzo corrente.

**Input:**
- Livelli Supporto/Resistenza
- Cluster di liquidità
- Order book aggregato (ordini balena)

**Algoritmo:**
```python
def build_liquidity_ladder(current_price, sr_levels, clusters, orderbook):
    ladder_above = []
    ladder_below = []
    
    # 1. Aggiungi Livelli S/R
    for level in sr_levels:
        distance = (level.price - current_price) / current_price * 100
        if level.price > current_price:
            ladder_above.append(LiquidityLevel(
                price=level.price,
                distance_percent=distance,
                strength=level.strength,
                type="resistance_liquidity" if level.timeframe == "Multi-Exchange" else "stop_cluster"
            ))
        else:
            ladder_below.append(...)
    
    # 2. Aggiungi Cluster di Liquidità
    for cluster in clusters:
        if not is_duplicate(cluster, existing_levels):
            add_to_appropriate_ladder(cluster)
    
    # 3. Aggiungi Ordini Balena ($500k+)
    for price, qty in orderbook["bids"][:50]:
        value = price * qty
        if value > 500_000 and price < current_price:
            ladder_below.append(LiquidityLevel(
                price=price,
                type="whale_level",
                strength="major" if value > 2_000_000 else "moderate",
                estimated_value=value
            ))
    
    # 4. Determina Lato Più Attraente
    above_total = sum(level.estimated_value for level in ladder_above)
    below_total = sum(level.estimated_value for level in ladder_below)
    
    if above_total > below_total * 1.5:
        more_attractive_side = "above"  # sopra
    elif below_total > above_total * 1.5:
        more_attractive_side = "below"  # sotto
    else:
        more_attractive_side = "balanced"  # bilanciato
    
    # 5. Determina Aspettativa Sweep
    if more_attractive_side == "above" and nearest_above.distance < nearest_below.distance * 1.5:
        sweep_expectation = "sweep_above_first"
        path_analysis = f"Scala superiore più forte. Prezzo probabile che spazzi ${nearest_above.price} prima dell'inversione."
    elif more_attractive_side == "below":
        sweep_expectation = "sweep_below_first"
        path_analysis = f"Scala inferiore più forte. Prezzo probabile che spazzi ${nearest_below.price} prima dell'inversione."
    
    return LiquidityLadder(...)
```

---

## Logica di Generazione del Segnale

### Filtro Movimento Minimo

```python
MINIMUM_MOVE_PERCENT = 0.50

def apply_minimum_move_filter(direction, estimated_move):
    if direction != "NO TRADE":
        if abs(estimated_move) < MINIMUM_MOVE_PERCENT:
            return "NO TRADE", f"Movimento troppo piccolo ({abs(estimated_move):.2f}% < {MINIMUM_MOVE_PERCENT}%)"
    return direction, None
```

### Posizionamento Stop Loss Intelligente

```python
LIQUIDITY_SWEEP_BUFFER = 0.003  # 0.3%

def calculate_smart_stop(direction, supports, resistances, current_price):
    if direction == "LONG":
        # Stop ovvio = appena sotto il primo supporto
        obvious_stop = supports[0].price
        
        # Zona sweep = 0.3% sotto lo stop ovvio
        sweep_zone = obvious_stop * (1 - LIQUIDITY_SWEEP_BUFFER)
        
        # Invalidazione sicura = sotto il secondo supporto
        if len(supports) > 1:
            safe_invalidation = supports[1].price * 0.995
        else:
            safe_invalidation = sweep_zone * 0.995
        
        stop_loss = safe_invalidation
        
    elif direction == "SHORT":
        obvious_stop = resistances[0].price
        sweep_zone = obvious_stop * (1 + LIQUIDITY_SWEEP_BUFFER)
        
        if len(resistances) > 1:
            safe_invalidation = resistances[1].price * 1.005
        else:
            safe_invalidation = sweep_zone * 1.005
        
        stop_loss = safe_invalidation
    
    return stop_loss, sweep_zone, safe_invalidation
```

### Rilevamento Sweep

```python
def detect_liquidity_sweep(current_price, supports, resistances, market_bias):
    nearest_support_dist = abs(supports[0].distance_percent) if supports else 100
    nearest_resistance_dist = abs(resistances[0].distance_percent) if resistances else 100
    
    sweep_detected = False
    setup_type = "standard"
    sweep_analysis = None
    
    # Avvicinamento al supporto con bias rialzista = potenziale sweep e inversione su
    if nearest_support_dist < 0.5 and supports:
        if market_bias.bias == "BULLISH" and market_bias.confidence >= 60:
            sweep_detected = True
            setup_type = "sweep_reversal"
            sweep_analysis = f"Prezzo in avvicinamento al supporto ${supports[0].price}. " \
                           f"Probabile sweep sotto prima dell'inversione rialzista."
    
    # Avvicinamento alla resistenza con bias ribassista = potenziale sweep e inversione giù
    elif nearest_resistance_dist < 0.5 and resistances:
        if market_bias.bias == "BEARISH" and market_bias.confidence >= 60:
            sweep_detected = True
            setup_type = "sweep_reversal"
            sweep_analysis = f"Prezzo in avvicinamento alla resistenza ${resistances[0].price}. " \
                           f"Probabile sweep sopra prima dell'inversione ribassista."
    
    return sweep_detected, setup_type, sweep_analysis
```

---

## Riferimento API

### Endpoint Principali

#### GET /api/trade-signal
Ritorna il segnale operativo completo con tutta l'analisi.

**Risposta:**
```json
{
  "direction": "LONG",
  "confidence": 72.5,
  "estimated_move": 2.35,
  "entry_zone_low": 69200.00,
  "entry_zone_high": 69450.00,
  "stop_loss": 68150.00,
  "invalidation_reason": "Vera invalidazione sotto $68,150...",
  "target_1": 71000.00,
  "target_2": 72500.00,
  "risk_reward_ratio": 2.4,
  "reasoning": "Forte allineamento rialzista...",
  "factors": {
    "market_bias": {"bias": "BULLISH", "confidence": 75, "score": 3, "max": 3},
    "liquidity": {"direction": "UP", "score": 2, "max": 2},
    "exchange_consensus": {"description": "3/3 rialzista", "score": 2, "max": 2},
    "funding_rate": {"rate": 0.01, "sentiment": "neutral", "score": 0, "max": 1},
    "open_interest": {"trend": "increasing", "score": 1, "max": 1},
    "patterns": {"count": 1, "score": 1, "max": 2},
    "whale_alerts": {"count": 2, "score": 1, "max": 1},
    "whale_engine": {"direction": "BUY", "strength": 65, "score": 2, "max": 2},
    "liquidity_ladder": {"more_attractive_side": "below", "score": 1, "max": 1}
  },
  "timestamp": "2025-12-12T12:00:00Z",
  "valid_for": "4H",
  "warnings": ["Sweep atteso: Il prezzo potrebbe scendere..."],
  "setup_type": "sweep_reversal",
  "liquidity_sweep_zone": 69050.00,
  "safe_invalidation": 68150.00,
  "sweep_detected": true,
  "sweep_analysis": "Prezzo in avvicinamento al supporto $69,200...",
  "whale_activity": {...},
  "liquidity_ladder_summary": {...},
  "sweep_first_expected": true,
  "whale_confirms_direction": true
}
```

---

## Guida all'Integrazione Bot

### Architettura Bot Raccomandata

```
┌─────────────────────────────────────────────────────────────────┐
│                       TRADING BOT                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Scheduler   │───▶│  Fetcher     │───▶│  Position    │      │
│  │  (cron 4H)   │    │  Segnali     │    │  Manager     │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                             │                    │               │
│                             ▼                    ▼               │
│                      GET /api/trade-signal       │               │
│                             │                    │               │
│                             ▼                    ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Risk       │◀───│  Decision    │───▶│  Execution   │      │
│  │  Manager     │    │  Engine      │    │  Engine      │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                  │               │
│                                                  ▼               │
│                                          Exchange API            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Strategia di Polling Segnale

```python
import asyncio
import httpx

CRYPTORADAR_API = "https://your-cryptoradar-instance.com/api"
POLL_INTERVAL = 300  # 5 minuti (controlla più volte per candela 4H)

async def poll_signal():
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{CRYPTORADAR_API}/trade-signal")
        return response.json()

async def trading_loop():
    current_position = None
    last_signal_direction = None
    
    while True:
        signal = await poll_signal()
        
        # Agisci solo sui cambiamenti di segnale
        if signal["direction"] != last_signal_direction:
            last_signal_direction = signal["direction"]
            
            if signal["direction"] == "LONG" and signal["confidence"] >= 65:
                if current_position is None:
                    await enter_long(signal)
                    current_position = "LONG"
            
            elif signal["direction"] == "SHORT" and signal["confidence"] >= 65:
                if current_position is None:
                    await enter_short(signal)
                    current_position = "SHORT"
            
            elif signal["direction"] == "NO TRADE":
                pass  # Opzionalmente chiudi posizione
        
        await asyncio.sleep(POLL_INTERVAL)
```

### Logica di Dimensionamento Posizione

```python
def calculate_position_size(account_balance, risk_percent, entry, stop_loss):
    """
    Calcola la size della posizione basata su percentuale di rischio fissa.
    
    Args:
        account_balance: Valore totale del conto in USD
        risk_percent: Rischio per trade (es. 0.01 per 1%)
        entry: Prezzo di entrata
        stop_loss: Prezzo stop loss
    
    Returns:
        position_size_btc: Quantità BTC da tradare
    """
    risk_amount = account_balance * risk_percent
    price_risk = abs(entry - stop_loss)
    position_size_btc = risk_amount / price_risk
    
    return position_size_btc
```

---

*Versione Documento: 1.7*  
*Sistema: CryptoRadar BTC Intelligence Engine*  
*Per supporto tecnico: Riferirsi a /app/backend/server.py per dettagli implementativi*
