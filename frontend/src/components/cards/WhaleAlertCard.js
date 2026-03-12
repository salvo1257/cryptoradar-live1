import React from 'react';
import { HelpCircle, TrendingUp, TrendingDown, Target, Shield, Globe } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';

export function WhaleAlertCard({ compact = false }) {
  const { t, whaleAlerts, learnMode } = useApp();
  const { alerts = [], data_source = '' } = whaleAlerts || {};

  const formatPrice = (p) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(p);
  };

  const formatTime = (ts) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden tech-card" data-testid="whale-alert-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-semibold text-sm uppercase tracking-wider">{t('whaleAlerts')}</h3>
          {learnMode && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-3.5 h-3.5 text-whale cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-crypto-surface border-crypto-border">
                  <p className="text-xs">{t('learnWhaleAlerts')}</p>
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
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert, idx) => {
                const isLong = alert.signal === 'LONG';
                return (
                  <div 
                    key={alert.id || idx}
                    className={cn(
                      "p-3 rounded-sm border-l-2",
                      isLong 
                        ? "bg-bullish/5 border-bullish" 
                        : "bg-bearish/5 border-bearish"
                    )}
                  >
                    {/* Signal Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isLong ? (
                          <TrendingUp className="w-4 h-4 text-bullish" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-bearish" />
                        )}
                        <span className={cn(
                          "font-mono font-bold text-sm",
                          isLong ? "text-bullish" : "text-bearish"
                        )}>
                          {alert.signal}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">
                          {alert.confidence?.toFixed(0)}%
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500">
                        {formatTime(alert.timestamp)}
                      </span>
                    </div>

                    {/* Price Targets */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-zinc-500">Entry:</span>
                        <span className="font-mono text-xs">${formatPrice(alert.entry)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-3 h-3 text-whale" />
                        <span className="font-mono text-xs">${formatPrice(alert.target)}</span>
                      </div>
                    </div>

                    {/* Stop Loss & R/R */}
                    {(alert.stop_loss || alert.risk_reward) && (
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {alert.stop_loss && (
                          <div className="flex items-center gap-1">
                            <Shield className="w-3 h-3 text-bearish" />
                            <span className="font-mono text-[10px] text-zinc-400">
                              SL: ${formatPrice(alert.stop_loss)}
                            </span>
                          </div>
                        )}
                        {alert.risk_reward && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-zinc-500">R/R:</span>
                            <span className={cn(
                              "font-mono text-[10px]",
                              alert.risk_reward >= 2 ? "text-bullish" : "text-zinc-400"
                            )}>
                              {alert.risk_reward.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Move & Timeframe */}
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "font-mono text-xs font-semibold",
                        isLong ? "text-bullish" : "text-bearish"
                      )}>
                        {alert.estimated_move > 0 ? '+' : ''}{alert.estimated_move?.toFixed(2)}%
                      </span>
                      <span className="text-[10px] text-zinc-500">{alert.timeframe}</span>
                    </div>

                    {/* Reason */}
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <span className="text-xs text-zinc-400">{alert.reason}</span>
                    </div>

                    {/* Exchanges */}
                    {alert.exchanges_detected && alert.exchanges_detected.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/5">
                        <Globe className="w-2.5 h-2.5 text-zinc-500" />
                        <span className="text-[10px] text-zinc-500">
                          {alert.exchanges_detected.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <span className="text-xs">No whale signals detected</span>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

export default WhaleAlertCard;
