import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { LiquidityCard, OrderBookCard } from '../cards';

export function LiquidityPage() {
  const { t } = useApp();

  return (
    <div className="p-4 space-y-4" data-testid="liquidity-page">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">{t('liquidity')}</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LiquidityCard />
        <OrderBookCard />
      </div>
    </div>
  );
}

export default LiquidityPage;
