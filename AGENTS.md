# AGENTS.md — AI Agent & Developer Operating Instructions

---

## 1. Quick Project Summary (Token-Efficient Reference)
* **What is this?** A high-speed, local-first Desktop Billing + Inventory + Khata + Wholesale OS for Indian SMBs.
* **Stack:** Tauri 2.11 (Rust) + React 19.2 + TypeScript + Tailwind CSS 4.3 + SQLite (bundled `rusqlite` in WAL mode).
* **Current State:** Sprints 0 through 8 are complete, verified, and production-ready.
* **Primary Documentation Root:** `docs/`
  * `docs/project_context.md`: Full architectural context, vision, and system pillars.
  * `docs/progress_tracker.md`: Current sprint status, task checklist, and test history.
  * `docs/code_standards.md`: SOLID/KISS guidelines, 4-layer design token rules, and technical lessons learned.
  * `docs/business_feature_flows.md`: Complete Sales, Retail, POS, Wholesale & GST Business Flows and Outcome Blueprint.

---

## 2. Fast Navigation Index (Where Things Live)

```text
c:\startup\billing_software\
├── docs/                     <-- ALL PROJECT SPECS, TRACKERS, BLUEPRINTS & LESSONS LEARNED
│   ├── project_context.md
│   ├── progress_tracker.md
│   ├── code_standards.md
│   └── business_feature_flows.md   <-- Retail, Wholesale, POS & GST Business Guide
├── src/                      <-- FRONTEND (React 19.2 + TypeScript + Tailwind 4.3)
│   ├── components/
│   │   ├── catalog/ProductMaster.tsx       <-- Product Master & SKU catalog (F3)
│   │   ├── pos/PosBillingScreen.tsx        <-- Sub-10s Retail POS Screen (F1)
│   │   ├── pos/ThermalPrinterModal.tsx     <-- Direct ESC/POS Thermal Receipt Preview (F6)
│   │   ├── khata/KhataLedgerScreen.tsx     <-- Khata Credit Ledger & Settlement Workspace (F4)
│   │   ├── wholesale/WholesaleOrderDesk.tsx<-- Wholesale Order Desk & B2B Invoicing (F2)
│   │   ├── reports/GstReportScreen.tsx     <-- Statutory GST Reports, Tally XML & Cloud Sync (F5)
│   │   ├── profile/CompanyProfileScreen.tsx<-- Company Profile Master & Live Bill Previews (Admin)
│   │   ├── onboarding/OnboardingModal.tsx  <-- First-Time Store Setup Wizard & Skip
│   │   └── common/UniversalCommandPalette.tsx <-- Ctrl+K Universal Command Palette (Windows & Mac)
│   ├── services/tauri.ts     <-- Centralized IPC bridge (system, store, products, customers, invoices, printer, wholesale, reports)
│   ├── App.tsx               <-- 56px Top Bar + 240px/64px Categorized Sidebar (F1-F6)
│   └── index.css             <-- 4-Layer Design Token Architecture (Primitives, Semantics, @theme)
└── src-tauri/                <-- BACKEND (Rust 1.98 + Tauri 2.11)
    ├── Cargo.toml            <-- Rust crates configuration
    ├── tauri.conf.json       <-- Tauri window & capabilities configuration
    └── src/
        ├── lib.rs            <-- Tauri builder & command handler registrations
        ├── db/
        │   ├── mod.rs        <-- Thread-safe SQLite connection state
        │   └── migrations.rs <-- Schema migrations v1, v2, v3, v4, v5, v6
        └── commands/         <-- Granular IPC command endpoints
            ├── system.rs     <-- Health check & ping commands
            ├── store.rs      <-- Store profile CRUD & onboarding state
            ├── products.rs   <-- Sub-1ms search, CRUD, and batch import commands
            ├── customers.rs  <-- Khata ledger, search, credit limits, settlements
            ├── invoices.rs   <-- Atomic POS invoice persistence and stock reduction
            ├── wholesale.rs  <-- Batch matrix, tiered volume pricing slabs, B2B invoices
            ├── reports.rs    <-- Statutory GSTR-1/3B summaries, Tally XML, multi-store sync
            └── printing.rs   <-- Direct ESC/POS bytecode formatting & spooling
```

---

## 3. Verification Commands (Always Run After Changes)

```powershell
# 1. Verify Rust compilation and unit tests
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml

# 2. Verify TypeScript strict type-checking and frontend production bundle
npm run type-check
npm run build
```
