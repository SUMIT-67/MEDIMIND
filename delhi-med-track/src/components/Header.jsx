import React from 'react';
import {
  Building2,
  Database,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Info,
  Layers,
  Code2,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

export const Header = ({ onOpenSqlModal }) => {
  const {
    hospitals,
    isLiveSupabase,
    lastSyncTime,
    selectedHospitalId,
    setSelectedHospitalId,
    resetToSeedData,
    fetchSupabaseData,
    notification,
    isLoading,
  } = useInventory();

  return (
    <header className="bg-delhi-navy text-white sticky top-0 z-40 shadow-gov-lg border-b border-delhi-blue/40">
      {/* Top Govt Bar */}
      <div className="bg-delhi-slate/90 px-4 py-1 text-xs text-slate-300 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Health & Family Welfare Department | Govt. of NCT of Delhi
          </span>
          <span className="hidden md:inline text-slate-400">|</span>
          <span className="hidden md:inline text-slate-400 text-[11px]">
            Smart India Hackathon (SIH1627) - Drug Inventory & Supply Chain Tracking System
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10">
            <span className="text-slate-300">Sync:</span>
            <span className="font-mono text-slate-200">
              {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-medium ${
              isLiveSupabase
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                : 'bg-amber-950/70 border-amber-500/50 text-amber-300'
            }`}
          >
            <Database className="w-3 h-3" />
            <span>{isLiveSupabase ? 'Supabase Realtime Live' : 'Interactive Demo Mode'}</span>
          </div>
        </div>
      </div>

      {/* Main App Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand & Emblem */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-delhi-sky to-delhi-blue flex items-center justify-center shadow-md border border-white/20 text-white font-black text-xl tracking-tighter">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight text-white">
                Delhi <span className="text-sky-400">MedTrack</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/30 rounded-full">
                SIH1627
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Centralized Drug Inventory & Inter-Hospital Supply Chain Rebalancing
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Hospital Scope Selector */}
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs">
            <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-slate-300 font-medium hidden sm:inline">Scope:</span>
            <select
              value={selectedHospitalId}
              onChange={(e) => setSelectedHospitalId(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none focus:ring-0 cursor-pointer pr-2 text-xs"
            >
              <option value="ALL" className="bg-slate-900 text-white">
                All Delhi Hospitals (Consolidated NCT)
              </option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id} className="bg-slate-900 text-white">
                  {h.name} ({h.district})
                </option>
              ))}
            </select>
          </div>

          {/* Reset Demo Data */}
          <button
            onClick={resetToSeedData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
            title="Reset to Initial Delhi NCT Seed Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-slide-up max-w-md">
          <div
            className={`p-4 rounded-xl shadow-2xl border flex items-start gap-3 backdrop-blur-md ${
              notification.type === 'error'
                ? 'bg-rose-950/90 text-rose-100 border-rose-500/50'
                : notification.type === 'warning'
                ? 'bg-amber-950/90 text-amber-100 border-amber-500/50'
                : notification.type === 'info'
                ? 'bg-sky-950/90 text-sky-100 border-sky-500/50'
                : 'bg-emerald-950/90 text-emerald-100 border-emerald-500/50'
            }`}
          >
            {notification.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : notification.type === 'info' ? (
              <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs leading-relaxed font-medium">{notification.message}</div>
          </div>
        </div>
      )}
    </header>
  );
};
