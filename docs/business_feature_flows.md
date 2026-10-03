# Complete Retail & Wholesale Business Blueprint & System Flows

> **For AI Agents, Engineers, and Developers without prior Retail or Sales domain knowledge.**
> This guide explains the real-world operational problems of Indian SMBs (Kiranas, Supermarkets, Distributors, Hardware & FMCG Merchants), how each feature in this software works step-by-step, and the concrete business outcome it delivers.

---

## 🗺️ Master Domain Architecture

```
                               ┌────────────────────────────────────────┐
                               │       MASTER INVENTORY & CATALOG       │
                               │  (Products, Barcodes, Batches, Slabs)  │
                               └──────────────────┬─────────────────────┘
                                                  │
                    ┌─────────────────────────────┴─────────────────────────────┐
                    ▼                                                           ▼
       ┌────────────────────────┐                                  ┌────────────────────────┐
       │     RETAIL POS (F1)    │                                  │   WHOLESALE DESK (F2)  │
       │   • Walk-in Consumers  │                                  │   • Business Buyers    │
       │   • Sub-10s Checkout   │                                  │   • Tiered Bulk Slabs  │
       │   • Thermal ESC/POS    │                                  │   • Batches & Expiry   │
       │   • Split Cash/UPI/Card│                                  │   • Interstate IGST    │
       └────────────┬───────────┘                                  └────────────┬───────────┘
                    │                                                           │
                    └─────────────────────────────┬─────────────────────────────┘
                                                  │
                                                  ▼
                               ┌────────────────────────────────────────┐
                               │           FINANCIAL KHATA (F4)         │
                               │   (Credit Udhar, Settlements, WA)      │
                               └──────────────────┬─────────────────────┘
                                                  │
                                                  ▼
                               ┌────────────────────────────────────────┐
                               │     STATUTORY GST & SYNC (F5)          │
                               │   (GSTR-1, HSN, Tally XML, Sync)       │
                               └────────────────────────────────────────┘
```

---

## 1. Product Master & SKU Catalog (`F3`)

### 📌 What is this in plain English?
The central warehouse registry of everything the shop sells. Before a store can bill any item, the system must know its name, barcode, purchase cost, retail price, tax rate, and minimum stock alerts.

### 🏪 Real-World Retail Problem
A shopkeeper purchases soap from a manufacturer for ₹42.00, wants to sell it at MRP ₹65.00 with a competitive discount at ₹58.00, and must charge 18% GST. Without a system:
* Cashiers make manual pricing mistakes.
* Products run out of stock without anyone noticing.
* The owner doesn't know their profit margins.

### 🔄 Step-by-Step Flow

```
1. Press [F3] / Click "Products & SKUs"
   │
2. Type in Search Bar (e.g. "Dove" or scan barcode "8901030383456")
   │
3. Instant Sub-1ms Table Query (<1ms via SQLite Indexing)
   │
4. View / Edit:
   ├── Purchase Price (Cost)
   ├── Selling Price & MRP
   ├── Live Margin Calculator (Green Profit Badge %)
   ├── HSN Code (Tax category)
   └── Stock Level vs Low Stock Alert
   │
5. Click "+ Add Product" or "Batch Import CSV" (Adds up to 5,000 SKUs instantly)
```

### 🎯 Business Outcome
* **Zero Pricing Mistakes:** Cashiers can never accidentally charge the wrong price.
* **Profit Visibility:** Store owner knows the exact profit margin on every SKU.
* **Never Run Out of Fast-Selling Items:** Low stock alerts trigger before shelves are empty.

---

## 2. The Sub-10-Second Retail POS Billing Screen (`F1`)

### 📌 What is this in plain English?
The cash register checkout desk where retail customers with shopping baskets pay for their items. Speed is the #1 metric here: during evening rush hours, lines of customers form at the counter. If billing takes 1 minute per person, customers leave the shop.

### 🏪 Real-World Retail Problem
Cashiers shouldn't need to touch a mouse or click through 5 popup windows. They scan 10 barcodes, hit `Enter`, collect cash or UPI, and hand over the printed receipt in under 10 seconds.

### 🔄 Step-by-Step Flow

```
1. Customer walks up to counter with items (e.g. Soap + Biscuits + Chips).
   │
2. Cashier scans barcodes with USB laser scanner.
   ├── Scanner Buffer traps inputs in <60ms
   └── Items instantly appear in the Cart Table.
   │
3. Numpad Quantity Shortcuts:
   ├── Press [/] -> Change quantity of selected item (e.g. 3 PCS)
   └── Press [*] -> Apply item-level discount (e.g. 5%)
   │
4. Dynamic GST Engine automatically splits:
   ├── Taxable Subtotal
   ├── CGST (Central Tax) & SGST (State Tax)
   └── Automatic Round-Off (e.g. ₹154.60 -> ₹155.00)
   │
5. Tender Mode Desk (Always visible on right):
   ├── Press [C] for Cash (Auto-calculates change returned to customer)
   ├── Press [U] for UPI / QR Code
   ├── Press [K] for Credit / Khata (Udhar)
   └── Split Tender: Cash ₹100 + UPI ₹55
   │
6. Press [Enter] / Click "COMPLETE SALE":
   ├── Deducts items from SQLite inventory stock
   ├── Records invoice in database
   └── Triggers silent background ESC/POS thermal printing (<200ms)
```

### 🎯 Business Outcome
* **Speed:** 10 items billed in under 8 seconds.
* **Zero Queue Churn:** Customers don't abandon full baskets due to slow cashiers.
* **Accurate Accounting:** Split tenders (part Cash, part UPI) balance perfectly at end-of-day cash counts.

---

## 3. Direct ESC/POS Thermal Printing (`F6`)

### 📌 What is this in plain English?
Standard thermal receipt printers (the 2-inch / 3-inch roll paper printers at grocery counters) need immediate, silent printing without showing slow Windows OS print dialog boxes.

### 🏪 Real-World Retail Problem
Traditional software opens a Windows print dialog where the user has to click "Print $\to$ Select Printer $\to$ OK". This adds 4 to 8 seconds of delay per customer.

### 🔄 Step-by-Step Flow

```
1. On POS Invoice Completion:
   │
2. Rust ESC/POS Engine creates raw binary byte stream:
   ├── [ESC @] -> Initializes printer
   ├── [ESC a 1] -> Center-aligns shop name & GSTIN
   ├── Double-height bold invoice header
   ├── 48-column fixed-width table (Item | Qty | Rate | Total)
   ├── Tax summary & Savings banner ("You Saved ₹45.00 today!")
   ├── [ESC p] -> Sends 24V electrical pulse to kick open cash drawer
   └── [GS V] -> Cuts paper roll automatically
   │
3. Spools directly to USB / Network printer port in <150ms.
```

### 🎯 Business Outcome
* **Lightning Fast:** Receipt is already printed and cut before the customer has put their wallet away.
* **Cash Drawer Safety:** The physical cash drawer only pops open on verified sales, preventing cashier theft.

---

## 4. Khata Credit Ledger & Customer Debt Management (`F4`)

### 📌 What is this in plain English?
In India, almost all local retail and wholesale commerce runs on **"Udhar"** (informal credit). Trusted regular customers take groceries home and settle their bills once a month when their salary arrives.

### 🏪 Real-World Retail Problem
Shopkeepers traditionally write credit purchases in paper notebooks (*Bahi Khata*). Notebooks get lost, math is wrong, customers dispute bills, and shopkeepers forget to ask for repayment, resulting in huge financial losses.

### 🔄 Step-by-Step Flow

```
1. Customer buys ₹3,450 groceries on credit.
   │
2. Cashier selects customer "Rajesh Sharma" at POS and picks "Credit [K]".
   │
3. Invoice completes:
   ├── Generates POS Bill
   └── Atomically creates a DEBIT (+₹3,450) entry in Rajesh's Khata Ledger.
   │
4. Shopkeeper presses [F4] -> Opens Khata Ledger Workspace:
   ├── Views Total Market Udhar Outstanding (e.g. ₹10,850)
   ├── Sees Rajesh's balance (₹3,450) & Credit Limit progress bar (23% of ₹15,000)
   └── Clicks "WhatsApp Reminder" -> Opens WhatsApp with pre-filled message:
       "Dear Rajesh, your outstanding balance is ₹3,450. Please pay via UPI."
   │
5. Customer transfers ₹1,000 via Google Pay:
   ├── Shopkeeper clicks "Record Payment [F2]"
   ├── Selects "UPI", enters ₹1,000, reference "UPI/987123"
   └── System inserts a CREDIT (-₹1,000) entry -> Balance instantly drops to ₹2,450.
```

### 🎯 Business Outcome
* **Zero Bad Debts:** Full audit trail of every credit bill and repayment.
* **Credit Limit Guardrail:** System blocks cashiers if a customer exceeds their approved credit limit.
* **10x Faster Recovery:** One-click WhatsApp payment links prompt customers to settle debts quickly.

---

## 5. Wholesale Order Desk & B2B Invoicing (`F2`)

### 📌 What is this in plain English?
Selling bulk cartons or wholesale crates to other retail shops and businesses. B2B transactions require volume discounts, batch numbers (for expiry tracking), and full GST Tax Invoices.

### 🏪 Real-World Retail Problem
* Selling 1 soap is ₹58. Selling 500 soaps to another shop is ₹45. The cashier shouldn't have to manually calculate bulk discounts.
* FMCG and medicine batches have expiry dates. Older batches must be sold first (FIFO).
* If selling to a customer outside the home state (e.g., Maharashtra $\to$ Karnataka), tax changes from **CGST+SGST** to **IGST (Integrated GST)**.

### 🔄 Step-by-Step Flow

```
1. Press [F2] / Click "Wholesale Orders"
   │
2. Select registered B2B Buyer (e.g. "Pooja Enterprises", GSTIN: 27AAGCP9871A1ZG)
   │
3. Select State of Supply:
   ├── 27-Maharashtra (Intrastate) -> Splits 9% CGST + 9% SGST
   └── 29-Karnataka (Interstate)   -> Automatically switches to 18% IGST
   │
4. Add Products & Select Batches:
   ├── Pick SKU: "Dove Soap 100g"
   ├── Pick Batch: "B-DV2601" (Exp: 2027-12-31, 100 in stock)
   ├── Enter Quantity: 60 PCS
   └── Volume Pricing Slab Auto-Triggers:
       • 1-10 PCS:  ₹52.00
       • 11-50 PCS: ₹48.00
       • 50+ PCS:   ₹45.00  <-- Applied automatically!
   │
5. Enter Transport Logistics:
   ├── Transport Mode: ROAD / RAIL / AIR
   └── Vehicle Number: MH-12-AB-1234
   │
6. Click "CREATE B2B TAX INVOICE":
   ├── Generates sequential invoice (WS-2627-0001)
   ├── Deducts batch stock & master stock
   ├── Updates B2B customer's credit ledger
   └── Opens clean A4 Tax Invoice document preview.
```

### 🎯 Business Outcome
* **Automated Bulk Pricing:** Eliminates manual calculation errors on complex tier pricing.
* **Zero Expiry Losses:** Strict batch tracking ensures expiring inventory is identified and sold first.
* **100% Tax Compliance:** Valid B2B invoices allow business buyers to claim their GST Input Tax Credit (ITC).

---

## 6. Statutory GST Reports, Tally XML & Multi-Store Sync (`F5`)

### 📌 What is this in plain English?
At the end of every month, business owners must submit their tax filings (GSTR-1 and GSTR-3B) to the Government of India and share their accounts with their Chartered Accountant (CA).

### 🏪 Real-World Retail Problem
Accountants spend 3 to 7 days manually re-typing paper bills into Tally or Excel. Mistakes lead to severe government tax penalties and mismatched GST returns.

### 🔄 Step-by-Step Flow

```
1. Press [F5] / Click "GST & Tax Reports"
   │
2. Top KPI Cards provide instant executive tax overview:
   ├── Gross Turnover (Total Sales)
   ├── Pre-tax Taxable Value
   └── Net GST Liability (CGST, SGST, IGST)
   │
3. Sub-Tabs:
   ├── Tab 1: GSTR-1 & GSTR-3B Breakdown (B2B Table 4 vs B2C Table 7)
   ├── Tab 2: HSN-Wise Summary Table (HSN Code | Qty | Taxable Val | Tax Split)
   └── Tab 3: Multi-Store Cloud Sync Console
   │
4. Click "Export Tally XML":
   ├── Instantly downloads standard Tally-compliant XML sales voucher
   └── CA opens Tally Prime -> "Import Vouchers" -> 1,000s of bills import in 2 seconds!
   │
5. Multi-Store Sync:
   ├── Local-first SQLite stores everything offline with zero latency
   └── Background sync engine reconciles transactions across counters when online.
```

### 🎯 Business Outcome
* **Zero Accountant Delays:** Month-end closing takes 2 minutes instead of 5 days.
* **100% Audit-Proof:** Guaranteed mathematical match between POS receipts, wholesale invoices, and tax filings.
* **Never Stops Working:** Even if internet cables are cut, counters bill at 100% speed and sync when connectivity returns.

---

## 7. First-Time Store Onboarding & Company Profile Master

### 📌 What is this in plain English?
When a merchant opens the software for the very first time, they need to enter their shop name, address, GSTIN number, and thermal printer size. The **Company Profile** workspace lets them edit these details anytime later, while instantly showing how their bills and receipts look with their branding.

### 🏪 Real-World Retail Problem
New shopkeepers get intimidated by complex 50-step ERP software setups. If they can't start billing immediately, they get frustrated. They need a simple 1-minute wizard with a **"Skip for Now"** button, and a dedicated place to update legal tax credentials or terms & conditions later.

### 🔄 Step-by-Step Flow

```
1. Fresh Installation / First Launch:
   │
2. Wizard Modal Pops Up Automatically:
   ├── Step 1: Business Identity (Store Name, Code, Tagline, Phone, Email)
   ├── Step 2: Statutory Tax (GSTIN, State / Place of Supply e.g. 27-Maharashtra)
   ├── Step 3: Location (Shop Address, City, Pincode)
   └── Step 4: Hardware & Terms (Thermal 80mm vs 58mm, Currency ₹, Invoice Prefix)
   │
3. Action Options:
   ├── Click "Save & Complete Setup" -> Writes to SQLite stores & system_config
   └── Click "Skip for Now" -> Uses sensible defaults and never nags again.
   │
4. Ongoing Edits (Anytime Later):
   ├── Click Store Name in Top Bar or go to ADMIN -> "Company Profile"
   ├── Update trade name, phone number, or terms text
   └── Watch the Live A4 Tax Invoice & ESC/POS Thermal Receipt preview update in real-time!
```

### 🎯 Business Outcome
* **Immediate Time-to-Value:** Shopkeeper can start billing in <60 seconds.
* **Dynamic Receipt Branding:** Every customer receipt reflects the store's exact trade name, contact info, and terms.
* **Centralized Configuration:** Changing store address or GSTIN updates all future invoices, POS bills, and tax reports with zero manual re-entry.

---

## 🚀 Quick Keyboard Cheat-Sheet for Cashiers

| Hotkey | Module / Action | Real-World Purpose |
| :--- | :--- | :--- |
| **`F1`** | **Retail POS** | Fast counter checkout for retail shoppers |
| **`F2`** | **Wholesale Orders** | B2B bulk orders with tiered slabs & batch expiry |
| **`F3`** | **Products & SKUs** | Master catalog, prices, profit margins & inventory |
| **`F4`** | **Credit & Khata** | Customer debt ledger, repayment collection & WhatsApp reminders |
| **`F5`** | **GST Reports** | GSTR-1 summaries, HSN tables & Tally XML export |
| **`F6`** | **Thermal Printer** | ESC/POS printer preview, paper cut & drawer setup |
| **`/`** | **Edit Cart Qty** | Numpad shortcut to change line item quantity |
| **`*`** | **Item Discount** | Numpad shortcut to apply line item discount |
| **`C` / `U` / `K`** | **Payment Tender** | Select Cash / UPI / Khata Credit payment mode |
| **`Ctrl + K`** | **Universal Search** | Find any product, customer, or invoice instantly |
