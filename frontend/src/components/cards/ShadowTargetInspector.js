import React, { useState, useEffect, useCallback } from 'react';
import { 
  Target, RefreshCw, ChevronDown, ChevronUp, AlertTriangle,
  TrendingUp, TrendingDown, Zap, Database, CheckCircle, XCircle,
  ArrowRight, Percent, Clock, BarChart3, Eye, Layers
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { HelpOverlay } from '../ui/HelpOverlay';
import { useApp } from '../../contexts/AppContext';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function ShadowTargetInspector({ language = 'it' }) {
  const { learnMode } = useApp();
  const [shadowData, setShadowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSignal, setExpandedSignal] = useState(null);

  const labels = {
    it: {
      title: 'Ispettore Shadow Targets',
      subtitle: 'Analisi liquidità in SHADOW MODE - Non influenza i target live',
      refresh: 'Aggiorna',
      noData: 'Nessun dato shadow raccolto',
      waitingSignal: 'In attesa del prossimo V3 ENTRY_READY...',
      standardTargets: 'Target Standard (Live)',
      shadowTargets: 'Target Shadow (Liquidità)',
      exitPlan: 'Piano Uscita Suggerito',
      dataQuality: 'Qualità Dati',
      comparison: 'Confronto',
      confidence: 'Confidenza',
      source: 'Fonte',
      difference: 'Differenza',
      partial: 'Parziale',
      runner: 'Runner',
      reasoning: 'Motivazione',
      collected: 'raccolti',
      avgQuality: 'Qualità Media',
      withLiqT1: 'con Liq T1',
      sources: 'Fonti Dati',
      liquidation: 'Liquidazione',
      orderbook: 'Order Book',
      clusters: 'Cluster',
      magnet: 'Magnete',
      validity: 'Validità Direzione',
      valid: 'Valido',
      invalid: 'Non Valido',
      higher: 'più alto',
      lower: 'più basso',
      conservative: 'più conservativo',
      aggressive: 'più aggressivo'
    },
    en: {
      title: 'Shadow Target Inspector',
      subtitle: 'Liquidity analysis in SHADOW MODE - Does not affect live targets',
      refresh: 'Refresh',
      noData: 'No shadow data collected',
      waitingSignal: 'Waiting for next V3 ENTRY_READY...',
      standardTargets: 'Standard Targets (Live)',
      shadowTargets: 'Shadow Targets (Liquidity)',
      exitPlan: 'Suggested Exit Plan',
      dataQuality: 'Data Quality',
      comparison: 'Comparison',
      confidence: 'Confidence',
      source: 'Source',
      difference: 'Difference',
      partial: 'Partial',
      runner: 'Runner',
      reasoning: 'Reasoning',
      collected: 'collected',
      avgQuality: 'Avg Quality',
      withLiqT1: 'with Liq T1',
      sources: 'Data Sources',
      liquidation: 'Liquidation',
      orderbook: 'Order Book',
      clusters: 'Clusters',
      magnet: 'Magnet',
      validity: 'Direction Validity',
      valid: 'Valid',
      invalid: 'Invalid',
      higher: 'higher',
      lower: 'lower',
      conservative: 'more conservative',
      aggressive: 'more aggressive'
    }
  };

  const t = labels[language] || labels.en;

  const fetchShadowData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/v3/shadow-targets?limit=50`);
      if (!response.ok) throw new Error('Failed to fetch shadow targets');
      const data = await response.json();
      setShadowData(data);
    } catch (err) {
      console.error('Error fetching shadow targets:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShadowData();
    const interval = setInterval(fetchShadowData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchShadowData]);

  const getQualityColor = (quality) => {
    if (quality >= 70) return 'text-bullish';
    if (quality >= 40) return 'text-yellow-400';
    return 'text-zinc-500';
  };

  const getQualityBg = (quality) => {
    if (quality >= 70) return 'bg-bullish/20';
    if (quality >= 40) return 'bg-yellow-500/20';
    return 'bg-zinc-700/30';
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatDiff = (diff, direction) => {
    if (diff === 0 || diff === undefined) return null;
    const isPositive = diff > 0;
    
    // For LONG: positive diff = shadow target is higher (more aggressive)
    // For SHORT: positive diff = shadow target is higher (more conservative)
    let interpretation;
    if (direction === 'LONG') {
      interpretation = isPositive ? t.aggressive : t.conservative;
    } else {
      interpretation = isPositive ? t.conservative : t.aggressive;
    }
    
    return {
      value: `${isPositive ? '+' : ''}${diff.toFixed(2)}%`,
      isPositive,
      interpretation
    };
  };

  if (loading && !shadowData) {
    return (
      <div className="bg-gradient-to-br from-indigo-950/40 to-crypto-card/60 border border-indigo-500/30 rounded-sm p-4">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-crypto-card/60 border border-red-500/30 rounded-sm p-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  const signals = shadowData?.recent_targets || [];
  const stats = shadowData?.aggregate_stats || {};
  const coverage = shadowData?.data_source_coverage || {};

  return (
    <div 
      className="bg-gradient-to-br from-indigo-950/40 to-crypto-card/60 backdrop-blur-sm border border-indigo-500/30 rounded-sm overflow-hidden"
      data-testid="shadow-target-inspector"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-indigo-500/20 bg-indigo-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded">
              <Eye className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-base text-white">
                  {t.title}
                </h2>
                <Badge className="bg-indigo-500/30 text-indigo-400 border-indigo-500/50 text-[10px]">
                  SHADOW MODE
                </Badge>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{t.subtitle}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchShadowData}
            disabled={loading}
            className="text-indigo-400 hover:text-indigo-300"
          >
            <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} />
            {t.refresh}
          </Button>
        </div>

        {/* Aggregate Stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          <div className="bg-crypto-surface/30 rounded px-3 py-2 text-center">
            <div className="text-lg font-mono font-bold text-indigo-400">
              {shadowData?.total_collected || 0}
            </div>
            <div className="text-[10px] text-zinc-500 uppercase">{t.collected}</div>
          </div>
          <div className="bg-crypto-surface/30 rounded px-3 py-2 text-center">
            <div className={cn("text-lg font-mono font-bold", getQualityColor(stats.avg_data_quality || 0))}>
              {stats.avg_data_quality?.toFixed(0) || 0}%
            </div>
            <div className="text-[10px] text-zinc-500 uppercase">{t.avgQuality}</div>
          </div>
          <div className="bg-crypto-surface/30 rounded px-3 py-2 text-center">
            <div className="text-lg font-mono font-bold text-cyan-400">
              {stats.signals_with_liquidity_t1 || 0}
            </div>
            <div className="text-[10px] text-zinc-500 uppercase">{t.withLiqT1}</div>
          </div>
          <div className="bg-crypto-surface/30 rounded px-3 py-2 text-center">
            <div className="text-lg font-mono font-bold text-purple-400">
              {stats.avg_t1_difference_percent?.toFixed(1) || 0}%
            </div>
            <div className="text-[10px] text-zinc-500 uppercase">Δ T1</div>
          </div>
        </div>

        {/* Data Source Coverage */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[10px] text-zinc-500 uppercase">{t.sources}:</span>
          <div className="flex gap-1.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className={cn(
                    "text-[9px] px-1.5",
                    coverage.has_liquidation_data > 0 
                      ? "text-bullish border-bullish/30" 
                      : "text-zinc-600 border-zinc-700"
                  )}>
                    LIQ {coverage.has_liquidation_data || 0}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="bg-crypto-surface border-crypto-border">
                  <span className="text-xs">{t.liquidation}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className={cn(
                    "text-[9px] px-1.5",
                    coverage.has_orderbook_data > 0 
                      ? "text-cyan-400 border-cyan-500/30" 
                      : "text-zinc-600 border-zinc-700"
                  )}>
                    OB {coverage.has_orderbook_data || 0}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="bg-crypto-surface border-crypto-border">
                  <span className="text-xs">{t.orderbook}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className={cn(
                    "text-[9px] px-1.5",
                    coverage.has_cluster_data > 0 
                      ? "text-purple-400 border-purple-500/30" 
                      : "text-zinc-600 border-zinc-700"
                  )}>
                    CLU {coverage.has_cluster_data || 0}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="bg-crypto-surface border-crypto-border">
                  <span className="text-xs">{t.clusters}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className={cn(
                    "text-[9px] px-1.5",
                    coverage.has_magnet_data > 0 
                      ? "text-yellow-400 border-yellow-500/30" 
                      : "text-zinc-600 border-zinc-700"
                  )}>
                    MAG {coverage.has_magnet_data || 0}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="bg-crypto-surface border-crypto-border">
                  <span className="text-xs">{t.magnet}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Signals List */}
      <ScrollArea className="h-[500px]">
        <div className="p-4 space-y-3">
          {signals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <Database className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium">{t.noData}</p>
              <p className="text-xs mt-1">{t.waitingSignal}</p>
            </div>
          ) : (
            signals.map((signal, idx) => {
              const isExpanded = expandedSignal === signal.signal_id;
              const direction = signal.direction;
              const quality = signal.data_quality?.overall_quality || 0;
              const liqTargets = signal.liquidity_targets || {};
              const stdTargets = signal.standard_targets || {};
              const exitPlan = signal.suggested_exit_plan || {};
              const comparison = signal.comparison || {};
              
              const t1Diff = formatDiff(comparison.t1_difference_percent, direction);
              const t2Diff = formatDiff(comparison.t2_difference_percent, direction);

              // Direction validity check
              const isT1Valid = direction === 'LONG' 
                ? (liqTargets.target_1 > signal.entry_price)
                : (liqTargets.target_1 < signal.entry_price);

              return (
                <div 
                  key={signal.signal_id || idx}
                  className={cn(
                    "bg-crypto-surface/30 border rounded-sm overflow-hidden transition-all",
                    isExpanded ? "border-indigo-500/50" : "border-zinc-700/50"
                  )}
                >
                  {/* Signal Header - Always visible */}
                  <button
                    onClick={() => setExpandedSignal(isExpanded ? null : signal.signal_id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {direction === 'LONG' ? (
                        <TrendingUp className="w-5 h-5 text-bullish" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-bearish" />
                      )}
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-mono font-bold",
                            direction === 'LONG' ? "text-bullish" : "text-bearish"
                          )}>
                            {direction}
                          </span>
                          <span className="text-zinc-400">@</span>
                          <span className="font-mono text-white">
                            {formatPrice(signal.entry_price)}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          {signal.signal_id?.slice(0, 8)}... • {new Date(signal.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* Quality Badge */}
                      <Badge className={cn("text-xs", getQualityBg(quality), getQualityColor(quality))}>
                        {quality}%
                      </Badge>
                      
                      {/* T1 Diff Preview */}
                      {t1Diff && (
                        <Badge variant="outline" className={cn(
                          "text-[10px]",
                          t1Diff.isPositive ? "text-cyan-400 border-cyan-500/30" : "text-yellow-400 border-yellow-500/30"
                        )}>
                          T1 {t1Diff.value}
                        </Badge>
                      )}
                      
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-zinc-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-500" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-zinc-700/50 space-y-4">
                      
                      {/* Target Comparison Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Standard Targets */}
                        <div className="bg-zinc-800/50 rounded p-3">
                          <div className="text-xs text-zinc-400 font-semibold mb-2 flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {t.standardTargets}
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-[11px] text-zinc-500">T1</span>
                              <span className="font-mono text-sm text-white">
                                {formatPrice(stdTargets.target_1)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[11px] text-zinc-500">T2</span>
                              <span className="font-mono text-sm text-white">
                                {formatPrice(stdTargets.target_2)}
                              </span>
                            </div>
                            {stdTargets.target_1_type && (
                              <div className="text-[10px] text-zinc-600">
                                Tipo: {stdTargets.target_1_type}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Shadow Liquidity Targets */}
                        <div className="bg-indigo-900/20 border border-indigo-500/20 rounded p-3">
                          <div className="text-xs text-indigo-400 font-semibold mb-2 flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {t.shadowTargets}
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] text-zinc-500">T1</span>
                              <div className="text-right">
                                <span className="font-mono text-sm text-indigo-300">
                                  {formatPrice(liqTargets.target_1)}
                                </span>
                                {liqTargets.target_1_confidence > 0 && (
                                  <span className="text-[9px] text-zinc-500 ml-1">
                                    ({liqTargets.target_1_confidence?.toFixed(0)}%)
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] text-zinc-500">T2</span>
                              <div className="text-right">
                                <span className="font-mono text-sm text-indigo-300">
                                  {formatPrice(liqTargets.target_2)}
                                </span>
                                {liqTargets.target_2_confidence > 0 && (
                                  <span className="text-[9px] text-zinc-500 ml-1">
                                    ({liqTargets.target_2_confidence?.toFixed(0)}%)
                                  </span>
                                )}
                              </div>
                            </div>
                            {liqTargets.target_3 && (
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] text-zinc-500">T3 (Runner)</span>
                                <span className="font-mono text-sm text-indigo-300">
                                  {formatPrice(liqTargets.target_3)}
                                </span>
                              </div>
                            )}
                            {liqTargets.target_1_source && (
                              <div className="text-[10px] text-indigo-400/70 pt-1 border-t border-indigo-500/20">
                                {t.source}: {liqTargets.target_1_source}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Comparison Analysis */}
                      <div className="bg-zinc-800/30 rounded p-3">
                        <div className="text-xs text-zinc-400 font-semibold mb-2 flex items-center gap-1">
                          <BarChart3 className="w-3 h-3" />
                          {t.comparison}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {/* T1 Difference */}
                          <div className="text-center">
                            <div className="text-[10px] text-zinc-500 mb-1">Δ T1</div>
                            {t1Diff ? (
                              <>
                                <div className={cn(
                                  "font-mono font-bold text-sm",
                                  t1Diff.isPositive ? "text-cyan-400" : "text-yellow-400"
                                )}>
                                  {t1Diff.value}
                                </div>
                                <div className="text-[9px] text-zinc-500">{t1Diff.interpretation}</div>
                              </>
                            ) : (
                              <div className="text-zinc-600">—</div>
                            )}
                          </div>
                          
                          {/* T2 Difference */}
                          <div className="text-center">
                            <div className="text-[10px] text-zinc-500 mb-1">Δ T2</div>
                            {t2Diff ? (
                              <>
                                <div className={cn(
                                  "font-mono font-bold text-sm",
                                  t2Diff.isPositive ? "text-cyan-400" : "text-yellow-400"
                                )}>
                                  {t2Diff.value}
                                </div>
                                <div className="text-[9px] text-zinc-500">{t2Diff.interpretation}</div>
                              </>
                            ) : (
                              <div className="text-zinc-600">—</div>
                            )}
                          </div>
                          
                          {/* Direction Validity */}
                          <div className="text-center">
                            <div className="text-[10px] text-zinc-500 mb-1">{t.validity}</div>
                            {liqTargets.target_1 ? (
                              isT1Valid ? (
                                <div className="flex items-center justify-center gap-1 text-bullish">
                                  <CheckCircle className="w-4 h-4" />
                                  <span className="text-xs font-medium">{t.valid}</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1 text-bearish">
                                  <XCircle className="w-4 h-4" />
                                  <span className="text-xs font-medium">{t.invalid}</span>
                                </div>
                              )
                            ) : (
                              <div className="text-zinc-600">—</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Exit Plan */}
                      <div className="bg-purple-900/20 border border-purple-500/20 rounded p-3">
                        <div className="text-xs text-purple-400 font-semibold mb-2 flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {t.exitPlan}
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div>
                            <div className="text-lg font-mono font-bold text-purple-300">
                              {exitPlan.partial_at_t1_percent || 50}%
                            </div>
                            <div className="text-[9px] text-zinc-500">@ T1</div>
                          </div>
                          <div>
                            <div className="text-lg font-mono font-bold text-purple-300">
                              {exitPlan.partial_at_t2_percent || 30}%
                            </div>
                            <div className="text-[9px] text-zinc-500">@ T2</div>
                          </div>
                          <div>
                            <div className="text-lg font-mono font-bold text-purple-300">
                              {exitPlan.runner_percent || 20}%
                            </div>
                            <div className="text-[9px] text-zinc-500">{t.runner}</div>
                          </div>
                          <div>
                            <div className={cn(
                              "text-lg font-mono font-bold",
                              exitPlan.confidence >= 60 ? "text-bullish" : "text-yellow-400"
                            )}>
                              {exitPlan.confidence || 0}%
                            </div>
                            <div className="text-[9px] text-zinc-500">{t.confidence}</div>
                          </div>
                        </div>
                        {exitPlan.reasoning && (
                          <div className="mt-2 pt-2 border-t border-purple-500/20 text-[11px] text-zinc-400">
                            {t.reasoning}: {exitPlan.reasoning}
                          </div>
                        )}
                      </div>

                      {/* Data Quality */}
                      <div className="bg-zinc-800/30 rounded p-3">
                        <div className="text-xs text-zinc-400 font-semibold mb-2 flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          {t.dataQuality}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Progress 
                            value={quality} 
                            className="h-2 flex-1 bg-zinc-800"
                          />
                          <span className={cn("font-mono text-sm font-bold", getQualityColor(quality))}>
                            {quality}%
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className={cn(
                            "text-[9px]",
                            signal.data_quality?.has_liquidation_data 
                              ? "text-bullish border-bullish/30" 
                              : "text-zinc-600 border-zinc-700"
                          )}>
                            {signal.data_quality?.has_liquidation_data ? '✓' : '✗'} {t.liquidation}
                          </Badge>
                          <Badge variant="outline" className={cn(
                            "text-[9px]",
                            signal.data_quality?.has_orderbook_data 
                              ? "text-cyan-400 border-cyan-500/30" 
                              : "text-zinc-600 border-zinc-700"
                          )}>
                            {signal.data_quality?.has_orderbook_data ? '✓' : '✗'} {t.orderbook}
                          </Badge>
                          <Badge variant="outline" className={cn(
                            "text-[9px]",
                            signal.data_quality?.has_cluster_data 
                              ? "text-purple-400 border-purple-500/30" 
                              : "text-zinc-600 border-zinc-700"
                          )}>
                            {signal.data_quality?.has_cluster_data ? '✓' : '✗'} {t.clusters}
                          </Badge>
                          <Badge variant="outline" className={cn(
                            "text-[9px]",
                            signal.data_quality?.has_magnet_data 
                              ? "text-yellow-400 border-yellow-500/30" 
                              : "text-zinc-600 border-zinc-700"
                          )}>
                            {signal.data_quality?.has_magnet_data ? '✓' : '✗'} {t.magnet}
                          </Badge>
                        </div>
                        {signal.data_quality?.missing_sources?.length > 0 && (
                          <div className="text-[10px] text-zinc-600 mt-2">
                            Missing: {signal.data_quality.missing_sources.join(', ')}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-indigo-500/20 bg-indigo-950/10">
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>Engine: {shadowData?.engine_version || 'shadow_liquidity_v0.1'}</span>
          <Badge variant="outline" className="text-[9px] text-indigo-400 border-indigo-500/30">
            {shadowData?.status || 'SHADOW_MODE'}
          </Badge>
        </div>
      </div>

      {/* Help Overlay - Learn Mode */}
      <HelpOverlay 
        show={learnMode}
        cardType="shadow_targets"
        language={language}
        contextData={{}}
      />
    </div>
  );
}

export default ShadowTargetInspector;
