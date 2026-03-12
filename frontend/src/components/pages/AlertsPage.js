import React, { useState } from 'react';
import { Plus, Trash2, Bell } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { cn } from '../../lib/utils';

export function AlertsPage() {
  const { t, alerts, marketStatus, createAlert, deleteAlert } = useApp();
  const [showDialog, setShowDialog] = useState(false);
  const [newAlert, setNewAlert] = useState({
    price: '',
    condition: 'above',
    send_telegram: false
  });

  const currentPrice = marketStatus?.price || 0;

  const formatPrice = (p) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(p);
  };

  const handleCreate = async () => {
    if (!newAlert.price) return;
    const success = await createAlert({
      price: parseFloat(newAlert.price),
      condition: newAlert.condition,
      send_telegram: newAlert.send_telegram
    });
    if (success) {
      setShowDialog(false);
      setNewAlert({ price: '', condition: 'above', send_telegram: false });
    }
  };

  return (
    <div className="p-4 space-y-4" data-testid="alerts-page">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">{t('alerts')}</h1>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-bullish text-black hover:bg-bullish/90" data-testid="create-alert-btn">
              <Plus className="w-4 h-4 mr-2" />
              {t('createAlert')}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-crypto-card border-crypto-border">
            <DialogHeader>
              <DialogTitle className="font-heading">{t('createAlert')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-sm text-zinc-500">
                Current price: <span className="font-mono text-white">${formatPrice(currentPrice)}</span>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">{t('condition')}</label>
                <Select 
                  value={newAlert.condition} 
                  onValueChange={(v) => setNewAlert({...newAlert, condition: v})}
                >
                  <SelectTrigger className="bg-crypto-surface border-crypto-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-crypto-card border-crypto-border">
                    <SelectItem value="above">{t('above')}</SelectItem>
                    <SelectItem value="below">{t('below')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-zinc-400">{t('price')}</label>
                <Input
                  type="number"
                  value={newAlert.price}
                  onChange={(e) => setNewAlert({...newAlert, price: e.target.value})}
                  placeholder="Enter price"
                  className="bg-crypto-surface border-crypto-border font-mono"
                  data-testid="alert-price-input"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-400">{t('telegram')}</label>
                <Switch
                  checked={newAlert.send_telegram}
                  onCheckedChange={(v) => setNewAlert({...newAlert, send_telegram: v})}
                  data-testid="alert-telegram-switch"
                />
              </div>

              <Button 
                onClick={handleCreate}
                className="w-full bg-bullish text-black hover:bg-bullish/90"
                data-testid="confirm-create-alert"
              >
                {t('createAlert')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Active alerts */}
      <div className="space-y-2">
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <div 
              key={alert.id}
              className={cn(
                "flex items-center justify-between p-4 bg-crypto-card/60 border border-crypto-border rounded-sm",
                alert.condition === 'above' ? "border-l-2 border-l-bullish" : "border-l-2 border-l-bearish"
              )}
            >
              <div className="flex items-center gap-4">
                <Bell className={cn(
                  "w-5 h-5",
                  alert.condition === 'above' ? "text-bullish" : "text-bearish"
                )} />
                <div>
                  <div className="font-mono text-lg">${formatPrice(alert.price)}</div>
                  <div className="text-xs text-zinc-500">
                    {t(alert.condition)} current price
                    {alert.send_telegram && <span className="ml-2 text-whale">+ Telegram</span>}
                  </div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => deleteAlert(alert.id)}
                className="text-zinc-500 hover:text-bearish"
                data-testid={`delete-alert-${alert.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-32 text-zinc-500 text-sm bg-crypto-card/30 rounded-sm border border-crypto-border">
            No active alerts
          </div>
        )}
      </div>
    </div>
  );
}

export default AlertsPage;
