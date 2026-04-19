import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, Play, RotateCcw, Target, Crosshair, TrendingUp, TrendingDown,
  CheckCircle, XCircle, Clock, Activity, ChevronRight, Calendar, Zap,
  BarChart3, Settings, RefreshCw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useAccess } from '../../contexts/AccessContext';
import { useApp } from '../../contexts/AppContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const NEON = {
  green: '#00FF9D',
  red: '#FF1E56',
  blue: '#00D4FF',
  yellow: '#FFD93D',
  purple: '#A855F7'
};

const translations = {
  it: {
    title: 'Strategy Lab V4',
    subtitle: 'Simulazione e Backtest Avanzato',
    sniper: 'SNIPER Strategy',
    hunter: 'HUNTER Strategy',
    direction: 'Direzione',
    entry: 'Entry Price',
    stop: 'Stop Loss',
    target1: 'Target 1',
    target2: 'Target 2',
    leg1: 'Leg 1 (10%)',
    leg2: 'Leg 2 (20%)',
    leg3: 'Leg 3 (70%)',
    tp: 'Take Profit',
    simulate: 'Simula Trade',
    reset: 'Reset',
    timeline: 'Timeline Eventi',
    outcome: 'Esito',
    pnl: 'P&L',
    events: 'Eventi',
    noSimulation: 'Configura i parametri e clicca "Simula Trade"',
    comparison: 'Confronto Strategie',
    loadingData: 'Caricamento dati storici...',
    historicalData: 'Dati Storici',
    days: 'giorni',
    candles: 'candele'
  },
  en: {
    title: 'Strategy Lab V4',
    subtitle: 'Advanced Simulation & Backtest',
    sniper: 'SNIPER Strategy',
    hunter: 'HUNTER Strategy',
    direction: 'Direction',
    entry: 'Entry Price',
    stop: 'Stop Loss',
    target1: 'Target 1',
    target2: 'Target 2',
    leg1: 'Leg 1 (10%)',
    leg2: 'Leg 2 (20%)',
    leg3: 'Leg 3 (70%)',
    tp: 'Take Profit',
    simulate: 'Simulate Trade',
    reset: 'Reset',
    timeline: 'Events Timeline',
    outcome: 'Outcome',
    pnl: 'P&L',
    events: 'Events',
    noSimulation: 'Configure parameters and click "Simulate Trade"',
    comparison: 'Strategy Comparison',
    loadingData: 'Loading historical data...',
    historicalData: 'Historical Data',
    days: 'days',
    candles: 'candles'
  }
};

const formatPrice = (price) => {
  if (!price || isNaN(price)) return '—';
  return `$${parseFloat(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Timeline Event Component
function TimelineEvent({ event, isLast }) {
  const eventConfig = {
    entry: { color: NEON.blue, icon: Play, label: 'Entry' },
    stop_hit: { color: NEON.red, icon: XCircle, label: 'Stop Loss' },
    target_1: { color: NEON.green, icon: CheckCircle, label: 'Target 1' },
    target_2: { color: NEON.green, icon: CheckCircle, label: 'Target 2' },
    leg_1: { color: NEON.blue, icon: Target, label: 'Leg 1 Filled' },
    leg_2: { color: NEON.yellow, icon: Target, label: 'Leg 2 Filled' },
    leg_3: { color: NEON.purple, icon: Target, label: 'Leg 3 Filled' }
  };

  const config = eventConfig[event.type] || { color: NEON.blue, icon: Clock, label: event.type };
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-4">
      {/* Timeline dot and line */}
      <div className="flex flex-col items-center">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${config.color}20`, border: `2px solid ${config.color}` }}
        >
          <Icon className="w-5 h-5" style={{ color: config.color }} />
        </div>
        {!isLast && (
          <div className="w-0.5 h-16 bg-zinc-700 mt-2" />
        )}
      </div>

      {/* Event content */}
      <div className="flex-1 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-white">{event.label || config.label}</div>
            <div className="text-xs text-zinc-500">
              {new Date(event.timestamp).toLocaleString('it-IT', { 
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
              })}
            </div>
          </div>
          <div className="font-mono font-bold text-lg" style={{ color: config.color }}>
            {formatPrice(event.price)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Simulation Result Card
function SimulationResult({ result, t }) {
  if (!result) {
    return (
      <div className="premium-card rounded-lg p-8 text-center">
        <FlaskConical className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
        <p className="text-zinc-500">{t('noSimulation')}</p>
      </div>
    );
  }

  const outcomeConfig = {
    win: { color: NEON.green, icon: CheckCircle, label: 'VINCITA' },
    loss: { color: NEON.red, icon: XCircle, label: 'PERDITA' },
    partial: { color: NEON.yellow, icon: CheckCircle, label: 'PARZIALE' },
    pending: { color: NEON.blue, icon: Clock, label: 'IN CORSO' }
  };

  const outcome = outcomeConfig[result.outcome] || outcomeConfig.pending;
  const OutcomeIcon = outcome.icon;

  return (
    <div className="space-y-4">
      {/* Outcome Summary */}
      <div className={cn(
        "premium-card rounded-lg p-5 border-l-4",
        result.outcome === 'win' && "border-l-[#00FF9D]",
        result.outcome === 'loss' && "border-l-[#FF1E56]",
        result.outcome === 'partial' && "border-l-yellow-400",
        result.outcome === 'pending' && "border-l-blue-400"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${outcome.color}20` }}
            >
              <OutcomeIcon className="w-6 h-6" style={{ color: outcome.color }} />
            </div>
            <div>
              <div className="text-xs text-zinc-500">{t('outcome')}</div>
              <div className="text-xl font-bold" style={{ color: outcome.color }}>
                {outcome.label}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-zinc-500">{t('pnl')}</div>
            <div 
              className="text-3xl font-bold font-mono"
              style={{ color: result.pnl_percent >= 0 ? NEON.green : NEON.red }}
            >
              {result.pnl_percent >= 0 ? '+' : ''}{result.pnl_percent?.toFixed(2) || 0}%
            </div>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 mt-4">
          <Badge variant="outline" className={cn(
            "text-xs",
            result.entry_hit ? "text-[#00FF9D] border-[#00FF9D]/30" : "text-zinc-500 border-zinc-500/30"
          )}>
            Entry: {result.entry_hit ? 'HIT' : 'MISS'}
          </Badge>
          <Badge variant="outline" className={cn(
            "text-xs",
            result.target_1_hit ? "text-[#00FF9D] border-[#00FF9D]/30" : "text-zinc-500 border-zinc-500/30"
          )}>
            T1: {result.target_1_hit ? 'HIT' : 'MISS'}
          </Badge>
          <Badge variant="outline" className={cn(
            "text-xs",
            result.target_2_hit ? "text-[#00FF9D] border-[#00FF9D]/30" : "text-zinc-500 border-zinc-500/30"
          )}>
            T2: {result.target_2_hit ? 'HIT' : 'MISS'}
          </Badge>
          <Badge variant="outline" className={cn(
            "text-xs",
            result.stop_hit ? "text-[#FF1E56] border-[#FF1E56]/30" : "text-zinc-500 border-zinc-500/30"
          )}>
            Stop: {result.stop_hit ? 'HIT' : 'SAFE'}
          </Badge>
        </div>
      </div>

      {/* Timeline */}
      {result.events && result.events.length > 0 && (
        <div className="premium-card rounded-lg p-5">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#00D4FF]" />
            {t('timeline')}
          </h3>
          <div className="pl-2">
            {result.events.map((event, idx) => (
              <TimelineEvent 
                key={idx} 
                event={event} 
                isLast={idx === result.events.length - 1} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StrategyLabV4Page() {
  const { language } = useApp();
  const { isAdmin, getAdminHeaders } = useAccess();
  const t = (key) => translations[language]?.[key] || translations['it'][key] || key;

  const [strategy, setStrategy] = useState('sniper');
  const [direction, setDirection] = useState('LONG');
  const [historicalData, setHistoricalData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  // Sniper params
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [target1, setTarget1] = useState('');
  const [target2, setTarget2] = useState('');

  // Hunter params
  const [leg1Price, setLeg1Price] = useState('');
  const [leg2Price, setLeg2Price] = useState('');
  const [leg3Price, setLeg3Price] = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  // Fetch historical data on mount
  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (!isAdmin) return;
      
      setLoadingData(true);
      try {
        const headers = getAdminHeaders();
        const res = await fetch(`${API_URL}/api/v4/strategy-lab/historical-data?days=90&interval=4h`, { headers });
        if (res.ok) {
          const data = await res.json();
          setHistoricalData(data);
          
          // Pre-fill with current price if available
          if (data.candles && data.candles.length > 0) {
            const lastCandle = data.candles[data.candles.length - 1];
            const currentPrice = lastCandle.close;
            
            // Auto-fill sniper defaults
            setEntryPrice(currentPrice.toFixed(0));
            setStopLoss((currentPrice * 0.98).toFixed(0));
            setTarget1((currentPrice * 1.02).toFixed(0));
            setTarget2((currentPrice * 1.04).toFixed(0));
            
            // Auto-fill hunter defaults
            setLeg1Price(currentPrice.toFixed(0));
            setLeg2Price((currentPrice * 0.985).toFixed(0));
            setLeg3Price((currentPrice * 0.97).toFixed(0));
            setTakeProfit((currentPrice * 1.03).toFixed(0));
          }
        }
      } catch (error) {
        console.error('[Strategy Lab] Error fetching historical data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchHistoricalData();
  }, [isAdmin]);

  const handleSimulate = async () => {
    if (simulating) return;
    setSimulating(true);
    setSimulationResult(null);

    try {
      const headers = getAdminHeaders();
      let url = `${API_URL}/api/v4/strategy-lab/simulate?strategy=${strategy}&direction=${direction}`;
      
      if (strategy === 'sniper') {
        url += `&entry_price=${entryPrice}&stop_loss=${stopLoss}&target_1=${target1}&target_2=${target2}`;
      } else {
        url += `&entry_price=${leg1Price}&stop_loss=${stopLoss || (direction === 'SHORT' ? leg3Price * 1.005 : 0)}`;
        url += `&target_1=${takeProfit}&leg_2_price=${leg2Price}&leg_3_price=${leg3Price}`;
      }

      const res = await fetch(url, { method: 'POST', headers });
      if (res.ok) {
        const result = await res.json();
        setSimulationResult(result);
      }
    } catch (error) {
      console.error('[Strategy Lab] Simulation error:', error);
    } finally {
      setSimulating(false);
    }
  };

  const handleReset = () => {
    setSimulationResult(null);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        <Activity className="w-6 h-6 mr-2" />
        Accesso Admin Richiesto
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8" data-testid="strategy-lab-v4-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-green-500/30">
            <FlaskConical className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">{t('title')}</h1>
            <p className="text-zinc-400">{t('subtitle')}</p>
          </div>
        </div>

        {/* Historical data info */}
        {historicalData && (
          <Badge variant="outline" className="text-xs text-zinc-400">
            <Calendar className="w-3 h-3 mr-1" />
            {historicalData.days} {t('days')} • {historicalData.count} {t('candles')}
          </Badge>
        )}
      </div>

      {loadingData ? (
        <div className="premium-card rounded-lg p-12 text-center">
          <RefreshCw className="w-8 h-8 mx-auto text-zinc-500 animate-spin mb-3" />
          <p className="text-zinc-500">{t('loadingData')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* Left: Configuration */}
          <div className="space-y-4">
            {/* Strategy Selector */}
            <Tabs value={strategy} onValueChange={setStrategy}>
              <TabsList className="grid grid-cols-2 w-full bg-zinc-800/50">
                <TabsTrigger value="sniper" className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {t('sniper')}
                </TabsTrigger>
                <TabsTrigger value="hunter" className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4" />
                  {t('hunter')}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Direction */}
            <div className="premium-card rounded-lg p-4">
              <Label className="text-xs text-zinc-500 mb-2 block">{t('direction')}</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={direction === 'LONG' ? 'default' : 'outline'}
                  onClick={() => setDirection('LONG')}
                  className={cn(
                    direction === 'LONG' && "bg-[#00FF9D]/20 text-[#00FF9D] border-[#00FF9D]/30"
                  )}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  LONG
                </Button>
                <Button
                  variant={direction === 'SHORT' ? 'default' : 'outline'}
                  onClick={() => setDirection('SHORT')}
                  className={cn(
                    direction === 'SHORT' && "bg-[#FF1E56]/20 text-[#FF1E56] border-[#FF1E56]/30"
                  )}
                >
                  <TrendingDown className="w-4 h-4 mr-2" />
                  SHORT
                </Button>
              </div>
            </div>

            {/* Strategy Parameters */}
            <div className="premium-card rounded-lg p-4 space-y-4">
              {strategy === 'sniper' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-zinc-500">{t('entry')}</Label>
                      <Input 
                        type="number"
                        value={entryPrice}
                        onChange={(e) => setEntryPrice(e.target.value)}
                        className="bg-zinc-800/50 border-zinc-700 font-mono"
                        placeholder="75000"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-500">{t('stop')}</Label>
                      <Input 
                        type="number"
                        value={stopLoss}
                        onChange={(e) => setStopLoss(e.target.value)}
                        className="bg-zinc-800/50 border-zinc-700 font-mono"
                        placeholder="73500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-zinc-500">{t('target1')}</Label>
                      <Input 
                        type="number"
                        value={target1}
                        onChange={(e) => setTarget1(e.target.value)}
                        className="bg-zinc-800/50 border-zinc-700 font-mono"
                        placeholder="76500"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-500">{t('target2')}</Label>
                      <Input 
                        type="number"
                        value={target2}
                        onChange={(e) => setTarget2(e.target.value)}
                        className="bg-zinc-800/50 border-zinc-700 font-mono"
                        placeholder="78000"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-zinc-500">{t('leg1')}</Label>
                      <Input 
                        type="number"
                        value={leg1Price}
                        onChange={(e) => setLeg1Price(e.target.value)}
                        className="bg-blue-500/10 border-blue-500/30 font-mono"
                        placeholder="75000"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-500">{t('leg2')}</Label>
                      <Input 
                        type="number"
                        value={leg2Price}
                        onChange={(e) => setLeg2Price(e.target.value)}
                        className="bg-orange-500/10 border-orange-500/30 font-mono"
                        placeholder="74000"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-zinc-500">{t('leg3')}</Label>
                      <Input 
                        type="number"
                        value={leg3Price}
                        onChange={(e) => setLeg3Price(e.target.value)}
                        className="bg-purple-500/10 border-purple-500/30 font-mono"
                        placeholder="73000"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">{t('tp')}</Label>
                    <Input 
                      type="number"
                      value={takeProfit}
                      onChange={(e) => setTakeProfit(e.target.value)}
                      className="bg-[#00FF9D]/10 border-[#00FF9D]/30 font-mono"
                      placeholder="77000"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                onClick={handleSimulate}
                disabled={simulating}
                className="flex-1 bg-gradient-to-r from-green-500/20 to-blue-500/20 hover:from-green-500/30 hover:to-blue-500/30 text-white border border-green-500/30"
              >
                {simulating ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {t('simulate')}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleReset}
                className="text-zinc-400"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {t('reset')}
              </Button>
            </div>
          </div>

          {/* Right: Results */}
          <div>
            <SimulationResult result={simulationResult} t={t} />
          </div>
        </div>
      )}
    </div>
  );
}
