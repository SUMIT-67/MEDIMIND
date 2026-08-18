import React, { useState } from 'react';
import { InventoryProvider } from './context/InventoryContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { StockEntry } from './components/StockEntry';
import { TransferEngineView } from './components/TransferEngineView';
import { ExpiryWidget } from './components/ExpiryWidget';
import { MovementsLog } from './components/MovementsLog';
import { SqlViewerModal } from './components/SqlViewerModal';
import { Building2, ShieldCheck, HeartPulse } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Top Header */}
      <Header onOpenSqlModal={() => setIsSqlModalOpen(true)} />

      {/* Main Tab Navigation */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && <Dashboard onNavigateTab={setActiveTab} />}
        {activeTab === 'stock-entry' && <StockEntry onMovementLogged={() => setActiveTab('movements')} />}
        {activeTab === 'transfer-engine' && <TransferEngineView />}
        {activeTab === 'expiry-view' && <ExpiryWidget onNavigateTab={setActiveTab} />}
        {activeTab === 'movements' && <MovementsLog />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span className="font-semibold text-slate-700">
              Drug Inventory & Supply Chain Tracking System (SIH1627)
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Health & Family Welfare Department, Govt. of NCT of Delhi</span>
            <span>•</span>
            <span className="text-slate-400">Smart India Hackathon</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <InventoryProvider>
      <AppContent />
    </InventoryProvider>
  );
}
