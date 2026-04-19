import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, TrendingDown, Award, Target, Crosshair,
  AlertTriangle, RefreshCw, Percent, DollarSign, Activity, Zap,
  Calendar, ChevronRight, Sparkles, Brain
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useAccess } from '../../contexts/AccessContext';
import { useApp } from '../../contexts/AppContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const NEON = {
  green: '#00FF9D',
  red: '#FF1E56',
  blue: '#00D4FF',
  yellow: '#FFD93D',
  purple: '#A855F7'
};

const translations = {
  it: {
    title: 'Analytics Hub V4',
    subtitle: 'Centro Metriche Unificate',
    overview: 'Panoramica',
    sniper: 'SNIPER',
    hunter: 'HUNTER',
    combined: 'COMBINATO',
    totalSignals: 'Segnali Totali',
    winRate: 'Win Rate',
    totalPnl: 'P&L Totale',
    avgPnl: 'P&L Medio',
    bestTrade: 'Miglior Trade',
    worstTrade: 'Peggior Trade',
    avgRr: 'R:R Medio',
    maxDrawdown: 'Max Drawdown',
    longPerformance: 'Performance LONG',
    shortPerformance: 'Performance SHORT',
    last7d: 'Ultimi 7 Giorni',
    last30d: 'Ultimi 30 Giorni',
    equityCurve: 'Curva Equity',
    mentorSummary: 'Riepilogo Mentor',
    weekly: 'Settimanale',
    monthly: 'Mensile',
    keyInsights: 'Insight Chiave',
    recommendations: 'Raccomandazioni',
    generateSummary: 'Genera Riepilogo',
    loading: 'Caricamento...',
    noData: 'Dati non disponibili',
    refresh: 'Aggiorna'
  },
  en: {
    title: 'Analytics Hub V4',
    subtitle: 'Unified Metrics Center',
    overview: 'Overview',
    sniper: 'SNIPER',
    hunter: 'HUNTER',
    combined: 'COMBINED',
    totalSignals: 'Total Signals',
    winRate: 'Win Rate',
    totalPnl: 'Total P&L',
    avgPnl: 'Avg P&L',
    bestTrade: 'Best Trade',
    worstTrade: 'Worst Trade',
    avgRr: 'Avg R:R',
    maxDrawdown: 'Max Drawdown',
    longPerformance: 'LONG Performance',
    shortPerformance: 'SHORT Performance',
    last7d: 'Last 7 Days',
    last30d: 'Last 30 Days',
    equityCurve: 'Equity Curve',
    mentorSummary: 'Mentor Summary',
    weekly: 'Weekly',
    monthly: 'Monthly',
    keyInsights: 'Key Insights',
    recommendations: 'Recommendations',
    generateSummary: 'Generate Summary',
    loading: 'Loading...',
    noData: 'No data available',
    refresh: 'Refresh'
  }
};

// Metric Card Component
function MetricCard({ label, value, subValue, icon: Icon, trend, color = 'blue', large = false }) {
  const colorClasses = {
    green: 'from-[#00FF9D]/20 to-[#00FF9D]/5 border-[#00FF9D]/30',
    red: 'from-[#FF1E56]/20 to-[#FF1E56]/5 border-[#FF1E56]/30',
    blue: 'from-[#00D4FF]/20 to-[#00D4FF]/5 border-[#00D4FF]/30',
    yellow: 'from-yellow-400/20 to-yellow-400/5 border-yellow-400/30',
    purple: 'from-purple-400/20 to-purple-400/5 border-purple-400/30'
  };

  const iconColors = {
    green: 'text-[#00FF9D]',
    red: 'text-[#FF1E56]',
    blue: 'text-[#00D4FF]',
    yellow: 'text-yellow-400',
    purple: 'text-purple-400'
  };

  return (
    <div className={cn(
      "rounded-xl p-4 bg-gradient-to-br border backdrop-blur-sm",
      colorClasses[color]
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className={cn("p-2 rounded-lg bg-black/20", iconColors[color])}>
          <Icon className="w-4 h-4" />
        </div>
        {trend !== undefined && (
          <Badge variant="outline" className={cn(
            "text-xs",
            trend > 0 ? "text-[#00FF9D] border-[#00FF9D]/30" : 
            trend < 0 ? "text-[#FF1E56] border-[#FF1E56]/30" : 
            "text-zinc-500 border-zinc-500/30"
          )}>
            {trend > 0 ? '+' : ''}{trend}%
          </Badge>
        )}
      </div>
      <div className="text-xs text-zinc-400 mb-1">{label}</div>
      <div className={cn(
        "font-bold font-mono",
        large ? "text-3xl" : "text-xl",
        iconColors[color]
      )}>
        {value}
      </div>
      {subValue && (
        <div className="text-xs text-zinc-500 mt-1">{subValue}</div>
      )}
    </div>
  );
}

// Mini Equity Chart Component
function EquityChart({ data }) {
  if (!data || data.length < 2) {
    return (
      <div className="h-48 bg-zinc-800/50 rounded-lg flex items-center justify-center">
        <span className="text-zinc-500">No equity data</span>
      </div>
    );
  }

  const equities = data.map(d => d.equity);
  const minEquity = Math.min(...equities);
  const maxEquity = Math.max(...equities);
  const range = maxEquity - minEquity || 1;

  const width = 600;
  const height = 180;
  const padding = 20;

  const points = data.map((point, idx) => {
    const x = padding + (idx / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((point.equity - minEquity) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  // Gradient fill
  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <div className="premium-card rounded-lg p-4">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={NEON.green} stopOpacity="0.3" />
            <stop offset="100%" stopColor={NEON.green} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = padding + pct * (height - 2 * padding);
          return (
            <line 
              key={i}
              x1={padding} 
              y1={y} 
              x2={width - padding} 
              y2={y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
          );
        })}

        {/* Area fill */}
        <polygon points={areaPoints} fill="url(#equityGradient)" />

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={NEON.green}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 6px ${NEON.green})` }}
        />

        {/* End dot */}
        <circle
          cx={width - padding}
          cy={height - padding - ((equities[equities.length - 1] - minEquity) / range) * (height - 2 * padding)}
          r="4"
          fill={NEON.green}
          style={{ filter: `drop-shadow(0 0 8px ${NEON.green})` }}
        />

        {/* Y-axis labels */}
        <text x={padding - 5} y={padding} textAnchor="end" className="fill-zinc-500 text-xs">
          {maxEquity.toFixed(1)}%
        </text>
        <text x={padding - 5} y={height - padding} textAnchor="end" className="fill-zinc-500 text-xs">
          {minEquity.toFixed(1)}%
        </text>
      </svg>
    </div>
  );
}

// Mentor Summary Card Component
function MentorSummaryCard({ summary, t, loading, onGenerate }) {
  if (loading) {
    return (
      <div className="premium-card rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-zinc-700/50 rounded w-1/3 mb-4" />
        <div className="space-y-2">
          <div className="h-4 bg-zinc-700/50 rounded w-full" />
          <div className="h-4 bg-zinc-700/50 rounded w-5/6" />
          <div className="h-4 bg-zinc-700/50 rounded w-4/6" />
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="premium-card rounded-lg p-6 text-center">
        <Brain className="w-12 h-12 mx-auto text-purple-400 mb-3" />
        <p className="text-zinc-400 mb-4">{t('noData')}</p>
        <Button onClick={onGenerate} className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30">
          <Sparkles className="w-4 h-4 mr-2" />
          {t('generateSummary')}
        </Button>
      </div>
    );
  }

  return (
    <div className="premium-card rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-blue-500/10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <span className="font-heading font-bold text-lg">{t('mentorSummary')}</span>
            <div className="text-xs text-zinc-500">
              {summary.period === 'weekly' ? t('weekly') : t('monthly')}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onGenerate} className="text-xs">
          <RefreshCw className="w-3 h-3 mr-1" />
          {t('refresh')}
        </Button>
      </div>

      <div className="p-5 space-y-4">
        {/* Summary Text */}
        <div className="bg-zinc-800/50 rounded-lg p-4">
          <p className="text-zinc-300 leading-relaxed">{summary.summary_text}</p>
        </div>

        {/* Key Insights */}
        {summary.key_insights && summary.key_insights.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              {t('keyInsights')}
            </h4>
            <ul className="space-y-2">
              {summary.key_insights.map((insight, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-zinc-400">
                  <ChevronRight className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {summary.recommendations && summary.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-[#00FF9D]" />
              {t('recommendations')}
            </h4>
            <ul className="space-y-2">
              {summary.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-zinc-400">
                  <ChevronRight className="w-4 h-4 text-[#00FF9D] mt-0.5 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsHubV4Page() {
  const { language } = useApp();
  const { isAdmin, getAdminHeaders } = useAccess();
  const t = (key) => translations[language]?.[key] || translations['it'][key] || key;

  const [activeTab, setActiveTab] = useState('combined');
  const [metrics, setMetrics] = useState(null);
  const [equityCurve, setEquityCurve] = useState([]);
  const [mentorSummary, setMentorSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mentorLoading, setMentorLoading] = useState(false);

  const fetchData = async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const headers = getAdminHeaders();
      
      // Fetch metrics
      const signalType = activeTab === 'combined' ? '' : activeTab;
      const metricsUrl = `${API_URL}/api/v4/analytics/metrics?days=30${signalType ? `&signal_type=${signalType}` : ''}`;
      const metricsRes = await fetch(metricsUrl, { headers });
      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data);
      }

      // Fetch equity curve
      const equityRes = await fetch(`${API_URL}/api/v4/analytics/equity-curve?days=30`, { headers });
      if (equityRes.ok) {
        const data = await equityRes.json();
        setEquityCurve(data.equity_curve || []);
      }

      // Fetch mentor summary
      const mentorRes = await fetch(`${API_URL}/api/v4/analytics/mentor-summary?period=weekly`, { headers });
      if (mentorRes.ok) {
        const data = await mentorRes.json();
        setMentorSummary(data);
      }

    } catch (error) {
      console.error('[Analytics Hub] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMentorSummary = async () => {
    if (mentorLoading) return;
    setMentorLoading(true);

    try {
      const headers = getAdminHeaders();
      const res = await fetch(`${API_URL}/api/v4/analytics/mentor-summary?period=weekly&force_refresh=true`, { headers });
      if (res.ok) {
        const data = await res.json();
        setMentorSummary(data);
      }
    } catch (error) {
      console.error('[Analytics Hub] Generate mentor error:', error);
    } finally {
      setMentorLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAdmin, activeTab]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        <Activity className="w-6 h-6 mr-2" />
        Accesso Admin Richiesto
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8" data-testid="analytics-hub-v4-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
            <BarChart3 className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">{t('title')}</h1>
            <p className="text-zinc-400">{t('subtitle')}</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={fetchData} className="text-xs">
          <RefreshCw className="w-4 h-4 mr-1" />
          {t('refresh')}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md bg-zinc-800/50">
          <TabsTrigger value="combined" className="flex items-center gap-2 text-xs">
            <Activity className="w-4 h-4" />
            {t('combined')}
          </TabsTrigger>
          <TabsTrigger value="sniper" className="flex items-center gap-2 text-xs">
            <Target className="w-4 h-4" />
            {t('sniper')}
          </TabsTrigger>
          <TabsTrigger value="hunter" className="flex items-center gap-2 text-xs">
            <Crosshair className="w-4 h-4" />
            {t('hunter')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="premium-card rounded-lg p-6 animate-pulse">
                  <div className="h-16 bg-zinc-700/50 rounded" />
                </div>
              ))}
            </div>
          ) : metrics ? (
            <>
              {/* Main Metrics Grid */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <MetricCard
                  label={t('totalSignals')}
                  value={metrics.total_signals || 0}
                  icon={Activity}
                  color="blue"
                  large
                />
                <MetricCard
                  label={t('winRate')}
                  value={`${metrics.win_rate || 0}%`}
                  subValue={`${metrics.total_wins || 0}W / ${metrics.total_losses || 0}L`}
                  icon={Award}
                  color={metrics.win_rate >= 50 ? 'green' : 'red'}
                  large
                />
                <MetricCard
                  label={t('totalPnl')}
                  value={`${metrics.total_pnl_percent >= 0 ? '+' : ''}${metrics.total_pnl_percent?.toFixed(2) || 0}%`}
                  icon={DollarSign}
                  color={metrics.total_pnl_percent >= 0 ? 'green' : 'red'}
                  large
                />
                <MetricCard
                  label={t('avgRr')}
                  value={metrics.average_rr_ratio?.toFixed(2) || '—'}
                  icon={Target}
                  color="purple"
                  large
                />
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <MetricCard
                  label={t('avgPnl')}
                  value={`${metrics.average_pnl_percent >= 0 ? '+' : ''}${metrics.average_pnl_percent?.toFixed(2) || 0}%`}
                  icon={Percent}
                  color="blue"
                />
                <MetricCard
                  label={t('bestTrade')}
                  value={`+${metrics.best_trade_pnl?.toFixed(2) || 0}%`}
                  icon={TrendingUp}
                  color="green"
                />
                <MetricCard
                  label={t('worstTrade')}
                  value={`${metrics.worst_trade_pnl?.toFixed(2) || 0}%`}
                  icon={TrendingDown}
                  color="red"
                />
                <MetricCard
                  label={t('last7d')}
                  value={`${metrics.last_7d_pnl >= 0 ? '+' : ''}${metrics.last_7d_pnl?.toFixed(2) || 0}%`}
                  icon={Calendar}
                  color={metrics.last_7d_pnl >= 0 ? 'green' : 'red'}
                />
              </div>

              {/* Direction Performance */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="premium-card rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-[#00FF9D]" />
                    <span className="font-bold text-white">{t('longPerformance')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-zinc-500">Segnali</div>
                      <div className="text-xl font-bold text-white">{metrics.long_signals || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Win Rate</div>
                      <div className="text-xl font-bold text-[#00FF9D]">{metrics.long_win_rate?.toFixed(1) || 0}%</div>
                    </div>
                  </div>
                  <Progress 
                    value={metrics.long_win_rate || 0} 
                    className="mt-3 h-2 bg-zinc-800"
                  />
                </div>

                <div className="premium-card rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className="w-5 h-5 text-[#FF1E56]" />
                    <span className="font-bold text-white">{t('shortPerformance')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-zinc-500">Segnali</div>
                      <div className="text-xl font-bold text-white">{metrics.short_signals || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Win Rate</div>
                      <div className="text-xl font-bold text-[#FF1E56]">{metrics.short_win_rate?.toFixed(1) || 0}%</div>
                    </div>
                  </div>
                  <Progress 
                    value={metrics.short_win_rate || 0} 
                    className="mt-3 h-2 bg-zinc-800"
                  />
                </div>
              </div>

              {/* Equity Curve & Mentor Summary */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#00FF9D]" />
                    {t('equityCurve')}
                  </h3>
                  <EquityChart data={equityCurve} />
                </div>
                
                <div>
                  <MentorSummaryCard 
                    summary={mentorSummary}
                    t={t}
                    loading={mentorLoading}
                    onGenerate={generateMentorSummary}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="premium-card rounded-lg p-12 text-center">
              <BarChart3 className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
              <p className="text-zinc-500">{t('noData')}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
