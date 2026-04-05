import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { TradingChart } from '../TradingChart';
import { ChevronDown, ChevronUp, Wrench, LineChart, TrendingUp, Activity } from 'lucide-react';
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
import { DataFreshnessIndicator } from '../cards/DataFreshnessIndicator';
import { Badge } from '../ui/badge';

export function DashboardPage() {
  const { isLoading, language } = useApp();
  // V2 panel OPEN by default as requested
  const [showDiagnostic, setShowDiagnostic] = useState(true);

  // Section labels with improved wording
  const labels = {
    it: {
      diagnostic: 'V2 Confronto / Diagnostica',
      comparison: 'Confronto',
      primaryIntelligence: 'Intelligence Primaria',
      marketDynamics: 'Dinamiche Mercato',
      technicalContext: 'Contesto Tecnico',
      tools: 'Strumenti',
      priceChart: 'Grafico Prezzo',
      liveAnalysis: 'Analisi Live'
    },
    en: {
      diagnostic: 'V2 Comparison / Diagnostic',
      comparison: 'Comparison',
      primaryIntelligence: 'Primary Intelligence',
      marketDynamics: 'Market Dynamics',
      technicalContext: 'Technical Context',
      tools: 'Tools',
      priceChart: 'Price Chart',
      liveAnalysis: 'Live Analysis'
    },
    de: {
      diagnostic: 'V2 Vergleich / Diagnose',
      comparison: 'Vergleich',
      primaryIntelligence: 'Primäre Intelligenz',
      marketDynamics: 'Marktdynamik',
      technicalContext: 'Technischer Kontext',
      tools: 'Werkzeuge',
      priceChart: 'Preischart',
      liveAnalysis: 'Live-Analyse'
    },
    pl: {
      diagnostic: 'V2 Porównanie / Diagnostyka',
      comparison: 'Porównanie',
      primaryIntelligence: 'Podstawowe Dane',
      marketDynamics: 'Dynamika Rynku',
      technicalContext: 'Kontekst Techniczny',
      tools: 'Narzędzia',
      priceChart: 'Wykres Ceny',
      liveAnalysis: 'Analiza Live'
    }
  };

  const t = labels[language] || labels.en;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
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
    <div className="p-6 space-y-8" data-testid="dashboard-page">
      
      {/* ═══════════════════════════════════════════════════════════════════
          DATA INTEGRITY STATUS - Always visible at top
          Shows if market data is fresh, stale, or unavailable
      ═══════════════════════════════════════════════════════════════════ */}
      <DataFreshnessIndicator />
      
      {/* ═══════════════════════════════════════════════════════════════════
          TOP ROW: V3 Signal + Market Regime (Primary Decision Layer)
          This is what users should see first - the main signal and context
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* V3 - Primary Operational Signal (2/3 width) */}
        <div className="lg:col-span-2">
          <V3SignalCard language={language} />
        </div>
        
        {/* Market Regime - Quick Context (1/3 width) */}
        <div className="lg:col-span-1">
          <MarketRegimeCard language={language} />
        </div>
      </div>
      
      {/* ═══════════════════════════════════════════════════════════════════
          V2 Diagnostic Section - EXPANDED by default for comparison
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-zinc-900/40 border border-zinc-700/50 rounded-sm overflow-hidden">
        <button
          onClick={() => setShowDiagnostic(!showDiagnostic)}
          className="w-full px-5 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
          data-testid="v2-diagnostic-toggle"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-amber-500/20 rounded">
              <Wrench className="w-4 h-4 text-amber-400" />
            </div>
            <span className="font-semibold text-sm text-zinc-200">{t.diagnostic}</span>
            <Badge variant="outline" className="text-[10px] text-amber-400/80 border-amber-500/30 bg-amber-500/10 px-2">
              {t.comparison}
            </Badge>
          </div>
          {showDiagnostic ? (
            <ChevronUp className="w-5 h-5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-zinc-400" />
          )}
        </button>
        
        {showDiagnostic && (
          <div className="p-5 pt-4 border-t border-zinc-700/50 bg-zinc-900/20">
            <TradeSignalCard compact />
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CHART: Main Price Action View - Enhanced visual framing
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-b from-zinc-900/60 to-crypto-card/60 backdrop-blur-sm border border-zinc-700/60 rounded-sm overflow-hidden shadow-lg">
        {/* Chart Header - More prominent */}
        <div className="px-5 py-4 border-b border-zinc-700/40 bg-zinc-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded">
                <LineChart className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-base text-white tracking-wide">
                  BTC/USDT {t.priceChart}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">{t.liveAnalysis}</p>
              </div>
            </div>
            <Badge className="text-[10px] text-cyan-400 border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1">
              TradingView
            </Badge>
          </div>
        </div>
        {/* Chart Content - Better padding */}
        <div className="p-4 bg-zinc-950/30">
          <TradingChart height={380} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION: Primary Intelligence (Bias, OI, Funding)
          Core metrics for market direction
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <div className="w-1.5 h-5 bg-cyan-500 rounded-full"></div>
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
            {t.primaryIntelligence}
          </h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <MarketBiasCard />
          <OpenInterestCard />
          <FundingRateCard />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION: Market Dynamics (Energy, Magnet, Whales)
          Advanced momentum and flow indicators
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <div className="w-1.5 h-5 bg-purple-500 rounded-full"></div>
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
            {t.marketDynamics}
          </h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <MarketEnergyCard />
          <LiquidityMagnetCard />
          <WhaleAlertCard compact />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION: Technical Context (S/R, Orderbook, Liquidity)
          Supporting technical data
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <div className="w-1.5 h-5 bg-blue-500 rounded-full"></div>
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
            {t.technicalContext}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <SupportResistanceCard compact />
          <OrderBookCard />
          <LiquidityCard compact />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION: Tools
          Utility tools for analysis
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <div className="w-1.5 h-5 bg-zinc-500 rounded-full"></div>
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
            {t.tools}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <PriceMeasurementTool />
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
