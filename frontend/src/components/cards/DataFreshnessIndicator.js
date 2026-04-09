import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Clock,
  Database,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useApp } from '../../contexts/AppContext';
import { translations } from '../../translations';

/**
 * DataFreshnessIndicator - Shows real-time data integrity status
 * 
 * Displays:
 * - Overall health status
 * - Individual data source freshness
 * - Warnings when data is stale or unavailable
 */
export function DataFreshnessIndicator({ 
  dataFreshness,
  compact = false,
  className = ''
}) {
  const [expanded, setExpanded] = useState(false);
  const [localFreshness, setLocalFreshness] = useState(null);
  const [loading, setLoading] = useState(false);
  const { language } = useApp();
  
  // Get translations
  const lang = translations[language] || translations.en;
  const t = {
    dataIntegrity: language === 'it' ? 'Integrità Dati' : language === 'de' ? 'Datenintegrität' : language === 'pl' ? 'Integralność Danych' : 'Data Integrity',
    allDataFresh: language === 'it' ? 'Tutti i Dati Freschi' : language === 'de' ? 'Alle Daten Aktuell' : language === 'pl' ? 'Wszystkie Dane Świeże' : 'All Data Fresh',
    someDataStale: language === 'it' ? 'Alcuni Dati Obsoleti' : language === 'de' ? 'Einige Daten Veraltet' : language === 'pl' ? 'Niektóre Dane Nieaktualne' : 'Some Data Stale',
    dataIssues: language === 'it' ? 'Problemi Dati' : language === 'de' ? 'Datenprobleme' : language === 'pl' ? 'Problemy z Danymi' : 'Data Issues',
    checking: language === 'it' ? 'Verifica...' : language === 'de' ? 'Prüfe...' : language === 'pl' ? 'Sprawdzanie...' : 'Checking...',
    fresh: language === 'it' ? 'Fresco' : language === 'de' ? 'Aktuell' : language === 'pl' ? 'Świeży' : 'Fresh',
    warning: language === 'it' ? 'Avviso' : language === 'de' ? 'Warnung' : language === 'pl' ? 'Ostrzeżenie' : 'Warning',
    stale: language === 'it' ? 'Obsoleto' : language === 'de' ? 'Veraltet' : language === 'pl' ? 'Nieaktualny' : 'Stale',
    critical: language === 'it' ? 'Critico' : language === 'de' ? 'Kritisch' : language === 'pl' ? 'Krytyczny' : 'Critical',
    unavailable: language === 'it' ? 'Non Disponibile' : language === 'de' ? 'Nicht Verfügbar' : language === 'pl' ? 'Niedostępny' : 'Unavailable',
    unknown: language === 'it' ? 'Sconosciuto' : language === 'de' ? 'Unbekannt' : language === 'pl' ? 'Nieznany' : 'Unknown',
    dataOK: language === 'it' ? 'Dati OK' : language === 'de' ? 'Daten OK' : language === 'pl' ? 'Dane OK' : 'Data OK',
    refreshStatus: language === 'it' ? 'Aggiorna Stato' : language === 'de' ? 'Status Aktualisieren' : language === 'pl' ? 'Odśwież Status' : 'Refresh Status',
    checkingDataSources: language === 'it' ? 'Verifica fonti dati...' : language === 'de' ? 'Überprüfe Datenquellen...' : language === 'pl' ? 'Sprawdzanie źródeł danych...' : 'Checking data sources...',
    criticalWarning: language === 'it' ? 'Dati critici non disponibili - La generazione dei segnali potrebbe essere compromessa' : language === 'de' ? 'Kritische Daten nicht verfügbar - Signalgenerierung könnte beeinträchtigt sein' : language === 'pl' ? 'Dane krytyczne niedostępne - Generowanie sygnałów może być zagrożone' : 'Critical data unavailable - Signal generation may be affected',
    price: language === 'it' ? 'Prezzo' : language === 'de' ? 'Preis' : language === 'pl' ? 'Cena' : 'Price',
    openInterest: lang.openInterest || 'Open Interest',
    fundingRate: lang.fundingRate || 'Funding Rate',
    liquidations: language === 'it' ? 'Liquidazioni' : language === 'de' ? 'Liquidationen' : language === 'pl' ? 'Likwidacje' : 'Liquidations',
    orderBook: lang.orderBook || 'Order Book',
    whaleActivity: lang.whaleActivity || 'Whale Activity',
    candles: language === 'it' ? 'Candele' : language === 'de' ? 'Kerzen' : language === 'pl' ? 'Świece' : 'Candles',
    dataUnavailable: language === 'it' ? 'Dati Non Disponibili' : language === 'de' ? 'Daten Nicht Verfügbar' : language === 'pl' ? 'Dane Niedostępne' : 'Data Unavailable'
  };

  // Fetch freshness data from API if not provided
  useEffect(() => {
    if (!dataFreshness) {
      fetchFreshnessData();
    } else {
      setLocalFreshness(dataFreshness);
    }
  }, [dataFreshness]);

  const fetchFreshnessData = async () => {
    try {
      setLoading(true);
      const API_URL = process.env.REACT_APP_BACKEND_URL || '';
      const response = await fetch(`${API_URL}/api/system/data-freshness`);
      if (response.ok) {
        const data = await response.json();
        setLocalFreshness(data);
      }
    } catch (error) {
      console.error('Failed to fetch data freshness:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!localFreshness && !loading) {
    return null;
  }

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-zinc-500 text-xs", className)}>
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span>{t.checkingDataSources}</span>
      </div>
    );
  }

  const { overall_status, sources, summary, critical_data_available, missing_or_stale_sources } = localFreshness || {};

  // Get status icon and color
  const getStatusConfig = (status) => {
    switch (status) {
      case 'fresh':
        return { 
          icon: CheckCircle, 
          color: 'text-emerald-400', 
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
          label: t.fresh
        };
      case 'warning':
        return { 
          icon: Clock, 
          color: 'text-amber-400', 
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          label: t.warning
        };
      case 'stale':
        return { 
          icon: AlertTriangle, 
          color: 'text-orange-400', 
          bg: 'bg-orange-500/10',
          border: 'border-orange-500/20',
          label: t.stale
        };
      case 'critical':
        return { 
          icon: AlertCircle, 
          color: 'text-red-400', 
          bg: 'bg-red-500/10',
          border: 'border-red-500/20',
          label: t.critical
        };
      case 'unavailable':
        return { 
          icon: XCircle, 
          color: 'text-red-500', 
          bg: 'bg-red-500/10',
          border: 'border-red-500/20',
          label: t.unavailable
        };
      default:
        return { 
          icon: Activity, 
          color: 'text-zinc-400', 
          bg: 'bg-zinc-500/10',
          border: 'border-zinc-500/20',
          label: t.unknown
        };
    }
  };

  const getOverallConfig = (status) => {
    switch (status) {
      case 'healthy':
        return { 
          icon: CheckCircle, 
          color: 'text-emerald-400', 
          bg: 'bg-emerald-500/10',
          label: t.allDataFresh
        };
      case 'degraded':
        return { 
          icon: AlertTriangle, 
          color: 'text-amber-400', 
          bg: 'bg-amber-500/10',
          label: t.someDataStale
        };
      case 'critical':
        return { 
          icon: AlertCircle, 
          color: 'text-red-400', 
          bg: 'bg-red-500/10',
          label: t.dataIssues
        };
      default:
        return { 
          icon: Activity, 
          color: 'text-zinc-400', 
          bg: 'bg-zinc-500/10',
          label: t.checking
        };
    }
  };

  const overallConfig = getOverallConfig(overall_status);
  const OverallIcon = overallConfig.icon;

  const formatAge = (seconds) => {
    if (seconds === null || seconds === undefined) return 'N/A';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const sourceLabels = {
    price: t.price,
    open_interest: t.openInterest,
    funding_rate: t.fundingRate,
    liquidation: t.liquidations,
    orderbook: t.orderBook,
    whale_activity: t.whaleActivity,
    candles: t.candles
  };

  // Compact mode - just show overall status
  if (compact) {
    const hasIssues = overall_status !== 'healthy';
    
    return (
      <div 
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer transition-colors",
          hasIssues ? "bg-amber-500/10 hover:bg-amber-500/20" : "bg-zinc-800/50 hover:bg-zinc-800",
          className
        )}
        onClick={() => setExpanded(!expanded)}
        title={hasIssues ? `Issues: ${missing_or_stale_sources?.join(', ')}` : t.allDataFresh}
      >
        <Database className={cn("w-3 h-3", hasIssues ? "text-amber-400" : "text-zinc-500")} />
        <span className={hasIssues ? "text-amber-400" : "text-zinc-400"}>
          {hasIssues ? t.dataIssues : t.dataOK}
        </span>
        {hasIssues && (
          <AlertTriangle className="w-3 h-3 text-amber-400" />
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-sm border border-zinc-800 bg-zinc-900/50",
      className
    )}>
      {/* Header */}
      <div 
        className={cn(
          "flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-800/30 transition-colors",
          overallConfig.bg
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <OverallIcon className={cn("w-4 h-4", overallConfig.color)} />
          <span className="text-sm font-medium text-zinc-200">{t.dataIntegrity}</span>
          <span className={cn("text-xs px-2 py-0.5 rounded", overallConfig.bg, overallConfig.color)}>
            {overallConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {summary && (
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <span className="text-emerald-400">{summary.fresh_count}</span>
              <span>/</span>
              <span>{summary.total_sources}</span>
              <span>fresh</span>
            </div>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </div>
      </div>

      {/* Critical Warning Banner */}
      {!critical_data_available && (
        <div className="px-3 py-2 bg-red-500/10 border-t border-red-500/20">
          <div className="flex items-center gap-2 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">{t.criticalWarning}</span>
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {expanded && sources && (
        <div className="p-3 border-t border-zinc-800 space-y-2">
          {Object.entries(sources).map(([key, data]) => {
            const config = getStatusConfig(data.status);
            const Icon = config.icon;
            
            return (
              <div 
                key={key}
                className={cn(
                  "flex items-center justify-between p-2 rounded",
                  config.bg,
                  "border",
                  config.border
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-3.5 h-3.5", config.color)} />
                  <span className="text-xs text-zinc-300">{sourceLabels[key] || key}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {data.source && (
                    <span className="text-zinc-500">{data.source}</span>
                  )}
                  <span className={config.color}>
                    {data.status === 'unavailable' ? 'N/A' : formatAge(data.age_seconds)}
                  </span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] uppercase font-medium",
                    config.bg, config.color
                  )}>
                    {config.label}
                  </span>
                </div>
              </div>
            );
          })}
          
          {/* Refresh Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              fetchFreshnessData();
            }}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 rounded transition-colors"
          >
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
            {t.refreshStatus}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Inline Data Freshness Badge - For use in card headers
 */
export function DataFreshnessBadge({ status, ageSeconds, source, language = 'en' }) {
  const getConfig = (status) => {
    switch (status) {
      case 'fresh':
        return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle };
      case 'warning':
        return { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Clock };
      case 'stale':
        return { color: 'text-orange-400', bg: 'bg-orange-500/10', icon: AlertTriangle };
      case 'critical':
      case 'unavailable':
        return { color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertCircle };
      default:
        return { color: 'text-zinc-400', bg: 'bg-zinc-500/10', icon: Activity };
    }
  };

  const config = getConfig(status);
  const Icon = config.icon;
  
  const dataUnavailableText = language === 'it' ? 'Dati Non Disponibili' : 
                               language === 'de' ? 'Daten Nicht Verfügbar' : 
                               language === 'pl' ? 'Dane Niedostępne' : 'Data Unavailable';
  
  const agoText = language === 'it' ? 'fa' : language === 'de' ? 'vor' : language === 'pl' ? 'temu' : 'ago';

  const formatAge = (seconds) => {
    if (seconds === null || seconds === undefined) return 'N/A';
    if (seconds < 60) return `${Math.round(seconds)}s ${agoText}`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ${agoText}`;
    return `${Math.round(seconds / 3600)}h ${agoText}`;
  };

  if (status === 'unavailable') {
    return (
      <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]", config.bg, config.color)}>
        <Icon className="w-3 h-3" />
        <span>{dataUnavailableText}</span>
      </div>
    );
  }

  return (
    <div 
      className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]", config.bg, config.color)}
      title={`Source: ${source || 'Unknown'} | Age: ${formatAge(ageSeconds)}`}
    >
      <Icon className="w-3 h-3" />
      <span>{formatAge(ageSeconds)}</span>
    </div>
  );
}

export default DataFreshnessIndicator;
