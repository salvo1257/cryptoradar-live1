import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createChart, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { useApp } from '../contexts/AppContext';
import { Eye, EyeOff, Layers } from 'lucide-react';
import { cn } from '../lib/utils';

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
};

// Elliott Wave colors
const ELLIOTT_COLORS = {
  impulse: "#9333EA",  // Deep Purple for 1-2-3-4-5
  corrective: "#F59E0B",  // Gold for A-B-C
};

export function TradingChartWithSentinel({ height = 400 }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const priceLinesRef = useRef([]);
  const { candles, supportResistance, marketStatus } = useApp();
  
  // Sentinel state
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [overlayData, setOverlayData] = useState(null);
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
  const renderSentinelOverlay = () => {
    if (!overlayEnabled || !overlayData?.chart_data) return null;
    
    const { chart_data, current_price } = overlayData;
    const { width, height: h } = chartDimensions;
    
    // Group zones by price for confluence detection
    const priceZones = {};
    chart_data.zones?.forEach(zone => {
      const price = zone.price;
      if (!priceZones[price]) {
        priceZones[price] = [];
      }
      priceZones[price].push(zone);
    });
    
    // Find high probability zones (3+ timeframes)
    const confluenceZones = Object.entries(priceZones)
      .filter(([_, zones]) => zones.length >= 3)
      .map(([price, zones]) => ({
        price: parseFloat(price),
        zones,
        timeframes: zones.map(z => z.timeframe)
      }));

    return (
      <svg 
        className="absolute inset-0 pointer-events-none z-10"
        style={{ width: '100%', height: '100%' }}
        viewBox={`0 0 ${width} ${h}`}
        preserveAspectRatio="none"
      >
        <defs>
          {/* Glow filters for each timeframe */}
          {Object.entries(TIMEFRAME_COLORS).map(([tf, color]) => (
            <filter key={tf} id={`glow-${tf}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values={`0 0 0 0 ${parseInt(color.slice(1,3), 16)/255}
                         0 0 0 0 ${parseInt(color.slice(3,5), 16)/255}
                         0 0 0 0 ${parseInt(color.slice(5,7), 16)/255}
                         0 0 0 0.6 0`}
              />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
          
          {/* Confluence glow box */}
          <filter id="confluence-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 1
                      0 0 0 0 0.84
                      0 0 0 0 0
                      0 0 0 0.8 0"
            />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Gradient for zones */}
          <linearGradient id="zone-gradient-bull" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00FF9D" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#00FF9D" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#00FF9D" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="zone-gradient-bear" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF1E56" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#FF1E56" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#FF1E56" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        
        {/* CONFLUENCE GLOW BOXES - High Probability Zones */}
        {confluenceZones.map((conf, i) => {
          const y = priceToY(conf.price);
          const zoneHeight = 20;
          
          return (
            <g 
              key={`confluence-${i}`} 
              className="sentinel-confluence pointer-events-auto cursor-pointer"
              onMouseEnter={(e) => handleElementHover({
                type: 'confluence',
                price: conf.price,
                timeframes: conf.timeframes,
                count: conf.zones.length
              }, e)}
              onMouseLeave={() => handleElementHover(null)}
            >
              {/* Glow box background */}
              <rect
                x={0}
                y={y - zoneHeight/2}
                width={width}
                height={zoneHeight}
                fill="#FFD700"
                fillOpacity="0.15"
                filter="url(#confluence-glow)"
              />
              {/* Border lines */}
              <line
                x1={0} y1={y - zoneHeight/2}
                x2={width} y2={y - zoneHeight/2}
                stroke="#FFD700"
                strokeWidth="1"
                strokeDasharray="4 2"
                opacity="0.6"
              />
              <line
                x1={0} y1={y + zoneHeight/2}
                x2={width} y2={y + zoneHeight/2}
                stroke="#FFD700"
                strokeWidth="1"
                strokeDasharray="4 2"
                opacity="0.6"
              />
              {/* Label */}
              <rect
                x={width - 140}
                y={y - 10}
                width={130}
                height={20}
                rx="4"
                fill="#18181b"
                stroke="#FFD700"
                strokeWidth="1"
              />
              <text
                x={width - 75}
                y={y + 4}
                textAnchor="middle"
                fill="#FFD700"
                fontSize="10"
                fontWeight="bold"
              >
                CONFLUENZA {conf.zones.length}TF
              </text>
            </g>
          );
        })}
        
        {/* HORIZONTAL ZONES - Support/Resistance */}
        {chart_data.zones?.map((zone, i) => {
          const y = priceToY(zone.price);
          const color = zone.color || BIAS_COLORS[zone.bias] || TIMEFRAME_COLORS[zone.timeframe];
          const isSupport = zone.type?.includes('support');
          
          return (
            <g 
              key={`zone-${i}`} 
              className="sentinel-zone pointer-events-auto cursor-pointer"
              onMouseEnter={(e) => handleElementHover({
                type: zone.type,
                timeframe: zone.timeframe,
                price: zone.price,
                bias: zone.bias
              }, e)}
              onMouseLeave={() => handleElementHover(null)}
            >
              {/* Main line with glow */}
              <line
                x1={0}
                y1={y}
                x2={width - 70}
                y2={y}
                stroke={color}
                strokeWidth="2"
                strokeDasharray={isSupport ? "none" : "8 4"}
                opacity="0.7"
                filter={`url(#glow-${zone.timeframe})`}
              />
              
              {/* Timeframe badge */}
              <rect
                x={8}
                y={y - 9}
                width={36}
                height={18}
                rx="3"
                fill="#18181b"
                stroke={color}
                strokeWidth="1"
              />
              <text
                x={26}
                y={y + 3}
                textAnchor="middle"
                fill={color}
                fontSize="9"
                fontWeight="bold"
              >
                {zone.timeframe?.toUpperCase()}
              </text>
              
              {/* Type indicator */}
              <circle
                cx={52}
                cy={y}
                r={4}
                fill={isSupport ? "#00FF9D" : "#FF1E56"}
              />
            </g>
          );
        })}
        
        {/* TRENDLINES - Diagonal lines */}
        {chart_data.trendlines?.map((line, i) => {
          if (!line.start || !line.end) return null;
          
          const color = line.color || BIAS_COLORS[line.bias] || TIMEFRAME_COLORS[line.timeframe];
          
          // Calculate line positions (using percentage of chart width for X)
          const startX = width * 0.2;
          const endX = width * 0.85;
          const startY = priceToY(line.start.price);
          const endY = priceToY(line.end.price);
          
          // Extend line beyond endpoints
          const slope = (endY - startY) / (endX - startX);
          const extendedStartX = 0;
          const extendedStartY = startY - slope * startX;
          const extendedEndX = width - 70;
          const extendedEndY = endY + slope * (extendedEndX - endX);
          
          return (
            <g 
              key={`trendline-${i}`} 
              className="sentinel-trendline pointer-events-auto cursor-pointer"
              onMouseEnter={(e) => handleElementHover({
                type: line.type,
                timeframe: line.timeframe,
                bias: line.bias,
                start: line.start,
                end: line.end
              }, e)}
              onMouseLeave={() => handleElementHover(null)}
            >
              {/* Main trendline with glow */}
              <line
                x1={extendedStartX}
                y1={extendedStartY}
                x2={extendedEndX}
                y2={extendedEndY}
                stroke={color}
                strokeWidth="2"
                opacity="0.6"
                filter={`url(#glow-${line.timeframe})`}
              />
              
              {/* Start point */}
              <circle
                cx={startX}
                cy={startY}
                r={5}
                fill={color}
                opacity="0.8"
              />
              
              {/* End point */}
              <circle
                cx={endX}
                cy={endY}
                r={5}
                fill={color}
                opacity="0.8"
              />
              
              {/* Label at midpoint */}
              <rect
                x={(startX + endX) / 2 - 25}
                y={(startY + endY) / 2 - 10}
                width={50}
                height={20}
                rx="3"
                fill="#18181b"
                stroke={color}
                strokeWidth="1"
                opacity="0.9"
              />
              <text
                x={(startX + endX) / 2}
                y={(startY + endY) / 2 + 3}
                textAnchor="middle"
                fill={color}
                fontSize="8"
                fontWeight="bold"
              >
                {line.timeframe?.toUpperCase()}
              </text>
            </g>
          );
        })}
        
        {/* PATTERN SHAPES - Triangles, Wedges */}
        {chart_data.patterns?.map((pattern, i) => {
          const color = pattern.color || BIAS_COLORS[pattern.bias] || TIMEFRAME_COLORS[pattern.timeframe];
          
          if (pattern.upper_line && pattern.lower_line) {
            // Converging lines (triangles, wedges)
            const startX = width * 0.25;
            const endX = width * 0.75;
            
            const upperStartY = priceToY(pattern.resistance || overlayData.current_price * 1.02);
            const upperEndY = priceToY(pattern.resistance || overlayData.current_price * 1.01);
            const lowerStartY = priceToY(pattern.support || overlayData.current_price * 0.98);
            const lowerEndY = priceToY(pattern.support || overlayData.current_price * 0.99);
            
            return (
              <g 
                key={`pattern-${i}`} 
                className="sentinel-pattern pointer-events-auto cursor-pointer"
                onMouseEnter={(e) => handleElementHover({
                  type: pattern.type,
                  timeframe: pattern.timeframe,
                  bias: pattern.bias
                }, e)}
                onMouseLeave={() => handleElementHover(null)}
              >
                {/* Fill area */}
                <polygon
                  points={`${startX},${upperStartY} ${endX},${upperEndY} ${endX},${lowerEndY} ${startX},${lowerStartY}`}
                  fill={pattern.bias === "BULLISH" ? "url(#zone-gradient-bull)" : "url(#zone-gradient-bear)"}
                  opacity="0.3"
                />
                
                {/* Upper line */}
                <line
                  x1={startX}
                  y1={upperStartY}
                  x2={endX}
                  y2={upperEndY}
                  stroke={color}
                  strokeWidth="2"
                  opacity="0.7"
                  filter={`url(#glow-${pattern.timeframe})`}
                />
                
                {/* Lower line */}
                <line
                  x1={startX}
                  y1={lowerStartY}
                  x2={endX}
                  y2={lowerEndY}
                  stroke={color}
                  strokeWidth="2"
                  opacity="0.7"
                  filter={`url(#glow-${pattern.timeframe})`}
                />
                
                {/* Pattern name label */}
                <rect
                  x={(startX + endX) / 2 - 50}
                  y={(upperStartY + lowerStartY) / 2 - 12}
                  width={100}
                  height={24}
                  rx="4"
                  fill="#18181b"
                  stroke={color}
                  strokeWidth="1"
                />
                <text
                  x={(startX + endX) / 2}
                  y={(upperStartY + lowerStartY) / 2 + 3}
                  textAnchor="middle"
                  fill={color}
                  fontSize="9"
                  fontWeight="bold"
                >
                  {PATTERN_NAMES_IT[pattern.type] || pattern.type?.replace(/_/g, ' ')}
                </text>
              </g>
            );
          }
          
          return null;
        })}
        
        {/* MARKERS - Candlestick patterns */}
        {chart_data.markers?.slice(0, 15).map((marker, i) => {
          const color = marker.color || BIAS_COLORS[marker.bias] || TIMEFRAME_COLORS[marker.timeframe];
          const y = priceToY(marker.price);
          const x = width - 90 - (i * 25);
          
          if (x < 100) return null;
          
          return (
            <g 
              key={`marker-${i}`} 
              className="sentinel-marker pointer-events-auto cursor-pointer"
              onMouseEnter={(e) => handleElementHover({
                type: marker.type,
                timeframe: marker.timeframe,
                price: marker.price,
                bias: marker.bias
              }, e)}
              onMouseLeave={() => handleElementHover(null)}
            >
              {/* Marker icon based on bias */}
              {marker.bias === "BULLISH" ? (
                <polygon
                  points={`${x},${y + 10} ${x - 7},${y - 3} ${x + 7},${y - 3}`}
                  fill={color}
                  opacity="0.9"
                  filter={`url(#glow-${marker.timeframe})`}
                />
              ) : marker.bias === "BEARISH" ? (
                <polygon
                  points={`${x},${y - 10} ${x - 7},${y + 3} ${x + 7},${y + 3}`}
                  fill={color}
                  opacity="0.9"
                  filter={`url(#glow-${marker.timeframe})`}
                />
              ) : (
                <circle
                  cx={x}
                  cy={y}
                  r="6"
                  fill={color}
                  opacity="0.9"
                  filter={`url(#glow-${marker.timeframe})`}
                />
              )}
            </g>
          );
        })}
        
        {/* ELLIOTT WAVES - Numbered wave segments */}
        {chart_data.elliott_waves?.map((wave, i) => {
          if (!wave.start || !wave.end) return null;
          
          const color = wave.color || ELLIOTT_COLORS.impulse;
          const startY = priceToY(wave.start.price);
          const endY = priceToY(wave.end.price);
          
          // Calculate X positions based on index
          const totalCandles = 100;
          const startX = Math.max(50, (wave.start.index / totalCandles) * (width - 100));
          const endX = Math.min(width - 70, (wave.end.index / totalCandles) * (width - 100));
          
          // Calculate midpoint for label
          const midX = (startX + endX) / 2;
          const midY = (startY + endY) / 2;
          
          // Determine if it's impulse (1-5) or corrective (A-B-C)
          const isImpulse = ['1', '2', '3', '4', '5', '1-5'].includes(wave.label);
          const waveColor = isImpulse ? ELLIOTT_COLORS.impulse : ELLIOTT_COLORS.corrective;
          
          return (
            <g 
              key={`elliott-${i}`} 
              className="sentinel-elliott pointer-events-auto cursor-pointer"
              onMouseEnter={(e) => handleElementHover({
                type: wave.type,
                timeframe: wave.timeframe,
                label: wave.label,
                direction: wave.direction,
                start_price: wave.start?.price,
                end_price: wave.end?.price,
                is_extended: wave.is_extended,
                is_truncated: wave.is_truncated
              }, e)}
              onMouseLeave={() => handleElementHover(null)}
            >
              {/* Wave line segment */}
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={waveColor}
                strokeWidth="3"
                opacity="0.8"
                strokeLinecap="round"
              />
              
              {/* Glow effect */}
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={waveColor}
                strokeWidth="6"
                opacity="0.2"
                strokeLinecap="round"
              />
              
              {/* Wave number/letter label */}
              <g transform={`translate(${midX}, ${midY})`}>
                {/* Circle background */}
                <circle
                  r="14"
                  fill="#18181b"
                  stroke={waveColor}
                  strokeWidth="2"
                />
                {/* Number/Letter */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={waveColor}
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {wave.label}
                </text>
              </g>
              
              {/* Start point marker */}
              <circle
                cx={startX}
                cy={startY}
                r="4"
                fill={waveColor}
              />
              
              {/* End point marker */}
              <circle
                cx={endX}
                cy={endY}
                r="4"
                fill={waveColor}
              />
              
              {/* Extended/Truncated indicator */}
              {wave.is_extended && (
                <text
                  x={midX + 18}
                  y={midY - 5}
                  fill="#00FF9D"
                  fontSize="8"
                  fontWeight="bold"
                >
                  EXT
                </text>
              )}
              {wave.is_truncated && (
                <text
                  x={midX + 18}
                  y={midY - 5}
                  fill="#FF1E56"
                  fontSize="8"
                  fontWeight="bold"
                >
                  TRUNC
                </text>
              )}
              
              {/* Timeframe badge for complete patterns */}
              {wave.is_complete_pattern && (
                <rect
                  x={endX + 5}
                  y={endY - 10}
                  width={40}
                  height={20}
                  rx="4"
                  fill="#18181b"
                  stroke={waveColor}
                  strokeWidth="1"
                />
              )}
              {wave.is_complete_pattern && (
                <text
                  x={endX + 25}
                  y={endY + 3}
                  textAnchor="middle"
                  fill={waveColor}
                  fontSize="9"
                  fontWeight="bold"
                >
                  {wave.timeframe?.toUpperCase()}
                </text>
              )}
            </g>
          );
        })}
        
        {/* Current price indicator */}
        {current_price && (
          <g className="current-price-line">
            <line
              x1={0}
              y1={priceToY(current_price)}
              x2={width - 70}
              y2={priceToY(current_price)}
              stroke="#FFFFFF"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.4"
            />
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
              <span>Patterns ON</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Patterns OFF</span>
            </>
          )}
        </button>
        
        {overlayEnabled && overlayData && (
          <>
            <div className="flex items-center gap-1 px-2 py-1 bg-zinc-800/80 rounded-lg border border-zinc-700/50">
              <Layers className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] text-amber-400 font-medium">
                {overlayData.patterns_total || 0}
              </span>
            </div>
            {overlayData.chart_data?.elliott_waves?.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 rounded-lg border border-purple-500/30">
                <span className="text-[10px] text-purple-400 font-bold">
                  ELLIOTT
                </span>
                <span className="w-1 h-1 rounded-full bg-purple-400 animate-pulse" />
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Chart Container */}
      <div 
        ref={chartContainerRef} 
        className="w-full tv-chart-container relative"
        style={{ height: `${height}px` }}
        data-testid="trading-chart-with-sentinel"
      >
        {/* SVG Overlay */}
        {renderSentinelOverlay()}
        
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
          </div>
        </div>
      )}
    </div>
  );
}

export default TradingChartWithSentinel;
