# Delhi MedTrack - Drug Inventory & Supply Chain Tracking System (SIH1627)

A state-of-the-art web application developed for the **Health & Family Welfare Department, Govt. of NCT of Delhi** under **Smart India Hackathon (SIH1627)**.

## 🚀 Key Features

1. **Live Stock Surveillance Dashboard**:
   - Real-time stock level aggregation across major Delhi government medical centers (AIIMS New Delhi, LNJP Hospital, GTB Hospital, Safdarjung Hospital, Dr. RML Hospital).
   - Recharts visual comparisons, therapeutic category distribution, and supply status breakdown.

2. **ZXing Barcode Scanner & Stock Entry**:
   - Hardware camera feed scanner decoding EAN-13 & Code128 pharmaceutical barcodes.
   - Quick 1-click test barcode presets for rapid demo testing.
   - Comprehensive Stock IN (Procurement) & Stock OUT (Dispensary / Disposal) transaction logger.

3. **Algorithmic Inter-Hospital Transfer Suggestion Engine**:
   - Automatically detects inventory shortages when hospital stock is below `min_threshold`.
   - Identifies candidate donor hospitals possessing surplus stock (`> 2x min_threshold`).
   - Calculates optimal safe transfer amounts without putting the donor facility at risk.
   - Complete transfer workflow: *Suggested → Approved → In-Transit → Completed*.

4. **Expiry Surveillance & Wastage Prevention**:
   - First-Expiry-First-Out (FEFO) matrix flagging batches expiring in `< 30 days`, `30-90 days`, and expired items.
   - Fast-track dispensing and biomedical waste quarantine actions.

5. **Dual-Mode Backend Architecture**:
   - **Live Supabase Mode**: Connects with PostgreSQL, Row Level Security, automatic inventory updating triggers, and real-time WebSocket subscriptions.
   - **Interactive Offline / Demo Mode**: Instant local state with localStorage persistence for zero-config presentation.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Recharts, Canvas Confetti
- **Barcode Engine**: `@zxing/browser`, `@zxing/library`
- **Backend & Database**: Supabase (PostgreSQL), Supabase Realtime Channels

---

## 💻 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables (Optional)
To connect to your live Supabase project, copy `.env.example` to `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```
*(If left empty, the application automatically runs in Interactive Demo Mode with preloaded Delhi hospital data).*

### 3. Run Database Migration in Supabase (Optional)
1. Open your Supabase project's **SQL Editor**.
2. Run the SQL script from `supabase/schema.sql`.
3. Run the seed data script from `supabase/seed.sql`.

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🏛️ Project Directory Structure

```
delhi-med-track/
├── supabase/
│   ├── schema.sql              # Complete PostgreSQL schema, triggers & RLS
│   └── seed.sql                # Seed data for 5 Delhi hospitals & 10 EDL drugs
├── src/
│   ├── components/
│   │   ├── Header.jsx          # Govt of Delhi portal banner & global controls
│   │   ├── Navigation.jsx      # Navigation tab bar with real-time badges
│   │   ├── Dashboard.jsx       # Recharts stock levels & inventory table
│   │   ├── StockEntry.jsx      # ZXing Barcode camera scanner & IN/OUT form
│   │   ├── TransferEngineView.jsx # Transfer suggestion rebalancing logic UI
│   │   ├── ExpiryWidget.jsx    # Expiry surveillance and wastage matrix
│   │   ├── MovementsLog.jsx    # Stock movement audit ledger & CSV export
│   │   └── SqlViewerModal.jsx  # In-app SQL schema & setup viewer
│   ├── context/
│   │   └── InventoryContext.jsx # Central state & Supabase realtime provider
│   ├── data/
│   │   └── seedData.js         # Initial mock dataset for Delhi hospitals
│   ├── utils/
│   │   └── transferEngine.js   # Deficit vs Surplus rebalancing algorithm
│   ├── supabaseClient.js       # Supabase client initializer
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── vite.config.js
```
