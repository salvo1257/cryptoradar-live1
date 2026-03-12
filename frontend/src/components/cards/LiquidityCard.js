import React from 'react';
import { HelpCircle, ArrowUp, ArrowDown, Minus, Globe, Droplets } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';

export function LiquidityCard({ compact = false }) {
  const { t, liquidity, learnMode } = useApp();
  const { clusters = [], direction, data_source, exchange_stats } = liquidity || {};

  const formatPrice = (p) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(p);
  };

  const formatValue = (v) => {
    if (!v) return '';
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  };

  const getDirectionIcon = () => {
    switch (direction?.direction) {
      case 'UP':
        return <ArrowUp className="w-5 h-5 text-bullish" />;
      case 'DOWN':
        return <ArrowDown className="w-5 h-5 text-bearish" />;
      default:
        return <Minus className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getStrengthColor = (strength) => {
    switch (strength) {
      case 'high': return 'border-whale text-white';
      case 'medium': return 'border-zinc-500 text-zinc-300';
      default: return 'border-zinc-700 text-zinc-500';
    }
  };

  const aboveClusters = clusters.filter(c => c.side === 'above').slice(0, compact ? 3 : 5);
  const belowClusters = clusters.filter(c => c.side === 'below').slice(0, compact ? 3 : 5);

  return (
    <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden tech-card" data-testid="liquidity-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-whale" />
          <h3 className="font-heading font-semibold text-sm uppercase tracking-wider">{t('liquidityDirection')}</h3>
          {learnMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-whale cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-crypto-surface border-crypto-border">
                  <p className="text-xs">{t('learnLiquidity')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {data_source && <span className="text-xs text-zinc-500 font-mono">{data_source}</span>}
      </div>

      {/* Direction Summary */}
      {direction && (
        <div className={cn(
          "px-4 py-3 border-b border-white/5",
          direction.direction === 'UP' ? "bg-bullish/5" :
          direction.direction === 'DOWN' ? "bg-bearish/5" :
          "bg-zinc-500/5"
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getDirectionIcon()}
              <span className={cn(
                "font-mono font-bold",
                direction.direction === 'UP' ? "text-bullish" :
                direction.direction === 'DOWN' ? "text-bearish" :
                "text-zinc-400"
              )}>
                {direction.direction}
              </span>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm">${formatPrice(direction.next_target)}</div>
              <div className={cn(
                "font-mono text-xs",
                direction.distance_percent > 0 ? "text-bullish" : "text-bearish"
              )}>
                {direction.distance_percent > 0 ? '+' : ''}{direction.distance_percent?.toFixed(2)}%
              </div>
            </div>
          </div>
          {direction.explanation && (
            <p className="text-xs text-zinc-400 leading-relaxed">{direction.explanation}</p>
          )}
        </div>
      )}

      {/* Exchange Stats */}
      {exchange_stats && Object.keys(exchange_stats).length > 0 && (
        <div className="px-4 py-2 border-b border-white/5 bg-black/20">
          <div className="flex items-center gap-1 mb-1">
            <Globe className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] text-zinc-500 uppercase">Exchange Depth</span>
          </div>
          <div className="flex gap-2">
            {Object.entries(exchange_stats).map(([ex, stats]) => (
              <div key={ex} className="flex-1 text-center">
                <div className="text-[10px] text-zinc-500">{ex}</div>
                <div className={cn(
                  "font-mono text-xs",
                  stats.imbalance > 10 ? "text-bullish" :
                  stats.imbalance < -10 ? "text-bearish" :
                  "text-zinc-400"
                )}>
                  {stats.imbalance > 0 ? '+' : ''}{stats.imbalance?.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <ScrollArea className={compact ? "h-[180px]" : "h-[250px]"}>
          {/* Above (Resistance/Sell) Clusters */}
          <div className="mb-4">
            <div className="flex items-center gap-1 mb-2">
              <ArrowUp className="w-3 h-3 text-bearish" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Liquidity Above</span>
            </div>
            <div className="space-y-1">
              {aboveClusters.length > 0 ? aboveClusters.map((cluster, idx) => (
                <TooltipProvider key={idx}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className={cn(
                          "flex items-center justify-between py-2 px-2 rounded-sm border-l-2 cursor-help bg-bearish/5",
                          getStrengthColor(cluster.strength)
                        )}
                      >
                        <div className="flex flex-col">
                          <span className="font-mono text-sm">${formatPrice(cluster.price)}</span>
                          {cluster.exchanges && (
                            <span className="text-[9px] text-zinc-500">{cluster.exchanges.join(', ')}</span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-xs text-bearish">
                            +{cluster.distance_percent?.toFixed(2)}%
                          </div>
                          {cluster.estimated_value > 0 && (
                            <div className="text-[10px] text-zinc-500">
                              {formatValue(cluster.estimated_value)}
                            </div>
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    {cluster.explanation && (
                      <TooltipContent className="max-w-xs bg-crypto-surface border-crypto-border">
                        <p className="text-xs">{cluster.explanation}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )) : (
                <div className="text-xs text-zinc-500 text-center py-2">No liquidity above</div>
              )}
            </div>
          </div>

          {/* Below (Support/Buy) Clusters */}
          <div>
            <div className="flex items-center gap-1 mb-2">
              <ArrowDown className="w-3 h-3 text-bullish" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Liquidity Below</span>
            </div>
            <div className="space-y-1">
              {belowClusters.length > 0 ? belowClusters.map((cluster, idx) => (
                <TooltipProvider key={idx}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className={cn(
                          "flex items-center justify-between py-2 px-2 rounded-sm border-l-2 cursor-help bg-bullish/5",
                          getStrengthColor(cluster.strength)
                        )}
                      >
                        <div className="flex flex-col">
                          <span className="font-mono text-sm">${formatPrice(cluster.price)}</span>
                          {cluster.exchanges && (
                            <span className="text-[9px] text-zinc-500">{cluster.exchanges.join(', ')}</span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-xs text-bullish">
                            {cluster.distance_percent?.toFixed(2)}%
                          </div>
                          {cluster.estimated_value > 0 && (
                            <div className="text-[10px] text-zinc-500">
                              {formatValue(cluster.estimated_value)}
                            </div>
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    {cluster.explanation && (
                      <TooltipContent className="max-w-xs bg-crypto-surface border-crypto-border">
                        <p className="text-xs">{cluster.explanation}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )) : (
                <div className="text-xs text-zinc-500 text-center py-2">No liquidity below</div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export default LiquidityCard;
