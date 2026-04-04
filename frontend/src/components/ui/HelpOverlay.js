import React from 'react';
import { Lightbulb, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Info, Zap, Target } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * HelpOverlay v2.0 - Context-Aware Market Reading Assistant
 * 
 * Explains WHY the market behaves this way, not just WHAT to do.
 * Each explanation includes:
 * 1. What this data reveals about market dynamics
 * 2. What's happening behind the scenes (liquidity, whales, flow)
 * 3. Risk assessment and action guidance
 */
export function HelpOverlay({ 
  show, 
  cardType, 
  language = 'it',
  contextData = {},
  className = ''
}) {
  if (!show) return null;

  const content = getHelpContent(cardType, language, contextData);
  if (!content) return null;

  // Determine risk level indicator
  const getRiskIndicator = () => {
    const trapRisk = contextData.trapRisk;
    const overcrowded = contextData.overcrowded;
    
    if (trapRisk === 'HIGH' || overcrowded) {
      return <AlertTriangle className="w-4 h-4 text-orange-400" />;
    }
    return null;
  };

  // Determine sentiment color based on context
  const getSentimentIndicator = () => {
    const sentiment = contextData.sentiment || contextData.direction || contextData.bias;
    if (!sentiment) return null;
    
    const lower = String(sentiment).toLowerCase();
    if (lower.includes('bull') || lower.includes('long') || lower.includes('up') || lower === 'positive' || lower === 'buy') {
      return <TrendingUp className="w-4 h-4 text-bullish" />;
    }
    if (lower.includes('bear') || lower.includes('short') || lower.includes('down') || lower === 'negative' || lower === 'sell') {
      return <TrendingDown className="w-4 h-4 text-bearish" />;
    }
    return <Minus className="w-4 h-4 text-zinc-400" />;
  };

  return (
    <div className={cn(
      "mt-3 p-3 rounded-sm border-l-2 border-amber-500/50 bg-amber-500/5",
      "animate-fade-in",
      className
    )}>
      <div className="flex items-start gap-2">
        <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-2 text-xs">
          {/* What's happening */}
          <div>
            <span className="text-amber-400 font-semibold">
              {language === 'it' ? 'Cosa succede: ' : 'What\'s happening: '}
            </span>
            <span className="text-zinc-300">{content.whatItIs}</span>
          </div>
          
          {/* Why - Market mechanics */}
          <div className="flex items-start gap-1.5">
            <span className="text-amber-400 font-semibold flex-shrink-0">
              {language === 'it' ? 'Perché: ' : 'Why: '}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {getSentimentIndicator()}
              {getRiskIndicator()}
              <span className="text-zinc-200">{content.whyItHappens}</span>
            </div>
          </div>
          
          {/* Action */}
          <div>
            <span className="text-amber-400 font-semibold">
              {language === 'it' ? 'Azione: ' : 'Action: '}
            </span>
            <span className="text-zinc-400">{content.howToRead}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Get intelligent, context-aware help content
 * Explains market mechanics, not just signals
 */
function getHelpContent(cardType, language, ctx) {
  const isIt = language === 'it';
  
  const helpTexts = {
    // ═══════════════════════════════════════════════════════════════════
    // V3 SIGNAL CARD - Market Reading Focus
    // ═══════════════════════════════════════════════════════════════════
    v3_signal: {
      it: {
        whatItIs: getV3WhatItIs(ctx, 'it'),
        whyItHappens: getV3WhyItHappens(ctx, 'it'),
        howToRead: getV3Action(ctx, 'it')
      },
      en: {
        whatItIs: getV3WhatItIs(ctx, 'en'),
        whyItHappens: getV3WhyItHappens(ctx, 'en'),
        howToRead: getV3Action(ctx, 'en')
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // MARKET REGIME - Flow Analysis
    // ═══════════════════════════════════════════════════════════════════
    market_regime: {
      it: {
        whatItIs: getRegimeWhatItIs(ctx, 'it'),
        whyItHappens: getRegimeWhyItHappens(ctx, 'it'),
        howToRead: getRegimeAction(ctx, 'it')
      },
      en: {
        whatItIs: getRegimeWhatItIs(ctx, 'en'),
        whyItHappens: getRegimeWhyItHappens(ctx, 'en'),
        howToRead: getRegimeAction(ctx, 'en')
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // WHALE ACTIVITY - Institutional Flow
    // ═══════════════════════════════════════════════════════════════════
    whale_activity: {
      it: {
        whatItIs: getWhaleWhatItIs(ctx, 'it'),
        whyItHappens: getWhaleWhyItHappens(ctx, 'it'),
        howToRead: getWhaleAction(ctx, 'it')
      },
      en: {
        whatItIs: getWhaleWhatItIs(ctx, 'en'),
        whyItHappens: getWhaleWhyItHappens(ctx, 'en'),
        howToRead: getWhaleAction(ctx, 'en')
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // LIQUIDITY MAGNET - Price Attraction
    // ═══════════════════════════════════════════════════════════════════
    liquidity_magnet: {
      it: {
        whatItIs: getMagnetWhatItIs(ctx, 'it'),
        whyItHappens: getMagnetWhyItHappens(ctx, 'it'),
        howToRead: getMagnetAction(ctx, 'it')
      },
      en: {
        whatItIs: getMagnetWhatItIs(ctx, 'en'),
        whyItHappens: getMagnetWhyItHappens(ctx, 'en'),
        howToRead: getMagnetAction(ctx, 'en')
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // MARKET BIAS - Directional Flow
    // ═══════════════════════════════════════════════════════════════════
    market_bias: {
      it: {
        whatItIs: getBiasWhatItIs(ctx, 'it'),
        whyItHappens: getBiasWhyItHappens(ctx, 'it'),
        howToRead: getBiasAction(ctx, 'it')
      },
      en: {
        whatItIs: getBiasWhatItIs(ctx, 'en'),
        whyItHappens: getBiasWhyItHappens(ctx, 'en'),
        howToRead: getBiasAction(ctx, 'en')
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // OPEN INTEREST - Position Analysis
    // ═══════════════════════════════════════════════════════════════════
    open_interest: {
      it: {
        whatItIs: getOIWhatItIs(ctx, 'it'),
        whyItHappens: getOIWhyItHappens(ctx, 'it'),
        howToRead: getOIAction(ctx, 'it')
      },
      en: {
        whatItIs: getOIWhatItIs(ctx, 'en'),
        whyItHappens: getOIWhyItHappens(ctx, 'en'),
        howToRead: getOIAction(ctx, 'en')
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // FUNDING RATE - Crowding Analysis
    // ═══════════════════════════════════════════════════════════════════
    funding_rate: {
      it: {
        whatItIs: getFundingWhatItIs(ctx, 'it'),
        whyItHappens: getFundingWhyItHappens(ctx, 'it'),
        howToRead: getFundingAction(ctx, 'it')
      },
      en: {
        whatItIs: getFundingWhatItIs(ctx, 'en'),
        whyItHappens: getFundingWhyItHappens(ctx, 'en'),
        howToRead: getFundingAction(ctx, 'en')
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // MARKET ENERGY - Breakout Potential
    // ═══════════════════════════════════════════════════════════════════
    market_energy: {
      it: {
        whatItIs: getEnergyWhatItIs(ctx, 'it'),
        whyItHappens: getEnergyWhyItHappens(ctx, 'it'),
        howToRead: getEnergyAction(ctx, 'it')
      },
      en: {
        whatItIs: getEnergyWhatItIs(ctx, 'en'),
        whyItHappens: getEnergyWhyItHappens(ctx, 'en'),
        howToRead: getEnergyAction(ctx, 'en')
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // SHADOW TARGETS - Experimental Analysis
    // ═══════════════════════════════════════════════════════════════════
    shadow_targets: {
      it: {
        whatItIs: "Target sperimentali calcolati dalla liquidità reale, non da formule teoriche.",
        whyItHappens: "La liquidità attrae il prezzo. Questi target mostrano dove sono realmente gli stop da 'cacciare'.",
        howToRead: "Confronta: se shadow < standard → più conservativo. Osserva quale viene raggiunto prima."
      },
      en: {
        whatItIs: "Experimental targets calculated from real liquidity, not theoretical formulas.",
        whyItHappens: "Liquidity attracts price. These targets show where stops really are to be 'hunted'.",
        howToRead: "Compare: if shadow < standard → more conservative. Watch which gets hit first."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // V3 MONITORING - System Performance
    // ═══════════════════════════════════════════════════════════════════
    v3_monitoring: {
      it: {
        whatItIs: getV3MonitoringWhatItIs(ctx, 'it'),
        whyItHappens: getV3MonitoringWhyItHappens(ctx, 'it'),
        howToRead: getV3MonitoringAction(ctx, 'it')
      },
      en: {
        whatItIs: getV3MonitoringWhatItIs(ctx, 'en'),
        whyItHappens: getV3MonitoringWhyItHappens(ctx, 'en'),
        howToRead: getV3MonitoringAction(ctx, 'en')
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // SIGNAL HISTORY
    // ═══════════════════════════════════════════════════════════════════
    signal_history: {
      it: {
        whatItIs: "Storico segnali con outcome verificato. Mostra pattern di successo e fallimento.",
        whyItHappens: "Il sistema performa diversamente in base a regime, orario e volatilità.",
        howToRead: "Cerca pattern: quando vince e quando perde? Adatta la size ai contesti favorevoli."
      },
      en: {
        whatItIs: "Signal history with verified outcomes. Shows success and failure patterns.",
        whyItHappens: "System performs differently based on regime, timing and volatility.",
        howToRead: "Look for patterns: when does it win vs lose? Adapt size to favorable contexts."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // LIQUIDITY LADDER (fallback)
    // ═══════════════════════════════════════════════════════════════════
    liquidity_ladder: {
      it: {
        whatItIs: "Mappa degli stop loss piazzati. Dove c'è liquidità = dove il prezzo andrà.",
        whyItHappens: getLiquidityWhyItHappens(ctx, 'it'),
        howToRead: "Il prezzo 'caccia' la liquidità. Zone dense = probabile target. Usale per uscire, non entrare."
      },
      en: {
        whatItIs: "Map of placed stop losses. Where there's liquidity = where price will go.",
        whyItHappens: getLiquidityWhyItHappens(ctx, 'en'),
        howToRead: "Price 'hunts' liquidity. Dense zones = likely target. Use them to exit, not enter."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // QUALITY GATE
    // ═══════════════════════════════════════════════════════════════════
    quality_gate: {
      it: {
        whatItIs: getQualityWhatItIs(ctx, 'it'),
        whyItHappens: getQualityWhyItHappens(ctx, 'it'),
        howToRead: "80+ = confluenze forti, entry pulito. 60-79 = rischio medio. <60 = salta, troppi segnali contrastanti."
      },
      en: {
        whatItIs: getQualityWhatItIs(ctx, 'en'),
        whyItHappens: getQualityWhyItHappens(ctx, 'en'),
        howToRead: "80+ = strong confluences, clean entry. 60-79 = medium risk. <60 = skip, too many mixed signals."
      }
    }
  };

  const content = helpTexts[cardType];
  if (!content) return null;
  
  return isIt ? content.it : content.en;
}

// ═══════════════════════════════════════════════════════════════════════════
// V3 SIGNAL - INTELLIGENT CONTEXT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getV3WhatItIs(ctx, lang) {
  const phase = ctx.phase;
  const direction = ctx.direction;
  const regime = ctx.regime;
  
  if (lang === 'it') {
    if (phase === 'ENTRY_READY') {
      return `Segnale ${direction} confermato. Struttura 4H + trigger 5M allineati. Il mercato sta offrendo un'opportunità.`;
    }
    if (phase === 'WAITING_FOR_RETEST') {
      return `Setup ${direction} in formazione. Il prezzo deve tornare nella zona entry per conferma.`;
    }
    if (phase === 'SETUP_DETECTED') {
      return `Potenziale ${direction} individuato su 4H. Serve ancora la conferma del timeframe basso.`;
    }
    return `Il mercato è in fase ${regime || 'neutrale'}. Nessuna struttura operativa al momento.`;
  }
  
  if (phase === 'ENTRY_READY') {
    return `${direction} signal confirmed. 4H structure + 5M trigger aligned. Market offering an opportunity.`;
  }
  if (phase === 'WAITING_FOR_RETEST') {
    return `${direction} setup forming. Price must return to entry zone for confirmation.`;
  }
  if (phase === 'SETUP_DETECTED') {
    return `Potential ${direction} spotted on 4H. Still needs lower timeframe confirmation.`;
  }
  return `Market in ${regime || 'neutral'} phase. No operative structure at the moment.`;
}

function getV3WhyItHappens(ctx, lang) {
  const direction = ctx.direction;
  const bias = ctx.bias;
  const liquidityAbove = ctx.liquidityAbove || 0;
  const liquidityBelow = ctx.liquidityBelow || 0;
  const whaleDirection = ctx.whaleDirection;
  const qualityScore = ctx.qualityScore || 0;
  
  // Build intelligent explanation
  const liqRatio = liquidityAbove > 0 && liquidityBelow > 0 
    ? (liquidityAbove / liquidityBelow).toFixed(1) 
    : null;
  
  if (lang === 'it') {
    let parts = [];
    
    // Liquidity explanation
    if (liquidityAbove > liquidityBelow * 1.3) {
      parts.push(`Liquidità maggiore sopra (${liqRatio}x) → prezzo attratto verso l'alto`);
    } else if (liquidityBelow > liquidityAbove * 1.3) {
      parts.push(`Liquidità maggiore sotto → prezzo attratto verso il basso`);
    }
    
    // Whale alignment
    if (whaleDirection) {
      const whaleAligned = (direction === 'LONG' && whaleDirection === 'BUY') || 
                          (direction === 'SHORT' && whaleDirection === 'SELL');
      if (whaleAligned) {
        parts.push(`balene allineate con ${direction}`);
      } else if (whaleDirection !== 'NEUTRAL') {
        parts.push(`⚠️ balene in direzione opposta`);
      }
    }
    
    // Quality explanation
    if (qualityScore >= 80) {
      parts.push(`confluenze forti (${qualityScore}/100)`);
    } else if (qualityScore >= 60) {
      parts.push(`confluenze medie`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'Struttura tecnica in formazione.';
  }
  
  // English
  let parts = [];
  
  if (liquidityAbove > liquidityBelow * 1.3) {
    parts.push(`More liquidity above (${liqRatio}x) → price attracted upward`);
  } else if (liquidityBelow > liquidityAbove * 1.3) {
    parts.push(`More liquidity below → price attracted downward`);
  }
  
  if (whaleDirection) {
    const whaleAligned = (direction === 'LONG' && whaleDirection === 'BUY') || 
                        (direction === 'SHORT' && whaleDirection === 'SELL');
    if (whaleAligned) {
      parts.push(`whales aligned with ${direction}`);
    } else if (whaleDirection !== 'NEUTRAL') {
      parts.push(`⚠️ whales opposing`);
    }
  }
  
  if (qualityScore >= 80) {
    parts.push(`strong confluences (${qualityScore}/100)`);
  } else if (qualityScore >= 60) {
    parts.push(`medium confluences`);
  }
  
  return parts.length > 0 ? parts.join(' • ') : 'Technical structure forming.';
}

function getV3Action(ctx, lang) {
  const phase = ctx.phase;
  const qualityScore = ctx.qualityScore || 0;
  const riskReward = ctx.riskReward || 0;
  
  if (lang === 'it') {
    if (phase === 'ENTRY_READY') {
      if (qualityScore >= 80 && riskReward >= 1.5) {
        return `Entry valido con size normale. R:R ${riskReward?.toFixed(1)} favorevole.`;
      }
      if (qualityScore >= 60) {
        return `Entry ok ma riduci size. Qualità ${qualityScore}/100 non ottimale.`;
      }
      return `Entry rischioso. Valuta se saltare questo trade.`;
    }
    if (phase === 'WAITING_FOR_RETEST') {
      return `NON entrare ancora. Aspetta che il prezzo torni nella zona entry.`;
    }
    return `Nessuna azione. Aspetta un segnale valido.`;
  }
  
  if (phase === 'ENTRY_READY') {
    if (qualityScore >= 80 && riskReward >= 1.5) {
      return `Valid entry with normal size. R:R ${riskReward?.toFixed(1)} favorable.`;
    }
    if (qualityScore >= 60) {
      return `Entry ok but reduce size. Quality ${qualityScore}/100 not optimal.`;
    }
    return `Risky entry. Consider skipping this trade.`;
  }
  if (phase === 'WAITING_FOR_RETEST') {
    return `DON'T enter yet. Wait for price to return to entry zone.`;
  }
  return `No action. Wait for a valid signal.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MARKET REGIME - INTELLIGENT CONTEXT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getRegimeWhatItIs(ctx, lang) {
  const regime = ctx.regime;
  const strength = ctx.regimeStrength || 0;
  
  if (lang === 'it') {
    if (regime === 'TREND') {
      return `Mercato in TREND (${strength}%). Il prezzo ha una direzione chiara, non sta oscillando.`;
    }
    if (regime === 'RANGE') {
      return `Mercato in RANGE (${strength}%). Il prezzo rimbalza tra supporto e resistenza senza direzione.`;
    }
    if (regime === 'COMPRESSION') {
      return `Mercato in COMPRESSIONE (${strength}%). Volatilità bassa = energia accumulata = esplosione imminente.`;
    }
    if (regime === 'EXPANSION') {
      return `Mercato in ESPANSIONE (${strength}%). Movimento forte in corso, alta volatilità.`;
    }
    return `Regime non definito. Mercato indeciso.`;
  }
  
  if (regime === 'TREND') {
    return `Market in TREND (${strength}%). Price has clear direction, not oscillating.`;
  }
  if (regime === 'RANGE') {
    return `Market in RANGE (${strength}%). Price bouncing between support and resistance without direction.`;
  }
  if (regime === 'COMPRESSION') {
    return `Market in COMPRESSION (${strength}%). Low volatility = accumulated energy = explosion coming.`;
  }
  if (regime === 'EXPANSION') {
    return `Market in EXPANSION (${strength}%). Strong move in progress, high volatility.`;
  }
  return `Undefined regime. Market undecided.`;
}

function getRegimeWhyItHappens(ctx, lang) {
  const whaleAlignment = ctx.whaleAlignment;
  const liquidityAlignment = ctx.liquidityAlignment;
  const trapRisk = ctx.trapRisk;
  const oiSupportive = ctx.oiSupportive;
  
  if (lang === 'it') {
    let parts = [];
    
    if (whaleAlignment) parts.push('balene allineate con il flusso');
    if (liquidityAlignment) parts.push('liquidità supporta la direzione');
    if (oiSupportive) parts.push('OI conferma posizioni nuove');
    
    if (trapRisk === 'HIGH') {
      parts.push('⚠️ ALTO rischio trappola');
    } else if (trapRisk === 'MEDIUM') {
      parts.push('rischio trappola medio');
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'Analisi in corso.';
  }
  
  let parts = [];
  
  if (whaleAlignment) parts.push('whales aligned with flow');
  if (liquidityAlignment) parts.push('liquidity supports direction');
  if (oiSupportive) parts.push('OI confirms new positions');
  
  if (trapRisk === 'HIGH') {
    parts.push('⚠️ HIGH trap risk');
  } else if (trapRisk === 'MEDIUM') {
    parts.push('medium trap risk');
  }
  
  return parts.length > 0 ? parts.join(' • ') : 'Analysis in progress.';
}

function getRegimeAction(ctx, lang) {
  const regime = ctx.regime;
  const trapRisk = ctx.trapRisk;
  const suggestedSetup = ctx.suggestedSetup;
  
  if (lang === 'it') {
    if (trapRisk === 'HIGH') {
      return `⚠️ Attenzione: alto rischio di falsi breakout. Aspetta conferma chiara.`;
    }
    if (regime === 'TREND') {
      return `Segui il trend, non metterti contro. Cerca pullback per entry.`;
    }
    if (regime === 'RANGE') {
      return `Opera sui bordi: compra vicino al supporto, vendi vicino alla resistenza.`;
    }
    if (regime === 'COMPRESSION') {
      return `Preparati al breakout. Non entrare nel mezzo del range.`;
    }
    return suggestedSetup || 'Aspetta chiarezza prima di operare.';
  }
  
  if (trapRisk === 'HIGH') {
    return `⚠️ Caution: high risk of false breakouts. Wait for clear confirmation.`;
  }
  if (regime === 'TREND') {
    return `Follow the trend, don't fight it. Look for pullbacks to enter.`;
  }
  if (regime === 'RANGE') {
    return `Trade the edges: buy near support, sell near resistance.`;
  }
  if (regime === 'COMPRESSION') {
    return `Prepare for breakout. Don't enter in the middle of range.`;
  }
  return suggestedSetup || 'Wait for clarity before trading.';
}

// ═══════════════════════════════════════════════════════════════════════════
// WHALE ACTIVITY - INTELLIGENT CONTEXT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getWhaleWhatItIs(ctx, lang) {
  const direction = ctx.direction;
  const strength = ctx.strength || 0;
  const behavior = ctx.whaleBehavior;
  
  if (lang === 'it') {
    if (direction === 'BUY') {
      return `Le balene stanno COMPRANDO (${strength}% forza). Flusso istituzionale rialzista.`;
    }
    if (direction === 'SELL') {
      return `Le balene stanno VENDENDO (${strength}% forza). Flusso istituzionale ribassista.`;
    }
    return `Attività whale bilanciata. Nessuna pressione dominante.`;
  }
  
  if (direction === 'BUY') {
    return `Whales are BUYING (${strength}% strength). Bullish institutional flow.`;
  }
  if (direction === 'SELL') {
    return `Whales are SELLING (${strength}% strength). Bearish institutional flow.`;
  }
  return `Balanced whale activity. No dominant pressure.`;
}

function getWhaleWhyItHappens(ctx, lang) {
  const behavior = ctx.whaleBehavior;
  const absorption = ctx.absorptionDetected;
  const oiDivergence = ctx.oiDivergence;
  const liquidationBias = ctx.liquidationBias;
  
  if (lang === 'it') {
    let parts = [];
    
    if (behavior === 'accumulating') {
      parts.push('fase di accumulo → preparano un movimento');
    } else if (behavior === 'distributing') {
      parts.push('fase di distribuzione → stanno uscendo');
    } else if (behavior === 'hunting_stops') {
      parts.push('⚠️ caccia agli stop → movimento ingannevole');
    }
    
    if (absorption) {
      parts.push('assorbimento rilevato');
    }
    
    if (liquidationBias === 'shorts_liquidated') {
      parts.push('short squeeze in corso');
    } else if (liquidationBias === 'longs_liquidated') {
      parts.push('long cascade in corso');
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'Monitoraggio flussi istituzionali.';
  }
  
  let parts = [];
  
  if (behavior === 'accumulating') {
    parts.push('accumulation phase → preparing a move');
  } else if (behavior === 'distributing') {
    parts.push('distribution phase → exiting positions');
  } else if (behavior === 'hunting_stops') {
    parts.push('⚠️ stop hunting → deceptive move');
  }
  
  if (absorption) {
    parts.push('absorption detected');
  }
  
  if (liquidationBias === 'shorts_liquidated') {
    parts.push('short squeeze in progress');
  } else if (liquidationBias === 'longs_liquidated') {
    parts.push('long cascade in progress');
  }
  
  return parts.length > 0 ? parts.join(' • ') : 'Monitoring institutional flows.';
}

function getWhaleAction(ctx, lang) {
  const direction = ctx.direction;
  const behavior = ctx.whaleBehavior;
  const strength = ctx.strength || 0;
  
  if (lang === 'it') {
    if (behavior === 'hunting_stops') {
      return `⚠️ Non seguire questo movimento! Le balene stanno creando una trappola.`;
    }
    if (strength >= 70) {
      return `Flusso whale forte. Allinea i tuoi trade con la direzione ${direction}.`;
    }
    if (strength >= 40) {
      return `Flusso whale moderato. Può supportare un trade allineato.`;
    }
    return `Flusso whale debole. Non basare il trade solo su questo.`;
  }
  
  if (behavior === 'hunting_stops') {
    return `⚠️ Don't follow this move! Whales creating a trap.`;
  }
  if (strength >= 70) {
    return `Strong whale flow. Align your trades with ${direction} direction.`;
  }
  if (strength >= 40) {
    return `Moderate whale flow. Can support an aligned trade.`;
  }
  return `Weak whale flow. Don't base trade only on this.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// LIQUIDITY MAGNET - INTELLIGENT CONTEXT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getMagnetWhatItIs(ctx, lang) {
  const direction = ctx.magnetDirection || ctx.direction;
  const confidence = ctx.confidence || 0;
  
  if (lang === 'it') {
    if (direction === 'UP') {
      return `Attrazione verso ALTO (${confidence}% conf.). Più stop loss sopra il prezzo attuale.`;
    }
    if (direction === 'DOWN') {
      return `Attrazione verso BASSO (${confidence}% conf.). Più stop loss sotto il prezzo attuale.`;
    }
    return `Nessuna attrazione dominante. Liquidità bilanciata sopra e sotto.`;
  }
  
  if (direction === 'UP') {
    return `Attraction UPWARD (${confidence}% conf.). More stop losses above current price.`;
  }
  if (direction === 'DOWN') {
    return `Attraction DOWNWARD (${confidence}% conf.). More stop losses below current price.`;
  }
  return `No dominant attraction. Liquidity balanced above and below.`;
}

function getMagnetWhyItHappens(ctx, lang) {
  const liquidityAbove = ctx.liquidityAbove || 0;
  const liquidityBelow = ctx.liquidityBelow || 0;
  const imbalanceRatio = ctx.imbalanceRatio || 0;
  
  const aboveM = (liquidityAbove / 1e6).toFixed(1);
  const belowM = (liquidityBelow / 1e6).toFixed(1);
  
  if (lang === 'it') {
    if (liquidityAbove > liquidityBelow * 1.3) {
      return `$${aboveM}M sopra vs $${belowM}M sotto → il prezzo "caccia" la liquidità maggiore.`;
    }
    if (liquidityBelow > liquidityAbove * 1.3) {
      return `$${belowM}M sotto vs $${aboveM}M sopra → il prezzo "caccia" la liquidità maggiore.`;
    }
    return `Liquidità bilanciata ($${aboveM}M sopra / $${belowM}M sotto). Direzione incerta.`;
  }
  
  if (liquidityAbove > liquidityBelow * 1.3) {
    return `$${aboveM}M above vs $${belowM}M below → price "hunts" the bigger liquidity.`;
  }
  if (liquidityBelow > liquidityAbove * 1.3) {
    return `$${belowM}M below vs $${aboveM}M above → price "hunts" the bigger liquidity.`;
  }
  return `Balanced liquidity ($${aboveM}M above / $${belowM}M below). Direction uncertain.`;
}

function getMagnetAction(ctx, lang) {
  const direction = ctx.magnetDirection || ctx.direction;
  const confidence = ctx.confidence || 0;
  
  if (lang === 'it') {
    if (confidence >= 70) {
      return `Alta probabilità di movimento verso ${direction === 'UP' ? 'alto' : 'basso'}. Usa come target, non come entry.`;
    }
    if (confidence >= 50) {
      return `Probabilità media di sweep ${direction}. Considera per posizionamento target.`;
    }
    return `Direzione incerta. Non basare il trade solo su questo indicatore.`;
  }
  
  if (confidence >= 70) {
    return `High probability of move ${direction === 'UP' ? 'upward' : 'downward'}. Use as target, not entry.`;
  }
  if (confidence >= 50) {
    return `Medium probability of ${direction} sweep. Consider for target positioning.`;
  }
  return `Direction uncertain. Don't base trade only on this indicator.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MARKET BIAS - INTELLIGENT CONTEXT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getBiasWhatItIs(ctx, lang) {
  const bias = ctx.bias;
  const confidence = ctx.confidence || 0;
  
  if (lang === 'it') {
    if (bias === 'BULLISH') {
      return `Bias RIALZISTA (${confidence}% conf.). Il mercato vuole salire basandosi su multiple confluenze.`;
    }
    if (bias === 'BEARISH') {
      return `Bias RIBASSISTA (${confidence}% conf.). Il mercato vuole scendere basandosi su multiple confluenze.`;
    }
    return `Bias NEUTRALE. Il mercato è indeciso, nessuna direzione chiara.`;
  }
  
  if (bias === 'BULLISH') {
    return `BULLISH bias (${confidence}% conf.). Market wants to go up based on multiple confluences.`;
  }
  if (bias === 'BEARISH') {
    return `BEARISH bias (${confidence}% conf.). Market wants to go down based on multiple confluences.`;
  }
  return `NEUTRAL bias. Market undecided, no clear direction.`;
}

function getBiasWhyItHappens(ctx, lang) {
  const trapRisk = ctx.trapRisk;
  const squeezeProbability = ctx.squeezeProbability || 0;
  const exchangeConsensus = ctx.exchangeConsensus;
  
  if (lang === 'it') {
    let parts = [];
    
    if (exchangeConsensus) {
      parts.push(`consensus exchange: ${exchangeConsensus}`);
    }
    
    if (squeezeProbability >= 60) {
      parts.push(`⚠️ ${squeezeProbability}% probabilità squeeze`);
    }
    
    if (trapRisk === 'HIGH') {
      parts.push('⚠️ alto rischio trappola');
    }
    
    return parts.length > 0 ? parts.join(' • ') : 'Analisi multi-fattore.';
  }
  
  let parts = [];
  
  if (exchangeConsensus) {
    parts.push(`exchange consensus: ${exchangeConsensus}`);
  }
  
  if (squeezeProbability >= 60) {
    parts.push(`⚠️ ${squeezeProbability}% squeeze probability`);
  }
  
  if (trapRisk === 'HIGH') {
    parts.push('⚠️ high trap risk');
  }
  
  return parts.length > 0 ? parts.join(' • ') : 'Multi-factor analysis.';
}

function getBiasAction(ctx, lang) {
  const bias = ctx.bias;
  const confidence = ctx.confidence || 0;
  const trapRisk = ctx.trapRisk;
  
  if (lang === 'it') {
    if (trapRisk === 'HIGH') {
      return `⚠️ Attenzione! Rischio trappola alto. Non forzare entry.`;
    }
    if (confidence >= 70) {
      return `Bias forte: cerca SOLO ${bias === 'BULLISH' ? 'long' : 'short'}. Ignora segnali opposti.`;
    }
    if (confidence >= 50) {
      return `Bias moderato: preferisci ${bias === 'BULLISH' ? 'long' : 'short'}, ma sii selettivo.`;
    }
    return `Bias debole: non forzare, aspetta segnale più chiaro.`;
  }
  
  if (trapRisk === 'HIGH') {
    return `⚠️ Caution! High trap risk. Don't force entry.`;
  }
  if (confidence >= 70) {
    return `Strong bias: look ONLY for ${bias === 'BULLISH' ? 'longs' : 'shorts'}. Ignore opposite signals.`;
  }
  if (confidence >= 50) {
    return `Moderate bias: prefer ${bias === 'BULLISH' ? 'longs' : 'shorts'}, but be selective.`;
  }
  return `Weak bias: don't force it, wait for clearer signal.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// OPEN INTEREST - INTELLIGENT CONTEXT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getOIWhatItIs(ctx, lang) {
  const change24h = ctx.change24h || 0;
  const trend = ctx.trend;
  
  if (lang === 'it') {
    if (change24h > 5) {
      return `OI in AUMENTO (+${change24h.toFixed(1)}%). Nuovo denaro sta entrando nel mercato.`;
    }
    if (change24h < -5) {
      return `OI in CALO (${change24h.toFixed(1)}%). I trader stanno chiudendo posizioni.`;
    }
    return `OI STABILE (${change24h.toFixed(1)}%). Né entrate né uscite significative.`;
  }
  
  if (change24h > 5) {
    return `OI INCREASING (+${change24h.toFixed(1)}%). New money entering the market.`;
  }
  if (change24h < -5) {
    return `OI DECREASING (${change24h.toFixed(1)}%). Traders closing positions.`;
  }
  return `OI STABLE (${change24h.toFixed(1)}%). No significant entries or exits.`;
}

function getOIWhyItHappens(ctx, lang) {
  const change1h = ctx.change1h || 0;
  const change4h = ctx.change4h || 0;
  const change24h = ctx.change24h || 0;
  const trend = ctx.trend;
  
  if (lang === 'it') {
    // Analyze velocity
    if (Math.abs(change1h) > Math.abs(change4h) / 4) {
      return `Accelerazione recente (1H: ${change1h > 0 ? '+' : ''}${change1h.toFixed(1)}%) → movimento in corso.`;
    }
    
    if (trend === 'increasing') {
      return `Flusso costante in entrata → supporta il trend attuale, più "benzina" per il movimento.`;
    }
    if (trend === 'decreasing') {
      return `Flusso costante in uscita → il movimento sta perdendo carburante.`;
    }
    return `Flusso bilanciato → mercato in equilibrio.`;
  }
  
  if (Math.abs(change1h) > Math.abs(change4h) / 4) {
    return `Recent acceleration (1H: ${change1h > 0 ? '+' : ''}${change1h.toFixed(1)}%) → move in progress.`;
  }
  
  if (trend === 'increasing') {
    return `Steady inflow → supports current trend, more "fuel" for the move.`;
  }
  if (trend === 'decreasing') {
    return `Steady outflow → move losing fuel.`;
  }
  return `Balanced flow → market in equilibrium.`;
}

function getOIAction(ctx, lang) {
  const change24h = ctx.change24h || 0;
  const trend = ctx.trend;
  
  if (lang === 'it') {
    if (change24h > 10) {
      return `Forte afflusso: il trend ha carburante. Puoi seguire il movimento.`;
    }
    if (change24h > 5) {
      return `Afflusso moderato: trend supportato. Entry allineati con la direzione.`;
    }
    if (change24h < -10) {
      return `Forte deflusso: movimento in esaurimento. Considera prendere profitto.`;
    }
    if (change24h < -5) {
      return `Deflusso moderato: cautela, il trend potrebbe invertirsi.`;
    }
    return `OI neutrale: nessuna informazione forte. Usa altri indicatori.`;
  }
  
  if (change24h > 10) {
    return `Strong inflow: trend has fuel. You can follow the move.`;
  }
  if (change24h > 5) {
    return `Moderate inflow: trend supported. Entries aligned with direction.`;
  }
  if (change24h < -10) {
    return `Strong outflow: move exhausting. Consider taking profit.`;
  }
  if (change24h < -5) {
    return `Moderate outflow: caution, trend might reverse.`;
  }
  return `Neutral OI: no strong info. Use other indicators.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNDING RATE - INTELLIGENT CONTEXT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getFundingWhatItIs(ctx, lang) {
  const rate = ctx.rate || 0;
  const payer = ctx.payer;
  const overcrowded = ctx.overcrowded;
  
  const ratePercent = (rate * 100).toFixed(4);
  
  if (lang === 'it') {
    if (overcrowded) {
      return `⚠️ MERCATO AFFOLLATO! Funding ${ratePercent}% → troppi trader nella stessa direzione.`;
    }
    if (rate > 0.0003) {
      return `Funding ALTO POSITIVO (${ratePercent}%). I long pagano i short. Troppi long aperti.`;
    }
    if (rate > 0) {
      return `Funding positivo (${ratePercent}%). Sentiment leggermente bullish.`;
    }
    if (rate < -0.0003) {
      return `Funding ALTO NEGATIVO (${ratePercent}%). I short pagano i long. Troppi short aperti.`;
    }
    if (rate < 0) {
      return `Funding negativo (${ratePercent}%). Sentiment leggermente bearish.`;
    }
    return `Funding neutrale (${ratePercent}%). Equilibrio tra long e short.`;
  }
  
  if (overcrowded) {
    return `⚠️ CROWDED MARKET! Funding ${ratePercent}% → too many traders on same side.`;
  }
  if (rate > 0.0003) {
    return `HIGH POSITIVE funding (${ratePercent}%). Longs pay shorts. Too many longs open.`;
  }
  if (rate > 0) {
    return `Positive funding (${ratePercent}%). Slightly bullish sentiment.`;
  }
  if (rate < -0.0003) {
    return `HIGH NEGATIVE funding (${ratePercent}%). Shorts pay longs. Too many shorts open.`;
  }
  if (rate < 0) {
    return `Negative funding (${ratePercent}%). Slightly bearish sentiment.`;
  }
  return `Neutral funding (${ratePercent}%). Balance between longs and shorts.`;
}

function getFundingWhyItHappens(ctx, lang) {
  const rate = ctx.rate || 0;
  const overcrowded = ctx.overcrowded;
  const sentiment = ctx.sentiment;
  
  if (lang === 'it') {
    if (overcrowded) {
      return `Quando tutti scommettono nella stessa direzione, il mercato spesso va contro per liquidarli.`;
    }
    if (rate > 0.0003) {
      return `I long stanno pagando caro per mantenere le posizioni → probabile correzione verso il basso.`;
    }
    if (rate < -0.0003) {
      return `Gli short stanno pagando caro per mantenere le posizioni → probabile squeeze verso l'alto.`;
    }
    return `Equilibrio sano tra long e short. Nessuna pressione di liquidazione imminente.`;
  }
  
  if (overcrowded) {
    return `When everyone bets the same way, market often goes against to liquidate them.`;
  }
  if (rate > 0.0003) {
    return `Longs paying high fees to hold → likely correction downward.`;
  }
  if (rate < -0.0003) {
    return `Shorts paying high fees to hold → likely squeeze upward.`;
  }
  return `Healthy balance between longs and shorts. No imminent liquidation pressure.`;
}

function getFundingAction(ctx, lang) {
  const rate = ctx.rate || 0;
  const overcrowded = ctx.overcrowded;
  
  if (lang === 'it') {
    if (overcrowded) {
      return `⚠️ CONTRARIAN: considera la direzione opposta al crowd. Il mercato punisce l'eccesso.`;
    }
    if (rate > 0.0003) {
      return `Attenzione ai long. Rischio correzione. Se long, stringa lo stop.`;
    }
    if (rate < -0.0003) {
      return `Attenzione agli short. Rischio squeeze. Se short, stringa lo stop.`;
    }
    return `Funding neutrale. Opera normalmente seguendo altri indicatori.`;
  }
  
  if (overcrowded) {
    return `⚠️ CONTRARIAN: consider opposite direction to crowd. Market punishes excess.`;
  }
  if (rate > 0.0003) {
    return `Caution with longs. Correction risk. If long, tighten stop.`;
  }
  if (rate < -0.0003) {
    return `Caution with shorts. Squeeze risk. If short, tighten stop.`;
  }
  return `Neutral funding. Trade normally following other indicators.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MARKET ENERGY - INTELLIGENT CONTEXT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getEnergyWhatItIs(ctx, lang) {
  const level = ctx.level;
  const score = ctx.score || 50;
  const compressionLevel = ctx.compressionLevel;
  
  if (lang === 'it') {
    if (level === 'HIGH' || score > 70) {
      return `Energia ALTA (${score}/100). Mercato carico, movimenti forti imminenti o in corso.`;
    }
    if (level === 'LOW' || score < 30) {
      return `Energia BASSA (${score}/100). Mercato stanco, movimenti lenti.`;
    }
    if (compressionLevel === 'HIGH') {
      return `COMPRESSIONE alta (${score}/100). Volatilità compressa = esplosione imminente.`;
    }
    return `Energia media (${score}/100). Condizioni normali.`;
  }
  
  if (level === 'HIGH' || score > 70) {
    return `HIGH energy (${score}/100). Market loaded, strong moves imminent or in progress.`;
  }
  if (level === 'LOW' || score < 30) {
    return `LOW energy (${score}/100). Tired market, slow moves.`;
  }
  if (compressionLevel === 'HIGH') {
    return `HIGH compression (${score}/100). Compressed volatility = explosion imminent.`;
  }
  return `Medium energy (${score}/100). Normal conditions.`;
}

function getEnergyWhyItHappens(ctx, lang) {
  const compressionLevel = ctx.compressionLevel;
  const breakoutPotential = ctx.breakoutPotential;
  const expectedDirection = ctx.expectedDirection;
  
  if (lang === 'it') {
    if (compressionLevel === 'HIGH') {
      return `La volatilità è stata compressa. Quando si accumula energia, deve essere rilasciata.`;
    }
    if (breakoutPotential) {
      return `Breakout potenziale verso ${expectedDirection || 'direzione incerta'}. Range si sta restringendo.`;
    }
    return `Flusso energetico normale. Il mercato respira.`;
  }
  
  if (compressionLevel === 'HIGH') {
    return `Volatility has been compressed. When energy accumulates, it must be released.`;
  }
  if (breakoutPotential) {
    return `Potential breakout toward ${expectedDirection || 'uncertain direction'}. Range narrowing.`;
  }
  return `Normal energy flow. Market breathing.`;
}

function getEnergyAction(ctx, lang) {
  const level = ctx.level;
  const score = ctx.score || 50;
  const compressionLevel = ctx.compressionLevel;
  
  if (lang === 'it') {
    if (compressionLevel === 'HIGH') {
      return `Preparati al breakout. Non entrare ora, aspetta la direzione. Poi segui il flusso.`;
    }
    if (level === 'HIGH' || score > 70) {
      return `Energia alta = movimenti forti. Segui il momentum, non combatterlo.`;
    }
    if (level === 'LOW' || score < 30) {
      return `Energia bassa = mercato lento. Riduci aspettative o aspetta ricarica.`;
    }
    return `Condizioni normali. Opera seguendo gli altri indicatori.`;
  }
  
  if (compressionLevel === 'HIGH') {
    return `Prepare for breakout. Don't enter now, wait for direction. Then follow flow.`;
  }
  if (level === 'HIGH' || score > 70) {
    return `High energy = strong moves. Follow momentum, don't fight it.`;
  }
  if (level === 'LOW' || score < 30) {
    return `Low energy = slow market. Lower expectations or wait for recharge.`;
  }
  return `Normal conditions. Trade following other indicators.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// V3 MONITORING - INTELLIGENT CONTEXT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getV3MonitoringWhatItIs(ctx, lang) {
  const winRate = ctx.winRate || 0;
  const sampleSize = ctx.sampleSize || 0;
  
  if (lang === 'it') {
    if (sampleSize < 20) {
      return `${sampleSize} segnali raccolti. Dati preliminari, servono più trade per validare.`;
    }
    return `Win Rate: ${winRate.toFixed(1)}% su ${sampleSize} segnali. Performance statistica del sistema.`;
  }
  
  if (sampleSize < 20) {
    return `${sampleSize} signals collected. Preliminary data, need more trades to validate.`;
  }
  return `Win Rate: ${winRate.toFixed(1)}% on ${sampleSize} signals. System statistical performance.`;
}

function getV3MonitoringWhyItHappens(ctx, lang) {
  const winRate = ctx.winRate || 0;
  const sampleSize = ctx.sampleSize || 0;
  
  if (lang === 'it') {
    if (sampleSize < 30) {
      return `Sample size basso = varianza alta. Il win rate può cambiare molto con più dati.`;
    }
    if (winRate >= 55) {
      return `Il sistema ha un edge statistico positivo. Confluenze e timing funzionano.`;
    }
    if (winRate >= 45) {
      return `Performance nella media. Il sistema è break-even, serve ottimizzazione.`;
    }
    return `Performance sotto attese. Verifica condizioni di mercato o parametri sistema.`;
  }
  
  if (sampleSize < 30) {
    return `Low sample size = high variance. Win rate can change a lot with more data.`;
  }
  if (winRate >= 55) {
    return `System has positive statistical edge. Confluences and timing are working.`;
  }
  if (winRate >= 45) {
    return `Average performance. System is break-even, needs optimization.`;
  }
  return `Performance below expectations. Check market conditions or system parameters.`;
}

function getV3MonitoringAction(ctx, lang) {
  const winRate = ctx.winRate || 0;
  const sampleSize = ctx.sampleSize || 0;
  
  if (lang === 'it') {
    if (sampleSize < 30) {
      return `Continua a raccogliere dati. Non modificare il sistema basandoti su pochi trade.`;
    }
    if (winRate >= 55) {
      return `Sistema validato. Puoi fidarti dei segnali con size normale.`;
    }
    if (winRate >= 45) {
      return `Sistema nella media. Usa size ridotta finché non migliora.`;
    }
    return `Sistema sottoperformante. Considera size minima o pausa.`;
  }
  
  if (sampleSize < 30) {
    return `Keep collecting data. Don't modify system based on few trades.`;
  }
  if (winRate >= 55) {
    return `System validated. You can trust signals with normal size.`;
  }
  if (winRate >= 45) {
    return `System average. Use reduced size until it improves.`;
  }
  return `System underperforming. Consider minimum size or pause.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// LIQUIDITY HELPER
// ═══════════════════════════════════════════════════════════════════════════

function getLiquidityWhyItHappens(ctx, lang) {
  const above = ctx.liquidityAbove || 0;
  const below = ctx.liquidityBelow || 0;
  
  if (lang === 'it') {
    if (above > below * 1.5) {
      return `Più stop loss SOPRA → il prezzo è attratto verso l'alto per "cacciarli".`;
    }
    if (below > above * 1.5) {
      return `Più stop loss SOTTO → il prezzo è attratto verso il basso per "cacciarli".`;
    }
    return `Liquidità bilanciata. Il prezzo può andare in entrambe le direzioni.`;
  }
  
  if (above > below * 1.5) {
    return `More stop losses ABOVE → price attracted upward to "hunt" them.`;
  }
  if (below > above * 1.5) {
    return `More stop losses BELOW → price attracted downward to "hunt" them.`;
  }
  return `Balanced liquidity. Price can go either direction.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// QUALITY GATE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getQualityWhatItIs(ctx, lang) {
  const score = ctx.qualityScore || ctx.score || 0;
  
  if (lang === 'it') {
    if (score >= 80) return `Qualità ALTA (${score}/100). Molte confluenze allineate.`;
    if (score >= 60) return `Qualità MEDIA (${score}/100). Confluenze sufficienti ma non ideali.`;
    if (score >= 40) return `Qualità BASSA (${score}/100). Poche confluenze, setup debole.`;
    return `Qualità INSUFFICIENTE (${score}/100). Troppe incongruenze.`;
  }
  
  if (score >= 80) return `HIGH quality (${score}/100). Many aligned confluences.`;
  if (score >= 60) return `MEDIUM quality (${score}/100). Sufficient but not ideal confluences.`;
  if (score >= 40) return `LOW quality (${score}/100). Few confluences, weak setup.`;
  return `INSUFFICIENT quality (${score}/100). Too many inconsistencies.`;
}

function getQualityWhyItHappens(ctx, lang) {
  const score = ctx.qualityScore || ctx.score || 0;
  
  if (lang === 'it') {
    if (score >= 80) {
      return `Liquidità, whale, bias, timing tutti allineati → setup pulito.`;
    }
    if (score >= 60) {
      return `Alcune confluenze presenti ma non tutte → rischio maggiore.`;
    }
    return `Confluenze contrastanti o assenti → alto rischio di trappola.`;
  }
  
  if (score >= 80) {
    return `Liquidity, whales, bias, timing all aligned → clean setup.`;
  }
  if (score >= 60) {
    return `Some confluences present but not all → higher risk.`;
  }
  return `Conflicting or missing confluences → high trap risk.`;
}

export default HelpOverlay;
