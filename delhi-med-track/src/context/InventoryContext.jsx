import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import {
  INITIAL_HOSPITALS,
  INITIAL_DRUGS,
  INITIAL_INVENTORY,
  INITIAL_MOVEMENTS,
  INITIAL_TRANSFERS,
} from '../data/seedData';
import { generateTransferSuggestions, analyzeExpiryRisks } from '../utils/transferEngine';

const InventoryContext = createContext(null);

const STORAGE_KEYS = {
  HOSPITALS: 'delhi_medtrack_hospitals',
  DRUGS: 'delhi_medtrack_drugs',
  INVENTORY: 'delhi_medtrack_inventory',
  MOVEMENTS: 'delhi_medtrack_movements',
  TRANSFERS: 'delhi_medtrack_transfers',
};

export const InventoryProvider = ({ children }) => {
  const [hospitals, setHospitals] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.HOSPITALS);
    return saved ? JSON.parse(saved) : INITIAL_HOSPITALS;
  });

  const [drugs, setDrugs] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DRUGS);
    return saved ? JSON.parse(saved) : INITIAL_DRUGS;
  });

  const [inventory, setInventory] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
  });

  const [movements, setMovements] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
    return saved ? JSON.parse(saved) : INITIAL_MOVEMENTS;
  });

  const [transfers, setTransfers] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSFERS);
    return saved ? JSON.parse(saved) : INITIAL_TRANSFERS;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isLiveSupabase, setIsLiveSupabase] = useState(isSupabaseConfigured());
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [selectedHospitalId, setSelectedHospitalId] = useState('ALL');
  const [notification, setNotification] = useState(null);

  // Helper to trigger toast notifications
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Sync to LocalStorage whenever state changes in offline/mock mode
  useEffect(() => {
    if (!isLiveSupabase) {
      localStorage.setItem(STORAGE_KEYS.HOSPITALS, JSON.stringify(hospitals));
      localStorage.setItem(STORAGE_KEYS.DRUGS, JSON.stringify(drugs));
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
      localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
      localStorage.setItem(STORAGE_KEYS.TRANSFERS, JSON.stringify(transfers));
    }
  }, [hospitals, drugs, inventory, movements, transfers, isLiveSupabase]);

  // Fetch initial data from Supabase if configured
  const fetchSupabaseData = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      setIsLoading(true);
      const [hospRes, drugRes, invRes, movRes, trfRes] = await Promise.all([
        supabase.from('hospitals').select('*').order('name'),
        supabase.from('drugs').select('*').order('name'),
        supabase.from('hospital_inventory').select('*'),
        supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('transfers').select('*').order('created_at', { ascending: false }),
      ]);

      let hasSupabaseData = false;
      if (hospRes.data && hospRes.data.length > 0) {
        setHospitals(hospRes.data);
        hasSupabaseData = true;
      }
      if (drugRes.data && drugRes.data.length > 0) {
        setDrugs(drugRes.data);
        hasSupabaseData = true;
      }
      if (invRes.data && invRes.data.length > 0) {
        setInventory(invRes.data);
        hasSupabaseData = true;
      }
      if (movRes.data && movRes.data.length > 0) {
        setMovements(movRes.data);
      }
      if (trfRes.data && trfRes.data.length > 0) {
        setTransfers(trfRes.data);
      }

      if (hospRes.error || drugRes.error) {
        console.info('Supabase tables not yet seeded or auth pending. Operating with interactive seed data:', hospRes.error || drugRes.error);
        setIsLiveSupabase(false);
      } else {
        setIsLiveSupabase(true);
      }
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn('Operating in interactive mode:', err);
      setIsLiveSupabase(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize Supabase & Realtime subscriptions
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setIsLiveSupabase(false);
      return;
    }

    fetchSupabaseData();

    // Supabase Real-time Channel
    const channel = supabase
      .channel('delhi_medtrack_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hospital_inventory' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setInventory((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setInventory((prev) =>
              prev.map((item) => (item.id === payload.new.id ? payload.new : item))
            );
          } else if (payload.eventType === 'DELETE') {
            setInventory((prev) => prev.filter((item) => item.id !== payload.old.id));
          }
          setLastSyncTime(new Date());
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stock_movements' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMovements((prev) => [payload.new, ...prev]);
            showNotification(`Real-time Stock Movement: ${payload.new.movement_type} ${payload.new.quantity} units`, 'info');
          }
          setLastSyncTime(new Date());
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transfers' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTransfers((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTransfers((prev) =>
              prev.map((item) => (item.id === payload.new.id ? payload.new : item))
            );
          }
          setLastSyncTime(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSupabaseData]);

  // Log a stock movement (Stock IN / Stock OUT)
  const logStockMovement = async ({
    hospitalId,
    drugId,
    batchNumber,
    movementType,
    quantity,
    reason,
    referenceId = '',
    loggedBy = 'Pharmacy Officer',
    notes = '',
    expiryDate = '',
    minThreshold = 500,
  }) => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      showNotification('Please enter a valid positive quantity', 'error');
      return { success: false, error: 'Invalid quantity' };
    }

    const newMovement = {
      id: `mov-${Date.now()}`,
      hospital_id: hospitalId,
      drug_id: drugId,
      batch_number: batchNumber.toUpperCase().trim(),
      movement_type: movementType,
      quantity: qty,
      reason,
      reference_id: referenceId || `TXN-${Date.now().toString().slice(-6)}`,
      logged_by: loggedBy,
      notes,
      created_at: new Date().toISOString(),
    };

    // If live Supabase is active, persist directly to PostgreSQL
    if (isLiveSupabase && supabase) {
      try {
        const { data, error } = await supabase.from('stock_movements').insert([newMovement]).select();
        if (error) throw error;
        showNotification(`Stock ${movementType} logged successfully to Supabase!`, 'success');
        return { success: true, data };
      } catch (err) {
        console.error('Supabase write error:', err);
        showNotification(`Supabase sync failed: ${err.message}. Applied locally.`, 'warning');
      }
    }

    // Local / Offline fallback execution
    setMovements((prev) => [newMovement, ...prev]);

    // Update or insert inventory item
    setInventory((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.hospital_id === hospitalId &&
          item.drug_id === drugId &&
          item.batch_number.toUpperCase() === batchNumber.toUpperCase().trim()
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        const currentItem = updated[existingIndex];
        const newQty =
          movementType === 'IN'
            ? currentItem.quantity + qty
            : Math.max(0, currentItem.quantity - qty);

        const currentThreshold = currentItem.min_threshold || minThreshold;
        let newStatus = 'AVAILABLE';
        if (newQty <= 0) newStatus = 'CRITICAL';
        else if (newQty < currentThreshold) newStatus = 'LOW_STOCK';

        updated[existingIndex] = {
          ...currentItem,
          quantity: newQty,
          status: newStatus,
          updated_at: new Date().toISOString(),
        };
        return updated;
      } else {
        // Create new batch record if Stock IN
        if (movementType === 'IN') {
          const defaultExp = expiryDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];
          const newStatus = qty < minThreshold ? 'LOW_STOCK' : 'AVAILABLE';
          return [
            ...prev,
            {
              id: `inv-${Date.now()}`,
              hospital_id: hospitalId,
              drug_id: drugId,
              batch_number: batchNumber.toUpperCase().trim(),
              quantity: qty,
              min_threshold: minThreshold,
              expiry_date: defaultExp,
              status: newStatus,
              updated_at: new Date().toISOString(),
            },
          ];
        }
        return prev;
      }
    });

    showNotification(`Stock ${movementType} (${qty} units) recorded successfully!`, 'success');
    return { success: true };
  };

  // Transfer Lifecycle Handlers
  const approveTransfer = async (transferId, officerName = 'Director Health Services') => {
    if (isLiveSupabase && supabase) {
      try {
        await supabase
          .from('transfers')
          .update({ status: 'APPROVED', approved_by: officerName, updated_at: new Date().toISOString() })
          .eq('id', transferId);
      } catch (err) {
        console.warn(err);
      }
    }

    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId
          ? { ...t, status: 'APPROVED', approved_by: officerName, updated_at: new Date().toISOString() }
          : t
      )
    );
    showNotification('Transfer request approved by Health Department', 'success');
  };

  const dispatchTransfer = async (transferId) => {
    const target = transfers.find((t) => t.id === transferId);
    if (!target) return;

    // Log Stock OUT movement from Donor Hospital
    await logStockMovement({
      hospitalId: target.from_hospital_id,
      drugId: target.drug_id,
      batchNumber: target.batch_number,
      movementType: 'OUT',
      quantity: target.quantity,
      reason: 'TRANSFER_OUT',
      referenceId: `TRF-${target.id.slice(0, 8)}`,
      logged_by: 'Logistics Officer',
      notes: `Dispatched to recipient facility`,
    });

    if (isLiveSupabase && supabase) {
      try {
        await supabase
          .from('transfers')
          .update({ status: 'IN_TRANSIT', updated_at: new Date().toISOString() })
          .eq('id', transferId);
      } catch (err) {
        console.warn(err);
      }
    }

    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId ? { ...t, status: 'IN_TRANSIT', updated_at: new Date().toISOString() } : t
      )
    );
    showNotification(`Transfer #${target.id.slice(0, 6)} is now In-Transit`, 'info');
  };

  const completeTransfer = async (transferId) => {
    const target = transfers.find((t) => t.id === transferId);
    if (!target) return;

    // Log Stock IN movement at Recipient Hospital
    await logStockMovement({
      hospitalId: target.to_hospital_id,
      drugId: target.drug_id,
      batchNumber: target.batch_number,
      movementType: 'IN',
      quantity: target.quantity,
      reason: 'TRANSFER_IN',
      referenceId: `TRF-${target.id.slice(0, 8)}`,
      logged_by: 'Receiving Pharmacist',
      notes: `Received & restocked from donor hospital`,
    });

    if (isLiveSupabase && supabase) {
      try {
        await supabase
          .from('transfers')
          .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
          .eq('id', transferId);
      } catch (err) {
        console.warn(err);
      }
    }

    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId ? { ...t, status: 'COMPLETED', updated_at: new Date().toISOString() } : t
      )
    );
    showNotification('Transfer completed! Stock safely restocked at destination hospital.', 'success');
  };

  const rejectTransfer = async (transferId, reason = 'Alternative supply available') => {
    if (isLiveSupabase && supabase) {
      try {
        await supabase
          .from('transfers')
          .update({ status: 'REJECTED', notes: reason, updated_at: new Date().toISOString() })
          .eq('id', transferId);
      } catch (err) {
        console.warn(err);
      }
    }

    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId ? { ...t, status: 'REJECTED', notes: reason, updated_at: new Date().toISOString() } : t
      )
    );
    showNotification('Transfer recommendation rejected', 'info');
  };

  const createManualTransfer = async (transferData) => {
    const newTrf = {
      id: `trf-${Date.now()}`,
      from_hospital_id: transferData.fromHospitalId,
      to_hospital_id: transferData.toHospitalId,
      drug_id: transferData.drugId,
      batch_number: transferData.batchNumber || 'BAT-MANUAL',
      quantity: parseInt(transferData.quantity, 10),
      status: 'APPROVED',
      urgency: transferData.urgency || 'HIGH',
      suggested_by: 'Manual Health Officer Entry',
      approved_by: 'Director Health Services',
      notes: transferData.notes || 'Manual emergency inter-hospital allocation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isLiveSupabase && supabase) {
      try {
        await supabase.from('transfers').insert([newTrf]);
      } catch (err) {
        console.warn(err);
      }
    }

    setTransfers((prev) => [newTrf, ...prev]);
    showNotification('Manual transfer requisition created successfully!', 'success');
    return newTrf;
  };

  const resetToSeedData = () => {
    localStorage.removeItem(STORAGE_KEYS.HOSPITALS);
    localStorage.removeItem(STORAGE_KEYS.DRUGS);
    localStorage.removeItem(STORAGE_KEYS.INVENTORY);
    localStorage.removeItem(STORAGE_KEYS.MOVEMENTS);
    localStorage.removeItem(STORAGE_KEYS.TRANSFERS);

    setHospitals(INITIAL_HOSPITALS);
    setDrugs(INITIAL_DRUGS);
    setInventory(INITIAL_INVENTORY);
    setMovements(INITIAL_MOVEMENTS);
    setTransfers(INITIAL_TRANSFERS);
    showNotification('Demo state reset to initial Delhi health network seed data', 'info');
  };

  // Algorithmic computations derived from current inventory
  const transferSuggestions = generateTransferSuggestions(inventory, hospitals, drugs, transfers);
  const expiryAnalysis = analyzeExpiryRisks(inventory, hospitals, drugs);

  return (
    <InventoryContext.Provider
      value={{
        hospitals,
        drugs,
        inventory,
        movements,
        transfers,
        isLoading,
        isLiveSupabase,
        lastSyncTime,
        selectedHospitalId,
        setSelectedHospitalId,
        notification,
        showNotification,
        logStockMovement,
        approveTransfer,
        dispatchTransfer,
        completeTransfer,
        rejectTransfer,
        createManualTransfer,
        resetToSeedData,
        fetchSupabaseData,
        transferSuggestions,
        expiryAnalysis,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
