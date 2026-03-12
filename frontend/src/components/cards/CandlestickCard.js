import React from 'react';
import { HelpCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

export function CandlestickCard({ compact = false }) {
  const { t, candlestickPatterns, learnMode } = useApp();

  const getSignalColor = (signal) => {
    switch (signal) {
      case 'BULLISH': return 'bullish';
      case 'BEARISH': return 'bearish';
      default: return 'zinc-400';
    }
  };

  return (
    <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden tech-card" data-testid="candlestick-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-semibold text-sm uppercase tracking-wider">{t('candlesticks')}</h3>
          {learnMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-whale cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-crypto-surface border-crypto-border">
                  <p className="text-xs">{t('learnCandlesticks')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <span className="text-xs text-zinc-500 font-mono">{candlestickPatterns.length} signals</span>
      </div>

      {/* Content */}
      <div className="p-4">
        <ScrollArea className={compact ? "h-[200px]" : "h-[300px]"}>
          {candlestickPatterns.length > 0 ? (
            <div className="space-y-3">
              {candlestickPatterns.map((pattern, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "p-3 rounded-sm border",
                    pattern.signal === 'BULLISH' && "bg-bullish/5 border-bullish/20",
                    pattern.signal === 'BEARISH' && "bg-bearish/5 border-bearish/20",
                    pattern.signal === 'NEUTRAL' && "bg-zinc-800/50 border-zinc-700"
                  )}
                >
                  {/* Pattern header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{pattern.pattern}</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs font-mono",
                        `border-${getSignalColor(pattern.signal)}/50`,
                        `text-${getSignalColor(pattern.signal)}`
                      )}
                    >
                      {pattern.signal}
                    </Badge>
                  </div>

                  {/* Confidence */}
                  <div className="text-xs mb-2">
                    <span className="text-zinc-500">{t('confidence')}: </span>
                    <span className="font-mono">{pattern.confidence.toFixed(1)}%</span>
                  </div>

                  {/* Explanation */}
                  <p className="text-xs text-zinc-400">{pattern.explanation}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
              No candlestick patterns detected
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

export default CandlestickCard;
