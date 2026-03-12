import React from 'react';
import { HelpCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

export function PatternCard({ compact = false }) {
  const { t, patterns, learnMode } = useApp();

  const formatPrice = (p) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(p);
  };

  return (
    <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden tech-card" data-testid="pattern-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-semibold text-sm uppercase tracking-wider">{t('patterns')}</h3>
          {learnMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-whale cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-crypto-surface border-crypto-border">
                  <p className="text-xs">{t('learnPatterns')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <span className="text-xs text-zinc-500 font-mono">{patterns.length} detected</span>
      </div>

      {/* Content */}
      <div className="p-4">
        <ScrollArea className={compact ? "h-[200px]" : "h-[300px]"}>
          {patterns.length > 0 ? (
            <div className="space-y-3">
              {patterns.map((pattern, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "p-3 rounded-sm border",
                    pattern.direction === 'BULLISH' 
                      ? "bg-bullish/5 border-bullish/20" 
                      : "bg-bearish/5 border-bearish/20"
                  )}
                >
                  {/* Pattern header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {pattern.direction === 'BULLISH' ? (
                        <TrendingUp className="w-4 h-4 text-bullish" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-bearish" />
                      )}
                      <span className="font-medium text-sm">{pattern.pattern}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs font-mono",
                        pattern.direction === 'BULLISH' 
                          ? "border-bullish/50 text-bullish" 
                          : "border-bearish/50 text-bearish"
                      )}
                    >
                      {pattern.direction}
                    </Badge>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-zinc-500">{t('confidence')}: </span>
                      <span className="font-mono">{pattern.confidence.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">{t('estimatedMove')}: </span>
                      <span className={cn(
                        "font-mono",
                        pattern.estimated_move > 0 ? "text-bullish" : "text-bearish"
                      )}>
                        {pattern.estimated_move > 0 ? '+' : ''}{pattern.estimated_move.toFixed(2)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">{t('target')}: </span>
                      <span className="font-mono">${formatPrice(pattern.target_price)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">{t('timeframe')}: </span>
                      <span className="font-mono">{pattern.timeframe}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
              No patterns detected
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

export default PatternCard;
