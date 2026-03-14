import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
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
  NewsPage,
  AlertsPage,
  AlertHistoryPage,
  NotesPage,
  SettingsPage,
} from "./components/pages";
import ManualPage from "./components/pages/ManualPage";

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
    <AppProvider>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/support-resistance" element={<SupportResistancePage />} />
            <Route path="/whale-alerts" element={<WhaleAlertsPage />} />
            <Route path="/liquidity" element={<LiquidityPage />} />
            <Route path="/patterns" element={<PatternsPage />} />
            <Route path="/candlesticks" element={<CandlesticksPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/alert-history" element={<AlertHistoryPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/manual" element={<ManualPage />} />
          </Routes>
        </AppLayout>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
