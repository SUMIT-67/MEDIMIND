-- ============================================================================
-- Drug Inventory & Supply Chain Tracking System (SIH1627)
-- Health & Family Welfare Department, Govt. of NCT of Delhi
-- Database Schema Definition for Supabase (PostgreSQL)
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. HOSPITALS TABLE
-- Stores government medical colleges, super-specialty, and district hospitals in Delhi NCT
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    district VARCHAR(100) NOT NULL,
    address TEXT,
    contact_phone VARCHAR(50),
    email VARCHAR(100),
    facility_type VARCHAR(50) DEFAULT 'Govt Hospital',
    total_beds INT DEFAULT 500,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. DRUGS (FORMULARY) TABLE
-- Stores standardized essential drug lists (EDL) with SKU, category, and standard thresholds
CREATE TABLE IF NOT EXISTS drugs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    dosage_form VARCHAR(50) NOT NULL, -- e.g., Tablet, Injection, Syrup, Inhaler
    unit VARCHAR(50) NOT NULL DEFAULT 'Units', -- e.g., strips, vials, bottles, ampoules
    barcode VARCHAR(100) UNIQUE,
    default_min_threshold INT NOT NULL DEFAULT 500,
    storage_temp VARCHAR(50) DEFAULT 'Room Temp (15-25°C)',
    is_essential BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. HOSPITAL INVENTORY TABLE
-- Tracks real-time stock levels of drug batches per hospital
CREATE TABLE IF NOT EXISTS hospital_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    drug_id UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    min_threshold INT NOT NULL DEFAULT 500 CHECK (min_threshold >= 0),
    expiry_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'LOW_STOCK', 'CRITICAL', 'EXPIRED'
    last_restocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_hospital_drug_batch UNIQUE (hospital_id, drug_id, batch_number)
);

-- 4. STOCK MOVEMENTS TABLE
-- Immutable audit ledger for every transaction (procurement, dispense, wastage, inter-hospital transfer)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    drug_id UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
    quantity INT NOT NULL CHECK (quantity > 0),
    reason VARCHAR(100) NOT NULL, -- 'PROCUREMENT', 'PATIENT_DISPENSE', 'TRANSFER_IN', 'TRANSFER_OUT', 'EXPIRY_DISPOSAL', 'WARD_DISTRIBUTION'
    reference_id VARCHAR(100),    -- Transfer ID, Invoice ID, or Prescription No
    logged_by VARCHAR(100) DEFAULT 'Pharmacy Officer',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TRANSFERS TABLE
-- Tracks inter-hospital drug transfers recommended by the Transfer Suggestion Engine
CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE RESTRICT,
    to_hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE RESTRICT,
    drug_id UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'SUGGESTED' 
        CHECK (status IN ('SUGGESTED', 'APPROVED', 'IN_TRANSIT', 'COMPLETED', 'REJECTED')),
    urgency VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' 
        CHECK (urgency IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    suggested_by VARCHAR(100) DEFAULT 'Transfer Engine AI',
    approved_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_different_hospitals CHECK (from_hospital_id <> to_hospital_id)
);

-- ============================================================================
-- INDEXES FOR FAST QUERYING & REAL-TIME PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_inventory_hospital ON hospital_inventory(hospital_id);
CREATE INDEX IF NOT EXISTS idx_inventory_drug ON hospital_inventory(drug_id);
CREATE INDEX IF NOT EXISTS idx_inventory_expiry ON hospital_inventory(expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON hospital_inventory(status);
CREATE INDEX IF NOT EXISTS idx_movements_hospital ON stock_movements(hospital_id);
CREATE INDEX IF NOT EXISTS idx_movements_created ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_from ON transfers(from_hospital_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to ON transfers(to_hospital_id);

-- ============================================================================
-- TRIGGER: AUTO-UPDATE INVENTORY QUANTITY ON STOCK MOVEMENTS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_inventory_on_movement()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.movement_type = 'IN' THEN
        -- Upsert inventory record
        INSERT INTO hospital_inventory (hospital_id, drug_id, batch_number, quantity, min_threshold, expiry_date, status, updated_at)
        VALUES (
            NEW.hospital_id,
            NEW.drug_id,
            NEW.batch_number,
            NEW.quantity,
            COALESCE((SELECT default_min_threshold FROM drugs WHERE id = NEW.drug_id), 500),
            CURRENT_DATE + INTERVAL '1 year', -- default if not matched
            'AVAILABLE',
            NOW()
        )
        ON CONFLICT (hospital_id, drug_id, batch_number)
        DO UPDATE SET 
            quantity = hospital_inventory.quantity + EXCLUDED.quantity,
            last_restocked_at = NOW(),
            updated_at = NOW(),
            status = CASE 
                WHEN (hospital_inventory.quantity + EXCLUDED.quantity) <= 0 THEN 'CRITICAL'
                WHEN (hospital_inventory.quantity + EXCLUDED.quantity) < hospital_inventory.min_threshold THEN 'LOW_STOCK'
                ELSE 'AVAILABLE'
            END;
    ELSIF NEW.movement_type = 'OUT' THEN
        -- Decrement inventory
        UPDATE hospital_inventory
        SET 
            quantity = GREATEST(0, quantity - NEW.quantity),
            updated_at = NOW(),
            status = CASE 
                WHEN (quantity - NEW.quantity) <= 0 THEN 'CRITICAL'
                WHEN (quantity - NEW.quantity) < min_threshold THEN 'LOW_STOCK'
                ELSE 'AVAILABLE'
            END
        WHERE hospital_id = NEW.hospital_id 
          AND drug_id = NEW.drug_id 
          AND batch_number = NEW.batch_number;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_stock_movement ON stock_movements;
CREATE TRIGGER trigger_stock_movement
AFTER INSERT ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_movement();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE drugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

-- Allow public / anon read and write for hackathon demo purposes
CREATE POLICY "Allow public read access on hospitals" ON hospitals FOR SELECT USING (true);
CREATE POLICY "Allow public insert on hospitals" ON hospitals FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on drugs" ON drugs FOR SELECT USING (true);
CREATE POLICY "Allow public insert on drugs" ON drugs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on hospital_inventory" ON hospital_inventory FOR SELECT USING (true);
CREATE POLICY "Allow public all access on hospital_inventory" ON hospital_inventory FOR ALL USING (true);

CREATE POLICY "Allow public read access on stock_movements" ON stock_movements FOR SELECT USING (true);
CREATE POLICY "Allow public insert on stock_movements" ON stock_movements FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public all access on transfers" ON transfers FOR ALL USING (true);

-- ============================================================================
-- REALTIME SUBSCRIPTIONS
-- Enable Supabase Realtime for instant multi-hospital inventory synchronization
-- ============================================================================
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE hospital_inventory, stock_movements, transfers;
COMMIT;
