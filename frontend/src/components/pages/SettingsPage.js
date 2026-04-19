import React, { useState, useEffect } from 'react';
import { Save, Send, Check, X, Info, MessageCircle, Bell, BellOff, Database, RefreshCw, Shield, AlertTriangle, CheckCircle, Wifi, WifiOff, Target, Crosshair, Zap, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Slider } from '../ui/slider';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { translations } from '../../translations';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function SettingsPage() {
  const { t, settings, updateSettings, testTelegram, language, setLanguage } = useApp();
  const [localSettings, setLocalSettings] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  // Get translation helper
  const lang = translations[language] || translations.en;

  const handleSave = async () => {
    if (!localSettings) return;
    setIsSaving(true);
    const success = await updateSettings(localSettings);
    setIsSaving(false);
    if (success) {
      toast.success(lang.savedSuccessfully || 'Settings saved successfully');
    } else {
      toast.error(lang.errorSaving || 'Failed to save settings');
    }
  };

  const handleTestTelegram = async () => {
    if (!localSettings?.telegram_bot_token || !localSettings?.telegram_chat_id) {
      toast.error(lang.telegramNotConfigured || 'Please configure Telegram credentials first');
      return;
    }
    setIsTesting(true);
    const message = `🔔 CryptoRadar Test Message\n\n${lang.telegramTestSuccess || 'Your Telegram integration is working correctly!'}\n\nTimestamp: ${new Date().toISOString()}`;
    const success = await testTelegram(message);
    setIsTesting(false);
    if (success) {
      toast.success(lang.telegramTestSuccess || 'Test message sent successfully!');
    } else {
      toast.error(lang.telegramTestFail || 'Failed to send test message. Check your credentials.');
    }
  };

  if (!localSettings) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-crypto-card rounded w-1/4" />
          <div className="h-64 bg-crypto-card rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-2xl" data-testid="settings-page">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">{t('settings')}</h1>
        <Button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-bullish text-black hover:bg-bullish/90"
          data-testid="save-settings-btn"
        >
          {isSaving ? (
            <span className="animate-spin mr-2">⏳</span>
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {t('save')}
        </Button>
      </div>
      
      {/* Language Settings */}
      <div className="bg-crypto-card/60 border border-crypto-border rounded-sm p-4 space-y-4">
        <h2 className="font-heading font-semibold text-lg">{t('language')}</h2>
        <Select 
          value={localSettings.language} 
          onValueChange={(v) => {
            setLocalSettings({...localSettings, language: v});
            setLanguage(v);
          }}
        >
          <SelectTrigger className="bg-crypto-surface border-crypto-border w-48" data-testid="language-setting">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-crypto-card border-crypto-border">
            <SelectItem value="en">{t('english')}</SelectItem>
            <SelectItem value="it">{t('italian')}</SelectItem>
            <SelectItem value="de">{t('german')}</SelectItem>
            <SelectItem value="pl">{t('polish')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Telegram Settings */}
      <div className="bg-crypto-card/60 border border-crypto-border rounded-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-[#0088cc]" />
            <h2 className="font-heading font-semibold text-lg">{t('telegramSettings') || t('telegram')}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">{t('enabled')}</span>
            <Switch
              checked={localSettings.telegram_enabled}
              onCheckedChange={(v) => setLocalSettings({...localSettings, telegram_enabled: v})}
              data-testid="telegram-enabled-switch"
            />
          </div>
        </div>

        {/* Instructions Collapsible */}
        <div className="bg-crypto-bg/50 border border-crypto-border rounded-sm p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-whale mt-0.5 flex-shrink-0" />
            <div className="text-xs text-zinc-400 space-y-1">
              <p className="font-medium text-zinc-300">{t('telegramHowTo') || lang.telegramHowTo || 'How to get Bot Token and Chat ID'}:</p>
              <ol className="list-decimal ml-4 space-y-0.5">
                <li>{lang.telegramStep1 || 'Open Telegram and search for'} <span className="text-whale">@BotFather</span></li>
                <li>{lang.telegramStep2 || 'Send /newbot and follow instructions'}</li>
                <li>{lang.telegramStep3 || 'Copy the Bot Token provided'}</li>
                <li>{lang.telegramStep4 || 'For Chat ID, message your bot, then visit:'}</li>
              </ol>
              <code className="block text-[10px] bg-crypto-surface p-1 rounded mt-1 break-all">
                https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates
              </code>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">{t('telegramBotToken') || lang.telegramBotToken || 'Bot Token'}</label>
            <Input
              type="password"
              value={localSettings.telegram_bot_token || ''}
              onChange={(e) => setLocalSettings({...localSettings, telegram_bot_token: e.target.value})}
              placeholder={lang.enterBotToken || 'Enter your Telegram bot token'}
              className="bg-crypto-surface border-crypto-border font-mono text-sm"
              data-testid="telegram-token-input"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">{t('telegramChatId') || lang.telegramChatId || 'Chat ID'}</label>
            <Input
              value={localSettings.telegram_chat_id || ''}
              onChange={(e) => setLocalSettings({...localSettings, telegram_chat_id: e.target.value})}
              placeholder={lang.enterChatId || 'Enter your Telegram chat ID'}
              className="bg-crypto-surface border-crypto-border font-mono text-sm"
              data-testid="telegram-chatid-input"
            />
          </div>
          <Button 
            variant="outline"
            onClick={handleTestTelegram}
            disabled={isTesting || !localSettings.telegram_bot_token || !localSettings.telegram_chat_id}
            className="border-[#0088cc] text-[#0088cc] hover:bg-[#0088cc]/10"
            data-testid="test-telegram-btn"
          >
            {isTesting ? (
              <span className="animate-spin mr-2">⏳</span>
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {t('telegramTest') || lang.testConnection || 'Test Connection'}
          </Button>
        </div>

        <Separator className="bg-crypto-border" />

        {/* Signal Notification preferences */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-bullish" />
            <h3 className="text-sm font-medium text-zinc-300">{lang.signalNotifications || 'Signal Notifications'}</h3>
          </div>
          
          <div className="flex items-center justify-between p-2 bg-crypto-bg/30 rounded">
            <div className="flex flex-col">
              <span className="text-sm">{lang.operationalSignals || 'Operational Signals'}</span>
              <span className="text-xs text-zinc-500">{lang.signalNotificationsDesc || 'When a LONG/SHORT signal becomes operational'}</span>
            </div>
            <Switch
              checked={localSettings.notify_operational_signals ?? true}
              onCheckedChange={(v) => setLocalSettings({...localSettings, notify_operational_signals: v})}
              data-testid="notify-operational-switch"
            />
          </div>
          
          <div className="flex items-center justify-between p-2 bg-crypto-bg/30 rounded">
            <div className="flex flex-col">
              <span className="text-sm">{lang.notifySignalInvalidations || 'Signal Invalidations'}</span>
              <span className="text-xs text-zinc-500">{lang.signalInvalidationsDesc || 'When a signal is invalidated'}</span>
            </div>
            <Switch
              checked={localSettings.notify_signal_invalidations ?? true}
              onCheckedChange={(v) => setLocalSettings({...localSettings, notify_signal_invalidations: v})}
              data-testid="notify-invalidations-switch"
            />
          </div>
          
          <div className="flex items-center justify-between p-2 bg-crypto-bg/30 rounded">
            <div className="flex flex-col">
              <span className="text-sm">{lang.notifySignalOutcomes || 'Trade Outcomes'}</span>
              <span className="text-xs text-zinc-500">{lang.signalOutcomesDesc || 'WIN, LOSS, Partial Win, Expired'}</span>
            </div>
            <Switch
              checked={localSettings.notify_signal_outcomes ?? true}
              onCheckedChange={(v) => setLocalSettings({...localSettings, notify_signal_outcomes: v})}
              data-testid="notify-outcomes-switch"
            />
          </div>
        </div>

        <Separator className="bg-crypto-border" />

        {/* Other notification preferences */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-400">{language === 'it' ? 'Altre Notifiche' : 'Other Notifications'}</h3>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('whaleAlerts')}</span>
            <Switch
              checked={localSettings.notify_whale_alerts}
              onCheckedChange={(v) => setLocalSettings({...localSettings, notify_whale_alerts: v})}
              data-testid="notify-whale-switch"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('patterns')}</span>
            <Switch
              checked={localSettings.notify_patterns}
              onCheckedChange={(v) => setLocalSettings({...localSettings, notify_patterns: v})}
              data-testid="notify-patterns-switch"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('candlesticks')}</span>
            <Switch
              checked={localSettings.notify_candlesticks}
              onCheckedChange={(v) => setLocalSettings({...localSettings, notify_candlesticks: v})}
              data-testid="notify-candlesticks-switch"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('alerts')}</span>
            <Switch
              checked={localSettings.notify_price_alerts}
              onCheckedChange={(v) => setLocalSettings({...localSettings, notify_price_alerts: v})}
              data-testid="notify-alerts-switch"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">{t('supportResistance')} Breaks</span>
            <Switch
              checked={localSettings.notify_sr_breaks}
              onCheckedChange={(v) => setLocalSettings({...localSettings, notify_sr_breaks: v})}
              data-testid="notify-sr-switch"
            />
          </div>
        </div>
      </div>

      {/* Sound Settings */}
      <div className="bg-crypto-card/60 border border-crypto-border rounded-sm p-4 space-y-4">
        <h2 className="font-heading font-semibold text-lg">Sound</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm">Alert Sound</span>
          <Switch
            checked={localSettings.alert_sound}
            onCheckedChange={(v) => setLocalSettings({...localSettings, alert_sound: v})}
            data-testid="alert-sound-switch"
          />
        </div>
      </div>

      {/* V4 Telegram Settings - SNIPER & HUNTER */}
      <TelegramV4SettingsSection language={language} />

      {/* Documentation Downloads */}
      <div className="bg-crypto-card/60 border border-crypto-border rounded-sm p-4 space-y-4">
        <h2 className="font-heading font-semibold text-lg">{t('documentation')}</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {language === 'it' ? 'Scarica i manuali e le guide per CryptoRadar' : 'Download manuals and guides for CryptoRadar'}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <a 
            href={language === 'it' ? "/MANUALE_OPERATIVO_IT.pdf" : "/OPERATIONAL_MANUAL.pdf"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-crypto-bg border border-crypto-border rounded-sm hover:border-bullish transition-colors"
            data-testid="download-operational-manual"
          >
            <span className="text-bullish">📖</span>
            <span className="text-sm">{lang.operationalManual || 'Operational Manual'}</span>
          </a>
          <a 
            href={language === 'it' ? "/MANUALE_TECNICO_IT.pdf" : "/TECHNICAL_MANUAL.pdf"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-crypto-bg border border-crypto-border rounded-sm hover:border-bullish transition-colors"
            data-testid="download-technical-manual"
          >
            <span className="text-bullish">⚙️</span>
            <span className="text-sm">{lang.technicalManual || 'Technical Manual'}</span>
          </a>
          <a 
            href="/PRODUCTION_DEPLOYMENT.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-crypto-bg border border-crypto-border rounded-sm hover:border-bullish transition-colors"
            data-testid="download-deployment-guide"
          >
            <span className="text-bullish">🚀</span>
            <span className="text-sm">{lang.deploymentGuide || 'Deployment Guide'}</span>
          </a>
          <a 
            href={`${process.env.REACT_APP_BACKEND_URL}/api/system/health`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-crypto-bg border border-crypto-border rounded-sm hover:border-bullish transition-colors"
            data-testid="system-health-link"
          >
            <span className="text-bullish">💚</span>
            <span className="text-sm">{lang.systemHealthCheck || 'System Health Check'}</span>
          </a>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          API & DATA SOURCES - Admin Section
          Shows current API/data-source configuration and connection status
      ═══════════════════════════════════════════════════════════════════ */}
      <ApiDataSourcesSection language={language} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// V4 TELEGRAM SETTINGS COMPONENT - SNIPER & HUNTER ALERTS
// ═══════════════════════════════════════════════════════════════════════════

function TelegramV4SettingsSection({ language }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSniper, setTestingSniper] = useState(false);
  const [testingHunter, setTestingHunter] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [localToken, setLocalToken] = useState('');
  
  const lang = translations[language] || translations.en;
  
  // Get admin token from localStorage
  const getAdminHeaders = () => {
    const token = localStorage.getItem('cryptoradar_admin_token');
    return token ? { 'X-Admin-Key': token } : {};
  };
  
  const t = {
    title: language === 'it' ? 'Telegram V4 - Alert SNIPER & HUNTER' : 'Telegram V4 - SNIPER & HUNTER Alerts',
    subtitle: language === 'it' ? 'Configura le tue notifiche per i segnali V3' : 'Configure your V3 signal notifications',
    botToken: language === 'it' ? 'Bot Token' : 'Bot Token',
    chatId: language === 'it' ? 'Chat ID Principale' : 'Primary Chat ID',
    additionalIds: language === 'it' ? 'Chat ID Aggiuntivi' : 'Additional Chat IDs',
    additionalIdsHint: language === 'it' ? 'Separati da virgola (opzionale)' : 'Comma-separated (optional)',
    sniperSection: language === 'it' ? 'Notifiche SNIPER' : 'SNIPER Notifications',
    hunterSection: language === 'it' ? 'Notifiche HUNTER' : 'HUNTER Notifications',
    notifySniper: language === 'it' ? 'Segnali SNIPER' : 'SNIPER Signals',
    notifySniperDesc: language === 'it' ? 'Ricevi alert quando un segnale SNIPER diventa operativo' : 'Receive alerts when a SNIPER signal becomes operational',
    notifyHunter: language === 'it' ? 'Segnali HUNTER' : 'HUNTER Signals',
    notifyHunterDesc: language === 'it' ? 'Ricevi alert quando un HUNT 10-20-70 viene attivato' : 'Receive alerts when a 10-20-70 HUNT is activated',
    notifyOutcomes: language === 'it' ? 'Esiti Trade' : 'Trade Outcomes',
    notifyOutcomesDesc: language === 'it' ? 'WIN, LOSS, Partial Win, Expired' : 'WIN, LOSS, Partial Win, Expired',
    notifyLong: language === 'it' ? 'Segnali LONG' : 'LONG Signals',
    notifyShort: language === 'it' ? 'Segnali SHORT' : 'SHORT Signals',
    qualityThreshold: language === 'it' ? 'Soglia Qualità Minima' : 'Minimum Quality Threshold',
    qualityHint: language === 'it' ? 'Ricevi solo segnali con qualità ≥ questo valore' : 'Only receive signals with quality ≥ this value',
    testSniper: language === 'it' ? 'Test SNIPER' : 'Test SNIPER',
    testHunter: language === 'it' ? 'Test HUNTER' : 'Test HUNTER',
    save: language === 'it' ? 'Salva Impostazioni' : 'Save Settings',
    saved: language === 'it' ? 'Impostazioni salvate!' : 'Settings saved!',
    errorSaving: language === 'it' ? 'Errore nel salvataggio' : 'Error saving settings',
    testSent: language === 'it' ? 'Test inviato!' : 'Test sent!',
    testFailed: language === 'it' ? 'Test fallito' : 'Test failed',
    notConfigured: language === 'it' ? 'Inserisci Bot Token e Chat ID prima di testare' : 'Enter Bot Token and Chat ID before testing',
    howToSetup: language === 'it' ? 'Come configurare' : 'How to setup',
    enabled: language === 'it' ? 'Abilitato' : 'Enabled',
    stats: language === 'it' ? 'Statistiche' : 'Statistics',
    totalSent: language === 'it' ? 'Totali Inviate' : 'Total Sent',
    sniperSent: language === 'it' ? 'SNIPER Inviate' : 'SNIPER Sent',
    hunterSent: language === 'it' ? 'HUNTER Inviate' : 'HUNTER Sent',
    tokenConfigured: language === 'it' ? 'Token Configurato' : 'Token Configured',
    enterNewToken: language === 'it' ? 'Inserisci nuovo token per aggiornare' : 'Enter new token to update'
  };

  // Fetch V4 settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${API_URL}/api/telegram/v4-settings`, {
          headers: getAdminHeaders()
        });
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Failed to fetch V4 telegram settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Save settings
  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const params = new URLSearchParams({
        enabled: settings.enabled,
        chat_id: settings.chat_id || '',
        additional_chat_ids: (settings.additional_chat_ids || []).join(','),
        language: settings.language || 'it',
        notify_sniper_signals: settings.preferences?.notify_sniper_signals ?? true,
        notify_sniper_outcomes: settings.preferences?.notify_sniper_outcomes ?? true,
        notify_hunter_signals: settings.preferences?.notify_hunter_signals ?? true,
        notify_hunter_outcomes: settings.preferences?.notify_hunter_outcomes ?? true,
        notify_long_signals: settings.preferences?.notify_long_signals ?? true,
        notify_short_signals: settings.preferences?.notify_short_signals ?? true,
        min_quality_threshold: settings.preferences?.min_quality_threshold ?? 50
      });
      
      // Only send token if user entered a new one
      if (localToken && localToken.trim()) {
        params.set('bot_token', localToken.trim());
      }

      const response = await fetch(`${API_URL}/api/telegram/v4-settings?${params.toString()}`, {
        method: 'POST',
        headers: getAdminHeaders()
      });
      
      if (response.ok) {
        toast.success(t.saved);
        setLocalToken(''); // Clear local token after save
        // Refresh settings
        const refreshResp = await fetch(`${API_URL}/api/telegram/v4-settings`, {
          headers: getAdminHeaders()
        });
        if (refreshResp.ok) {
          setSettings(await refreshResp.json());
        }
      } else {
        toast.error(t.errorSaving);
      }
    } catch (error) {
      toast.error(t.errorSaving);
    } finally {
      setSaving(false);
    }
  };

  // Test SNIPER notification
  const handleTestSniper = async () => {
    if (!settings?.bot_token_configured && !localToken) {
      toast.error(t.notConfigured);
      return;
    }
    setTestingSniper(true);
    try {
      const response = await fetch(`${API_URL}/api/telegram/v4-test-sniper`, {
        method: 'POST',
        headers: getAdminHeaders()
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`🎯 ${t.testSent}`);
      } else {
        toast.error(`${t.testFailed}: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error(t.testFailed);
    } finally {
      setTestingSniper(false);
    }
  };

  // Test HUNTER notification
  const handleTestHunter = async () => {
    if (!settings?.bot_token_configured && !localToken) {
      toast.error(t.notConfigured);
      return;
    }
    setTestingHunter(true);
    try {
      const response = await fetch(`${API_URL}/api/telegram/v4-test-hunter`, {
        method: 'POST',
        headers: getAdminHeaders()
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`🏹 ${t.testSent}`);
      } else {
        toast.error(`${t.testFailed}: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error(t.testFailed);
    } finally {
      setTestingHunter(false);
    }
  };

  // Update preference helper
  const updatePref = (key, value) => {
    setSettings(prev => ({
      ...prev,
      preferences: { ...prev.preferences, [key]: value }
    }));
  };

  if (loading) {
    return (
      <div className="bg-crypto-card border border-crypto-border rounded-sm p-4 animate-pulse">
        <div className="h-8 bg-zinc-800 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-12 bg-zinc-800 rounded" />
          <div className="h-12 bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="bg-gradient-to-br from-crypto-card/80 to-zinc-900/60 border border-[#0088cc]/30 rounded-sm overflow-hidden" data-testid="telegram-v4-settings">
      {/* Header */}
      <div className="p-4 border-b border-[#0088cc]/30 bg-gradient-to-r from-[#0088cc]/10 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0088cc]/20 rounded-lg">
              <MessageCircle className="w-5 h-5 text-[#0088cc]" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-[#0088cc]">{t.title}</h3>
              <p className="text-xs text-zinc-500">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">{t.enabled}</span>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(v) => setSettings({...settings, enabled: v})}
              data-testid="telegram-v4-enabled"
            />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Bot Token & Chat ID */}
        <div className="space-y-4">
          {/* Instructions */}
          <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-[#0088cc] mt-0.5 flex-shrink-0" />
              <div className="text-xs text-zinc-400 space-y-1">
                <p className="font-medium text-zinc-300">{t.howToSetup}:</p>
                <ol className="list-decimal ml-4 space-y-0.5">
                  <li>Apri Telegram e cerca <span className="text-[#0088cc]">@BotFather</span></li>
                  <li>Invia <code className="bg-zinc-800 px-1 rounded">/newbot</code> e segui le istruzioni</li>
                  <li>Copia il Bot Token fornito</li>
                  <li>Per ottenere il Chat ID, invia un messaggio al tuo bot, poi visita:</li>
                </ol>
                <code className="block text-[10px] bg-zinc-800 p-1 rounded mt-1 break-all text-[#0088cc]">
                  https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates
                </code>
              </div>
            </div>
          </div>

          {/* Bot Token */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400 flex items-center gap-2">
              {t.botToken}
              {settings.bot_token_configured && (
                <span className="text-xs px-2 py-0.5 bg-bullish/20 text-bullish rounded-full">
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  {t.tokenConfigured}
                </span>
              )}
            </label>
            <div className="relative">
              <Input
                type={showToken ? "text" : "password"}
                value={localToken}
                onChange={(e) => setLocalToken(e.target.value)}
                placeholder={settings.bot_token_configured ? t.enterNewToken : "123456789:ABCdefGHIjklmnOPQrstUVwxyz"}
                className="bg-zinc-900/80 border-zinc-700 font-mono text-sm pr-10"
                data-testid="telegram-v4-token"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {settings.bot_token_configured && (
              <p className="text-xs text-zinc-500">Token attuale: {settings.bot_token_masked}</p>
            )}
          </div>

          {/* Chat ID */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">{t.chatId}</label>
            <Input
              value={settings.chat_id || ''}
              onChange={(e) => setSettings({...settings, chat_id: e.target.value})}
              placeholder="123456789"
              className="bg-zinc-900/80 border-zinc-700 font-mono text-sm"
              data-testid="telegram-v4-chatid"
            />
          </div>

          {/* Additional Chat IDs */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">{t.additionalIds}</label>
            <Input
              value={(settings.additional_chat_ids || []).join(', ')}
              onChange={(e) => setSettings({
                ...settings, 
                additional_chat_ids: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              })}
              placeholder="987654321, 555555555"
              className="bg-zinc-900/80 border-zinc-700 font-mono text-sm"
              data-testid="telegram-v4-additional-ids"
            />
            <p className="text-xs text-zinc-500">{t.additionalIdsHint}</p>
          </div>
        </div>

        <Separator className="bg-zinc-700/50" />

        {/* SNIPER & HUNTER Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SNIPER Section */}
          <div className="bg-zinc-900/40 border border-zinc-700/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-[#00FF9D]" />
              <h4 className="font-semibold text-[#00FF9D]">{t.sniperSection}</h4>
            </div>
            
            <div className="flex items-center justify-between p-2 bg-zinc-800/30 rounded">
              <div>
                <span className="text-sm">{t.notifySniper}</span>
                <p className="text-xs text-zinc-500">{t.notifySniperDesc}</p>
              </div>
              <Switch
                checked={settings.preferences?.notify_sniper_signals ?? true}
                onCheckedChange={(v) => updatePref('notify_sniper_signals', v)}
                data-testid="notify-sniper-signals"
              />
            </div>
            
            <div className="flex items-center justify-between p-2 bg-zinc-800/30 rounded">
              <div>
                <span className="text-sm">{t.notifyOutcomes}</span>
                <p className="text-xs text-zinc-500">{t.notifyOutcomesDesc}</p>
              </div>
              <Switch
                checked={settings.preferences?.notify_sniper_outcomes ?? true}
                onCheckedChange={(v) => updatePref('notify_sniper_outcomes', v)}
                data-testid="notify-sniper-outcomes"
              />
            </div>
          </div>

          {/* HUNTER Section */}
          <div className="bg-zinc-900/40 border border-zinc-700/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Crosshair className="w-5 h-5 text-[#FF6B35]" />
              <h4 className="font-semibold text-[#FF6B35]">{t.hunterSection}</h4>
            </div>
            
            <div className="flex items-center justify-between p-2 bg-zinc-800/30 rounded">
              <div>
                <span className="text-sm">{t.notifyHunter}</span>
                <p className="text-xs text-zinc-500">{t.notifyHunterDesc}</p>
              </div>
              <Switch
                checked={settings.preferences?.notify_hunter_signals ?? true}
                onCheckedChange={(v) => updatePref('notify_hunter_signals', v)}
                data-testid="notify-hunter-signals"
              />
            </div>
            
            <div className="flex items-center justify-between p-2 bg-zinc-800/30 rounded">
              <div>
                <span className="text-sm">{t.notifyOutcomes}</span>
                <p className="text-xs text-zinc-500">{t.notifyOutcomesDesc}</p>
              </div>
              <Switch
                checked={settings.preferences?.notify_hunter_outcomes ?? true}
                onCheckedChange={(v) => updatePref('notify_hunter_outcomes', v)}
                data-testid="notify-hunter-outcomes"
              />
            </div>
          </div>
        </div>

        <Separator className="bg-zinc-700/50" />

        {/* Direction Filters & Quality Threshold */}
        <div className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">{t.notifyLong}:</span>
              <Switch
                checked={settings.preferences?.notify_long_signals ?? true}
                onCheckedChange={(v) => updatePref('notify_long_signals', v)}
                data-testid="notify-long"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">{t.notifyShort}:</span>
              <Switch
                checked={settings.preferences?.notify_short_signals ?? true}
                onCheckedChange={(v) => updatePref('notify_short_signals', v)}
                data-testid="notify-short"
              />
            </div>
          </div>

          {/* Quality Threshold Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-zinc-400">{t.qualityThreshold}</label>
              <span className="text-sm font-mono text-[#00D4FF]">
                ≥ {settings.preferences?.min_quality_threshold ?? 50}%
              </span>
            </div>
            <Slider
              value={[settings.preferences?.min_quality_threshold ?? 50]}
              onValueChange={(v) => updatePref('min_quality_threshold', v[0])}
              min={0}
              max={100}
              step={5}
              className="w-full"
              data-testid="quality-threshold-slider"
            />
            <p className="text-xs text-zinc-500">{t.qualityHint}</p>
          </div>
        </div>

        <Separator className="bg-zinc-700/50" />

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-zinc-900/50 rounded p-3">
            <p className="text-2xl font-mono font-bold text-white">{settings.total_notifications_sent || 0}</p>
            <p className="text-xs text-zinc-500">{t.totalSent}</p>
          </div>
          <div className="bg-zinc-900/50 rounded p-3">
            <p className="text-2xl font-mono font-bold text-[#00FF9D]">{settings.sniper_notifications_sent || 0}</p>
            <p className="text-xs text-zinc-500">{t.sniperSent}</p>
          </div>
          <div className="bg-zinc-900/50 rounded p-3">
            <p className="text-2xl font-mono font-bold text-[#FF6B35]">{settings.hunter_notifications_sent || 0}</p>
            <p className="text-xs text-zinc-500">{t.hunterSent}</p>
          </div>
        </div>

        <Separator className="bg-zinc-700/50" />

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#0088cc] text-white hover:bg-[#0088cc]/90"
            data-testid="save-telegram-v4"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {t.save}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleTestSniper}
            disabled={testingSniper}
            className="border-[#00FF9D]/50 text-[#00FF9D] hover:bg-[#00FF9D]/10"
            data-testid="test-sniper-btn"
          >
            {testingSniper ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Target className="w-4 h-4 mr-2" />
            )}
            {t.testSniper}
          </Button>
          
          <Button
            variant="outline"
            onClick={handleTestHunter}
            disabled={testingHunter}
            className="border-[#FF6B35]/50 text-[#FF6B35] hover:bg-[#FF6B35]/10"
            data-testid="test-hunter-btn"
          >
            {testingHunter ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Crosshair className="w-4 h-4 mr-2" />
            )}
            {t.testHunter}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// API & DATA SOURCES COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function ApiDataSourcesSection({ language }) {
  const [dataSources, setDataSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testingSource, setTestingSource] = useState(null);

  // Import centralized translations
  const lang = translations[language] || translations.en;
  const t = {
    title: lang.apiDataSources || 'API & Data Sources',
    subtitle: lang.apiDataSourcesSubtitle || 'Configuration and connection status',
    source: lang.source || 'Source',
    status: lang.status || 'Status',
    role: lang.role || 'Role',
    lastCheck: lang.lastCheck || 'Last check',
    testConnection: lang.testConnection || 'Test Connection',
    apiKey: lang.apiKey || 'API Key',
    enabled: lang.enabled || 'Enabled',
    disabled: lang.disabled || 'Disabled',
    valid: lang.valid || 'VALID',
    invalid: lang.invalid || 'INVALID',
    planLimit: lang.planLimitation || 'PLAN LIMITATION',
    unavailable: lang.unavailable || 'UNAVAILABLE',
    networkError: lang.networkError || 'NETWORK ERROR',
    testing: lang.testing || 'Testing...',
    adminOnly: lang.adminOnly || 'Admin only',
    noChanges: lang.noChanges || 'API changes will be available in a future version',
    connected: lang.connected || 'CONNECTED',
    notConfigured: lang.notConfigured || 'NOT CONFIGURED',
    futureSources: lang.futureSources || 'Future Sources (Not Yet Integrated)',
    comingSoon: language === 'it' ? 'PROSSIMAMENTE' : language === 'de' ? 'DEMNÄCHST' : language === 'pl' ? 'WKRÓTCE' : 'COMING SOON'
  };

  // Fetch data sources status
  useEffect(() => {
    const fetchDataSources = async () => {
      try {
        const response = await fetch(`${API_URL}/api/system/data-sources`);
        if (response.ok) {
          const data = await response.json();
          setDataSources(data.sources || []);
        }
      } catch (error) {
        console.error('Failed to fetch data sources:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDataSources();
  }, []);

  // Test connection for a specific source
  const testConnection = async (sourceName) => {
    setTestingSource(sourceName);
    try {
      const response = await fetch(`${API_URL}/api/system/test-connection/${sourceName}`);
      const result = await response.json();
      
      // Update the source status
      setDataSources(prev => prev.map(src => 
        src.name === sourceName 
          ? { ...src, lastTestResult: result.status, lastTestTime: new Date().toISOString() }
          : src
      ));

      if (result.status === 'VALID') {
        toast.success(`${sourceName}: ${t.valid}`);
      } else if (result.status === 'PLAN_LIMITATION') {
        toast.warning(`${sourceName}: ${t.planLimit}`);
      } else {
        toast.error(`${sourceName}: ${result.status}`);
      }
    } catch (error) {
      toast.error(`${sourceName}: ${t.networkError}`);
    } finally {
      setTestingSource(null);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      'VALID': { color: 'bg-bullish/20 text-bullish border-bullish/30', icon: CheckCircle },
      'CONNECTED': { color: 'bg-bullish/20 text-bullish border-bullish/30', icon: CheckCircle },
      'PLAN_LIMITATION': { color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', icon: AlertTriangle },
      'INVALID': { color: 'bg-bearish/20 text-bearish border-bearish/30', icon: X },
      'UNAVAILABLE': { color: 'bg-zinc-600/20 text-zinc-400 border-zinc-500/30', icon: WifiOff },
      'NETWORK_ERROR': { color: 'bg-bearish/20 text-bearish border-bearish/30', icon: WifiOff },
      'NOT_CONFIGURED': { color: 'bg-zinc-600/20 text-zinc-400 border-zinc-500/30', icon: Info },
      'FUTURE_SOURCE': { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Info }
    }[status] || { color: 'bg-zinc-600/20 text-zinc-400 border-zinc-500/30', icon: Info };

    const StatusIcon = config.icon;
    const displayStatus = status === 'FUTURE_SOURCE' ? t.comingSoon : 
                          status === 'CONNECTED' ? t.connected :
                          status === 'NOT_CONFIGURED' ? t.notConfigured :
                          status;
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border", config.color)}>
        <StatusIcon className="w-3 h-3" />
        {displayStatus}
      </span>
    );
  };

  const maskApiKey = (key) => {
    if (!key) return '••••••••';
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  };

  if (loading) {
    return (
      <div className="bg-crypto-card border border-crypto-border rounded-sm p-4 animate-pulse">
        <div className="h-8 bg-zinc-800 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-zinc-800 rounded" />
          <div className="h-16 bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-crypto-card border border-crypto-border rounded-sm overflow-hidden" data-testid="api-data-sources-section">
      {/* Header */}
      <div className="p-4 border-b border-crypto-border bg-gradient-to-r from-crypto-card to-zinc-900/50">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-whale" />
          <div>
            <h3 className="font-heading font-semibold">{t.title}</h3>
            <p className="text-xs text-zinc-500">{t.subtitle}</p>
          </div>
          <span className="ml-auto text-xs px-2 py-1 bg-whale/10 text-whale border border-whale/30 rounded">
            <Shield className="w-3 h-3 inline mr-1" />
            {t.adminOnly}
          </span>
        </div>
      </div>

      {/* Data Sources List - Active Sources */}
      <div className="divide-y divide-crypto-border">
        {dataSources.filter(s => s.category !== 'future').map((source) => (
          <div key={source.name} className="p-4 hover:bg-zinc-800/30 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Source Name & Status */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    source.enabled ? "bg-bullish" : "bg-zinc-600"
                  )} />
                  <span className="font-mono font-medium">{source.name}</span>
                  {getStatusBadge(source.lastTestResult || source.status)}
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="text-zinc-500">{t.role}:</div>
                  <div className="text-zinc-300">{source.role}</div>
                  
                  <div className="text-zinc-500">{t.apiKey}:</div>
                  <div className="font-mono text-zinc-400">{maskApiKey(source.apiKeyMasked)}</div>
                  
                  <div className="text-zinc-500">{t.status}:</div>
                  <div className={source.enabled ? "text-bullish" : "text-zinc-500"}>
                    {source.enabled ? t.enabled : t.disabled}
                  </div>
                  
                  {source.lastTestTime && (
                    <>
                      <div className="text-zinc-500">{t.lastCheck}:</div>
                      <div className="text-zinc-400">
                        {new Date(source.lastTestTime).toLocaleTimeString()}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Test Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => testConnection(source.name)}
                disabled={testingSource === source.name || source.status === 'FUTURE_SOURCE'}
                className="border-crypto-border hover:border-whale hover:bg-whale/10"
                data-testid={`test-${source.name.toLowerCase()}-btn`}
              >
                {testingSource === source.name ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    {t.testing}
                  </>
                ) : (
                  <>
                    <Wifi className="w-3 h-3 mr-1" />
                    {t.testConnection}
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Future Sources Section */}
      {dataSources.filter(s => s.category === 'future').length > 0 && (
        <>
          <div className="p-3 bg-zinc-900/50 border-t border-crypto-border">
            <p className="text-xs text-zinc-500 font-medium">
              {language === 'it' ? 'Fonti Future (Non Ancora Integrate)' : 'Future Sources (Not Yet Integrated)'}
            </p>
          </div>
          <div className="divide-y divide-crypto-border/50 opacity-60">
            {dataSources.filter(s => s.category === 'future').map((source) => (
              <div key={source.name} className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-zinc-600" />
                  <span className="font-mono font-medium text-zinc-500">{source.name}</span>
                  {getStatusBadge(source.status)}
                </div>
                <p className="text-xs text-zinc-600 ml-4">{source.description}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Footer Note */}
      <div className="p-3 bg-zinc-900/50 border-t border-crypto-border">
        <p className="text-xs text-zinc-500 flex items-center gap-2">
          <Info className="w-3 h-3" />
          {t.noChanges}
        </p>
      </div>
    </div>
  );
}

export default SettingsPage;
