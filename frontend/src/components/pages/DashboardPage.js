import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { TradingChart } from '../TradingChart';
import { ChevronDown, ChevronUp, Wrench } from 'lucide-react';
import { 
  MarketBiasCard, 
  SupportResistanceCard, 
  LiquidityCard, 
  WhaleAlertCard, 
  OrderBookCard,
  OpenInterestCard,
  FundingRateCard,
  TradeSignalCard,
  MarketEnergyCard,
  LiquidityMagnetCard,
  PriceMeasurementTool,
  V3SignalCard
} from '../cards';
import MarketRegimeCard from '../cards/MarketRegimeCard';
import { Badge } from '../ui/badge';

export function DashboardPage() {
  const { isLoading, language } = useApp();
  const [showDiagnostic, setShowDiagnostic] = useState(false);

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
      {/* V3 Primary Signal - Full Width on Mobile, Main Column on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* V3 - Primary Operational Signal (2/3 width) */}
        <div className="lg:col-span-2">
          <V3SignalCard language={language} />
        </div>
        
        {/* Market Regime - Quick Context (1/3 width) */}
        <div className="lg:col-span-1">
          <MarketRegimeCard language={language} compact />
        </div>
      </div>
      
      {/* V2 Diagnostic Section - Collapsible */}
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-sm overflow-hidden">
        <button
          onClick={() => setShowDiagnostic(!showDiagnostic)}
          className="w-full px-4 py-2 flex items-center justify-between text-xs text-zinc-500 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Wrench className="w-3 h-3" />
            <span>{language === 'it' ? 'V2 Diagnostica / Avanzato' : 'V2 Diagnostic / Advanced'}</span>
            <Badge variant="outline" className="text-[9px] text-zinc-600 border-zinc-700">
              {language === 'it' ? 'Secondario' : 'Secondary'}
            </Badge>
          </div>
          {showDiagnostic ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {showDiagnostic && (
          <div className="p-4 pt-2 border-t border-zinc-800/50">
            <TradeSignalCard compact />
          </div>
        )}
      </div>

      {/* Main Chart */}
      <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-heading font-semibold text-sm uppercase tracking-wider">BTC/USDT</h2>
          <span className="text-xs text-zinc-500 font-mono">TradingView Chart</span>
        </div>
        <div className="p-2">
          <TradingChart height={330} />
        </div>
      </div>

      {/* Primary Intelligence Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MarketBiasCard />
        <OpenInterestCard />
        <FundingRateCard />
      </div>

      {/* Market Energy, Liquidity Magnet & Whale Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <MarketEnergyCard />
        <LiquidityMagnetCard />
        <WhaleAlertCard compact />
      </div>

      {/* Secondary Analysis Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SupportResistanceCard compact />
        <OrderBookCard />
        <LiquidityCard compact />
      </div>

      {/* Tools Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <PriceMeasurementTool />
      </div>
    </div>
  );
}

export default DashboardPage;
