import React from 'react';
import { HelpCircle, TrendingUp, TrendingDown, Minus, Target, Shield, Activity } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';

export function PatternCard({ compact = false }) {
  const { t, patterns, learnMode } = useApp();
  const { patterns: patternList = [], data_source = '' } = patterns || {};

  const formatPrice = (p) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(p);
  };

  const getDirectionIcon = (direction) => {
    switch (direction) {
      case 'BULLISH':
        return <TrendingUp className="w-4 h-4 text-bullish" />;
      case 'BEARISH':
        return <TrendingDown className="w-4 h-4 text-bearish" />;
      default:
        return <Minus className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getStrengthBadge = (strength) => {
    if (!strength) return null;
    const colors = {
      'forming': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'confirmed': 'bg-bullish/20 text-bullish border-bullish/30',
      'completed': 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
    };
    return (
      <span className={cn(
        "text-[9px] uppercase px-1.5 py-0.5 rounded border font-mono",
        colors[strength] || colors['forming']
      )}>
        {strength}
      </span>
    );
  };

  return (
    <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden tech-card" data-testid="pattern-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-whale" />
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
        {data_source && <span className="text-xs text-zinc-500 font-mono">{data_source}</span>}
      </div>

      {/* Content */}
      <div className="p-4">
        <ScrollArea className={compact ? "h-[200px]" : "h-[300px]"}>
          {patternList.length > 0 ? (
            <div className="space-y-3">
              {patternList.map((pattern, idx) => {
                const isBullish = pattern.direction === 'BULLISH';
                const isBearish = pattern.direction === 'BEARISH';
                
                return (
                  <div 
                    key={pattern.id || idx}
                    className={cn(
                      "p-3 rounded-sm border-l-2",
                      isBullish ? "bg-bullish/5 border-bullish" :
                      isBearish ? "bg-bearish/5 border-bearish" :
                      "bg-zinc-500/5 border-zinc-500"
                    )}
                  >
                    {/* Pattern Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getDirectionIcon(pattern.direction)}
                        <span className="font-semibold text-sm">{pattern.pattern}</span>
                        {getStrengthBadge(pattern.pattern_strength)}
                      </div>
                      <span className={cn(
                        "font-mono text-xs font-bold",
                        isBullish ? "text-bullish" : isBearish ? "text-bearish" : "text-zinc-400"
                      )}>
                        {pattern.confidence?.toFixed(0)}%
                      </span>
                    </div>

                    {/* Price Targets */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        <Target className="w-3 h-3 text-whale" />
                        <span className="text-[10px] text-zinc-500">Target:</span>
                        <span className="font-mono text-xs">${formatPrice(pattern.target_price)}</span>
                      </div>
                      {pattern.stop_loss && (
                        <div className="flex items-center gap-1">
                          <Shield className="w-3 h-3 text-bearish" />
                          <span className="text-[10px] text-zinc-500">SL:</span>
                          <span className="font-mono text-xs">${formatPrice(pattern.stop_loss)}</span>
                        </div>
                      )}
                    </div>

                    {/* Expected Move */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-zinc-500">Expected Move:</span>
                      <span className={cn(
                        "font-mono text-sm font-bold",
                        pattern.estimated_move > 0 ? "text-bullish" : "text-bearish"
                      )}>
                        {pattern.estimated_move > 0 ? '+' : ''}{pattern.estimated_move?.toFixed(2)}%
                      </span>
                    </div>

                    {/* Explanation */}
                    {pattern.explanation && (
                      <div className="mt-2 pt-2 border-t border-white/5">
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          {pattern.explanation}
                        </p>
                      </div>
                    )}

                    {/* Timeframe */}
                    <div className="flex justify-end mt-2">
                      <span className="text-[10px] text-zinc-500">{pattern.timeframe}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <Activity className="w-8 h-8 mb-2 opacity-30" />
              <span className="text-xs">No patterns detected</span>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

export default PatternCard;
