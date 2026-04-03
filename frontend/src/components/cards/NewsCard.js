import React from 'react';
import { ExternalLink, TrendingUp, TrendingDown, Minus, AlertCircle, Info, Zap, Newspaper, RefreshCw } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

export function NewsCard({ compact = false }) {
  const { t, news, language } = useApp();

  // Localized time formatting
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffMins < 5) {
      return language === 'it' ? 'Adesso' : language === 'de' ? 'Jetzt' : language === 'pl' ? 'Teraz' : 'Just now';
    }
    if (diffMins < 60) {
      const minLabel = language === 'it' ? 'min fa' : language === 'de' ? 'Min.' : language === 'pl' ? 'min temu' : 'min ago';
      return `${diffMins} ${minLabel}`;
    }
    if (diffHours < 24) {
      const hourLabel = language === 'it' ? 'h fa' : language === 'de' ? 'Std.' : language === 'pl' ? 'h temu' : 'h ago';
      return `${diffHours}${hourLabel}`;
    }
    return date.toLocaleDateString(language === 'it' ? 'it-IT' : language === 'de' ? 'de-DE' : language === 'pl' ? 'pl-PL' : 'en-GB', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Localized sentiment labels
  const getSentimentLabel = (sentiment) => {
    const labels = {
      en: { bullish: 'BULLISH', bearish: 'BEARISH', neutral: 'NEUTRAL' },
      it: { bullish: 'RIALZO', bearish: 'RIBASSO', neutral: 'NEUTRO' },
      de: { bullish: 'BULLISCH', bearish: 'BÄRISCH', neutral: 'NEUTRAL' },
      pl: { bullish: 'BYCZY', bearish: 'NIEDŹWIEDZI', neutral: 'NEUTRALNY' }
    };
    return labels[language]?.[sentiment] || labels.en[sentiment] || sentiment.toUpperCase();
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

  // Localized article count
  const getArticleLabel = (count) => {
    if (language === 'it') return count === 1 ? 'articolo' : 'articoli';
    if (language === 'de') return count === 1 ? 'Artikel' : 'Artikel';
    if (language === 'pl') return count === 1 ? 'artykuł' : 'artykuły';
    return count === 1 ? 'article' : 'articles';
  };

  // Localized no news message
  const getNoNewsMessage = () => {
    if (language === 'it') return 'Nessuna notizia disponibile';
    if (language === 'de') return 'Keine Nachrichten verfügbar';
    if (language === 'pl') return 'Brak dostępnych wiadomości';
    return 'No news available';
  };

  return (
    <div className="bg-crypto-card/60 backdrop-blur-sm border border-crypto-border rounded-sm overflow-hidden tech-card" data-testid="news-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-crypto-accent" />
          <h3 className="font-heading font-semibold text-sm uppercase tracking-wider">
            {language === 'it' ? 'Notizie' : language === 'de' ? 'Nachrichten' : language === 'pl' ? 'Wiadomości' : 'News'}
          </h3>
        </div>
        <Badge variant="outline" className="text-xs font-mono text-zinc-400 border-zinc-700">
          {news.length} {getArticleLabel(news.length)}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-3">
        <ScrollArea className={compact ? "h-[220px]" : "h-[420px]"}>
          {news.length > 0 ? (
            <div className="space-y-2">
              {news.map((item, idx) => {
                const SentimentIcon = getSentimentIcon(item.sentiment);
                const ImportanceIcon = getImportanceIcon(item.importance);
                const hasLink = item.url && item.url.length > 0;
                
                const ContentWrapper = hasLink ? 'a' : 'div';
                const linkProps = hasLink ? {
                  href: item.url,
                  target: "_blank",
                  rel: "noopener noreferrer"
                } : {};
                
                return (
                  <ContentWrapper
                    key={idx}
                    {...linkProps}
                    className={cn(
                      "block p-3 rounded-sm border-l-2 transition-all group",
                      hasLink && "hover:bg-white/5 cursor-pointer",
                      getImportanceStyles(item.importance)
                    )}
                    data-testid={`news-item-${idx}`}
                  >
                    {/* Title - More prominent */}
                    <h4 className={cn(
                      "text-sm font-medium leading-snug mb-2",
                      hasLink && "group-hover:text-white transition-colors"
                    )}>
                      {item.title}
                    </h4>
                    
                    {/* Description */}
                    {item.description && !compact && (
                      <p className="text-xs text-zinc-500 line-clamp-2 mb-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                    
                    {/* Footer - Metadata row */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                        <span className="font-medium text-zinc-400">{item.source}</span>
                        <span className="text-zinc-600">•</span>
                        <span>{formatTime(item.timestamp)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {/* Importance indicator */}
                        <ImportanceIcon className={cn(
                          "w-3 h-3",
                          item.importance === 'high' ? "text-yellow-500" : 
                          item.importance === 'medium' ? "text-blue-400" : "text-zinc-600"
                        )} />
                        
                        {/* Sentiment badge */}
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] font-mono px-1.5 py-0 h-5",
                            getSentimentColor(item.sentiment),
                            item.sentiment === 'bullish' && "border-bullish/30 bg-bullish/5",
                            item.sentiment === 'bearish' && "border-bearish/30 bg-bearish/5",
                            item.sentiment === 'neutral' && "border-zinc-600 bg-zinc-800/50"
                          )}
                        >
                          <SentimentIcon className="w-2.5 h-2.5 mr-0.5" />
                          {getSentimentLabel(item.sentiment)}
                        </Badge>
                        
                        {/* External link indicator */}
                        {hasLink && (
                          <ExternalLink className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </div>
                  </ContentWrapper>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-zinc-500">
              <Newspaper className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">{getNoNewsMessage()}</p>
              <p className="text-xs text-zinc-600 mt-1">
                {language === 'it' ? 'Caricamento in corso...' : 'Loading...'}
              </p>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

export default NewsCard;
