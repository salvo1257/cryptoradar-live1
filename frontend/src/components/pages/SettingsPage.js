import React, { useState, useEffect } from 'react';
import { Save, Send, Check, X } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';

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

  const handleSave = async () => {
    if (!localSettings) return;
    setIsSaving(true);
    const success = await updateSettings(localSettings);
    setIsSaving(false);
    if (success) {
      toast.success('Settings saved successfully');
    } else {
      toast.error('Failed to save settings');
    }
  };

  const handleTestTelegram = async () => {
    if (!localSettings?.telegram_bot_token || !localSettings?.telegram_chat_id) {
      toast.error('Please configure Telegram credentials first');
      return;
    }
    setIsTesting(true);
    const message = `🔔 CryptoRadar Test Message\n\nYour Telegram integration is working correctly!\n\nTimestamp: ${new Date().toISOString()}`;
    const success = await testTelegram(message);
    setIsTesting(false);
    if (success) {
      toast.success('Test message sent successfully!');
    } else {
      toast.error('Failed to send test message. Check your credentials.');
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
          </SelectContent>
        </Select>
      </div>

      {/* Telegram Settings */}
      <div className="bg-crypto-card/60 border border-crypto-border rounded-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-lg">{t('telegram')}</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">{t('enabled')}</span>
            <Switch
              checked={localSettings.telegram_enabled}
              onCheckedChange={(v) => setLocalSettings({...localSettings, telegram_enabled: v})}
              data-testid="telegram-enabled-switch"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Bot Token</label>
            <Input
              type="password"
              value={localSettings.telegram_bot_token || ''}
              onChange={(e) => setLocalSettings({...localSettings, telegram_bot_token: e.target.value})}
              placeholder="Enter your Telegram bot token"
              className="bg-crypto-surface border-crypto-border font-mono"
              data-testid="telegram-token-input"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Chat ID</label>
            <Input
              value={localSettings.telegram_chat_id || ''}
              onChange={(e) => setLocalSettings({...localSettings, telegram_chat_id: e.target.value})}
              placeholder="Enter your Telegram chat ID"
              className="bg-crypto-surface border-crypto-border font-mono"
              data-testid="telegram-chatid-input"
            />
          </div>
          <Button 
            variant="outline"
            onClick={handleTestTelegram}
            disabled={isTesting}
            className="border-whale text-whale hover:bg-whale/10"
            data-testid="test-telegram-btn"
          >
            {isTesting ? (
              <span className="animate-spin mr-2">⏳</span>
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Test Connection
          </Button>
        </div>

        <Separator className="bg-crypto-border" />

        {/* Notification preferences */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-400">Notification Preferences</h3>
          
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
            <span className="text-sm">{language === 'it' ? 'Manuale Operativo' : 'Operational Manual'}</span>
          </a>
          <a 
            href={language === 'it' ? "/MANUALE_TECNICO_IT.pdf" : "/TECHNICAL_MANUAL.pdf"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-crypto-bg border border-crypto-border rounded-sm hover:border-bullish transition-colors"
            data-testid="download-technical-manual"
          >
            <span className="text-bullish">⚙️</span>
            <span className="text-sm">{language === 'it' ? 'Manuale Tecnico' : 'Technical Manual'}</span>
          </a>
          <a 
            href="/PRODUCTION_DEPLOYMENT.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-crypto-bg border border-crypto-border rounded-sm hover:border-bullish transition-colors"
            data-testid="download-deployment-guide"
          >
            <span className="text-bullish">🚀</span>
            <span className="text-sm">{language === 'it' ? 'Guida Deployment' : 'Deployment Guide'}</span>
          </a>
          <a 
            href={`${process.env.REACT_APP_BACKEND_URL}/api/system/health`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-crypto-bg border border-crypto-border rounded-sm hover:border-bullish transition-colors"
            data-testid="system-health-link"
          >
            <span className="text-bullish">💚</span>
            <span className="text-sm">System Health Check</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
