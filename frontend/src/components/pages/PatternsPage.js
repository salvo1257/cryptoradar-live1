import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAnchoredPatterns } from '../../contexts/AnchoredPatternsContext';
import { TradingChartWithSentinel } from '../TradingChartWithSentinel';
import { 
  Search, TrendingUp, TrendingDown, Target, ChevronDown, ChevronUp,
  PenTool, EyeOff, RefreshCw, AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * PATTERNS PAGE - Chart Patterns Only
 * Displays: Triangles, Wedges, H&S, Double/Triple Top/Bottom, Flags, Pennants, Support/Resistance
 * Excludes: Candlestick patterns, Elliott Waves
 */
export function PatternsPage() {
  const { t, language } = useApp();
  const { anchorPattern, removeAnchor, isPatternAnchored, anchoredPatterns } = useAnchoredPatterns();
  
  const [patterns, setPatterns] = useState([]);
  const [confluences, setConfluences] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedConfluence, setExpandedConfluence] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');

  // Fetch chart patterns from backend
  const fetchPatterns = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/sentinel/patterns/chart?lang=${language}`);
      if (res.ok) {
        const data = await res.json();
        setPatterns(data.patterns || []);
        setConfluences(data.confluences || {});
      }
    } catch (error) {
      console.error('Error fetching chart patterns:', error);
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    fetchPatterns();
    const interval = setInterval(fetchPatterns, 30000);
    return () => clearInterval(interval);
  }, [fetchPatterns]);

  // Filter patterns for chart overlay - only show anchored chart patterns
  const chartFilteredPatterns = anchoredPatterns.filter(p => 
    !p.type?.startsWith('elliott') && 
    !['bullish_engulfing', 'bearish_engulfing', 'doji', 'hammer', 'shooting_star', 'morning_star', 'evening_star'].includes(p.type)
  );

  // Filter displayed patterns by timeframe
  const displayedPatterns = selectedTimeframe === 'all' 
    ? patterns 
    : patterns.filter(p => p.timeframe === selectedTimeframe);

  const timeframes = [
    { value: 'all', label: 'Tutti' },
    { value: '15m', label: '15 Min' },
    { value: '1h', label: '1 Ora' },
    { value: '4h', label: '4 Ore' },
    { value: '1d', label: 'Giornaliero' },
    { value: '1w', label: 'Settimanale' },
    { value: '1M', label: 'Mensile' }
  ];

  const getPatternLabel = (type) => {
    const labels = {
      'head_and_shoulders': 'Head & Shoulders',
      'inverse_head_and_shoulders': 'Inv. H&S',
      'double_top': 'Doppio Massimo',
      'double_bottom': 'Doppio Minimo',
      'triple_top': 'Triplo Massimo',
      'triple_bottom': 'Triplo Minimo',
      'symmetrical_triangle': 'Triangolo Simmetrico',
      'ascending_triangle': 'Triangolo Ascendente',
      'descending_triangle': 'Triangolo Discendente',
      'rising_wedge': 'Cuneo Ascendente',
      'falling_wedge': 'Cuneo Discendente',
      'bull_flag': 'Bull Flag',
      'bear_flag': 'Bear Flag',
      'pennant': 'Pennant',
      'support_line': 'Supporto',
      'resistance_line': 'Resistenza',
      'trendline_up': 'Trendline Rialzista',
      'trendline_down': 'Trendline Ribassista'
    };
    return labels[type] || type;
  };

  const getBiasColor = (bias) => {
    if (bias === 'BULLISH') return 'text-bullish';
    if (bias === 'BEARISH') return 'text-bearish';
    return 'text-zinc-400';
  };

  return (
    <div className="p-4 space-y-4" data-testid="patterns-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Search className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">Pattern Grafici</h1>
            <p className="text-sm text-zinc-500">Triangoli, Wedge, H&S, Doppi Top/Bottom</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs font-mono bg-purple-500/20 text-purple-400 rounded">
            {patterns.length} Pattern
          </span>
          <button 
            onClick={fetchPatterns}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            data-testid="refresh-patterns"
          >
            <RefreshCw className={cn("w-4 h-4 text-zinc-400", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Main Layout: Chart Left, Feed Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart Section (2/3 width) */}
        <div className="lg:col-span-2 bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden">
          <div className="p-2 border-b border-crypto-border">
            <span className="text-xs font-mono text-zinc-500">
              CHART • {chartFilteredPatterns.length} Pattern Ancorati
            </span>
          </div>
          <div className="p-2">
            <TradingChartWithSentinel 
              height={500} 
              filterCategory="chart_patterns"
              filteredAnchoredPatterns={chartFilteredPatterns}
            />
          </div>
        </div>

        {/* Pattern Feed Section (1/3 width) */}
        <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden flex flex-col max-h-[600px]">
          {/* Feed Header */}
          <div className="p-3 border-b border-crypto-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-purple-400">PATTERN FEED</span>
              {chartFilteredPatterns.length > 0 && (
                <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded">
                  {chartFilteredPatterns.length} Ancorati
                </span>
              )}
            </div>
            
            {/* Timeframe Filter */}
            <div className="flex flex-wrap gap-1">
              {timeframes.map(tf => (
                <button
                  key={tf.value}
                  onClick={() => setSelectedTimeframe(tf.value)}
                  className={cn(
                    "px-2 py-1 text-xs rounded transition-colors",
                    selectedTimeframe === tf.value 
                      ? "bg-purple-500/30 text-purple-300 border border-purple-500/50"
                      : "bg-zinc-800/50 text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Patterns List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 text-purple-400 animate-spin" />
              </div>
            ) : displayedPatterns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                <AlertCircle className="w-8 h-8 mb-2" />
                <span className="text-sm">Nessun pattern rilevato</span>
              </div>
            ) : (
              displayedPatterns.map((pattern, idx) => (
                <PatternCard 
                  key={`${pattern.type}-${pattern.timeframe}-${idx}`}
                  pattern={pattern}
                  getLabel={getPatternLabel}
                  getBiasColor={getBiasColor}
                  isAnchored={isPatternAnchored(pattern)}
                  onAnchor={() => anchorPattern(pattern)}
                  onRemove={() => removeAnchor(pattern)}
                />
              ))
            )}
          </div>

          {/* Confluences Section */}
          {Object.keys(confluences).length > 0 && (
            <div className="border-t border-crypto-border p-2">
              <span className="text-xs font-semibold text-zinc-400 block mb-2">CONFLUENZE</span>
              {Object.entries(confluences).slice(0, 3).map(([type, data]) => (
                <div 
                  key={type}
                  className="p-2 bg-zinc-800/50 rounded mb-1 cursor-pointer hover:bg-zinc-800"
                  onClick={() => setExpandedConfluence(expandedConfluence === type ? null : type)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{getPatternLabel(type)}</span>
                    <span className="text-xs text-purple-400">{data.count} TF</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Individual Pattern Card Component
function PatternCard({ pattern, getLabel, getBiasColor, isAnchored, onAnchor, onRemove }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      "p-2 rounded border transition-all",
      isAnchored 
        ? "bg-cyan-500/10 border-cyan-500/50" 
        : "bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600"
    )}>
      {/* Pattern Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-medium", getBiasColor(pattern.bias))}>
            {getLabel(pattern.type)}
          </span>
          <span className="px-1.5 py-0.5 text-[10px] bg-zinc-700/50 text-zinc-400 rounded">
            {pattern.timeframe}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Anchor/Remove Button */}
          <button
            onClick={isAnchored ? onRemove : onAnchor}
            className={cn(
              "p-1.5 rounded transition-colors",
              isAnchored 
                ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                : "bg-zinc-700/50 text-zinc-400 hover:text-white"
            )}
            data-testid={`anchor-pattern-${pattern.type}`}
          >
            {isAnchored ? <EyeOff className="w-3.5 h-3.5" /> : <PenTool className="w-3.5 h-3.5" />}
          </button>
          
          {/* Expand Button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 bg-zinc-700/50 rounded hover:bg-zinc-700 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Completion & Direction */}
      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-purple-500 rounded-full"
            style={{ width: `${pattern.completion || 0}%` }}
          />
        </div>
        <span className="text-[10px] text-zinc-500">{pattern.completion || 0}%</span>
        {pattern.bias === 'BULLISH' && <TrendingUp className="w-3 h-3 text-bullish" />}
        {pattern.bias === 'BEARISH' && <TrendingDown className="w-3 h-3 text-bearish" />}
      </div>

      {/* Expanded Details */}
      {expanded && pattern.psychology && (
        <div className="mt-2 pt-2 border-t border-zinc-700/50 space-y-1">
          <div className="text-xs">
            <span className="text-purple-400 font-medium">Cosa:</span>
            <span className="text-zinc-400 ml-1">{pattern.psychology.cosa_succede}</span>
          </div>
          <div className="text-xs">
            <span className="text-purple-400 font-medium">Perché:</span>
            <span className="text-zinc-400 ml-1">{pattern.psychology.perche}</span>
          </div>
          <div className="text-xs">
            <span className="text-cyan-400 font-medium">Azione:</span>
            <span className="text-zinc-300 ml-1">{pattern.psychology.azione}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatternsPage;
