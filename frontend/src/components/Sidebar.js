import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Activity, 
  Zap, 
  Waves, 
  Search, 
  CandlestickChart, 
  Newspaper, 
  Bell, 
  History,
  StickyNote,
  Settings,
  X
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { cn } from '../lib/utils';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'dashboard' },
  { path: '/support-resistance', icon: Activity, label: 'supportResistance' },
  { path: '/whale-alerts', icon: Zap, label: 'whaleAlerts' },
  { path: '/liquidity', icon: Waves, label: 'liquidity' },
  { path: '/patterns', icon: Search, label: 'patterns' },
  { path: '/candlesticks', icon: CandlestickChart, label: 'candlesticks' },
  { path: '/news', icon: Newspaper, label: 'news' },
  { path: '/alerts', icon: Bell, label: 'alerts' },
  { path: '/alert-history', icon: History, label: 'alertHistory' },
  { path: '/notes', icon: StickyNote, label: 'notes' },
  { path: '/settings', icon: Settings, label: 'settings' },
];

export function Sidebar() {
  const { t, sidebarOpen, setSidebarOpen } = useApp();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          data-testid="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed md:static top-0 left-0 h-full z-50 w-64 bg-crypto-card/80 backdrop-blur-md border-r border-crypto-border flex flex-col transition-transform duration-300",
          "md:transform-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        data-testid="sidebar"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-crypto-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-bullish/20 rounded-sm flex items-center justify-center">
              <Activity className="w-5 h-5 text-bullish" />
            </div>
            <span className="font-heading font-bold text-lg tracking-tight">CryptoRadar</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1 hover:bg-white/5 rounded-sm transition-colors"
            data-testid="sidebar-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {navItems.map(({ path, icon: Icon, label }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all",
                    isActive 
                      ? "bg-white/10 text-white border-l-2 border-bullish" 
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                  data-testid={`nav-${label}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t(label)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-crypto-border">
          <div className="text-xs text-zinc-500 text-center">
            CryptoRadar v1.0
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
