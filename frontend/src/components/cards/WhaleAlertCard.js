import React, { useState, useEffect } from 'react';
import { HelpCircle, TrendingUp, TrendingDown, MinusCircle, Activity, RefreshCw, Waves, BarChart3 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Progress } from '../ui/progress';
import { HelpOverlay } from '../ui/HelpOverlay';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function WhaleAlertCard({ compact = false }) {
  const { t, learnMode, language } = useApp();
  const [whaleData, setWhaleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchWhaleActivity = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/trade-signal?lang=${language}`);
      const data = await response.json();
      setWhaleData(data.whale_activity);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching whale activity:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWhaleActivity();
    const interval = setInterval(fetchWhaleActivity, 60000);
    return () => clearInterval(interval);
  }, [language]);

  const getDirectionConfig = (direction) => {
    switch (direction) {
      case 'BUY':
        return {
          icon: TrendingUp,
          label: t('buyingPressure'),
          color: 'bullish',
          bgClass: 'bg-bullish/10',
          borderClass: 'border-bullish',
          textClass: 'text-bullish'
        };
      case 'SELL':
        return {
          icon: TrendingDown,
          label: t('sellingPressure'),
          color: 'bearish',
          bgClass: 'bg-bearish/10',
          borderClass: 'border-bearish',
          textClass: 'text-bearish'
        };
      default:
        return {
          icon: MinusCircle,
          label: t('neutral'),
          color: 'zinc-400',
          bgClass: 'bg-zinc-800',
          borderClass: 'border-zinc-600',
          textClass: 'text-zinc-400'
        };
    }
  };

  if (loading && !whaleData) {
    return (
      <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden tech-card animate-pulse" data-testid="whale-alert-card">
        <div className="px-4 py-3 border-b border-white/5">
          <div className="h-4 bg-crypto-surface rounded w-1/3" />
        </div>
        <div className="p-4">
          <div className="h-24 bg-crypto-surface rounded" />
        </div>
      </div>
    );
  }

  const config = whaleData ? getDirectionConfig(whaleData.direction) : getDirectionConfig('NEUTRAL');
  const DirectionIcon = config.icon;

  return (
    <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden tech-card" data-testid="whale-alert-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-lg">🐋</span>
          <h3 className="font-heading font-semibold text-sm uppercase tracking-wider">{t('whaleActivity')}</h3>
          {learnMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-whale cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-crypto-surface border-crypto-border">
                  <p className="text-xs">{t('learnWhaleAlerts')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <button 
          onClick={fetchWhaleActivity}
          className="p-1.5 hover:bg-white/10 rounded-sm transition-colors"
          title={t('refresh')}
        >
          <RefreshCw className={cn("w-4 h-4 text-zinc-400", loading && "animate-spin")} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {whaleData ? (
          <div className="space-y-4">
            {/* Direction Badge */}
            <div className={cn(
              "flex items-center justify-between p-3 rounded-sm border-l-2",
              config.bgClass,
              config.borderClass
            )}>
              <div className="flex items-center gap-3">
                <DirectionIcon className={cn("w-6 h-6", config.textClass)} />
                <div>
                  <div className={cn("font-mono font-bold text-sm", config.textClass)}>
                    {config.label}
                  </div>
                  <div className="text-xs text-zinc-500">{t('direction')}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-mono font-bold">{whaleData.strength?.toFixed(0)}%</div>
                <div className="text-xs text-zinc-500">{t('strength')}</div>
              </div>
            </div>

            {/* Pressure Bars */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-crypto-surface/30 p-3 rounded-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-bullish" />
                    {t('buyPressure')}
                  </span>
                  <span className="font-mono text-xs text-bullish">{whaleData.buy_pressure?.toFixed(0)}</span>
                </div>
                <Progress 
                  value={whaleData.buy_pressure || 0} 
                  className="h-1.5 bg-zinc-800"
                  indicatorClassName="bg-bullish"
                />
              </div>
              <div className="bg-crypto-surface/30 p-3 rounded-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-bearish" />
                    {t('sellPressure')}
                  </span>
                  <span className="font-mono text-xs text-bearish">{whaleData.sell_pressure?.toFixed(0)}</span>
                </div>
                <Progress 
                  value={whaleData.sell_pressure || 0} 
                  className="h-1.5 bg-zinc-800"
                  indicatorClassName="bg-bearish"
                />
              </div>
            </div>

            {/* Indicators */}
            {!compact && (
              <div className="grid grid-cols-2 gap-2">
                {/* OI Divergence - NEW */}
                {whaleData.oi_divergence && (
                  <div className={cn(
                    "col-span-2 flex items-center gap-2 p-2 rounded-sm text-xs",
                    whaleData.oi_divergence.includes('long') ? 
                      (whaleData.oi_divergence.includes('opening') ? "bg-bullish/10 text-bullish" : "bg-bearish/10 text-bearish") :
                      (whaleData.oi_divergence.includes('closing') ? "bg-bullish/10 text-bullish" : "bg-bearish/10 text-bearish")
                  )}>
                    <Activity className="w-3 h-3" />
                    <span>
                      {t('oiDivergence')}: {t(whaleData.oi_divergence)}
                      {whaleData.oi_divergence_strength > 0 && ` (${whaleData.oi_divergence_strength.toFixed(0)}%)`}
                    </span>
                  </div>
                )}

                {/* Whale Behavior - NEW */}
                {whaleData.whale_behavior && whaleData.whale_behavior !== 'unknown' && (
                  <div className={cn(
                    "col-span-2 flex items-center gap-2 p-2 rounded-sm text-xs",
                    whaleData.whale_behavior === 'accumulating' || whaleData.whale_behavior === 'position_building' ? "bg-bullish/10 text-bullish" :
                    whaleData.whale_behavior === 'distributing' || whaleData.whale_behavior === 'hunting_stops' ? "bg-bearish/10 text-bearish" :
                    "bg-yellow-500/10 text-yellow-400"
                  )}>
                    <span className="text-base">🐋</span>
                    <span>{t('whaleBehavior')}: {t(whaleData.whale_behavior)}</span>
                  </div>
                )}

                {/* Absorption Pattern - NEW */}
                {whaleData.absorption_detected && (
                  <div className={cn(
                    "flex items-center gap-2 p-2 rounded-sm text-xs",
                    whaleData.accumulation_distribution === 'accumulation' ? "bg-bullish/10 text-bullish" : 
                    whaleData.accumulation_distribution === 'distribution' ? "bg-bearish/10 text-bearish" : 
                    "bg-yellow-500/10 text-yellow-400"
                  )}>
                    <Waves className="w-3 h-3" />
                    <span>{t('absorption')}: {t(whaleData.accumulation_distribution || 'detected')}</span>
                  </div>
                )}

                {/* Volume Spike */}
                <div className={cn(
                  "flex items-center gap-2 p-2 rounded-sm text-xs",
                  whaleData.volume_spike ? "bg-yellow-500/10 text-yellow-400" : "bg-crypto-surface/20 text-zinc-500"
                )}>
                  <Waves className="w-3 h-3" />
                  <span>{t('volumeSpike')}: {whaleData.volume_spike ? `${whaleData.volume_ratio?.toFixed(1)}x` : t('none')}</span>
                </div>
                
                {/* Liquidation Bias */}
                <div className={cn(
                  "flex items-center gap-2 p-2 rounded-sm text-xs",
                  whaleData.liquidation_bias ? (
                    whaleData.liquidation_bias === 'shorts_liquidated' ? "bg-bullish/10 text-bullish" : "bg-bearish/10 text-bearish"
                  ) : "bg-crypto-surface/20 text-zinc-500"
                )}>
                  <BarChart3 className="w-3 h-3" />
                  <span>
                    {whaleData.liquidation_bias === 'shorts_liquidated' ? t('shortSqueeze') :
                     whaleData.liquidation_bias === 'longs_liquidated' ? t('longCascade') : t('balanced')}
                  </span>
                </div>

                {/* Order Book Aggression */}
                {whaleData.orderbook_aggression && (
                  <div className={cn(
                    "col-span-2 flex items-center gap-2 p-2 rounded-sm text-xs",
                    whaleData.orderbook_aggression === 'aggressive_buying' ? "bg-bullish/10 text-bullish" : "bg-bearish/10 text-bearish"
                  )}>
                    <Activity className="w-3 h-3" />
                    <span>
                      {whaleData.orderbook_aggression === 'aggressive_buying' ? t('aggressiveBuying') : t('aggressiveSelling')}
                    </span>
                  </div>
                )}

                {/* Liquidation Zones - NEW */}
                {whaleData.liquidation_zones && whaleData.liquidation_zones.length > 0 && (
                  <div className="col-span-2 space-y-1">
                    <div className="text-[10px] text-zinc-500 uppercase">{t('liquidationZones')}</div>
                    {whaleData.liquidation_zones.slice(0, 2).map((zone, idx) => (
                      <div key={idx} className={cn(
                        "flex items-center justify-between p-2 rounded-sm text-xs",
                        zone.distance_percent < 0 ? "bg-bearish/10" : "bg-bullish/10"
                      )}>
                        <span className={zone.distance_percent < 0 ? "text-bearish" : "text-bullish"}>
                          ${zone.price?.toLocaleString()}
                        </span>
                        <span className="text-zinc-400">
                          {zone.distance_percent > 0 ? '+' : ''}{zone.distance_percent?.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Explanation */}
            <div className="pt-3 border-t border-white/5">
              <p className="text-xs text-zinc-400">{whaleData.explanation}</p>
            </div>

            {/* Signals List */}
            {!compact && whaleData.signals && whaleData.signals.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase">{t('detectedSignals')}</div>
                {whaleData.signals.slice(0, 4).map((signal, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="w-1 h-1 rounded-full bg-whale" />
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
            <span className="text-xs">{t('loading')}</span>
          </div>
        )}
      </div>

      {/* Help Overlay - Learn Mode - Enhanced Context */}
      <HelpOverlay 
        show={learnMode}
        cardType="whale_activity"
        language={language}
        contextData={{
          direction: whaleData?.direction,
          strength: whaleData?.strength,
          // Pressure analysis
          buyPressure: whaleData?.buy_pressure,
          sellPressure: whaleData?.sell_pressure,
          // Behavior patterns
          whaleBehavior: whaleData?.whale_behavior,
          oiDivergence: whaleData?.oi_divergence,
          oiDivergenceStrength: whaleData?.oi_divergence_strength,
          // Market mechanics
          absorptionDetected: whaleData?.absorption_detected,
          accumulationDistribution: whaleData?.accumulation_distribution,
          volumeSpike: whaleData?.volume_spike,
          volumeRatio: whaleData?.volume_ratio,
          // Liquidation context
          liquidationBias: whaleData?.liquidation_bias,
          orderbookAggression: whaleData?.orderbook_aggression,
          // Signals count
          signalsCount: whaleData?.signals?.length || 0
        }}
      />
    </div>
  );
}

export default WhaleAlertCard;
