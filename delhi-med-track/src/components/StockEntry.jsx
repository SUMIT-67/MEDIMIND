import React, { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  ScanBarcode,
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  MinusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  Building,
  Calendar,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';

export const StockEntry = ({ onMovementLogged }) => {
  const { hospitals, drugs, inventory, logStockMovement, selectedHospitalId } = useInventory();

  // Mode: 'IN' (Procurement / Restock) or 'OUT' (Dispense / Disposal / Issue)
  const [movementType, setMovementType] = useState('IN');

  // Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [videoDevices, setVideoDevices] = useState([]);
  const [scannerError, setScannerError] = useState(null);
  const [scannedCode, setScannedCode] = useState('');
  const [scanSuccessAnim, setScanSuccessAnim] = useState(false);

  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const controlsRef = useRef(null);

  // Form States
  const [targetHospitalId, setTargetHospitalId] = useState(() => {
    return selectedHospitalId !== 'ALL' ? selectedHospitalId : hospitals[0]?.id || '';
  });
  const [selectedDrugId, setSelectedDrugId] = useState(drugs[0]?.id || '');
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('PROCUREMENT');
  const [referenceId, setReferenceId] = useState('');
  const [expiryDate, setExpiryDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [loggedBy, setLoggedBy] = useState('Pharmacy Officer');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update target hospital if global filter changes
  useEffect(() => {
    if (selectedHospitalId !== 'ALL') {
      setTargetHospitalId(selectedHospitalId);
    }
  }, [selectedHospitalId]);

  // Set default reason based on movementType
  useEffect(() => {
    if (movementType === 'IN') {
      setReason('PROCUREMENT');
    } else {
      setReason('PATIENT_DISPENSE');
    }
  }, [movementType]);

  // Selected drug object
  const currentDrug = drugs.find((d) => d.id === selectedDrugId);

  // Existing batches for selected drug & hospital for quick selection during Stock OUT
  const availableBatches = inventory.filter(
    (inv) => inv.hospital_id === targetHospitalId && inv.drug_id === selectedDrugId && inv.quantity > 0
  );

  // Audio Beep generator for realistic barcode scanner feedback
  const playScanBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, audioCtx.currentTime); // C6 clear chime
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.18);
    } catch (e) {
      console.debug('Audio beep unavailable:', e);
    }
  };

  // Enumerate camera devices
  const loadCameraDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return;
      }
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      setVideoDevices(devices);
      if (devices.length > 0 && !selectedCameraId) {
        setSelectedCameraId(devices[0].deviceId);
      }
    } catch (err) {
      console.warn('Camera device listing notice:', err);
    }
  };

  useEffect(() => {
    loadCameraDevices();
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    setScannerError(null);
    setIsScanning(true);

    try {
      // 1. Explicitly request camera permission to wake up the laptop webcam
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        // Stop temporary stream after permission grant
        stream.getTracks().forEach((track) => track.stop());
        await loadCameraDevices();
      }

      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader();
      }

      const reader = codeReaderRef.current;
      const deviceId = selectedCameraId || undefined;

      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, error) => {
          if (result) {
            playScanBeep();
            handleBarcodeScanned(result.getText());
          }
        }
      );

      controlsRef.current = controls;
    } catch (err) {
      console.error('Camera streaming failed:', err);
      let errorMsg = 'Could not access the laptop camera. Please ensure camera permissions are allowed in your browser settings (look for the camera icon in your address bar).';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera permission was denied. Please click the camera icon 🔒 in your browser URL bar, select "Allow", and refresh.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera device detected on this computer.';
      }
      setScannerError(errorMsg);
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    setIsScanning(false);
  };

  // Handle scanned or simulated barcode value
  const handleBarcodeScanned = (barcodeValue) => {
    setScannedCode(barcodeValue);
    setScanSuccessAnim(true);
    setTimeout(() => setScanSuccessAnim(false), 2000);

    // Look up drug by barcode or code
    const matchedDrug = drugs.find(
      (d) => d.barcode === barcodeValue || d.code.toLowerCase() === barcodeValue.toLowerCase()
    );

    if (matchedDrug) {
      setSelectedDrugId(matchedDrug.id);

      // Auto-generate realistic batch or match existing batch
      const existingBatch = inventory.find(
        (inv) => inv.hospital_id === targetHospitalId && inv.drug_id === matchedDrug.id
      );

      if (existingBatch) {
        setBatchNumber(existingBatch.batch_number);
        setExpiryDate(existingBatch.expiry_date);
      } else {
        setBatchNumber(`BAT-${matchedDrug.code.replace('DRG-', '')}-${new Date().getFullYear()}`);
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetHospitalId || !selectedDrugId || !batchNumber.trim() || !quantity) {
      return;
    }

    setIsSubmitting(true);
    const result = await logStockMovement({
      hospitalId: targetHospitalId,
      drugId: selectedDrugId,
      batchNumber,
      movementType,
      quantity: parseInt(quantity, 10),
      reason,
      referenceId,
      loggedBy,
      notes,
      expiryDate,
      minThreshold: currentDrug?.default_min_threshold || 500,
    });

    setIsSubmitting(false);

    if (result?.success) {
      setQuantity('');
      setNotes('');
      setReferenceId('');
      if (onMovementLogged) onMovementLogged();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-delhi-navy to-delhi-blue text-white p-5 rounded-2xl shadow-gov flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-white/10 text-sky-200 border border-white/20">
              DISPENSARY & DEPOT TOOL
            </span>
            <span className="text-xs text-sky-200">ZXing Barcode Engine & Ledger Logger</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold mt-1">
            Real-Time Stock Entry & Barcode Scanner
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Log procurement arrivals (Stock IN) or ward dispensations (Stock OUT) with instant verification
          </p>
        </div>

        {/* Movement Type Toggle */}
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-700/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMovementType('IN')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
              movementType === 'IN'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Stock IN (Procurement)</span>
          </button>
          <button
            type="button"
            onClick={() => setMovementType('OUT')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
              movementType === 'OUT'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Stock OUT (Dispense)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Barcode Camera Scanner + Preset Test Barcodes */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ScanBarcode className="w-5 h-5 text-sky-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-800 font-display">
                  Live Barcode Scanner
                </h3>
              </div>

              {isScanning ? (
                <button
                  type="button"
                  onClick={stopScanner}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold transition"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Stop Camera</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startScanner}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Start Camera</span>
                </button>
              )}
            </div>

            {/* Video Viewport */}
            <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${isScanning ? 'block' : 'hidden'}`}
              />

              {!isScanning && (
                <div className="text-center p-6 text-slate-400 space-y-2">
                  <ScanBarcode className="w-12 h-12 mx-auto text-slate-600 stroke-[1.5]" />
                  <p className="text-xs text-slate-300 font-medium">Camera is currently inactive</p>
                  <p className="text-[11px] text-slate-400 max-w-xs">
                    Click "Start Camera" to scan standard EAN-13 / Code128 medicine packaging barcodes.
                  </p>
                </div>
              )}

              {/* Laser / Target Viewport Overlay when active */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                  <div className="w-48 h-32 border-2 border-sky-400 rounded-lg relative overflow-hidden shadow-2xl">
                    <div className="absolute inset-x-0 h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-bounce"></div>
                  </div>
                </div>
              )}

              {/* Scanned Success Notification Banner */}
              {scanSuccessAnim && (
                <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-fade-in p-4 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2 animate-pulse" />
                  <span className="font-bold text-sm">Barcode Decoded!</span>
                  <span className="font-mono text-xs text-emerald-300 mt-1 bg-white/10 px-2 py-0.5 rounded">
                    {scannedCode}
                  </span>
                </div>
              )}
            </div>

            {/* Camera Selector */}
            {videoDevices.length > 1 && (
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Camera:</span>
                <select
                  value={selectedCameraId}
                  onChange={(e) => {
                    setSelectedCameraId(e.target.value);
                    if (isScanning) {
                      stopScanner();
                      setTimeout(startScanner, 200);
                    }
                  }}
                  className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 text-xs focus:outline-none"
                >
                  {videoDevices.map((dev) => (
                    <option key={dev.deviceId} value={dev.deviceId}>
                      {dev.label || `Camera ${dev.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Laptop Camera Guide Tips */}
            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <span>💻 How to scan with laptop webcam:</span>
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-slate-500 text-[10px]">
                <li>Click <strong>"Start Camera"</strong> & click <strong>"Allow"</strong> on the browser camera popup.</li>
                <li>Hold the medicine strip/barcode <strong>10–15 cm</strong> from your laptop screen camera.</li>
                <li>When recognized, you will hear a <strong>beep 🔔</strong> and the drug details will auto-fill on the right!</li>
              </ol>
            </div>

            {scannerError && (
              <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{scannerError}</span>
              </div>
            )}
          </div>

          {/* Quick Barcode Simulator / Presets for Quick Testing */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>1-Click Test Barcode Presets</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Click any medication below to simulate an instant hardware barcode scan:
            </p>

            <div className="grid grid-cols-2 gap-2">
              {drugs.map((drug) => (
                <button
                  key={drug.id}
                  type="button"
                  onClick={() => handleBarcodeScanned(drug.barcode)}
                  className={`text-left p-2 rounded-xl border text-xs transition flex flex-col justify-between ${
                    selectedDrugId === drug.id
                      ? 'bg-sky-50 border-sky-300 text-sky-950 font-semibold'
                      : 'bg-white border-slate-200 hover:border-sky-200 text-slate-700'
                  }`}
                >
                  <span className="truncate font-medium text-[11px]">{drug.name}</span>
                  <span className="font-mono text-[10px] text-slate-400 mt-1">{drug.barcode}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Stock Movement Entry Form */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {movementType === 'IN' ? (
                  <PlusCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <MinusCircle className="w-5 h-5 text-rose-600" />
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-800 font-display">
                    {movementType === 'IN' ? 'Stock IN Registration (Procurement)' : 'Stock OUT Registration (Discharge/Dispense)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {movementType === 'IN'
                      ? 'Increase hospital inventory from state warehouse or central vendor'
                      : 'Issue stock to hospital wards, OPD patients, or biomedical disposal'}
                  </p>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  movementType === 'IN'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}
              >
                {movementType === 'IN' ? '+ Stock IN' : '- Stock OUT'}
              </span>
            </div>

            {/* Target Hospital & Drug Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Delhi Hospital / Facility *
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={targetHospitalId}
                    onChange={(e) => setTargetHospitalId(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-sky-500 font-medium text-slate-800 focus:outline-none"
                  >
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.district})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Drug Formulary Item (EDL) *
                </label>
                <div className="relative">
                  <Package className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedDrugId}
                    onChange={(e) => {
                      setSelectedDrugId(e.target.value);
                      const drug = drugs.find((d) => d.id === e.target.value);
                      if (drug) {
                        setBatchNumber(`BAT-${drug.code.replace('DRG-', '')}-${new Date().getFullYear()}`);
                      }
                    }}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-sky-500 font-medium text-slate-800 focus:outline-none"
                  >
                    {drugs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Drug Info Snapshot Pill */}
            {currentDrug && (
              <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-semibold text-sky-950">{currentDrug.generic_name}</span>
                  <span className="text-slate-500 text-[11px] ml-2">({currentDrug.category})</span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-slate-600">
                    Unit: <strong className="text-slate-800">{currentDrug.unit}</strong>
                  </span>
                  <span className="text-slate-600">
                    Min Threshold: <strong className="text-slate-800">{currentDrug.default_min_threshold}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Batch & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Batch Number *
                </label>
                {movementType === 'OUT' && availableBatches.length > 0 ? (
                  <div className="space-y-1.5">
                    <select
                      value={batchNumber}
                      onChange={(e) => {
                        setBatchNumber(e.target.value);
                        const b = availableBatches.find((x) => x.batch_number === e.target.value);
                        if (b) setExpiryDate(b.expiry_date);
                      }}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    >
                      <option value="">Select Existing Batch ({availableBatches.length} available)</option>
                      {availableBatches.map((b) => (
                        <option key={b.id} value={b.batch_number}>
                          {b.batch_number} ({b.quantity} in stock, exp: {b.expiry_date})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="e.g. BAT-PCM-2401"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity ({currentDrug?.unit || 'Units'}) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 500"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-display font-semibold focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Reason & Reference ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Movement Reason *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                >
                  {movementType === 'IN' ? (
                    <>
                      <option value="PROCUREMENT">Central Govt Procurement (DHS)</option>
                      <option value="EMERGENCY_RESTOCK">Emergency Buffer Restock</option>
                      <option value="TRANSFER_IN">Inter-Hospital Transfer Inward</option>
                      <option value="MANUFACTURER_DIRECT">Direct Manufacturer Delivery</option>
                    </>
                  ) : (
                    <>
                      <option value="PATIENT_DISPENSE">OPD / IPD Patient Prescription Dispense</option>
                      <option value="WARD_DISTRIBUTION">Internal ICU / Ward Issue</option>
                      <option value="TRANSFER_OUT">Inter-Hospital Transfer Outward</option>
                      <option value="EXPIRY_DISPOSAL">Biomedical Expiry Disposal</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reference / Invoice / Rx No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. INV-DHS-9941 or OPD-RX-4819"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Expiry Date & Logged By */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Batch Expiry Date {movementType === 'IN' && '*'}
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required={movementType === 'IN'}
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Logging Officer / Pharmacist
                </label>
                <input
                  type="text"
                  value={loggedBy}
                  onChange={(e) => setLoggedBy(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transaction Notes (Optional)
              </label>
              <textarea
                rows="2"
                placeholder="Add verification comments, temperature log status, or ward department code..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md transition flex items-center justify-center gap-2 ${
                movementType === 'IN'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
              }`}
            >
              {movementType === 'IN' ? (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>{isSubmitting ? 'Logging Transaction...' : 'Confirm & Log Stock IN (Procurement)'}</span>
                </>
              ) : (
                <>
                  <MinusCircle className="w-4 h-4" />
                  <span>{isSubmitting ? 'Logging Transaction...' : 'Confirm & Log Stock OUT (Dispense)'}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
