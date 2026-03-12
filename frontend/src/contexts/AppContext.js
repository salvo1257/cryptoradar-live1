import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;
const WS_URL = process.env.REACT_APP_BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://') + '/api/ws/price';

const AppContext = createContext(null);

// Translations
const translations = {
  en: {
    dashboard: "Dashboard",
    supportResistance: "Support & Resistance",
    whaleAlerts: "Whale Alerts",
    liquidity: "Liquidity",
    patterns: "Patterns",
    candlesticks: "Candlesticks",
    news: "News",
    alerts: "Alerts",
    alertHistory: "Alert History",
    notes: "Notes",
    settings: "Settings",
    marketBias: "Market Bias",
    bullish: "BULLISH",
    bearish: "BEARISH",
    neutral: "NEUTRAL",
    confidence: "Confidence",
    estimatedMove: "Est. Move",
    trapRisk: "Trap Risk",
    squeezeProbability: "Squeeze Probability",
    live: "LIVE",
    delayed: "DELAYED",
    offline: "OFFLINE",
    learnMode: "Learn Mode",
    refresh: "Refresh",
    timeframe: "Timeframe",
    language: "Language",
    price: "Price",
    change24h: "24h Change",
    volume: "Volume",
    support: "Support",
    resistance: "Resistance",
    strength: "Strength",
    distance: "Distance",
    signal: "Signal",
    entry: "Entry",
    target: "Target",
    long: "LONG",
    short: "SHORT",
    up: "UP",
    down: "DOWN",
    balanced: "BALANCED",
    liquidityDirection: "Liquidity Direction",
    nextTarget: "Next Target",
    orderBook: "Order Book",
    bidWall: "Top Bid Wall",
    askWall: "Top Ask Wall",
    imbalance: "Imbalance",
    createAlert: "Create Alert",
    condition: "Condition",
    above: "Above",
    below: "Below",
    telegram: "Telegram",
    enabled: "Enabled",
    disabled: "Disabled",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    addNote: "Add Note",
    english: "English",
    italian: "Italian",
    german: "German",
    // Learn mode explanations
    learnMarketBias: "Market Bias analyzes multiple indicators to determine overall market direction. Confidence shows how strong the signal is.",
    learnSupportResistance: "Support levels are prices where buying pressure historically prevents further decline. Resistance levels are where selling pressure prevents further rise.",
    learnLiquidity: "Liquidity clusters show where large amounts of stop-losses or liquidations may accumulate, potentially causing rapid price movements.",
    learnWhaleAlerts: "Whale alerts detect abnormally large trading activity that may indicate institutional moves.",
    learnPatterns: "Chart patterns are formations that may predict future price movement based on historical behavior.",
    learnCandlesticks: "Candlestick patterns are specific candle formations that traders use to predict short-term price direction.",
    learnTrapRisk: "Trap risk indicates the probability of a false breakout that could trap traders on the wrong side.",
    learnSqueeze: "Squeeze probability shows the likelihood of a volatility compression followed by a sharp move."
  },
  it: {
    dashboard: "Dashboard",
    supportResistance: "Supporti e Resistenze",
    whaleAlerts: "Avvisi Balene",
    liquidity: "Liquidita",
    patterns: "Pattern",
    candlesticks: "Candele",
    news: "Notizie",
    alerts: "Avvisi",
    alertHistory: "Storico Avvisi",
    notes: "Note",
    settings: "Impostazioni",
    marketBias: "Bias di Mercato",
    bullish: "RIALZISTA",
    bearish: "RIBASSISTA",
    neutral: "NEUTRALE",
    confidence: "Confidenza",
    estimatedMove: "Mov. Stimato",
    trapRisk: "Rischio Trappola",
    squeezeProbability: "Prob. Squeeze",
    live: "LIVE",
    delayed: "RITARDATO",
    offline: "OFFLINE",
    learnMode: "Modalita Apprendimento",
    refresh: "Aggiorna",
    timeframe: "Timeframe",
    language: "Lingua",
    price: "Prezzo",
    change24h: "Var. 24h",
    volume: "Volume",
    support: "Supporto",
    resistance: "Resistenza",
    strength: "Forza",
    distance: "Distanza",
    signal: "Segnale",
    entry: "Entrata",
    target: "Obiettivo",
    long: "LONG",
    short: "SHORT",
    up: "SU",
    down: "GIU",
    balanced: "BILANCIATO",
    liquidityDirection: "Direzione Liquidita",
    nextTarget: "Prossimo Obiettivo",
    orderBook: "Order Book",
    bidWall: "Muro Bid Principale",
    askWall: "Muro Ask Principale",
    imbalance: "Squilibrio",
    createAlert: "Crea Avviso",
    condition: "Condizione",
    above: "Sopra",
    below: "Sotto",
    telegram: "Telegram",
    enabled: "Attivato",
    disabled: "Disattivato",
    save: "Salva",
    cancel: "Annulla",
    delete: "Elimina",
    addNote: "Aggiungi Nota",
    english: "Inglese",
    italian: "Italiano",
    german: "Tedesco",
    learnMarketBias: "Il Bias di Mercato analizza diversi indicatori per determinare la direzione generale del mercato.",
    learnSupportResistance: "I livelli di supporto sono prezzi dove la pressione di acquisto storicamente impedisce ulteriori cali.",
    learnLiquidity: "I cluster di liquidita mostrano dove grandi quantita di stop-loss possono accumularsi.",
    learnWhaleAlerts: "Gli avvisi balene rilevano attivita di trading anormalmente grandi.",
    learnPatterns: "I pattern grafici sono formazioni che possono prevedere i movimenti futuri dei prezzi.",
    learnCandlesticks: "I pattern a candela sono formazioni specifiche usate per prevedere la direzione a breve termine.",
    learnTrapRisk: "Il rischio trappola indica la probabilita di un falso breakout.",
    learnSqueeze: "La probabilita di squeeze mostra la probabilita di una compressione della volatilita."
  },
  de: {
    dashboard: "Dashboard",
    supportResistance: "Unterstutzung & Widerstand",
    whaleAlerts: "Wal-Warnungen",
    liquidity: "Liquiditat",
    patterns: "Muster",
    candlesticks: "Kerzen",
    news: "Nachrichten",
    alerts: "Warnungen",
    alertHistory: "Warnungsverlauf",
    notes: "Notizen",
    settings: "Einstellungen",
    marketBias: "Marktneigung",
    bullish: "BULLISCH",
    bearish: "BARISCH",
    neutral: "NEUTRAL",
    confidence: "Konfidenz",
    estimatedMove: "Gesch. Bewegung",
    trapRisk: "Fallenrisiko",
    squeezeProbability: "Squeeze-Wahrsch.",
    live: "LIVE",
    delayed: "VERZOGERT",
    offline: "OFFLINE",
    learnMode: "Lernmodus",
    refresh: "Aktualisieren",
    timeframe: "Zeitrahmen",
    language: "Sprache",
    price: "Preis",
    change24h: "24h Anderung",
    volume: "Volumen",
    support: "Unterstutzung",
    resistance: "Widerstand",
    strength: "Starke",
    distance: "Abstand",
    signal: "Signal",
    entry: "Einstieg",
    target: "Ziel",
    long: "LONG",
    short: "SHORT",
    up: "HOCH",
    down: "RUNTER",
    balanced: "AUSGEGLICHEN",
    liquidityDirection: "Liquiditatsrichtung",
    nextTarget: "Nachstes Ziel",
    orderBook: "Orderbuch",
    bidWall: "Hauptkaufwand",
    askWall: "Hauptverkaufswand",
    imbalance: "Ungleichgewicht",
    createAlert: "Warnung erstellen",
    condition: "Bedingung",
    above: "Uber",
    below: "Unter",
    telegram: "Telegram",
    enabled: "Aktiviert",
    disabled: "Deaktiviert",
    save: "Speichern",
    cancel: "Abbrechen",
    delete: "Loschen",
    addNote: "Notiz hinzufugen",
    english: "Englisch",
    italian: "Italienisch",
    german: "Deutsch",
    learnMarketBias: "Die Marktneigung analysiert mehrere Indikatoren, um die allgemeine Marktrichtung zu bestimmen.",
    learnSupportResistance: "Unterstutzungsniveaus sind Preise, bei denen der Kaufdruck historisch weitere Ruckgange verhindert.",
    learnLiquidity: "Liquiditatszonen zeigen, wo grosse Mengen an Stop-Losses angesammelt werden konnen.",
    learnWhaleAlerts: "Wal-Warnungen erkennen ungewohnlich grosse Handelsaktivitaten.",
    learnPatterns: "Chartmuster sind Formationen, die zukunftige Preisbewegungen vorhersagen konnen.",
    learnCandlesticks: "Kerzenmuster sind spezifische Formationen zur Vorhersage kurzfristiger Preisrichtungen.",
    learnTrapRisk: "Das Fallenrisiko zeigt die Wahrscheinlichkeit eines falschen Ausbruchs.",
    learnSqueeze: "Die Squeeze-Wahrscheinlichkeit zeigt die Wahrscheinlichkeit einer Volatilitatskompression."
  }
};

export function AppProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [learnMode, setLearnMode] = useState(false);
  const [timeframe, setTimeframe] = useState('1h');
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
        axios.get(`${API_URL}/market/bias`, { params: { interval: timeframe } })
      ]);
      
      setMarketStatus(statusRes.data);
      setCandles(candlesRes.data.candles || []);
      setMarketBias(biasRes.data);
      setConnectionStatus(statusRes.data.status || 'LIVE');
    } catch (error) {
      console.error('Error fetching market data:', error);
      setConnectionStatus('OFFLINE');
    }
  }, [timeframe]);

  const fetchAnalysisData = useCallback(async () => {
    try {
      const [srRes, liqRes, whaleRes, patternRes, candlePatternRes, obRes] = await Promise.all([
        axios.get(`${API_URL}/support-resistance`, { params: { interval: timeframe } }),
        axios.get(`${API_URL}/liquidity`, { params: { interval: timeframe } }),
        axios.get(`${API_URL}/whale-alerts`, { params: { interval: timeframe } }),
        axios.get(`${API_URL}/patterns`, { params: { interval: timeframe } }),
        axios.get(`${API_URL}/candlesticks`, { params: { interval: timeframe } }),
        axios.get(`${API_URL}/orderbook`)
      ]);
      
      setSupportResistance(srRes.data);
      setLiquidity(liqRes.data);
      setWhaleAlerts(whaleRes.data.alerts || []);
      setPatterns(patternRes.data.patterns || []);
      setCandlestickPatterns(candlePatternRes.data.patterns || []);
      setOrderBook(obRes.data);
    } catch (error) {
      console.error('Error fetching analysis data:', error);
    }
  }, [timeframe]);

  const fetchNews = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/news`);
      setNews(res.data.news || []);
    } catch (error) {
      console.error('Error fetching news:', error);
    }
  }, []);

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
      if (res.data?.language) {
        setLanguage(res.data.language);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, []);

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

  const createNote = useCallback(async (content) => {
    try {
      await axios.post(`${API_URL}/notes`, { content });
      await fetchNotes();
      return true;
    } catch (error) {
      console.error('Error creating note:', error);
      return false;
    }
  }, [fetchNotes]);

  const updateNote = useCallback(async (noteId, content) => {
    try {
      await axios.put(`${API_URL}/notes/${noteId}`, { content });
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
      setSettings(newSettings);
      if (newSettings.language) {
        setLanguage(newSettings.language);
      }
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      return false;
    }
  }, []);

  const testTelegram = useCallback(async (message) => {
    try {
      await axios.post(`${API_URL}/telegram/test`, { message });
      return true;
    } catch (error) {
      console.error('Error testing telegram:', error);
      return false;
    }
  }, []);

  const refreshAll = useCallback(async () => {
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
  }, [fetchMarketData, fetchAnalysisData, fetchNews, fetchAlerts, fetchNotes, fetchSettings]);

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    fetchMarketData();
    fetchAnalysisData();
  }, [timeframe, fetchMarketData, fetchAnalysisData]);

  // Auto-refresh market data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMarketData();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  // WebSocket connection for real-time price updates
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    try {
      wsRef.current = new WebSocket(WS_URL);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket connected for real-time prices');
        setConnectionStatus('LIVE');
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'price_update' && message.data) {
            setMarketStatus(prev => ({
              ...prev,
              price: message.data.price,
              price_change_percent_24h: message.data.change_24h,
              high_24h: message.data.high_24h,
              low_24h: message.data.low_24h,
              volume_24h: message.data.volume_24h,
              status: 'LIVE',
              timestamp: message.data.timestamp
            }));
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('DELAYED');
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('DELAYED');
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, []);

  // Connect WebSocket on mount
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);

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
