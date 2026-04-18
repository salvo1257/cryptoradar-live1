import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAnchoredPatterns } from '../../contexts/AnchoredPatternsContext';
import { TradingChartWithSentinel } from '../TradingChartWithSentinel';
import { 
  TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  PenTool, EyeOff, RefreshCw, AlertCircle, Layers, Zap, 
  GitBranch, Hash, Circle
} from 'lucide-react';
import { cn } from '../../lib/utils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * ELLIOTT WAVES PAGE - Elliott Wave Analysis Only
 * Displays: Wave 1-5, Wave A-B-C, Impulse/Corrective, Fractal Sub-waves
 * Excludes: Chart patterns, Candlestick patterns
 */
export function ElliottWavesPage() {
  const { t, language } = useApp();
  const { anchorPattern, removeAnchor, isPatternAnchored, anchoredPatterns } = useAnchoredPatterns();
  
  const [patterns, setPatterns] = useState([]);
  const [fractals, setFractals] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [showFractals, setShowFractals] = useState(true);

  // Elliott wave pattern types
  const ELLIOTT_TYPES = [
    'elliott_wave_1', 'elliott_wave_2', 'elliott_wave_3', 'elliott_wave_4', 'elliott_wave_5',
    'elliott_wave_a', 'elliott_wave_b', 'elliott_wave_c',
    'elliott_impulse', 'elliott_corrective',
    'elliott_subwave_1', 'elliott_subwave_2', 'elliott_subwave_3', 'elliott_subwave_4', 'elliott_subwave_5',
    'elliott_subwave_a', 'elliott_subwave_b', 'elliott_subwave_c',
    'elliott_fractal_complete', 'elliott_fractal_insight'
  ];

  // Fetch Elliott patterns from backend
  const fetchPatterns = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/sentinel/patterns/elliott?lang=${language}`);
      if (res.ok) {
        const data = await res.json();
        setPatterns(data.patterns || []);
        setFractals(data.fractals || {});
      }
    } catch (error) {
      console.error('Error fetching Elliott patterns:', error);
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    fetchPatterns();
    const interval = setInterval(fetchPatterns, 30000);
    return () => clearInterval(interval);
  }, [fetchPatterns]);

  // Filter patterns for chart overlay - only show anchored Elliott patterns
  const chartFilteredPatterns = anchoredPatterns.filter(p => 
    ELLIOTT_TYPES.includes(p.type)
  );

  // Separate impulse waves (1-5) from corrective (A-B-C)
  const impulseWaves = patterns.filter(p => 
    ['elliott_wave_1', 'elliott_wave_2', 'elliott_wave_3', 'elliott_wave_4', 'elliott_wave_5', 'elliott_impulse'].includes(p.type)
  );
  
  const correctiveWaves = patterns.filter(p => 
    ['elliott_wave_a', 'elliott_wave_b', 'elliott_wave_c', 'elliott_corrective'].includes(p.type)
  );
  
  const subwaves = patterns.filter(p => 
    p.type?.includes('subwave') || p.type?.includes('fractal')
  );

  // Filter by timeframe
  const filterByTimeframe = (waves) => {
    if (selectedTimeframe === 'all') return waves;
    return waves.filter(p => p.timeframe === selectedTimeframe);
  };

  const timeframes = [
    { value: 'all', label: 'Tutti' },
    { value: '15m', label: '15 Min' },
    { value: '1h', label: '1 Ora' },
    { value: '4h', label: '4 Ore' },
    { value: '1d', label: 'Giornaliero' },
    { value: '1w', label: 'Settimanale' },
    { value: '1M', label: 'Mensile' }
  ];

  const getWaveLabel = (type) => {
    const labels = {
      'elliott_wave_1': 'Onda 1',
      'elliott_wave_2': 'Onda 2',
      'elliott_wave_3': 'Onda 3',
      'elliott_wave_4': 'Onda 4',
      'elliott_wave_5': 'Onda 5',
      'elliott_wave_a': 'Onda A',
      'elliott_wave_b': 'Onda B',
      'elliott_wave_c': 'Onda C',
      'elliott_impulse': 'Impulso Completo (1-5)',
      'elliott_corrective': 'Correzione Completa (A-B-C)',
      'elliott_subwave_1': 'Sub-onda 1',
      'elliott_subwave_2': 'Sub-onda 2',
      'elliott_subwave_3': 'Sub-onda 3',
      'elliott_subwave_4': 'Sub-onda 4',
      'elliott_subwave_5': 'Sub-onda 5',
      'elliott_subwave_a': 'Sub-onda A',
      'elliott_subwave_b': 'Sub-onda B',
      'elliott_subwave_c': 'Sub-onda C',
      'elliott_fractal_complete': 'Frattale Completo',
      'elliott_fractal_insight': 'Insight Frattale'
    };
    return labels[type] || type;
  };

  const getWaveNumber = (type) => {
    const match = type?.match(/wave_(\d|[abc])/i) || type?.match(/subwave_(\d|[abc])/i);
    if (match) return match[1].toUpperCase();
    return null;
  };

  const getWaveColor = (type) => {
    // Impulse waves (1-5) - green tones
    if (type?.includes('wave_1') || type?.includes('wave_3') || type?.includes('wave_5')) {
      return 'text-bullish';
    }
    // Corrective waves in impulse (2, 4) - yellow/orange
    if (type?.includes('wave_2') || type?.includes('wave_4')) {
      return 'text-amber-400';
    }
    // ABC waves - red tones
    if (type?.includes('wave_a') || type?.includes('wave_b') || type?.includes('wave_c')) {
      return 'text-bearish';
    }
    // Fractals/subwaves - cyan
    if (type?.includes('subwave') || type?.includes('fractal')) {
      return 'text-cyan-400';
    }
    return 'text-zinc-400';
  };

  return (
    <div className="p-4 space-y-4" data-testid="elliott-waves-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-bullish/20 to-bearish/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-bullish" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">Onde di Elliott</h1>
            <p className="text-sm text-zinc-500">Onde 1-5, Correzioni A-B-C, Frattali</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Fractal Toggle */}
          <button
            onClick={() => setShowFractals(!showFractals)}
            className={cn(
              "px-2 py-1 text-xs rounded border transition-colors flex items-center gap-1",
              showFractals 
                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
                : "bg-zinc-800 text-zinc-500 border-zinc-700"
            )}
          >
            <Layers className="w-3 h-3" />
            Frattali
          </button>
          <span className="px-2 py-1 text-xs font-mono bg-gradient-to-r from-bullish/20 to-bearish/20 text-white rounded">
            {patterns.length} Onde
          </span>
          <button 
            onClick={fetchPatterns}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            data-testid="refresh-elliott"
          >
            <RefreshCw className={cn("w-4 h-4 text-zinc-400", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Main Layout: Chart Left, Feed Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart Section (2/3 width) */}
        <div className="lg:col-span-2 bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden">
          <div className="p-2 border-b border-crypto-border flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-500">
              CHART • {chartFilteredPatterns.length} Onde Ancorate
            </span>
            {/* Elliott Legend */}
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-bullish"></div>
                <span className="text-bullish">Impulso (1-3-5)</span>
              </span>
              <span className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-amber-400"></div>
                <span className="text-amber-400">Ritracciamento (2-4)</span>
              </span>
              <span className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-bearish"></div>
                <span className="text-bearish">Correzione (A-B-C)</span>
              </span>
            </div>
          </div>
          <div className="p-2">
            <TradingChartWithSentinel 
              height={500} 
              filterCategory="elliott_waves"
              filteredAnchoredPatterns={chartFilteredPatterns}
              showFractals={showFractals}
            />
          </div>
        </div>

        {/* Elliott Feed Section (1/3 width) */}
        <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden flex flex-col max-h-[600px]">
          {/* Feed Header */}
          <div className="p-3 border-b border-crypto-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold bg-gradient-to-r from-bullish to-bearish bg-clip-text text-transparent">
                ELLIOTT WAVE FEED
              </span>
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
                      ? "bg-gradient-to-r from-bullish/30 to-bearish/30 text-white border border-bullish/50"
                      : "bg-zinc-800/50 text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Waves List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 text-bullish animate-spin" />
              </div>
            ) : patterns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                <AlertCircle className="w-8 h-8 mb-2" />
                <span className="text-sm">Nessuna onda Elliott rilevata</span>
                <span className="text-xs mt-1 text-center">
                  Le onde Elliott richiedono sequenze specifiche di swings
                </span>
              </div>
            ) : (
              <>
                {/* Impulse Waves Section */}
                {filterByTimeframe(impulseWaves).length > 0 && (
                  <WaveSection 
                    title="IMPULSO (1-5)"
                    waves={filterByTimeframe(impulseWaves)}
                    color="bullish"
                    icon={Zap}
                    getLabel={getWaveLabel}
                    getNumber={getWaveNumber}
                    getColor={getWaveColor}
                    isAnchored={isPatternAnchored}
                    onAnchor={anchorPattern}
                    onRemove={removeAnchor}
                  />
                )}
                
                {/* Corrective Waves Section */}
                {filterByTimeframe(correctiveWaves).length > 0 && (
                  <WaveSection 
                    title="CORREZIONE (A-B-C)"
                    waves={filterByTimeframe(correctiveWaves)}
                    color="bearish"
                    icon={GitBranch}
                    getLabel={getWaveLabel}
                    getNumber={getWaveNumber}
                    getColor={getWaveColor}
                    isAnchored={isPatternAnchored}
                    onAnchor={anchorPattern}
                    onRemove={removeAnchor}
                  />
                )}
                
                {/* Fractals Section */}
                {showFractals && filterByTimeframe(subwaves).length > 0 && (
                  <WaveSection 
                    title="FRATTALI (Sub-onde)"
                    waves={filterByTimeframe(subwaves)}
                    color="cyan"
                    icon={Layers}
                    getLabel={getWaveLabel}
                    getNumber={getWaveNumber}
                    getColor={getWaveColor}
                    isAnchored={isPatternAnchored}
                    onAnchor={anchorPattern}
                    onRemove={removeAnchor}
                  />
                )}
              </>
            )}
          </div>

          {/* Elliott Theory Info */}
          <div className="border-t border-crypto-border p-3 bg-zinc-900/50">
            <span className="text-xs font-semibold text-zinc-400 block mb-2">TEORIA DI ELLIOTT</span>
            <div className="text-[10px] text-zinc-500 space-y-1">
              <p><strong className="text-bullish">Impulso:</strong> 5 onde nella direzione del trend (1-2-3-4-5)</p>
              <p><strong className="text-bearish">Correzione:</strong> 3 onde contro-trend (A-B-C)</p>
              <p><strong className="text-cyan-400">Frattali:</strong> Ogni onda contiene onde più piccole</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wave Section Component
function WaveSection({ title, waves, color, icon: SectionIcon, getLabel, getNumber, getColor, isAnchored, onAnchor, onRemove }) {
  const [expanded, setExpanded] = useState(true);
  
  const colorClasses = {
    bullish: 'text-bullish border-bullish/30 bg-bullish/10',
    bearish: 'text-bearish border-bearish/30 bg-bearish/10',
    cyan: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10'
  };

  return (
    <div className="border border-zinc-700/50 rounded overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full px-3 py-2 flex items-center justify-between",
          colorClasses[color]
        )}
      >
        <div className="flex items-center gap-2">
          <SectionIcon className="w-4 h-4" />
          <span className="text-xs font-semibold">{title}</span>
          <span className="text-[10px] opacity-70">({waves.length})</span>
        </div>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      
      {expanded && (
        <div className="p-2 space-y-1 bg-zinc-900/50">
          {waves.map((wave, idx) => (
            <WaveCard 
              key={`${wave.type}-${wave.timeframe}-${idx}`}
              wave={wave}
              getLabel={getLabel}
              getNumber={getNumber}
              getColor={getColor}
              isAnchored={isAnchored(wave)}
              onAnchor={() => onAnchor(wave)}
              onRemove={() => onRemove(wave)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Individual Wave Card Component
function WaveCard({ wave, getLabel, getNumber, getColor, isAnchored, onAnchor, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const waveNum = getNumber(wave.type);

  return (
    <div className={cn(
      "p-2 rounded border transition-all",
      isAnchored 
        ? "bg-cyan-500/10 border-cyan-500/50" 
        : "bg-zinc-800/30 border-zinc-700/30 hover:border-zinc-600"
    )}>
      {/* Wave Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Wave Number Circle */}
          {waveNum && (
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
              getColor(wave.type),
              "bg-current/20"
            )}>
              <span className="text-white">{waveNum}</span>
            </div>
          )}
          <span className={cn("text-sm font-medium", getColor(wave.type))}>
            {getLabel(wave.type)}
          </span>
          <span className="px-1.5 py-0.5 text-[10px] bg-zinc-700/50 text-zinc-400 rounded">
            {wave.timeframe}
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
            data-testid={`anchor-wave-${wave.type}`}
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

      {/* Price Range */}
      {(wave.start_price || wave.end_price) && (
        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
          {wave.start_price && <span>Da: ${wave.start_price?.toLocaleString()}</span>}
          {wave.end_price && <span>A: ${wave.end_price?.toLocaleString()}</span>}
        </div>
      )}

      {/* Expanded Psychology */}
      {expanded && wave.psychology && (
        <div className="mt-2 pt-2 border-t border-zinc-700/30 space-y-1">
          <div className="text-xs">
            <span className="text-bullish font-medium">Cosa:</span>
            <span className="text-zinc-400 ml-1">{wave.psychology.cosa_succede}</span>
          </div>
          <div className="text-xs">
            <span className="text-amber-400 font-medium">Perché:</span>
            <span className="text-zinc-400 ml-1">{wave.psychology.perche}</span>
          </div>
          <div className="text-xs">
            <span className="text-cyan-400 font-medium">Azione:</span>
            <span className="text-zinc-300 ml-1">{wave.psychology.azione}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ElliottWavesPage;
