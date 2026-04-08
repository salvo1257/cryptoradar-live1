import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Pause, AlertTriangle, 
  CheckCircle, Activity, Target, Shield
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useApp } from '../../contexts/AppContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Decision Engine Layer v1.0
 * 
 * Aggregates multiple signals into ONE clear final action.
 * NO logic changes to existing indicators - only aggregation layer.
 * 
 * RULES (priority based):
 * 1. BLOCK CONDITIONS → WAIT
 * 2. STRONG ALIGNMENT → LONG/SHORT
 * 3. CONFLICT → WAIT + "Segnali contrastanti"
 */

export function DecisionEngineCard({ language = 'it' }) {
  const { marketBias, liquidity, openInterest } = useApp();
  
  // Fetch additional data needed for decision
  const [v3Data, setV3Data] = useState(null);
  const [energyData, setEnergyData] = useState(null);
  const [magnetData, setMagnetData] = useState(null);
  const [whaleData, setWhaleData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch all required data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [v3Res, energyRes, magnetRes, whaleRes] = await Promise.all([
          fetch(`${API_URL}/api/v3/trade-signal?lang=${language}`).then(r => r.json()).catch(() => null),
          fetch(`${API_URL}/api/market-energy?lang=${language}`).then(r => r.json()).catch(() => null),
          fetch(`${API_URL}/api/liquidity-magnet`).then(r => r.json()).catch(() => null),
          fetch(`${API_URL}/api/whale-activity`).then(r => r.json()).catch(() => null)
        ]);
        
        setV3Data(v3Res);
        setEnergyData(energyRes);
        setMagnetData(magnetRes);
        setWhaleData(whaleRes);
      } catch (error) {
        console.error('Decision Engine fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [language]);

  // Translations
  const t = {
    it: {
      title: 'AZIONE FINALE',
      long: 'LONG',
      short: 'SHORT',
      wait: 'ATTENDI',
      conflictLabel: 'Segnali contrastanti',
      blockReason: 'Blocco attivo',
      alignedSignals: 'Segnali allineati',
      warnings: 'Avvisi',
      compression: 'Mercato in compressione',
      neutralLiquidity: 'Liquidità neutrale',
      lowRR: 'R:R insufficiente',
      whaleAligned: 'Whale allineate',
      biasAligned: 'Bias confermato',
      oiRising: 'OI in aumento',
      liquidityAligned: 'Liquidità direzionale'
    },
    en: {
      title: 'FINAL ACTION',
      long: 'LONG',
      short: 'SHORT',
      wait: 'WAIT',
      conflictLabel: 'Conflicting signals',
      blockReason: 'Block active',
      alignedSignals: 'Aligned signals',
      warnings: 'Warnings',
      compression: 'Market in compression',
      neutralLiquidity: 'Neutral liquidity',
      lowRR: 'Insufficient R:R',
      whaleAligned: 'Whales aligned',
      biasAligned: 'Bias confirmed',
      oiRising: 'OI rising',
      liquidityAligned: 'Directional liquidity'
    }
  }[language] || {
    it: {
      title: 'AZIONE FINALE',
      long: 'LONG',
      short: 'SHORT',
      wait: 'ATTENDI',
      conflictLabel: 'Segnali contrastanti',
      blockReason: 'Blocco attivo',
      alignedSignals: 'Segnali allineati',
      warnings: 'Avvisi',
      compression: 'Mercato in compressione',
      neutralLiquidity: 'Liquidità neutrale',
      lowRR: 'R:R insufficiente',
      whaleAligned: 'Whale allineate',
      biasAligned: 'Bias confermato',
      oiRising: 'OI in aumento',
      liquidityAligned: 'Liquidità direzionale'
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // DECISION ENGINE LOGIC
  // ═══════════════════════════════════════════════════════════════════
  
  const computeDecision = () => {
    const warnings = [];
    const alignedSignals = [];
    let finalAction = 'WAIT';
    let reason = '';
    let isConflict = false;

    // Extract data safely
    const regime = energyData?.regime || energyData?.market_regime || 'UNKNOWN';
    const bias = v3Data?.market_context?.bias || marketBias?.bias || 'NEUTRAL';
    const biasPercent = v3Data?.market_context?.bias_percent || marketBias?.bias_percent || 50;
    const riskReward = v3Data?.risk_reward || 0;
    const magnetDirection = magnetData?.target_direction || 'NEUTRAL';
    const magnetStrength = magnetData?.magnet_strength || 'LOW';
    const whaleDirection = whaleData?.direction || 'balanced';
    const whalePressure = whaleData?.buy_pressure || 0;
    const oiChange = openInterest?.change_24h || 0;
    const v3Direction = v3Data?.direction || null;
    const liquidityDirection = liquidity?.direction || null;

    // ─────────────────────────────────────────────────────────────────
    // RULE 1: BLOCK CONDITIONS → WAIT
    // ─────────────────────────────────────────────────────────────────
    
    // Check: Liquidity = NEUTRAL
    if (magnetDirection === 'NEUTRAL' || magnetDirection === 'BALANCED') {
      warnings.push({ type: 'block', text: t.neutralLiquidity, icon: AlertTriangle });
    }
    
    // Check: Regime = COMPRESSION
    if (regime === 'COMPRESSION' || regime === 'HIGH') {
      warnings.push({ type: 'block', text: t.compression, icon: Activity });
    }
    
    // Check: R:R < 0.3
    if (riskReward > 0 && riskReward < 0.3) {
      warnings.push({ type: 'block', text: `${t.lowRR} (${riskReward.toFixed(2)})`, icon: Shield });
    }

    // If ANY block condition is true → WAIT
    const hasBlockCondition = warnings.some(w => w.type === 'block');
    
    if (hasBlockCondition) {
      finalAction = 'WAIT';
      reason = t.blockReason;
      return { finalAction, reason, warnings: warnings.slice(0, 2), alignedSignals, isConflict: false };
    }

    // ─────────────────────────────────────────────────────────────────
    // RULE 2: STRONG ALIGNMENT → LONG/SHORT
    // ─────────────────────────────────────────────────────────────────
    
    // Check bullish alignment
    const isBiasBullish = bias === 'BULLISH' || bias === 'bullish' || biasPercent > 60;
    const isWhaleBuying = whaleDirection === 'buying' || whaleDirection === 'BUYING' || whalePressure > 50;
    const isOiRising = oiChange > 0;
    const isLiquidityUp = magnetDirection === 'UP' || liquidityDirection === 'UP' || liquidityDirection === 'bullish';
    
    // Check bearish alignment
    const isBiasBearish = bias === 'BEARISH' || bias === 'bearish' || biasPercent < 40;
    const isWhaleSelling = whaleDirection === 'selling' || whaleDirection === 'SELLING' || whalePressure < 50;
    const isOiFalling = oiChange < 0;
    const isLiquidityDown = magnetDirection === 'DOWN' || liquidityDirection === 'DOWN' || liquidityDirection === 'bearish';

    // Count bullish signals
    let bullishCount = 0;
    let bearishCount = 0;

    if (isBiasBullish) { bullishCount++; alignedSignals.push({ direction: 'LONG', text: t.biasAligned }); }
    if (isBiasBearish) { bearishCount++; }
    
    if (isWhaleBuying) { bullishCount++; alignedSignals.push({ direction: 'LONG', text: t.whaleAligned }); }
    if (isWhaleSelling) { bearishCount++; }
    
    if (isOiRising) { bullishCount++; alignedSignals.push({ direction: 'LONG', text: t.oiRising }); }
    if (isOiFalling) { bearishCount++; }
    
    if (isLiquidityUp) { bullishCount++; alignedSignals.push({ direction: 'LONG', text: t.liquidityAligned }); }
    if (isLiquidityDown) { bearishCount++; }

    // Strong alignment: ALL 4 signals agree
    if (bullishCount >= 3 && bearishCount === 0) {
      finalAction = 'LONG';
      reason = t.alignedSignals;
      return { finalAction, reason, warnings: warnings.slice(0, 2), alignedSignals: alignedSignals.filter(s => s.direction === 'LONG'), isConflict: false };
    }
    
    if (bearishCount >= 3 && bullishCount === 0) {
      finalAction = 'SHORT';
      reason = t.alignedSignals;
      // Build bearish aligned signals
      const bearishAligned = [];
      if (isBiasBearish) bearishAligned.push({ direction: 'SHORT', text: t.biasAligned });
      if (isWhaleSelling) bearishAligned.push({ direction: 'SHORT', text: t.whaleAligned });
      if (isOiFalling) bearishAligned.push({ direction: 'SHORT', text: t.oiRising.replace('aumento', 'calo').replace('rising', 'falling') });
      if (isLiquidityDown) bearishAligned.push({ direction: 'SHORT', text: t.liquidityAligned });
      return { finalAction, reason, warnings: warnings.slice(0, 2), alignedSignals: bearishAligned, isConflict: false };
    }

    // ─────────────────────────────────────────────────────────────────
    // RULE 3: CONFLICT → WAIT
    // ─────────────────────────────────────────────────────────────────
    
    if (bullishCount > 0 && bearishCount > 0) {
      finalAction = 'WAIT';
      reason = t.conflictLabel;
      isConflict = true;
      return { finalAction, reason, warnings: warnings.slice(0, 2), alignedSignals: [], isConflict: true };
    }

    // Default: Not enough signals
    finalAction = 'WAIT';
    reason = language === 'it' ? 'Segnali insufficienti' : 'Insufficient signals';
    return { finalAction, reason, warnings: warnings.slice(0, 2), alignedSignals: [], isConflict: false };
  };

  const decision = loading ? null : computeDecision();

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  const getActionConfig = (action) => {
    switch (action) {
      case 'LONG':
        return {
          icon: TrendingUp,
          color: 'text-bullish',
          bgColor: 'bg-bullish/20',
          borderColor: 'border-bullish/50',
          glowColor: 'shadow-bullish/30',
          label: t.long
        };
      case 'SHORT':
        return {
          icon: TrendingDown,
          color: 'text-bearish',
          bgColor: 'bg-bearish/20',
          borderColor: 'border-bearish/50',
          glowColor: 'shadow-bearish/30',
          label: t.short
        };
      default:
        return {
          icon: Pause,
          color: 'text-zinc-400',
          bgColor: 'bg-zinc-800/50',
          borderColor: 'border-zinc-600/50',
          glowColor: '',
          label: t.wait
        };
    }
  };

  if (loading) {
    return (
      <div className="bg-crypto-card border border-crypto-border rounded-sm p-4 animate-pulse">
        <div className="h-16 bg-zinc-800 rounded-sm" />
      </div>
    );
  }

  const config = getActionConfig(decision?.finalAction);
  const ActionIcon = config.icon;

  return (
    <div 
      className={cn(
        "bg-gradient-to-br from-crypto-card to-zinc-900/80",
        "border-2 rounded-sm overflow-hidden",
        "shadow-lg transition-all duration-300",
        config.borderColor,
        decision?.finalAction !== 'WAIT' && `shadow-xl ${config.glowColor}`
      )}
      data-testid="decision-engine-card"
    >
      {/* Main Action Display */}
      <div className="p-4 md:p-5">
        <div className="flex items-center justify-between">
          {/* Left: Title */}
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-zinc-500" />
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">
              {t.title}
            </span>
          </div>
          
          {/* Right: Action Badge */}
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg",
            config.bgColor,
            "border",
            config.borderColor
          )}>
            <ActionIcon className={cn("w-5 h-5", config.color)} />
            <span className={cn(
              "font-heading font-bold text-lg tracking-wide",
              config.color
            )}>
              {config.label}
            </span>
          </div>
        </div>

        {/* Reason */}
        {decision?.reason && (
          <div className="mt-3 flex items-center gap-2">
            {decision.isConflict ? (
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            ) : decision.finalAction !== 'WAIT' ? (
              <CheckCircle className="w-4 h-4 text-bullish" />
            ) : (
              <Pause className="w-4 h-4 text-zinc-500" />
            )}
            <span className={cn(
              "text-sm",
              decision.isConflict ? "text-yellow-500" : "text-zinc-400"
            )}>
              {decision.reason}
            </span>
          </div>
        )}

        {/* Aligned Signals (when LONG/SHORT) */}
        {decision?.alignedSignals?.length > 0 && decision.finalAction !== 'WAIT' && (
          <div className="mt-3 flex flex-wrap gap-2">
            {decision.alignedSignals.slice(0, 4).map((signal, idx) => (
              <span 
                key={idx}
                className={cn(
                  "text-xs px-2 py-1 rounded",
                  decision.finalAction === 'LONG' ? "bg-bullish/10 text-bullish" : "bg-bearish/10 text-bearish"
                )}
              >
                {signal.text}
              </span>
            ))}
          </div>
        )}

        {/* Warnings (max 2) */}
        {decision?.warnings?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-zinc-700/50">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3 h-3 text-yellow-500" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">{t.warnings}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {decision.warnings.slice(0, 2).map((warning, idx) => {
                const WarningIcon = warning.icon || AlertTriangle;
                return (
                  <span 
                    key={idx}
                    className="flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                  >
                    <WarningIcon className="w-3 h-3" />
                    {warning.text}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DecisionEngineCard;
