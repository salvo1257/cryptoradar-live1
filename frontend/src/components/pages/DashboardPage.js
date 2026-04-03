import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { TradingChart } from '../TradingChart';
import { ChevronDown, ChevronUp, Wrench, LineChart } from 'lucide-react';
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

  // Section labels
  const labels = {
    it: {
      diagnostic: 'V2 Diagnostica / Avanzato',
      secondary: 'Secondario',
      primaryIntelligence: 'Intelligence Primaria',
      marketDynamics: 'Dinamiche Mercato',
      technicalContext: 'Contesto Tecnico',
      tools: 'Strumenti'
    },
    en: {
      diagnostic: 'V2 Diagnostic / Advanced',
      secondary: 'Secondary',
      primaryIntelligence: 'Primary Intelligence',
      marketDynamics: 'Market Dynamics',
      technicalContext: 'Technical Context',
      tools: 'Tools'
    },
    de: {
      diagnostic: 'V2 Diagnose / Erweitert',
      secondary: 'Sekundär',
      primaryIntelligence: 'Primäre Intelligenz',
      marketDynamics: 'Marktdynamik',
      technicalContext: 'Technischer Kontext',
      tools: 'Werkzeuge'
    },
    pl: {
      diagnostic: 'V2 Diagnostyka / Zaawansowane',
      secondary: 'Drugorzędny',
      primaryIntelligence: 'Podstawowe Dane',
      marketDynamics: 'Dynamika Rynku',
      technicalContext: 'Kontekst Techniczny',
      tools: 'Narzędzia'
    }
  };

  const t = labels[language] || labels.en;

  if (isLoading) {
    return (
      <div className="p-5 space-y-5 animate-pulse">
        <div className="h-[400px] bg-crypto-card rounded-sm" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-[280px] bg-crypto-card rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-6" data-testid="dashboard-page">
      {/* ═══════════════════════════════════════════════════════════════════
          TOP ROW: V3 Signal + Market Regime (Primary Decision Layer)
          This is what users should see first - the main signal and context
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* V3 - Primary Operational Signal (2/3 width) */}
        <div className="lg:col-span-2">
          <V3SignalCard language={language} />
        </div>
        
        {/* Market Regime - Quick Context (1/3 width) */}
        <div className="lg:col-span-1">
          <MarketRegimeCard language={language} />
        </div>
      </div>
      
      {/* V2 Diagnostic Section - Collapsed by default */}
      <div className="bg-zinc-900/20 border border-zinc-800/40 rounded-sm overflow-hidden">
        <button
          onClick={() => setShowDiagnostic(!showDiagnostic)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-zinc-500 hover:bg-white/5 transition-colors"
          data-testid="v2-diagnostic-toggle"
        >
          <div className="flex items-center gap-2">
            <Wrench className="w-3.5 h-3.5" />
            <span className="font-medium">{t.diagnostic}</span>
            <Badge variant="outline" className="text-[9px] text-zinc-600 border-zinc-700 px-1.5">
              {t.secondary}
            </Badge>
          </div>
          {showDiagnostic ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {showDiagnostic && (
          <div className="p-4 pt-3 border-t border-zinc-800/40">
            <TradeSignalCard compact />
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CHART: Main Price Action View
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LineChart className="w-4 h-4 text-crypto-accent" />
            <h2 className="font-heading font-semibold text-sm uppercase tracking-wider">BTC/USDT</h2>
          </div>
          <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700">
            TradingView
          </Badge>
        </div>
        <div className="p-2">
          <TradingChart height={350} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION: Primary Intelligence (Bias, OI, Funding)
          Core metrics for market direction
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="w-1 h-4 bg-crypto-accent rounded-full"></div>
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {t.primaryIntelligence}
          </h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <MarketBiasCard />
          <OpenInterestCard />
          <FundingRateCard />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION: Market Dynamics (Energy, Magnet, Whales)
          Advanced momentum and flow indicators
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {t.marketDynamics}
          </h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <MarketEnergyCard />
          <LiquidityMagnetCard />
          <WhaleAlertCard compact />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION: Technical Context (S/R, Orderbook, Liquidity)
          Supporting technical data
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {t.technicalContext}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SupportResistanceCard compact />
          <OrderBookCard />
          <LiquidityCard compact />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION: Tools
          Utility tools for analysis
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="w-1 h-4 bg-zinc-600 rounded-full"></div>
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {t.tools}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <PriceMeasurementTool />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
