import React, { useState, useEffect, useCallback } from 'react';
import { useAccess } from '../../contexts/AccessContext';
import { GraduationCap, RefreshCw, Compass, Brain, BookOpen, Target, Lock, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * MentorCard - AI-powered trading educator widget
 * 
 * Freemium model:
 * - PUBLIC: Shows Context + Mentor's Tip (teaser)
 * - ADMIN: Shows full analysis (Context + Logic + Lesson + Tip)
 */
export function MentorCard() {
  const { isAdmin, getAdminHeaders } = useAccess();
  const [analysis, setAnalysis] = useState(null);
  const [marketSnapshot, setMarketSnapshot] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchAnalysis = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const headers = isAdmin ? getAdminHeaders() : {};
      const response = await axios.get(
        `${API_URL}/mentor/analyze?force_refresh=${forceRefresh}`,
        { headers }
      );
      
      if (response.data.success) {
        setAnalysis(response.data.analysis);
        setMarketSnapshot(response.data.market_snapshot);
        setLastUpdate(new Date());
      } else {
        setError(response.data.error || 'Failed to get analysis');
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Connection error');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, getAdminHeaders]);

  // Fetch on mount
  useEffect(() => {
    fetchAnalysis(false);
  }, [fetchAnalysis]);

  // Section component for consistent styling
  const AnalysisSection = ({ icon: Icon, title, content, locked = false, color = "text-zinc-400" }) => {
    if (!content && !locked) return null;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", color)} />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">{title}</span>
          {locked && <Lock className="w-3 h-3 text-amber-500/60" />}
        </div>
        {locked ? (
          <div className="bg-zinc-800/30 rounded-sm p-3 border border-amber-500/20">
            <p className="text-xs text-amber-400/70 italic">
              Sblocca la versione completa per vedere l'analisi dettagliata
            </p>
          </div>
        ) : (
          <div className="bg-zinc-800/30 rounded-sm p-3">
            <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{content}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="bg-crypto-card border border-zinc-700/60 rounded-sm overflow-hidden"
      data-testid="mentor-card"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-700/50 bg-gradient-to-r from-purple-900/20 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded">
              <GraduationCap className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-white">Radar Mentor</h3>
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">AI</span>
              </div>
              <p className="text-xs text-zinc-500">Il tuo tutor di trading h24</p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchAnalysis(true)}
            disabled={isLoading}
            className="h-8 px-2"
            data-testid="mentor-refresh-btn"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Market Snapshot */}
      {marketSnapshot && (
        <div className="px-4 py-2 border-b border-zinc-700/30 bg-zinc-900/30">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-zinc-500">BTC:</span>
            <span className="text-white font-mono">${marketSnapshot.btc_price?.toLocaleString()}</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-500">Regime:</span>
            <span className={cn(
              "font-medium",
              marketSnapshot.regime === "TREND" && "text-green-400",
              marketSnapshot.regime === "RANGE" && "text-yellow-400",
              marketSnapshot.regime === "COMPRESSION" && "text-orange-400",
              marketSnapshot.regime === "EXPANSION" && "text-purple-400"
            )}>
              {marketSnapshot.regime}
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-500">Energia:</span>
            <span className={cn(
              "font-mono",
              marketSnapshot.energy >= 70 && "text-red-400",
              marketSnapshot.energy >= 40 && marketSnapshot.energy < 70 && "text-yellow-400",
              marketSnapshot.energy < 40 && "text-zinc-400"
            )}>
              {marketSnapshot.energy}/100
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {isLoading && !analysis ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-3" />
            <p className="text-sm text-zinc-400">Il Mentor sta analizzando il mercato...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-sm p-4">
            <p className="text-sm text-red-400">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchAnalysis(false)}
              className="mt-2 text-red-400 hover:text-red-300"
            >
              Riprova
            </Button>
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            {/* Context - Always visible */}
            <AnalysisSection
              icon={Compass}
              title="Contesto"
              content={analysis.context}
              color="text-blue-400"
            />

            {/* Logic - Admin only */}
            {isAdmin ? (
              <AnalysisSection
                icon={Brain}
                title="La Logica"
                content={analysis.logic}
                color="text-purple-400"
              />
            ) : (
              <AnalysisSection
                icon={Brain}
                title="La Logica"
                locked={true}
                color="text-purple-400"
              />
            )}

            {/* Lesson - Admin only */}
            {isAdmin ? (
              <AnalysisSection
                icon={BookOpen}
                title="Lezione di Trading"
                content={analysis.lesson}
                color="text-green-400"
              />
            ) : (
              <AnalysisSection
                icon={BookOpen}
                title="Lezione di Trading"
                locked={true}
                color="text-green-400"
              />
            )}

            {/* Tip - Always visible */}
            <AnalysisSection
              icon={Target}
              title="Consiglio del Mentor"
              content={analysis.tip}
              color="text-amber-400"
            />

            {/* Upgrade CTA for non-admin */}
            {!isAdmin && (
              <div className="mt-4 p-3 bg-gradient-to-r from-purple-900/30 to-amber-900/30 border border-purple-500/30 rounded-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-white">Vuoi l'analisi completa?</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Sblocca l'accesso Admin per vedere la Logica profonda e le Lezioni di Trading personalizzate.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-zinc-500">
            <p>Nessuna analisi disponibile</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchAnalysis(false)}
              className="mt-2"
            >
              Genera Analisi
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      {lastUpdate && (
        <div className="px-4 py-2 border-t border-zinc-700/30 bg-zinc-900/20">
          <p className="text-[10px] text-zinc-600 text-right">
            Ultimo aggiornamento: {lastUpdate.toLocaleTimeString('it-IT')}
            {analysis?.cached && <span className="ml-2 text-amber-500/60">(cached)</span>}
          </p>
        </div>
      )}
    </div>
  );
}

export default MentorCard;
