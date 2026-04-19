import React from 'react';
import { Crosshair, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { V3HunterCard } from '../cards/V3HunterCard';
import { useApp } from '../../contexts/AppContext';

const translations = {
  it: {
    title: 'V3 Hunter',
    subtitle: 'Strategia 10-20-70 - Stop Loss Hunting',
    description: 'Il V3 Hunter identifica muri di liquidazione istituzionali dove si accumulano gli stop loss dei trader retail. La strategia accumula posizione in 3 fasi (10% - 20% - 70%) approfittando della caccia agli stop.',
    howItWorks: 'Come Funziona',
    leg1Title: 'Leg 1 - Entry Strutturale (10%)',
    leg1Desc: 'Entrata iniziale basata sulla struttura 4H. Conferma il bias direzionale.',
    leg2Title: 'Leg 2 - Cluster Liquidazione (20%)',
    leg2Desc: 'Aggiunta posizione al primo cluster significativo. Qui vengono cacciati i primi stop.',
    leg3Title: 'Leg 3 - Muro Istituzionale (70%)',
    leg3Desc: 'Carico principale al muro primario. Massima liquidità = massimo accumulo.',
    riskManagement: 'Gestione Rischio',
    longRisk: 'LONG: Nessuno stop fisso - solo invalidazione macro',
    shortRisk: 'SHORT: Stop 0.5% sopra il muro 70%',
    leverage: 'Leva default: 1x',
    tpDynamic: 'Take Profit dinamico calcolato sull\'entry medio'
  },
  en: {
    title: 'V3 Hunter',
    subtitle: '10-20-70 Strategy - Stop Loss Hunting',
    description: 'V3 Hunter identifies institutional liquidity walls where retail stop losses accumulate. The strategy builds position in 3 phases (10% - 20% - 70%) profiting from stop hunts.',
    howItWorks: 'How It Works',
    leg1Title: 'Leg 1 - Structural Entry (10%)',
    leg1Desc: 'Initial entry based on 4H structure. Confirms directional bias.',
    leg2Title: 'Leg 2 - Liquidation Cluster (20%)',
    leg2Desc: 'Position add at first significant cluster. First stops hunted here.',
    leg3Title: 'Leg 3 - Institutional Wall (70%)',
    leg3Desc: 'Main load at primary wall. Maximum liquidity = maximum accumulation.',
    riskManagement: 'Risk Management',
    longRisk: 'LONG: No hard stop - macro invalidation only',
    shortRisk: 'SHORT: Stop 0.5% above 70% wall',
    leverage: 'Default leverage: 1x',
    tpDynamic: 'Dynamic Take Profit calculated from average entry'
  }
};

export default function V3HunterPage() {
  const { language } = useApp();
  const t = (key) => translations[language]?.[key] || translations['it'][key] || key;

  return (
    <div className="space-y-6 pb-8" data-testid="v3-hunter-page">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30">
          <Crosshair className="w-8 h-8 text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">{t('title')}</h1>
          <p className="text-zinc-400">{t('subtitle')}</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Hunter Card (2 cols) */}
        <div className="lg:col-span-2">
          <V3HunterCard language={language} />
        </div>

        {/* Right: Info Panel */}
        <div className="space-y-4">
          {/* Description */}
          <div className="premium-card rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-white">{t('howItWorks')}</h3>
            </div>
            <p className="text-sm text-zinc-400 mb-4">{t('description')}</p>

            {/* Legs Explanation */}
            <div className="space-y-3">
              {/* Leg 1 */}
              <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-300">
                    10%
                  </div>
                  <span className="font-medium text-blue-300 text-sm">{t('leg1Title')}</span>
                </div>
                <p className="text-xs text-zinc-500 ml-8">{t('leg1Desc')}</p>
              </div>

              {/* Leg 2 */}
              <div className="bg-orange-500/10 rounded-lg p-3 border border-orange-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-orange-500/30 flex items-center justify-center text-xs font-bold text-orange-300">
                    20%
                  </div>
                  <span className="font-medium text-orange-300 text-sm">{t('leg2Title')}</span>
                </div>
                <p className="text-xs text-zinc-500 ml-8">{t('leg2Desc')}</p>
              </div>

              {/* Leg 3 */}
              <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-300">
                    70%
                  </div>
                  <span className="font-medium text-purple-300 text-sm">{t('leg3Title')}</span>
                </div>
                <p className="text-xs text-zinc-500 ml-8">{t('leg3Desc')}</p>
              </div>
            </div>
          </div>

          {/* Risk Management */}
          <div className="premium-card rounded-lg p-5">
            <h3 className="font-bold text-white mb-3">{t('riskManagement')}</h3>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-[#00FF9D] mt-0.5" />
                <p className="text-sm text-zinc-400">{t('longRisk')}</p>
              </div>
              
              <div className="flex items-start gap-2">
                <TrendingDown className="w-4 h-4 text-[#FF1E56] mt-0.5" />
                <p className="text-sm text-zinc-400">{t('shortRisk')}</p>
              </div>
              
              <div className="pt-2 mt-2 border-t border-white/10">
                <p className="text-xs text-zinc-500">{t('leverage')}</p>
                <p className="text-xs text-zinc-500">{t('tpDynamic')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
