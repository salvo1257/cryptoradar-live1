import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Eye, Target, TrendingUp, TrendingDown, AlertTriangle, Clock, ChevronRight, Lightbulb, Activity, Layers } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Timeframe colors matching backend
const TIMEFRAME_COLORS = {
  "15m": "#00F0FF",
  "1h": "#8B5CF6",
  "4h": "#00FF9D",
  "1d": "#FFD700",
  "1w": "#FF6B35",
  "1M": "#FF1E56",
};

const TIMEFRAME_LABELS = {
  "15m": "15 Min",
  "1h": "1 Ora",
  "4h": "4 Ore",
  "1d": "Giornaliero",
  "1w": "Settimanale",
  "1M": "Mensile",
};

// Pattern type display names
const PATTERN_NAMES = {
  head_and_shoulders: { it: "Testa e Spalle", icon: "🎯" },
  inverse_head_and_shoulders: { it: "Testa e Spalle Inverso", icon: "🎯" },
  double_top: { it: "Doppio Massimo", icon: "⬆️⬆️" },
  double_bottom: { it: "Doppio Minimo", icon: "⬇️⬇️" },
  symmetrical_triangle: { it: "Triangolo Simmetrico", icon: "🔺" },
  ascending_triangle: { it: "Triangolo Ascendente", icon: "📈" },
  descending_triangle: { it: "Triangolo Discendente", icon: "📉" },
  rising_wedge: { it: "Cuneo Ascendente", icon: "⚠️" },
  falling_wedge: { it: "Cuneo Discendente", icon: "💹" },
  bull_flag: { it: "Flag Rialzista", icon: "🏁" },
  bear_flag: { it: "Flag Ribassista", icon: "🏁" },
  bullish_engulfing: { it: "Engulfing Rialzista", icon: "🟢" },
  bearish_engulfing: { it: "Engulfing Ribassista", icon: "🔴" },
  hammer: { it: "Hammer", icon: "🔨" },
  shooting_star: { it: "Shooting Star", icon: "⭐" },
  doji: { it: "Doji", icon: "✖️" },
  support_line: { it: "Supporto", icon: "🟢" },
  resistance_line: { it: "Resistenza", icon: "🔴" },
  trendline_up: { it: "Trendline Rialzista", icon: "📈" },
  trendline_down: { it: "Trendline Ribassista", icon: "📉" },
};

function PatternCard({ pattern, isHighProbability = false }) {
  const [showPsychology, setShowPsychology] = useState(false);
  const patternInfo = PATTERN_NAMES[pattern.type] || { it: pattern.type_display, icon: "📊" };
  const tfColor = TIMEFRAME_COLORS[pattern.timeframe] || "#8B5CF6";
  const psychology = pattern.psychology || {};
  
  return (
    <div 
      className={cn(
        "relative bg-zinc-900/60 border rounded-lg p-4 transition-all duration-300",
        isHighProbability 
          ? "border-amber-500/50 shadow-lg shadow-amber-500/10" 
          : "border-zinc-700/50 hover:border-zinc-600/50"
      )}
    >
      {/* High probability badge */}
      {isHighProbability && (
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 animate-pulse">
            HIGH PROB
          </Badge>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{patternInfo.icon}</span>
          <div>
            <h4 className="font-semibold text-sm text-white">
              {patternInfo.it}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: tfColor }}
              />
              <span className="text-[10px] text-zinc-400">
                {TIMEFRAME_LABELS[pattern.timeframe] || pattern.timeframe}
              </span>
            </div>
          </div>
        </div>
        
        {/* Bias badge */}
        <Badge 
          className={cn(
            "text-[10px] font-bold px-2 py-0.5",
            pattern.bias === "BULLISH" 
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              : pattern.bias === "BEARISH"
              ? "bg-red-500/20 text-red-400 border-red-500/30"
              : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
          )}
        >
          {pattern.bias === "BULLISH" ? "LONG" : pattern.bias === "BEARISH" ? "SHORT" : "NEUTRAL"}
        </Badge>
      </div>
      
      {/* Completion bar */}
      {pattern.completion > 0 && (
        <div className="mb-3">
          <div className="flex justify-between items-center text-[10px] text-zinc-500 mb-1">
            <span>Completamento</span>
            <span>{pattern.completion}%</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${pattern.completion}%`,
                backgroundColor: tfColor
              }}
            />
          </div>
        </div>
      )}
      
      {/* Target info */}
      {pattern.target && (
        <div className="flex items-center gap-2 text-xs text-zinc-400 mb-3">
          <Target className="w-3 h-3" />
          <span>Target: ${pattern.target?.toLocaleString()}</span>
          {pattern.distance_to_target && (
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded",
              pattern.distance_to_target > 0 
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-red-500/20 text-red-400"
            )}>
              {pattern.distance_to_target > 0 ? "+" : ""}{pattern.distance_to_target.toFixed(2)}%
            </span>
          )}
        </div>
      )}
      
      {/* Psychology toggle */}
      <button
        onClick={() => setShowPsychology(!showPsychology)}
        className="w-full flex items-center justify-between text-xs text-amber-400/80 hover:text-amber-400 transition-colors py-1.5 border-t border-zinc-700/30"
      >
        <span className="flex items-center gap-1.5">
          <Lightbulb className="w-3 h-3" />
          Psicologia del Pattern
        </span>
        <ChevronRight className={cn(
          "w-3 h-3 transition-transform duration-200",
          showPsychology && "rotate-90"
        )} />
      </button>
      
      {/* Psychology content */}
      {showPsychology && psychology.cosa_succede && (
        <div className="mt-3 space-y-2 bg-amber-500/5 border-l-2 border-amber-500/50 rounded-r p-3">
          <div>
            <span className="text-[10px] font-bold text-amber-400/80 uppercase">Cosa succede</span>
            <p className="text-xs text-zinc-300 mt-0.5">{psychology.cosa_succede}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-purple-400/80 uppercase">Perché</span>
            <p className="text-xs text-zinc-300 mt-0.5">{psychology.perche}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-cyan-400/80 uppercase">Azione</span>
            <p className="text-xs text-zinc-300 mt-0.5">{psychology.azione}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ConfluenceAlert({ confluence }) {
  const [expanded, setExpanded] = useState(false);
  const patternInfo = PATTERN_NAMES[confluence.pattern_type] || { it: confluence.pattern_type, icon: "📊" };
  
  return (
    <div 
      className={cn(
        "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg p-4",
        confluence.is_high_probability && "ring-1 ring-amber-500/50"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/20 rounded-lg">
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-white flex items-center gap-2">
              {patternInfo.icon} {patternInfo.it}
              {confluence.is_high_probability && (
                <Badge className="bg-amber-500 text-black text-[9px] px-1.5">
                  ALTA PROBABILITÀ
                </Badge>
              )}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              {confluence.timeframes?.map((tf, i) => (
                <span 
                  key={i}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ 
                    backgroundColor: `${TIMEFRAME_COLORS[tf]}20`,
                    color: TIMEFRAME_COLORS[tf]
                  }}
                >
                  {TIMEFRAME_LABELS[tf] || tf}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-amber-400">
            {confluence.confluence_score?.toFixed(0)}
          </div>
          <div className="text-[10px] text-zinc-500">Confluenza</div>
        </div>
      </div>
      
      {/* Bias indicator */}
      <div className="mt-3 flex items-center gap-2">
        {confluence.bias === "BULLISH" ? (
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        ) : confluence.bias === "BEARISH" ? (
          <TrendingDown className="w-4 h-4 text-red-400" />
        ) : (
          <Activity className="w-4 h-4 text-zinc-400" />
        )}
        <span className={cn(
          "text-sm font-medium",
          confluence.bias === "BULLISH" ? "text-emerald-400" : 
          confluence.bias === "BEARISH" ? "text-red-400" : "text-zinc-400"
        )}>
          Bias: {confluence.bias}
        </span>
        <span className="text-xs text-zinc-500">
          (Peso totale: {confluence.total_weight})
        </span>
      </div>
      
      {/* Expand to see individual patterns */}
      {confluence.patterns?.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-amber-400/70 hover:text-amber-400 flex items-center gap-1"
        >
          <ChevronRight className={cn("w-3 h-3 transition-transform", expanded && "rotate-90")} />
          {confluence.patterns.length} pattern su {confluence.timeframes?.length} timeframe
        </button>
      )}
      
      {expanded && confluence.patterns && (
        <div className="mt-2 space-y-1 pl-4 border-l border-amber-500/30">
          {confluence.patterns.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-zinc-400">
              <span 
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: TIMEFRAME_COLORS[p.tf] }}
              />
              <span>{TIMEFRAME_LABELS[p.tf] || p.tf}</span>
              <span className="text-zinc-600">•</span>
              <span>{p.completion || 0}% completo</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SentinelPatternFeed() {
  const { language } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState("all");
  
  useEffect(() => {
    const fetchPatterns = async () => {
      try {
        const response = await fetch(`${API_URL}/api/sentinel/patterns?lang=${language}`);
        if (!response.ok) throw new Error('Failed to fetch patterns');
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        console.error('[SENTINEL] Fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatterns();
    const interval = setInterval(fetchPatterns, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [language]);
  
  // Filter patterns by timeframe
  const filteredPatterns = selectedTimeframe === "all" 
    ? data?.patterns || []
    : (data?.patterns || []).filter(p => p.timeframe === selectedTimeframe);
  
  const highProbSetups = data?.high_probability_setups || [];
  const confluences = data?.confluences || [];
  
  return (
    <div className="premium-card rounded-lg overflow-hidden" data-testid="sentinel-pattern-feed">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-700/40 bg-zinc-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Eye className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-white flex items-center gap-2">
                The Sentinel
                {data?.scanner_running && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </h2>
              <p className="text-xs text-zinc-400">Pattern Detection Engine</p>
            </div>
          </div>
          
          {/* Stats badges */}
          <div className="flex items-center gap-2">
            {highProbSetups.length > 0 && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {highProbSetups.length} Alta Prob
              </Badge>
            )}
            <Badge variant="outline" className="text-zinc-400 text-xs">
              {data?.patterns_count || 0} Pattern
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Timeframe filter */}
      <div className="px-4 py-3 border-b border-zinc-700/30 bg-zinc-900/30 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <button
            onClick={() => setSelectedTimeframe("all")}
            className={cn(
              "px-3 py-1.5 rounded text-xs font-medium transition-colors",
              selectedTimeframe === "all"
                ? "bg-purple-500/20 text-purple-400"
                : "text-zinc-400 hover:text-zinc-300"
            )}
          >
            Tutti
          </button>
          {Object.entries(TIMEFRAME_LABELS).map(([tf, label]) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1.5",
                selectedTimeframe === tf
                  ? "bg-purple-500/20 text-purple-400"
                  : "text-zinc-400 hover:text-zinc-300"
              )}
            >
              <span 
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: TIMEFRAME_COLORS[tf] }}
              />
              {label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 max-h-[600px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* High probability confluences first */}
            {confluences.length > 0 && selectedTimeframe === "all" && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-amber-400/80 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-3 h-3" />
                  Confluenze Multi-Timeframe
                </h3>
                {confluences.map((conf, i) => (
                  <ConfluenceAlert key={i} confluence={conf} />
                ))}
              </div>
            )}
            
            {/* Individual patterns */}
            {filteredPatterns.length > 0 ? (
              <div className="space-y-3">
                {selectedTimeframe === "all" && confluences.length > 0 && (
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mt-4">
                    Pattern Individuali
                  </h3>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {filteredPatterns.slice(0, 12).map((pattern, i) => (
                    <PatternCard 
                      key={pattern.id || i} 
                      pattern={pattern}
                      isHighProbability={highProbSetups.some(hp => 
                        hp.patterns?.some(p => p.type === pattern.type && p.tf === pattern.timeframe)
                      )}
                    />
                  ))}
                </div>
                {filteredPatterns.length > 12 && (
                  <p className="text-xs text-zinc-500 text-center mt-2">
                    + {filteredPatterns.length - 12} altri pattern
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500">
                <Eye className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nessun pattern rilevato</p>
                <p className="text-xs mt-1">The Sentinel sta monitorando...</p>
              </div>
            )}
            
            {/* Last update time */}
            {data?.last_scan_times && (
              <div className="mt-4 pt-3 border-t border-zinc-800">
                <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                  <Clock className="w-3 h-3" />
                  <span>Ultimo scan: {Object.values(data.last_scan_times).filter(Boolean)[0] 
                    ? new Date(Object.values(data.last_scan_times).filter(Boolean)[0]).toLocaleTimeString()
                    : 'In corso...'
                  }</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SentinelPatternFeed;
