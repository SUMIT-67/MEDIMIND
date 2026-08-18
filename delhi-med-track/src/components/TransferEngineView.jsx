import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Sparkles,
  Building,
  ArrowRight,
  CheckCircle2,
  Clock,
  Truck,
  AlertTriangle,
  XCircle,
  PlusCircle,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useInventory } from '../context/InventoryContext';

export const TransferEngineView = () => {
  const {
    hospitals,
    drugs,
    inventory,
    transfers,
    transferSuggestions,
    approveTransfer,
    dispatchTransfer,
    completeTransfer,
    rejectTransfer,
    createManualTransfer,
  } = useInventory();

  const [activeSubTab, setActiveSubTab] = useState('SUGGESTIONS'); // 'SUGGESTIONS' | 'ACTIVE_PIPELINE' | 'HISTORY'
  const [showManualModal, setShowManualModal] = useState(false);

  // Manual Transfer Form State
  const [fromHospitalId, setFromHospitalId] = useState(hospitals[0]?.id || '');
  const [toHospitalId, setToHospitalId] = useState(hospitals[1]?.id || '');
  const [manualDrugId, setManualDrugId] = useState(drugs[0]?.id || '');
  const [manualQty, setManualQty] = useState('200');
  const [manualUrgency, setManualUrgency] = useState('HIGH');
  const [manualNotes, setManualNotes] = useState('');

  // Filter transfers by status
  const activePipelineTransfers = transfers.filter(
    (t) => t.status === 'APPROVED' || t.status === 'IN_TRANSIT'
  );
  const completedTransfers = transfers.filter(
    (t) => t.status === 'COMPLETED' || t.status === 'REJECTED'
  );

  const handleApprove = async (suggestion) => {
    // If suggestion is in transferSuggestions list, we first create it as APPROVED transfer in context
    const created = await createManualTransfer({
      fromHospitalId: suggestion.from_hospital_id,
      toHospitalId: suggestion.to_hospital_id,
      drugId: suggestion.drug_id,
      batchNumber: suggestion.batch_number,
      quantity: suggestion.quantity,
      urgency: suggestion.urgency,
      notes: suggestion.notes,
    });

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.85 },
      });
    } catch (e) {}
  };

  const handleComplete = async (transferId) => {
    await completeTransfer(transferId);
    try {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.7 },
      });
    } catch (e) {}
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-delhi-navy to-delhi-blue text-white p-5 rounded-2xl shadow-gov flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
              ALGORITHMIC ENGINE
            </span>
            <span className="text-xs text-sky-200">Surplus-to-Deficit Optimization Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold mt-1">
            Smart Inter-Hospital Transfer Engine
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Automated rebalancing rule: Matches stock &lt; Min Threshold with donor hospitals possessing &gt; 2x Min Threshold
          </p>
        </div>

        <button
          onClick={() => setShowManualModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4 text-sky-400" />
          <span>Manual Requisition</span>
        </button>
      </div>

      {/* Algorithmic Logic Explanation Card */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-sm text-sky-300 font-display">
              Transfer Decision Formula (SIH1627 Supply Chain Model)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-slate-300 text-[11px]">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <span className="font-bold text-rose-400 block mb-1">1. Deficit Detection</span>
                If hospital stock $S_h &lt; T_{'{min}'}$, hospital is flagged for emergency supply.
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <span className="font-bold text-emerald-400 block mb-1">2. Surplus Donor Match</span>
                Hospitals with $S_{'{donor}'} &gt; 2 \times T_{'{min}'}$ are qualified as donors without compromising local safety.
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <span className="font-bold text-amber-400 block mb-1">3. FEFO Safe Allocation</span>
                Allocates batches via First-Expiry-First-Out with shelf-life &gt; 60 days to prevent drug wastage.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtabs: Suggestions vs Active Pipeline vs History */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveSubTab('SUGGESTIONS')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeSubTab === 'SUGGESTIONS'
              ? 'border-delhi-navy text-delhi-navy'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>AI Suggestions</span>
          {transferSuggestions.length > 0 && (
            <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-800 rounded-full font-extrabold">
              {transferSuggestions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('ACTIVE_PIPELINE')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeSubTab === 'ACTIVE_PIPELINE'
              ? 'border-delhi-navy text-delhi-navy'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Truck className="w-4 h-4 text-sky-600" />
          <span>Active Pipeline</span>
          {activePipelineTransfers.length > 0 && (
            <span className="px-2 py-0.5 text-[10px] bg-sky-100 text-sky-800 rounded-full font-extrabold">
              {activePipelineTransfers.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('HISTORY')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition ${
            activeSubTab === 'HISTORY'
              ? 'border-delhi-navy text-delhi-navy'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Completed & Logs ({completedTransfers.length})</span>
        </button>
      </div>

      {/* View 1: AI Transfer Suggestions Grid */}
      {activeSubTab === 'SUGGESTIONS' && (
        <div className="space-y-4">
          {transferSuggestions.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 font-display">
                All Delhi NCT Hospitals Well-Stocked
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No hospitals currently meet the deficit condition (&lt; min_threshold) requiring inter-hospital rebalancing.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {transferSuggestions.map((sug) => (
                <div
                  key={sug.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  {/* Card Header: Drug & Urgency */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 font-display">
                          {sug.drug_name}
                        </span>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {sug.drug_code}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 mt-0.5 block">
                        Batch: <strong className="font-mono text-slate-700">{sug.batch_number}</strong> (Exp: {sug.batch_expiry})
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        sug.urgency === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                          : sug.urgency === 'HIGH'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-sky-100 text-sky-800 border border-sky-200'
                      }`}
                    >
                      {sug.urgency} DEFICIT
                    </span>
                  </div>

                  {/* Inter-Hospital Visual Bridge */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                    {/* Donor */}
                    <div className="flex-1">
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>SURPLUS SOURCE</span>
                      </div>
                      <div className="font-bold text-slate-800 truncate mt-0.5">{sug.from_hospital_name}</div>
                      <div className="text-[10px] text-slate-400">{sug.from_hospital_district}</div>
                    </div>

                    {/* Transfer Quantity Arrow */}
                    <div className="flex flex-col items-center px-3 shrink-0">
                      <span className="font-extrabold text-sm text-delhi-navy font-display">
                        {sug.quantity} {sug.drug_unit.split(' ')[0]}
                      </span>
                      <ArrowRight className="w-4 h-4 text-sky-600 my-0.5" />
                      <span className="text-[9px] text-slate-400 font-medium">Safe Transfer</span>
                    </div>

                    {/* Recipient */}
                    <div className="flex-1 text-right">
                      <div className="flex items-center justify-end gap-1 text-[11px] font-semibold text-rose-700">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>DEFICIT TARGET</span>
                      </div>
                      <div className="font-bold text-slate-800 truncate mt-0.5">{sug.to_hospital_name}</div>
                      <div className="text-[10px] text-slate-400">{sug.to_hospital_district}</div>
                    </div>
                  </div>

                  {/* Notes / Rationale */}
                  <p className="text-[11px] text-slate-600 bg-amber-50/60 p-2.5 rounded-lg border border-amber-100/80">
                    {sug.notes}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleApprove(sug)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve & Authorize Transfer</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View 2: Active Pipeline (Approved & In-Transit) */}
      {activeSubTab === 'ACTIVE_PIPELINE' && (
        <div className="space-y-4">
          {activePipelineTransfers.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
              <Truck className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No Active Transfers in Transit</h3>
              <p className="text-xs text-slate-400">
                Approve an AI recommendation from the Suggestions tab or create a manual transfer requisition.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activePipelineTransfers.map((trf) => {
                const drug = drugs.find((d) => d.id === trf.drug_id);
                const fromHosp = hospitals.find((h) => h.id === trf.from_hospital_id);
                const toHosp = hospitals.find((h) => h.id === trf.to_hospital_id);

                return (
                  <div
                    key={trf.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{drug?.name || 'Medication'}</div>
                        <div className="text-xs text-slate-500">
                          Batch: <span className="font-mono text-slate-700 font-semibold">{trf.batch_number}</span> • Qty:{' '}
                          <span className="font-bold text-delhi-navy">{trf.quantity} {drug?.unit || 'Units'}</span>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          trf.status === 'IN_TRANSIT'
                            ? 'bg-sky-100 text-sky-800 border border-sky-200 animate-pulse'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {trf.status === 'IN_TRANSIT' ? '🚚 IN TRANSIT' : '📝 APPROVED (PENDING DISPATCH)'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                      <div className="text-slate-600">
                        <strong>From:</strong> {fromHosp?.name}
                      </div>
                      <div className="text-slate-600">
                        <strong>To:</strong> {toHosp?.name}
                      </div>
                      {trf.approved_by && (
                        <div className="text-[11px] text-slate-500 pt-1">
                          Authorized by: {trf.approved_by}
                        </div>
                      )}
                    </div>

                    {/* Action buttons depending on pipeline phase */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      {trf.status === 'APPROVED' ? (
                        <button
                          onClick={() => dispatchTransfer(trf.id)}
                          className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Dispatch Stock (Mark In-Transit)</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleComplete(trf.id)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm Delivery & Restock</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* View 3: Completed & History Logs */}
      {activeSubTab === 'HISTORY' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Inter-Hospital Rebalancing History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase">
                <tr>
                  <th className="px-4 py-3">Transfer ID</th>
                  <th className="px-4 py-3">Drug / Batch</th>
                  <th className="px-4 py-3">From (Donor)</th>
                  <th className="px-4 py-3">To (Recipient)</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {completedTransfers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-6 text-center text-slate-400 text-xs">
                      No completed transfer logs yet.
                    </td>
                  </tr>
                ) : (
                  completedTransfers.map((trf) => {
                    const drug = drugs.find((d) => d.id === trf.drug_id);
                    const fromHosp = hospitals.find((h) => h.id === trf.from_hospital_id);
                    const toHosp = hospitals.find((h) => h.id === trf.to_hospital_id);

                    return (
                      <tr key={trf.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                          #{trf.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {drug?.name}
                          <div className="text-[10px] font-mono text-slate-400">{trf.batch_number}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{fromHosp?.name}</td>
                        <td className="px-4 py-3 text-slate-700">{toHosp?.name}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800 font-display">
                          {trf.quantity}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              trf.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {trf.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-500 font-mono">
                          {new Date(trf.updated_at || trf.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Requisition Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-slide-up space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-800 font-display">
                Create Emergency Transfer Requisition
              </h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Source Hospital (Donor) *</label>
                <select
                  value={fromHospitalId}
                  onChange={(e) => setFromHospitalId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Destination Hospital (Deficit) *</label>
                <select
                  value={toHospitalId}
                  onChange={(e) => setToHospitalId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Medication *</label>
                <select
                  value={manualDrugId}
                  onChange={(e) => setManualDrugId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {drugs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={manualQty}
                    onChange={(e) => setManualQty(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Urgency Priority</label>
                  <select
                    value={manualUrgency}
                    onChange={(e) => setManualUrgency(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clinical Authorization Rationale</label>
                <textarea
                  rows="2"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="e.g. Special emergency ward quota requisition"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (fromHospitalId === toHospitalId) {
                    alert('Source and destination hospital cannot be identical.');
                    return;
                  }
                  await createManualTransfer({
                    fromHospitalId,
                    toHospitalId,
                    drugId: manualDrugId,
                    quantity: manualQty,
                    urgency: manualUrgency,
                    notes: manualNotes,
                  });
                  setShowManualModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-delhi-navy hover:bg-delhi-blue text-white font-bold text-xs shadow-md"
              >
                Create Requisition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
