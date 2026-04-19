import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createChart, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { useApp } from '../contexts/AppContext';
import { useAnchoredPatterns } from '../contexts/AnchoredPatternsContext';
import { Eye, EyeOff, Layers, Anchor, Trash2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Timeframe colors (Premium Palette)
const TIMEFRAME_COLORS = {
  "15m": "#00F0FF",  // Cyan
  "1h": "#8B5CF6",   // Purple
  "4h": "#00FF9D",   // Neon Green
  "1d": "#FFD700",   // Gold
  "1w": "#FF6B35",   // Orange
  "1M": "#FF1E56",   // Electric Rose
};

// Bias colors
const BIAS_COLORS = {
  BULLISH: "#00FF9D",  // Neon Green
  BEARISH: "#FF1E56",  // Electric Rose
  NEUTRAL: "#00F0FF",  // Cyan
};

const PATTERN_NAMES_IT = {
  head_and_shoulders: "Testa e Spalle",
  inverse_head_and_shoulders: "Testa e Spalle Inverso",
  double_top: "Doppio Massimo",
  double_bottom: "Doppio Minimo",
  symmetrical_triangle: "Triangolo Simmetrico",
  ascending_triangle: "Triangolo Ascendente",
  descending_triangle: "Triangolo Discendente",
  rising_wedge: "Cuneo Ascendente",
  falling_wedge: "Cuneo Discendente",
  bull_flag: "Flag Rialzista",
  bear_flag: "Flag Ribassista",
  support_line: "Supporto",
  resistance_line: "Resistenza",
  trendline_up: "Trendline Rialzista",
  trendline_down: "Trendline Ribassista",
  bullish_engulfing: "Engulfing Rialzista",
  bearish_engulfing: "Engulfing Ribassista",
  hammer: "Hammer",
  shooting_star: "Shooting Star",
  doji: "Doji",
  // Elliott Wave patterns
  elliott_wave_1: "Onda 1 - Inizio Trend",
  elliott_wave_2: "Onda 2 - Correzione",
  elliott_wave_3: "Onda 3 - Impulso Principale",
  elliott_wave_4: "Onda 4 - Consolidamento",
  elliott_wave_5: "Onda 5 - Impulso Finale",
  elliott_wave_a: "Onda A - Inizio Correzione",
  elliott_wave_b: "Onda B - Trappola",
  elliott_wave_c: "Onda C - Correzione Finale",
  elliott_impulse: "Impulso Elliott (1-5)",
  elliott_corrective: "Correzione Elliott (A-B-C)",
  // Fractal sub-waves
  elliott_subwave_1: "Sub-Onda (1)",
  elliott_subwave_2: "Sub-Onda (2)",
  elliott_subwave_3: "Sub-Onda (3)",
  elliott_subwave_4: "Sub-Onda (4)",
  elliott_subwave_5: "Sub-Onda (5)",
  elliott_subwave_a: "Sub-Onda (A)",
  elliott_subwave_b: "Sub-Onda (B)",
  elliott_subwave_c: "Sub-Onda (C)",
  elliott_fractal_complete: "Struttura Frattale Completa",
  elliott_fractal_insight: "Insight Frattale",
};

// Elliott Wave colors
const ELLIOTT_COLORS = {
  impulse: "#9333EA",  // Deep Purple for 1-2-3-4-5
  corrective: "#F59E0B",  // Gold for A-B-C
  subwave: "#C084FC",  // Light purple for sub-waves
  fractal_complete: "#FFD700",  // Gold for complete fractals
};

export function TradingChartWithSentinel({ 
  height = 400, 
  filterCategory = null,  // 'chart_patterns', 'candlestick_patterns', 'elliott_waves', or null for all
  filteredAnchoredPatterns = null,  // Optional pre-filtered patterns from parent
  showFractals = true  // Toggle for fractals in Elliott page
}) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const priceLinesRef = useRef([]);
  const { candles, supportResistance, marketStatus } = useApp();
  
  // Anchored patterns context - use filtered if provided
  const { anchoredPatterns: contextAnchoredPatterns, removeAnchor, clearAllAnchors, anchorCount } = useAnchoredPatterns();
  const anchoredPatterns = filteredAnchoredPatterns || contextAnchoredPatterns;
  
  // Sentinel state
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [subwavesEnabled, setSubwavesEnabled] = useState(showFractals);  // Toggle for sub-waves
  const [overlayData, setOverlayData] = useState(null);
  const [ghostProjections, setGhostProjections] = useState([]);  // Ghost future projections
  const [ghostEnabled, setGhostEnabled] = useState(true);  // Toggle for ghost projections
  const [hoveredElement, setHoveredElement] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [chartDimensions, setChartDimensions] = useState({ width: 800, height: 400 });
  const [priceRange, setPriceRange] = useState({ min: 0, max: 100000 });

  // Fetch overlay data from Sentinel
  useEffect(() => {
    if (!overlayEnabled) return;
    
    const fetchOverlayData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/sentinel/chart-overlay`);
        if (response.ok) {
          const data = await response.json();
          setOverlayData(data);
        }
      } catch (err) {
        console.error('[SENTINEL OVERLAY] Fetch error:', err);
      }
    };
    
    fetchOverlayData();
    const interval = setInterval(fetchOverlayData, 30000);
    return () => clearInterval(interval);
  }, [overlayEnabled]);

  // Fetch Ghost Projections (Future Pattern Predictions)
  useEffect(() => {
    if (!ghostEnabled) return;
    
    const fetchGhostProjections = async () => {
      try {
        const response = await fetch(`${API_URL}/api/sentinel/ghost-projections?timeframe=4h&lang=it`);
        if (response.ok) {
          const data = await response.json();
          setGhostProjections(data.projections || []);
        }
      } catch (err) {
        console.error('[GHOST PROJECTIONS] Fetch error:', err);
      }
    };
    
    fetchGhostProjections();
    const interval = setInterval(fetchGhostProjections, 60000);  // Update every minute
    return () => clearInterval(interval);
  }, [ghostEnabled]);

  // Calculate price range from candles
  useEffect(() => {
    if (!candles?.length) return;
    
    const prices = candles.flatMap(c => [c.high, c.low]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1;
    
    setPriceRange({
      min: min - padding,
      max: max + padding
    });
  }, [candles]);

  // Update chart dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (chartContainerRef.current) {
        setChartDimensions({
          width: chartContainerRef.current.clientWidth,
          height: height
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [height]);

  // Convert price to Y coordinate
  const priceToY = useCallback((price) => {
    const { min, max } = priceRange;
    if (max === min) return chartDimensions.height / 2;
    
    // Chart has margins (10% top, 20% bottom for volume)
    const chartTop = chartDimensions.height * 0.1;
    const chartBottom = chartDimensions.height * 0.8;
    const chartHeight = chartBottom - chartTop;
    
    const percent = (price - min) / (max - min);
    return chartBottom - (percent * chartHeight);
  }, [priceRange, chartDimensions]);

  // Handle hover on SVG elements
  const handleElementHover = (element, event) => {
    if (!element) {
      setHoveredElement(null);
      return;
    }
    
    setHoveredElement(element);
    setTooltipPosition({
      x: event.nativeEvent.offsetX,
      y: event.nativeEvent.offsetY
    });
  };

  const initChart = useCallback(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: 'solid', color: '#09090b' },
        textColor: '#a1a1aa',
        fontFamily: 'JetBrains Mono, monospace',
      },
      grid: {
        vertLines: { color: 'rgba(39, 39, 42, 0.5)' },
        horzLines: { color: 'rgba(39, 39, 42, 0.5)' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#3f3f46',
          width: 1,
          style: 2,
          labelBackgroundColor: '#18181b',
        },
        horzLine: {
          color: '#3f3f46',
          width: 1,
          style: 2,
          labelBackgroundColor: '#18181b',
        },
      },
      rightPriceScale: {
        borderColor: '#27272a',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: '#27272a',
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time) => {
          const date = new Date(time * 1000);
          const month = date.toLocaleDateString('en-US', { month: 'short' });
          const day = date.getDate();
          return `${month} ${day}`;
        },
      },
      localization: {
        locale: 'en-US',
        dateFormat: 'yyyy-MM-dd',
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00dc82',
      downColor: '#ff3b30',
      borderUpColor: '#00dc82',
      borderDownColor: '#ff3b30',
      wickUpColor: '#00dc82',
      wickDownColor: '#ff3b30',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#3b82f6',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.85,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    priceLinesRef.current = [];

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
        setChartDimensions({
          width: chartContainerRef.current.clientWidth,
          height: height
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [height]);

  useEffect(() => {
    const cleanup = initChart();
    return () => {
      cleanup?.();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [initChart]);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !candles?.length) return;

    const candleData = candles.map(c => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumeData = candles.map(c => ({
      time: c.time,
      value: c.volume || 0,
      color: c.close >= c.open ? 'rgba(0, 220, 130, 0.3)' : 'rgba(255, 59, 48, 0.3)',
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candles]);

  useEffect(() => {
    if (!candleSeriesRef.current || !supportResistance?.levels?.length) return;

    priceLinesRef.current.forEach(line => {
      try {
        candleSeriesRef.current.removePriceLine(line);
      } catch (e) {}
    });
    priceLinesRef.current = [];

    supportResistance.levels.slice(0, 6).forEach(level => {
      const isSupport = level.level_type === 'support';
      try {
        const priceLine = candleSeriesRef.current.createPriceLine({
          price: level.price,
          color: isSupport ? '#00dc82' : '#ff3b30',
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: isSupport ? 'S' : 'R',
        });
        priceLinesRef.current.push(priceLine);
      } catch (e) {}
    });
  }, [supportResistance]);

  // Render SVG Overlay
  // Render ONLY anchored patterns (On-Demand Drawing)
  const renderAnchoredPatterns = () => {
    if (!overlayEnabled || anchoredPatterns.length === 0) return null;
    
    const { width, height: h } = chartDimensions;
    
    return (
      <svg 
        className="absolute inset-0 pointer-events-none z-10"
        style={{ width: '100%', height: '100%' }}
        viewBox={`0 0 ${width} ${h}`}
        preserveAspectRatio="none"
      >
        <defs>
          {/* Glow filters for anchored patterns */}
          {Object.entries(TIMEFRAME_COLORS).map(([tf, color]) => (
            <filter key={tf} id={`anchor-glow-${tf}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values={`0 0 0 0 ${parseInt(color.slice(1,3), 16)/255}
                         0 0 0 0 ${parseInt(color.slice(3,5), 16)/255}
                         0 0 0 0 ${parseInt(color.slice(5,7), 16)/255}
                         0 0 0 0.8 0`}
              />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
          
          {/* Cyan glow for anchored indicator */}
          <filter id="anchor-indicator-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 0.94
                      0 0 0 0 1
                      0 0 0 0.6 0"
            />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Render each anchored pattern */}
        {anchoredPatterns.map((pattern, i) => {
          const drawData = pattern.draw_data || {};
          const shape = drawData.shape;
          const color = pattern.color || TIMEFRAME_COLORS[pattern.timeframe] || "#8B5CF6";
          const tf = pattern.timeframe;
          
          // Get price coordinates
          const startPrice = drawData.start?.price || pattern.start?.price;
          const endPrice = drawData.end?.price || pattern.end?.price || drawData.price;
          
          if (!startPrice && !endPrice && !drawData.price) {
            return null;
          }
          
          // Calculate Y positions
          const startY = startPrice ? priceToY(startPrice) : priceToY(drawData.price);
          const endY = endPrice ? priceToY(endPrice) : startY;
          
          // Calculate X positions (simplified)
          const totalCandles = 100;
          const startIndex = drawData.start?.index || 20;
          const endIndex = drawData.end?.index || 80;
          const startX = Math.max(50, (startIndex / totalCandles) * (width - 100));
          const endX = Math.min(width - 70, (endIndex / totalCandles) * (width - 100));
          
          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2;
          
          return (
            <g 
              key={`anchored-${pattern.anchorId || i}`} 
              className="anchored-pattern pointer-events-auto"
            >
              {/* HORIZONTAL LINE patterns (S/R) */}
              {(shape === "horizontal_line" || pattern.type?.includes("support") || pattern.type?.includes("resistance")) && (
                <>
                  <line
                    x1={0}
                    y1={startY}
                    x2={width - 70}
                    y2={startY}
                    stroke={color}
                    strokeWidth="2.5"
                    strokeDasharray={pattern.type?.includes('support') ? "none" : "8 4"}
                    opacity="0.9"
                    filter={`url(#anchor-glow-${tf})`}
                  />
                  {/* Label */}
                  <rect
                    x={8}
                    y={startY - 12}
                    width={60}
                    height={24}
                    rx="4"
                    fill="#18181b"
                    stroke={color}
                    strokeWidth="1.5"
                  />
                  <text
                    x={38}
                    y={startY + 3}
                    textAnchor="middle"
                    fill={color}
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {tf?.toUpperCase()} {pattern.type?.includes('support') ? 'S' : 'R'}
                  </text>
                  {/* Price label */}
                  <rect
                    x={width - 75}
                    y={startY - 10}
                    width={65}
                    height={20}
                    rx="3"
                    fill="#18181b"
                    stroke={color}
                    strokeWidth="1"
                  />
                  <text
                    x={width - 42}
                    y={startY + 4}
                    textAnchor="middle"
                    fill={color}
                    fontSize="9"
                  >
                    ${drawData.price?.toLocaleString() || startPrice?.toLocaleString()}
                  </text>
                </>
              )}
              
              {/* DIAGONAL LINE patterns (Trendlines) */}
              {(shape === "diagonal_line" || pattern.type?.includes("trendline")) && (
                <>
                  <line
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke={color}
                    strokeWidth="2.5"
                    opacity="0.9"
                    filter={`url(#anchor-glow-${tf})`}
                  />
                  {/* Start/End markers */}
                  <circle cx={startX} cy={startY} r="5" fill={color} />
                  <circle cx={endX} cy={endY} r="5" fill={color} />
                  {/* Label */}
                  <rect
                    x={midX - 30}
                    y={midY - 12}
                    width={60}
                    height={24}
                    rx="4"
                    fill="#18181b"
                    stroke={color}
                    strokeWidth="1.5"
                  />
                  <text
                    x={midX}
                    y={midY + 3}
                    textAnchor="middle"
                    fill={color}
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {tf?.toUpperCase()} TL
                  </text>
                </>
              )}
              
              {/* ELLIOTT WAVE patterns */}
              {(shape === "elliott_wave" || pattern.type?.includes("elliott_wave")) && (
                <>
                  <line
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke={ELLIOTT_COLORS.impulse}
                    strokeWidth="3"
                    opacity="0.9"
                  />
                  {/* Glow */}
                  <line
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke={ELLIOTT_COLORS.impulse}
                    strokeWidth="6"
                    opacity="0.2"
                  />
                  {/* Wave number label */}
                  <g transform={`translate(${midX}, ${midY})`}>
                    <circle
                      r="16"
                      fill="#18181b"
                      stroke={ELLIOTT_COLORS.impulse}
                      strokeWidth="2"
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={ELLIOTT_COLORS.impulse}
                      fontSize="14"
                      fontWeight="bold"
                    >
                      {drawData.label || pattern.label}
                    </text>
                  </g>
                  {/* Start/End markers */}
                  <circle cx={startX} cy={startY} r="5" fill={ELLIOTT_COLORS.impulse} />
                  <circle cx={endX} cy={endY} r="5" fill={ELLIOTT_COLORS.impulse} />
                </>
              )}
              
              {/* TRIANGLE/WEDGE patterns */}
              {(shape === "converging_lines" || pattern.type?.includes("triangle") || pattern.type?.includes("wedge")) && (
                <>
                  {/* Upper line */}
                  <line
                    x1={startX}
                    y1={priceToY(drawData.resistance || startPrice * 1.02)}
                    x2={endX}
                    y2={priceToY(drawData.resistance || endPrice * 1.01)}
                    stroke={color}
                    strokeWidth="2.5"
                    opacity="0.9"
                  />
                  {/* Lower line */}
                  <line
                    x1={startX}
                    y1={priceToY(drawData.support || startPrice * 0.98)}
                    x2={endX}
                    y2={priceToY(drawData.support || endPrice * 0.99)}
                    stroke={color}
                    strokeWidth="2.5"
                    opacity="0.9"
                  />
                  {/* Pattern name */}
                  <rect
                    x={midX - 55}
                    y={midY - 12}
                    width={110}
                    height={24}
                    rx="4"
                    fill="#18181b"
                    stroke={color}
                    strokeWidth="1.5"
                  />
                  <text
                    x={midX}
                    y={midY + 3}
                    textAnchor="middle"
                    fill={color}
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {PATTERN_NAMES_IT[pattern.type] || pattern.type_display || pattern.type}
                  </text>
                </>
              )}
              
              {/* Remove button for each anchored pattern */}
              <g 
                className="anchored-remove cursor-pointer pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAnchor(pattern.anchorId);
                  toast.info('Pattern rimosso dal chart', { duration: 2000 });
                }}
                transform={`translate(${endX + 15}, ${endY - 15})`}
              >
                <circle
                  r="10"
                  fill="#18181b"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  className="hover:fill-red-500/20"
                />
                <line x1="-4" y1="-4" x2="4" y2="4" stroke="#ef4444" strokeWidth="2" />
                <line x1="4" y1="-4" x2="-4" y2="4" stroke="#ef4444" strokeWidth="2" />
              </g>
              
              {/* Anchor indicator */}
              <g transform={`translate(${startX - 15}, ${startY})`}>
                <circle
                  r="8"
                  fill="#00F0FF"
                  fillOpacity="0.2"
                  stroke="#00F0FF"
                  strokeWidth="1.5"
                  filter="url(#anchor-indicator-glow)"
                />
                <path
                  d="M0,-4 L0,4 M-3,1 L0,4 L3,1"
                  stroke="#00F0FF"
                  strokeWidth="1.5"
                  fill="none"
                />
              </g>
            </g>
          );
        })}
        
        {/* Info overlay when no patterns anchored */}
        {anchoredPatterns.length === 0 && (
          <g>
            <rect
              x={width/2 - 120}
              y={h/2 - 25}
              width={240}
              height={50}
              rx="8"
              fill="#18181b"
              fillOpacity="0.9"
              stroke="#3f3f46"
              strokeWidth="1"
            />
            <text
              x={width/2}
              y={h/2 - 5}
              textAnchor="middle"
              fill="#a1a1aa"
              fontSize="11"
            >
              Nessun pattern ancorato
            </text>
            <text
              x={width/2}
              y={h/2 + 12}
              textAnchor="middle"
              fill="#71717a"
              fontSize="9"
            >
              Clicca ✏️ su un pattern per disegnarlo qui
            </text>
          </g>
        )}
      </svg>
    );
  };
  
  // Original auto-draw disabled - Draft Mode uses renderAnchoredPatterns instead
  const renderSentinelOverlay = () => null;

  // Render Ghost Projections (Future Pattern Predictions - Dashed Lines)
  const renderGhostProjections = () => {
    if (!ghostEnabled || !ghostProjections.length) return null;
    
    const { width, height: h } = chartDimensions;
    
    return (
      <svg 
        className="absolute inset-0 pointer-events-none z-5"
        style={{ width: '100%', height: '100%' }}
        viewBox={`0 0 ${width} ${h}`}
        preserveAspectRatio="none"
      >
        <defs>
          {/* Glow filter for ghost projections */}
          <filter id="ghost-glow-bullish" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 0
                      0 0 0 0 1
                      0 0 0 0 0.6
                      0 0 0 0.5 0"
            />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="ghost-glow-bearish" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 1
                      0 0 0 0 0.1
                      0 0 0 0 0.3
                      0 0 0 0.5 0"
            />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Animated pulse for ghost lines */}
          <style>
            {`
              @keyframes ghostPulse {
                0%, 100% { opacity: 0.4; }
                50% { opacity: 0.7; }
              }
              .ghost-line {
                animation: ghostPulse 2s ease-in-out infinite;
              }
            `}
          </style>
        </defs>
        
        {ghostProjections.map((proj, i) => {
          const startPrice = proj.start?.price || 0;
          const targetPrice = proj.target?.price || 0;
          const direction = proj.direction || "BULLISH";
          const method = proj.method || "unknown";
          const confidence = proj.confidence || 50;
          const strategic = proj.strategic_alignment || false;
          
          if (!startPrice || !targetPrice) return null;
          
          // Calculate Y positions
          const startY = priceToY(startPrice);
          const targetY = priceToY(targetPrice);
          
          // X positions - project into the future (right side of chart)
          const startX = width - 200;  // Start from near right edge
          const targetX = width - 80;  // End near price axis
          
          const color = direction === "BULLISH" ? "#00FF9D" : "#FF1E56";
          const filter = direction === "BULLISH" ? "url(#ghost-glow-bullish)" : "url(#ghost-glow-bearish)";
          
          const midX = (startX + targetX) / 2;
          const midY = (startY + targetY) / 2;
          
          return (
            <g key={`ghost-${proj.projection_id || i}`} className="ghost-projection">
              {/* Main projection line - dashed */}
              <line
                x1={startX}
                y1={startY}
                x2={targetX}
                y2={targetY}
                stroke={color}
                strokeWidth="2"
                strokeDasharray="8 4"
                opacity="0.6"
                filter={filter}
                className="ghost-line"
              />
              
              {/* Target zone indicator */}
              <circle
                cx={targetX}
                cy={targetY}
                r="8"
                fill={color}
                fillOpacity="0.3"
                stroke={color}
                strokeWidth="1.5"
                strokeDasharray="4 2"
                className="ghost-line"
              />
              
              {/* Arrow head */}
              <path
                d={direction === "BULLISH" 
                  ? `M${targetX-8},${targetY+5} L${targetX},${targetY} L${targetX-8},${targetY-5}`
                  : `M${targetX-8},${targetY-5} L${targetX},${targetY} L${targetX-8},${targetY+5}`
                }
                fill="none"
                stroke={color}
                strokeWidth="2"
                opacity="0.7"
              />
              
              {/* Label box */}
              <rect
                x={midX - 50}
                y={midY - 25}
                width={100}
                height={50}
                rx="6"
                fill="#18181b"
                fillOpacity="0.9"
                stroke={color}
                strokeWidth="1"
                strokeDasharray="4 2"
              />
              
              {/* Method label */}
              <text
                x={midX}
                y={midY - 10}
                textAnchor="middle"
                fill={color}
                fontSize="9"
                fontWeight="bold"
              >
                {method === "measured_move" ? "MEASURED MOVE" : 
                 method === "wave_projection" ? "WAVE TARGET" :
                 method === "liquidity_target" ? "LIQ TARGET" : method.toUpperCase()}
              </text>
              
              {/* Target price */}
              <text
                x={midX}
                y={midY + 5}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="11"
                fontWeight="bold"
              >
                ${targetPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}
              </text>
              
              {/* Confidence */}
              <text
                x={midX}
                y={midY + 18}
                textAnchor="middle"
                fill="#a1a1aa"
                fontSize="8"
              >
                {confidence}% conf.
              </text>
              
              {/* Strategic Alignment Badge */}
              {strategic && (
                <g transform={`translate(${midX + 45}, ${midY - 20})`}>
                  <circle
                    r="8"
                    fill="#FFD700"
                    fillOpacity="0.3"
                    stroke="#FFD700"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#FFD700"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    ⚡
                  </text>
                </g>
              )}
            </g>
          );
        })}
        
        {/* Ghost projections header */}
        {ghostProjections.length > 0 && (
          <g>
            <rect
              x={width - 210}
              y={10}
              width={130}
              height={26}
              rx="4"
              fill="#18181b"
              fillOpacity="0.8"
              stroke="#8B5CF6"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
            <text
              x={width - 145}
              y={27}
              textAnchor="middle"
              fill="#8B5CF6"
              fontSize="10"
              fontWeight="bold"
            >
              👻 GHOST PROJECTIONS
            </text>
          </g>
        )}
      </svg>
    );
  };

  // Render tooltip
  const renderTooltip = () => {
    if (!hoveredElement) return null;
    
    const patternName = PATTERN_NAMES_IT[hoveredElement.type] || hoveredElement.type?.replace(/_/g, ' ');
    
    return (
      <div 
        className="absolute z-50 bg-zinc-900/95 border border-zinc-700 rounded-lg p-3 shadow-xl pointer-events-none backdrop-blur-sm"
        style={{
          left: Math.min(tooltipPosition.x + 10, chartDimensions.width - 180),
          top: Math.min(tooltipPosition.y - 60, chartDimensions.height - 100),
          maxWidth: '200px'
        }}
      >
        <div className="text-sm font-bold text-white mb-1">
          {patternName}
        </div>
        {hoveredElement.timeframe && (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: TIMEFRAME_COLORS[hoveredElement.timeframe] }}
            />
            <span>Timeframe: {hoveredElement.timeframe.toUpperCase()}</span>
          </div>
        )}
        {hoveredElement.timeframes && (
          <div className="flex flex-wrap gap-1 mt-1">
            {hoveredElement.timeframes.map((tf, i) => (
              <span 
                key={i}
                className="text-[9px] px-1.5 py-0.5 rounded"
                style={{ 
                  backgroundColor: `${TIMEFRAME_COLORS[tf]}20`,
                  color: TIMEFRAME_COLORS[tf]
                }}
              >
                {tf.toUpperCase()}
              </span>
            ))}
          </div>
        )}
        {hoveredElement.price && (
          <div className="text-xs text-zinc-400 mt-1">
            Prezzo: ${hoveredElement.price?.toLocaleString()}
          </div>
        )}
        {hoveredElement.bias && (
          <div 
            className="text-xs font-medium mt-1"
            style={{ color: BIAS_COLORS[hoveredElement.bias] }}
          >
            Bias: {hoveredElement.bias}
          </div>
        )}
        {hoveredElement.type === 'confluence' && (
          <div className="text-xs text-amber-400 mt-1 font-medium">
            High Probability Zone
          </div>
        )}
        {/* Elliott Wave specific info */}
        {hoveredElement.label && ['1','2','3','4','5','A','B','C','1-5','A-B-C'].includes(hoveredElement.label) && (
          <div className="mt-2 pt-2 border-t border-zinc-700/50">
            <div className="text-[10px] text-purple-400 font-bold uppercase">
              Elliott Wave {hoveredElement.label}
            </div>
            {hoveredElement.start_price && (
              <div className="text-[10px] text-zinc-500">
                Start: ${hoveredElement.start_price?.toLocaleString()}
              </div>
            )}
            {hoveredElement.end_price && (
              <div className="text-[10px] text-zinc-500">
                End: ${hoveredElement.end_price?.toLocaleString()}
              </div>
            )}
            {hoveredElement.is_extended && (
              <div className="text-[10px] text-green-400 font-medium">
                Onda Estesa (161.8%+)
              </div>
            )}
            {hoveredElement.is_truncated && (
              <div className="text-[10px] text-red-400 font-medium">
                Onda Troncata
              </div>
            )}
          </div>
        )}
        {/* Sub-wave / Fractal specific info */}
        {hoveredElement.is_subwave && (
          <div className="mt-2 pt-2 border-t border-amber-500/30">
            <div className="text-[10px] text-amber-400 font-bold uppercase">
              Sub-Onda Frattale {hoveredElement.label}
            </div>
            {hoveredElement.parent_wave && (
              <div className="text-[10px] text-zinc-500 mt-1">
                Dentro Onda {hoveredElement.parent_wave.label} ({hoveredElement.parent_timeframe?.toUpperCase()})
              </div>
            )}
            <div className="text-[10px] text-zinc-400 mt-1">
              TF: {hoveredElement.timeframe?.toUpperCase()}
            </div>
          </div>
        )}
        {/* Fractal Complete insight */}
        {hoveredElement.is_fractal_complete && (
          <div className="mt-2 pt-2 border-t border-amber-500/50">
            <div className="text-[10px] text-amber-400 font-bold uppercase mb-1">
              🔮 Fractal Insight
            </div>
            <div className="text-[10px] text-amber-300/80 leading-relaxed">
              {hoveredElement.parent_wave && (
                <>Onda {hoveredElement.parent_wave.label} ({hoveredElement.parent_timeframe?.toUpperCase()}) </>
              )}
              completata su {hoveredElement.child_timeframe?.toUpperCase()}
            </div>
            {hoveredElement.mentor_insight && (
              <div className="text-[9px] text-zinc-400 mt-1 italic">
                {hoveredElement.mentor_insight.substring(0, 100)}...
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Chart Header with Toggle */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
        <button
          onClick={() => setOverlayEnabled(!overlayEnabled)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
            overlayEnabled 
              ? "bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-lg shadow-purple-500/10"
              : "bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 hover:border-zinc-600"
          )}
          data-testid="sentinel-overlay-toggle"
        >
          {overlayEnabled ? (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Ancoraggi ON</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Ancoraggi OFF</span>
            </>
          )}
        </button>
        
        {/* Anchored patterns count & clear button */}
        {overlayEnabled && anchorCount > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-cyan-500/20 rounded-lg border border-cyan-500/40">
              <Anchor className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] text-cyan-400 font-bold">
                {anchorCount}
              </span>
            </div>
            <button
              onClick={() => {
                clearAllAnchors();
                toast.info('Tutti i pattern rimossi', { duration: 2000 });
              }}
              className="p-1.5 rounded-lg bg-zinc-800/80 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition-colors border border-zinc-700/50"
              title="Rimuovi tutti gli ancoraggi"
              data-testid="clear-all-anchors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        
        {/* Ghost Projections Toggle */}
        <button
          onClick={() => setGhostEnabled(!ghostEnabled)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
            ghostEnabled 
              ? "bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/40"
              : "bg-zinc-800/80 text-zinc-500 border border-zinc-700/50"
          )}
          data-testid="ghost-projections-toggle"
          title="Proiezioni Future"
        >
          <span className="text-sm">👻</span>
          <span>{ghostEnabled ? "Proiezioni ON" : "Proiezioni OFF"}</span>
        </button>
        
        {/* Empty state hint */}
        {overlayEnabled && anchorCount === 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-zinc-800/60 rounded-lg border border-zinc-700/30">
            <span className="text-[10px] text-zinc-500">
              Usa ✏️ per ancorare
            </span>
          </div>
        )}
      </div>
      
      {/* Chart Container */}
      <div 
        ref={chartContainerRef} 
        className="w-full tv-chart-container relative"
        style={{ height: `${height}px` }}
        data-testid="trading-chart-with-sentinel"
      >
        {/* Ghost Projections - Future Pattern Predictions (dashed lines) */}
        {renderGhostProjections()}
        
        {/* SVG Overlay - Now uses Anchored Patterns (On-Demand) */}
        {renderAnchoredPatterns()}
        
        {/* Tooltip */}
        {renderTooltip()}
      </div>
      
      {/* Legend */}
      {overlayEnabled && (
        <div className="absolute bottom-2 left-2 z-20 flex items-center gap-4 bg-zinc-900/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-zinc-700/50">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 uppercase font-medium">TF:</span>
            {Object.entries(TIMEFRAME_COLORS).map(([tf, color]) => (
              <div key={tf} className="flex items-center gap-1">
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[9px] text-zinc-400">{tf}</span>
              </div>
            ))}
          </div>
          <div className="w-px h-4 bg-zinc-700" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 uppercase font-medium">Elliott:</span>
            <div className="flex items-center gap-1">
              <span 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: ELLIOTT_COLORS.impulse }}
              />
              <span className="text-[9px] text-purple-400">1-5</span>
            </div>
            <div className="flex items-center gap-1">
              <span 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: ELLIOTT_COLORS.corrective }}
              />
              <span className="text-[9px] text-amber-400">A-B-C</span>
            </div>
            {subwavesEnabled && (
              <div className="flex items-center gap-1">
                <span 
                  className="w-2 h-2 rounded-full border border-dashed"
                  style={{ backgroundColor: ELLIOTT_COLORS.subwave, borderColor: ELLIOTT_COLORS.subwave }}
                />
                <span className="text-[9px] text-purple-300">Sub</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TradingChartWithSentinel;
