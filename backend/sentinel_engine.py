"""
THE SENTINEL - Autonomous Multi-Timeframe Pattern Detection Engine
====================================================================
Acts as the "Human Head" that never sleeps, monitoring all timeframes
and detecting chart patterns based on technical analysis psychology.

Pattern Types Detected:
- Head & Shoulders (H&S, Inverse H&S)
- Double/Triple Tops and Bottoms
- Triangles (Symmetrical, Ascending, Descending)
- Wedges (Rising, Falling)
- Flags and Pennants
- Elliott Wave Segments
- Support/Resistance Trendlines
- Candlestick Patterns (Engulfing, Doji, Hammer, etc.)

Each pattern includes:
- Cosa succede (What's happening)
- Perché (Why - Psychology)
- Azione (Action to take)
"""

import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum
import numpy as np

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# TIMEFRAME CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

class Timeframe(str, Enum):
    M15 = "15m"
    H1 = "1h"
    H4 = "4h"
    D1 = "1d"
    W1 = "1w"
    M1 = "1M"

TIMEFRAME_COLORS = {
    Timeframe.M15: "#00F0FF",   # Cyan - fastest
    Timeframe.H1: "#8B5CF6",    # Purple
    Timeframe.H4: "#00FF9D",    # Green
    Timeframe.D1: "#FFD700",    # Gold
    Timeframe.W1: "#FF6B35",    # Orange
    Timeframe.M1: "#FF1E56",    # Red - slowest
}

TIMEFRAME_WEIGHTS = {
    Timeframe.M15: 1,
    Timeframe.H1: 2,
    Timeframe.H4: 4,
    Timeframe.D1: 8,
    Timeframe.W1: 16,
    Timeframe.M1: 32,
}

# ═══════════════════════════════════════════════════════════════════════════════
# PATTERN TYPES
# ═══════════════════════════════════════════════════════════════════════════════

class PatternType(str, Enum):
    # Reversal Patterns
    HEAD_AND_SHOULDERS = "head_and_shoulders"
    INVERSE_HEAD_AND_SHOULDERS = "inverse_head_and_shoulders"
    DOUBLE_TOP = "double_top"
    DOUBLE_BOTTOM = "double_bottom"
    TRIPLE_TOP = "triple_top"
    TRIPLE_BOTTOM = "triple_bottom"
    
    # Continuation Patterns
    SYMMETRICAL_TRIANGLE = "symmetrical_triangle"
    ASCENDING_TRIANGLE = "ascending_triangle"
    DESCENDING_TRIANGLE = "descending_triangle"
    RISING_WEDGE = "rising_wedge"
    FALLING_WEDGE = "falling_wedge"
    BULL_FLAG = "bull_flag"
    BEAR_FLAG = "bear_flag"
    PENNANT = "pennant"
    
    # Support/Resistance
    SUPPORT_LINE = "support_line"
    RESISTANCE_LINE = "resistance_line"
    TRENDLINE_UP = "trendline_up"
    TRENDLINE_DOWN = "trendline_down"
    
    # Candlestick Patterns
    BULLISH_ENGULFING = "bullish_engulfing"
    BEARISH_ENGULFING = "bearish_engulfing"
    DOJI = "doji"
    HAMMER = "hammer"
    SHOOTING_STAR = "shooting_star"
    MORNING_STAR = "morning_star"
    EVENING_STAR = "evening_star"

PATTERN_BIAS = {
    PatternType.HEAD_AND_SHOULDERS: "BEARISH",
    PatternType.INVERSE_HEAD_AND_SHOULDERS: "BULLISH",
    PatternType.DOUBLE_TOP: "BEARISH",
    PatternType.DOUBLE_BOTTOM: "BULLISH",
    PatternType.TRIPLE_TOP: "BEARISH",
    PatternType.TRIPLE_BOTTOM: "BULLISH",
    PatternType.SYMMETRICAL_TRIANGLE: "NEUTRAL",
    PatternType.ASCENDING_TRIANGLE: "BULLISH",
    PatternType.DESCENDING_TRIANGLE: "BEARISH",
    PatternType.RISING_WEDGE: "BEARISH",
    PatternType.FALLING_WEDGE: "BULLISH",
    PatternType.BULL_FLAG: "BULLISH",
    PatternType.BEAR_FLAG: "BEARISH",
    PatternType.PENNANT: "NEUTRAL",
    PatternType.BULLISH_ENGULFING: "BULLISH",
    PatternType.BEARISH_ENGULFING: "BEARISH",
    PatternType.HAMMER: "BULLISH",
    PatternType.SHOOTING_STAR: "BEARISH",
    PatternType.MORNING_STAR: "BULLISH",
    PatternType.EVENING_STAR: "BEARISH",
}

# ═══════════════════════════════════════════════════════════════════════════════
# PSYCHOLOGICAL INTERPRETATIONS (La Mente del Trader)
# ═══════════════════════════════════════════════════════════════════════════════

PATTERN_PSYCHOLOGY = {
    PatternType.HEAD_AND_SHOULDERS: {
        "it": {
            "cosa_succede": "I compratori hanno tentato tre volte di spingere il prezzo più in alto, ma ogni tentativo è fallito. La 'testa' rappresenta l'euforia massima, le 'spalle' mostrano la perdita di momentum.",
            "perche": "La psicologia di massa passa dall'ottimismo alla paura. I late buyers (ritardatari) sono intrappolati in alto, e i venditori smart stanno distribuendo le loro posizioni.",
            "azione": "Preparati a posizioni SHORT quando il prezzo rompe la neckline. Target: distanza tra testa e neckline proiettata verso il basso."
        },
        "en": {
            "cosa_succede": "Buyers tried three times to push price higher but failed. The 'head' represents peak euphoria, 'shoulders' show loss of momentum.",
            "perche": "Mass psychology shifts from optimism to fear. Late buyers are trapped, smart sellers are distributing.",
            "azione": "Prepare SHORT when price breaks the neckline. Target: head-to-neckline distance projected downward."
        }
    },
    PatternType.INVERSE_HEAD_AND_SHOULDERS: {
        "it": {
            "cosa_succede": "I venditori hanno tentato tre volte di spingere il prezzo più in basso, ma ogni volta i compratori hanno difeso il livello. Questo è un pattern di accumulazione.",
            "perche": "I venditori si stanno esaurendo. Gli smart money stanno accumulando silenziosamente mentre il sentiment è ancora negativo.",
            "azione": "Preparati a posizioni LONG quando il prezzo rompe la neckline verso l'alto. Target: distanza tra testa e neckline proiettata verso l'alto."
        },
        "en": {
            "cosa_succede": "Sellers tried three times to push price lower but buyers defended each time. This is an accumulation pattern.",
            "perche": "Sellers are exhausting. Smart money is quietly accumulating while sentiment remains negative.",
            "azione": "Prepare LONG when price breaks the neckline upward. Target: head-to-neckline distance projected upward."
        }
    },
    PatternType.DOUBLE_TOP: {
        "it": {
            "cosa_succede": "Il prezzo ha testato lo stesso livello di resistenza due volte senza riuscire a superarlo. Questo indica una forte pressione di vendita.",
            "perche": "I venditori istituzionali stanno difendendo questo livello. I compratori che avevano aperto posizioni stanno iniziando a dubitare.",
            "azione": "SHORT quando il prezzo rompe il minimo tra i due massimi. Stop sopra i massimi. Target: altezza del pattern proiettata verso il basso."
        },
        "en": {
            "cosa_succede": "Price tested the same resistance level twice without breaking through. This indicates strong selling pressure.",
            "perche": "Institutional sellers are defending this level. Buyers who opened positions are starting to doubt.",
            "azione": "SHORT when price breaks the low between the two tops. Stop above tops. Target: pattern height projected downward."
        }
    },
    PatternType.DOUBLE_BOTTOM: {
        "it": {
            "cosa_succede": "Il prezzo ha testato lo stesso livello di supporto due volte senza romperlo. I compratori stanno accumulando a questo prezzo.",
            "perche": "Gli smart money vedono valore a questo livello. I venditori si stanno esaurendo e la pressione di vendita diminuisce.",
            "azione": "LONG quando il prezzo rompe il massimo tra i due minimi. Stop sotto i minimi. Target: altezza del pattern proiettata verso l'alto."
        },
        "en": {
            "cosa_succede": "Price tested the same support level twice without breaking. Buyers are accumulating at this price.",
            "perche": "Smart money sees value at this level. Sellers are exhausting and selling pressure is decreasing.",
            "azione": "LONG when price breaks the high between the two bottoms. Stop below lows. Target: pattern height projected upward."
        }
    },
    PatternType.SYMMETRICAL_TRIANGLE: {
        "it": {
            "cosa_succede": "Il mercato si sta comprimendo: i massimi sono più bassi e i minimi più alti. L'energia si accumula per un movimento esplosivo.",
            "perche": "Indecisione di massa. Né compratori né venditori hanno il controllo. Il breakout determinerà la direzione.",
            "azione": "Attendi il breakout con volume. LONG se rompe verso l'alto, SHORT se rompe verso il basso. Target: altezza del triangolo proiettata dal punto di breakout."
        },
        "en": {
            "cosa_succede": "Market is compressing: lower highs and higher lows. Energy is building for an explosive move.",
            "perche": "Mass indecision. Neither buyers nor sellers have control. Breakout will determine direction.",
            "azione": "Wait for breakout with volume. LONG if breaks up, SHORT if breaks down. Target: triangle height from breakout point."
        }
    },
    PatternType.ASCENDING_TRIANGLE: {
        "it": {
            "cosa_succede": "Minimi crescenti mentre il prezzo testa ripetutamente la stessa resistenza orizzontale. I compratori stanno guadagnando forza.",
            "perche": "Pressione di acquisto crescente. Ogni pullback trova compratori a livelli più alti. La resistenza sta per cedere.",
            "azione": "Preparati a LONG sul breakout della resistenza orizzontale. Stop sotto l'ultimo minimo crescente. Target: altezza del triangolo proiettata."
        },
        "en": {
            "cosa_succede": "Higher lows while price tests the same horizontal resistance. Buyers are gaining strength.",
            "perche": "Increasing buying pressure. Each pullback finds buyers at higher levels. Resistance is about to break.",
            "azione": "Prepare LONG on breakout of horizontal resistance. Stop below last higher low. Target: triangle height projected."
        }
    },
    PatternType.DESCENDING_TRIANGLE: {
        "it": {
            "cosa_succede": "Massimi decrescenti mentre il prezzo testa ripetutamente lo stesso supporto orizzontale. I venditori stanno guadagnando controllo.",
            "perche": "Pressione di vendita crescente. Ogni rimbalzo trova venditori a livelli più bassi. Il supporto sta per cedere.",
            "azione": "Preparati a SHORT sul breakdown del supporto orizzontale. Stop sopra l'ultimo massimo decrescente. Target: altezza del triangolo proiettata."
        },
        "en": {
            "cosa_succede": "Lower highs while price tests the same horizontal support. Sellers are gaining control.",
            "perche": "Increasing selling pressure. Each bounce finds sellers at lower levels. Support is about to break.",
            "azione": "Prepare SHORT on breakdown of horizontal support. Stop above last lower high. Target: triangle height projected."
        }
    },
    PatternType.RISING_WEDGE: {
        "it": {
            "cosa_succede": "Il prezzo sale in un canale che si restringe. Sembra bullish ma è un pattern di esaurimento - i compratori perdono forza.",
            "perche": "La salita rallenta. Ogni nuovo massimo richiede più sforzo. I compratori tardivi vengono attirati in una trappola.",
            "azione": "Preparati a SHORT quando il prezzo rompe la trendline inferiore del cuneo. Target: base del cuneo."
        },
        "en": {
            "cosa_succede": "Price rises in a narrowing channel. Looks bullish but is an exhaustion pattern - buyers losing strength.",
            "perche": "The rally is slowing. Each new high requires more effort. Late buyers are being trapped.",
            "azione": "Prepare SHORT when price breaks the lower trendline of the wedge. Target: base of wedge."
        }
    },
    PatternType.FALLING_WEDGE: {
        "it": {
            "cosa_succede": "Il prezzo scende in un canale che si restringe. Sembra bearish ma è un pattern di accumulazione - i venditori perdono forza.",
            "perche": "La discesa rallenta. Ogni nuovo minimo richiede più pressione di vendita. Gli smart money stanno accumulando.",
            "azione": "Preparati a LONG quando il prezzo rompe la trendline superiore del cuneo. Target: top del cuneo."
        },
        "en": {
            "cosa_succede": "Price falls in a narrowing channel. Looks bearish but is an accumulation pattern - sellers losing strength.",
            "perche": "The decline is slowing. Each new low requires more selling pressure. Smart money is accumulating.",
            "azione": "Prepare LONG when price breaks the upper trendline of the wedge. Target: top of wedge."
        }
    },
    PatternType.BULL_FLAG: {
        "it": {
            "cosa_succede": "Dopo un forte movimento rialzista (flagpole), il prezzo consolida in un piccolo canale discendente. Pausa prima della continuazione.",
            "perche": "I trader realizzano profitti parziali, ma non c'è vendita aggressiva. I compratori in attesa sono pronti a entrare.",
            "azione": "LONG sul breakout della flag. Stop sotto la flag. Target: altezza del flagpole proiettata dal breakout."
        },
        "en": {
            "cosa_succede": "After a strong bullish move (flagpole), price consolidates in a small descending channel. Pause before continuation.",
            "perche": "Traders taking partial profits, but no aggressive selling. Buyers waiting on sidelines ready to enter.",
            "azione": "LONG on flag breakout. Stop below flag. Target: flagpole height projected from breakout."
        }
    },
    PatternType.BEAR_FLAG: {
        "it": {
            "cosa_succede": "Dopo un forte movimento ribassista (flagpole), il prezzo consolida in un piccolo canale ascendente. Pausa prima della continuazione.",
            "perche": "I venditori ricaricano. Il rimbalzo non ha convinzione. I venditori in attesa sono pronti a entrare.",
            "azione": "SHORT sul breakdown della flag. Stop sopra la flag. Target: altezza del flagpole proiettata dal breakdown."
        },
        "en": {
            "cosa_succede": "After a strong bearish move (flagpole), price consolidates in a small ascending channel. Pause before continuation.",
            "perche": "Sellers reloading. The bounce lacks conviction. Sellers waiting on sidelines ready to enter.",
            "azione": "SHORT on flag breakdown. Stop above flag. Target: flagpole height projected from breakdown."
        }
    },
    PatternType.BULLISH_ENGULFING: {
        "it": {
            "cosa_succede": "Una candela verde completamente avvolge la precedente candela rossa. I compratori hanno preso il controllo completo.",
            "perche": "Cambio di sentiment improvviso. I venditori intrappolati ora devono coprire le posizioni, amplificando il movimento.",
            "azione": "Considera LONG con stop sotto il minimo della candela engulfing. Più efficace a livelli di supporto."
        },
        "en": {
            "cosa_succede": "A green candle completely engulfs the previous red candle. Buyers have taken complete control.",
            "perche": "Sudden sentiment change. Trapped sellers must now cover, amplifying the move.",
            "azione": "Consider LONG with stop below engulfing candle low. Most effective at support levels."
        }
    },
    PatternType.BEARISH_ENGULFING: {
        "it": {
            "cosa_succede": "Una candela rossa completamente avvolge la precedente candela verde. I venditori hanno preso il controllo completo.",
            "perche": "Cambio di sentiment improvviso. I compratori intrappolati ora devono vendere, amplificando il movimento.",
            "azione": "Considera SHORT con stop sopra il massimo della candela engulfing. Più efficace a livelli di resistenza."
        },
        "en": {
            "cosa_succede": "A red candle completely engulfs the previous green candle. Sellers have taken complete control.",
            "perche": "Sudden sentiment change. Trapped buyers must now sell, amplifying the move.",
            "azione": "Consider SHORT with stop above engulfing candle high. Most effective at resistance levels."
        }
    },
    PatternType.HAMMER: {
        "it": {
            "cosa_succede": "Candela con corpo piccolo in alto e lunga ombra inferiore. I venditori hanno spinto il prezzo giù ma i compratori lo hanno riportato su.",
            "perche": "Rifiuto del prezzo più basso. I compratori sono entrati aggressivamente alla ricerca di valore.",
            "azione": "LONG se confermato dalla candela successiva. Stop sotto l'ombra dell'hammer. Efficace dopo un downtrend."
        },
        "en": {
            "cosa_succede": "Candle with small body at top and long lower shadow. Sellers pushed price down but buyers brought it back up.",
            "perche": "Price rejection at lower levels. Buyers entered aggressively looking for value.",
            "azione": "LONG if confirmed by next candle. Stop below hammer shadow. Effective after a downtrend."
        }
    },
    PatternType.SHOOTING_STAR: {
        "it": {
            "cosa_succede": "Candela con corpo piccolo in basso e lunga ombra superiore. I compratori hanno spinto il prezzo su ma i venditori lo hanno riportato giù.",
            "perche": "Rifiuto del prezzo più alto. I venditori sono entrati aggressivamente vedendo il prezzo come sopravvalutato.",
            "azione": "SHORT se confermato dalla candela successiva. Stop sopra l'ombra della shooting star. Efficace dopo un uptrend."
        },
        "en": {
            "cosa_succede": "Candle with small body at bottom and long upper shadow. Buyers pushed price up but sellers brought it back down.",
            "perche": "Price rejection at higher levels. Sellers entered aggressively seeing price as overvalued.",
            "azione": "SHORT if confirmed by next candle. Stop above shooting star shadow. Effective after an uptrend."
        }
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# PATTERN DETECTION FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def detect_swing_points(prices: List[float], lookback: int = 5) -> Tuple[List[int], List[int]]:
    """Detect local highs and lows (swing points)"""
    highs = []
    lows = []
    
    for i in range(lookback, len(prices) - lookback):
        # Check if this is a local high
        is_high = True
        is_low = True
        
        for j in range(1, lookback + 1):
            if prices[i] < prices[i - j] or prices[i] < prices[i + j]:
                is_high = False
            if prices[i] > prices[i - j] or prices[i] > prices[i + j]:
                is_low = False
        
        if is_high:
            highs.append(i)
        if is_low:
            lows.append(i)
    
    return highs, lows

def detect_double_top(highs: List[float], high_indices: List[int], tolerance: float = 0.02) -> Optional[Dict]:
    """Detect double top pattern"""
    if len(high_indices) < 2:
        return None
    
    for i in range(len(high_indices) - 1):
        h1_idx = high_indices[i]
        h1_price = highs[h1_idx]
        
        for j in range(i + 1, len(high_indices)):
            h2_idx = high_indices[j]
            h2_price = highs[h2_idx]
            
            # Check if the two highs are within tolerance
            price_diff = abs(h1_price - h2_price) / h1_price
            if price_diff <= tolerance:
                # Calculate neckline (lowest point between the two highs)
                neckline_price = min(highs[h1_idx:h2_idx + 1])
                
                return {
                    "type": PatternType.DOUBLE_TOP,
                    "first_top": {"index": h1_idx, "price": h1_price},
                    "second_top": {"index": h2_idx, "price": h2_price},
                    "neckline": neckline_price,
                    "target": neckline_price - (h1_price - neckline_price),
                    "completion": 75 if h2_idx == high_indices[-1] else 100,
                    "bias": "BEARISH"
                }
    
    return None

def detect_double_bottom(lows: List[float], low_indices: List[int], tolerance: float = 0.02) -> Optional[Dict]:
    """Detect double bottom pattern"""
    if len(low_indices) < 2:
        return None
    
    for i in range(len(low_indices) - 1):
        l1_idx = low_indices[i]
        l1_price = lows[l1_idx]
        
        for j in range(i + 1, len(low_indices)):
            l2_idx = low_indices[j]
            l2_price = lows[l2_idx]
            
            # Check if the two lows are within tolerance
            price_diff = abs(l1_price - l2_price) / l1_price
            if price_diff <= tolerance:
                # Calculate neckline (highest point between the two lows)
                neckline_price = max(lows[l1_idx:l2_idx + 1])
                
                return {
                    "type": PatternType.DOUBLE_BOTTOM,
                    "first_bottom": {"index": l1_idx, "price": l1_price},
                    "second_bottom": {"index": l2_idx, "price": l2_price},
                    "neckline": neckline_price,
                    "target": neckline_price + (neckline_price - l1_price),
                    "completion": 75 if l2_idx == low_indices[-1] else 100,
                    "bias": "BULLISH"
                }
    
    return None

def detect_triangle(highs: List[float], lows: List[float], high_indices: List[int], low_indices: List[int]) -> Optional[Dict]:
    """Detect triangle patterns (symmetrical, ascending, descending)"""
    if len(high_indices) < 2 or len(low_indices) < 2:
        return None
    
    # Get last few swing points
    recent_highs = [(high_indices[i], highs[high_indices[i]]) for i in range(-3, 0) if i + len(high_indices) >= 0]
    recent_lows = [(low_indices[i], lows[low_indices[i]]) for i in range(-3, 0) if i + len(low_indices) >= 0]
    
    if len(recent_highs) < 2 or len(recent_lows) < 2:
        return None
    
    # Calculate trends
    high_trend = (recent_highs[-1][1] - recent_highs[0][1]) / (recent_highs[-1][0] - recent_highs[0][0] + 1)
    low_trend = (recent_lows[-1][1] - recent_lows[0][1]) / (recent_lows[-1][0] - recent_lows[0][0] + 1)
    
    # Determine triangle type
    if high_trend < -0.001 and low_trend > 0.001:
        # Converging lines - symmetrical triangle
        return {
            "type": PatternType.SYMMETRICAL_TRIANGLE,
            "upper_line": {"start": recent_highs[0], "end": recent_highs[-1]},
            "lower_line": {"start": recent_lows[0], "end": recent_lows[-1]},
            "apex_estimate": calculate_apex(recent_highs, recent_lows),
            "completion": calculate_triangle_completion(recent_highs, recent_lows),
            "bias": "NEUTRAL"
        }
    elif abs(high_trend) < 0.001 and low_trend > 0.001:
        # Flat top, rising bottom - ascending triangle
        return {
            "type": PatternType.ASCENDING_TRIANGLE,
            "resistance": recent_highs[-1][1],
            "lower_line": {"start": recent_lows[0], "end": recent_lows[-1]},
            "completion": calculate_triangle_completion(recent_highs, recent_lows),
            "bias": "BULLISH"
        }
    elif high_trend < -0.001 and abs(low_trend) < 0.001:
        # Falling top, flat bottom - descending triangle
        return {
            "type": PatternType.DESCENDING_TRIANGLE,
            "support": recent_lows[-1][1],
            "upper_line": {"start": recent_highs[0], "end": recent_highs[-1]},
            "completion": calculate_triangle_completion(recent_highs, recent_lows),
            "bias": "BEARISH"
        }
    
    return None

def calculate_apex(highs: List[Tuple], lows: List[Tuple]) -> int:
    """Estimate the index where triangle lines converge"""
    if len(highs) < 2 or len(lows) < 2:
        return highs[-1][0] + 10
    
    # Simple linear extrapolation
    h_slope = (highs[-1][1] - highs[0][1]) / (highs[-1][0] - highs[0][0] + 1)
    l_slope = (lows[-1][1] - lows[0][1]) / (lows[-1][0] - lows[0][0] + 1)
    
    if abs(h_slope - l_slope) < 0.0001:
        return highs[-1][0] + 20
    
    apex_index = int((lows[-1][1] - highs[-1][1]) / (h_slope - l_slope))
    return highs[-1][0] + apex_index

def calculate_triangle_completion(highs: List[Tuple], lows: List[Tuple]) -> int:
    """Estimate how complete the triangle pattern is (0-100)"""
    if len(highs) < 2 or len(lows) < 2:
        return 30
    
    # More touches = more complete
    touches = len(highs) + len(lows)
    base_completion = min(touches * 12, 70)
    
    # Closer to apex = more complete
    apex = calculate_apex(highs, lows)
    current = max(highs[-1][0], lows[-1][0])
    apex_distance = apex - current
    
    if apex_distance < 5:
        return min(base_completion + 25, 95)
    elif apex_distance < 10:
        return min(base_completion + 15, 85)
    
    return base_completion

def detect_candlestick_patterns(candles: List[Dict]) -> List[Dict]:
    """Detect candlestick patterns from OHLC data"""
    patterns = []
    
    if len(candles) < 3:
        return patterns
    
    for i in range(2, len(candles)):
        curr = candles[i]
        prev = candles[i - 1]
        
        # Calculate body and shadow sizes
        curr_body = abs(curr['close'] - curr['open'])
        curr_upper_shadow = curr['high'] - max(curr['open'], curr['close'])
        curr_lower_shadow = min(curr['open'], curr['close']) - curr['low']
        curr_range = curr['high'] - curr['low']
        
        prev_body = abs(prev['close'] - prev['open'])
        prev_is_bullish = prev['close'] > prev['open']
        curr_is_bullish = curr['close'] > curr['open']
        
        # Bullish Engulfing
        if not prev_is_bullish and curr_is_bullish:
            if curr['open'] < prev['close'] and curr['close'] > prev['open']:
                patterns.append({
                    "type": PatternType.BULLISH_ENGULFING,
                    "index": i,
                    "price": curr['close'],
                    "bias": "BULLISH",
                    "strength": min(curr_body / prev_body, 2.0)
                })
        
        # Bearish Engulfing
        if prev_is_bullish and not curr_is_bullish:
            if curr['open'] > prev['close'] and curr['close'] < prev['open']:
                patterns.append({
                    "type": PatternType.BEARISH_ENGULFING,
                    "index": i,
                    "price": curr['close'],
                    "bias": "BEARISH",
                    "strength": min(curr_body / prev_body, 2.0)
                })
        
        # Hammer (small body at top, long lower shadow)
        if curr_range > 0 and curr_body / curr_range < 0.3:
            if curr_lower_shadow > curr_body * 2 and curr_upper_shadow < curr_body * 0.5:
                patterns.append({
                    "type": PatternType.HAMMER,
                    "index": i,
                    "price": curr['close'],
                    "bias": "BULLISH",
                    "strength": curr_lower_shadow / curr_body
                })
        
        # Shooting Star (small body at bottom, long upper shadow)
        if curr_range > 0 and curr_body / curr_range < 0.3:
            if curr_upper_shadow > curr_body * 2 and curr_lower_shadow < curr_body * 0.5:
                patterns.append({
                    "type": PatternType.SHOOTING_STAR,
                    "index": i,
                    "price": curr['close'],
                    "bias": "BEARISH",
                    "strength": curr_upper_shadow / curr_body
                })
        
        # Doji (very small body)
        if curr_range > 0 and curr_body / curr_range < 0.1:
            patterns.append({
                "type": PatternType.DOJI,
                "index": i,
                "price": curr['close'],
                "bias": "NEUTRAL",
                "strength": 1 - (curr_body / curr_range)
            })
    
    return patterns

def detect_trendlines(prices: List[float], high_indices: List[int], low_indices: List[int]) -> List[Dict]:
    """Detect support and resistance trendlines"""
    trendlines = []
    
    # Detect support line from recent lows
    if len(low_indices) >= 2:
        recent_lows = low_indices[-3:] if len(low_indices) >= 3 else low_indices
        if len(recent_lows) >= 2:
            slope = (prices[recent_lows[-1]] - prices[recent_lows[0]]) / (recent_lows[-1] - recent_lows[0] + 1)
            
            if slope > 0.001:  # Rising support
                trendlines.append({
                    "type": PatternType.TRENDLINE_UP,
                    "start_index": recent_lows[0],
                    "start_price": prices[recent_lows[0]],
                    "end_index": recent_lows[-1],
                    "end_price": prices[recent_lows[-1]],
                    "slope": slope,
                    "touches": len(recent_lows),
                    "bias": "BULLISH"
                })
            else:
                trendlines.append({
                    "type": PatternType.SUPPORT_LINE,
                    "start_index": recent_lows[0],
                    "price": min(prices[i] for i in recent_lows),
                    "touches": len(recent_lows),
                    "bias": "NEUTRAL"
                })
    
    # Detect resistance line from recent highs
    if len(high_indices) >= 2:
        recent_highs = high_indices[-3:] if len(high_indices) >= 3 else high_indices
        if len(recent_highs) >= 2:
            slope = (prices[recent_highs[-1]] - prices[recent_highs[0]]) / (recent_highs[-1] - recent_highs[0] + 1)
            
            if slope < -0.001:  # Falling resistance
                trendlines.append({
                    "type": PatternType.TRENDLINE_DOWN,
                    "start_index": recent_highs[0],
                    "start_price": prices[recent_highs[0]],
                    "end_index": recent_highs[-1],
                    "end_price": prices[recent_highs[-1]],
                    "slope": slope,
                    "touches": len(recent_highs),
                    "bias": "BEARISH"
                })
            else:
                trendlines.append({
                    "type": PatternType.RESISTANCE_LINE,
                    "start_index": recent_highs[0],
                    "price": max(prices[i] for i in recent_highs),
                    "touches": len(recent_highs),
                    "bias": "NEUTRAL"
                })
    
    return trendlines

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN PATTERN SCANNER
# ═══════════════════════════════════════════════════════════════════════════════

class SentinelEngine:
    """The Sentinel - Autonomous Multi-Timeframe Pattern Detection"""
    
    def __init__(self):
        self.active_patterns: Dict[str, List[Dict]] = {}
        self.pattern_history: List[Dict] = []
        self.last_scan: Dict[str, datetime] = {}
        self.confluence_alerts: List[Dict] = []
    
    async def scan_timeframe(self, candles: List[Dict], timeframe: Timeframe) -> List[Dict]:
        """Scan a single timeframe for all patterns"""
        if len(candles) < 20:
            return []
        
        patterns = []
        
        # Extract price series
        closes = [c['close'] for c in candles]
        
        # Detect swing points
        high_indices, low_indices = detect_swing_points(closes, lookback=3)
        
        # Detect chart patterns
        double_top = detect_double_top(closes, high_indices)
        if double_top:
            double_top['timeframe'] = timeframe.value
            double_top['color'] = TIMEFRAME_COLORS[timeframe]
            double_top['weight'] = TIMEFRAME_WEIGHTS[timeframe]
            patterns.append(double_top)
        
        double_bottom = detect_double_bottom(closes, low_indices)
        if double_bottom:
            double_bottom['timeframe'] = timeframe.value
            double_bottom['color'] = TIMEFRAME_COLORS[timeframe]
            double_bottom['weight'] = TIMEFRAME_WEIGHTS[timeframe]
            patterns.append(double_bottom)
        
        triangle = detect_triangle(closes, closes, high_indices, low_indices)
        if triangle:
            triangle['timeframe'] = timeframe.value
            triangle['color'] = TIMEFRAME_COLORS[timeframe]
            triangle['weight'] = TIMEFRAME_WEIGHTS[timeframe]
            patterns.append(triangle)
        
        # Detect trendlines
        trendlines = detect_trendlines(closes, high_indices, low_indices)
        for tl in trendlines:
            tl['timeframe'] = timeframe.value
            tl['color'] = TIMEFRAME_COLORS[timeframe]
            tl['weight'] = TIMEFRAME_WEIGHTS[timeframe]
            patterns.append(tl)
        
        # Detect candlestick patterns
        candlestick_patterns = detect_candlestick_patterns(candles)
        for cp in candlestick_patterns:
            cp['timeframe'] = timeframe.value
            cp['color'] = TIMEFRAME_COLORS[timeframe]
            cp['weight'] = TIMEFRAME_WEIGHTS[timeframe]
            patterns.append(cp)
        
        self.last_scan[timeframe.value] = datetime.now(timezone.utc)
        return patterns
    
    def check_confluence(self, all_patterns: Dict[str, List[Dict]]) -> List[Dict]:
        """Check for pattern confluence across timeframes"""
        confluences = []
        
        # Group patterns by type
        pattern_groups = {}
        for tf, patterns in all_patterns.items():
            for p in patterns:
                ptype = p.get('type', 'unknown')
                if ptype not in pattern_groups:
                    pattern_groups[ptype] = []
                pattern_groups[ptype].append({**p, 'tf': tf})
        
        # Find confluent patterns (same bias across multiple timeframes)
        for ptype, patterns in pattern_groups.items():
            if len(patterns) >= 2:
                # Calculate combined weight
                total_weight = sum(p.get('weight', 1) for p in patterns)
                timeframes = list(set(p['tf'] for p in patterns))
                
                bias = PATTERN_BIAS.get(ptype, "NEUTRAL")
                
                confluences.append({
                    "pattern_type": ptype,
                    "timeframes": timeframes,
                    "total_weight": total_weight,
                    "confluence_score": min(total_weight / 10, 100),
                    "bias": bias,
                    "is_high_probability": total_weight >= 12,  # At least 1D + lower TF
                    "patterns": patterns
                })
        
        self.confluence_alerts = confluences
        return confluences
    
    def get_pattern_psychology(self, pattern_type: PatternType, language: str = "it") -> Dict:
        """Get psychological interpretation for a pattern"""
        if pattern_type in PATTERN_PSYCHOLOGY:
            return PATTERN_PSYCHOLOGY[pattern_type].get(language, PATTERN_PSYCHOLOGY[pattern_type]["it"])
        return {
            "cosa_succede": "Pattern rilevato ma interpretazione non disponibile.",
            "perche": "Analizza il contesto per comprendere la dinamica.",
            "azione": "Attendi conferma prima di agire."
        }
    
    def format_pattern_for_ui(self, pattern: Dict, current_price: float, language: str = "it") -> Dict:
        """Format a pattern for UI display with psychology"""
        ptype = pattern.get('type')
        if isinstance(ptype, PatternType):
            ptype_str = ptype.value
        else:
            ptype_str = str(ptype)
        
        psychology = self.get_pattern_psychology(ptype, language) if isinstance(ptype, PatternType) else {}
        
        # Calculate target and risk
        target = pattern.get('target')
        neckline = pattern.get('neckline')
        
        return {
            "id": f"{ptype_str}_{pattern.get('timeframe', 'unknown')}_{datetime.now().timestamp()}",
            "type": ptype_str,
            "type_display": ptype_str.replace('_', ' ').title(),
            "timeframe": pattern.get('timeframe', 'unknown'),
            "color": pattern.get('color', '#8B5CF6'),
            "bias": pattern.get('bias', 'NEUTRAL'),
            "completion": pattern.get('completion', 50),
            "weight": pattern.get('weight', 1),
            "target": target,
            "neckline": neckline,
            "current_price": current_price,
            "distance_to_target": ((target - current_price) / current_price * 100) if target else None,
            "psychology": psychology,
            "draw_data": self._extract_draw_data(pattern),
            "detected_at": datetime.now(timezone.utc).isoformat()
        }
    
    def _extract_draw_data(self, pattern: Dict) -> Dict:
        """Extract data needed to draw the pattern on chart"""
        ptype = pattern.get('type')
        draw_data = {"type": str(ptype)}
        
        if ptype in [PatternType.DOUBLE_TOP, PatternType.DOUBLE_BOTTOM]:
            draw_data["points"] = [
                pattern.get('first_top') or pattern.get('first_bottom'),
                pattern.get('second_top') or pattern.get('second_bottom')
            ]
            draw_data["neckline"] = pattern.get('neckline')
            draw_data["target"] = pattern.get('target')
            draw_data["shape"] = "horizontal_line"
        
        elif ptype in [PatternType.SYMMETRICAL_TRIANGLE, PatternType.ASCENDING_TRIANGLE, PatternType.DESCENDING_TRIANGLE]:
            draw_data["upper_line"] = pattern.get('upper_line')
            draw_data["lower_line"] = pattern.get('lower_line')
            draw_data["resistance"] = pattern.get('resistance')
            draw_data["support"] = pattern.get('support')
            draw_data["shape"] = "converging_lines"
        
        elif ptype in [PatternType.SUPPORT_LINE, PatternType.RESISTANCE_LINE]:
            draw_data["price"] = pattern.get('price')
            draw_data["shape"] = "horizontal_line"
        
        elif ptype in [PatternType.TRENDLINE_UP, PatternType.TRENDLINE_DOWN]:
            draw_data["start"] = {"index": pattern.get('start_index'), "price": pattern.get('start_price')}
            draw_data["end"] = {"index": pattern.get('end_index'), "price": pattern.get('end_price')}
            draw_data["shape"] = "diagonal_line"
        
        elif ptype in [PatternType.BULLISH_ENGULFING, PatternType.BEARISH_ENGULFING, 
                       PatternType.HAMMER, PatternType.SHOOTING_STAR, PatternType.DOJI]:
            draw_data["index"] = pattern.get('index')
            draw_data["price"] = pattern.get('price')
            draw_data["shape"] = "marker"
        
        return draw_data


# ═══════════════════════════════════════════════════════════════════════════════
# BACKGROUND SCANNING LOOP
# ═══════════════════════════════════════════════════════════════════════════════

class SentinelScanner:
    """
    Background scanner that monitors multiple timeframes and detects patterns.
    Runs autonomously, updating pattern cache for the frontend.
    """
    
    def __init__(self):
        self.sentinel = SentinelEngine()
        self.running = False
        self.task: Optional[asyncio.Task] = None
        self.last_scan_time: Dict[str, datetime] = {}
        self.scan_intervals = {
            Timeframe.M15: 60,      # Scan every 60 seconds
            Timeframe.H1: 120,      # Scan every 2 minutes
            Timeframe.H4: 300,      # Scan every 5 minutes
            Timeframe.D1: 600,      # Scan every 10 minutes
            Timeframe.W1: 1800,     # Scan every 30 minutes
            Timeframe.M1: 3600,     # Scan every hour
        }
        self.pattern_cache: Dict[str, List[Dict]] = {}
        self.confluence_cache: List[Dict] = []
        self.current_price: float = 0
        self.scan_count: int = 0
        self.error_count: int = 0
        
    async def start(self, fetch_candles_fn, fetch_price_fn):
        """Start the background scanning loop."""
        if self.running:
            logger.info("[SENTINEL] Scanner already running")
            return
        
        self.running = True
        self.fetch_candles = fetch_candles_fn
        self.fetch_price = fetch_price_fn
        self.task = asyncio.create_task(self._scan_loop())
        logger.info("[SENTINEL] 🔭 Scanner started - monitoring all timeframes")
        
    async def stop(self):
        """Stop the background scanning loop."""
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        logger.info("[SENTINEL] Scanner stopped")
        
    async def _scan_loop(self):
        """Main scanning loop - checks each timeframe at appropriate intervals."""
        while self.running:
            try:
                now = datetime.now(timezone.utc)
                
                # Fetch current price
                try:
                    ticker = await self.fetch_price()
                    if ticker and ticker.get("price"):
                        self.current_price = ticker["price"]
                except Exception as e:
                    logger.error(f"[SENTINEL] Price fetch error: {e}")
                
                # Scan each timeframe if interval elapsed
                for tf in Timeframe:
                    last_scan = self.last_scan_time.get(tf.value)
                    interval = self.scan_intervals[tf]
                    
                    if last_scan is None or (now - last_scan).total_seconds() >= interval:
                        await self._scan_timeframe(tf)
                        self.last_scan_time[tf.value] = now
                
                # Check confluence after all scans
                if self.pattern_cache:
                    self.confluence_cache = self.sentinel.check_confluence(self.pattern_cache)
                    if self.confluence_cache:
                        high_prob = [c for c in self.confluence_cache if c.get("is_high_probability")]
                        if high_prob:
                            logger.info(f"[SENTINEL] 🎯 HIGH PROBABILITY CONFLUENCE DETECTED: {len(high_prob)} setups")
                
                self.scan_count += 1
                
                # Sleep before next iteration
                await asyncio.sleep(30)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.error_count += 1
                logger.error(f"[SENTINEL] Scan loop error: {e}")
                await asyncio.sleep(60)
                
    async def _scan_timeframe(self, tf: Timeframe):
        """Scan a single timeframe for patterns."""
        try:
            # Map timeframe to Kraken interval
            interval_map = {
                Timeframe.M15: 15,
                Timeframe.H1: 60,
                Timeframe.H4: 240,
                Timeframe.D1: 1440,
                Timeframe.W1: 10080,
                Timeframe.M1: 43200,
            }
            
            kraken_interval = interval_map.get(tf, 60)
            candles = await self.fetch_candles(kraken_interval)
            
            if not candles or len(candles) < 20:
                logger.debug(f"[SENTINEL] Insufficient candles for {tf.value}")
                return
            
            # Convert to required format
            formatted_candles = []
            for c in candles:
                if isinstance(c, dict):
                    formatted_candles.append({
                        "time": c.get("time", 0),
                        "open": float(c.get("open", 0)),
                        "high": float(c.get("high", 0)),
                        "low": float(c.get("low", 0)),
                        "close": float(c.get("close", 0)),
                        "volume": float(c.get("volume", 0))
                    })
            
            if len(formatted_candles) < 20:
                return
            
            # Scan for patterns
            patterns = await self.sentinel.scan_timeframe(formatted_candles, tf)
            
            if patterns:
                # Format patterns for UI
                formatted_patterns = []
                for p in patterns:
                    formatted = self.sentinel.format_pattern_for_ui(p, self.current_price, "it")
                    formatted_patterns.append(formatted)
                
                self.pattern_cache[tf.value] = formatted_patterns
                logger.debug(f"[SENTINEL] {tf.value}: {len(patterns)} patterns detected")
            else:
                self.pattern_cache[tf.value] = []
                
        except Exception as e:
            logger.error(f"[SENTINEL] Error scanning {tf.value}: {e}")
            
    def get_all_patterns(self) -> List[Dict]:
        """Get all detected patterns across all timeframes."""
        all_patterns = []
        for tf, patterns in self.pattern_cache.items():
            all_patterns.extend(patterns)
        # Sort by weight (higher timeframe = more important)
        all_patterns.sort(key=lambda p: p.get("weight", 0), reverse=True)
        return all_patterns
    
    def get_confluences(self) -> List[Dict]:
        """Get detected confluences."""
        return self.confluence_cache
    
    def get_high_probability_setups(self) -> List[Dict]:
        """Get only high probability confluent setups."""
        return [c for c in self.confluence_cache if c.get("is_high_probability")]
    
    def get_status(self) -> Dict:
        """Get scanner status for API."""
        return {
            "running": self.running,
            "scan_count": self.scan_count,
            "error_count": self.error_count,
            "current_price": self.current_price,
            "patterns_detected": sum(len(p) for p in self.pattern_cache.values()),
            "confluences_active": len(self.confluence_cache),
            "high_probability_setups": len(self.get_high_probability_setups()),
            "last_scan_times": {k: v.isoformat() if v else None for k, v in self.last_scan_time.items()},
            "timeframes_monitored": [tf.value for tf in Timeframe]
        }
    
    def get_patterns_for_chart(self) -> Dict:
        """Get pattern draw data formatted for SVG/Canvas overlay."""
        chart_data = {
            "patterns": [],
            "trendlines": [],
            "markers": [],
            "zones": []
        }
        
        for tf, patterns in self.pattern_cache.items():
            for p in patterns:
                draw_data = p.get("draw_data", {})
                shape = draw_data.get("shape")
                
                if shape == "horizontal_line":
                    chart_data["zones"].append({
                        "type": p.get("type"),
                        "timeframe": tf,
                        "color": p.get("color"),
                        "price": draw_data.get("price") or draw_data.get("neckline"),
                        "target": draw_data.get("target"),
                        "bias": p.get("bias")
                    })
                    
                elif shape == "diagonal_line":
                    chart_data["trendlines"].append({
                        "type": p.get("type"),
                        "timeframe": tf,
                        "color": p.get("color"),
                        "start": draw_data.get("start"),
                        "end": draw_data.get("end"),
                        "bias": p.get("bias")
                    })
                    
                elif shape == "converging_lines":
                    chart_data["patterns"].append({
                        "type": p.get("type"),
                        "timeframe": tf,
                        "color": p.get("color"),
                        "upper_line": draw_data.get("upper_line"),
                        "lower_line": draw_data.get("lower_line"),
                        "resistance": draw_data.get("resistance"),
                        "support": draw_data.get("support"),
                        "bias": p.get("bias")
                    })
                    
                elif shape == "marker":
                    chart_data["markers"].append({
                        "type": p.get("type"),
                        "timeframe": tf,
                        "color": p.get("color"),
                        "index": draw_data.get("index"),
                        "price": draw_data.get("price"),
                        "bias": p.get("bias")
                    })
        
        return chart_data


# Global instances
sentinel = SentinelEngine()
sentinel_scanner = SentinelScanner()
