import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useAccess } from '../../contexts/AccessContext';
import { TradingChartWithSentinel } from '../TradingChartWithSentinel';
import { ChevronDown, ChevronUp, Wrench, LineChart, TrendingUp, Activity, Layers, Lock } from 'lucide-react';
import { 
  MarketBiasCard, 
  SupportResistanceCard, 
  LiquidityCard, 
  WhaleAlertCard,
  WhaleFlowCard,
  OrderBookCard,
  OpenInterestCard,
  FundingRateCard,
  TradeSignalCard,
  MarketEnergyCard,
  LiquidityMagnetCard,
  PriceMeasurementTool,
  V3SignalCard,
  DecisionEngineCard
} from '../cards';
import MarketRegimeCard from '../cards/MarketRegimeCard';
import { DataFreshnessIndicator } from '../cards/DataFreshnessIndicator';
import LiquidityZoneInspector from '../cards/LiquidityZoneInspector';
import { MentorCard } from '../cards/MentorCard';
import { Badge } from '../ui/badge';

export function DashboardPage() {
  const { isLoading, language } = useApp();
  const { isAdmin } = useAccess();
  // V2 panel OPEN by default as requested
  const [showDiagnostic, setShowDiagnostic] = useState(true);

  // Section labels with improved wording
  const labels = {
    it: {
      diagnostic: 'V2 DIAGNOSTICA - NON OPERATIVO',
      comparison: 'Solo Confronto',
      primaryIntelligence: 'Intelligence Primaria',
      marketDynamics: 'Dinamiche Mercato',
      liquidityZones: 'Zone Liquidità',
      technicalContext: 'Contesto Tecnico',
      tools: 'Strumenti',
      priceChart: 'Grafico Prezzo',
      liveAnalysis: 'Analisi Live',
      patternDetection: 'Pattern Detection',
      sentinelDesc: 'Analisi Multi-Timeframe Automatica'
    },
    en: {
      diagnostic: 'V2 DIAGNOSTIC - NOT OPERATIONAL',
      comparison: 'Compare Only',
      primaryIntelligence: 'Primary Intelligence',
      marketDynamics: 'Market Dynamics',
      liquidityZones: 'Liquidity Zones',
      technicalContext: 'Technical Context',
      tools: 'Tools',
      priceChart: 'Price Chart',
      liveAnalysis: 'Live Analysis',
      patternDetection: 'Pattern Detection',
      sentinelDesc: 'Automated Multi-Timeframe Analysis'
    },
    de: {
      diagnostic: 'V2 DIAGNOSE - NICHT OPERATIV',
      comparison: 'Nur Vergleich',
      primaryIntelligence: 'Primäre Intelligenz',
      marketDynamics: 'Marktdynamik',
      liquidityZones: 'Liquiditätszonen',
      technicalContext: 'Technischer Kontext',
      tools: 'Werkzeuge',
      priceChart: 'Preischart',
      liveAnalysis: 'Live-Analyse',
      patternDetection: 'Pattern-Erkennung',
      sentinelDesc: 'Automatische Multi-Zeitrahmen-Analyse'
    },
    pl: {
      diagnostic: 'V2 DIAGNOSTYKA - NIEOPERACYJNY',
      comparison: 'Tylko Porównanie',
      primaryIntelligence: 'Podstawowe Dane',
      marketDynamics: 'Dynamika Rynku',
      liquidityZones: 'Strefy Płynności',
      technicalContext: 'Kontekst Techniczny',
      tools: 'Narzędzia',
      priceChart: 'Wykres Ceny',
      liveAnalysis: 'Analiza Live',
      patternDetection: 'Wykrywanie Wzorców',
      sentinelDesc: 'Automatyczna Analiza Wielu Ram Czasowych'
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
    <div className="p-6 md:p-8 space-y-8" data-testid="dashboard-page">
      
      {/* ═══════════════════════════════════════════════════════════════════
          DECISION ENGINE - ADMIN ONLY - Aggregates all signals
      ═══════════════════════════════════════════════════════════════════ */}
      {isAdmin ? (
        <DecisionEngineCard language={language} />
      ) : (
        <div className="premium-card rounded-lg p-8 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/20 rounded-lg">
              <Lock className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-xl text-white">Panoramica Mercato</h3>
              <p className="text-sm text-zinc-400">Vista pubblica - I segnali di trading richiedono accesso admin</p>
            </div>
          </div>
        </div>
      )}
      
      {/* ═══════════════════════════════════════════════════════════════════
          DATA INTEGRITY STATUS - Always visible at top
          Shows if market data is fresh, stale, or unavailable
      ═══════════════════════════════════════════════════════════════════ */}
      <DataFreshnessIndicator />
      
      {/* ═══════════════════════════════════════════════════════════════════
          TOP ROW: V3 Signal (ADMIN) + Market Regime (PUBLIC)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* V3 - ADMIN ONLY - Primary Operational Signal */}
        <div className="lg:col-span-2">
          {isAdmin ? (
            <V3SignalCard language={language} />
          ) : (
            <div className="premium-card rounded-lg p-8 h-full flex items-center justify-center min-h-[280px]">
              <div className="text-center">
                <Lock className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-500 text-base">Segnale V3 - Solo Admin</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Market Regime - PUBLIC - Quick Context */}
        <div className="lg:col-span-1">
          <MarketRegimeCard language={language} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          RADAR MENTOR - AI Trading Educator (Freemium)
          PUBLIC: Context + Tip | ADMIN: Full Analysis (Logic + Lesson)
          PROMINENT - Main value proposition
      ═══════════════════════════════════════════════════════════════════ */}
      <MentorCard />

      {/* ═══════════════════════════════════════════════════════════════════
          LIQUIDITY CONTEXT: Magnet + Zones (PUBLIC - Full Decision Context)
          Where price wants to go AND where liquidity is located
          FOCAL POINTS - Premium layout
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Magnet Liquidity - PUBLIC - Directional Target */}
        <LiquidityMagnetCard />
        
        {/* Liquidity Zone Engine - PUBLIC - Structural Zones */}
        <LiquidityZoneInspector lang={language} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          WHALE FLOW 2.0 - Real-Time Capital Tracker
          Shows institutional momentum across all 5 exchanges
      ═══════════════════════════════════════════════════════════════════ */}
      <WhaleFlowCard />
      
      {/* ═══════════════════════════════════════════════════════════════════
          V2 Diagnostic Section - ADMIN ONLY
      ═══════════════════════════════════════════════════════════════════ */}
      {isAdmin && (
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
      )}

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
              TradingView + Sentinel AR
            </Badge>
          </div>
        </div>
        {/* Chart Content with Sentinel Overlay - AR Vision */}
        <div className="p-4 bg-zinc-950/30">
          <TradingChartWithSentinel height={420} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          THE SENTINEL - MOVED TO DEDICATED PAGES
          Access via Sidebar: Pattern, Candele, Onde di Elliott
      ═══════════════════════════════════════════════════════════════════ */}

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION: Primary Intelligence (Bias, OI, Funding) - COCKPIT ROW
          Core metrics for market direction - Horizontal layout
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-5">
        <div className="flex items-center gap-3 px-1">
          <div className="w-2 h-6 bg-cyber rounded-full shadow-neon-cyber"></div>
          <h3 className="text-base font-heading font-bold text-zinc-100 uppercase tracking-wider">
            {t.primaryIntelligence}
          </h3>
          <div className="flex-1 h-px bg-gradient-to-r from-cyber/30 to-transparent"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <MarketBiasCard />
          <OpenInterestCard />
          <FundingRateCard />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION: Market Dynamics (Energy, Whales)
          Advanced momentum and flow indicators
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <div className="w-1.5 h-5 bg-purple-500 rounded-full"></div>
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
            {t.marketDynamics}
          </h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <MarketEnergyCard />
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
