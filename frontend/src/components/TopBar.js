import React from 'react';
import { Menu, RefreshCw, HelpCircle, Globe } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { cn } from '../lib/utils';

export function TopBar() {
  const { 
    t, 
    marketStatus, 
    connectionStatus, 
    timeframe, 
    setTimeframe, 
    language, 
    setLanguage, 
    learnMode, 
    setLearnMode, 
    refreshAll, 
    setSidebarOpen,
    isLoading 
  } = useApp();

  const price = marketStatus?.price || 0;
  const change = marketStatus?.price_change_percent_24h || 0;
  const isPositive = change >= 0;

  const formatPrice = (p) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(p);
  };

  const formatChange = (c) => {
    const sign = c >= 0 ? '+' : '';
    return `${sign}${c.toFixed(2)}%`;
  };

  return (
    <header className="h-16 bg-crypto-bg/80 backdrop-blur-md border-b border-crypto-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-40" data-testid="topbar">
      {/* Left section */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button 
          onClick={() => setSidebarOpen(true)}
          className="md:hidden p-2 hover:bg-white/5 rounded-sm transition-colors"
          data-testid="mobile-menu-btn"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Price display */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wider hidden sm:inline">BTCUSDT</span>
            <span className="font-mono text-lg md:text-xl font-bold" data-testid="btc-price">
              {formatPrice(price)}
            </span>
          </div>
          <span 
            className={cn(
              "font-mono text-sm font-medium px-2 py-0.5 rounded-sm",
              isPositive ? "text-bullish bg-bullish/10" : "text-bearish bg-bearish/10"
            )}
            data-testid="btc-change"
          >
            {formatChange(change)}
          </span>
        </div>

        {/* Status indicator */}
        <div 
          className={cn(
            "hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-mono font-bold uppercase",
            connectionStatus === 'LIVE' && "text-bullish bg-bullish/10 border border-bullish/20",
            connectionStatus === 'DELAYED' && "text-yellow-500 bg-yellow-500/10 border border-yellow-500/20",
            connectionStatus === 'OFFLINE' && "text-bearish bg-bearish/10 border border-bearish/20"
          )}
          data-testid="connection-status"
        >
          <span className={cn(
            "w-1.5 h-1.5 rounded-full",
            connectionStatus === 'LIVE' && "bg-bullish animate-pulse",
            connectionStatus === 'DELAYED' && "bg-yellow-500",
            connectionStatus === 'OFFLINE' && "bg-bearish"
          )} />
          {t(connectionStatus.toLowerCase())}
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Timeframe selector */}
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-[70px] md:w-[80px] h-8 bg-crypto-surface border-crypto-border text-xs font-mono" data-testid="timeframe-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-crypto-card border-crypto-border">
            <SelectItem value="15m">15m</SelectItem>
            <SelectItem value="1h">1H</SelectItem>
            <SelectItem value="4h">4H</SelectItem>
            <SelectItem value="1d">1D</SelectItem>
          </SelectContent>
        </Select>

        {/* Language selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2" data-testid="language-select">
              <Globe className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-crypto-card border-crypto-border">
            <DropdownMenuItem onClick={() => setLanguage('en')} className={language === 'en' ? 'bg-white/5' : ''}>
              {t('english')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('it')} className={language === 'it' ? 'bg-white/5' : ''}>
              {t('italian')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('de')} className={language === 'de' ? 'bg-white/5' : ''}>
              {t('german')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Learn mode toggle */}
        <div className="hidden md:flex items-center gap-2">
          <HelpCircle className={cn("w-4 h-4", learnMode ? "text-whale" : "text-zinc-500")} />
          <Switch 
            checked={learnMode} 
            onCheckedChange={setLearnMode}
            className="data-[state=checked]:bg-whale"
            data-testid="learn-mode-toggle"
          />
        </div>

        {/* Refresh button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={refreshAll}
          disabled={isLoading}
          className="h-8 px-2"
          data-testid="refresh-btn"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
        </Button>
      </div>
    </header>
  );
}

export default TopBar;
