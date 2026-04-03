import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Minus, Target, Activity,
  Zap, BarChart2, ArrowUpCircle, ArrowDownCircle, 
  AlertCircle, CheckCircle, HelpCircle, RefreshCw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const MarketRegimeCard = ({ language = 'it' }) => {
  const [regime, setRegime] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRegime = async () => {
      try {
        const response = await fetch(`${API_URL}/api/trade-signal?lang=${language}`);
        const data = await response.json();
        setRegime(data.market_regime);
      } catch (error) {
        console.error('Error fetching market regime:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRegime();
    const interval = setInterval(fetchRegime, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [language]);

  if (loading) {
    return (
      <div className="bg-crypto-card/60 border border-crypto-border rounded-sm p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-crypto-accent" />
          <h3 className="text-sm font-semibold">
            {language === 'it' ? 'Regime di Mercato' : language === 'de' ? 'Marktregime' : language === 'pl' ? 'Reżim Rynku' : 'Market Regime'}
          </h3>
        </div>
        <div className="h-40 bg-crypto-surface/30 rounded-sm"></div>
      </div>
    );
  }

  if (!regime) {
    return (
      <div className="bg-crypto-card/60 border border-crypto-border rounded-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-crypto-accent" />
          <h3 className="text-sm font-semibold">
            {language === 'it' ? 'Regime di Mercato' : language === 'de' ? 'Marktregime' : language === 'pl' ? 'Reżim Rynku' : 'Market Regime'}
          </h3>
        </div>
        <div className="text-center py-4 text-zinc-500 text-sm">
          {language === 'it' ? 'Dati non disponibili' : language === 'de' ? 'Keine Daten verfügbar' : language === 'pl' ? 'Brak danych' : 'Data not available'}
        </div>
      </div>
    );
  }

  // Regime configurations
  const regimeConfig = {
    TREND: {
      icon: TrendingUp,
      color: 'text-blue-400',
      bgClass: 'bg-blue-500/20 border-blue-500/40',
      label: { it: 'TREND', en: 'TREND', de: 'TREND', pl: 'TREND' },
      description: { 
        it: 'Mercato direzionale', 
        en: 'Directional market',
        de: 'Gerichteter Markt',
        pl: 'Rynek kierunkowy'
      }
    },
    RANGE: {
      icon: Minus,
      color: 'text-yellow-400',
      bgClass: 'bg-yellow-500/20 border-yellow-500/40',
      label: { it: 'RANGE', en: 'RANGE', de: 'RANGE', pl: 'ZAKRES' },
      description: { 
        it: 'Mercato laterale', 
        en: 'Sideways market',
        de: 'Seitwärtsmarkt',
        pl: 'Rynek boczny'
      }
    },
    COMPRESSION: {
      icon: Target,
      color: 'text-purple-400',
      bgClass: 'bg-purple-500/20 border-purple-500/40',
      label: { it: 'COMPRESSIONE', en: 'COMPRESSION', de: 'KOMPRESSION', pl: 'KOMPRESJA' },
      description: { 
        it: 'Energia in accumulo', 
        en: 'Energy building',
        de: 'Energie baut auf',
        pl: 'Energia się gromadzi'
      }
    },
    EXPANSION: {
      icon: Zap,
      color: 'text-green-400',
      bgClass: 'bg-green-500/20 border-green-500/40',
      label: { it: 'ESPANSIONE', en: 'EXPANSION', de: 'EXPANSION', pl: 'EKSPANSJA' },
      description: { 
        it: 'Movimento forte', 
        en: 'Strong move',
        de: 'Starke Bewegung',
        pl: 'Silny ruch'
      }
    }
  };

  const biasConfig = {
    BULLISH: { icon: ArrowUpCircle, color: 'text-bullish', label: 'BULLISH' },
    BEARISH: { icon: ArrowDownCircle, color: 'text-bearish', label: 'BEARISH' },
    NEUTRAL: { icon: Minus, color: 'text-zinc-400', label: 'NEUTRAL' }
  };

  const config = regimeConfig[regime.regime] || regimeConfig.RANGE;
  const biasConf = biasConfig[regime.directional_bias] || biasConfig.NEUTRAL;
  const RegimeIcon = config.icon;
  const BiasIcon = biasConf.icon;

  // Get strength color
  const getStrengthColor = (strength) => {
    if (strength >= 70) return 'text-green-400';
    if (strength >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Labels
  const labels = {
    it: {
      regimeStrength: 'Forza Regime',
      directionalBias: 'Bias Direzionale',
      suggestedSetup: 'Setup Suggerito',
      regimeScores: 'Punteggi Regime',
      keyFactors: 'Fattori Chiave',
      biasAligned: 'Bias Allineato',
      whalesAligned: 'Whale Allineate',
      liquidityAligned: 'Liquidità Allineata',
      oiSupportive: 'OI Supportivo',
      trapRisk: 'Rischio Trappola',
      distanceToSR: 'Distanza S/R'
    },
    en: {
      regimeStrength: 'Regime Strength',
      directionalBias: 'Directional Bias',
      suggestedSetup: 'Suggested Setup',
      regimeScores: 'Regime Scores',
      keyFactors: 'Key Factors',
      biasAligned: 'Bias Aligned',
      whalesAligned: 'Whales Aligned',
      liquidityAligned: 'Liquidity Aligned',
      oiSupportive: 'OI Supportive',
      trapRisk: 'Trap Risk',
      distanceToSR: 'Distance to S/R'
    }
  };

  const t = labels[language] || labels.en;

  // Header title translations
  const headerTitle = {
    it: 'Regime di Mercato',
    en: 'Market Regime',
    de: 'Marktregime',
    pl: 'Reżim Rynku'
  };

  const tooltipText = {
    it: 'Classifica il contesto di mercato attuale per aiutarti a interpretare i segnali.',
    en: 'Classifies current market context to help you interpret signals.',
    de: 'Klassifiziert den aktuellen Marktkontext, um Ihnen bei der Interpretation von Signalen zu helfen.',
    pl: 'Klasyfikuje aktualny kontekst rynku, aby pomóc w interpretacji sygnałów.'
  };

  return (
    <div className="bg-crypto-card/60 border border-crypto-border rounded-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-crypto-accent" />
          <h3 className="text-sm font-semibold">
            {headerTitle[language] || headerTitle.en}
          </h3>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-4 h-4 text-zinc-500 hover:text-zinc-300" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-crypto-surface border-crypto-border">
              <p className="text-xs">
                {tooltipText[language] || tooltipText.en}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Main Regime Display */}
      <div className={cn(
        "p-4 rounded-sm border mb-4",
        config.bgClass
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <RegimeIcon className={cn("w-8 h-8", config.color)} />
            <div>
              <div className={cn("text-xl font-bold font-mono", config.color)}>
                {config.label[language] || config.label.en}
              </div>
              <div className="text-xs text-zinc-400">
                {config.description[language] || config.description.en}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={cn("text-2xl font-mono font-bold", getStrengthColor(regime.regime_strength))}>
              {regime.regime_strength}%
            </div>
            <div className="text-[10px] text-zinc-500">{t.regimeStrength}</div>
          </div>
        </div>
        
        {/* Directional Bias */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <span className="text-xs text-zinc-400">{t.directionalBias}</span>
          <div className="flex items-center gap-2">
            <BiasIcon className={cn("w-4 h-4", biasConf.color)} />
            <span className={cn("font-mono font-bold", biasConf.color)}>
              {biasConf.label}
            </span>
          </div>
        </div>
      </div>

      {/* Suggested Setup */}
      <div className="bg-crypto-surface/50 p-3 rounded-sm mb-4">
        <div className="text-xs text-zinc-500 mb-1">{t.suggestedSetup}</div>
        <div className="text-sm font-semibold text-white mb-2">
          {regime.suggested_setup}
        </div>
        <div className="text-xs text-zinc-400">
          {regime.setup_explanation}
        </div>
      </div>

      {/* Regime Scores */}
      <div className="mb-4">
        <div className="text-xs text-zinc-500 mb-2">{t.regimeScores}</div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { key: 'trend', label: 'TREND', score: regime.trend_score, color: 'blue' },
            { key: 'range', label: 'RANGE', score: regime.range_score, color: 'yellow' },
            { key: 'compression', label: 'COMP', score: regime.compression_score, color: 'purple' },
            { key: 'expansion', label: 'EXP', score: regime.expansion_score, color: 'green' }
          ].map((item) => (
            <div 
              key={item.key} 
              className={cn(
                "text-center p-2 rounded-sm",
                regime.regime.toLowerCase().includes(item.key.toLowerCase()) 
                  ? `bg-${item.color}-500/20 border border-${item.color}-500/40`
                  : "bg-crypto-surface/30"
              )}
            >
              <div className="text-[10px] text-zinc-500">{item.label}</div>
              <div className={cn(
                "text-sm font-mono font-bold",
                regime.regime.toLowerCase().includes(item.key.toLowerCase())
                  ? `text-${item.color}-400`
                  : "text-zinc-400"
              )}>
                {item.score}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Factors */}
      <div className="mb-4">
        <div className="text-xs text-zinc-500 mb-2">{t.keyFactors}</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between text-xs p-2 bg-crypto-surface/30 rounded-sm">
            <span className="text-zinc-400">{t.biasAligned}</span>
            {regime.bias_alignment ? (
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            )}
          </div>
          <div className="flex items-center justify-between text-xs p-2 bg-crypto-surface/30 rounded-sm">
            <span className="text-zinc-400">{t.whalesAligned}</span>
            {regime.whale_alignment ? (
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            )}
          </div>
          <div className="flex items-center justify-between text-xs p-2 bg-crypto-surface/30 rounded-sm">
            <span className="text-zinc-400">{t.liquidityAligned}</span>
            {regime.liquidity_alignment ? (
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            )}
          </div>
          <div className="flex items-center justify-between text-xs p-2 bg-crypto-surface/30 rounded-sm">
            <span className="text-zinc-400">{t.oiSupportive}</span>
            {regime.oi_supportive ? (
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            )}
          </div>
          <div className="flex items-center justify-between text-xs p-2 bg-crypto-surface/30 rounded-sm">
            <span className="text-zinc-400">{t.trapRisk}</span>
            <Badge className={cn(
              "text-[9px] font-mono",
              regime.trap_risk === 'LOW' ? "bg-green-500/20 text-green-400" :
              regime.trap_risk === 'MEDIUM' ? "bg-yellow-500/20 text-yellow-400" :
              "bg-red-500/20 text-red-400"
            )}>
              {regime.trap_risk}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-xs p-2 bg-crypto-surface/30 rounded-sm">
            <span className="text-zinc-400">{t.distanceToSR}</span>
            <Badge className={cn(
              "text-[9px] font-mono",
              regime.distance_to_sr === 'FAR' ? "bg-green-500/20 text-green-400" :
              regime.distance_to_sr === 'MEDIUM' ? "bg-yellow-500/20 text-yellow-400" :
              "bg-red-500/20 text-red-400"
            )}>
              {regime.distance_to_sr}
            </Badge>
          </div>
        </div>
      </div>

      {/* Signals */}
      {regime.signals && regime.signals.length > 0 && (
        <div>
          <div className="text-xs text-zinc-500 mb-2">
            {language === 'it' ? 'Segnali Rilevati' : 'Detected Signals'}
          </div>
          <div className="space-y-1">
            {regime.signals.map((signal, index) => (
              <div 
                key={index} 
                className="text-[11px] text-zinc-400 flex items-start gap-2"
              >
                <span className="text-crypto-accent">•</span>
                <span>{signal}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketRegimeCard;
