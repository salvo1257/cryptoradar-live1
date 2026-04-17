import React, { useState, useEffect, useCallback } from 'react';
import { 
  FlaskConical, Play, RefreshCw, Clock, TrendingUp, TrendingDown, 
  Target, Shield, CheckCircle, XCircle, AlertTriangle, BarChart3,
  Calendar, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { useApp } from '../../contexts/AppContext';
import { useAccess } from '../../contexts/AccessContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function BacktestPage() {
  const { language } = useApp();
  const { getAdminHeaders } = useAccess();
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [expandedRun, setExpandedRun] = useState(null);
  
  // Launch config
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [confirmationMode, setConfirmationMode] = useState('FORCE_ENTRY');
  const [stopModel, setStopModel] = useState('ORIGINAL');

  // Set default dates (last 30 days)
  useEffect(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    setDateTo(now.toISOString().split('T')[0]);
    setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  const fetchRuns = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/backtest/runs?limit=20`, {
        headers: getAdminHeaders()
      });
      const data = await response.json();
      setRuns(data.runs || []);
    } catch (error) {
      console.error('Error fetching backtest runs:', error);
    } finally {
      setLoading(false);
    }
  }, [getAdminHeaders]);

  const fetchSignals = useCallback(async (runId) => {
    try {
      const response = await fetch(`${API_URL}/api/backtest/run/${runId}/signals`, {
        headers: getAdminHeaders()
      });
      const data = await response.json();
      setSignals(data.signals || []);
      setSelectedRun(runId);
    } catch (error) {
      console.error('Error fetching signals:', error);
    }
  }, [getAdminHeaders]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const launchBacktest = async () => {
    try {
      setLaunching(true);
      const params = new URLSearchParams({
        date_from: `${dateFrom}T00:00:00Z`,
        date_to: `${dateTo}T23:59:59Z`,
        confirmation_mode: confirmationMode,
        stop_model: stopModel,
        disable_rr_filter: 'true'
      });
      
      const response = await fetch(`${API_URL}/api/backtest/launch?${params}`, {
        method: 'POST',
        headers: getAdminHeaders()
      });
      const data = await response.json();
      
      if (data.run_id) {
        // Refresh runs list
        setTimeout(() => {
          fetchRuns();
        }, 2000);
      }
    } catch (error) {
      console.error('Error launching backtest:', error);
    } finally {
      setLaunching(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>;
      case 'running':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Running</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{status}</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="backtest-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-8 h-8 text-purple-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">V3 Backtest</h1>
            <p className="text-sm text-gray-400">Replay storico e analisi performance</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchRuns}
          className="border-gray-700 hover:bg-gray-800"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Launch Panel */}
      <div className="bg-crypto-card border border-gray-800 rounded-lg p-4" data-testid="launch-panel">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-green-400" />
          Lancia Nuovo Backtest
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Date From */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Data Inizio</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
              data-testid="date-from-input"
            />
          </div>
          
          {/* Date To */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Data Fine</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
              data-testid="date-to-input"
            />
          </div>
          
          {/* Confirmation Mode */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Entry Mode</label>
            <select
              value={confirmationMode}
              onChange={(e) => setConfirmationMode(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
              data-testid="confirmation-mode-select"
            >
              <option value="FORCE_ENTRY">Force Entry (4H)</option>
              <option value="RELAXED">Relaxed (5M)</option>
              <option value="NORMAL">Normal (5M Strict)</option>
            </select>
          </div>
          
          {/* Stop Model */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Stop Model</label>
            <select
              value={stopModel}
              onChange={(e) => setStopModel(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm"
              data-testid="stop-model-select"
            >
              <option value="ORIGINAL">Original (Swing)</option>
              <option value="MAE_CONSERVATIVE">MAE Conservative (~2.8%)</option>
              <option value="MAE_BALANCED">MAE Balanced (~1.1%)</option>
              <option value="MAE_AGGRESSIVE">MAE Aggressive (~0.6%)</option>
            </select>
          </div>
          
          {/* Launch Button */}
          <div className="flex items-end">
            <Button
              onClick={launchBacktest}
              disabled={launching || !dateFrom || !dateTo}
              className="w-full bg-purple-600 hover:bg-purple-700"
              data-testid="launch-backtest-btn"
            >
              {launching ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Lancia
            </Button>
          </div>
        </div>
      </div>

      {/* Runs List */}
      <div className="bg-crypto-card border border-gray-800 rounded-lg overflow-hidden" data-testid="runs-list">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Run Completati ({runs.length})
          </h3>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            Caricamento...
          </div>
        ) : runs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Nessun backtest trovato. Lancia il primo run!
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {runs.map((run) => (
              <div key={run.run_id} className="p-4 hover:bg-gray-900/50 transition-colors">
                {/* Run Header */}
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedRun(expandedRun === run.run_id ? null : run.run_id)}
                >
                  <div className="flex items-center gap-4">
                    {getStatusBadge(run.status)}
                    <div>
                      <div className="text-white font-medium">
                        {run.config?.date_from?.split('T')[0]} → {run.config?.date_to?.split('T')[0]}
                      </div>
                      <div className="text-xs text-gray-500">
                        {run.run_id.slice(0, 8)} | {run.config?.confirmation_mode} | {run.config?.stop_model || 'ORIGINAL'}
                      </div>
                    </div>
                  </div>
                  
                  {run.status === 'completed' && run.summary && (
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="text-gray-400">Signals</div>
                        <div className="text-white font-bold">{run.summary.signals?.total || 0}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-400">Win Rate</div>
                        <div className={cn(
                          "font-bold",
                          run.summary.rates?.win_rate >= 60 ? "text-green-400" : 
                          run.summary.rates?.win_rate >= 40 ? "text-yellow-400" : "text-red-400"
                        )}>
                          {run.summary.rates?.win_rate || 0}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-400">Avg R:R</div>
                        <div className="text-white font-bold">{run.summary.averages?.avg_rr || 0}</div>
                      </div>
                      {expandedRun === run.run_id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  )}
                </div>
                
                {/* Expanded Details */}
                {expandedRun === run.run_id && run.summary && (
                  <div className="mt-4 pt-4 border-t border-gray-800 space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                      <div className="bg-gray-900 rounded p-3">
                        <div className="text-gray-400">Setups</div>
                        <div className="text-white font-bold">{run.summary.setups?.detected || 0}</div>
                      </div>
                      <div className="bg-gray-900 rounded p-3">
                        <div className="text-gray-400">Executable</div>
                        <div className="text-green-400 font-bold">{run.summary.signals?.executable || 0}</div>
                      </div>
                      <div className="bg-gray-900 rounded p-3">
                        <div className="text-gray-400">Blocked</div>
                        <div className="text-red-400 font-bold">{run.summary.signals?.blocked || 0}</div>
                      </div>
                      <div className="bg-gray-900 rounded p-3">
                        <div className="text-gray-400">Stop Hit%</div>
                        <div className="text-yellow-400 font-bold">{run.summary.rates?.stop_hit_rate || 0}%</div>
                      </div>
                      <div className="bg-gray-900 rounded p-3">
                        <div className="text-gray-400">Avg MFE</div>
                        <div className="text-white font-bold">{run.summary.averages?.avg_mfe || 0}%</div>
                      </div>
                      <div className="bg-gray-900 rounded p-3">
                        <div className="text-gray-400">Avg MAE</div>
                        <div className="text-white font-bold">{run.summary.averages?.avg_mae || 0}%</div>
                      </div>
                    </div>
                    
                    {/* View Signals Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchSignals(run.run_id)}
                      className="border-gray-700"
                      data-testid={`view-signals-${run.run_id.slice(0,8)}`}
                    >
                      Visualizza Segnali
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Signals Table */}
      {selectedRun && signals.length > 0 && (
        <div className="bg-crypto-card border border-gray-800 rounded-lg overflow-hidden" data-testid="signals-table">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Segnali Run {selectedRun.slice(0, 8)} ({signals.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedRun(null);
                setSignals([]);
              }}
            >
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-400">Timestamp</th>
                  <th className="px-4 py-3 text-left text-gray-400">Direction</th>
                  <th className="px-4 py-3 text-right text-gray-400">Entry</th>
                  <th className="px-4 py-3 text-right text-gray-400">Stop</th>
                  <th className="px-4 py-3 text-right text-gray-400">Target</th>
                  <th className="px-4 py-3 text-right text-gray-400">R:R</th>
                  <th className="px-4 py-3 text-right text-gray-400">MFE</th>
                  <th className="px-4 py-3 text-right text-gray-400">MAE</th>
                  <th className="px-4 py-3 text-center text-gray-400">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {signals.slice(0, 50).map((signal) => (
                  <tr key={signal.signal_id} className="hover:bg-gray-900/50">
                    <td className="px-4 py-3 text-gray-300">
                      {formatDate(signal.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn(
                        signal.direction?.includes('LONG') 
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      )}>
                        {signal.direction?.includes('LONG') ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        {signal.direction}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-white font-mono">
                      ${signal.targets?.entry?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-red-400 font-mono">
                      ${signal.targets?.stop_loss?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-green-400 font-mono">
                      ${signal.targets?.target_1?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-white font-mono">
                      {signal.targets?.rr_ratio?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-400 font-mono">
                      {signal.outcome?.mfe?.toFixed(2) || '-'}%
                    </td>
                    <td className="px-4 py-3 text-right text-red-400 font-mono">
                      {signal.outcome?.mae?.toFixed(2) || '-'}%
                    </td>
                    <td className="px-4 py-3 text-center">
                      {signal.outcome?.result === 'WIN' ? (
                        <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                      ) : signal.outcome?.result === 'LOSS' ? (
                        <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                      ) : signal.outcome?.result === 'EXPIRED' ? (
                        <Clock className="w-5 h-5 text-yellow-400 mx-auto" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-gray-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default BacktestPage;
