from fastapi import FastAPI, APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
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
app = FastAPI(title="CryptoRadar API", version="1.1.0")

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
    data_source: str = "Kraken"

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
    next_target: float = 0
    bias_score: int = 0
    analysis_text: str = ""
    inputs: Dict[str, Any]

class OpenInterest(BaseModel):
    total_oi: float
    change_1h: float
    change_4h: float
    change_24h: float
    trend: str  # "increasing", "decreasing", "stable"
    exchanges: List[Dict[str, Any]]
    signal: str
    data_source: str = "Simulated (CoinGlass pending)"

class FundingRate(BaseModel):
    current_rate: float
    annualized_rate: float
    payer: str  # "longs" or "shorts"
    sentiment: str  # "bullish", "bearish", "neutral"
    overcrowded: Optional[str] = None  # "longs", "shorts", or None
    signal_text: str
    data_source: str = "Simulated (CoinGlass pending)"

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
    data_source: str = "Kraken"

class NewsItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    source: str
    url: str
    timestamp: datetime
    sentiment: Optional[str] = None
    importance: str = "medium"  # "high", "medium", "low"
    description: Optional[str] = None
    image_url: Optional[str] = None

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

# ============== KRAKEN API HELPERS ==============

KRAKEN_API_URL = "https://api.kraken.com/0/public"
CRYPTOCOMPARE_NEWS_URL = "https://min-api.cryptocompare.com/data/v2/news"

# Cache for market data
market_data_cache = {
    "ticker": None,
    "ticker_time": None,
    "candles": {},
    "candles_time": {},
    "orderbook": None,
    "orderbook_time": None,
    "news": None,
    "news_time": None
}
CACHE_TTL = 15  # seconds
ORDERBOOK_CACHE_TTL = 10  # seconds
NEWS_CACHE_TTL = 300  # 5 minutes

async def fetch_kraken_ticker():
    """Fetch current BTC/USD ticker from Kraken"""
    try:
        # Check cache
        if market_data_cache["ticker"] and market_data_cache["ticker_time"]:
            if (datetime.now(timezone.utc) - market_data_cache["ticker_time"]).seconds < CACHE_TTL:
                return market_data_cache["ticker"]
        
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            response = await http_client.get(f"{KRAKEN_API_URL}/Ticker", params={"pair": "XBTUSD"})
            if response.status_code == 200:
                data = response.json()
                if data.get("error") and len(data["error"]) > 0:
                    logger.error(f"Kraken API error: {data['error']}")
                    return None
                
                ticker = data["result"]["XXBTZUSD"]
                # Kraken ticker format: a=ask, b=bid, c=last trade, v=volume, p=vwap, t=trades, l=low, h=high, o=open
                current_price = float(ticker["c"][0])
                open_price = float(ticker["o"])
                price_change = current_price - open_price
                price_change_percent = (price_change / open_price) * 100 if open_price > 0 else 0
                
                result = {
                    "price": current_price,
                    "price_change_24h": price_change,
                    "price_change_percent_24h": price_change_percent,
                    "high_24h": float(ticker["h"][1]),  # [1] is 24h
                    "low_24h": float(ticker["l"][1]),
                    "volume_24h": float(ticker["v"][1]),
                    "bid": float(ticker["b"][0]),
                    "ask": float(ticker["a"][0]),
                }
                # Update cache
                market_data_cache["ticker"] = result
                market_data_cache["ticker_time"] = datetime.now(timezone.utc)
                return result
    except Exception as e:
        logger.error(f"Error fetching Kraken ticker: {e}")
    return None

async def fetch_kraken_ohlc(interval: int = 60, since: int = None):
    """Fetch OHLC candlestick data from Kraken
    interval: 1, 5, 15, 30, 60 (1h), 240 (4h), 1440 (1d), 10080 (1w), 21600 (15d)
    """
    cache_key = f"ohlc_{interval}"
    try:
        # Check cache
        if cache_key in market_data_cache["candles"] and cache_key in market_data_cache["candles_time"]:
            if (datetime.now(timezone.utc) - market_data_cache["candles_time"][cache_key]).seconds < CACHE_TTL * 2:
                return market_data_cache["candles"][cache_key]
        
        params = {"pair": "XBTUSD", "interval": interval}
        if since:
            params["since"] = since
        
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            response = await http_client.get(f"{KRAKEN_API_URL}/OHLC", params=params)
            if response.status_code == 200:
                data = response.json()
                if data.get("error") and len(data["error"]) > 0:
                    logger.error(f"Kraken OHLC error: {data['error']}")
                    return None
                
                ohlc_data = data["result"]["XXBTZUSD"]
                candles = []
                for k in ohlc_data:
                    # Kraken OHLC: [time, open, high, low, close, vwap, volume, count]
                    candles.append({
                        "time": int(k[0]),
                        "open": float(k[1]),
                        "high": float(k[2]),
                        "low": float(k[3]),
                        "close": float(k[4]),
                        "volume": float(k[6]),
                    })
                
                # Update cache
                market_data_cache["candles"][cache_key] = candles
                market_data_cache["candles_time"][cache_key] = datetime.now(timezone.utc)
                return candles
    except Exception as e:
        logger.error(f"Error fetching Kraken OHLC: {e}")
    return None

async def fetch_kraken_orderbook(count: int = 100):
    """Fetch real order book from Kraken"""
    try:
        # Check cache
        if market_data_cache["orderbook"] and market_data_cache["orderbook_time"]:
            if (datetime.now(timezone.utc) - market_data_cache["orderbook_time"]).seconds < ORDERBOOK_CACHE_TTL:
                return market_data_cache["orderbook"]
        
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            response = await http_client.get(
                f"{KRAKEN_API_URL}/Depth",
                params={"pair": "XBTUSD", "count": count}
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("error") and len(data["error"]) > 0:
                    logger.error(f"Kraken orderbook error: {data['error']}")
                    return None
                
                book = data["result"]["XXBTZUSD"]
                # Kraken format: [[price, volume, timestamp], ...]
                orderbook = {
                    "bids": [[str(b[0]), str(b[1])] for b in book["bids"]],
                    "asks": [[str(a[0]), str(a[1])] for a in book["asks"]]
                }
                
                # Update cache
                market_data_cache["orderbook"] = orderbook
                market_data_cache["orderbook_time"] = datetime.now(timezone.utc)
                return orderbook
    except Exception as e:
        logger.error(f"Error fetching Kraken orderbook: {e}")
    return None

async def fetch_cryptocompare_news():
    """Fetch real BTC news from CryptoCompare"""
    try:
        # Check cache
        if market_data_cache["news"] and market_data_cache["news_time"]:
            if (datetime.now(timezone.utc) - market_data_cache["news_time"]).seconds < NEWS_CACHE_TTL:
                return market_data_cache["news"]
        
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.get(
                "https://min-api.cryptocompare.com/data/v2/news/",
                params={"lang": "EN"}
            )
            logger.info(f"CryptoCompare news response status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                logger.info(f"CryptoCompare news type: {data.get('Type')}, message: {data.get('Message')}")
                # Accept both Type 100 (success) and Type 0 (which also has data)
                news_data = data.get("Data", [])
                if news_data:
                    news_items = []
                    for item in news_data[:10]:  # Get top 10
                        # Filter for BTC-related news
                        title = item.get("title", "")
                        categories = item.get("categories", "").lower()
                        if not any(kw in title.lower() or kw in categories for kw in ["btc", "bitcoin", "crypto"]):
                            continue
                        
                        # Determine sentiment from title keywords
                        title_lower = title.lower()
                        bullish_words = ["surge", "rally", "bullish", "soar", "gain", "rise", "high", "record", "pump", "buy", "up", "etf", "adoption"]
                        bearish_words = ["crash", "drop", "bearish", "fall", "decline", "low", "dump", "sell", "fear", "down", "plunge", "warn"]
                        high_importance_words = ["sec", "etf", "regulation", "fed", "billion", "whale", "record", "breaking"]
                        
                        if any(word in title_lower for word in bullish_words):
                            sentiment = "bullish"
                        elif any(word in title_lower for word in bearish_words):
                            sentiment = "bearish"
                        else:
                            sentiment = "neutral"
                        
                        # Determine importance
                        if any(word in title_lower for word in high_importance_words):
                            importance = "high"
                        elif sentiment != "neutral":
                            importance = "medium"
                        else:
                            importance = "low"
                        
                        # Get description/body
                        description = item.get("body", "")[:200] + "..." if item.get("body") else None
                        
                        news_items.append({
                            "id": str(item.get("id", uuid.uuid4())),
                            "title": title,
                            "source": item.get("source_info", {}).get("name", item.get("source", "Unknown")),
                            "url": item.get("url", ""),
                            "timestamp": datetime.fromtimestamp(item.get("published_on", 0), tz=timezone.utc),
                            "sentiment": sentiment,
                            "importance": importance,
                            "description": description,
                            "image_url": item.get("imageurl", None)
                        })
                        
                        if len(news_items) >= 8:  # Limit to 8 BTC news
                            break
                    
                    # Update cache
                    market_data_cache["news"] = news_items
                    market_data_cache["news_time"] = datetime.now(timezone.utc)
                    logger.info(f"Fetched {len(news_items)} BTC news items")
                    return news_items
            else:
                logger.error(f"CryptoCompare returned status: {response.status_code}")
    except Exception as e:
        logger.error(f"Error fetching CryptoCompare news: {e}")
    return None

# Compatibility wrapper functions
async def fetch_binance_ticker():
    """Wrapper for Kraken ticker"""
    return await fetch_kraken_ticker()

async def fetch_binance_klines(interval: str = "1h", limit: int = 100):
    """Wrapper to map interval to Kraken format"""
    interval_map = {
        "15m": 15,
        "1h": 60,
        "4h": 240,
        "1d": 1440
    }
    kraken_interval = interval_map.get(interval, 60)
    return await fetch_kraken_ohlc(kraken_interval)

async def fetch_binance_orderbook(limit: int = 100):
    """Wrapper for Kraken orderbook"""
    return await fetch_kraken_orderbook(limit)

# ============== ANALYSIS ENGINES ==============

def calculate_support_resistance(candles: List[dict], current_price: float, orderbook: dict = None) -> List[SupportResistanceLevel]:
    """Calculate support and resistance levels from price data and order book"""
    if not candles or len(candles) < 20:
        return []
    
    levels = []
    highs = [c["high"] for c in candles]
    lows = [c["low"] for c in candles]
    
    # Find recent highs (potential resistance) using pivot detection
    for i in range(2, len(highs) - 2):
        if highs[i] > highs[i-1] and highs[i] > highs[i-2] and highs[i] > highs[i+1] and highs[i] > highs[i+2]:
            distance = ((highs[i] - current_price) / current_price) * 100
            # Count touches for strength
            touches = sum(1 for h in highs if abs(h - highs[i]) / highs[i] < 0.005)
            strength = "strong" if touches >= 3 else "moderate" if touches >= 2 else "weak"
            levels.append(SupportResistanceLevel(
                price=round(highs[i], 2),
                level_type="resistance",
                strength=strength,
                timeframe="1H",
                distance_percent=round(distance, 2)
            ))
    
    # Find recent lows (potential support) using pivot detection
    for i in range(2, len(lows) - 2):
        if lows[i] < lows[i-1] and lows[i] < lows[i-2] and lows[i] < lows[i+1] and lows[i] < lows[i+2]:
            distance = ((lows[i] - current_price) / current_price) * 100
            touches = sum(1 for l in lows if abs(l - lows[i]) / lows[i] < 0.005)
            strength = "strong" if touches >= 3 else "moderate" if touches >= 2 else "weak"
            levels.append(SupportResistanceLevel(
                price=round(lows[i], 2),
                level_type="support",
                strength=strength,
                timeframe="1H",
                distance_percent=round(distance, 2)
            ))
    
    # Add order book walls as S/R levels
    if orderbook:
        bids = orderbook.get("bids", [])
        asks = orderbook.get("asks", [])
        
        # Find significant bid walls (support)
        bid_volumes = [(float(b[0]), float(b[1])) for b in bids[:50]]
        if bid_volumes:
            avg_bid_vol = sum(v[1] for v in bid_volumes) / len(bid_volumes)
            for price, vol in bid_volumes:
                if vol > avg_bid_vol * 3:  # Significant wall
                    distance = ((price - current_price) / current_price) * 100
                    levels.append(SupportResistanceLevel(
                        price=round(price, 2),
                        level_type="support",
                        strength="strong" if vol > avg_bid_vol * 5 else "moderate",
                        timeframe="OrderBook",
                        distance_percent=round(distance, 2)
                    ))
        
        # Find significant ask walls (resistance)
        ask_volumes = [(float(a[0]), float(a[1])) for a in asks[:50]]
        if ask_volumes:
            avg_ask_vol = sum(v[1] for v in ask_volumes) / len(ask_volumes)
            for price, vol in ask_volumes:
                if vol > avg_ask_vol * 3:
                    distance = ((price - current_price) / current_price) * 100
                    levels.append(SupportResistanceLevel(
                        price=round(price, 2),
                        level_type="resistance",
                        strength="strong" if vol > avg_ask_vol * 5 else "moderate",
                        timeframe="OrderBook",
                        distance_percent=round(distance, 2)
                    ))
    
    # Remove duplicates and sort by distance
    seen_prices = set()
    unique_levels = []
    for level in sorted(levels, key=lambda x: abs(x.distance_percent)):
        rounded_price = round(level.price, -1)  # Round to nearest 10
        if rounded_price not in seen_prices:
            seen_prices.add(rounded_price)
            unique_levels.append(level)
    
    return unique_levels[:12]

def calculate_market_bias(candles: List[dict], orderbook: dict = None) -> MarketBias:
    """Calculate market bias from multiple indicators including real order book"""
    if not candles or len(candles) < 20:
        return MarketBias(
            bias="NEUTRAL",
            confidence=50.0,
            estimated_move=0.0,
            trap_risk="low",
            squeeze_probability=0.0,
            inputs={}
        )
    
    # Trend analysis using EMAs
    closes = [c["close"] for c in candles[-50:]]
    
    def ema(data, period):
        if len(data) < period:
            return sum(data) / len(data)
        multiplier = 2 / (period + 1)
        ema_val = sum(data[:period]) / period
        for price in data[period:]:
            ema_val = (price - ema_val) * multiplier + ema_val
        return ema_val
    
    ema_7 = ema(closes, 7)
    ema_21 = ema(closes, 21)
    current_price = closes[-1]
    
    trend_score = 0
    if current_price > ema_7 > ema_21:
        trend_score = 2  # Strong bullish
    elif current_price > ema_7:
        trend_score = 1  # Weak bullish
    elif current_price < ema_7 < ema_21:
        trend_score = -2  # Strong bearish
    elif current_price < ema_7:
        trend_score = -1  # Weak bearish
    
    # Volume analysis
    volumes = [c["volume"] for c in candles[-20:]]
    avg_volume = sum(volumes) / len(volumes) if volumes else 0
    recent_volume = volumes[-1] if volumes else 0
    volume_score = 1 if recent_volume > avg_volume * 1.5 else -1 if recent_volume < avg_volume * 0.5 else 0
    
    # Price momentum (RSI-like)
    gains = []
    losses = []
    for i in range(1, len(closes)):
        change = closes[i] - closes[i-1]
        if change > 0:
            gains.append(change)
            losses.append(0)
        else:
            gains.append(0)
            losses.append(abs(change))
    
    avg_gain = sum(gains[-14:]) / 14 if len(gains) >= 14 else 0
    avg_loss = sum(losses[-14:]) / 14 if len(losses) >= 14 else 0
    rs = avg_gain / avg_loss if avg_loss > 0 else 100
    rsi = 100 - (100 / (1 + rs))
    
    momentum_score = 1 if rsi > 60 else -1 if rsi < 40 else 0
    
    # Order book imbalance (REAL DATA)
    ob_score = 0
    ob_imbalance = 0
    if orderbook:
        bids = orderbook.get("bids", [])
        asks = orderbook.get("asks", [])
        
        # Calculate total depth in USD
        bid_depth = sum([float(b[0]) * float(b[1]) for b in bids[:30]])
        ask_depth = sum([float(a[0]) * float(a[1]) for a in asks[:30]])
        
        total_depth = bid_depth + ask_depth
        if total_depth > 0:
            ob_imbalance = ((bid_depth - ask_depth) / total_depth) * 100
            
            if ob_imbalance > 15:
                ob_score = 2  # Strong buying pressure
            elif ob_imbalance > 5:
                ob_score = 1  # Moderate buying pressure
            elif ob_imbalance < -15:
                ob_score = -2  # Strong selling pressure
            elif ob_imbalance < -5:
                ob_score = -1  # Moderate selling pressure
    
    # Calculate total score
    total_score = trend_score + volume_score + momentum_score + ob_score
    max_score = 7
    
    if total_score >= 3:
        bias = "BULLISH"
        confidence = min(50 + (total_score / max_score) * 50, 95)
    elif total_score <= -3:
        bias = "BEARISH"
        confidence = min(50 + (abs(total_score) / max_score) * 50, 95)
    else:
        bias = "NEUTRAL"
        confidence = 50 + abs(total_score) * 5
    
    # Calculate ATR for estimated move
    highs = [c["high"] for c in candles[-14:]]
    lows = [c["low"] for c in candles[-14:]]
    tr_list = [highs[i] - lows[i] for i in range(len(highs))]
    atr = sum(tr_list) / len(tr_list) if tr_list else 0
    estimated_move = (atr / current_price) * 100 if current_price > 0 else 0
    
    # Risk analysis
    recent_range = max(highs[-7:]) - min(lows[-7:]) if len(highs) >= 7 else 0
    volatility_ratio = recent_range / atr if atr > 0 else 1
    
    trap_risk = "high" if volatility_ratio > 2 or abs(ob_imbalance) > 30 else "moderate" if volatility_ratio > 1.5 else "low"
    
    # Squeeze probability (low volatility = high squeeze probability)
    squeeze_prob = max(0, min(80, (1 - (volatility_ratio / 3)) * 100)) if volatility_ratio < 3 else 0
    
    # Calculate next target based on S/R levels
    next_target = current_price
    if bias == "BULLISH":
        # Look for nearest resistance
        recent_high = max(highs[-20:]) if len(highs) >= 20 else current_price * 1.02
        next_target = recent_high if recent_high > current_price else current_price * 1.02
    elif bias == "BEARISH":
        # Look for nearest support
        recent_low = min(lows[-20:]) if len(lows) >= 20 else current_price * 0.98
        next_target = recent_low if recent_low < current_price else current_price * 0.98
    
    # Generate analysis text
    analysis_parts = []
    if bias == "BULLISH":
        if ob_imbalance > 10:
            analysis_parts.append("Strong buying pressure in order book.")
        if rsi > 50:
            analysis_parts.append("Momentum favors bulls.")
        if squeeze_prob > 40:
            analysis_parts.append(f"Short squeeze probability at {squeeze_prob:.0f}%.")
    elif bias == "BEARISH":
        if ob_imbalance < -10:
            analysis_parts.append("Heavy selling pressure detected.")
        if rsi < 50:
            analysis_parts.append("Momentum favors bears.")
        if squeeze_prob > 40:
            analysis_parts.append(f"Long squeeze probability at {squeeze_prob:.0f}%.")
    else:
        analysis_parts.append("Market indecision. Wait for clearer signals.")
    
    analysis_text = " ".join(analysis_parts) if analysis_parts else "Analyzing market conditions..."
    
    return MarketBias(
        bias=bias,
        confidence=round(confidence, 1),
        estimated_move=round(estimated_move, 2),
        trap_risk=trap_risk,
        squeeze_probability=round(squeeze_prob, 1),
        next_target=round(next_target, 2),
        bias_score=total_score,
        analysis_text=analysis_text,
        inputs={
            "trend_score": trend_score,
            "volume_score": volume_score,
            "momentum_score": momentum_score,
            "orderbook_score": ob_score,
            "rsi": round(rsi, 1),
            "orderbook_imbalance": round(ob_imbalance, 2)
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
    
    # Double Top Detection (look for M pattern)
    recent_highs = []
    for i in range(-25, -2):
        if i >= -len(highs):
            if highs[i] > highs[i-1] and highs[i] > highs[i+1]:
                recent_highs.append((i, highs[i]))
    
    if len(recent_highs) >= 2:
        h1, h2 = recent_highs[-2], recent_highs[-1]
        price_diff_pct = abs(h1[1] - h2[1]) / h1[1] * 100
        if price_diff_pct < 1.5 and h2[0] - h1[0] >= 5:  # Within 1.5% and separated
            neckline = min(lows[h1[0]:h2[0]]) if h1[0] < h2[0] else min(lows)
            target = neckline - (h1[1] - neckline)
            patterns.append(PatternDetection(
                pattern="Double Top",
                direction="BEARISH",
                confidence=75.0 - price_diff_pct * 5,
                estimated_move=round(((target - current_price) / current_price) * 100, 2),
                timeframe="1H",
                start_price=h1[1],
                target_price=round(target, 2),
                timestamp=datetime.now(timezone.utc)
            ))
    
    # Double Bottom Detection (look for W pattern)
    recent_lows = []
    for i in range(-25, -2):
        if i >= -len(lows):
            if lows[i] < lows[i-1] and lows[i] < lows[i+1]:
                recent_lows.append((i, lows[i]))
    
    if len(recent_lows) >= 2:
        l1, l2 = recent_lows[-2], recent_lows[-1]
        price_diff_pct = abs(l1[1] - l2[1]) / l1[1] * 100
        if price_diff_pct < 1.5 and l2[0] - l1[0] >= 5:
            neckline = max(highs[l1[0]:l2[0]]) if l1[0] < l2[0] else max(highs)
            target = neckline + (neckline - l1[1])
            patterns.append(PatternDetection(
                pattern="Double Bottom",
                direction="BULLISH",
                confidence=75.0 - price_diff_pct * 5,
                estimated_move=round(((target - current_price) / current_price) * 100, 2),
                timeframe="1H",
                start_price=l1[1],
                target_price=round(target, 2),
                timestamp=datetime.now(timezone.utc)
            ))
    
    # Bull Flag Detection
    if len(closes) >= 25:
        pole_start = closes[-25]
        pole_end = max(closes[-25:-15])
        pole_move = (pole_end - pole_start) / pole_start * 100
        
        flag_high = max(closes[-10:])
        flag_low = min(closes[-10:])
        flag_range = (flag_high - flag_low) / current_price * 100
        
        if pole_move > 3 and flag_range < 2:
            target = current_price + (pole_end - pole_start)
            patterns.append(PatternDetection(
                pattern="Bull Flag",
                direction="BULLISH",
                confidence=70.0,
                estimated_move=round(pole_move * 0.7, 2),
                timeframe="1H",
                start_price=pole_start,
                target_price=round(target, 2),
                timestamp=datetime.now(timezone.utc)
            ))
    
    # Bear Flag Detection
    if len(closes) >= 25:
        pole_start = closes[-25]
        pole_end = min(closes[-25:-15])
        pole_move = (pole_start - pole_end) / pole_start * 100
        
        flag_high = max(closes[-10:])
        flag_low = min(closes[-10:])
        flag_range = (flag_high - flag_low) / current_price * 100
        
        if pole_move > 3 and flag_range < 2:
            target = current_price - (pole_start - pole_end)
            patterns.append(PatternDetection(
                pattern="Bear Flag",
                direction="BEARISH",
                confidence=68.0,
                estimated_move=round(-pole_move * 0.7, 2),
                timeframe="1H",
                start_price=pole_start,
                target_price=round(target, 2),
                timestamp=datetime.now(timezone.utc)
            ))
    
    # Triangle Detection
    if len(highs) >= 20 and len(lows) >= 20:
        recent_highs_vals = highs[-20:]
        recent_lows_vals = lows[-20:]
        
        high_slope = (recent_highs_vals[-1] - recent_highs_vals[0]) / 20
        low_slope = (recent_lows_vals[-1] - recent_lows_vals[0]) / 20
        
        if high_slope < 0 and low_slope > 0:  # Converging
            patterns.append(PatternDetection(
                pattern="Symmetrical Triangle",
                direction="NEUTRAL",
                confidence=65.0,
                estimated_move=2.5,
                timeframe="1H",
                start_price=closes[-20],
                target_price=round(current_price * 1.025, 2),
                timestamp=datetime.now(timezone.utc)
            ))
    
    return patterns

def detect_candlestick_patterns(candles: List[dict]) -> List[CandlestickPattern]:
    """Detect candlestick patterns"""
    if not candles or len(candles) < 5:
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
            
            is_bullish = c["close"] > c["open"]
            body_pct = body / total_range
            
            # Doji
            if body_pct < 0.1:
                patterns.append(CandlestickPattern(
                    pattern="Doji",
                    signal="NEUTRAL",
                    confidence=65.0,
                    candle_time=c["time"],
                    explanation="Doji indicates market indecision. Equal buying and selling pressure. Watch for direction confirmation on next candle."
                ))
            
            # Hammer (bullish reversal)
            elif lower_wick > body * 2.5 and upper_wick < body * 0.5 and is_bullish:
                patterns.append(CandlestickPattern(
                    pattern="Hammer",
                    signal="BULLISH",
                    confidence=72.0,
                    candle_time=c["time"],
                    explanation="Hammer shows strong rejection of lower prices. Buyers stepped in aggressively. Potential bullish reversal signal."
                ))
            
            # Inverted Hammer
            elif upper_wick > body * 2.5 and lower_wick < body * 0.5 and is_bullish:
                patterns.append(CandlestickPattern(
                    pattern="Inverted Hammer",
                    signal="BULLISH",
                    confidence=65.0,
                    candle_time=c["time"],
                    explanation="Inverted Hammer at support can signal bullish reversal. Confirmation needed."
                ))
            
            # Shooting Star (bearish reversal)
            elif upper_wick > body * 2.5 and lower_wick < body * 0.5 and not is_bullish:
                patterns.append(CandlestickPattern(
                    pattern="Shooting Star",
                    signal="BEARISH",
                    confidence=70.0,
                    candle_time=c["time"],
                    explanation="Shooting Star shows rejection of higher prices. Sellers overwhelmed buyers. Potential bearish reversal."
                ))
            
            # Hanging Man
            elif lower_wick > body * 2.5 and upper_wick < body * 0.5 and not is_bullish:
                patterns.append(CandlestickPattern(
                    pattern="Hanging Man",
                    signal="BEARISH",
                    confidence=65.0,
                    candle_time=c["time"],
                    explanation="Hanging Man at resistance warns of potential reversal. Selling pressure emerging."
                ))
            
            # Engulfing patterns
            if i > -len(candles) + 1:
                prev = candles[i-1]
                prev_body = abs(prev["close"] - prev["open"])
                prev_is_bullish = prev["close"] > prev["open"]
                
                # Bullish Engulfing
                if not prev_is_bullish and is_bullish:
                    if c["open"] <= prev["close"] and c["close"] >= prev["open"] and body > prev_body * 1.2:
                        patterns.append(CandlestickPattern(
                            pattern="Bullish Engulfing",
                            signal="BULLISH",
                            confidence=78.0,
                            candle_time=c["time"],
                            explanation="Bullish Engulfing shows strong buying momentum completely overwhelming prior selling. High probability reversal signal."
                        ))
                
                # Bearish Engulfing
                if prev_is_bullish and not is_bullish:
                    if c["open"] >= prev["close"] and c["close"] <= prev["open"] and body > prev_body * 1.2:
                        patterns.append(CandlestickPattern(
                            pattern="Bearish Engulfing",
                            signal="BEARISH",
                            confidence=78.0,
                            candle_time=c["time"],
                            explanation="Bearish Engulfing shows strong selling momentum completely overwhelming prior buying. High probability reversal signal."
                        ))
    
    return patterns[-6:]

def analyze_orderbook(orderbook: dict, current_price: float) -> OrderBookAnalysis:
    """Analyze real order book for walls and imbalance"""
    if not orderbook:
        return OrderBookAnalysis(
            top_bid_wall={"price": 0, "quantity": 0},
            top_ask_wall={"price": 0, "quantity": 0},
            imbalance=0.0,
            imbalance_direction="balanced",
            bid_depth=0,
            ask_depth=0,
            data_source="Unavailable"
        )
    
    bids = orderbook.get("bids", [])
    asks = orderbook.get("asks", [])
    
    # Find largest bid wall
    bid_walls = [(float(b[0]), float(b[1])) for b in bids]
    bid_walls_sorted = sorted(bid_walls, key=lambda x: x[1], reverse=True)
    top_bid = bid_walls_sorted[0] if bid_walls_sorted else (0, 0)
    
    # Find largest ask wall
    ask_walls = [(float(a[0]), float(a[1])) for a in asks]
    ask_walls_sorted = sorted(ask_walls, key=lambda x: x[1], reverse=True)
    top_ask = ask_walls_sorted[0] if ask_walls_sorted else (0, 0)
    
    # Calculate depth in USD (price * quantity)
    bid_depth = sum([float(b[0]) * float(b[1]) for b in bids[:50]])
    ask_depth = sum([float(a[0]) * float(a[1]) for a in asks[:50]])
    
    total_depth = bid_depth + ask_depth
    imbalance = ((bid_depth - ask_depth) / total_depth * 100) if total_depth > 0 else 0
    
    if imbalance > 15:
        direction = "bullish"
    elif imbalance < -15:
        direction = "bearish"
    else:
        direction = "balanced"
    
    return OrderBookAnalysis(
        top_bid_wall={"price": round(top_bid[0], 2), "quantity": round(top_bid[1], 4)},
        top_ask_wall={"price": round(top_ask[0], 2), "quantity": round(top_ask[1], 4)},
        imbalance=round(imbalance, 2),
        imbalance_direction=direction,
        bid_depth=round(bid_depth, 2),
        ask_depth=round(ask_depth, 2),
        data_source="Kraken"
    )

def generate_liquidity_clusters(candles: List[dict], current_price: float, orderbook: dict = None) -> tuple:
    """Generate liquidity cluster data from order book analysis"""
    clusters = []
    
    if orderbook:
        bids = orderbook.get("bids", [])
        asks = orderbook.get("asks", [])
        
        # Calculate average volumes to identify significant levels
        bid_volumes = [(float(b[0]), float(b[1])) for b in bids[:50]]
        ask_volumes = [(float(a[0]), float(a[1])) for a in asks[:50]]
        
        if bid_volumes:
            avg_bid_vol = sum(v[1] for v in bid_volumes) / len(bid_volumes)
            
            # Find clusters of significant buy orders (liquidity below)
            for price, vol in bid_volumes:
                if vol > avg_bid_vol * 1.5:  # Above average
                    distance = ((price - current_price) / current_price) * 100
                    strength = "high" if vol > avg_bid_vol * 3 else "medium" if vol > avg_bid_vol * 2 else "low"
                    clusters.append(LiquidityCluster(
                        price=round(price, 2),
                        strength=strength,
                        distance_percent=round(distance, 2),
                        side="below",
                        estimated_value=round(price * vol, 0)
                    ))
        
        if ask_volumes:
            avg_ask_vol = sum(v[1] for v in ask_volumes) / len(ask_volumes)
            
            # Find clusters of significant sell orders (liquidity above)
            for price, vol in ask_volumes:
                if vol > avg_ask_vol * 1.5:
                    distance = ((price - current_price) / current_price) * 100
                    strength = "high" if vol > avg_ask_vol * 3 else "medium" if vol > avg_ask_vol * 2 else "low"
                    clusters.append(LiquidityCluster(
                        price=round(price, 2),
                        strength=strength,
                        distance_percent=round(distance, 2),
                        side="above",
                        estimated_value=round(price * vol, 0)
                    ))
    
    # Also add historical S/R levels as potential liquidity zones
    if candles and len(candles) >= 20:
        highs = [c["high"] for c in candles[-50:]]
        lows = [c["low"] for c in candles[-50:]]
        
        # Recent resistance levels
        for h in sorted(set(highs), reverse=True)[:3]:
            if h > current_price:
                distance = ((h - current_price) / current_price) * 100
                if distance < 5:  # Within 5%
                    clusters.append(LiquidityCluster(
                        price=round(h, 2),
                        strength="medium",
                        distance_percent=round(distance, 2),
                        side="above",
                        estimated_value=0
                    ))
        
        # Recent support levels
        for l in sorted(set(lows))[:3]:
            if l < current_price:
                distance = ((l - current_price) / current_price) * 100
                if abs(distance) < 5:
                    clusters.append(LiquidityCluster(
                        price=round(l, 2),
                        strength="medium",
                        distance_percent=round(distance, 2),
                        side="below",
                        estimated_value=0
                    ))
    
    # Calculate liquidity direction based on order book imbalance
    above_value = sum(c.estimated_value for c in clusters if c.side == "above")
    below_value = sum(c.estimated_value for c in clusters if c.side == "below")
    
    above_clusters = [c for c in clusters if c.side == "above"]
    below_clusters = [c for c in clusters if c.side == "below"]
    
    if above_value > below_value * 1.3 or len(above_clusters) > len(below_clusters) * 1.5:
        direction = "UP"
        next_target = min(c.price for c in above_clusters) if above_clusters else current_price
    elif below_value > above_value * 1.3 or len(below_clusters) > len(above_clusters) * 1.5:
        direction = "DOWN"
        next_target = max(c.price for c in below_clusters) if below_clusters else current_price
    else:
        direction = "BALANCED"
        next_target = current_price
    
    imbalance_ratio = (above_value / below_value) if below_value > 0 else 1.0
    
    liq_direction = LiquidityDirection(
        direction=direction,
        next_target=round(next_target, 2),
        distance_percent=round(((next_target - current_price) / current_price) * 100, 2),
        imbalance_ratio=round(imbalance_ratio, 2)
    )
    
    # Remove duplicates and limit results
    seen_prices = set()
    unique_clusters = []
    for c in sorted(clusters, key=lambda x: abs(x.distance_percent)):
        rounded = round(c.price, -1)
        if rounded not in seen_prices:
            seen_prices.add(rounded)
            unique_clusters.append(c)
    
    return unique_clusters[:12], liq_direction

def generate_whale_alerts(candles: List[dict], current_price: float, orderbook: dict = None) -> List[WhaleAlert]:
    """Generate whale alert signals based on volume and order book analysis"""
    if not candles or len(candles) < 20:
        return []
    
    alerts = []
    volumes = [c["volume"] for c in candles[-30:]]
    avg_volume = sum(volumes) / len(volumes) if volumes else 0
    
    # Detect volume spikes
    for i in range(-7, 0):
        if i >= -len(candles):
            c = candles[i]
            if c["volume"] > avg_volume * 2.5:  # Significant volume spike
                is_bullish = c["close"] > c["open"]
                signal = "LONG" if is_bullish else "SHORT"
                entry = c["close"]
                
                # Calculate target based on volume intensity
                volume_ratio = c["volume"] / avg_volume
                move_pct = min(3.0, 1.5 + (volume_ratio - 2.5) * 0.5)
                if not is_bullish:
                    move_pct = -move_pct
                
                target = entry * (1 + move_pct / 100)
                confidence = min(85, 60 + (volume_ratio - 2) * 8)
                
                alerts.append(WhaleAlert(
                    signal=signal,
                    entry=round(entry, 2),
                    target=round(target, 2),
                    confidence=round(confidence, 1),
                    estimated_move=round(move_pct, 2),
                    timeframe="1H",
                    timestamp=datetime.fromtimestamp(c["time"], tz=timezone.utc),
                    reason=f"Volume spike detected ({volume_ratio:.1f}x average). {'Buying' if is_bullish else 'Selling'} pressure."
                ))
    
    # Detect large order book imbalances
    if orderbook:
        bids = orderbook.get("bids", [])
        asks = orderbook.get("asks", [])
        
        bid_depth = sum([float(b[0]) * float(b[1]) for b in bids[:20]])
        ask_depth = sum([float(a[0]) * float(a[1]) for a in asks[:20]])
        
        imbalance = ((bid_depth - ask_depth) / (bid_depth + ask_depth) * 100) if (bid_depth + ask_depth) > 0 else 0
        
        if abs(imbalance) > 25:
            is_bullish = imbalance > 0
            signal = "LONG" if is_bullish else "SHORT"
            move_pct = abs(imbalance) / 15
            if not is_bullish:
                move_pct = -move_pct
            
            alerts.append(WhaleAlert(
                signal=signal,
                entry=round(current_price, 2),
                target=round(current_price * (1 + move_pct / 100), 2),
                confidence=round(min(80, 55 + abs(imbalance) / 2), 1),
                estimated_move=round(move_pct, 2),
                timeframe="Current",
                timestamp=datetime.now(timezone.utc),
                reason=f"Order book imbalance: {imbalance:.1f}%. Heavy {'buying' if is_bullish else 'selling'} pressure detected."
            ))
    
    return alerts[-5:]

def generate_open_interest(current_price: float, candles: List[dict] = None) -> OpenInterest:
    """Generate simulated Open Interest data (CoinGlass integration pending)"""
    import random
    
    # Simulate OI based on price action
    base_oi = 35.5  # Billion USD
    
    # Random variations
    change_1h = random.uniform(-2.5, 2.5)
    change_4h = random.uniform(-5, 5)
    change_24h = random.uniform(-8, 8)
    
    # Determine trend based on changes
    if change_24h > 3:
        trend = "increasing"
        signal = "Increasing OI suggests new positions being opened. If price rising, bullish continuation likely."
    elif change_24h < -3:
        trend = "decreasing"
        signal = "Decreasing OI indicates positions being closed. Potential trend exhaustion."
    else:
        trend = "stable"
        signal = "Stable OI shows market consolidation. Watch for breakout."
    
    # Simulated exchange distribution
    exchanges = [
        {"name": "Binance", "oi": round(base_oi * 0.45, 2), "share": 45},
        {"name": "OKX", "oi": round(base_oi * 0.20, 2), "share": 20},
        {"name": "Bybit", "oi": round(base_oi * 0.18, 2), "share": 18},
        {"name": "Bitget", "oi": round(base_oi * 0.10, 2), "share": 10},
        {"name": "Others", "oi": round(base_oi * 0.07, 2), "share": 7},
    ]
    
    return OpenInterest(
        total_oi=round(base_oi, 2),
        change_1h=round(change_1h, 2),
        change_4h=round(change_4h, 2),
        change_24h=round(change_24h, 2),
        trend=trend,
        exchanges=exchanges,
        signal=signal,
        data_source="Simulated (CoinGlass pending)"
    )

def generate_funding_rate(orderbook: dict = None) -> FundingRate:
    """Generate simulated Funding Rate data (CoinGlass integration pending)"""
    import random
    
    # Base funding rate (typically -0.01% to 0.03%)
    base_rate = random.uniform(-0.015, 0.035)
    
    # Annualized (rate * 3 * 365)
    annualized = base_rate * 3 * 365
    
    # Determine payer and sentiment
    if base_rate > 0.02:
        payer = "longs"
        sentiment = "bullish"
        overcrowded = "longs"
        signal_text = "Longs are overcrowded. High funding rate suggests potential long squeeze risk."
    elif base_rate > 0:
        payer = "longs"
        sentiment = "bullish"
        overcrowded = None
        signal_text = "Positive funding indicates bullish sentiment. Longs paying shorts."
    elif base_rate < -0.01:
        payer = "shorts"
        sentiment = "bearish"
        overcrowded = "shorts"
        signal_text = "Shorts are overcrowded. Negative funding suggests potential short squeeze."
    else:
        payer = "shorts" if base_rate < 0 else "longs"
        sentiment = "neutral"
        overcrowded = None
        signal_text = "Neutral funding rate. Market is balanced between longs and shorts."
    
    return FundingRate(
        current_rate=round(base_rate, 4),
        annualized_rate=round(annualized, 2),
        payer=payer,
        sentiment=sentiment,
        overcrowded=overcrowded,
        signal_text=signal_text,
        data_source="Simulated (CoinGlass pending)"
    )

# ============== API ROUTES ==============

@api_router.get("/health")
async def health_check():
    """System health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "CryptoRadar API",
        "version": "1.1.0",
        "data_sources": {
            "market_data": "Kraken",
            "news": "CryptoCompare"
        }
    }

@api_router.get("/market/status")
async def get_market_status():
    """Get current BTCUSDT market status from Kraken"""
    ticker = await fetch_kraken_ticker()
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
            timestamp=datetime.now(timezone.utc),
            data_source="Kraken"
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
        timestamp=datetime.now(timezone.utc),
        data_source="Unavailable"
    )

@api_router.get("/chart/candles")
async def get_candles(
    interval: str = Query(default="1h", description="Timeframe: 15m, 1h, 4h, 1d"),
    limit: int = Query(default=200, le=500)
):
    """Get candlestick data from Kraken"""
    interval_map = {"15m": 15, "1h": 60, "4h": 240, "1d": 1440}
    kraken_interval = interval_map.get(interval, 60)
    candles = await fetch_kraken_ohlc(kraken_interval)
    if candles:
        # Limit results
        candles = candles[-limit:] if len(candles) > limit else candles
        return {"candles": candles, "interval": interval, "data_source": "Kraken"}
    return {"candles": [], "interval": interval, "data_source": "Unavailable"}

@api_router.get("/market/bias")
async def get_market_bias(interval: str = Query(default="1h")):
    """Get market bias analysis with real order book data"""
    interval_map = {"15m": 15, "1h": 60, "4h": 240, "1d": 1440}
    kraken_interval = interval_map.get(interval, 60)
    
    candles = await fetch_kraken_ohlc(kraken_interval)
    orderbook = await fetch_kraken_orderbook(100)
    
    bias = calculate_market_bias(candles, orderbook)
    return bias

@api_router.get("/support-resistance")
async def get_support_resistance(interval: str = Query(default="1h")):
    """Get support and resistance levels from price data and order book"""
    interval_map = {"15m": 15, "1h": 60, "4h": 240, "1d": 1440}
    kraken_interval = interval_map.get(interval, 60)
    
    candles = await fetch_kraken_ohlc(kraken_interval)
    ticker = await fetch_kraken_ticker()
    orderbook = await fetch_kraken_orderbook(100)
    current_price = ticker["price"] if ticker else 0
    
    levels = calculate_support_resistance(candles, current_price, orderbook)
    return {"levels": levels, "current_price": current_price, "data_source": "Kraken"}

@api_router.get("/liquidity")
async def get_liquidity(interval: str = Query(default="1h")):
    """Get liquidity clusters from order book analysis"""
    interval_map = {"15m": 15, "1h": 60, "4h": 240, "1d": 1440}
    kraken_interval = interval_map.get(interval, 60)
    
    candles = await fetch_kraken_ohlc(kraken_interval)
    ticker = await fetch_kraken_ticker()
    orderbook = await fetch_kraken_orderbook(100)
    current_price = ticker["price"] if ticker else 0
    
    clusters, direction = generate_liquidity_clusters(candles, current_price, orderbook)
    return {
        "clusters": clusters, 
        "direction": direction, 
        "current_price": current_price,
        "data_source": "Kraken OrderBook"
    }

@api_router.get("/whale-alerts")
async def get_whale_alerts(interval: str = Query(default="1h")):
    """Get whale alert signals from volume and order book analysis"""
    interval_map = {"15m": 15, "1h": 60, "4h": 240, "1d": 1440}
    kraken_interval = interval_map.get(interval, 60)
    
    candles = await fetch_kraken_ohlc(kraken_interval)
    ticker = await fetch_kraken_ticker()
    orderbook = await fetch_kraken_orderbook(100)
    current_price = ticker["price"] if ticker else 0
    
    alerts = generate_whale_alerts(candles, current_price, orderbook)
    return {"alerts": alerts, "data_source": "Kraken"}

@api_router.get("/patterns")
async def get_patterns(interval: str = Query(default="1h")):
    """Get detected chart patterns"""
    interval_map = {"15m": 15, "1h": 60, "4h": 240, "1d": 1440}
    kraken_interval = interval_map.get(interval, 60)
    
    candles = await fetch_kraken_ohlc(kraken_interval)
    patterns = detect_patterns(candles)
    return {"patterns": patterns}

@api_router.get("/candlesticks")
async def get_candlestick_patterns(interval: str = Query(default="1h")):
    """Get detected candlestick patterns"""
    interval_map = {"15m": 15, "1h": 60, "4h": 240, "1d": 1440}
    kraken_interval = interval_map.get(interval, 60)
    
    candles = await fetch_kraken_ohlc(kraken_interval)
    patterns = detect_candlestick_patterns(candles)
    return {"patterns": patterns}

@api_router.get("/orderbook")
async def get_orderbook_analysis():
    """Get real order book analysis from Kraken"""
    orderbook = await fetch_kraken_orderbook(100)
    ticker = await fetch_kraken_ticker()
    current_price = ticker["price"] if ticker else 0
    
    analysis = analyze_orderbook(orderbook, current_price)
    return analysis

@api_router.get("/open-interest")
async def get_open_interest():
    """Get Open Interest data (simulated until CoinGlass integration)"""
    ticker = await fetch_kraken_ticker()
    candles = await fetch_kraken_ohlc(60)
    current_price = ticker["price"] if ticker else 0
    
    oi = generate_open_interest(current_price, candles)
    return oi

@api_router.get("/funding-rate")
async def get_funding_rate():
    """Get Funding Rate data (simulated until CoinGlass integration)"""
    orderbook = await fetch_kraken_orderbook(100)
    
    funding = generate_funding_rate(orderbook)
    return funding
    current_price = ticker["price"] if ticker else 0
    
    analysis = analyze_orderbook(orderbook, current_price)
    return analysis

@api_router.get("/news")
async def get_news():
    """Get real BTC-related news from CryptoCompare"""
    news = await fetch_cryptocompare_news()
    if news:
        return {"news": [NewsItem(**n) for n in news], "data_source": "CryptoCompare"}
    return {"news": [], "data_source": "Unavailable"}

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
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            response = await http_client.post(
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

# ============== WEBSOCKET FOR REAL-TIME PRICE ==============

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

@api_router.websocket("/ws/price")
async def websocket_price(websocket: WebSocket):
    """WebSocket endpoint for real-time price updates"""
    await manager.connect(websocket)
    try:
        while True:
            ticker = await fetch_kraken_ticker()
            if ticker:
                await websocket.send_json({
                    "type": "price_update",
                    "data": {
                        "price": ticker["price"],
                        "change_24h": ticker["price_change_percent_24h"],
                        "high_24h": ticker["high_24h"],
                        "low_24h": ticker["low_24h"],
                        "volume_24h": ticker["volume_24h"],
                        "bid": ticker.get("bid", 0),
                        "ask": ticker.get("ask", 0),
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                })
            await asyncio.sleep(5)  # Update every 5 seconds
    except WebSocketDisconnect:
        manager.disconnect(websocket)

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
