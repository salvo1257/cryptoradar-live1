import React from 'react';
import { TrendingUp, TrendingDown, Minus, Activity, HelpCircle, Target, Globe } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Progress } from '../ui/progress';
import { HelpOverlay } from '../ui/HelpOverlay';

export function MarketBiasCard() {
  const { t, marketBias, learnMode, language } = useApp();

  if (!marketBias) {
    return (
      <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm p-4 animate-pulse">
        <div className="h-6 bg-crypto-surface rounded w-1/2 mb-4" />
        <div className="h-16 bg-crypto-surface rounded" />
      </div>
    );
  }

  const { bias, confidence, estimated_move, trap_risk, squeeze_probability, next_target, bias_score, analysis_text, exchange_consensus } = marketBias;

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

  const getConsensusColor = (consensusBias) => {
    switch (consensusBias) {
      case 'BULLISH': return 'text-bullish';
      case 'BEARISH': return 'text-bearish';
      default: return 'text-zinc-400';
    }
  };

  return (
    <div className="premium-card rounded-lg overflow-hidden h-full" data-testid="market-bias-card">
      {/* Header - Premium */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-whale/20 shadow-neon-whale">
            <Activity className="w-5 h-5 text-whale" />
          </div>
          <h3 className="font-heading font-bold text-base uppercase tracking-wider">{t('marketBias')}</h3>
          {learnMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-4 h-4 text-whale cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-crypto-surface border-crypto-border">
                  <p className="text-xs">{t('learnMarketBias')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <span className={cn(
          "px-3 py-1.5 rounded-lg text-sm font-mono font-bold uppercase",
          bias === 'BULLISH' && "bg-bullish/15 text-bullish border border-bullish/30 shadow-neon-bullish",
          bias === 'BEARISH' && "bg-bearish/15 text-bearish border border-bearish/30 shadow-neon-bearish",
          bias === 'NEUTRAL' && "bg-zinc-800 text-zinc-400 border border-zinc-700"
        )}>
          {t(bias.toLowerCase())}
        </span>
      </div>

      {/* Content - More padding */}
      <div className="p-5">
        {/* Main bias display - Larger, with glow */}
        <div className="flex items-center gap-5 mb-5">
          <div className={cn(
            "w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
            bias === 'BULLISH' && "bg-bullish/15 shadow-neon-bullish",
            bias === 'BEARISH' && "bg-bearish/15 shadow-neon-bearish",
            bias === 'NEUTRAL' && "bg-zinc-800"
          )}>
            <BiasIcon className={cn(
              "w-10 h-10",
              bias === 'BULLISH' && "text-bullish drop-shadow-glow-bullish",
              bias === 'BEARISH' && "text-bearish drop-shadow-glow-bearish",
              bias === 'NEUTRAL' && "text-zinc-400"
            )} />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className={cn(
                "text-4xl font-mono font-bold",
                bias === 'BULLISH' && "text-bullish text-glow-bullish",
                bias === 'BEARISH' && "text-bearish text-glow-bearish",
                bias === 'NEUTRAL' && "text-zinc-400"
              )} data-testid="bias-confidence">
                {confidence.toFixed(0)}%
              </span>
              <span className="text-sm text-zinc-500 uppercase tracking-wide">{t('confidence')}</span>
            </div>
            <div className="mt-2">
              <Progress 
                value={confidence} 
                className="h-2 bg-zinc-800/80"
                indicatorClassName={cn(
                  bias === 'BULLISH' && "bg-bullish",
                  bias === 'BEARISH' && "bg-bearish",
                  bias === 'NEUTRAL' && "bg-zinc-500"
                )}
              />
            </div>
          </div>
        </div>

        {/* Exchange Consensus - Premium styling with larger fonts */}
        {exchange_consensus && Object.keys(exchange_consensus).length > 0 && (
          <div className="mb-5 p-4 bg-crypto-bg/50 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-zinc-500" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Exchange Consensus</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(exchange_consensus).map(([exchange, exBias]) => (
                <div key={exchange} className="text-center p-2 rounded-lg bg-crypto-surface/50">
                  <div className="text-xs text-zinc-400 font-medium mb-1">{exchange}</div>
                  <div className={cn(
                    "font-mono text-sm font-bold",
                    exBias === 'BULLISH' && "text-bullish",
                    exBias === 'BEARISH' && "text-bearish",
                    exBias !== 'BULLISH' && exBias !== 'BEARISH' && "text-zinc-500"
                  )}>
                    {exBias === 'BULLISH' ? '▲' : exBias === 'BEARISH' ? '▼' : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

      {/* Help Overlay - Learn Mode - Enhanced Context */}
      <HelpOverlay 
        show={learnMode}
        cardType="market_bias"
        language={language}
        contextData={{
          bias,
          confidence,
          biasScore: bias_score,
          // Risk factors
          trapRisk: trap_risk,
          squeezeProbability: squeeze_probability,
          // Targets & projections
          nextTarget: next_target,
          estimatedMove: estimated_move,
          // Exchange consensus
          exchangeConsensus: exchange_consensus
        }}
      />
    </div>
  );
}

export default MarketBiasCard;
