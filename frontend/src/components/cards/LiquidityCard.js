import React from 'react';
import { HelpCircle, ArrowUpCircle, ArrowDownCircle, MinusCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Progress } from '../ui/progress';

export function LiquidityCard({ compact = false }) {
  const { t, liquidity, learnMode } = useApp();
  const { clusters = [], direction } = liquidity || {};

  const aboveClusters = clusters.filter(c => c.side === 'above').slice(0, compact ? 3 : 5);
  const belowClusters = clusters.filter(c => c.side === 'below').slice(0, compact ? 3 : 5);

  const formatPrice = (p) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(p);
  };

  const DirectionIcon = direction?.direction === 'UP' ? ArrowUpCircle : 
                        direction?.direction === 'DOWN' ? ArrowDownCircle : MinusCircle;
  const directionColor = direction?.direction === 'UP' ? 'bullish' : 
                         direction?.direction === 'DOWN' ? 'bearish' : 'zinc-400';

  return (
    <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden tech-card" data-testid="liquidity-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-semibold text-sm uppercase tracking-wider">{t('liquidity')}</h3>
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
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Direction indicator */}
        {direction && (
          <div className={cn(
            "flex items-center justify-between p-3 rounded-sm mb-4",
            direction.direction === 'UP' && "bg-bullish/10 border border-bullish/20",
            direction.direction === 'DOWN' && "bg-bearish/10 border border-bearish/20",
            direction.direction === 'BALANCED' && "bg-zinc-800 border border-zinc-700"
          )}>
            <div className="flex items-center gap-2">
              <DirectionIcon className={cn("w-5 h-5", `text-${directionColor}`)} />
              <div>
                <div className="text-xs text-zinc-500">{t('liquidityDirection')}</div>
                <div className={cn("font-mono font-bold", `text-${directionColor}`)}>
                  {t(direction.direction.toLowerCase())}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-zinc-500">{t('nextTarget')}</div>
              <div className="font-mono text-sm">${formatPrice(direction.next_target)}</div>
              <div className={cn(
                "text-xs font-mono",
                direction.distance_percent > 0 ? "text-bullish" : "text-bearish"
              )}>
                {direction.distance_percent > 0 ? '+' : ''}{direction.distance_percent.toFixed(2)}%
              </div>
            </div>
          </div>
        )}

        {/* Liquidity clusters */}
        <div className="space-y-3">
          {/* Above price */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500 uppercase">{t('above')}</span>
              <span className="text-xs text-bearish">{aboveClusters.length} zones</span>
            </div>
            {aboveClusters.map((cluster, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs w-24">${formatPrice(cluster.price)}</span>
                <Progress 
                  value={cluster.strength === 'high' ? 90 : cluster.strength === 'medium' ? 60 : 30} 
                  className="h-1.5 flex-1 bg-zinc-800"
                  indicatorClassName="bg-bearish"
                />
                <span className="text-xs text-bearish font-mono w-12 text-right">
                  +{cluster.distance_percent.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>

          {/* Below price */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500 uppercase">{t('below')}</span>
              <span className="text-xs text-bullish">{belowClusters.length} zones</span>
            </div>
            {belowClusters.map((cluster, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs w-24">${formatPrice(cluster.price)}</span>
                <Progress 
                  value={cluster.strength === 'high' ? 90 : cluster.strength === 'medium' ? 60 : 30} 
                  className="h-1.5 flex-1 bg-zinc-800"
                  indicatorClassName="bg-bullish"
                />
                <span className="text-xs text-bullish font-mono w-12 text-right">
                  {cluster.distance_percent.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiquidityCard;
