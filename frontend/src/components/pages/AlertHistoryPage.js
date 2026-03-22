import React, { useState, useEffect, useCallback } from 'react';
import { History, TrendingUp, TrendingDown, MinusCircle, RefreshCw, Filter, ChevronLeft, ChevronRight, BarChart3, Clock, Target, Shield, Zap, CheckCircle, XCircle, AlertTriangle, Activity, Trophy, Percent, PieChart, Timer, BadgeCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

import { useApp } from '../../contexts/AppContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function AlertHistoryPage() {
  const { language } = useApp();
  const [signals, setSignals] = useState([]);
  const [stats, setStats] = useState(null);
  const [performanceStats, setPerformanceStats] = useState(null);
  const [schedulerStatus, setSchedulerStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [directionFilter, setDirectionFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [versionFilter, setVersionFilter] = useState('all');
  const [recording, setRecording] = useState(false);
  const [checkingOutcomes, setCheckingOutcomes] = useState(false);
  const [showPerformance, setShowPerformance] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      let filterParam = directionFilter !== 'all' ? `&direction=${directionFilter}` : '';
      if (outcomeFilter !== 'all') {
        filterParam += `&outcome=${outcomeFilter}`;
      }
      if (versionFilter !== 'all') {
        filterParam += `&engine_version=${versionFilter}`;
      }
      const response = await fetch(`${API_URL}/api/signal-history?page=${page}&page_size=15${filterParam}`);
      const data = await response.json();
      setSignals(data.signals || []);
      setTotalPages(data.total_pages || 1);
      setTotalCount(data.total_count || 0);
    } catch (error) {
      console.error('Error fetching signal history:', error);
    } finally {
      setLoading(false);
    }
  }, [page, directionFilter, outcomeFilter, versionFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/signal-history/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  const fetchPerformanceStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/signal-history/statistics`);
      const data = await response.json();
      setPerformanceStats(data);
    } catch (error) {
      console.error('Error fetching performance stats:', error);
    }
  }, []);

  const fetchSchedulerStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/signal-history/scheduler-status`);
      const data = await response.json();
      setSchedulerStatus(data);
    } catch (error) {
      console.error('Error fetching scheduler status:', error);
    }
  }, []);

  const recordCurrentSignal = async () => {
    try {
      setRecording(true);
      const response = await fetch(`${API_URL}/api/signal-history/record`, { method: 'POST' });
      const data = await response.json();
      if (data.recorded) {
        fetchHistory();
        fetchStats();
        fetchPerformanceStats();
      }
    } catch (error) {
      console.error('Error recording signal:', error);
    } finally {
      setRecording(false);
    }
  };

  const checkOutcomes = async () => {
    try {
      setCheckingOutcomes(true);
      const response = await fetch(`${API_URL}/api/signal-history/check-outcomes`, { method: 'POST' });
      const data = await response.json();
      if (data.updated > 0) {
        fetchHistory();
        fetchPerformanceStats();
      }
      return data;
    } catch (error) {
      console.error('Error checking outcomes:', error);
    } finally {
      setCheckingOutcomes(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchStats();
    fetchPerformanceStats();
    fetchSchedulerStatus();
    
    // Refresh scheduler status every 5 minutes
    const schedulerInterval = setInterval(fetchSchedulerStatus, 300000);
    return () => clearInterval(schedulerInterval);
  }, [fetchHistory, fetchStats, fetchPerformanceStats, fetchSchedulerStatus]);

  const getDirectionConfig = (direction) => {
    switch (direction) {
      case 'LONG':
        return { icon: TrendingUp, color: 'text-bullish', bg: 'bg-bullish/10', border: 'border-bullish/30' };
      case 'SHORT':
        return { icon: TrendingDown, color: 'text-bearish', bg: 'bg-bearish/10', border: 'border-bearish/30' };
      default:
        return { icon: MinusCircle, color: 'text-zinc-400', bg: 'bg-zinc-800', border: 'border-zinc-600' };
    }
  };

  const getOutcomeConfig = (outcome) => {
    switch (outcome) {
      case 'WIN':
        return { icon: CheckCircle, label: language === 'it' ? 'VINTO' : 'WIN', color: 'text-bullish', bg: 'bg-bullish/20', border: 'border-bullish/30' };
      case 'PARTIAL_WIN':
        return { icon: Activity, label: language === 'it' ? 'PARZIALE' : 'PARTIAL', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' };
      case 'LOSS':
        return { icon: XCircle, label: language === 'it' ? 'PERSO' : 'LOSS', color: 'text-bearish', bg: 'bg-bearish/20', border: 'border-bearish/30' };
      case 'EXPIRED':
        return { icon: Clock, label: language === 'it' ? 'SCADUTO' : 'EXPIRED', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' };
      case 'PENDING':
        return { icon: AlertTriangle, label: language === 'it' ? 'IN ATTESA' : 'PENDING', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' };
      case 'NO_TRADE':
        return { icon: MinusCircle, label: 'NO TRADE', color: 'text-zinc-500', bg: 'bg-zinc-800', border: 'border-zinc-600' };
      default:
        return { icon: MinusCircle, label: '-', color: 'text-zinc-500', bg: 'bg-zinc-800', border: 'border-zinc-600' };
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    // Format in Europe/Rome timezone
    return date.toLocaleString(language === 'it' ? 'it-IT' : 'en-GB', {
      timeZone: 'Europe/Rome',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    return price?.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
  };

  return (
    <div className="space-y-6" data-testid="alert-history-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="w-6 h-6 text-crypto-accent" />
          <div>
            <h1 className="text-2xl font-heading font-bold">{language === 'it' ? 'Storico Segnali' : 'Signal History'}</h1>
            <p className="text-sm text-zinc-500">{language === 'it' ? 'Traccia i segnali passati e analizza le performance' : 'Track past trade signals and analyze performance'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={checkOutcomes}
            disabled={checkingOutcomes}
            variant="outline"
            className="border-crypto-border"
            data-testid="check-outcomes-btn"
          >
            {checkingOutcomes ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Activity className="w-4 h-4 mr-2" />
            )}
            {language === 'it' ? 'Verifica Outcomes' : 'Check Outcomes'}
          </Button>
          <Button
            onClick={recordCurrentSignal}
            disabled={recording}
            className="bg-crypto-accent hover:bg-crypto-accent/80"
            data-testid="record-signal-btn"
          >
            {recording ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            {language === 'it' ? 'Registra Segnale' : 'Record Signal'}
          </Button>
        </div>
      </div>

      {/* Performance Stats Panel */}
      {performanceStats && showPerformance && (
        <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <h2 className="font-heading font-semibold">{language === 'it' ? 'Performance Trading' : 'Trading Performance'}</h2>
              {/* Scheduler Status Indicator */}
              {schedulerStatus && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge 
                        className={cn(
                          "ml-2 text-[10px] flex items-center gap-1",
                          schedulerStatus.running 
                            ? "bg-bullish/20 text-bullish border-bullish/30" 
                            : "bg-bearish/20 text-bearish border-bearish/30"
                        )}
                      >
                        <Timer className={cn("w-3 h-3", schedulerStatus.running && "animate-pulse")} />
                        AUTO
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="bg-crypto-surface border-crypto-border max-w-xs">
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between gap-4">
                          <span className="text-zinc-400">{language === 'it' ? 'Stato' : 'Status'}:</span>
                          <span className={schedulerStatus.running ? "text-bullish" : "text-bearish"}>
                            {schedulerStatus.running ? (language === 'it' ? 'Attivo' : 'Active') : (language === 'it' ? 'Inattivo' : 'Inactive')}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-zinc-400">{language === 'it' ? 'Intervallo' : 'Interval'}:</span>
                          <span>{schedulerStatus.check_interval}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-zinc-400">{language === 'it' ? 'Esecuzioni' : 'Runs'}:</span>
                          <span>{schedulerStatus.total_runs}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-zinc-400">{language === 'it' ? 'Aggiornati' : 'Updated'}:</span>
                          <span>{schedulerStatus.total_updates}</span>
                        </div>
                        {schedulerStatus.next_run && (
                          <div className="flex justify-between gap-4">
                            <span className="text-zinc-400">{language === 'it' ? 'Prossimo check' : 'Next check'}:</span>
                            <span className="font-mono text-[10px]">
                              {new Date(schedulerStatus.next_run).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowPerformance(false)}>
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            {/* Win Rate */}
            <div className="bg-crypto-surface/30 p-3 rounded-sm">
              <div className="text-xs text-zinc-500 mb-1">{language === 'it' ? 'Win Rate Totale' : 'Overall Win Rate'}</div>
              <div className={cn(
                "text-2xl font-mono font-bold",
                performanceStats.win_rates?.overall >= 50 ? "text-bullish" : "text-bearish"
              )}>
                {performanceStats.win_rates?.overall || 0}%
              </div>
              <Progress 
                value={performanceStats.win_rates?.overall || 0} 
                className="h-1 mt-2 bg-zinc-800"
              />
            </div>
            
            {/* LONG Win Rate */}
            <div className="bg-crypto-surface/30 p-3 rounded-sm">
              <div className="text-xs text-zinc-500 mb-1">{language === 'it' ? 'Win Rate LONG' : 'LONG Win Rate'}</div>
              <div className={cn(
                "text-2xl font-mono font-bold",
                performanceStats.win_rates?.long >= 50 ? "text-bullish" : "text-yellow-400"
              )}>
                {performanceStats.win_rates?.long || 0}%
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {performanceStats.total_long || 0} {language === 'it' ? 'segnali' : 'signals'}
              </div>
            </div>
            
            {/* SHORT Win Rate */}
            <div className="bg-crypto-surface/30 p-3 rounded-sm">
              <div className="text-xs text-zinc-500 mb-1">{language === 'it' ? 'Win Rate SHORT' : 'SHORT Win Rate'}</div>
              <div className={cn(
                "text-2xl font-mono font-bold",
                performanceStats.win_rates?.short >= 50 ? "text-bullish" : "text-yellow-400"
              )}>
                {performanceStats.win_rates?.short || 0}%
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {performanceStats.total_short || 0} {language === 'it' ? 'segnali' : 'signals'}
              </div>
            </div>
            
            {/* Avg PnL */}
            <div className="bg-crypto-surface/30 p-3 rounded-sm">
              <div className="text-xs text-zinc-500 mb-1">{language === 'it' ? 'PnL Medio' : 'Avg PnL'}</div>
              <div className={cn(
                "text-2xl font-mono font-bold",
                performanceStats.performance?.avg_pnl_percent >= 0 ? "text-bullish" : "text-bearish"
              )}>
                {performanceStats.performance?.avg_pnl_percent >= 0 ? '+' : ''}{performanceStats.performance?.avg_pnl_percent || 0}%
              </div>
            </div>
            
            {/* Best/Worst */}
            <div className="bg-crypto-surface/30 p-3 rounded-sm">
              <div className="text-xs text-zinc-500 mb-1">{language === 'it' ? 'Miglior / Peggior' : 'Best / Worst'}</div>
              <div className="flex items-center gap-2">
                <span className="text-bullish font-mono text-sm">+{performanceStats.performance?.best_trade_pnl || 0}%</span>
                <span className="text-zinc-500">/</span>
                <span className="text-bearish font-mono text-sm">{performanceStats.performance?.worst_trade_pnl || 0}%</span>
              </div>
            </div>
          </div>
          
          {/* Outcome Distribution */}
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            <div className="bg-bullish/20 p-2 rounded-sm">
              <CheckCircle className="w-4 h-4 text-bullish mx-auto mb-1" />
              <div className="font-mono font-bold text-bullish">{performanceStats.outcomes?.wins || 0}</div>
              <div className="text-zinc-500">WIN</div>
            </div>
            <div className="bg-green-500/20 p-2 rounded-sm">
              <Activity className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <div className="font-mono font-bold text-green-400">{performanceStats.outcomes?.partial_wins || 0}</div>
              <div className="text-zinc-500">PARTIAL</div>
            </div>
            <div className="bg-bearish/20 p-2 rounded-sm">
              <XCircle className="w-4 h-4 text-bearish mx-auto mb-1" />
              <div className="font-mono font-bold text-bearish">{performanceStats.outcomes?.losses || 0}</div>
              <div className="text-zinc-500">LOSS</div>
            </div>
            <div className="bg-yellow-500/20 p-2 rounded-sm">
              <Clock className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
              <div className="font-mono font-bold text-yellow-400">{performanceStats.outcomes?.expired || 0}</div>
              <div className="text-zinc-500">EXPIRED</div>
            </div>
            <div className="bg-blue-500/20 p-2 rounded-sm">
              <AlertTriangle className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <div className="font-mono font-bold text-blue-400">{performanceStats.outcomes?.pending || 0}</div>
              <div className="text-zinc-500">PENDING</div>
            </div>
          </div>
          
          {/* Data Health Indicator */}
          {performanceStats.data_health && (
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="text-zinc-500">
                  {language === 'it' ? 'Segnali Tradabili' : 'Tradeable Signals'}: 
                  <span className="text-zinc-300 ml-1 font-mono">{performanceStats.data_health?.tradeable_signals || 0}</span>
                </span>
                <span className="text-zinc-500">
                  {language === 'it' ? 'Analizzati' : 'Analyzed'}: 
                  <span className="text-zinc-300 ml-1 font-mono">{performanceStats.data_health?.analyzed_signals || 0}</span>
                </span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge 
                      className={cn(
                        "text-[10px]",
                        performanceStats.data_health?.outcome_coverage_percent === 100 
                          ? "bg-bullish/20 text-bullish border-bullish/30" 
                          : performanceStats.data_health?.outcome_coverage_percent >= 90
                            ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            : "bg-bearish/20 text-bearish border-bearish/30"
                      )}
                    >
                      <BadgeCheck className="w-3 h-3 mr-1" />
                      {performanceStats.data_health?.outcome_coverage_percent || 0}% {language === 'it' ? 'Copertura' : 'Coverage'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="bg-crypto-surface border-crypto-border">
                    <div className="text-xs">
                      {performanceStats.data_health?.signals_missing_outcome > 0 ? (
                        <span className="text-yellow-400">
                          {performanceStats.data_health?.signals_missing_outcome} {language === 'it' ? 'segnali senza outcome' : 'signals missing outcome'}
                        </span>
                      ) : (
                        <span className="text-bullish">
                          {language === 'it' ? 'Tutti i segnali hanno outcome' : 'All signals have outcome'}
                        </span>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
      )}
      
      {/* V2 vs V3 Engine Comparison Panel */}
      {performanceStats?.by_engine && (
        <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span className="font-heading font-semibold text-sm uppercase tracking-wider">
                {language === 'it' ? 'Confronto V2 vs V3' : 'V2 vs V3 Comparison'}
              </span>
              <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-400/50">
                LIVE
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* V2 Engine Stats */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500/30 text-blue-400 border-blue-500/50">V2</Badge>
                  <span className="text-sm text-zinc-400">{language === 'it' ? 'Reattivo' : 'Reactive'}</span>
                </div>
                <span className="text-xs text-zinc-500">
                  {performanceStats.by_engine?.v2?.total_signals || 0} {language === 'it' ? 'segnali' : 'signals'}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">WIN</div>
                  <div className="font-mono font-bold text-bullish">
                    {(performanceStats.by_engine?.v2?.wins || 0) + (performanceStats.by_engine?.v2?.partial_wins || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">LOSS</div>
                  <div className="font-mono font-bold text-bearish">
                    {performanceStats.by_engine?.v2?.losses || 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">EXP</div>
                  <div className="font-mono font-bold text-zinc-400">
                    {performanceStats.by_engine?.v2?.expired || 0}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">{language === 'it' ? 'Win Rate' : 'Win Rate'}</span>
                <span className={cn(
                  "font-mono font-bold",
                  (performanceStats.by_engine?.v2?.win_rate || 0) >= 50 ? "text-bullish" : "text-yellow-400"
                )}>
                  {performanceStats.by_engine?.v2?.win_rate || 0}%
                </span>
              </div>
              <Progress 
                value={performanceStats.by_engine?.v2?.win_rate || 0} 
                className="h-1 mt-1 bg-zinc-800"
              />
              
              {(performanceStats.by_engine?.v2?.pending || 0) > 0 && (
                <div className="mt-2 text-xs text-blue-400 flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  {performanceStats.by_engine?.v2?.pending} {language === 'it' ? 'in attesa' : 'pending'}
                </div>
              )}
            </div>
            
            {/* V3 Engine Stats */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-500/30 text-purple-400 border-purple-500/50">V3</Badge>
                  <span className="text-sm text-zinc-400">{language === 'it' ? 'Multi-Timeframe' : 'Multi-Timeframe'}</span>
                </div>
                <span className="text-xs text-zinc-500">
                  {performanceStats.by_engine?.v3?.total_signals || 0} {language === 'it' ? 'segnali' : 'signals'}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">WIN</div>
                  <div className="font-mono font-bold text-bullish">
                    {(performanceStats.by_engine?.v3?.wins || 0) + (performanceStats.by_engine?.v3?.partial_wins || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">LOSS</div>
                  <div className="font-mono font-bold text-bearish">
                    {performanceStats.by_engine?.v3?.losses || 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">EXP</div>
                  <div className="font-mono font-bold text-zinc-400">
                    {performanceStats.by_engine?.v3?.expired || 0}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">{language === 'it' ? 'Win Rate' : 'Win Rate'}</span>
                <span className={cn(
                  "font-mono font-bold",
                  (performanceStats.by_engine?.v3?.win_rate || 0) >= 50 ? "text-bullish" : "text-yellow-400"
                )}>
                  {performanceStats.by_engine?.v3?.win_rate || 0}%
                </span>
              </div>
              <Progress 
                value={performanceStats.by_engine?.v3?.win_rate || 0} 
                className="h-1 mt-1 bg-zinc-800"
              />
              
              {(performanceStats.by_engine?.v3?.pending || 0) > 0 && (
                <div className="mt-2 text-xs text-purple-400 flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  {performanceStats.by_engine?.v3?.pending} {language === 'it' ? 'in attesa' : 'pending'}
                </div>
              )}
              
              {(performanceStats.by_engine?.v3?.total_signals || 0) === 0 && (
                <div className="mt-2 text-xs text-zinc-500 italic">
                  {language === 'it' ? 'In attesa di segnali V3 ENTRY_READY...' : 'Waiting for V3 ENTRY_READY signals...'}
                </div>
              )}
            </div>
          </div>
          
          {/* Comparison Summary */}
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="text-zinc-500">
                {language === 'it' ? 'Totale Tradabili' : 'Total Tradeable'}: 
                <span className="text-zinc-300 ml-1 font-mono">
                  {(performanceStats.by_engine?.v1?.total_signals || 0) + 
                   (performanceStats.by_engine?.v2?.total_signals || 0) + 
                   (performanceStats.by_engine?.v3?.total_signals || 0)}
                </span>
              </span>
              {performanceStats.by_engine?.v1?.total_signals > 0 && (
                <span className="text-zinc-500">
                  V1: <span className="text-zinc-400 font-mono">{performanceStats.by_engine.v1.total_signals}</span>
                </span>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-600">
                    {language === 'it' ? 'Raccolta dati attiva' : 'Data collection active'}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="bg-crypto-surface border-crypto-border max-w-xs">
                  <div className="text-xs">
                    {language === 'it' 
                      ? 'I segnali V3 vengono registrati automaticamente quando raggiungono ENTRY_READY. Outcome calcolato ogni ora.'
                      : 'V3 signals are recorded automatically when reaching ENTRY_READY. Outcomes calculated hourly.'}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
      
      {/* Toggle Performance Panel Button */}
      {!showPerformance && (
        <Button variant="outline" size="sm" onClick={() => setShowPerformance(true)} className="border-crypto-border">
          <PieChart className="w-4 h-4 mr-2" />
          {language === 'it' ? 'Mostra Performance' : 'Show Performance'}
        </Button>
      )}

      {/* Basic Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">{language === 'it' ? 'Totale Segnali' : 'Total Signals'}</div>
            <div className="text-2xl font-mono font-bold">{stats.total_signals || 0}</div>
          </div>
          <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">{language === 'it' ? 'Ultime 24H' : 'Last 24H'}</div>
            <div className="text-2xl font-mono font-bold text-crypto-accent">{stats.signals_24h || 0}</div>
          </div>
          <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">{language === 'it' ? 'Segnali LONG' : 'LONG Signals'}</div>
            <div className="text-2xl font-mono font-bold text-bullish">{stats.by_direction?.LONG || 0}</div>
          </div>
          <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm p-4">
            <div className="text-xs text-zinc-500 uppercase mb-1">{language === 'it' ? 'Segnali SHORT' : 'SHORT Signals'}</div>
            <div className="text-2xl font-mono font-bold text-bearish">{stats.by_direction?.SHORT || 0}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-zinc-500" />
          <Select value={directionFilter} onValueChange={(val) => { setDirectionFilter(val); setPage(1); }}>
            <SelectTrigger className="w-[140px] bg-crypto-surface border-crypto-border" data-testid="direction-filter">
              <SelectValue placeholder={language === 'it' ? 'Direzione' : 'Direction'} />
            </SelectTrigger>
            <SelectContent className="bg-crypto-surface border-crypto-border">
              <SelectItem value="all">{language === 'it' ? 'Tutte' : 'All'}</SelectItem>
              <SelectItem value="LONG">LONG</SelectItem>
              <SelectItem value="SHORT">SHORT</SelectItem>
              <SelectItem value="NO TRADE">NO TRADE</SelectItem>
            </SelectContent>
          </Select>
          <Select value={outcomeFilter} onValueChange={(val) => { setOutcomeFilter(val); setPage(1); }}>
            <SelectTrigger className="w-[140px] bg-crypto-surface border-crypto-border" data-testid="outcome-filter">
              <SelectValue placeholder="Outcome" />
            </SelectTrigger>
            <SelectContent className="bg-crypto-surface border-crypto-border">
              <SelectItem value="all">{language === 'it' ? 'Tutti' : 'All'}</SelectItem>
              <SelectItem value="WIN">WIN</SelectItem>
              <SelectItem value="PARTIAL_WIN">PARTIAL</SelectItem>
              <SelectItem value="LOSS">LOSS</SelectItem>
              <SelectItem value="EXPIRED">EXPIRED</SelectItem>
              <SelectItem value="PENDING">PENDING</SelectItem>
            </SelectContent>
          </Select>
          <Select value={versionFilter} onValueChange={(val) => { setVersionFilter(val); setPage(1); }}>
            <SelectTrigger className="w-[100px] bg-crypto-surface border-crypto-border" data-testid="version-filter">
              <SelectValue placeholder="Engine" />
            </SelectTrigger>
            <SelectContent className="bg-crypto-surface border-crypto-border">
              <SelectItem value="all">{language === 'it' ? 'Tutti' : 'All'}</SelectItem>
              <SelectItem value="v1">V1</SelectItem>
              <SelectItem value="v2">V2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <span>{totalCount} {language === 'it' ? 'segnali' : 'signals'}</span>
          <Button variant="ghost" size="sm" onClick={fetchHistory} data-testid="refresh-history-btn">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Signal List */}
      <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-6 h-6 text-crypto-accent animate-spin" />
          </div>
        ) : signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500">
            <History className="w-12 h-12 mb-3 opacity-30" />
            <p>No signals recorded yet</p>
            <p className="text-xs mt-1">Click "Record Current Signal" to start tracking</p>
          </div>
        ) : (
          <div className="divide-y divide-crypto-border">
            {signals.map((signal, idx) => {
              const config = getDirectionConfig(signal.direction);
              const outcomeConfig = getOutcomeConfig(signal.outcome);
              const Icon = config.icon;
              const OutcomeIcon = outcomeConfig.icon;
              
              return (
                <div 
                  key={signal.signal_id || idx}
                  className="p-4 hover:bg-white/5 transition-colors"
                  data-testid={`signal-entry-${idx}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Direction & Basic Info */}
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-sm", config.bg)}>
                        <Icon className={cn("w-5 h-5", config.color)} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={cn("font-mono text-xs", config.bg, config.color, config.border)}>
                            {signal.direction}
                          </Badge>
                          {/* Outcome Badge */}
                          {signal.outcome && signal.outcome !== 'NO_TRADE' && (
                            <Badge className={cn("font-mono text-[10px] flex items-center gap-1", outcomeConfig.bg, outcomeConfig.color, outcomeConfig.border)}>
                              <OutcomeIcon className="w-3 h-3" />
                              {outcomeConfig.label}
                            </Badge>
                          )}
                          {/* OHLC Verified Badge */}
                          {signal.outcome_notes && signal.outcome_notes.includes('RECALCULATED') && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className="font-mono text-[9px] flex items-center gap-0.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                    <BadgeCheck className="w-2.5 h-2.5" />
                                    OHLC
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="bg-crypto-card border-crypto-border text-xs max-w-[250px]">
                                  <p className="font-semibold text-cyan-400">{language === 'it' ? 'Verificato OHLC' : 'OHLC Verified'}</p>
                                  <p className="text-zinc-400 mt-1">
                                    {language === 'it' 
                                      ? 'Outcome calcolato analizzando i dati HIGH/LOW delle candele storiche, non solo il prezzo corrente.'
                                      : 'Outcome calculated by analyzing historical candle HIGH/LOW data, not just current price.'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {/* Candles Analyzed indicator */}
                          {signal.candles_analyzed > 0 && (
                            <span className="text-[9px] text-zinc-600">({signal.candles_analyzed} candles)</span>
                          )}
                          {/* Engine Version Badge */}
                          {signal.signal_engine_version && (
                            <Badge className={cn(
                              "font-mono text-[9px]",
                              signal.signal_engine_version === "v2" 
                                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" 
                                : "bg-zinc-600/20 text-zinc-400 border border-zinc-500/30"
                            )}>
                              {signal.signal_engine_version.toUpperCase()}
                            </Badge>
                          )}
                          <span className="text-xs text-zinc-500">{signal.setup_type}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-zinc-400">
                            <Clock className="w-3 h-3" />
                            {formatTime(signal.timestamp)}
                          </span>
                          <span className="font-mono">
                            BTC: {formatPrice(signal.btc_price)}
                          </span>
                          {/* PnL if available */}
                          {signal.pnl_percent !== null && signal.pnl_percent !== undefined && (
                            <span className={cn(
                              "font-mono font-bold text-sm",
                              signal.pnl_percent >= 0 ? "text-bullish" : "text-bearish"
                            )}>
                              {signal.pnl_percent >= 0 ? '+' : ''}{signal.pnl_percent?.toFixed(2)}%
                            </span>
                          )}
                        </div>
                        {signal.outcome_notes && (
                          <div className="text-[10px] text-zinc-500 mt-1 italic">
                            {signal.outcome_notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Key Metrics */}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="text-xs text-zinc-500">{language === 'it' ? 'Fiducia' : 'Confidence'}</div>
                        <div className={cn(
                          "font-mono font-bold",
                          signal.confidence >= 70 ? "text-bullish" :
                          signal.confidence >= 50 ? "text-yellow-400" : "text-zinc-400"
                        )}>
                          {signal.confidence?.toFixed(0)}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-zinc-500">{language === 'it' ? 'Mov. Stim.' : 'Est. Move'}</div>
                        <div className={cn(
                          "font-mono font-bold",
                          signal.estimated_move > 0 ? "text-bullish" : "text-bearish"
                        )}>
                          {signal.estimated_move > 0 ? '+' : ''}{signal.estimated_move?.toFixed(2)}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-zinc-500">R:R</div>
                        <div className="font-mono font-bold">
                          {signal.risk_reward_ratio?.toFixed(1)}:1
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {signal.direction !== 'NO TRADE' && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-zinc-500">{language === 'it' ? 'Zona Ingresso:' : 'Entry Zone:'}</span>
                          <div className="font-mono">
                            {formatPrice(signal.entry_zone_low)} - {formatPrice(signal.entry_zone_high)}
                          </div>
                        </div>
                        <div>
                          <span className="text-zinc-500 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Stop Loss:
                          </span>
                          <div className="font-mono text-bearish">
                            {formatPrice(signal.stop_loss)}
                          </div>
                        </div>
                        <div>
                          <span className="text-zinc-500 flex items-center gap-1">
                            <Target className="w-3 h-3" /> {language === 'it' ? 'Obiettivo 1:' : 'Target 1:'}
                          </span>
                          <div className="font-mono text-bullish">
                            {formatPrice(signal.target_1)}
                          </div>
                        </div>
                        <div>
                          <span className="text-zinc-500">{language === 'it' ? 'Obiettivo 2:' : 'Target 2:'}</span>
                          <div className="font-mono text-bullish">
                            {formatPrice(signal.target_2)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Context Tags */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {signal.market_bias && (
                          <Badge variant="outline" className="text-[10px] bg-crypto-surface/50">
                            Bias: {signal.market_bias}
                          </Badge>
                        )}
                        {signal.whale_direction && (
                          <Badge variant="outline" className="text-[10px] bg-crypto-surface/50">
                            {language === 'it' ? 'Balene' : 'Whale'}: {signal.whale_direction}
                          </Badge>
                        )}
                        {signal.liquidity_direction && (
                          <Badge variant="outline" className="text-[10px] bg-crypto-surface/50">
                            {language === 'it' ? 'Liquidità' : 'Liquidity'}: {signal.liquidity_direction}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 p-4 border-t border-crypto-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              data-testid="prev-page-btn"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {language === 'it' ? 'Precedente' : 'Previous'}
            </Button>
            <span className="text-sm text-zinc-500">
              {language === 'it' ? `Pagina ${page} di ${totalPages}` : `Page ${page} of ${totalPages}`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              data-testid="next-page-btn"
            >
              {language === 'it' ? 'Successiva' : 'Next'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Stats Details */}
      {stats && stats.averages_by_direction && Object.keys(stats.averages_by_direction).length > 0 && (
        <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-crypto-accent" />
            <h3 className="font-heading font-semibold">{language === 'it' ? 'Statistiche Performance' : 'Performance Statistics'}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(stats.averages_by_direction).map(([direction, data]) => {
              const config = getDirectionConfig(direction);
              return (
                <div key={direction} className={cn("p-3 rounded-sm border", config.bg, config.border)}>
                  <div className={cn("font-mono font-bold mb-2", config.color)}>{direction}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-zinc-500">{language === 'it' ? 'Fiducia Media:' : 'Avg Confidence:'}</span>
                      <div className="font-mono">{data.avg_confidence}%</div>
                    </div>
                    <div>
                      <span className="text-zinc-500">{language === 'it' ? 'R:R Medio:' : 'Avg R:R:'}</span>
                      <div className="font-mono">{data.avg_risk_reward}:1</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default AlertHistoryPage;
