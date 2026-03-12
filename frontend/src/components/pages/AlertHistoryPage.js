import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';

export function AlertHistoryPage() {
  const { t, alertHistory } = useApp();

  const formatPrice = (p) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(p);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <div className="p-4 space-y-4" data-testid="alert-history-page">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">{t('alertHistory')}</h1>
      </div>
      
      <div className="space-y-2">
        {alertHistory.length > 0 ? (
          alertHistory.map((alert) => (
            <div 
              key={alert.id}
              className={cn(
                "flex items-center justify-between p-4 bg-crypto-card/60 border border-crypto-border rounded-sm opacity-60",
                alert.condition === 'above' ? "border-l-2 border-l-bullish" : "border-l-2 border-l-bearish"
              )}
            >
              <div>
                <div className="font-mono text-lg">${formatPrice(alert.price)}</div>
                <div className="text-xs text-zinc-500">
                  {t(alert.condition)} - Triggered
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-500">Triggered at</div>
                <div className="text-sm font-mono">{formatDate(alert.triggered_at || alert.created_at)}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-32 text-zinc-500 text-sm bg-crypto-card/30 rounded-sm border border-crypto-border">
            No alert history
          </div>
        )}
      </div>
    </div>
  );
}

export default AlertHistoryPage;
