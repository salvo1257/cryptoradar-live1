import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { translations } from '../translations';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;
const WS_URL = process.env.REACT_APP_BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://') + '/api/ws/price';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Default language is Italian - saved to localStorage
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem('cryptoradar_language');
    return saved || 'it';  // Default to Italian
  });
  
  const setLanguage = useCallback((lang) => {
    setLanguageState(lang);
    localStorage.setItem('cryptoradar_language', lang);
  }, []);
  
  const [learnMode, setLearnMode] = useState(false);
  const [timeframe, setTimeframe] = useState('4h');  // Default to 4H
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [marketStatus, setMarketStatus] = useState(null);
  const [candles, setCandles] = useState([]);
  const [marketBias, setMarketBias] = useState(null);
  const [supportResistance, setSupportResistance] = useState({ levels: [], current_price: 0 });
  const [liquidity, setLiquidity] = useState({ clusters: [], direction: null });
  const [whaleAlerts, setWhaleAlerts] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [candlestickPatterns, setCandlestickPatterns] = useState([]);
  const [orderBook, setOrderBook] = useState(null);
  const [openInterest, setOpenInterest] = useState(null);
  const [fundingRate, setFundingRate] = useState(null);
  const [news, setNews] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertHistory, setAlertHistory] = useState([]);
  const [notes, setNotes] = useState([]);
  const [settings, setSettings] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('LIVE');
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState('Kraken');
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const t = useCallback((key) => {
    return translations[language]?.[key] || translations.en[key] || key;
  }, [language]);

  const fetchMarketData = useCallback(async () => {
    try {
      const [statusRes, candlesRes, biasRes] = await Promise.all([
        axios.get(`${API_URL}/market/status`),
        axios.get(`${API_URL}/chart/candles`, { params: { interval: timeframe } }),
        axios.get(`${API_URL}/market/bias`, { params: { interval: timeframe, lang: language } })
      ]);
      
      setMarketStatus(statusRes.data);
      setCandles(candlesRes.data.candles || []);
      setMarketBias(biasRes.data);
      setConnectionStatus(statusRes.data.status || 'LIVE');
    } catch (error) {
      console.error('Error fetching market data:', error);
      setConnectionStatus('OFFLINE');
    }
  }, [timeframe, language]);

  const fetchAnalysisData = useCallback(async () => {
    try {
      const [srRes, liqRes, whaleRes, patternRes, candlePatternRes, obRes, oiRes, frRes] = await Promise.all([
        axios.get(`${API_URL}/support-resistance`, { params: { interval: timeframe, lang: language } }),
        axios.get(`${API_URL}/liquidity`, { params: { interval: timeframe, lang: language } }),
        axios.get(`${API_URL}/whale-alerts`, { params: { interval: timeframe, lang: language } }),
        axios.get(`${API_URL}/patterns`, { params: { interval: timeframe, lang: language } }),
        axios.get(`${API_URL}/candlesticks`, { params: { interval: timeframe, lang: language } }),
        axios.get(`${API_URL}/orderbook`, { params: { lang: language } }),
        axios.get(`${API_URL}/open-interest`, { params: { lang: language } }),
        axios.get(`${API_URL}/funding-rate`, { params: { lang: language } })
      ]);
      
      setSupportResistance(srRes.data);
      setLiquidity(liqRes.data);
      setWhaleAlerts(whaleRes.data.alerts || []);
      setPatterns(patternRes.data.patterns || []);
      setCandlestickPatterns(candlePatternRes.data.patterns || []);
      setOrderBook(obRes.data);
      setOpenInterest(oiRes.data);
      setFundingRate(frRes.data);
    } catch (error) {
      console.error('Error fetching analysis data:', error);
    }
  }, [timeframe]);

  const fetchNews = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/news`, { params: { lang: language } });
      setNews(res.data.news || []);
    } catch (error) {
      console.error('Error fetching news:', error);
    }
  }, [language]);

  const fetchAlerts = useCallback(async () => {
    try {
      const [alertsRes, historyRes] = await Promise.all([
        axios.get(`${API_URL}/alerts`),
        axios.get(`${API_URL}/alerts/history`)
      ]);
      setAlerts(alertsRes.data || []);
      setAlertHistory(historyRes.data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  }, []);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/notes`);
      setNotes(res.data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/settings`);
      setSettings(res.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, []);

  // WebSocket connection for live price
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    try {
      wsRef.current = new WebSocket(WS_URL);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('LIVE');
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.price) {
            setMarketStatus(prev => prev ? { ...prev, price: data.price, change_24h: data.change_24h } : data);
          }
        } catch (e) {
          console.error('WebSocket message parse error:', e);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('DELAYED');
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('OFFLINE');
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setConnectionStatus('OFFLINE');
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchMarketData(),
        fetchAnalysisData(),
        fetchNews(),
        fetchAlerts(),
        fetchNotes(),
        fetchSettings()
      ]);
      setIsLoading(false);
    };
    
    initData();
    connectWebSocket();
    
    // Set up refresh intervals
    const marketInterval = setInterval(fetchMarketData, 60000);
    const analysisInterval = setInterval(fetchAnalysisData, 120000);
    const newsInterval = setInterval(fetchNews, 300000);
    
    return () => {
      clearInterval(marketInterval);
      clearInterval(analysisInterval);
      clearInterval(newsInterval);
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [fetchMarketData, fetchAnalysisData, fetchNews, fetchAlerts, fetchNotes, fetchSettings, connectWebSocket]);

  // Refresh on timeframe change
  useEffect(() => {
    fetchMarketData();
    fetchAnalysisData();
  }, [timeframe, fetchMarketData, fetchAnalysisData]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchMarketData(),
      fetchAnalysisData(),
      fetchNews()
    ]);
  }, [fetchMarketData, fetchAnalysisData, fetchNews]);

  const createAlert = useCallback(async (alertData) => {
    try {
      await axios.post(`${API_URL}/alerts`, alertData);
      await fetchAlerts();
      return true;
    } catch (error) {
      console.error('Error creating alert:', error);
      return false;
    }
  }, [fetchAlerts]);

  const deleteAlert = useCallback(async (alertId) => {
    try {
      await axios.delete(`${API_URL}/alerts/${alertId}`);
      await fetchAlerts();
      return true;
    } catch (error) {
      console.error('Error deleting alert:', error);
      return false;
    }
  }, [fetchAlerts]);

  const createNote = useCallback(async (noteData) => {
    try {
      await axios.post(`${API_URL}/notes`, noteData);
      await fetchNotes();
      return true;
    } catch (error) {
      console.error('Error creating note:', error);
      return false;
    }
  }, [fetchNotes]);

  const updateNote = useCallback(async (noteId, noteData) => {
    try {
      await axios.put(`${API_URL}/notes/${noteId}`, noteData);
      await fetchNotes();
      return true;
    } catch (error) {
      console.error('Error updating note:', error);
      return false;
    }
  }, [fetchNotes]);

  const deleteNote = useCallback(async (noteId) => {
    try {
      await axios.delete(`${API_URL}/notes/${noteId}`);
      await fetchNotes();
      return true;
    } catch (error) {
      console.error('Error deleting note:', error);
      return false;
    }
  }, [fetchNotes]);

  const updateSettings = useCallback(async (newSettings) => {
    try {
      await axios.put(`${API_URL}/settings`, newSettings);
      await fetchSettings();
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      return false;
    }
  }, [fetchSettings]);

  const testTelegram = useCallback(async () => {
    try {
      const res = await axios.post(`${API_URL}/settings/test-telegram`);
      return res.data;
    } catch (error) {
      console.error('Error testing telegram:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const value = {
    // State
    language,
    setLanguage,
    learnMode,
    setLearnMode,
    timeframe,
    setTimeframe,
    sidebarOpen,
    setSidebarOpen,
    marketStatus,
    candles,
    marketBias,
    supportResistance,
    liquidity,
    whaleAlerts,
    patterns,
    candlestickPatterns,
    orderBook,
    openInterest,
    fundingRate,
    news,
    alerts,
    alertHistory,
    notes,
    settings,
    connectionStatus,
    isLoading,
    dataSource,
    // Functions
    t,
    refreshAll,
    createAlert,
    deleteAlert,
    createNote,
    updateNote,
    deleteNote,
    updateSettings,
    testTelegram
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
