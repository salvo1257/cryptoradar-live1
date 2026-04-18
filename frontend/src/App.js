import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import { AccessProvider, useAccess } from "./contexts/AccessContext";
import { AnchoredPatternsProvider } from "./contexts/AnchoredPatternsContext";
import { Toaster } from "./components/ui/sonner";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import {
  DashboardPage,
  SupportResistancePage,
  WhaleAlertsPage,
  LiquidityPage,
  PatternsPage,
  CandlesticksPage,
  ElliottWavesPage,
  NewsPage,
  AlertsPage,
  AlertHistoryPage,
  NotesPage,
  SettingsPage,
  BacktestPage,
} from "./components/pages";
import ManualPage from "./components/pages/ManualPage";
import ReliabilityAnalyticsPage from "./components/pages/ReliabilityAnalyticsPage";

// Protected route wrapper - redirects to dashboard if not admin
function AdminRoute({ children }) {
  const { isAdmin, isVerifying } = useAccess();
  
  if (isVerifying) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <div className="p-4 bg-amber-500/10 rounded-full mb-4">
          <svg className="w-12 h-12 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Admin Access Required</h2>
        <p className="text-zinc-400 max-w-md">
          This section requires admin privileges. Click the Admin button in the top bar to unlock.
        </p>
      </div>
    );
  }
  
  return children;
}

function AppLayout({ children }) {
  return (
    <div className="flex h-screen bg-crypto-bg overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AccessProvider>
      <AppProvider>
        <AnchoredPatternsProvider>
          <BrowserRouter>
            <AppLayout>
              <Routes>
                {/* PUBLIC ROUTES */}
                <Route path="/" element={<DashboardPage />} />
              <Route path="/support-resistance" element={<SupportResistancePage />} />
              <Route path="/whale-alerts" element={<WhaleAlertsPage />} />
              <Route path="/liquidity" element={<LiquidityPage />} />
              <Route path="/patterns" element={<PatternsPage />} />
              <Route path="/candlesticks" element={<CandlesticksPage />} />
              <Route path="/elliott-waves" element={<ElliottWavesPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/manual" element={<ManualPage />} />
              
              {/* ADMIN-ONLY ROUTES */}
              <Route path="/alerts" element={<AdminRoute><AlertsPage /></AdminRoute>} />
              <Route path="/alert-history" element={<AdminRoute><AlertHistoryPage /></AdminRoute>} />
              <Route path="/backtest" element={<AdminRoute><BacktestPage /></AdminRoute>} />
              <Route path="/reliability" element={<AdminRoute><ReliabilityAnalyticsPage /></AdminRoute>} />
              <Route path="/notes" element={<AdminRoute><NotesPage /></AdminRoute>} />
              <Route path="/settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
            </Routes>
          </AppLayout>
          <Toaster position="top-right" richColors />
        </BrowserRouter>
        </AnchoredPatternsProvider>
      </AppProvider>
    </AccessProvider>
  );
}

export default App;
