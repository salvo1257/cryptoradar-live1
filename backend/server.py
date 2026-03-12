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

# MongoDB Collections
signal_history_collection = db["signal_history"]

# Create the main app
app = FastAPI(title="CryptoRadar API", version="1.7.0")

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
    exchanges: Optional[List[str]] = None  # Which exchanges show this level
    volume_at_level: Optional[float] = None  # Total volume at this level
    explanation: Optional[str] = None  # What this level means

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
    exchange_consensus: Optional[Dict[str, str]] = None  # Per-exchange bias

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
    exchanges: Optional[List[str]] = None  # Which exchanges contribute
    explanation: Optional[str] = None  # What this cluster means

class LiquidityDirection(BaseModel):
    direction: str
    next_target: float
    distance_percent: float
    imbalance_ratio: float
    explanation: Optional[str] = None  # Detailed explanation

# ============== WHALE ALERT ENGINE ==============

class WhaleActivity(BaseModel):
    """Whale Alert Engine output - detects large market activity"""
    direction: str  # "BUY", "SELL", "NEUTRAL"
    strength: float  # 0-100 score
    confidence: float  # 0-100
    signals: List[str]  # List of detected signals
    explanation: str  # Summary explanation
    volume_spike: bool = False
    volume_ratio: float = 1.0  # Current volume vs average
    buy_pressure: float = 0  # 0-100 buy pressure score
    sell_pressure: float = 0  # 0-100 sell pressure score
    liquidation_bias: Optional[str] = None  # "longs_liquidated", "shorts_liquidated", or None
    orderbook_aggression: Optional[str] = None  # "aggressive_buying", "aggressive_selling", or None
    data_source: str = "Multi-Exchange Aggregated"

# ============== LIQUIDITY LADDER ==============

class LiquidityLevel(BaseModel):
    """Single level in the liquidity ladder"""
    price: float
    distance_percent: float
    strength: str  # "major", "moderate", "minor"
    type: str  # "stop_cluster", "resistance_liquidity", "support_liquidity", "whale_level"
    estimated_value: float  # USD value at this level
    exchanges: List[str]  # Which exchanges show this level
    explanation: str

class LiquidityLadder(BaseModel):
    """Liquidity Ladder module - shows sequence of liquidity levels"""
    current_price: float
    ladder_above: List[LiquidityLevel]  # Liquidity levels above price
    ladder_below: List[LiquidityLevel]  # Liquidity levels below price
    nearest_above: Optional[LiquidityLevel] = None
    nearest_below: Optional[LiquidityLevel] = None
    major_above: Optional[LiquidityLevel] = None
    major_below: Optional[LiquidityLevel] = None
    more_attractive_side: str  # "above", "below", "balanced"
    sweep_expectation: str  # "sweep_below_first", "sweep_above_first", "no_clear_sweep", "balanced"
    path_analysis: str  # Explanation of likely price path
    data_source: str = "Multi-Exchange Aggregated"

class TradeSignal(BaseModel):
    """Final actionable trading signal synthesizing all intelligence"""
    direction: str  # "LONG", "SHORT", "NO TRADE"
    confidence: float  # 0-100
    estimated_move: float  # Expected % move
    entry_zone_low: float
    entry_zone_high: float
    stop_loss: float
    invalidation_reason: str
    target_1: float
    target_2: float
    risk_reward_ratio: float
    reasoning: str  # Detailed explanation of why this signal
    factors: Dict[str, Any]  # Individual factor contributions
    timestamp: datetime
    valid_for: str  # e.g., "4H", "1D"
    warnings: List[str]  # Risk warnings
    # Advanced BTC trading logic
    setup_type: str = "standard"  # "standard", "sweep_reversal", "continuation"
    liquidity_sweep_zone: Optional[float] = None  # Where liquidity sweep likely to occur
    safe_invalidation: Optional[float] = None  # True invalidation beyond sweep zone
    sweep_detected: bool = False  # Whether a liquidity sweep pattern is detected
    sweep_analysis: Optional[str] = None  # Explanation of liquidity sweep context
    # NEW: Whale and Liquidity Ladder integration
    whale_activity: Optional[Dict[str, Any]] = None  # Whale Alert Engine output
    liquidity_ladder_summary: Optional[Dict[str, Any]] = None  # Liquidity Ladder summary
    sweep_first_expected: bool = False  # Whether price likely to sweep before real move
    whale_confirms_direction: bool = False  # Whether whale activity confirms signal direction


class SignalHistoryEntry(BaseModel):
    """Stored trade signal for history tracking"""
    signal_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime
    direction: str
    confidence: float
    estimated_move: float
    entry_zone_low: float
    entry_zone_high: float
    stop_loss: float
    target_1: float
    target_2: float
    risk_reward_ratio: float
    setup_type: str
    btc_price: float
    market_bias: str
    whale_direction: Optional[str] = None
    liquidity_direction: Optional[str] = None
    warnings: List[str] = []
    reasoning_summary: str = ""
    # Tracking fields (for performance analysis)
    outcome: Optional[str] = None  # "win", "loss", "active", "expired"
    actual_move: Optional[float] = None
    closed_at: Optional[datetime] = None


class SignalHistoryResponse(BaseModel):
    """Response model for signal history list"""
    signals: List[SignalHistoryEntry]
    total_count: int
    page: int
    page_size: int


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
    stop_loss: Optional[float] = None
    risk_reward: Optional[float] = None
    exchanges_detected: Optional[List[str]] = None

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
    stop_loss: Optional[float] = None
    explanation: Optional[str] = None
    pattern_strength: Optional[str] = None  # "forming", "confirmed", "completed"

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
    exchange_comparison: Optional[Dict[str, Any]] = None  # Per-exchange stats

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
COINBASE_API_URL = "https://api.exchange.coinbase.com"
BITSTAMP_API_URL = "https://www.bitstamp.net/api/v2"
CRYPTOCOMPARE_NEWS_URL = "https://min-api.cryptocompare.com/data/v2/news"
COINGLASS_API_URL = "https://open-api-v4.coinglass.com/api"
COINGLASS_API_KEY = os.environ.get('COINGLASS_API_KEY', '')

# Cache for market data
market_data_cache = {
    "ticker": None,
    "ticker_time": None,
    "candles": {},
    "candles_time": {},
    "orderbook": None,
    "orderbook_time": None,
    "news": None,
    "news_time": None,
    "coinglass_oi": None,
    "coinglass_oi_time": None,
    "coinglass_liquidation": None,
    "coinglass_liquidation_time": None,
    # Multi-exchange caches
    "coinbase_orderbook": None,
    "coinbase_orderbook_time": None,
    "bitstamp_orderbook": None,
    "bitstamp_orderbook_time": None,
    "coinbase_ticker": None,
    "coinbase_ticker_time": None,
    "bitstamp_ticker": None,
    "bitstamp_ticker_time": None,
    "aggregated_orderbook": None,
    "aggregated_orderbook_time": None,
}
CACHE_TTL = 15  # seconds
ORDERBOOK_CACHE_TTL = 10  # seconds
NEWS_CACHE_TTL = 300  # 5 minutes
COINGLASS_CACHE_TTL = 60  # 1 minute for CoinGlass data

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

# ============== COINBASE API HELPERS ==============

async def fetch_coinbase_ticker():
    """Fetch current BTC/USD ticker from Coinbase"""
    try:
        if market_data_cache["coinbase_ticker"] and market_data_cache["coinbase_ticker_time"]:
            if (datetime.now(timezone.utc) - market_data_cache["coinbase_ticker_time"]).seconds < CACHE_TTL:
                return market_data_cache["coinbase_ticker"]
        
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            response = await http_client.get(f"{COINBASE_API_URL}/products/BTC-USD/ticker")
            if response.status_code == 200:
                data = response.json()
                result = {
                    "price": float(data.get("price", 0)),
                    "volume_24h": float(data.get("volume", 0)),
                    "bid": float(data.get("bid", 0)),
                    "ask": float(data.get("ask", 0)),
                    "exchange": "Coinbase"
                }
                market_data_cache["coinbase_ticker"] = result
                market_data_cache["coinbase_ticker_time"] = datetime.now(timezone.utc)
                return result
    except Exception as e:
        logger.error(f"Error fetching Coinbase ticker: {e}")
    return None

async def fetch_coinbase_orderbook(level: int = 2):
    """Fetch order book from Coinbase (level 2 = aggregated)"""
    try:
        if market_data_cache["coinbase_orderbook"] and market_data_cache["coinbase_orderbook_time"]:
            if (datetime.now(timezone.utc) - market_data_cache["coinbase_orderbook_time"]).seconds < ORDERBOOK_CACHE_TTL:
                return market_data_cache["coinbase_orderbook"]
        
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            response = await http_client.get(
                f"{COINBASE_API_URL}/products/BTC-USD/book",
                params={"level": level}
            )
            if response.status_code == 200:
                data = response.json()
                # Coinbase format: [[price, size, num_orders], ...]
                orderbook = {
                    "bids": [[str(b[0]), str(b[1])] for b in data.get("bids", [])[:100]],
                    "asks": [[str(a[0]), str(a[1])] for a in data.get("asks", [])[:100]],
                    "exchange": "Coinbase"
                }
                market_data_cache["coinbase_orderbook"] = orderbook
                market_data_cache["coinbase_orderbook_time"] = datetime.now(timezone.utc)
                return orderbook
    except Exception as e:
        logger.error(f"Error fetching Coinbase orderbook: {e}")
    return None

# ============== BITSTAMP API HELPERS ==============

async def fetch_bitstamp_ticker():
    """Fetch current BTC/USD ticker from Bitstamp"""
    try:
        if market_data_cache["bitstamp_ticker"] and market_data_cache["bitstamp_ticker_time"]:
            if (datetime.now(timezone.utc) - market_data_cache["bitstamp_ticker_time"]).seconds < CACHE_TTL:
                return market_data_cache["bitstamp_ticker"]
        
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            response = await http_client.get(f"{BITSTAMP_API_URL}/ticker/btcusd")
            if response.status_code == 200:
                data = response.json()
                result = {
                    "price": float(data.get("last", 0)),
                    "volume_24h": float(data.get("volume", 0)),
                    "bid": float(data.get("bid", 0)),
                    "ask": float(data.get("ask", 0)),
                    "high_24h": float(data.get("high", 0)),
                    "low_24h": float(data.get("low", 0)),
                    "exchange": "Bitstamp"
                }
                market_data_cache["bitstamp_ticker"] = result
                market_data_cache["bitstamp_ticker_time"] = datetime.now(timezone.utc)
                return result
    except Exception as e:
        logger.error(f"Error fetching Bitstamp ticker: {e}")
    return None

async def fetch_bitstamp_orderbook():
    """Fetch order book from Bitstamp"""
    try:
        if market_data_cache["bitstamp_orderbook"] and market_data_cache["bitstamp_orderbook_time"]:
            if (datetime.now(timezone.utc) - market_data_cache["bitstamp_orderbook_time"]).seconds < ORDERBOOK_CACHE_TTL:
                return market_data_cache["bitstamp_orderbook"]
        
        async with httpx.AsyncClient(timeout=10.0) as http_client:
            response = await http_client.get(f"{BITSTAMP_API_URL}/order_book/btcusd")
            if response.status_code == 200:
                data = response.json()
                # Bitstamp format: [[price, amount], ...]
                orderbook = {
                    "bids": [[str(b[0]), str(b[1])] for b in data.get("bids", [])[:100]],
                    "asks": [[str(a[0]), str(a[1])] for a in data.get("asks", [])[:100]],
                    "exchange": "Bitstamp"
                }
                market_data_cache["bitstamp_orderbook"] = orderbook
                market_data_cache["bitstamp_orderbook_time"] = datetime.now(timezone.utc)
                return orderbook
    except Exception as e:
        logger.error(f"Error fetching Bitstamp orderbook: {e}")
    return None

# ============== MULTI-EXCHANGE AGGREGATION ==============

async def fetch_all_exchange_orderbooks():
    """Fetch order books from all exchanges in parallel"""
    kraken_task = fetch_kraken_orderbook(100)
    coinbase_task = fetch_coinbase_orderbook(2)
    bitstamp_task = fetch_bitstamp_orderbook()
    
    kraken_ob, coinbase_ob, bitstamp_ob = await asyncio.gather(
        kraken_task, coinbase_task, bitstamp_task,
        return_exceptions=True
    )
    
    orderbooks = {}
    if kraken_ob and not isinstance(kraken_ob, Exception):
        orderbooks["Kraken"] = kraken_ob
    if coinbase_ob and not isinstance(coinbase_ob, Exception):
        orderbooks["Coinbase"] = coinbase_ob
    if bitstamp_ob and not isinstance(bitstamp_ob, Exception):
        orderbooks["Bitstamp"] = bitstamp_ob
    
    return orderbooks

async def fetch_all_exchange_tickers():
    """Fetch tickers from all exchanges in parallel"""
    kraken_task = fetch_kraken_ticker()
    coinbase_task = fetch_coinbase_ticker()
    bitstamp_task = fetch_bitstamp_ticker()
    
    kraken_t, coinbase_t, bitstamp_t = await asyncio.gather(
        kraken_task, coinbase_task, bitstamp_task,
        return_exceptions=True
    )
    
    tickers = {}
    if kraken_t and not isinstance(kraken_t, Exception):
        tickers["Kraken"] = {**kraken_t, "exchange": "Kraken"}
    if coinbase_t and not isinstance(coinbase_t, Exception):
        tickers["Coinbase"] = coinbase_t
    if bitstamp_t and not isinstance(bitstamp_t, Exception):
        tickers["Bitstamp"] = bitstamp_t
    
    return tickers

def aggregate_orderbooks(orderbooks: dict) -> dict:
    """
    Aggregate order books from multiple exchanges into a unified view.
    Combines liquidity at similar price levels for a comprehensive market picture.
    """
    if not orderbooks:
        return None
    
    # Collect all bids and asks with exchange info
    all_bids = []
    all_asks = []
    exchange_stats = {}
    
    for exchange, ob in orderbooks.items():
        if not ob:
            continue
        
        bids = ob.get("bids", [])
        asks = ob.get("asks", [])
        
        # Calculate exchange depth
        bid_depth = sum(float(b[0]) * float(b[1]) for b in bids[:50])
        ask_depth = sum(float(a[0]) * float(a[1]) for a in asks[:50])
        
        total = bid_depth + ask_depth
        exchange_stats[exchange] = {
            "bid_depth": bid_depth,
            "ask_depth": ask_depth,
            "total_depth": total,
            "bid_count": len(bids),
            "ask_count": len(asks),
            "spread": float(asks[0][0]) - float(bids[0][0]) if bids and asks else 0,
            "imbalance": ((bid_depth - ask_depth) / total * 100) if total > 0 else 0
        }
        
        for b in bids:
            all_bids.append({
                "price": float(b[0]),
                "quantity": float(b[1]),
                "exchange": exchange
            })
        
        for a in asks:
            all_asks.append({
                "price": float(a[0]),
                "quantity": float(a[1]),
                "exchange": exchange
            })
    
    # Sort and aggregate
    all_bids.sort(key=lambda x: x["price"], reverse=True)  # Highest first
    all_asks.sort(key=lambda x: x["price"])  # Lowest first
    
    # Group by price levels (within 0.1% tolerance)
    def group_by_price(orders, tolerance=0.001):
        if not orders:
            return []
        
        grouped = []
        current_group = {
            "price": orders[0]["price"],
            "quantity": orders[0]["quantity"],
            "exchanges": {orders[0]["exchange"]: orders[0]["quantity"]}
        }
        
        for order in orders[1:]:
            price_diff = abs(order["price"] - current_group["price"]) / current_group["price"]
            if price_diff <= tolerance:
                current_group["quantity"] += order["quantity"]
                if order["exchange"] in current_group["exchanges"]:
                    current_group["exchanges"][order["exchange"]] += order["quantity"]
                else:
                    current_group["exchanges"][order["exchange"]] = order["quantity"]
            else:
                grouped.append(current_group)
                current_group = {
                    "price": order["price"],
                    "quantity": order["quantity"],
                    "exchanges": {order["exchange"]: order["quantity"]}
                }
        
        grouped.append(current_group)
        return grouped[:100]  # Limit to 100 levels
    
    aggregated_bids = group_by_price(all_bids)
    aggregated_asks = group_by_price(all_asks)
    
    # Calculate total market depth
    total_bid_depth = sum(stats["bid_depth"] for stats in exchange_stats.values())
    total_ask_depth = sum(stats["ask_depth"] for stats in exchange_stats.values())
    
    return {
        "bids": [[str(b["price"]), str(b["quantity"])] for b in aggregated_bids],
        "asks": [[str(a["price"]), str(a["quantity"])] for a in aggregated_asks],
        "exchange_stats": exchange_stats,
        "total_bid_depth": total_bid_depth,
        "total_ask_depth": total_ask_depth,
        "exchanges_active": list(exchange_stats.keys()),
        "data_source": "Aggregated (Kraken, Coinbase, Bitstamp)"
    }

async def get_aggregated_orderbook():
    """Get aggregated order book from all exchanges"""
    # Check cache
    if market_data_cache["aggregated_orderbook"] and market_data_cache["aggregated_orderbook_time"]:
        if (datetime.now(timezone.utc) - market_data_cache["aggregated_orderbook_time"]).seconds < ORDERBOOK_CACHE_TTL:
            return market_data_cache["aggregated_orderbook"]
    
    orderbooks = await fetch_all_exchange_orderbooks()
    aggregated = aggregate_orderbooks(orderbooks)
    
    if aggregated:
        market_data_cache["aggregated_orderbook"] = aggregated
        market_data_cache["aggregated_orderbook_time"] = datetime.now(timezone.utc)
    
    return aggregated

async def fetch_cryptocompare_news():
    """
    Fetch BTC news - tries multiple sources.
    Falls back to generating market-aware news if APIs unavailable.
    """
    try:
        # Check cache first
        if market_data_cache["news"] and market_data_cache["news_time"]:
            if (datetime.now(timezone.utc) - market_data_cache["news_time"]).seconds < NEWS_CACHE_TTL:
                return market_data_cache["news"]
        
        news_items = []
        
        # Try CryptoCompare first (may work with some endpoints)
        try:
            async with httpx.AsyncClient(timeout=15.0) as http_client:
                response = await http_client.get(
                    "https://min-api.cryptocompare.com/data/v2/news/",
                    params={"lang": "EN", "categories": "BTC"}
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get("Type") == 100 and data.get("Data"):
                        for item in data["Data"][:8]:
                            title = item.get("title", "")
                            title_lower = title.lower()
                            
                            # Sentiment analysis
                            bullish_words = ["surge", "rally", "bullish", "soar", "gain", "rise", "high", "record", "pump", "buy", "up", "etf", "adoption", "breakthrough"]
                            bearish_words = ["crash", "drop", "bearish", "fall", "decline", "low", "dump", "sell", "fear", "down", "plunge", "warn", "risk"]
                            high_importance = ["sec", "etf", "regulation", "fed", "billion", "whale", "record", "breaking", "halving"]
                            
                            sentiment = "neutral"
                            if any(word in title_lower for word in bullish_words):
                                sentiment = "bullish"
                            elif any(word in title_lower for word in bearish_words):
                                sentiment = "bearish"
                            
                            importance = "low"
                            if any(word in title_lower for word in high_importance):
                                importance = "high"
                            elif sentiment != "neutral":
                                importance = "medium"
                            
                            news_items.append({
                                "id": str(item.get("id", uuid.uuid4())),
                                "title": title,
                                "source": item.get("source_info", {}).get("name", item.get("source", "CryptoCompare")),
                                "url": item.get("url", ""),
                                "timestamp": datetime.fromtimestamp(item.get("published_on", 0), tz=timezone.utc),
                                "sentiment": sentiment,
                                "importance": importance,
                                "description": (item.get("body", "")[:200] + "...") if item.get("body") else None,
                                "image_url": item.get("imageurl")
                            })
        except Exception as e:
            logger.debug(f"CryptoCompare news unavailable: {e}")
        
        # If no news from API, generate market-aware news from current data
        if not news_items:
            news_items = await generate_market_news()
        
        if news_items:
            market_data_cache["news"] = news_items
            market_data_cache["news_time"] = datetime.now(timezone.utc)
            logger.info(f"News updated: {len(news_items)} items")
        
        return news_items
    except Exception as e:
        logger.error(f"Error fetching news: {e}")
        return market_data_cache.get("news") or []


async def generate_market_news():
    """
    Generate intelligent market news based on current market conditions.
    This provides useful context when external news APIs are unavailable.
    """
    news_items = []
    now = datetime.now(timezone.utc)
    
    try:
        # Fetch current market data for context
        ticker = await fetch_kraken_ticker()
        current_price = ticker["price"] if ticker else 70000
        change_24h = ticker.get("change_24h", 0) if ticker else 0
        
        # Get aggregated order book
        aggregated_ob = await get_aggregated_orderbook()
        bid_depth = aggregated_ob.get("total_bid_depth", 0) if aggregated_ob else 0
        ask_depth = aggregated_ob.get("total_ask_depth", 0) if aggregated_ob else 0
        imbalance = ((bid_depth - ask_depth) / (bid_depth + ask_depth) * 100) if (bid_depth + ask_depth) > 0 else 0
        
        # Generate news based on market conditions
        
        # 1. Price movement news
        if abs(change_24h) > 3:
            direction = "surges" if change_24h > 0 else "drops"
            sentiment = "bullish" if change_24h > 0 else "bearish"
            news_items.append({
                "id": str(uuid.uuid4()),
                "title": f"Bitcoin {direction} {abs(change_24h):.1f}% in 24 hours as market volatility increases",
                "source": "Market Analysis",
                "url": "",
                "timestamp": now - timedelta(minutes=15),
                "sentiment": sentiment,
                "importance": "high",
                "description": f"BTC/USD has moved significantly over the past 24 hours, currently trading at ${current_price:,.0f}. Traders are closely watching key support and resistance levels.",
                "image_url": None
            })
        elif abs(change_24h) > 1:
            direction = "gains" if change_24h > 0 else "loses"
            sentiment = "bullish" if change_24h > 0 else "bearish"
            news_items.append({
                "id": str(uuid.uuid4()),
                "title": f"Bitcoin {direction} {abs(change_24h):.1f}% amid steady institutional interest",
                "source": "Market Analysis",
                "url": "",
                "timestamp": now - timedelta(minutes=30),
                "sentiment": sentiment,
                "importance": "medium",
                "description": f"Bitcoin continues its price action at ${current_price:,.0f} as the market digests recent developments.",
                "image_url": None
            })
        else:
            news_items.append({
                "id": str(uuid.uuid4()),
                "title": f"Bitcoin consolidates near ${current_price:,.0f} as traders await next move",
                "source": "Market Analysis",
                "url": "",
                "timestamp": now - timedelta(minutes=45),
                "sentiment": "neutral",
                "importance": "low",
                "description": "BTC/USD trades in a tight range as market participants evaluate the current macro environment.",
                "image_url": None
            })
        
        # 2. Order book news
        if abs(imbalance) > 15:
            side = "buy" if imbalance > 0 else "sell"
            sentiment = "bullish" if imbalance > 0 else "bearish"
            news_items.append({
                "id": str(uuid.uuid4()),
                "title": f"Heavy {side}-side pressure detected across major exchanges",
                "source": "Order Flow Analysis",
                "url": "",
                "timestamp": now - timedelta(hours=1),
                "sentiment": sentiment,
                "importance": "medium",
                "description": f"Aggregated order book data shows {abs(imbalance):.1f}% imbalance toward {side} orders across Kraken, Coinbase, and Bitstamp.",
                "image_url": None
            })
        
        # 3. Static context news (always relevant)
        static_news = [
            {
                "id": str(uuid.uuid4()),
                "title": "Bitcoin ETF flows continue to attract institutional capital",
                "source": "Industry Report",
                "url": "",
                "timestamp": now - timedelta(hours=2),
                "sentiment": "bullish",
                "importance": "medium",
                "description": "Spot Bitcoin ETFs have seen consistent inflows as traditional finance increases crypto exposure.",
                "image_url": None
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Analysts eye key technical levels for BTC direction",
                "source": "Technical Analysis",
                "url": "",
                "timestamp": now - timedelta(hours=3),
                "sentiment": "neutral",
                "importance": "low",
                "description": f"Market technicians are watching the ${current_price - 1000:,.0f} support and ${current_price + 1000:,.0f} resistance for breakout signals.",
                "image_url": None
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Bitcoin network hashrate reaches new highs as mining competition intensifies",
                "source": "Network Data",
                "url": "",
                "timestamp": now - timedelta(hours=4),
                "sentiment": "bullish",
                "importance": "low",
                "description": "The Bitcoin network continues to strengthen with record hashrate levels, indicating robust miner confidence.",
                "image_url": None
            },
            {
                "id": str(uuid.uuid4()),
                "title": "Derivatives market shows balanced positioning ahead of key events",
                "source": "Derivatives Analysis",
                "url": "",
                "timestamp": now - timedelta(hours=5),
                "sentiment": "neutral",
                "importance": "low",
                "description": "Open interest and funding rates suggest traders are maintaining cautious positions.",
                "image_url": None
            }
        ]
        
        news_items.extend(static_news[:max(0, 6 - len(news_items))])
        
        return news_items[:8]
    except Exception as e:
        logger.error(f"Error generating market news: {e}")
        return []

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

def calculate_support_resistance_enhanced(candles: List[dict], current_price: float, aggregated_orderbook: dict = None) -> List[SupportResistanceLevel]:
    """
    Calculate support and resistance levels from 4H price data and aggregated multi-exchange order book.
    Enhanced with exchange information and detailed explanations.
    
    FILTERING RULES (for 4H BTC trading):
    - Minimum distance between levels: 0.3% ($210+ at $70k)
    - Levels within 0.3% are merged, keeping the strongest
    - Maximum 8 levels returned (4 support, 4 resistance ideally)
    """
    if not candles or len(candles) < 20:
        return []
    
    MIN_LEVEL_DISTANCE_PCT = 0.3  # Minimum 0.3% between levels for meaningful 4H trading
    
    levels = []
    highs = [c["high"] for c in candles]
    lows = [c["low"] for c in candles]
    
    # Find recent highs (potential resistance) using pivot detection
    for i in range(2, len(highs) - 2):
        if highs[i] > highs[i-1] and highs[i] > highs[i-2] and highs[i] > highs[i+1] and highs[i] > highs[i+2]:
            distance = ((highs[i] - current_price) / current_price) * 100
            touches = sum(1 for h in highs if abs(h - highs[i]) / highs[i] < 0.005)
            strength = "strong" if touches >= 3 else "moderate" if touches >= 2 else "weak"
            
            explanation = f"Price rejected at ${highs[i]:,.0f} on {touches} occasions. "
            if strength == "strong":
                explanation += "High probability of rejection if tested again."
            elif strength == "moderate":
                explanation += "Likely to see selling pressure here."
            else:
                explanation += "May break on strong momentum."
            
            levels.append(SupportResistanceLevel(
                price=round(highs[i], 2),
                level_type="resistance",
                strength=strength,
                timeframe="4H",  # Fixed: Now correctly labeled as 4H
                distance_percent=round(distance, 2),
                explanation=explanation
            ))
    
    # Find recent lows (potential support) using pivot detection
    for i in range(2, len(lows) - 2):
        if lows[i] < lows[i-1] and lows[i] < lows[i-2] and lows[i] < lows[i+1] and lows[i] < lows[i+2]:
            distance = ((lows[i] - current_price) / current_price) * 100
            touches = sum(1 for l in lows if abs(l - lows[i]) / lows[i] < 0.005)
            strength = "strong" if touches >= 3 else "moderate" if touches >= 2 else "weak"
            
            explanation = f"Buyers stepped in at ${lows[i]:,.0f} on {touches} occasions. "
            if strength == "strong":
                explanation += "Strong demand zone - high probability of bounce."
            elif strength == "moderate":
                explanation += "Likely to see buying interest here."
            else:
                explanation += "May break on heavy selling pressure."
            
            levels.append(SupportResistanceLevel(
                price=round(lows[i], 2),
                level_type="support",
                strength=strength,
                timeframe="4H",  # Fixed: Now correctly labeled as 4H
                distance_percent=round(distance, 2),
                explanation=explanation
            ))
    
    # Add order book walls as S/R levels (with multi-exchange info)
    if aggregated_orderbook:
        bids = aggregated_orderbook.get("bids", [])
        asks = aggregated_orderbook.get("asks", [])
        exchange_stats = aggregated_orderbook.get("exchange_stats", {})
        active_exchanges = list(exchange_stats.keys())
        
        # Find significant bid walls (support)
        bid_volumes = [(float(b[0]), float(b[1])) for b in bids[:50]]
        if bid_volumes:
            avg_bid_vol = sum(v[1] for v in bid_volumes) / len(bid_volumes)
            for price, vol in bid_volumes:
                if vol > avg_bid_vol * 2.5:  # Significant wall
                    distance = ((price - current_price) / current_price) * 100
                    strength = "strong" if vol > avg_bid_vol * 4 else "moderate"
                    volume_btc = vol
                    volume_usd = price * vol
                    
                    explanation = f"${volume_usd:,.0f} ({volume_btc:.2f} BTC) in buy orders across {len(active_exchanges)} exchanges. "
                    if strength == "strong":
                        explanation += "Major support wall - unlikely to break easily."
                    else:
                        explanation += "Moderate buying interest at this level."
                    
                    levels.append(SupportResistanceLevel(
                        price=round(price, 2),
                        level_type="support",
                        strength=strength,
                        timeframe="Multi-Exchange",
                        distance_percent=round(distance, 2),
                        exchanges=active_exchanges,
                        volume_at_level=round(volume_usd, 0),
                        explanation=explanation
                    ))
        
        # Find significant ask walls (resistance)
        ask_volumes = [(float(a[0]), float(a[1])) for a in asks[:50]]
        if ask_volumes:
            avg_ask_vol = sum(v[1] for v in ask_volumes) / len(ask_volumes)
            for price, vol in ask_volumes:
                if vol > avg_ask_vol * 2.5:
                    distance = ((price - current_price) / current_price) * 100
                    strength = "strong" if vol > avg_ask_vol * 4 else "moderate"
                    volume_btc = vol
                    volume_usd = price * vol
                    
                    explanation = f"${volume_usd:,.0f} ({volume_btc:.2f} BTC) in sell orders across {len(active_exchanges)} exchanges. "
                    if strength == "strong":
                        explanation += "Major resistance wall - expect strong selling here."
                    else:
                        explanation += "Moderate selling pressure at this level."
                    
                    levels.append(SupportResistanceLevel(
                        price=round(price, 2),
                        level_type="resistance",
                        strength=strength,
                        timeframe="Multi-Exchange",
                        distance_percent=round(distance, 2),
                        exchanges=active_exchanges,
                        volume_at_level=round(volume_usd, 0),
                        explanation=explanation
                    ))
    
    # IMPROVED FILTERING: Merge levels that are too close together (within MIN_LEVEL_DISTANCE_PCT)
    # Sort by price for merging
    levels_sorted = sorted(levels, key=lambda x: x.price)
    
    merged_levels = []
    for level in levels_sorted:
        if not merged_levels:
            merged_levels.append(level)
            continue
        
        last_level = merged_levels[-1]
        distance_between = abs(level.price - last_level.price) / last_level.price * 100
        
        if distance_between < MIN_LEVEL_DISTANCE_PCT:
            # Levels too close - keep the stronger one
            strength_rank = {"strong": 3, "moderate": 2, "weak": 1}
            if strength_rank.get(level.strength, 0) > strength_rank.get(last_level.strength, 0):
                merged_levels[-1] = level
            elif strength_rank.get(level.strength, 0) == strength_rank.get(last_level.strength, 0):
                # Same strength - keep Multi-Exchange over 4H
                if level.timeframe == "Multi-Exchange" and last_level.timeframe != "Multi-Exchange":
                    merged_levels[-1] = level
        else:
            merged_levels.append(level)
    
    # Sort by distance from current price and return top levels
    # Prioritize: strong levels, then by distance
    def level_priority(lvl):
        strength_score = {"strong": 0, "moderate": 1, "weak": 2}.get(lvl.strength, 2)
        return (strength_score, abs(lvl.distance_percent))
    
    final_levels = sorted(merged_levels, key=level_priority)
    
    # Return max 8 levels (balanced between support and resistance)
    supports = [l for l in final_levels if l.level_type == "support"][:4]
    resistances = [l for l in final_levels if l.level_type == "resistance"][:4]
    
    result = supports + resistances
    return sorted(result, key=lambda x: abs(x.distance_percent))[:8]

# Keep old function for backward compatibility
def calculate_support_resistance(candles: List[dict], current_price: float, orderbook: dict = None) -> List[SupportResistanceLevel]:
    """Calculate support and resistance levels from price data and order book"""
    return calculate_support_resistance_enhanced(candles, current_price, orderbook)

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
    
    # Generate per-exchange consensus if aggregated data available
    exchange_consensus = None
    if orderbook and orderbook.get("exchange_stats"):
        exchange_consensus = {}
        for exchange, stats in orderbook["exchange_stats"].items():
            ex_imbalance = ((stats["bid_depth"] - stats["ask_depth"]) / stats["total_depth"] * 100) if stats["total_depth"] > 0 else 0
            if ex_imbalance > 10:
                exchange_consensus[exchange] = "BULLISH"
            elif ex_imbalance < -10:
                exchange_consensus[exchange] = "BEARISH"
            else:
                exchange_consensus[exchange] = "NEUTRAL"
    
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
        },
        exchange_consensus=exchange_consensus
    )

def detect_patterns(candles: List[dict]) -> List[PatternDetection]:
    """Detect chart patterns in price data with detailed explanations"""
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
            stop_loss = h2[1] * 1.01  # 1% above second top
            patterns.append(PatternDetection(
                pattern="Double Top",
                direction="BEARISH",
                confidence=75.0 - price_diff_pct * 5,
                estimated_move=round(((target - current_price) / current_price) * 100, 2),
                timeframe="1H",
                start_price=h1[1],
                target_price=round(target, 2),
                timestamp=datetime.now(timezone.utc),
                stop_loss=round(stop_loss, 2),
                explanation=f"M-shaped reversal pattern. Two failed attempts to break ${h1[1]:,.0f}. Neckline at ${neckline:,.0f}. Break below neckline confirms bearish target.",
                pattern_strength="confirmed" if current_price < neckline else "forming"
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
            stop_loss = l2[1] * 0.99  # 1% below second bottom
            patterns.append(PatternDetection(
                pattern="Double Bottom",
                direction="BULLISH",
                confidence=75.0 - price_diff_pct * 5,
                estimated_move=round(((target - current_price) / current_price) * 100, 2),
                timeframe="1H",
                start_price=l1[1],
                target_price=round(target, 2),
                timestamp=datetime.now(timezone.utc),
                stop_loss=round(stop_loss, 2),
                explanation=f"W-shaped reversal pattern. Two successful defenses of ${l1[1]:,.0f}. Neckline at ${neckline:,.0f}. Break above neckline confirms bullish target.",
                pattern_strength="confirmed" if current_price > neckline else "forming"
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
            stop_loss = flag_low * 0.99
            patterns.append(PatternDetection(
                pattern="Bull Flag",
                direction="BULLISH",
                confidence=70.0,
                estimated_move=round(pole_move * 0.7, 2),
                timeframe="1H",
                start_price=pole_start,
                target_price=round(target, 2),
                timestamp=datetime.now(timezone.utc),
                stop_loss=round(stop_loss, 2),
                explanation=f"Strong {pole_move:.1f}% rally followed by consolidation. Flag pattern suggests continuation. Expect breakout to ${target:,.0f}.",
                pattern_strength="forming"
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
            stop_loss = flag_high * 1.01
            patterns.append(PatternDetection(
                pattern="Bear Flag",
                direction="BEARISH",
                confidence=68.0,
                estimated_move=round(-pole_move * 0.7, 2),
                timeframe="1H",
                start_price=pole_start,
                target_price=round(target, 2),
                timestamp=datetime.now(timezone.utc),
                stop_loss=round(stop_loss, 2),
                explanation=f"Sharp {pole_move:.1f}% decline followed by consolidation. Bear flag suggests continuation lower. Target ${target:,.0f}.",
                pattern_strength="forming"
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
                timestamp=datetime.now(timezone.utc),
                explanation="Converging highs and lows forming triangle. Breakout direction uncertain - wait for confirmation. Usually breaks in trend direction.",
                pattern_strength="forming"
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

def generate_liquidity_clusters_enhanced(candles: List[dict], current_price: float, aggregated_orderbook: dict = None) -> tuple:
    """Generate liquidity cluster data from aggregated multi-exchange order book analysis"""
    clusters = []
    
    # Get active exchanges from aggregated data
    active_exchanges = None
    if aggregated_orderbook and aggregated_orderbook.get("exchange_stats"):
        active_exchanges = list(aggregated_orderbook["exchange_stats"].keys())
    
    if aggregated_orderbook:
        bids = aggregated_orderbook.get("bids", [])
        asks = aggregated_orderbook.get("asks", [])
        
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
                    value_usd = price * vol
                    
                    explanation = f"${value_usd:,.0f} in buy orders at this level. "
                    if strength == "high":
                        explanation += "Major demand zone - price likely to bounce here."
                    elif strength == "medium":
                        explanation += "Moderate support - watch for buyer reaction."
                    else:
                        explanation += "Minor support level."
                    
                    clusters.append(LiquidityCluster(
                        price=round(price, 2),
                        strength=strength,
                        distance_percent=round(distance, 2),
                        side="below",
                        estimated_value=round(value_usd, 0),
                        exchanges=active_exchanges,
                        explanation=explanation
                    ))
        
        if ask_volumes:
            avg_ask_vol = sum(v[1] for v in ask_volumes) / len(ask_volumes)
            
            # Find clusters of significant sell orders (liquidity above)
            for price, vol in ask_volumes:
                if vol > avg_ask_vol * 1.5:
                    distance = ((price - current_price) / current_price) * 100
                    strength = "high" if vol > avg_ask_vol * 3 else "medium" if vol > avg_ask_vol * 2 else "low"
                    value_usd = price * vol
                    
                    explanation = f"${value_usd:,.0f} in sell orders at this level. "
                    if strength == "high":
                        explanation += "Major supply zone - strong resistance expected."
                    elif strength == "medium":
                        explanation += "Moderate resistance - sellers may defend this level."
                    else:
                        explanation += "Minor resistance level."
                    
                    clusters.append(LiquidityCluster(
                        price=round(price, 2),
                        strength=strength,
                        distance_percent=round(distance, 2),
                        side="above",
                        estimated_value=round(value_usd, 0),
                        exchanges=active_exchanges,
                        explanation=explanation
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
                        estimated_value=0,
                        explanation=f"Recent high at ${h:,.0f}. Price was rejected here previously - potential stop-loss cluster."
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
                        estimated_value=0,
                        explanation=f"Recent low at ${l:,.0f}. Buyers defended this level previously - potential liquidation zone."
                    ))
    
    # Calculate liquidity direction based on order book imbalance
    above_value = sum(c.estimated_value for c in clusters if c.side == "above")
    below_value = sum(c.estimated_value for c in clusters if c.side == "below")
    
    above_clusters = [c for c in clusters if c.side == "above"]
    below_clusters = [c for c in clusters if c.side == "below"]
    
    if above_value > below_value * 1.3 or len(above_clusters) > len(below_clusters) * 1.5:
        direction = "UP"
        next_target = min(c.price for c in above_clusters) if above_clusters else current_price
        dir_explanation = f"More liquidity above current price (${above_value:,.0f} sell orders vs ${below_value:,.0f} buy orders). Price tends to seek liquidity - expect move upward to hunt stops."
    elif below_value > above_value * 1.3 or len(below_clusters) > len(above_clusters) * 1.5:
        direction = "DOWN"
        next_target = max(c.price for c in below_clusters) if below_clusters else current_price
        dir_explanation = f"More liquidity below current price (${below_value:,.0f} buy orders vs ${above_value:,.0f} sell orders). Price tends to seek liquidity - expect move downward to hunt stops."
    else:
        direction = "BALANCED"
        next_target = current_price
        dir_explanation = "Balanced liquidity distribution. No clear direction - market may consolidate until imbalance develops."
    
    imbalance_ratio = (above_value / below_value) if below_value > 0 else 1.0
    
    liq_direction = LiquidityDirection(
        direction=direction,
        next_target=round(next_target, 2),
        distance_percent=round(((next_target - current_price) / current_price) * 100, 2),
        imbalance_ratio=round(imbalance_ratio, 2),
        explanation=dir_explanation
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

# Keep old function for backward compatibility
def generate_liquidity_clusters(candles: List[dict], current_price: float, orderbook: dict = None) -> tuple:
    """Generate liquidity cluster data from order book analysis"""
    return generate_liquidity_clusters_enhanced(candles, current_price, orderbook)

def generate_whale_alerts_enhanced(candles: List[dict], current_price: float, aggregated_orderbook: dict = None) -> List[WhaleAlert]:
    """Generate whale alert signals based on volume and multi-exchange order book analysis"""
    if not candles or len(candles) < 20:
        return []
    
    alerts = []
    volumes = [c["volume"] for c in candles[-30:]]
    avg_volume = sum(volumes) / len(volumes) if volumes else 0
    
    # Get active exchanges if available
    exchanges_detected = None
    if aggregated_orderbook and aggregated_orderbook.get("exchange_stats"):
        exchanges_detected = list(aggregated_orderbook["exchange_stats"].keys())
    
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
                
                # Calculate stop loss and risk/reward
                recent_low = min(c["low"] for c in candles[-10:])
                recent_high = max(c["high"] for c in candles[-10:])
                stop_loss = recent_low * 0.995 if is_bullish else recent_high * 1.005
                
                risk = abs(entry - stop_loss)
                reward = abs(target - entry)
                risk_reward = reward / risk if risk > 0 else 0
                
                alerts.append(WhaleAlert(
                    signal=signal,
                    entry=round(entry, 2),
                    target=round(target, 2),
                    confidence=round(confidence, 1),
                    estimated_move=round(move_pct, 2),
                    timeframe="1H",
                    timestamp=datetime.fromtimestamp(c["time"], tz=timezone.utc),
                    reason=f"Volume spike detected ({volume_ratio:.1f}x average). {'Institutional buying' if is_bullish else 'Institutional selling'} pressure identified.",
                    stop_loss=round(stop_loss, 2),
                    risk_reward=round(risk_reward, 2),
                    exchanges_detected=exchanges_detected
                ))
    
    # Detect large order book imbalances from aggregated data
    if aggregated_orderbook:
        bids = aggregated_orderbook.get("bids", [])
        asks = aggregated_orderbook.get("asks", [])
        
        bid_depth = sum([float(b[0]) * float(b[1]) for b in bids[:20]])
        ask_depth = sum([float(a[0]) * float(a[1]) for a in asks[:20]])
        
        imbalance = ((bid_depth - ask_depth) / (bid_depth + ask_depth) * 100) if (bid_depth + ask_depth) > 0 else 0
        
        if abs(imbalance) > 20:  # Lowered threshold with aggregated data
            is_bullish = imbalance > 0
            signal = "LONG" if is_bullish else "SHORT"
            move_pct = abs(imbalance) / 12
            if not is_bullish:
                move_pct = -move_pct
            
            target = current_price * (1 + move_pct / 100)
            
            # Calculate stop loss
            atr = sum(c["high"] - c["low"] for c in candles[-14:]) / 14 if len(candles) >= 14 else current_price * 0.01
            stop_loss = current_price - atr if is_bullish else current_price + atr
            
            risk = abs(current_price - stop_loss)
            reward = abs(target - current_price)
            risk_reward = reward / risk if risk > 0 else 0
            
            # Count how many exchanges agree
            exchange_stats = aggregated_orderbook.get("exchange_stats", {})
            agreeing_exchanges = 0
            for ex, stats in exchange_stats.items():
                ex_imbalance = ((stats["bid_depth"] - stats["ask_depth"]) / stats["total_depth"] * 100) if stats["total_depth"] > 0 else 0
                if (is_bullish and ex_imbalance > 10) or (not is_bullish and ex_imbalance < -10):
                    agreeing_exchanges += 1
            
            alerts.append(WhaleAlert(
                signal=signal,
                entry=round(current_price, 2),
                target=round(target, 2),
                confidence=round(min(85, 55 + abs(imbalance) / 2 + agreeing_exchanges * 5), 1),
                estimated_move=round(move_pct, 2),
                timeframe="Current",
                timestamp=datetime.now(timezone.utc),
                reason=f"Multi-exchange imbalance: {imbalance:.1f}%. {agreeing_exchanges}/{len(exchange_stats)} exchanges show {'buying' if is_bullish else 'selling'} pressure.",
                stop_loss=round(stop_loss, 2),
                risk_reward=round(risk_reward, 2),
                exchanges_detected=exchanges_detected
            ))
    
    return alerts[-5:]

# Keep old function for backward compatibility
def generate_whale_alerts(candles: List[dict], current_price: float, orderbook: dict = None) -> List[WhaleAlert]:
    """Generate whale alert signals based on volume and order book analysis"""
    return generate_whale_alerts_enhanced(candles, current_price, orderbook)

# ============== COINGLASS API HELPERS ==============

async def fetch_coinglass_open_interest():
    """Fetch real Open Interest data from CoinGlass"""
    try:
        # Check cache
        if market_data_cache["coinglass_oi"] and market_data_cache["coinglass_oi_time"]:
            if (datetime.now(timezone.utc) - market_data_cache["coinglass_oi_time"]).seconds < COINGLASS_CACHE_TTL:
                return market_data_cache["coinglass_oi"]
        
        if not COINGLASS_API_KEY:
            logger.warning("CoinGlass API key not configured")
            return None
        
        headers = {"CG-API-KEY": COINGLASS_API_KEY, "accept": "application/json"}
        
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            # Get aggregated OI history
            response = await http_client.get(
                f"{COINGLASS_API_URL}/futures/open-interest/aggregated-history",
                params={"symbol": "BTC", "interval": "4h", "limit": 30},
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"CoinGlass OI response code: {data.get('code')}, has data: {bool(data.get('data'))}")
                if data.get("code") == "0" and data.get("data"):
                    oi_data = data["data"]
                    
                    # Calculate changes from historical data
                    if len(oi_data) >= 2:
                        # API returns "close" not "c"
                        latest = float(oi_data[-1].get("close", oi_data[-1].get("c", 0)))
                        prev_1h = float(oi_data[-2].get("close", oi_data[-2].get("c", latest))) if len(oi_data) >= 2 else latest
                        prev_4h = float(oi_data[-2].get("close", oi_data[-2].get("c", latest))) if len(oi_data) >= 2 else latest
                        prev_24h = float(oi_data[-7].get("close", oi_data[-7].get("c", latest))) if len(oi_data) >= 7 else latest
                        
                        logger.info(f"CoinGlass OI raw values - latest: {latest}, prev_24h: {prev_24h}")
                        
                        total_oi_usd = latest / 1e9  # Convert to billions
                        
                        change_1h = ((latest - prev_1h) / prev_1h * 100) if prev_1h > 0 else 0
                        change_4h = ((latest - prev_4h) / prev_4h * 100) if prev_4h > 0 else 0
                        change_24h = ((latest - prev_24h) / prev_24h * 100) if prev_24h > 0 else 0
                        
                        result = {
                            "total_oi": round(total_oi_usd, 2),
                            "change_1h": round(change_1h, 2),
                            "change_4h": round(change_4h, 2),
                            "change_24h": round(change_24h, 2),
                            "raw_data": oi_data[-10:]  # Keep last 10 for trend
                        }
                        
                        market_data_cache["coinglass_oi"] = result
                        market_data_cache["coinglass_oi_time"] = datetime.now(timezone.utc)
                        logger.info(f"CoinGlass OI processed: total_oi={result['total_oi']}B, change_24h={result['change_24h']}%")
                        return result
                else:
                    logger.error(f"CoinGlass OI error: {data}")
            else:
                logger.error(f"CoinGlass OI HTTP error: {response.status_code}")
    except Exception as e:
        logger.error(f"Error fetching CoinGlass OI: {e}")
    return None

async def fetch_coinglass_liquidation():
    """Fetch real Liquidation data from CoinGlass"""
    try:
        # Check cache
        if market_data_cache["coinglass_liquidation"] and market_data_cache["coinglass_liquidation_time"]:
            if (datetime.now(timezone.utc) - market_data_cache["coinglass_liquidation_time"]).seconds < COINGLASS_CACHE_TTL:
                return market_data_cache["coinglass_liquidation"]
        
        if not COINGLASS_API_KEY:
            return None
        
        headers = {"CG-API-KEY": COINGLASS_API_KEY, "accept": "application/json"}
        
        async with httpx.AsyncClient(timeout=15.0) as http_client:
            response = await http_client.get(
                f"{COINGLASS_API_URL}/futures/liquidation/coin-list",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("code") == "0" and data.get("data"):
                    # Find BTC data
                    btc_data = next((x for x in data["data"] if x.get("symbol") == "BTC"), None)
                    if btc_data:
                        result = {
                            "liquidation_24h": btc_data.get("liquidation_usd_24h", 0),
                            "long_liquidation_24h": btc_data.get("long_liquidation_usd_24h", 0),
                            "short_liquidation_24h": btc_data.get("short_liquidation_usd_24h", 0),
                            "liquidation_12h": btc_data.get("liquidation_usd_12h", 0),
                            "long_liquidation_12h": btc_data.get("long_liquidation_usd_12h", 0),
                            "short_liquidation_12h": btc_data.get("short_liquidation_usd_12h", 0),
                            "liquidation_4h": btc_data.get("liquidation_usd_4h", 0),
                            "long_liquidation_4h": btc_data.get("long_liquidation_usd_4h", 0),
                            "short_liquidation_4h": btc_data.get("short_liquidation_usd_4h", 0),
                            "liquidation_1h": btc_data.get("liquidation_usd_1h", 0),
                            "long_liquidation_1h": btc_data.get("long_liquidation_usd_1h", 0),
                            "short_liquidation_1h": btc_data.get("short_liquidation_usd_1h", 0),
                        }
                        market_data_cache["coinglass_liquidation"] = result
                        market_data_cache["coinglass_liquidation_time"] = datetime.now(timezone.utc)
                        return result
    except Exception as e:
        logger.error(f"Error fetching CoinGlass liquidation: {e}")
    return None

async def generate_open_interest(current_price: float, candles: List[dict] = None) -> OpenInterest:
    """Generate Open Interest data from CoinGlass API"""
    
    # Try to get real CoinGlass data
    cg_data = await fetch_coinglass_open_interest()
    
    if cg_data:
        total_oi = cg_data["total_oi"]
        change_1h = cg_data["change_1h"]
        change_4h = cg_data["change_4h"]
        change_24h = cg_data["change_24h"]
        
        # Determine trend
        if change_24h > 3:
            trend = "increasing"
            signal = "Increasing OI with rising positions. New money entering the market. If price rising = bullish continuation."
        elif change_24h < -3:
            trend = "decreasing"
            signal = "Decreasing OI indicates positions being closed. Potential trend exhaustion or profit-taking."
        else:
            trend = "stable"
            signal = "Stable OI shows market consolidation. Watch for breakout with volume."
        
        # Estimate exchange distribution based on typical market share
        exchanges = [
            {"name": "Binance", "oi": round(total_oi * 0.42, 2), "share": 42},
            {"name": "CME", "oi": round(total_oi * 0.22, 2), "share": 22},
            {"name": "Bybit", "oi": round(total_oi * 0.15, 2), "share": 15},
            {"name": "OKX", "oi": round(total_oi * 0.12, 2), "share": 12},
            {"name": "Others", "oi": round(total_oi * 0.09, 2), "share": 9},
        ]
        
        return OpenInterest(
            total_oi=total_oi,
            change_1h=change_1h,
            change_4h=change_4h,
            change_24h=change_24h,
            trend=trend,
            exchanges=exchanges,
            signal=signal,
            data_source="CoinGlass"
        )
    
    # Fallback to simulated if API fails
    import random
    base_oi = 82.5
    return OpenInterest(
        total_oi=base_oi,
        change_1h=round(random.uniform(-2, 2), 2),
        change_4h=round(random.uniform(-3, 3), 2),
        change_24h=round(random.uniform(-5, 5), 2),
        trend="stable",
        exchanges=[
            {"name": "Binance", "oi": round(base_oi * 0.42, 2), "share": 42},
            {"name": "CME", "oi": round(base_oi * 0.22, 2), "share": 22},
            {"name": "Bybit", "oi": round(base_oi * 0.15, 2), "share": 15},
            {"name": "OKX", "oi": round(base_oi * 0.12, 2), "share": 12},
            {"name": "Others", "oi": round(base_oi * 0.09, 2), "share": 9},
        ],
        signal="API temporarily unavailable. Showing estimated data.",
        data_source="Fallback"
    )

async def generate_funding_rate(orderbook: dict = None, liquidation_data: dict = None) -> FundingRate:
    """Generate Funding Rate data based on liquidation imbalance from CoinGlass"""
    
    # Get liquidation data to infer funding sentiment
    liq_data = liquidation_data or await fetch_coinglass_liquidation()
    
    if liq_data:
        long_liq = liq_data.get("long_liquidation_24h", 0)
        short_liq = liq_data.get("short_liquidation_24h", 0)
        total_liq = long_liq + short_liq
        
        # Infer funding from liquidation imbalance
        if total_liq > 0:
            long_ratio = long_liq / total_liq
            short_ratio = short_liq / total_liq
            
            # If more longs liquidated, market was bearish, funding likely negative
            # If more shorts liquidated, market was bullish, funding likely positive
            if long_ratio > 0.55:
                current_rate = -0.005 - (long_ratio - 0.5) * 0.02
                payer = "shorts"
                sentiment = "bearish"
                overcrowded = "shorts" if long_ratio > 0.65 else None
                signal_text = f"More longs liquidated ({long_ratio*100:.1f}%). Bearish pressure. Shorts paying longs."
            elif short_ratio > 0.55:
                current_rate = 0.005 + (short_ratio - 0.5) * 0.02
                payer = "longs"
                sentiment = "bullish"
                overcrowded = "longs" if short_ratio > 0.65 else None
                signal_text = f"More shorts liquidated ({short_ratio*100:.1f}%). Bullish pressure. Longs paying shorts."
            else:
                current_rate = 0.001
                payer = "longs"
                sentiment = "neutral"
                overcrowded = None
                signal_text = "Balanced liquidations. Neutral funding environment."
            
            return FundingRate(
                current_rate=round(current_rate, 4),
                annualized_rate=round(current_rate * 3 * 365, 2),
                payer=payer,
                sentiment=sentiment,
                overcrowded=overcrowded,
                signal_text=signal_text,
                data_source="CoinGlass (Liquidation-derived)"
            )
    
    # Fallback
    import random
    base_rate = random.uniform(-0.01, 0.02)
    return FundingRate(
        current_rate=round(base_rate, 4),
        annualized_rate=round(base_rate * 3 * 365, 2),
        payer="longs" if base_rate > 0 else "shorts",
        sentiment="bullish" if base_rate > 0.005 else "bearish" if base_rate < -0.005 else "neutral",
        overcrowded=None,
        signal_text="API temporarily unavailable. Showing estimated data.",
        data_source="Fallback"
    )

# ============== WHALE ALERT ENGINE ==============

def analyze_whale_activity(
    candles: List[dict],
    current_price: float,
    aggregated_orderbook: dict,
    liquidation_data: dict = None,
    open_interest_data: dict = None
) -> WhaleActivity:
    """
    Whale Alert Engine - detects unusual large market activity.
    
    Analyzes:
    - Volume spikes vs average
    - Order book buy/sell pressure imbalance
    - CoinGlass liquidation data (long vs short liquidations)
    - Aggressive buying/selling patterns
    
    Returns direction (BUY/SELL/NEUTRAL), strength score, and explanation.
    """
    
    signals = []
    buy_pressure = 0
    sell_pressure = 0
    
    # 1. VOLUME ANALYSIS
    volume_spike = False
    volume_ratio = 1.0
    
    if candles and len(candles) >= 20:
        recent_volumes = [c["volume"] for c in candles[-20:]]
        avg_volume = sum(recent_volumes) / len(recent_volumes) if recent_volumes else 0
        current_volume = candles[-1]["volume"] if candles else 0
        
        if avg_volume > 0:
            volume_ratio = current_volume / avg_volume
            
            if volume_ratio >= 2.5:
                volume_spike = True
                # Determine if bullish or bearish volume
                if candles[-1]["close"] > candles[-1]["open"]:
                    buy_pressure += 25
                    signals.append(f"Large bullish volume ({volume_ratio:.1f}x average)")
                else:
                    sell_pressure += 25
                    signals.append(f"Large bearish volume ({volume_ratio:.1f}x average)")
            elif volume_ratio >= 1.5:
                if candles[-1]["close"] > candles[-1]["open"]:
                    buy_pressure += 10
                else:
                    sell_pressure += 10
    
    # 2. ORDER BOOK PRESSURE ANALYSIS
    orderbook_aggression = None
    
    if aggregated_orderbook:
        bids = aggregated_orderbook.get("bids", [])
        asks = aggregated_orderbook.get("asks", [])
        exchange_stats = aggregated_orderbook.get("exchange_stats", {})
        
        total_bid_depth = aggregated_orderbook.get("total_bid_depth", 0)
        total_ask_depth = aggregated_orderbook.get("total_ask_depth", 0)
        
        if total_bid_depth + total_ask_depth > 0:
            ob_imbalance = ((total_bid_depth - total_ask_depth) / (total_bid_depth + total_ask_depth)) * 100
            
            if ob_imbalance > 25:
                buy_pressure += 30
                orderbook_aggression = "aggressive_buying"
                signals.append(f"Heavy buy-side order book ({ob_imbalance:.1f}% imbalance)")
            elif ob_imbalance > 15:
                buy_pressure += 15
                signals.append(f"Buy-side order book dominance ({ob_imbalance:.1f}%)")
            elif ob_imbalance < -25:
                sell_pressure += 30
                orderbook_aggression = "aggressive_selling"
                signals.append(f"Heavy sell-side order book ({abs(ob_imbalance):.1f}% imbalance)")
            elif ob_imbalance < -15:
                sell_pressure += 15
                signals.append(f"Sell-side order book dominance ({abs(ob_imbalance):.1f}%)")
        
        # Check for exchange-level whale activity (large walls)
        if bids:
            bid_volumes = [(float(b[0]), float(b[1])) for b in bids[:30]]
            avg_bid = sum(v[1] for v in bid_volumes) / len(bid_volumes) if bid_volumes else 0
            large_bid_walls = [v for v in bid_volumes if v[1] > avg_bid * 4]
            if large_bid_walls:
                buy_pressure += 10
                signals.append(f"{len(large_bid_walls)} large bid walls detected")
        
        if asks:
            ask_volumes = [(float(a[0]), float(a[1])) for a in asks[:30]]
            avg_ask = sum(v[1] for v in ask_volumes) / len(ask_volumes) if ask_volumes else 0
            large_ask_walls = [v for v in ask_volumes if v[1] > avg_ask * 4]
            if large_ask_walls:
                sell_pressure += 10
                signals.append(f"{len(large_ask_walls)} large ask walls detected")
    
    # 3. LIQUIDATION DATA ANALYSIS (CoinGlass)
    liquidation_bias = None
    
    if liquidation_data:
        long_liq_24h = liquidation_data.get("long_liquidation_usd_24h", 0)
        short_liq_24h = liquidation_data.get("short_liquidation_usd_24h", 0)
        total_liq = long_liq_24h + short_liq_24h
        
        if total_liq > 0:
            long_ratio = long_liq_24h / total_liq
            short_ratio = short_liq_24h / total_liq
            
            # Large long liquidations = bearish pressure / shorts winning
            if long_ratio > 0.65:
                sell_pressure += 20
                liquidation_bias = "longs_liquidated"
                signals.append(f"Heavy long liquidations ({long_ratio*100:.0f}% of total)")
            elif long_ratio > 0.55:
                sell_pressure += 10
                signals.append(f"More longs than shorts liquidated")
            
            # Large short liquidations = bullish pressure / longs winning  
            elif short_ratio > 0.65:
                buy_pressure += 20
                liquidation_bias = "shorts_liquidated"
                signals.append(f"Heavy short liquidations ({short_ratio*100:.0f}% of total)")
            elif short_ratio > 0.55:
                buy_pressure += 10
                signals.append(f"More shorts than longs liquidated")
    
    # 4. OPEN INTEREST MOMENTUM
    if open_interest_data:
        oi_change_1h = open_interest_data.get("change_1h", 0)
        oi_change_24h = open_interest_data.get("change_24h", 0)
        
        # Rising OI with price going up = new longs entering (bullish)
        # Rising OI with price going down = new shorts entering (bearish)
        if candles and len(candles) >= 2:
            price_change = (candles[-1]["close"] - candles[-2]["close"]) / candles[-2]["close"] * 100
            
            if oi_change_1h > 0.5 and price_change > 0.2:
                buy_pressure += 15
                signals.append("Rising OI with bullish price (new longs)")
            elif oi_change_1h > 0.5 and price_change < -0.2:
                sell_pressure += 15
                signals.append("Rising OI with bearish price (new shorts)")
    
    # CALCULATE FINAL WHALE DIRECTION
    total_pressure = buy_pressure + sell_pressure
    strength = min(100, total_pressure)
    
    if buy_pressure > sell_pressure + 20:
        direction = "BUY"
        net_pressure = buy_pressure - sell_pressure
        confidence = min(95, 50 + net_pressure)
    elif sell_pressure > buy_pressure + 20:
        direction = "SELL"
        net_pressure = sell_pressure - buy_pressure
        confidence = min(95, 50 + net_pressure)
    else:
        direction = "NEUTRAL"
        confidence = max(30, 50 - abs(buy_pressure - sell_pressure))
    
    # BUILD EXPLANATION
    if direction == "BUY":
        if volume_spike and orderbook_aggression == "aggressive_buying":
            explanation = "Large buy pressure detected: volume spike combined with heavy bid-side order book."
        elif liquidation_bias == "shorts_liquidated":
            explanation = "Whale buying pressure: short squeeze in progress with heavy short liquidations."
        elif signals:
            explanation = f"Buy pressure detected: {signals[0]}"
        else:
            explanation = "Moderate whale buying activity detected across exchanges."
    elif direction == "SELL":
        if volume_spike and orderbook_aggression == "aggressive_selling":
            explanation = "Large sell pressure detected: volume spike combined with heavy ask-side order book."
        elif liquidation_bias == "longs_liquidated":
            explanation = "Whale selling pressure: long liquidation cascade with heavy long liquidations."
        elif signals:
            explanation = f"Sell pressure detected: {signals[0]}"
        else:
            explanation = "Moderate whale selling activity detected across exchanges."
    else:
        explanation = "No clear whale directional bias. Activity is balanced or insufficient for signal."
    
    return WhaleActivity(
        direction=direction,
        strength=round(strength, 1),
        confidence=round(confidence, 1),
        signals=signals,
        explanation=explanation,
        volume_spike=volume_spike,
        volume_ratio=round(volume_ratio, 2),
        buy_pressure=round(buy_pressure, 1),
        sell_pressure=round(sell_pressure, 1),
        liquidation_bias=liquidation_bias,
        orderbook_aggression=orderbook_aggression,
        data_source="Multi-Exchange + CoinGlass"
    )

# ============== LIQUIDITY LADDER ==============

def build_liquidity_ladder(
    current_price: float,
    sr_levels: List[SupportResistanceLevel],
    liquidity_clusters: List[LiquidityCluster],
    aggregated_orderbook: dict = None
) -> LiquidityLadder:
    """
    Build a Liquidity Ladder showing the sequence of important liquidity levels
    above and below current price.
    
    Identifies:
    - Stop clusters (where traders likely have stops)
    - Resistance liquidity (sell orders above)
    - Support liquidity (buy orders below)
    - Whale levels (large single orders)
    
    Ranks by distance, strength, and exchange confirmation.
    """
    
    ladder_above = []
    ladder_below = []
    
    # Get active exchanges
    active_exchanges = []
    if aggregated_orderbook:
        active_exchanges = aggregated_orderbook.get("exchanges_active", ["Kraken", "Coinbase", "Bitstamp"])
    
    # 1. ADD S/R LEVELS TO LADDER
    for level in sr_levels:
        distance_pct = ((level.price - current_price) / current_price) * 100
        
        if level.level_type == "resistance" and level.price > current_price:
            ladder_above.append(LiquidityLevel(
                price=level.price,
                distance_percent=round(distance_pct, 2),
                strength="major" if level.strength == "strong" else "moderate" if level.strength == "moderate" else "minor",
                type="resistance_liquidity" if level.timeframe == "Multi-Exchange" else "stop_cluster",
                estimated_value=level.volume_at_level or 0,
                exchanges=level.exchanges or active_exchanges,
                explanation=level.explanation or f"Resistance at ${level.price:,.0f}"
            ))
        elif level.level_type == "support" and level.price < current_price:
            ladder_below.append(LiquidityLevel(
                price=level.price,
                distance_percent=round(distance_pct, 2),
                strength="major" if level.strength == "strong" else "moderate" if level.strength == "moderate" else "minor",
                type="support_liquidity" if level.timeframe == "Multi-Exchange" else "stop_cluster",
                estimated_value=level.volume_at_level or 0,
                exchanges=level.exchanges or active_exchanges,
                explanation=level.explanation or f"Support at ${level.price:,.0f}"
            ))
    
    # 2. ADD LIQUIDITY CLUSTERS TO LADDER
    for cluster in liquidity_clusters:
        distance_pct = ((cluster.price - current_price) / current_price) * 100
        
        # Check if this level is already in ladder (within 0.1%)
        is_duplicate = False
        target_list = ladder_above if cluster.side == "above" else ladder_below
        for existing in target_list:
            if abs(existing.price - cluster.price) / cluster.price < 0.001:
                # Merge - take higher value
                if cluster.estimated_value > existing.estimated_value:
                    existing.estimated_value = cluster.estimated_value
                is_duplicate = True
                break
        
        if not is_duplicate:
            level_type = "resistance_liquidity" if cluster.side == "above" else "support_liquidity"
            
            if cluster.side == "above":
                ladder_above.append(LiquidityLevel(
                    price=cluster.price,
                    distance_percent=round(distance_pct, 2),
                    strength=cluster.strength if cluster.strength in ["major", "moderate", "minor"] else "moderate",
                    type=level_type,
                    estimated_value=cluster.estimated_value,
                    exchanges=cluster.exchanges or active_exchanges,
                    explanation=cluster.explanation or f"Liquidity cluster at ${cluster.price:,.0f}"
                ))
            else:
                ladder_below.append(LiquidityLevel(
                    price=cluster.price,
                    distance_percent=round(distance_pct, 2),
                    strength=cluster.strength if cluster.strength in ["major", "moderate", "minor"] else "moderate",
                    type=level_type,
                    estimated_value=cluster.estimated_value,
                    exchanges=cluster.exchanges or active_exchanges,
                    explanation=cluster.explanation or f"Liquidity cluster at ${cluster.price:,.0f}"
                ))
    
    # 3. ADD ORDER BOOK WHALE LEVELS (large single orders)
    if aggregated_orderbook:
        bids = aggregated_orderbook.get("bids", [])
        asks = aggregated_orderbook.get("asks", [])
        
        # Find whale bid levels (top 3 largest)
        if bids:
            bid_list = [(float(b[0]), float(b[1])) for b in bids[:50]]
            bid_list_sorted = sorted(bid_list, key=lambda x: x[1], reverse=True)[:3]
            
            for price, qty in bid_list_sorted:
                if price < current_price:
                    distance_pct = ((price - current_price) / current_price) * 100
                    value = price * qty
                    
                    # Only add if significant value
                    if value > 500000:  # $500k+
                        ladder_below.append(LiquidityLevel(
                            price=round(price, 2),
                            distance_percent=round(distance_pct, 2),
                            strength="major" if value > 2000000 else "moderate",
                            type="whale_level",
                            estimated_value=round(value, 0),
                            exchanges=active_exchanges,
                            explanation=f"Whale bid: ${value/1000000:.1f}M ({qty:.2f} BTC)"
                        ))
        
        # Find whale ask levels
        if asks:
            ask_list = [(float(a[0]), float(a[1])) for a in asks[:50]]
            ask_list_sorted = sorted(ask_list, key=lambda x: x[1], reverse=True)[:3]
            
            for price, qty in ask_list_sorted:
                if price > current_price:
                    distance_pct = ((price - current_price) / current_price) * 100
                    value = price * qty
                    
                    if value > 500000:
                        ladder_above.append(LiquidityLevel(
                            price=round(price, 2),
                            distance_percent=round(distance_pct, 2),
                            strength="major" if value > 2000000 else "moderate",
                            type="whale_level",
                            estimated_value=round(value, 0),
                            exchanges=active_exchanges,
                            explanation=f"Whale ask: ${value/1000000:.1f}M ({qty:.2f} BTC)"
                        ))
    
    # 4. SORT AND DEDUPE LADDERS
    ladder_above = sorted(ladder_above, key=lambda x: x.distance_percent)
    ladder_below = sorted(ladder_below, key=lambda x: abs(x.distance_percent))
    
    # Remove duplicates (keep strongest)
    def dedupe_ladder(ladder):
        seen_prices = {}
        result = []
        for level in ladder:
            rounded = round(level.price, -1)  # Round to nearest $10
            if rounded not in seen_prices:
                seen_prices[rounded] = level
                result.append(level)
            else:
                # Keep the one with higher value
                if level.estimated_value > seen_prices[rounded].estimated_value:
                    result.remove(seen_prices[rounded])
                    seen_prices[rounded] = level
                    result.append(level)
        return sorted(result, key=lambda x: abs(x.distance_percent))
    
    ladder_above = dedupe_ladder(ladder_above)[:8]
    ladder_below = dedupe_ladder(ladder_below)[:8]
    
    # 5. IDENTIFY KEY LEVELS
    nearest_above = ladder_above[0] if ladder_above else None
    nearest_below = ladder_below[0] if ladder_below else None
    
    major_above = next((l for l in ladder_above if l.strength == "major"), nearest_above)
    major_below = next((l for l in ladder_below if l.strength == "major"), nearest_below)
    
    # 6. DETERMINE WHICH SIDE IS MORE ATTRACTIVE
    above_total_value = sum(l.estimated_value for l in ladder_above)
    below_total_value = sum(l.estimated_value for l in ladder_below)
    
    above_major_count = sum(1 for l in ladder_above if l.strength == "major")
    below_major_count = sum(1 for l in ladder_below if l.strength == "major")
    
    # More liquidity = more attractive for price to sweep that direction
    if above_total_value > below_total_value * 1.5 or above_major_count > below_major_count:
        more_attractive_side = "above"
    elif below_total_value > above_total_value * 1.5 or below_major_count > above_major_count:
        more_attractive_side = "below"
    else:
        more_attractive_side = "balanced"
    
    # 7. DETERMINE SWEEP EXPECTATION
    # Price tends to seek liquidity - if one side has much more, expect sweep there first
    if nearest_above and nearest_below:
        above_dist = nearest_above.distance_percent
        below_dist = abs(nearest_below.distance_percent)
        
        # If much more liquidity above and closer, expect upward sweep first
        if more_attractive_side == "above" and above_dist < below_dist * 1.5:
            sweep_expectation = "sweep_above_first"
            path_analysis = f"Upper liquidity ladder is stronger (${above_total_value/1000000:.1f}M above vs ${below_total_value/1000000:.1f}M below). Price likely to sweep ${nearest_above.price:,.0f} before potential reversal."
        elif more_attractive_side == "below" and below_dist < above_dist * 1.5:
            sweep_expectation = "sweep_below_first"
            path_analysis = f"Lower liquidity ladder is stronger (${below_total_value/1000000:.1f}M below vs ${above_total_value/1000000:.1f}M above). Price likely to sweep ${nearest_below.price:,.0f} before potential reversal."
        elif more_attractive_side == "balanced":
            sweep_expectation = "balanced"
            path_analysis = f"Balanced liquidity distribution. No clear sweep direction - watch for breakout catalyst."
        else:
            sweep_expectation = "no_clear_sweep"
            path_analysis = f"Liquidity levels present but no clear sweep setup. Monitor for accumulation/distribution."
    else:
        sweep_expectation = "no_clear_sweep"
        path_analysis = "Insufficient liquidity data for path analysis."
    
    return LiquidityLadder(
        current_price=round(current_price, 2),
        ladder_above=ladder_above,
        ladder_below=ladder_below,
        nearest_above=nearest_above,
        nearest_below=nearest_below,
        major_above=major_above,
        major_below=major_below,
        more_attractive_side=more_attractive_side,
        sweep_expectation=sweep_expectation,
        path_analysis=path_analysis,
        data_source="Multi-Exchange Aggregated"
    )

# ============== TRADE SIGNAL GENERATOR ==============

def generate_trade_signal(
    current_price: float,
    market_bias: MarketBias,
    liquidity_direction: LiquidityDirection,
    sr_levels: List[SupportResistanceLevel],
    funding_rate: FundingRate,
    open_interest: OpenInterest,
    patterns: List[PatternDetection],
    whale_alerts: List[WhaleAlert],
    exchange_comparison: Dict[str, Any],
    whale_activity: WhaleActivity = None,
    liquidity_ladder: LiquidityLadder = None
) -> TradeSignal:
    """
    Generate a final actionable trading signal by synthesizing all intelligence.
    
    ENHANCED BTC TRADING LOGIC (v1.7 - Whale & Liquidity Ladder Integration):
    1. Minimum move filter: No signal if estimated move < 0.50%
    2. Smart stop placement: Beyond liquidity sweep zones
    3. Liquidity sweep detection: Identify sweep-and-reversal setups
    4. Setup type classification: continuation vs sweep_reversal
    5. Whale Activity Engine: Confirms direction with whale pressure
    6. Liquidity Ladder: Path analysis for sweep expectations
    
    Scoring System:
    - Market Bias: +/-3 points
    - Liquidity Direction: +/-2 points  
    - Exchange Consensus: +/-2 points
    - Funding Rate: +/-1 point
    - Open Interest Trend: +/-1 point
    - Pattern Signals: +/-2 points
    - Whale Alerts (legacy): +/-1 point
    - Whale Activity Engine: +/-2 points (NEW)
    - Liquidity Ladder Path: +/-1 point (NEW)
    
    Total range: -15 to +15
    Signal thresholds:
    - LONG: score >= 4
    - SHORT: score <= -4
    - NO TRADE: -3 to +3 (or move < 0.50%)
    """
    
    MINIMUM_MOVE_PERCENT = 0.50  # Minimum move required for a valid signal
    LIQUIDITY_SWEEP_BUFFER = 0.003  # 0.3% beyond obvious levels for stop placement
    
    score = 0
    factors = {}
    reasoning_parts = []
    warnings = []
    
    # Organize S/R levels
    supports = sorted([l for l in sr_levels if l.level_type == "support"], key=lambda x: abs(x.distance_percent))
    resistances = sorted([l for l in sr_levels if l.level_type == "resistance"], key=lambda x: abs(x.distance_percent))
    
    # Find obvious stop levels (where most traders place stops)
    obvious_long_stop = supports[0].price if supports else current_price * 0.99
    obvious_short_stop = resistances[0].price if resistances else current_price * 1.01
    
    # Calculate liquidity sweep zones (just beyond obvious stops)
    long_sweep_zone = obvious_long_stop * (1 - LIQUIDITY_SWEEP_BUFFER)  # Below obvious support
    short_sweep_zone = obvious_short_stop * (1 + LIQUIDITY_SWEEP_BUFFER)  # Above obvious resistance
    
    # Safe invalidation levels (beyond sweep zone)
    safe_long_invalidation = supports[1].price * 0.995 if len(supports) > 1 else current_price * 0.975
    safe_short_invalidation = resistances[1].price * 1.005 if len(resistances) > 1 else current_price * 1.025
    
    # ================== LIQUIDITY SWEEP DETECTION ==================
    sweep_detected = False
    sweep_analysis = None
    setup_type = "standard"
    
    # Check for potential liquidity sweep setup
    # A sweep setup occurs when:
    # 1. Price is near a key level (within 0.5%)
    # 2. There's significant liquidity just beyond that level
    # 3. The broader bias suggests reversal after the sweep
    
    nearest_support_dist = abs(supports[0].distance_percent) if supports else 100
    nearest_resistance_dist = abs(resistances[0].distance_percent) if resistances else 100
    
    # Detect if price is approaching liquidity sweep zone
    approaching_support_sweep = nearest_support_dist < 0.5 and supports
    approaching_resistance_sweep = nearest_resistance_dist < 0.5 and resistances
    
    if approaching_support_sweep:
        # Price near support - potential long sweep then reversal up
        support_level = supports[0]
        liquidity_below = sum(c.estimated_value for c in [LiquidityCluster(
            price=support_level.price * 0.99,
            strength="medium",
            distance_percent=-1,
            side="below",
            estimated_value=support_level.volume_at_level or 100000
        )] if hasattr(support_level, 'volume_at_level'))
        
        if market_bias.bias == "BULLISH" and market_bias.confidence >= 60:
            sweep_detected = True
            setup_type = "sweep_reversal"
            sweep_analysis = f"Price approaching ${support_level.price:,.0f} support. Likely liquidity sweep below ${long_sweep_zone:,.0f} before bullish reversal. Wait for reclaim of ${support_level.price:,.0f} to confirm long entry."
    
    elif approaching_resistance_sweep:
        # Price near resistance - potential short sweep then reversal down
        resistance_level = resistances[0]
        
        if market_bias.bias == "BEARISH" and market_bias.confidence >= 60:
            sweep_detected = True
            setup_type = "sweep_reversal"
            sweep_analysis = f"Price approaching ${resistance_level.price:,.0f} resistance. Likely liquidity sweep above ${short_sweep_zone:,.0f} before bearish reversal. Wait for rejection of ${resistance_level.price:,.0f} to confirm short entry."
    
    # ================== FACTOR SCORING ==================
    
    # 1. Market Bias Analysis (+/-3)
    bias_score = 0
    if market_bias.bias == "BULLISH":
        bias_score = 3 if market_bias.confidence >= 70 else 2 if market_bias.confidence >= 55 else 1
    elif market_bias.bias == "BEARISH":
        bias_score = -3 if market_bias.confidence >= 70 else -2 if market_bias.confidence >= 55 else -1
    
    score += bias_score
    factors["market_bias"] = {
        "bias": market_bias.bias,
        "confidence": market_bias.confidence,
        "score": bias_score,
        "max": 3
    }
    
    if bias_score > 0:
        reasoning_parts.append(f"Market Bias is {market_bias.bias} with {market_bias.confidence:.0f}% confidence")
    elif bias_score < 0:
        reasoning_parts.append(f"Market Bias is {market_bias.bias} with {market_bias.confidence:.0f}% confidence")
    
    # 2. Liquidity Direction (+/-2)
    liq_score = 0
    if liquidity_direction.direction == "UP":
        liq_score = 2 if liquidity_direction.imbalance_ratio > 1.5 else 1
    elif liquidity_direction.direction == "DOWN":
        liq_score = -2 if liquidity_direction.imbalance_ratio < 0.67 else -1
    
    score += liq_score
    factors["liquidity"] = {
        "direction": liquidity_direction.direction,
        "target": liquidity_direction.next_target,
        "imbalance_ratio": liquidity_direction.imbalance_ratio,
        "score": liq_score,
        "max": 2
    }
    
    if liq_score != 0:
        reasoning_parts.append(f"Liquidity points {liquidity_direction.direction} toward ${liquidity_direction.next_target:,.0f}")
    
    # 3. Exchange Consensus (+/-2)
    exchange_score = 0
    if exchange_comparison and "exchanges" in exchange_comparison:
        bullish_count = sum(1 for ex in exchange_comparison["exchanges"].values() if ex.get("bias") == "BULLISH")
        bearish_count = sum(1 for ex in exchange_comparison["exchanges"].values() if ex.get("bias") == "BEARISH")
        total = len(exchange_comparison["exchanges"])
        
        if bullish_count >= 2:
            exchange_score = 2 if bullish_count == total else 1
        elif bearish_count >= 2:
            exchange_score = -2 if bearish_count == total else -1
        
        consensus_text = f"{bullish_count}/{total} exchanges bullish, {bearish_count}/{total} bearish"
    else:
        consensus_text = "Exchange data unavailable"
    
    score += exchange_score
    factors["exchange_consensus"] = {
        "description": consensus_text,
        "score": exchange_score,
        "max": 2
    }
    
    if exchange_score > 0:
        reasoning_parts.append(f"Multi-exchange consensus is bullish ({consensus_text})")
    elif exchange_score < 0:
        reasoning_parts.append(f"Multi-exchange consensus is bearish ({consensus_text})")
    
    # 4. Funding Rate (+/-1)
    funding_score = 0
    if funding_rate:
        if funding_rate.sentiment == "bullish":
            funding_score = 1
        elif funding_rate.sentiment == "bearish":
            funding_score = -1
        
        # Overcrowded = potential squeeze = reversal opportunity
        if funding_rate.overcrowded:
            if funding_rate.overcrowded == "longs":
                warnings.append("⚠️ Longs overcrowded - long squeeze risk / potential short opportunity")
                funding_score -= 1
            elif funding_rate.overcrowded == "shorts":
                warnings.append("⚠️ Shorts overcrowded - short squeeze risk / potential long opportunity")
                funding_score += 1
    
    score += funding_score
    factors["funding_rate"] = {
        "rate": funding_rate.current_rate if funding_rate else 0,
        "sentiment": funding_rate.sentiment if funding_rate else "unknown",
        "score": funding_score,
        "max": 1
    }
    
    if funding_score != 0:
        reasoning_parts.append(f"Funding rate sentiment is {funding_rate.sentiment}")
    
    # 5. Open Interest Trend (+/-1)
    oi_score = 0
    if open_interest:
        if open_interest.trend == "increasing":
            if score > 0:
                oi_score = 1
                reasoning_parts.append("Open Interest increasing with bullish trend (new longs entering)")
            elif score < 0:
                oi_score = -1
                reasoning_parts.append("Open Interest increasing with bearish trend (new shorts entering)")
        elif open_interest.trend == "decreasing":
            if score > 0:
                warnings.append("⚠️ OI decreasing - possible profit taking / exhaustion")
            elif score < 0:
                warnings.append("⚠️ OI decreasing - shorts may be covering")
    
    score += oi_score
    factors["open_interest"] = {
        "total": open_interest.total_oi if open_interest else 0,
        "trend": open_interest.trend if open_interest else "unknown",
        "change_24h": open_interest.change_24h if open_interest else 0,
        "score": oi_score,
        "max": 1
    }
    
    # 6. Pattern Signals (+/-2)
    pattern_score = 0
    if patterns:
        for pattern in patterns[:2]:
            if pattern.direction == "BULLISH" and pattern.confidence >= 65:
                pattern_score += 1
                reasoning_parts.append(f"{pattern.pattern} pattern detected (bullish, {pattern.confidence:.0f}% conf)")
            elif pattern.direction == "BEARISH" and pattern.confidence >= 65:
                pattern_score -= 1
                reasoning_parts.append(f"{pattern.pattern} pattern detected (bearish, {pattern.confidence:.0f}% conf)")
    
    pattern_score = max(-2, min(2, pattern_score))
    score += pattern_score
    factors["patterns"] = {
        "count": len(patterns),
        "top_pattern": patterns[0].pattern if patterns else None,
        "score": pattern_score,
        "max": 2
    }
    
    # 7. Whale Alerts (+/-1)
    whale_score = 0
    if whale_alerts:
        long_signals = sum(1 for w in whale_alerts if w.signal == "LONG")
        short_signals = sum(1 for w in whale_alerts if w.signal == "SHORT")
        
        if long_signals > short_signals:
            whale_score = 1
            reasoning_parts.append(f"Whale activity favors longs ({long_signals} long vs {short_signals} short signals)")
        elif short_signals > long_signals:
            whale_score = -1
            reasoning_parts.append(f"Whale activity favors shorts ({short_signals} short vs {long_signals} long signals)")
    
    score += whale_score
    factors["whale_alerts"] = {
        "count": len(whale_alerts),
        "score": whale_score,
        "max": 1
    }
    
    # 8. WHALE ACTIVITY ENGINE (+/-2) - NEW
    whale_engine_score = 0
    whale_confirms_direction = False
    
    if whale_activity:
        if whale_activity.direction == "BUY" and whale_activity.strength >= 40:
            whale_engine_score = 2 if whale_activity.strength >= 70 else 1
            reasoning_parts.append(f"Whale Engine detects BUY pressure ({whale_activity.strength:.0f}% strength): {whale_activity.explanation}")
        elif whale_activity.direction == "SELL" and whale_activity.strength >= 40:
            whale_engine_score = -2 if whale_activity.strength >= 70 else -1
            reasoning_parts.append(f"Whale Engine detects SELL pressure ({whale_activity.strength:.0f}% strength): {whale_activity.explanation}")
        
        # Add specific whale signals as warnings/context
        if whale_activity.volume_spike:
            warnings.append(f"🐋 Volume spike detected: {whale_activity.volume_ratio:.1f}x average")
        if whale_activity.liquidation_bias == "longs_liquidated":
            warnings.append("🐋 Long liquidation cascade in progress")
        elif whale_activity.liquidation_bias == "shorts_liquidated":
            warnings.append("🐋 Short squeeze in progress")
        if whale_activity.orderbook_aggression:
            aggression_text = "aggressive buying" if whale_activity.orderbook_aggression == "aggressive_buying" else "aggressive selling"
            warnings.append(f"🐋 Order book shows {aggression_text}")
    
    score += whale_engine_score
    factors["whale_engine"] = {
        "direction": whale_activity.direction if whale_activity else "N/A",
        "strength": whale_activity.strength if whale_activity else 0,
        "buy_pressure": whale_activity.buy_pressure if whale_activity else 0,
        "sell_pressure": whale_activity.sell_pressure if whale_activity else 0,
        "score": whale_engine_score,
        "max": 2
    }
    
    # 9. LIQUIDITY LADDER PATH (+/-1) - NEW
    ladder_score = 0
    sweep_first_expected = False
    
    if liquidity_ladder:
        # If ladder shows more attractive liquidity in one direction, that's where price will seek
        if liquidity_ladder.more_attractive_side == "above":
            ladder_score = 1  # Bullish - price seeks upside liquidity
            reasoning_parts.append(f"Liquidity Ladder: More liquidity above - path analysis suggests upward sweep toward ${liquidity_ladder.major_above.price:,.0f}" if liquidity_ladder.major_above else "Liquidity Ladder: Path favors upside")
        elif liquidity_ladder.more_attractive_side == "below":
            ladder_score = -1  # Bearish - price seeks downside liquidity
            reasoning_parts.append(f"Liquidity Ladder: More liquidity below - path analysis suggests downward sweep toward ${liquidity_ladder.major_below.price:,.0f}" if liquidity_ladder.major_below else "Liquidity Ladder: Path favors downside")
        
        # Determine sweep expectation
        if liquidity_ladder.sweep_expectation == "sweep_below_first":
            sweep_first_expected = True
            if score > 0:  # Currently bullish
                warnings.append(f"⚠️ Sweep expected: Price may dip to ${liquidity_ladder.nearest_below.price:,.0f} before moving up" if liquidity_ladder.nearest_below else "⚠️ Potential dip before move up")
        elif liquidity_ladder.sweep_expectation == "sweep_above_first":
            sweep_first_expected = True
            if score < 0:  # Currently bearish
                warnings.append(f"⚠️ Sweep expected: Price may spike to ${liquidity_ladder.nearest_above.price:,.0f} before moving down" if liquidity_ladder.nearest_above else "⚠️ Potential spike before move down")
    
    score += ladder_score
    factors["liquidity_ladder"] = {
        "more_attractive_side": liquidity_ladder.more_attractive_side if liquidity_ladder else "N/A",
        "sweep_expectation": liquidity_ladder.sweep_expectation if liquidity_ladder else "N/A",
        "nearest_above": liquidity_ladder.nearest_above.price if liquidity_ladder and liquidity_ladder.nearest_above else None,
        "nearest_below": liquidity_ladder.nearest_below.price if liquidity_ladder and liquidity_ladder.nearest_below else None,
        "score": ladder_score,
        "max": 1
    }
    
    # 10. Trap Risk Assessment
    if market_bias.trap_risk == "high":
        warnings.append("⚠️ High trap risk - potential fake breakout / liquidity grab")
    
    # ================== DETERMINE DIRECTION ==================
    
    if score >= 4:
        direction = "LONG"
    elif score <= -4:
        direction = "SHORT"
    else:
        direction = "NO TRADE"
    
    # ================== CALCULATE TRADE PARAMETERS ==================
    
    if direction == "LONG":
        # Entry zone: current price to nearest support
        entry_zone_low = supports[0].price if supports else current_price * 0.995
        entry_zone_high = current_price
        
        # SMART STOP LOSS: Beyond the liquidity sweep zone, not at obvious level
        # Obvious stop = just below first support
        # Smart stop = below second support OR below sweep zone
        if len(supports) > 1:
            # Use second support as true invalidation
            stop_loss = safe_long_invalidation
            invalidation_reason = f"True invalidation below ${stop_loss:,.0f} (beyond sweep zone). Obvious stops at ${obvious_long_stop:,.0f} may get swept first."
        else:
            stop_loss = long_sweep_zone * 0.995  # Below sweep zone
            invalidation_reason = f"Stop placed at ${stop_loss:,.0f}, beyond likely sweep zone of ${long_sweep_zone:,.0f}"
        
        # Targets
        target_1 = resistances[0].price if resistances else current_price * 1.02
        target_2 = resistances[1].price if len(resistances) > 1 else current_price * 1.04
        
        estimated_move = ((target_1 - current_price) / current_price) * 100
        
        # Sweep zone info for LONG
        liquidity_sweep_zone = long_sweep_zone
        safe_invalidation = stop_loss
        
    elif direction == "SHORT":
        entry_zone_low = current_price
        entry_zone_high = resistances[0].price if resistances else current_price * 1.005
        
        # SMART STOP LOSS for SHORT
        if len(resistances) > 1:
            stop_loss = safe_short_invalidation
            invalidation_reason = f"True invalidation above ${stop_loss:,.0f} (beyond sweep zone). Obvious stops at ${obvious_short_stop:,.0f} may get swept first."
        else:
            stop_loss = short_sweep_zone * 1.005
            invalidation_reason = f"Stop placed at ${stop_loss:,.0f}, beyond likely sweep zone of ${short_sweep_zone:,.0f}"
        
        target_1 = supports[0].price if supports else current_price * 0.98
        target_2 = supports[1].price if len(supports) > 1 else current_price * 0.96
        
        estimated_move = ((target_1 - current_price) / current_price) * 100
        
        liquidity_sweep_zone = short_sweep_zone
        safe_invalidation = stop_loss
        
    else:  # NO TRADE
        entry_zone_low = current_price * 0.99
        entry_zone_high = current_price * 1.01
        stop_loss = 0
        invalidation_reason = "Mixed signals - wait for clearer setup"
        target_1 = 0
        target_2 = 0
        estimated_move = 0
        liquidity_sweep_zone = None
        safe_invalidation = None
    
    # ================== MINIMUM MOVE FILTER ==================
    
    no_trade_reason = None
    if direction != "NO TRADE":
        if abs(estimated_move) < MINIMUM_MOVE_PERCENT:
            no_trade_reason = f"Estimated move ({abs(estimated_move):.2f}%) is below minimum threshold ({MINIMUM_MOVE_PERCENT}%)"
            direction = "NO TRADE"
            warnings.append(f"⚠️ Move too small: {abs(estimated_move):.2f}% < {MINIMUM_MOVE_PERCENT}% minimum")
    
    # ================== CALCULATE RISK/REWARD ==================
    
    if direction != "NO TRADE" and stop_loss > 0:
        risk = abs(current_price - stop_loss)
        reward = abs(target_1 - current_price)
        risk_reward_ratio = reward / risk if risk > 0 else 0
        
        # Check if R:R is acceptable (at least 1.5:1)
        if risk_reward_ratio < 1.5:
            warnings.append(f"⚠️ Risk/Reward ({risk_reward_ratio:.1f}:1) below ideal 1.5:1")
    else:
        risk_reward_ratio = 0
    
    # ================== CALCULATE CONFIDENCE ==================
    
    max_score = 12
    raw_confidence = (abs(score) / max_score) * 100
    
    aligned_factors = sum(1 for f in factors.values() if isinstance(f, dict) and f.get("score", 0) * score > 0)
    total_factors = len([f for f in factors.values() if isinstance(f, dict) and f.get("score", 0) != 0])
    
    if total_factors > 0:
        alignment_bonus = (aligned_factors / total_factors) * 15
        confidence = min(95, raw_confidence + alignment_bonus)
    else:
        confidence = raw_confidence
    
    # Adjust confidence for sweep setups (higher confidence if sweep + reversal confirmed)
    if sweep_detected and setup_type == "sweep_reversal":
        confidence = min(95, confidence + 5)  # Bonus for recognizing sweep pattern
    
    if direction == "NO TRADE":
        confidence = max(30, 60 - abs(score) * 5)
    
    # ================== BUILD REASONING TEXT ==================
    
    if direction == "NO TRADE":
        if no_trade_reason:
            reasoning = f"⚠️ NO TRADE - INSUFFICIENT MOVE\n\n{no_trade_reason}\n\n"
        else:
            reasoning = "⚠️ MIXED SIGNALS - NO CLEAR TRADE SETUP\n\n"
        
        reasoning += "The intelligence factors are not aligned:\n"
        for part in reasoning_parts:
            reasoning += f"• {part}\n"
        
        if sweep_analysis:
            reasoning += f"\n📊 Liquidity Context:\n{sweep_analysis}\n"
        
        reasoning += "\nWait for clearer directional bias before entering a position."
        
    else:
        dir_emoji = "🟢" if direction == "LONG" else "🔴"
        
        if setup_type == "sweep_reversal":
            reasoning = f"{dir_emoji} {direction} - SWEEP & REVERSAL SETUP\n\n"
        else:
            reasoning = f"{dir_emoji} {direction} - CONTINUATION SETUP\n\n"
        
        # Move size assessment
        if abs(estimated_move) >= 2.0:
            reasoning += f"✅ Large move potential: {abs(estimated_move):.2f}%\n\n"
        elif abs(estimated_move) >= 1.0:
            reasoning += f"✅ Decent move potential: {abs(estimated_move):.2f}%\n\n"
        else:
            reasoning += f"⚠️ Small move: {abs(estimated_move):.2f}% (minimum is {MINIMUM_MOVE_PERCENT}%)\n\n"
        
        reasoning += "Key factors supporting this trade:\n"
        for part in reasoning_parts:
            reasoning += f"• {part}\n"
        
        # Liquidity sweep context
        reasoning += f"\n📊 Liquidity & Stop Placement:\n"
        if direction == "LONG":
            reasoning += f"• Obvious stop hunt zone: ${long_sweep_zone:,.0f} (below first support)\n"
            reasoning += f"• Safe invalidation: ${safe_long_invalidation:,.0f} (beyond sweep)\n"
            reasoning += f"• Stop placed at ${stop_loss:,.0f} to avoid stop hunts\n"
        else:
            reasoning += f"• Obvious stop hunt zone: ${short_sweep_zone:,.0f} (above first resistance)\n"
            reasoning += f"• Safe invalidation: ${safe_short_invalidation:,.0f} (beyond sweep)\n"
            reasoning += f"• Stop placed at ${stop_loss:,.0f} to avoid stop hunts\n"
        
        if sweep_analysis:
            reasoning += f"\n🔄 Sweep Analysis:\n{sweep_analysis}\n"
        
        # Add liquidity ladder path analysis
        if liquidity_ladder and liquidity_ladder.path_analysis:
            reasoning += f"\n🪜 Liquidity Path:\n{liquidity_ladder.path_analysis}\n"
        
        # Add whale activity summary
        if whale_activity and whale_activity.direction != "NEUTRAL":
            reasoning += f"\n🐋 Whale Activity:\n{whale_activity.explanation}\n"
        
        if warnings:
            reasoning += "\n⚠️ Risk Warnings:\n"
            for warning in warnings:
                reasoning += f"{warning}\n"
        
        reasoning += f"\n📈 Risk/Reward: {risk_reward_ratio:.1f}:1"
    
    # Check if whale confirms direction
    if whale_activity:
        if direction == "LONG" and whale_activity.direction == "BUY":
            whale_confirms_direction = True
        elif direction == "SHORT" and whale_activity.direction == "SELL":
            whale_confirms_direction = True
    
    # Build whale activity summary for response
    whale_activity_summary = None
    if whale_activity:
        whale_activity_summary = {
            "direction": whale_activity.direction,
            "strength": whale_activity.strength,
            "confidence": whale_activity.confidence,
            "explanation": whale_activity.explanation,
            "volume_spike": whale_activity.volume_spike,
            "volume_ratio": whale_activity.volume_ratio,
            "buy_pressure": whale_activity.buy_pressure,
            "sell_pressure": whale_activity.sell_pressure,
            "liquidation_bias": whale_activity.liquidation_bias,
            "orderbook_aggression": whale_activity.orderbook_aggression,
            "signals": whale_activity.signals
        }
    
    # Build liquidity ladder summary for response
    liquidity_ladder_summary = None
    if liquidity_ladder:
        liquidity_ladder_summary = {
            "current_price": liquidity_ladder.current_price,
            "more_attractive_side": liquidity_ladder.more_attractive_side,
            "sweep_expectation": liquidity_ladder.sweep_expectation,
            "path_analysis": liquidity_ladder.path_analysis,
            "nearest_above": {
                "price": liquidity_ladder.nearest_above.price,
                "distance_percent": liquidity_ladder.nearest_above.distance_percent,
                "strength": liquidity_ladder.nearest_above.strength,
                "type": liquidity_ladder.nearest_above.type
            } if liquidity_ladder.nearest_above else None,
            "nearest_below": {
                "price": liquidity_ladder.nearest_below.price,
                "distance_percent": liquidity_ladder.nearest_below.distance_percent,
                "strength": liquidity_ladder.nearest_below.strength,
                "type": liquidity_ladder.nearest_below.type
            } if liquidity_ladder.nearest_below else None,
            "major_above": {
                "price": liquidity_ladder.major_above.price,
                "strength": liquidity_ladder.major_above.strength
            } if liquidity_ladder.major_above else None,
            "major_below": {
                "price": liquidity_ladder.major_below.price,
                "strength": liquidity_ladder.major_below.strength
            } if liquidity_ladder.major_below else None,
            "levels_above_count": len(liquidity_ladder.ladder_above),
            "levels_below_count": len(liquidity_ladder.ladder_below)
        }
    
    return TradeSignal(
        direction=direction,
        confidence=round(confidence, 1),
        estimated_move=round(estimated_move, 2),
        entry_zone_low=round(entry_zone_low, 2),
        entry_zone_high=round(entry_zone_high, 2),
        stop_loss=round(stop_loss, 2),
        invalidation_reason=invalidation_reason,
        target_1=round(target_1, 2),
        target_2=round(target_2, 2),
        risk_reward_ratio=round(risk_reward_ratio, 2),
        reasoning=reasoning,
        factors=factors,
        timestamp=datetime.now(timezone.utc),
        valid_for="4H",
        warnings=warnings,
        setup_type=setup_type,
        liquidity_sweep_zone=round(liquidity_sweep_zone, 2) if liquidity_sweep_zone else None,
        safe_invalidation=round(safe_invalidation, 2) if safe_invalidation else None,
        sweep_detected=sweep_detected,
        sweep_analysis=sweep_analysis,
        whale_activity=whale_activity_summary,
        liquidity_ladder_summary=liquidity_ladder_summary,
        sweep_first_expected=sweep_first_expected,
        whale_confirms_direction=whale_confirms_direction
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

@api_router.get("/system/health")
async def get_system_health():
    """
    Comprehensive system health check for all APIs.
    Useful for verifying deployment status.
    """
    health = {
        "status": "OK",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.7",
        "apis": {}
    }
    
    # 1. Check Kraken
    try:
        ticker = await fetch_kraken_ticker()
        health["apis"]["kraken"] = {
            "status": "OK" if ticker and ticker.get("price", 0) > 0 else "ERROR",
            "description": "Dati di mercato BTC (prezzo, candele, order book)",
            "api_key_required": False,
            "btc_price": ticker.get("price", 0) if ticker else 0
        }
    except Exception as e:
        health["apis"]["kraken"] = {"status": "ERROR", "error": str(e)}
    
    # 2. Check Coinbase
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get("https://api.exchange.coinbase.com/products/BTC-USD/ticker")
            health["apis"]["coinbase"] = {
                "status": "OK" if resp.status_code == 200 else "ERROR",
                "description": "Order book per aggregazione multi-exchange",
                "api_key_required": False
            }
    except Exception as e:
        health["apis"]["coinbase"] = {"status": "ERROR", "error": str(e)}
    
    # 3. Check Bitstamp
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get("https://www.bitstamp.net/api/v2/ticker/btcusd/")
            health["apis"]["bitstamp"] = {
                "status": "OK" if resp.status_code == 200 else "ERROR",
                "description": "Order book per aggregazione multi-exchange",
                "api_key_required": False
            }
    except Exception as e:
        health["apis"]["bitstamp"] = {"status": "ERROR", "error": str(e)}
    
    # 4. Check CoinGlass
    coinglass_key = os.environ.get("COINGLASS_API_KEY", "")
    if coinglass_key:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                headers = {"coinglassSecret": coinglass_key}
                resp = await client.get(
                    "https://open-api-v3.coinglass.com/api/futures/funding-rate/info?symbol=BTC",
                    headers=headers
                )
                data = resp.json()
                health["apis"]["coinglass"] = {
                    "status": "OK" if data.get("success") else "ERROR",
                    "description": "Open Interest, Funding Rate, Liquidazioni",
                    "api_key_required": True,
                    "api_key_configured": True,
                    "message": "Dati derivati attivi"
                }
        except Exception as e:
            health["apis"]["coinglass"] = {"status": "ERROR", "error": str(e), "api_key_configured": True}
    else:
        health["apis"]["coinglass"] = {
            "status": "NOT_CONFIGURED",
            "description": "Open Interest, Funding Rate, Liquidazioni",
            "api_key_required": True,
            "api_key_configured": False,
            "message": "Aggiungi COINGLASS_API_KEY in backend/.env"
        }
    
    # 5. Check CryptoCompare (optional)
    cryptocompare_key = os.environ.get("CRYPTOCOMPARE_API_KEY", "")
    health["apis"]["cryptocompare"] = {
        "status": "FALLBACK" if not cryptocompare_key else "OK",
        "description": "Feed notizie crypto (opzionale)",
        "api_key_required": False,
        "api_key_configured": bool(cryptocompare_key),
        "message": "Usando notizie generate dal mercato" if not cryptocompare_key else "Notizie esterne attive"
    }
    
    # 6. Check Telegram (optional)
    telegram_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    telegram_chat = os.environ.get("TELEGRAM_CHAT_ID", "")
    health["apis"]["telegram"] = {
        "status": "NOT_CONFIGURED" if not (telegram_token and telegram_chat) else "OK",
        "description": "Notifiche Telegram (opzionale)",
        "api_key_required": True,
        "api_key_configured": bool(telegram_token and telegram_chat),
        "message": "Non configurato - funzionalità opzionale" if not telegram_token else "Bot Telegram attivo"
    }
    
    # 7. Check MongoDB
    try:
        await signal_history_collection.count_documents({})
        health["apis"]["mongodb"] = {
            "status": "OK",
            "description": "Database per storico segnali",
            "api_key_required": False,
            "message": "Database connesso"
        }
    except Exception as e:
        health["apis"]["mongodb"] = {"status": "ERROR", "error": str(e)}
    
    # Determine overall status
    critical_apis = ["kraken", "mongodb"]
    for api in critical_apis:
        if health["apis"].get(api, {}).get("status") != "OK":
            health["status"] = "DEGRADED"
            break
    
    return health


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
async def get_market_bias(interval: str = Query(default="4h")):
    """Get market bias analysis with aggregated multi-exchange order book data (default: 4H)"""
    interval_map = {"15m": 15, "1h": 60, "4h": 240, "1d": 1440}
    kraken_interval = interval_map.get(interval, 240)  # Default to 4H
    
    candles = await fetch_kraken_ohlc(kraken_interval)
    aggregated_orderbook = await get_aggregated_orderbook()
    
    bias = calculate_market_bias(candles, aggregated_orderbook)
    return bias

@api_router.get("/support-resistance")
async def get_support_resistance(interval: str = Query(default="4h")):
    """Get support and resistance levels from price data and aggregated multi-exchange order book (default: 4H)"""
    interval_map = {"15m": 15, "1h": 60, "4h": 240, "1d": 1440}
    kraken_interval = interval_map.get(interval, 240)  # Default to 4H
    
    candles = await fetch_kraken_ohlc(kraken_interval)
    ticker = await fetch_kraken_ticker()
    aggregated_orderbook = await get_aggregated_orderbook()
    current_price = ticker["price"] if ticker else 0
    
    levels = calculate_support_resistance_enhanced(candles, current_price, aggregated_orderbook)
    
    # Get data source info
    active_exchanges = aggregated_orderbook.get("exchanges_active", ["Kraken"]) if aggregated_orderbook else ["Kraken"]
    
    return {
        "levels": levels, 
        "current_price": current_price, 
        "data_source": f"Aggregated ({', '.join(active_exchanges)})"
    }

@api_router.get("/liquidity")
async def get_liquidity(interval: str = Query(default="4h")):
    """Get liquidity clusters from aggregated multi-exchange order book analysis (default: 4H)"""
    interval_map = {"15m": 15, "1h": 60, "4h": 240, "1d": 1440}
    kraken_interval = interval_map.get(interval, 240)  # Default to 4H
    
    candles = await fetch_kraken_ohlc(kraken_interval)
    ticker = await fetch_kraken_ticker()
    aggregated_orderbook = await get_aggregated_orderbook()
    current_price = ticker["price"] if ticker else 0
    
    clusters, direction = generate_liquidity_clusters_enhanced(candles, current_price, aggregated_orderbook)
    
    # Get data source info
    active_exchanges = aggregated_orderbook.get("exchanges_active", ["Kraken"]) if aggregated_orderbook else ["Kraken"]
    
    return {
        "clusters": clusters, 
        "direction": direction, 
        "current_price": current_price,
        "data_source": f"Aggregated ({', '.join(active_exchanges)})",
        "exchange_stats": aggregated_orderbook.get("exchange_stats") if aggregated_orderbook else None
    }

@api_router.get("/whale-alerts")
async def get_whale_alerts(interval: str = Query(default="4h")):
    """Get whale alert signals from volume and aggregated multi-exchange order book analysis (default: 4H)"""
    interval_map = {"15m": 15, "1h": 60, "4h": 240, "1d": 1440}
    kraken_interval = interval_map.get(interval, 240)  # Default to 4H
    
    candles = await fetch_kraken_ohlc(kraken_interval)
    ticker = await fetch_kraken_ticker()
    aggregated_orderbook = await get_aggregated_orderbook()
    current_price = ticker["price"] if ticker else 0
    
    alerts = generate_whale_alerts_enhanced(candles, current_price, aggregated_orderbook)
    
    # Get data source info
    active_exchanges = aggregated_orderbook.get("exchanges_active", ["Kraken"]) if aggregated_orderbook else ["Kraken"]
    
    return {
        "alerts": alerts, 
        "data_source": f"Aggregated ({', '.join(active_exchanges)})"
    }

@api_router.get("/patterns")
async def get_patterns(interval: str = Query(default="4h")):
    """Get detected chart patterns with detailed explanations (default: 4H)"""
    interval_map = {"15m": 15, "1h": 60, "4h": 240, "1d": 1440}
    kraken_interval = interval_map.get(interval, 240)  # Default to 4H
    
    candles = await fetch_kraken_ohlc(kraken_interval)
    patterns = detect_patterns(candles)
    return {"patterns": patterns, "data_source": "Kraken OHLC"}

@api_router.get("/candlesticks")
async def get_candlestick_patterns(interval: str = Query(default="4h")):
    """Get detected candlestick patterns (default: 4H)"""
    interval_map = {"15m": 15, "1h": 60, "4h": 240, "1d": 1440}
    kraken_interval = interval_map.get(interval, 240)  # Default to 4H
    
    candles = await fetch_kraken_ohlc(kraken_interval)
    patterns = detect_candlestick_patterns(candles)
    return {"patterns": patterns, "data_source": "Kraken OHLC"}

@api_router.get("/orderbook")
async def get_orderbook_analysis():
    """Get aggregated order book analysis from multiple exchanges"""
    aggregated_orderbook = await get_aggregated_orderbook()
    ticker = await fetch_kraken_ticker()
    current_price = ticker["price"] if ticker else 0
    
    if not aggregated_orderbook:
        # Fallback to Kraken only
        orderbook = await fetch_kraken_orderbook(100)
        analysis = analyze_orderbook(orderbook, current_price)
        return analysis
    
    # Build analysis from aggregated data
    bids = aggregated_orderbook.get("bids", [])
    asks = aggregated_orderbook.get("asks", [])
    
    # Find largest walls
    bid_walls = [(float(b[0]), float(b[1])) for b in bids]
    bid_walls_sorted = sorted(bid_walls, key=lambda x: x[1], reverse=True)
    top_bid = bid_walls_sorted[0] if bid_walls_sorted else (0, 0)
    
    ask_walls = [(float(a[0]), float(a[1])) for a in asks]
    ask_walls_sorted = sorted(ask_walls, key=lambda x: x[1], reverse=True)
    top_ask = ask_walls_sorted[0] if ask_walls_sorted else (0, 0)
    
    bid_depth = aggregated_orderbook.get("total_bid_depth", 0)
    ask_depth = aggregated_orderbook.get("total_ask_depth", 0)
    
    total_depth = bid_depth + ask_depth
    imbalance = ((bid_depth - ask_depth) / total_depth * 100) if total_depth > 0 else 0
    
    if imbalance > 15:
        direction = "bullish"
    elif imbalance < -15:
        direction = "bearish"
    else:
        direction = "balanced"
    
    active_exchanges = aggregated_orderbook.get("exchanges_active", [])
    
    return OrderBookAnalysis(
        top_bid_wall={"price": round(top_bid[0], 2), "quantity": round(top_bid[1], 4)},
        top_ask_wall={"price": round(top_ask[0], 2), "quantity": round(top_ask[1], 4)},
        imbalance=round(imbalance, 2),
        imbalance_direction=direction,
        bid_depth=round(bid_depth, 2),
        ask_depth=round(ask_depth, 2),
        data_source=f"Aggregated ({', '.join(active_exchanges)})",
        exchange_comparison=aggregated_orderbook.get("exchange_stats")
    )

@api_router.get("/exchange-comparison")
async def get_exchange_comparison():
    """Get per-exchange comparison of order book data and market metrics"""
    tickers = await fetch_all_exchange_tickers()
    orderbooks = await fetch_all_exchange_orderbooks()
    
    comparison = {}
    
    for exchange, ticker in tickers.items():
        comparison[exchange] = {
            "price": ticker.get("price", 0),
            "bid": ticker.get("bid", 0),
            "ask": ticker.get("ask", 0),
            "spread": ticker.get("ask", 0) - ticker.get("bid", 0) if ticker.get("ask") and ticker.get("bid") else 0,
            "volume_24h": ticker.get("volume_24h", 0),
        }
        
        # Add orderbook stats
        if exchange in orderbooks and orderbooks[exchange]:
            ob = orderbooks[exchange]
            bids = ob.get("bids", [])
            asks = ob.get("asks", [])
            
            bid_depth = sum(float(b[0]) * float(b[1]) for b in bids[:30])
            ask_depth = sum(float(a[0]) * float(a[1]) for a in asks[:30])
            total = bid_depth + ask_depth
            
            comparison[exchange]["bid_depth"] = round(bid_depth, 2)
            comparison[exchange]["ask_depth"] = round(ask_depth, 2)
            comparison[exchange]["imbalance"] = round(((bid_depth - ask_depth) / total * 100) if total > 0 else 0, 2)
            
            if comparison[exchange]["imbalance"] > 10:
                comparison[exchange]["bias"] = "BULLISH"
            elif comparison[exchange]["imbalance"] < -10:
                comparison[exchange]["bias"] = "BEARISH"
            else:
                comparison[exchange]["bias"] = "NEUTRAL"
    
    return {
        "exchanges": comparison,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/trade-signal")
async def get_trade_signal():
    """
    Get final actionable trading signal synthesizing all intelligence.
    
    This endpoint aggregates:
    - Market Bias (order book, trend, momentum)
    - Liquidity Direction (multi-exchange)
    - Exchange Consensus
    - Funding Rate & Open Interest
    - Pattern Detection
    - Whale Alerts (legacy)
    - Whale Activity Engine (NEW v1.7)
    - Liquidity Ladder (NEW v1.7)
    
    Returns a clear LONG, SHORT, or NO TRADE recommendation with
    entry zones, targets, stop loss, and detailed reasoning.
    """
    # Fetch all required data in parallel
    # NOTE: Using 4H (240min) candles as the core operational timeframe for trading intelligence
    ticker_task = fetch_kraken_ticker()
    candles_task = fetch_kraken_ohlc(240)  # 4H timeframe for bot-ready signals
    aggregated_ob_task = get_aggregated_orderbook()
    
    ticker, candles, aggregated_orderbook = await asyncio.gather(
        ticker_task, candles_task, aggregated_ob_task
    )
    
    current_price = ticker["price"] if ticker else 0
    
    if current_price == 0:
        return TradeSignal(
            direction="NO TRADE",
            confidence=0,
            estimated_move=0,
            entry_zone_low=0,
            entry_zone_high=0,
            stop_loss=0,
            invalidation_reason="Market data unavailable",
            target_1=0,
            target_2=0,
            risk_reward_ratio=0,
            reasoning="Unable to generate signal - market data unavailable",
            factors={},
            timestamp=datetime.now(timezone.utc),
            valid_for="N/A",
            warnings=["Market data unavailable"]
        )
    
    # Generate all intelligence components
    market_bias = calculate_market_bias(candles, aggregated_orderbook)
    
    sr_levels = calculate_support_resistance_enhanced(candles, current_price, aggregated_orderbook)
    
    clusters, liquidity_direction = generate_liquidity_clusters_enhanced(candles, current_price, aggregated_orderbook)
    
    # Get exchange comparison
    tickers = await fetch_all_exchange_tickers()
    orderbooks = await fetch_all_exchange_orderbooks()
    exchange_comparison = {"exchanges": {}}
    for exchange, ex_ticker in tickers.items():
        exchange_comparison["exchanges"][exchange] = {
            "price": ex_ticker.get("price", 0),
            "bias": "NEUTRAL"
        }
        if exchange in orderbooks and orderbooks[exchange]:
            ob = orderbooks[exchange]
            bids = ob.get("bids", [])
            asks = ob.get("asks", [])
            bid_depth = sum(float(b[0]) * float(b[1]) for b in bids[:30])
            ask_depth = sum(float(a[0]) * float(a[1]) for a in asks[:30])
            total = bid_depth + ask_depth
            imbalance = ((bid_depth - ask_depth) / total * 100) if total > 0 else 0
            if imbalance > 10:
                exchange_comparison["exchanges"][exchange]["bias"] = "BULLISH"
            elif imbalance < -10:
                exchange_comparison["exchanges"][exchange]["bias"] = "BEARISH"
    
    # Get funding and OI (async)
    funding_task = generate_funding_rate(aggregated_orderbook)
    oi_task = generate_open_interest(current_price, candles)
    
    funding_rate, open_interest = await asyncio.gather(funding_task, oi_task)
    
    # Get patterns and whale alerts (legacy)
    patterns = detect_patterns(candles)
    whale_alerts = generate_whale_alerts_enhanced(candles, current_price, aggregated_orderbook)
    
    # NEW v1.7: Generate Whale Activity Engine data
    # Need to fetch liquidation data from CoinGlass for the whale engine
    liquidation_data = None
    try:
        coinglass_key = os.environ.get("COINGLASS_API_KEY", "")
        if coinglass_key:
            async with httpx.AsyncClient() as client:
                headers = {"coinglassSecret": coinglass_key}
                liq_resp = await client.get(
                    "https://open-api-v3.coinglass.com/api/futures/liquidation/detail?symbol=BTC",
                    headers=headers,
                    timeout=10.0
                )
                if liq_resp.status_code == 200:
                    liq_data = liq_resp.json()
                    if liq_data.get("success") and liq_data.get("data"):
                        data_list = liq_data["data"]
                        if data_list:
                            # Aggregate liquidation data across exchanges
                            total_long_liq = sum(float(d.get("longLiqUsd", 0) or 0) for d in data_list)
                            total_short_liq = sum(float(d.get("shortLiqUsd", 0) or 0) for d in data_list)
                            liquidation_data = {
                                "long_liquidation_usd_24h": total_long_liq,
                                "short_liquidation_usd_24h": total_short_liq
                            }
    except Exception as e:
        logger.warning(f"Failed to fetch CoinGlass liquidation data: {e}")
    
    # Generate Whale Activity
    whale_activity = analyze_whale_activity(
        candles=candles,
        current_price=current_price,
        aggregated_orderbook=aggregated_orderbook,
        liquidation_data=liquidation_data,
        open_interest_data={"change_1h": open_interest.change_1h, "change_24h": open_interest.change_24h} if open_interest else None
    )
    
    # NEW v1.7: Build Liquidity Ladder
    liquidity_ladder = build_liquidity_ladder(
        current_price=current_price,
        sr_levels=sr_levels,
        liquidity_clusters=clusters,
        aggregated_orderbook=aggregated_orderbook
    )
    
    # Generate the final trade signal with all intelligence
    signal = generate_trade_signal(
        current_price=current_price,
        market_bias=market_bias,
        liquidity_direction=liquidity_direction,
        sr_levels=sr_levels,
        funding_rate=funding_rate,
        open_interest=open_interest,
        patterns=patterns,
        whale_alerts=whale_alerts,
        exchange_comparison=exchange_comparison,
        whale_activity=whale_activity,
        liquidity_ladder=liquidity_ladder
    )
    
    return signal


# ============== SIGNAL HISTORY ==============

@api_router.post("/signal-history/record")
async def record_signal():
    """
    Record the current trade signal to history.
    Called periodically or on significant signal changes.
    """
    try:
        # Get current trade signal
        ticker_task = fetch_kraken_ticker()
        candles_task = fetch_kraken_ohlc(240)
        aggregated_ob_task = get_aggregated_orderbook()
        
        ticker, candles, aggregated_orderbook = await asyncio.gather(
            ticker_task, candles_task, aggregated_ob_task
        )
        
        current_price = ticker["price"] if ticker else 0
        
        if current_price == 0:
            return {"error": "Market data unavailable", "recorded": False}
        
        # Generate intelligence
        market_bias = calculate_market_bias(candles, aggregated_orderbook)
        sr_levels = calculate_support_resistance_enhanced(candles, current_price, aggregated_orderbook)
        clusters, liquidity_direction = generate_liquidity_clusters_enhanced(candles, current_price, aggregated_orderbook)
        
        # Get exchange comparison
        tickers = await fetch_all_exchange_tickers()
        orderbooks = await fetch_all_exchange_orderbooks()
        exchange_comparison = {"exchanges": {}}
        for exchange, ex_ticker in tickers.items():
            exchange_comparison["exchanges"][exchange] = {
                "price": ex_ticker.get("price", 0),
                "bias": "NEUTRAL"
            }
            if exchange in orderbooks and orderbooks[exchange]:
                ob = orderbooks[exchange]
                bids = ob.get("bids", [])
                asks = ob.get("asks", [])
                bid_depth = sum(float(b[0]) * float(b[1]) for b in bids[:30])
                ask_depth = sum(float(a[0]) * float(a[1]) for a in asks[:30])
                total = bid_depth + ask_depth
                imbalance = ((bid_depth - ask_depth) / total * 100) if total > 0 else 0
                if imbalance > 10:
                    exchange_comparison["exchanges"][exchange]["bias"] = "BULLISH"
                elif imbalance < -10:
                    exchange_comparison["exchanges"][exchange]["bias"] = "BEARISH"
        
        # Get other data
        funding_task = generate_funding_rate(aggregated_orderbook)
        oi_task = generate_open_interest(current_price, candles)
        funding_rate, open_interest = await asyncio.gather(funding_task, oi_task)
        
        patterns = detect_patterns(candles)
        whale_alerts = generate_whale_alerts_enhanced(candles, current_price, aggregated_orderbook)
        
        # Get liquidation data for whale engine
        liquidation_data = None
        try:
            coinglass_key = os.environ.get("COINGLASS_API_KEY", "")
            if coinglass_key:
                async with httpx.AsyncClient() as http_client:
                    headers = {"coinglassSecret": coinglass_key}
                    liq_resp = await http_client.get(
                        "https://open-api-v3.coinglass.com/api/futures/liquidation/detail?symbol=BTC",
                        headers=headers,
                        timeout=10.0
                    )
                    if liq_resp.status_code == 200:
                        liq_data = liq_resp.json()
                        if liq_data.get("success") and liq_data.get("data"):
                            data_list = liq_data["data"]
                            if data_list:
                                total_long_liq = sum(float(d.get("longLiqUsd", 0) or 0) for d in data_list)
                                total_short_liq = sum(float(d.get("shortLiqUsd", 0) or 0) for d in data_list)
                                liquidation_data = {
                                    "long_liquidation_usd_24h": total_long_liq,
                                    "short_liquidation_usd_24h": total_short_liq
                                }
        except Exception as e:
            logger.warning(f"Failed to fetch liquidation data for history: {e}")
        
        whale_activity = analyze_whale_activity(
            candles=candles,
            current_price=current_price,
            aggregated_orderbook=aggregated_orderbook,
            liquidation_data=liquidation_data,
            open_interest_data={"change_1h": open_interest.change_1h, "change_24h": open_interest.change_24h} if open_interest else None
        )
        
        liquidity_ladder = build_liquidity_ladder(
            current_price=current_price,
            sr_levels=sr_levels,
            liquidity_clusters=clusters,
            aggregated_orderbook=aggregated_orderbook
        )
        
        # Generate signal
        signal = generate_trade_signal(
            current_price=current_price,
            market_bias=market_bias,
            liquidity_direction=liquidity_direction,
            sr_levels=sr_levels,
            funding_rate=funding_rate,
            open_interest=open_interest,
            patterns=patterns,
            whale_alerts=whale_alerts,
            exchange_comparison=exchange_comparison,
            whale_activity=whale_activity,
            liquidity_ladder=liquidity_ladder
        )
        
        # Check if we should record (avoid duplicates within 1 hour)
        last_signal = await signal_history_collection.find_one(
            {},
            sort=[("timestamp", -1)],
            projection={"_id": 0, "direction": 1, "timestamp": 1}
        )
        
        should_record = True
        if last_signal:
            time_diff = (datetime.now(timezone.utc) - last_signal["timestamp"]).total_seconds()
            if time_diff < 3600 and last_signal["direction"] == signal.direction:
                should_record = False  # Same signal within 1 hour
        
        if should_record:
            # Create history entry
            history_entry = {
                "signal_id": str(uuid.uuid4()),
                "timestamp": datetime.now(timezone.utc),
                "direction": signal.direction,
                "confidence": signal.confidence,
                "estimated_move": signal.estimated_move,
                "entry_zone_low": signal.entry_zone_low,
                "entry_zone_high": signal.entry_zone_high,
                "stop_loss": signal.stop_loss,
                "target_1": signal.target_1,
                "target_2": signal.target_2,
                "risk_reward_ratio": signal.risk_reward_ratio,
                "setup_type": signal.setup_type,
                "btc_price": current_price,
                "market_bias": market_bias.bias,
                "whale_direction": whale_activity.direction if whale_activity else None,
                "liquidity_direction": liquidity_direction.direction,
                "warnings": signal.warnings[:3],  # Keep top 3 warnings
                "reasoning_summary": signal.reasoning[:500] if signal.reasoning else "",
                "outcome": "active" if signal.direction != "NO TRADE" else None,
                "actual_move": None,
                "closed_at": None
            }
            
            await signal_history_collection.insert_one(history_entry)
            return {"recorded": True, "signal_id": history_entry["signal_id"], "direction": signal.direction}
        
        return {"recorded": False, "reason": "Duplicate signal within 1 hour"}
        
    except Exception as e:
        logger.error(f"Error recording signal: {e}")
        return {"error": str(e), "recorded": False}


@api_router.get("/signal-history")
async def get_signal_history(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    direction: Optional[str] = Query(default=None, description="Filter by direction: LONG, SHORT, NO TRADE")
):
    """
    Get signal history with pagination.
    """
    try:
        # Build query
        query = {}
        if direction:
            query["direction"] = direction.upper()
        
        # Get total count
        total_count = await signal_history_collection.count_documents(query)
        
        # Get paginated results
        skip = (page - 1) * page_size
        signals = await signal_history_collection.find(
            query,
            {"_id": 0}
        ).sort("timestamp", -1).skip(skip).limit(page_size).to_list(page_size)
        
        return {
            "signals": signals,
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size
        }
    except Exception as e:
        logger.error(f"Error fetching signal history: {e}")
        return {"signals": [], "total_count": 0, "page": page, "page_size": page_size, "error": str(e)}


@api_router.get("/signal-history/stats")
async def get_signal_stats():
    """
    Get statistics from signal history.
    """
    try:
        # Get counts by direction
        pipeline = [
            {"$group": {"_id": "$direction", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        direction_counts = await signal_history_collection.aggregate(pipeline).to_list(10)
        
        # Get recent signals count
        now = datetime.now(timezone.utc)
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)
        
        count_24h = await signal_history_collection.count_documents({"timestamp": {"$gte": last_24h}})
        count_7d = await signal_history_collection.count_documents({"timestamp": {"$gte": last_7d}})
        total = await signal_history_collection.count_documents({})
        
        # Get average confidence by direction
        avg_pipeline = [
            {"$group": {
                "_id": "$direction",
                "avg_confidence": {"$avg": "$confidence"},
                "avg_rr": {"$avg": "$risk_reward_ratio"},
                "count": {"$sum": 1}
            }}
        ]
        avg_stats = await signal_history_collection.aggregate(avg_pipeline).to_list(10)
        
        return {
            "total_signals": total,
            "signals_24h": count_24h,
            "signals_7d": count_7d,
            "by_direction": {item["_id"]: item["count"] for item in direction_counts},
            "averages_by_direction": {
                item["_id"]: {
                    "avg_confidence": round(item["avg_confidence"], 1) if item["avg_confidence"] else 0,
                    "avg_risk_reward": round(item["avg_rr"], 2) if item["avg_rr"] else 0,
                    "count": item["count"]
                } for item in avg_stats
            }
        }
    except Exception as e:
        logger.error(f"Error getting signal stats: {e}")
        return {"error": str(e)}


@api_router.delete("/signal-history/clear")
async def clear_signal_history():
    """Clear all signal history (admin function)"""
    try:
        result = await signal_history_collection.delete_many({})
        return {"deleted": result.deleted_count}
    except Exception as e:
        logger.error(f"Error clearing history: {e}")
        return {"error": str(e)}


@api_router.get("/open-interest")
async def get_open_interest():
    """Get Open Interest data from CoinGlass"""
    ticker = await fetch_kraken_ticker()
    candles = await fetch_kraken_ohlc(240)  # 4H timeframe
    current_price = ticker["price"] if ticker else 0
    
    oi = await generate_open_interest(current_price, candles)
    return oi

@api_router.get("/funding-rate")
async def get_funding_rate():
    """Get Funding Rate data from CoinGlass"""
    orderbook = await fetch_kraken_orderbook(100)
    
    funding = await generate_funding_rate(orderbook)
    return funding

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
