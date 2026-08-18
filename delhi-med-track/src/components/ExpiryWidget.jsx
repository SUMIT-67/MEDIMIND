import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  AlertTriangle,
  Flame,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  Building,
  Sparkles,
  ArrowRight,
  Filter,
  Search,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

export const ExpiryWidget = ({ onNavigateTab }) => {
  const { hospitals, inventory, expiryAnalysis, logStockMovement, selectedHospitalId } = useInventory();

  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'CRITICAL' | 'WARNING' | 'EXPIRED'
  const [searchTerm, setSearchTerm] = useState('');

  // Enriched items from analysis
  const allRiskItems = useMemo(() => {
    let items = [];
    if (activeFilter === 'ALL' || activeFilter === 'EXPIRED') items.push(...expiryAnalysis.expired);
    if (activeFilter === 'ALL' || activeFilter === 'CRITICAL') items.push(...expiryAnalysis.critical);
    if (activeFilter === 'ALL' || activeFilter === 'WARNING') items.push(...expiryAnalysis.warning);

    if (selectedHospitalId !== 'ALL') {
      items = items.filter((i) => i.hospital_id === selectedHospitalId);
    }

    if (searchTerm.trim()) {
      items = items.filter(
        (i) =>
          i.drug_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.hospital_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return items;
  }, [expiryAnalysis, activeFilter, selectedHospitalId, searchTerm]);

  // Handle quick disposal
  const handleDispose = async (item) => {
    if (
      !window.confirm(
        `Are you sure you want to write off batch ${item.batch_number} (${item.quantity} ${item.drug_unit}) as Biomedical Expiry Waste?`
      )
    ) {
      return;
    }

    await logStockMovement({
      hospitalId: item.hospital_id,
      drugId: item.drug_id,
      batchNumber: item.batch_number,
      movementType: 'OUT',
      quantity: item.quantity,
      reason: 'EXPIRY_DISPOSAL',
      referenceId: `BIO-WASTE-${Date.now().toString().slice(-4)}`,
      loggedBy: 'BioMed Waste Inspector',
      notes: 'Authorized disposal of expired/degraded pharmaceutical stock',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-delhi-navy to-delhi-blue text-white p-5 rounded-2xl shadow-gov flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-rose-500/20 text-rose-300 border border-rose-400/30">
              WASTAGE PRE-EMPTION
            </span>
            <span className="text-xs text-sky-200">First-Expiry-First-Out (FEFO) Monitoring</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold mt-1">
            Drug Expiry Surveillance & Wastage Prevention
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Identify batches requiring immediate fast-track consumption or authorized bio-medical quarantine
          </p>
        </div>

        {expiryAnalysis.critical.length > 0 && (
          <button
            onClick={() => onNavigateTab('transfer-engine')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition self-start sm:self-auto"
          >
            <Sparkles className="w-4 h-4 text-slate-950" />
            <span>Rebalance Near-Expiry Batches</span>
          </button>
        )}
      </div>

      {/* Expiry Risk Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Expired */}
        <div
          onClick={() => setActiveFilter('EXPIRED')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeFilter === 'EXPIRED'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
              : 'bg-white text-slate-800 border-slate-200/80 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-500">
              Expired (Quarantine)
            </span>
            <Flame className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-display mt-2">
            {expiryAnalysis.summary.expiredUnits.toLocaleString()} units
          </div>
          <span className="text-[11px] opacity-75">{expiryAnalysis.summary.expiredCount} batches past expiry</span>
        </div>

        {/* Critical < 30 Days */}
        <div
          onClick={() => setActiveFilter('CRITICAL')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeFilter === 'CRITICAL'
              ? 'bg-rose-900 text-white border-rose-900 shadow-md'
              : 'bg-white text-slate-800 border-slate-200/80 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
              Critical (&lt; 30 Days)
            </span>
            <AlertTriangle className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-2xl font-bold font-display mt-2 text-rose-600">
            {expiryAnalysis.summary.criticalUnits.toLocaleString()} units
          </div>
          <span className="text-[11px] opacity-75">{expiryAnalysis.summary.criticalCount} batches expiring immediately</span>
        </div>

        {/* Warning 30-90 Days */}
        <div
          onClick={() => setActiveFilter('WARNING')}
          className={`p-4 rounded-2xl border transition cursor-pointer ${
            activeFilter === 'WARNING'
              ? 'bg-amber-900 text-white border-amber-900 shadow-md'
              : 'bg-white text-slate-800 border-slate-200/80 hover:shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Warning (30-90 Days)
            </span>
            <CalendarClock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-display mt-2 text-amber-600">
            {expiryAnalysis.summary.warningUnits.toLocaleString()} units
          </div>
          <span className="text-[11px] opacity-75">{expiryAnalysis.summary.warningCount} batches needing priority FEFO</span>
        </div>
      </div>

      {/* Risk Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Table Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-800 font-display">
              Vulnerable Stock Batches
            </h3>
            <span className="text-xs text-slate-400">({allRiskItems.length} items flagged)</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter risk batches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="EXPIRED">Expired Batches</option>
              <option value="CRITICAL">Critical (&lt; 30 Days)</option>
              <option value="WARNING">Warning (30-90 Days)</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Hospital Location</th>
                <th className="px-4 py-3">Medication Name</th>
                <th className="px-4 py-3">Batch Number</th>
                <th className="px-4 py-3 text-right">Remaining Stock</th>
                <th className="px-4 py-3">Expiry Date</th>
                <th className="px-4 py-3 text-center">Days Left</th>
                <th className="px-4 py-3">Recommended Protocol</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allRiskItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400 text-xs">
                    No items in this risk category. All stock batches have healthy shelf life!
                  </td>
                </tr>
              ) : (
                allRiskItems.map((item) => {
                  const isExpired = item.daysToExpiry <= 0;
                  const isCritical = item.daysToExpiry > 0 && item.daysToExpiry <= 30;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{item.hospital_name}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">{item.drug_name}</span>
                        <div className="text-[10px] text-slate-400 font-mono">{item.drug_code}</div>
                      </td>

                      <td className="px-4 py-3 font-mono font-medium text-slate-700">
                        {item.batch_number}
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-slate-800 font-display">
                        {Number(item.quantity).toLocaleString()}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">{item.drug_unit.split(' ')[0]}</span>
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                        {item.expiry_date}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isExpired
                              ? 'bg-slate-900 text-white'
                              : isCritical
                              ? 'bg-rose-100 text-rose-800 animate-pulse font-extrabold'
                              : 'bg-amber-100 text-amber-800 font-semibold'
                          }`}
                        >
                          {isExpired ? 'EXPIRED' : `${item.daysToExpiry} days`}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-[11px]">
                        {isExpired ? (
                          <span className="text-slate-900 font-semibold">Immediate Bio-Waste Quarantine</span>
                        ) : isCritical ? (
                          <span className="text-rose-700 font-semibold">Fast-Track OPD Dispensing (FEFO)</span>
                        ) : (
                          <span className="text-amber-700 font-medium">Prioritize before newer batches</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {isExpired ? (
                          <button
                            onClick={() => handleDispose(item)}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold transition flex items-center gap-1 mx-auto"
                            title="Log biomedical disposal"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Log Disposal</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onNavigateTab('stock-entry')}
                            className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-[10px] font-semibold transition"
                          >
                            Dispense
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
