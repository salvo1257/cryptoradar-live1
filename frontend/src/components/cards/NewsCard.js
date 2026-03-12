import React from 'react';
import { ExternalLink, TrendingUp, TrendingDown, Minus, AlertCircle, Info, Zap } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

export function NewsCard({ compact = false }) {
  const { t, news } = useApp();

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'bullish': return TrendingUp;
      case 'bearish': return TrendingDown;
      default: return Minus;
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'bullish': return 'text-bullish';
      case 'bearish': return 'text-bearish';
      default: return 'text-zinc-400';
    }
  };

  const getImportanceIcon = (importance) => {
    switch (importance) {
      case 'high': return Zap;
      case 'medium': return AlertCircle;
      default: return Info;
    }
  };

  const getImportanceStyles = (importance) => {
    switch (importance) {
      case 'high': return 'border-l-yellow-500 bg-yellow-500/5';
      case 'medium': return 'border-l-blue-500 bg-blue-500/5';
      default: return 'border-l-zinc-600 bg-zinc-800/30';
    }
  };

  return (
    <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden tech-card" data-testid="news-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="font-heading font-semibold text-sm uppercase tracking-wider">{t('news')}</h3>
        <span className="text-xs text-zinc-500 font-mono">{news.length} articles</span>
      </div>

      {/* Content */}
      <div className="p-4">
        <ScrollArea className={compact ? "h-[200px]" : "h-[400px]"}>
          {news.length > 0 ? (
            <div className="space-y-3">
              {news.map((item, idx) => {
                const SentimentIcon = getSentimentIcon(item.sentiment);
                const ImportanceIcon = getImportanceIcon(item.importance);
                
                return (
                  <a
                    key={idx}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "block p-3 rounded-sm border-l-2 transition-all group hover:bg-white/5",
                      getImportanceStyles(item.importance)
                    )}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <ImportanceIcon className={cn(
                          "w-4 h-4 flex-shrink-0",
                          item.importance === 'high' ? "text-yellow-500" : 
                          item.importance === 'medium' ? "text-blue-400" : "text-zinc-500"
                        )} />
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs font-mono px-1.5 py-0",
                            getSentimentColor(item.sentiment),
                            item.sentiment === 'bullish' && "border-bullish/30",
                            item.sentiment === 'bearish' && "border-bearish/30"
                          )}
                        >
                          <SentimentIcon className="w-3 h-3 mr-1" />
                          {item.sentiment}
                        </Badge>
                      </div>
                      <ExternalLink className="w-3 h-3 text-zinc-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    
                    {/* Title */}
                    <h4 className="text-sm font-medium group-hover:text-white transition-colors line-clamp-2 mb-2">
                      {item.title}
                    </h4>
                    
                    {/* Description */}
                    {item.description && !compact && (
                      <p className="text-xs text-zinc-500 line-clamp-2 mb-2">
                        {item.description}
                      </p>
                    )}
                    
                    {/* Footer */}
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span>{item.source}</span>
                      <span className="text-zinc-600">•</span>
                      <span>{formatTime(item.timestamp)}</span>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
              No news available
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

export default NewsCard;
