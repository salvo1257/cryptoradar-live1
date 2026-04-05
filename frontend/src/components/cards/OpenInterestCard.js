import React from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3, HelpCircle, AlertTriangle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Progress } from '../ui/progress';
import { HelpOverlay } from '../ui/HelpOverlay';
import { DataFreshnessBadge } from './DataFreshnessIndicator';

export function OpenInterestCard() {
  const { openInterest, learnMode, t, language } = useApp();

  if (!openInterest) {
    return (
      <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm p-4 animate-pulse">
        <div className="h-6 bg-crypto-surface rounded w-1/2 mb-4" />
        <div className="h-24 bg-crypto-surface rounded" />
      </div>
    );
  }

  const { total_oi, change_1h, change_4h, change_24h, trend, exchanges, signal, data_source, data_available, freshness_status, age_seconds } = openInterest;

  // Handle unavailable data state
  if (data_available === false) {
    return (
      <div className="bg-crypto-card/60 backdrop-blur-sm border border-red-500/30 rounded-sm overflow-hidden tech-card" data-testid="open-interest-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-red-400" />
            <h3 className="font-heading font-semibold text-sm uppercase tracking-wider">Open Interest</h3>
          </div>
          <DataFreshnessBadge status="unavailable" />
        </div>
        <div className="p-6 flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mb-3" />
          <p className="text-sm text-red-300 font-medium">Data Unavailable</p>
          <p className="text-xs text-zinc-500 mt-1">CoinGlass API not responding. No simulated data used.</p>
        </div>
      </div>
    );
  }

  const TrendIcon = trend === 'increasing' ? TrendingUp : trend === 'decreasing' ? TrendingDown : Minus;
  const trendColor = trend === 'increasing' ? 'bullish' : trend === 'decreasing' ? 'bearish' : 'zinc-400';

  const formatChange = (val) => {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}%`;
  };

  const getChangeColor = (val) => {
    if (val > 1) return 'text-bullish';
    if (val < -1) return 'text-bearish';
    return 'text-zinc-400';
  };

  return (
    <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden tech-card" data-testid="open-interest-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <h3 className="font-heading font-semibold text-sm uppercase tracking-wider">Open Interest</h3>
          {learnMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-whale cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-crypto-surface border-crypto-border">
                  <p className="text-xs">Open Interest shows total outstanding derivative contracts. Rising OI with rising price = bullish. Rising OI with falling price = bearish.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <span className="text-xs text-zinc-500 font-mono">{data_source}</span>
        {freshness_status && (
          <DataFreshnessBadge status={freshness_status} ageSeconds={age_seconds} source={data_source} />
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Total OI */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-zinc-500 mb-1">Total OI</div>
            <div className="text-2xl font-mono font-bold">${total_oi}B</div>
          </div>
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-sm",
            trend === 'increasing' && "bg-bullish/10 text-bullish",
            trend === 'decreasing' && "bg-bearish/10 text-bearish",
            trend === 'stable' && "bg-zinc-800 text-zinc-400"
          )}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-xs font-mono uppercase">{trend}</span>
          </div>
        </div>

        {/* Changes */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-crypto-surface/50 p-2 rounded-sm text-center">
            <div className="text-xs text-zinc-500 mb-1">1H</div>
            <div className={cn("font-mono font-bold text-sm", getChangeColor(change_1h))}>
              {formatChange(change_1h)}
            </div>
          </div>
          <div className="bg-crypto-surface/50 p-2 rounded-sm text-center">
            <div className="text-xs text-zinc-500 mb-1">4H</div>
            <div className={cn("font-mono font-bold text-sm", getChangeColor(change_4h))}>
              {formatChange(change_4h)}
            </div>
          </div>
          <div className="bg-crypto-surface/50 p-2 rounded-sm text-center">
            <div className="text-xs text-zinc-500 mb-1">24H</div>
            <div className={cn("font-mono font-bold text-sm", getChangeColor(change_24h))}>
              {formatChange(change_24h)}
            </div>
          </div>
        </div>

        {/* Exchange distribution */}
        <div className="mb-4">
          <div className="text-xs text-zinc-500 mb-2">Exchange Distribution</div>
          <div className="space-y-1.5">
            {exchanges?.slice(0, 4).map((ex, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 w-16">{ex.name}</span>
                <Progress 
                  value={ex.share} 
                  className="h-1.5 flex-1 bg-zinc-800"
                  indicatorClassName="bg-blue-500"
                />
                <span className="text-xs font-mono text-zinc-500 w-10 text-right">{ex.share}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Signal */}
        <div className="pt-3 border-t border-white/5">
          <p className="text-xs text-zinc-400 leading-relaxed">{signal}</p>
        </div>
      </div>

      {/* Help Overlay - Learn Mode - Enhanced Context */}
      <HelpOverlay 
        show={learnMode}
        cardType="open_interest"
        language={language}
        contextData={{
          // OI changes across timeframes
          change1h: openInterest.change_1h,
          change4h: openInterest.change_4h,
          change24h: openInterest.change_24h,
          trend: openInterest.trend,
          totalOI: openInterest.total_oi,
          // Signal interpretation
          signal: openInterest.signal
        }}
      />
    </div>
  );
}

export default OpenInterestCard;
