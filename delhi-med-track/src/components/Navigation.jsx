import React from 'react';
import {
  LayoutDashboard,
  ScanBarcode,
  ArrowRightLeft,
  CalendarClock,
  History,
  Database,
  Sparkles,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

export const Navigation = ({ activeTab, setActiveTab }) => {
  const { transferSuggestions, expiryAnalysis, transfers } = useInventory();

  // Pending actionable transfer suggestions
  const pendingSuggestionsCount = transferSuggestions.length;
  const inTransitCount = transfers.filter((t) => t.status === 'IN_TRANSIT').length;
  const criticalExpiryCount = expiryAnalysis.summary.criticalCount + expiryAnalysis.summary.expiredCount;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Live Stock Dashboard',
      shortLabel: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'stock-entry',
      label: 'Stock-Entry & Barcode Scanner',
      shortLabel: 'Stock Entry',
      icon: ScanBarcode,
      badge: null,
    },
    {
      id: 'transfer-engine',
      label: 'Transfer Suggestion Engine',
      shortLabel: 'Transfer Engine',
      icon: ArrowRightLeft,
      badge: pendingSuggestionsCount > 0 ? pendingSuggestionsCount : inTransitCount > 0 ? `${inTransitCount} active` : null,
      badgeColor: pendingSuggestionsCount > 0 ? 'bg-amber-500 text-white' : 'bg-sky-500 text-white',
    },
    {
      id: 'expiry-view',
      label: 'Expiry & Wastage View',
      shortLabel: 'Expiry Alerts',
      icon: CalendarClock,
      badge: criticalExpiryCount > 0 ? criticalExpiryCount : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'movements',
      label: 'Stock Movements Ledger',
      shortLabel: 'Audit Log',
      icon: History,
      badge: null,
    },
  ];

  return (
    <div className="bg-white border-b border-slate-200 sticky top-[92px] sm:top-[76px] z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2.5 scrollbar-none" aria-label="Tabs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-delhi-navy text-white shadow-md shadow-delhi-navy/20'
                    : 'text-slate-600 hover:text-delhi-navy hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-300' : 'text-slate-400'}`} />
                <span className="hidden md:inline">{item.label}</span>
                <span className="md:hidden">{item.shortLabel}</span>

                {item.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                      item.badgeColor || 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
