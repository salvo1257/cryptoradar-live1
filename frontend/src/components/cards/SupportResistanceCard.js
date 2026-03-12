import React from 'react';
import { HelpCircle, ArrowUp, ArrowDown, Globe } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';

export function SupportResistanceCard({ compact = false }) {
  const { t, supportResistance, learnMode } = useApp();
  const { levels = [], current_price = 0, data_source = '' } = supportResistance || {};

  const supports = levels.filter(l => l.level_type === 'support').slice(0, compact ? 3 : 5);
  const resistances = levels.filter(l => l.level_type === 'resistance').slice(0, compact ? 3 : 5);

  const formatPrice = (p) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(p);
  };

  const formatVolume = (v) => {
    if (!v) return '';
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  };

  const getStrengthColor = (strength) => {
    switch (strength) {
      case 'strong': return 'text-white';
      case 'moderate': return 'text-zinc-300';
      default: return 'text-zinc-500';
    }
  };

  const LevelRow = ({ level, type }) => {
    const isBullish = type === 'support';
    const colorClass = isBullish ? 'bullish' : 'bearish';
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={cn(
                "flex flex-col py-2 px-2 rounded-sm cursor-help",
                `bg-${colorClass}/5 border-l-2 border-${colorClass}`
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("font-mono text-sm", getStrengthColor(level.strength))}>
                  ${formatPrice(level.price)}
                </span>
                <div className="flex items-center gap-2">
                  {level.volume_at_level && (
                    <span className="text-xs text-zinc-400 font-mono">
                      {formatVolume(level.volume_at_level)}
                    </span>
                  )}
                  <span className={cn("text-xs font-mono", isBullish ? "text-bullish" : "text-bearish")}>
                    {isBullish ? '' : '+'}{level.distance_percent?.toFixed(2)}%
                  </span>
                </div>
              </div>
              {level.exchanges && level.exchanges.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Globe className="w-2.5 h-2.5 text-zinc-500" />
                  <span className="text-[10px] text-zinc-500">{level.exchanges.join(', ')}</span>
                </div>
              )}
            </div>
          </TooltipTrigger>
          {level.explanation && (
            <TooltipContent className="max-w-xs bg-crypto-surface border-crypto-border">
              <p className="text-xs">{level.explanation}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden tech-card" data-testid="sr-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-semibold text-sm uppercase tracking-wider">{t('supportResistance')}</h3>
          {learnMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-whale cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-crypto-surface border-crypto-border">
                  <p className="text-xs">{t('learnSupportResistance')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {data_source && <span className="text-xs text-zinc-500 font-mono">{data_source}</span>}
      </div>

      {/* Content */}
      <div className="p-4">
        <ScrollArea className={compact ? "h-[200px]" : "h-[300px]"}>
          {/* Resistance levels */}
          <div className="mb-4">
            <div className="flex items-center gap-1 mb-2">
              <ArrowUp className="w-3 h-3 text-bearish" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">{t('resistance')}</span>
            </div>
            <div className="space-y-1">
              {resistances.length > 0 ? resistances.map((level, idx) => (
                <LevelRow key={idx} level={level} type="resistance" />
              )) : (
                <div className="text-xs text-zinc-500 text-center py-2">No resistance levels</div>
              )}
            </div>
          </div>

          {/* Current price indicator */}
          <div className="flex items-center gap-2 my-3">
            <div className="flex-1 h-px bg-white/20" />
            <span className="font-mono text-xs text-white px-2 py-0.5 bg-white/10 rounded-sm">
              ${formatPrice(current_price)}
            </span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          {/* Support levels */}
          <div>
            <div className="flex items-center gap-1 mb-2">
              <ArrowDown className="w-3 h-3 text-bullish" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">{t('support')}</span>
            </div>
            <div className="space-y-1">
              {supports.length > 0 ? supports.map((level, idx) => (
                <LevelRow key={idx} level={level} type="support" />
              )) : (
                <div className="text-xs text-zinc-500 text-center py-2">No support levels</div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export default SupportResistanceCard;
