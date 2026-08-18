import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  X,
  Database,
  ExternalLink,
  Sparkles,
  Layers,
  Terminal,
} from 'lucide-react';

export const SqlViewerModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('SCHEMA'); // 'SCHEMA' | 'SEED' | 'GUIDE'
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const schemaSql = `-- ============================================================================
-- Drug Inventory & Supply Chain Tracking System (SIH1627)
-- Health & Family Welfare Department, Govt. of NCT of Delhi
-- Database Schema Definition for Supabase (PostgreSQL)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. HOSPITALS
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

-- 2. DRUGS
CREATE TABLE IF NOT EXISTS drugs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    dosage_form VARCHAR(50) NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'Units',
    barcode VARCHAR(100) UNIQUE,
    default_min_threshold INT NOT NULL DEFAULT 500,
    storage_temp VARCHAR(50) DEFAULT 'Room Temp (15-25°C)',
    is_essential BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. HOSPITAL INVENTORY
CREATE TABLE IF NOT EXISTS hospital_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    drug_id UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    min_threshold INT NOT NULL DEFAULT 500 CHECK (min_threshold >= 0),
    expiry_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'AVAILABLE',
    last_restocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_hospital_drug_batch UNIQUE (hospital_id, drug_id, batch_number)
);

-- 4. STOCK MOVEMENTS
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    drug_id UUID NOT NULL REFERENCES drugs(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
    quantity INT NOT NULL CHECK (quantity > 0),
    reason VARCHAR(100) NOT NULL,
    reference_id VARCHAR(100),
    logged_by VARCHAR(100) DEFAULT 'Pharmacy Officer',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TRANSFERS
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

-- TRIGGER: AUTOMATIC INVENTORY RECALCULATION ON STOCK MOVEMENT
CREATE OR REPLACE FUNCTION update_inventory_on_movement()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.movement_type = 'IN' THEN
        INSERT INTO hospital_inventory (hospital_id, drug_id, batch_number, quantity, min_threshold, expiry_date, status, updated_at)
        VALUES (
            NEW.hospital_id,
            NEW.drug_id,
            NEW.batch_number,
            NEW.quantity,
            COALESCE((SELECT default_min_threshold FROM drugs WHERE id = NEW.drug_id), 500),
            CURRENT_DATE + INTERVAL '1 year',
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

-- REALTIME REPLICATION PUBLICATION
ALTER PUBLICATION supabase_realtime ADD TABLE hospital_inventory, stock_movements, transfers;`;

  const seedSql = `-- ============================================================================
-- SEED DATA (5 DELHI HOSPITALS & 10 ESSENTIAL MEDICATIONS)
-- ============================================================================

INSERT INTO hospitals (id, name, code, district, address, contact_phone, facility_type, total_beds) VALUES
('11111111-1111-1111-1111-111111111111', 'AIIMS New Delhi', 'DEL-HOSP-01', 'South Delhi', 'Ansari Nagar, New Delhi', '+91 11 2658 8500', 'Apex Autonomous Institute', 2478),
('22222222-2222-2222-2222-222222222222', 'Lok Nayak Jai Prakash Hospital (LNJP)', 'DEL-HOSP-02', 'Central Delhi', 'Delhi Gate, New Delhi', '+91 11 2323 3000', 'Govt Tertiary Hospital', 2000),
('33333333-3333-3333-3333-333333333333', 'Guru Teg Bahadur Hospital (GTB)', 'DEL-HOSP-03', 'East Delhi', 'Dilshad Garden, Delhi', '+91 11 2258 6262', 'Govt Tertiary Hospital', 1500),
('44444444-4444-4444-4444-444444444444', 'Safdarjung Hospital', 'DEL-HOSP-04', 'South West Delhi', 'Ring Road, New Delhi', '+91 11 2616 5060', 'Central Govt Hospital', 1800),
('55555555-5555-5555-5555-555555555555', 'Dr. Ram Manohar Lohia Hospital (RML)', 'DEL-HOSP-05', 'New Delhi', 'Baba Kharak Singh Marg, New Delhi', '+91 11 2336 5525', 'Central Govt Hospital', 1420);

INSERT INTO drugs (id, code, name, generic_name, category, dosage_form, unit, barcode, default_min_threshold) VALUES
('d1111111-1111-1111-1111-111111111111', 'DRG-PCM-500', 'Paracetamol 500mg IP', 'Paracetamol', 'Analgesics', 'Tablet', 'Strips', '8901234560011', 1200),
('d2222222-2222-2222-2222-222222222222', 'DRG-AMX-250', 'Amoxicillin & Clavulanate 625mg', 'Amoxicillin + Clav', 'Antibiotics', 'Tablet', 'Strips', '8901234560028', 800),
('d3333333-3333-3333-3333-333333333333', 'DRG-INS-100', 'Human Actrapid Insulin 100IU/ml', 'Insulin Regular', 'Antidiabetic', 'Vial', 'Vials', '8901234560035', 400),
('d4444444-4444-4444-4444-444444444444', 'DRG-AZI-500', 'Azithromycin 500mg USP', 'Azithromycin', 'Antibiotics', 'Tablet', 'Strips', '8901234560042', 600),
('d5555555-5555-5555-5555-555555555555', 'DRG-MET-500', 'Metformin HCl 500mg SR', 'Metformin', 'Antidiabetic', 'Tablet', 'Strips', '8901234560059', 1000);`;

  const currentContent = activeTab === 'SCHEMA' ? schemaSql : activeTab === 'SEED' ? seedSql : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-700 animate-slide-up">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">
                Supabase PostgreSQL Schema & Seeding (SIH1627)
              </h3>
              <p className="text-xs text-slate-400">
                Execute directly in your Supabase SQL Editor to initialize tables, triggers & realtime
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex space-x-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('SCHEMA')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'SCHEMA' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              1. schema.sql (Tables & Triggers)
            </button>
            <button
              onClick={() => setActiveTab('SEED')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'SEED' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              2. seed.sql (Delhi Hospitals & Drugs)
            </button>
            <button
              onClick={() => setActiveTab('GUIDE')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'GUIDE' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              3. Setup Instructions
            </button>
          </div>

          {activeTab !== 'GUIDE' && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy SQL'}</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 font-mono text-xs text-slate-300">
          {activeTab === 'GUIDE' ? (
            <div className="font-sans text-xs space-y-4 text-slate-300">
              <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-800/50 space-y-2">
                <h4 className="font-bold text-sky-300 text-sm">How to Connect Your Supabase Backend:</h4>
                <ol className="list-decimal pl-5 space-y-2 text-slate-300">
                  <li>
                    Create a new free project at{' '}
                    <a
                      href="https://supabase.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 underline inline-flex items-center gap-0.5"
                    >
                      supabase.com <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li>Go to your Supabase Project &gt; <strong>SQL Editor</strong>.</li>
                  <li>Paste the contents of <strong>schema.sql</strong> and click <strong>Run</strong>.</li>
                  <li>Paste the contents of <strong>seed.sql</strong> and click <strong>Run</strong>.</li>
                  <li>
                    Copy your <strong>Project URL</strong> and <strong>anon public key</strong> from{' '}
                    <em>Project Settings &gt; API</em>.
                  </li>
                  <li>
                    Paste them into your <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">.env</code> file:
                    <pre className="bg-slate-950 p-3 rounded-lg mt-2 text-[11px] text-emerald-400 font-mono">
                      VITE_SUPABASE_URL=https://xyzcompany.supabase.co{'\n'}
                      VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
                    </pre>
                  </li>
                  <li>
                    Run <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">npm run dev</code>. The app will automatically connect in live real-time synchronization mode!
                  </li>
                </ol>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-1">
                <h5 className="font-bold text-slate-200">Offline / Demo Mode:</h5>
                <p className="text-slate-400">
                  If Supabase credentials are not provided, Delhi MedTrack seamlessly operates in offline interactive mode with in-memory state and localStorage persistence for SIH hackathon evaluation.
                </p>
              </div>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap leading-relaxed select-all">{currentContent}</pre>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-center text-[11px] text-slate-500">
          Files located at: <code className="text-slate-400">supabase/schema.sql</code> and{' '}
          <code className="text-slate-400">supabase/seed.sql</code>
        </div>
      </div>
    </div>
  );
};
