import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';
import { Progress } from '../ui/progress';

export function OrderBookCard() {
  const { t, orderBook } = useApp();

  if (!orderBook) {
    return (
      <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm p-4 animate-pulse">
        <div className="h-6 bg-crypto-surface rounded w-1/2 mb-4" />
        <div className="h-24 bg-crypto-surface rounded" />
      </div>
    );
  }

  const formatPrice = (p) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(p);
  };

  const formatQuantity = (q) => {
    return q >= 1000 ? `${(q/1000).toFixed(2)}K` : q.toFixed(4);
  };

  const imbalanceAbs = Math.abs(orderBook.imbalance);
  const imbalancePercent = Math.min(imbalanceAbs, 100);

  return (
    <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden tech-card" data-testid="orderbook-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="font-heading font-semibold text-sm uppercase tracking-wider">{t('orderBook')}</h3>
        <span className={cn(
          "px-2 py-0.5 rounded-sm text-xs font-mono font-bold uppercase",
          orderBook.imbalance_direction === 'bullish' && "bg-bullish/10 text-bullish border border-bullish/20",
          orderBook.imbalance_direction === 'bearish' && "bg-bearish/10 text-bearish border border-bearish/20",
          orderBook.imbalance_direction === 'balanced' && "bg-zinc-800 text-zinc-400 border border-zinc-700"
        )}>
          {orderBook.imbalance_direction}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Imbalance meter */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-zinc-500">{t('imbalance')}</span>
            <span className={cn(
              "font-mono font-bold",
              orderBook.imbalance > 0 ? "text-bullish" : orderBook.imbalance < 0 ? "text-bearish" : "text-zinc-400"
            )}>
              {orderBook.imbalance > 0 ? '+' : ''}{orderBook.imbalance.toFixed(2)}%
            </span>
          </div>
          <div className="relative h-3 bg-crypto-surface rounded-sm overflow-hidden">
            <div className="absolute inset-0 flex">
              <div 
                className="bg-bearish/30 transition-all" 
                style={{ width: orderBook.imbalance < 0 ? `${50 + imbalancePercent/2}%` : '50%' }}
              />
              <div 
                className="bg-bullish/30 transition-all" 
                style={{ width: orderBook.imbalance > 0 ? `${50 + imbalancePercent/2}%` : '50%' }}
              />
            </div>
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/20" />
          </div>
        </div>

        {/* Top walls */}
        <div className="grid grid-cols-2 gap-4">
          {/* Bid wall */}
          <div className="bg-bullish/5 border border-bullish/20 rounded-sm p-3">
            <div className="text-xs text-zinc-500 mb-1">{t('bidWall')}</div>
            <div className="font-mono text-sm text-bullish mb-1">
              ${formatPrice(orderBook.top_bid_wall.price)}
            </div>
            <div className="text-xs text-zinc-400">
              {formatQuantity(orderBook.top_bid_wall.quantity)} BTC
            </div>
          </div>

          {/* Ask wall */}
          <div className="bg-bearish/5 border border-bearish/20 rounded-sm p-3">
            <div className="text-xs text-zinc-500 mb-1">{t('askWall')}</div>
            <div className="font-mono text-sm text-bearish mb-1">
              ${formatPrice(orderBook.top_ask_wall.price)}
            </div>
            <div className="text-xs text-zinc-400">
              {formatQuantity(orderBook.top_ask_wall.quantity)} BTC
            </div>
          </div>
        </div>

        {/* Depth comparison */}
        <div>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-bullish">Bid Depth</span>
            <span className="text-bearish">Ask Depth</span>
          </div>
          <div className="flex gap-1">
            <Progress 
              value={(orderBook.bid_depth / (orderBook.bid_depth + orderBook.ask_depth)) * 100} 
              className="h-2 bg-crypto-surface"
              indicatorClassName="bg-bullish"
            />
            <Progress 
              value={(orderBook.ask_depth / (orderBook.bid_depth + orderBook.ask_depth)) * 100} 
              className="h-2 bg-crypto-surface rotate-180"
              indicatorClassName="bg-bearish"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-500 mt-1 font-mono">
            <span>${(orderBook.bid_depth / 1000000).toFixed(2)}M</span>
            <span>${(orderBook.ask_depth / 1000000).toFixed(2)}M</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderBookCard;
