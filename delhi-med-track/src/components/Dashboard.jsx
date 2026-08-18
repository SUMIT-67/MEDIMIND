import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Package,
  AlertTriangle,
  ArrowRightLeft,
  CalendarClock,
  Search,
  Filter,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Building,
  Sparkles,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { SupplyChain3DModel } from './SupplyChain3DModel';

export const Dashboard = ({ onNavigateTab }) => {
  const {
    hospitals,
    drugs,
    inventory,
    transfers,
    selectedHospitalId,
    setSelectedHospitalId,
    transferSuggestions,
    expiryAnalysis,
  } = useInventory();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedChartDrugId, setSelectedChartDrugId] = useState('ALL');

  // Filtered inventory based on selected hospital scope and table filters
  const scopedInventory = useMemo(() => {
    if (selectedHospitalId === 'ALL') return inventory;
    return inventory.filter((item) => item.hospital_id === selectedHospitalId);
  }, [inventory, selectedHospitalId]);

  // Overall KPI statistics
  const stats = useMemo(() => {
    let totalUnits = 0;
    let lowStockCount = 0;
    let criticalCount = 0;
    let surplusCount = 0;

    scopedInventory.forEach((item) => {
      const qty = Number(item.quantity);
      totalUnits += qty;
      if (item.status === 'EXPIRED') return;

      if (qty <= 0) {
        criticalCount++;
      } else if (qty < item.min_threshold) {
        lowStockCount++;
      } else if (qty > item.min_threshold * 2) {
        surplusCount++;
      }
    });

    const activeTransfersCount = transfers.filter(
      (t) => t.status === 'SUGGESTED' || t.status === 'APPROVED' || t.status === 'IN_TRANSIT'
    ).length;

    return {
      totalUnits,
      lowStockCount,
      criticalCount,
      surplusCount,
      activeTransfersCount,
      nearExpiryCount: expiryAnalysis.summary.criticalCount + expiryAnalysis.summary.expiredCount,
    };
  }, [scopedInventory, transfers, expiryAnalysis]);

  // Data preparation for Recharts Bar Chart: Multi-Hospital Stock Comparison
  const chartData = useMemo(() => {
    const targetDrugs = selectedChartDrugId === 'ALL'
      ? drugs.slice(0, 6) // Top 6 common EDL drugs
      : drugs.filter((d) => d.id === selectedChartDrugId);

    return targetDrugs.map((drug) => {
      const dataPoint = {
        name: drug.name.split(' ')[0] + ' ' + (drug.name.split(' ')[1] || ''),
        fullName: drug.name,
        code: drug.code,
        minThreshold: drug.default_min_threshold,
      };

      hospitals.forEach((hospital) => {
        // Sum total quantities of this drug across batches in this hospital
        const total = inventory
          .filter((inv) => inv.hospital_id === hospital.id && inv.drug_id === drug.id && inv.status !== 'EXPIRED')
          .reduce((sum, inv) => sum + Number(inv.quantity), 0);

        // Friendly short name for chart legend
        const shortName = hospital.name.split(' ')[0];
        dataPoint[shortName] = total;
      });

      return dataPoint;
    });
  }, [drugs, hospitals, inventory, selectedChartDrugId]);

  // Data for Category Distribution Pie Chart
  const categoryChartData = useMemo(() => {
    const categoryCounts = {};
    scopedInventory.forEach((item) => {
      const drug = drugs.find((d) => d.id === item.drug_id);
      const cat = drug?.category || 'General';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + Number(item.quantity);
    });

    const colors = ['#0284c7', '#0d9488', '#f59e0b', '#8b5cf6', '#e11d48', '#64748b'];
    return Object.entries(categoryCounts).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }));
  }, [scopedInventory, drugs]);

  // Table items with enriched drug and hospital details
  const tableData = useMemo(() => {
    return scopedInventory
      .map((item) => {
        const drug = drugs.find((d) => d.id === item.drug_id);
        const hospital = hospitals.find((h) => h.id === item.hospital_id);
        return {
          ...item,
          drugName: drug?.name || 'Unknown Drug',
          drugCode: drug?.code || 'N/A',
          genericName: drug?.generic_name || '',
          category: drug?.category || 'General',
          unit: drug?.unit || 'Units',
          hospitalName: hospital?.name || 'Unknown Hospital',
          hospitalDistrict: hospital?.district || 'Delhi',
        };
      })
      .filter((item) => {
        const matchesSearch =
          item.drugName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.hospitalName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
        const matchesStatus =
          statusFilter === 'ALL' ||
          (statusFilter === 'CRITICAL' && item.quantity < item.min_threshold) ||
          (statusFilter === 'SURPLUS' && item.quantity > item.min_threshold * 2) ||
          (statusFilter === 'AVAILABLE' && item.quantity >= item.min_threshold && item.quantity <= item.min_threshold * 2) ||
          (statusFilter === 'EXPIRED' && item.status === 'EXPIRED');

        return matchesSearch && matchesCategory && matchesStatus;
      });
  }, [scopedInventory, drugs, hospitals, searchTerm, categoryFilter, statusFilter]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(drugs.map((d) => d.category)));
  }, [drugs]);

  const hospitalBarColors = ['#0284c7', '#059669', '#d97706', '#8b5cf6', '#e11d48'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Welcome / Scope Notification */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-delhi-navy to-delhi-blue text-white p-5 rounded-2xl shadow-gov">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-white/10 text-sky-200 border border-white/20">
              {selectedHospitalId === 'ALL' ? 'NCT OF DELHI CONSOLIDATED' : 'FACILITY SCOPE'}
            </span>
            <span className="text-xs text-sky-200">Real-Time Inventory Surveillance</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold mt-1">
            {selectedHospitalId === 'ALL'
              ? 'Delhi NCT Central Drug Supply Overview'
              : hospitals.find((h) => h.id === selectedHospitalId)?.name}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Automated shortage detection and algorithmic inter-hospital rebalancing network
          </p>
        </div>

        {transferSuggestions.length > 0 && (
          <button
            onClick={() => onNavigateTab('transfer-engine')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs shadow-lg hover:shadow-amber-500/25 transition shrink-0"
          >
            <Sparkles className="w-4 h-4 text-slate-900" />
            <span>{transferSuggestions.length} Transfer Suggestions Ready</span>
            <ArrowRightLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Critical Deficit Alert Banner if any shortages exist */}
      {transferSuggestions.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Critical Inventory Deficit Detected in Delhi Network
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                {transferSuggestions.length} drug shortages can be immediately balanced using surplus stocks from peer Delhi government hospitals.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('transfer-engine')}
            className="text-xs font-semibold text-amber-900 bg-amber-200/70 hover:bg-amber-200 px-3 py-1.5 rounded-lg border border-amber-300 transition shrink-0 flex items-center gap-1.5 self-start md:self-auto"
          >
            <span>Review & Rebalance</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Stock */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Stock</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2 font-display">
            {stats.totalUnits.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Active drug units in batches</span>
        </div>

        {/* Low / Critical Stock */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600">Stock Deficits</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2 font-display">
            {stats.lowStockCount + stats.criticalCount}
          </div>
          <span className="text-[11px] text-rose-500 font-medium">Below minimum safety threshold</span>
        </div>

        {/* Surplus Stock */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600">Surplus Reserves</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2 font-display">
            {stats.surplusCount}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">&gt; 2x threshold (Eligible donors)</span>
        </div>

        {/* Expiring Soon */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600">Near Expiry / Expired</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2 font-display">
            {stats.nearExpiryCount}
          </div>
          <span className="text-[11px] text-amber-600 font-medium">&lt; 30 days or past date</span>
        </div>

        {/* Active Transfers */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-delhi-sky">Active Transfers</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-delhi-sky flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 mt-2 font-display">
            {stats.activeTransfersCount}
          </div>
          <span className="text-[11px] text-sky-600 font-medium">Inter-hospital pipeline</span>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Multi-Hospital Stock Comparison Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 font-display">
                Inter-Hospital Stock Levels Comparison
              </h3>
              <p className="text-xs text-slate-500">
                Live drug unit distribution across premier Delhi NCT medical centers
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Filter Drug:</span>
              <select
                value={selectedChartDrugId}
                onChange={(e) => setSelectedChartDrugId(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="ALL">Top Essential EDL Drugs</option>
                {drugs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    borderRadius: '0.75rem',
                    border: 'none',
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                  }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                {hospitals.map((hospital, idx) => {
                  const shortName = hospital.name.split(' ')[0];
                  return (
                    <Bar
                      key={hospital.id}
                      dataKey={shortName}
                      name={hospital.name.replace('Hospital', '').trim()}
                      fill={hospitalBarColors[idx % hospitalBarColors.length]}
                      radius={[4, 4, 0, 0]}
                    />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3D Interactive Delhi Supply Chain & Cold-Chain Hub Model */}
        <SupplyChain3DModel />
      </div>

      {/* Live Hospital Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Table Filters Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800 font-display">
              Detailed Hospital Inventory Batches
            </h3>
            <p className="text-xs text-slate-500">
              Showing {tableData.length} active batch records across facilities
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search drug, batch, hospital..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 w-48 sm:w-56"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="CRITICAL">Deficit (&lt; Min Threshold)</option>
              <option value="SURPLUS">Surplus (&gt; 2x Min Threshold)</option>
              <option value="AVAILABLE">Adequate (Available)</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Hospital / Facility</th>
                <th className="px-4 py-3">Drug Name & SKU</th>
                <th className="px-4 py-3">Batch Number</th>
                <th className="px-4 py-3 text-right">Available Stock</th>
                <th className="px-4 py-3 text-right">Min Threshold</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Expiry Date</th>
                <th className="px-4 py-3 text-center">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-400 text-xs">
                    No matching inventory records found.
                  </td>
                </tr>
              ) : (
                tableData.map((item) => {
                  const isDeficit = Number(item.quantity) < Number(item.min_threshold);
                  const isSurplus = Number(item.quantity) > Number(item.min_threshold) * 2;
                  const isExpired = item.status === 'EXPIRED';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px] sm:max-w-[200px]" title={item.hospitalName}>
                            {item.hospitalName}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 pl-5">{item.hospitalDistrict}</span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{item.drugName}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.drugCode} • <span className="text-slate-500">{item.category}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono font-medium text-slate-700">
                        {item.batch_number}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-bold font-display ${
                            isDeficit
                              ? 'text-rose-600'
                              : isSurplus
                              ? 'text-emerald-600 font-extrabold'
                              : 'text-slate-800'
                          }`}
                        >
                          {Number(item.quantity).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">{item.unit.split(' ')[0]}</span>
                      </td>

                      <td className="px-4 py-3 text-right font-medium text-slate-500">
                        {item.min_threshold.toLocaleString()}
                      </td>

                      <td className="px-4 py-3">
                        {isExpired ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white">
                            EXPIRED
                          </span>
                        ) : isDeficit ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            DEFICIT (&lt; Min)
                          </span>
                        ) : isSurplus ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            SURPLUS (&gt; 2x)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                            AVAILABLE
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                        {item.expiry_date}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {isDeficit ? (
                          <button
                            onClick={() => onNavigateTab('transfer-engine')}
                            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold shadow-sm transition inline-flex items-center gap-1"
                            title="Auto-rebalance via Transfer Engine"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Rebalance</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onNavigateTab('stock-entry')}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition"
                          >
                            Stock Entry
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
