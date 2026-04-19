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
  BookOpen,
  X,
  BarChart3,
  FlaskConical,
  Lock,
  TrendingUp,
  Crosshair,
  BookMarked,
  PieChart,
  GraduationCap
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAccess } from '../contexts/AccessContext';
import { cn } from '../lib/utils';

// PUBLIC items - visible to everyone (OPERATIONAL)
const publicNavItems = [
  { path: '/', icon: LayoutDashboard, label: 'dashboard' },
  { path: '/support-resistance', icon: Activity, label: 'supportResistance' },
  { path: '/whale-alerts', icon: Zap, label: 'whaleAlerts' },
  { path: '/liquidity', icon: Waves, label: 'liquidity' },
  { path: '/news', icon: Newspaper, label: 'news' },
  { path: '/manual', icon: BookOpen, label: 'manual' },
];

// EDUCATIONAL items - Learning Zone (ISOLATED from signal generation)
const educationalNavItems = [
  { path: '/patterns', icon: Search, label: 'patterns' },
  { path: '/candlesticks', icon: CandlestickChart, label: 'candlesticks' },
  { path: '/elliott-waves', icon: TrendingUp, label: 'elliottWaves' },
];

// ADMIN-ONLY items - require authentication
const adminNavItems = [
  { path: '/v3-hunter', icon: Crosshair, label: 'v3Hunter' },
  { path: '/signal-journal', icon: BookMarked, label: 'signalJournal' },
  { path: '/analytics-hub', icon: PieChart, label: 'analyticsHub' },
  { path: '/strategy-lab', icon: FlaskConical, label: 'strategyLab' },
  { path: '/alerts', icon: Bell, label: 'alerts' },
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
          "fixed md:static top-0 left-0 h-full z-50 w-64 glass-sidebar flex flex-col transition-transform duration-300",
          "md:transform-none",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        data-testid="sidebar"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-bullish/20 rounded-lg flex items-center justify-center shadow-neon-bullish">
              <Activity className="w-5 h-5 text-bullish drop-shadow-glow-bullish" />
            </div>
            <span className="font-heading font-bold text-xl tracking-tight text-white">CryptoRadar</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 hover:bg-white/5 rounded-lg transition-colors"
            data-testid="sidebar-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {/* PUBLIC navigation items (OPERATIONAL) */}
          <ul className="space-y-1 px-3">
            {publicNavItems.map(({ path, icon: Icon, label }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                    isActive 
                      ? "bg-bullish/10 text-bullish border-l-2 border-bullish shadow-neon-bullish" 
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  )}
                  data-testid={`nav-${label}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{t(label)}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          {/* LEARNING ZONE - Educational modules (ISOLATED from signal generation) */}
          <div className="mt-4 pt-4 border-t border-crypto-border/30">
            <div className="px-3 mb-2 flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] uppercase tracking-wider font-bold text-purple-400">
                Learning Zone
              </span>
            </div>
            <ul className="space-y-1 px-3">
              {educationalNavItems.map(({ path, icon: Icon, label }) => (
                <li key={path}>
                  <NavLink
                    to={path}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                      isActive 
                        ? "bg-purple-500/10 text-purple-400 border-l-2 border-purple-500" 
                        : "text-zinc-500 hover:text-purple-400 hover:bg-purple-500/5"
                    )}
                    data-testid={`nav-${label}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t(label)}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* ADMIN navigation items - shown but locked for non-admin */}
          <AdminNavSection />
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <div className="text-xs text-zinc-500 text-center font-mono">
            CryptoRadar v3.6.2
          </div>
        </div>
      </aside>
    </>
  );
}

// Separate component to use useAccess hook
function AdminNavSection() {
  const { t, setSidebarOpen } = useApp();
  const { isAdmin } = useAccess();

  return (
    <div className="mt-4 pt-4 border-t border-crypto-border/50">
      <div className="px-3 mb-2 flex items-center gap-2">
        <Lock className={cn("w-3 h-3", isAdmin ? "text-amber-400" : "text-zinc-600")} />
        <span className={cn("text-[10px] uppercase tracking-wider font-bold", isAdmin ? "text-amber-400" : "text-zinc-600")}>
          {isAdmin ? "Admin" : "Admin Only"}
        </span>
      </div>
      <ul className="space-y-1 px-2">
        {adminNavItems.map(({ path, icon: Icon, label }) => (
          <li key={path}>
            <NavLink
              to={path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all",
                isAdmin
                  ? isActive 
                    ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500" 
                    : "text-zinc-400 hover:text-amber-400 hover:bg-amber-500/5"
                  : "text-zinc-600 cursor-not-allowed opacity-50"
              )}
              data-testid={`nav-${label}`}
            >
              <Icon className="w-4 h-4" />
              <span>{t(label)}</span>
              {!isAdmin && <Lock className="w-3 h-3 ml-auto text-zinc-600" />}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Sidebar;
