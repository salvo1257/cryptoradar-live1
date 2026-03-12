import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { CandlestickCard } from '../cards';
import { TradingChart } from '../TradingChart';

export function CandlesticksPage() {
  const { t } = useApp();

  return (
    <div className="p-4 space-y-4" data-testid="candlesticks-page">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">{t('candlesticks')}</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden">
          <div className="p-2">
            <TradingChart height={350} />
          </div>
        </div>
        <CandlestickCard />
      </div>
    </div>
  );
}

export default CandlesticksPage;
