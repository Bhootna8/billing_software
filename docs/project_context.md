# High-Speed Desktop Retail & Wholesale Operating System
## Project Context & Architecture Blueprint

---

## 1. Product Vision & Mission
* **Core Philosophy:** *“Powerful underneath, simple on the surface.”*
* **Primary Objective:** Build a lightning-fast, offline-first desktop OS for Indian retail and wholesale businesses that achieves **sub-10-second checkout**, eliminates mouse usage via keyboard ergonomics, and provides enterprise-grade inventory, credit (khata), and GST compliance.
* **Target Audience:** Indian SMBs (General stores, Supermarkets, FMCG/non-food retail, Wholesale distributors, Stockists, Multi-store franchises).

---

## 2. Core Operational Pillars
1. **Workflow Compression:** Single-screen billing workspace; zero screen-switching during checkout.
2. **Sub-10s Checkout:** Uninterruptible barcode reader buffer, numpad arithmetic, instant split tender (Cash/UPI).
3. **Local-First & Zero Latency:** Embedded SQLite storage in WAL mode; transactions execute in `<1ms` locally without internet reliance.
4. **Direct Silent Hardware Spooling:** Raw ESC/POS thermal printing to USB/Serial ports bypassing browser print popups.
5. **Statutory Compliance:** GSTR-1, GSTR-3B summaries, HSN rate management, 1-click Tally Prime XML export.

---

## 3. Technology Stack (Locked & Verified)

```
┌─────────────────────────┬──────────────────┬──────────────────────────────────────────┐
│ Component               │ Technology       │ Role / Implementation Details            │
├─────────────────────────┼──────────────────┼──────────────────────────────────────────┤
│ Desktop Shell           │ Tauri 2.11.5     │ Lightweight native Windows wrapper       │
│ Build Hook              │ tauri-build 2.6.3│ Compiles Windows resource & icon bundles │
│ Backend Engine          │ Rust 1.98.0      │ Native hardware HAL, IPC, and threading  │
│ Database                │ rusqlite 0.40.2  │ Bundled C SQLite with WAL mode & mutexes │
│ Frontend Framework      │ React 19.2.8     │ Concurrent rendering & Action hooks      │
│ Bundler                 │ Vite 8.2.2       │ High-speed HMR development server        │
│ Type Safety             │ TypeScript 5.7.3 │ Strict mode zero-any compilation         │
│ Styling                 │ Tailwind CSS 4.3 │ @tailwindcss/vite 4.3.3 (Zero postcss)   │
│ Iconography             │ Lucide React     │ Accessible SVG icons                     │
└─────────────────────────┴──────────────────┴──────────────────────────────────────────┘
```

---

## 4. Key Architectural Directories
* `src/`: React 19 frontend UI (screens, components, hooks, styles).
* `src/services/tauri.ts`: Type-safe TypeScript IPC bridge functions.
* `src-tauri/src/main.rs`: Desktop executable entrypoint.
* `src-tauri/src/lib.rs`: Tauri builder, state registration, and IPC invoke handlers.
* `src-tauri/src/db/`: SQLite connection manager (`mod.rs`) and migration engine (`migrations.rs`).
* `src-tauri/src/commands/`: Granular Rust command modules (`system.rs`, `products.rs`, `invoices.rs`).
* `docs/`: Living documentation, sprint tracker, and code standards.
