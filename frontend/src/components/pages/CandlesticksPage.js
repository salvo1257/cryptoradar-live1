import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAnchoredPatterns } from '../../contexts/AnchoredPatternsContext';
import { TradingChartWithSentinel } from '../TradingChartWithSentinel';
import { 
  CandlestickChart, TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  PenTool, EyeOff, RefreshCw, AlertCircle, Flame, Target, Brain, Shield,
  Filter, Sparkles, Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * CANDLESTICKS PAGE v4.5 - "Cockpit Orizzontale"
 * 
 * Layout:
 * - TOP: Full-width interactive chart with Ghost Projections
 * - BOTTOM: Horizontal scrollable cards with "Cosa/Perché/Azione" insights
 * 
 * Features:
 * - Noise Reduction: Only Top 10 most significant candlestick patterns
 * - Strategic Alignment badges for multi-TF confirmation
 * - 100% Italian localization
 */
export function CandlesticksPage() {
  const { language } = useApp();
  const { anchorPattern, removeAnchor, isPatternAnchored, anchoredPatterns } = useAnchoredPatterns();
  
  const [patterns, setPatterns] = useState([]);
  const [ghostProjections, setGhostProjections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [selectedPattern, setSelectedPattern] = useState(null);

  // Candlestick pattern types
  const CANDLESTICK_TYPES = [
    'bullish_engulfing', 'bearish_engulfing', 'doji', 'hammer',
    'shooting_star', 'morning_star', 'evening_star'
  ];

  // Translations
  const t = useMemo(() => ({
    title: language === 'it' ? 'Analisi Candele' : 'Candlestick Analysis',
    subtitle: language === 'it' ? 'Pattern Giapponesi • Psicologia del Mercato' : 'Japanese Patterns • Market Psychology',
    patterns: language === 'it' ? 'Candele' : 'Candles',
    anchored: language === 'it' ? 'Ancorati' : 'Anchored',
    chart: language === 'it' ? 'Grafico' : 'Chart',
    ghostProjections: language === 'it' ? 'Proiezioni Future' : 'Ghost Projections',
    strategicAlignment: language === 'it' ? 'ALLINEAMENTO STRATEGICO' : 'STRATEGIC ALIGNMENT',
    noPatterns: language === 'it' ? 'Nessun pattern candela rilevato' : 'No candlestick patterns detected',
    filterAll: language === 'it' ? 'Tutti' : 'All',
    filter15m: '15 Min',
    filter1h: '1 Ora',
    filter4h: '4 Ore',
    filter1d: language === 'it' ? 'Giornaliero' : 'Daily',
    filter1w: language === 'it' ? 'Settimanale' : 'Weekly',
    cosa: language === 'it' ? 'Cosa Succede' : 'What Happens',
    perche: language === 'it' ? 'Perché' : 'Why',
    azione: language === 'it' ? 'Azione' : 'Action',
    completion: language === 'it' ? 'Affidabilità' : 'Reliability',
    draw: language === 'it' ? 'Disegna' : 'Draw',
    remove: language === 'it' ? 'Rimuovi' : 'Remove',
    refresh: language === 'it' ? 'Aggiorna' : 'Refresh',
    topPatterns: language === 'it' ? 'Top 10 Segnali Candlestick' : 'Top 10 Candlestick Signals',
    nearSR: language === 'it' ? 'Su S/R' : 'At S/R',
    multiTF: language === 'it' ? 'Multi-TF' : 'Multi-TF',
    reversal: language === 'it' ? 'Inversione' : 'Reversal',
    continuation: language === 'it' ? 'Continuazione' : 'Continuation'
  }), [language]);

  // Pattern labels in Italian
  const getPatternLabel = useCallback((type) => {
    const labels = {
      'bullish_engulfing': language === 'it' ? 'Engulfing Rialzista' : 'Bullish Engulfing',
      'bearish_engulfing': language === 'it' ? 'Engulfing Ribassista' : 'Bearish Engulfing',
      'doji': 'Doji',
      'hammer': 'Hammer',
      'shooting_star': 'Shooting Star',
      'morning_star': language === 'it' ? 'Stella del Mattino' : 'Morning Star',
      'evening_star': language === 'it' ? 'Stella della Sera' : 'Evening Star'
    };
    return labels[type] || type;
  }, [language]);

  // Fetch patterns
  const fetchPatterns = useCallback(async () => {
    try {
      const [patternsRes, ghostRes] = await Promise.all([
        fetch(`${API_URL}/api/sentinel/patterns/candlestick?lang=${language}`),
        fetch(`${API_URL}/api/sentinel/ghost-projections?timeframe=4h&lang=${language}`)
      ]);
      
      if (patternsRes.ok) {
        const data = await patternsRes.json();
        // Noise reduction: sort by significance and take top 10
        const sortedPatterns = (data.patterns || [])
          .sort((a, b) => {
            const scoreA = (a.reliability || 0) + (a.near_sr ? 30 : 0) + (a.multi_tf ? 25 : 0);
            const scoreB = (b.reliability || 0) + (b.near_sr ? 30 : 0) + (b.multi_tf ? 25 : 0);
            return scoreB - scoreA;
          })
          .slice(0, 10);
        setPatterns(sortedPatterns);
      }
      
      if (ghostRes.ok) {
        const ghostData = await ghostRes.json();
        setGhostProjections(ghostData.projections || []);
      }
    } catch (error) {
      console.error('Error fetching candlestick patterns:', error);
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    fetchPatterns();
    const interval = setInterval(fetchPatterns, 30000);
    return () => clearInterval(interval);
  }, [fetchPatterns]);

  // Filter patterns for chart overlay
  const chartFilteredPatterns = useMemo(() => 
    anchoredPatterns.filter(p => CANDLESTICK_TYPES.includes(p.type)), 
    [anchoredPatterns]
  );

  // Filter displayed patterns by timeframe
  const displayedPatterns = useMemo(() => {
    if (selectedTimeframe === 'all') return patterns;
    return patterns.filter(p => p.timeframe === selectedTimeframe);
  }, [patterns, selectedTimeframe]);

  const timeframes = [
    { value: 'all', label: t.filterAll },
    { value: '15m', label: t.filter15m },
    { value: '1h', label: t.filter1h },
    { value: '4h', label: t.filter4h },
    { value: '1d', label: t.filter1d },
    { value: '1w', label: t.filter1w }
  ];

  // Horizontal scroll
  const scrollContainer = React.useRef(null);
  const scrollLeft = () => scrollContainer.current?.scrollBy({ left: -320, behavior: 'smooth' });
  const scrollRight = () => scrollContainer.current?.scrollBy({ left: 320, behavior: 'smooth' });

  return (
    <div className="flex flex-col h-full min-h-screen bg-crypto-darker" data-testid="candlesticks-page">
      {/* ═══════════════════════════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-crypto-border/50 bg-crypto-card/30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <CandlestickChart className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight flex items-center gap-2">
              {t.title}
              <Badge className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/40">
                <Flame className="w-3 h-3 mr-1" />
                v4.5
              </Badge>
            </h1>
            <p className="text-xs text-zinc-500">{t.subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Timeframe Filters */}
          <div className="flex items-center gap-1 bg-zinc-900/50 rounded-lg p-1">
            {timeframes.map(tf => (
              <button
                key={tf.value}
                onClick={() => setSelectedTimeframe(tf.value)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md transition-all",
                  selectedTimeframe === tf.value 
                    ? "bg-amber-500/30 text-amber-300 font-medium"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 text-xs font-mono bg-amber-500/20 text-amber-400 rounded">
              {patterns.length} {t.patterns}
            </span>
          </div>
          
          <button onClick={fetchPatterns} className="p-2 hover:bg-white/5 rounded-lg transition-colors" title={t.refresh}>
            <RefreshCw className={cn("w-4 h-4 text-zinc-400", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN CHART
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 p-4 pb-2">
        <div className="h-full bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-crypto-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-500 uppercase">{t.chart}</span>
              <span className="text-[10px] text-amber-400">• {chartFilteredPatterns.length} {t.anchored}</span>
            </div>
            {ghostProjections.length > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 rounded-md">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] text-amber-400 font-medium">
                  {ghostProjections.length} {t.ghostProjections}
                </span>
              </div>
            )}
          </div>
          <div className="p-2 h-[calc(100%-40px)]">
            <TradingChartWithSentinel 
              height={400} 
              filterCategory="candlestick_patterns"
              filteredAnchoredPatterns={chartFilteredPatterns}
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          BOTTOM COCKPIT - Horizontal Candlestick Cards
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="px-4 pb-4">
        <div className="bg-crypto-card/40 border border-crypto-border rounded-lg">
          {/* Section Header */}
          <div className="px-4 py-2 border-b border-crypto-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-zinc-300">{t.topPatterns}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={scrollLeft} className="p-1.5 bg-zinc-800/50 rounded hover:bg-zinc-700/50 transition-colors">
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
              </button>
              <button onClick={scrollRight} className="p-1.5 bg-zinc-800/50 rounded hover:bg-zinc-700/50 transition-colors">
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </div>
          
          {/* Horizontal Scrollable Cards */}
          <div 
            ref={scrollContainer}
            className="flex gap-3 p-3 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {loading ? (
              <div className="flex items-center justify-center w-full py-8">
                <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
              </div>
            ) : displayedPatterns.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full py-8 text-zinc-500">
                <AlertCircle className="w-8 h-8 mb-2" />
                <span className="text-sm">{t.noPatterns}</span>
              </div>
            ) : (
              displayedPatterns.map((pattern, idx) => (
                <HorizontalCandlestickCard 
                  key={`${pattern.type}-${pattern.timeframe}-${idx}`}
                  pattern={pattern}
                  getLabel={getPatternLabel}
                  t={t}
                  isAnchored={isPatternAnchored(pattern)}
                  onAnchor={() => anchorPattern(pattern)}
                  onRemove={() => removeAnchor(pattern)}
                  isSelected={selectedPattern === idx}
                  onSelect={() => setSelectedPattern(selectedPattern === idx ? null : idx)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Horizontal Candlestick Card Component
 */
function HorizontalCandlestickCard({ pattern, getLabel, t, isAnchored, onAnchor, onRemove, isSelected, onSelect }) {
  const isBullish = pattern.bias === 'BULLISH';
  const isBearish = pattern.bias === 'BEARISH';
  const hasStrategicAlignment = pattern.multi_tf || pattern.near_sr;
  
  return (
    <div 
      className={cn(
        "flex-shrink-0 w-[300px] rounded-lg border transition-all cursor-pointer",
        isAnchored 
          ? "bg-cyan-500/10 border-cyan-500/50" 
          : "bg-zinc-900/50 border-zinc-700/50 hover:border-zinc-600",
        isSelected && "ring-2 ring-amber-500/50"
      )}
      style={{ scrollSnapAlign: 'start' }}
      onClick={onSelect}
    >
      {/* Card Header */}
      <div className="px-3 py-2 border-b border-zinc-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isBullish && <TrendingUp className="w-4 h-4 text-bullish" />}
          {isBearish && <TrendingDown className="w-4 h-4 text-bearish" />}
          {!isBullish && !isBearish && <CandlestickChart className="w-4 h-4 text-amber-400" />}
          <span className={cn(
            "text-sm font-semibold",
            isBullish ? "text-bullish" : isBearish ? "text-bearish" : "text-amber-400"
          )}>
            {getLabel(pattern.type)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5">{pattern.timeframe}</Badge>
          <button
            onClick={(e) => { e.stopPropagation(); isAnchored ? onRemove() : onAnchor(); }}
            className={cn(
              "p-1 rounded transition-colors",
              isAnchored ? "bg-cyan-500/20 text-cyan-400" : "bg-zinc-700/50 text-zinc-400 hover:text-white"
            )}
            title={isAnchored ? t.remove : t.draw}
          >
            {isAnchored ? <EyeOff className="w-3 h-3" /> : <PenTool className="w-3 h-3" />}
          </button>
        </div>
      </div>
      
      {/* Strategic Alignment Badge */}
      {hasStrategicAlignment && (
        <div className="px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/10 border-b border-amber-500/30">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-bold text-amber-400 tracking-wider">{t.strategicAlignment}</span>
          </div>
        </div>
      )}
      
      {/* Reliability Bar */}
      <div className="px-3 py-2 border-b border-zinc-700/30">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-zinc-500">{t.completion}</span>
          <span className="text-xs font-mono text-amber-400">{pattern.reliability || pattern.completion || 0}%</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
            style={{ width: `${pattern.reliability || pattern.completion || 0}%` }}
          />
        </div>
      </div>
      
      {/* Cosa / Perché / Azione Content */}
      <div className="p-3 space-y-2">
        {pattern.psychology ? (
          <>
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <Target className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">{t.cosa}</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{pattern.psychology.cosa_succede}</p>
            </div>
            
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <Brain className="w-3 h-3 text-orange-400" />
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">{t.perche}</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{pattern.psychology.perche}</p>
            </div>
            
            <div className="pt-1 border-t border-zinc-700/30">
              <div className="flex items-center gap-1 mb-0.5">
                <Shield className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">{t.azione}</span>
              </div>
              <p className="text-xs text-zinc-200 leading-relaxed font-medium line-clamp-2">{pattern.psychology.azione}</p>
            </div>
          </>
        ) : (
          <div className="text-xs text-zinc-500 text-center py-2">
            {language === 'it' ? 'Analisi non disponibile' : 'Analysis not available'}
          </div>
        )}
      </div>
    </div>
  );
}

export default CandlesticksPage;
