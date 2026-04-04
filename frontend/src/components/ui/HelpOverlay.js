import React from 'react';
import { Lightbulb, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * HelpOverlay - Didactic help overlay for CryptoRadar cards
 * 
 * Shows contextual explanations when Learn Mode is enabled.
 * Each explanation includes:
 * 1. What this card is
 * 2. What it means now (context-aware)
 * 3. How to read it
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

  // Determine sentiment color based on context
  const getSentimentIndicator = () => {
    const sentiment = contextData.sentiment || contextData.direction || contextData.bias;
    if (!sentiment) return null;
    
    const lower = String(sentiment).toLowerCase();
    if (lower.includes('bull') || lower.includes('long') || lower === 'positive') {
      return <TrendingUp className="w-4 h-4 text-bullish" />;
    }
    if (lower.includes('bear') || lower.includes('short') || lower === 'negative') {
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
          {/* What it is */}
          <div>
            <span className="text-amber-400 font-semibold">
              {language === 'it' ? 'Cos\'è: ' : 'What it is: '}
            </span>
            <span className="text-zinc-300">{content.whatItIs}</span>
          </div>
          
          {/* What it means now */}
          <div className="flex items-start gap-1.5">
            <span className="text-amber-400 font-semibold flex-shrink-0">
              {language === 'it' ? 'Ora: ' : 'Now: '}
            </span>
            <div className="flex items-center gap-1.5">
              {getSentimentIndicator()}
              <span className="text-zinc-200">{content.whatItMeansNow}</span>
            </div>
          </div>
          
          {/* How to read it */}
          <div>
            <span className="text-amber-400 font-semibold">
              {language === 'it' ? 'Come leggerlo: ' : 'How to read: '}
            </span>
            <span className="text-zinc-400">{content.howToRead}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Get help content for each card type
 */
function getHelpContent(cardType, language, context) {
  const isIt = language === 'it';
  
  const helpTexts = {
    // ═══════════════════════════════════════════════════════════════════
    // V3 SIGNAL CARD
    // ═══════════════════════════════════════════════════════════════════
    v3_signal: {
      it: {
        whatItIs: "Il segnale principale V3 combina l'analisi 4H (struttura) con trigger 5M (timing).",
        whatItMeansNow: getV3SignalContext(context, 'it'),
        howToRead: "Verde = pronto per entrare. Giallo = setup in formazione, attendi. Grigio = nessun setup valido."
      },
      en: {
        whatItIs: "The main V3 signal combines 4H analysis (structure) with 5M triggers (timing).",
        whatItMeansNow: getV3SignalContext(context, 'en'),
        howToRead: "Green = ready to enter. Yellow = setup forming, wait. Gray = no valid setup."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // MARKET REGIME
    // ═══════════════════════════════════════════════════════════════════
    market_regime: {
      it: {
        whatItIs: "Classifica il mercato in 4 stati: TRENDING, RANGE, VOLATILE, COMPRESSION.",
        whatItMeansNow: getRegimeContext(context, 'it'),
        howToRead: "TRENDING = segui il trend. RANGE = compra basso, vendi alto. VOLATILE = riduci size. COMPRESSION = aspetta breakout."
      },
      en: {
        whatItIs: "Classifies the market into 4 states: TRENDING, RANGE, VOLATILE, COMPRESSION.",
        whatItMeansNow: getRegimeContext(context, 'en'),
        howToRead: "TRENDING = follow the trend. RANGE = buy low, sell high. VOLATILE = reduce size. COMPRESSION = wait for breakout."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // QUALITY GATE
    // ═══════════════════════════════════════════════════════════════════
    quality_gate: {
      it: {
        whatItIs: "Valuta la qualità del segnale su 100 punti. Include confluenze, timing e rischio.",
        whatItMeansNow: getQualityContext(context, 'it'),
        howToRead: "80+ = eccellente, entra con size piena. 60-80 = buono, size ridotta. <60 = scarta il segnale."
      },
      en: {
        whatItIs: "Evaluates signal quality out of 100 points. Includes confluences, timing and risk.",
        whatItMeansNow: getQualityContext(context, 'en'),
        howToRead: "80+ = excellent, full size. 60-80 = good, reduced size. <60 = skip the signal."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // WHALE ACTIVITY
    // ═══════════════════════════════════════════════════════════════════
    whale_activity: {
      it: {
        whatItIs: "Monitora ordini grandi (>$100K) che indicano attività istituzionale.",
        whatItMeansNow: getWhaleContext(context, 'it'),
        howToRead: "Balene in acquisto = supporto. Balene in vendita = resistenza. Guarda la direzione dominante."
      },
      en: {
        whatItIs: "Monitors large orders (>$100K) indicating institutional activity.",
        whatItMeansNow: getWhaleContext(context, 'en'),
        howToRead: "Whales buying = support. Whales selling = resistance. Watch the dominant direction."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // LIQUIDITY LADDER
    // ═══════════════════════════════════════════════════════════════════
    liquidity_ladder: {
      it: {
        whatItIs: "Mostra dove sono concentrati gli stop loss e le liquidazioni.",
        whatItMeansNow: getLiquidityContext(context, 'it'),
        howToRead: "Il prezzo tende a muoversi VERSO la liquidità per 'pulire' gli stop. Zone rosse = target probabile."
      },
      en: {
        whatItIs: "Shows where stop losses and liquidations are concentrated.",
        whatItMeansNow: getLiquidityContext(context, 'en'),
        howToRead: "Price tends to move TOWARDS liquidity to 'sweep' stops. Red zones = likely target."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // LIQUIDITY MAGNET
    // ═══════════════════════════════════════════════════════════════════
    liquidity_magnet: {
      it: {
        whatItIs: "Indica la direzione più probabile del prezzo basata sulla liquidità aggregata.",
        whatItMeansNow: getMagnetContext(context, 'it'),
        howToRead: "Freccia su = più liquidità sopra, prezzo attratto verso l'alto. Freccia giù = opposto."
      },
      en: {
        whatItIs: "Indicates the most likely price direction based on aggregated liquidity.",
        whatItMeansNow: getMagnetContext(context, 'en'),
        howToRead: "Arrow up = more liquidity above, price attracted upward. Arrow down = opposite."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // MARKET BIAS
    // ═══════════════════════════════════════════════════════════════════
    market_bias: {
      it: {
        whatItIs: "Analisi multi-fattore che indica la direzione di fondo del mercato.",
        whatItMeansNow: getBiasContext(context, 'it'),
        howToRead: "BULLISH = cerca long. BEARISH = cerca short. NEUTRAL = aspetta segnale chiaro."
      },
      en: {
        whatItIs: "Multi-factor analysis indicating the underlying market direction.",
        whatItMeansNow: getBiasContext(context, 'en'),
        howToRead: "BULLISH = look for longs. BEARISH = look for shorts. NEUTRAL = wait for clear signal."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // OPEN INTEREST
    // ═══════════════════════════════════════════════════════════════════
    open_interest: {
      it: {
        whatItIs: "Totale delle posizioni aperte sui derivati. Indica il 'carburante' del mercato.",
        whatItMeansNow: getOIContext(context, 'it'),
        howToRead: "OI sale + prezzo sale = trend sano. OI sale + prezzo scende = short squeeze imminente. OI scende = posizioni chiudono."
      },
      en: {
        whatItIs: "Total open positions in derivatives. Indicates market 'fuel'.",
        whatItMeansNow: getOIContext(context, 'en'),
        howToRead: "OI up + price up = healthy trend. OI up + price down = short squeeze coming. OI down = positions closing."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // FUNDING RATE
    // ═══════════════════════════════════════════════════════════════════
    funding_rate: {
      it: {
        whatItIs: "Costo per mantenere posizioni long/short. Indica il sentiment dei futures.",
        whatItMeansNow: getFundingContext(context, 'it'),
        howToRead: "Positivo = long pagano short, mercato bullish. Negativo = short pagano long, mercato bearish. Estremo = inversione vicina."
      },
      en: {
        whatItIs: "Cost to hold long/short positions. Indicates futures sentiment.",
        whatItMeansNow: getFundingContext(context, 'en'),
        howToRead: "Positive = longs pay shorts, bullish. Negative = shorts pay longs, bearish. Extreme = reversal near."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // SHADOW TARGET INSPECTOR
    // ═══════════════════════════════════════════════════════════════════
    shadow_targets: {
      it: {
        whatItIs: "Analisi sperimentale dei target basati sulla liquidità. NON usati live.",
        whatItMeansNow: "Raccolta dati per validare target alternativi basati su dove si trova la liquidità reale.",
        howToRead: "Confronta Shadow T1 vs Standard T1. Se shadow è più conservativo, potrebbe essere più sicuro."
      },
      en: {
        whatItIs: "Experimental liquidity-based target analysis. NOT used live.",
        whatItMeansNow: "Collecting data to validate alternative targets based on real liquidity location.",
        howToRead: "Compare Shadow T1 vs Standard T1. If shadow is more conservative, it may be safer."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // V3 MONITORING
    // ═══════════════════════════════════════════════════════════════════
    v3_monitoring: {
      it: {
        whatItIs: "Statistiche di performance del motore V3. Traccia win rate, conversioni e timing.",
        whatItMeansNow: getV3MonitoringContext(context, 'it'),
        howToRead: "Win Rate > 50% = edge positivo. Conversion Rate alto = i setup si trasformano in entry. 50+ segnali = dati affidabili."
      },
      en: {
        whatItIs: "V3 engine performance statistics. Tracks win rate, conversions and timing.",
        whatItMeansNow: getV3MonitoringContext(context, 'en'),
        howToRead: "Win Rate > 50% = positive edge. High Conversion Rate = setups become entries. 50+ signals = reliable data."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // SIGNAL HISTORY
    // ═══════════════════════════════════════════════════════════════════
    signal_history: {
      it: {
        whatItIs: "Storico completo di tutti i segnali con outcome verificati.",
        whatItMeansNow: "Analizza i pattern di successo e fallimento per migliorare le decisioni future.",
        howToRead: "Filtra per direzione, outcome e timeframe. Cerca pattern nei WIN vs LOSS."
      },
      en: {
        whatItIs: "Complete history of all signals with verified outcomes.",
        whatItMeansNow: "Analyze success and failure patterns to improve future decisions.",
        howToRead: "Filter by direction, outcome and timeframe. Look for patterns in WIN vs LOSS."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // MARKET ENERGY
    // ═══════════════════════════════════════════════════════════════════
    market_energy: {
      it: {
        whatItIs: "Misura la forza del movimento attuale combinando volume, volatilità e momentum.",
        whatItMeansNow: getEnergyContext(context, 'it'),
        howToRead: "Alta energia = movimenti forti, segui il trend. Bassa energia = mercato stanco, aspetta."
      },
      en: {
        whatItIs: "Measures current movement strength combining volume, volatility and momentum.",
        whatItMeansNow: getEnergyContext(context, 'en'),
        howToRead: "High energy = strong moves, follow trend. Low energy = tired market, wait."
      }
    }
  };

  const content = helpTexts[cardType];
  if (!content) return null;
  
  return isIt ? content.it : content.en;
}

// ═══════════════════════════════════════════════════════════════════
// CONTEXT-AWARE HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function getV3SignalContext(ctx, lang) {
  const phase = ctx.phase || ctx.status;
  const direction = ctx.direction;
  
  if (lang === 'it') {
    if (phase === 'ENTRY_READY') return `Segnale ${direction} pronto! Entry, stop e target definiti.`;
    if (phase === 'WAITING_FOR_RETEST') return `Setup ${direction} in attesa di retest per entry ottimale.`;
    if (phase === 'SETUP_DETECTED') return `Setup ${direction} rilevato. In attesa di conferma.`;
    return 'Nessun setup attivo. Il mercato non offre opportunità chiare.';
  }
  
  if (phase === 'ENTRY_READY') return `${direction} signal ready! Entry, stop and targets defined.`;
  if (phase === 'WAITING_FOR_RETEST') return `${direction} setup waiting for retest for optimal entry.`;
  if (phase === 'SETUP_DETECTED') return `${direction} setup detected. Waiting for confirmation.`;
  return 'No active setup. Market not offering clear opportunities.';
}

function getRegimeContext(ctx, lang) {
  const regime = ctx.regime || ctx.type;
  const confidence = ctx.confidence || 0;
  
  if (lang === 'it') {
    if (regime === 'TRENDING') return `Mercato in TREND (${confidence}% conf.). Segui la direzione.`;
    if (regime === 'RANGE') return `Mercato in RANGE (${confidence}% conf.). Compra supporto, vendi resistenza.`;
    if (regime === 'VOLATILE') return `Alta VOLATILITÀ (${confidence}% conf.). Riduci size, allarga stop.`;
    if (regime === 'COMPRESSION') return `COMPRESSIONE (${confidence}% conf.). Breakout imminente.`;
    return 'Regime non determinato. Attendi chiarezza.';
  }
  
  if (regime === 'TRENDING') return `TRENDING market (${confidence}% conf.). Follow direction.`;
  if (regime === 'RANGE') return `RANGE market (${confidence}% conf.). Buy support, sell resistance.`;
  if (regime === 'VOLATILE') return `High VOLATILITY (${confidence}% conf.). Reduce size, widen stops.`;
  if (regime === 'COMPRESSION') return `COMPRESSION (${confidence}% conf.). Breakout imminent.`;
  return 'Regime not determined. Wait for clarity.';
}

function getQualityContext(ctx, lang) {
  const score = ctx.score || ctx.quality || 0;
  
  if (lang === 'it') {
    if (score >= 80) return `Score ${score}/100 = ECCELLENTE. Alta confluenza, entra con fiducia.`;
    if (score >= 60) return `Score ${score}/100 = BUONO. Confluenza media, riduci size.`;
    if (score >= 40) return `Score ${score}/100 = MEDIOCRE. Poche confluenze, considera di saltare.`;
    return `Score ${score}/100 = BASSO. Non operare su questo segnale.`;
  }
  
  if (score >= 80) return `Score ${score}/100 = EXCELLENT. High confluence, enter with confidence.`;
  if (score >= 60) return `Score ${score}/100 = GOOD. Medium confluence, reduce size.`;
  if (score >= 40) return `Score ${score}/100 = MEDIOCRE. Few confluences, consider skipping.`;
  return `Score ${score}/100 = LOW. Don't trade this signal.`;
}

function getWhaleContext(ctx, lang) {
  const direction = ctx.direction || ctx.dominant;
  const count = ctx.count || 0;
  
  if (lang === 'it') {
    if (direction === 'BUY' || direction === 'LONG') return `${count} ordini whale in ACQUISTO. Supporto istituzionale.`;
    if (direction === 'SELL' || direction === 'SHORT') return `${count} ordini whale in VENDITA. Pressione ribassista.`;
    return 'Attività balene bilanciata. Nessuna direzione dominante.';
  }
  
  if (direction === 'BUY' || direction === 'LONG') return `${count} whale orders BUYING. Institutional support.`;
  if (direction === 'SELL' || direction === 'SHORT') return `${count} whale orders SELLING. Bearish pressure.`;
  return 'Whale activity balanced. No dominant direction.';
}

function getLiquidityContext(ctx, lang) {
  const above = ctx.liquidityAbove || ctx.above || 0;
  const below = ctx.liquidityBelow || ctx.below || 0;
  
  if (lang === 'it') {
    if (above > below * 1.5) return `Più liquidità SOPRA ($${(above/1e6).toFixed(1)}M). Prezzo attratto verso l'alto.`;
    if (below > above * 1.5) return `Più liquidità SOTTO ($${(below/1e6).toFixed(1)}M). Prezzo attratto verso il basso.`;
    return 'Liquidità bilanciata sopra e sotto. Nessuna direzione chiara.';
  }
  
  if (above > below * 1.5) return `More liquidity ABOVE ($${(above/1e6).toFixed(1)}M). Price attracted upward.`;
  if (below > above * 1.5) return `More liquidity BELOW ($${(below/1e6).toFixed(1)}M). Price attracted downward.`;
  return 'Liquidity balanced above and below. No clear direction.';
}

function getMagnetContext(ctx, lang) {
  const direction = ctx.magnetDirection || ctx.direction;
  const score = ctx.score || 0;
  
  if (lang === 'it') {
    if (direction === 'UP' || direction === 'LONG') return `Magnete RIALZISTA (${score}%). Liquidità attrae il prezzo verso l'alto.`;
    if (direction === 'DOWN' || direction === 'SHORT') return `Magnete RIBASSISTA (${score}%). Liquidità attrae il prezzo verso il basso.`;
    return 'Direzione magnete neutrale. Attendi polarizzazione.';
  }
  
  if (direction === 'UP' || direction === 'LONG') return `BULLISH magnet (${score}%). Liquidity attracts price upward.`;
  if (direction === 'DOWN' || direction === 'SHORT') return `BEARISH magnet (${score}%). Liquidity attracts price downward.`;
  return 'Neutral magnet direction. Wait for polarization.';
}

function getBiasContext(ctx, lang) {
  const bias = ctx.bias || ctx.direction;
  const strength = ctx.strength || 0;
  
  if (lang === 'it') {
    if (bias === 'BULLISH') return `Bias RIALZISTA (${strength}%). Cerca opportunità LONG.`;
    if (bias === 'BEARISH') return `Bias RIBASSISTA (${strength}%). Cerca opportunità SHORT.`;
    return 'Bias NEUTRALE. Non forzare trades, aspetta direzione chiara.';
  }
  
  if (bias === 'BULLISH') return `BULLISH bias (${strength}%). Look for LONG opportunities.`;
  if (bias === 'BEARISH') return `BEARISH bias (${strength}%). Look for SHORT opportunities.`;
  return 'NEUTRAL bias. Don\'t force trades, wait for clear direction.';
}

function getOIContext(ctx, lang) {
  const change = ctx.change24h || ctx.change || 0;
  const trend = ctx.trend;
  
  if (lang === 'it') {
    if (change > 5) return `OI in AUMENTO (+${change.toFixed(1)}%). Nuove posizioni aperte, trend supportato.`;
    if (change < -5) return `OI in CALO (${change.toFixed(1)}%). Posizioni chiuse, possibile esaurimento.`;
    return 'OI stabile. Mercato in equilibrio.';
  }
  
  if (change > 5) return `OI INCREASING (+${change.toFixed(1)}%). New positions opened, trend supported.`;
  if (change < -5) return `OI DECREASING (${change.toFixed(1)}%). Positions closed, possible exhaustion.`;
  return 'OI stable. Market in balance.';
}

function getFundingContext(ctx, lang) {
  const rate = ctx.rate || ctx.funding || 0;
  const normalized = rate * 100; // Convert to percentage
  
  if (lang === 'it') {
    if (normalized > 0.03) return `Funding POSITIVO ALTO (${normalized.toFixed(3)}%). Long pagano, possibile correzione.`;
    if (normalized > 0) return `Funding positivo (${normalized.toFixed(3)}%). Sentiment bullish moderato.`;
    if (normalized < -0.03) return `Funding NEGATIVO ALTO (${normalized.toFixed(3)}%). Short pagano, possibile squeeze.`;
    if (normalized < 0) return `Funding negativo (${normalized.toFixed(3)}%). Sentiment bearish moderato.`;
    return 'Funding neutrale. Mercato bilanciato.';
  }
  
  if (normalized > 0.03) return `HIGH POSITIVE funding (${normalized.toFixed(3)}%). Longs paying, correction possible.`;
  if (normalized > 0) return `Positive funding (${normalized.toFixed(3)}%). Moderate bullish sentiment.`;
  if (normalized < -0.03) return `HIGH NEGATIVE funding (${normalized.toFixed(3)}%). Shorts paying, squeeze possible.`;
  if (normalized < 0) return `Negative funding (${normalized.toFixed(3)}%). Moderate bearish sentiment.`;
  return 'Neutral funding. Balanced market.';
}

function getEnergyContext(ctx, lang) {
  const level = ctx.level || ctx.energy || 'MEDIUM';
  const score = ctx.score || 50;
  
  if (lang === 'it') {
    if (level === 'HIGH' || score > 70) return `Energia ALTA (${score}%). Movimenti forti attesi, segui il momentum.`;
    if (level === 'LOW' || score < 30) return `Energia BASSA (${score}%). Mercato stanco, aspetta accumulo.`;
    return `Energia media (${score}%). Condizioni normali.`;
  }
  
  if (level === 'HIGH' || score > 70) return `HIGH energy (${score}%). Strong moves expected, follow momentum.`;
  if (level === 'LOW' || score < 30) return `LOW energy (${score}%). Tired market, wait for accumulation.`;
  return `Medium energy (${score}%). Normal conditions.`;
}

function getV3MonitoringContext(ctx, lang) {
  const winRate = ctx.winRate || 0;
  const sampleSize = ctx.sampleSize || 0;
  
  if (lang === 'it') {
    if (sampleSize < 20) return `Solo ${sampleSize} segnali raccolti. Dati preliminari, continua a monitorare.`;
    if (winRate >= 55) return `Win rate ${winRate.toFixed(1)}% su ${sampleSize} segnali. Edge positivo confermato!`;
    if (winRate >= 45) return `Win rate ${winRate.toFixed(1)}% su ${sampleSize} segnali. Performance nella media.`;
    return `Win rate ${winRate.toFixed(1)}% su ${sampleSize} segnali. Sotto le aspettative.`;
  }
  
  if (sampleSize < 20) return `Only ${sampleSize} signals collected. Preliminary data, keep monitoring.`;
  if (winRate >= 55) return `Win rate ${winRate.toFixed(1)}% on ${sampleSize} signals. Positive edge confirmed!`;
  if (winRate >= 45) return `Win rate ${winRate.toFixed(1)}% on ${sampleSize} signals. Average performance.`;
  return `Win rate ${winRate.toFixed(1)}% on ${sampleSize} signals. Below expectations.`;
}

export default HelpOverlay;
