-- ============================================================================
-- Drug Inventory & Supply Chain Tracking System (SIH1627)
-- Health & Family Welfare Department, Govt. of NCT of Delhi
-- Comprehensive Seed Data Script
-- ============================================================================

-- Clean existing data
TRUNCATE transfers, stock_movements, hospital_inventory, drugs, hospitals CASCADE;

-- 1. SEED HOSPITALS (5 Major Delhi NCT Government Medical Centers)
INSERT INTO hospitals (id, name, code, district, address, contact_phone, email, facility_type, total_beds) VALUES
('11111111-1111-1111-1111-111111111111', 'AIIMS New Delhi', 'DEL-HOSP-01', 'South Delhi', 'Sri Aurobindo Marg, Ansari Nagar, New Delhi 110029', '+91 11 2658 8500', 'pharmacy@aiims.edu', 'Apex Autonomous Institute', 2478),
('22222222-2222-2222-2222-222222222222', 'Lok Nayak Jai Prakash Hospital (LNJP)', 'DEL-HOSP-02', 'Central Delhi', 'Jawaharlal Nehru Marg, Delhi Gate, New Delhi 110002', '+91 11 2323 3000', 'stores@lnjphospital.delhi.gov.in', 'Govt Tertiary Hospital', 2000),
('33333333-3333-3333-3333-333333333333', 'Guru Teg Bahadur Hospital (GTB)', 'DEL-HOSP-03', 'East Delhi', 'Shahdara, Dilshad Garden, Delhi 110095', '+91 11 2258 6262', 'pharmacy@gtbh.delhi.gov.in', 'Govt Tertiary Hospital', 1500),
('44444444-4444-4444-4444-444444444444', 'Safdarjung Hospital', 'DEL-HOSP-04', 'South West Delhi', 'Ring Road, Opposite AIIMS, New Delhi 110029', '+91 11 2616 5060', 'drugs@safdarjung.nic.in', 'Central Govt Hospital', 1800),
('55555555-5555-5555-5555-555555555555', 'Dr. Ram Manohar Lohia Hospital (RML)', 'DEL-HOSP-05', 'New Delhi', 'Baba Kharak Singh Marg, Connaught Place, New Delhi 110001', '+91 11 2336 5525', 'store@rmlh.nic.in', 'Central Govt Hospital', 1420);

-- 2. SEED DRUGS (10 Common Essential EDL Formulations with Barcodes)
INSERT INTO drugs (id, code, name, generic_name, category, dosage_form, unit, barcode, default_min_threshold, storage_temp, is_essential) VALUES
('d1111111-1111-1111-1111-111111111111', 'DRG-PCM-500', 'Paracetamol 500mg IP', 'Paracetamol', 'Analgesics / Antipyretics', 'Tablet', 'Strips (10 tabs)', '8901234560011', 1200, 'Room Temp (15-25°C)', true),
('d2222222-2222-2222-2222-222222222222', 'DRG-AMX-250', 'Amoxicillin & Clavulanate 625mg', 'Amoxicillin + Clavulanic Acid', 'Antibiotics', 'Tablet', 'Strips (6 tabs)', '8901234560028', 800, 'Dry & Cool (<25°C)', true),
('d3333333-3333-3333-3333-333333333333', 'DRG-INS-100', 'Human Actrapid Insulin 100IU/ml', 'Human Insulin Regular', 'Antidiabetic / Hormone', 'Vial', 'Vials (10ml)', '8901234560035', 400, 'Cold Chain (2-8°C)', true),
('d4444444-4444-4444-4444-444444444444', 'DRG-AZI-500', 'Azithromycin 500mg USP', 'Azithromycin', 'Antibiotics (Macrolide)', 'Tablet', 'Strips (5 tabs)', '8901234560042', 600, 'Room Temp (15-25°C)', true),
('d5555555-5555-5555-5555-555555555555', 'DRG-MET-500', 'Metformin HCl 500mg SR', 'Metformin', 'Antidiabetic', 'Tablet', 'Strips (10 tabs)', '8901234560059', 1000, 'Room Temp (15-25°C)', true),
('d6666666-6666-6666-6666-666666666666', 'DRG-CTX-100', 'Ceftriaxone Sodium 1g Inj', 'Ceftriaxone', 'Injectable Antibiotics', 'Vial', 'Vials', '8901234560066', 700, 'Store below 25°C', true),
('d7777777-7777-7777-7777-777777777777', 'DRG-PAN-040', 'Pantoprazole 40mg IV', 'Pantoprazole', 'Gastrointestinal', 'Vial', 'Vials', '8901234560073', 900, 'Room Temp (15-25°C)', true),
('d8888888-8888-8888-8888-888888888888', 'DRG-SAL-100', 'Salbutamol Inhaler 100mcg', 'Salbutamol Sulfate', 'Respiratory / Emergency', 'Inhaler', 'Canisters (200 doses)', '8901234560080', 350, 'Room Temp (<30°C)', true),
('d9999999-9999-9999-9999-999999999999', 'DRG-ATV-020', 'Atorvastatin Calcium 20mg', 'Atorvastatin', 'Cardiovascular', 'Tablet', 'Strips (10 tabs)', '8901234560097', 850, 'Room Temp (15-25°C)', true),
('daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'DRG-ENO-040', 'Enoxaparin Sodium 40mg/0.4ml', 'Enoxaparin', 'Anticoagulant / Emergency', 'PFS', 'Pre-filled Syringes', '8901234560103', 300, 'Cold Chain (2-8°C)', true);

-- 3. SEED HOSPITAL INVENTORY (Configured with Deficits, 2x Surpluses, and Expiry Windows)
-- AIIMS: Low on Amoxicillin and Insulin (DEFICIT), High on Paracetamol
-- LNJP: High Surplus on Amoxicillin (>2x threshold), Low on Ceftriaxone
-- GTB: High Surplus on Insulin Regular (>2x threshold), Balanced on others
-- Safdarjung: High Surplus on Ceftriaxone, Low on Paracetamol
-- RML: Balanced with some near-expiry batches for demoing wastage alerts
INSERT INTO hospital_inventory (hospital_id, drug_id, batch_number, quantity, min_threshold, expiry_date, status, updated_at) VALUES
-- AIIMS New Delhi (1111...)
('11111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'BAT-PCM-2401', 3200, 1200, CURRENT_DATE + INTERVAL '420 days', 'AVAILABLE', NOW()),
('11111111-1111-1111-1111-111111111111', 'd2222222-2222-2222-2222-222222222222', 'BAT-AMX-2402', 150,  800,  CURRENT_DATE + INTERVAL '240 days', 'CRITICAL', NOW()),  -- DEFICIT!
('11111111-1111-1111-1111-111111111111', 'd3333333-3333-3333-3333-333333333333', 'BAT-INS-2403', 80,   400,  CURRENT_DATE + INTERVAL '180 days', 'CRITICAL', NOW()),  -- DEFICIT!
('11111111-1111-1111-1111-111111111111', 'd4444444-4444-4444-4444-444444444444', 'BAT-AZI-2404', 950,  600,  CURRENT_DATE + INTERVAL '300 days', 'AVAILABLE', NOW()),
('11111111-1111-1111-1111-111111111111', 'd5555555-5555-5555-5555-555555555555', 'BAT-MET-2405', 1800, 1000, CURRENT_DATE + INTERVAL '365 days', 'AVAILABLE', NOW()),
('11111111-1111-1111-1111-111111111111', 'd6666666-6666-6666-6666-666666666666', 'BAT-CTX-2406', 820,  700,  CURRENT_DATE + INTERVAL '20 days',  'AVAILABLE', NOW()),  -- NEAR EXPIRY (<30d)
('11111111-1111-1111-1111-111111111111', 'd7777777-7777-7777-7777-777777777777', 'BAT-PAN-2407', 1400, 900,  CURRENT_DATE + INTERVAL '500 days', 'AVAILABLE', NOW()),
('11111111-1111-1111-1111-111111111111', 'd8888888-8888-8888-8888-888888888888', 'BAT-SAL-2408', 550,  350,  CURRENT_DATE + INTERVAL '400 days', 'AVAILABLE', NOW()),

-- Lok Nayak Hospital (2222...)
('22222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111', 'BAT-PCM-2409', 1450, 1200, CURRENT_DATE + INTERVAL '320 days', 'AVAILABLE', NOW()),
('22222222-2222-2222-2222-222222222222', 'd2222222-2222-2222-2222-222222222222', 'BAT-AMX-2410', 2600, 800,  CURRENT_DATE + INTERVAL '190 days', 'AVAILABLE', NOW()),  -- SURPLUS > 2x threshold (Can supply AIIMS)
('22222222-2222-2222-2222-222222222222', 'd3333333-3333-3333-3333-333333333333', 'BAT-INS-2411', 520,  400,  CURRENT_DATE + INTERVAL '210 days', 'AVAILABLE', NOW()),
('22222222-2222-2222-2222-222222222222', 'd6666666-6666-6666-6666-666666666666', 'BAT-CTX-2412', 120,  700,  CURRENT_DATE + INTERVAL '180 days', 'CRITICAL', NOW()),  -- DEFICIT!
('22222222-2222-2222-2222-222222222222', 'd9999999-9999-9999-9999-999999999999', 'BAT-ATV-2413', 1900, 850,  CURRENT_DATE + INTERVAL '45 days',  'AVAILABLE', NOW()),  -- NEAR EXPIRY (45d)

-- GTB Hospital (3333...)
('33333333-3333-3333-3333-333333333333', 'd1111111-1111-1111-1111-111111111111', 'BAT-PCM-2414', 1600, 1200, CURRENT_DATE + INTERVAL '280 days', 'AVAILABLE', NOW()),
('33333333-3333-3333-3333-333333333333', 'd3333333-3333-3333-3333-333333333333', 'BAT-INS-2415', 1350, 400,  CURRENT_DATE + INTERVAL '150 days', 'AVAILABLE', NOW()),  -- SURPLUS > 3x threshold (Can supply AIIMS)
('33333333-3333-3333-3333-333333333333', 'd4444444-4444-4444-4444-444444444444', 'BAT-AZI-2416', 700,  600,  CURRENT_DATE + INTERVAL '220 days', 'AVAILABLE', NOW()),
('33333333-3333-3333-3333-333333333333', 'daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BAT-ENO-2417', 750,  300,  CURRENT_DATE + INTERVAL '90 days',  'AVAILABLE', NOW()),   -- SURPLUS > 2x

-- Safdarjung Hospital (4444...)
('44444444-4444-4444-4444-444444444444', 'd1111111-1111-1111-1111-111111111111', 'BAT-PCM-2418', 210,  1200, CURRENT_DATE + INTERVAL '150 days', 'CRITICAL', NOW()),  -- DEFICIT! (Can take from AIIMS)
('44444444-4444-4444-4444-444444444444', 'd6666666-6666-6666-6666-666666666666', 'BAT-CTX-2419', 2400, 700,  CURRENT_DATE + INTERVAL '300 days', 'AVAILABLE', NOW()),  -- SURPLUS > 3x (Can supply LNJP)
('44444444-4444-4444-4444-444444444444', 'd7777777-7777-7777-7777-777777777777', 'BAT-PAN-2420', 1100, 900,  CURRENT_DATE + INTERVAL '365 days', 'AVAILABLE', NOW()),
('44444444-4444-4444-4444-444444444444', 'd8888888-8888-8888-8888-888888888888', 'BAT-SAL-2421', 90,   350,  CURRENT_DATE + INTERVAL '120 days', 'CRITICAL', NOW()),  -- DEFICIT!

-- Dr. RML Hospital (5555...)
('55555555-5555-5555-5555-555555555555', 'd1111111-1111-1111-1111-111111111111', 'BAT-PCM-2422', 1300, 1200, CURRENT_DATE + INTERVAL '400 days', 'AVAILABLE', NOW()),
('55555555-5555-5555-5555-555555555555', 'd2222222-2222-2222-2222-222222222222', 'BAT-AMX-2423', 920,  800,  CURRENT_DATE + INTERVAL '280 days', 'AVAILABLE', NOW()),
('55555555-5555-5555-5555-555555555555', 'd5555555-5555-5555-5555-555555555555', 'BAT-MET-2424', 1100, 1000, CURRENT_DATE + INTERVAL '10 days',  'AVAILABLE', NOW()),  -- CRITICAL EXPIRY (<10d)
('55555555-5555-5555-5555-555555555555', 'd8888888-8888-8888-8888-888888888888', 'BAT-SAL-2425', 900,  350,  CURRENT_DATE + INTERVAL '300 days', 'AVAILABLE', NOW()),  -- SURPLUS (Can supply Safdarjung)
('55555555-5555-5555-5555-555555555555', 'daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BAT-ENO-2426', 45,   300,  CURRENT_DATE - INTERVAL '5 days',   'EXPIRED', NOW());   -- EXPIRED!

-- 4. SEED RECENT STOCK MOVEMENTS
INSERT INTO stock_movements (hospital_id, drug_id, batch_number, movement_type, quantity, reason, reference_id, logged_by, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'BAT-PCM-2401', 'IN',  2000, 'PROCUREMENT', 'INV-DHS-8821', 'Pharmacist Sharma', NOW() - INTERVAL '2 days'),
('11111111-1111-1111-1111-111111111111', 'd2222222-2222-2222-2222-222222222222', 'BAT-AMX-2402', 'OUT', 400,  'PATIENT_DISPENSE', 'OPD-RX-10492', 'Pharmacist Verma', NOW() - INTERVAL '1 day'),
('22222222-2222-2222-2222-222222222222', 'd2222222-2222-2222-2222-222222222222', 'BAT-AMX-2410', 'IN',  1500, 'PROCUREMENT', 'INV-DHS-8902', 'Store Officer Gupta', NOW() - INTERVAL '3 days'),
('33333333-3333-3333-3333-333333333333', 'd3333333-3333-3333-3333-333333333333', 'BAT-INS-2415', 'IN',  1000, 'PROCUREMENT', 'INV-COLD-4101', 'ColdChain Incharge', NOW() - INTERVAL '4 days'),
('44444444-4444-4444-4444-444444444444', 'd6666666-6666-6666-6666-666666666666', 'BAT-CTX-2419', 'IN',  2000, 'PROCUREMENT', 'INV-DHS-9011', 'Pharmacist Singh', NOW() - INTERVAL '12 hours'),
('55555555-5555-5555-5555-555555555555', 'daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BAT-ENO-2426', 'OUT', 50,   'EXPIRY_DISPOSAL', 'DISP-WASTE-09', 'BioMed Inspector', NOW() - INTERVAL '6 hours');

-- 5. SEED ACTIVE TRANSFERS
INSERT INTO transfers (from_hospital_id, to_hospital_id, drug_id, batch_number, quantity, status, urgency, suggested_by, approved_by, notes, created_at, updated_at) VALUES
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'd2222222-2222-2222-2222-222222222222', 'BAT-AMX-2410', 600, 'IN_TRANSIT', 'CRITICAL', 'Transfer Engine AI', 'Director Health Services', 'Emergency transfer to resolve ICU Amoxicillin shortage', NOW() - INTERVAL '2 hours', NOW()),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'd3333333-3333-3333-3333-333333333333', 'BAT-INS-2415', 300, 'SUGGESTED', 'HIGH', 'Transfer Engine AI', NULL, 'AIIMS Insulin regular reserves critical (80 units left)', NOW() - INTERVAL '30 minutes', NOW());
