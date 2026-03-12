import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { WhaleAlertCard } from '../cards';

export function WhaleAlertsPage() {
  const { t } = useApp();

  return (
    <div className="p-4 space-y-4" data-testid="whale-alerts-page">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">{t('whaleAlerts')}</h1>
      </div>
      
      <div className="max-w-2xl">
        <WhaleAlertCard />
      </div>
    </div>
  );
}

export default WhaleAlertsPage;
