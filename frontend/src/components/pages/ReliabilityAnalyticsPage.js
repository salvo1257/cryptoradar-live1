import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, RefreshCw, TrendingUp, TrendingDown, Target, 
  AlertTriangle, CheckCircle, XCircle, Clock, Info, Award,
  Calendar, Zap, Droplets, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useApp } from '../../contexts/AppContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function ReliabilityAnalyticsPage() {
  const { t, language } = useApp();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/signal-history/reliability-analytics`);
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching reliability analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const getReliabilityColor = (score) => {
    if (score >= 60) return 'text-bullish';
    if (score >= 40) return 'text-yellow-400';
    if (score >= 20) return 'text-orange-400';
    return 'text-bearish';
  };

  const getReliabilityBg = (score) => {
    if (score >= 60) return 'bg-bullish/20';
    if (score >= 40) return 'bg-yellow-500/20';
    if (score >= 20) return 'bg-orange-500/20';
    return 'bg-bearish/20';
  };

  const getWinRateColor = (rate) => {
    if (rate >= 50) return 'text-bullish';
    if (rate >= 30) return 'text-yellow-400';
    return 'text-bearish';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH': return 'bg-bearish/20 text-bearish border-bearish/30';
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'LOW': return 'bg-bullish/20 text-bullish border-bullish/30';
      case 'INFO': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-zinc-700 text-zinc-400';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-crypto-card rounded-sm" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-crypto-card rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics || analytics.error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-zinc-400">{language === 'it' ? 'Errore nel caricamento analytics' : 'Error loading analytics'}</p>
          <Button onClick={fetchAnalytics} variant="outline" className="mt-4">
            <RefreshCw className="w-4 h-4 mr-2" />
            {language === 'it' ? 'Riprova' : 'Retry'}
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: language === 'it' ? 'Panoramica' : 'Overview', icon: BarChart3 },
    { id: 'heatmap', label: 'Heatmap', icon: Zap },
    { id: 'breakdown', label: language === 'it' ? 'Dettagli' : 'Breakdown', icon: Target },
    { id: 'recommendations', label: language === 'it' ? 'Raccomandazioni' : 'Recommendations', icon: Award }
  ];

  return (
    <div className="space-y-6" data-testid="reliability-analytics-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-crypto-accent" />
          <div>
            <h1 className="text-2xl font-heading font-bold">
              {language === 'it' ? 'Analisi Affidabilità Segnali' : 'Signal Reliability Analytics'}
            </h1>
            <p className="text-sm text-zinc-500">
              {language === 'it' 
                ? 'Identifica quali combinazioni di segnali sono più affidabili' 
                : 'Identify which signal combinations perform best'}
            </p>
          </div>
        </div>
        <Button onClick={fetchAnalytics} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          {language === 'it' ? 'Aggiorna' : 'Refresh'}
        </Button>
      </div>

      {/* Overall Stats Bar */}
      <div className="bg-crypto-card/60 border border-crypto-border rounded-sm p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <div className="text-xs text-zinc-500 mb-1">{language === 'it' ? 'Segnali Analizzati' : 'Signals Analyzed'}</div>
            <div className="text-2xl font-mono font-bold text-white">{analytics.total_signals_analyzed}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">{language === 'it' ? 'Win Rate Totale' : 'Overall Win Rate'}</div>
            <div className={cn("text-2xl font-mono font-bold", getWinRateColor(analytics.overall?.combined_win_rate || 0))}>
              {analytics.overall?.combined_win_rate || 0}%
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">{language === 'it' ? 'PnL Medio' : 'Avg PnL'}</div>
            <div className={cn(
              "text-2xl font-mono font-bold",
              (analytics.overall?.avg_pnl || 0) >= 0 ? "text-bullish" : "text-bearish"
            )}>
              {(analytics.overall?.avg_pnl || 0) >= 0 ? '+' : ''}{analytics.overall?.avg_pnl || 0}%
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">Profit Factor</div>
            <div className={cn(
              "text-2xl font-mono font-bold",
              (analytics.overall?.profit_factor || 0) >= 1 ? "text-bullish" : "text-bearish"
            )}>
              {analytics.overall?.profit_factor || 0}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">{language === 'it' ? 'Tasso Scaduti' : 'Expired Rate'}</div>
            <div className={cn(
              "text-2xl font-mono font-bold",
              (analytics.overall?.expired_rate || 0) <= 30 ? "text-bullish" : "text-yellow-400"
            )}>
              {analytics.overall?.expired_rate || 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-crypto-border pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-t-sm text-sm transition-colors",
                activeTab === tab.id
                  ? "bg-crypto-accent text-black font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-crypto-surface"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* By Direction */}
          <div className="bg-crypto-card/60 border border-crypto-border rounded-sm p-4">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-crypto-accent" />
              {language === 'it' ? 'Per Direzione' : 'By Direction'}
            </h3>
            <div className="space-y-3">
              {Object.entries(analytics.by_direction || {}).map(([dir, stats]) => (
                <div key={dir} className="p-3 bg-crypto-surface/50 rounded-sm">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={cn(
                      "font-mono",
                      dir === 'LONG' ? "bg-bullish/20 text-bullish" : "bg-bearish/20 text-bearish"
                    )}>
                      {dir}
                    </Badge>
                    <span className="text-xs text-zinc-500">{stats.total} {language === 'it' ? 'segnali' : 'signals'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-zinc-500">Win Rate:</span>
                      <span className={cn("ml-1 font-mono font-bold", getWinRateColor(stats.combined_win_rate))}>
                        {stats.combined_win_rate}%
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Avg PnL:</span>
                      <span className={cn("ml-1 font-mono", stats.avg_pnl >= 0 ? "text-bullish" : "text-bearish")}>
                        {stats.avg_pnl >= 0 ? '+' : ''}{stats.avg_pnl}%
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Profit Factor:</span>
                      <span className="ml-1 font-mono text-white">{stats.profit_factor}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Expired:</span>
                      <span className="ml-1 font-mono text-yellow-400">{stats.expired_rate}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By Day Type */}
          <div className="bg-crypto-card/60 border border-crypto-border rounded-sm p-4">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-crypto-accent" />
              {language === 'it' ? 'Weekday vs Weekend' : 'Weekday vs Weekend'}
            </h3>
            <div className="space-y-3">
              {Object.entries(analytics.by_day_type || {}).map(([dayType, stats]) => (
                <div key={dayType} className="p-3 bg-crypto-surface/50 rounded-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{dayType}</span>
                    <span className="text-xs text-zinc-500">{stats.total} {language === 'it' ? 'segnali' : 'signals'}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-xs text-zinc-500">Win Rate</div>
                      <div className={cn("text-xl font-mono font-bold", getWinRateColor(stats.combined_win_rate))}>
                        {stats.combined_win_rate}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Expired</div>
                      <div className={cn(
                        "text-xl font-mono font-bold",
                        stats.expired_rate > 50 ? "text-bearish" : "text-yellow-400"
                      )}>
                        {stats.expired_rate}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">PnL</div>
                      <div className={cn(
                        "text-xl font-mono font-bold",
                        stats.avg_pnl >= 0 ? "text-bullish" : "text-bearish"
                      )}>
                        {stats.avg_pnl >= 0 ? '+' : ''}{stats.avg_pnl}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By Setup Type */}
          <div className="bg-crypto-card/60 border border-crypto-border rounded-sm p-4">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-crypto-accent" />
              {language === 'it' ? 'Per Setup' : 'By Setup Type'}
            </h3>
            <div className="space-y-2">
              {Object.entries(analytics.by_setup_type || {}).map(([setup, stats]) => (
                <div key={setup} className="flex items-center justify-between p-2 bg-crypto-surface/50 rounded-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{setup}</span>
                    <span className="text-[10px] text-zinc-500">({stats.total})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("text-sm font-mono font-bold", getWinRateColor(stats.combined_win_rate))}>
                      {stats.combined_win_rate}%
                    </span>
                    <span className={cn(
                      "text-xs font-mono",
                      stats.avg_pnl >= 0 ? "text-bullish" : "text-bearish"
                    )}>
                      {stats.avg_pnl >= 0 ? '+' : ''}{stats.avg_pnl}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'heatmap' && (
        <div className="bg-crypto-card/60 border border-crypto-border rounded-sm p-4">
          <h3 className="text-sm font-semibold mb-4">
            {language === 'it' ? 'Heatmap Affidabilità (Direzione × Confidenza)' : 'Reliability Heatmap (Direction × Confidence)'}
          </h3>
          
          {/* Heatmap Grid */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-crypto-border">
                  <th className="text-left p-2 text-xs text-zinc-500">{language === 'it' ? 'Direzione' : 'Direction'}</th>
                  {['0-50%', '50-60%', '60-70%', '70-80%', '80-100%'].map(range => (
                    <th key={range} className="text-center p-2 text-xs text-zinc-500">{range}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['LONG', 'SHORT'].map(direction => (
                  <tr key={direction} className="border-b border-crypto-border/50">
                    <td className="p-2">
                      <Badge className={cn(
                        "font-mono text-xs",
                        direction === 'LONG' ? "bg-bullish/20 text-bullish" : "bg-bearish/20 text-bearish"
                      )}>
                        {direction}
                      </Badge>
                    </td>
                    {['0-50%', '50-60%', '60-70%', '70-80%', '80-100%'].map(range => {
                      const cell = analytics.heatmap?.find(
                        h => h.direction === direction && h.confidence_range === range
                      );
                      return (
                        <td key={range} className="p-2 text-center">
                          {cell ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={cn(
                                    "p-2 rounded cursor-pointer transition-all hover:scale-105",
                                    getReliabilityBg(cell.reliability_score)
                                  )}>
                                    <div className={cn(
                                      "text-lg font-mono font-bold",
                                      getReliabilityColor(cell.reliability_score)
                                    )}>
                                      {cell.combined_win_rate}%
                                    </div>
                                    <div className="text-[10px] text-zinc-500">{cell.total} sig</div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-crypto-card border-crypto-border">
                                  <div className="text-xs space-y-1">
                                    <div><strong>{direction} @ {range}</strong></div>
                                    <div>Win Rate: {cell.combined_win_rate}%</div>
                                    <div>Avg PnL: {cell.avg_pnl}%</div>
                                    <div>Profit Factor: {cell.profit_factor}</div>
                                    <div>Reliability Score: {cell.reliability_score}</div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <div className="p-2 text-zinc-600">-</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-crypto-border flex items-center gap-4 text-xs">
            <span className="text-zinc-500">{language === 'it' ? 'Legenda' : 'Legend'}:</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-bullish/20" />
              <span className="text-bullish">60%+ (Buono)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-yellow-500/20" />
              <span className="text-yellow-400">40-60% (Medio)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-orange-500/20" />
              <span className="text-orange-400">20-40% (Basso)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-bearish/20" />
              <span className="text-bearish">&lt;20% (Critico)</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'breakdown' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* By Confidence Range */}
          <div className="bg-crypto-card/60 border border-crypto-border rounded-sm p-4">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-crypto-accent" />
              {language === 'it' ? 'Per Range Confidenza' : 'By Confidence Range'}
            </h3>
            <div className="space-y-3">
              {Object.entries(analytics.by_confidence_range || {}).map(([range, stats]) => (
                <div key={range} className="p-3 bg-crypto-surface/50 rounded-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{range}</span>
                    <span className="text-xs text-zinc-500">{stats.total} {language === 'it' ? 'segnali' : 'signals'}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">Win Rate:</span>
                      <span className={cn("font-mono font-bold", getWinRateColor(stats.combined_win_rate))}>
                        {stats.combined_win_rate}%
                      </span>
                    </div>
                    <Progress 
                      value={stats.combined_win_rate} 
                      className="h-1.5 bg-zinc-800"
                      indicatorClassName={cn(
                        stats.combined_win_rate >= 50 ? "bg-bullish" : 
                        stats.combined_win_rate >= 30 ? "bg-yellow-500" : "bg-bearish"
                      )}
                    />
                    <div className="grid grid-cols-4 gap-1 text-[10px]">
                      <div className="text-center">
                        <div className="text-bullish">{stats.win_rate}%</div>
                        <div className="text-zinc-600">WIN</div>
                      </div>
                      <div className="text-center">
                        <div className="text-green-400">{stats.partial_rate}%</div>
                        <div className="text-zinc-600">PART</div>
                      </div>
                      <div className="text-center">
                        <div className="text-bearish">{stats.loss_rate}%</div>
                        <div className="text-zinc-600">LOSS</div>
                      </div>
                      <div className="text-center">
                        <div className="text-yellow-400">{stats.expired_rate}%</div>
                        <div className="text-zinc-600">EXP</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top & Worst Performers */}
          <div className="space-y-4">
            {/* Top Performers */}
            <div className="bg-crypto-card/60 border border-crypto-border rounded-sm p-4">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-bullish" />
                {language === 'it' ? 'Migliori Combinazioni' : 'Top Performers'}
              </h3>
              <div className="space-y-2">
                {(analytics.top_performers || []).map((combo, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-bullish/10 rounded-sm">
                    <div>
                      <span className="text-sm font-medium">{combo.combo?.replace('_', ' ')}</span>
                      <span className="text-xs text-zinc-500 ml-2">({combo.total} sig)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-bullish">{combo.combined_win_rate}%</span>
                      <Badge className="bg-bullish/20 text-bullish text-[10px]">
                        Score: {combo.reliability_score}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!analytics.top_performers || analytics.top_performers.length === 0) && (
                  <p className="text-xs text-zinc-500 text-center py-4">
                    {language === 'it' ? 'Dati insufficienti' : 'Insufficient data'}
                  </p>
                )}
              </div>
            </div>

            {/* Worst Performers */}
            <div className="bg-crypto-card/60 border border-crypto-border rounded-sm p-4">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <ArrowDownRight className="w-4 h-4 text-bearish" />
                {language === 'it' ? 'Peggiori Combinazioni' : 'Worst Performers'}
              </h3>
              <div className="space-y-2">
                {(analytics.worst_performers || []).map((combo, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-bearish/10 rounded-sm">
                    <div>
                      <span className="text-sm font-medium">{combo.combo?.replace('_', ' ')}</span>
                      <span className="text-xs text-zinc-500 ml-2">({combo.total} sig)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-bearish">{combo.combined_win_rate}%</span>
                      <Badge className="bg-bearish/20 text-bearish text-[10px]">
                        Score: {combo.reliability_score}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!analytics.worst_performers || analytics.worst_performers.length === 0) && (
                  <p className="text-xs text-zinc-500 text-center py-4">
                    {language === 'it' ? 'Dati insufficienti' : 'Insufficient data'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className="bg-crypto-card/60 border border-crypto-border rounded-sm p-4">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-crypto-accent" />
            {language === 'it' ? 'Raccomandazioni Sistema' : 'System Recommendations'}
          </h3>
          
          {analytics.recommendations && analytics.recommendations.length > 0 ? (
            <div className="space-y-3">
              {analytics.recommendations.map((rec, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "p-4 rounded-sm border",
                    getPriorityColor(rec.priority)
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {rec.priority === 'HIGH' && <AlertTriangle className="w-5 h-5" />}
                      {rec.priority === 'MEDIUM' && <Info className="w-5 h-5" />}
                      {rec.priority === 'LOW' && <CheckCircle className="w-5 h-5" />}
                      {rec.priority === 'INFO' && <Info className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={cn("text-[10px]", getPriorityColor(rec.priority))}>
                          {rec.priority}
                        </Badge>
                        <span className="text-xs text-zinc-500 uppercase">{rec.type}</span>
                      </div>
                      <p className="text-sm">{rec.message}</p>
                      {rec.action && (
                        <div className="mt-2 text-xs text-zinc-500">
                          Action: <code className="bg-crypto-surface px-1 rounded">{rec.action}</code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-bullish mx-auto mb-4" />
              <p className="text-zinc-400">
                {language === 'it' 
                  ? 'Nessuna raccomandazione specifica al momento. Continua a raccogliere dati.'
                  : 'No specific recommendations at this time. Continue collecting data.'}
              </p>
            </div>
          )}
          
          {/* Disclaimer */}
          <div className="mt-6 p-3 bg-crypto-surface/50 rounded-sm border border-zinc-700">
            <p className="text-[10px] text-zinc-500">
              <strong>{language === 'it' ? 'Disclaimer' : 'Disclaimer'}:</strong>{' '}
              {language === 'it'
                ? 'Queste raccomandazioni sono basate su dati storici e non garantiscono performance future. Usare come guida per ottimizzazioni future.'
                : 'These recommendations are based on historical data and do not guarantee future performance. Use as a guide for future optimizations.'}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-zinc-600 text-center">
        {language === 'it' ? 'Generato il' : 'Generated at'}: {new Date(analytics.generated_at).toLocaleString(language === 'it' ? 'it-IT' : 'en-GB', { timeZone: 'Europe/Rome' })}
      </div>
    </div>
  );
}

export default ReliabilityAnalyticsPage;
