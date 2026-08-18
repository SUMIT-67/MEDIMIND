/**
 * ============================================================================
 * TRANSFER SUGGESTION ENGINE (SIH1627)
 * Health & Family Welfare Department, Govt. of NCT of Delhi
 * ============================================================================
 * 
 * CORE ALGORITHM LOGIC:
 * 1. Identify Shortages:
 *    For every drug across each Delhi hospital, calculate the total active stock:
 *    If (Total Hospital Stock < min_threshold) => Flag as DEFICIT / RECIPIENT hospital.
 * 
 * 2. Identify Surplus Donors:
 *    Search other hospitals for the same drug where:
 *    (Total Hospital Stock > min_threshold * 2) => Flag as SURPLUS / DONOR hospital.
 * 
 * 3. Calculate Safe Transfer Quantity:
 *    The donor hospital must NEVER be pushed into deficit.
 *    Safe Transferable Quantity = Donor Stock - (Donor min_threshold * 1.5)
 *    Needed Quantity = Recipient min_threshold - Recipient Stock (buffer up to 1.2x threshold)
 *    Transfer Quantity = Min(Safe Transferable Quantity, Needed Quantity)
 * 
 * 4. Batch Allocation (FEFO - First Expiry First Out):
 *    Select available batches from donor with sufficient shelf life (> 60 days) to prevent 
 *    transferring near-expired stock to another facility.
 * 
 * 5. Prioritization & Urgency:
 *    - CRITICAL: Current stock < 25% of min_threshold (e.g. Life-saving drugs / ICU stock)
 *    - HIGH: Current stock < 50% of min_threshold
 *    - MEDIUM: Current stock < 100% of min_threshold
 */

/**
 * Computes smart transfer suggestions across all hospitals and drugs
 * @param {Array} inventory - List of all inventory batch records
 * @param {Array} hospitals - List of hospitals
 * @param {Array} drugs - List of drugs
 * @param {Array} existingTransfers - List of active/suggested transfers to avoid duplicates
 * @returns {Array} List of suggested transfers with full contextual rationale
 */
export function generateTransferSuggestions(inventory = [], hospitals = [], drugs = [], existingTransfers = []) {
  if (!inventory.length || !hospitals.length || !drugs.length) {
    return [];
  }

  const suggestions = [];

  // Group inventory by [hospitalId][drugId]
  const hospitalDrugMap = {};
  
  // Also keep track of all batches per hospital & drug
  const batchesMap = {};

  inventory.forEach((item) => {
    const { hospital_id, drug_id, quantity, min_threshold, batch_number, expiry_date, status } = item;
    
    // Ignore already expired batches
    if (status === 'EXPIRED' || new Date(expiry_date) <= new Date()) {
      return;
    }

    if (!hospitalDrugMap[hospital_id]) {
      hospitalDrugMap[hospital_id] = {};
      batchesMap[hospital_id] = {};
    }

    if (!hospitalDrugMap[hospital_id][drug_id]) {
      hospitalDrugMap[hospital_id][drug_id] = {
        totalQuantity: 0,
        minThreshold: min_threshold || 500,
        hospitalId: hospital_id,
        drugId: drug_id,
      };
      batchesMap[hospital_id][drug_id] = [];
    }

    hospitalDrugMap[hospital_id][drug_id].totalQuantity += Number(quantity);
    batchesMap[hospital_id][drug_id].push({
      batch_number,
      quantity: Number(quantity),
      expiry_date,
    });
  });

  // Iterate over each drug in the formulary
  drugs.forEach((drug) => {
    const drugId = drug.id;
    const recipients = []; // Hospitals with stock < min_threshold
    const donors = [];     // Hospitals with stock > min_threshold * 2

    // Categorize hospitals for this specific drug
    hospitals.forEach((hospital) => {
      const stats = hospitalDrugMap[hospital.id]?.[drugId] || {
        totalQuantity: 0,
        minThreshold: drug.default_min_threshold || 500,
        hospitalId: hospital.id,
        drugId,
      };

      const currentStock = stats.totalQuantity;
      const minThreshold = stats.minThreshold;
      const surplusThreshold = minThreshold * 2;

      // RULE 1: Detect DEFICIT (stock < min_threshold)
      if (currentStock < minThreshold) {
        const deficitAmount = minThreshold - currentStock;
        const stockRatio = minThreshold > 0 ? (currentStock / minThreshold) : 0;
        
        let urgency = 'MEDIUM';
        if (currentStock === 0 || stockRatio <= 0.25) {
          urgency = 'CRITICAL';
        } else if (stockRatio <= 0.50) {
          urgency = 'HIGH';
        }

        recipients.push({
          hospital,
          currentStock,
          minThreshold,
          deficitAmount,
          urgency,
          stockRatio,
        });
      }
      
      // RULE 2: Detect SURPLUS (stock > min_threshold * 2)
      else if (currentStock > surplusThreshold) {
        const excessStock = currentStock - surplusThreshold;
        // Keep a safe buffer of at least 1.5x min_threshold remaining at donor
        const safeTransferable = Math.max(0, currentStock - Math.floor(minThreshold * 1.5));
        
        donors.push({
          hospital,
          currentStock,
          minThreshold,
          surplusThreshold,
          excessStock,
          safeTransferable,
          batches: batchesMap[hospital.id]?.[drugId] || [],
        });
      }
    });

    // Sort recipients by urgency (CRITICAL first, lowest stock ratio first)
    recipients.sort((a, b) => a.stockRatio - b.stockRatio);

    // Sort donors by largest transferable surplus first
    donors.sort((a, b) => b.safeTransferable - a.safeTransferable);

    // Match each deficit hospital with available donor hospitals
    recipients.forEach((recipient) => {
      // Check if a transfer for this drug and recipient hospital is already active or suggested
      const isAlreadyHandled = existingTransfers.some(
        (t) =>
          t.to_hospital_id === recipient.hospital.id &&
          t.drug_id === drugId &&
          (t.status === 'SUGGESTED' || t.status === 'APPROVED' || t.status === 'IN_TRANSIT')
      );

      if (isAlreadyHandled) {
        return; // Don't duplicate suggestions
      }

      for (const donor of donors) {
        if (donor.safeTransferable <= 0) continue;
        if (donor.hospital.id === recipient.hospital.id) continue;

        // Calculate transfer quantity: target enough to restore recipient above min_threshold
        const needed = recipient.deficitAmount + Math.floor(recipient.minThreshold * 0.2); // bring to 120% min_threshold
        const transferQty = Math.min(donor.safeTransferable, Math.max(50, needed));

        if (transferQty <= 0) continue;

        // Choose best batch from donor using FEFO (First Expiry First Out)
        const sortedBatches = [...donor.batches].sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
        const selectedBatch = sortedBatches.find((b) => b.quantity > 0) || {
          batch_number: `BAT-${drug.code?.replace('DRG-', '') || 'GEN'}-${new Date().getFullYear()}`,
          expiry_date: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
        };

        // Rationale explanation string
        const rationale = `${recipient.hospital.name} has critical shortage (${recipient.currentStock} ${drug.unit} vs threshold ${recipient.minThreshold}). ${donor.hospital.name} holds surplus (${donor.currentStock} ${drug.unit}, > 2x threshold). Suggested rebalancing of ${transferQty} ${drug.unit}.`;

        suggestions.push({
          id: `sug-${recipient.hospital.id.slice(0, 4)}-${donor.hospital.id.slice(0, 4)}-${drug.id.slice(0, 4)}-${Date.now().toString().slice(-4)}`,
          from_hospital_id: donor.hospital.id,
          to_hospital_id: recipient.hospital.id,
          from_hospital_name: donor.hospital.name,
          to_hospital_name: recipient.hospital.name,
          from_hospital_district: donor.hospital.district,
          to_hospital_district: recipient.hospital.district,
          drug_id: drug.id,
          drug_name: drug.name,
          drug_code: drug.code,
          drug_unit: drug.unit,
          batch_number: selectedBatch.batch_number,
          batch_expiry: selectedBatch.expiry_date,
          quantity: transferQty,
          status: 'SUGGESTED',
          urgency: recipient.urgency,
          notes: rationale,
          donor_remaining_stock: donor.currentStock - transferQty,
          recipient_after_stock: recipient.currentStock + transferQty,
          created_at: new Date().toISOString(),
        });

        // Deduct from donor's available transferable amount for next calculations in this run
        donor.safeTransferable -= transferQty;
        break; // matched with best donor, move to next recipient
      }
    });
  });

  return suggestions;
}

/**
 * Evaluates expiration risks for all batches in inventory
 * @param {Array} inventory 
 * @param {Array} hospitals 
 * @param {Array} drugs 
 * @returns {Object} Categorized items (critical <30d, warning 30-90d, safe >90d, expired)
 */
export function analyzeExpiryRisks(inventory = [], hospitals = [], drugs = []) {
  const hospitalMap = Object.fromEntries(hospitals.map((h) => [h.id, h]));
  const drugMap = Object.fromEntries(drugs.map((d) => [d.id, d]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results = {
    critical: [],  // < 30 days
    warning: [],   // 30 - 90 days
    safe: [],      // > 90 days
    expired: [],   // Expired
    summary: {
      expiredCount: 0,
      expiredUnits: 0,
      criticalCount: 0,
      criticalUnits: 0,
      warningCount: 0,
      warningUnits: 0,
    }
  };

  inventory.forEach((item) => {
    const expDate = new Date(item.expiry_date);
    expDate.setHours(0, 0, 0, 0);

    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const enrichedItem = {
      ...item,
      daysToExpiry: diffDays,
      hospital_name: hospitalMap[item.hospital_id]?.name || 'Unknown Hospital',
      hospital_district: hospitalMap[item.hospital_id]?.district || 'Delhi NCT',
      drug_name: drugMap[item.drug_id]?.name || 'Unknown Drug',
      drug_code: drugMap[item.drug_id]?.code || 'N/A',
      drug_unit: drugMap[item.drug_id]?.unit || 'Units',
      category: drugMap[item.drug_id]?.category || 'General',
    };

    if (diffDays < 0 || item.status === 'EXPIRED') {
      results.expired.push(enrichedItem);
      results.summary.expiredCount += 1;
      results.summary.expiredUnits += Number(item.quantity);
    } else if (diffDays <= 30) {
      results.critical.push(enrichedItem);
      results.summary.criticalCount += 1;
      results.summary.criticalUnits += Number(item.quantity);
    } else if (diffDays <= 90) {
      results.warning.push(enrichedItem);
      results.summary.warningCount += 1;
      results.summary.warningUnits += Number(item.quantity);
    } else {
      results.safe.push(enrichedItem);
    }
  });

  // Sort batches by earliest expiry first
  results.critical.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
  results.warning.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
  results.expired.sort((a, b) => a.daysToExpiry - b.daysToExpiry);

  return results;
}
