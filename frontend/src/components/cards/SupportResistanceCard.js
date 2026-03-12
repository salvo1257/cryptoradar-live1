import React from 'react';
import { HelpCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';

export function SupportResistanceCard({ compact = false }) {
  const { t, supportResistance, learnMode } = useApp();
  const { levels = [], current_price = 0 } = supportResistance || {};

  const supports = levels.filter(l => l.level_type === 'support').slice(0, compact ? 3 : 5);
  const resistances = levels.filter(l => l.level_type === 'resistance').slice(0, compact ? 3 : 5);

  const formatPrice = (p) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(p);
  };

  const getStrengthColor = (strength) => {
    switch (strength) {
      case 'strong': return 'text-white';
      case 'moderate': return 'text-zinc-300';
      default: return 'text-zinc-500';
    }
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
        <span className="font-mono text-xs text-zinc-500">
          ${formatPrice(current_price)}
        </span>
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
                <div 
                  key={idx} 
                  className="flex items-center justify-between py-1.5 px-2 bg-bearish/5 border-l-2 border-bearish rounded-sm"
                >
                  <span className={cn("font-mono text-sm", getStrengthColor(level.strength))}>
                    ${formatPrice(level.price)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-bearish font-mono">
                      +{Math.abs(level.distance_percent).toFixed(2)}%
                    </span>
                    <span className={cn(
                      "text-xs uppercase",
                      level.strength === 'strong' ? "text-white" : "text-zinc-500"
                    )}>
                      {level.strength}
                    </span>
                  </div>
                </div>
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
                <div 
                  key={idx} 
                  className="flex items-center justify-between py-1.5 px-2 bg-bullish/5 border-l-2 border-bullish rounded-sm"
                >
                  <span className={cn("font-mono text-sm", getStrengthColor(level.strength))}>
                    ${formatPrice(level.price)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-bullish font-mono">
                      {level.distance_percent.toFixed(2)}%
                    </span>
                    <span className={cn(
                      "text-xs uppercase",
                      level.strength === 'strong' ? "text-white" : "text-zinc-500"
                    )}>
                      {level.strength}
                    </span>
                  </div>
                </div>
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
