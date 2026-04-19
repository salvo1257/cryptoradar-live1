import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, 
  AlertTriangle, Download, RefreshCw, Filter, ChevronDown, ChevronUp,
  Crosshair, Activity, Calendar, Award, Zap, BarChart3, Eye
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAccess } from '../../contexts/AccessContext';
import { useApp } from '../../contexts/AppContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Neon Colors
const NEON = {
  green: '#00FF9D',
  red: '#FF1E56',
  blue: '#00D4FF',
  yellow: '#FFD93D',
  purple: '#A855F7'
};

// Outcome configs
const OUTCOME_CONFIG = {
  pending: { color: 'text-zinc-400', bg: 'bg-zinc-500/20', icon: Clock, label: 'In Attesa' },
  win: { color: 'text-[#00FF9D]', bg: 'bg-[#00FF9D]/20', icon: CheckCircle, label: 'Vincita' },
  loss: { color: 'text-[#FF1E56]', bg: 'bg-[#FF1E56]/20', icon: XCircle, label: 'Perdita' },
  partial: { color: 'text-yellow-400', bg: 'bg-yellow-400/20', icon: AlertTriangle, label: 'Parziale' },
  expired: { color: 'text-zinc-500', bg: 'bg-zinc-600/20', icon: Clock, label: 'Scaduto' },
  cancelled: { color: 'text-zinc-500', bg: 'bg-zinc-600/20', icon: XCircle, label: 'Annullato' }
};

// Translations
const translations = {
  it: {
    title: 'Signal Journal V4',
    subtitle: 'Storico Segnali Premium',
    sniper: 'SNIPER',
    hunter: 'HUNTER',
    sniperDesc: 'V3 Normal - Entry Singolo',
    hunterDesc: 'V3 Hunter - 10-20-70',
    noSignals: 'Nessun segnale registrato',
    filters: 'Filtri',
    outcome: 'Esito',
    direction: 'Direzione',
    all: 'Tutti',
    exportPdf: 'Esporta PDF',
    exportCsv: 'Esporta CSV',
    entry: 'Entry',
    stop: 'Stop',
    target: 'Target',
    pnl: 'P&L',
    quality: 'Qualità',
    regime: 'Regime',
    bias: 'Bias',
    showDetails: 'Dettagli',
    legs: 'Legs',
    avgEntry: 'Entry Medio',
    tp: 'Take Profit',
    sl: 'Stop Loss',
    leverage: 'Leva',
    refresh: 'Aggiorna'
  },
  en: {
    title: 'Signal Journal V4',
    subtitle: 'Premium Signal History',
    sniper: 'SNIPER',
    hunter: 'HUNTER',
    sniperDesc: 'V3 Normal - Single Entry',
    hunterDesc: 'V3 Hunter - 10-20-70',
    noSignals: 'No signals recorded',
    filters: 'Filters',
    outcome: 'Outcome',
    direction: 'Direction',
    all: 'All',
    exportPdf: 'Export PDF',
    exportCsv: 'Export CSV',
    entry: 'Entry',
    stop: 'Stop',
    target: 'Target',
    pnl: 'P&L',
    quality: 'Quality',
    regime: 'Regime',
    bias: 'Bias',
    showDetails: 'Details',
    legs: 'Legs',
    avgEntry: 'Avg Entry',
    tp: 'Take Profit',
    sl: 'Stop Loss',
    leverage: 'Leverage',
    refresh: 'Refresh'
  }
};

const formatPrice = (price) => {
  if (!price || isNaN(price)) return '—';
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// Mini Sparkline Chart Component
function MiniChart({ priceHistory, direction, entryPrice, stopLoss, target1 }) {
  if (!priceHistory || priceHistory.length < 2) {
    return <div className="h-12 bg-zinc-800/50 rounded flex items-center justify-center text-xs text-zinc-600">No data</div>;
  }

  const prices = priceHistory.map(p => p.price);
  const minPrice = Math.min(...prices, stopLoss || Infinity, entryPrice);
  const maxPrice = Math.max(...prices, target1 || 0, entryPrice);
  const range = maxPrice - minPrice || 1;
  
  const width = 120;
  const height = 48;
  const padding = 4;
  
  const points = priceHistory.map((point, idx) => {
    const x = padding + (idx / (priceHistory.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((point.price - minPrice) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  const entryY = height - padding - ((entryPrice - minPrice) / range) * (height - 2 * padding);
  const stopY = stopLoss ? height - padding - ((stopLoss - minPrice) / range) * (height - 2 * padding) : null;
  const targetY = target1 ? height - padding - ((target1 - minPrice) / range) * (height - 2 * padding) : null;

  return (
    <svg width={width} height={height} className="bg-zinc-900/50 rounded">
      {/* Entry line */}
      <line x1={padding} y1={entryY} x2={width - padding} y2={entryY} 
        stroke={NEON.blue} strokeWidth="1" strokeDasharray="2,2" opacity="0.5" />
      
      {/* Stop line */}
      {stopY && (
        <line x1={padding} y1={stopY} x2={width - padding} y2={stopY} 
          stroke={NEON.red} strokeWidth="1" strokeDasharray="2,2" opacity="0.5" />
      )}
      
      {/* Target line */}
      {targetY && (
        <line x1={padding} y1={targetY} x2={width - padding} y2={targetY} 
          stroke={NEON.green} strokeWidth="1" strokeDasharray="2,2" opacity="0.5" />
      )}
      
      {/* Price line */}
      <polyline
        points={points}
        fill="none"
        stroke={direction === 'LONG' ? NEON.green : NEON.red}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Current price dot */}
      <circle
        cx={width - padding}
        cy={height - padding - ((prices[prices.length - 1] - minPrice) / range) * (height - 2 * padding)}
        r="3"
        fill={direction === 'LONG' ? NEON.green : NEON.red}
      />
    </svg>
  );
}

// SNIPER Deal Card Component
function SniperDealCard({ signal, t, expanded, onToggle }) {
  const outcome = OUTCOME_CONFIG[signal.outcome] || OUTCOME_CONFIG.pending;
  const OutcomeIcon = outcome.icon;

  return (
    <div 
      className={cn(
        "premium-card rounded-lg overflow-hidden transition-all duration-300",
        signal.outcome === 'win' && "border-l-4 border-l-[#00FF9D]",
        signal.outcome === 'loss' && "border-l-4 border-l-[#FF1E56]",
        signal.outcome === 'pending' && "border-l-4 border-l-zinc-600"
      )}
      data-testid={`sniper-card-${signal.signal_id}`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Direction Badge */}
            <Badge className={cn(
              "text-sm font-bold px-3 py-1",
              signal.direction === 'LONG' 
                ? "bg-[#00FF9D]/20 text-[#00FF9D] border-[#00FF9D]/30"
                : "bg-[#FF1E56]/20 text-[#FF1E56] border-[#FF1E56]/30"
            )}>
              {signal.direction === 'LONG' ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
              {signal.direction}
            </Badge>
            
            {/* Outcome Badge */}
            <Badge variant="outline" className={cn("text-xs", outcome.color, outcome.bg)}>
              <OutcomeIcon className="w-3 h-3 mr-1" />
              {outcome.label}
            </Badge>
          </div>

          <div className="text-right">
            <div className="text-xs text-zinc-500">{formatDate(signal.created_at)}</div>
            <div className="text-xs text-zinc-600">{signal.setup_type}</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-4 gap-4 mb-3">
          {/* Mini Chart */}
          <div className="col-span-1">
            <MiniChart 
              priceHistory={signal.price_history}
              direction={signal.direction}
              entryPrice={signal.entry_price}
              stopLoss={signal.stop_loss}
              target1={signal.target_1}
            />
          </div>

          {/* Entry/Stop/Target */}
          <div className="col-span-2 grid grid-cols-3 gap-2">
            <div>
              <div className="text-xs text-zinc-500">{t('entry')}</div>
              <div className="font-mono font-bold text-white">{formatPrice(signal.entry_price)}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">{t('stop')}</div>
              <div className="font-mono font-bold text-[#FF1E56]">{formatPrice(signal.stop_loss)}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">{t('target')}</div>
              <div className="font-mono font-bold text-[#00FF9D]">{formatPrice(signal.target_1)}</div>
            </div>
          </div>

          {/* PnL & Quality */}
          <div className="col-span-1 text-right">
            <div className={cn(
              "text-2xl font-bold font-mono",
              signal.pnl_percent > 0 ? "text-[#00FF9D]" : 
              signal.pnl_percent < 0 ? "text-[#FF1E56]" : "text-zinc-400"
            )}>
              {signal.pnl_percent != null ? `${signal.pnl_percent > 0 ? '+' : ''}${signal.pnl_percent.toFixed(2)}%` : '—'}
            </div>
            <div className="text-xs text-zinc-500">{t('quality')}: {signal.quality_score}/100</div>
          </div>
        </div>

        {/* Expand Button */}
        <button 
          onClick={() => onToggle(signal.signal_id)}
          className="w-full pt-2 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {t('showDetails')}
        </button>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-4 gap-3 text-xs">
            <div className="bg-zinc-800/50 rounded p-2">
              <div className="text-zinc-500">{t('regime')}</div>
              <div className="font-medium text-white">{signal.market_regime}</div>
            </div>
            <div className="bg-zinc-800/50 rounded p-2">
              <div className="text-zinc-500">{t('bias')}</div>
              <div className={cn(
                "font-medium",
                signal.market_bias === 'BULLISH' ? "text-[#00FF9D]" :
                signal.market_bias === 'BEARISH' ? "text-[#FF1E56]" : "text-zinc-400"
              )}>{signal.market_bias}</div>
            </div>
            <div className="bg-zinc-800/50 rounded p-2">
              <div className="text-zinc-500">R:R</div>
              <div className="font-medium text-white">{signal.risk_reward_ratio?.toFixed(2) || '—'}</div>
            </div>
            <div className="bg-zinc-800/50 rounded p-2">
              <div className="text-zinc-500">BTC @ Signal</div>
              <div className="font-mono text-white">{formatPrice(signal.btc_price_at_signal)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// HUNTER Deal Card Component
function HunterDealCard({ signal, t, expanded, onToggle }) {
  const outcome = OUTCOME_CONFIG[signal.outcome] || OUTCOME_CONFIG.pending;
  const OutcomeIcon = outcome.icon;

  const leg1 = signal.leg_1 || {};
  const leg2 = signal.leg_2 || {};
  const leg3 = signal.leg_3 || {};

  return (
    <div 
      className={cn(
        "premium-card rounded-lg overflow-hidden transition-all duration-300",
        signal.outcome === 'win' && "border-l-4 border-l-[#00FF9D]",
        signal.outcome === 'loss' && "border-l-4 border-l-[#FF1E56]",
        signal.outcome === 'pending' && "border-l-4 border-l-orange-500"
      )}
      data-testid={`hunter-card-${signal.signal_id}`}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Direction Badge */}
            <Badge className={cn(
              "text-sm font-bold px-3 py-1",
              signal.direction === 'LONG' 
                ? "bg-[#00FF9D]/20 text-[#00FF9D] border-[#00FF9D]/30"
                : "bg-[#FF1E56]/20 text-[#FF1E56] border-[#FF1E56]/30"
            )}>
              <Crosshair className="w-4 h-4 mr-1" />
              {signal.direction} HUNT
            </Badge>
            
            {/* Outcome Badge */}
            <Badge variant="outline" className={cn("text-xs", outcome.color, outcome.bg)}>
              <OutcomeIcon className="w-3 h-3 mr-1" />
              {outcome.label}
            </Badge>

            {/* Confidence Badge */}
            <Badge variant="outline" className={cn(
              "text-xs",
              signal.hunter_confidence === 'EXTREME' ? "text-purple-400 border-purple-400/30" :
              signal.hunter_confidence === 'HIGH' ? "text-green-400 border-green-400/30" :
              signal.hunter_confidence === 'MEDIUM' ? "text-yellow-400 border-yellow-400/30" :
              "text-zinc-400 border-zinc-400/30"
            )}>
              {signal.hunter_confidence}
            </Badge>
          </div>

          <div className="text-right">
            <div className="text-xs text-zinc-500">{formatDate(signal.created_at)}</div>
            <div className="text-xs text-zinc-600">Legs: {signal.legs_filled || 0}/3</div>
          </div>
        </div>

        {/* 10-20-70 Legs Display */}
        <div className="bg-zinc-900/50 rounded-lg p-3 mb-3">
          <div className="grid grid-cols-3 gap-3">
            {/* Leg 1 */}
            <div className={cn(
              "rounded-lg p-2 text-center",
              leg1.status === 'filled' ? "bg-blue-500/20 border border-blue-500/30" : "bg-zinc-800/50"
            )}>
              <div className="text-xs text-zinc-500">Leg 1 (10%)</div>
              <div className="font-mono font-bold text-white">{formatPrice(leg1.target_price)}</div>
              <Badge variant="outline" className={cn(
                "text-[10px] mt-1",
                leg1.status === 'filled' ? "text-blue-400" : "text-zinc-500"
              )}>
                {leg1.status === 'filled' ? 'FILLED' : 'PENDING'}
              </Badge>
            </div>

            {/* Leg 2 */}
            <div className={cn(
              "rounded-lg p-2 text-center",
              leg2.status === 'filled' ? "bg-orange-500/20 border border-orange-500/30" : "bg-zinc-800/50"
            )}>
              <div className="text-xs text-zinc-500">Leg 2 (20%)</div>
              <div className="font-mono font-bold text-white">{formatPrice(leg2.target_price)}</div>
              <Badge variant="outline" className={cn(
                "text-[10px] mt-1",
                leg2.status === 'filled' ? "text-orange-400" : "text-zinc-500"
              )}>
                {leg2.status === 'filled' ? 'FILLED' : 'PENDING'}
              </Badge>
            </div>

            {/* Leg 3 */}
            <div className={cn(
              "rounded-lg p-2 text-center",
              leg3.status === 'filled' ? "bg-purple-500/20 border border-purple-500/30" : "bg-zinc-800/50"
            )}>
              <div className="text-xs text-zinc-500">Leg 3 (70%)</div>
              <div className="font-mono font-bold text-white">{formatPrice(leg3.target_price)}</div>
              <Badge variant="outline" className={cn(
                "text-[10px] mt-1",
                leg3.status === 'filled' ? "text-purple-400" : "text-zinc-500"
              )}>
                {leg3.status === 'filled' ? 'FILLED' : 'PENDING'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-xs text-zinc-500">{t('avgEntry')}</div>
            <div className="font-mono font-bold text-white">{formatPrice(signal.average_entry_price)}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">{t('tp')}</div>
            <div className="font-mono font-bold text-[#00FF9D]">{formatPrice(signal.take_profit)}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">{t('sl')}</div>
            <div className="font-mono font-bold text-[#FF1E56]">{signal.stop_loss ? formatPrice(signal.stop_loss) : 'Macro'}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">{t('pnl')}</div>
            <div className={cn(
              "text-lg font-bold font-mono",
              signal.final_pnl_percent > 0 ? "text-[#00FF9D]" : 
              signal.final_pnl_percent < 0 ? "text-[#FF1E56]" : "text-zinc-400"
            )}>
              {signal.final_pnl_percent != null ? `${signal.final_pnl_percent > 0 ? '+' : ''}${signal.final_pnl_percent.toFixed(2)}%` : '—'}
            </div>
          </div>
        </div>

        {/* Expand Button */}
        <button 
          onClick={() => onToggle(signal.signal_id)}
          className="w-full mt-3 pt-2 border-t border-white/5 flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {t('showDetails')}
        </button>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-4 gap-3 text-xs">
            <div className="bg-zinc-800/50 rounded p-2">
              <div className="text-zinc-500">{t('regime')}</div>
              <div className="font-medium text-white">{signal.market_regime}</div>
            </div>
            <div className="bg-zinc-800/50 rounded p-2">
              <div className="text-zinc-500">{t('bias')}</div>
              <div className={cn(
                "font-medium",
                signal.market_bias === 'BULLISH' ? "text-[#00FF9D]" :
                signal.market_bias === 'BEARISH' ? "text-[#FF1E56]" : "text-zinc-400"
              )}>{signal.market_bias}</div>
            </div>
            <div className="bg-zinc-800/50 rounded p-2">
              <div className="text-zinc-500">{t('leverage')}</div>
              <div className="font-medium text-white">{signal.leverage || 1}x</div>
            </div>
            <div className="bg-zinc-800/50 rounded p-2">
              <div className="text-zinc-500">{t('quality')}</div>
              <div className="font-medium text-white">{signal.quality_score}/100</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SignalJournalV4Page() {
  const { language } = useApp();
  const { isAdmin, getAdminHeaders } = useAccess();
  const t = (key) => translations[language]?.[key] || translations['it'][key] || key;

  const [activeTab, setActiveTab] = useState('sniper');
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  
  // Filters
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');

  const fetchSignals = async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const headers = getAdminHeaders();
      let url = `${API_URL}/api/v4/signals?signal_type=${activeTab}&days=90`;
      if (outcomeFilter !== 'all') url += `&outcome=${outcomeFilter}`;
      if (directionFilter !== 'all') url += `&direction=${directionFilter}`;

      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        setSignals(data.signals || []);
      }
    } catch (error) {
      console.error('[V4 Journal] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, [isAdmin, activeTab, outcomeFilter, directionFilter]);

  const handleToggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const exportToCsv = () => {
    if (signals.length === 0) return;
    
    const headers = activeTab === 'sniper' 
      ? ['Date', 'Direction', 'Entry', 'Stop', 'Target1', 'Outcome', 'PnL%', 'Quality']
      : ['Date', 'Direction', 'Leg1', 'Leg2', 'Leg3', 'TP', 'Outcome', 'PnL%', 'Quality'];
    
    const rows = signals.map(s => {
      if (activeTab === 'sniper') {
        return [
          s.created_at, s.direction, s.entry_price, s.stop_loss, s.target_1,
          s.outcome, s.pnl_percent || 0, s.quality_score
        ].join(',');
      } else {
        return [
          s.created_at, s.direction, s.leg_1?.target_price, s.leg_2?.target_price, 
          s.leg_3?.target_price, s.take_profit, s.outcome, s.final_pnl_percent || 0, s.quality_score
        ].join(',');
      }
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `v4_signals_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        <Activity className="w-6 h-6 mr-2" />
        Accesso Admin Richiesto
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8" data-testid="signal-journal-v4-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30">
            <BarChart3 className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">{t('title')}</h1>
            <p className="text-zinc-400">{t('subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={exportToCsv} className="text-xs">
            <Download className="w-4 h-4 mr-1" />
            {t('exportCsv')}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchSignals} className="text-xs">
            <RefreshCw className="w-4 h-4 mr-1" />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-md bg-zinc-800/50">
          <TabsTrigger value="sniper" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            {t('sniper')}
          </TabsTrigger>
          <TabsTrigger value="hunter" className="flex items-center gap-2">
            <Crosshair className="w-4 h-4" />
            {t('hunter')}
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">{t('filters')}:</span>
          </div>
          
          <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
            <SelectTrigger className="w-32 h-8 text-xs bg-zinc-800/50">
              <SelectValue placeholder={t('outcome')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all')}</SelectItem>
              <SelectItem value="win">Vincita</SelectItem>
              <SelectItem value="loss">Perdita</SelectItem>
              <SelectItem value="pending">In Attesa</SelectItem>
              <SelectItem value="partial">Parziale</SelectItem>
            </SelectContent>
          </Select>

          <Select value={directionFilter} onValueChange={setDirectionFilter}>
            <SelectTrigger className="w-32 h-8 text-xs bg-zinc-800/50">
              <SelectValue placeholder={t('direction')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all')}</SelectItem>
              <SelectItem value="LONG">LONG</SelectItem>
              <SelectItem value="SHORT">SHORT</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        <TabsContent value="sniper" className="mt-4">
          {loading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="premium-card rounded-lg p-6 animate-pulse">
                  <div className="h-20 bg-zinc-700/50 rounded" />
                </div>
              ))}
            </div>
          ) : signals.length === 0 ? (
            <div className="premium-card rounded-lg p-12 text-center">
              <Target className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
              <p className="text-zinc-500">{t('noSignals')}</p>
              <p className="text-xs text-zinc-600 mt-1">{t('sniperDesc')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {signals.map(signal => (
                <SniperDealCard 
                  key={signal.signal_id}
                  signal={signal}
                  t={t}
                  expanded={expandedId === signal.signal_id}
                  onToggle={handleToggleExpand}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="hunter" className="mt-4">
          {loading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="premium-card rounded-lg p-6 animate-pulse">
                  <div className="h-24 bg-zinc-700/50 rounded" />
                </div>
              ))}
            </div>
          ) : signals.length === 0 ? (
            <div className="premium-card rounded-lg p-12 text-center">
              <Crosshair className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
              <p className="text-zinc-500">{t('noSignals')}</p>
              <p className="text-xs text-zinc-600 mt-1">{t('hunterDesc')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {signals.map(signal => (
                <HunterDealCard 
                  key={signal.signal_id}
                  signal={signal}
                  t={t}
                  expanded={expandedId === signal.signal_id}
                  onToggle={handleToggleExpand}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
