import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AnchoredPatternsContext = createContext(null);

export function AnchoredPatternsProvider({ children }) {
  // Load anchored patterns from localStorage on mount
  const [anchoredPatterns, setAnchoredPatterns] = useState(() => {
    try {
      const saved = localStorage.getItem('cryptoradar_anchored_patterns');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  // Draft mode: by default, don't auto-draw patterns
  const [draftMode, setDraftMode] = useState(true);
  
  // Save to localStorage whenever anchored patterns change
  useEffect(() => {
    try {
      localStorage.setItem('cryptoradar_anchored_patterns', JSON.stringify(anchoredPatterns));
    } catch (e) {
      console.error('Failed to save anchored patterns:', e);
    }
  }, [anchoredPatterns]);
  
  // Anchor a pattern to the chart
  const anchorPattern = useCallback((pattern) => {
    setAnchoredPatterns(prev => {
      // Check if already anchored (by unique ID)
      const patternId = generatePatternId(pattern);
      if (prev.some(p => generatePatternId(p) === patternId)) {
        return prev; // Already anchored
      }
      
      // Add with timestamp and unique ID
      const anchoredPattern = {
        ...pattern,
        anchorId: patternId,
        anchoredAt: new Date().toISOString(),
        isAnchored: true
      };
      
      return [...prev, anchoredPattern];
    });
  }, []);
  
  // Remove a specific anchored pattern
  const removeAnchor = useCallback((anchorId) => {
    setAnchoredPatterns(prev => prev.filter(p => p.anchorId !== anchorId));
  }, []);
  
  // Clear all anchored patterns
  const clearAllAnchors = useCallback(() => {
    setAnchoredPatterns([]);
  }, []);
  
  // Check if a pattern is anchored
  const isPatternAnchored = useCallback((pattern) => {
    const patternId = generatePatternId(pattern);
    return anchoredPatterns.some(p => p.anchorId === patternId);
  }, [anchoredPatterns]);
  
  // Toggle draft mode (auto-draw vs manual-anchor)
  const toggleDraftMode = useCallback(() => {
    setDraftMode(prev => !prev);
  }, []);
  
  // Get count of anchored patterns
  const anchorCount = anchoredPatterns.length;
  
  const value = {
    anchoredPatterns,
    anchorPattern,
    removeAnchor,
    clearAllAnchors,
    isPatternAnchored,
    draftMode,
    toggleDraftMode,
    anchorCount
  };
  
  return (
    <AnchoredPatternsContext.Provider value={value}>
      {children}
    </AnchoredPatternsContext.Provider>
  );
}

export function useAnchoredPatterns() {
  const context = useContext(AnchoredPatternsContext);
  if (!context) {
    throw new Error('useAnchoredPatterns must be used within AnchoredPatternsProvider');
  }
  return context;
}

// Generate a unique ID for a pattern based on its properties
function generatePatternId(pattern) {
  const type = pattern.type || 'unknown';
  const timeframe = pattern.timeframe || 'unknown';
  const startPrice = pattern.start?.price || pattern.draw_data?.start?.price || 0;
  const endPrice = pattern.end?.price || pattern.draw_data?.end?.price || 0;
  const label = pattern.label || pattern.draw_data?.label || '';
  
  return `${type}_${timeframe}_${startPrice.toFixed(2)}_${endPrice.toFixed(2)}_${label}`;
}

export default AnchoredPatternsContext;
