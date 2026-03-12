import React from 'react';
import { TrendingUp, TrendingDown, Minus, Activity, HelpCircle, Target } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Progress } from '../ui/progress';

export function MarketBiasCard() {
  const { t, marketBias, learnMode } = useApp();

  if (!marketBias) {
    return (
      <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm p-4 animate-pulse">
        <div className="h-6 bg-crypto-surface rounded w-1/2 mb-4" />
        <div className="h-16 bg-crypto-surface rounded" />
      </div>
    );
  }

  const { bias, confidence, estimated_move, trap_risk, squeeze_probability, next_target, bias_score, analysis_text } = marketBias;

  const BiasIcon = bias === 'BULLISH' ? TrendingUp : bias === 'BEARISH' ? TrendingDown : Minus;
  const biasColor = bias === 'BULLISH' ? 'bullish' : bias === 'BEARISH' ? 'bearish' : 'zinc-400';

  const formatPrice = (p) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(p);
  };

  return (
    <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden tech-card" data-testid="market-bias-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-whale" />
          <h3 className="font-heading font-semibold text-sm uppercase tracking-wider">{t('marketBias')}</h3>
          {learnMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-whale cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-crypto-surface border-crypto-border">
                  <p className="text-xs">{t('learnMarketBias')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <span className={cn(
          "px-2 py-0.5 rounded-sm text-xs font-mono font-bold uppercase",
          bias === 'BULLISH' && "bg-bullish/10 text-bullish border border-bullish/20",
          bias === 'BEARISH' && "bg-bearish/10 text-bearish border border-bearish/20",
          bias === 'NEUTRAL' && "bg-zinc-800 text-zinc-400 border border-zinc-700"
        )}>
          {t(bias.toLowerCase())}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Main bias display */}
        <div className="flex items-center gap-4 mb-4">
          <div className={cn(
            "w-16 h-16 rounded-sm flex items-center justify-center flex-shrink-0",
            bias === 'BULLISH' && "bg-bullish/10 glow-bullish",
            bias === 'BEARISH' && "bg-bearish/10 glow-bearish",
            bias === 'NEUTRAL' && "bg-zinc-800"
          )}>
            <BiasIcon className={cn("w-8 h-8", `text-${biasColor}`)} />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-mono font-bold" data-testid="bias-confidence">
                {confidence.toFixed(0)}%
              </span>
              <span className="text-xs text-zinc-500 uppercase">{t('confidence')}</span>
            </div>
            <div className="mt-1">
              <Progress 
                value={confidence} 
                className="h-1.5 bg-zinc-800"
                indicatorClassName={cn(
                  bias === 'BULLISH' && "bg-bullish",
                  bias === 'BEARISH' && "bg-bearish",
                  bias === 'NEUTRAL' && "bg-zinc-500"
                )}
              />
            </div>
          </div>
        </div>

        {/* Next Target */}
        {next_target > 0 && (
          <div className={cn(
            "flex items-center justify-between p-3 rounded-sm mb-4",
            bias === 'BULLISH' && "bg-bullish/5 border border-bullish/20",
            bias === 'BEARISH' && "bg-bearish/5 border border-bearish/20",
            bias === 'NEUTRAL' && "bg-zinc-800/50 border border-zinc-700"
          )}>
            <div className="flex items-center gap-2">
              <Target className={cn("w-4 h-4", `text-${biasColor}`)} />
              <span className="text-xs text-zinc-400">Next Target</span>
            </div>
            <span className={cn("font-mono font-bold", `text-${biasColor}`)}>
              {formatPrice(next_target)}
            </span>
          </div>
        )}

        {/* Analysis text */}
        {analysis_text && (
          <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
            {analysis_text}
          </p>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-crypto-surface/50 p-2 rounded-sm text-center">
            <div className="text-xs text-zinc-500 mb-1">{t('estimatedMove')}</div>
            <div className={cn(
              "font-mono font-bold text-sm",
              estimated_move > 0 ? "text-bullish" : estimated_move < 0 ? "text-bearish" : "text-zinc-400"
            )}>
              {estimated_move > 0 ? '+' : ''}{estimated_move.toFixed(2)}%
            </div>
          </div>
          <div className="bg-crypto-surface/50 p-2 rounded-sm text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-zinc-500 mb-1">
              {t('trapRisk')}
              {learnMode && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-3 h-3 text-whale" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-crypto-surface border-crypto-border">
                      <p className="text-xs">{t('learnTrapRisk')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className={cn(
              "font-mono font-bold text-sm uppercase",
              trap_risk === 'high' ? "text-bearish" : trap_risk === 'moderate' ? "text-yellow-500" : "text-bullish"
            )}>
              {trap_risk}
            </div>
          </div>
          <div className="bg-crypto-surface/50 p-2 rounded-sm text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-zinc-500 mb-1">
              Squeeze %
              {learnMode && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-3 h-3 text-whale" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-crypto-surface border-crypto-border">
                      <p className="text-xs">{t('learnSqueeze')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <div className="font-mono font-bold text-sm text-whale">
              {squeeze_probability.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Bias Score */}
        {bias_score !== undefined && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-xs text-zinc-500">Bias Score</span>
            <span className={cn(
              "font-mono text-sm font-bold",
              bias_score > 0 ? "text-bullish" : bias_score < 0 ? "text-bearish" : "text-zinc-400"
            )}>
              {bias_score > 0 ? '+' : ''}{bias_score}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default MarketBiasCard;
