import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity, RefreshCw, Waves } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { HelpOverlay } from '../ui/HelpOverlay';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Exchange color mapping for heat bar
const EXCHANGE_COLORS = {
  'Kraken': { bullish: '#00FF9D', bearish: '#FF1E56', neutral: '#1C232D' },
  'Coinbase': { bullish: '#00E68A', bearish: '#E61A4D', neutral: '#1C232D' },
  'Bitstamp': { bullish: '#00CC7A', bearish: '#CC1744', neutral: '#1C232D' },
  'Binance.US': { bullish: '#00B36B', bearish: '#B3143B', neutral: '#1C232D' },
  'KuCoin': { bullish: '#009959', bearish: '#991132', neutral: '#1C232D' }
};

const EXCHANGE_ORDER = ['Kraken', 'Coinbase', 'Bitstamp', 'Binance.US', 'KuCoin'];

export function WhaleFlowCard() {
  const { t, learnMode, language } = useApp();
  const [flowData, setFlowData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const labels = {
    it: {
      title: 'Whale Flow 2.0',
      subtitle: 'Flusso Capitale in Tempo Reale',
      momentum: 'Momentum Istituzionale',
      buying: 'Pressione Acquisto',
      selling: 'Pressione Vendita',
      neutral: 'Neutrale',
      score: 'Score',
      exchanges: 'Exchange',
      aggregated: 'Aggregato dai Big Five'
    },
    en: {
      title: 'Whale Flow 2.0',
      subtitle: 'Real-Time Capital Flow',
      momentum: 'Institutional Momentum',
      buying: 'Buying Pressure',
      selling: 'Selling Pressure',
      neutral: 'Neutral',
      score: 'Score',
      exchanges: 'Exchanges',
      aggregated: 'Aggregated from Big Five'
    }
  };

  const l = labels[language] || labels.it;

  const fetchFlowData = async () => {
    try {
      setLoading(true);
      // Fetch orderbook data which contains per-exchange stats
      const response = await fetch(`${API_URL}/api/orderbook`);
      const orderbookData = await response.json();
      
      // Process exchange comparison data into flow metrics
      const exchangeStats = orderbookData.exchange_comparison || {};
      
      // Calculate flow metrics per exchange
      const flows = {};
      let totalBuyPressure = 0;
      let totalSellPressure = 0;
      
      EXCHANGE_ORDER.forEach(exchange => {
        const stats = exchangeStats[exchange];
        if (stats) {
          const imbalance = stats.imbalance || 0;
          const bidDepth = stats.bid_depth || 0;
          const askDepth = stats.ask_depth || 0;
          const totalDepth = bidDepth + askDepth;
          
          // Normalize to buying/selling pressure
          const buyingPressure = totalDepth > 0 ? (bidDepth / totalDepth) * 100 : 50;
          const sellingPressure = 100 - buyingPressure;
          
          flows[exchange] = {
            buying: buyingPressure,
            selling: sellingPressure,
            imbalance: imbalance,
            totalDepth: totalDepth,
            direction: imbalance > 5 ? 'BUY' : imbalance < -5 ? 'SELL' : 'NEUTRAL'
          };
          
          totalBuyPressure += buyingPressure;
          totalSellPressure += sellingPressure;
        } else {
          flows[exchange] = { buying: 50, selling: 50, imbalance: 0, totalDepth: 0, direction: 'NEUTRAL' };
        }
      });
      
      // Calculate Institutional Momentum Score (0-100)
      const avgBuyPressure = totalBuyPressure / EXCHANGE_ORDER.length;
      const momentumScore = Math.min(100, Math.max(0, avgBuyPressure));
      
      // Determine overall direction
      const buyingExchanges = EXCHANGE_ORDER.filter(ex => flows[ex].direction === 'BUY').length;
      const sellingExchanges = EXCHANGE_ORDER.filter(ex => flows[ex].direction === 'SELL').length;
      
      let overallDirection = 'NEUTRAL';
      if (buyingExchanges >= 3) overallDirection = 'BUY';
      else if (sellingExchanges >= 3) overallDirection = 'SELL';
      
      setFlowData({
        exchanges: flows,
        momentumScore: Math.round(momentumScore),
        overallDirection,
        buyingExchanges,
        sellingExchanges,
        consensus: `${Math.max(buyingExchanges, sellingExchanges)}/5`
      });
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching whale flow:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlowData();
    const interval = setInterval(fetchFlowData, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const getMomentumConfig = (score, direction) => {
    if (direction === 'BUY' || score > 55) {
      return {
        color: 'text-bullish',
        glow: 'text-glow-bullish',
        bgGlow: 'glow-bullish',
        label: l.buying,
        icon: TrendingUp
      };
    } else if (direction === 'SELL' || score < 45) {
      return {
        color: 'text-bearish',
        glow: 'text-glow-bearish',
        bgGlow: 'glow-bearish',
        label: l.selling,
        icon: TrendingDown
      };
    }
    return {
      color: 'text-cyber',
      glow: 'text-glow-cyber',
      bgGlow: 'glow-cyber',
      label: l.neutral,
      icon: Activity
    };
  };

  const config = flowData ? getMomentumConfig(flowData.momentumScore, flowData.overallDirection) : getMomentumConfig(50, 'NEUTRAL');
  const MomentumIcon = config.icon;

  if (loading && !flowData) {
    return (
      <div className="premium-card rounded-lg p-6 animate-pulse" data-testid="whale-flow-card">
        <div className="h-6 bg-crypto-surface rounded w-1/3 mb-4" />
        <div className="h-24 bg-crypto-surface rounded" />
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "premium-card rounded-lg p-6 relative overflow-hidden",
        flowData && flowData.overallDirection === 'BUY' && "premium-card-bullish",
        flowData && flowData.overallDirection === 'SELL' && "premium-card-bearish"
      )}
      data-testid="whale-flow-card"
    >
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", config.bgGlow)}>
            <Waves className={cn("w-5 h-5", config.color)} />
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg text-white tracking-wide">
              {l.title}
            </h3>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">
              {l.aggregated}
            </span>
          </div>
        </div>
        
        <button 
          onClick={fetchFlowData}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          data-testid="whale-flow-refresh"
        >
          <RefreshCw className={cn("w-4 h-4 text-zinc-500", loading && "animate-spin")} />
        </button>
      </div>

      {/* Institutional Momentum Score */}
      <div className="text-center mb-6 relative z-10">
        <span className="text-xs text-zinc-500 uppercase tracking-[0.2em] block mb-2">
          {l.momentum}
        </span>
        <div className="flex items-center justify-center gap-4">
          <MomentumIcon className={cn("w-8 h-8", config.color, config.glow)} />
          <span className={cn(
            "font-mono text-5xl font-bold tracking-tight",
            config.color,
            config.glow
          )}>
            {flowData?.momentumScore || 50}
          </span>
          <span className="text-xl text-zinc-500 font-mono">/100</span>
        </div>
        <span className={cn("text-sm font-medium mt-2 block", config.color)}>
          {config.label} ({flowData?.consensus || '0/5'} Exchange)
        </span>
      </div>

      {/* Heat Bar - Capital Flow Visualization */}
      <div className="mb-6 relative z-10">
        <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
          <span className="uppercase tracking-wider">{l.exchanges}</span>
          <span className="font-mono">Bid/Ask Imbalance</span>
        </div>
        
        <div className="space-y-2">
          {EXCHANGE_ORDER.map((exchange) => {
            const data = flowData?.exchanges?.[exchange] || { buying: 50, selling: 50, imbalance: 0 };
            const imbalance = data.imbalance || 0;
            const isPositive = imbalance > 0;
            const absImbalance = Math.abs(imbalance);
            
            return (
              <div key={exchange} className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 w-20 font-mono truncate">
                  {exchange.replace('.US', '')}
                </span>
                
                {/* Heat Bar */}
                <div className="flex-1 h-3 rounded-full bg-crypto-bg border border-crypto-border overflow-hidden flex">
                  {/* Selling side (left) */}
                  <div 
                    className="heat-segment h-full transition-all duration-500"
                    style={{ 
                      width: `${data.selling}%`,
                      background: data.direction === 'SELL' 
                        ? `linear-gradient(90deg, ${EXCHANGE_COLORS[exchange].bearish}80 0%, ${EXCHANGE_COLORS[exchange].bearish} 100%)`
                        : EXCHANGE_COLORS[exchange].neutral
                    }}
                  />
                  {/* Buying side (right) */}
                  <div 
                    className="heat-segment h-full transition-all duration-500"
                    style={{ 
                      width: `${data.buying}%`,
                      background: data.direction === 'BUY'
                        ? `linear-gradient(90deg, ${EXCHANGE_COLORS[exchange].bullish} 0%, ${EXCHANGE_COLORS[exchange].bullish}80 100%)`
                        : EXCHANGE_COLORS[exchange].neutral
                    }}
                  />
                </div>
                
                {/* Imbalance % */}
                <span className={cn(
                  "text-xs font-mono w-14 text-right",
                  isPositive ? "text-bullish" : imbalance < 0 ? "text-bearish" : "text-zinc-500"
                )}>
                  {isPositive ? '+' : ''}{imbalance.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-bearish" />
          <span className="text-zinc-500">{l.selling}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-crypto-border" />
          <span className="text-zinc-500">{l.neutral}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-bullish" />
          <span className="text-zinc-500">{l.buying}</span>
        </div>
      </div>

      {/* Learn Mode Overlay - Whale Flow 2.0 Pedagogy */}
      {learnMode && (
        <HelpOverlay 
          show={true}
          cardType="whale_flow"
          language={language}
          contextData={{ 
            momentumScore: flowData?.momentumScore || 50,
            overallDirection: flowData?.overallDirection || 'NEUTRAL',
            consensus: flowData?.consensus || '0/5',
            buyingExchanges: flowData?.buyingExchanges || 0,
            sellingExchanges: flowData?.sellingExchanges || 0
          }} 
        />
      )}
    </div>
  );
}

export default WhaleFlowCard;
