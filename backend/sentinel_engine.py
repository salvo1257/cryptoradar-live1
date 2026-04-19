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
    # ═══════════════════════════════════════════════════════════════════════════════
    # REVERSAL PATTERNS (15+)
    # ═══════════════════════════════════════════════════════════════════════════════
    HEAD_AND_SHOULDERS = "head_and_shoulders"
    INVERSE_HEAD_AND_SHOULDERS = "inverse_head_and_shoulders"
    DOUBLE_TOP = "double_top"
    DOUBLE_BOTTOM = "double_bottom"
    TRIPLE_TOP = "triple_top"
    TRIPLE_BOTTOM = "triple_bottom"
    DIAMOND_TOP = "diamond_top"
    DIAMOND_BOTTOM = "diamond_bottom"
    ROUNDING_BOTTOM = "rounding_bottom"
    ROUNDING_TOP = "rounding_top"
    BUMP_AND_RUN = "bump_and_run"
    ISLAND_REVERSAL_TOP = "island_reversal_top"
    ISLAND_REVERSAL_BOTTOM = "island_reversal_bottom"
    V_TOP = "v_top"
    V_BOTTOM = "v_bottom"
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # CONTINUATION PATTERNS (15+)
    # ═══════════════════════════════════════════════════════════════════════════════
    BULL_FLAG = "bull_flag"
    BEAR_FLAG = "bear_flag"
    PENNANT = "pennant"
    CUP_AND_HANDLE = "cup_and_handle"
    INVERTED_CUP_AND_HANDLE = "inverted_cup_and_handle"
    RECTANGLE_TOP = "rectangle_top"
    RECTANGLE_BOTTOM = "rectangle_bottom"
    PRICE_CHANNEL_UP = "price_channel_up"
    PRICE_CHANNEL_DOWN = "price_channel_down"
    SCALLOP_UP = "scallop_up"
    SCALLOP_DOWN = "scallop_down"
    MEASURED_MOVE_UP = "measured_move_up"
    MEASURED_MOVE_DOWN = "measured_move_down"
    THREE_DRIVES_UP = "three_drives_up"
    THREE_DRIVES_DOWN = "three_drives_down"
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # BILATERAL / TRIANGLE PATTERNS (10+)
    # ═══════════════════════════════════════════════════════════════════════════════
    SYMMETRICAL_TRIANGLE = "symmetrical_triangle"
    ASCENDING_TRIANGLE = "ascending_triangle"
    DESCENDING_TRIANGLE = "descending_triangle"
    RISING_WEDGE = "rising_wedge"
    FALLING_WEDGE = "falling_wedge"
    EXPANDING_TRIANGLE = "expanding_triangle"
    MEGAPHONE_BULLISH = "megaphone_bullish"
    MEGAPHONE_BEARISH = "megaphone_bearish"
    BROADENING_WEDGE_UP = "broadening_wedge_up"
    BROADENING_WEDGE_DOWN = "broadening_wedge_down"
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # SUPPORT/RESISTANCE
    # ═══════════════════════════════════════════════════════════════════════════════
    SUPPORT_LINE = "support_line"
    RESISTANCE_LINE = "resistance_line"
    TRENDLINE_UP = "trendline_up"
    TRENDLINE_DOWN = "trendline_down"
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # ADVANCED CANDLESTICK PATTERNS (10+)
    # ═══════════════════════════════════════════════════════════════════════════════
    BULLISH_ENGULFING = "bullish_engulfing"
    BEARISH_ENGULFING = "bearish_engulfing"
    DOJI = "doji"
    HAMMER = "hammer"
    INVERTED_HAMMER = "inverted_hammer"
    SHOOTING_STAR = "shooting_star"
    MORNING_STAR = "morning_star"
    EVENING_STAR = "evening_star"
    THREE_WHITE_SOLDIERS = "three_white_soldiers"
    THREE_BLACK_CROWS = "three_black_crows"
    ABANDONED_BABY_BULL = "abandoned_baby_bull"
    ABANDONED_BABY_BEAR = "abandoned_baby_bear"
    TWEEZER_TOP = "tweezer_top"
    TWEEZER_BOTTOM = "tweezer_bottom"
    PIERCING_LINE = "piercing_line"
    DARK_CLOUD_COVER = "dark_cloud_cover"
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # ELLIOTT WAVE PATTERNS
    # ═══════════════════════════════════════════════════════════════════════════════
    ELLIOTT_WAVE_1 = "elliott_wave_1"
    ELLIOTT_WAVE_2 = "elliott_wave_2"
    ELLIOTT_WAVE_3 = "elliott_wave_3"
    ELLIOTT_WAVE_4 = "elliott_wave_4"
    ELLIOTT_WAVE_5 = "elliott_wave_5"
    ELLIOTT_WAVE_A = "elliott_wave_a"
    ELLIOTT_WAVE_B = "elliott_wave_b"
    ELLIOTT_WAVE_C = "elliott_wave_c"
    ELLIOTT_IMPULSE = "elliott_impulse"
    ELLIOTT_CORRECTIVE = "elliott_corrective"
    
    # Fractal Sub-Waves
    ELLIOTT_SUBWAVE_1 = "elliott_subwave_1"
    ELLIOTT_SUBWAVE_2 = "elliott_subwave_2"
    ELLIOTT_SUBWAVE_3 = "elliott_subwave_3"
    ELLIOTT_SUBWAVE_4 = "elliott_subwave_4"
    ELLIOTT_SUBWAVE_5 = "elliott_subwave_5"
    ELLIOTT_SUBWAVE_A = "elliott_subwave_a"
    ELLIOTT_SUBWAVE_B = "elliott_subwave_b"
    ELLIOTT_SUBWAVE_C = "elliott_subwave_c"
    ELLIOTT_FRACTAL_COMPLETE = "elliott_fractal_complete"
    ELLIOTT_FRACTAL_INSIGHT = "elliott_fractal_insight"

PATTERN_BIAS = {
    # ═══════════════════════════════════════════════════════════════════════════════
    # REVERSAL PATTERNS
    # ═══════════════════════════════════════════════════════════════════════════════
    PatternType.HEAD_AND_SHOULDERS: "BEARISH",
    PatternType.INVERSE_HEAD_AND_SHOULDERS: "BULLISH",
    PatternType.DOUBLE_TOP: "BEARISH",
    PatternType.DOUBLE_BOTTOM: "BULLISH",
    PatternType.TRIPLE_TOP: "BEARISH",
    PatternType.TRIPLE_BOTTOM: "BULLISH",
    PatternType.DIAMOND_TOP: "BEARISH",
    PatternType.DIAMOND_BOTTOM: "BULLISH",
    PatternType.ROUNDING_BOTTOM: "BULLISH",
    PatternType.ROUNDING_TOP: "BEARISH",
    PatternType.BUMP_AND_RUN: "BEARISH",
    PatternType.ISLAND_REVERSAL_TOP: "BEARISH",
    PatternType.ISLAND_REVERSAL_BOTTOM: "BULLISH",
    PatternType.V_TOP: "BEARISH",
    PatternType.V_BOTTOM: "BULLISH",
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # CONTINUATION PATTERNS
    # ═══════════════════════════════════════════════════════════════════════════════
    PatternType.BULL_FLAG: "BULLISH",
    PatternType.BEAR_FLAG: "BEARISH",
    PatternType.PENNANT: "NEUTRAL",
    PatternType.CUP_AND_HANDLE: "BULLISH",
    PatternType.INVERTED_CUP_AND_HANDLE: "BEARISH",
    PatternType.RECTANGLE_TOP: "NEUTRAL",
    PatternType.RECTANGLE_BOTTOM: "NEUTRAL",
    PatternType.PRICE_CHANNEL_UP: "BULLISH",
    PatternType.PRICE_CHANNEL_DOWN: "BEARISH",
    PatternType.SCALLOP_UP: "BULLISH",
    PatternType.SCALLOP_DOWN: "BEARISH",
    PatternType.MEASURED_MOVE_UP: "BULLISH",
    PatternType.MEASURED_MOVE_DOWN: "BEARISH",
    PatternType.THREE_DRIVES_UP: "BEARISH",  # Reversal after 3rd drive
    PatternType.THREE_DRIVES_DOWN: "BULLISH",
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # BILATERAL / TRIANGLES
    # ═══════════════════════════════════════════════════════════════════════════════
    PatternType.SYMMETRICAL_TRIANGLE: "NEUTRAL",
    PatternType.ASCENDING_TRIANGLE: "BULLISH",
    PatternType.DESCENDING_TRIANGLE: "BEARISH",
    PatternType.RISING_WEDGE: "BEARISH",
    PatternType.FALLING_WEDGE: "BULLISH",
    PatternType.EXPANDING_TRIANGLE: "NEUTRAL",
    PatternType.MEGAPHONE_BULLISH: "BULLISH",
    PatternType.MEGAPHONE_BEARISH: "BEARISH",
    PatternType.BROADENING_WEDGE_UP: "BEARISH",
    PatternType.BROADENING_WEDGE_DOWN: "BULLISH",
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # CANDLESTICK PATTERNS
    # ═══════════════════════════════════════════════════════════════════════════════
    PatternType.BULLISH_ENGULFING: "BULLISH",
    PatternType.BEARISH_ENGULFING: "BEARISH",
    PatternType.DOJI: "NEUTRAL",
    PatternType.HAMMER: "BULLISH",
    PatternType.INVERTED_HAMMER: "BULLISH",
    PatternType.SHOOTING_STAR: "BEARISH",
    PatternType.MORNING_STAR: "BULLISH",
    PatternType.EVENING_STAR: "BEARISH",
    PatternType.THREE_WHITE_SOLDIERS: "BULLISH",
    PatternType.THREE_BLACK_CROWS: "BEARISH",
    PatternType.ABANDONED_BABY_BULL: "BULLISH",
    PatternType.ABANDONED_BABY_BEAR: "BEARISH",
    PatternType.TWEEZER_TOP: "BEARISH",
    PatternType.TWEEZER_BOTTOM: "BULLISH",
    PatternType.PIERCING_LINE: "BULLISH",
    PatternType.DARK_CLOUD_COVER: "BEARISH",
    
    # ═══════════════════════════════════════════════════════════════════════════════
    # ELLIOTT WAVES
    # ═══════════════════════════════════════════════════════════════════════════════
    PatternType.ELLIOTT_WAVE_1: "BULLISH",
    PatternType.ELLIOTT_WAVE_2: "BEARISH",
    PatternType.ELLIOTT_WAVE_3: "BULLISH",
    PatternType.ELLIOTT_WAVE_4: "BEARISH",
    PatternType.ELLIOTT_WAVE_5: "BULLISH",
    PatternType.ELLIOTT_WAVE_A: "BEARISH",
    PatternType.ELLIOTT_WAVE_B: "BULLISH",
    PatternType.ELLIOTT_WAVE_C: "BEARISH",
    PatternType.ELLIOTT_IMPULSE: "BULLISH",
    PatternType.ELLIOTT_CORRECTIVE: "BEARISH",
    PatternType.ELLIOTT_SUBWAVE_1: "BULLISH",
    PatternType.ELLIOTT_SUBWAVE_2: "BEARISH",
    PatternType.ELLIOTT_SUBWAVE_3: "BULLISH",
    PatternType.ELLIOTT_SUBWAVE_4: "BEARISH",
    PatternType.ELLIOTT_SUBWAVE_5: "BULLISH",
    PatternType.ELLIOTT_SUBWAVE_A: "BEARISH",
    PatternType.ELLIOTT_SUBWAVE_B: "BULLISH",
    PatternType.ELLIOTT_SUBWAVE_C: "BEARISH",
    PatternType.ELLIOTT_FRACTAL_COMPLETE: "NEUTRAL",
    PatternType.ELLIOTT_FRACTAL_INSIGHT: "NEUTRAL",
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
    },
    PatternType.DOJI: {
        "it": {
            "cosa_succede": "Candela con apertura e chiusura quasi identiche, formando una croce. Né compratori né venditori hanno vinto la battaglia.",
            "perche": "Indecisione totale del mercato. L'equilibrio tra domanda e offerta è perfetto. Spesso segnala un possibile cambio di direzione.",
            "azione": "NON entrare subito. Attendi la candela di conferma. Se appare dopo un trend, preparati per un'inversione. Più significativo a livelli di S/R."
        },
        "en": {
            "cosa_succede": "Candle with nearly identical open and close, forming a cross. Neither buyers nor sellers won the battle.",
            "perche": "Total market indecision. Perfect balance between supply and demand. Often signals potential direction change.",
            "azione": "DON'T enter immediately. Wait for confirmation candle. If appears after a trend, prepare for reversal. More significant at S/R levels."
        }
    },
    PatternType.MORNING_STAR: {
        "it": {
            "cosa_succede": "Pattern a tre candele: grande rossa, piccola (spesso Doji), grande verde. Rappresenta la transizione dalla notte (bearish) al giorno (bullish).",
            "perche": "La prima candela mostra dominio venditori. La seconda mostra esaurimento e indecisione. La terza conferma che i compratori hanno preso il controllo.",
            "azione": "LONG alla chiusura della terza candela o all'apertura successiva. Stop sotto il minimo del pattern. Target: altezza del pattern proiettata."
        },
        "en": {
            "cosa_succede": "Three-candle pattern: large red, small (often Doji), large green. Represents transition from night (bearish) to day (bullish).",
            "perche": "First candle shows seller dominance. Second shows exhaustion and indecision. Third confirms buyers have taken control.",
            "azione": "LONG at third candle close or next open. Stop below pattern low. Target: pattern height projected."
        }
    },
    PatternType.EVENING_STAR: {
        "it": {
            "cosa_succede": "Pattern a tre candele: grande verde, piccola (spesso Doji), grande rossa. Rappresenta la transizione dal giorno (bullish) alla notte (bearish).",
            "perche": "La prima candela mostra dominio compratori. La seconda mostra esaurimento e indecisione. La terza conferma che i venditori hanno preso il controllo.",
            "azione": "SHORT alla chiusura della terza candela o all'apertura successiva. Stop sopra il massimo del pattern. Target: altezza del pattern proiettata."
        },
        "en": {
            "cosa_succede": "Three-candle pattern: large green, small (often Doji), large red. Represents transition from day (bullish) to night (bearish).",
            "perche": "First candle shows buyer dominance. Second shows exhaustion and indecision. Third confirms sellers have taken control.",
            "azione": "SHORT at third candle close or next open. Stop above pattern high. Target: pattern height projected."
        }
    },
    # ═══════════════════════════════════════════════════════════════════════════════
    # ELLIOTT WAVE PSYCHOLOGY - La Mente del Trader
    # ═══════════════════════════════════════════════════════════════════════════════
    PatternType.ELLIOTT_WAVE_1: {
        "it": {
            "cosa_succede": "Onda 1: L'inizio di un nuovo trend. Il prezzo inizia a muoversi nella nuova direzione, spesso dopo un periodo di accumulazione o distribuzione.",
            "perche": "Solo gli early adopters e lo smart money riconoscono il cambiamento. La maggioranza è ancora scettica o bearish. Il volume è basso-medio.",
            "azione": "Fase difficile da tradare. Cerca conferme. Posizionamento iniziale con size ridotto. Stop sotto l'inizio dell'onda."
        },
        "en": {
            "cosa_succede": "Wave 1: The beginning of a new trend after accumulation/distribution.",
            "perche": "Only early adopters and smart money recognize the change. Majority still skeptical.",
            "azione": "Difficult to trade. Look for confirmation. Initial positioning with reduced size."
        }
    },
    PatternType.ELLIOTT_WAVE_2: {
        "it": {
            "cosa_succede": "Onda 2: Correzione dell'Onda 1. Il prezzo ritraccia parte del movimento iniziale, ma NON supera mai l'inizio dell'Onda 1.",
            "perche": "Profit-taking dai primi compratori. Gli scettici pensano che il trend sia finito. Regola: l'Onda 2 non ritraccia MAI il 100% dell'Onda 1.",
            "azione": "Zona ideale per entrare LONG. Cerca ritracciamenti verso zone di Liquidità o S/R storici. Stop sotto l'inizio dell'Onda 1."
        },
        "en": {
            "cosa_succede": "Wave 2: Retracement of Wave 1. Price retraces but NEVER exceeds Wave 1 start.",
            "perche": "Profit-taking from early buyers. Skeptics think the trend is over. Rule: Wave 2 NEVER retraces 100% of Wave 1.",
            "azione": "Ideal zone to enter LONG. Look for retracements to Liquidity zones or historical S/R. Stop below Wave 1 start."
        }
    },
    PatternType.ELLIOTT_WAVE_3: {
        "it": {
            "cosa_succede": "Onda 3: L'onda più POTENTE e lunga. Il trend è ora evidente a tutti. Volume esplosivo. Momentum massimo.",
            "perche": "La massa riconosce il trend e salta dentro. FOMO (Fear Of Missing Out) amplifica il movimento. I media parlano del trend. L'Onda 3 non è MAI la più corta delle onde impulsive.",
            "azione": "CAVALCA l'onda. Non uscire troppo presto. Aggiungi posizioni sui pullback. Target: prossimo Liquidity Wall o cluster di liquidazioni."
        },
        "en": {
            "cosa_succede": "Wave 3: The MOST POWERFUL and longest wave. Trend now obvious to everyone. Explosive volume.",
            "perche": "Mass recognizes trend and jumps in. FOMO amplifies the move. Media covers the trend. Wave 3 is NEVER the shortest impulse wave.",
            "azione": "RIDE the wave. Don't exit too early. Add on pullbacks. Target: next Liquidity Wall or liquidation cluster."
        }
    },
    PatternType.ELLIOTT_WAVE_4: {
        "it": {
            "cosa_succede": "Onda 4: Correzione laterale o triangolare. Il prezzo consolida i guadagni. Regola: l'Onda 4 NON entra MAI nel territorio dell'Onda 1.",
            "perche": "Presa di profitto da chi è entrato nell'Onda 3. Il mercato 'respira'. Spesso forma pattern triangolari o flags.",
            "azione": "HOLD le posizioni esistenti. Non shortare - il trend non è finito. Cerca setup per aggiungere nella parte bassa dell'Onda 4."
        },
        "en": {
            "cosa_succede": "Wave 4: Sideways or triangular correction. Rule: Wave 4 NEVER enters Wave 1 territory.",
            "perche": "Profit-taking from Wave 3 entrants. Market 'breathing'. Often forms triangles or flags.",
            "azione": "HOLD existing positions. Don't short - trend isn't over. Look to add at Wave 4 lows."
        }
    },
    PatternType.ELLIOTT_WAVE_5: {
        "it": {
            "cosa_succede": "Onda 5: L'onda FINALE dell'impulso. Ultimo push nella direzione del trend. Spesso con divergenze sui indicatori.",
            "perche": "Gli ultimi ritardatari entrano. Euforia massima (top) o disperazione massima (bottom). Smart money inizia a distribuire/accumulare per la direzione opposta.",
            "azione": "PREPARA L'USCITA. Cerca divergenze RSI/MACD. Prendi profitti parziali. Il trend sta per invertire verso A-B-C."
        },
        "en": {
            "cosa_succede": "Wave 5: The FINAL impulse wave. Last push in trend direction. Often shows indicator divergences.",
            "perche": "Last stragglers enter. Maximum euphoria (top) or despair (bottom). Smart money distributing/accumulating for reversal.",
            "azione": "PREPARE TO EXIT. Look for RSI/MACD divergences. Take partial profits. Trend about to reverse to A-B-C."
        }
    },
    PatternType.ELLIOTT_WAVE_A: {
        "it": {
            "cosa_succede": "Onda A: Inizio della correzione. Il prezzo inizia a muoversi CONTRO il trend precedente. Molti pensano sia solo un pullback.",
            "perche": "Lo smart money esce. La massa pensa sia un'opportunità di acquisto (in un top) o di vendita (in un bottom). Denial psicologico.",
            "azione": "ESCI dalle posizioni in trend. Non comprare il dip - è una trappola. Aspetta la fine dell'A-B-C per rientrare."
        },
        "en": {
            "cosa_succede": "Wave A: Correction begins. Price moves AGAINST the previous trend. Many think it's just a pullback.",
            "perche": "Smart money exiting. Mass thinks it's buying opportunity (at top) or selling opportunity (at bottom). Psychological denial.",
            "azione": "EXIT trend positions. Don't buy the dip - it's a trap. Wait for A-B-C completion to re-enter."
        }
    },
    PatternType.ELLIOTT_WAVE_B: {
        "it": {
            "cosa_succede": "Onda B: La 'trappola per tori/orsi'. Il prezzo rimbalza nella direzione del vecchio trend, dando falsa speranza.",
            "perche": "I ritardatari pensano che il trend sia ripreso. È l'ultimo tentativo di salvataggio. Volume tipicamente basso.",
            "azione": "NON ENTRARE. È una trappola. Il prezzo sta per crollare/esplodere nell'Onda C. Prepara posizioni contrarie."
        },
        "en": {
            "cosa_succede": "Wave B: The 'bull/bear trap'. Price bounces in old trend direction, giving false hope.",
            "perche": "Latecomers think trend has resumed. Last rescue attempt. Typically low volume.",
            "azione": "DO NOT ENTER. It's a trap. Price about to crash/explode in Wave C. Prepare contrary positions."
        }
    },
    PatternType.ELLIOTT_WAVE_C: {
        "it": {
            "cosa_succede": "Onda C: L'onda FINALE della correzione. Movimento potente che completa il pattern A-B-C. Spesso uguale o maggiore dell'Onda A in lunghezza.",
            "perche": "La realtà colpisce. Tutti coloro che hanno comprato in B sono intrappolati. Panic selling/buying. Capitolazione.",
            "azione": "Se sei fuori: ASPETTA la fine per entrare nel nuovo impulso. Se intrappolato: accetta la perdita o holda per il nuovo ciclo."
        },
        "en": {
            "cosa_succede": "Wave C: The FINAL correction wave. Powerful move completing A-B-C pattern. Often equals or exceeds Wave A in length.",
            "perche": "Reality hits. Everyone who bought in B is trapped. Panic selling/buying. Capitulation.",
            "azione": "If out: WAIT for end to enter new impulse. If trapped: accept loss or hold for new cycle."
        }
    },
    PatternType.ELLIOTT_IMPULSE: {
        "it": {
            "cosa_succede": "Impulso Elliott Completo (1-2-3-4-5). Un intero ciclo impulsivo è stato identificato. Il trend principale è chiaramente definito.",
            "perche": "L'intero ciclo psicologico delle masse si è completato: dal disinteresse iniziale (1) all'euforia finale (5).",
            "azione": "Prepara posizioni contrarie per il ciclo correttivo A-B-C. Il trend sta per invertire significativamente."
        },
        "en": {
            "cosa_succede": "Complete Elliott Impulse (1-2-3-4-5). An entire impulse cycle identified. Main trend clearly defined.",
            "perche": "The entire mass psychology cycle completed: from initial disinterest (1) to final euphoria (5).",
            "azione": "Prepare contrary positions for A-B-C corrective cycle. Trend about to reverse significantly."
        }
    },
    PatternType.ELLIOTT_CORRECTIVE: {
        "it": {
            "cosa_succede": "Correzione Elliott Completa (A-B-C). L'intero ciclo correttivo è terminato. Un nuovo impulso 1-2-3-4-5 sta per iniziare.",
            "perche": "Il mercato ha 'resettato' il sentiment. La capitolazione (C) ha pulito le mani deboli. Smart money accumulando.",
            "azione": "ENTRA nella direzione del nuovo impulso. Cerca conferme di inversione. Stop sotto/sopra la fine dell'Onda C."
        },
        "en": {
            "cosa_succede": "Complete Elliott Correction (A-B-C). Entire corrective cycle ended. New 1-2-3-4-5 impulse about to begin.",
            "perche": "Market has 'reset' sentiment. Capitulation (C) cleared weak hands. Smart money accumulating.",
            "azione": "ENTER in direction of new impulse. Look for reversal confirmation. Stop below/above Wave C end."
        }
    },
    # ═══════════════════════════════════════════════════════════════════════════════
    # FRACTAL SUB-WAVE PSYCHOLOGY - Onde dentro le Onde
    # ═══════════════════════════════════════════════════════════════════════════════
    PatternType.ELLIOTT_SUBWAVE_1: {
        "it": {
            "cosa_succede": "Sub-onda 1 del ciclo minore. L'inizio del micro-impulso dentro l'onda maggiore.",
            "perche": "Il momentum dell'onda maggiore inizia a manifestarsi nei timeframe più bassi. Gli scalper stanno entrando.",
            "azione": "Entry point per chi vuole cavalcare l'onda maggiore con timing preciso. Usa lo stop stretto del timeframe minore."
        },
        "en": {
            "cosa_succede": "Sub-wave 1 of minor cycle. The beginning of micro-impulse inside major wave.",
            "perche": "Major wave momentum starts manifesting in lower timeframes. Scalpers entering.",
            "azione": "Entry point for riding major wave with precise timing. Use tight stops from lower timeframe."
        }
    },
    PatternType.ELLIOTT_SUBWAVE_3: {
        "it": {
            "cosa_succede": "Sub-onda 3 - il CUORE del momentum. L'accelerazione massima dentro l'onda maggiore.",
            "perche": "Sia i trader del timeframe maggiore che quelli del minore stanno spingendo nella stessa direzione. Confluenza totale.",
            "azione": "AGGIUNGI posizioni. Questo è il momento di massimo momentum. Non uscire troppo presto!"
        },
        "en": {
            "cosa_succede": "Sub-wave 3 - the HEART of momentum. Maximum acceleration inside major wave.",
            "perche": "Both higher and lower timeframe traders pushing in same direction. Total confluence.",
            "azione": "ADD positions. This is peak momentum. Don't exit too early!"
        }
    },
    PatternType.ELLIOTT_SUBWAVE_5: {
        "it": {
            "cosa_succede": "Sub-onda 5 - completamento del micro-ciclo. L'onda maggiore sta per raggiungere un punto di svolta.",
            "perche": "Il momentum del timeframe minore si sta esaurendo. Questo spesso precede una correzione anche nel timeframe maggiore.",
            "azione": "PRENDI PROFITTI parziali. Il sub-ciclo sta finendo. Prepara trailing stop o scala l'uscita."
        },
        "en": {
            "cosa_succede": "Sub-wave 5 - micro-cycle completion. Major wave about to reach a turning point.",
            "perche": "Lower timeframe momentum exhausting. This often precedes correction in major timeframe too.",
            "azione": "TAKE PARTIAL PROFITS. Sub-cycle ending. Prepare trailing stop or scale exit."
        }
    },
    PatternType.ELLIOTT_FRACTAL_COMPLETE: {
        "it": {
            "cosa_succede": "Struttura Frattale Completa rilevata. Un intero ciclo 1-2-3-4-5 si è completato DENTRO un'onda di grado superiore.",
            "perche": "Questa è la prova definitiva che l'onda maggiore ha raggiunto la sua maturità. Il pattern si auto-replica su tutti i gradi.",
            "azione": "ALTA PROBABILITÀ di inversione o correzione imminente. Il timeframe maggiore sta per cambiare direzione."
        },
        "en": {
            "cosa_succede": "Complete Fractal Structure detected. An entire 1-2-3-4-5 cycle completed INSIDE a higher-degree wave.",
            "perche": "This is definitive proof the major wave has reached maturity. Pattern self-replicates across all degrees.",
            "azione": "HIGH PROBABILITY of imminent reversal or correction. Higher timeframe about to change direction."
        }
    },
    PatternType.ELLIOTT_FRACTAL_INSIGHT: {
        "it": {
            "cosa_succede": "Insight Frattale: Il timeframe minore sta confermando la struttura del timeframe maggiore.",
            "perche": "Quando le onde frattali si allineano, la probabilità del movimento aumenta esponenzialmente. Self-similarity in azione.",
            "azione": "Trade nella direzione confermata con alta fiducia. Usa il timeframe minore per entry, il maggiore per target."
        },
        "en": {
            "cosa_succede": "Fractal Insight: Lower timeframe is confirming higher timeframe structure.",
            "perche": "When fractal waves align, move probability increases exponentially. Self-similarity in action.",
            "azione": "Trade in confirmed direction with high confidence. Use lower TF for entry, higher for target."
        }
    },
    # ═══════════════════════════════════════════════════════════════════════════════
    # ADDITIONAL REVERSAL PATTERNS (50+ Library)
    # ═══════════════════════════════════════════════════════════════════════════════
    PatternType.DIAMOND_TOP: {
        "it": {
            "cosa_succede": "Il prezzo forma un pattern a diamante in cima: prima espande poi contrae. Massimi crescenti poi decrescenti.",
            "perche": "Volatilità che segnala distribuzione. Gli istituzionali stanno uscendo mentre i retail entrano.",
            "azione": "SHORT al breakdown della trendline inferiore. Stop sopra il diamante. Target: altezza del diamante."
        },
        "en": {
            "cosa_succede": "Price forms diamond pattern at top: first expanding then contracting.",
            "perche": "Volatility signaling distribution. Institutions exiting while retail enters.",
            "azione": "SHORT on lower trendline breakdown. Stop above diamond. Target: diamond height."
        }
    },
    PatternType.DIAMOND_BOTTOM: {
        "it": {
            "cosa_succede": "Il prezzo forma un pattern a diamante in basso: prima espande poi contrae.",
            "perche": "Capitolazione seguita da accumulazione. Smart money che accumula durante il caos.",
            "azione": "LONG al breakout della trendline superiore. Stop sotto il diamante. Target: altezza del diamante."
        },
        "en": {
            "cosa_succede": "Price forms diamond pattern at bottom: first expanding then contracting.",
            "perche": "Capitulation followed by accumulation. Smart money accumulating during chaos.",
            "azione": "LONG on upper trendline breakout. Stop below diamond. Target: diamond height."
        }
    },
    PatternType.ROUNDING_BOTTOM: {
        "it": {
            "cosa_succede": "Il prezzo forma una 'U' graduale. Cambio lento di sentiment da bearish a bullish.",
            "perche": "Accumulazione graduale. Il pessimismo si trasforma lentamente in ottimismo.",
            "azione": "LONG al breakout della neckline. Stop sotto il punto più basso. Target significativo."
        },
        "en": {
            "cosa_succede": "Price forms gradual 'U' shape. Slow sentiment change from bearish to bullish.",
            "perche": "Gradual accumulation. Pessimism slowly transforming to optimism.",
            "azione": "LONG on neckline breakout. Stop below lowest point. Significant target."
        }
    },
    PatternType.ROUNDING_TOP: {
        "it": {
            "cosa_succede": "Il prezzo forma una 'n' graduale. Cambio lento di sentiment da bullish a bearish.",
            "perche": "Distribuzione graduale. L'ottimismo si trasforma lentamente in pessimismo.",
            "azione": "SHORT al breakdown della neckline. Stop sopra il massimo. Target significativo."
        },
        "en": {
            "cosa_succede": "Price forms gradual 'n' shape. Slow sentiment change from bullish to bearish.",
            "perche": "Gradual distribution. Optimism slowly transforming to pessimism.",
            "azione": "SHORT on neckline breakdown. Stop above highest point. Significant target."
        }
    },
    PatternType.BUMP_AND_RUN: {
        "it": {
            "cosa_succede": "Trend accelerato (bump) seguito da crollo rapido dopo rottura della trendline.",
            "perche": "Speculazione eccessiva. Il mercato è diventato parabolico. Euforia seguita da panico.",
            "azione": "SHORT aggressivo quando il prezzo rompe la trendline. Stop sopra l'ultimo massimo."
        },
        "en": {
            "cosa_succede": "Accelerated trend (bump) followed by rapid collapse after trendline break.",
            "perche": "Excessive speculation. Market became parabolic. Euphoria followed by panic.",
            "azione": "Aggressive SHORT when price breaks trendline. Stop above last high."
        }
    },
    PatternType.ISLAND_REVERSAL_TOP: {
        "it": {
            "cosa_succede": "Gap up seguito da consolidamento, poi gap down. Il prezzo è 'intrappolato' su un'isola.",
            "perche": "Tutti i compratori sono intrappolati. Capitolazione immediata.",
            "azione": "SHORT immediato dopo il gap down. Stop sopra l'isola. Pattern raro ma affidabile."
        },
        "en": {
            "cosa_succede": "Gap up followed by consolidation, then gap down. Price 'trapped' on island.",
            "perche": "All buyers trapped. Immediate capitulation.",
            "azione": "Immediate SHORT after gap down. Stop above island. Rare but reliable."
        }
    },
    PatternType.ISLAND_REVERSAL_BOTTOM: {
        "it": {
            "cosa_succede": "Gap down seguito da consolidamento, poi gap up. Il prezzo è 'intrappolato' su un'isola.",
            "perche": "Tutti i venditori sono intrappolati. Short squeeze immediato.",
            "azione": "LONG immediato dopo il gap up. Stop sotto l'isola. Pattern raro ma affidabile."
        },
        "en": {
            "cosa_succede": "Gap down followed by consolidation, then gap up. Price 'trapped' on island.",
            "perche": "All sellers trapped. Immediate short squeeze.",
            "azione": "Immediate LONG after gap up. Stop below island. Rare but reliable."
        }
    },
    PatternType.V_TOP: {
        "it": {
            "cosa_succede": "Inversione improvvisa a V invertita. Nessuna consolidazione.",
            "perche": "Evento shock. Il mercato non ha tempo di processare. Reazione emotiva pura.",
            "azione": "SHORT con stop sopra il massimo. Gestisci il rischio - difficile da tradare."
        },
        "en": {
            "cosa_succede": "Sudden inverted V reversal. No consolidation.",
            "perche": "Shock event. Market has no time to process. Pure emotional reaction.",
            "azione": "SHORT with stop above high. Manage risk - difficult to trade."
        }
    },
    PatternType.V_BOTTOM: {
        "it": {
            "cosa_succede": "Inversione improvvisa a V. Nessuna consolidazione.",
            "perche": "Evento shock positivo o short squeeze violento. Reazione emotiva pura.",
            "azione": "LONG con stop sotto il minimo. Gestisci il rischio - difficile da tradare."
        },
        "en": {
            "cosa_succede": "Sudden V reversal. No consolidation.",
            "perche": "Positive shock event or violent short squeeze. Pure emotional reaction.",
            "azione": "LONG with stop below low. Manage risk - difficult to trade."
        }
    },
    PatternType.CUP_AND_HANDLE: {
        "it": {
            "cosa_succede": "Il prezzo forma una 'tazza' arrotondata seguita da piccolo consolidamento (manico).",
            "perche": "Accumulazione graduale nella tazza. Il manico è l'ultimo shakeout prima del breakout.",
            "azione": "LONG al breakout del manico. Stop sotto il fondo del manico. Target: profondità della tazza."
        },
        "en": {
            "cosa_succede": "Price forms rounded 'cup' followed by small consolidation (handle).",
            "perche": "Gradual accumulation in cup. Handle is last shakeout before breakout.",
            "azione": "LONG on handle breakout. Stop below handle bottom. Target: cup depth."
        }
    },
    PatternType.INVERTED_CUP_AND_HANDLE: {
        "it": {
            "cosa_succede": "Il prezzo forma una 'tazza' invertita seguita da piccolo consolidamento.",
            "perche": "Distribuzione graduale nella tazza invertita. Pattern di continuazione ribassista.",
            "azione": "SHORT al breakdown del manico. Stop sopra il top del manico. Target: profondità della tazza."
        },
        "en": {
            "cosa_succede": "Price forms inverted 'cup' followed by small consolidation.",
            "perche": "Gradual distribution in inverted cup. Bearish continuation.",
            "azione": "SHORT on handle breakdown. Stop above handle top. Target: cup depth."
        }
    },
    PatternType.RECTANGLE_TOP: {
        "it": {
            "cosa_succede": "Il prezzo oscilla tra S/R orizzontali dopo un uptrend. Distribuzione in corso.",
            "perche": "Gli istituzionali stanno scaricando posizioni ai retail.",
            "azione": "Attendi il breakdown per SHORT. Oppure compra supporto/vendi resistenza."
        },
        "en": {
            "cosa_succede": "Price oscillates between horizontal S/R after uptrend. Distribution.",
            "perche": "Institutions unloading to retail.",
            "azione": "Wait for breakdown to SHORT. Or buy support/sell resistance."
        }
    },
    PatternType.RECTANGLE_BOTTOM: {
        "it": {
            "cosa_succede": "Il prezzo oscilla tra S/R orizzontali dopo un downtrend. Accumulazione in corso.",
            "perche": "Gli istituzionali stanno accumulando posizioni dai retail in panico.",
            "azione": "Attendi il breakout per LONG. Oppure compra supporto/vendi resistenza."
        },
        "en": {
            "cosa_succede": "Price oscillates between horizontal S/R after downtrend. Accumulation.",
            "perche": "Institutions accumulating from panicking retail.",
            "azione": "Wait for breakout to LONG. Or buy support/sell resistance."
        }
    },
    PatternType.PRICE_CHANNEL_UP: {
        "it": {
            "cosa_succede": "Il prezzo si muove all'interno di due trendline parallele ascendenti.",
            "perche": "Trend sano e controllato. Equilibrio dinamico tra compratori e venditori.",
            "azione": "LONG ai test della trendline inferiore. Stop sotto. Target: trendline superiore."
        },
        "en": {
            "cosa_succede": "Price moves within two parallel ascending trendlines.",
            "perche": "Healthy controlled trend. Dynamic equilibrium.",
            "azione": "LONG on lower trendline tests. Stop below. Target: upper trendline."
        }
    },
    PatternType.PRICE_CHANNEL_DOWN: {
        "it": {
            "cosa_succede": "Il prezzo si muove all'interno di due trendline parallele discendenti.",
            "perche": "Trend sano e controllato. Equilibrio dinamico tra venditori e compratori.",
            "azione": "SHORT ai test della trendline superiore. Stop sopra. Target: trendline inferiore."
        },
        "en": {
            "cosa_succede": "Price moves within two parallel descending trendlines.",
            "perche": "Healthy controlled trend. Dynamic equilibrium.",
            "azione": "SHORT on upper trendline tests. Stop above. Target: lower trendline."
        }
    },
    PatternType.SCALLOP_UP: {
        "it": {
            "cosa_succede": "Serie di minimi arrotondati crescenti. Continuazione rialzista organica.",
            "perche": "Accumulazione ritmica. Ogni pullback è più alto del precedente.",
            "azione": "LONG sui pullback arrotondati. Stop sotto l'ultimo minimo."
        },
        "en": {
            "cosa_succede": "Series of rising rounded lows. Organic bullish continuation.",
            "perche": "Rhythmic accumulation. Each pullback higher than previous.",
            "azione": "LONG on rounded pullbacks. Stop below last low."
        }
    },
    PatternType.SCALLOP_DOWN: {
        "it": {
            "cosa_succede": "Serie di massimi arrotondati decrescenti. Continuazione ribassista organica.",
            "perche": "Distribuzione ritmica. Ogni rimbalzo è più basso del precedente.",
            "azione": "SHORT sui rimbalzi arrotondati. Stop sopra l'ultimo massimo."
        },
        "en": {
            "cosa_succede": "Series of falling rounded highs. Organic bearish continuation.",
            "perche": "Rhythmic distribution. Each bounce lower than previous.",
            "azione": "SHORT on rounded bounces. Stop above last high."
        }
    },
    PatternType.MEASURED_MOVE_UP: {
        "it": {
            "cosa_succede": "Due leg rialziste simmetriche separate da una correzione. AB = CD.",
            "perche": "Il mercato si muove in onde simmetriche. La seconda gamba 'misura' la prima.",
            "azione": "LONG all'inizio della seconda gamba. Target: lunghezza della prima gamba."
        },
        "en": {
            "cosa_succede": "Two symmetric bullish legs separated by correction. AB = CD.",
            "perche": "Market moves in symmetric waves. Second leg 'measures' the first.",
            "azione": "LONG at second leg start. Target: first leg length projected."
        }
    },
    PatternType.MEASURED_MOVE_DOWN: {
        "it": {
            "cosa_succede": "Due leg ribassiste simmetriche separate da una correzione. AB = CD.",
            "perche": "Il mercato si muove in onde simmetriche. La seconda gamba 'misura' la prima.",
            "azione": "SHORT all'inizio della seconda gamba. Target: lunghezza della prima gamba."
        },
        "en": {
            "cosa_succede": "Two symmetric bearish legs separated by correction. AB = CD.",
            "perche": "Market moves in symmetric waves. Second leg 'measures' the first.",
            "azione": "SHORT at second leg start. Target: first leg length projected."
        }
    },
    PatternType.THREE_DRIVES_UP: {
        "it": {
            "cosa_succede": "Tre massimi crescenti simmetrici. Spesso segnala esaurimento rialzista.",
            "perche": "Ogni drive rappresenta compratori sempre più deboli. Il terzo è l'ultimo sforzo.",
            "azione": "Attendi il terzo drive per SHORT. Stop sopra il terzo massimo."
        },
        "en": {
            "cosa_succede": "Three symmetric rising highs. Often signals bullish exhaustion.",
            "perche": "Each drive represents weaker buyers. Third is last effort.",
            "azione": "Wait for third drive to SHORT. Stop above third high."
        }
    },
    PatternType.THREE_DRIVES_DOWN: {
        "it": {
            "cosa_succede": "Tre minimi decrescenti simmetrici. Spesso segnala esaurimento ribassista.",
            "perche": "Ogni drive rappresenta venditori sempre più deboli. Il terzo è l'ultimo sforzo.",
            "azione": "Attendi il terzo drive per LONG. Stop sotto il terzo minimo."
        },
        "en": {
            "cosa_succede": "Three symmetric falling lows. Often signals bearish exhaustion.",
            "perche": "Each drive represents weaker sellers. Third is last effort.",
            "azione": "Wait for third drive to LONG. Stop below third low."
        }
    },
    PatternType.EXPANDING_TRIANGLE: {
        "it": {
            "cosa_succede": "Il prezzo forma massimi crescenti e minimi decrescenti. Volatilità in espansione.",
            "perche": "Incertezza crescente. Né compratori né venditori hanno il controllo.",
            "azione": "Attendi il breakout/breakdown confermato. Difficile tradare all'interno."
        },
        "en": {
            "cosa_succede": "Price forms higher highs and lower lows. Expanding volatility.",
            "perche": "Growing uncertainty. Neither buyers nor sellers in control.",
            "azione": "Wait for confirmed breakout/breakdown. Difficult to trade inside."
        }
    },
    PatternType.MEGAPHONE_BULLISH: {
        "it": {
            "cosa_succede": "Triangolo espansivo che si risolve verso l'alto. Ultimo massimo supera tutti.",
            "perche": "Dopo l'incertezza, i compratori vincono. L'ultimo swing attira FOMO.",
            "azione": "LONG al breakout del massimo precedente. Stop sotto l'ultimo minimo."
        },
        "en": {
            "cosa_succede": "Expanding triangle resolving upward. Last high exceeds all previous.",
            "perche": "After uncertainty, buyers win. Last swing attracts FOMO.",
            "azione": "LONG on previous high breakout. Stop below last low."
        }
    },
    PatternType.MEGAPHONE_BEARISH: {
        "it": {
            "cosa_succede": "Triangolo espansivo che si risolve verso il basso. Ultimo minimo rompe tutti.",
            "perche": "Dopo l'incertezza, i venditori vincono. L'ultimo swing attira panico.",
            "azione": "SHORT al breakdown del minimo precedente. Stop sopra l'ultimo massimo."
        },
        "en": {
            "cosa_succede": "Expanding triangle resolving downward. Last low breaks all previous.",
            "perche": "After uncertainty, sellers win. Last swing attracts panic.",
            "azione": "SHORT on previous low breakdown. Stop above last high."
        }
    },
    PatternType.BROADENING_WEDGE_UP: {
        "it": {
            "cosa_succede": "Cuneo che si espande verso l'alto. I massimi crescono più rapidamente dei minimi.",
            "perche": "Euforia crescente ma instabile. I compratori senza controllo.",
            "azione": "Prepara SHORT - pattern spesso precede inversione. Attendi esaurimento."
        },
        "en": {
            "cosa_succede": "Wedge expanding upward. Highs rising faster than lows.",
            "perche": "Growing but unstable euphoria. Buyers without control.",
            "azione": "Prepare SHORT - pattern often precedes reversal. Wait for exhaustion."
        }
    },
    PatternType.BROADENING_WEDGE_DOWN: {
        "it": {
            "cosa_succede": "Cuneo che si espande verso il basso. I minimi scendono più rapidamente dei massimi.",
            "perche": "Panico crescente ma instabile. I venditori senza controllo.",
            "azione": "Prepara LONG - pattern spesso precede inversione. Attendi esaurimento."
        },
        "en": {
            "cosa_succede": "Wedge expanding downward. Lows falling faster than highs.",
            "perche": "Growing but unstable panic. Sellers without control.",
            "azione": "Prepare LONG - pattern often precedes reversal. Wait for exhaustion."
        }
    },
    PatternType.INVERTED_HAMMER: {
        "it": {
            "cosa_succede": "Candela con corpo piccolo in basso e lunga ombra superiore, dopo downtrend.",
            "perche": "I compratori hanno provato a spingere su ma sono stati respinti. Però mostra interesse.",
            "azione": "LONG se confermato dalla candela successiva verde. Stop sotto il minimo."
        },
        "en": {
            "cosa_succede": "Candle with small body at bottom and long upper shadow, after downtrend.",
            "perche": "Buyers tried to push up but were pushed back. Shows interest though.",
            "azione": "LONG if confirmed by next green candle. Stop below low."
        }
    },
    PatternType.THREE_WHITE_SOLDIERS: {
        "it": {
            "cosa_succede": "Tre candele verdi consecutive con corpi pieni, ognuna chiude sopra la precedente.",
            "perche": "Dominio totale dei compratori per tre sessioni. Momentum inarrestabile.",
            "azione": "LONG aggressivo. Cerca pullback per entrare. Stop sotto la prima candela."
        },
        "en": {
            "cosa_succede": "Three consecutive green candles with full bodies, each closing above previous.",
            "perche": "Total buyer dominance for three sessions. Unstoppable momentum.",
            "azione": "Aggressive LONG. Look for pullbacks. Stop below first candle."
        }
    },
    PatternType.THREE_BLACK_CROWS: {
        "it": {
            "cosa_succede": "Tre candele rosse consecutive con corpi pieni, ognuna chiude sotto la precedente.",
            "perche": "Dominio totale dei venditori per tre sessioni. Panico inarrestabile.",
            "azione": "SHORT aggressivo. Cerca rimbalzi per entrare. Stop sopra la prima candela."
        },
        "en": {
            "cosa_succede": "Three consecutive red candles with full bodies, each closing below previous.",
            "perche": "Total seller dominance for three sessions. Unstoppable panic.",
            "azione": "Aggressive SHORT. Look for bounces. Stop above first candle."
        }
    },
    PatternType.ABANDONED_BABY_BULL: {
        "it": {
            "cosa_succede": "Candela rossa, seguita da doji in gap down, seguita da candela verde in gap up.",
            "perche": "Pattern molto raro. I gap mostrano cambio improvviso di sentiment.",
            "azione": "LONG immediato dopo conferma. Stop sotto il doji. Pattern estremamente affidabile."
        },
        "en": {
            "cosa_succede": "Red candle, gapped down doji, gapped up green candle.",
            "perche": "Very rare pattern. Gaps show sudden sentiment change.",
            "azione": "Immediate LONG after confirmation. Stop below doji. Extremely reliable."
        }
    },
    PatternType.ABANDONED_BABY_BEAR: {
        "it": {
            "cosa_succede": "Candela verde, seguita da doji in gap up, seguita da candela rossa in gap down.",
            "perche": "Pattern molto raro. I gap mostrano cambio improvviso di sentiment.",
            "azione": "SHORT immediato dopo conferma. Stop sopra il doji. Pattern estremamente affidabile."
        },
        "en": {
            "cosa_succede": "Green candle, gapped up doji, gapped down red candle.",
            "perche": "Very rare pattern. Gaps show sudden sentiment change.",
            "azione": "Immediate SHORT after confirmation. Stop above doji. Extremely reliable."
        }
    },
    PatternType.TWEEZER_TOP: {
        "it": {
            "cosa_succede": "Due o più candele con massimi identici o quasi. Resistenza forte testata.",
            "perche": "Il livello è difeso aggressivamente dai venditori.",
            "azione": "SHORT se il prezzo non riesce a superare. Stop sopra i massimi."
        },
        "en": {
            "cosa_succede": "Two or more candles with identical highs. Strong resistance tested.",
            "perche": "Level is aggressively defended by sellers.",
            "azione": "SHORT if price fails to break. Stop above highs."
        }
    },
    PatternType.TWEEZER_BOTTOM: {
        "it": {
            "cosa_succede": "Due o più candele con minimi identici o quasi. Supporto forte testato.",
            "perche": "Il livello è difeso aggressivamente dai compratori.",
            "azione": "LONG se il prezzo non riesce a rompere. Stop sotto i minimi."
        },
        "en": {
            "cosa_succede": "Two or more candles with identical lows. Strong support tested.",
            "perche": "Level is aggressively defended by buyers.",
            "azione": "LONG if price fails to break. Stop below lows."
        }
    },
    PatternType.PIERCING_LINE: {
        "it": {
            "cosa_succede": "Candela rossa grande seguita da candela verde che chiude sopra la metà della rossa.",
            "perche": "I compratori hanno assorbito la pressione di vendita. Cambio di momentum.",
            "azione": "LONG se confermato. Stop sotto il minimo. Efficace a supporti chiave."
        },
        "en": {
            "cosa_succede": "Large red candle followed by green closing above red's midpoint.",
            "perche": "Buyers absorbed selling pressure. Momentum change.",
            "azione": "LONG if confirmed. Stop below low. Effective at key supports."
        }
    },
    PatternType.DARK_CLOUD_COVER: {
        "it": {
            "cosa_succede": "Candela verde grande seguita da candela rossa che chiude sotto la metà della verde.",
            "perche": "I venditori hanno assorbito la pressione di acquisto. Cambio di momentum.",
            "azione": "SHORT se confermato. Stop sopra il massimo. Efficace a resistenze chiave."
        },
        "en": {
            "cosa_succede": "Large green candle followed by red closing below green's midpoint.",
            "perche": "Sellers absorbed buying pressure. Momentum change.",
            "azione": "SHORT if confirmed. Stop above high. Effective at key resistances."
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
# ELLIOTT WAVE DETECTION ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

def detect_elliott_waves(prices: List[float], high_indices: List[int], low_indices: List[int]) -> List[Dict]:
    """
    Detect Elliott Wave patterns following the three cardinal rules:
    1. Wave 2 never retraces more than 100% of Wave 1
    2. Wave 3 is never the shortest of waves 1, 3, and 5
    3. Wave 4 never enters the price territory of Wave 1
    
    Returns both impulse waves (1-2-3-4-5) and corrective waves (A-B-C)
    """
    waves = []
    
    if len(prices) < 30 or len(high_indices) < 4 or len(low_indices) < 4:
        return waves
    
    # Combine swing points and sort by index
    swing_points = []
    for idx in high_indices:
        if idx < len(prices):
            swing_points.append({
                "index": idx,
                "price": prices[idx],
                "type": "high"
            })
    for idx in low_indices:
        if idx < len(prices):
            swing_points.append({
                "index": idx,
                "price": prices[idx],
                "type": "low"
            })
    
    swing_points.sort(key=lambda x: x["index"])
    
    if len(swing_points) < 6:
        return waves
    
    # Detect Bullish Impulse (1-2-3-4-5)
    bullish_impulse = detect_bullish_impulse(swing_points, prices)
    if bullish_impulse:
        waves.extend(bullish_impulse)
    
    # Detect Bearish Impulse (inverted 1-2-3-4-5)
    bearish_impulse = detect_bearish_impulse(swing_points, prices)
    if bearish_impulse:
        waves.extend(bearish_impulse)
    
    # Detect Corrective A-B-C patterns
    corrective = detect_abc_correction(swing_points, prices)
    if corrective:
        waves.extend(corrective)
    
    # Determine current wave position for "Mentor" context
    if waves:
        current_wave = determine_current_wave_position(waves, prices)
        if current_wave:
            waves.append(current_wave)
    
    return waves


def detect_bullish_impulse(swing_points: List[Dict], prices: List[float]) -> List[Dict]:
    """Detect bullish Elliott impulse wave (1-2-3-4-5)"""
    waves = []
    
    # Look for pattern: low -> high -> higher_low -> higher_high -> low -> high
    # We need at least 6 swing points
    
    for i in range(len(swing_points) - 5):
        points = swing_points[i:i+6]
        
        # Check if pattern starts with low
        if points[0]["type"] != "low":
            continue
        
        # Extract potential wave points
        w0 = points[0]  # Start (Wave 0)
        w1_end = None
        w2_end = None
        w3_end = None
        w4_end = None
        w5_end = None
        
        # Find Wave 1 end (first high after start)
        for p in points[1:]:
            if p["type"] == "high" and p["price"] > w0["price"]:
                w1_end = p
                break
        
        if not w1_end:
            continue
        
        # Find Wave 2 end (low after Wave 1)
        remaining = [p for p in points if p["index"] > w1_end["index"]]
        for p in remaining:
            if p["type"] == "low":
                # Rule 1: Wave 2 must not retrace 100% of Wave 1
                wave1_height = w1_end["price"] - w0["price"]
                wave2_retracement = w1_end["price"] - p["price"]
                
                if wave2_retracement < wave1_height and p["price"] > w0["price"]:
                    w2_end = p
                    break
        
        if not w2_end:
            continue
        
        # Find Wave 3 end (high after Wave 2)
        remaining = [p for p in points if p["index"] > w2_end["index"]]
        for p in remaining:
            if p["type"] == "high" and p["price"] > w1_end["price"]:
                w3_end = p
                break
        
        if not w3_end:
            continue
        
        # Find Wave 4 end (low after Wave 3)
        remaining = [p for p in swing_points if p["index"] > w3_end["index"]]
        for p in remaining:
            if p["type"] == "low":
                # Rule 3: Wave 4 must not enter Wave 1 territory
                if p["price"] > w1_end["price"]:
                    w4_end = p
                    break
        
        if not w4_end:
            continue
        
        # Find Wave 5 end (high after Wave 4)
        remaining = [p for p in swing_points if p["index"] > w4_end["index"]]
        for p in remaining:
            if p["type"] == "high":
                w5_end = p
                break
        
        # Validate Rule 2: Wave 3 cannot be the shortest
        wave1_length = w1_end["price"] - w0["price"]
        wave3_length = w3_end["price"] - w2_end["price"]
        wave5_length = (w5_end["price"] - w4_end["price"]) if w5_end else 0
        
        if wave3_length < wave1_length or wave3_length < wave5_length:
            continue  # Wave 3 is shortest, invalid
        
        # Valid impulse found! Create wave patterns
        wave_color = "#9333EA"  # Deep Purple for Elliott
        
        waves.append({
            "type": PatternType.ELLIOTT_WAVE_1,
            "start": {"index": w0["index"], "price": w0["price"]},
            "end": {"index": w1_end["index"], "price": w1_end["price"]},
            "label": "1",
            "direction": "BULLISH",
            "color": wave_color,
            "length": wave1_length
        })
        
        waves.append({
            "type": PatternType.ELLIOTT_WAVE_2,
            "start": {"index": w1_end["index"], "price": w1_end["price"]},
            "end": {"index": w2_end["index"], "price": w2_end["price"]},
            "label": "2",
            "direction": "BEARISH",
            "color": wave_color,
            "retracement": (w1_end["price"] - w2_end["price"]) / wave1_length * 100 if wave1_length > 0 else 0
        })
        
        waves.append({
            "type": PatternType.ELLIOTT_WAVE_3,
            "start": {"index": w2_end["index"], "price": w2_end["price"]},
            "end": {"index": w3_end["index"], "price": w3_end["price"]},
            "label": "3",
            "direction": "BULLISH",
            "color": wave_color,
            "length": wave3_length,
            "is_extended": wave3_length > wave1_length * 1.5  # Extended wave based on price action (>150% of Wave 1)
        })
        
        waves.append({
            "type": PatternType.ELLIOTT_WAVE_4,
            "start": {"index": w3_end["index"], "price": w3_end["price"]},
            "end": {"index": w4_end["index"], "price": w4_end["price"]},
            "label": "4",
            "direction": "BEARISH",
            "color": wave_color
        })
        
        if w5_end:
            waves.append({
                "type": PatternType.ELLIOTT_WAVE_5,
                "start": {"index": w4_end["index"], "price": w4_end["price"]},
                "end": {"index": w5_end["index"], "price": w5_end["price"]},
                "label": "5",
                "direction": "BULLISH",
                "color": wave_color,
                "length": wave5_length,
                "is_truncated": w5_end["price"] < w3_end["price"]
            })
            
            # Complete impulse pattern
            waves.append({
                "type": PatternType.ELLIOTT_IMPULSE,
                "start": {"index": w0["index"], "price": w0["price"]},
                "end": {"index": w5_end["index"], "price": w5_end["price"]},
                "label": "1-5",
                "direction": "BULLISH",
                "color": wave_color,
                "completion": 100
            })
        
        # Only return first valid pattern found
        return waves
    
    return waves


def detect_bearish_impulse(swing_points: List[Dict], prices: List[float]) -> List[Dict]:
    """Detect bearish Elliott impulse wave (inverted 1-2-3-4-5)"""
    waves = []
    
    for i in range(len(swing_points) - 5):
        points = swing_points[i:i+6]
        
        # Check if pattern starts with high (bearish impulse)
        if points[0]["type"] != "high":
            continue
        
        w0 = points[0]  # Start
        w1_end = None
        w2_end = None
        w3_end = None
        w4_end = None
        w5_end = None
        
        # Find Wave 1 end (first low after start)
        for p in points[1:]:
            if p["type"] == "low" and p["price"] < w0["price"]:
                w1_end = p
                break
        
        if not w1_end:
            continue
        
        # Find Wave 2 end (high after Wave 1, must not exceed Wave 0)
        remaining = [p for p in points if p["index"] > w1_end["index"]]
        for p in remaining:
            if p["type"] == "high":
                wave1_height = w0["price"] - w1_end["price"]
                wave2_retracement = p["price"] - w1_end["price"]
                
                if wave2_retracement < wave1_height and p["price"] < w0["price"]:
                    w2_end = p
                    break
        
        if not w2_end:
            continue
        
        # Find Wave 3 end (low below Wave 1)
        remaining = [p for p in points if p["index"] > w2_end["index"]]
        for p in remaining:
            if p["type"] == "low" and p["price"] < w1_end["price"]:
                w3_end = p
                break
        
        if not w3_end:
            continue
        
        # Find Wave 4 end (high, must not enter Wave 1 territory)
        remaining = [p for p in swing_points if p["index"] > w3_end["index"]]
        for p in remaining:
            if p["type"] == "high":
                if p["price"] < w1_end["price"]:
                    w4_end = p
                    break
        
        if not w4_end:
            continue
        
        # Find Wave 5 end (low)
        remaining = [p for p in swing_points if p["index"] > w4_end["index"]]
        for p in remaining:
            if p["type"] == "low":
                w5_end = p
                break
        
        # Validate Rule 2
        wave1_length = w0["price"] - w1_end["price"]
        wave3_length = w2_end["price"] - w3_end["price"]
        wave5_length = (w4_end["price"] - w5_end["price"]) if w5_end else 0
        
        if wave3_length < wave1_length or wave3_length < wave5_length:
            continue
        
        wave_color = "#9333EA"  # Deep Purple
        
        # Create bearish waves
        waves.append({
            "type": PatternType.ELLIOTT_WAVE_1,
            "start": {"index": w0["index"], "price": w0["price"]},
            "end": {"index": w1_end["index"], "price": w1_end["price"]},
            "label": "1",
            "direction": "BEARISH",
            "color": wave_color,
            "length": wave1_length
        })
        
        waves.append({
            "type": PatternType.ELLIOTT_WAVE_2,
            "start": {"index": w1_end["index"], "price": w1_end["price"]},
            "end": {"index": w2_end["index"], "price": w2_end["price"]},
            "label": "2",
            "direction": "BULLISH",
            "color": wave_color
        })
        
        waves.append({
            "type": PatternType.ELLIOTT_WAVE_3,
            "start": {"index": w2_end["index"], "price": w2_end["price"]},
            "end": {"index": w3_end["index"], "price": w3_end["price"]},
            "label": "3",
            "direction": "BEARISH",
            "color": wave_color,
            "length": wave3_length,
            "is_extended": wave3_length > wave1_length * 1.5  # Extended wave based on price action (>150% of Wave 1)
        })
        
        waves.append({
            "type": PatternType.ELLIOTT_WAVE_4,
            "start": {"index": w3_end["index"], "price": w3_end["price"]},
            "end": {"index": w4_end["index"], "price": w4_end["price"]},
            "label": "4",
            "direction": "BULLISH",
            "color": wave_color
        })
        
        if w5_end:
            waves.append({
                "type": PatternType.ELLIOTT_WAVE_5,
                "start": {"index": w4_end["index"], "price": w4_end["price"]},
                "end": {"index": w5_end["index"], "price": w5_end["price"]},
                "label": "5",
                "direction": "BEARISH",
                "color": wave_color,
                "length": wave5_length
            })
            
            waves.append({
                "type": PatternType.ELLIOTT_IMPULSE,
                "start": {"index": w0["index"], "price": w0["price"]},
                "end": {"index": w5_end["index"], "price": w5_end["price"]},
                "label": "1-5",
                "direction": "BEARISH",
                "color": wave_color,
                "completion": 100
            })
        
        return waves
    
    return waves


def detect_abc_correction(swing_points: List[Dict], prices: List[float]) -> List[Dict]:
    """Detect A-B-C corrective pattern"""
    waves = []
    
    if len(swing_points) < 3:
        return waves
    
    # Look for recent A-B-C pattern
    for i in range(max(0, len(swing_points) - 6), len(swing_points) - 2):
        a_start = swing_points[i]
        
        # Find A wave end
        a_end = None
        for p in swing_points[i+1:]:
            if p["type"] != a_start["type"]:
                a_end = p
                break
        
        if not a_end:
            continue
        
        # Find B wave end
        b_end = None
        for p in swing_points:
            if p["index"] > a_end["index"] and p["type"] == a_start["type"]:
                b_end = p
                break
        
        if not b_end:
            continue
        
        # Find C wave end
        c_end = None
        for p in swing_points:
            if p["index"] > b_end["index"] and p["type"] == a_end["type"]:
                c_end = p
                break
        
        if not c_end:
            continue
        
        # Validate A-B-C
        a_length = abs(a_end["price"] - a_start["price"])
        b_length = abs(b_end["price"] - a_end["price"])
        c_length = abs(c_end["price"] - b_end["price"])
        
        # B should be smaller than A (retracement)
        if b_length >= a_length:
            continue
        
        wave_color = "#F59E0B"  # Gold for corrections
        is_bullish_correction = a_start["type"] == "high"  # Started from high = bearish correction
        
        waves.append({
            "type": PatternType.ELLIOTT_WAVE_A,
            "start": {"index": a_start["index"], "price": a_start["price"]},
            "end": {"index": a_end["index"], "price": a_end["price"]},
            "label": "A",
            "direction": "BEARISH" if is_bullish_correction else "BULLISH",
            "color": wave_color,
            "length": a_length
        })
        
        waves.append({
            "type": PatternType.ELLIOTT_WAVE_B,
            "start": {"index": a_end["index"], "price": a_end["price"]},
            "end": {"index": b_end["index"], "price": b_end["price"]},
            "label": "B",
            "direction": "BULLISH" if is_bullish_correction else "BEARISH",
            "color": wave_color,
            "retracement": b_length / a_length * 100 if a_length > 0 else 0
        })
        
        waves.append({
            "type": PatternType.ELLIOTT_WAVE_C,
            "start": {"index": b_end["index"], "price": b_end["price"]},
            "end": {"index": c_end["index"], "price": c_end["price"]},
            "label": "C",
            "direction": "BEARISH" if is_bullish_correction else "BULLISH",
            "color": wave_color,
            "length": c_length,
            "c_equals_a": abs(c_length - a_length) < a_length * 0.15,
            "c_extended": c_length > a_length * 1.5
        })
        
        waves.append({
            "type": PatternType.ELLIOTT_CORRECTIVE,
            "start": {"index": a_start["index"], "price": a_start["price"]},
            "end": {"index": c_end["index"], "price": c_end["price"]},
            "label": "A-B-C",
            "direction": "BEARISH" if is_bullish_correction else "BULLISH",
            "color": wave_color,
            "completion": 100
        })
        
        return waves
    
    return waves


def determine_current_wave_position(waves: List[Dict], prices: List[float]) -> Optional[Dict]:
    """Determine which wave we are currently in for Mentor context"""
    if not waves or not prices:
        return None
    
    current_index = len(prices) - 1
    
    # Find the most recent incomplete wave
    for wave in reversed(waves):
        if wave.get("end", {}).get("index", 0) >= current_index - 5:
            # We're near this wave
            return {
                "type": wave["type"],
                "current_position": "active",
                "direction": wave.get("direction", "NEUTRAL"),
                "label": wave.get("label", "?"),
                "color": wave.get("color", "#9333EA"),
                "mentor_context": True
            }
    
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# FRACTAL WAVE DETECTION - Waves Inside Waves
# ═══════════════════════════════════════════════════════════════════════════════

# Timeframe hierarchy for fractal analysis
FRACTAL_HIERARCHY = {
    Timeframe.M1: None,           # Monthly has no parent
    Timeframe.W1: Timeframe.M1,   # Weekly inside Monthly
    Timeframe.D1: Timeframe.W1,   # Daily inside Weekly
    Timeframe.H4: Timeframe.D1,   # 4H inside Daily
    Timeframe.H1: Timeframe.H4,   # 1H inside 4H
    Timeframe.M15: Timeframe.H1,  # 15M inside 1H
}

CHILD_TIMEFRAMES = {
    Timeframe.M1: [Timeframe.W1],
    Timeframe.W1: [Timeframe.D1],
    Timeframe.D1: [Timeframe.H4],
    Timeframe.H4: [Timeframe.H1, Timeframe.M15],
    Timeframe.H1: [Timeframe.M15],
    Timeframe.M15: [],
}


def detect_fractal_subwaves(
    parent_wave: Dict,
    parent_timeframe: Timeframe,
    child_waves: List[Dict],
    child_timeframe: Timeframe
) -> List[Dict]:
    """
    Detect sub-waves (fractal structure) inside a parent wave.
    
    Example: If 4H is in Wave 3, look for 1-2-3-4-5 inside it on 15M.
    
    Args:
        parent_wave: The major wave (e.g., Wave 3 on 4H)
        parent_timeframe: The timeframe of the parent wave
        child_waves: Detected waves on the lower timeframe
        child_timeframe: The lower timeframe to analyze
        
    Returns:
        List of sub-wave patterns with fractal relationships
    """
    fractal_patterns = []
    
    if not parent_wave or not child_waves:
        return fractal_patterns
    
    parent_start = parent_wave.get("start", {})
    parent_end = parent_wave.get("end", {})
    parent_label = parent_wave.get("label", "?")
    parent_direction = parent_wave.get("direction", "NEUTRAL")
    
    if not parent_start or not parent_end:
        return fractal_patterns
    
    # Filter child waves that fall within the parent wave's time range
    # (We use price range as a proxy since we have price data)
    parent_price_range = (
        min(parent_start.get("price", 0), parent_end.get("price", 0)),
        max(parent_start.get("price", 0), parent_end.get("price", 0))
    )
    
    # Find child waves that could be sub-waves
    potential_subwaves = []
    for cw in child_waves:
        cw_start = cw.get("start", {})
        cw_end = cw.get("end", {})
        
        # Check if this child wave is within the parent's domain
        if cw_start and cw_end:
            cw_prices = [cw_start.get("price", 0), cw_end.get("price", 0)]
            
            # Allow some tolerance for waves near the edges
            if any(parent_price_range[0] * 0.98 <= p <= parent_price_range[1] * 1.02 for p in cw_prices):
                potential_subwaves.append(cw)
    
    # Count complete sub-wave sequences (1-2-3-4-5 or A-B-C)
    subwave_labels = [sw.get("label", "") for sw in potential_subwaves]
    
    # Check for complete impulse (1,2,3,4,5)
    has_complete_impulse = all(str(i) in subwave_labels for i in range(1, 6))
    
    # Check for complete correction (A,B,C)
    has_complete_correction = all(letter in subwave_labels for letter in ["A", "B", "C"])
    
    # Sub-wave color (lighter version of parent timeframe color)
    subwave_color = TIMEFRAME_COLORS.get(child_timeframe, "#8B5CF6")
    
    # Create sub-wave patterns with parent relationship
    for i, sw in enumerate(potential_subwaves):
        sw_label = sw.get("label", "?")
        
        # Determine sub-wave type
        if sw_label in ["1", "2", "3", "4", "5"]:
            subwave_type = getattr(PatternType, f"ELLIOTT_SUBWAVE_{sw_label}", None)
        elif sw_label in ["A", "B", "C"]:
            subwave_type = getattr(PatternType, f"ELLIOTT_SUBWAVE_{sw_label}", None)
        else:
            continue
        
        if not subwave_type:
            continue
        
        fractal_pattern = {
            "type": subwave_type,
            "start": sw.get("start"),
            "end": sw.get("end"),
            "label": f"{sw_label}",
            "display_label": f"({sw_label})",  # Parentheses for sub-waves
            "direction": sw.get("direction", parent_direction),
            "color": subwave_color,
            "is_subwave": True,
            "parent_wave": {
                "label": parent_label,
                "timeframe": parent_timeframe.value,
                "direction": parent_direction
            },
            "child_timeframe": child_timeframe.value,
            "parent_timeframe": parent_timeframe.value,
            "fractal_depth": 1,  # Depth of nesting
            "weight": TIMEFRAME_WEIGHTS.get(child_timeframe, 1) * 0.5  # Half weight for sub-waves
        }
        
        fractal_patterns.append(fractal_pattern)
    
    # Generate Fractal Insight if we have complete sub-structure
    if has_complete_impulse or has_complete_correction:
        insight_type = "impulse" if has_complete_impulse else "correction"
        
        fractal_insight = {
            "type": PatternType.ELLIOTT_FRACTAL_COMPLETE,
            "parent_wave": {
                "label": parent_label,
                "timeframe": parent_timeframe.value,
                "direction": parent_direction
            },
            "child_timeframe": child_timeframe.value,
            "parent_timeframe": parent_timeframe.value,
            "subwave_type": insight_type,
            "subwave_count": 5 if has_complete_impulse else 3,
            "color": "#FFD700",  # Gold for complete fractal
            "is_fractal_complete": True,
            "mentor_insight": generate_fractal_mentor_insight(
                parent_label, 
                parent_timeframe.value,
                child_timeframe.value,
                insight_type,
                parent_direction
            ),
            "psychology": PATTERN_PSYCHOLOGY.get(PatternType.ELLIOTT_FRACTAL_COMPLETE, {}).get("it", {})
        }
        
        fractal_patterns.append(fractal_insight)
    
    return fractal_patterns


def generate_fractal_mentor_insight(
    parent_label: str,
    parent_tf: str,
    child_tf: str,
    subwave_type: str,
    parent_direction: str
) -> str:
    """Generate a Mentor-style fractal insight message."""
    
    direction_word = "rialzista" if parent_direction == "BULLISH" else "ribassista"
    action_word = "correzione" if parent_direction == "BULLISH" else "ripresa"
    
    if subwave_type == "impulse":
        return (
            f"🔮 FRACTAL INSIGHT: Un'Onda {parent_label} {direction_word} sul {parent_tf.upper()} "
            f"sta raggiungendo il completamento perché ho rilevato un ciclo completo di 5 sub-onde "
            f"sul {child_tf.upper()}. ALTA PROBABILITÀ di {action_word} imminente. "
            f"Il timeframe minore ha confermato la struttura maggiore."
        )
    else:
        return (
            f"🔮 FRACTAL INSIGHT: La correzione A-B-C sul {child_tf.upper()} all'interno dell'Onda {parent_label} "
            f"del {parent_tf.upper()} è completa. Il momentum {direction_word} dovrebbe riprendere. "
            f"Entry point ideale per continuare con il trend del timeframe maggiore."
        )


def analyze_fractal_structure(
    all_waves: Dict[str, List[Dict]],
    timeframes: List[Timeframe]
) -> List[Dict]:
    """
    Analyze complete fractal structure across all timeframes.
    
    This is the main entry point for fractal analysis.
    It looks at waves on higher timeframes and finds their
    sub-wave decomposition on lower timeframes.
    """
    fractal_results = []
    
    # Sort timeframes from highest to lowest
    sorted_tfs = sorted(timeframes, key=lambda tf: TIMEFRAME_WEIGHTS.get(tf, 0), reverse=True)
    
    for parent_tf in sorted_tfs:
        parent_waves = all_waves.get(parent_tf.value, [])
        
        if not parent_waves:
            continue
        
        # Get child timeframes for this parent
        child_tfs = CHILD_TIMEFRAMES.get(parent_tf, [])
        
        for child_tf in child_tfs:
            child_waves = all_waves.get(child_tf.value, [])
            
            if not child_waves:
                continue
            
            # Analyze each parent wave for sub-waves
            for parent_wave in parent_waves:
                # Only analyze impulsive waves (1, 3, 5) for sub-structure
                # as these have clearer internal structure
                label = parent_wave.get("label", "")
                if label not in ["1", "3", "5", "A", "C", "1-5", "A-B-C"]:
                    continue
                
                subwaves = detect_fractal_subwaves(
                    parent_wave,
                    parent_tf,
                    child_waves,
                    child_tf
                )
                
                if subwaves:
                    fractal_results.extend(subwaves)
    
    return fractal_results


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
        
        # Detect Elliott Waves (only on H4, D1, W1 for structure)
        if timeframe in [Timeframe.H4, Timeframe.D1, Timeframe.W1, Timeframe.H1]:
            elliott_waves = detect_elliott_waves(closes, high_indices, low_indices)
            for ew in elliott_waves:
                ew['timeframe'] = timeframe.value
                # Elliott waves keep their own purple/gold color
                ew['weight'] = TIMEFRAME_WEIGHTS[timeframe] * 2  # Double weight for Elliott
                ew['is_elliott'] = True
                patterns.append(ew)
        
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
            ptype_enum = ptype
        else:
            ptype_str = str(ptype)
            # Try to convert string to PatternType enum
            try:
                ptype_enum = PatternType(ptype_str)
            except ValueError:
                ptype_enum = None
        
        # Always try to get psychology
        psychology = {}
        if ptype_enum:
            psychology = self.get_pattern_psychology(ptype_enum, language)
        elif ptype_str:
            # Try direct lookup by string
            for pt in PatternType:
                if pt.value == ptype_str:
                    psychology = self.get_pattern_psychology(pt, language)
                    break
        
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
            # Extract start/end for proper chart anchoring
            first_point = pattern.get('first_top') or pattern.get('first_bottom')
            second_point = pattern.get('second_top') or pattern.get('second_bottom')
            
            draw_data["points"] = [first_point, second_point]
            draw_data["neckline"] = pattern.get('neckline')
            draw_data["target"] = pattern.get('target')
            draw_data["shape"] = "horizontal_line"
            
            # Add start/end for "glued-to-chart" anchoring
            if first_point and second_point:
                draw_data["start"] = {"index": first_point.get("index"), "price": first_point.get("price")}
                draw_data["end"] = {"index": second_point.get("index"), "price": second_point.get("price")}
                draw_data["price"] = pattern.get('neckline')  # Horizontal line at neckline
        
        elif ptype in [PatternType.TRIPLE_TOP, PatternType.TRIPLE_BOTTOM]:
            # Triple formations have 3 peaks
            peaks = pattern.get('peaks') or pattern.get('troughs') or []
            draw_data["peaks"] = peaks
            draw_data["neckline"] = pattern.get('neckline')
            draw_data["target"] = pattern.get('target')
            draw_data["shape"] = "horizontal_line"
            
            if len(peaks) >= 3:
                draw_data["start"] = {"index": peaks[0].get("index"), "price": peaks[0].get("price")}
                draw_data["end"] = {"index": peaks[-1].get("index"), "price": peaks[-1].get("price")}
                draw_data["price"] = pattern.get('neckline')
        
        elif ptype in [PatternType.SYMMETRICAL_TRIANGLE, PatternType.ASCENDING_TRIANGLE, PatternType.DESCENDING_TRIANGLE]:
            upper_line = pattern.get('upper_line')
            lower_line = pattern.get('lower_line')
            
            draw_data["upper_line"] = upper_line
            draw_data["lower_line"] = lower_line
            draw_data["resistance"] = pattern.get('resistance')
            draw_data["support"] = pattern.get('support')
            draw_data["shape"] = "converging_lines"
            
            # Extract start/end from line endpoints for anchoring
            if upper_line and lower_line:
                start_idx = min(
                    upper_line.get("start", [0])[0] if isinstance(upper_line.get("start"), list) else upper_line.get("start", {}).get("index", 0),
                    lower_line.get("start", [0])[0] if isinstance(lower_line.get("start"), list) else lower_line.get("start", {}).get("index", 0)
                )
                end_idx = max(
                    upper_line.get("end", [0])[0] if isinstance(upper_line.get("end"), list) else upper_line.get("end", {}).get("index", 0),
                    lower_line.get("end", [0])[0] if isinstance(lower_line.get("end"), list) else lower_line.get("end", {}).get("index", 0)
                )
                draw_data["start"] = {"index": start_idx, "price": pattern.get('resistance') or pattern.get('upper_line', {}).get('start', [0, 0])[1] if isinstance(pattern.get('upper_line', {}).get('start'), list) else 0}
                draw_data["end"] = {"index": end_idx, "price": pattern.get('support') or pattern.get('lower_line', {}).get('end', [0, 0])[1] if isinstance(pattern.get('lower_line', {}).get('end'), list) else 0}
        
        elif ptype in [PatternType.RISING_WEDGE, PatternType.FALLING_WEDGE]:
            upper_line = pattern.get('upper_line')
            lower_line = pattern.get('lower_line')
            
            draw_data["upper_line"] = upper_line
            draw_data["lower_line"] = lower_line
            draw_data["shape"] = "converging_lines"
            
            if upper_line and lower_line:
                draw_data["start"] = {"index": pattern.get('start_index', 0), "price": pattern.get('start_price', 0)}
                draw_data["end"] = {"index": pattern.get('end_index', 0), "price": pattern.get('end_price', 0)}
        
        elif ptype in [PatternType.SUPPORT_LINE, PatternType.RESISTANCE_LINE]:
            draw_data["price"] = pattern.get('price')
            draw_data["shape"] = "horizontal_line"
            # Full width horizontal line - no specific start/end needed
        
        elif ptype in [PatternType.TRENDLINE_UP, PatternType.TRENDLINE_DOWN]:
            draw_data["start"] = {"index": pattern.get('start_index'), "price": pattern.get('start_price')}
            draw_data["end"] = {"index": pattern.get('end_index'), "price": pattern.get('end_price')}
            draw_data["shape"] = "diagonal_line"
        
        elif ptype in [PatternType.BULLISH_ENGULFING, PatternType.BEARISH_ENGULFING, 
                       PatternType.HAMMER, PatternType.SHOOTING_STAR, PatternType.DOJI,
                       PatternType.MORNING_STAR, PatternType.EVENING_STAR,
                       PatternType.THREE_WHITE_SOLDIERS, PatternType.THREE_BLACK_CROWS]:
            draw_data["index"] = pattern.get('index')
            draw_data["price"] = pattern.get('price')
            draw_data["shape"] = "marker"
            # For markers, start = end (single candle position)
            draw_data["start"] = {"index": pattern.get('index'), "price": pattern.get('price')}
            draw_data["end"] = {"index": pattern.get('index'), "price": pattern.get('price')}
        
        # Elliott Wave patterns
        elif ptype in [PatternType.ELLIOTT_WAVE_1, PatternType.ELLIOTT_WAVE_2, 
                       PatternType.ELLIOTT_WAVE_3, PatternType.ELLIOTT_WAVE_4, 
                       PatternType.ELLIOTT_WAVE_5, PatternType.ELLIOTT_WAVE_A,
                       PatternType.ELLIOTT_WAVE_B, PatternType.ELLIOTT_WAVE_C]:
            draw_data["start"] = pattern.get('start')
            draw_data["end"] = pattern.get('end')
            draw_data["label"] = pattern.get('label')
            draw_data["direction"] = pattern.get('direction')
            draw_data["color"] = pattern.get('color', '#9333EA')  # Deep Purple
            draw_data["shape"] = "elliott_wave"
            draw_data["is_extended"] = pattern.get('is_extended', False)
            draw_data["is_truncated"] = pattern.get('is_truncated', False)
            draw_data["retracement"] = pattern.get('retracement')
        
        elif ptype in [PatternType.ELLIOTT_IMPULSE, PatternType.ELLIOTT_CORRECTIVE]:
            draw_data["start"] = pattern.get('start')
            draw_data["end"] = pattern.get('end')
            draw_data["label"] = pattern.get('label')
            draw_data["direction"] = pattern.get('direction')
            draw_data["color"] = pattern.get('color', '#9333EA')
            draw_data["shape"] = "elliott_complete"
            draw_data["completion"] = pattern.get('completion', 100)
        
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
        self.fractal_cache: List[Dict] = []  # Fractal sub-wave patterns
        self.fractal_enabled: bool = True     # Toggle for fractal analysis
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
                
                # Perform Fractal Analysis (waves inside waves)
                if self.pattern_cache and self.fractal_enabled:
                    await self._analyze_fractals()
                
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
    
    async def _analyze_fractals(self):
        """Analyze fractal structure - waves inside waves."""
        try:
            # Extract only Elliott waves from pattern cache
            elliott_waves = {}
            for tf, patterns in self.pattern_cache.items():
                tf_waves = [
                    p for p in patterns 
                    if p.get("is_elliott") or "elliott" in str(p.get("type", "")).lower()
                ]
                if tf_waves:
                    elliott_waves[tf] = tf_waves
            
            if not elliott_waves:
                self.fractal_cache = []
                return
            
            # Perform fractal analysis
            fractal_patterns = analyze_fractal_structure(
                elliott_waves,
                list(Timeframe)
            )
            
            if fractal_patterns:
                # Format fractal patterns for UI
                formatted_fractals = []
                for fp in fractal_patterns:
                    formatted = self._format_fractal_for_ui(fp)
                    formatted_fractals.append(formatted)
                
                self.fractal_cache = formatted_fractals
                
                # Log fractal insights
                complete_fractals = [f for f in fractal_patterns if f.get("is_fractal_complete")]
                if complete_fractals:
                    logger.info(f"[SENTINEL] 🔮 FRACTAL STRUCTURE COMPLETE: {len(complete_fractals)} nested cycles detected")
            else:
                self.fractal_cache = []
                
        except Exception as e:
            logger.error(f"[SENTINEL] Fractal analysis error: {e}")
            self.fractal_cache = []
    
    def _format_fractal_for_ui(self, fractal: Dict) -> Dict:
        """Format a fractal pattern for frontend display."""
        ftype = fractal.get("type")
        parent = fractal.get("parent_wave", {})
        
        # Get psychology if available
        psychology = {}
        if ftype and ftype in PATTERN_PSYCHOLOGY:
            psychology = PATTERN_PSYCHOLOGY[ftype].get("it", {})
        
        return {
            "type": ftype.value if hasattr(ftype, 'value') else str(ftype),
            "label": fractal.get("display_label") or fractal.get("label", "?"),
            "is_subwave": fractal.get("is_subwave", False),
            "is_fractal_complete": fractal.get("is_fractal_complete", False),
            "parent_wave": parent,
            "parent_timeframe": fractal.get("parent_timeframe"),
            "child_timeframe": fractal.get("child_timeframe"),
            "fractal_depth": fractal.get("fractal_depth", 1),
            "color": fractal.get("color", "#8B5CF6"),
            "direction": fractal.get("direction", "NEUTRAL"),
            "start": fractal.get("start"),
            "end": fractal.get("end"),
            "weight": fractal.get("weight", 1),
            "mentor_insight": fractal.get("mentor_insight"),
            "psychology": psychology,
            "draw_data": {
                "shape": "elliott_subwave" if fractal.get("is_subwave") else "elliott_fractal",
                "start": fractal.get("start"),
                "end": fractal.get("end"),
                "label": fractal.get("display_label") or fractal.get("label"),
                "color": fractal.get("color", "#8B5CF6"),
                "parent_label": parent.get("label"),
                "parent_tf": parent.get("timeframe"),
                "is_complete": fractal.get("is_fractal_complete", False)
            }
        }
    
    def get_fractal_patterns(self) -> List[Dict]:
        """Get all fractal patterns."""
        return self.fractal_cache
    
    def get_fractal_insights(self) -> List[Dict]:
        """Get fractal insights with mentor context."""
        return [f for f in self.fractal_cache if f.get("mentor_insight")]
    
    def toggle_fractals(self, enabled: bool):
        """Toggle fractal analysis on/off."""
        self.fractal_enabled = enabled
        if not enabled:
            self.fractal_cache = []
        logger.info(f"[SENTINEL] Fractal analysis {'enabled' if enabled else 'disabled'}")
            
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
            "fractal_patterns": len(self.fractal_cache),
            "fractal_insights": len(self.get_fractal_insights()),
            "fractal_enabled": self.fractal_enabled,
            "last_scan_times": {k: v.isoformat() if v else None for k, v in self.last_scan_time.items()},
            "timeframes_monitored": [tf.value for tf in Timeframe]
        }
    
    def get_patterns_for_chart(self) -> Dict:
        """Get pattern draw data formatted for SVG/Canvas overlay."""
        chart_data = {
            "patterns": [],
            "trendlines": [],
            "markers": [],
            "zones": [],
            "elliott_waves": []  # New: Elliott Wave patterns
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
                
                # Elliott Wave patterns
                elif shape == "elliott_wave":
                    chart_data["elliott_waves"].append({
                        "type": p.get("type"),
                        "timeframe": tf,
                        "color": draw_data.get("color", "#9333EA"),
                        "start": draw_data.get("start"),
                        "end": draw_data.get("end"),
                        "label": draw_data.get("label"),
                        "direction": draw_data.get("direction"),
                        "is_extended": draw_data.get("is_extended", False),
                        "is_truncated": draw_data.get("is_truncated", False),
                        "retracement": draw_data.get("retracement"),
                        "bias": p.get("bias")
                    })
                
                elif shape == "elliott_complete":
                    chart_data["elliott_waves"].append({
                        "type": p.get("type"),
                        "timeframe": tf,
                        "color": draw_data.get("color", "#9333EA"),
                        "start": draw_data.get("start"),
                        "end": draw_data.get("end"),
                        "label": draw_data.get("label"),
                        "direction": draw_data.get("direction"),
                        "completion": draw_data.get("completion", 100),
                        "is_complete_pattern": True,
                        "bias": p.get("bias")
                    })
        
        # Add fractal sub-waves
        chart_data["fractal_subwaves"] = []
        chart_data["fractal_insights"] = []
        
        for fp in self.fractal_cache:
            draw_data = fp.get("draw_data", {})
            shape = draw_data.get("shape")
            
            if shape == "elliott_subwave":
                chart_data["fractal_subwaves"].append({
                    "type": fp.get("type"),
                    "label": fp.get("label"),
                    "timeframe": fp.get("child_timeframe"),
                    "parent_timeframe": fp.get("parent_timeframe"),
                    "parent_wave": fp.get("parent_wave"),
                    "color": fp.get("color"),
                    "start": draw_data.get("start"),
                    "end": draw_data.get("end"),
                    "direction": fp.get("direction"),
                    "is_subwave": True,
                    "fractal_depth": fp.get("fractal_depth", 1)
                })
            
            elif shape == "elliott_fractal" or fp.get("is_fractal_complete"):
                chart_data["fractal_insights"].append({
                    "type": fp.get("type"),
                    "parent_timeframe": fp.get("parent_timeframe"),
                    "child_timeframe": fp.get("child_timeframe"),
                    "parent_wave": fp.get("parent_wave"),
                    "mentor_insight": fp.get("mentor_insight"),
                    "is_complete": True,
                    "color": "#FFD700"  # Gold for complete fractals
                })
        
        return chart_data


# ═══════════════════════════════════════════════════════════════════════════════
# GHOST PROJECTION ENGINE - Future Pattern Predictions (NO FIBONACCI)
# Uses: Measured Move, Liquidity Walls, Historical S/R
# ═══════════════════════════════════════════════════════════════════════════════

class GhostProjection:
    """
    Represents a future price projection based on pattern geometry.
    Uses pure Price Action + Liquidity, NO Fibonacci.
    """
    def __init__(
        self,
        projection_id: str,
        pattern_type: str,
        direction: str,  # BULLISH or BEARISH
        start_price: float,
        start_index: int,
        target_price: float,
        target_index: int,
        confidence: float,  # 0-100
        timeframe: str,
        method: str,  # "measured_move", "liquidity_target", "wave_projection"
        strategic_alignment: bool = False,  # True if aligns with higher TF liquidity
        liquidity_zone: Optional[Dict] = None,  # Nearby liquidity zone
        forming_pattern: Optional[str] = None,  # Pattern that's forming
        completion_percent: float = 50.0
    ):
        self.projection_id = projection_id
        self.pattern_type = pattern_type
        self.direction = direction
        self.start_price = start_price
        self.start_index = start_index
        self.target_price = target_price
        self.target_index = target_index
        self.confidence = confidence
        self.timeframe = timeframe
        self.method = method
        self.strategic_alignment = strategic_alignment
        self.liquidity_zone = liquidity_zone
        self.forming_pattern = forming_pattern
        self.completion_percent = completion_percent
        self.created_at = datetime.now(timezone.utc)
    
    def to_dict(self) -> Dict:
        return {
            "projection_id": self.projection_id,
            "pattern_type": self.pattern_type,
            "direction": self.direction,
            "start": {"price": self.start_price, "index": self.start_index},
            "target": {"price": self.target_price, "index": self.target_index},
            "confidence": self.confidence,
            "timeframe": self.timeframe,
            "method": self.method,
            "strategic_alignment": self.strategic_alignment,
            "liquidity_zone": self.liquidity_zone,
            "forming_pattern": self.forming_pattern,
            "completion_percent": self.completion_percent,
            "created_at": self.created_at.isoformat(),
            "is_ghost": True,  # Mark as future projection
            "draw_style": "dashed"  # Semi-transparent dashed lines
        }


class GhostProjectionEngine:
    """
    Engine for calculating future price projections.
    
    Projection Methods (NO FIBONACCI):
    1. Measured Move - Pattern height projected from breakout
    2. Liquidity Target - Nearest significant liquidity cluster
    3. Wave Projection - Elliott Wave completion based on prior wave lengths
    4. Historical S/R - Previous swing highs/lows as targets
    """
    
    def __init__(self):
        self.active_projections: List[GhostProjection] = []
        self.max_projections = 10
    
    def calculate_measured_move(
        self,
        pattern_type: str,
        pattern_data: Dict,
        current_price: float,
        timeframe: str
    ) -> Optional[GhostProjection]:
        """
        Calculate target using Measured Move (pattern height = target distance).
        Used for: Triangles, Wedges, Flags, H&S, Double Top/Bottom
        """
        try:
            height = 0
            breakout_price = current_price
            direction = "BULLISH"
            
            # Extract pattern height based on type
            if "triangle" in pattern_type or "wedge" in pattern_type:
                upper = pattern_data.get("resistance") or pattern_data.get("upper_line", {}).get("end", {}).get("price", 0)
                lower = pattern_data.get("support") or pattern_data.get("lower_line", {}).get("end", {}).get("price", 0)
                if upper and lower:
                    height = abs(upper - lower)
                direction = "BULLISH" if "ascending" in pattern_type or "falling" in pattern_type else "BEARISH"
            
            elif "double_top" in pattern_type:
                top_price = pattern_data.get("first_top", {}).get("price", 0) or pattern_data.get("second_top", {}).get("price", 0)
                neckline = pattern_data.get("neckline", 0)
                if top_price and neckline:
                    height = top_price - neckline
                    breakout_price = neckline
                direction = "BEARISH"
            
            elif "double_bottom" in pattern_type:
                bottom_price = pattern_data.get("first_bottom", {}).get("price", 0) or pattern_data.get("second_bottom", {}).get("price", 0)
                neckline = pattern_data.get("neckline", 0)
                if bottom_price and neckline:
                    height = neckline - bottom_price
                    breakout_price = neckline
                direction = "BULLISH"
            
            elif "head_and_shoulders" in pattern_type:
                head_price = pattern_data.get("head", {}).get("price", 0)
                neckline = pattern_data.get("neckline", 0)
                if head_price and neckline:
                    height = abs(head_price - neckline)
                    breakout_price = neckline
                direction = "BEARISH" if "inverse" not in pattern_type else "BULLISH"
            
            elif "flag" in pattern_type or "pennant" in pattern_type:
                flagpole_height = pattern_data.get("flagpole_height", 0)
                if flagpole_height:
                    height = flagpole_height
                direction = "BULLISH" if "bull" in pattern_type else "BEARISH"
            
            if height == 0:
                return None
            
            # Calculate target using measured move
            target_price = breakout_price + height if direction == "BULLISH" else breakout_price - height
            
            # Estimate target index (future candles)
            completion = pattern_data.get("completion", 70)
            bars_to_target = max(5, int((100 - completion) / 5))
            
            return GhostProjection(
                projection_id=f"mm_{pattern_type}_{timeframe}_{datetime.now().timestamp()}",
                pattern_type=pattern_type,
                direction=direction,
                start_price=breakout_price,
                start_index=pattern_data.get("current_index", 0),
                target_price=target_price,
                target_index=pattern_data.get("current_index", 0) + bars_to_target,
                confidence=min(90, completion + 10),
                timeframe=timeframe,
                method="measured_move",
                completion_percent=completion
            )
        except Exception as e:
            logger.error(f"[GHOST] Error calculating measured move: {e}")
            return None
    
    def calculate_elliott_projection(
        self,
        wave_data: Dict,
        current_price: float,
        timeframe: str,
        liquidity_zones: List[Dict] = None
    ) -> Optional[GhostProjection]:
        """
        Project Elliott Wave targets based on prior wave lengths and LIQUIDITY.
        NO FIBONACCI - Uses wave proportions and nearest liquidity clusters.
        """
        try:
            wave_label = wave_data.get("label", "")
            direction = wave_data.get("direction", "BULLISH")
            
            # Get wave lengths
            wave1_length = wave_data.get("wave1_length", 0)
            wave_a_length = wave_data.get("wave_a_length", 0)
            # wave3_length available for future use: wave_data.get("wave3_length", 0)
            
            target_price = current_price
            method = "wave_projection"
            confidence = 60
            
            # Wave 3 projection (if in Wave 2)
            if wave_label == "2" and wave1_length > 0:
                # Wave 3 is typically longer than Wave 1, use 1.5x as conservative estimate
                if direction == "BULLISH":
                    target_price = current_price + (wave1_length * 1.5)
                else:
                    target_price = current_price - (wave1_length * 1.5)
                confidence = 70
            
            # Wave 5 projection (if in Wave 4)
            elif wave_label == "4" and wave1_length > 0:
                # Wave 5 is often equal to Wave 1 (conservative)
                if direction == "BULLISH":
                    target_price = current_price + wave1_length
                else:
                    target_price = current_price - wave1_length
                confidence = 65
            
            # Wave C projection (if in Wave B)
            elif wave_label == "B" and wave_a_length > 0:
                # Wave C is often equal to Wave A
                if direction == "BEARISH":
                    target_price = current_price - wave_a_length
                else:
                    target_price = current_price + wave_a_length
                confidence = 60
            
            else:
                return None
            
            # Check for liquidity zone alignment
            strategic = False
            nearest_liq = None
            if liquidity_zones:
                for zone in liquidity_zones:
                    zone_price = zone.get("price", 0)
                    # If target is within 2% of a liquidity zone
                    if abs(target_price - zone_price) / current_price < 0.02:
                        strategic = True
                        nearest_liq = zone
                        confidence = min(95, confidence + 20)
                        break
            
            return GhostProjection(
                projection_id=f"ew_{wave_label}_{timeframe}_{datetime.now().timestamp()}",
                pattern_type=f"elliott_wave_{wave_label.lower()}_projection",
                direction=direction,
                start_price=current_price,
                start_index=wave_data.get("end", {}).get("index", 0),
                target_price=target_price,
                target_index=wave_data.get("end", {}).get("index", 0) + 20,
                confidence=confidence,
                timeframe=timeframe,
                method=method,
                strategic_alignment=strategic,
                liquidity_zone=nearest_liq,
                forming_pattern=f"Wave {wave_label} → Wave {int(wave_label)+1 if wave_label.isdigit() else 'C'}"
            )
        except Exception as e:
            logger.error(f"[GHOST] Error calculating Elliott projection: {e}")
            return None
    
    def find_liquidity_target(
        self,
        current_price: float,
        direction: str,
        liquidity_zones: List[Dict],
        timeframe: str
    ) -> Optional[GhostProjection]:
        """
        Find the nearest significant liquidity zone as a target.
        This is where price is "magnetically attracted" to.
        """
        try:
            if not liquidity_zones:
                return None
            
            # Filter zones in the direction we're looking
            candidates = []
            for zone in liquidity_zones:
                zone_price = zone.get("price", 0)
                zone_value = zone.get("value", 0) or zone.get("total_volume", 0)
                
                if direction == "BULLISH" and zone_price > current_price:
                    candidates.append((zone, zone_price - current_price, zone_value))
                elif direction == "BEARISH" and zone_price < current_price:
                    candidates.append((zone, current_price - zone_price, zone_value))
            
            if not candidates:
                return None
            
            # Sort by distance, then by value (prefer closer + larger)
            candidates.sort(key=lambda x: (x[1], -x[2]))
            
            best_zone, distance, value = candidates[0]
            
            # Confidence based on zone strength
            confidence = min(85, 50 + int(value / 1000000))  # Scale by liquidity value
            
            return GhostProjection(
                projection_id=f"liq_{direction.lower()}_{timeframe}_{datetime.now().timestamp()}",
                pattern_type="liquidity_hunt",
                direction=direction,
                start_price=current_price,
                start_index=0,
                target_price=best_zone.get("price", 0),
                target_index=10,  # Estimated bars
                confidence=confidence,
                timeframe=timeframe,
                method="liquidity_target",
                liquidity_zone=best_zone,
                strategic_alignment=True
            )
        except Exception as e:
            logger.error(f"[GHOST] Error finding liquidity target: {e}")
            return None
    
    def generate_projections(
        self,
        patterns: List[Dict],
        elliott_waves: List[Dict],
        current_price: float,
        liquidity_zones: List[Dict] = None,
        timeframe: str = "4h"
    ) -> List[Dict]:
        """
        Generate all ghost projections for detected and forming patterns.
        Returns list of projection dictionaries for rendering.
        """
        projections = []
        
        # 1. Projections from chart patterns (measured move)
        for pattern in patterns:
            ptype = pattern.get("type", "")
            if isinstance(ptype, PatternType):
                ptype = ptype.value
            
            completion = pattern.get("completion", 100)
            # Only project incomplete patterns
            if completion < 100:
                proj = self.calculate_measured_move(
                    ptype,
                    pattern,
                    current_price,
                    pattern.get("timeframe", timeframe)
                )
                if proj:
                    # Check for strategic alignment with higher TF
                    if liquidity_zones:
                        for zone in liquidity_zones:
                            if abs(proj.target_price - zone.get("price", 0)) / current_price < 0.015:
                                proj.strategic_alignment = True
                                proj.liquidity_zone = zone
                                proj.confidence = min(95, proj.confidence + 15)
                                break
                    projections.append(proj.to_dict())
        
        # 2. Projections from Elliott Waves
        for wave in elliott_waves:
            wave_label = wave.get("label", "")
            # Project from corrective waves (2, 4, B)
            if wave_label in ["2", "4", "B"]:
                proj = self.calculate_elliott_projection(
                    wave,
                    current_price,
                    wave.get("timeframe", timeframe),
                    liquidity_zones
                )
                if proj:
                    projections.append(proj.to_dict())
        
        # 3. Pure liquidity target (always show nearest magnet)
        if liquidity_zones:
            # Find target in current bias direction
            bias = "BULLISH"  # Default, should be passed from market context
            liq_proj = self.find_liquidity_target(
                current_price,
                bias,
                liquidity_zones,
                timeframe
            )
            if liq_proj:
                projections.append(liq_proj.to_dict())
        
        # Limit to max projections, prioritize by confidence
        projections.sort(key=lambda x: x.get("confidence", 0), reverse=True)
        self.active_projections = projections[:self.max_projections]
        
        return self.active_projections
    
    def check_multi_tf_alignment(
        self,
        lower_tf_projection: Dict,
        higher_tf_zones: List[Dict]
    ) -> bool:
        """
        Check if a lower timeframe projection aligns with higher timeframe liquidity.
        This is a "STRATEGIC ALIGNMENT" signal.
        """
        if not higher_tf_zones:
            return False
        
        target = lower_tf_projection.get("target", {}).get("price", 0)
        
        for zone in higher_tf_zones:
            zone_price = zone.get("price", 0)
            if abs(target - zone_price) / target < 0.02:  # Within 2%
                return True
        
        return False


# Global instance
ghost_engine = GhostProjectionEngine()


# Global instances
sentinel = SentinelEngine()
sentinel_scanner = SentinelScanner()
