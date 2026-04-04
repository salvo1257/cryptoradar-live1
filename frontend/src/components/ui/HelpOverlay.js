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
 * STYLE: Practical, trading-oriented, decision-focused. Max 2-3 lines each.
 */
function getHelpContent(cardType, language, context) {
  const isIt = language === 'it';
  
  const helpTexts = {
    // ═══════════════════════════════════════════════════════════════════
    // V3 SIGNAL CARD
    // ═══════════════════════════════════════════════════════════════════
    v3_signal: {
      it: {
        whatItIs: "Il tuo segnale di trading. Ti dice quando entrare, dove mettere lo stop e dove prendere profitto.",
        whatItMeansNow: getV3SignalContext(context, 'it'),
        howToRead: "Verde = puoi entrare ora. Giallo = aspetta, non è ancora il momento. Grigio = non fare nulla."
      },
      en: {
        whatItIs: "Your trading signal. Tells you when to enter, where to place stop, and where to take profit.",
        whatItMeansNow: getV3SignalContext(context, 'en'),
        howToRead: "Green = you can enter now. Yellow = wait, not yet. Gray = do nothing."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // MARKET REGIME
    // ═══════════════════════════════════════════════════════════════════
    market_regime: {
      it: {
        whatItIs: "Come si sta muovendo il mercato. Trend = direzione chiara. Range = su e giù senza direzione.",
        whatItMeansNow: getRegimeContext(context, 'it'),
        howToRead: "Trend = segui la direzione. Range = aspetta i bordi. Compressione = esplosione imminente, preparati."
      },
      en: {
        whatItIs: "How the market is moving. Trend = clear direction. Range = bouncing without direction.",
        whatItMeansNow: getRegimeContext(context, 'en'),
        howToRead: "Trend = follow direction. Range = wait for edges. Compression = explosion coming, get ready."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // QUALITY GATE
    // ═══════════════════════════════════════════════════════════════════
    quality_gate: {
      it: {
        whatItIs: "Quanto è affidabile questo segnale. Più alto = più sicuro da seguire.",
        whatItMeansNow: getQualityContext(context, 'it'),
        howToRead: "80+ = segnale forte, entra. 60-79 = ok ma riduci la size. Sotto 60 = meglio saltare."
      },
      en: {
        whatItIs: "How reliable this signal is. Higher = safer to follow.",
        whatItMeansNow: getQualityContext(context, 'en'),
        howToRead: "80+ = strong signal, enter. 60-79 = ok but reduce size. Below 60 = better skip."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // WHALE ACTIVITY
    // ═══════════════════════════════════════════════════════════════════
    whale_activity: {
      it: {
        whatItIs: "Cosa stanno facendo i 'pesci grossi' - fondi e trader con milioni.",
        whatItMeansNow: getWhaleContext(context, 'it'),
        howToRead: "Balene comprano = il prezzo probabilmente sale. Balene vendono = attenzione, potrebbe scendere."
      },
      en: {
        whatItIs: "What the 'big fish' are doing - funds and traders with millions.",
        whatItMeansNow: getWhaleContext(context, 'en'),
        howToRead: "Whales buying = price likely goes up. Whales selling = careful, might drop."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // LIQUIDITY LADDER
    // ═══════════════════════════════════════════════════════════════════
    liquidity_ladder: {
      it: {
        whatItIs: "Dove sono piazzati gli stop loss degli altri trader. Il prezzo va a 'cacciarli'.",
        whatItMeansNow: getLiquidityContext(context, 'it'),
        howToRead: "Il prezzo si muove verso le zone rosse per liquidare le posizioni. Usale come target."
      },
      en: {
        whatItIs: "Where other traders have their stop losses. Price hunts them.",
        whatItMeansNow: getLiquidityContext(context, 'en'),
        howToRead: "Price moves toward red zones to liquidate positions. Use them as targets."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // LIQUIDITY MAGNET
    // ═══════════════════════════════════════════════════════════════════
    liquidity_magnet: {
      it: {
        whatItIs: "Dove è probabile che vada il prezzo a breve. Come una calamita.",
        whatItMeansNow: getMagnetContext(context, 'it'),
        howToRead: "Freccia su = prezzo attratto verso l'alto. Freccia giù = attratto verso il basso. Segui la freccia."
      },
      en: {
        whatItIs: "Where price is likely to go soon. Like a magnet.",
        whatItMeansNow: getMagnetContext(context, 'en'),
        howToRead: "Arrow up = price pulled upward. Arrow down = pulled downward. Follow the arrow."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // MARKET BIAS
    // ═══════════════════════════════════════════════════════════════════
    market_bias: {
      it: {
        whatItIs: "La direzione generale del mercato in questo momento.",
        whatItMeansNow: getBiasContext(context, 'it'),
        howToRead: "Bullish = cerca solo long. Bearish = cerca solo short. Neutrale = non forzare, aspetta."
      },
      en: {
        whatItIs: "The overall market direction right now.",
        whatItMeansNow: getBiasContext(context, 'en'),
        howToRead: "Bullish = only look for longs. Bearish = only look for shorts. Neutral = don't force, wait."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // OPEN INTEREST
    // ═══════════════════════════════════════════════════════════════════
    open_interest: {
      it: {
        whatItIs: "Quanti soldi sono in gioco. Più OI = più carburante per il movimento.",
        whatItMeansNow: getOIContext(context, 'it'),
        howToRead: "OI sale = nuovo denaro entra, trend più forte. OI scende = trader escono, movimento in esaurimento."
      },
      en: {
        whatItIs: "How much money is in play. More OI = more fuel for the move.",
        whatItMeansNow: getOIContext(context, 'en'),
        howToRead: "OI rising = new money entering, stronger trend. OI falling = traders exiting, move exhausting."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // FUNDING RATE
    // ═══════════════════════════════════════════════════════════════════
    funding_rate: {
      it: {
        whatItIs: "Chi sta pagando chi. Mostra se tutti scommettono nella stessa direzione.",
        whatItMeansNow: getFundingContext(context, 'it'),
        howToRead: "Molto positivo = troppi long, rischio di crollo. Molto negativo = troppi short, rischio squeeze."
      },
      en: {
        whatItIs: "Who's paying whom. Shows if everyone is betting the same way.",
        whatItMeansNow: getFundingContext(context, 'en'),
        howToRead: "Very positive = too many longs, crash risk. Very negative = too many shorts, squeeze risk."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // SHADOW TARGET INSPECTOR
    // ═══════════════════════════════════════════════════════════════════
    shadow_targets: {
      it: {
        whatItIs: "Target sperimentali basati su dove si trova la liquidità reale. Solo osservazione.",
        whatItMeansNow: "Stiamo testando se questi target funzionano meglio di quelli standard.",
        howToRead: "Se shadow < standard = più conservativo, forse più sicuro. Osserva quale viene raggiunto prima."
      },
      en: {
        whatItIs: "Experimental targets based on real liquidity locations. Observation only.",
        whatItMeansNow: "We're testing if these targets work better than standard ones.",
        howToRead: "If shadow < standard = more conservative, maybe safer. Watch which gets hit first."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // V3 MONITORING
    // ═══════════════════════════════════════════════════════════════════
    v3_monitoring: {
      it: {
        whatItIs: "Come sta performando il sistema. Più vince = più puoi fidarti.",
        whatItMeansNow: getV3MonitoringContext(context, 'it'),
        howToRead: "Win Rate > 50% = il sistema funziona. Sotto 50% = qualcosa non va, riduci size."
      },
      en: {
        whatItIs: "How the system is performing. More wins = more you can trust it.",
        whatItMeansNow: getV3MonitoringContext(context, 'en'),
        howToRead: "Win Rate > 50% = system works. Below 50% = something's off, reduce size."
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // SIGNAL HISTORY
    // ═══════════════════════════════════════════════════════════════════
    signal_history: {
      it: {
        whatItIs: "Lo storico di tutti i segnali passati. Impara dai vincenti e dai perdenti.",
        whatItMeansNow: "Guarda quali setup hanno funzionato e in quali condizioni.",
        howToRead: "Cerca pattern: il sistema performa meglio in trend o in range? Di giorno o di notte?"
      },
      en: {
        whatItIs: "History of all past signals. Learn from winners and losers.",
        whatItMeansNow: "See which setups worked and under what conditions.",
        howToRead: "Look for patterns: does the system perform better in trend or range? Day or night?"
      }
    },

    // ═══════════════════════════════════════════════════════════════════
    // MARKET ENERGY
    // ═══════════════════════════════════════════════════════════════════
    market_energy: {
      it: {
        whatItIs: "Quanta 'benzina' ha il mercato per muoversi. Alta energia = movimenti violenti.",
        whatItMeansNow: getEnergyContext(context, 'it'),
        howToRead: "Alta = movimenti forti, segui il momentum. Bassa = mercato stanco, aspetta o riduci size."
      },
      en: {
        whatItIs: "How much 'fuel' the market has to move. High energy = violent moves.",
        whatItMeansNow: getEnergyContext(context, 'en'),
        howToRead: "High = strong moves, follow momentum. Low = tired market, wait or reduce size."
      }
    }
  };

  const content = helpTexts[cardType];
  if (!content) return null;
  
  return isIt ? content.it : content.en;
}

// ═══════════════════════════════════════════════════════════════════
// CONTEXT-AWARE HELPER FUNCTIONS
// Practical, trading-focused language
// ═══════════════════════════════════════════════════════════════════

function getV3SignalContext(ctx, lang) {
  const phase = ctx.phase || ctx.status;
  const direction = ctx.direction;
  
  if (lang === 'it') {
    if (phase === 'ENTRY_READY') return `Segnale ${direction} ATTIVO! Puoi entrare ora con stop e target già definiti.`;
    if (phase === 'WAITING_FOR_RETEST') return `Setup ${direction} in corso. Il prezzo sta tornando verso la zona entry. Aspetta.`;
    if (phase === 'SETUP_DETECTED') return `Possibile ${direction} individuato. Non entrare ancora, aspetta conferma.`;
    return 'Niente da fare. Quando appare un segnale, te lo mostro qui.';
  }
  
  if (phase === 'ENTRY_READY') return `${direction} signal ACTIVE! You can enter now with stop and targets set.`;
  if (phase === 'WAITING_FOR_RETEST') return `${direction} setup in progress. Price returning to entry zone. Wait.`;
  if (phase === 'SETUP_DETECTED') return `Possible ${direction} spotted. Don't enter yet, wait for confirmation.`;
  return 'Nothing to do. When a signal appears, I\'ll show you here.';
}

function getRegimeContext(ctx, lang) {
  const regime = ctx.regime || ctx.type;
  const confidence = ctx.confidence || 0;
  
  if (lang === 'it') {
    if (regime === 'TRENDING') return `Direzione chiara! Entra nella direzione del trend, non contro.`;
    if (regime === 'RANGE') return `Mercato bloccato tra supporto e resistenza. Compra in basso, vendi in alto.`;
    if (regime === 'VOLATILE') return `Movimenti imprevedibili. Riduci la size o stai fuori.`;
    if (regime === 'COMPRESSION') return `Energia in accumulo. Il prezzo esploderà presto - preparati!`;
    return 'Situazione poco chiara. Meglio aspettare prima di operare.';
  }
  
  if (regime === 'TRENDING') return `Clear direction! Enter with the trend, not against it.`;
  if (regime === 'RANGE') return `Market stuck between support and resistance. Buy low, sell high.`;
  if (regime === 'VOLATILE') return `Unpredictable moves. Reduce size or stay out.`;
  if (regime === 'COMPRESSION') return `Energy building up. Price will explode soon - get ready!`;
  return 'Unclear situation. Better wait before trading.';
}

function getQualityContext(ctx, lang) {
  const score = ctx.score || ctx.quality || 0;
  
  if (lang === 'it') {
    if (score >= 80) return `Segnale FORTE (${score}/100). Molte conferme, puoi entrare con fiducia.`;
    if (score >= 60) return `Segnale OK (${score}/100). Entra ma con size ridotta.`;
    if (score >= 40) return `Segnale DEBOLE (${score}/100). Poche conferme. Meglio aspettare uno migliore.`;
    return `Segnale SCADENTE (${score}/100). Non entrare.`;
  }
  
  if (score >= 80) return `STRONG signal (${score}/100). Many confirmations, enter with confidence.`;
  if (score >= 60) return `OK signal (${score}/100). Enter but with reduced size.`;
  if (score >= 40) return `WEAK signal (${score}/100). Few confirmations. Better wait for a stronger one.`;
  return `POOR signal (${score}/100). Don't enter.`;
}

function getWhaleContext(ctx, lang) {
  const direction = ctx.direction || ctx.dominant;
  const count = ctx.count || 0;
  
  if (lang === 'it') {
    if (direction === 'BUY' || direction === 'LONG') return `I big player stanno COMPRANDO. Buon segno per i long.`;
    if (direction === 'SELL' || direction === 'SHORT') return `I big player stanno VENDENDO. Attenzione ai long, favoriti i short.`;
    return 'I big player non si stanno muovendo. Nessun segnale da loro.';
  }
  
  if (direction === 'BUY' || direction === 'LONG') return `Big players are BUYING. Good sign for longs.`;
  if (direction === 'SELL' || direction === 'SHORT') return `Big players are SELLING. Careful with longs, shorts favored.`;
  return 'Big players not moving. No signal from them.';
}

function getLiquidityContext(ctx, lang) {
  const above = ctx.liquidityAbove || ctx.above || 0;
  const below = ctx.liquidityBelow || ctx.below || 0;
  
  if (lang === 'it') {
    if (above > below * 1.5) return `Molti stop loss SOPRA il prezzo. Il prezzo probabilmente salirà per 'cacciarli'.`;
    if (below > above * 1.5) return `Molti stop loss SOTTO il prezzo. Il prezzo probabilmente scenderà per 'cacciarli'.`;
    return 'Stop bilanciati sopra e sotto. Direzione incerta.';
  }
  
  if (above > below * 1.5) return `Many stop losses ABOVE price. Price will likely rise to hunt them.`;
  if (below > above * 1.5) return `Many stop losses BELOW price. Price will likely drop to hunt them.`;
  return 'Stops balanced above and below. Direction unclear.';
}

function getMagnetContext(ctx, lang) {
  const direction = ctx.magnetDirection || ctx.direction;
  const score = ctx.score || 0;
  
  if (lang === 'it') {
    if (direction === 'UP' || direction === 'LONG') return `Il prezzo è 'attratto' verso ALTO. Favoriti i LONG.`;
    if (direction === 'DOWN' || direction === 'SHORT') return `Il prezzo è 'attratto' verso BASSO. Favoriti i SHORT.`;
    return 'Nessuna direzione dominante. Aspetta che si decida.';
  }
  
  if (direction === 'UP' || direction === 'LONG') return `Price is 'pulled' UPWARD. LONGS favored.`;
  if (direction === 'DOWN' || direction === 'SHORT') return `Price is 'pulled' DOWNWARD. SHORTS favored.`;
  return 'No dominant direction. Wait for it to decide.';
}

function getBiasContext(ctx, lang) {
  const bias = ctx.bias || ctx.direction;
  const strength = ctx.strength || 0;
  
  if (lang === 'it') {
    if (bias === 'BULLISH') return `Il mercato vuole salire. Cerca solo LONG, ignora i short.`;
    if (bias === 'BEARISH') return `Il mercato vuole scendere. Cerca solo SHORT, ignora i long.`;
    return 'Mercato indeciso. Non forzare, aspetta una direzione chiara.';
  }
  
  if (bias === 'BULLISH') return `Market wants to go up. Only look for LONGS, ignore shorts.`;
  if (bias === 'BEARISH') return `Market wants to go down. Only look for SHORTS, ignore longs.`;
  return 'Market undecided. Don\'t force it, wait for clear direction.';
}

function getOIContext(ctx, lang) {
  const change = ctx.change24h || ctx.change || 0;
  const trend = ctx.trend;
  
  if (lang === 'it') {
    if (change > 5) return `Nuovo denaro sta entrando (+${change.toFixed(1)}%). Il trend ha carburante.`;
    if (change < -5) return `I trader stanno uscendo (${change.toFixed(1)}%). Movimento in esaurimento.`;
    return 'Situazione stabile. Né carburante nuovo né uscite.';
  }
  
  if (change > 5) return `New money entering (+${change.toFixed(1)}%). Trend has fuel.`;
  if (change < -5) return `Traders exiting (${change.toFixed(1)}%). Move exhausting.`;
  return 'Stable situation. Neither new fuel nor exits.';
}

function getFundingContext(ctx, lang) {
  const rate = ctx.rate || ctx.funding || 0;
  const normalized = rate * 100;
  
  if (lang === 'it') {
    if (normalized > 0.03) return `Troppi LONG aperti! Pagano caro. Rischio correzione.`;
    if (normalized > 0) return `Più long che short. Sentiment rialzista ma sano.`;
    if (normalized < -0.03) return `Troppi SHORT aperti! Pagano caro. Rischio squeeze verso l'alto.`;
    if (normalized < 0) return `Più short che long. Sentiment ribassista ma sano.`;
    return 'Equilibrio perfetto tra long e short.';
  }
  
  if (normalized > 0.03) return `Too many LONGS open! They're paying high fees. Correction risk.`;
  if (normalized > 0) return `More longs than shorts. Bullish but healthy sentiment.`;
  if (normalized < -0.03) return `Too many SHORTS open! They're paying high fees. Squeeze up risk.`;
  if (normalized < 0) return `More shorts than longs. Bearish but healthy sentiment.`;
  return 'Perfect balance between longs and shorts.';
}

function getEnergyContext(ctx, lang) {
  const level = ctx.level || ctx.energy || 'MEDIUM';
  const score = ctx.score || 50;
  
  if (lang === 'it') {
    if (level === 'HIGH' || score > 70) return `Mercato CARICO! Movimenti forti in arrivo. Segui il flusso.`;
    if (level === 'LOW' || score < 30) return `Mercato STANCO. Movimenti lenti. Aspetta o riduci aspettative.`;
    return 'Energia normale. Condizioni standard.';
  }
  
  if (level === 'HIGH' || score > 70) return `Market LOADED! Strong moves coming. Follow the flow.`;
  if (level === 'LOW' || score < 30) return `Market TIRED. Slow moves. Wait or lower expectations.`;
  return 'Normal energy. Standard conditions.';
}

function getV3MonitoringContext(ctx, lang) {
  const winRate = ctx.winRate || 0;
  const sampleSize = ctx.sampleSize || 0;
  
  if (lang === 'it') {
    if (sampleSize < 20) return `Solo ${sampleSize} segnali. Troppo presto per giudicare, continua a osservare.`;
    if (winRate >= 55) return `${winRate.toFixed(0)}% vincenti su ${sampleSize} segnali. Il sistema funziona bene!`;
    if (winRate >= 45) return `${winRate.toFixed(0)}% vincenti. Risultato nella media, monitorare.`;
    return `Solo ${winRate.toFixed(0)}% vincenti. Risultato sotto la media, attenzione.`;
  }
  
  if (sampleSize < 20) return `Only ${sampleSize} signals. Too early to judge, keep watching.`;
  if (winRate >= 55) return `${winRate.toFixed(0)}% winners on ${sampleSize} signals. System working well!`;
  if (winRate >= 45) return `${winRate.toFixed(0)}% winners. Average result, keep monitoring.`;
  return `Only ${winRate.toFixed(0)}% winners. Below average, be careful.`;
}

export default HelpOverlay;
