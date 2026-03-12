import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, MinusCircle, Target, Shield, 
  AlertTriangle, Activity, RefreshCw, ChevronDown, ChevronUp,
  Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Progress } from '../ui/progress';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function TradeSignalCard({ compact = false }) {
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchSignal = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/trade-signal`);
      const data = await response.json();
      setSignal(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching trade signal:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignal();
    const interval = setInterval(fetchSignal, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (p) => {
    if (!p) return '-';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(p);
  };

  const getDirectionConfig = (direction) => {
    switch (direction) {
      case 'LONG':
        return {
          icon: TrendingUp,
          color: 'bullish',
          bgClass: 'bg-bullish/10',
          borderClass: 'border-bullish',
          textClass: 'text-bullish',
          glowClass: 'glow-bullish'
        };
      case 'SHORT':
        return {
          icon: TrendingDown,
          color: 'bearish',
          bgClass: 'bg-bearish/10',
          borderClass: 'border-bearish',
          textClass: 'text-bearish',
          glowClass: 'glow-bearish'
        };
      default:
        return {
          icon: MinusCircle,
          color: 'zinc-400',
          bgClass: 'bg-zinc-800',
          borderClass: 'border-zinc-600',
          textClass: 'text-zinc-400',
          glowClass: ''
        };
    }
  };

  if (loading && !signal) {
    return (
      <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm p-6 animate-pulse">
        <div className="h-8 bg-crypto-surface rounded w-1/3 mb-4" />
        <div className="h-24 bg-crypto-surface rounded" />
      </div>
    );
  }

  if (!signal) return null;

  const config = getDirectionConfig(signal.direction);
  const DirectionIcon = config.icon;

  return (
    <div 
      className={cn(
        "bg-crypto-card/60 backdrop-blur-sm border-2 rounded-sm overflow-hidden tech-card",
        config.borderClass
      )}
      data-testid="trade-signal-card"
    >
      {/* Header */}
      <div className={cn("px-4 py-3 border-b border-white/5", config.bgClass)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-whale" />
            <h3 className="font-heading font-bold text-sm uppercase tracking-wider">Trade Signal</h3>
          </div>
          <button 
            onClick={fetchSignal}
            className="p-1.5 hover:bg-white/10 rounded-sm transition-colors"
            title="Refresh signal"
          >
            <RefreshCw className={cn("w-4 h-4 text-zinc-400", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Main Signal Display */}
      <div className="p-4">
        {/* Direction Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-sm",
            config.bgClass,
            config.glowClass
          )}>
            <DirectionIcon className={cn("w-10 h-10", config.textClass)} />
            <div>
              <div className={cn("text-2xl font-mono font-bold", config.textClass)}>
                {signal.direction}
              </div>
              <div className="text-xs text-zinc-500">Signal Direction</div>
            </div>
          </div>
          
          {/* Confidence */}
          <div className="text-right">
            <div className="text-3xl font-mono font-bold">{signal.confidence?.toFixed(0)}%</div>
            <div className="text-xs text-zinc-500">Confidence</div>
            <Progress 
              value={signal.confidence || 0} 
              className="h-1.5 w-24 mt-1 bg-zinc-800"
              indicatorClassName={cn(
                signal.direction === 'LONG' && "bg-bullish",
                signal.direction === 'SHORT' && "bg-bearish",
                signal.direction === 'NO TRADE' && "bg-zinc-500"
              )}
            />
          </div>
        </div>

        {/* Estimated Move */}
        {signal.direction !== 'NO TRADE' && signal.estimated_move !== 0 && (
          <div className={cn(
            "flex items-center justify-center py-3 rounded-sm mb-4",
            config.bgClass
          )}>
            <span className="text-xs text-zinc-400 mr-2">Expected Move:</span>
            <span className={cn("text-xl font-mono font-bold", config.textClass)}>
              {signal.estimated_move > 0 ? '+' : ''}{signal.estimated_move?.toFixed(2)}%
            </span>
          </div>
        )}

        {/* Trade Parameters Grid */}
        {signal.direction !== 'NO TRADE' && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Entry Zone */}
            <div className="bg-crypto-surface/50 p-3 rounded-sm">
              <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Entry Zone
              </div>
              <div className="font-mono text-sm">
                ${formatPrice(signal.entry_zone_low)} - ${formatPrice(signal.entry_zone_high)}
              </div>
            </div>

            {/* Stop Loss */}
            <div className="bg-crypto-surface/50 p-3 rounded-sm">
              <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                <Shield className="w-3 h-3 text-bearish" />
                Stop Loss
              </div>
              <div className="font-mono text-sm text-bearish">
                ${formatPrice(signal.stop_loss)}
              </div>
            </div>

            {/* Target 1 */}
            <div className="bg-crypto-surface/50 p-3 rounded-sm">
              <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                <Target className="w-3 h-3 text-bullish" />
                Target 1
              </div>
              <div className="font-mono text-sm text-bullish">
                ${formatPrice(signal.target_1)}
              </div>
            </div>

            {/* Target 2 */}
            <div className="bg-crypto-surface/50 p-3 rounded-sm">
              <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1">
                <Target className="w-3 h-3 text-whale" />
                Target 2
              </div>
              <div className="font-mono text-sm text-whale">
                ${formatPrice(signal.target_2)}
              </div>
            </div>
          </div>
        )}

        {/* Risk/Reward */}
        {signal.direction !== 'NO TRADE' && signal.risk_reward_ratio > 0 && (
          <div className="flex items-center justify-between py-2 px-3 bg-crypto-surface/30 rounded-sm mb-4">
            <span className="text-xs text-zinc-500">Risk/Reward Ratio</span>
            <span className={cn(
              "font-mono font-bold",
              signal.risk_reward_ratio >= 2 ? "text-bullish" : 
              signal.risk_reward_ratio >= 1 ? "text-yellow-500" : "text-bearish"
            )}>
              {signal.risk_reward_ratio?.toFixed(1)}:1
            </span>
          </div>
        )}

        {/* Warnings */}
        {signal.warnings && signal.warnings.length > 0 && (
          <div className="mb-4">
            {signal.warnings.map((warning, idx) => (
              <div 
                key={idx}
                className="flex items-start gap-2 py-2 px-3 bg-yellow-500/10 border border-yellow-500/20 rounded-sm mb-1"
              >
                <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-yellow-400">{warning}</span>
              </div>
            ))}
          </div>
        )}

        {/* Invalidation */}
        {signal.invalidation_reason && signal.direction !== 'NO TRADE' && (
          <div className="py-2 px-3 bg-bearish/5 border border-bearish/20 rounded-sm mb-4">
            <div className="text-xs text-zinc-500 mb-1">Invalidation</div>
            <div className="text-xs text-bearish">{signal.invalidation_reason}</div>
          </div>
        )}

        {/* Expand/Collapse for Details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-2 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          {expanded ? (
            <>Hide Details <ChevronUp className="w-4 h-4" /></>
          ) : (
            <>Show Details <ChevronDown className="w-4 h-4" /></>
          )}
        </button>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/5 space-y-3">
            {/* Reasoning */}
            <div className="bg-crypto-surface/30 p-3 rounded-sm">
              <div className="text-xs text-zinc-500 mb-2">Signal Reasoning</div>
              <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
                {signal.reasoning}
              </pre>
            </div>

            {/* Factor Breakdown */}
            <div className="bg-crypto-surface/30 p-3 rounded-sm">
              <div className="text-xs text-zinc-500 mb-2">Factor Breakdown</div>
              <div className="space-y-2">
                {Object.entries(signal.factors || {}).map(([key, factor]) => {
                  if (!factor || typeof factor !== 'object') return null;
                  const score = factor.score || 0;
                  const max = factor.max || 1;
                  const percentage = (Math.abs(score) / max) * 100;
                  
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400 capitalize">
                          {key.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              score > 0 ? "bg-bullish" : score < 0 ? "bg-bearish" : "bg-zinc-600"
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className={cn(
                          "font-mono text-xs w-8 text-right",
                          score > 0 ? "text-bullish" : score < 0 ? "text-bearish" : "text-zinc-500"
                        )}>
                          {score > 0 ? '+' : ''}{score}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Validity */}
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Valid for: {signal.valid_for}</span>
              {lastUpdate && (
                <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TradeSignalCard;
