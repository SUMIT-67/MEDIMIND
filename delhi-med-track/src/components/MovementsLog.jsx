import React, { useState, useMemo } from 'react';
import {
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Filter,
  Download,
  Building,
  Calendar,
  User,
  FileText,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

export const MovementsLog = () => {
  const { movements, hospitals, drugs, selectedHospitalId } = useInventory();

  const [searchTerm, setSearchTerm] = useState('');
  const [movementFilter, setMovementFilter] = useState('ALL'); // 'ALL' | 'IN' | 'OUT'
  const [reasonFilter, setReasonFilter] = useState('ALL');

  // Enriched movement records
  const enrichedMovements = useMemo(() => {
    return movements
      .map((mov) => {
        const drug = drugs.find((d) => d.id === mov.drug_id);
        const hospital = hospitals.find((h) => h.id === mov.hospital_id);

        return {
          ...mov,
          drugName: drug?.name || 'Unknown Drug',
          drugCode: drug?.code || 'N/A',
          drugUnit: drug?.unit || 'Units',
          hospitalName: hospital?.name || 'Unknown Facility',
          hospitalDistrict: hospital?.district || 'Delhi NCT',
        };
      })
      .filter((mov) => {
        if (selectedHospitalId !== 'ALL' && mov.hospital_id !== selectedHospitalId) {
          return false;
        }

        if (movementFilter !== 'ALL' && mov.movement_type !== movementFilter) {
          return false;
        }

        if (reasonFilter !== 'ALL' && mov.reason !== reasonFilter) {
          return false;
        }

        if (searchTerm.trim()) {
          const s = searchTerm.toLowerCase();
          const match =
            mov.drugName.toLowerCase().includes(s) ||
            mov.batch_number.toLowerCase().includes(s) ||
            mov.hospitalName.toLowerCase().includes(s) ||
            (mov.reference_id && mov.reference_id.toLowerCase().includes(s)) ||
            (mov.logged_by && mov.logged_by.toLowerCase().includes(s));
          if (!match) return false;
        }

        return true;
      });
  }, [movements, hospitals, drugs, selectedHospitalId, movementFilter, reasonFilter, searchTerm]);

  // Export to CSV handler
  const handleExportCsv = () => {
    if (enrichedMovements.length === 0) return;

    const headers = [
      'Timestamp',
      'Transaction ID',
      'Hospital',
      'District',
      'Drug Name',
      'Drug Code',
      'Batch Number',
      'Type',
      'Quantity',
      'Unit',
      'Reason',
      'Reference ID',
      'Logged By',
      'Notes',
    ];

    const rows = enrichedMovements.map((m) => [
      `"${new Date(m.created_at).toLocaleString()}"`,
      `"${m.id}"`,
      `"${m.hospitalName}"`,
      `"${m.hospitalDistrict}"`,
      `"${m.drugName}"`,
      `"${m.drugCode}"`,
      `"${m.batch_number}"`,
      `"${m.movement_type}"`,
      m.quantity,
      `"${m.drugUnit}"`,
      `"${m.reason}"`,
      `"${m.reference_id || ''}"`,
      `"${m.logged_by || ''}"`,
      `"${(m.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Delhi_MedTrack_Audit_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-delhi-navy to-delhi-blue text-white p-5 rounded-2xl shadow-gov flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-white/10 text-sky-200 border border-white/20">
              AUDIT TRAIL
            </span>
            <span className="text-xs text-sky-200">Immutable Drug Movement Ledger</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold mt-1">
            Real-Time Stock Movements Ledger
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Full compliance traceability for central procurement, patient dispensing, and inter-hospital shipments
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-sky-300" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Movements Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Table Filter Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-800 font-display">
              Transaction Log
            </h3>
            <span className="text-xs text-slate-400">({enrichedMovements.length} logged entries)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reference, batch, staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 w-48 sm:w-56"
              />
            </div>

            {/* Movement Type Filter */}
            <select
              value={movementFilter}
              onChange={(e) => setMovementFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Types (IN & OUT)</option>
              <option value="IN">Stock IN (Procurement / Transfer In)</option>
              <option value="OUT">Stock OUT (Dispense / Waste / Issue)</option>
            </select>

            {/* Reason Filter */}
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Reasons</option>
              <option value="PROCUREMENT">Procurement (DHS)</option>
              <option value="PATIENT_DISPENSE">Patient Dispense</option>
              <option value="TRANSFER_IN">Transfer In</option>
              <option value="TRANSFER_OUT">Transfer Out</option>
              <option value="EXPIRY_DISPOSAL">Expiry Disposal</option>
              <option value="WARD_DISTRIBUTION">Ward Distribution</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Hospital Facility</th>
                <th className="px-4 py-3">Medication & Batch</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3">Reason / Ref ID</th>
                <th className="px-4 py-3">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enrichedMovements.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-400 text-xs">
                    No transactions match your search/filter criteria.
                  </td>
                </tr>
              ) : (
                enrichedMovements.map((mov) => {
                  const isStockIn = mov.movement_type === 'IN';

                  return (
                    <tr key={mov.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(mov.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isStockIn
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {isStockIn ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          <span>{isStockIn ? 'STOCK IN' : 'STOCK OUT'}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{mov.hospitalName}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">{mov.drugName}</span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Batch: <span className="text-slate-600 font-medium">{mov.batch_number}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-bold font-display ${
                            isStockIn ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isStockIn ? '+' : '-'}
                          {Number(mov.quantity).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">{mov.drugUnit.split(' ')[0]}</span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700">{mov.reason.replace(/_/g, ' ')}</div>
                        {mov.reference_id && (
                          <div className="text-[10px] font-mono text-slate-400">{mov.reference_id}</div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-600 text-[11px]">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{mov.logged_by || 'Officer'}</span>
                        </div>
                        {mov.notes && (
                          <span className="text-[10px] text-slate-400 italic block truncate max-w-[160px]" title={mov.notes}>
                            {mov.notes}
                          </span>
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
