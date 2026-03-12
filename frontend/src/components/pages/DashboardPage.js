import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { TradingChart } from '../TradingChart';
import { 
  MarketBiasCard, 
  SupportResistanceCard, 
  LiquidityCard, 
  WhaleAlertCard, 
  OrderBookCard,
  OpenInterestCard,
  FundingRateCard
} from '../cards';

export function DashboardPage() {
  const { isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-[400px] bg-crypto-card rounded-sm" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-[300px] bg-crypto-card rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4" data-testid="dashboard-page">
      {/* Main Chart */}
      <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-heading font-semibold text-sm uppercase tracking-wider">BTC/USDT</h2>
          <span className="text-xs text-zinc-500 font-mono">TradingView Chart</span>
        </div>
        <div className="p-2">
          <TradingChart height={380} />
        </div>
      </div>

      {/* Primary Intelligence Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MarketBiasCard />
        <OpenInterestCard />
        <FundingRateCard />
      </div>

      {/* Secondary Analysis Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <OrderBookCard />
        <LiquidityCard compact />
        <SupportResistanceCard compact />
      </div>

      {/* Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WhaleAlertCard compact />
      </div>
    </div>
  );
}

export default DashboardPage;
