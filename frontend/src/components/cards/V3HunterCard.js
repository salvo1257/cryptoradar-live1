import React, { useState, useEffect } from 'react';
import { 
  Target, Shield, Clock, ChevronDown, ChevronUp, Activity, Zap,
  AlertTriangle, CheckCircle, Crosshair, Layers, RefreshCw,
  TrendingUp, TrendingDown, DollarSign, Percent, Lock
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useAccess } from '../../contexts/AccessContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Neon Colors
const NEON = {
  green: '#00FF9D',
  red: '#FF1E56',
  blue: '#00D4FF',
  yellow: '#FFD93D',
  purple: '#A855F7'
};

// Leg Status Colors
const LEG_STATUS = {
  PENDING: { color: 'text-zinc-400', bg: 'bg-zinc-500/20', label: 'In Attesa' },
  FILLED: { color: 'text-[#00FF9D]', bg: 'bg-[#00FF9D]/20', label: 'Eseguito' },
  CANCELLED: { color: 'text-zinc-500', bg: 'bg-zinc-600/20', label: 'Cancellato' }
};

// Deal Status Config
const DEAL_STATUS = {
  PLANNING: { color: 'text-blue-400', label: 'Pianificazione' },
  LEG_1_ACTIVE: { color: 'text-yellow-400', label: 'Leg 1 Attivo' },
  LEG_2_ACTIVE: { color: 'text-orange-400', label: 'Leg 2 Attivo' },
  LEG_3_ACTIVE: { color: 'text-purple-400', label: 'Leg 3 Attivo' },
  FULLY_LOADED: { color: 'text-[#00FF9D]', label: 'Posizione Completa' },
  CLOSED: { color: 'text-zinc-500', label: 'Chiuso' }
};

// Translations
const t = (key, lang = 'it') => {
  const translations = {
    it: {
      title: 'V3 HUNTER',
      subtitle: 'Strategia 10-20-70',
      noHunt: 'Nessuna caccia attiva',
      waitingForSetup: 'In attesa di setup valido',
      leg1: 'Leg 1 - Entry Strutturale',
      leg2: 'Leg 2 - Cluster Liquidazione',
      leg3: 'Leg 3 - Muro Istituzionale',
      allocation: 'Allocazione',
      averageEntry: 'Entry Medio',
      takeProfit: 'Take Profit',
      stopLoss: 'Stop Loss',
      noStop: 'Macro Invalidation',
      initiateLong: 'Inizia Caccia LONG',
      initiateShort: 'Inizia Caccia SHORT',
      monitor: 'Monitora Caccia',
      showDetails: 'Mostra Dettagli',
      hideDetails: 'Nascondi Dettagli',
      coinglass: 'CoinGlass',
      connected: 'Connesso',
      disconnected: 'Disconnesso',
      leverage: 'Leva',
      quality: 'Qualità Setup',
      confidence: 'Confidenza',
      clusters: 'Cluster Liquidazione',
      primaryWall: 'Muro Primario',
      above: 'Sopra',
      below: 'Sotto',
      liquidityValue: 'Valore Liquidità'
    },
    en: {
      title: 'V3 HUNTER',
      subtitle: '10-20-70 Strategy',
      noHunt: 'No active hunt',
      waitingForSetup: 'Waiting for valid setup',
      leg1: 'Leg 1 - Structural Entry',
      leg2: 'Leg 2 - Liquidation Cluster',
      leg3: 'Leg 3 - Institutional Wall',
      allocation: 'Allocation',
      averageEntry: 'Average Entry',
      takeProfit: 'Take Profit',
      stopLoss: 'Stop Loss',
      noStop: 'Macro Invalidation',
      initiateLong: 'Initiate LONG Hunt',
      initiateShort: 'Initiate SHORT Hunt',
      monitor: 'Monitor Hunt',
      showDetails: 'Show Details',
      hideDetails: 'Hide Details',
      coinglass: 'CoinGlass',
      connected: 'Connected',
      disconnected: 'Disconnected',
      leverage: 'Leverage',
      quality: 'Setup Quality',
      confidence: 'Confidence',
      clusters: 'Liquidation Clusters',
      primaryWall: 'Primary Wall',
      above: 'Above',
      below: 'Below',
      liquidityValue: 'Liquidity Value'
    }
  };
  return translations[lang]?.[key] || translations['it'][key] || key;
};

const formatPrice = (price) => {
  if (!price || isNaN(price)) return '—';
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const formatValue = (value) => {
  if (!value || isNaN(value)) return '—';
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

export function V3HunterCard({ language = 'it' }) {
  const { isAdmin, getAdminHeaders } = useAccess();
  const [hunterData, setHunterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [activating, setActivating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchHunterSignal = async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    try {
      const headers = getAdminHeaders();
      const response = await fetch(`${API_URL}/api/v3/hunter-signal?lang=${language}`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        setHunterData(data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('[V3 Hunter] Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const activateHunt = async (direction) => {
    if (activating) return;
    setActivating(true);

    try {
      const headers = getAdminHeaders();
      const response = await fetch(
        `${API_URL}/api/v3/hunter-deal/activate?direction=${direction}`,
        { method: 'POST', headers }
      );
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Refresh data
          await fetchHunterSignal();
        }
      }
    } catch (error) {
      console.error('[V3 Hunter] Activation error:', error);
    } finally {
      setActivating(false);
    }
  };

  useEffect(() => {
    fetchHunterSignal();
    const interval = setInterval(fetchHunterSignal, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, language]);

  if (!isAdmin) {
    return (
      <div className="premium-card rounded-lg p-6" data-testid="v3-hunter-card-locked">
        <div className="flex items-center justify-center gap-3 text-zinc-500">
          <Lock className="w-5 h-5" />
          <span>{t('title', language)} - Solo Admin</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="premium-card rounded-lg p-6 animate-pulse" data-testid="v3-hunter-card-loading">
        <div className="h-8 bg-zinc-700/50 rounded w-1/3 mb-4" />
        <div className="h-24 bg-zinc-700/50 rounded" />
      </div>
    );
  }

  const deal = hunterData?.active_deal;
  const hasActiveDeal = hunterData?.has_active_hunt && deal;
  const action = hunterData?.recommended_action || 'WAIT';
  const actionReason = hunterData?.action_reason || '';

  return (
    <TooltipProvider>
      <div 
        className={cn(
          "premium-card rounded-lg overflow-hidden",
          hasActiveDeal && deal?.direction === 'LONG' && "premium-card-bullish",
          hasActiveDeal && deal?.direction === 'SHORT' && "premium-card-bearish"
        )}
        data-testid="v3-hunter-card"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20 shadow-neon-whale">
              <Crosshair className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <span className="font-heading font-bold text-lg uppercase tracking-wider">
                {t('title', language)}
              </span>
              <div className="text-xs text-zinc-500">{t('subtitle', language)}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* CoinGlass Status */}
            <Tooltip>
              <TooltipTrigger>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    hunterData?.coinglass_connected 
                      ? "border-green-500/50 text-green-400" 
                      : "border-zinc-600 text-zinc-500"
                  )}
                >
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full mr-1.5",
                    hunterData?.coinglass_connected ? "bg-green-400 animate-pulse" : "bg-zinc-500"
                  )} />
                  CoinGlass
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {hunterData?.coinglass_connected 
                  ? t('connected', language) 
                  : t('disconnected', language)}
              </TooltipContent>
            </Tooltip>

            {/* Refresh */}
            <button
              onClick={fetchHunterSignal}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {hasActiveDeal ? (
            /* Active Deal Display */
            <div className="space-y-4">
              {/* Direction Badge */}
              <div className="flex items-center justify-between">
                <Badge 
                  className={cn(
                    "text-lg px-4 py-2 font-bold",
                    deal.direction === 'LONG' 
                      ? "bg-[#00FF9D]/20 text-[#00FF9D] border-[#00FF9D]/30" 
                      : "bg-[#FF1E56]/20 text-[#FF1E56] border-[#FF1E56]/30"
                  )}
                >
                  {deal.direction === 'LONG' ? <TrendingUp className="w-5 h-5 mr-2" /> : <TrendingDown className="w-5 h-5 mr-2" />}
                  {deal.direction} HUNT
                </Badge>

                <div className="text-right">
                  <div className="text-xs text-zinc-500">{t('quality', language)}</div>
                  <div className="font-bold text-lg">{deal.setup_quality}/100</div>
                </div>
              </div>

              {/* 10-20-70 Leg Visualization */}
              <div className="bg-zinc-900/50 rounded-lg p-4 space-y-3">
                {/* Leg 1 */}
                <LegRow 
                  leg={deal.leg_1}
                  label={t('leg1', language)}
                  language={language}
                />
                
                {/* Arrow */}
                <div className="flex justify-center">
                  <ChevronDown className="w-4 h-4 text-zinc-600" />
                </div>

                {/* Leg 2 */}
                <LegRow 
                  leg={deal.leg_2}
                  label={t('leg2', language)}
                  language={language}
                />

                {/* Arrow */}
                <div className="flex justify-center">
                  <ChevronDown className="w-4 h-4 text-zinc-600" />
                </div>

                {/* Leg 3 */}
                <LegRow 
                  leg={deal.leg_3}
                  label={t('leg3', language)}
                  isMainWall
                  language={language}
                />
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3">
                {/* Average Entry */}
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <div className="text-xs text-zinc-500 mb-1">{t('averageEntry', language)}</div>
                  <div className="font-mono font-bold text-white">
                    {formatPrice(deal.average_entry_price)}
                  </div>
                </div>

                {/* Take Profit */}
                <div className="bg-[#00FF9D]/10 rounded-lg p-3 border border-[#00FF9D]/20">
                  <div className="text-xs text-zinc-500 mb-1">{t('takeProfit', language)}</div>
                  <div className="font-mono font-bold text-[#00FF9D]">
                    {formatPrice(deal.take_profit)}
                  </div>
                </div>

                {/* Stop Loss */}
                <div className={cn(
                  "rounded-lg p-3",
                  deal.stop_loss 
                    ? "bg-[#FF1E56]/10 border border-[#FF1E56]/20" 
                    : "bg-zinc-800/50"
                )}>
                  <div className="text-xs text-zinc-500 mb-1">{t('stopLoss', language)}</div>
                  <div className={cn(
                    "font-mono font-bold",
                    deal.stop_loss ? "text-[#FF1E56]" : "text-zinc-500 text-sm"
                  )}>
                    {deal.stop_loss ? formatPrice(deal.stop_loss) : t('noStop', language)}
                  </div>
                </div>
              </div>

              {/* Leverage & Allocation */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {deal.leverage}x {t('leverage', language)}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      DEAL_STATUS[deal.deal_status]?.color
                    )}
                  >
                    {DEAL_STATUS[deal.deal_status]?.label || deal.deal_status}
                  </Badge>
                </div>
                <div className="text-zinc-400">
                  {t('allocation', language)}: <span className="font-bold text-white">{deal.total_allocated_percent}%</span>
                </div>
              </div>
            </div>
          ) : (
            /* No Active Deal - Show Clusters & Action Buttons */
            <div className="space-y-4">
              {/* Status Message */}
              <div className="text-center py-4">
                <Crosshair className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <div className="text-zinc-400">{t('noHunt', language)}</div>
                <div className="text-xs text-zinc-600 mt-1">{actionReason}</div>
              </div>

              {/* Primary Walls */}
              {(hunterData?.primary_wall_above || hunterData?.primary_wall_below) && (
                <div className="grid grid-cols-2 gap-3">
                  {/* Wall Below (for LONG) */}
                  {hunterData?.primary_wall_below && (
                    <div className="bg-zinc-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-[#00FF9D]" />
                        <span className="text-xs text-zinc-500">{t('primaryWall', language)} {t('below', language)}</span>
                      </div>
                      <div className="font-mono font-bold text-[#00FF9D]">
                        {formatPrice(hunterData.primary_wall_below.price)}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {formatValue(hunterData.primary_wall_below.value_usd)}
                      </div>
                    </div>
                  )}

                  {/* Wall Above (for SHORT) */}
                  {hunterData?.primary_wall_above && (
                    <div className="bg-zinc-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-[#FF1E56]" />
                        <span className="text-xs text-zinc-500">{t('primaryWall', language)} {t('above', language)}</span>
                      </div>
                      <div className="font-mono font-bold text-[#FF1E56]">
                        {formatPrice(hunterData.primary_wall_above.price)}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {formatValue(hunterData.primary_wall_above.value_usd)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {(action === 'INITIATE_LONG_HUNT' || action === 'INITIATE_SHORT_HUNT' || action === 'WAIT') && (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => activateHunt('LONG')}
                    disabled={activating || !hunterData?.primary_wall_below}
                    className={cn(
                      "bg-[#00FF9D]/20 hover:bg-[#00FF9D]/30 text-[#00FF9D] border border-[#00FF9D]/30",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    data-testid="initiate-long-hunt-btn"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    {t('initiateLong', language)}
                  </Button>

                  <Button
                    onClick={() => activateHunt('SHORT')}
                    disabled={activating || !hunterData?.primary_wall_above}
                    className={cn(
                      "bg-[#FF1E56]/20 hover:bg-[#FF1E56]/30 text-[#FF1E56] border border-[#FF1E56]/30",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    data-testid="initiate-short-hunt-btn"
                  >
                    <TrendingDown className="w-4 h-4 mr-2" />
                    {t('initiateShort', language)}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Expand/Collapse Details */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-4 pt-3 border-t border-white/5 flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            data-testid="hunter-toggle-details"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                {t('hideDetails', language)}
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                {t('showDetails', language)}
              </>
            )}
          </button>

          {/* Expanded Details */}
          {expanded && hunterData && (
            <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
              {/* Liquidation Clusters */}
              <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-800/40 p-4 rounded-lg border border-zinc-700/50">
                <div className="font-bold text-sm mb-3 flex items-center gap-2 text-zinc-300">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="uppercase tracking-wider">{t('clusters', language)}</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {hunterData.liquidation_clusters?.slice(0, 8).map((cluster, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          cluster.price < hunterData.current_price 
                            ? "bg-[#00FF9D]" 
                            : "bg-[#FF1E56]"
                        )} />
                        <span className="font-mono text-sm text-white">
                          {formatPrice(cluster.price)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500">
                          {cluster.distance_pct?.toFixed(2)}%
                        </span>
                        <span className={cn(
                          "font-mono text-sm",
                          cluster.price < hunterData.current_price 
                            ? "text-[#00FF9D]" 
                            : "text-[#FF1E56]"
                        )}>
                          {formatValue(cluster.value_usd)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Market Context */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-zinc-800/50 rounded-lg p-2">
                  <div className="text-xs text-zinc-500">Regime</div>
                  <div className="font-bold text-sm text-white">{hunterData.market_regime}</div>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-2">
                  <div className="text-xs text-zinc-500">Bias</div>
                  <div className={cn(
                    "font-bold text-sm",
                    hunterData.market_bias === 'BULLISH' ? "text-[#00FF9D]" :
                    hunterData.market_bias === 'BEARISH' ? "text-[#FF1E56]" :
                    "text-zinc-400"
                  )}>
                    {hunterData.market_bias}
                  </div>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-2">
                  <div className="text-xs text-zinc-500">Prezzo</div>
                  <div className="font-mono font-bold text-sm text-white">
                    {formatPrice(hunterData.current_price)}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-2">
                <p className="text-xs italic text-zinc-500">
                  V3 Hunter Engine • Stop-Loss Hunting • 10-20-70 Capital Allocation
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// Leg Row Component
function LegRow({ leg, label, isMainWall = false, language = 'it' }) {
  const status = LEG_STATUS[leg?.status] || LEG_STATUS.PENDING;
  
  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg",
      isMainWall ? "bg-purple-500/10 border border-purple-500/30" : "bg-zinc-800/50"
    )}>
      <div className="flex items-center gap-3">
        {/* Allocation Badge */}
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
          leg?.allocation_percent === 70 ? "bg-purple-500/30 text-purple-300" :
          leg?.allocation_percent === 20 ? "bg-orange-500/30 text-orange-300" :
          "bg-blue-500/30 text-blue-300"
        )}>
          {leg?.allocation_percent}%
        </div>

        <div>
          <div className="text-sm font-medium text-white">{label}</div>
          <div className="text-xs text-zinc-500">{leg?.reason || '—'}</div>
        </div>
      </div>

      <div className="text-right">
        <div className="font-mono font-bold text-lg text-white">
          {formatPrice(leg?.price)}
        </div>
        <Badge 
          variant="outline" 
          className={cn("text-xs", status.color, status.bg)}
        >
          {status.label}
        </Badge>
      </div>
    </div>
  );
}

export default V3HunterCard;
