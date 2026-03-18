import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Target, Shield, Clock, 
  ChevronDown, ChevronUp, Activity, Zap, Eye, 
  AlertTriangle, CheckCircle, XCircle, Timer, Pause,
  Crosshair, BarChart2, Layers, RefreshCw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Phase configurations with clear visual distinction
const PHASE_CONFIG = {
  SETUP_DETECTED: {
    label: { it: 'SETUP RILEVATO', en: 'SETUP DETECTED' },
    shortLabel: { it: 'SETUP', en: 'SETUP' },
    color: 'text-blue-400',
    bgClass: 'bg-blue-500/20',
    borderClass: 'border-blue-500/50',
    icon: Eye,
    description: { it: 'Evento 4H rilevato, in attesa di retest', en: '4H event detected, waiting for retest' }
  },
  WAITING_FOR_RETEST: {
    label: { it: 'ATTESA RETEST', en: 'WAITING RETEST' },
    shortLabel: { it: 'ATTESA', en: 'WAITING' },
    color: 'text-yellow-400',
    bgClass: 'bg-yellow-500/20',
    borderClass: 'border-yellow-500/50',
    icon: Timer,
    pulse: true,
    description: { it: 'Prezzo in avvicinamento alla zona', en: 'Price approaching zone' }
  },
  ENTRY_READY: {
    label: { it: 'ENTRY PRONTO', en: 'ENTRY READY' },
    shortLabel: { it: 'ENTRY', en: 'ENTRY' },
    color: 'text-green-400',
    bgClass: 'bg-green-500/20',
    borderClass: 'border-green-500/50',
    icon: CheckCircle,
    pulse: true,
    description: { it: 'Conferma 5M ricevuta - pronto per entry', en: '5M confirmation received - ready for entry' }
  },
  EXECUTED: {
    label: { it: 'ESEGUITO', en: 'EXECUTED' },
    shortLabel: { it: 'ESEGUITO', en: 'EXECUTED' },
    color: 'text-purple-400',
    bgClass: 'bg-purple-500/20',
    borderClass: 'border-purple-500/40',
    icon: CheckCircle,
    description: { it: 'Trade eseguito', en: 'Trade executed' }
  },
  EXPIRED: {
    label: { it: 'SCADUTO', en: 'EXPIRED' },
    shortLabel: { it: 'SCADUTO', en: 'EXPIRED' },
    color: 'text-zinc-500',
    bgClass: 'bg-zinc-500/20',
    borderClass: 'border-zinc-500/40',
    icon: XCircle,
    description: { it: 'Setup scaduto (>8h)', en: 'Setup expired (>8h)' }
  },
  INVALIDATED: {
    label: { it: 'INVALIDATO', en: 'INVALIDATED' },
    shortLabel: { it: 'INVALIDATO', en: 'INVALIDATED' },
    color: 'text-red-400',
    bgClass: 'bg-red-500/20',
    borderClass: 'border-red-500/40',
    icon: XCircle,
    description: { it: 'Setup invalidato dal prezzo', en: 'Setup invalidated by price' }
  }
};

// Event type configurations
const EVENT_TYPE_CONFIG = {
  resistance_breakout: { 
    label: { it: 'Breakout Resistenza', en: 'Resistance Breakout' },
    icon: TrendingUp,
    color: 'text-green-400'
  },
  support_breakout: { 
    label: { it: 'Breakout Supporto', en: 'Support Breakout' },
    icon: TrendingDown,
    color: 'text-red-400'
  },
  liquidity_sweep_high: { 
    label: { it: 'Sweep Liquidità (Alto)', en: 'Liquidity Sweep (High)' },
    icon: Zap,
    color: 'text-orange-400'
  },
  liquidity_sweep_low: { 
    label: { it: 'Sweep Liquidità (Basso)', en: 'Liquidity Sweep (Low)' },
    icon: Zap,
    color: 'text-orange-400'
  },
  trend_continuation: { 
    label: { it: 'Trend Continuation', en: 'Trend Continuation' },
    icon: Activity,
    color: 'text-blue-400'
  }
};

// Confirmation type configurations
const CONFIRMATION_CONFIG = {
  rejection_candle: { 
    label: { it: 'Candela Rifiuto', en: 'Rejection Candle' },
    description: { it: 'Wick > body', en: 'Wick > body' }
  },
  stabilization: { 
    label: { it: 'Stabilizzazione', en: 'Stabilization' },
    description: { it: '2-3 candele in zona', en: '2-3 candles in zone' }
  },
  micro_structure_break: { 
    label: { it: 'Rottura Micro-Struttura', en: 'Micro-Structure Break' },
    description: { it: 'Break swing 5M', en: '5M swing break' }
  }
};

// Regime configurations
const REGIME_CONFIG = {
  TREND: { color: 'text-blue-400', bg: 'bg-blue-500/20' },
  RANGE: { color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  COMPRESSION: { color: 'text-purple-400', bg: 'bg-purple-500/20' },
  EXPANSION: { color: 'text-orange-400', bg: 'bg-orange-500/20' }
};

export function V3SignalCard({ language = 'it' }) {
  const [v3Data, setV3Data] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchV3Signal = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v3/trade-signal?lang=${language}`);
      const data = await response.json();
      setV3Data(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching V3 signal:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchV3Signal();
    const interval = setInterval(fetchV3Signal, 30000); // Refresh every 30s for v3
    return () => clearInterval(interval);
  }, [language]);

  const formatPrice = (p) => {
    if (!p) return '-';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(p);
  };

  const formatPercent = (p) => {
    if (p === null || p === undefined) return '-';
    return `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`;
  };

  const getTimeRemaining = (expiresAt) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires - now;
    if (diff <= 0) return { text: language === 'it' ? 'Scaduto' : 'Expired', urgent: true };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return { text: `${hours}h ${minutes}m`, urgent: hours < 2 };
    }
    return { text: `${minutes}m`, urgent: true };
  };

  const t = (key) => {
    const translations = {
      it: {
        v3Engine: 'V3 Multi-Timeframe',
        noSetup: 'Nessun Setup Attivo',
        waitingFor4H: 'In attesa di evento 4H',
        marketContext: 'Contesto Mercato',
        regime: 'Regime',
        bias: 'Bias',
        energy: 'Energia',
        compression: 'Compressione',
        liquidity: 'Liquidità',
        above: 'Sopra',
        below: 'Sotto',
        entryZone: 'Zona Entry',
        stopLoss: 'Stop Loss',
        target1: 'Target 1',
        target2: 'Target 2',
        riskReward: 'R:R',
        quality: 'Qualità',
        validity: 'Validità',
        confirmation5m: 'Conferma 5M',
        pending: 'In attesa',
        setupType: 'Tipo Setup',
        direction: 'Direzione',
        structureBased: 'Struttura',
        liquidityBased: 'Liquidità',
        distance: 'Distanza',
        details: 'Dettagli',
        swingHigh: 'Swing High',
        swingLow: 'Swing Low',
        buffer: 'Buffer',
        refreshing: 'Aggiornamento...'
      },
      en: {
        v3Engine: 'V3 Multi-Timeframe',
        noSetup: 'No Active Setup',
        waitingFor4H: 'Waiting for 4H event',
        marketContext: 'Market Context',
        regime: 'Regime',
        bias: 'Bias',
        energy: 'Energy',
        compression: 'Compression',
        liquidity: 'Liquidity',
        above: 'Above',
        below: 'Below',
        entryZone: 'Entry Zone',
        stopLoss: 'Stop Loss',
        target1: 'Target 1',
        target2: 'Target 2',
        riskReward: 'R:R',
        quality: 'Quality',
        validity: 'Validity',
        confirmation5m: '5M Confirmation',
        pending: 'Pending',
        setupType: 'Setup Type',
        direction: 'Direction',
        structureBased: 'Structure',
        liquidityBased: 'Liquidity',
        distance: 'Distance',
        details: 'Details',
        swingHigh: 'Swing High',
        swingLow: 'Swing Low',
        buffer: 'Buffer',
        refreshing: 'Refreshing...'
      }
    };
    return translations[language]?.[key] || translations.en[key] || key;
  };

  if (loading) {
    return (
      <div className="bg-crypto-card/60 border border-crypto-border rounded-sm p-4 animate-pulse" data-testid="v3-signal-card-loading">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-crypto-accent" />
          <span className="text-sm font-semibold">{t('v3Engine')}</span>
        </div>
        <div className="h-32 bg-crypto-surface/30 rounded-sm"></div>
      </div>
    );
  }

  const setup = v3Data?.active_setup;
  const hasSetup = v3Data?.has_active_setup && setup;
  const phase = setup?.phase || null;
  const phaseConfig = phase ? PHASE_CONFIG[phase] : null;

  // Render Phase Badge - The most prominent element
  const renderPhaseBadge = () => {
    if (!hasSetup || !phaseConfig) {
      return (
        <div className="flex items-center gap-2">
          <Pause className="w-5 h-5 text-zinc-500" />
          <span className="text-lg font-bold text-zinc-500">{t('noSetup')}</span>
        </div>
      );
    }

    const PhaseIcon = phaseConfig.icon;
    return (
      <div className={cn(
        "flex items-center gap-3 px-4 py-2 rounded-sm border",
        phaseConfig.bgClass,
        phaseConfig.borderClass,
        phaseConfig.pulse && "animate-pulse"
      )}>
        <PhaseIcon className={cn("w-6 h-6", phaseConfig.color)} />
        <div>
          <div className={cn("text-lg font-bold", phaseConfig.color)}>
            {phaseConfig.shortLabel[language] || phaseConfig.shortLabel.en}
          </div>
          <div className="text-xs text-zinc-400">
            {phaseConfig.description[language] || phaseConfig.description.en}
          </div>
        </div>
      </div>
    );
  };

  // Render Direction Badge
  const renderDirectionBadge = () => {
    if (!hasSetup) return null;
    const isLong = setup.direction === 'LONG';
    return (
      <Badge 
        className={cn(
          "text-base font-bold px-3 py-1",
          isLong ? "bg-green-500/20 text-green-400 border-green-500/50" : "bg-red-500/20 text-red-400 border-red-500/50"
        )}
      >
        {isLong ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
        {setup.direction}
      </Badge>
    );
  };

  // Render Market Context (shown always)
  const renderMarketContext = () => {
    const regime = v3Data?.market_regime || 'UNKNOWN';
    const regimeStyle = REGIME_CONFIG[regime] || { color: 'text-zinc-400', bg: 'bg-zinc-500/20' };
    const bias = v3Data?.market_bias || 'NEUTRAL';
    const biasConfidence = v3Data?.bias_confidence || 0;
    
    return (
      <div className="grid grid-cols-3 gap-2 text-xs">
        {/* Regime */}
        <div className={cn("p-2 rounded-sm text-center", regimeStyle.bg)}>
          <div className="text-zinc-500 mb-1">{t('regime')}</div>
          <div className={cn("font-bold", regimeStyle.color)}>{regime}</div>
        </div>
        
        {/* Bias */}
        <div className={cn(
          "p-2 rounded-sm text-center",
          bias === 'BULLISH' ? 'bg-green-500/10' : bias === 'BEARISH' ? 'bg-red-500/10' : 'bg-zinc-500/10'
        )}>
          <div className="text-zinc-500 mb-1">{t('bias')}</div>
          <div className={cn(
            "font-bold",
            bias === 'BULLISH' ? 'text-green-400' : bias === 'BEARISH' ? 'text-red-400' : 'text-zinc-400'
          )}>
            {bias} <span className="text-zinc-500 font-normal">({biasConfidence.toFixed(0)}%)</span>
          </div>
        </div>
        
        {/* Energy */}
        <div className="p-2 rounded-sm text-center bg-crypto-surface/30">
          <div className="text-zinc-500 mb-1">{t('energy')}</div>
          <div className="font-bold text-zinc-300">
            {v3Data?.energy_context?.score?.toFixed(0) || '-'}
            <span className="text-zinc-500 font-normal text-[10px] ml-1">
              ({v3Data?.energy_context?.compression_level || '-'})
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render Compact Setup Info
  const renderCompactSetup = () => {
    if (!hasSetup) return null;

    const eventConfig = EVENT_TYPE_CONFIG[setup.event_type] || {};
    const EventIcon = eventConfig.icon || Activity;
    const timeRemaining = getTimeRemaining(setup.expires_at);

    return (
      <div className="space-y-3 mt-3">
        {/* Setup Type & Validity Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <EventIcon className={cn("w-4 h-4", eventConfig.color || 'text-zinc-400')} />
            <span className="text-sm text-zinc-300">
              {eventConfig.label?.[language] || setup.event_type}
            </span>
          </div>
          {timeRemaining && (
            <div className={cn(
              "flex items-center gap-1 text-xs",
              timeRemaining.urgent ? "text-orange-400" : "text-zinc-500"
            )}>
              <Clock className="w-3 h-3" />
              <span>{timeRemaining.text}</span>
            </div>
          )}
        </div>

        {/* Price Levels Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Entry Zone */}
          <div className="bg-crypto-surface/30 p-2 rounded-sm">
            <div className="text-zinc-500 mb-1">{t('entryZone')}</div>
            <div className="font-mono text-zinc-200">
              ${formatPrice(setup.zone_low)} - ${formatPrice(setup.zone_high)}
            </div>
          </div>
          
          {/* Stop Loss */}
          <div className="bg-red-500/10 p-2 rounded-sm">
            <div className="text-zinc-500 mb-1 flex items-center gap-1">
              <Shield className="w-3 h-3 text-red-400" />
              {t('stopLoss')}
            </div>
            <div className="font-mono text-red-400 font-bold">
              ${formatPrice(setup.stop_loss)}
            </div>
          </div>
          
          {/* Target 1 */}
          <div className="bg-green-500/10 p-2 rounded-sm">
            <div className="text-zinc-500 mb-1 flex items-center gap-1">
              <Target className="w-3 h-3 text-green-400" />
              {t('target1')}
            </div>
            <div className="font-mono text-green-400">
              ${formatPrice(setup.target_1)}
            </div>
          </div>
          
          {/* Target 2 */}
          <div className="bg-green-500/10 p-2 rounded-sm">
            <div className="text-zinc-500 mb-1 flex items-center gap-1">
              <Target className="w-3 h-3 text-green-400" />
              {t('target2')}
            </div>
            <div className="font-mono text-green-400">
              ${formatPrice(setup.target_2)}
            </div>
          </div>
        </div>

        {/* Quality & R:R Row */}
        <div className="flex items-center justify-between bg-crypto-surface/20 p-2 rounded-sm">
          <div className="flex items-center gap-4">
            <div className="text-xs">
              <span className="text-zinc-500">{t('quality')}: </span>
              <span className={cn(
                "font-bold",
                setup.quality_score >= 80 ? "text-green-400" :
                setup.quality_score >= 60 ? "text-yellow-400" :
                setup.quality_score >= 40 ? "text-orange-400" : "text-red-400"
              )}>
                {setup.quality_score}/100
              </span>
            </div>
            <div className="text-xs">
              <span className="text-zinc-500">{t('riskReward')}: </span>
              <span className={cn(
                "font-bold",
                setup.risk_reward_ratio >= 1.5 ? "text-green-400" :
                setup.risk_reward_ratio >= 1.0 ? "text-yellow-400" : "text-red-400"
              )}>
                {setup.risk_reward_ratio?.toFixed(2) || '-'}
              </span>
            </div>
          </div>
          {/* 5M Confirmation Status */}
          <div className="text-xs">
            <span className="text-zinc-500">{t('confirmation5m')}: </span>
            {setup.confirmation_type ? (
              <span className="text-green-400 font-bold">
                {CONFIRMATION_CONFIG[setup.confirmation_type]?.label?.[language] || setup.confirmation_type}
              </span>
            ) : (
              <span className="text-yellow-400">{t('pending')}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Expanded Details
  const renderExpandedDetails = () => {
    if (!expanded || !hasSetup) return null;

    return (
      <div className="mt-3 pt-3 border-t border-white/5 space-y-3 text-xs">
        {/* Structure Details */}
        <div className="bg-crypto-surface/20 p-3 rounded-sm">
          <div className="text-zinc-400 font-semibold mb-2 flex items-center gap-2">
            <BarChart2 className="w-3 h-3" />
            {t('structureBased')} - Stop Loss Logic
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-zinc-500">{t('swingHigh')}: </span>
              <span className="font-mono text-zinc-300">${formatPrice(setup.swing_high)}</span>
            </div>
            <div>
              <span className="text-zinc-500">{t('swingLow')}: </span>
              <span className="font-mono text-zinc-300">${formatPrice(setup.swing_low)}</span>
            </div>
            <div>
              <span className="text-zinc-500">{t('buffer')}: </span>
              <span className="font-mono text-zinc-300">{setup.buffer_percent?.toFixed(2)}%</span>
            </div>
          </div>
          <div className="mt-2 text-zinc-500">
            Stop Type: <span className="text-zinc-300 font-bold">{setup.stop_type?.toUpperCase()}</span>
          </div>
        </div>

        {/* Target Details */}
        <div className="bg-crypto-surface/20 p-3 rounded-sm">
          <div className="text-zinc-400 font-semibold mb-2 flex items-center gap-2">
            <Target className="w-3 h-3" />
            {t('liquidityBased')} - Target Logic
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-zinc-500">T1 ({setup.target_1_type}): </span>
              <span className="font-mono text-green-400">${formatPrice(setup.target_1)}</span>
            </div>
            <div>
              <span className="text-zinc-500">T2 ({setup.target_2_type}): </span>
              <span className="font-mono text-green-400">${formatPrice(setup.target_2)}</span>
            </div>
          </div>
        </div>

        {/* Liquidity Context */}
        <div className="bg-crypto-surface/20 p-3 rounded-sm">
          <div className="text-zinc-400 font-semibold mb-2 flex items-center gap-2">
            <Zap className="w-3 h-3" />
            {t('liquidity')} Context
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-zinc-500">{t('above')}: </span>
              <span className="font-mono text-zinc-300">
                ${(v3Data?.liquidity_context?.above_total / 1000000)?.toFixed(1)}M
              </span>
            </div>
            <div>
              <span className="text-zinc-500">{t('below')}: </span>
              <span className="font-mono text-zinc-300">
                ${(v3Data?.liquidity_context?.below_total / 1000000)?.toFixed(1)}M
              </span>
            </div>
          </div>
          <div className="mt-2 text-zinc-500">
            Imbalance: <span className={cn(
              "font-bold",
              v3Data?.liquidity_context?.imbalance_direction === 'UP' ? "text-green-400" :
              v3Data?.liquidity_context?.imbalance_direction === 'DOWN' ? "text-red-400" : "text-zinc-400"
            )}>
              {v3Data?.liquidity_context?.imbalance_direction}
            </span>
          </div>
        </div>

        {/* Whale Context */}
        {v3Data?.whale_context && (
          <div className="bg-crypto-surface/20 p-3 rounded-sm">
            <div className="text-zinc-400 font-semibold mb-2">Whale Context</div>
            <div className="flex items-center gap-3">
              <span className={cn(
                "font-bold",
                v3Data.whale_context.direction === 'BUY' ? "text-green-400" :
                v3Data.whale_context.direction === 'SELL' ? "text-red-400" : "text-zinc-400"
              )}>
                {v3Data.whale_context.direction}
              </span>
              <span className="text-zinc-500">
                Strength: {v3Data.whale_context.strength?.toFixed(0)}%
              </span>
            </div>
          </div>
        )}

        {/* Phase History (if available) */}
        {setup.phase_history && setup.phase_history.length > 0 && (
          <div className="bg-crypto-surface/20 p-3 rounded-sm">
            <div className="text-zinc-400 font-semibold mb-2">Phase History</div>
            <div className="space-y-1">
              {setup.phase_history.slice(-3).map((ph, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px]">
                  <span className={cn(
                    "font-bold",
                    PHASE_CONFIG[ph.phase]?.color || 'text-zinc-400'
                  )}>
                    {ph.phase}
                  </span>
                  <span className="text-zinc-500">{ph.reason?.substring(0, 40)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reasoning */}
        {setup.reasoning && (
          <div className="text-zinc-500 text-[11px] italic">
            {setup.reasoning}
          </div>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div 
        className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden"
        data-testid="v3-signal-card"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="font-heading font-semibold text-sm uppercase tracking-wider">
              {t('v3Engine')}
            </span>
            <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-400/50">
              MTF
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {renderDirectionBadge()}
            <button 
              onClick={fetchV3Signal}
              className="p-1 hover:bg-white/5 rounded-sm transition-colors"
              title={t('refreshing')}
            >
              <RefreshCw className={cn("w-3 h-3 text-zinc-500", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Phase Badge - Most Prominent */}
          {renderPhaseBadge()}
          
          {/* Market Context - Always visible */}
          <div className="mt-3">
            {renderMarketContext()}
          </div>

          {/* Compact Setup Info */}
          {renderCompactSetup()}

          {/* No Setup Message */}
          {!hasSetup && (
            <div className="mt-3 text-center py-4 bg-crypto-surface/20 rounded-sm">
              <div className="text-zinc-500 text-sm">{t('waitingFor4H')}</div>
              <div className="text-xs text-zinc-600 mt-1">
                {v3Data?.context_summary}
              </div>
            </div>
          )}

          {/* Expand/Collapse Button */}
          {hasSetup && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full mt-3 py-2 flex items-center justify-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded-sm transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  {language === 'it' ? 'Nascondi dettagli' : 'Hide details'}
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  {language === 'it' ? 'Mostra dettagli' : 'Show details'}
                </>
              )}
            </button>
          )}

          {/* Expanded Details */}
          {renderExpandedDetails()}
        </div>

        {/* Footer - Data Freshness */}
        <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-600">
          <span>
            {v3Data?.data_freshness?.signal_generation_time_ms}ms | 
            5M: {v3Data?.data_freshness?.['5m_candles_count']} candles
          </span>
          {lastUpdate && (
            <span>
              {lastUpdate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default V3SignalCard;
