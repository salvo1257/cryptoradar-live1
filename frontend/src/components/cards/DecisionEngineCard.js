import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Pause, AlertTriangle, 
  CheckCircle, Activity, Target, Shield
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useApp } from '../../contexts/AppContext';
import { useAccess } from '../../contexts/AccessContext';
import { translations } from '../../translations';

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
  const { isAdmin, getAdminHeaders } = useAccess();
  
  // Fetch additional data needed for decision
  const [v3Data, setV3Data] = useState(null);
  const [energyData, setEnergyData] = useState(null);
  const [magnetData, setMagnetData] = useState(null);
  const [whaleData, setWhaleData] = useState(null);
  const [intelligenceState, setIntelligenceState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get translations from centralized system
  const lang = translations[language] || translations.en;
  const t = {
    title: lang.finalAction || 'FINAL ACTION',
    long: lang.long || 'LONG',
    short: lang.short || 'SHORT',
    wait: lang.wait || 'WAIT',
    conflictLabel: lang.conflictLabel || 'Conflicting signals',
    blockReason: lang.blockReason || 'Block active',
    alignedSignals: lang.alignedSignals || 'Aligned signals',
    warnings: lang.warnings || 'Warnings',
    compression: lang.compression || 'Market in compression',
    neutralLiquidity: lang.neutralLiquidity || 'Neutral liquidity',
    lowRR: lang.lowRR || 'R:R too low - non-operational signal',
    weakRR: lang.weakRR || 'Weak R:R (0.3-0.5) - educational only',
    whaleAligned: lang.whaleAligned || 'Whales aligned',
    whaleUnavailable: lang.whaleUnavailable || 'Whale: data unavailable - not considered',
    biasAligned: lang.biasAligned || 'Bias confirmed',
    oiRising: lang.oiRising || 'OI rising',
    oiFalling: lang.oiFalling || 'OI falling',
    liquidityAligned: lang.liquidityAligned || 'Directional liquidity',
    educationalOnly: lang.educationalOnly || 'Educational context only',
    insufficientSignals: lang.insufficientSignals || 'Insufficient signals'
  };

  // Fetch all required data - using intelligence-state as Single Source of Truth
  useEffect(() => {
    const fetchData = async () => {
      try {
        // V3.7: Use intelligence-state as Single Source of Truth
        const headers = isAdmin ? getAdminHeaders() : {};
        
        // Primary: Synchronized Intelligence State
        const intelligenceRes = await fetch(`${API_URL}/api/intelligence-state`).then(r => r.json()).catch(() => null);
        setIntelligenceState(intelligenceRes);
        
        // Also fetch V3 for detailed setup info (admin only)
        const [v3Res, whaleRes] = await Promise.all([
          isAdmin ? fetch(`${API_URL}/api/v3/trade-signal?lang=${language}`, { headers }).then(r => r.json()).catch(() => null) : null,
          fetch(`${API_URL}/api/whale-activity`, { headers }).then(r => r.json()).catch(() => null)
        ]);
        
        // Use intelligence state data for consistency
        if (intelligenceRes?.is_synchronized) {
          setEnergyData(intelligenceRes.market_energy);
          setMagnetData({
            target_direction: intelligenceRes.liquidity_zones?.bias_direction,
            magnet_strength: intelligenceRes.liquidity_zones?.imbalance_ratio > 2 ? 'HIGH' : 'MEDIUM',
            liquidity_above: intelligenceRes.liquidity_zones?.total_above,
            liquidity_below: intelligenceRes.liquidity_zones?.total_below
          });
          setWhaleData({
            direction: intelligenceRes.whale_activity?.direction,
            buy_pressure: intelligenceRes.whale_activity?.buy_pressure,
            momentum_score: intelligenceState?.whale_activity?.momentum_score
          });
        } else {
          setWhaleData(whaleRes);
        }
        
        setV3Data(v3Res || intelligenceRes?.v3_setup);
      } catch (error) {
        console.error('Decision Engine fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [language, isAdmin, getAdminHeaders]);

  // ═══════════════════════════════════════════════════════════════════
  // DECISION ENGINE LOGIC - V3.7 Single Source of Truth
  // ═══════════════════════════════════════════════════════════════════
  
  const computeDecision = () => {
    const warnings = [];
    const alignedSignals = [];
    let finalAction = 'WAIT';
    let reason = '';
    let isConflict = false;

    // ═══════════════════════════════════════════════════════════════════
    // V3.7: Use Intelligence State as Single Source of Truth when available
    // ═══════════════════════════════════════════════════════════════════
    if (intelligenceState?.is_synchronized) {
      // Use pre-computed values from backend
      const syncedAction = intelligenceState.final_action;
      const syncedReason = intelligenceState.action_reason;
      const syncedV3 = intelligenceState.v3_setup;
      const syncedWhale = intelligenceState.whale_activity;
      const syncedLiq = intelligenceState.liquidity_zones;
      const syncedRegime = intelligenceState.market_regime;
      const syncedBias = intelligenceState.market_bias;
      
      // Map backend action to frontend format
      if (syncedAction === 'LONG' || syncedAction === 'LONG_CAUTION') {
        finalAction = 'LONG';
        reason = syncedReason;
        alignedSignals.push({ type: 'bullish', text: `V3 Setup LONG`, icon: TrendingUp });
        
        // Add whale caution warning
        if (syncedAction === 'LONG_CAUTION') {
          warnings.push({ 
            type: 'warning', 
            text: `Whale selling (${syncedWhale?.buy_pressure || 0}%) - cautela`, 
            icon: AlertTriangle 
          });
        }
      } else if (syncedAction === 'SHORT' || syncedAction === 'SHORT_CAUTION') {
        finalAction = 'SHORT';
        reason = syncedReason;
        alignedSignals.push({ type: 'bearish', text: `V3 Setup SHORT`, icon: TrendingDown });
        
        if (syncedAction === 'SHORT_CAUTION') {
          warnings.push({ 
            type: 'warning', 
            text: `Whale buying (${syncedWhale?.buy_pressure || 0}%) - cautela`, 
            icon: AlertTriangle 
          });
        }
      } else if (syncedAction?.startsWith('PREPARE_')) {
        finalAction = syncedAction.replace('PREPARE_', '');
        reason = syncedReason;
        warnings.push({ type: 'info', text: 'Prepara entry - attendi conferma', icon: Activity });
      } else {
        finalAction = 'WAIT';
        reason = syncedReason;
      }
      
      // Add liquidity zone info (Zones > Magnet per new hierarchy)
      if (syncedLiq?.imbalance_ratio >= 2) {
        const liqDir = syncedLiq.bias_direction;
        alignedSignals.push({ 
          type: liqDir === 'BULLISH' ? 'bullish' : liqDir === 'BEARISH' ? 'bearish' : 'neutral',
          text: `Liquidità ${liqDir} (${syncedLiq.imbalance_ratio?.toFixed(1)}x)`,
          icon: Activity 
        });
      } else if (syncedLiq?.bias_direction === 'NEUTRAL') {
        warnings.push({ type: 'warning', text: t.neutralLiquidity, icon: AlertTriangle });
      }
      
      // Add regime info
      if (syncedRegime?.regime === 'COMPRESSION') {
        warnings.push({ type: 'warning', text: t.compression, icon: Activity });
      }
      
      return { finalAction, reason, warnings, alignedSignals, isConflict: false, isWeakRR: false, hasV3Setup: syncedV3?.has_active_setup };
    }

    // ═══════════════════════════════════════════════════════════════════
    // FALLBACK: Original logic when intelligence state is not synchronized
    // ═══════════════════════════════════════════════════════════════════
    
    // Extract data safely
    const regime = energyData?.regime || energyData?.market_regime || 'UNKNOWN';
    const bias = v3Data?.market_context?.bias || marketBias?.bias || 'NEUTRAL';
    const biasPercent = v3Data?.market_context?.bias_percent || marketBias?.bias_percent || 50;
    const riskReward = v3Data?.risk_reward || v3Data?.active_setup?.risk_reward_ratio || 0;
    const magnetDirection = magnetData?.target_direction || 'NEUTRAL';
    const magnetStrength = magnetData?.magnet_strength || 'LOW';
    const whaleDirection = whaleData?.direction || null;  // null = unavailable
    const whalePressure = whaleData?.buy_pressure;  // undefined = unavailable
    const oiChange = openInterest?.change_24h || 0;
    const v3Direction = v3Data?.direction || v3Data?.active_setup?.direction || null;
    const liquidityDirection = liquidity?.direction || null;
    
    // ═══════════════════════════════════════════════════════════════════
    // V3.6 OPPORTUNITY MODE: PRIORITIZE V3 SETUP WHEN ACTIVE
    // If V3 has an active setup, use it directly - override other blocks
    // ═══════════════════════════════════════════════════════════════════
    const hasV3ActiveSetup = v3Data?.has_active_setup === true;
    const v3RecommendedAction = v3Data?.recommended_action;
    const v3QualityTier = v3Data?.quality_tier || v3Data?.active_setup?.quality_tier;
    const v3Phase = v3Data?.active_setup?.phase;
    
    // V3.6: If V3 has active setup, use it as the primary signal
    if (hasV3ActiveSetup && v3Direction) {
      finalAction = v3Direction; // 'LONG' or 'SHORT'
      
      // Build reason based on phase
      if (v3Phase === 'ENTRY_NOW' || v3Phase === 'ENTRY_READY') {
        reason = `Entry V3: ${v3Direction} (${v3QualityTier || 'SIGNAL'})`;
      } else if (v3Phase === 'PREPARE_ENTRY') {
        reason = `Prepara Entry: ${v3Direction}`;
      } else if (v3Phase === 'WAITING_FOR_RETEST') {
        reason = `Setup ${v3Direction} attivo - attendi retest`;
      } else {
        reason = `V3 Signal: ${v3Direction}`;
      }
      
      // Add aligned signals from V3
      alignedSignals.push({ type: v3Direction === 'LONG' ? 'bullish' : 'bearish', 
                           text: `V3 Setup ${v3Direction}`, 
                           icon: v3Direction === 'LONG' ? TrendingUp : TrendingDown });
      
      // Add warnings but DON'T block
      if (regime === 'COMPRESSION') {
        warnings.push({ type: 'warning', text: t.compression, icon: Activity });
      }
      if (magnetDirection === 'NEUTRAL' || magnetDirection === 'BALANCED') {
        warnings.push({ type: 'warning', text: t.neutralLiquidity, icon: AlertTriangle });
      }
      
      return { finalAction, reason, warnings, alignedSignals, isConflict: false, isWeakRR: false, hasV3Setup: true };
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // WHALE ACTIVITY AVAILABILITY CHECK
    // If whale data is unavailable, do NOT treat as bullish/bearish
    // Just note it and exclude from decision
    // ═══════════════════════════════════════════════════════════════════
    const isWhaleDataAvailable = whaleDirection !== null && 
                                  whaleDirection !== 'N/A' && 
                                  whaleDirection !== 'unavailable' &&
                                  whalePressure !== undefined &&
                                  whalePressure !== null;
    
    let whaleUnavailableNote = null;
    if (!isWhaleDataAvailable) {
      whaleUnavailableNote = { type: 'info', text: t.whaleUnavailable, icon: AlertTriangle };
    }

    // ─────────────────────────────────────────────────────────────────
    // RULE 1: BLOCK CONDITIONS → WAIT (only when NO V3 setup)
    // V3.6: Made these warnings instead of hard blocks
    // ─────────────────────────────────────────────────────────────────
    
    // Check: Liquidity = NEUTRAL (warning, not block)
    if (magnetDirection === 'NEUTRAL' || magnetDirection === 'BALANCED') {
      warnings.push({ type: 'warning', text: t.neutralLiquidity, icon: AlertTriangle });
    }
    
    // Check: Regime = COMPRESSION (warning, not block - compression precedes big moves)
    if (regime === 'COMPRESSION' || regime === 'HIGH') {
      warnings.push({ type: 'warning', text: t.compression, icon: Activity });
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // R:R OPERATIONAL PROTECTION
    // R:R < 0.3 → BLOCK (non-operational)
    // R:R 0.3-0.5 → WEAK (educational only, show warning)
    // R:R >= 0.5 → OPERATIONAL (normal behavior)
    // ═══════════════════════════════════════════════════════════════════
    let isWeakRR = false;
    
    if (riskReward > 0 && riskReward < 0.3) {
      // HARD BLOCK - R:R too low
      warnings.push({ type: 'block', text: t.lowRR, icon: Shield });
    } else if (riskReward >= 0.3 && riskReward < 0.5) {
      // WEAK - educational only
      isWeakRR = true;
      warnings.push({ type: 'warning', text: `${t.weakRR} (${riskReward.toFixed(2)})`, icon: Shield });
    }

    // If ANY block condition is true → WAIT
    const hasBlockCondition = warnings.some(w => w.type === 'block');
    
    if (hasBlockCondition) {
      finalAction = 'WAIT';
      reason = t.blockReason;
      // Add whale unavailable note if applicable
      const allWarnings = whaleUnavailableNote ? [...warnings, whaleUnavailableNote] : warnings;
      return { finalAction, reason, warnings: allWarnings.slice(0, 2), alignedSignals, isConflict: false, isWeakRR };
    }

    // ─────────────────────────────────────────────────────────────────
    // RULE 2: STRONG ALIGNMENT → LONG/SHORT
    // ─────────────────────────────────────────────────────────────────
    
    // Check bullish alignment
    const isBiasBullish = bias === 'BULLISH' || bias === 'bullish' || biasPercent > 60;
    const isOiRising = oiChange > 0;
    const isLiquidityUp = magnetDirection === 'UP' || liquidityDirection === 'UP' || liquidityDirection === 'bullish';
    
    // Check bearish alignment
    const isBiasBearish = bias === 'BEARISH' || bias === 'bearish' || biasPercent < 40;
    const isOiFalling = oiChange < 0;
    const isLiquidityDown = magnetDirection === 'DOWN' || liquidityDirection === 'DOWN' || liquidityDirection === 'bearish';
    
    // ═══════════════════════════════════════════════════════════════════
    // WHALE ACTIVITY - Confirmation layer only
    // If available: use as confirmation (strong BUY → supports LONG, etc.)
    // If unavailable: do NOT count, do NOT block, just note it
    // ═══════════════════════════════════════════════════════════════════
    let isWhaleBullish = false;
    let isWhaleBearish = false;
    
    if (isWhaleDataAvailable) {
      const isStrongBuy = whaleDirection === 'buying' || whaleDirection === 'BUYING' || whalePressure > 60;
      const isStrongSell = whaleDirection === 'selling' || whaleDirection === 'SELLING' || whalePressure < 40;
      // Weak/balanced (40-60) = neutral, non-decisive
      
      if (isStrongBuy) isWhaleBullish = true;
      if (isStrongSell) isWhaleBearish = true;
    }

    // Count aligned signals (excluding whale if unavailable)
    let bullishCount = 0;
    let bearishCount = 0;

    if (isBiasBullish) { bullishCount++; alignedSignals.push({ direction: 'LONG', text: t.biasAligned }); }
    if (isBiasBearish) { bearishCount++; }
    
    // Only count whale if data is available and strong
    if (isWhaleDataAvailable && isWhaleBullish) { 
      bullishCount++; 
      alignedSignals.push({ direction: 'LONG', text: t.whaleAligned }); 
    }
    if (isWhaleDataAvailable && isWhaleBearish) { 
      bearishCount++; 
    }
    
    if (isOiRising) { bullishCount++; alignedSignals.push({ direction: 'LONG', text: t.oiRising }); }
    if (isOiFalling) { bearishCount++; }
    
    if (isLiquidityUp) { bullishCount++; alignedSignals.push({ direction: 'LONG', text: t.liquidityAligned }); }
    if (isLiquidityDown) { bearishCount++; }

    // Calculate required alignment threshold
    // If whale unavailable, we have 3 signals instead of 4, so require 2+ for alignment
    const totalSignals = isWhaleDataAvailable ? 4 : 3;
    const alignmentThreshold = isWhaleDataAvailable ? 3 : 2;
    
    // Add whale unavailable note to all returns if applicable
    const addWhaleNote = (warningsArray) => {
      if (whaleUnavailableNote) {
        return [...warningsArray.slice(0, 1), whaleUnavailableNote].slice(0, 2);
      }
      return warningsArray.slice(0, 2);
    };

    // Strong alignment: signals agree (adjusted for available data)
    if (bullishCount >= alignmentThreshold && bearishCount === 0) {
      finalAction = 'LONG';
      reason = isWeakRR ? t.educationalOnly : t.alignedSignals;
      return { 
        finalAction: isWeakRR ? 'WAIT' : 'LONG',  // Weak R:R = still WAIT but show context
        reason, 
        warnings: addWhaleNote(warnings), 
        alignedSignals: alignedSignals.filter(s => s.direction === 'LONG'), 
        isConflict: false,
        isWeakRR,
        displayAction: 'LONG'  // Show what action WOULD be without R:R issue
      };
    }
    
    if (bearishCount >= alignmentThreshold && bullishCount === 0) {
      finalAction = 'SHORT';
      reason = isWeakRR ? t.educationalOnly : t.alignedSignals;
      // Build bearish aligned signals
      const bearishAligned = [];
      if (isBiasBearish) bearishAligned.push({ direction: 'SHORT', text: t.biasAligned });
      if (isWhaleDataAvailable && isWhaleBearish) bearishAligned.push({ direction: 'SHORT', text: t.whaleAligned });
      if (isOiFalling) bearishAligned.push({ direction: 'SHORT', text: t.oiRising.replace('aumento', 'calo').replace('rising', 'falling') });
      if (isLiquidityDown) bearishAligned.push({ direction: 'SHORT', text: t.liquidityAligned });
      return { 
        finalAction: isWeakRR ? 'WAIT' : 'SHORT',
        reason, 
        warnings: addWhaleNote(warnings), 
        alignedSignals: bearishAligned, 
        isConflict: false,
        isWeakRR,
        displayAction: 'SHORT'
      };
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
    reason = t.insufficientSignals;
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
