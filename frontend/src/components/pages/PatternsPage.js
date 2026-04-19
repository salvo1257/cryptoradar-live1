import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAnchoredPatterns } from '../../contexts/AnchoredPatternsContext';
import { TradingChartWithSentinel } from '../TradingChartWithSentinel';
import { 
  Search, TrendingUp, TrendingDown, Target, ChevronDown, ChevronUp,
  PenTool, EyeOff, RefreshCw, AlertCircle, Zap, Shield, Brain,
  ChevronLeft, ChevronRight, Filter, Sparkles
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * PATTERNS PAGE v4.5 - "Cockpit Orizzontale"
 * 
 * Layout:
 * - TOP: Full-width interactive chart with Ghost Projections
 * - BOTTOM: Horizontal scrollable cards with "Cosa/Perché/Azione" insights
 * 
 * Features:
 * - Noise Reduction: Only Top 10 most significant patterns
 * - Strategic Alignment badges for multi-TF confirmation
 * - 100% Italian localization
 */
export function PatternsPage() {
  const { language } = useApp();
  const { anchorPattern, removeAnchor, isPatternAnchored, anchoredPatterns } = useAnchoredPatterns();
  
  const [patterns, setPatterns] = useState([]);
  const [ghostProjections, setGhostProjections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Translations
  const t = useMemo(() => ({
    title: language === 'it' ? 'Pattern Grafici' : 'Chart Patterns',
    subtitle: language === 'it' ? 'Intelligenza Predittiva • Solo i Top 10 Pattern Significativi' : 'Predictive Intelligence • Top 10 Significant Patterns Only',
    patterns: language === 'it' ? 'Pattern' : 'Patterns',
    anchored: language === 'it' ? 'Ancorati' : 'Anchored',
    chart: language === 'it' ? 'Grafico' : 'Chart',
    ghostProjections: language === 'it' ? 'Proiezioni Future' : 'Ghost Projections',
    ghostOn: language === 'it' ? 'Proiezioni Attive' : 'Projections Active',
    ghostOff: language === 'it' ? 'Proiezioni Disattive' : 'Projections Off',
    strategicAlignment: language === 'it' ? 'ALLINEAMENTO STRATEGICO' : 'STRATEGIC ALIGNMENT',
    noPatterns: language === 'it' ? 'Nessun pattern significativo rilevato' : 'No significant patterns detected',
    filterAll: language === 'it' ? 'Tutti' : 'All',
    filter15m: '15 Min',
    filter1h: '1 Ora',
    filter4h: '4 Ore',
    filter1d: language === 'it' ? 'Giornaliero' : 'Daily',
    filter1w: language === 'it' ? 'Settimanale' : 'Weekly',
    cosa: language === 'it' ? 'Cosa Succede' : 'What Happens',
    perche: language === 'it' ? 'Perché' : 'Why',
    azione: language === 'it' ? 'Azione' : 'Action',
    completion: language === 'it' ? 'Completamento' : 'Completion',
    draw: language === 'it' ? 'Disegna' : 'Draw',
    remove: language === 'it' ? 'Rimuovi' : 'Remove',
    refresh: language === 'it' ? 'Aggiorna' : 'Refresh',
    topPatterns: language === 'it' ? 'Top 10 Pattern più Significativi' : 'Top 10 Most Significant Patterns',
    nearSR: language === 'it' ? 'Vicino a S/R' : 'Near S/R',
    multiTF: language === 'it' ? 'Multi-TF' : 'Multi-TF'
  }), [language]);

  // Pattern labels in Italian
  const getPatternLabel = useCallback((type) => {
    const labels = {
      'head_and_shoulders': language === 'it' ? 'Testa e Spalle' : 'Head & Shoulders',
      'inverse_head_and_shoulders': language === 'it' ? 'Testa e Spalle Inv.' : 'Inv. H&S',
      'double_top': language === 'it' ? 'Doppio Massimo' : 'Double Top',
      'double_bottom': language === 'it' ? 'Doppio Minimo' : 'Double Bottom',
      'triple_top': language === 'it' ? 'Triplo Massimo' : 'Triple Top',
      'triple_bottom': language === 'it' ? 'Triplo Minimo' : 'Triple Bottom',
      'symmetrical_triangle': language === 'it' ? 'Triangolo Simmetrico' : 'Symmetrical Triangle',
      'ascending_triangle': language === 'it' ? 'Triangolo Ascendente' : 'Ascending Triangle',
      'descending_triangle': language === 'it' ? 'Triangolo Discendente' : 'Descending Triangle',
      'rising_wedge': language === 'it' ? 'Cuneo Ascendente' : 'Rising Wedge',
      'falling_wedge': language === 'it' ? 'Cuneo Discendente' : 'Falling Wedge',
      'bull_flag': language === 'it' ? 'Bandiera Rialzista' : 'Bull Flag',
      'bear_flag': language === 'it' ? 'Bandiera Ribassista' : 'Bear Flag',
      'pennant': language === 'it' ? 'Pennant' : 'Pennant',
      'support_line': language === 'it' ? 'Supporto' : 'Support',
      'resistance_line': language === 'it' ? 'Resistenza' : 'Resistance',
      'trendline_up': language === 'it' ? 'Trendline Rialzista' : 'Bullish Trendline',
      'trendline_down': language === 'it' ? 'Trendline Ribassista' : 'Bearish Trendline'
    };
    return labels[type] || type;
  }, [language]);

  // Fetch patterns and ghost projections
  const fetchPatterns = useCallback(async () => {
    try {
      const [patternsRes, ghostRes] = await Promise.all([
        fetch(`${API_URL}/api/sentinel/patterns/chart?lang=${language}`),
        fetch(`${API_URL}/api/sentinel/ghost-projections?timeframe=4h&lang=${language}`)
      ]);
      
      if (patternsRes.ok) {
        const data = await patternsRes.json();
        // Apply noise reduction: sort by significance and take top 10
        const sortedPatterns = (data.patterns || [])
          .sort((a, b) => {
            // Score by: completion, proximity to S/R, multi-TF confluence
            const scoreA = (a.completion || 0) + (a.near_sr ? 30 : 0) + (a.multi_tf ? 25 : 0);
            const scoreB = (b.completion || 0) + (b.near_sr ? 30 : 0) + (b.multi_tf ? 25 : 0);
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
      console.error('Error fetching patterns:', error);
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
    anchoredPatterns.filter(p => 
      !p.type?.startsWith('elliott') && 
      !['bullish_engulfing', 'bearish_engulfing', 'doji', 'hammer', 'shooting_star', 'morning_star', 'evening_star'].includes(p.type)
    ), [anchoredPatterns]
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

  // Horizontal scroll handlers
  const scrollContainer = React.useRef(null);
  const scrollLeft = () => {
    if (scrollContainer.current) {
      scrollContainer.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };
  const scrollRight = () => {
    if (scrollContainer.current) {
      scrollContainer.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-crypto-darker" data-testid="patterns-page">
      {/* ═══════════════════════════════════════════════════════════════════
          HEADER - Compact with filters
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-crypto-border/50 bg-crypto-card/30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Search className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight flex items-center gap-2">
              {t.title}
              <Badge className="text-[10px] bg-purple-500/20 text-purple-400 border-purple-500/40">
                <Brain className="w-3 h-3 mr-1" />
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
                    ? "bg-purple-500/30 text-purple-300 font-medium"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 text-xs font-mono bg-purple-500/20 text-purple-400 rounded">
              {patterns.length} {t.patterns}
            </span>
            {chartFilteredPatterns.length > 0 && (
              <span className="px-2 py-1 text-xs font-mono bg-cyan-500/20 text-cyan-400 rounded">
                {chartFilteredPatterns.length} {t.anchored}
              </span>
            )}
          </div>
          
          <button 
            onClick={fetchPatterns}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            title={t.refresh}
          >
            <RefreshCw className={cn("w-4 h-4 text-zinc-400", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN CHART - Full Width with Ghost Projections
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 p-4 pb-2">
        <div className="h-full bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-crypto-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-500 uppercase">{t.chart}</span>
              <span className="text-[10px] text-purple-400">
                • {chartFilteredPatterns.length} {t.anchored}
              </span>
            </div>
            {ghostProjections.length > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 rounded-md">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span className="text-[10px] text-purple-400 font-medium">
                  {ghostProjections.length} {t.ghostProjections}
                </span>
              </div>
            )}
          </div>
          <div className="p-2 h-[calc(100%-40px)]">
            <TradingChartWithSentinel 
              height={400} 
              filterCategory="chart_patterns"
              filteredAnchoredPatterns={chartFilteredPatterns}
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          BOTTOM COCKPIT - Horizontal Pattern Cards
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="px-4 pb-4">
        <div className="bg-crypto-card/40 border border-crypto-border rounded-lg">
          {/* Section Header */}
          <div className="px-4 py-2 border-b border-crypto-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-semibold text-zinc-300">{t.topPatterns}</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={scrollLeft}
                className="p-1.5 bg-zinc-800/50 rounded hover:bg-zinc-700/50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
              </button>
              <button 
                onClick={scrollRight}
                className="p-1.5 bg-zinc-800/50 rounded hover:bg-zinc-700/50 transition-colors"
              >
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
                <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
              </div>
            ) : displayedPatterns.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full py-8 text-zinc-500">
                <AlertCircle className="w-8 h-8 mb-2" />
                <span className="text-sm">{t.noPatterns}</span>
              </div>
            ) : (
              displayedPatterns.map((pattern, idx) => (
                <HorizontalPatternCard 
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
 * Horizontal Pattern Card Component
 * Displays "Cosa / Perché / Azione" in a compact horizontal format
 */
function HorizontalPatternCard({ pattern, getLabel, t, isAnchored, onAnchor, onRemove, isSelected, onSelect }) {
  const isBullish = pattern.bias === 'BULLISH';
  const isBearish = pattern.bias === 'BEARISH';
  
  // Check for strategic alignment (multi-TF or near S/R)
  const hasStrategicAlignment = pattern.multi_tf || pattern.near_sr || pattern.strategic_alignment;
  
  return (
    <div 
      className={cn(
        "flex-shrink-0 w-[300px] rounded-lg border transition-all cursor-pointer",
        isAnchored 
          ? "bg-cyan-500/10 border-cyan-500/50" 
          : "bg-zinc-900/50 border-zinc-700/50 hover:border-zinc-600",
        isSelected && "ring-2 ring-purple-500/50"
      )}
      style={{ scrollSnapAlign: 'start' }}
      onClick={onSelect}
    >
      {/* Card Header */}
      <div className="px-3 py-2 border-b border-zinc-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isBullish && <TrendingUp className="w-4 h-4 text-bullish" />}
          {isBearish && <TrendingDown className="w-4 h-4 text-bearish" />}
          <span className={cn(
            "text-sm font-semibold",
            isBullish ? "text-bullish" : isBearish ? "text-bearish" : "text-zinc-300"
          )}>
            {getLabel(pattern.type)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5">
            {pattern.timeframe}
          </Badge>
          <button
            onClick={(e) => {
              e.stopPropagation();
              isAnchored ? onRemove() : onAnchor();
            }}
            className={cn(
              "p-1 rounded transition-colors",
              isAnchored 
                ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                : "bg-zinc-700/50 text-zinc-400 hover:text-white"
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
            <span className="text-[10px] font-bold text-amber-400 tracking-wider">
              {t.strategicAlignment}
            </span>
            {pattern.multi_tf && (
              <Badge className="text-[8px] bg-amber-500/20 text-amber-300 px-1">
                {t.multiTF}
              </Badge>
            )}
            {pattern.near_sr && (
              <Badge className="text-[8px] bg-orange-500/20 text-orange-300 px-1">
                {t.nearSR}
              </Badge>
            )}
          </div>
        </div>
      )}
      
      {/* Completion Bar */}
      <div className="px-3 py-2 border-b border-zinc-700/30">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-zinc-500">{t.completion}</span>
          <span className="text-xs font-mono text-purple-400">{pattern.completion || 0}%</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all",
              pattern.completion >= 80 ? "bg-gradient-to-r from-purple-500 to-purple-400" :
              pattern.completion >= 50 ? "bg-purple-500/70" : "bg-purple-500/40"
            )}
            style={{ width: `${pattern.completion || 0}%` }}
          />
        </div>
      </div>
      
      {/* Cosa / Perché / Azione Content */}
      <div className="p-3 space-y-2">
        {pattern.psychology ? (
          <>
            {/* Cosa Succede */}
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <Target className="w-3 h-3 text-purple-400" />
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">{t.cosa}</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                {pattern.psychology.cosa_succede}
              </p>
            </div>
            
            {/* Perché */}
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <Brain className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">{t.perche}</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                {pattern.psychology.perche}
              </p>
            </div>
            
            {/* Azione */}
            <div className="pt-1 border-t border-zinc-700/30">
              <div className="flex items-center gap-1 mb-0.5">
                <Shield className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">{t.azione}</span>
              </div>
              <p className="text-xs text-zinc-200 leading-relaxed font-medium line-clamp-2">
                {pattern.psychology.azione}
              </p>
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

export default PatternsPage;
