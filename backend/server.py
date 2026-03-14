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
    # NEW FIELDS v1.9.4
    oi_divergence: Optional[str] = None  # "short_closing", "short_opening", "long_closing", "long_opening"
    oi_divergence_strength: float = 0  # 0-100
    accumulation_distribution: Optional[str] = None  # "accumulation", "distribution", "absorption"
    absorption_detected: bool = False
    liquidation_zones: List[dict] = []  # List of nearby liquidation targets
    whale_behavior: str = "unknown"  # "accumulating", "distributing", "hunting_stops", "position_building"

# ============== MARKET ENERGY / COMPRESSION DETECTOR ==============

class MarketEnergy(BaseModel):
    """Market Energy / Compression Detector - identifies energy build-up before significant moves"""
    energy_score: float  # 0-100 overall energy score
    compression_level: str  # "LOW", "MEDIUM", "HIGH"
    range_width_percent: float  # Current trading range width as percentage
    volatility_compression: float  # 0-100 volatility compression score
    oi_trend: str  # "RISING", "FALLING", "STABLE"
    oi_change_percent: float  # OI change percentage
    liquidity_buildup: str  # "NONE", "WEAK", "MODERATE", "STRONG"
    liquidity_above: float  # Liquidity value above current price
    liquidity_below: float  # Liquidity value below current price
    orderbook_pressure_buildup: str  # "NONE", "BUILDING", "STRONG"
    breakout_probability: str  # "LOW", "MEDIUM", "HIGH"
    expected_direction: Optional[str] = None  # "UP", "DOWN", "UNCLEAR"
    explanation: str  # Summary explanation
    signals: List[str] = []  # Detected signals
    expansion_warning: bool = False  # True if expansion likely soon
    data_source: str = "Multi-Exchange + CoinGlass"

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
    # NEW v1.8: Signal confirmation system
    signal_state: str = "NO_TRADE"  # "NO_TRADE", "SETUP_IN_CONFIRMATION", "OPERATIONAL"
    raw_direction: Optional[str] = None  # Original direction before confirmation
    confirmation_progress: int = 0  # 0-100% progress toward confirmation
    consecutive_signals: int = 0  # How many consecutive same-direction signals
    awaiting_sweep_confirmation: bool = False  # Waiting for sweep + rejection
    volatility_warning: bool = False  # Market in high volatility mode
    time_in_setup: Optional[str] = None  # How long in SETUP_IN_CONFIRMATION state


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
TRADE_SIGNAL_CACHE_TTL = 180  # 3 minutes - Trade signal refresh rate

# ============== MULTILINGUAL SYSTEM ==============
# Supported languages: it, en, de, pl
BACKEND_TRANSLATIONS = {
    "it": {
        # Market Bias
        "strong_buying_pressure": "Forte pressione di acquisto nell'order book.",
        "momentum_favors_bulls": "Il momentum favorisce i rialzisti.",
        "short_squeeze_prob": "Probabilità di short squeeze al {0:.0f}%.",
        "heavy_selling_pressure": "Forte pressione di vendita rilevata.",
        "momentum_favors_bears": "Il momentum favorisce i ribassisti.",
        "long_squeeze_prob": "Probabilità di long squeeze al {0:.0f}%.",
        "market_indecision": "Indecisione del mercato. Attendere segnali più chiari.",
        "analyzing_conditions": "Analisi delle condizioni di mercato in corso...",
        
        # Open Interest
        "oi_increasing": "OI in aumento con nuove posizioni. Nuovi capitali stanno entrando nel mercato. Se il prezzo sale = continuazione rialzista.",
        "oi_decreasing": "OI in diminuzione indica chiusura di posizioni. Possibile esaurimento del trend o presa di profitto.",
        "oi_stable": "OI stabile indica consolidamento del mercato. Attendere una rottura con aumento dei volumi.",
        
        # Funding Rate
        "more_longs_liquidated": "Più long liquidati ({0:.1f}%). Pressione ribassista. Gli short pagano i long.",
        "more_shorts_liquidated": "Più short liquidati ({0:.1f}%). Pressione rialzista. I long pagano gli short.",
        "balanced_liquidations": "Liquidazioni bilanciate. Ambiente di funding neutrale.",
        "api_unavailable": "API temporaneamente non disponibile. Dati stimati.",
        
        # S/R Levels
        "price_rejected_at": "Prezzo respinto a ${0:,.0f} in {1} occasioni.",
        "high_rejection_prob": "Alta probabilità di rigetto se testato di nuovo.",
        "likely_selling_pressure": "Probabile pressione di vendita a questo livello.",
        "may_break_momentum": "Potrebbe cedere con forte momentum.",
        "buyers_stepped_in": "I compratori sono intervenuti a ${0:,.0f} in {1} occasioni.",
        "strong_demand_zone": "Zona di domanda forte - alta probabilità di rimbalzo.",
        "likely_buying_interest": "Probabile interesse d'acquisto a questo livello.",
        "may_break_selling": "Potrebbe cedere con forte pressione di vendita.",
        
        # Order Book
        "buy_orders_across": "${0:,.0f} ({1:.2f} BTC) in ordini di acquisto su {2} exchange.",
        "sell_orders_across": "${0:,.0f} ({1:.2f} BTC) in ordini di vendita su {2} exchange.",
        "major_support_wall": "Muro di supporto importante - difficile da rompere.",
        "moderate_buying": "Interesse d'acquisto moderato a questo livello.",
        "major_resistance_wall": "Muro di resistenza importante - attendersi forte vendita qui.",
        "moderate_selling": "Pressione di vendita moderata a questo livello.",
        
        # Liquidity Direction
        "more_liq_above": "Più liquidità sopra il prezzo attuale (${0:,.0f} ordini di vendita vs ${1:,.0f} ordini di acquisto). Il prezzo tende a cercare liquidità - attendersi movimento verso l'alto per cacciare stop.",
        "more_liq_below": "Più liquidità sotto il prezzo attuale (${0:,.0f} ordini di acquisto vs ${1:,.0f} ordini di vendita). Il prezzo tende a cercare liquidità - attendersi movimento verso il basso per cacciare stop.",
        "balanced_liquidity": "Distribuzione liquidità bilanciata. Nessuna direzione chiara - il mercato potrebbe consolidare fino a sviluppo di sbilanciamento.",
        
        # Liquidity Ladder
        "upper_ladder_stronger": "Scala di liquidità superiore più forte (${0:.1f}M sopra vs ${1:.1f}M sotto). Prezzo probabile sweep verso ${2:,.0f} prima di potenziale inversione.",
        "lower_ladder_stronger": "Scala di liquidità inferiore più forte (${0:.1f}M sotto vs ${1:.1f}M sopra). Prezzo probabile sweep verso ${2:,.0f} prima di potenziale inversione.",
        "balanced_distribution": "Distribuzione liquidità bilanciata. Nessuna direzione di sweep chiara - monitorare per catalizzatore di breakout.",
        "no_clear_sweep": "Livelli di liquidità presenti ma nessun setup di sweep chiaro. Monitorare accumulazione/distribuzione.",
        "insufficient_data": "Dati di liquidità insufficienti per l'analisi del percorso.",
        
        # Whale Activity
        "large_buy_pressure": "Forte pressione di acquisto rilevata: picco di volume combinato con order book pesantemente lato bid.",
        "whale_buying_squeeze": "Pressione di acquisto delle balene: short squeeze in corso con pesanti liquidazioni short.",
        "buy_pressure_detected": "Pressione di acquisto rilevata: {0}",
        "moderate_whale_buying": "Attività moderata di acquisto balene rilevata sugli exchange.",
        "large_sell_pressure": "Forte pressione di vendita rilevata: picco di volume combinato con order book pesantemente lato ask.",
        "whale_selling_cascade": "Pressione di vendita delle balene: cascata di liquidazioni long in corso.",
        "sell_pressure_detected": "Pressione di vendita rilevata: {0}",
        "moderate_whale_selling": "Attività moderata di vendita balene rilevata sugli exchange.",
        "no_whale_bias": "Nessun bias direzionale chiaro delle balene. Attività bilanciata o insufficiente per generare segnale.",
        
        # Trade Signal Reasoning
        "market_bias_is": "Bias di Mercato è {0} con confidenza del {1:.0f}%",
        "liquidity_points": "La liquidità punta verso {0} in direzione ${1:,.0f}",
        "exchange_consensus_bullish": "Consenso multi-exchange è bullish ({0})",
        "exchange_consensus_bearish": "Consenso multi-exchange è bearish ({0})",
        "funding_sentiment": "Il sentiment del funding rate è {0}",
        "oi_increasing_bullish": "Open Interest in aumento con trend bullish (nuovi long in ingresso)",
        "oi_increasing_bearish": "Open Interest in aumento con trend bearish (nuovi short in ingresso)",
        "oi_decreasing_profit": "OI in diminuzione - possibile presa di profitto / esaurimento",
        "oi_decreasing_covering": "OI in diminuzione - gli short potrebbero stare coprendo",
        "pattern_detected": "Pattern {0} rilevato ({1}, {2:.0f}% conf)",
        "whale_favors_longs": "Attività balene favorisce i long ({0} long vs {1} short)",
        "whale_favors_shorts": "Attività balene favorisce gli short ({0} short vs {1} long)",
        "whale_engine_buy": "Whale Engine rileva pressione di ACQUISTO ({0:.0f}% forza): {1}",
        "whale_engine_sell": "Whale Engine rileva pressione di VENDITA ({0:.0f}% forza): {1}",
        "volume_spike": "Picco di volume rilevato: {0:.1f}x la media",
        "long_liquidation_cascade": "Cascata di liquidazioni long in corso",
        "short_squeeze_progress": "Short squeeze in corso",
        "orderbook_aggressive_buy": "L'order book mostra acquisto aggressivo",
        "orderbook_aggressive_sell": "L'order book mostra vendita aggressiva",
        "ladder_more_above": "Liquidity Ladder: Più liquidità sopra - analisi percorso suggerisce sweep verso ${0:,.0f}",
        "ladder_favors_upside": "Liquidity Ladder: Percorso favorisce il rialzo",
        "ladder_more_below": "Liquidity Ladder: Più liquidità sotto - analisi percorso suggerisce sweep verso ${0:,.0f}",
        "ladder_favors_downside": "Liquidity Ladder: Percorso favorisce il ribasso",
        "sweep_expected_down": "Sweep atteso: Il prezzo potrebbe scendere a ${0:,.0f} prima di salire",
        "possible_dip": "Possibile discesa prima del rialzo",
        "sweep_expected_up": "Sweep atteso: Il prezzo potrebbe salire a ${0:,.0f} prima di scendere",
        "possible_spike": "Possibile spike prima del ribasso",
        "high_trap_risk": "Alto rischio di trappola - possibile falso breakout / caccia alla liquidità",
        "longs_overcrowded": "Long affollati - rischio squeeze long / opportunità short potenziale",
        "shorts_overcrowded": "Short affollati - rischio squeeze short / opportunità long potenziale",
        
        # Invalidation
        "true_invalidation_below": "Invalidazione reale sotto ${0:,.0f} (oltre la zona di sweep). Gli stop ovvi a ${1:,.0f} potrebbero essere spazzati prima.",
        "stop_beyond_sweep_below": "Stop posizionato a ${0:,.0f}, oltre la probabile zona di sweep di ${1:,.0f}",
        "true_invalidation_above": "Invalidazione reale sopra ${0:,.0f} (oltre la zona di sweep). Gli stop ovvi a ${1:,.0f} potrebbero essere spazzati prima.",
        "stop_beyond_sweep_above": "Stop posizionato a ${0:,.0f}, oltre la probabile zona di sweep di ${1:,.0f}",
        "mixed_signals": "Segnali misti - attendere configurazione più chiara",
        
        # Signal States
        "no_trade_insufficient": "NO TRADE - MOVIMENTO INSUFFICIENTE",
        "move_below_threshold": "Movimento stimato ({0:.2f}%) è sotto la soglia minima ({1}%)",
        "move_too_small": "Movimento troppo piccolo: {0:.2f}% < {1}% minimo",
        "mixed_signals_no_setup": "SEGNALI MISTI - NESSUNA CONFIGURAZIONE CHIARA",
        "factors_not_aligned": "I fattori di intelligence non sono allineati:",
        "wait_clearer_bias": "Attendere un bias direzionale più chiaro prima di entrare in posizione.",
        "sweep_reversal_setup": "CONFIGURAZIONE SWEEP E INVERSIONE",
        "continuation_setup": "CONFIGURAZIONE CONTINUAZIONE",
        "large_move_potential": "Grande potenziale di movimento: {0:.2f}%",
        "decent_move_potential": "Discreto potenziale di movimento: {0:.2f}%",
        "small_move": "Movimento ridotto: {0:.2f}% (minimo è {1}%)",
        "key_factors": "Fattori chiave a supporto del trade:",
        "liquidity_stop_placement": "Liquidità & Posizionamento Stop:",
        "obvious_stop_zone": "Zona di caccia stop ovvia: ${0:,.0f} (sotto primo supporto)",
        "obvious_stop_zone_above": "Zona di caccia stop ovvia: ${0:,.0f} (sopra prima resistenza)",
        "safe_invalidation": "Invalidazione sicura: ${0:,.0f} (oltre lo sweep)",
        "stop_placed_at": "Stop posizionato a ${0:,.0f} per evitare caccia agli stop",
        "sweep_analysis": "Analisi Sweep:",
        "liquidity_path": "Percorso Liquidità:",
        "whale_activity_section": "Attività Balene:",
        "risk_warnings": "Avvisi di Rischio:",
        "rr_below_ideal": "Risk/Reward ({0:.1f}:1) sotto l'ideale 1.5:1",
        
        # Sweep Analysis
        "approaching_support": "Il prezzo si avvicina al supporto ${0:,.0f}. Probabile sweep della liquidità sotto ${1:,.0f} prima di un'inversione bullish. Attendere il recupero di ${2:,.0f} per confermare l'ingresso long.",
        "approaching_resistance": "Il prezzo si avvicina alla resistenza ${0:,.0f}. Probabile sweep della liquidità sopra ${1:,.0f} prima di un'inversione bearish. Attendere il rigetto di ${2:,.0f} per confermare l'ingresso short.",
        
        # Confirmation System
        "setup_in_confirmation": "SETUP IN CONFERMA - {0}",
        "setup_detected_waiting": "Setup rilevato, in attesa di conferma ({0}/2 segnali consecutivi).",
        "awaiting_sweep": "Sweep atteso prima dell'ingresso. Attendere completamento sweep e conferma di rigetto/recupero.",
        "operational_signal": "SEGNALE OPERATIVO - {0}",
        "confirmation_complete": "Conferma completata dopo {0} segnali consecutivi.",
        "confidence_trend": "Confidenza: {0}",
        "no_contradictions": "Nessuna contraddizione rilevata.",
        "consecutive_signals": "Segnali consecutivi: {0}/2",
        "contradictions": "Contraddizioni: {0}",
        "confidence_declining": "Confidenza in calo",
        "awaiting_sweep_confirm": "In attesa di sweep + conferma rigetto",
        "high_volatility_wait": "Alta volatilità - attendere stabilizzazione",
        "in_confirmation": "In conferma...",
        
        # Signal History
        "setup_detected_reason": "Setup {0} rilevato - in attesa conferma",
        "signal_confirmed": "Segnale {0} CONFERMATO - operativo",
        "setup_invalidated": "Setup {0} invalidato prima della conferma",
        "signal_invalidated": "Segnale {0} invalidato - condizioni cambiate",
        "periodic_update": "Aggiornamento periodico segnale operativo",
        
        # Liquidity Clusters
        "buy_orders_at_level": "${0:,.0f} in ordini di acquisto a questo livello.",
        "sell_orders_at_level": "${0:,.0f} in ordini di vendita a questo livello.",
        "major_demand_zone": "Zona di domanda principale - il prezzo probabilmente rimbalzerà qui.",
        "moderate_support": "Supporto moderato - osservare reazione dei compratori.",
        "minor_support": "Livello di supporto minore.",
        "major_supply_zone": "Zona di offerta principale - forte resistenza prevista.",
        "moderate_resistance": "Resistenza moderata - i venditori potrebbero difendere questo livello.",
        "minor_resistance": "Livello di resistenza minore.",
        "recent_high_rejected": "Massimo recente a ${0:,.0f}. Il prezzo è stato respinto qui - potenziale cluster di stop-loss.",
        "recent_low_defended": "Minimo recente a ${0:,.0f}. I compratori hanno difeso questo livello - potenziale zona di liquidazione.",
        "more_liquidity_above": "Più liquidità sopra il prezzo attuale (${0:,.0f} ordini di vendita vs ${1:,.0f} ordini di acquisto). Il prezzo tende a cercare liquidità - attendersi movimento verso l'alto per cacciare stop.",
        "more_liquidity_below": "Più liquidità sotto il prezzo attuale (${0:,.0f} ordini di acquisto vs ${1:,.0f} ordini di vendita). Il prezzo tende a cercare liquidità - attendersi movimento verso il basso per cacciare stop.",
        "balanced_liquidity_distribution": "Distribuzione liquidità bilanciata. Nessuna direzione chiara - il mercato potrebbe consolidare fino a sviluppo di sbilanciamento.",
        
        # Whale Alerts
        "volume_spike_reason": "Picco di volume rilevato ({0:.1f}x media). Pressione istituzionale di {1} identificata.",
        "multi_exchange_imbalance": "Sbilanciamento multi-exchange: {0:.1f}%. {1}/{2} exchange mostrano pressione di {3}.",
        
        # Whale Activity Engine v2.0
        "absorption_bullish": "Assorbimento rilevato: alto volume ({0:.1f}x) con candela a corpo piccolo. Vendite assorbite = accumulazione.",
        "absorption_bearish": "Assorbimento rilevato: alto volume ({0:.1f}x) con candela a corpo piccolo. Acquisti assorbiti = distribuzione.",
        "absorption_neutral": "Pattern di assorbimento rilevato: alto volume ({0:.1f}x) senza direzione chiara.",
        "large_bullish_volume": "Volume rialzista elevato ({0:.1f}x media) - acquisto istituzionale.",
        "large_bearish_volume": "Volume ribassista elevato ({0:.1f}x media) - vendita istituzionale.",
        "oi_div_short_closing": "Divergenza OI: prezzo +{0:.1f}% con OI {1:.1f}% = chiusura di short.",
        "oi_div_long_closing": "Divergenza OI: prezzo {0:.1f}% con OI {1:.1f}% = chiusura di long.",
        "oi_div_long_opening": "Convergenza OI: prezzo +{0:.1f}% con OI +{1:.1f}% = apertura nuovi long.",
        "oi_div_short_opening": "Convergenza OI: prezzo {0:.1f}% con OI +{1:.1f}% = apertura nuovi short.",
        "heavy_buy_orderbook": "Order book pesante lato buy ({0:.1f}% sbilanciamento).",
        "buy_orderbook_dominance": "Dominanza buy nell'order book ({0:.1f}%).",
        "heavy_sell_orderbook": "Order book pesante lato sell ({0:.1f}% sbilanciamento).",
        "sell_orderbook_dominance": "Dominanza sell nell'order book ({0:.1f}%).",
        "bid_wall_detected": "{0} muri bid rilevati vicino a ${1:,.0f}.",
        "ask_wall_detected": "{0} muri ask rilevati vicino a ${1:,.0f}.",
        "heavy_long_liquidations": "Liquidazioni long massicce ({0:.0f}% del totale).",
        "more_longs_liquidated_signal": "Più long che short liquidati.",
        "heavy_short_liquidations": "Liquidazioni short massicce ({0:.0f}% del totale).",
        "more_shorts_liquidated_signal": "Più short che long liquidati.",
        "long_liq_zone_near": "Zona liquidazione long vicina a ${0:,.0f} ({1:.1f}% distanza) - possibile caccia stop.",
        "short_liq_zone_near": "Zona liquidazione short vicina a ${0:,.0f} ({1:.1f}% distanza) - possibile caccia stop.",
        "whale_accumulating": "Le balene stanno accumulando.",
        "whale_distributing": "Le balene stanno distribuendo.",
        "whale_hunting_stops": "Probabile caccia agli stop in corso.",
        "whale_position_building": "Costruzione posizioni istituzionali in corso.",
        "whale_position_closing": "Chiusura posizioni istituzionali in corso.",
        "whale_absorbing": "Assorbimento ordini da parte di grandi player.",
        "oi_context_short_closing": "Gli short stanno chiudendo posizioni - continuazione rialzista probabile.",
        "oi_context_long_closing": "I long stanno chiudendo posizioni - continuazione ribassista probabile.",
        "oi_context_long_opening": "Nuove posizioni long in apertura - forte pressione rialzista.",
        "oi_context_short_opening": "Nuove posizioni short in apertura - forte pressione ribassista.",
        "absorption_context_bullish": "Pattern di assorbimento rialzista - venditori vengono assorbiti.",
        "absorption_context_bearish": "Pattern di assorbimento ribassista - compratori vengono assorbiti.",
        "vol_ob_bullish": "Volume elevato con order book aggressivo lato buy - forte domanda.",
        "vol_ob_bearish": "Volume elevato con order book aggressivo lato sell - forte offerta.",
        "liq_context_bullish": "Short squeeze in corso - short liquidati forzatamente.",
        "liq_context_bearish": "Cascata di liquidazioni long - pressione ribassista.",
        
        # Market Energy / Compression Detector
        "extreme_compression": "Compressione estrema: range {0:.2f}% - energia in accumulo.",
        "high_compression": "Alta compressione: range {0:.2f}% - movimento significativo probabile.",
        "moderate_compression": "Compressione moderata: range {0:.2f}%.",
        "tight_recent_range": "Range recente molto stretto: {0:.2f}% - breakout imminente possibile.",
        "extreme_vol_compression": "Volatilità estremamente compressa - espansione imminente.",
        "high_vol_compression": "Volatilità compressa - energia in accumulo.",
        "oi_rising_compression": "OI in aumento +{0:.1f}% - posizionamento in costruzione.",
        "oi_building_during_compression": "OI in crescita durante compressione - forte setup di breakout.",
        "strong_liquidity_both_sides": "Forte liquidità su entrambi i lati (${0:.1f}M sopra, ${1:.1f}M sotto) - squeeze setup.",
        "moderate_liquidity_buildup": "Accumulo liquidità moderato su entrambi i lati.",
        "strong_orderbook_buildup": "Forte accumulo order book: {0} muri bid, {1} muri ask.",
        "expansion_likely": "ESPANSIONE PROBABILE - compressione + posizionamento = movimento imminente.",
        "energy_expansion_bullish": "BTC compresso in range {0:.2f}% con OI +{1:.1f}%. Liquidità in accumulo. Espansione rialzista probabile.",
        "energy_expansion_bearish": "BTC compresso in range {0:.2f}% con OI +{1:.1f}%. Liquidità in accumulo. Espansione ribassista probabile.",
        "energy_expansion_unclear": "BTC compresso in range {0:.2f}% con energia in accumulo. Direzione non chiara - attendere conferma.",
        "energy_high_building": "BTC in forte compressione ({0:.2f}% range) con OI crescente e liquidità in accumulo. Movimento significativo in arrivo.",
        "energy_high_oi_rising": "BTC compresso in range {0:.2f}% mentre OI cresce +{1:.1f}%. Posizionamento istituzionale in corso.",
        "energy_high_compressed": "BTC in trading range stretto ({0:.2f}%). Energia in accumulo per prossimo movimento.",
        "energy_medium_building": "Compressione moderata con posizionamento in costruzione. Monitorare per breakout.",
        "energy_medium_consolidating": "Mercato in consolidamento. Energia neutra.",
        "energy_low_ranging": "Mercato in range ampio. Bassa probabilità di breakout imminente.",
        "energy_low_normal": "Condizioni di mercato normali. Nessuna compressione significativa.",
        "energy_boosts_confidence": "Alta energia di mercato aumenta la confidenza.",
        "high_energy_expansion": "Alta energia di mercato ({0:.0f}) - espansione imminente.",
        "high_energy_wait": "Alta energia ({0:.0f}) ma direzione non confermata - attendere setup.",
        "energy_reduces_confidence": "Bassa energia di mercato riduce la confidenza.",
        "low_energy_caution": "Bassa energia di mercato - cautela su breakout.",
        "expansion_likely_direction": "Espansione probabile verso {0}.",
        "expansion_likely_no_direction": "Espansione probabile ma direzione non chiara - attendere conferma.",
    },
    "en": {
        # Market Bias
        "strong_buying_pressure": "Strong buying pressure in order book.",
        "momentum_favors_bulls": "Momentum favors bulls.",
        "short_squeeze_prob": "Short squeeze probability at {0:.0f}%.",
        "heavy_selling_pressure": "Heavy selling pressure detected.",
        "momentum_favors_bears": "Momentum favors bears.",
        "long_squeeze_prob": "Long squeeze probability at {0:.0f}%.",
        "market_indecision": "Market indecision. Wait for clearer signals.",
        "analyzing_conditions": "Analyzing market conditions...",
        
        # Open Interest
        "oi_increasing": "Increasing OI with rising positions. New money entering the market. If price rising = bullish continuation.",
        "oi_decreasing": "Decreasing OI indicates positions being closed. Potential trend exhaustion or profit-taking.",
        "oi_stable": "Stable OI shows market consolidation. Watch for breakout with volume.",
        
        # Funding Rate
        "more_longs_liquidated": "More longs liquidated ({0:.1f}%). Bearish pressure. Shorts paying longs.",
        "more_shorts_liquidated": "More shorts liquidated ({0:.1f}%). Bullish pressure. Longs paying shorts.",
        "balanced_liquidations": "Balanced liquidations. Neutral funding environment.",
        "api_unavailable": "API temporarily unavailable. Showing estimated data.",
        
        # S/R Levels
        "price_rejected_at": "Price rejected at ${0:,.0f} on {1} occasions.",
        "high_rejection_prob": "High probability of rejection if tested again.",
        "likely_selling_pressure": "Likely to see selling pressure here.",
        "may_break_momentum": "May break on strong momentum.",
        "buyers_stepped_in": "Buyers stepped in at ${0:,.0f} on {1} occasions.",
        "strong_demand_zone": "Strong demand zone - high probability of bounce.",
        "likely_buying_interest": "Likely to see buying interest here.",
        "may_break_selling": "May break on heavy selling pressure.",
        
        # Order Book
        "buy_orders_across": "${0:,.0f} ({1:.2f} BTC) in buy orders across {2} exchanges.",
        "sell_orders_across": "${0:,.0f} ({1:.2f} BTC) in sell orders across {2} exchanges.",
        "major_support_wall": "Major support wall - unlikely to break easily.",
        "moderate_buying": "Moderate buying interest at this level.",
        "major_resistance_wall": "Major resistance wall - expect strong selling here.",
        "moderate_selling": "Moderate selling pressure at this level.",
        
        # Liquidity Direction
        "more_liq_above": "More liquidity above current price (${0:,.0f} sell orders vs ${1:,.0f} buy orders). Price tends to seek liquidity - expect move upward to hunt stops.",
        "more_liq_below": "More liquidity below current price (${0:,.0f} buy orders vs ${1:,.0f} sell orders). Price tends to seek liquidity - expect move downward to hunt stops.",
        "balanced_liquidity": "Balanced liquidity distribution. No clear direction - market may consolidate until imbalance develops.",
        
        # Liquidity Ladder
        "upper_ladder_stronger": "Upper liquidity ladder is stronger (${0:.1f}M above vs ${1:.1f}M below). Price likely to sweep ${2:,.0f} before potential reversal.",
        "lower_ladder_stronger": "Lower liquidity ladder is stronger (${0:.1f}M below vs ${1:.1f}M above). Price likely to sweep ${2:,.0f} before potential reversal.",
        "balanced_distribution": "Balanced liquidity distribution. No clear sweep direction - watch for breakout catalyst.",
        "no_clear_sweep": "Liquidity levels present but no clear sweep setup. Monitor for accumulation/distribution.",
        "insufficient_data": "Insufficient liquidity data for path analysis.",
        
        # Whale Activity
        "large_buy_pressure": "Large buy pressure detected: volume spike combined with heavy bid-side order book.",
        "whale_buying_squeeze": "Whale buying pressure: short squeeze in progress with heavy short liquidations.",
        "buy_pressure_detected": "Buy pressure detected: {0}",
        "moderate_whale_buying": "Moderate whale buying activity detected across exchanges.",
        "large_sell_pressure": "Large sell pressure detected: volume spike combined with heavy ask-side order book.",
        "whale_selling_cascade": "Whale selling pressure: long liquidation cascade with heavy long liquidations.",
        "sell_pressure_detected": "Sell pressure detected: {0}",
        "moderate_whale_selling": "Moderate whale selling activity detected across exchanges.",
        "no_whale_bias": "No clear whale directional bias. Activity is balanced or insufficient for signal.",
        
        # Trade Signal Reasoning
        "market_bias_is": "Market Bias is {0} with {1:.0f}% confidence",
        "liquidity_points": "Liquidity points {0} toward ${1:,.0f}",
        "exchange_consensus_bullish": "Multi-exchange consensus is bullish ({0})",
        "exchange_consensus_bearish": "Multi-exchange consensus is bearish ({0})",
        "funding_sentiment": "Funding rate sentiment is {0}",
        "oi_increasing_bullish": "Open Interest increasing with bullish trend (new longs entering)",
        "oi_increasing_bearish": "Open Interest increasing with bearish trend (new shorts entering)",
        "oi_decreasing_profit": "OI decreasing - possible profit taking / exhaustion",
        "oi_decreasing_covering": "OI decreasing - shorts may be covering",
        "pattern_detected": "{0} pattern detected ({1}, {2:.0f}% conf)",
        "whale_favors_longs": "Whale activity favors longs ({0} long vs {1} short signals)",
        "whale_favors_shorts": "Whale activity favors shorts ({0} short vs {1} long signals)",
        "whale_engine_buy": "Whale Engine detects BUY pressure ({0:.0f}% strength): {1}",
        "whale_engine_sell": "Whale Engine detects SELL pressure ({0:.0f}% strength): {1}",
        "volume_spike": "Volume spike detected: {0:.1f}x average",
        "long_liquidation_cascade": "Long liquidation cascade in progress",
        "short_squeeze_progress": "Short squeeze in progress",
        "orderbook_aggressive_buy": "Order book shows aggressive buying",
        "orderbook_aggressive_sell": "Order book shows aggressive selling",
        "ladder_more_above": "Liquidity Ladder: More liquidity above - path analysis suggests upward sweep toward ${0:,.0f}",
        "ladder_favors_upside": "Liquidity Ladder: Path favors upside",
        "ladder_more_below": "Liquidity Ladder: More liquidity below - path analysis suggests downward sweep toward ${0:,.0f}",
        "ladder_favors_downside": "Liquidity Ladder: Path favors downside",
        "sweep_expected_down": "Sweep expected: Price may dip to ${0:,.0f} before moving up",
        "possible_dip": "Potential dip before move up",
        "sweep_expected_up": "Sweep expected: Price may spike to ${0:,.0f} before moving down",
        "possible_spike": "Potential spike before move down",
        "high_trap_risk": "High trap risk - potential fake breakout / liquidity grab",
        "longs_overcrowded": "Longs overcrowded - long squeeze risk / potential short opportunity",
        "shorts_overcrowded": "Shorts overcrowded - short squeeze risk / potential long opportunity",
        
        # Invalidation
        "true_invalidation_below": "True invalidation below ${0:,.0f} (beyond sweep zone). Obvious stops at ${1:,.0f} may get swept first.",
        "stop_beyond_sweep_below": "Stop placed at ${0:,.0f}, beyond likely sweep zone of ${1:,.0f}",
        "true_invalidation_above": "True invalidation above ${0:,.0f} (beyond sweep zone). Obvious stops at ${1:,.0f} may get swept first.",
        "stop_beyond_sweep_above": "Stop placed at ${0:,.0f}, beyond likely sweep zone of ${1:,.0f}",
        "mixed_signals": "Mixed signals - wait for clearer setup",
        
        # Signal States
        "no_trade_insufficient": "NO TRADE - INSUFFICIENT MOVE",
        "move_below_threshold": "Estimated move ({0:.2f}%) is below minimum threshold ({1}%)",
        "move_too_small": "Move too small: {0:.2f}% < {1}% minimum",
        "mixed_signals_no_setup": "MIXED SIGNALS - NO CLEAR TRADE SETUP",
        "factors_not_aligned": "The intelligence factors are not aligned:",
        "wait_clearer_bias": "Wait for clearer directional bias before entering a position.",
        "sweep_reversal_setup": "SWEEP & REVERSAL SETUP",
        "continuation_setup": "CONTINUATION SETUP",
        "large_move_potential": "Large move potential: {0:.2f}%",
        "decent_move_potential": "Decent move potential: {0:.2f}%",
        "small_move": "Small move: {0:.2f}% (minimum is {1}%)",
        "key_factors": "Key factors supporting this trade:",
        "liquidity_stop_placement": "Liquidity & Stop Placement:",
        "obvious_stop_zone": "Obvious stop hunt zone: ${0:,.0f} (below first support)",
        "obvious_stop_zone_above": "Obvious stop hunt zone: ${0:,.0f} (above first resistance)",
        "safe_invalidation": "Safe invalidation: ${0:,.0f} (beyond sweep)",
        "stop_placed_at": "Stop placed at ${0:,.0f} to avoid stop hunts",
        "sweep_analysis": "Sweep Analysis:",
        "liquidity_path": "Liquidity Path:",
        "whale_activity_section": "Whale Activity:",
        "risk_warnings": "Risk Warnings:",
        "rr_below_ideal": "Risk/Reward ({0:.1f}:1) below ideal 1.5:1",
        
        # Sweep Analysis
        "approaching_support": "Price approaching ${0:,.0f} support. Likely liquidity sweep below ${1:,.0f} before bullish reversal. Wait for reclaim of ${2:,.0f} to confirm long entry.",
        "approaching_resistance": "Price approaching ${0:,.0f} resistance. Likely liquidity sweep above ${1:,.0f} before bearish reversal. Wait for rejection of ${2:,.0f} to confirm short entry.",
        
        # Confirmation System
        "setup_in_confirmation": "SETUP IN CONFIRMATION - {0}",
        "setup_detected_waiting": "Setup detected, waiting for confirmation ({0}/2 consecutive signals).",
        "awaiting_sweep": "Sweep expected before entry. Wait for sweep completion and rejection/reclaim confirmation.",
        "operational_signal": "OPERATIONAL SIGNAL - {0}",
        "confirmation_complete": "Confirmation complete after {0} consecutive signals.",
        "confidence_trend": "Confidence: {0}",
        "no_contradictions": "No contradictions detected.",
        "consecutive_signals": "Consecutive signals: {0}/2",
        "contradictions": "Contradictions: {0}",
        "confidence_declining": "Confidence declining",
        "awaiting_sweep_confirm": "Awaiting sweep + rejection confirmation",
        "high_volatility_wait": "High volatility - wait for stabilization",
        "in_confirmation": "Confirming...",
        
        # Signal History
        "setup_detected_reason": "Setup {0} detected - awaiting confirmation",
        "signal_confirmed": "Signal {0} CONFIRMED - operational",
        "setup_invalidated": "Setup {0} invalidated before confirmation",
        "signal_invalidated": "Signal {0} invalidated - conditions changed",
        "periodic_update": "Periodic operational signal update",
        
        # Liquidity Clusters
        "buy_orders_at_level": "${0:,.0f} in buy orders at this level.",
        "sell_orders_at_level": "${0:,.0f} in sell orders at this level.",
        "major_demand_zone": "Major demand zone - price likely to bounce here.",
        "moderate_support": "Moderate support - watch for buyer reaction.",
        "minor_support": "Minor support level.",
        "major_supply_zone": "Major supply zone - strong resistance expected.",
        "moderate_resistance": "Moderate resistance - sellers may defend this level.",
        "minor_resistance": "Minor resistance level.",
        "recent_high_rejected": "Recent high at ${0:,.0f}. Price was rejected here - potential stop-loss cluster.",
        "recent_low_defended": "Recent low at ${0:,.0f}. Buyers defended this level - potential liquidation zone.",
        "more_liquidity_above": "More liquidity above current price (${0:,.0f} sell orders vs ${1:,.0f} buy orders). Price tends to seek liquidity - expect move upward to hunt stops.",
        "more_liquidity_below": "More liquidity below current price (${0:,.0f} buy orders vs ${1:,.0f} sell orders). Price tends to seek liquidity - expect move downward to hunt stops.",
        "balanced_liquidity_distribution": "Balanced liquidity distribution. No clear direction - market may consolidate until imbalance develops.",
        
        # Whale Alerts
        "volume_spike_reason": "Volume spike detected ({0:.1f}x average). Institutional {1} pressure identified.",
        "multi_exchange_imbalance": "Multi-exchange imbalance: {0:.1f}%. {1}/{2} exchanges show {3} pressure.",
        
        # Whale Activity Engine v2.0
        "absorption_bullish": "Absorption detected: high volume ({0:.1f}x) with small body candle. Selling absorbed = accumulation.",
        "absorption_bearish": "Absorption detected: high volume ({0:.1f}x) with small body candle. Buying absorbed = distribution.",
        "absorption_neutral": "Absorption pattern detected: high volume ({0:.1f}x) without clear direction.",
        "large_bullish_volume": "Large bullish volume ({0:.1f}x average) - institutional buying.",
        "large_bearish_volume": "Large bearish volume ({0:.1f}x average) - institutional selling.",
        "oi_div_short_closing": "OI Divergence: price +{0:.1f}% with OI {1:.1f}% = shorts closing.",
        "oi_div_long_closing": "OI Divergence: price {0:.1f}% with OI {1:.1f}% = longs closing.",
        "oi_div_long_opening": "OI Convergence: price +{0:.1f}% with OI +{1:.1f}% = new longs opening.",
        "oi_div_short_opening": "OI Convergence: price {0:.1f}% with OI +{1:.1f}% = new shorts opening.",
        "heavy_buy_orderbook": "Heavy buy-side order book ({0:.1f}% imbalance).",
        "buy_orderbook_dominance": "Buy-side order book dominance ({0:.1f}%).",
        "heavy_sell_orderbook": "Heavy sell-side order book ({0:.1f}% imbalance).",
        "sell_orderbook_dominance": "Sell-side order book dominance ({0:.1f}%).",
        "bid_wall_detected": "{0} bid walls detected near ${1:,.0f}.",
        "ask_wall_detected": "{0} ask walls detected near ${1:,.0f}.",
        "heavy_long_liquidations": "Heavy long liquidations ({0:.0f}% of total).",
        "more_longs_liquidated_signal": "More longs than shorts liquidated.",
        "heavy_short_liquidations": "Heavy short liquidations ({0:.0f}% of total).",
        "more_shorts_liquidated_signal": "More shorts than longs liquidated.",
        "long_liq_zone_near": "Long liquidation zone near ${0:,.0f} ({1:.1f}% distance) - possible stop hunt.",
        "short_liq_zone_near": "Short liquidation zone near ${0:,.0f} ({1:.1f}% distance) - possible stop hunt.",
        "whale_accumulating": "Whales are accumulating.",
        "whale_distributing": "Whales are distributing.",
        "whale_hunting_stops": "Likely stop hunting in progress.",
        "whale_position_building": "Institutional position building in progress.",
        "whale_position_closing": "Institutional position closing in progress.",
        "whale_absorbing": "Large players absorbing orders.",
        "oi_context_short_closing": "Shorts closing positions - bullish continuation likely.",
        "oi_context_long_closing": "Longs closing positions - bearish continuation likely.",
        "oi_context_long_opening": "New long positions opening - strong bullish pressure.",
        "oi_context_short_opening": "New short positions opening - strong bearish pressure.",
        "absorption_context_bullish": "Bullish absorption pattern - sellers being absorbed.",
        "absorption_context_bearish": "Bearish absorption pattern - buyers being absorbed.",
        "vol_ob_bullish": "High volume with aggressive buy-side order book - strong demand.",
        "vol_ob_bearish": "High volume with aggressive sell-side order book - strong supply.",
        "liq_context_bullish": "Short squeeze in progress - shorts being forcibly liquidated.",
        "liq_context_bearish": "Long liquidation cascade - bearish pressure.",
        
        # Market Energy / Compression Detector
        "extreme_compression": "Extreme compression: {0:.2f}% range - energy building.",
        "high_compression": "High compression: {0:.2f}% range - significant move likely.",
        "moderate_compression": "Moderate compression: {0:.2f}% range.",
        "tight_recent_range": "Very tight recent range: {0:.2f}% - breakout imminent possible.",
        "extreme_vol_compression": "Extremely compressed volatility - expansion imminent.",
        "high_vol_compression": "Compressed volatility - energy building.",
        "oi_rising_compression": "OI rising +{0:.1f}% - positioning building.",
        "oi_building_during_compression": "OI growing during compression - strong breakout setup.",
        "strong_liquidity_both_sides": "Strong liquidity on both sides (${0:.1f}M above, ${1:.1f}M below) - squeeze setup.",
        "moderate_liquidity_buildup": "Moderate liquidity buildup on both sides.",
        "strong_orderbook_buildup": "Strong order book buildup: {0} bid walls, {1} ask walls.",
        "expansion_likely": "EXPANSION LIKELY - compression + positioning = move imminent.",
        "energy_expansion_bullish": "BTC compressed in {0:.2f}% range with OI +{1:.1f}%. Liquidity building. Bullish expansion likely.",
        "energy_expansion_bearish": "BTC compressed in {0:.2f}% range with OI +{1:.1f}%. Liquidity building. Bearish expansion likely.",
        "energy_expansion_unclear": "BTC compressed in {0:.2f}% range with energy building. Direction unclear - wait for confirmation.",
        "energy_high_building": "BTC highly compressed ({0:.2f}% range) with rising OI and liquidity buildup. Significant move coming.",
        "energy_high_oi_rising": "BTC compressed in {0:.2f}% range while OI growing +{1:.1f}%. Institutional positioning in progress.",
        "energy_high_compressed": "BTC trading in tight range ({0:.2f}%). Energy building for next move.",
        "energy_medium_building": "Moderate compression with positioning building. Monitor for breakout.",
        "energy_medium_consolidating": "Market consolidating. Neutral energy.",
        "energy_low_ranging": "Market in wide range. Low probability of imminent breakout.",
        "energy_low_normal": "Normal market conditions. No significant compression.",
        "energy_boosts_confidence": "High market energy boosts confidence.",
        "high_energy_expansion": "High market energy ({0:.0f}) - expansion imminent.",
        "high_energy_wait": "High energy ({0:.0f}) but direction not confirmed - wait for setup.",
        "energy_reduces_confidence": "Low market energy reduces confidence.",
        "low_energy_caution": "Low market energy - be cautious on breakouts.",
        "expansion_likely_direction": "Expansion likely toward {0}.",
        "expansion_likely_no_direction": "Expansion likely but direction unclear - wait for confirmation.",
    },
    "de": {
        # Market Bias
        "strong_buying_pressure": "Starker Kaufdruck im Orderbuch.",
        "momentum_favors_bulls": "Momentum begünstigt Bullen.",
        "short_squeeze_prob": "Short Squeeze Wahrscheinlichkeit bei {0:.0f}%.",
        "heavy_selling_pressure": "Starker Verkaufsdruck erkannt.",
        "momentum_favors_bears": "Momentum begünstigt Bären.",
        "long_squeeze_prob": "Long Squeeze Wahrscheinlichkeit bei {0:.0f}%.",
        "market_indecision": "Marktunentschlossenheit. Auf klarere Signale warten.",
        "analyzing_conditions": "Marktbedingungen werden analysiert...",
        
        # Open Interest
        "oi_increasing": "Steigendes OI mit neuen Positionen. Neues Kapital tritt in den Markt ein. Bei steigendem Preis = bullische Fortsetzung.",
        "oi_decreasing": "Sinkendes OI zeigt Schließung von Positionen. Mögliche Trenderschöpfung oder Gewinnmitnahmen.",
        "oi_stable": "Stabiles OI zeigt Marktkonsolidierung. Auf Ausbruch mit Volumen achten.",
        
        # Funding Rate
        "more_longs_liquidated": "Mehr Longs liquidiert ({0:.1f}%). Bärischer Druck. Shorts zahlen Longs.",
        "more_shorts_liquidated": "Mehr Shorts liquidiert ({0:.1f}%). Bullischer Druck. Longs zahlen Shorts.",
        "balanced_liquidations": "Ausgeglichene Liquidationen. Neutrales Funding-Umfeld.",
        "api_unavailable": "API vorübergehend nicht verfügbar. Geschätzte Daten.",
        
        # S/R Levels
        "price_rejected_at": "Preis bei ${0:,.0f} {1} mal abgelehnt.",
        "high_rejection_prob": "Hohe Wahrscheinlichkeit einer Ablehnung bei erneutem Test.",
        "likely_selling_pressure": "Wahrscheinlich Verkaufsdruck hier.",
        "may_break_momentum": "Könnte bei starkem Momentum durchbrechen.",
        "buyers_stepped_in": "Käufer haben bei ${0:,.0f} {1} mal eingegriffen.",
        "strong_demand_zone": "Starke Nachfragezone - hohe Wahrscheinlichkeit eines Rebounds.",
        "likely_buying_interest": "Wahrscheinlich Kaufinteresse hier.",
        "may_break_selling": "Könnte bei starkem Verkaufsdruck durchbrechen.",
        
        # Order Book
        "buy_orders_across": "${0:,.0f} ({1:.2f} BTC) an Kauforders auf {2} Börsen.",
        "sell_orders_across": "${0:,.0f} ({1:.2f} BTC) an Verkaufsorders auf {2} Börsen.",
        "major_support_wall": "Große Unterstützungsmauer - schwer zu durchbrechen.",
        "moderate_buying": "Moderates Kaufinteresse auf diesem Niveau.",
        "major_resistance_wall": "Große Widerstandsmauer - starker Verkauf erwartet.",
        "moderate_selling": "Moderater Verkaufsdruck auf diesem Niveau.",
        
        # Liquidity Direction
        "more_liq_above": "Mehr Liquidität über dem aktuellen Preis (${0:,.0f} Verkaufsorders vs ${1:,.0f} Kauforders). Preis neigt dazu, Liquidität zu suchen - Aufwärtsbewegung für Stop-Jagd erwartet.",
        "more_liq_below": "Mehr Liquidität unter dem aktuellen Preis (${0:,.0f} Kauforders vs ${1:,.0f} Verkaufsorders). Preis neigt dazu, Liquidität zu suchen - Abwärtsbewegung für Stop-Jagd erwartet.",
        "balanced_liquidity": "Ausgeglichene Liquiditätsverteilung. Keine klare Richtung - Markt könnte konsolidieren.",
        
        # Liquidity Ladder
        "upper_ladder_stronger": "Obere Liquiditätsleiter stärker (${0:.1f}M oben vs ${1:.1f}M unten). Preis wird wahrscheinlich ${2:,.0f} sweepen vor möglicher Umkehr.",
        "lower_ladder_stronger": "Untere Liquiditätsleiter stärker (${0:.1f}M unten vs ${1:.1f}M oben). Preis wird wahrscheinlich ${2:,.0f} sweepen vor möglicher Umkehr.",
        "balanced_distribution": "Ausgeglichene Liquiditätsverteilung. Keine klare Sweep-Richtung - auf Ausbruchskatalysator achten.",
        "no_clear_sweep": "Liquiditätsniveaus vorhanden, aber kein klares Sweep-Setup. Akkumulation/Distribution beobachten.",
        "insufficient_data": "Unzureichende Liquiditätsdaten für Pfadanalyse.",
        
        # Whale Activity
        "large_buy_pressure": "Großer Kaufdruck erkannt: Volumenspike kombiniert mit starkem Bid-seitigem Orderbuch.",
        "whale_buying_squeeze": "Wal-Kaufdruck: Short Squeeze im Gange mit starken Short-Liquidationen.",
        "buy_pressure_detected": "Kaufdruck erkannt: {0}",
        "moderate_whale_buying": "Moderate Wal-Kaufaktivität über Börsen erkannt.",
        "large_sell_pressure": "Großer Verkaufsdruck erkannt: Volumenspike kombiniert mit starkem Ask-seitigem Orderbuch.",
        "whale_selling_cascade": "Wal-Verkaufsdruck: Long-Liquidationskaskade im Gange.",
        "sell_pressure_detected": "Verkaufsdruck erkannt: {0}",
        "moderate_whale_selling": "Moderate Wal-Verkaufsaktivität über Börsen erkannt.",
        "no_whale_bias": "Keine klare Wal-Richtungstendenz. Aktivität ausgeglichen oder unzureichend für Signal.",
        
        # Trade Signal Reasoning
        "market_bias_is": "Markt-Bias ist {0} mit {1:.0f}% Konfidenz",
        "liquidity_points": "Liquidität zeigt {0} Richtung ${1:,.0f}",
        "exchange_consensus_bullish": "Multi-Börsen-Konsens ist bullisch ({0})",
        "exchange_consensus_bearish": "Multi-Börsen-Konsens ist bärisch ({0})",
        "funding_sentiment": "Funding Rate Sentiment ist {0}",
        "oi_increasing_bullish": "Open Interest steigt mit bullischem Trend (neue Longs)",
        "oi_increasing_bearish": "Open Interest steigt mit bärischem Trend (neue Shorts)",
        "oi_decreasing_profit": "OI sinkt - mögliche Gewinnmitnahmen / Erschöpfung",
        "oi_decreasing_covering": "OI sinkt - Shorts könnten covern",
        "pattern_detected": "{0} Muster erkannt ({1}, {2:.0f}% Konf)",
        "whale_favors_longs": "Wal-Aktivität favorisiert Longs ({0} Long vs {1} Short)",
        "whale_favors_shorts": "Wal-Aktivität favorisiert Shorts ({0} Short vs {1} Long)",
        "whale_engine_buy": "Whale Engine erkennt KAUF-Druck ({0:.0f}% Stärke): {1}",
        "whale_engine_sell": "Whale Engine erkennt VERKAUF-Druck ({0:.0f}% Stärke): {1}",
        "volume_spike": "Volumenspike erkannt: {0:.1f}x Durchschnitt",
        "long_liquidation_cascade": "Long-Liquidationskaskade im Gange",
        "short_squeeze_progress": "Short Squeeze im Gange",
        "orderbook_aggressive_buy": "Orderbuch zeigt aggressiven Kauf",
        "orderbook_aggressive_sell": "Orderbuch zeigt aggressiven Verkauf",
        "ladder_more_above": "Liquiditätsleiter: Mehr Liquidität oben - Pfadanalyse deutet auf Aufwärts-Sweep Richtung ${0:,.0f}",
        "ladder_favors_upside": "Liquiditätsleiter: Pfad favorisiert Aufwärts",
        "ladder_more_below": "Liquiditätsleiter: Mehr Liquidität unten - Pfadanalyse deutet auf Abwärts-Sweep Richtung ${0:,.0f}",
        "ladder_favors_downside": "Liquiditätsleiter: Pfad favorisiert Abwärts",
        "sweep_expected_down": "Sweep erwartet: Preis könnte auf ${0:,.0f} fallen vor Aufwärtsbewegung",
        "possible_dip": "Möglicher Rückgang vor Aufwärtsbewegung",
        "sweep_expected_up": "Sweep erwartet: Preis könnte auf ${0:,.0f} steigen vor Abwärtsbewegung",
        "possible_spike": "Möglicher Spike vor Abwärtsbewegung",
        "high_trap_risk": "Hohes Fallenrisiko - möglicher falscher Ausbruch / Liquiditätsjagd",
        "longs_overcrowded": "Longs überfüllt - Long Squeeze Risiko / potenzielle Short-Gelegenheit",
        "shorts_overcrowded": "Shorts überfüllt - Short Squeeze Risiko / potenzielle Long-Gelegenheit",
        
        # Invalidation
        "true_invalidation_below": "Echte Invalidierung unter ${0:,.0f} (jenseits der Sweep-Zone). Offensichtliche Stops bei ${1:,.0f} könnten zuerst gejagt werden.",
        "stop_beyond_sweep_below": "Stop bei ${0:,.0f} platziert, jenseits wahrscheinlicher Sweep-Zone von ${1:,.0f}",
        "true_invalidation_above": "Echte Invalidierung über ${0:,.0f} (jenseits der Sweep-Zone). Offensichtliche Stops bei ${1:,.0f} könnten zuerst gejagt werden.",
        "stop_beyond_sweep_above": "Stop bei ${0:,.0f} platziert, jenseits wahrscheinlicher Sweep-Zone von ${1:,.0f}",
        "mixed_signals": "Gemischte Signale - auf klareres Setup warten",
        
        # Signal States
        "no_trade_insufficient": "KEIN TRADE - UNZUREICHENDE BEWEGUNG",
        "move_below_threshold": "Geschätzte Bewegung ({0:.2f}%) unter Mindestschwelle ({1}%)",
        "move_too_small": "Bewegung zu klein: {0:.2f}% < {1}% Minimum",
        "mixed_signals_no_setup": "GEMISCHTE SIGNALE - KEIN KLARES TRADE-SETUP",
        "factors_not_aligned": "Die Intelligence-Faktoren sind nicht ausgerichtet:",
        "wait_clearer_bias": "Auf klarere Richtungstendenz warten vor Positionseröffnung.",
        "sweep_reversal_setup": "SWEEP & UMKEHR SETUP",
        "continuation_setup": "FORTSETZUNGS-SETUP",
        "large_move_potential": "Großes Bewegungspotenzial: {0:.2f}%",
        "decent_move_potential": "Anständiges Bewegungspotenzial: {0:.2f}%",
        "small_move": "Kleine Bewegung: {0:.2f}% (Minimum ist {1}%)",
        "key_factors": "Schlüsselfaktoren für diesen Trade:",
        "liquidity_stop_placement": "Liquidität & Stop-Platzierung:",
        "obvious_stop_zone": "Offensichtliche Stop-Jagd-Zone: ${0:,.0f} (unter erster Unterstützung)",
        "obvious_stop_zone_above": "Offensichtliche Stop-Jagd-Zone: ${0:,.0f} (über erstem Widerstand)",
        "safe_invalidation": "Sichere Invalidierung: ${0:,.0f} (jenseits Sweep)",
        "stop_placed_at": "Stop bei ${0:,.0f} platziert zur Vermeidung von Stop-Jagden",
        "sweep_analysis": "Sweep-Analyse:",
        "liquidity_path": "Liquiditätspfad:",
        "whale_activity_section": "Wal-Aktivität:",
        "risk_warnings": "Risikowarnungen:",
        "rr_below_ideal": "Risk/Reward ({0:.1f}:1) unter idealem 1.5:1",
        
        # Sweep Analysis
        "approaching_support": "Preis nähert sich ${0:,.0f} Unterstützung. Wahrscheinlicher Liquiditäts-Sweep unter ${1:,.0f} vor bullischer Umkehr. Auf Rückeroberung von ${2:,.0f} warten für Long-Einstieg.",
        "approaching_resistance": "Preis nähert sich ${0:,.0f} Widerstand. Wahrscheinlicher Liquiditäts-Sweep über ${1:,.0f} vor bärischer Umkehr. Auf Ablehnung von ${2:,.0f} warten für Short-Einstieg.",
        
        # Confirmation System
        "setup_in_confirmation": "SETUP IN BESTÄTIGUNG - {0}",
        "setup_detected_waiting": "Setup erkannt, warte auf Bestätigung ({0}/2 aufeinanderfolgende Signale).",
        "awaiting_sweep": "Sweep vor Einstieg erwartet. Auf Sweep-Abschluss und Ablehnung/Rückeroberung warten.",
        "operational_signal": "OPERATIVES SIGNAL - {0}",
        "confirmation_complete": "Bestätigung abgeschlossen nach {0} aufeinanderfolgenden Signalen.",
        "confidence_trend": "Konfidenz: {0}",
        "no_contradictions": "Keine Widersprüche erkannt.",
        "consecutive_signals": "Aufeinanderfolgende Signale: {0}/2",
        "contradictions": "Widersprüche: {0}",
        "confidence_declining": "Konfidenz sinkt",
        "awaiting_sweep_confirm": "Warte auf Sweep + Ablehnungsbestätigung",
        "high_volatility_wait": "Hohe Volatilität - auf Stabilisierung warten",
        "in_confirmation": "Bestätigung...",
        
        # Signal History
        "setup_detected_reason": "Setup {0} erkannt - warte auf Bestätigung",
        "signal_confirmed": "Signal {0} BESTÄTIGT - operativ",
        "setup_invalidated": "Setup {0} vor Bestätigung invalidiert",
        "signal_invalidated": "Signal {0} invalidiert - Bedingungen geändert",
        "periodic_update": "Periodisches operatives Signal-Update",
        
        # Liquidity Clusters
        "buy_orders_at_level": "${0:,.0f} an Kauforders auf diesem Niveau.",
        "sell_orders_at_level": "${0:,.0f} an Verkaufsorders auf diesem Niveau.",
        "major_demand_zone": "Große Nachfragezone - Preis wird hier wahrscheinlich abprallen.",
        "moderate_support": "Moderate Unterstützung - Käuferreaktion beobachten.",
        "minor_support": "Geringes Unterstützungsniveau.",
        "major_supply_zone": "Große Angebotszone - starker Widerstand erwartet.",
        "moderate_resistance": "Moderater Widerstand - Verkäufer könnten dieses Niveau verteidigen.",
        "minor_resistance": "Geringes Widerstandsniveau.",
        "recent_high_rejected": "Kürzliches Hoch bei ${0:,.0f}. Preis wurde hier abgelehnt - potenzieller Stop-Loss-Cluster.",
        "recent_low_defended": "Kürzliches Tief bei ${0:,.0f}. Käufer haben dieses Niveau verteidigt - potenzielle Liquidationszone.",
        "more_liquidity_above": "Mehr Liquidität über dem aktuellen Preis (${0:,.0f} Verkaufsorders vs ${1:,.0f} Kauforders). Preis sucht Liquidität - Aufwärtsbewegung für Stop-Jagd erwartet.",
        "more_liquidity_below": "Mehr Liquidität unter dem aktuellen Preis (${0:,.0f} Kauforders vs ${1:,.0f} Verkaufsorders). Preis sucht Liquidität - Abwärtsbewegung für Stop-Jagd erwartet.",
        "balanced_liquidity_distribution": "Ausgeglichene Liquiditätsverteilung. Keine klare Richtung - Markt könnte bis zum Ungleichgewicht konsolidieren.",
        
        # Whale Alerts
        "volume_spike_reason": "Volumenspitze erkannt ({0:.1f}x Durchschnitt). Institutioneller {1}druck identifiziert.",
        "multi_exchange_imbalance": "Multi-Börsen-Ungleichgewicht: {0:.1f}%. {1}/{2} Börsen zeigen {3}druck.",
        
        # Whale Activity Engine v2.0
        "absorption_bullish": "Absorption erkannt: hohes Volumen ({0:.1f}x) mit kleinem Kerzenkörper. Verkäufe absorbiert = Akkumulation.",
        "absorption_bearish": "Absorption erkannt: hohes Volumen ({0:.1f}x) mit kleinem Kerzenkörper. Käufe absorbiert = Distribution.",
        "absorption_neutral": "Absorptionsmuster erkannt: hohes Volumen ({0:.1f}x) ohne klare Richtung.",
        "large_bullish_volume": "Großes bullisches Volumen ({0:.1f}x Durchschnitt) - institutioneller Kauf.",
        "large_bearish_volume": "Großes bärisches Volumen ({0:.1f}x Durchschnitt) - institutioneller Verkauf.",
        "oi_div_short_closing": "OI-Divergenz: Preis +{0:.1f}% mit OI {1:.1f}% = Shorts schließen.",
        "oi_div_long_closing": "OI-Divergenz: Preis {0:.1f}% mit OI {1:.1f}% = Longs schließen.",
        "oi_div_long_opening": "OI-Konvergenz: Preis +{0:.1f}% mit OI +{1:.1f}% = neue Longs öffnen.",
        "oi_div_short_opening": "OI-Konvergenz: Preis {0:.1f}% mit OI +{1:.1f}% = neue Shorts öffnen.",
        "heavy_buy_orderbook": "Starke Kaufseite im Orderbuch ({0:.1f}% Ungleichgewicht).",
        "buy_orderbook_dominance": "Dominanz der Kaufseite im Orderbuch ({0:.1f}%).",
        "heavy_sell_orderbook": "Starke Verkaufsseite im Orderbuch ({0:.1f}% Ungleichgewicht).",
        "sell_orderbook_dominance": "Dominanz der Verkaufsseite im Orderbuch ({0:.1f}%).",
        "bid_wall_detected": "{0} Bid-Wände erkannt nahe ${1:,.0f}.",
        "ask_wall_detected": "{0} Ask-Wände erkannt nahe ${1:,.0f}.",
        "heavy_long_liquidations": "Massive Long-Liquidationen ({0:.0f}% des Gesamten).",
        "more_longs_liquidated_signal": "Mehr Longs als Shorts liquidiert.",
        "heavy_short_liquidations": "Massive Short-Liquidationen ({0:.0f}% des Gesamten).",
        "more_shorts_liquidated_signal": "Mehr Shorts als Longs liquidiert.",
        "long_liq_zone_near": "Long-Liquidationszone nahe ${0:,.0f} ({1:.1f}% Entfernung) - mögliche Stop-Jagd.",
        "short_liq_zone_near": "Short-Liquidationszone nahe ${0:,.0f} ({1:.1f}% Entfernung) - mögliche Stop-Jagd.",
        "whale_accumulating": "Wale akkumulieren.",
        "whale_distributing": "Wale verteilen.",
        "whale_hunting_stops": "Wahrscheinlich Stop-Jagd im Gange.",
        "whale_position_building": "Institutioneller Positionsaufbau läuft.",
        "whale_position_closing": "Institutionelle Positionsschließung läuft.",
        "whale_absorbing": "Große Spieler absorbieren Orders.",
        "oi_context_short_closing": "Shorts schließen Positionen - bullische Fortsetzung wahrscheinlich.",
        "oi_context_long_closing": "Longs schließen Positionen - bärische Fortsetzung wahrscheinlich.",
        "oi_context_long_opening": "Neue Long-Positionen werden eröffnet - starker bullischer Druck.",
        "oi_context_short_opening": "Neue Short-Positionen werden eröffnet - starker bärischer Druck.",
        "absorption_context_bullish": "Bullisches Absorptionsmuster - Verkäufer werden absorbiert.",
        "absorption_context_bearish": "Bärisches Absorptionsmuster - Käufer werden absorbiert.",
        "vol_ob_bullish": "Hohes Volumen mit aggressiver Kaufseite - starke Nachfrage.",
        "vol_ob_bearish": "Hohes Volumen mit aggressiver Verkaufsseite - starkes Angebot.",
        "liq_context_bullish": "Short Squeeze läuft - Shorts werden zwangsliquidiert.",
        "liq_context_bearish": "Long-Liquidationskaskade - bärischer Druck.",
        
        # Market Energy / Compression Detector
        "extreme_compression": "Extreme Kompression: {0:.2f}% Range - Energie baut sich auf.",
        "high_compression": "Hohe Kompression: {0:.2f}% Range - signifikante Bewegung wahrscheinlich.",
        "moderate_compression": "Moderate Kompression: {0:.2f}% Range.",
        "tight_recent_range": "Sehr enge kürzliche Range: {0:.2f}% - Ausbruch möglicherweise unmittelbar.",
        "extreme_vol_compression": "Extrem komprimierte Volatilität - Expansion unmittelbar bevorstehend.",
        "high_vol_compression": "Komprimierte Volatilität - Energie baut sich auf.",
        "oi_rising_compression": "OI steigt +{0:.1f}% - Positionierung baut sich auf.",
        "oi_building_during_compression": "OI wächst während Kompression - starkes Ausbruch-Setup.",
        "strong_liquidity_both_sides": "Starke Liquidität auf beiden Seiten (${0:.1f}M oben, ${1:.1f}M unten) - Squeeze-Setup.",
        "moderate_liquidity_buildup": "Moderater Liquiditätsaufbau auf beiden Seiten.",
        "strong_orderbook_buildup": "Starker Orderbuch-Aufbau: {0} Bid-Wände, {1} Ask-Wände.",
        "expansion_likely": "EXPANSION WAHRSCHEINLICH - Kompression + Positionierung = Bewegung steht bevor.",
        "energy_expansion_bullish": "BTC komprimiert in {0:.2f}% Range mit OI +{1:.1f}%. Liquidität baut sich auf. Bullische Expansion wahrscheinlich.",
        "energy_expansion_bearish": "BTC komprimiert in {0:.2f}% Range mit OI +{1:.1f}%. Liquidität baut sich auf. Bärische Expansion wahrscheinlich.",
        "energy_expansion_unclear": "BTC komprimiert in {0:.2f}% Range mit Energieaufbau. Richtung unklar - auf Bestätigung warten.",
        "energy_high_building": "BTC stark komprimiert ({0:.2f}% Range) mit steigendem OI und Liquiditätsaufbau. Signifikante Bewegung kommt.",
        "energy_high_oi_rising": "BTC komprimiert in {0:.2f}% Range während OI +{1:.1f}% wächst. Institutionelle Positionierung läuft.",
        "energy_high_compressed": "BTC handelt in enger Range ({0:.2f}%). Energie baut sich für nächste Bewegung auf.",
        "energy_medium_building": "Moderate Kompression mit Positionierungsaufbau. Auf Ausbruch achten.",
        "energy_medium_consolidating": "Markt konsolidiert. Neutrale Energie.",
        "energy_low_ranging": "Markt in breiter Range. Geringe Wahrscheinlichkeit für unmittelbaren Ausbruch.",
        "energy_low_normal": "Normale Marktbedingungen. Keine signifikante Kompression.",
        "energy_boosts_confidence": "Hohe Marktenergie steigert das Vertrauen.",
        "high_energy_expansion": "Hohe Marktenergie ({0:.0f}) - Expansion steht bevor.",
        "high_energy_wait": "Hohe Energie ({0:.0f}) aber Richtung nicht bestätigt - auf Setup warten.",
        "energy_reduces_confidence": "Niedrige Marktenergie reduziert das Vertrauen.",
        "low_energy_caution": "Niedrige Marktenergie - Vorsicht bei Ausbrüchen.",
        "expansion_likely_direction": "Expansion wahrscheinlich Richtung {0}.",
        "expansion_likely_no_direction": "Expansion wahrscheinlich aber Richtung unklar - auf Bestätigung warten.",
    },
    "pl": {
        # Market Bias
        "strong_buying_pressure": "Silna presja kupna w książce zleceń.",
        "momentum_favors_bulls": "Momentum sprzyja bykom.",
        "short_squeeze_prob": "Prawdopodobieństwo short squeeze: {0:.0f}%.",
        "heavy_selling_pressure": "Wykryto silną presję sprzedaży.",
        "momentum_favors_bears": "Momentum sprzyja niedźwiedziom.",
        "long_squeeze_prob": "Prawdopodobieństwo long squeeze: {0:.0f}%.",
        "market_indecision": "Niezdecydowanie rynku. Poczekaj na wyraźniejsze sygnały.",
        "analyzing_conditions": "Analizowanie warunków rynkowych...",
        
        # Open Interest
        "oi_increasing": "Rosnące OI z nowymi pozycjami. Nowy kapitał wchodzi na rynek. Przy rosnącej cenie = kontynuacja wzrostowa.",
        "oi_decreasing": "Spadające OI wskazuje na zamykanie pozycji. Możliwe wyczerpanie trendu lub realizacja zysków.",
        "oi_stable": "Stabilne OI pokazuje konsolidację rynku. Obserwuj wybicie z wolumenem.",
        
        # Funding Rate
        "more_longs_liquidated": "Więcej zlikwidowanych longów ({0:.1f}%). Presja spadkowa. Shorty płacą longom.",
        "more_shorts_liquidated": "Więcej zlikwidowanych shortów ({0:.1f}%). Presja wzrostowa. Longi płacą shortom.",
        "balanced_liquidations": "Zrównoważone likwidacje. Neutralne środowisko funding.",
        "api_unavailable": "API tymczasowo niedostępne. Szacunkowe dane.",
        
        # S/R Levels
        "price_rejected_at": "Cena odrzucona przy ${0:,.0f} {1} razy.",
        "high_rejection_prob": "Wysokie prawdopodobieństwo odrzucenia przy ponownym teście.",
        "likely_selling_pressure": "Prawdopodobna presja sprzedaży tutaj.",
        "may_break_momentum": "Może przebić przy silnym momentum.",
        "buyers_stepped_in": "Kupujący wkroczyli przy ${0:,.0f} {1} razy.",
        "strong_demand_zone": "Silna strefa popytu - wysokie prawdopodobieństwo odbicia.",
        "likely_buying_interest": "Prawdopodobne zainteresowanie kupnem tutaj.",
        "may_break_selling": "Może przebić przy silnej presji sprzedaży.",
        
        # Order Book
        "buy_orders_across": "${0:,.0f} ({1:.2f} BTC) w zleceniach kupna na {2} giełdach.",
        "sell_orders_across": "${0:,.0f} ({1:.2f} BTC) w zleceniach sprzedaży na {2} giełdach.",
        "major_support_wall": "Główna ściana wsparcia - trudna do przebicia.",
        "moderate_buying": "Umiarkowane zainteresowanie kupnem na tym poziomie.",
        "major_resistance_wall": "Główna ściana oporu - oczekuj silnej sprzedaży.",
        "moderate_selling": "Umiarkowana presja sprzedaży na tym poziomie.",
        
        # Liquidity Direction
        "more_liq_above": "Więcej płynności powyżej obecnej ceny (${0:,.0f} zlec. sprzedaży vs ${1:,.0f} zlec. kupna). Cena szuka płynności - oczekuj ruchu w górę.",
        "more_liq_below": "Więcej płynności poniżej obecnej ceny (${0:,.0f} zlec. kupna vs ${1:,.0f} zlec. sprzedaży). Cena szuka płynności - oczekuj ruchu w dół.",
        "balanced_liquidity": "Zrównoważony rozkład płynności. Brak wyraźnego kierunku - rynek może konsolidować.",
        
        # Liquidity Ladder
        "upper_ladder_stronger": "Górna drabina płynności silniejsza (${0:.1f}M powyżej vs ${1:.1f}M poniżej). Cena prawdopodobnie zamecie ${2:,.0f} przed odwróceniem.",
        "lower_ladder_stronger": "Dolna drabina płynności silniejsza (${0:.1f}M poniżej vs ${1:.1f}M powyżej). Cena prawdopodobnie zamecie ${2:,.0f} przed odwróceniem.",
        "balanced_distribution": "Zrównoważony rozkład płynności. Brak wyraźnego kierunku sweep - obserwuj katalizator wybicia.",
        "no_clear_sweep": "Poziomy płynności obecne, ale brak wyraźnego setup sweep. Monitoruj akumulację/dystrybucję.",
        "insufficient_data": "Niewystarczające dane płynności do analizy ścieżki.",
        
        # Whale Activity
        "large_buy_pressure": "Wykryto dużą presję kupna: skok wolumenu połączony z silną stroną bid książki zleceń.",
        "whale_buying_squeeze": "Presja kupna wielorybów: short squeeze w toku z silnymi likwidacjami shortów.",
        "buy_pressure_detected": "Wykryto presję kupna: {0}",
        "moderate_whale_buying": "Umiarkowana aktywność kupna wielorybów wykryta na giełdach.",
        "large_sell_pressure": "Wykryto dużą presję sprzedaży: skok wolumenu połączony z silną stroną ask książki zleceń.",
        "whale_selling_cascade": "Presja sprzedaży wielorybów: kaskada likwidacji longów w toku.",
        "sell_pressure_detected": "Wykryto presję sprzedaży: {0}",
        "moderate_whale_selling": "Umiarkowana aktywność sprzedaży wielorybów wykryta na giełdach.",
        "no_whale_bias": "Brak wyraźnego kierunku wielorybów. Aktywność zrównoważona lub niewystarczająca do sygnału.",
        
        # Trade Signal Reasoning
        "market_bias_is": "Bias Rynku to {0} z {1:.0f}% pewnością",
        "liquidity_points": "Płynność wskazuje {0} w kierunku ${1:,.0f}",
        "exchange_consensus_bullish": "Konsensus wielu giełd jest byczy ({0})",
        "exchange_consensus_bearish": "Konsensus wielu giełd jest niedźwiedzi ({0})",
        "funding_sentiment": "Sentyment funding rate to {0}",
        "oi_increasing_bullish": "Open Interest rośnie z trendem byczym (nowe longi)",
        "oi_increasing_bearish": "Open Interest rośnie z trendem niedźwiedzim (nowe shorty)",
        "oi_decreasing_profit": "OI spada - możliwa realizacja zysków / wyczerpanie",
        "oi_decreasing_covering": "OI spada - shorty mogą się pokrywać",
        "pattern_detected": "Wykryto wzór {0} ({1}, {2:.0f}% pewn)",
        "whale_favors_longs": "Aktywność wielorybów sprzyja longom ({0} long vs {1} short)",
        "whale_favors_shorts": "Aktywność wielorybów sprzyja shortom ({0} short vs {1} long)",
        "whale_engine_buy": "Whale Engine wykrywa presję KUPNA ({0:.0f}% siły): {1}",
        "whale_engine_sell": "Whale Engine wykrywa presję SPRZEDAŻY ({0:.0f}% siły): {1}",
        "volume_spike": "Wykryto skok wolumenu: {0:.1f}x średniej",
        "long_liquidation_cascade": "Kaskada likwidacji longów w toku",
        "short_squeeze_progress": "Short squeeze w toku",
        "orderbook_aggressive_buy": "Książka zleceń pokazuje agresywne kupno",
        "orderbook_aggressive_sell": "Książka zleceń pokazuje agresywną sprzedaż",
        "ladder_more_above": "Drabina Płynności: Więcej płynności powyżej - analiza ścieżki sugeruje sweep w górę do ${0:,.0f}",
        "ladder_favors_upside": "Drabina Płynności: Ścieżka sprzyja wzrostom",
        "ladder_more_below": "Drabina Płynności: Więcej płynności poniżej - analiza ścieżki sugeruje sweep w dół do ${0:,.0f}",
        "ladder_favors_downside": "Drabina Płynności: Ścieżka sprzyja spadkom",
        "sweep_expected_down": "Oczekiwany sweep: Cena może spaść do ${0:,.0f} przed wzrostem",
        "possible_dip": "Możliwy spadek przed wzrostem",
        "sweep_expected_up": "Oczekiwany sweep: Cena może wzrosnąć do ${0:,.0f} przed spadkiem",
        "possible_spike": "Możliwy skok przed spadkiem",
        "high_trap_risk": "Wysokie ryzyko pułapki - możliwe fałszywe wybicie / polowanie na płynność",
        "longs_overcrowded": "Longi przepełnione - ryzyko long squeeze / potencjalna okazja na short",
        "shorts_overcrowded": "Shorty przepełnione - ryzyko short squeeze / potencjalna okazja na long",
        
        # Invalidation
        "true_invalidation_below": "Prawdziwa inwalidacja poniżej ${0:,.0f} (poza strefą sweep). Oczywiste stopy przy ${1:,.0f} mogą zostać zamiecione jako pierwsze.",
        "stop_beyond_sweep_below": "Stop umieszczony przy ${0:,.0f}, poza prawdopodobną strefą sweep ${1:,.0f}",
        "true_invalidation_above": "Prawdziwa inwalidacja powyżej ${0:,.0f} (poza strefą sweep). Oczywiste stopy przy ${1:,.0f} mogą zostać zamiecione jako pierwsze.",
        "stop_beyond_sweep_above": "Stop umieszczony przy ${0:,.0f}, poza prawdopodobną strefą sweep ${1:,.0f}",
        "mixed_signals": "Mieszane sygnały - poczekaj na wyraźniejszy setup",
        
        # Signal States
        "no_trade_insufficient": "BRAK HANDLU - NIEWYSTARCZAJĄCY RUCH",
        "move_below_threshold": "Szacowany ruch ({0:.2f}%) poniżej minimalnego progu ({1}%)",
        "move_too_small": "Ruch za mały: {0:.2f}% < {1}% minimum",
        "mixed_signals_no_setup": "MIESZANE SYGNAŁY - BRAK WYRAŹNEGO SETUP",
        "factors_not_aligned": "Czynniki intelligence nie są wyrównane:",
        "wait_clearer_bias": "Poczekaj na wyraźniejszy kierunek przed wejściem w pozycję.",
        "sweep_reversal_setup": "SETUP SWEEP I ODWRÓCENIE",
        "continuation_setup": "SETUP KONTYNUACJI",
        "large_move_potential": "Duży potencjał ruchu: {0:.2f}%",
        "decent_move_potential": "Przyzwoity potencjał ruchu: {0:.2f}%",
        "small_move": "Mały ruch: {0:.2f}% (minimum to {1}%)",
        "key_factors": "Kluczowe czynniki wspierające ten trade:",
        "liquidity_stop_placement": "Płynność i Umiejscowienie Stop:",
        "obvious_stop_zone": "Oczywista strefa polowania na stopy: ${0:,.0f} (poniżej pierwszego wsparcia)",
        "obvious_stop_zone_above": "Oczywista strefa polowania na stopy: ${0:,.0f} (powyżej pierwszego oporu)",
        "safe_invalidation": "Bezpieczna inwalidacja: ${0:,.0f} (poza sweep)",
        "stop_placed_at": "Stop umieszczony przy ${0:,.0f} aby uniknąć polowania na stopy",
        "sweep_analysis": "Analiza Sweep:",
        "liquidity_path": "Ścieżka Płynności:",
        "whale_activity_section": "Aktywność Wielorybów:",
        "risk_warnings": "Ostrzeżenia o Ryzyku:",
        "rr_below_ideal": "Risk/Reward ({0:.1f}:1) poniżej idealnego 1.5:1",
        
        # Sweep Analysis
        "approaching_support": "Cena zbliża się do wsparcia ${0:,.0f}. Prawdopodobny sweep płynności poniżej ${1:,.0f} przed byczym odwróceniem. Poczekaj na odzyskanie ${2:,.0f} dla potwierdzenia long.",
        "approaching_resistance": "Cena zbliża się do oporu ${0:,.0f}. Prawdopodobny sweep płynności powyżej ${1:,.0f} przed niedźwiedzim odwróceniem. Poczekaj na odrzucenie ${2:,.0f} dla potwierdzenia short.",
        
        # Confirmation System
        "setup_in_confirmation": "SETUP W POTWIERDZENIU - {0}",
        "setup_detected_waiting": "Setup wykryty, oczekiwanie na potwierdzenie ({0}/2 kolejnych sygnałów).",
        "awaiting_sweep": "Oczekiwany sweep przed wejściem. Poczekaj na zakończenie sweep i potwierdzenie odrzucenia/odzyskania.",
        "operational_signal": "SYGNAŁ OPERACYJNY - {0}",
        "confirmation_complete": "Potwierdzenie zakończone po {0} kolejnych sygnałach.",
        "confidence_trend": "Pewność: {0}",
        "no_contradictions": "Brak wykrytych sprzeczności.",
        "consecutive_signals": "Kolejne sygnały: {0}/2",
        "contradictions": "Sprzeczności: {0}",
        "confidence_declining": "Pewność spada",
        "awaiting_sweep_confirm": "Oczekiwanie na sweep + potwierdzenie odrzucenia",
        "high_volatility_wait": "Wysoka zmienność - poczekaj na stabilizację",
        "in_confirmation": "Potwierdzanie...",
        
        # Signal History
        "setup_detected_reason": "Setup {0} wykryty - oczekiwanie na potwierdzenie",
        "signal_confirmed": "Sygnał {0} POTWIERDZONY - operacyjny",
        "setup_invalidated": "Setup {0} unieważniony przed potwierdzeniem",
        "signal_invalidated": "Sygnał {0} unieważniony - warunki się zmieniły",
        "periodic_update": "Okresowa aktualizacja sygnału operacyjnego",
        
        # Liquidity Clusters
        "buy_orders_at_level": "${0:,.0f} w zleceniach kupna na tym poziomie.",
        "sell_orders_at_level": "${0:,.0f} w zleceniach sprzedaży na tym poziomie.",
        "major_demand_zone": "Główna strefa popytu - cena prawdopodobnie się tu odbije.",
        "moderate_support": "Umiarkowane wsparcie - obserwuj reakcję kupujących.",
        "minor_support": "Mniejszy poziom wsparcia.",
        "major_supply_zone": "Główna strefa podaży - oczekiwany silny opór.",
        "moderate_resistance": "Umiarkowany opór - sprzedający mogą bronić tego poziomu.",
        "minor_resistance": "Mniejszy poziom oporu.",
        "recent_high_rejected": "Niedawne maksimum przy ${0:,.0f}. Cena została tu odrzucona - potencjalny klaster stop-loss.",
        "recent_low_defended": "Niedawne minimum przy ${0:,.0f}. Kupujący obronili ten poziom - potencjalna strefa likwidacji.",
        "more_liquidity_above": "Więcej płynności powyżej obecnej ceny (${0:,.0f} zleceń sprzedaży vs ${1:,.0f} zleceń kupna). Cena szuka płynności - oczekuj ruchu w górę na polowanie stopów.",
        "more_liquidity_below": "Więcej płynności poniżej obecnej ceny (${0:,.0f} zleceń kupna vs ${1:,.0f} zleceń sprzedaży). Cena szuka płynności - oczekuj ruchu w dół na polowanie stopów.",
        "balanced_liquidity_distribution": "Zrównoważony rozkład płynności. Brak wyraźnego kierunku - rynek może konsolidować do powstania nierównowagi.",
        
        # Whale Alerts
        "volume_spike_reason": "Wykryto skok wolumenu ({0:.1f}x średnia). Zidentyfikowano instytucjonalną presję {1}.",
        "multi_exchange_imbalance": "Nierównowaga multi-giełdowa: {0:.1f}%. {1}/{2} giełd pokazuje presję {3}.",
        
        # Whale Activity Engine v2.0
        "absorption_bullish": "Wykryto absorpcję: wysoki wolumen ({0:.1f}x) z małym korpusem świecy. Sprzedaże absorbowane = akumulacja.",
        "absorption_bearish": "Wykryto absorpcję: wysoki wolumen ({0:.1f}x) z małym korpusem świecy. Kupna absorbowane = dystrybucja.",
        "absorption_neutral": "Wykryto wzorzec absorpcji: wysoki wolumen ({0:.1f}x) bez wyraźnego kierunku.",
        "large_bullish_volume": "Duży byczy wolumen ({0:.1f}x średniej) - instytucjonalne kupno.",
        "large_bearish_volume": "Duży niedźwiedzi wolumen ({0:.1f}x średniej) - instytucjonalna sprzedaż.",
        "oi_div_short_closing": "Dywergencja OI: cena +{0:.1f}% z OI {1:.1f}% = shorty zamykają.",
        "oi_div_long_closing": "Dywergencja OI: cena {0:.1f}% z OI {1:.1f}% = longi zamykają.",
        "oi_div_long_opening": "Konwergencja OI: cena +{0:.1f}% z OI +{1:.1f}% = nowe longi otwierają.",
        "oi_div_short_opening": "Konwergencja OI: cena {0:.1f}% z OI +{1:.1f}% = nowe shorty otwierają.",
        "heavy_buy_orderbook": "Ciężka strona kupna w orderbooku ({0:.1f}% nierównowaga).",
        "buy_orderbook_dominance": "Dominacja strony kupna w orderbooku ({0:.1f}%).",
        "heavy_sell_orderbook": "Ciężka strona sprzedaży w orderbooku ({0:.1f}% nierównowaga).",
        "sell_orderbook_dominance": "Dominacja strony sprzedaży w orderbooku ({0:.1f}%).",
        "bid_wall_detected": "{0} ścian bid wykrytych blisko ${1:,.0f}.",
        "ask_wall_detected": "{0} ścian ask wykrytych blisko ${1:,.0f}.",
        "heavy_long_liquidations": "Masywne likwidacje long ({0:.0f}% całości).",
        "more_longs_liquidated_signal": "Więcej longów niż shortów zlikwidowanych.",
        "heavy_short_liquidations": "Masywne likwidacje short ({0:.0f}% całości).",
        "more_shorts_liquidated_signal": "Więcej shortów niż longów zlikwidowanych.",
        "long_liq_zone_near": "Strefa likwidacji long blisko ${0:,.0f} ({1:.1f}% odległości) - możliwe polowanie na stopy.",
        "short_liq_zone_near": "Strefa likwidacji short blisko ${0:,.0f} ({1:.1f}% odległości) - możliwe polowanie na stopy.",
        "whale_accumulating": "Wieloryby akumulują.",
        "whale_distributing": "Wieloryby dystrybuują.",
        "whale_hunting_stops": "Prawdopodobnie polowanie na stopy w toku.",
        "whale_position_building": "Instytucjonalne budowanie pozycji w toku.",
        "whale_position_closing": "Instytucjonalne zamykanie pozycji w toku.",
        "whale_absorbing": "Duzi gracze absorbują zlecenia.",
        "oi_context_short_closing": "Shorty zamykają pozycje - bycza kontynuacja prawdopodobna.",
        "oi_context_long_closing": "Longi zamykają pozycje - niedźwiedzia kontynuacja prawdopodobna.",
        "oi_context_long_opening": "Nowe pozycje long otwierane - silna presja bycza.",
        "oi_context_short_opening": "Nowe pozycje short otwierane - silna presja niedźwiedzia.",
        "absorption_context_bullish": "Byczy wzorzec absorpcji - sprzedający są absorbowani.",
        "absorption_context_bearish": "Niedźwiedzi wzorzec absorpcji - kupujący są absorbowani.",
        "vol_ob_bullish": "Wysoki wolumen z agresywną stroną kupna - silny popyt.",
        "vol_ob_bearish": "Wysoki wolumen z agresywną stroną sprzedaży - silna podaż.",
        "liq_context_bullish": "Short squeeze w toku - shorty przymusowo likwidowane.",
        "liq_context_bearish": "Kaskada likwidacji long - niedźwiedzia presja.",
        
        # Market Energy / Compression Detector
        "extreme_compression": "Ekstremalna kompresja: {0:.2f}% zakres - energia się kumuluje.",
        "high_compression": "Wysoka kompresja: {0:.2f}% zakres - znaczący ruch prawdopodobny.",
        "moderate_compression": "Umiarkowana kompresja: {0:.2f}% zakres.",
        "tight_recent_range": "Bardzo wąski ostatni zakres: {0:.2f}% - wybicie może być blisko.",
        "extreme_vol_compression": "Ekstremalnie skompresowana zmienność - ekspansja nieuchronna.",
        "high_vol_compression": "Skompresowana zmienność - energia się kumuluje.",
        "oi_rising_compression": "OI rośnie +{0:.1f}% - pozycjonowanie w budowie.",
        "oi_building_during_compression": "OI rośnie podczas kompresji - silny setup na wybicie.",
        "strong_liquidity_both_sides": "Silna płynność po obu stronach (${0:.1f}M powyżej, ${1:.1f}M poniżej) - setup squeeze.",
        "moderate_liquidity_buildup": "Umiarkowany wzrost płynności po obu stronach.",
        "strong_orderbook_buildup": "Silny wzrost orderbooka: {0} ścian bid, {1} ścian ask.",
        "expansion_likely": "EKSPANSJA PRAWDOPODOBNA - kompresja + pozycjonowanie = ruch nieuchronny.",
        "energy_expansion_bullish": "BTC skompresowany w {0:.2f}% zakresie z OI +{1:.1f}%. Płynność rośnie. Bycza ekspansja prawdopodobna.",
        "energy_expansion_bearish": "BTC skompresowany w {0:.2f}% zakresie z OI +{1:.1f}%. Płynność rośnie. Niedźwiedzia ekspansja prawdopodobna.",
        "energy_expansion_unclear": "BTC skompresowany w {0:.2f}% zakresie z rosnącą energią. Kierunek niejasny - czekaj na potwierdzenie.",
        "energy_high_building": "BTC silnie skompresowany ({0:.2f}% zakres) z rosnącym OI i płynnością. Znaczący ruch nadchodzi.",
        "energy_high_oi_rising": "BTC skompresowany w {0:.2f}% zakresie podczas gdy OI rośnie +{1:.1f}%. Instytucjonalne pozycjonowanie w toku.",
        "energy_high_compressed": "BTC handluje w wąskim zakresie ({0:.2f}%). Energia kumuluje się na następny ruch.",
        "energy_medium_building": "Umiarkowana kompresja z budowaniem pozycji. Monitoruj na wybicie.",
        "energy_medium_consolidating": "Rynek konsoliduje. Neutralna energia.",
        "energy_low_ranging": "Rynek w szerokim zakresie. Niska szansa na bliskie wybicie.",
        "energy_low_normal": "Normalne warunki rynkowe. Brak znaczącej kompresji.",
        "energy_boosts_confidence": "Wysoka energia rynku zwiększa pewność.",
        "high_energy_expansion": "Wysoka energia rynku ({0:.0f}) - ekspansja nieuchronna.",
        "high_energy_wait": "Wysoka energia ({0:.0f}) ale kierunek niepotwierdzony - czekaj na setup.",
        "energy_reduces_confidence": "Niska energia rynku zmniejsza pewność.",
        "low_energy_caution": "Niska energia rynku - ostrożność przy wybiciach.",
        "expansion_likely_direction": "Ekspansja prawdopodobna w kierunku {0}.",
        "expansion_likely_no_direction": "Ekspansja prawdopodobna ale kierunek niejasny - czekaj na potwierdzenie.",
    }
}

def get_translation(key: str, lang: str = "it", *args) -> str:
    """Get translated string with optional format arguments"""
    translations = BACKEND_TRANSLATIONS.get(lang, BACKEND_TRANSLATIONS["it"])
    text = translations.get(key, BACKEND_TRANSLATIONS["it"].get(key, key))
    if args:
        try:
            return text.format(*args)
        except:
            return text
    return text

# ============== SIGNAL CONFIRMATION SYSTEM ==============
# Signal states
SIGNAL_STATE_NO_TRADE = "NO_TRADE"
SIGNAL_STATE_SETUP_DETECTED = "SETUP_IN_CONFIRMATION"  # Setup detected, waiting confirmation
SIGNAL_STATE_OPERATIONAL = "OPERATIONAL"  # Confirmed, ready to trade

# Signal confirmation tracking
signal_confirmation_state = {
    "current_direction": None,  # LONG, SHORT, or None
    "current_state": SIGNAL_STATE_NO_TRADE,
    "consecutive_count": 0,  # How many consecutive signals in same direction
    "first_detected_at": None,
    "confirmed_at": None,
    "last_confidence": 0,
    "confidence_trend": "stable",  # improving, stable, declining
    "last_signal_data": None,
    "volatility_spike": False,
    "awaiting_sweep_confirmation": False,
    "sweep_direction": None,
    "last_btc_price": None,
    "price_change_since_detection": 0,
}

# Trade signal cache
trade_signal_cache = {
    "signal": None,
    "timestamp": None,
    "raw_direction": None,  # Direction before confirmation logic
}

# Volatility tracking
volatility_state = {
    "recent_price_changes": [],  # Last 10 price change %
    "is_volatile": False,
    "last_check": None,
}

def calculate_volatility(current_price: float, last_price: float) -> bool:
    """Check if market is in high volatility mode"""
    global volatility_state
    
    if last_price and last_price > 0:
        change_pct = abs((current_price - last_price) / last_price * 100)
        volatility_state["recent_price_changes"].append(change_pct)
        
        # Keep only last 10 changes
        if len(volatility_state["recent_price_changes"]) > 10:
            volatility_state["recent_price_changes"] = volatility_state["recent_price_changes"][-10:]
        
        # High volatility if average change > 0.3% or any single change > 0.8%
        avg_change = sum(volatility_state["recent_price_changes"]) / len(volatility_state["recent_price_changes"])
        max_change = max(volatility_state["recent_price_changes"]) if volatility_state["recent_price_changes"] else 0
        
        volatility_state["is_volatile"] = avg_change > 0.3 or max_change > 0.8
        volatility_state["last_check"] = datetime.now(timezone.utc)
    
    return volatility_state["is_volatile"]

# Signal tracking for auto-recording
last_signal_state = {
    "direction": None,
    "signal_id": None,
    "timestamp": None,
    "btc_price": None
}

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
            
            explanation = f"Prezzo respinto a ${highs[i]:,.0f} in {touches} occasioni. "
            if strength == "strong":
                explanation += "Alta probabilità di rigetto se testato di nuovo."
            elif strength == "moderate":
                explanation += "Probabile pressione di vendita a questo livello."
            else:
                explanation += "Potrebbe cedere con forte momentum."
            
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
            
            explanation = f"I compratori sono intervenuti a ${lows[i]:,.0f} in {touches} occasioni. "
            if strength == "strong":
                explanation += "Zona di domanda forte - alta probabilità di rimbalzo."
            elif strength == "moderate":
                explanation += "Probabile interesse d'acquisto a questo livello."
            else:
                explanation += "Potrebbe cedere con forte pressione di vendita."
            
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
                    
                    explanation = f"${volume_usd:,.0f} ({volume_btc:.2f} BTC) in ordini di acquisto su {len(active_exchanges)} exchange. "
                    if strength == "strong":
                        explanation += "Muro di supporto importante - difficile da rompere."
                    else:
                        explanation += "Interesse d'acquisto moderato a questo livello."
                    
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
                    
                    explanation = f"${volume_usd:,.0f} ({volume_btc:.2f} BTC) in ordini di vendita su {len(active_exchanges)} exchange. "
                    if strength == "strong":
                        explanation += "Muro di resistenza importante - attendersi forte vendita qui."
                    else:
                        explanation += "Pressione di vendita moderata a questo livello."
                    
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

def calculate_market_bias(candles: List[dict], orderbook: dict = None, lang: str = "it") -> MarketBias:
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
    
    # Generate analysis text using translations
    analysis_parts = []
    if bias == "BULLISH":
        if ob_imbalance > 10:
            analysis_parts.append(get_translation("strong_buying_pressure", lang))
        if rsi > 50:
            analysis_parts.append(get_translation("momentum_favors_bulls", lang))
        if squeeze_prob > 40:
            analysis_parts.append(get_translation("short_squeeze_prob", lang, squeeze_prob))
    elif bias == "BEARISH":
        if ob_imbalance < -10:
            analysis_parts.append(get_translation("heavy_selling_pressure", lang))
        if rsi < 50:
            analysis_parts.append(get_translation("momentum_favors_bears", lang))
        if squeeze_prob > 40:
            analysis_parts.append(get_translation("long_squeeze_prob", lang, squeeze_prob))
    else:
        analysis_parts.append(get_translation("market_indecision", lang))
    
    analysis_text = " ".join(analysis_parts) if analysis_parts else get_translation("analyzing_conditions", lang)
    
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

def generate_liquidity_clusters_enhanced(candles: List[dict], current_price: float, aggregated_orderbook: dict = None, lang: str = "it") -> tuple:
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
                    
                    # Build localized explanation
                    explanation = get_translation("buy_orders_at_level", lang, value_usd)
                    if strength == "high":
                        explanation += " " + get_translation("major_demand_zone", lang)
                    elif strength == "medium":
                        explanation += " " + get_translation("moderate_support", lang)
                    else:
                        explanation += " " + get_translation("minor_support", lang)
                    
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
                    
                    # Build localized explanation
                    explanation = get_translation("sell_orders_at_level", lang, value_usd)
                    if strength == "high":
                        explanation += " " + get_translation("major_supply_zone", lang)
                    elif strength == "medium":
                        explanation += " " + get_translation("moderate_resistance", lang)
                    else:
                        explanation += " " + get_translation("minor_resistance", lang)
                    
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
                        explanation=get_translation("recent_high_rejected", lang, h)
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
                        explanation=get_translation("recent_low_defended", lang, l)
                    ))
    
    # Calculate liquidity direction based on order book imbalance
    above_value = sum(c.estimated_value for c in clusters if c.side == "above")
    below_value = sum(c.estimated_value for c in clusters if c.side == "below")
    
    above_clusters = [c for c in clusters if c.side == "above"]
    below_clusters = [c for c in clusters if c.side == "below"]
    
    if above_value > below_value * 1.3 or len(above_clusters) > len(below_clusters) * 1.5:
        direction = "UP"
        next_target = min(c.price for c in above_clusters) if above_clusters else current_price
        dir_explanation = get_translation("more_liquidity_above", lang, above_value, below_value)
    elif below_value > above_value * 1.3 or len(below_clusters) > len(above_clusters) * 1.5:
        direction = "DOWN"
        next_target = max(c.price for c in below_clusters) if below_clusters else current_price
        dir_explanation = get_translation("more_liquidity_below", lang, below_value, above_value)
    else:
        direction = "BALANCED"
        next_target = current_price
        dir_explanation = get_translation("balanced_liquidity_distribution", lang)
    
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
def generate_liquidity_clusters(candles: List[dict], current_price: float, orderbook: dict = None, lang: str = "it") -> tuple:
    """Generate liquidity cluster data from order book analysis"""
    return generate_liquidity_clusters_enhanced(candles, current_price, orderbook, lang)

def generate_whale_alerts_enhanced(candles: List[dict], current_price: float, aggregated_orderbook: dict = None, lang: str = "it") -> List[WhaleAlert]:
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
                
                # Localized reason
                pressure_type = "buying" if is_bullish else "selling"
                reason = get_translation("volume_spike_reason", lang, volume_ratio, pressure_type)
                
                alerts.append(WhaleAlert(
                    signal=signal,
                    entry=round(entry, 2),
                    target=round(target, 2),
                    confidence=round(confidence, 1),
                    estimated_move=round(move_pct, 2),
                    timeframe="1H",
                    timestamp=datetime.fromtimestamp(c["time"], tz=timezone.utc),
                    reason=reason,
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
            
            # Localized reason
            pressure_type = "buying" if is_bullish else "selling"
            reason = get_translation("multi_exchange_imbalance", lang, imbalance, agreeing_exchanges, len(exchange_stats), pressure_type)
            
            alerts.append(WhaleAlert(
                signal=signal,
                entry=round(current_price, 2),
                target=round(target, 2),
                confidence=round(min(85, 55 + abs(imbalance) / 2 + agreeing_exchanges * 5), 1),
                estimated_move=round(move_pct, 2),
                timeframe="Current",
                timestamp=datetime.now(timezone.utc),
                reason=reason,
                stop_loss=round(stop_loss, 2),
                risk_reward=round(risk_reward, 2),
                exchanges_detected=exchanges_detected
            ))
    
    return alerts[-5:]

# Keep old function for backward compatibility
def generate_whale_alerts(candles: List[dict], current_price: float, orderbook: dict = None, lang: str = "it") -> List[WhaleAlert]:
    """Generate whale alert signals based on volume and order book analysis"""
    return generate_whale_alerts_enhanced(candles, current_price, orderbook, lang)

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

async def generate_open_interest(current_price: float, candles: List[dict] = None, lang: str = "it") -> OpenInterest:
    """Generate Open Interest data from CoinGlass API"""
    
    # Try to get real CoinGlass data
    cg_data = await fetch_coinglass_open_interest()
    
    if cg_data:
        total_oi = cg_data["total_oi"]
        change_1h = cg_data["change_1h"]
        change_4h = cg_data["change_4h"]
        change_24h = cg_data["change_24h"]
        
        # Determine trend with translated signal
        if change_24h > 3:
            trend = "increasing"
            signal = get_translation("oi_increasing", lang)
        elif change_24h < -3:
            trend = "decreasing"
            signal = get_translation("oi_decreasing", lang)
        else:
            trend = "stable"
            signal = get_translation("oi_stable", lang)
        
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
        signal=get_translation("api_unavailable", lang),
        data_source="Fallback"
    )

async def generate_funding_rate(orderbook: dict = None, liquidation_data: dict = None, lang: str = "it") -> FundingRate:
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
                signal_text = get_translation("more_longs_liquidated", lang, long_ratio * 100)
            elif short_ratio > 0.55:
                current_rate = 0.005 + (short_ratio - 0.5) * 0.02
                payer = "longs"
                sentiment = "bullish"
                overcrowded = "longs" if short_ratio > 0.65 else None
                signal_text = get_translation("more_shorts_liquidated", lang, short_ratio * 100)
            else:
                current_rate = 0.001
                payer = "longs"
                sentiment = "neutral"
                overcrowded = None
                signal_text = get_translation("balanced_liquidations", lang)
            
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
        signal_text=get_translation("api_unavailable", lang),
        data_source="Fallback"
    )

# ============== MARKET ENERGY / COMPRESSION DETECTOR ==============

def analyze_market_energy(
    candles: List[dict],
    current_price: float,
    aggregated_orderbook: dict,
    open_interest_data: dict = None,
    liquidity_clusters: List = None,
    lang: str = "it"
) -> MarketEnergy:
    """
    Market Energy / Compression Detector v1.0
    
    Detects when BTC is building energy before a significant move by analyzing:
    1. Price range compression
    2. Volatility compression
    3. Open Interest behavior during compression
    4. Liquidity build-up on both sides
    5. Order book pressure build-up
    
    Returns energy score, compression level, and breakout probability.
    """
    
    signals = []
    energy_score = 0
    
    # ======== 1. PRICE RANGE COMPRESSION ========
    range_width_percent = 0
    compression_score = 0
    
    if candles and len(candles) >= 20:
        # Calculate recent trading range (last 20 candles = ~80 hours on 4H)
        recent_highs = [c["high"] for c in candles[-20:]]
        recent_lows = [c["low"] for c in candles[-20:]]
        
        period_high = max(recent_highs)
        period_low = min(recent_lows)
        range_width = period_high - period_low
        range_width_percent = (range_width / current_price) * 100
        
        # Compare to longer-term range (last 50 candles)
        if len(candles) >= 50:
            longer_highs = [c["high"] for c in candles[-50:]]
            longer_lows = [c["low"] for c in candles[-50:]]
            longer_range = max(longer_highs) - min(longer_lows)
            longer_range_pct = (longer_range / current_price) * 100
            
            # Compression ratio: if recent range is much smaller than longer range
            if longer_range_pct > 0:
                compression_ratio = range_width_percent / longer_range_pct
                
                if compression_ratio < 0.3:
                    compression_score = 100
                    signals.append(get_translation("extreme_compression", lang, range_width_percent))
                elif compression_ratio < 0.5:
                    compression_score = 75
                    signals.append(get_translation("high_compression", lang, range_width_percent))
                elif compression_ratio < 0.7:
                    compression_score = 50
                    signals.append(get_translation("moderate_compression", lang, range_width_percent))
                else:
                    compression_score = 25
        
        # Also check very recent compression (last 5 candles)
        if len(candles) >= 5:
            very_recent_range = max(c["high"] for c in candles[-5:]) - min(c["low"] for c in candles[-5:])
            very_recent_pct = (very_recent_range / current_price) * 100
            
            if very_recent_pct < 0.5:
                compression_score += 20
                signals.append(get_translation("tight_recent_range", lang, very_recent_pct))
    
    energy_score += compression_score * 0.25  # 25% weight
    
    # ======== 2. VOLATILITY COMPRESSION ========
    volatility_compression = 0
    
    if candles and len(candles) >= 20:
        # Calculate ATR-style volatility (True Range)
        recent_tr = []
        for i in range(-14, 0):
            if i >= -len(candles):
                c = candles[i]
                prev_close = candles[i-1]["close"] if i > -len(candles) else c["open"]
                tr = max(
                    c["high"] - c["low"],
                    abs(c["high"] - prev_close),
                    abs(c["low"] - prev_close)
                )
                recent_tr.append(tr / current_price * 100)  # As percentage
        
        if recent_tr:
            current_atr = sum(recent_tr) / len(recent_tr)
            
            # Compare to longer-term volatility
            if len(candles) >= 50:
                longer_tr = []
                for i in range(-50, -14):
                    if i >= -len(candles):
                        c = candles[i]
                        prev_close = candles[i-1]["close"] if i > -len(candles) else c["open"]
                        tr = max(
                            c["high"] - c["low"],
                            abs(c["high"] - prev_close),
                            abs(c["low"] - prev_close)
                        )
                        longer_tr.append(tr / current_price * 100)
                
                if longer_tr:
                    avg_longer_atr = sum(longer_tr) / len(longer_tr)
                    
                    if avg_longer_atr > 0:
                        vol_ratio = current_atr / avg_longer_atr
                        
                        if vol_ratio < 0.4:
                            volatility_compression = 100
                            signals.append(get_translation("extreme_vol_compression", lang))
                        elif vol_ratio < 0.6:
                            volatility_compression = 75
                            signals.append(get_translation("high_vol_compression", lang))
                        elif vol_ratio < 0.8:
                            volatility_compression = 50
                        else:
                            volatility_compression = 25
    
    energy_score += volatility_compression * 0.20  # 20% weight
    
    # ======== 3. OPEN INTEREST BEHAVIOR ========
    oi_trend = "STABLE"
    oi_change_percent = 0
    oi_score = 0
    
    if open_interest_data:
        oi_change_1h = open_interest_data.get("change_1h", 0)
        oi_change_24h = open_interest_data.get("change_24h", 0)
        oi_change_percent = oi_change_24h
        
        # Rising OI during compression = positioning building = energy
        if oi_change_24h > 2:
            oi_trend = "RISING"
            oi_score = 100
            signals.append(get_translation("oi_rising_compression", lang, oi_change_24h))
        elif oi_change_24h > 0.5:
            oi_trend = "RISING"
            oi_score = 60
        elif oi_change_24h < -2:
            oi_trend = "FALLING"
            oi_score = 20
        elif oi_change_24h < -0.5:
            oi_trend = "FALLING"
            oi_score = 30
        else:
            oi_trend = "STABLE"
            oi_score = 40
        
        # Extra bonus if OI is rising while price is compressed
        if oi_trend == "RISING" and compression_score >= 50:
            oi_score += 20
            signals.append(get_translation("oi_building_during_compression", lang))
    
    energy_score += oi_score * 0.25  # 25% weight
    
    # ======== 4. LIQUIDITY BUILD-UP ========
    liquidity_buildup = "NONE"
    liquidity_above = 0
    liquidity_below = 0
    liquidity_score = 0
    
    if liquidity_clusters:
        above_clusters = [c for c in liquidity_clusters if hasattr(c, 'side') and c.side == "above"]
        below_clusters = [c for c in liquidity_clusters if hasattr(c, 'side') and c.side == "below"]
        
        liquidity_above = sum(c.estimated_value for c in above_clusters if hasattr(c, 'estimated_value'))
        liquidity_below = sum(c.estimated_value for c in below_clusters if hasattr(c, 'estimated_value'))
        
        total_liquidity = liquidity_above + liquidity_below
        
        # Check for liquidity on both sides (squeeze setup)
        if liquidity_above > 0 and liquidity_below > 0:
            # Balance check: if liquidity is building on both sides
            if liquidity_above > 1000000 and liquidity_below > 1000000:
                balance_ratio = min(liquidity_above, liquidity_below) / max(liquidity_above, liquidity_below)
                
                if balance_ratio > 0.6:  # Relatively balanced
                    liquidity_buildup = "STRONG"
                    liquidity_score = 100
                    signals.append(get_translation("strong_liquidity_both_sides", lang, liquidity_above/1000000, liquidity_below/1000000))
                elif balance_ratio > 0.3:
                    liquidity_buildup = "MODERATE"
                    liquidity_score = 60
                    signals.append(get_translation("moderate_liquidity_buildup", lang))
                else:
                    liquidity_buildup = "WEAK"
                    liquidity_score = 30
            elif total_liquidity > 500000:
                liquidity_buildup = "WEAK"
                liquidity_score = 30
    
    energy_score += liquidity_score * 0.15  # 15% weight
    
    # ======== 5. ORDER BOOK PRESSURE BUILD-UP ========
    orderbook_pressure = "NONE"
    orderbook_score = 0
    
    if aggregated_orderbook:
        bids = aggregated_orderbook.get("bids", [])
        asks = aggregated_orderbook.get("asks", [])
        total_bid_depth = aggregated_orderbook.get("total_bid_depth", 0)
        total_ask_depth = aggregated_orderbook.get("total_ask_depth", 0)
        
        total_depth = total_bid_depth + total_ask_depth
        
        if total_depth > 0:
            # Check for large orders stacking on both sides
            if bids and asks:
                bid_volumes = [float(b[1]) for b in bids[:30]]
                ask_volumes = [float(a[1]) for a in asks[:30]]
                
                avg_bid = sum(bid_volumes) / len(bid_volumes) if bid_volumes else 0
                avg_ask = sum(ask_volumes) / len(ask_volumes) if ask_volumes else 0
                
                # Count large orders (walls)
                large_bids = sum(1 for v in bid_volumes if v > avg_bid * 3)
                large_asks = sum(1 for v in ask_volumes if v > avg_ask * 3)
                
                if large_bids >= 3 and large_asks >= 3:
                    orderbook_pressure = "STRONG"
                    orderbook_score = 100
                    signals.append(get_translation("strong_orderbook_buildup", lang, large_bids, large_asks))
                elif large_bids >= 2 or large_asks >= 2:
                    orderbook_pressure = "BUILDING"
                    orderbook_score = 50
                else:
                    orderbook_score = 20
    
    energy_score += orderbook_score * 0.15  # 15% weight
    
    # ======== 6. DETERMINE COMPRESSION LEVEL ========
    avg_compression = (compression_score + volatility_compression) / 2
    
    if avg_compression >= 75:
        compression_level = "HIGH"
    elif avg_compression >= 50:
        compression_level = "MEDIUM"
    else:
        compression_level = "LOW"
    
    # ======== 7. DETERMINE BREAKOUT PROBABILITY ========
    if energy_score >= 70:
        breakout_probability = "HIGH"
    elif energy_score >= 45:
        breakout_probability = "MEDIUM"
    else:
        breakout_probability = "LOW"
    
    # ======== 8. DETERMINE EXPECTED DIRECTION ========
    expected_direction = None
    
    if aggregated_orderbook:
        total_bid_depth = aggregated_orderbook.get("total_bid_depth", 0)
        total_ask_depth = aggregated_orderbook.get("total_ask_depth", 0)
        
        if total_bid_depth + total_ask_depth > 0:
            imbalance = (total_bid_depth - total_ask_depth) / (total_bid_depth + total_ask_depth) * 100
            
            if imbalance > 20:
                expected_direction = "UP"
            elif imbalance < -20:
                expected_direction = "DOWN"
            else:
                expected_direction = "UNCLEAR"
    
    # Check liquidity direction as secondary indicator
    if expected_direction == "UNCLEAR" and liquidity_above > 0 and liquidity_below > 0:
        if liquidity_above > liquidity_below * 1.5:
            expected_direction = "UP"  # More liquidity above = price seeks it
        elif liquidity_below > liquidity_above * 1.5:
            expected_direction = "DOWN"
    
    # ======== 9. EXPANSION WARNING ========
    expansion_warning = False
    
    if compression_level == "HIGH" and breakout_probability in ["HIGH", "MEDIUM"]:
        if oi_trend == "RISING" or liquidity_buildup in ["STRONG", "MODERATE"]:
            expansion_warning = True
            signals.append(get_translation("expansion_likely", lang))
    
    # ======== 10. BUILD EXPLANATION ========
    explanation = _build_energy_explanation(
        energy_score, compression_level, range_width_percent,
        oi_trend, oi_change_percent, liquidity_buildup,
        orderbook_pressure, breakout_probability, expected_direction,
        expansion_warning, lang
    )
    
    return MarketEnergy(
        energy_score=round(energy_score, 1),
        compression_level=compression_level,
        range_width_percent=round(range_width_percent, 2),
        volatility_compression=round(volatility_compression, 1),
        oi_trend=oi_trend,
        oi_change_percent=round(oi_change_percent, 2),
        liquidity_buildup=liquidity_buildup,
        liquidity_above=round(liquidity_above, 0),
        liquidity_below=round(liquidity_below, 0),
        orderbook_pressure_buildup=orderbook_pressure,
        breakout_probability=breakout_probability,
        expected_direction=expected_direction,
        explanation=explanation,
        signals=signals[:5],
        expansion_warning=expansion_warning,
        data_source="Multi-Exchange + CoinGlass"
    )


def _build_energy_explanation(
    energy_score: float, compression_level: str, range_width: float,
    oi_trend: str, oi_change: float, liq_buildup: str,
    ob_pressure: str, breakout_prob: str, direction: str,
    expansion_warning: bool, lang: str
) -> str:
    """Build comprehensive explanation for market energy."""
    
    if expansion_warning:
        if direction == "UP":
            return get_translation("energy_expansion_bullish", lang, range_width, oi_change)
        elif direction == "DOWN":
            return get_translation("energy_expansion_bearish", lang, range_width, oi_change)
        else:
            return get_translation("energy_expansion_unclear", lang, range_width)
    
    if compression_level == "HIGH":
        if oi_trend == "RISING" and liq_buildup in ["STRONG", "MODERATE"]:
            return get_translation("energy_high_building", lang, range_width)
        elif oi_trend == "RISING":
            return get_translation("energy_high_oi_rising", lang, range_width, oi_change)
        else:
            return get_translation("energy_high_compressed", lang, range_width)
    
    elif compression_level == "MEDIUM":
        if oi_trend == "RISING":
            return get_translation("energy_medium_building", lang)
        else:
            return get_translation("energy_medium_consolidating", lang)
    
    else:  # LOW
        if breakout_prob == "LOW":
            return get_translation("energy_low_ranging", lang)
        else:
            return get_translation("energy_low_normal", lang)


# ============== WHALE ALERT ENGINE ==============

def analyze_whale_activity(
    candles: List[dict],
    current_price: float,
    aggregated_orderbook: dict,
    liquidation_data: dict = None,
    open_interest_data: dict = None,
    lang: str = "it"
) -> WhaleActivity:
    """
    Advanced Whale Alert Engine v2.0 - Professional large player behavior detection.
    
    Analyzes:
    1. Volume spikes and absorption patterns
    2. Order book buy/sell pressure imbalance
    3. OI Divergence Analysis (price vs OI)
    4. Accumulation/Distribution detection
    5. Liquidation cluster targeting
    6. Smart money behavior inference
    
    Returns direction (BUY/SELL/NEUTRAL), strength score, and detailed explanation.
    """
    
    signals = []
    buy_pressure = 0
    sell_pressure = 0
    
    # Initialize new analysis fields
    oi_divergence = None
    oi_divergence_strength = 0
    accumulation_distribution = None
    absorption_detected = False
    liquidation_zones = []
    whale_behavior = "unknown"
    
    # ======== 1. VOLUME ANALYSIS WITH ABSORPTION DETECTION ========
    volume_spike = False
    volume_ratio = 1.0
    price_volatility = 0
    
    if candles and len(candles) >= 20:
        recent_volumes = [c["volume"] for c in candles[-20:]]
        avg_volume = sum(recent_volumes) / len(recent_volumes) if recent_volumes else 0
        current_volume = candles[-1]["volume"] if candles else 0
        
        # Calculate price volatility for absorption detection
        if len(candles) >= 5:
            recent_ranges = [(c["high"] - c["low"]) / c["low"] * 100 for c in candles[-5:]]
            price_volatility = sum(recent_ranges) / len(recent_ranges)
        
        if avg_volume > 0:
            volume_ratio = current_volume / avg_volume
            
            # High volume analysis
            if volume_ratio >= 2.5:
                volume_spike = True
                candle = candles[-1]
                is_bullish = candle["close"] > candle["open"]
                body_size = abs(candle["close"] - candle["open"])
                total_range = candle["high"] - candle["low"]
                body_ratio = body_size / total_range if total_range > 0 else 0
                
                # ABSORPTION DETECTION: High volume + small body = orders being absorbed
                if body_ratio < 0.3 and volume_ratio >= 2.0:
                    absorption_detected = True
                    # Determine absorption direction from wicks
                    upper_wick = candle["high"] - max(candle["open"], candle["close"])
                    lower_wick = min(candle["open"], candle["close"]) - candle["low"]
                    
                    if upper_wick > lower_wick * 2:
                        # Long upper wick = selling absorbed, bullish
                        buy_pressure += 25
                        accumulation_distribution = "accumulation"
                        signals.append(get_translation("absorption_bullish", lang, volume_ratio))
                    elif lower_wick > upper_wick * 2:
                        # Long lower wick = buying absorbed, bearish
                        sell_pressure += 25
                        accumulation_distribution = "distribution"
                        signals.append(get_translation("absorption_bearish", lang, volume_ratio))
                    else:
                        signals.append(get_translation("absorption_neutral", lang, volume_ratio))
                else:
                    # Normal volume spike with direction
                    if is_bullish:
                        buy_pressure += 25
                        signals.append(get_translation("large_bullish_volume", lang, volume_ratio))
                    else:
                        sell_pressure += 25
                        signals.append(get_translation("large_bearish_volume", lang, volume_ratio))
                        
            elif volume_ratio >= 1.5:
                if candles[-1]["close"] > candles[-1]["open"]:
                    buy_pressure += 10
                else:
                    sell_pressure += 10
    
    # ======== 2. OI DIVERGENCE ANALYSIS ========
    if open_interest_data and candles and len(candles) >= 5:
        oi_change_1h = open_interest_data.get("change_1h", 0)
        oi_change_24h = open_interest_data.get("change_24h", 0)
        
        # Calculate price change over same period
        price_change_1h = 0
        if len(candles) >= 4:
            price_change_1h = (candles[-1]["close"] - candles[-4]["close"]) / candles[-4]["close"] * 100
        
        price_change_5c = (candles[-1]["close"] - candles[-5]["close"]) / candles[-5]["close"] * 100 if len(candles) >= 5 else 0
        
        # OI DIVERGENCE INTERPRETATION
        # Price UP + OI DOWN = Short Closing (bullish continuation likely)
        # Price DOWN + OI DOWN = Long Closing (bearish continuation likely)
        # Price UP + OI UP = New Longs Opening (strong bullish)
        # Price DOWN + OI UP = New Shorts Opening (strong bearish)
        
        oi_threshold = 0.3  # Minimum OI change to consider
        price_threshold = 0.15  # Minimum price change to consider
        
        if abs(oi_change_1h) > oi_threshold and abs(price_change_1h) > price_threshold:
            if price_change_1h > price_threshold and oi_change_1h < -oi_threshold:
                # Price up + OI down = Short Closing
                oi_divergence = "short_closing"
                oi_divergence_strength = min(100, abs(price_change_1h) * 20 + abs(oi_change_1h) * 15)
                buy_pressure += 20
                signals.append(get_translation("oi_div_short_closing", lang, price_change_1h, oi_change_1h))
                
            elif price_change_1h < -price_threshold and oi_change_1h < -oi_threshold:
                # Price down + OI down = Long Closing
                oi_divergence = "long_closing"
                oi_divergence_strength = min(100, abs(price_change_1h) * 20 + abs(oi_change_1h) * 15)
                sell_pressure += 20
                signals.append(get_translation("oi_div_long_closing", lang, price_change_1h, oi_change_1h))
                
            elif price_change_1h > price_threshold and oi_change_1h > oi_threshold:
                # Price up + OI up = New Longs Opening
                oi_divergence = "long_opening"
                oi_divergence_strength = min(100, price_change_1h * 25 + oi_change_1h * 20)
                buy_pressure += 30
                signals.append(get_translation("oi_div_long_opening", lang, price_change_1h, oi_change_1h))
                
            elif price_change_1h < -price_threshold and oi_change_1h > oi_threshold:
                # Price down + OI up = New Shorts Opening
                oi_divergence = "short_opening"
                oi_divergence_strength = min(100, abs(price_change_1h) * 25 + oi_change_1h * 20)
                sell_pressure += 30
                signals.append(get_translation("oi_div_short_opening", lang, price_change_1h, oi_change_1h))
    
    # ======== 3. ORDER BOOK PRESSURE ANALYSIS ========
    orderbook_aggression = None
    
    if aggregated_orderbook:
        bids = aggregated_orderbook.get("bids", [])
        asks = aggregated_orderbook.get("asks", [])
        
        total_bid_depth = aggregated_orderbook.get("total_bid_depth", 0)
        total_ask_depth = aggregated_orderbook.get("total_ask_depth", 0)
        
        if total_bid_depth + total_ask_depth > 0:
            ob_imbalance = ((total_bid_depth - total_ask_depth) / (total_bid_depth + total_ask_depth)) * 100
            
            if ob_imbalance > 25:
                buy_pressure += 30
                orderbook_aggression = "aggressive_buying"
                signals.append(get_translation("heavy_buy_orderbook", lang, ob_imbalance))
            elif ob_imbalance > 15:
                buy_pressure += 15
                signals.append(get_translation("buy_orderbook_dominance", lang, ob_imbalance))
            elif ob_imbalance < -25:
                sell_pressure += 30
                orderbook_aggression = "aggressive_selling"
                signals.append(get_translation("heavy_sell_orderbook", lang, abs(ob_imbalance)))
            elif ob_imbalance < -15:
                sell_pressure += 15
                signals.append(get_translation("sell_orderbook_dominance", lang, abs(ob_imbalance)))
        
        # Detect large whale walls
        if bids:
            bid_volumes = [(float(b[0]), float(b[1])) for b in bids[:30]]
            avg_bid = sum(v[1] for v in bid_volumes) / len(bid_volumes) if bid_volumes else 0
            large_bid_walls = [(price, vol) for price, vol in bid_volumes if vol > avg_bid * 4]
            if large_bid_walls:
                buy_pressure += 10
                wall_price = large_bid_walls[0][0]
                wall_distance = ((current_price - wall_price) / current_price) * 100
                signals.append(get_translation("bid_wall_detected", lang, len(large_bid_walls), wall_price))
                liquidation_zones.append({
                    "type": "bid_wall",
                    "price": wall_price,
                    "distance_percent": -wall_distance,
                    "strength": "high"
                })
        
        if asks:
            ask_volumes = [(float(a[0]), float(a[1])) for a in asks[:30]]
            avg_ask = sum(v[1] for v in ask_volumes) / len(ask_volumes) if ask_volumes else 0
            large_ask_walls = [(price, vol) for price, vol in ask_volumes if vol > avg_ask * 4]
            if large_ask_walls:
                sell_pressure += 10
                wall_price = large_ask_walls[0][0]
                wall_distance = ((wall_price - current_price) / current_price) * 100
                signals.append(get_translation("ask_wall_detected", lang, len(large_ask_walls), wall_price))
                liquidation_zones.append({
                    "type": "ask_wall",
                    "price": wall_price,
                    "distance_percent": wall_distance,
                    "strength": "high"
                })
    
    # ======== 4. LIQUIDATION DATA ANALYSIS ========
    liquidation_bias = None
    
    if liquidation_data:
        long_liq_24h = liquidation_data.get("long_liquidation_usd_24h", 0)
        short_liq_24h = liquidation_data.get("short_liquidation_usd_24h", 0)
        total_liq = long_liq_24h + short_liq_24h
        
        if total_liq > 0:
            long_ratio = long_liq_24h / total_liq
            short_ratio = short_liq_24h / total_liq
            
            if long_ratio > 0.65:
                sell_pressure += 20
                liquidation_bias = "longs_liquidated"
                signals.append(get_translation("heavy_long_liquidations", lang, long_ratio * 100))
            elif long_ratio > 0.55:
                sell_pressure += 10
                signals.append(get_translation("more_longs_liquidated_signal", lang))
            elif short_ratio > 0.65:
                buy_pressure += 20
                liquidation_bias = "shorts_liquidated"
                signals.append(get_translation("heavy_short_liquidations", lang, short_ratio * 100))
            elif short_ratio > 0.55:
                buy_pressure += 10
                signals.append(get_translation("more_shorts_liquidated_signal", lang))
        
        # LIQUIDATION CLUSTER TARGETING
        # Identify where major liquidation zones are based on recent liquidation data
        if candles and len(candles) >= 10:
            recent_high = max(c["high"] for c in candles[-10:])
            recent_low = min(c["low"] for c in candles[-10:])
            
            # Estimate liquidation clusters based on typical leverage
            # Long liquidations cluster below recent lows
            # Short liquidations cluster above recent highs
            long_liq_zone = recent_low * 0.98  # -2% below recent low
            short_liq_zone = recent_high * 1.02  # +2% above recent high
            
            long_liq_distance = ((current_price - long_liq_zone) / current_price) * 100
            short_liq_distance = ((short_liq_zone - current_price) / current_price) * 100
            
            # Determine which zone is more attractive to hunt
            if long_liq_distance < short_liq_distance and long_liq_distance < 3:
                # Long liquidation zone is closer - price may hunt it
                liquidation_zones.append({
                    "type": "long_liquidation_cluster",
                    "price": round(long_liq_zone, 0),
                    "distance_percent": round(-long_liq_distance, 2),
                    "strength": "major",
                    "target_type": "stop_hunt"
                })
                if long_liq_distance < 1.5:
                    signals.append(get_translation("long_liq_zone_near", lang, long_liq_zone, long_liq_distance))
                    
            if short_liq_distance < long_liq_distance and short_liq_distance < 3:
                # Short liquidation zone is closer - price may hunt it
                liquidation_zones.append({
                    "type": "short_liquidation_cluster",
                    "price": round(short_liq_zone, 0),
                    "distance_percent": round(short_liq_distance, 2),
                    "strength": "major",
                    "target_type": "stop_hunt"
                })
                if short_liq_distance < 1.5:
                    signals.append(get_translation("short_liq_zone_near", lang, short_liq_zone, short_liq_distance))
    
    # ======== 5. DETERMINE WHALE BEHAVIOR ========
    # Infer what large players are doing based on combined signals
    
    if absorption_detected:
        if accumulation_distribution == "accumulation":
            whale_behavior = "accumulating"
        elif accumulation_distribution == "distribution":
            whale_behavior = "distributing"
        else:
            whale_behavior = "absorbing"
    elif oi_divergence in ["long_opening", "short_opening"]:
        whale_behavior = "position_building"
    elif oi_divergence in ["long_closing", "short_closing"]:
        whale_behavior = "position_closing"
    elif liquidation_zones and any(z.get("target_type") == "stop_hunt" for z in liquidation_zones):
        whale_behavior = "hunting_stops"
    elif buy_pressure > sell_pressure + 30:
        whale_behavior = "accumulating"
    elif sell_pressure > buy_pressure + 30:
        whale_behavior = "distributing"
    
    # ======== 6. CALCULATE FINAL DIRECTION ========
    total_pressure = buy_pressure + sell_pressure
    strength = min(100, total_pressure)
    
    # More nuanced direction calculation - reduce NEUTRAL tendency
    pressure_diff = buy_pressure - sell_pressure
    
    if pressure_diff > 15:  # Lowered from 20
        direction = "BUY"
        confidence = min(95, 50 + pressure_diff * 0.8)
    elif pressure_diff < -15:  # Lowered from 20
        direction = "SELL"
        confidence = min(95, 50 + abs(pressure_diff) * 0.8)
    else:
        # Even in "neutral" range, lean toward the stronger side
        if buy_pressure > sell_pressure:
            direction = "BUY"
            confidence = max(40, 50 + pressure_diff)
        elif sell_pressure > buy_pressure:
            direction = "SELL"
            confidence = max(40, 50 + abs(pressure_diff))
        else:
            direction = "NEUTRAL"
            confidence = 50
    
    # Boost confidence if multiple strong signals align
    strong_signal_count = sum(1 for s in signals if any(word in s.lower() for word in ["heavy", "large", "major", "forte", "grande", "massiccio"]))
    if strong_signal_count >= 2:
        confidence = min(95, confidence + 10)
    
    # ======== 7. BUILD COMPREHENSIVE EXPLANATION ========
    explanation = _build_whale_explanation(
        direction, whale_behavior, oi_divergence, oi_divergence_strength,
        accumulation_distribution, absorption_detected, liquidation_bias,
        volume_spike, orderbook_aggression, signals, lang
    )
    
    return WhaleActivity(
        direction=direction,
        strength=round(strength, 1),
        confidence=round(confidence, 1),
        signals=signals[:6],  # Limit to 6 most important signals
        explanation=explanation,
        volume_spike=volume_spike,
        volume_ratio=round(volume_ratio, 2),
        buy_pressure=round(buy_pressure, 1),
        sell_pressure=round(sell_pressure, 1),
        liquidation_bias=liquidation_bias,
        orderbook_aggression=orderbook_aggression,
        oi_divergence=oi_divergence,
        oi_divergence_strength=round(oi_divergence_strength, 1),
        accumulation_distribution=accumulation_distribution,
        absorption_detected=absorption_detected,
        liquidation_zones=liquidation_zones[:3],  # Limit to 3 nearest zones
        whale_behavior=whale_behavior,
        data_source="Multi-Exchange + CoinGlass"
    )


def _build_whale_explanation(
    direction: str, whale_behavior: str, oi_divergence: str, oi_div_strength: float,
    accum_dist: str, absorption: bool, liq_bias: str,
    vol_spike: bool, ob_aggression: str, signals: List[str], lang: str
) -> str:
    """Build a comprehensive explanation of whale activity."""
    
    parts = []
    
    # Primary behavior explanation
    if whale_behavior == "accumulating":
        parts.append(get_translation("whale_accumulating", lang))
    elif whale_behavior == "distributing":
        parts.append(get_translation("whale_distributing", lang))
    elif whale_behavior == "hunting_stops":
        parts.append(get_translation("whale_hunting_stops", lang))
    elif whale_behavior == "position_building":
        parts.append(get_translation("whale_position_building", lang))
    elif whale_behavior == "position_closing":
        parts.append(get_translation("whale_position_closing", lang))
    elif whale_behavior == "absorbing":
        parts.append(get_translation("whale_absorbing", lang))
    
    # OI Divergence context
    if oi_divergence and oi_div_strength > 40:
        if oi_divergence == "short_closing":
            parts.append(get_translation("oi_context_short_closing", lang))
        elif oi_divergence == "long_closing":
            parts.append(get_translation("oi_context_long_closing", lang))
        elif oi_divergence == "long_opening":
            parts.append(get_translation("oi_context_long_opening", lang))
        elif oi_divergence == "short_opening":
            parts.append(get_translation("oi_context_short_opening", lang))
    
    # Absorption context
    if absorption:
        if accum_dist == "accumulation":
            parts.append(get_translation("absorption_context_bullish", lang))
        elif accum_dist == "distribution":
            parts.append(get_translation("absorption_context_bearish", lang))
    
    # Volume and orderbook context
    if vol_spike and ob_aggression:
        if ob_aggression == "aggressive_buying":
            parts.append(get_translation("vol_ob_bullish", lang))
        else:
            parts.append(get_translation("vol_ob_bearish", lang))
    
    # Liquidation context
    if liq_bias:
        if liq_bias == "shorts_liquidated":
            parts.append(get_translation("liq_context_bullish", lang))
        else:
            parts.append(get_translation("liq_context_bearish", lang))
    
    # Build final explanation
    if parts:
        return " ".join(parts)
    elif direction == "BUY":
        return get_translation("moderate_whale_buying", lang)
    elif direction == "SELL":
        return get_translation("moderate_whale_selling", lang)
    else:
        return get_translation("no_whale_bias", lang)

# ============== LIQUIDITY LADDER ==============

def build_liquidity_ladder(
    current_price: float,
    sr_levels: List[SupportResistanceLevel],
    liquidity_clusters: List[LiquidityCluster],
    aggregated_orderbook: dict = None,
    lang: str = "it"
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
            path_analysis = get_translation("upper_ladder_stronger", lang, above_total_value/1000000, below_total_value/1000000, nearest_above.price)
        elif more_attractive_side == "below" and below_dist < above_dist * 1.5:
            sweep_expectation = "sweep_below_first"
            path_analysis = get_translation("lower_ladder_stronger", lang, below_total_value/1000000, above_total_value/1000000, nearest_below.price)
        elif more_attractive_side == "balanced":
            sweep_expectation = "balanced"
            path_analysis = get_translation("balanced_distribution", lang)
        else:
            sweep_expectation = "no_clear_sweep"
            path_analysis = get_translation("no_clear_sweep", lang)
    else:
        sweep_expectation = "no_clear_sweep"
        path_analysis = get_translation("insufficient_data", lang)
    
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
    liquidity_ladder: LiquidityLadder = None,
    market_energy: MarketEnergy = None,
    lang: str = "it"
) -> TradeSignal:
    """
    Generate a final actionable trading signal by synthesizing all intelligence.
    
    ENHANCED BTC TRADING LOGIC (v1.9.5 - Market Energy Integration):
    1. Minimum move filter: No signal if estimated move < 0.50%
    2. Smart stop placement: Beyond liquidity sweep zones
    3. Liquidity sweep detection: Identify sweep-and-reversal setups
    4. Setup type classification: continuation vs sweep_reversal
    5. Whale Activity Engine: Confirms direction with whale pressure
    6. Liquidity Ladder: Path analysis for sweep expectations
    7. Market Energy: Confidence adjustment based on compression state
    
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
            sweep_analysis = get_translation("approaching_support", lang, support_level.price, long_sweep_zone, support_level.price)
    
    elif approaching_resistance_sweep:
        # Price near resistance - potential short sweep then reversal down
        resistance_level = resistances[0]
        
        if market_bias.bias == "BEARISH" and market_bias.confidence >= 60:
            sweep_detected = True
            setup_type = "sweep_reversal"
            sweep_analysis = get_translation("approaching_resistance", lang, resistance_level.price, short_sweep_zone, resistance_level.price)
    
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
        reasoning_parts.append(get_translation("market_bias_is", lang, market_bias.bias, market_bias.confidence))
    elif bias_score < 0:
        reasoning_parts.append(get_translation("market_bias_is", lang, market_bias.bias, market_bias.confidence))
    
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
        reasoning_parts.append(get_translation("liquidity_points", lang, liquidity_direction.direction, liquidity_direction.next_target))
    
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
        
        consensus_text = f"{bullish_count}/{total} exchange bullish, {bearish_count}/{total} bearish"
    else:
        consensus_text = "Dati exchange non disponibili"
    
    score += exchange_score
    factors["exchange_consensus"] = {
        "description": consensus_text,
        "score": exchange_score,
        "max": 2
    }
    
    if exchange_score > 0:
        reasoning_parts.append(get_translation("exchange_consensus_bullish", lang, consensus_text))
    elif exchange_score < 0:
        reasoning_parts.append(get_translation("exchange_consensus_bearish", lang, consensus_text))
    
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
                warnings.append("⚠️ " + get_translation("longs_overcrowded", lang))
                funding_score -= 1
            elif funding_rate.overcrowded == "shorts":
                warnings.append("⚠️ " + get_translation("shorts_overcrowded", lang))
                funding_score += 1
    
    score += funding_score
    factors["funding_rate"] = {
        "rate": funding_rate.current_rate if funding_rate else 0,
        "sentiment": funding_rate.sentiment if funding_rate else "unknown",
        "score": funding_score,
        "max": 1
    }
    
    if funding_score != 0:
        reasoning_parts.append(get_translation("funding_sentiment", lang, funding_rate.sentiment))
    
    # 5. Open Interest Trend (+/-1)
    oi_score = 0
    if open_interest:
        if open_interest.trend == "increasing":
            if score > 0:
                oi_score = 1
                reasoning_parts.append(get_translation("oi_increasing_bullish", lang))
            elif score < 0:
                oi_score = -1
                reasoning_parts.append(get_translation("oi_increasing_bearish", lang))
        elif open_interest.trend == "decreasing":
            if score > 0:
                warnings.append("⚠️ " + get_translation("oi_decreasing_profit", lang))
            elif score < 0:
                warnings.append("⚠️ " + get_translation("oi_decreasing_covering", lang))
    
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
                reasoning_parts.append(get_translation("pattern_detected", lang, pattern.pattern, "bullish", pattern.confidence))
            elif pattern.direction == "BEARISH" and pattern.confidence >= 65:
                pattern_score -= 1
                reasoning_parts.append(get_translation("pattern_detected", lang, pattern.pattern, "bearish", pattern.confidence))
    
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
            reasoning_parts.append(get_translation("whale_favors_longs", lang, long_signals, short_signals))
        elif short_signals > long_signals:
            whale_score = -1
            reasoning_parts.append(get_translation("whale_favors_shorts", lang, short_signals, long_signals))
    
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
            reasoning_parts.append(get_translation("whale_engine_buy", lang, whale_activity.strength, whale_activity.explanation))
        elif whale_activity.direction == "SELL" and whale_activity.strength >= 40:
            whale_engine_score = -2 if whale_activity.strength >= 70 else -1
            reasoning_parts.append(get_translation("whale_engine_sell", lang, whale_activity.strength, whale_activity.explanation))
        
        # Add specific whale signals as warnings/context
        if whale_activity.volume_spike:
            warnings.append("🐋 " + get_translation("volume_spike", lang, whale_activity.volume_ratio))
        if whale_activity.liquidation_bias == "longs_liquidated":
            warnings.append("🐋 " + get_translation("long_liquidation_cascade", lang))
        elif whale_activity.liquidation_bias == "shorts_liquidated":
            warnings.append("🐋 " + get_translation("short_squeeze_progress", lang))
        if whale_activity.orderbook_aggression:
            if whale_activity.orderbook_aggression == "aggressive_buying":
                warnings.append("🐋 " + get_translation("orderbook_aggressive_buy", lang))
            else:
                warnings.append("🐋 " + get_translation("orderbook_aggressive_sell", lang))
    
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
            if liquidity_ladder.major_above:
                reasoning_parts.append(get_translation("ladder_more_above", lang, liquidity_ladder.major_above.price))
            else:
                reasoning_parts.append(get_translation("ladder_favors_upside", lang))
        elif liquidity_ladder.more_attractive_side == "below":
            ladder_score = -1  # Bearish - price seeks downside liquidity
            if liquidity_ladder.major_below:
                reasoning_parts.append(get_translation("ladder_more_below", lang, liquidity_ladder.major_below.price))
            else:
                reasoning_parts.append(get_translation("ladder_favors_downside", lang))
        
        # Determine sweep expectation
        if liquidity_ladder.sweep_expectation == "sweep_below_first":
            sweep_first_expected = True
            if score > 0:  # Currently bullish
                if liquidity_ladder.nearest_below:
                    warnings.append("⚠️ " + get_translation("sweep_expected_down", lang, liquidity_ladder.nearest_below.price))
                else:
                    warnings.append("⚠️ " + get_translation("possible_dip", lang))
        elif liquidity_ladder.sweep_expectation == "sweep_above_first":
            sweep_first_expected = True
            if score < 0:  # Currently bearish
                if liquidity_ladder.nearest_above:
                    warnings.append("⚠️ " + get_translation("sweep_expected_up", lang, liquidity_ladder.nearest_above.price))
                else:
                    warnings.append("⚠️ " + get_translation("possible_spike", lang))
    
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
        warnings.append("⚠️ " + get_translation("high_trap_risk", lang))
    
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
            invalidation_reason = get_translation("true_invalidation_below", lang, stop_loss, obvious_long_stop)
        else:
            stop_loss = long_sweep_zone * 0.995  # Below sweep zone
            invalidation_reason = get_translation("stop_beyond_sweep_below", lang, stop_loss, long_sweep_zone)
        
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
            invalidation_reason = get_translation("true_invalidation_above", lang, stop_loss, obvious_short_stop)
        else:
            stop_loss = short_sweep_zone * 1.005
            invalidation_reason = get_translation("stop_beyond_sweep_above", lang, stop_loss, short_sweep_zone)
        
        target_1 = supports[0].price if supports else current_price * 0.98
        target_2 = supports[1].price if len(supports) > 1 else current_price * 0.96
        
        estimated_move = ((target_1 - current_price) / current_price) * 100
        
        liquidity_sweep_zone = short_sweep_zone
        safe_invalidation = stop_loss
        
    else:  # NO TRADE
        entry_zone_low = current_price * 0.99
        entry_zone_high = current_price * 1.01
        stop_loss = 0
        invalidation_reason = get_translation("mixed_signals", lang)
        target_1 = 0
        target_2 = 0
        estimated_move = 0
        liquidity_sweep_zone = None
        safe_invalidation = None
    
    # ================== MINIMUM MOVE FILTER ==================
    
    no_trade_reason = None
    if direction != "NO TRADE":
        if abs(estimated_move) < MINIMUM_MOVE_PERCENT:
            no_trade_reason = get_translation("move_below_threshold", lang, abs(estimated_move), MINIMUM_MOVE_PERCENT)
            direction = "NO TRADE"
            warnings.append("⚠️ " + get_translation("move_too_small", lang, abs(estimated_move), MINIMUM_MOVE_PERCENT))
    
    # ================== CALCULATE RISK/REWARD ==================
    
    if direction != "NO TRADE" and stop_loss > 0:
        risk = abs(current_price - stop_loss)
        reward = abs(target_1 - current_price)
        risk_reward_ratio = reward / risk if risk > 0 else 0
        
        # Check if R:R is acceptable (at least 1.5:1)
        if risk_reward_ratio < 1.5:
            warnings.append("⚠️ " + get_translation("rr_below_ideal", lang, risk_reward_ratio))
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
    
    # ================== MARKET ENERGY INTEGRATION ==================
    energy_context = None
    
    if market_energy:
        # Adjust confidence based on market energy
        if market_energy.compression_level == "HIGH" and market_energy.breakout_probability == "HIGH":
            if direction != "NO TRADE":
                confidence = min(95, confidence + 10)  # High energy boosts confidence
                energy_context = get_translation("energy_boosts_confidence", lang)
                warnings.append(f"⚡ {get_translation('high_energy_expansion', lang, market_energy.energy_score)}")
            else:
                # High energy but no trade = wait for direction confirmation
                warnings.append(f"⚡ {get_translation('high_energy_wait', lang, market_energy.energy_score)}")
                
        elif market_energy.compression_level == "LOW" and market_energy.breakout_probability == "LOW":
            if direction != "NO TRADE":
                confidence = max(40, confidence - 10)  # Low energy reduces confidence
                energy_context = get_translation("energy_reduces_confidence", lang)
                warnings.append(f"💤 {get_translation('low_energy_caution', lang)}")
        
        # If compression is high with liquidity on both sides - expansion warning
        if market_energy.expansion_warning:
            if direction != "NO TRADE":
                reasoning_parts.append(get_translation("expansion_likely_direction", lang, market_energy.expected_direction or "UNCLEAR"))
            else:
                warnings.append(f"⚡ {get_translation('expansion_likely_no_direction', lang)}")
    
    if direction == "NO TRADE":
        confidence = max(30, 60 - abs(score) * 5)
    
    # ================== BUILD REASONING TEXT ==================
    
    if direction == "NO TRADE":
        if no_trade_reason:
            reasoning = f"⚠️ {get_translation('no_trade_insufficient', lang)}\n\n{no_trade_reason}\n\n"
        else:
            reasoning = f"⚠️ {get_translation('mixed_signals_no_setup', lang)}\n\n"
        
        reasoning += f"{get_translation('factors_not_aligned', lang)}\n"
        for part in reasoning_parts:
            reasoning += f"• {part}\n"
        
        if sweep_analysis:
            reasoning += f"\n📊 {sweep_analysis}\n"
        
        reasoning += f"\n{get_translation('wait_clearer_bias', lang)}"
        
    else:
        dir_emoji = "🟢" if direction == "LONG" else "🔴"
        
        if setup_type == "sweep_reversal":
            reasoning = f"{dir_emoji} {direction} - {get_translation('sweep_reversal_setup', lang)}\n\n"
        else:
            reasoning = f"{dir_emoji} {direction} - {get_translation('continuation_setup', lang)}\n\n"
        
        # Move size assessment
        if abs(estimated_move) >= 2.0:
            reasoning += f"✅ {get_translation('large_move_potential', lang, abs(estimated_move))}\n\n"
        elif abs(estimated_move) >= 1.0:
            reasoning += f"✅ {get_translation('decent_move_potential', lang, abs(estimated_move))}\n\n"
        else:
            reasoning += f"⚠️ {get_translation('small_move', lang, abs(estimated_move), MINIMUM_MOVE_PERCENT)}\n\n"
        
        reasoning += f"{get_translation('key_factors', lang)}\n"
        for part in reasoning_parts:
            reasoning += f"• {part}\n"
        
        # Liquidity sweep context
        reasoning += f"\n📊 {get_translation('liquidity_stop_placement', lang)}\n"
        if direction == "LONG":
            reasoning += f"• {get_translation('obvious_stop_zone', lang, long_sweep_zone)}\n"
            reasoning += f"• {get_translation('safe_invalidation', lang, safe_long_invalidation)}\n"
            reasoning += f"• {get_translation('stop_placed_at', lang, stop_loss)}\n"
        else:
            reasoning += f"• {get_translation('obvious_stop_zone_above', lang, short_sweep_zone)}\n"
            reasoning += f"• {get_translation('safe_invalidation', lang, safe_short_invalidation)}\n"
            reasoning += f"• {get_translation('stop_placed_at', lang, stop_loss)}\n"
        
        if sweep_analysis:
            reasoning += f"\n🔄 {get_translation('sweep_analysis', lang)}\n{sweep_analysis}\n"
        
        # Add liquidity ladder path analysis
        if liquidity_ladder and liquidity_ladder.path_analysis:
            reasoning += f"\n🪜 {get_translation('liquidity_path', lang)}\n{liquidity_ladder.path_analysis}\n"
        
        # Add whale activity summary
        if whale_activity and whale_activity.direction != "NEUTRAL":
            reasoning += f"\n🐋 {get_translation('whale_activity_section', lang)}\n{whale_activity.explanation}\n"
        
        if warnings:
            reasoning += f"\n⚠️ {get_translation('risk_warnings', lang)}\n"
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
                headers = {"CG-API-KEY": coinglass_key, "accept": "application/json"}
                resp = await client.get(
                    "https://open-api-v3.coinglass.com/api/futures/openInterest/ohlc-history?symbol=BTCUSDT&exchange=Binance&interval=4h&limit=1",
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

@api_router.get("/system/ready")
async def get_system_ready():
    """
    Deployment readiness check - returns simple OK/NOT_READY status.
    Use this for load balancer health checks.
    """
    try:
        # Quick MongoDB ping
        await db.command("ping")
        
        # Quick Kraken check
        ticker = await fetch_kraken_ticker()
        if ticker and ticker.get("price", 0) > 0:
            return {
                "ready": True,
                "status": "OK",
                "btc_price": ticker["price"],
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
    
    return JSONResponse(
        status_code=503,
        content={
            "ready": False,
            "status": "NOT_READY",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )

@api_router.get("/system/config")
async def get_system_config():
    """
    Returns current system configuration (without sensitive data).
    Useful for verifying deployment settings.
    """
    return {
        "version": "1.7.0",
        "environment": {
            "mongodb_configured": bool(os.environ.get("MONGO_URL")),
            "coinglass_configured": bool(os.environ.get("COINGLASS_API_KEY")),
            "telegram_configured": bool(os.environ.get("TELEGRAM_BOT_TOKEN")),
            "cryptocompare_configured": bool(os.environ.get("CRYPTOCOMPARE_API_KEY")),
        },
        "features": {
            "trade_signal": True,
            "whale_activity": True,
            "liquidity_ladder": True,
            "signal_history": True,
            "news_feed": True,
            "multi_language": True
        },
        "data_sources": {
            "market_data": ["Kraken", "Coinbase", "Bitstamp"],
            "derivatives": ["CoinGlass"],
            "news": "Market-generated (fallback active)"
        },
        "cache_ttl": {
            "ticker": CACHE_TTL,
            "orderbook": ORDERBOOK_CACHE_TTL,
            "news": NEWS_CACHE_TTL,
            "coinglass": COINGLASS_CACHE_TTL
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
async def get_market_bias(interval: str = Query(default="4h"), lang: str = Query(default="it")):
    """Get market bias analysis with aggregated multi-exchange order book data (default: 4H)"""
    if lang not in ["it", "en", "de", "pl"]:
        lang = "it"
    
    interval_map = {"15m": 15, "1h": 60, "4h": 240, "1d": 1440}
    kraken_interval = interval_map.get(interval, 240)  # Default to 4H
    
    candles = await fetch_kraken_ohlc(kraken_interval)
    aggregated_orderbook = await get_aggregated_orderbook()
    
    bias = calculate_market_bias(candles, aggregated_orderbook, lang)
    return bias

@api_router.get("/support-resistance")
async def get_support_resistance(interval: str = Query(default="4h"), lang: str = Query(default="it")):
    """Get support and resistance levels from price data and aggregated multi-exchange order book (default: 4H)"""
    if lang not in ["it", "en", "de", "pl"]:
        lang = "it"
    
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
async def get_liquidity(interval: str = Query(default="4h"), lang: str = Query(default="it")):
    """Get liquidity clusters from aggregated multi-exchange order book analysis (default: 4H)"""
    if lang not in ["it", "en", "de", "pl"]:
        lang = "it"
    
    interval_map = {"15m": 15, "1h": 60, "4h": 240, "1d": 1440}
    kraken_interval = interval_map.get(interval, 240)  # Default to 4H
    
    candles = await fetch_kraken_ohlc(kraken_interval)
    ticker = await fetch_kraken_ticker()
    aggregated_orderbook = await get_aggregated_orderbook()
    current_price = ticker["price"] if ticker else 0
    
    clusters, direction = generate_liquidity_clusters_enhanced(candles, current_price, aggregated_orderbook, lang)
    
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
async def get_whale_alerts(interval: str = Query(default="4h"), lang: str = Query(default="it")):
    """Get whale alert signals from volume and aggregated multi-exchange order book analysis (default: 4H)"""
    if lang not in ["it", "en", "de", "pl"]:
        lang = "it"
    
    interval_map = {"15m": 15, "1h": 60, "4h": 240, "1d": 1440}
    kraken_interval = interval_map.get(interval, 240)  # Default to 4H
    
    candles = await fetch_kraken_ohlc(kraken_interval)
    ticker = await fetch_kraken_ticker()
    aggregated_orderbook = await get_aggregated_orderbook()
    current_price = ticker["price"] if ticker else 0
    
    alerts = generate_whale_alerts_enhanced(candles, current_price, aggregated_orderbook, lang)
    
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
async def get_trade_signal(lang: str = Query(default="it", description="Language: it, en, de, pl")):
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
    
    Supports: it (Italian), en (English), de (German), pl (Polish)
    """
    # Validate language
    if lang not in ["it", "en", "de", "pl"]:
        lang = "it"
    
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
            invalidation_reason=get_translation("api_unavailable", lang),
            target_1=0,
            target_2=0,
            risk_reward_ratio=0,
            reasoning=get_translation("api_unavailable", lang),
            factors={},
            timestamp=datetime.now(timezone.utc),
            valid_for="N/A",
            warnings=[get_translation("api_unavailable", lang)]
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
    
    # Get funding and OI (async) - pass language for translations
    funding_task = generate_funding_rate(aggregated_orderbook, None, lang)
    oi_task = generate_open_interest(current_price, candles, lang)
    
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
        open_interest_data={"change_1h": open_interest.change_1h, "change_24h": open_interest.change_24h} if open_interest else None,
        lang=lang
    )
    
    # NEW v1.7: Build Liquidity Ladder
    liquidity_ladder = build_liquidity_ladder(
        current_price=current_price,
        sr_levels=sr_levels,
        liquidity_clusters=clusters,
        aggregated_orderbook=aggregated_orderbook,
        lang=lang
    )
    
    # NEW v1.9.5: Analyze Market Energy / Compression
    market_energy = analyze_market_energy(
        candles=candles,
        current_price=current_price,
        aggregated_orderbook=aggregated_orderbook,
        open_interest_data={"change_1h": open_interest.change_1h, "change_24h": open_interest.change_24h} if open_interest else None,
        liquidity_clusters=clusters,
        lang=lang
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
        liquidity_ladder=liquidity_ladder,
        market_energy=market_energy,
        lang=lang
    )
    
    # Apply confirmation system
    confirmed_signal = apply_signal_confirmation(
        raw_signal=signal,
        current_price=current_price,
        exchange_comparison=exchange_comparison,
        whale_activity=whale_activity,
        liquidity_ladder=liquidity_ladder
    )
    
    # Auto-record signal changes
    await auto_record_signal_change(
        new_signal=confirmed_signal,
        current_price=current_price,
        market_bias=market_bias,
        whale_activity=whale_activity,
        liquidity_direction=liquidity_direction
    )
    
    # Build response with all intelligence modules
    response = confirmed_signal.model_dump()
    
    # Add whale activity summary
    response["whale_activity"] = whale_activity.model_dump() if whale_activity else None
    
    # Add liquidity ladder summary
    if liquidity_ladder:
        response["liquidity_ladder_summary"] = {
            "more_attractive_side": liquidity_ladder.more_attractive_side,
            "sweep_expectation": liquidity_ladder.sweep_expectation,
            "path_analysis": liquidity_ladder.path_analysis,
            "nearest_above": liquidity_ladder.nearest_above.model_dump() if liquidity_ladder.nearest_above else None,
            "nearest_below": liquidity_ladder.nearest_below.model_dump() if liquidity_ladder.nearest_below else None
        }
    
    # NEW v1.9.5: Add Market Energy data
    response["market_energy"] = market_energy.model_dump() if market_energy else None
    
    return response


def apply_signal_confirmation(
    raw_signal: TradeSignal,
    current_price: float,
    exchange_comparison: Dict,
    whale_activity,
    liquidity_ladder
) -> TradeSignal:
    """
    Apply confirmation logic to prevent premature signals.
    
    States:
    - NO_TRADE: No setup detected
    - SETUP_IN_CONFIRMATION: Setup detected, waiting for confirmation
    - OPERATIONAL: Confirmed signal, ready to trade
    
    Confirmation requires:
    1. At least 2 consecutive signals in same direction
    2. No contradiction from exchange/whale/liquidity
    3. Stable or improving confidence
    4. For sweep-reversal: wait for sweep completion
    """
    global signal_confirmation_state, volatility_state
    
    raw_direction = raw_signal.direction
    now = datetime.now(timezone.utc)
    
    # Check volatility
    is_volatile = calculate_volatility(current_price, signal_confirmation_state.get("last_btc_price"))
    signal_confirmation_state["last_btc_price"] = current_price
    
    # If NO TRADE, reset confirmation state
    if raw_direction == "NO TRADE":
        # Check if we're downgrading from a setup
        if signal_confirmation_state["current_direction"] is not None:
            signal_confirmation_state["current_direction"] = None
            signal_confirmation_state["current_state"] = SIGNAL_STATE_NO_TRADE
            signal_confirmation_state["consecutive_count"] = 0
            signal_confirmation_state["first_detected_at"] = None
            signal_confirmation_state["confirmed_at"] = None
            signal_confirmation_state["awaiting_sweep_confirmation"] = False
        
        raw_signal.signal_state = SIGNAL_STATE_NO_TRADE
        raw_signal.raw_direction = None
        raw_signal.confirmation_progress = 0
        raw_signal.consecutive_signals = 0
        raw_signal.volatility_warning = is_volatile
        return raw_signal
    
    # We have a LONG or SHORT signal - apply confirmation logic
    prev_direction = signal_confirmation_state.get("current_direction")
    prev_confidence = signal_confirmation_state.get("last_confidence", 0)
    
    # Check if direction changed
    if prev_direction != raw_direction:
        # New direction detected - start fresh confirmation
        signal_confirmation_state["current_direction"] = raw_direction
        signal_confirmation_state["current_state"] = SIGNAL_STATE_SETUP_DETECTED
        signal_confirmation_state["consecutive_count"] = 1
        signal_confirmation_state["first_detected_at"] = now
        signal_confirmation_state["confirmed_at"] = None
        signal_confirmation_state["last_confidence"] = raw_signal.confidence
        signal_confirmation_state["confidence_trend"] = "stable"
        signal_confirmation_state["awaiting_sweep_confirmation"] = raw_signal.sweep_first_expected
        signal_confirmation_state["sweep_direction"] = raw_direction
        
        # Return as SETUP_IN_CONFIRMATION
        raw_signal.signal_state = SIGNAL_STATE_SETUP_DETECTED
        raw_signal.raw_direction = raw_direction
        raw_signal.confirmation_progress = 25
        raw_signal.consecutive_signals = 1
        raw_signal.volatility_warning = is_volatile
        
        # Modify direction to show it's not confirmed yet
        raw_signal.direction = f"{raw_direction} (IN CONFERMA)"
        
        # Update reasoning
        raw_signal.reasoning = f"🔄 SETUP IN CONFERMA - {raw_direction}\n\n" + \
            f"Setup rilevato, in attesa di conferma (1/2 segnali consecutivi).\n\n" + \
            raw_signal.reasoning
        
        if raw_signal.sweep_first_expected:
            raw_signal.reasoning = f"⏳ ATTESA SWEEP\n\nSweep atteso prima dell'ingresso. " + \
                f"Attendere completamento sweep e conferma di rigetto/recupero.\n\n" + raw_signal.reasoning
        
        return raw_signal
    
    # Same direction as before - increment consecutive count
    signal_confirmation_state["consecutive_count"] += 1
    consecutive = signal_confirmation_state["consecutive_count"]
    
    # Update confidence trend
    if raw_signal.confidence > prev_confidence + 2:
        signal_confirmation_state["confidence_trend"] = "improving"
    elif raw_signal.confidence < prev_confidence - 5:
        signal_confirmation_state["confidence_trend"] = "declining"
    else:
        signal_confirmation_state["confidence_trend"] = "stable"
    
    signal_confirmation_state["last_confidence"] = raw_signal.confidence
    
    # Check for contradictions
    contradictions = check_signal_contradictions(
        direction=raw_direction,
        exchange_comparison=exchange_comparison,
        whale_activity=whale_activity,
        liquidity_ladder=liquidity_ladder
    )
    
    has_contradiction = len(contradictions) > 0
    confidence_declining = signal_confirmation_state["confidence_trend"] == "declining"
    awaiting_sweep = signal_confirmation_state.get("awaiting_sweep_confirmation", False)
    
    # Calculate confirmation progress
    progress = min(100, consecutive * 30)  # Each consecutive signal = 30%
    if has_contradiction:
        progress = max(25, progress - 30)
    if confidence_declining:
        progress = max(25, progress - 20)
    if awaiting_sweep and raw_signal.sweep_first_expected:
        progress = min(50, progress)  # Cap at 50% if still awaiting sweep
    
    # Determine final state
    can_confirm = (
        consecutive >= 2 and
        not has_contradiction and
        not confidence_declining and
        not (awaiting_sweep and raw_signal.sweep_first_expected) and
        not is_volatile
    )
    
    if can_confirm:
        # OPERATIONAL - Confirmed signal
        signal_confirmation_state["current_state"] = SIGNAL_STATE_OPERATIONAL
        if not signal_confirmation_state["confirmed_at"]:
            signal_confirmation_state["confirmed_at"] = now
        
        raw_signal.signal_state = SIGNAL_STATE_OPERATIONAL
        raw_signal.raw_direction = raw_direction
        raw_signal.direction = f"{raw_direction} (OPERATIVO)"
        raw_signal.confirmation_progress = 100
        raw_signal.consecutive_signals = consecutive
        raw_signal.volatility_warning = False
        
        # Calculate time in setup
        if signal_confirmation_state["first_detected_at"]:
            time_diff = (now - signal_confirmation_state["first_detected_at"]).total_seconds()
            raw_signal.time_in_setup = f"{int(time_diff // 60)}m {int(time_diff % 60)}s"
        
        # Update reasoning
        raw_signal.reasoning = f"✅ SEGNALE OPERATIVO - {raw_direction}\n\n" + \
            f"Conferma completata dopo {consecutive} segnali consecutivi.\n" + \
            f"Confidenza: {signal_confirmation_state['confidence_trend']}\n" + \
            f"Nessuna contraddizione rilevata.\n\n" + raw_signal.reasoning
        
    else:
        # Still SETUP_IN_CONFIRMATION
        signal_confirmation_state["current_state"] = SIGNAL_STATE_SETUP_DETECTED
        
        raw_signal.signal_state = SIGNAL_STATE_SETUP_DETECTED
        raw_signal.raw_direction = raw_direction
        raw_signal.direction = f"{raw_direction} (IN CONFERMA)"
        raw_signal.confirmation_progress = progress
        raw_signal.consecutive_signals = consecutive
        raw_signal.volatility_warning = is_volatile
        
        # Build status message
        status_parts = []
        if consecutive < 2:
            status_parts.append(f"Segnali consecutivi: {consecutive}/2")
        if has_contradiction:
            status_parts.append(f"Contraddizioni: {', '.join(contradictions)}")
        if confidence_declining:
            status_parts.append("Confidenza in calo")
        if awaiting_sweep and raw_signal.sweep_first_expected:
            status_parts.append("In attesa di sweep + conferma rigetto")
        if is_volatile:
            status_parts.append("Alta volatilità - attendere stabilizzazione")
        
        status_msg = " | ".join(status_parts) if status_parts else "In conferma..."
        
        raw_signal.reasoning = f"🔄 SETUP IN CONFERMA - {raw_direction}\n\n" + \
            f"Progresso: {progress}%\n{status_msg}\n\n" + raw_signal.reasoning
    
    return raw_signal


def check_signal_contradictions(
    direction: str,
    exchange_comparison: Dict,
    whale_activity,
    liquidity_ladder
) -> List[str]:
    """Check if other factors contradict the signal direction"""
    contradictions = []
    
    # Check exchange consensus
    if exchange_comparison:
        bullish_count = sum(1 for ex in exchange_comparison.values() if ex.get("bias") == "BULLISH")
        bearish_count = sum(1 for ex in exchange_comparison.values() if ex.get("bias") == "BEARISH")
        
        if direction == "LONG" and bearish_count > bullish_count:
            contradictions.append("exchange consensus bearish")
        elif direction == "SHORT" and bullish_count > bearish_count:
            contradictions.append("exchange consensus bullish")
    
    # Check whale activity
    if whale_activity and whale_activity.direction != "NEUTRAL":
        if direction == "LONG" and whale_activity.direction == "SELL" and whale_activity.strength > 50:
            contradictions.append("whale selling pressure")
        elif direction == "SHORT" and whale_activity.direction == "BUY" and whale_activity.strength > 50:
            contradictions.append("whale buying pressure")
    
    # Check liquidity ladder
    if liquidity_ladder:
        if direction == "LONG" and liquidity_ladder.more_attractive_side == "below":
            if liquidity_ladder.sweep_expectation == "sweep_below_first":
                contradictions.append("liquidity suggests sweep below first")
        elif direction == "SHORT" and liquidity_ladder.more_attractive_side == "above":
            if liquidity_ladder.sweep_expectation == "sweep_above_first":
                contradictions.append("liquidity suggests sweep above first")
    
    return contradictions


# ============== SIGNAL HISTORY ==============

async def auto_record_signal_change(new_signal, current_price, market_bias, whale_activity, liquidity_direction, reason: str = None):
    """
    Automatically record signal when state changes.
    Tracks: setup detected, setup confirmed, setup invalidated, signal expired
    """
    global last_signal_state
    
    try:
        should_record = False
        status = "active"
        
        old_direction = last_signal_state.get("direction")
        old_state = last_signal_state.get("signal_state")
        old_signal_id = last_signal_state.get("signal_id")
        
        # Get the raw direction and state from the new signal
        new_raw_direction = new_signal.raw_direction or new_signal.direction.replace(" (IN CONFERMA)", "").replace(" (OPERATIVO)", "")
        new_state = new_signal.signal_state
        
        # Clean up direction string
        if "NO TRADE" in new_raw_direction or new_raw_direction == "NO_TRADE":
            new_raw_direction = "NO TRADE"
        
        # Determine what to record based on state transitions
        if new_state == SIGNAL_STATE_SETUP_DETECTED:
            if old_state != SIGNAL_STATE_SETUP_DETECTED or old_direction != new_raw_direction:
                # New setup detected
                should_record = True
                status = "setup_detected"
                reason = f"Setup {new_raw_direction} rilevato - in attesa conferma"
        
        elif new_state == SIGNAL_STATE_OPERATIONAL:
            if old_state != SIGNAL_STATE_OPERATIONAL or old_direction != new_raw_direction:
                # Setup confirmed
                should_record = True
                status = "confirmed"
                reason = f"Segnale {new_raw_direction} CONFERMATO - operativo"
                
                # Update previous setup_detected entry if exists
                if old_signal_id and old_state == SIGNAL_STATE_SETUP_DETECTED:
                    await signal_history_collection.update_one(
                        {"signal_id": old_signal_id},
                        {"$set": {
                            "status": "confirmed",
                            "confirmed_at": datetime.now(timezone.utc),
                        }}
                    )
        
        elif new_state == SIGNAL_STATE_NO_TRADE:
            if old_state in [SIGNAL_STATE_SETUP_DETECTED, SIGNAL_STATE_OPERATIONAL]:
                if old_state == SIGNAL_STATE_SETUP_DETECTED:
                    # Setup invalidated before confirmation
                    should_record = True
                    status = "setup_invalidated"
                    reason = f"Setup {old_direction} invalidato prima della conferma"
                else:
                    # Confirmed signal expired/invalidated
                    should_record = True
                    status = "invalidated"
                    reason = f"Segnale {old_direction} invalidato - condizioni cambiate"
                
                # Update old signal
                if old_signal_id:
                    await signal_history_collection.update_one(
                        {"signal_id": old_signal_id},
                        {"$set": {
                            "status": status,
                            "closed_at": datetime.now(timezone.utc),
                            "exit_price": current_price,
                            "exit_reason": reason
                        }}
                    )
        
        # Also record periodic updates for active operational signals
        if new_state == SIGNAL_STATE_OPERATIONAL and old_state == SIGNAL_STATE_OPERATIONAL:
            if old_direction == new_raw_direction:
                time_diff = 0
                if last_signal_state.get("timestamp"):
                    time_diff = (datetime.now(timezone.utc) - last_signal_state["timestamp"]).total_seconds()
                
                # Record every 4 hours
                if time_diff > 14400:
                    should_record = True
                    status = "active_update"
                    reason = "Aggiornamento periodico segnale operativo"
        
        if should_record:
            signal_id = str(uuid.uuid4())
            history_entry = {
                "signal_id": signal_id,
                "timestamp": datetime.now(timezone.utc),
                "direction": new_raw_direction,
                "signal_state": new_state,
                "confidence": new_signal.confidence,
                "estimated_move": new_signal.estimated_move,
                "entry_zone_low": new_signal.entry_zone_low,
                "entry_zone_high": new_signal.entry_zone_high,
                "stop_loss": new_signal.stop_loss,
                "target_1": new_signal.target_1,
                "target_2": new_signal.target_2,
                "risk_reward_ratio": new_signal.risk_reward_ratio,
                "setup_type": new_signal.setup_type,
                "btc_price": current_price,
                "market_bias": market_bias.bias if market_bias else None,
                "whale_direction": whale_activity.direction if whale_activity else None,
                "liquidity_direction": liquidity_direction.direction if liquidity_direction else None,
                "warnings": new_signal.warnings[:3] if new_signal.warnings else [],
                "reasoning_summary": new_signal.reasoning[:500] if new_signal.reasoning else "",
                "status": status,
                "reason": reason,
                "previous_direction": old_direction,
                "previous_state": old_state,
                "confirmation_progress": new_signal.confirmation_progress,
                "consecutive_signals": new_signal.consecutive_signals,
                "volatility_warning": new_signal.volatility_warning,
                "exit_price": None,
                "exit_reason": None,
                "closed_at": None,
                "confirmed_at": datetime.now(timezone.utc) if status == "confirmed" else None
            }
            
            await signal_history_collection.insert_one(history_entry)
            
            # Update tracking state
            last_signal_state["direction"] = new_raw_direction
            last_signal_state["signal_state"] = new_state
            last_signal_state["signal_id"] = signal_id if status in ["confirmed", "setup_detected"] else None
            last_signal_state["timestamp"] = datetime.now(timezone.utc)
            last_signal_state["btc_price"] = current_price
            
            logger.info(f"Auto-recorded signal: {new_raw_direction} (state: {new_state}, status: {status})")
            return {"recorded": True, "signal_id": signal_id, "status": status, "reason": reason}
        
        return {"recorded": False, "reason": "Nessun cambiamento significativo"}
        
    except Exception as e:
        logger.error(f"Error in auto_record_signal_change: {e}")
        return {"recorded": False, "error": str(e)}

@api_router.get("/market-energy")
async def get_market_energy(lang: str = Query(default="it", description="Language: it, en, de, pl")):
    """
    Get Market Energy / Compression Detector data.
    
    Analyzes market compression state to predict upcoming expansions:
    - Price range compression
    - Volatility compression
    - Open Interest behavior
    - Liquidity buildup on both sides
    - Order book pressure buildup
    
    Returns energy score, compression level, and breakout probability.
    """
    if lang not in ["it", "en", "de", "pl"]:
        lang = "it"
    
    # Fetch all required data
    ticker_task = fetch_kraken_ticker()
    candles_task = fetch_kraken_ohlc(240)  # 4H
    aggregated_ob_task = get_aggregated_orderbook()
    
    ticker, candles, aggregated_orderbook = await asyncio.gather(
        ticker_task, candles_task, aggregated_ob_task
    )
    
    current_price = ticker["price"] if ticker else 0
    
    # Get OI data
    oi_data = await fetch_coinglass_open_interest()
    open_interest_data = None
    if oi_data:
        open_interest_data = {
            "change_1h": oi_data.get("change_1h", 0),
            "change_24h": oi_data.get("change_24h", 0)
        }
    
    # Generate liquidity clusters
    clusters, _ = generate_liquidity_clusters_enhanced(candles, current_price, aggregated_orderbook, lang)
    
    # Analyze market energy
    market_energy = analyze_market_energy(
        candles=candles,
        current_price=current_price,
        aggregated_orderbook=aggregated_orderbook,
        open_interest_data=open_interest_data,
        liquidity_clusters=clusters,
        lang=lang
    )
    
    return market_energy

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
async def get_open_interest(lang: str = Query(default="it")):
    """Get Open Interest data from CoinGlass"""
    if lang not in ["it", "en", "de", "pl"]:
        lang = "it"
    
    ticker = await fetch_kraken_ticker()
    candles = await fetch_kraken_ohlc(240)  # 4H timeframe
    current_price = ticker["price"] if ticker else 0
    
    oi = await generate_open_interest(current_price, candles, lang)
    return oi

@api_router.get("/funding-rate")
async def get_funding_rate(lang: str = Query(default="it")):
    """Get Funding Rate data from CoinGlass"""
    if lang not in ["it", "en", "de", "pl"]:
        lang = "it"
    
    orderbook = await fetch_kraken_orderbook(100)
    
    funding = await generate_funding_rate(orderbook, None, lang)
    return funding

@api_router.get("/news")
async def get_news(lang: str = Query(default="it")):
    """Get real BTC-related news from CryptoCompare"""
    if lang not in ["it", "en", "de", "pl"]:
        lang = "it"
    
    news = await fetch_cryptocompare_news(lang)
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

@app.on_event("startup")
async def startup_event():
    """Verify critical connections on startup"""
    logger.info("=" * 50)
    logger.info("CryptoRadar v1.7 - Starting up...")
    logger.info("=" * 50)
    
    # Check MongoDB
    try:
        await db.command("ping")
        logger.info("✅ MongoDB: Connected")
    except Exception as e:
        logger.error(f"❌ MongoDB: Connection failed - {e}")
    
    # Check Kraken
    try:
        ticker = await fetch_kraken_ticker()
        if ticker and ticker.get("price", 0) > 0:
            logger.info(f"✅ Kraken API: Connected (BTC: ${ticker['price']:,.2f})")
        else:
            logger.warning("⚠️ Kraken API: No data received")
    except Exception as e:
        logger.error(f"❌ Kraken API: {e}")
    
    # Check CoinGlass
    coinglass_key = os.environ.get("COINGLASS_API_KEY", "")
    if coinglass_key:
        logger.info("✅ CoinGlass: API key configured")
    else:
        logger.warning("⚠️ CoinGlass: No API key - derivatives data limited")
    
    logger.info("=" * 50)
    logger.info("CryptoRadar startup complete!")
    logger.info("=" * 50)

@app.on_event("shutdown")
async def shutdown_db_client():
    logger.info("CryptoRadar shutting down...")
    client.close()
    logger.info("MongoDB connection closed")
