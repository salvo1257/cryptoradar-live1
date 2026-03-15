import React, { useState } from 'react';
import { Ruler, RotateCcw, ArrowUpRight, ArrowDownRight, Percent } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useApp } from '../../contexts/AppContext';

export function PriceMeasurementTool() {
  const { t, language } = useApp();
  const [priceA, setPriceA] = useState('');
  const [priceB, setPriceB] = useState('');
  const [result, setResult] = useState(null);

  const calculatePercentage = () => {
    const a = parseFloat(priceA.replace(/,/g, ''));
    const b = parseFloat(priceB.replace(/,/g, ''));
    
    if (isNaN(a) || isNaN(b) || a === 0) {
      setResult(null);
      return;
    }
    
    const percentChange = ((b - a) / a) * 100;
    const absoluteChange = b - a;
    
    setResult({
      percent: percentChange,
      absolute: absoluteChange,
      isPositive: percentChange >= 0
    });
  };

  const reset = () => {
    setPriceA('');
    setPriceB('');
    setResult(null);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <div className="bg-crypto-card/60 border border-crypto-border rounded-sm p-4" data-testid="measurement-tool">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Ruler className="w-5 h-5 text-crypto-accent" />
          <h3 className="font-heading font-semibold">
            {language === 'it' ? 'Strumento di Misura' : 'Measurement Tool'}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={reset}
          className="h-7 w-7 text-zinc-500 hover:text-white"
          data-testid="measurement-reset"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Instructions */}
      <p className="text-xs text-zinc-500 mb-4">
        {language === 'it' 
          ? 'Inserisci due prezzi per calcolare la variazione percentuale tra di essi.'
          : 'Enter two prices to calculate the percentage change between them.'}
      </p>

      {/* Input Fields */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">
            {language === 'it' ? 'Prezzo A (Partenza)' : 'Price A (Start)'}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
            <Input
              type="text"
              value={priceA}
              onChange={(e) => setPriceA(e.target.value)}
              placeholder="70,000"
              className="pl-7 bg-crypto-surface border-crypto-border font-mono"
              data-testid="price-a-input"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">
            {language === 'it' ? 'Prezzo B (Arrivo)' : 'Price B (End)'}
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
            <Input
              type="text"
              value={priceB}
              onChange={(e) => setPriceB(e.target.value)}
              placeholder="72,500"
              className="pl-7 bg-crypto-surface border-crypto-border font-mono"
              data-testid="price-b-input"
            />
          </div>
        </div>
      </div>

      {/* Calculate Button */}
      <Button
        onClick={calculatePercentage}
        className="w-full bg-crypto-accent hover:bg-crypto-accent/80 text-black font-semibold mb-4"
        data-testid="calculate-btn"
      >
        <Percent className="w-4 h-4 mr-2" />
        {language === 'it' ? 'Calcola Variazione' : 'Calculate Change'}
      </Button>

      {/* Result Display */}
      {result !== null && (
        <div className={cn(
          "p-4 rounded-sm border",
          result.isPositive 
            ? "bg-bullish/10 border-bullish/30" 
            : "bg-bearish/10 border-bearish/30"
        )} data-testid="measurement-result">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">
              {language === 'it' ? 'Variazione Percentuale' : 'Percentage Change'}
            </span>
            {result.isPositive 
              ? <ArrowUpRight className="w-5 h-5 text-bullish" />
              : <ArrowDownRight className="w-5 h-5 text-bearish" />
            }
          </div>
          
          <div className={cn(
            "text-3xl font-mono font-bold mb-2",
            result.isPositive ? "text-bullish" : "text-bearish"
          )}>
            {result.isPositive ? '+' : ''}{formatNumber(result.percent)}%
          </div>
          
          <div className="text-sm text-zinc-400">
            {language === 'it' ? 'Variazione assoluta' : 'Absolute change'}: 
            <span className={cn(
              "font-mono ml-2",
              result.isPositive ? "text-bullish" : "text-bearish"
            )}>
              {result.isPositive ? '+' : ''}${formatNumber(result.absolute)}
            </span>
          </div>
          
          {/* Quick Reference */}
          <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
            <div className="text-zinc-500">
              {language === 'it' ? 'Da' : 'From'}: <span className="text-white font-mono">${priceA}</span>
            </div>
            <div className="text-zinc-500">
              {language === 'it' ? 'A' : 'To'}: <span className="text-white font-mono">${priceB}</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Examples */}
      <div className="mt-4 pt-4 border-t border-crypto-border">
        <p className="text-[10px] text-zinc-600 mb-2">
          {language === 'it' ? 'Esempi rapidi:' : 'Quick examples:'}
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setPriceA('70000'); setPriceB('71400'); }}
            className="text-[10px] px-2 py-1 bg-crypto-surface rounded hover:bg-crypto-surface/80 text-zinc-400"
          >
            +2% {language === 'it' ? 'movimento' : 'move'}
          </button>
          <button
            onClick={() => { setPriceA('70000'); setPriceB('68600'); }}
            className="text-[10px] px-2 py-1 bg-crypto-surface rounded hover:bg-crypto-surface/80 text-zinc-400"
          >
            -2% {language === 'it' ? 'movimento' : 'move'}
          </button>
          <button
            onClick={() => { setPriceA('70000'); setPriceB('73500'); }}
            className="text-[10px] px-2 py-1 bg-crypto-surface rounded hover:bg-crypto-surface/80 text-zinc-400"
          >
            +5% {language === 'it' ? 'movimento' : 'move'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PriceMeasurementTool;
