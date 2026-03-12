import React from 'react';
import { HelpCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';

export function WhaleAlertCard({ compact = false }) {
  const { t, whaleAlerts, learnMode } = useApp();

  const formatPrice = (p) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(p);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
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
        <span className="text-xs text-whale font-mono">{whaleAlerts.length} alerts</span>
      </div>

      {/* Content */}
      <div className="p-4">
        <ScrollArea className={compact ? "h-[200px]" : "h-[300px]"}>
          {whaleAlerts.length > 0 ? (
            <div className="space-y-3">
              {whaleAlerts.map((alert, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "p-3 rounded-sm border",
                    alert.signal === 'LONG' 
                      ? "bg-bullish/5 border-bullish/20 glow-bullish" 
                      : "bg-bearish/5 border-bearish/20 glow-bearish"
                  )}
                >
                  {/* Signal header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {alert.signal === 'LONG' ? (
                        <TrendingUp className="w-4 h-4 text-bullish" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-bearish" />
                      )}
                      <span className={cn(
                        "font-mono font-bold text-sm",
                        alert.signal === 'LONG' ? "text-bullish" : "text-bearish"
                      )}>
                        {t(alert.signal.toLowerCase())}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-500">{formatTime(alert.timestamp)}</span>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-zinc-500">{t('entry')}: </span>
                      <span className="font-mono">${formatPrice(alert.entry)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">{t('target')}: </span>
                      <span className="font-mono">${formatPrice(alert.target)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">{t('confidence')}: </span>
                      <span className="font-mono">{alert.confidence.toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">{t('estimatedMove')}: </span>
                      <span className={cn(
                        "font-mono",
                        alert.estimated_move > 0 ? "text-bullish" : "text-bearish"
                      )}>
                        {alert.estimated_move > 0 ? '+' : ''}{alert.estimated_move.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="mt-2 pt-2 border-t border-white/5">
                    <span className="text-xs text-zinc-400">{alert.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
              No whale alerts at this time
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

export default WhaleAlertCard;
