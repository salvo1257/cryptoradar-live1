import React, { useEffect, useRef, useCallback } from 'react';
import { createChart, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { useApp } from '../contexts/AppContext';

export function TradingChart({ height = 400 }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const priceLinesRef = useRef([]);
  const { candles, supportResistance, marketStatus } = useApp();

  const initChart = useCallback(() => {
    if (!chartContainerRef.current) return;

    // Clean up existing chart
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

    // Add candlestick series using v5 API
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00dc82',
      downColor: '#ff3b30',
      borderUpColor: '#00dc82',
      borderDownColor: '#ff3b30',
      wickUpColor: '#00dc82',
      wickDownColor: '#ff3b30',
    });

    // Add volume series using v5 API
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#3b82f6',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });

    // Set volume scale margins
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

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [height]);

  // Initialize chart
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

  // Update candle data
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

    // Fit content
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candles]);

  // Add support/resistance lines
  useEffect(() => {
    if (!candleSeriesRef.current || !supportResistance?.levels?.length) return;

    // Remove existing price lines
    priceLinesRef.current.forEach(line => {
      try {
        candleSeriesRef.current.removePriceLine(line);
      } catch (e) {
        // Line may already be removed
      }
    });
    priceLinesRef.current = [];

    // Add new price lines for S/R levels
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
      } catch (e) {
        // Ignore errors when creating price lines
      }
    });
  }, [supportResistance]);

  return (
    <div 
      ref={chartContainerRef} 
      className="w-full tv-chart-container"
      style={{ height: `${height}px` }}
      data-testid="trading-chart"
    />
  );
}

export default TradingChart;
