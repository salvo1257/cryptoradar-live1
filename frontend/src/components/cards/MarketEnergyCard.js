import React, { useState, useEffect } from 'react';
import { HelpCircle, Zap, TrendingUp, TrendingDown, Minus, RefreshCw, Activity, Layers, BarChart3 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Progress } from '../ui/progress';
import { HelpOverlay } from '../ui/HelpOverlay';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function MarketEnergyCard({ compact = false }) {
  const { t, learnMode, language } = useApp();
  const [energyData, setEnergyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchMarketEnergy = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/market-energy?lang=${language}`);
      const data = await response.json();
      setEnergyData(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching market energy:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketEnergy();
    const interval = setInterval(fetchMarketEnergy, 60000);
    return () => clearInterval(interval);
  }, [language]);

  const getCompressionConfig = (level) => {
    switch (level) {
      case 'HIGH':
        return {
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500',
          icon: Zap
        };
      case 'MEDIUM':
        return {
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500',
          icon: Activity
        };
      default:
        return {
          color: 'text-zinc-400',
          bgColor: 'bg-zinc-800',
          borderColor: 'border-zinc-600',
          icon: Minus
        };
    }
  };

  const getExpansionReadinessConfig = (level) => {
    switch (level) {
      case 'HIGH':
        return { color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', pulse: true };
      case 'MEDIUM':
        return { color: 'text-orange-400', bgColor: 'bg-orange-500/20', pulse: false };
      default:
        return { color: 'text-zinc-400', bgColor: 'bg-zinc-800', pulse: false };
    }
  };

  const getBreakoutConfig = (probability) => {
    switch (probability) {
      case 'HIGH':
        return { color: 'text-bullish', bgColor: 'bg-bullish/20' };
      case 'MEDIUM':
        return { color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
      default:
        return { color: 'text-zinc-400', bgColor: 'bg-zinc-800' };
    }
  };

  const getDirectionIcon = (direction) => {
    switch (direction) {
      case 'UP':
        return <TrendingUp className="w-4 h-4 text-bullish" />;
      case 'DOWN':
        return <TrendingDown className="w-4 h-4 text-bearish" />;
      default:
        return <Minus className="w-4 h-4 text-zinc-400" />;
    }
  };

  const config = energyData ? getCompressionConfig(energyData.compression_level) : getCompressionConfig('LOW');
  const breakoutConfig = energyData ? getBreakoutConfig(energyData.breakout_probability) : getBreakoutConfig('LOW');
  const expansionConfig = energyData ? getExpansionReadinessConfig(energyData.expansion_readiness) : getExpansionReadinessConfig('LOW');

  return (
    <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden tech-card" data-testid="market-energy-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Zap className={cn("w-4 h-4", energyData?.compression_level === 'HIGH' ? "text-yellow-400" : "text-zinc-400")} />
          <h3 className="font-heading font-semibold text-sm uppercase tracking-wider">{t('marketEnergy')}</h3>
          {learnMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-yellow-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-crypto-surface border-crypto-border">
                  <p className="text-xs">{t('learnMarketEnergy')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <button 
          onClick={fetchMarketEnergy}
          className="p-1.5 hover:bg-white/10 rounded-sm transition-colors"
          title={t('refresh')}
        >
          <RefreshCw className={cn("w-4 h-4 text-zinc-400", loading && "animate-spin")} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {energyData ? (
          <div className="space-y-4">
            {/* Energy Score & Compression Level */}
            <div className={cn(
              "flex items-center justify-between p-3 rounded-sm border-l-2",
              config.bgColor,
              config.borderColor
            )}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    energyData.energy_score >= 70 ? "bg-yellow-500/20 animate-pulse" : 
                    energyData.energy_score >= 45 ? "bg-orange-500/20" : "bg-zinc-800"
                  )}>
                    <span className={cn(
                      "font-mono font-bold text-lg",
                      energyData.energy_score >= 70 ? "text-yellow-400" :
                      energyData.energy_score >= 45 ? "text-orange-400" : "text-zinc-400"
                    )}>
                      {energyData.energy_score?.toFixed(0)}
                    </span>
                  </div>
                </div>
                <div>
                  <div className={cn("font-mono font-bold text-sm", config.color)}>
                    {t(energyData.compression_level?.toLowerCase() || 'low')} {t('compression')}
                  </div>
                  <div className="text-xs text-zinc-500">{t('energyScore')}</div>
                </div>
              </div>
              <div className="text-right space-y-1">
                <div>
                  <div className="text-xs text-zinc-500">{t('rangeWidth')}</div>
                  <div className="font-mono text-sm">{energyData.range_width_percent?.toFixed(2)}%</div>
                </div>
                <div className="text-[10px] text-zinc-600">
                  {t('compressionThreshold')}: &lt;{energyData.compression_threshold?.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Expansion Readiness Indicator */}
            <div className={cn(
              "flex items-center justify-between p-3 rounded-sm border",
              expansionConfig.bgColor,
              energyData.expansion_readiness === 'HIGH' ? 'border-yellow-500/40' :
              energyData.expansion_readiness === 'MEDIUM' ? 'border-orange-500/30' : 'border-zinc-700'
            )}>
              <div className="flex items-center gap-2">
                <Activity className={cn(
                  "w-4 h-4",
                  expansionConfig.color,
                  expansionConfig.pulse && "animate-pulse"
                )} />
                <span className="text-xs text-zinc-400">{t('expansionReadiness')}</span>
              </div>
              <span className={cn("font-mono text-sm font-bold", expansionConfig.color)}>
                {t(energyData.expansion_readiness?.toLowerCase() || 'low')}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* OI Trend */}
              <div className="bg-crypto-surface/30 p-3 rounded-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500">{t('openInterest')}</span>
                  <span className={cn(
                    "font-mono text-xs",
                    energyData.oi_trend === 'RISING' ? "text-bullish" :
                    energyData.oi_trend === 'FALLING' ? "text-bearish" : "text-zinc-400"
                  )}>
                    {t(energyData.oi_trend?.toLowerCase() || 'stable')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {energyData.oi_trend === 'RISING' ? (
                    <TrendingUp className="w-3 h-3 text-bullish" />
                  ) : energyData.oi_trend === 'FALLING' ? (
                    <TrendingDown className="w-3 h-3 text-bearish" />
                  ) : (
                    <Minus className="w-3 h-3 text-zinc-400" />
                  )}
                  <span className="font-mono text-xs">
                    {energyData.oi_change_percent > 0 ? '+' : ''}{energyData.oi_change_percent?.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Liquidity Buildup */}
              <div className="bg-crypto-surface/30 p-3 rounded-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500">{t('liquidityBuildup')}</span>
                </div>
                <div className={cn(
                  "font-mono text-xs font-bold",
                  energyData.liquidity_buildup === 'STRONG' ? "text-yellow-400" :
                  energyData.liquidity_buildup === 'MODERATE' ? "text-orange-400" : "text-zinc-400"
                )}>
                  {t(energyData.liquidity_buildup?.toLowerCase() || 'none')}
                </div>
              </div>

              {/* Orderbook Pressure */}
              <div className="bg-crypto-surface/30 p-3 rounded-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500">{t('orderbookPressure')}</span>
                </div>
                <div className={cn(
                  "font-mono text-xs font-bold",
                  energyData.orderbook_pressure_buildup === 'STRONG' ? "text-yellow-400" :
                  energyData.orderbook_pressure_buildup === 'BUILDING' ? "text-orange-400" : "text-zinc-400"
                )}>
                  {t(energyData.orderbook_pressure_buildup?.toLowerCase() || 'none')}
                </div>
              </div>

              {/* Breakout Probability */}
              <div className={cn("p-3 rounded-sm", breakoutConfig.bgColor)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500">{t('breakoutProbability')}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getDirectionIcon(energyData.expected_direction)}
                  <span className={cn("font-mono text-xs font-bold", breakoutConfig.color)}>
                    {t(energyData.breakout_probability?.toLowerCase() || 'low')}
                  </span>
                </div>
              </div>
            </div>

            {/* Volatility Compression Bar */}
            {!compact && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">{t('volatilityCompression')}</span>
                  <span className="font-mono text-xs">{energyData.volatility_compression?.toFixed(0)}%</span>
                </div>
                <Progress 
                  value={energyData.volatility_compression || 0} 
                  className="h-1.5 bg-zinc-800"
                  indicatorClassName={cn(
                    energyData.volatility_compression >= 75 ? "bg-yellow-400" :
                    energyData.volatility_compression >= 50 ? "bg-orange-400" : "bg-zinc-500"
                  )}
                />
              </div>
            )}

            {/* Expansion Warning */}
            {energyData.expansion_warning && (
              <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-sm">
                <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
                <span className="text-xs text-yellow-400 font-medium">
                  {t('expansionWarning')}
                </span>
              </div>
            )}

            {/* Explanation */}
            <div className="pt-3 border-t border-white/5">
              <p className="text-xs text-zinc-400">{energyData.explanation}</p>
            </div>

            {/* Signals */}
            {!compact && energyData.signals && energyData.signals.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase">{t('detectedSignals')}</div>
                {energyData.signals.slice(0, 3).map((signal, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="w-1 h-1 rounded-full bg-yellow-400" />
                    {signal}
                  </div>
                ))}
              </div>
            )}

            {/* Last Update */}
            {lastUpdate && (
              <div className="text-[10px] text-zinc-500 text-right">
                {t('updated')}: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-500">
            <Zap className="w-6 h-6 mb-2 animate-pulse" />
            <span className="text-xs">{t('loading')}</span>
          </div>
        )}
      </div>

      {/* Help Overlay - Learn Mode */}
      <HelpOverlay 
        show={learnMode}
        cardType="market_energy"
        language={language}
        contextData={{
          level: energyData?.energy_level,
          energy: energyData?.energy_level,
          score: energyData?.energy_score || 50
        }}
      />
    </div>
  );
}

export default MarketEnergyCard;
