import React, { useState, useEffect } from 'react';
import { HelpCircle, Magnet, TrendingUp, TrendingDown, Minus, RefreshCw, Target, ArrowUp, ArrowDown } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Progress } from '../ui/progress';
import { HelpOverlay } from '../ui/HelpOverlay';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function LiquidityMagnetCard({ compact = false }) {
  const { t, learnMode, language } = useApp();
  const [magnetData, setMagnetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchLiquidityMagnet = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/liquidity-magnet?lang=${language}`);
      const data = await response.json();
      setMagnetData(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching liquidity magnet:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiquidityMagnet();
    const interval = setInterval(fetchLiquidityMagnet, 60000);
    return () => clearInterval(interval);
  }, [language]);

  const getDirectionConfig = (direction) => {
    switch (direction) {
      case 'UP':
        return {
          color: 'text-bullish',
          bgColor: 'bg-bullish/10',
          borderColor: 'border-bullish',
          icon: ArrowUp,
          iconColor: 'text-bullish'
        };
      case 'DOWN':
        return {
          color: 'text-bearish',
          bgColor: 'bg-bearish/10',
          borderColor: 'border-bearish',
          icon: ArrowDown,
          iconColor: 'text-bearish'
        };
      default:
        return {
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500',
          icon: Minus,
          iconColor: 'text-yellow-400'
        };
    }
  };

  const getStrengthConfig = (strength) => {
    switch (strength) {
      case 'VERY_STRONG':
        return { color: 'text-bullish', label: t('veryStrong') || 'Very Strong', barWidth: 100 };
      case 'STRONG':
        return { color: 'text-green-400', label: t('strong'), barWidth: 75 };
      case 'MODERATE':
        return { color: 'text-yellow-400', label: t('moderate'), barWidth: 50 };
      default:
        return { color: 'text-zinc-400', label: t('weak'), barWidth: 25 };
    }
  };

  const getSweepConfig = (sweep) => {
    switch (sweep) {
      case 'SWEEP_UP_FIRST':
        return { icon: TrendingUp, color: 'text-bullish', label: t('sweepUpFirst') || 'Sweep UP first' };
      case 'SWEEP_DOWN_FIRST':
        return { icon: TrendingDown, color: 'text-bearish', label: t('sweepDownFirst') || 'Sweep DOWN first' };
      default:
        return { icon: Minus, color: 'text-zinc-400', label: t('noClearSweep') || 'No clear sweep' };
    }
  };

  const config = magnetData ? getDirectionConfig(magnetData.target_direction) : getDirectionConfig('BALANCED');
  const strengthConfig = magnetData ? getStrengthConfig(magnetData.magnet_strength) : getStrengthConfig('WEAK');
  const sweepConfig = magnetData ? getSweepConfig(magnetData.sweep_expectation) : getSweepConfig('NO_CLEAR_SWEEP');

  const formatPrice = (price) => {
    return price ? `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '-';
  };

  const formatDistance = (distance) => {
    if (distance === null || distance === undefined) return '-';
    const sign = distance >= 0 ? '+' : '';
    return `${sign}${distance.toFixed(2)}%`;
  };

  return (
    <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden tech-card" data-testid="liquidity-magnet-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Magnet className={cn("w-4 h-4", magnetData?.magnet_strength === 'VERY_STRONG' || magnetData?.magnet_strength === 'STRONG' ? "text-purple-400" : "text-zinc-400")} />
          <h3 className="font-heading font-semibold text-sm uppercase tracking-wider">{t('liquidityMagnet')}</h3>
          {learnMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-yellow-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-crypto-surface border-crypto-border">
                  <p className="text-xs">{t('learnLiquidityMagnet')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <button 
          onClick={fetchLiquidityMagnet}
          className="p-1.5 hover:bg-white/10 rounded-sm transition-colors"
          title={t('refresh')}
        >
          <RefreshCw className={cn("w-4 h-4 text-zinc-400", loading && "animate-spin")} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {magnetData ? (
          <div className="space-y-4">
            {/* Magnet Score & Direction */}
            <div className={cn(
              "flex items-center justify-between p-3 rounded-sm border-l-2",
              config.bgColor,
              config.borderColor
            )}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    magnetData.magnet_score >= 70 ? "bg-purple-500/20 animate-pulse" : 
                    magnetData.magnet_score >= 45 ? "bg-purple-500/10" : "bg-zinc-800"
                  )}>
                    <span className={cn(
                      "font-mono font-bold text-lg",
                      magnetData.magnet_score >= 70 ? "text-purple-400" :
                      magnetData.magnet_score >= 45 ? "text-purple-300" : "text-zinc-400"
                    )}>
                      {magnetData.magnet_score?.toFixed(0)}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <config.icon className={cn("w-4 h-4", config.iconColor)} />
                    <span className={cn("font-mono font-bold text-sm", config.color)}>
                      {t(magnetData.target_direction?.toLowerCase() || 'balanced')}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500">{t('targetDirection')}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={cn("font-mono text-sm font-bold", strengthConfig.color)}>
                  {strengthConfig.label}
                </div>
                <div className="text-xs text-zinc-500">{t('magnetStrength')}</div>
              </div>
            </div>

            {/* Nearest Magnet Target */}
            <div className="bg-crypto-surface/30 p-3 rounded-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-zinc-400">{t('nearestMagnet')}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className={cn("font-mono text-lg font-bold", config.color)}>
                    {formatPrice(magnetData.nearest_magnet_price)}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {t('distance')}: <span className={config.color}>{formatDistance(magnetData.nearest_magnet_distance_percent)}</span>
                  </div>
                </div>
                {magnetData.nearest_magnet_value > 0 && (
                  <div className="text-right">
                    <div className="text-xs text-zinc-500">{t('estimatedValue')}</div>
                    <div className="font-mono text-sm text-zinc-300">
                      ${(magnetData.nearest_magnet_value / 1000000).toFixed(1)}M
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Secondary Magnet (if exists) */}
            {!compact && magnetData.secondary_magnet_price && (
              <div className="bg-crypto-surface/20 p-3 rounded-sm border border-zinc-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-500">{t('secondaryMagnet')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="font-mono text-sm text-zinc-400">
                    {formatPrice(magnetData.secondary_magnet_price)}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {formatDistance(magnetData.secondary_magnet_distance_percent)}
                  </div>
                </div>
              </div>
            )}

            {/* Magnet Strength Bar */}
            {!compact && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">{t('attractionStrength')}</span>
                  <span className="font-mono text-xs">{magnetData.magnet_score?.toFixed(0)}%</span>
                </div>
                <Progress 
                  value={magnetData.magnet_score || 0} 
                  className="h-1.5 bg-zinc-800"
                  indicatorClassName={cn(
                    magnetData.magnet_score >= 70 ? "bg-purple-400" :
                    magnetData.magnet_score >= 45 ? "bg-purple-300" : "bg-zinc-500"
                  )}
                />
              </div>
            )}

            {/* Sweep Expectation */}
            <div className={cn(
              "flex items-center justify-between p-2 rounded-sm",
              sweepConfig.color === 'text-bullish' ? 'bg-bullish/10' :
              sweepConfig.color === 'text-bearish' ? 'bg-bearish/10' : 'bg-zinc-800/50'
            )}>
              <div className="flex items-center gap-2">
                <sweepConfig.icon className={cn("w-4 h-4", sweepConfig.color)} />
                <span className="text-xs text-zinc-400">{t('sweepExpectation')}</span>
              </div>
              <span className={cn("font-mono text-xs font-bold", sweepConfig.color)}>
                {sweepConfig.label}
              </span>
            </div>

            {/* Explanation */}
            <div className="pt-3 border-t border-white/5">
              <p className="text-xs text-zinc-400">{magnetData.explanation}</p>
            </div>

            {/* Signals */}
            {!compact && magnetData.signals && magnetData.signals.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase">{t('detectedSignals')}</div>
                {magnetData.signals.slice(0, 3).map((signal, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="w-1 h-1 rounded-full bg-purple-400" />
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
            <Magnet className="w-6 h-6 mb-2 animate-pulse" />
            <span className="text-xs">{t('loading')}</span>
          </div>
        )}
      </div>

      {/* Help Overlay - Learn Mode */}
      <HelpOverlay 
        show={learnMode}
        cardType="liquidity_magnet"
        language={language}
        contextData={{
          magnetDirection: magnetData?.sweep_expectation,
          direction: magnetData?.sweep_expectation,
          score: magnetData?.confidence || 0
        }}
      />
    </div>
  );
}

export default LiquidityMagnetCard;
