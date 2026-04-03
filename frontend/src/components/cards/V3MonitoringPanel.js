import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, TrendingUp, TrendingDown, RefreshCw, Clock, 
  Target, CheckCircle, XCircle, AlertTriangle, Timer,
  BarChart3, Percent, Database, Zap, ArrowRightLeft,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function V3MonitoringPanel({ language = 'it' }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);

  // Translations
  const labels = {
    it: {
      title: 'Monitoraggio V3',
      subtitle: 'Metriche di validazione V3 - Solo osservazione, logica congelata',
      error: 'Errore caricamento metriche V3',
      statSig: 'Significatività Statistica',
      totalSetups: 'Setup Totali',
      active: 'attivi',
      entryReady: 'Segnali ENTRY_READY',
      closed: 'chiusi',
      convRate: 'Tasso Conversione',
      winRate: 'Win Rate V3',
      outcomes: 'Distribuzione Outcomes V3',
      ofTotal: 'del totale',
      waiting: 'In attesa di outcome',
      avgConf: 'Confidenza Media',
      avgRR: 'R:R Medio',
      setupTime: 'Tempo Setup→Entry',
      phases: 'Distribuzione Fasi Setup',
      lastSignals: 'Ultimi 5 Segnali V3',
      lastUpdate: 'Ultimo aggiornamento'
    },
    en: {
      title: 'V3 Monitoring',
      subtitle: 'V3 validation metrics - Observation only, logic frozen',
      error: 'Error loading V3 metrics',
      statSig: 'Statistical Significance',
      totalSetups: 'Total Setups',
      active: 'active',
      entryReady: 'ENTRY_READY Signals',
      closed: 'closed',
      convRate: 'Conversion Rate',
      winRate: 'V3 Win Rate',
      outcomes: 'V3 Outcome Distribution',
      ofTotal: 'of total',
      waiting: 'Waiting for outcome',
      avgConf: 'Avg Confidence',
      avgRR: 'Avg R:R',
      setupTime: 'Setup→Entry Time',
      phases: 'Setup Phase Distribution',
      lastSignals: 'Last 5 V3 Signals',
      lastUpdate: 'Last updated'
    },
    de: {
      title: 'V3 Überwachung',
      subtitle: 'V3 Validierungsmetriken - Nur Beobachtung, Logik eingefroren',
      error: 'Fehler beim Laden der V3-Metriken',
      statSig: 'Statistische Signifikanz',
      totalSetups: 'Gesamt Setups',
      active: 'aktiv',
      entryReady: 'ENTRY_READY Signale',
      closed: 'geschlossen',
      convRate: 'Konversionsrate',
      winRate: 'V3 Win Rate',
      outcomes: 'V3 Outcome-Verteilung',
      ofTotal: 'vom Total',
      waiting: 'Warte auf Outcome',
      avgConf: 'Durchschn. Konfidenz',
      avgRR: 'Durchschn. R:R',
      setupTime: 'Setup→Entry Zeit',
      phases: 'Setup-Phasen-Verteilung',
      lastSignals: 'Letzte 5 V3 Signale',
      lastUpdate: 'Zuletzt aktualisiert'
    },
    pl: {
      title: 'Monitoring V3',
      subtitle: 'Metryki walidacji V3 - Tylko obserwacja, logika zamrożona',
      error: 'Błąd ładowania metryk V3',
      statSig: 'Istotność Statystyczna',
      totalSetups: 'Wszystkie Setup',
      active: 'aktywne',
      entryReady: 'Sygnały ENTRY_READY',
      closed: 'zamknięte',
      convRate: 'Wskaźnik Konwersji',
      winRate: 'Win Rate V3',
      outcomes: 'Rozkład Wyników V3',
      ofTotal: 'z całości',
      waiting: 'Oczekiwanie na wynik',
      avgConf: 'Śr. Pewność',
      avgRR: 'Śr. R:R',
      setupTime: 'Czas Setup→Entry',
      phases: 'Rozkład Faz Setup',
      lastSignals: 'Ostatnie 5 Sygnałów V3',
      lastUpdate: 'Ostatnia aktualizacja'
    }
  };

  const t = labels[language] || labels.en;

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/v3/monitoring-metrics`);
      if (!response.ok) throw new Error('Failed to fetch V3 metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching V3 monitoring metrics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchMetrics, 300000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (loading && !metrics) {
    return (
      <div className="bg-crypto-card/60 backdrop-blur-sm border border-purple-500/30 rounded-sm p-4">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-crypto-card/60 backdrop-blur-sm border border-red-500/30 rounded-sm p-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <span>{t.error}</span>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const { 
    setups, 
    signals, 
    conversion, 
    rates, 
    by_direction, 
    quality, 
    timing, 
    statistical_significance,
    recent_signals 
  } = metrics;

  // Statistical significance status colors
  const getSignificanceColor = (status) => {
    switch (status) {
      case 'RELIABLE': return 'text-bullish bg-bullish/20 border-bullish/30';
      case 'PRELIMINARY': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      default: return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
    }
  };

  const significanceProgress = Math.min(
    100, 
    (statistical_significance?.current_sample_size / statistical_significance?.minimum_for_reliable) * 100
  );

  return (
    <div 
      className="bg-gradient-to-br from-purple-950/40 to-crypto-card/60 backdrop-blur-sm border border-purple-500/30 rounded-sm overflow-hidden"
      data-testid="v3-monitoring-panel"
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 border-b border-purple-500/20 cursor-pointer hover:bg-purple-500/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-sm">
            <Activity className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-bold text-lg">
                {language === 'it' ? 'Monitoraggio V3' : 'V3 Monitoring'}
              </h2>
              <Badge className="bg-purple-500/30 text-purple-400 border-purple-500/50 text-[10px]">
                MTF ENGINE
              </Badge>
              <Badge className={cn("text-[10px]", getSignificanceColor(statistical_significance?.status))}>
                {statistical_significance?.status || 'COLLECTING'}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500">
              {language === 'it' 
                ? 'Metriche di validazione V3 - Solo osservazione, logica congelata' 
                : 'V3 validation metrics - Observation only, logic frozen'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); fetchMetrics(); }}
            disabled={loading}
            className="text-purple-400 hover:text-purple-300"
            data-testid="refresh-v3-metrics-btn"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-zinc-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-zinc-500" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Statistical Significance Banner */}
          <div className="bg-crypto-surface/30 rounded-sm p-3 border border-purple-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <Database className="w-3 h-3" />
                {language === 'it' ? 'Significatività Statistica' : 'Statistical Significance'}
              </span>
              <span className="text-xs font-mono text-purple-400">
                {statistical_significance?.current_sample_size} / {statistical_significance?.minimum_for_reliable}
              </span>
            </div>
            <Progress 
              value={significanceProgress} 
              className="h-2 bg-zinc-800"
            />
            <div className="flex justify-between mt-1 text-[10px] text-zinc-500">
              <span>0</span>
              <span className="text-yellow-400">{statistical_significance?.minimum_for_preliminary} (prelim)</span>
              <span className="text-bullish">{statistical_significance?.minimum_for_reliable} (reliable)</span>
            </div>
          </div>

          {/* Primary Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Total Setups */}
            <div className="bg-crypto-surface/30 p-3 rounded-sm border border-zinc-700/50">
              <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                <Target className="w-3 h-3" />
                {language === 'it' ? 'Setup Totali' : 'Total Setups'}
              </div>
              <div className="text-2xl font-mono font-bold text-purple-400">
                {setups?.total_all_time || 0}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">
                {setups?.currently_active || 0} {language === 'it' ? 'attivi' : 'active'}
              </div>
            </div>

            {/* Entry Ready Signals */}
            <div className="bg-crypto-surface/30 p-3 rounded-sm border border-zinc-700/50">
              <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {language === 'it' ? 'Segnali ENTRY_READY' : 'ENTRY_READY Signals'}
              </div>
              <div className="text-2xl font-mono font-bold text-cyan-400">
                {signals?.total_entry_ready || 0}
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">
                {signals?.closed || 0} {language === 'it' ? 'chiusi' : 'closed'}
              </div>
            </div>

            {/* Conversion Rate */}
            <div className="bg-crypto-surface/30 p-3 rounded-sm border border-zinc-700/50">
              <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                <ArrowRightLeft className="w-3 h-3" />
                {language === 'it' ? 'Tasso Conversione' : 'Conversion Rate'}
              </div>
              <div className={cn(
                "text-2xl font-mono font-bold",
                conversion?.conversion_rate_percent >= 50 ? "text-bullish" : "text-yellow-400"
              )}>
                {conversion?.conversion_rate_percent?.toFixed(1) || 0}%
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">
                {language === 'it' ? 'Setup → Entry' : 'Setup → Entry'}
              </div>
            </div>

            {/* Win Rate */}
            <div className="bg-crypto-surface/30 p-3 rounded-sm border border-zinc-700/50">
              <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                <Percent className="w-3 h-3" />
                {language === 'it' ? 'Win Rate V3' : 'V3 Win Rate'}
              </div>
              <div className={cn(
                "text-2xl font-mono font-bold",
                rates?.win_rate >= 50 ? "text-bullish" : "text-bearish"
              )}>
                {rates?.win_rate?.toFixed(1) || 0}%
              </div>
              <Progress 
                value={rates?.win_rate || 0} 
                className="h-1 mt-2 bg-zinc-800"
              />
            </div>
          </div>

          {/* Outcome Distribution */}
          <div className="bg-crypto-surface/30 rounded-sm p-3 border border-zinc-700/50">
            <div className="text-xs text-zinc-500 mb-3 font-semibold uppercase tracking-wider">
              {language === 'it' ? 'Distribuzione Outcomes V3' : 'V3 Outcome Distribution'}
            </div>
            <div className="grid grid-cols-5 gap-2 text-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-bullish/20 p-2 rounded-sm cursor-help">
                      <CheckCircle className="w-4 h-4 text-bullish mx-auto mb-1" />
                      <div className="font-mono font-bold text-bullish text-lg">{signals?.wins || 0}</div>
                      <div className="text-[10px] text-zinc-500">WIN</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-crypto-surface border-crypto-border">
                    <span className="text-xs">{rates?.win_rate?.toFixed(1) || 0}% {language === 'it' ? 'del totale' : 'of total'}</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-bearish/20 p-2 rounded-sm cursor-help">
                      <XCircle className="w-4 h-4 text-bearish mx-auto mb-1" />
                      <div className="font-mono font-bold text-bearish text-lg">{signals?.losses || 0}</div>
                      <div className="text-[10px] text-zinc-500">LOSS</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-crypto-surface border-crypto-border">
                    <span className="text-xs">{rates?.loss_rate?.toFixed(1) || 0}% {language === 'it' ? 'del totale' : 'of total'}</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-yellow-500/20 p-2 rounded-sm cursor-help">
                      <Clock className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                      <div className="font-mono font-bold text-yellow-400 text-lg">{signals?.expired || 0}</div>
                      <div className="text-[10px] text-zinc-500">EXPIRED</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-crypto-surface border-crypto-border">
                    <span className="text-xs">{rates?.expired_rate?.toFixed(1) || 0}% {language === 'it' ? 'del totale' : 'of total'}</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-blue-500/20 p-2 rounded-sm cursor-help">
                      <AlertTriangle className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                      <div className="font-mono font-bold text-blue-400 text-lg">{signals?.pending || 0}</div>
                      <div className="text-[10px] text-zinc-500">PENDING</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-crypto-surface border-crypto-border">
                    <span className="text-xs">{language === 'it' ? 'In attesa di outcome' : 'Waiting for outcome'}</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="bg-zinc-700/30 p-2 rounded-sm">
                <BarChart3 className="w-4 h-4 text-zinc-400 mx-auto mb-1" />
                <div className="font-mono font-bold text-zinc-300 text-lg">{signals?.total_entry_ready || 0}</div>
                <div className="text-[10px] text-zinc-500">TOTAL</div>
              </div>
            </div>
          </div>

          {/* Direction Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            {/* LONG Breakdown */}
            <div className="bg-bullish/5 border border-bullish/20 rounded-sm p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-bullish" />
                  <span className="font-mono font-bold text-bullish">LONG</span>
                </div>
                <Badge className="bg-bullish/20 text-bullish border-bullish/30 text-xs">
                  {by_direction?.long?.total || 0}
                </Badge>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                <div>
                  <div className="text-bullish font-mono font-bold">{by_direction?.long?.wins || 0}</div>
                  <div className="text-zinc-500">WIN</div>
                </div>
                <div>
                  <div className="text-bearish font-mono font-bold">{by_direction?.long?.losses || 0}</div>
                  <div className="text-zinc-500">LOSS</div>
                </div>
                <div>
                  <div className="text-yellow-400 font-mono font-bold">{by_direction?.long?.expired || 0}</div>
                  <div className="text-zinc-500">EXP</div>
                </div>
                <div>
                  <div className="text-blue-400 font-mono font-bold">{by_direction?.long?.pending || 0}</div>
                  <div className="text-zinc-500">PEND</div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-bullish/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Win Rate</span>
                  <span className={cn(
                    "font-mono font-bold",
                    by_direction?.long?.win_rate >= 50 ? "text-bullish" : "text-yellow-400"
                  )}>
                    {by_direction?.long?.win_rate?.toFixed(1) || 0}%
                  </span>
                </div>
                <Progress 
                  value={by_direction?.long?.win_rate || 0} 
                  className="h-1 mt-1 bg-zinc-800"
                />
              </div>
            </div>

            {/* SHORT Breakdown */}
            <div className="bg-bearish/5 border border-bearish/20 rounded-sm p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-bearish" />
                  <span className="font-mono font-bold text-bearish">SHORT</span>
                </div>
                <Badge className="bg-bearish/20 text-bearish border-bearish/30 text-xs">
                  {by_direction?.short?.total || 0}
                </Badge>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                <div>
                  <div className="text-bullish font-mono font-bold">{by_direction?.short?.wins || 0}</div>
                  <div className="text-zinc-500">WIN</div>
                </div>
                <div>
                  <div className="text-bearish font-mono font-bold">{by_direction?.short?.losses || 0}</div>
                  <div className="text-zinc-500">LOSS</div>
                </div>
                <div>
                  <div className="text-yellow-400 font-mono font-bold">{by_direction?.short?.expired || 0}</div>
                  <div className="text-zinc-500">EXP</div>
                </div>
                <div>
                  <div className="text-blue-400 font-mono font-bold">{by_direction?.short?.pending || 0}</div>
                  <div className="text-zinc-500">PEND</div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-bearish/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Win Rate</span>
                  <span className={cn(
                    "font-mono font-bold",
                    by_direction?.short?.win_rate >= 50 ? "text-bullish" : "text-yellow-400"
                  )}>
                    {by_direction?.short?.win_rate?.toFixed(1) || 0}%
                  </span>
                </div>
                <Progress 
                  value={by_direction?.short?.win_rate || 0} 
                  className="h-1 mt-1 bg-zinc-800"
                />
              </div>
            </div>
          </div>

          {/* Quality & Timing Metrics */}
          <div className="grid grid-cols-3 gap-3">
            {/* Avg Confidence */}
            <div className="bg-crypto-surface/30 p-3 rounded-sm border border-zinc-700/50 text-center">
              <div className="text-xs text-zinc-500 mb-1">
                {language === 'it' ? 'Confidenza Media' : 'Avg Confidence'}
              </div>
              <div className={cn(
                "text-xl font-mono font-bold",
                quality?.avg_confidence >= 70 ? "text-bullish" : 
                quality?.avg_confidence >= 50 ? "text-yellow-400" : "text-zinc-400"
              )}>
                {quality?.avg_confidence?.toFixed(0) || 0}%
              </div>
            </div>

            {/* Avg R:R */}
            <div className="bg-crypto-surface/30 p-3 rounded-sm border border-zinc-700/50 text-center">
              <div className="text-xs text-zinc-500 mb-1">
                {language === 'it' ? 'R:R Medio' : 'Avg R:R'}
              </div>
              <div className="text-xl font-mono font-bold text-cyan-400">
                {quality?.avg_risk_reward?.toFixed(2) || 0}:1
              </div>
            </div>

            {/* Avg Setup to Entry Time */}
            <div className="bg-crypto-surface/30 p-3 rounded-sm border border-zinc-700/50 text-center">
              <div className="text-xs text-zinc-500 mb-1 flex items-center justify-center gap-1">
                <Timer className="w-3 h-3" />
                {language === 'it' ? 'Tempo Setup→Entry' : 'Setup→Entry Time'}
              </div>
              <div className="text-xl font-mono font-bold text-purple-400">
                {timing?.avg_setup_to_entry || 'N/A'}
              </div>
            </div>
          </div>

          {/* Setup Phase Distribution */}
          {setups?.by_phase && Object.keys(setups.by_phase).length > 0 && (
            <div className="bg-crypto-surface/30 rounded-sm p-3 border border-zinc-700/50">
              <div className="text-xs text-zinc-500 mb-2 font-semibold uppercase tracking-wider">
                {language === 'it' ? 'Distribuzione Fasi Setup' : 'Setup Phase Distribution'}
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(setups.by_phase).map(([phase, count]) => (
                  <Badge 
                    key={phase} 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      phase === 'ENTRY_READY' 
                        ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" 
                        : phase === 'INVALIDATED' || phase === 'EXPIRED'
                          ? "text-zinc-500 border-zinc-600 bg-zinc-800/50"
                          : "text-purple-400 border-purple-500/30 bg-purple-500/10"
                    )}
                  >
                    {phase}: <span className="font-mono font-bold ml-1">{count}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recent V3 Signals */}
          {recent_signals && recent_signals.length > 0 && (
            <div className="bg-crypto-surface/30 rounded-sm p-3 border border-zinc-700/50">
              <div className="text-xs text-zinc-500 mb-2 font-semibold uppercase tracking-wider">
                {language === 'it' ? 'Ultimi 5 Segnali V3' : 'Last 5 V3 Signals'}
              </div>
              <div className="space-y-2">
                {recent_signals.slice(0, 5).map((sig, idx) => (
                  <div 
                    key={sig.signal_id || idx}
                    className="flex items-center justify-between text-xs bg-crypto-card/30 p-2 rounded-sm"
                  >
                    <div className="flex items-center gap-2">
                      {sig.direction === 'LONG' ? (
                        <TrendingUp className="w-3 h-3 text-bullish" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-bearish" />
                      )}
                      <span className={cn(
                        "font-mono font-bold",
                        sig.direction === 'LONG' ? "text-bullish" : "text-bearish"
                      )}>
                        {sig.direction}
                      </span>
                      <span className="text-zinc-500">@</span>
                      <span className="font-mono text-zinc-300">
                        ${sig.btc_price?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">
                        {new Date(sig.timestamp).toLocaleDateString(language === 'it' ? 'it-IT' : 'en-GB', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <Badge className={cn(
                        "text-[10px]",
                        sig.outcome === 'WIN' ? "bg-bullish/20 text-bullish" :
                        sig.outcome === 'LOSS' ? "bg-bearish/20 text-bearish" :
                        sig.outcome === 'EXPIRED' ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-blue-500/20 text-blue-400"
                      )}>
                        {sig.outcome || 'PENDING'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Status */}
          <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-purple-500/20">
            <span>
              {language === 'it' ? 'Ultimo aggiornamento:' : 'Last updated:'} {new Date(metrics.timestamp).toLocaleTimeString()}
            </span>
            <Badge variant="outline" className="text-[9px] text-zinc-400 border-zinc-600">
              {metrics.engine_status || 'FROZEN'}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}

export default V3MonitoringPanel;
