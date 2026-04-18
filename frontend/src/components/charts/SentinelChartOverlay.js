import React, { useEffect, useState, useRef } from 'react';
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

/**
 * SentinelChartOverlay - SVG overlay for pattern visualization on TradingView chart
 * 
 * This component fetches pattern draw data from The Sentinel and renders
 * visual overlays (trendlines, zones, markers) using SVG.
 * 
 * Props:
 * - chartRef: Reference to the TradingView chart container
 * - priceToY: Function to convert price to Y coordinate
 * - indexToX: Function to convert candle index to X coordinate
 * - visible: Whether the overlay is visible
 */
export function SentinelChartOverlay({ 
  chartRef, 
  priceToY, 
  indexToX, 
  visible = true,
  currentPrice = 0,
  chartHeight = 400,
  chartWidth = 800
}) {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const svgRef = useRef(null);
  
  useEffect(() => {
    if (!visible) return;
    
    const fetchChartData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/sentinel/chart-overlay`);
        if (!response.ok) throw new Error('Failed to fetch chart overlay data');
        const data = await response.json();
        setChartData(data);
      } catch (err) {
        console.error('[SENTINEL OVERLAY] Error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchChartData();
    const interval = setInterval(fetchChartData, 30000);
    return () => clearInterval(interval);
  }, [visible]);
  
  if (!visible || !chartData || loading) {
    return null;
  }
  
  const { chart_data, legend } = chartData;
  
  // Helper: Convert price to percentage-based Y position
  const priceToPercent = (price) => {
    if (!currentPrice || !price) return 50;
    const diff = ((price - currentPrice) / currentPrice) * 100;
    // Map -5% to +5% range to 0-100% of chart height
    const percent = 50 - (diff * 10);
    return Math.max(5, Math.min(95, percent));
  };
  
  return (
    <svg 
      ref={svgRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ width: '100%', height: '100%' }}
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      preserveAspectRatio="none"
    >
      <defs>
        {/* Gradient definitions for glowing effects */}
        {Object.entries(TIMEFRAME_COLORS).map(([tf, color]) => (
          <React.Fragment key={tf}>
            <linearGradient id={`glow-${tf}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="50%" stopColor={color} stopOpacity="0.1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.3" />
            </linearGradient>
            <filter id={`shadow-${tf}`}>
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor={color} floodOpacity="0.5"/>
            </filter>
          </React.Fragment>
        ))}
      </defs>
      
      {/* ZONES - Horizontal support/resistance lines */}
      {chart_data?.zones?.map((zone, i) => {
        const y = priceToPercent(zone.price) * chartHeight / 100;
        const color = zone.color || TIMEFRAME_COLORS[zone.timeframe] || "#8B5CF6";
        
        return (
          <g key={`zone-${i}`} className="sentinel-zone">
            {/* Main line */}
            <line
              x1="0"
              y1={y}
              x2={chartWidth}
              y2={y}
              stroke={color}
              strokeWidth="1.5"
              strokeDasharray={zone.type?.includes('support') ? "none" : "6 4"}
              opacity="0.7"
              filter={`url(#shadow-${zone.timeframe})`}
            />
            
            {/* Zone label */}
            <rect
              x="5"
              y={y - 10}
              width="60"
              height="18"
              rx="3"
              fill={`${color}20`}
              stroke={color}
              strokeWidth="0.5"
            />
            <text
              x="35"
              y={y + 1}
              textAnchor="middle"
              fill={color}
              fontSize="9"
              fontWeight="bold"
            >
              {zone.type?.includes('support') ? 'S' : 'R'} {zone.timeframe?.toUpperCase()}
            </text>
            
            {/* Price label on right */}
            <rect
              x={chartWidth - 65}
              y={y - 8}
              width="60"
              height="16"
              rx="2"
              fill="#18181b"
              stroke={color}
              strokeWidth="0.5"
            />
            <text
              x={chartWidth - 35}
              y={y + 3}
              textAnchor="middle"
              fill={color}
              fontSize="9"
            >
              ${zone.price?.toLocaleString()}
            </text>
            
            {/* Target line if exists */}
            {zone.target && (
              <>
                <line
                  x1="0"
                  y1={priceToPercent(zone.target) * chartHeight / 100}
                  x2={chartWidth}
                  y2={priceToPercent(zone.target) * chartHeight / 100}
                  stroke={color}
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.4"
                />
                <text
                  x={chartWidth - 35}
                  y={priceToPercent(zone.target) * chartHeight / 100 + 3}
                  textAnchor="middle"
                  fill={color}
                  fontSize="8"
                  opacity="0.6"
                >
                  TARGET
                </text>
              </>
            )}
          </g>
        );
      })}
      
      {/* TRENDLINES - Diagonal support/resistance */}
      {chart_data?.trendlines?.map((line, i) => {
        if (!line.start || !line.end) return null;
        
        const color = line.color || TIMEFRAME_COLORS[line.timeframe] || "#8B5CF6";
        const startY = priceToPercent(line.start.price) * chartHeight / 100;
        const endY = priceToPercent(line.end.price) * chartHeight / 100;
        
        // Map indices to X positions (simplified - assume last 100 candles)
        const startX = Math.max(0, (line.start.index / 100) * chartWidth);
        const endX = Math.max(0, (line.end.index / 100) * chartWidth);
        
        // Extend line to chart edges
        const slope = (endY - startY) / (endX - startX || 1);
        const extendedEndX = chartWidth;
        const extendedEndY = endY + slope * (extendedEndX - endX);
        
        return (
          <g key={`trendline-${i}`} className="sentinel-trendline">
            <line
              x1={startX}
              y1={startY}
              x2={extendedEndX}
              y2={extendedEndY}
              stroke={color}
              strokeWidth="2"
              opacity="0.6"
              filter={`url(#shadow-${line.timeframe})`}
            />
            
            {/* Start point marker */}
            <circle
              cx={startX}
              cy={startY}
              r="4"
              fill={color}
              opacity="0.8"
            />
            
            {/* End point marker */}
            <circle
              cx={endX}
              cy={endY}
              r="4"
              fill={color}
              opacity="0.8"
            />
          </g>
        );
      })}
      
      {/* PATTERNS - Triangle/Wedge convergence */}
      {chart_data?.patterns?.map((pattern, i) => {
        const color = pattern.color || TIMEFRAME_COLORS[pattern.timeframe] || "#8B5CF6";
        
        // Draw converging lines for triangles
        if (pattern.upper_line && pattern.lower_line) {
          const upperStartY = priceToPercent(pattern.upper_line.start?.[1] || 0) * chartHeight / 100;
          const upperEndY = priceToPercent(pattern.upper_line.end?.[1] || 0) * chartHeight / 100;
          const lowerStartY = priceToPercent(pattern.lower_line.start?.[1] || 0) * chartHeight / 100;
          const lowerEndY = priceToPercent(pattern.lower_line.end?.[1] || 0) * chartHeight / 100;
          
          const startX = chartWidth * 0.3;
          const endX = chartWidth * 0.9;
          
          return (
            <g key={`pattern-${i}`} className="sentinel-pattern">
              {/* Upper line */}
              <line
                x1={startX}
                y1={upperStartY}
                x2={endX}
                y2={upperEndY}
                stroke={color}
                strokeWidth="2"
                opacity="0.7"
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
              />
              
              {/* Fill between lines */}
              <polygon
                points={`${startX},${upperStartY} ${endX},${upperEndY} ${endX},${lowerEndY} ${startX},${lowerStartY}`}
                fill={`url(#glow-${pattern.timeframe})`}
                opacity="0.3"
              />
              
              {/* Pattern label */}
              <text
                x={(startX + endX) / 2}
                y={(upperStartY + lowerStartY) / 2}
                textAnchor="middle"
                fill={color}
                fontSize="10"
                fontWeight="bold"
              >
                {pattern.type?.replace(/_/g, ' ').toUpperCase()}
              </text>
            </g>
          );
        }
        
        return null;
      })}
      
      {/* MARKERS - Candlestick pattern indicators */}
      {chart_data?.markers?.map((marker, i) => {
        const color = marker.color || TIMEFRAME_COLORS[marker.timeframe] || "#8B5CF6";
        const y = priceToPercent(marker.price) * chartHeight / 100;
        const x = chartWidth - 50 - (i * 30); // Position markers from right
        
        return (
          <g key={`marker-${i}`} className="sentinel-marker">
            {/* Marker icon based on bias */}
            {marker.bias === "BULLISH" ? (
              <polygon
                points={`${x},${y + 8} ${x - 6},${y - 4} ${x + 6},${y - 4}`}
                fill={color}
                opacity="0.8"
              />
            ) : marker.bias === "BEARISH" ? (
              <polygon
                points={`${x},${y - 8} ${x - 6},${y + 4} ${x + 6},${y + 4}`}
                fill={color}
                opacity="0.8"
              />
            ) : (
              <circle
                cx={x}
                cy={y}
                r="5"
                fill={color}
                opacity="0.8"
              />
            )}
            
            {/* Marker label */}
            <text
              x={x}
              y={y + 18}
              textAnchor="middle"
              fill={color}
              fontSize="8"
            >
              {marker.type?.split('_')[0]?.toUpperCase()}
            </text>
          </g>
        );
      })}
      
      {/* Legend */}
      <g className="sentinel-legend" transform="translate(10, 10)">
        <rect
          width="120"
          height={Object.keys(legend || {}).length * 18 + 25}
          rx="4"
          fill="#18181b"
          fillOpacity="0.9"
          stroke="#3f3f46"
          strokeWidth="0.5"
        />
        <text x="10" y="15" fill="#a1a1aa" fontSize="10" fontWeight="bold">
          SENTINEL LEGEND
        </text>
        {Object.entries(legend || {}).map(([tf, info], i) => (
          <g key={tf} transform={`translate(10, ${25 + i * 18})`}>
            <rect
              width="12"
              height="12"
              rx="2"
              fill={info.color}
              opacity="0.8"
            />
            <text x="18" y="10" fill="#d4d4d8" fontSize="9">
              {tf.toUpperCase()}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

/**
 * Simplified standalone overlay that can be positioned over any chart
 */
export function SentinelOverlayStandalone({ 
  visible = true,
  currentPrice,
  height = 400,
  width = 800
}) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    if (!visible) return;
    
    const fetchData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/sentinel/chart-overlay`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (err) {
        console.error('[SENTINEL OVERLAY]', err);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [visible]);
  
  if (!visible || !data) return null;
  
  return (
    <SentinelChartOverlay
      chartData={data}
      currentPrice={currentPrice || data.current_price}
      chartHeight={height}
      chartWidth={width}
      visible={visible}
    />
  );
}

export default SentinelChartOverlay;
