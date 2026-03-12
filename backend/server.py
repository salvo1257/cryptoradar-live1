from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import asyncio
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="CryptoRadar API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class MarketStatus(BaseModel):
    symbol: str = "BTCUSDT"
    price: float
    price_change_24h: float
    price_change_percent_24h: float
    high_24h: float
    low_24h: float
    volume_24h: float
    status: str = "LIVE"
    timestamp: datetime

class CandleData(BaseModel):
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: float

class SupportResistanceLevel(BaseModel):
    price: float
    level_type: str
    strength: str
    timeframe: str
    distance_percent: float
    last_touch: Optional[datetime] = None

class MarketBias(BaseModel):
    bias: str
    confidence: float
    estimated_move: float
    trap_risk: str
    squeeze_probability: float
    inputs: Dict[str, Any]

class LiquidityCluster(BaseModel):
    price: float
    strength: str
    distance_percent: float
    side: str
    estimated_value: float

class LiquidityDirection(BaseModel):
    direction: str
    next_target: float
    distance_percent: float
    imbalance_ratio: float

class WhaleAlert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    signal: str
    entry: float
    target: float
    confidence: float
    estimated_move: float
    timeframe: str
    timestamp: datetime
    reason: str

class PatternDetection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pattern: str
    direction: str
    confidence: float
    estimated_move: float
    timeframe: str
    start_price: float
    target_price: float
    timestamp: datetime

class CandlestickPattern(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pattern: str
    signal: str
    confidence: float
    candle_time: int
    explanation: str

class OrderBookAnalysis(BaseModel):
    top_bid_wall: Dict[str, float]
    top_ask_wall: Dict[str, float]
    imbalance: float
    imbalance_direction: str
    bid_depth: float
    ask_depth: float

class NewsItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    source: str
    url: str
    timestamp: datetime
    sentiment: Optional[str] = None

class PriceAlert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    price: float
    condition: str
    is_active: bool = True
    triggered: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    triggered_at: Optional[datetime] = None
    send_telegram: bool = False

class PriceAlertCreate(BaseModel):
    price: float
    condition: str
    send_telegram: bool = False

class Note(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NoteCreate(BaseModel):
    content: str

class Settings(BaseModel):
    language: str = "en"
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_enabled: bool = False
    alert_sound: bool = True
    notify_whale_alerts: bool = True
    notify_patterns: bool = True
    notify_candlesticks: bool = True
    notify_price_alerts: bool = True
    notify_sr_breaks: bool = True

class TelegramMessage(BaseModel):
    message: str

# ============== CRYPTO API HELPERS ==============

COINGECKO_API_URL = "https://api.coingecko.com/api/v3"

# Cache for market data
market_data_cache = {
    "ticker": None,
    "ticker_time": None,
    "candles": {},
    "candles_time": {}
}
CACHE_TTL = 30  # seconds

async def fetch_coingecko_ticker():
    """Fetch current BTC/USD ticker from CoinGecko"""
    try:
        # Check cache
        if market_data_cache["ticker"] and market_data_cache["ticker_time"]:
            if (datetime.now(timezone.utc) - market_data_cache["ticker_time"]).seconds < CACHE_TTL:
                return market_data_cache["ticker"]
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{COINGECKO_API_URL}/coins/bitcoin",
                params={
                    "localization": "false",
                    "tickers": "false",
                    "market_data": "true",
                    "community_data": "false",
                    "developer_data": "false"
                }
            )
            if response.status_code == 200:
                data = response.json()
                market = data.get("market_data", {})
                result = {
                    "price": float(market.get("current_price", {}).get("usd", 0)),
                    "price_change_24h": float(market.get("price_change_24h", 0)),
                    "price_change_percent_24h": float(market.get("price_change_percentage_24h", 0)),
                    "high_24h": float(market.get("high_24h", {}).get("usd", 0)),
                    "low_24h": float(market.get("low_24h", {}).get("usd", 0)),
                    "volume_24h": float(market.get("total_volume", {}).get("usd", 0)),
                }
                # Update cache
                market_data_cache["ticker"] = result
                market_data_cache["ticker_time"] = datetime.now(timezone.utc)
                return result
    except Exception as e:
        logger.error(f"Error fetching CoinGecko ticker: {e}")
    return None

async def fetch_coingecko_ohlc(days: int = 7):
    """Fetch OHLC candlestick data from CoinGecko"""
    cache_key = f"ohlc_{days}"
    try:
        # Check cache
        if cache_key in market_data_cache["candles"] and cache_key in market_data_cache["candles_time"]:
            if (datetime.now(timezone.utc) - market_data_cache["candles_time"][cache_key]).seconds < CACHE_TTL * 2:
                return market_data_cache["candles"][cache_key]
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{COINGECKO_API_URL}/coins/bitcoin/ohlc",
                params={"vs_currency": "usd", "days": days}
            )
            if response.status_code == 200:
                data = response.json()
                candles = []
                for k in data:
                    candles.append({
                        "time": int(k[0] / 1000),
                        "open": float(k[1]),
                        "high": float(k[2]),
                        "low": float(k[3]),
                        "close": float(k[4]),
                        "volume": 0,  # OHLC endpoint doesn't include volume
                    })
                # Update cache
                market_data_cache["candles"][cache_key] = candles
                market_data_cache["candles_time"][cache_key] = datetime.now(timezone.utc)
                return candles
    except Exception as e:
        logger.error(f"Error fetching CoinGecko OHLC: {e}")
    return None

async def fetch_market_chart(days: int = 7):
    """Fetch market chart data from CoinGecko for volume info"""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{COINGECKO_API_URL}/coins/bitcoin/market_chart",
                params={"vs_currency": "usd", "days": days, "interval": "hourly" if days <= 7 else "daily"}
            )
            if response.status_code == 200:
                return response.json()
    except Exception as e:
        logger.error(f"Error fetching market chart: {e}")
    return None

def generate_mock_orderbook(current_price: float):
    """Generate simulated order book data"""
    import random
    bids = []
    asks = []
    
    for i in range(20):
        bid_price = current_price * (1 - 0.001 * (i + 1) - random.random() * 0.001)
        ask_price = current_price * (1 + 0.001 * (i + 1) + random.random() * 0.001)
        bid_qty = random.uniform(0.5, 5.0)
        ask_qty = random.uniform(0.5, 5.0)
        bids.append([str(round(bid_price, 2)), str(round(bid_qty, 4))])
        asks.append([str(round(ask_price, 2)), str(round(ask_qty, 4))])
    
    return {"bids": bids, "asks": asks}

# Compatibility functions for existing code
async def fetch_binance_ticker():
    """Wrapper to maintain compatibility"""
    return await fetch_coingecko_ticker()

async def fetch_binance_klines(interval: str = "1h", limit: int = 100):
    """Wrapper to fetch candles - maps interval to days"""
    interval_to_days = {
        "15m": 1,
        "1h": 7,
        "4h": 14,
        "1d": 30
    }
    days = interval_to_days.get(interval, 7)
    return await fetch_coingecko_ohlc(days)

async def fetch_binance_orderbook(limit: int = 100):
    """Generate mock orderbook based on current price"""
    ticker = await fetch_coingecko_ticker()
    if ticker:
        return generate_mock_orderbook(ticker["price"])
    return None

# ============== ANALYSIS ENGINES ==============

def calculate_support_resistance(candles: List[dict], current_price: float) -> List[SupportResistanceLevel]:
    """Calculate support and resistance levels from price data"""
    if not candles or len(candles) < 20:
        return []
    
    levels = []
    highs = [c["high"] for c in candles]
    lows = [c["low"] for c in candles]
    
    # Find recent highs (potential resistance)
    for i in range(2, len(highs) - 2):
        if highs[i] > highs[i-1] and highs[i] > highs[i-2] and highs[i] > highs[i+1] and highs[i] > highs[i+2]:
            distance = ((highs[i] - current_price) / current_price) * 100
            strength = "strong" if abs(distance) < 2 else "moderate" if abs(distance) < 5 else "weak"
            levels.append(SupportResistanceLevel(
                price=round(highs[i], 2),
                level_type="resistance",
                strength=strength,
                timeframe="1H",
                distance_percent=round(distance, 2)
            ))
    
    # Find recent lows (potential support)
    for i in range(2, len(lows) - 2):
        if lows[i] < lows[i-1] and lows[i] < lows[i-2] and lows[i] < lows[i+1] and lows[i] < lows[i+2]:
            distance = ((lows[i] - current_price) / current_price) * 100
            strength = "strong" if abs(distance) < 2 else "moderate" if abs(distance) < 5 else "weak"
            levels.append(SupportResistanceLevel(
                price=round(lows[i], 2),
                level_type="support",
                strength=strength,
                timeframe="1H",
                distance_percent=round(distance, 2)
            ))
    
    # Sort by distance and return top levels
    levels.sort(key=lambda x: abs(x.distance_percent))
    return levels[:10]

def calculate_market_bias(candles: List[dict], orderbook: dict = None) -> MarketBias:
    """Calculate market bias from multiple indicators"""
    if not candles or len(candles) < 20:
        return MarketBias(
            bias="NEUTRAL",
            confidence=50.0,
            estimated_move=0.0,
            trap_risk="low",
            squeeze_probability=0.0,
            inputs={}
        )
    
    # Trend analysis
    closes = [c["close"] for c in candles[-20:]]
    sma_short = sum(closes[-7:]) / 7
    sma_long = sum(closes[-20:]) / 20
    current_price = closes[-1]
    
    trend_score = 0
    if current_price > sma_short > sma_long:
        trend_score = 2
    elif current_price > sma_short:
        trend_score = 1
    elif current_price < sma_short < sma_long:
        trend_score = -2
    elif current_price < sma_short:
        trend_score = -1
    
    # Volume analysis
    volumes = [c["volume"] for c in candles[-20:]]
    avg_volume = sum(volumes) / len(volumes)
    recent_volume = volumes[-1]
    volume_score = 1 if recent_volume > avg_volume * 1.2 else -1 if recent_volume < avg_volume * 0.8 else 0
    
    # Price momentum
    price_change = (closes[-1] - closes[-5]) / closes[-5] * 100
    momentum_score = 1 if price_change > 1 else -1 if price_change < -1 else 0
    
    # Orderbook imbalance
    ob_score = 0
    if orderbook:
        bids = sum([float(b[1]) for b in orderbook.get("bids", [])[:20]])
        asks = sum([float(a[1]) for a in orderbook.get("asks", [])[:20]])
        if bids > asks * 1.2:
            ob_score = 1
        elif asks > bids * 1.2:
            ob_score = -1
    
    total_score = trend_score + volume_score + momentum_score + ob_score
    max_score = 5
    
    if total_score >= 2:
        bias = "BULLISH"
        confidence = min(50 + (total_score / max_score) * 50, 95)
    elif total_score <= -2:
        bias = "BEARISH"
        confidence = min(50 + (abs(total_score) / max_score) * 50, 95)
    else:
        bias = "NEUTRAL"
        confidence = 50 + abs(total_score) * 10
    
    # Estimated move based on ATR
    highs = [c["high"] for c in candles[-14:]]
    lows = [c["low"] for c in candles[-14:]]
    atr = sum([highs[i] - lows[i] for i in range(len(highs))]) / len(highs)
    estimated_move = (atr / current_price) * 100
    
    # Risk analysis
    volatility = max(highs) - min(lows)
    trap_risk = "high" if volatility > atr * 2 else "moderate" if volatility > atr * 1.5 else "low"
    squeeze_prob = min((1 - (volatility / (atr * 3))) * 100, 80) if atr > 0 else 0
    
    return MarketBias(
        bias=bias,
        confidence=round(confidence, 1),
        estimated_move=round(estimated_move, 2),
        trap_risk=trap_risk,
        squeeze_probability=round(max(0, squeeze_prob), 1),
        inputs={
            "trend_score": trend_score,
            "volume_score": volume_score,
            "momentum_score": momentum_score,
            "orderbook_score": ob_score
        }
    )

def detect_patterns(candles: List[dict]) -> List[PatternDetection]:
    """Detect chart patterns in price data"""
    if not candles or len(candles) < 30:
        return []
    
    patterns = []
    closes = [c["close"] for c in candles]
    highs = [c["high"] for c in candles]
    lows = [c["low"] for c in candles]
    current_price = closes[-1]
    
    # Double Top Detection
    recent_highs = [(i, highs[i]) for i in range(-20, -1) if highs[i] > highs[i-1] and highs[i] > highs[i+1]]
    if len(recent_highs) >= 2:
        h1, h2 = recent_highs[-2], recent_highs[-1]
        if abs(h1[1] - h2[1]) / h1[1] < 0.02:  # Within 2%
            patterns.append(PatternDetection(
                pattern="Double Top",
                direction="BEARISH",
                confidence=72.0,
                estimated_move=-3.5,
                timeframe="1H",
                start_price=h1[1],
                target_price=h1[1] * 0.965,
                timestamp=datetime.now(timezone.utc)
            ))
    
    # Double Bottom Detection
    recent_lows = [(i, lows[i]) for i in range(-20, -1) if lows[i] < lows[i-1] and lows[i] < lows[i+1]]
    if len(recent_lows) >= 2:
        l1, l2 = recent_lows[-2], recent_lows[-1]
        if abs(l1[1] - l2[1]) / l1[1] < 0.02:
            patterns.append(PatternDetection(
                pattern="Double Bottom",
                direction="BULLISH",
                confidence=70.0,
                estimated_move=3.5,
                timeframe="1H",
                start_price=l1[1],
                target_price=l1[1] * 1.035,
                timestamp=datetime.now(timezone.utc)
            ))
    
    # Bull Flag Detection
    if len(closes) >= 20:
        initial_move = (closes[-15] - closes[-20]) / closes[-20] * 100
        consolidation = max(closes[-10:]) - min(closes[-10:])
        if initial_move > 3 and consolidation / current_price * 100 < 2:
            patterns.append(PatternDetection(
                pattern="Bull Flag",
                direction="BULLISH",
                confidence=68.0,
                estimated_move=initial_move * 0.8,
                timeframe="1H",
                start_price=closes[-15],
                target_price=current_price * (1 + initial_move * 0.008),
                timestamp=datetime.now(timezone.utc)
            ))
    
    # Bear Flag Detection
    if len(closes) >= 20:
        initial_drop = (closes[-20] - closes[-15]) / closes[-20] * 100
        if initial_drop > 3 and consolidation / current_price * 100 < 2:
            patterns.append(PatternDetection(
                pattern="Bear Flag",
                direction="BEARISH",
                confidence=65.0,
                estimated_move=-initial_drop * 0.8,
                timeframe="1H",
                start_price=closes[-15],
                target_price=current_price * (1 - initial_drop * 0.008),
                timestamp=datetime.now(timezone.utc)
            ))
    
    return patterns

def detect_candlestick_patterns(candles: List[dict]) -> List[CandlestickPattern]:
    """Detect candlestick patterns"""
    if not candles or len(candles) < 3:
        return []
    
    patterns = []
    
    for i in range(-5, 0):
        if i >= -len(candles):
            c = candles[i]
            body = abs(c["close"] - c["open"])
            upper_wick = c["high"] - max(c["close"], c["open"])
            lower_wick = min(c["close"], c["open"]) - c["low"]
            total_range = c["high"] - c["low"]
            
            if total_range == 0:
                continue
            
            # Doji
            if body / total_range < 0.1:
                patterns.append(CandlestickPattern(
                    pattern="Doji",
                    signal="NEUTRAL",
                    confidence=60.0,
                    candle_time=c["time"],
                    explanation="Doji indicates market indecision. Watch for direction confirmation."
                ))
            
            # Hammer (bullish)
            elif lower_wick > body * 2 and upper_wick < body * 0.5 and c["close"] > c["open"]:
                patterns.append(CandlestickPattern(
                    pattern="Hammer",
                    signal="BULLISH",
                    confidence=68.0,
                    candle_time=c["time"],
                    explanation="Hammer shows rejection of lower prices. Potential bullish reversal."
                ))
            
            # Shooting Star (bearish)
            elif upper_wick > body * 2 and lower_wick < body * 0.5 and c["close"] < c["open"]:
                patterns.append(CandlestickPattern(
                    pattern="Shooting Star",
                    signal="BEARISH",
                    confidence=65.0,
                    candle_time=c["time"],
                    explanation="Shooting Star shows rejection of higher prices. Potential bearish reversal."
                ))
            
            # Bullish Engulfing
            if i > -len(candles) + 1:
                prev = candles[i-1]
                if prev["close"] < prev["open"] and c["close"] > c["open"]:
                    if c["open"] < prev["close"] and c["close"] > prev["open"]:
                        patterns.append(CandlestickPattern(
                            pattern="Bullish Engulfing",
                            signal="BULLISH",
                            confidence=72.0,
                            candle_time=c["time"],
                            explanation="Bullish Engulfing shows strong buying pressure. Potential trend reversal."
                        ))
                
                # Bearish Engulfing
                if prev["close"] > prev["open"] and c["close"] < c["open"]:
                    if c["open"] > prev["close"] and c["close"] < prev["open"]:
                        patterns.append(CandlestickPattern(
                            pattern="Bearish Engulfing",
                            signal="BEARISH",
                            confidence=72.0,
                            candle_time=c["time"],
                            explanation="Bearish Engulfing shows strong selling pressure. Potential trend reversal."
                        ))
    
    return patterns[-5:]  # Return last 5 patterns

def analyze_orderbook(orderbook: dict, current_price: float) -> OrderBookAnalysis:
    """Analyze order book for walls and imbalance"""
    if not orderbook:
        return OrderBookAnalysis(
            top_bid_wall={"price": 0, "quantity": 0},
            top_ask_wall={"price": 0, "quantity": 0},
            imbalance=0.0,
            imbalance_direction="balanced",
            bid_depth=0,
            ask_depth=0
        )
    
    bids = orderbook.get("bids", [])
    asks = orderbook.get("asks", [])
    
    # Find largest walls
    bid_walls = sorted([(float(b[0]), float(b[1])) for b in bids], key=lambda x: x[1], reverse=True)
    ask_walls = sorted([(float(a[0]), float(a[1])) for a in asks], key=lambda x: x[1], reverse=True)
    
    top_bid = bid_walls[0] if bid_walls else (0, 0)
    top_ask = ask_walls[0] if ask_walls else (0, 0)
    
    # Calculate depth
    bid_depth = sum([float(b[1]) * float(b[0]) for b in bids[:50]])
    ask_depth = sum([float(a[1]) * float(a[0]) for a in asks[:50]])
    
    total_depth = bid_depth + ask_depth
    imbalance = ((bid_depth - ask_depth) / total_depth * 100) if total_depth > 0 else 0
    
    if imbalance > 10:
        direction = "bullish"
    elif imbalance < -10:
        direction = "bearish"
    else:
        direction = "balanced"
    
    return OrderBookAnalysis(
        top_bid_wall={"price": top_bid[0], "quantity": top_bid[1]},
        top_ask_wall={"price": top_ask[0], "quantity": top_ask[1]},
        imbalance=round(imbalance, 2),
        imbalance_direction=direction,
        bid_depth=round(bid_depth, 2),
        ask_depth=round(ask_depth, 2)
    )

def generate_liquidity_clusters(candles: List[dict], current_price: float) -> tuple:
    """Generate liquidity cluster data"""
    if not candles:
        return [], LiquidityDirection(
            direction="BALANCED",
            next_target=current_price,
            distance_percent=0.0,
            imbalance_ratio=1.0
        )
    
    clusters = []
    
    # Simulate liquidity zones based on price action
    highs = [c["high"] for c in candles[-50:]]
    lows = [c["low"] for c in candles[-50:]]
    
    # Resistance zones (liquidity above)
    resistance_levels = sorted(set([h for h in highs if h > current_price]))[:5]
    for level in resistance_levels:
        distance = ((level - current_price) / current_price) * 100
        clusters.append(LiquidityCluster(
            price=round(level, 2),
            strength="high" if distance < 2 else "medium" if distance < 5 else "low",
            distance_percent=round(distance, 2),
            side="above",
            estimated_value=round(abs(level - current_price) * 100, 0)
        ))
    
    # Support zones (liquidity below)
    support_levels = sorted(set([l for l in lows if l < current_price]), reverse=True)[:5]
    for level in support_levels:
        distance = ((level - current_price) / current_price) * 100
        clusters.append(LiquidityCluster(
            price=round(level, 2),
            strength="high" if abs(distance) < 2 else "medium" if abs(distance) < 5 else "low",
            distance_percent=round(distance, 2),
            side="below",
            estimated_value=round(abs(level - current_price) * 100, 0)
        ))
    
    # Calculate liquidity direction
    above_count = len([c for c in clusters if c.side == "above"])
    below_count = len([c for c in clusters if c.side == "below"])
    
    if above_count > below_count * 1.5:
        direction = "UP"
        next_target = resistance_levels[0] if resistance_levels else current_price
    elif below_count > above_count * 1.5:
        direction = "DOWN"
        next_target = support_levels[0] if support_levels else current_price
    else:
        direction = "BALANCED"
        next_target = current_price
    
    liq_direction = LiquidityDirection(
        direction=direction,
        next_target=round(next_target, 2),
        distance_percent=round(((next_target - current_price) / current_price) * 100, 2),
        imbalance_ratio=round(above_count / max(below_count, 1), 2)
    )
    
    return clusters, liq_direction

def generate_whale_alerts(candles: List[dict], current_price: float) -> List[WhaleAlert]:
    """Generate whale alert signals based on volume analysis"""
    if not candles or len(candles) < 20:
        return []
    
    alerts = []
    volumes = [c["volume"] for c in candles[-20:]]
    avg_volume = sum(volumes) / len(volumes)
    
    for i in range(-5, 0):
        c = candles[i]
        if c["volume"] > avg_volume * 2:
            is_bullish = c["close"] > c["open"]
            signal = "LONG" if is_bullish else "SHORT"
            entry = c["close"]
            move_pct = 2.5 if is_bullish else -2.5
            target = entry * (1 + move_pct / 100)
            
            alerts.append(WhaleAlert(
                signal=signal,
                entry=round(entry, 2),
                target=round(target, 2),
                confidence=round(65 + (c["volume"] / avg_volume) * 5, 1),
                estimated_move=move_pct,
                timeframe="1H",
                timestamp=datetime.fromtimestamp(c["time"], tz=timezone.utc),
                reason=f"Large volume spike detected ({round(c['volume']/avg_volume, 1)}x average)"
            ))
    
    return alerts[-3:]

# ============== MOCK NEWS DATA ==============

MOCK_NEWS = [
    {
        "title": "Bitcoin ETF Sees Record Inflows as Institutional Interest Grows",
        "source": "CryptoNews",
        "url": "https://example.com/btc-etf-inflows",
        "timestamp": datetime.now(timezone.utc) - timedelta(hours=1),
        "sentiment": "bullish"
    },
    {
        "title": "Federal Reserve Signals Potential Rate Cuts in 2024",
        "source": "Reuters",
        "url": "https://example.com/fed-rates",
        "timestamp": datetime.now(timezone.utc) - timedelta(hours=3),
        "sentiment": "bullish"
    },
    {
        "title": "Bitcoin Mining Difficulty Reaches All-Time High",
        "source": "CoinDesk",
        "url": "https://example.com/mining-difficulty",
        "timestamp": datetime.now(timezone.utc) - timedelta(hours=5),
        "sentiment": "neutral"
    },
    {
        "title": "Major Exchange Reports Surge in BTC Trading Volume",
        "source": "Bloomberg",
        "url": "https://example.com/trading-volume",
        "timestamp": datetime.now(timezone.utc) - timedelta(hours=8),
        "sentiment": "bullish"
    },
    {
        "title": "Regulatory Clarity Expected for Crypto Markets",
        "source": "WSJ",
        "url": "https://example.com/crypto-regulation",
        "timestamp": datetime.now(timezone.utc) - timedelta(hours=12),
        "sentiment": "neutral"
    }
]

# ============== API ROUTES ==============

@api_router.get("/health")
async def health_check():
    """System health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "CryptoRadar API",
        "version": "1.0.0"
    }

@api_router.get("/market/status")
async def get_market_status():
    """Get current BTCUSDT market status"""
    ticker = await fetch_binance_ticker()
    if ticker:
        return MarketStatus(
            symbol="BTCUSDT",
            price=ticker["price"],
            price_change_24h=ticker["price_change_24h"],
            price_change_percent_24h=ticker["price_change_percent_24h"],
            high_24h=ticker["high_24h"],
            low_24h=ticker["low_24h"],
            volume_24h=ticker["volume_24h"],
            status="LIVE",
            timestamp=datetime.now(timezone.utc)
        )
    return MarketStatus(
        symbol="BTCUSDT",
        price=0,
        price_change_24h=0,
        price_change_percent_24h=0,
        high_24h=0,
        low_24h=0,
        volume_24h=0,
        status="OFFLINE",
        timestamp=datetime.now(timezone.utc)
    )

@api_router.get("/chart/candles")
async def get_candles(
    interval: str = Query(default="1h", description="Timeframe: 15m, 1h, 4h, 1d"),
    limit: int = Query(default=200, le=500)
):
    """Get candlestick data for chart"""
    interval_map = {"15m": "15m", "1h": "1h", "4h": "4h", "1d": "1d"}
    binance_interval = interval_map.get(interval, "1h")
    candles = await fetch_binance_klines(binance_interval, limit)
    if candles:
        return {"candles": candles, "interval": interval}
    return {"candles": [], "interval": interval}

@api_router.get("/market/bias")
async def get_market_bias(interval: str = Query(default="1h")):
    """Get market bias analysis"""
    interval_map = {"15m": "15m", "1h": "1h", "4h": "4h", "1d": "1d"}
    binance_interval = interval_map.get(interval, "1h")
    
    candles = await fetch_binance_klines(binance_interval, 100)
    orderbook = await fetch_binance_orderbook(100)
    
    bias = calculate_market_bias(candles, orderbook)
    return bias

@api_router.get("/support-resistance")
async def get_support_resistance(interval: str = Query(default="1h")):
    """Get support and resistance levels"""
    interval_map = {"15m": "15m", "1h": "1h", "4h": "4h", "1d": "1d"}
    binance_interval = interval_map.get(interval, "1h")
    
    candles = await fetch_binance_klines(binance_interval, 100)
    ticker = await fetch_binance_ticker()
    current_price = ticker["price"] if ticker else 0
    
    levels = calculate_support_resistance(candles, current_price)
    return {"levels": levels, "current_price": current_price}

@api_router.get("/liquidity")
async def get_liquidity(interval: str = Query(default="1h")):
    """Get liquidity clusters and direction"""
    interval_map = {"15m": "15m", "1h": "1h", "4h": "4h", "1d": "1d"}
    binance_interval = interval_map.get(interval, "1h")
    
    candles = await fetch_binance_klines(binance_interval, 100)
    ticker = await fetch_binance_ticker()
    current_price = ticker["price"] if ticker else 0
    
    clusters, direction = generate_liquidity_clusters(candles, current_price)
    return {"clusters": clusters, "direction": direction, "current_price": current_price}

@api_router.get("/whale-alerts")
async def get_whale_alerts(interval: str = Query(default="1h")):
    """Get whale alert signals"""
    interval_map = {"15m": "15m", "1h": "1h", "4h": "4h", "1d": "1d"}
    binance_interval = interval_map.get(interval, "1h")
    
    candles = await fetch_binance_klines(binance_interval, 100)
    ticker = await fetch_binance_ticker()
    current_price = ticker["price"] if ticker else 0
    
    alerts = generate_whale_alerts(candles, current_price)
    return {"alerts": alerts}

@api_router.get("/patterns")
async def get_patterns(interval: str = Query(default="1h")):
    """Get detected chart patterns"""
    interval_map = {"15m": "15m", "1h": "1h", "4h": "4h", "1d": "1d"}
    binance_interval = interval_map.get(interval, "1h")
    
    candles = await fetch_binance_klines(binance_interval, 100)
    patterns = detect_patterns(candles)
    return {"patterns": patterns}

@api_router.get("/candlesticks")
async def get_candlestick_patterns(interval: str = Query(default="1h")):
    """Get detected candlestick patterns"""
    interval_map = {"15m": "15m", "1h": "1h", "4h": "4h", "1d": "1d"}
    binance_interval = interval_map.get(interval, "1h")
    
    candles = await fetch_binance_klines(binance_interval, 100)
    patterns = detect_candlestick_patterns(candles)
    return {"patterns": patterns}

@api_router.get("/orderbook")
async def get_orderbook_analysis():
    """Get order book analysis"""
    orderbook = await fetch_binance_orderbook(100)
    ticker = await fetch_binance_ticker()
    current_price = ticker["price"] if ticker else 0
    
    analysis = analyze_orderbook(orderbook, current_price)
    return analysis

@api_router.get("/news")
async def get_news():
    """Get BTC-related news"""
    return {"news": [NewsItem(**n) for n in MOCK_NEWS]}

# ============== ALERTS CRUD ==============

@api_router.get("/alerts", response_model=List[PriceAlert])
async def get_alerts():
    """Get all price alerts"""
    alerts = await db.price_alerts.find({"is_active": True}, {"_id": 0}).to_list(100)
    return alerts

@api_router.post("/alerts", response_model=PriceAlert)
async def create_alert(alert_input: PriceAlertCreate):
    """Create a new price alert"""
    alert = PriceAlert(**alert_input.model_dump())
    doc = alert.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.price_alerts.insert_one(doc)
    return alert

@api_router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: str):
    """Delete a price alert"""
    result = await db.price_alerts.delete_one({"id": alert_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert deleted"}

@api_router.get("/alerts/history", response_model=List[PriceAlert])
async def get_alert_history():
    """Get triggered alert history"""
    alerts = await db.price_alerts.find({"triggered": True}, {"_id": 0}).to_list(100)
    return alerts

# ============== NOTES CRUD ==============

@api_router.get("/notes", response_model=List[Note])
async def get_notes():
    """Get all notes"""
    notes = await db.notes.find({}, {"_id": 0}).to_list(100)
    for note in notes:
        if isinstance(note.get('created_at'), str):
            note['created_at'] = datetime.fromisoformat(note['created_at'])
        if isinstance(note.get('updated_at'), str):
            note['updated_at'] = datetime.fromisoformat(note['updated_at'])
    return notes

@api_router.post("/notes", response_model=Note)
async def create_note(note_input: NoteCreate):
    """Create a new note"""
    note = Note(**note_input.model_dump())
    doc = note.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.notes.insert_one(doc)
    return note

@api_router.put("/notes/{note_id}", response_model=Note)
async def update_note(note_id: str, note_input: NoteCreate):
    """Update a note"""
    update_data = {
        "content": note_input.content,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.notes.update_one({"id": note_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    updated = await db.notes.find_one({"id": note_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    return Note(**updated)

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str):
    """Delete a note"""
    result = await db.notes.delete_one({"id": note_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Note deleted"}

# ============== SETTINGS ==============

@api_router.get("/settings", response_model=Settings)
async def get_settings():
    """Get user settings"""
    settings = await db.settings.find_one({}, {"_id": 0})
    if settings:
        return Settings(**settings)
    return Settings()

@api_router.put("/settings", response_model=Settings)
async def update_settings(settings: Settings):
    """Update user settings"""
    await db.settings.update_one({}, {"$set": settings.model_dump()}, upsert=True)
    return settings

@api_router.post("/telegram/test")
async def test_telegram(message: TelegramMessage):
    """Test Telegram notification"""
    settings = await db.settings.find_one({}, {"_id": 0})
    if not settings or not settings.get("telegram_bot_token") or not settings.get("telegram_chat_id"):
        raise HTTPException(status_code=400, detail="Telegram not configured")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"https://api.telegram.org/bot{settings['telegram_bot_token']}/sendMessage",
                json={
                    "chat_id": settings['telegram_chat_id'],
                    "text": message.message,
                    "parse_mode": "HTML"
                }
            )
            if response.status_code == 200:
                return {"success": True, "message": "Message sent"}
            else:
                raise HTTPException(status_code=400, detail="Failed to send message")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
