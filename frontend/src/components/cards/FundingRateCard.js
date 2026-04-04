import React from 'react';
import { Percent, TrendingUp, TrendingDown, AlertTriangle, HelpCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { HelpOverlay } from '../ui/HelpOverlay';

export function FundingRateCard() {
  const { fundingRate, learnMode, t, language } = useApp();

  if (!fundingRate) {
    return (
      <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm p-4 animate-pulse">
        <div className="h-6 bg-crypto-surface rounded w-1/2 mb-4" />
        <div className="h-24 bg-crypto-surface rounded" />
      </div>
    );
  }

  const { current_rate, annualized_rate, payer, sentiment, overcrowded, signal_text, data_source } = fundingRate;

  const isPositive = current_rate > 0;
  const rateColor = isPositive ? 'bullish' : current_rate < 0 ? 'bearish' : 'zinc-400';
  const SentimentIcon = sentiment === 'bullish' ? TrendingUp : sentiment === 'bearish' ? TrendingDown : null;

  const formatRate = (rate) => {
    const sign = rate >= 0 ? '+' : '';
    return `${sign}${(rate * 100).toFixed(4)}%`;
  };

  return (
    <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden tech-card" data-testid="funding-rate-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Percent className="w-4 h-4 text-yellow-400" />
          <h3 className="font-heading font-semibold text-sm uppercase tracking-wider">Funding Rate</h3>
          {learnMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-whale cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-crypto-surface border-crypto-border">
                  <p className="text-xs">Funding rate is paid between long and short traders. Positive = longs pay shorts (bullish sentiment). Negative = shorts pay longs (bearish sentiment).</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <span className="text-xs text-zinc-500 font-mono">{data_source}</span>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Current Rate */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-zinc-500 mb-1">Current Rate</div>
            <div className={cn("text-2xl font-mono font-bold", `text-${rateColor}`)}>
              {formatRate(current_rate)}
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-sm",
            sentiment === 'bullish' && "bg-bullish/10 text-bullish",
            sentiment === 'bearish' && "bg-bearish/10 text-bearish",
            sentiment === 'neutral' && "bg-zinc-800 text-zinc-400"
          )}>
            {SentimentIcon && <SentimentIcon className="w-4 h-4" />}
            <span className="text-xs font-mono uppercase">{sentiment}</span>
          </div>
        </div>

        {/* Annualized & Payer */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-crypto-surface/50 p-3 rounded-sm">
            <div className="text-xs text-zinc-500 mb-1">Annualized</div>
            <div className={cn("font-mono font-bold text-lg", `text-${rateColor}`)}>
              {annualized_rate > 0 ? '+' : ''}{annualized_rate.toFixed(1)}%
            </div>
          </div>
          <div className="bg-crypto-surface/50 p-3 rounded-sm">
            <div className="text-xs text-zinc-500 mb-1">Payer</div>
            <div className="font-mono font-bold text-lg capitalize">
              {payer}
            </div>
          </div>
        </div>

        {/* Overcrowded Warning */}
        {overcrowded && (
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-sm mb-4",
            overcrowded === 'longs' ? "bg-bearish/10 border border-bearish/20" : "bg-bullish/10 border border-bullish/20"
          )}>
            <AlertTriangle className={cn("w-4 h-4", overcrowded === 'longs' ? "text-bearish" : "text-bullish")} />
            <span className="text-xs font-medium">
              {overcrowded === 'longs' ? 'Longs overcrowded - squeeze risk!' : 'Shorts overcrowded - squeeze risk!'}
            </span>
          </div>
        )}

        {/* Signal */}
        <div className="pt-3 border-t border-white/5">
          <p className="text-xs text-zinc-400 leading-relaxed">{signal_text}</p>
        </div>
      </div>

      {/* Help Overlay - Learn Mode - Enhanced Context */}
      <HelpOverlay 
        show={learnMode}
        cardType="funding_rate"
        language={language}
        contextData={{
          rate: current_rate,
          annualizedRate: annualized_rate,
          // Who is paying
          payer: payer,
          sentiment: sentiment,
          // Crowding analysis
          overcrowded: overcrowded,
          // Signal
          signal: signal_text
        }}
      />
    </div>
  );
}

export default FundingRateCard;
