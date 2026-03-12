import React from 'react';
import { ExternalLink } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';
import { ScrollArea } from '../ui/scroll-area';

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

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'bullish': return 'text-bullish';
      case 'bearish': return 'text-bearish';
      default: return 'text-zinc-400';
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
        <ScrollArea className={compact ? "h-[200px]" : "h-[350px]"}>
          {news.length > 0 ? (
            <div className="space-y-3">
              {news.map((item, idx) => (
                <a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-crypto-surface/50 rounded-sm border border-transparent hover:border-crypto-border transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium group-hover:text-white transition-colors line-clamp-2">
                      {item.title}
                    </h4>
                    <ExternalLink className="w-3 h-3 text-zinc-500 flex-shrink-0 mt-1" />
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-zinc-500">{item.source}</span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-zinc-500">{formatTime(item.timestamp)}</span>
                    {item.sentiment && (
                      <>
                        <span className="text-zinc-600">•</span>
                        <span className={cn("uppercase font-mono", getSentimentColor(item.sentiment))}>
                          {item.sentiment}
                        </span>
                      </>
                    )}
                  </div>
                </a>
              ))}
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
