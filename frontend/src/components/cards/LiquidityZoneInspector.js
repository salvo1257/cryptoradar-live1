import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Layers, Target, Activity, AlertTriangle, ChevronDown, ChevronUp, Zap } from 'lucide-react';

/**
 * LiquidityZoneInspector - PREVIEW Component
 * 
 * Visualizes the new Zone-Based Liquidity Engine results.
 * Shows detected liquidity zones as clusters rather than single points.
 * 
 * Key features:
 * - Zone visualization (top-bottom range)
 * - Total liquidity per zone
 * - Distance percentage
 * - Comparison with legacy point-based magnet
 */

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const formatUSD = (value) => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const formatPrice = (price) => {
  return price ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '-';
};

const ZoneBar = ({ zone, currentPrice, maxStrength, isPrimary }) => {
  if (!zone) return null;
  
  const strengthPercent = maxStrength > 0 ? (zone.zone_strength / maxStrength) * 100 : 0;
  const isAbove = zone.direction === 'UP';
  
  return (
    <div 
      className={`relative p-3 rounded-lg border-2 transition-all ${
        isPrimary 
          ? isAbove 
            ? 'border-emerald-500 bg-emerald-500/10' 
            : 'border-red-500 bg-red-500/10'
          : 'border-slate-600 bg-slate-700/30'
      }`}
      data-testid={`zone-${zone.zone_id}`}
    >
      {/* Primary badge */}
      {isPrimary && (
        <div className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-xs font-bold ${
          isAbove ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          PRIMARY
        </div>
      )}
      
      {/* Direction indicator */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isAbove ? (
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
          <span className={`font-semibold ${isAbove ? 'text-emerald-400' : 'text-red-400'}`}>
            {isAbove ? 'ABOVE' : 'BELOW'}
          </span>
        </div>
        <span className="text-sm text-slate-400">
          {zone.num_levels} levels
        </span>
      </div>
      
      {/* Zone range */}
      <div className="grid grid-cols-3 gap-2 mb-2 text-sm">
        <div className="text-center">
          <div className="text-slate-500 text-xs">Top</div>
          <div className="text-slate-200 font-mono">{formatPrice(zone.zone_top)}</div>
        </div>
        <div className="text-center">
          <div className="text-slate-500 text-xs">Center</div>
          <div className={`font-mono font-bold ${isAbove ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatPrice(zone.zone_center)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-slate-500 text-xs">Bottom</div>
          <div className="text-slate-200 font-mono">{formatPrice(zone.zone_bottom)}</div>
        </div>
      </div>
      
      {/* Strength bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400">Zone Strength</span>
          <span className={`font-bold ${isAbove ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatUSD(zone.zone_strength)}
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              isAbove ? 'bg-emerald-500' : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(strengthPercent, 100)}%` }}
          />
        </div>
      </div>
      
      {/* Metrics row */}
      <div className="flex justify-between text-xs">
        <div>
          <span className="text-slate-500">Distance: </span>
          <span className={`font-mono ${
            zone.distance_pct >= 0.5 && zone.distance_pct <= 2.5 
              ? 'text-emerald-400' 
              : 'text-amber-400'
          }`}>
            {zone.distance_pct.toFixed(2)}%
          </span>
        </div>
        <div>
          <span className="text-slate-500">Score: </span>
          <span className={`font-bold ${
            zone.score >= 60 ? 'text-emerald-400' : 
            zone.score >= 40 ? 'text-amber-400' : 
            'text-red-400'
          }`}>
            {zone.score.toFixed(0)}/100
          </span>
        </div>
      </div>
    </div>
  );
};

const ComparisonPanel = ({ legacy, zone }) => {
  if (!legacy || !zone) return null;
  
  const directionsMatch = legacy.direction === zone.direction || 
    (legacy.direction === 'BALANCED' || zone.direction === 'NONE');
  
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700" data-testid="comparison-panel">
      <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4" />
        Legacy vs Zone Comparison
      </h4>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* Legacy */}
        <div className="space-y-2">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Point-Based (Legacy)</div>
          <div className="text-slate-300">
            <span className="text-slate-500">Direction:</span> {legacy.direction}
          </div>
          <div className="text-slate-300">
            <span className="text-slate-500">Target:</span> {formatPrice(legacy.target_price)}
          </div>
          <div className="text-slate-300">
            <span className="text-slate-500">Distance:</span> {legacy.distance_pct?.toFixed(2)}%
          </div>
          <div className="text-slate-300">
            <span className="text-slate-500">Value:</span> {formatUSD(legacy.value_usd || 0)}
          </div>
        </div>
        
        {/* Zone */}
        <div className="space-y-2">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Zone-Based (New)</div>
          <div className="text-slate-300">
            <span className="text-slate-500">Direction:</span> {zone.direction}
          </div>
          <div className="text-slate-300">
            <span className="text-slate-500">Zone:</span> {formatPrice(zone.zone_bottom)} - {formatPrice(zone.zone_top)}
          </div>
          <div className="text-slate-300">
            <span className="text-slate-500">Distance:</span> {zone.distance_pct?.toFixed(2)}%
          </div>
          <div className="text-slate-300">
            <span className="text-slate-500">Cluster:</span> {formatUSD(zone.zone_strength_usd || 0)}
          </div>
        </div>
      </div>
      
      {/* Alignment indicator */}
      <div className={`mt-3 pt-3 border-t border-slate-700 flex items-center gap-2 ${
        directionsMatch ? 'text-emerald-400' : 'text-amber-400'
      }`}>
        {directionsMatch ? (
          <>
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs">Directions aligned</span>
          </>
        ) : (
          <>
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs">Direction conflict - review zones</span>
          </>
        )}
      </div>
    </div>
  );
};

const LiquidityZoneInspector = ({ lang = 'en' }) => {
  const [zonesData, setZonesData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [showAllZones, setShowAllZones] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [zonesRes, compRes] = await Promise.all([
          fetch(`${API_URL}/api/liquidity-zones?lang=${lang}`),
          fetch(`${API_URL}/api/liquidity-comparison?lang=${lang}`)
        ]);
        
        if (zonesRes.ok) {
          const zones = await zonesRes.json();
          setZonesData(zones);
        }
        
        if (compRes.ok) {
          const comp = await compRes.json();
          setComparisonData(comp);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching zone data:', err);
        setError('Failed to load liquidity zones');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [lang]);

  if (loading && !zonesData) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700" data-testid="zone-inspector-loading">
        <div className="flex items-center gap-3">
          <div className="animate-spin w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full" />
          <span className="text-slate-400">Loading Liquidity Zones...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-red-500/50" data-testid="zone-inspector-error">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const primaryZone = zonesData?.primary_liquidity_zone;
  const secondaryZone = zonesData?.secondary_liquidity_zone;
  const allZones = [...(zonesData?.zones_above || []), ...(zonesData?.zones_below || [])];
  const maxStrength = Math.max(...allZones.map(z => z.zone_strength), 1);

  return (
    <div 
      className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-cyan-500/30 overflow-hidden"
      data-testid="liquidity-zone-inspector"
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/20">
            <Layers className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              Liquidity Zone Engine
              <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full">
                PREVIEW
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Zone-based detection | {zonesData?.zones_detected_count || 0} zones detected
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Dominant direction */}
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
            zonesData?.dominant_direction === 'UP' 
              ? 'bg-emerald-500/20 text-emerald-400'
              : zonesData?.dominant_direction === 'DOWN'
              ? 'bg-red-500/20 text-red-400'
              : 'bg-slate-600/50 text-slate-400'
          }`}>
            {zonesData?.dominant_direction === 'UP' && <TrendingUp className="w-4 h-4" />}
            {zonesData?.dominant_direction === 'DOWN' && <TrendingDown className="w-4 h-4" />}
            {zonesData?.dominant_direction || 'BALANCED'}
          </div>
          
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="p-4 pt-0 space-y-4">
          {/* Current Price */}
          <div className="flex items-center justify-center gap-2 py-2 bg-slate-700/30 rounded-lg">
            <Target className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 text-sm">Current Price:</span>
            <span className="text-white font-bold font-mono">
              {formatPrice(zonesData?.current_price)}
            </span>
          </div>

          {/* Primary & Secondary Zones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ZoneBar 
              zone={primaryZone} 
              currentPrice={zonesData?.current_price} 
              maxStrength={maxStrength}
              isPrimary={true}
            />
            {secondaryZone && (
              <ZoneBar 
                zone={secondaryZone} 
                currentPrice={zonesData?.current_price} 
                maxStrength={maxStrength}
                isPrimary={false}
              />
            )}
          </div>

          {/* Liquidity totals */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
              <div className="text-xs text-emerald-400 uppercase tracking-wide mb-1">Total Above</div>
              <div className="text-lg font-bold text-emerald-400">
                {formatUSD(zonesData?.total_liquidity_above || 0)}
              </div>
              <div className="text-xs text-slate-400">
                {zonesData?.zones_above?.length || 0} zones
              </div>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <div className="text-xs text-red-400 uppercase tracking-wide mb-1">Total Below</div>
              <div className="text-lg font-bold text-red-400">
                {formatUSD(zonesData?.total_liquidity_below || 0)}
              </div>
              <div className="text-xs text-slate-400">
                {zonesData?.zones_below?.length || 0} zones
              </div>
            </div>
          </div>

          {/* Comparison with Legacy */}
          {comparisonData && (
            <ComparisonPanel 
              legacy={comparisonData.comparison?.legacy_point_magnet}
              zone={comparisonData.comparison?.zone_engine}
            />
          )}

          {/* Show all zones toggle */}
          {allZones.length > 2 && (
            <button
              onClick={() => setShowAllZones(!showAllZones)}
              className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2"
              data-testid="show-all-zones-btn"
            >
              {showAllZones ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide {allZones.length - 2} additional zones
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show all {allZones.length} zones
                </>
              )}
            </button>
          )}

          {/* All zones list */}
          {showAllZones && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allZones.slice(2).map((zone, idx) => (
                <ZoneBar 
                  key={zone.zone_id || idx}
                  zone={zone} 
                  currentPrice={zonesData?.current_price} 
                  maxStrength={maxStrength}
                  isPrimary={false}
                />
              ))}
            </div>
          )}

          {/* Engine info */}
          <div className="text-xs text-slate-500 text-center pt-2 border-t border-slate-700">
            <Zap className="w-3 h-3 inline mr-1" />
            {zonesData?.engine_version} | {zonesData?.data_source}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiquidityZoneInspector;
