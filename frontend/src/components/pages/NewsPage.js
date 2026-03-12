import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { NewsCard } from '../cards';

export function NewsPage() {
  const { t } = useApp();

  return (
    <div className="p-4 space-y-4" data-testid="news-page">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold tracking-tight">{t('news')}</h1>
      </div>
      
      <div className="max-w-2xl">
        <NewsCard />
      </div>
    </div>
  );
}

export default NewsPage;
