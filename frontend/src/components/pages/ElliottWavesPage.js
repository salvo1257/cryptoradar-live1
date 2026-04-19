import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAnchoredPatterns } from '../../contexts/AnchoredPatternsContext';
import { TradingChartWithSentinel } from '../TradingChartWithSentinel';
import { 
  TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  PenTool, EyeOff, RefreshCw, AlertCircle, Layers, Zap, 
  GitBranch, Target, Brain, Shield, Filter, Sparkles, Hash
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * ELLIOTT WAVES PAGE v4.5 - "Cockpit Orizzontale"
 * 
 * Layout:
 * - TOP: Full-width interactive chart with Ghost Wave Projections
 * - BOTTOM: Horizontal scrollable cards with Wave analysis "Cosa/Perché/Azione"
 * 
 * Features:
 * - Wave 5 & Wave C Ghost Projections to Liquidity Targets
 * - Noise Reduction: Only significant wave counts
 * - Strategic Alignment for multi-TF wave confluence
 * - 100% Italian localization
 */
export function ElliottWavesPage() {
  const { language } = useApp();
  const { anchorPattern, removeAnchor, isPatternAnchored, anchoredPatterns } = useAnchoredPatterns();
  
  const [patterns, setPatterns] = useState([]);
  const [ghostProjections, setGhostProjections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all'); // all, impulse, corrective
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [showFractals, setShowFractals] = useState(false);

  // Elliott wave pattern types
  const ELLIOTT_TYPES = [
    'elliott_wave_1', 'elliott_wave_2', 'elliott_wave_3', 'elliott_wave_4', 'elliott_wave_5',
    'elliott_wave_a', 'elliott_wave_b', 'elliott_wave_c',
    'elliott_impulse', 'elliott_corrective'
  ];

  // Translations
  const t = useMemo(() => ({
    title: language === 'it' ? 'Onde di Elliott' : 'Elliott Waves',
    subtitle: language === 'it' ? 'Analisi Frattale • Proiezioni Predittive verso Liquidità' : 'Fractal Analysis • Predictive Projections to Liquidity',
    waves: language === 'it' ? 'Onde' : 'Waves',
    anchored: language === 'it' ? 'Ancorate' : 'Anchored',
    chart: language === 'it' ? 'Grafico' : 'Chart',
    ghostProjections: language === 'it' ? 'Proiezioni Onde' : 'Wave Projections',
    strategicAlignment: language === 'it' ? 'ALLINEAMENTO STRATEGICO' : 'STRATEGIC ALIGNMENT',
    noWaves: language === 'it' ? 'Nessuna onda significativa rilevata' : 'No significant waves detected',
    filterAll: language === 'it' ? 'Tutte' : 'All',
    filterImpulse: language === 'it' ? 'Impulso (1-5)' : 'Impulse (1-5)',
    filterCorrective: language === 'it' ? 'Correttive (A-B-C)' : 'Corrective (A-B-C)',
    filter15m: '15 Min',
    filter1h: '1 Ora',
    filter4h: '4 Ore',
    filter1d: language === 'it' ? 'Giornaliero' : 'Daily',
    filter1w: language === 'it' ? 'Settimanale' : 'Weekly',
    cosa: language === 'it' ? 'Cosa Succede' : 'What Happens',
    perche: language === 'it' ? 'Perché' : 'Why',
    azione: language === 'it' ? 'Azione' : 'Action',
    waveProgress: language === 'it' ? 'Progresso Onda' : 'Wave Progress',
    draw: language === 'it' ? 'Disegna' : 'Draw',
    remove: language === 'it' ? 'Rimuovi' : 'Remove',
    refresh: language === 'it' ? 'Aggiorna' : 'Refresh',
    topWaves: language === 'it' ? 'Conteggio Onde Attivo' : 'Active Wave Count',
    fractals: language === 'it' ? 'Frattali' : 'Fractals',
    showFractals: language === 'it' ? 'Mostra Sub-onde' : 'Show Sub-waves',
    hideFractals: language === 'it' ? 'Nascondi Sub-onde' : 'Hide Sub-waves',
    nearLiquidity: language === 'it' ? 'Target Liquidità' : 'Liquidity Target',
    multiTF: language === 'it' ? 'Multi-TF' : 'Multi-TF',
    waveTheory: language === 'it' ? 'Teoria di Elliott' : 'Elliott Theory',
    impulseDesc: language === 'it' ? '5 onde nella direzione del trend' : '5 waves in trend direction',
    correctiveDesc: language === 'it' ? '3 onde contro il trend principale' : '3 waves against main trend',
    wave5Projection: language === 'it' ? 'Proiezione Onda 5' : 'Wave 5 Projection',
    waveCProjection: language === 'it' ? 'Proiezione Onda C' : 'Wave C Projection'
  }), [language]);

  // Wave labels in Italian
  const getWaveLabel = useCallback((type) => {
    const labels = {
      'elliott_wave_1': language === 'it' ? 'Onda 1 - Inizio' : 'Wave 1 - Start',
      'elliott_wave_2': language === 'it' ? 'Onda 2 - Ritracciamento' : 'Wave 2 - Retracement',
      'elliott_wave_3': language === 'it' ? 'Onda 3 - Impulso Forte' : 'Wave 3 - Strong Impulse',
      'elliott_wave_4': language === 'it' ? 'Onda 4 - Correzione' : 'Wave 4 - Correction',
      'elliott_wave_5': language === 'it' ? 'Onda 5 - Finale' : 'Wave 5 - Final',
      'elliott_wave_a': language === 'it' ? 'Onda A - Inizio Correzione' : 'Wave A - Correction Start',
      'elliott_wave_b': language === 'it' ? 'Onda B - Rimbalzo Falso' : 'Wave B - False Bounce',
      'elliott_wave_c': language === 'it' ? 'Onda C - Correzione Finale' : 'Wave C - Final Correction',
      'elliott_impulse': language === 'it' ? 'Impulso Completo (1-5)' : 'Complete Impulse (1-5)',
      'elliott_corrective': language === 'it' ? 'Correzione Completa (A-B-C)' : 'Complete Correction (A-B-C)'
    };
    return labels[type] || type;
  }, [language]);

  // Fetch patterns and ghost projections
  const fetchPatterns = useCallback(async () => {
    try {
      const [patternsRes, ghostRes] = await Promise.all([
        fetch(`${API_URL}/api/sentinel/patterns/elliott?lang=${language}`),
        fetch(`${API_URL}/api/sentinel/ghost-projections/elliott?lang=${language}`)
      ]);
      
      if (patternsRes.ok) {
        const data = await patternsRes.json();
        // Sort by wave number and significance
        const sortedPatterns = (data.patterns || [])
          .filter(p => ELLIOTT_TYPES.includes(p.type))
          .sort((a, b) => {
            const waveOrder = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, 'a': 6, 'b': 7, 'c': 8 };
            const waveA = a.type?.split('_').pop() || '';
            const waveB = b.type?.split('_').pop() || '';
            return (waveOrder[waveA] || 99) - (waveOrder[waveB] || 99);
          });
        setPatterns(sortedPatterns);
      }
      
      if (ghostRes.ok) {
        const ghostData = await ghostRes.json();
        setGhostProjections(ghostData.projections || []);
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

  // Filter patterns for chart overlay
  const chartFilteredPatterns = useMemo(() => 
    anchoredPatterns.filter(p => ELLIOTT_TYPES.includes(p.type)), 
    [anchoredPatterns]
  );

  // Filter displayed patterns
  const displayedPatterns = useMemo(() => {
    let filtered = patterns;
    
    // Filter by category
    if (selectedCategory === 'impulse') {
      filtered = filtered.filter(p => 
        ['elliott_wave_1', 'elliott_wave_2', 'elliott_wave_3', 'elliott_wave_4', 'elliott_wave_5', 'elliott_impulse'].includes(p.type)
      );
    } else if (selectedCategory === 'corrective') {
      filtered = filtered.filter(p => 
        ['elliott_wave_a', 'elliott_wave_b', 'elliott_wave_c', 'elliott_corrective'].includes(p.type)
      );
    }
    
    // Filter by timeframe
    if (selectedTimeframe !== 'all') {
      filtered = filtered.filter(p => p.timeframe === selectedTimeframe);
    }
    
    return filtered;
  }, [patterns, selectedCategory, selectedTimeframe]);

  const timeframes = [
    { value: 'all', label: t.filterAll },
    { value: '4h', label: t.filter4h },
    { value: '1d', label: t.filter1d },
    { value: '1w', label: t.filter1w }
  ];

  const categories = [
    { value: 'all', label: t.filterAll },
    { value: 'impulse', label: t.filterImpulse },
    { value: 'corrective', label: t.filterCorrective }
  ];

  // Horizontal scroll
  const scrollContainer = React.useRef(null);
  const scrollLeft = () => scrollContainer.current?.scrollBy({ left: -320, behavior: 'smooth' });
  const scrollRight = () => scrollContainer.current?.scrollBy({ left: 320, behavior: 'smooth' });

  return (
    <div className="flex flex-col h-full min-h-screen bg-crypto-darker" data-testid="elliott-waves-page">
      {/* ═══════════════════════════════════════════════════════════════════
          HEADER
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-crypto-border/50 bg-crypto-card/30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <Layers className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight flex items-center gap-2">
              {t.title}
              <Badge className="text-[10px] bg-cyan-500/20 text-cyan-400 border-cyan-500/40">
                <GitBranch className="w-3 h-3 mr-1" />
                v4.5
              </Badge>
            </h1>
            <p className="text-xs text-zinc-500">{t.subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Category Filters */}
          <div className="flex items-center gap-1 bg-zinc-900/50 rounded-lg p-1">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md transition-all",
                  selectedCategory === cat.value 
                    ? "bg-cyan-500/30 text-cyan-300 font-medium"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
          
          {/* Timeframe Filters */}
          <div className="flex items-center gap-1 bg-zinc-900/50 rounded-lg p-1">
            {timeframes.map(tf => (
              <button
                key={tf.value}
                onClick={() => setSelectedTimeframe(tf.value)}
                className={cn(
                  "px-2 py-1 text-xs rounded-md transition-all",
                  selectedTimeframe === tf.value 
                    ? "bg-cyan-500/20 text-cyan-400 font-medium"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>
          
          {/* Fractals Toggle */}
          <button
            onClick={() => setShowFractals(!showFractals)}
            className={cn(
              "px-2.5 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5",
              showFractals 
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                : "bg-zinc-800/50 text-zinc-500 border border-zinc-700/50"
            )}
          >
            <Hash className="w-3 h-3" />
            {t.fractals}
          </button>
          
          {/* Stats */}
          <span className="px-2 py-1 text-xs font-mono bg-cyan-500/20 text-cyan-400 rounded">
            {patterns.length} {t.waves}
          </span>
          
          <button onClick={fetchPatterns} className="p-2 hover:bg-white/5 rounded-lg transition-colors" title={t.refresh}>
            <RefreshCw className={cn("w-4 h-4 text-zinc-400", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN CHART with Ghost Wave Projections
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 p-4 pb-2">
        <div className="h-full bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-crypto-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-500 uppercase">{t.chart}</span>
              <span className="text-[10px] text-cyan-400">• {chartFilteredPatterns.length} {t.anchored}</span>
            </div>
            {ghostProjections.length > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-cyan-500/10 rounded-md">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] text-cyan-400 font-medium">
                  {ghostProjections.length} {t.ghostProjections}
                </span>
              </div>
            )}
          </div>
          <div className="p-2 h-[calc(100%-40px)]">
            <TradingChartWithSentinel 
              height={400} 
              filterCategory="elliott_waves"
              filteredAnchoredPatterns={chartFilteredPatterns}
              showFractals={showFractals}
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          BOTTOM COCKPIT - Horizontal Wave Cards
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="px-4 pb-4">
        <div className="bg-crypto-card/40 border border-crypto-border rounded-lg">
          {/* Section Header */}
          <div className="px-4 py-2 border-b border-crypto-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-zinc-300">{t.topWaves}</span>
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
                <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
              </div>
            ) : displayedPatterns.length === 0 ? (
              <div className="flex flex-col items-center justify-center w-full py-8 text-zinc-500">
                <AlertCircle className="w-8 h-8 mb-2" />
                <span className="text-sm">{t.noWaves}</span>
              </div>
            ) : (
              displayedPatterns.map((pattern, idx) => (
                <HorizontalWaveCard 
                  key={`${pattern.type}-${pattern.timeframe}-${idx}`}
                  pattern={pattern}
                  getLabel={getWaveLabel}
                  t={t}
                  language={language}
                  isAnchored={isPatternAnchored(pattern)}
                  onAnchor={() => anchorPattern(pattern)}
                  onRemove={() => removeAnchor(pattern)}
                  isSelected={selectedPattern === idx}
                  onSelect={() => setSelectedPattern(selectedPattern === idx ? null : idx)}
                  ghostProjections={ghostProjections}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ELLIOTT THEORY INFO BOX
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="px-4 pb-4">
        <div className="bg-gradient-to-r from-cyan-500/5 to-purple-500/5 border border-cyan-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-400">{t.waveTheory}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-bullish mt-0.5" />
              <div>
                <span className="font-medium text-bullish">{t.filterImpulse}</span>
                <p className="text-zinc-500 mt-0.5">{t.impulseDesc}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <TrendingDown className="w-4 h-4 text-bearish mt-0.5" />
              <div>
                <span className="font-medium text-bearish">{t.filterCorrective}</span>
                <p className="text-zinc-500 mt-0.5">{t.correctiveDesc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Horizontal Wave Card Component
 */
function HorizontalWaveCard({ pattern, getLabel, t, language, isAnchored, onAnchor, onRemove, isSelected, onSelect, ghostProjections }) {
  const isImpulse = ['elliott_wave_1', 'elliott_wave_2', 'elliott_wave_3', 'elliott_wave_4', 'elliott_wave_5', 'elliott_impulse'].includes(pattern.type);
  const waveNumber = pattern.type?.split('_').pop()?.toUpperCase() || '';
  
  // Check if there's a ghost projection for this wave
  const hasProjection = ghostProjections.some(p => 
    p.forming_pattern?.includes(waveNumber) || 
    p.pattern_type?.includes(waveNumber.toLowerCase())
  );
  
  const hasStrategicAlignment = pattern.multi_tf || pattern.near_liquidity || hasProjection;
  
  return (
    <div 
      className={cn(
        "flex-shrink-0 w-[320px] rounded-lg border transition-all cursor-pointer",
        isAnchored 
          ? "bg-cyan-500/10 border-cyan-500/50" 
          : "bg-zinc-900/50 border-zinc-700/50 hover:border-zinc-600",
        isSelected && "ring-2 ring-cyan-500/50"
      )}
      style={{ scrollSnapAlign: 'start' }}
      onClick={onSelect}
    >
      {/* Card Header */}
      <div className="px-3 py-2 border-b border-zinc-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
            isImpulse ? "bg-bullish/20 text-bullish" : "bg-bearish/20 text-bearish"
          )}>
            {waveNumber}
          </div>
          <span className={cn(
            "text-sm font-semibold",
            isImpulse ? "text-bullish" : "text-bearish"
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
        <div className="px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 to-purple-500/10 border-b border-cyan-500/30">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px] font-bold text-cyan-400 tracking-wider">{t.strategicAlignment}</span>
            {hasProjection && (
              <Badge className="text-[8px] bg-purple-500/20 text-purple-300 px-1">
                <Sparkles className="w-2 h-2 mr-0.5" />
                {waveNumber === '4' || waveNumber === 'B' ? t.wave5Projection : t.waveCProjection}
              </Badge>
            )}
          </div>
        </div>
      )}
      
      {/* Wave Progress */}
      <div className="px-3 py-2 border-b border-zinc-700/30">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-zinc-500">{t.waveProgress}</span>
          <span className="text-xs font-mono text-cyan-400">{pattern.completion || 0}%</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full",
              isImpulse ? "bg-gradient-to-r from-bullish to-cyan-400" : "bg-gradient-to-r from-bearish to-orange-400"
            )}
            style={{ width: `${pattern.completion || 0}%` }}
          />
        </div>
      </div>
      
      {/* Cosa / Perché / Azione Content */}
      <div className="p-3 space-y-2">
        {pattern.psychology ? (
          <>
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <Target className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">{t.cosa}</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{pattern.psychology.cosa_succede}</p>
            </div>
            
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <Brain className="w-3 h-3 text-purple-400" />
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">{t.perche}</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{pattern.psychology.perche}</p>
            </div>
            
            <div className="pt-1 border-t border-zinc-700/30">
              <div className="flex items-center gap-1 mb-0.5">
                <Shield className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">{t.azione}</span>
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

export default ElliottWavesPage;
