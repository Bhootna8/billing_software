import { invoke } from "@tauri-apps/api/core";

export interface SystemHealth {
  app_name: string;
  version: string;
  database_status: string;
  wal_mode_active: boolean;
  active_store_id: string;
  uptime_seconds: number;
}

export interface DatabasePingResponse {
  connected: boolean;
  latency_ms: number;
  tables_count: number;
}

export interface StoreProfile {
  id: string;
  name: string;
  code: string;
  gstin: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  state_code: string;
  phone: string | null;
  email: string | null;
  tagline: string | null;
  terms_conditions: string | null;
  currency_symbol: string;
  financial_year: string;
  invoice_prefix: string;
  thermal_width: string;
}

export interface StoreProfileInput {
  name: string;
  code: string;
  gstin?: string;
  address?: string;
  city?: string;
  pincode?: string;
  state_code: string;
  phone?: string;
  email?: string;
  tagline?: string;
  terms_conditions?: string;
  currency_symbol?: string;
  financial_year?: string;
  invoice_prefix?: string;
  thermal_width?: string;
}

export interface Product {
  id: string;
  barcode: string | null;
  sku: string | null;
  name: string;
  category: string | null;
  brand: string | null;
  unit: string;
  hsn_code: string | null;
  tax_rate: number;
  purchase_price: number;
  mrp: number;
  selling_price: number;
  wholesale_price: number;
  stock_qty: number;
  min_stock_alert: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewProductInput {
  barcode?: string;
  sku?: string;
  name: string;
  category?: string;
  brand?: string;
  unit?: string;
  hsn_code?: string;
  tax_rate?: number;
  purchase_price?: number;
  mrp?: number;
  selling_price: number;
  wholesale_price?: number;
  stock_qty?: number;
  min_stock_alert?: number;
}

export interface UpdateProductInput {
  id: string;
  barcode?: string;
  sku?: string;
  name: string;
  category?: string;
  brand?: string;
  unit?: string;
  hsn_code?: string;
  tax_rate?: number;
  purchase_price?: number;
  mrp?: number;
  selling_price: number;
  wholesale_price?: number;
  stock_qty?: number;
  min_stock_alert?: number;
  is_active?: boolean;
}

export interface SearchResult {
  products: Product[];
  execution_time_ms: number;
  total_found: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  address: string | null;
  credit_limit: number;
  current_balance: number;
  loyalty_points: number;
  is_active: boolean;
  created_at: string;
}

export interface NewCustomerInput {
  name: string;
  phone: string;
  gstin?: string;
  credit_limit?: number;
}

export interface KhataEntry {
  id: string;
  customer_id: string;
  entry_type: "DEBIT" | "CREDIT";
  amount: number;
  balance_after: number;
  payment_method: string;
  invoice_id: string | null;
  reference_no: string | null;
  notes: string | null;
  created_at: string;
}

export interface RecordPaymentInput {
  customer_id: string;
  amount: number;
  payment_method: string;
  reference_no?: string;
  notes?: string;
}

export interface KhataSummary {
  total_outstanding: number;
  total_credit_customers: number;
  total_settled_recent: number;
}

export interface PosInvoiceItemInput {
  product_id: string;
  product_name: string;
  barcode?: string;
  hsn_code?: string;
  qty: number;
  unit: string;
  unit_price: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
}

export interface PosPaymentBreakdown {
  cash: number;
  upi: number;
  card: number;
  credit: number;
  notes?: string;
}

export interface PosInvoiceInput {
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  items: PosInvoiceItemInput[];
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  round_off: number;
  total_amount: number;
  paid_amount: number;
  payment_method: string;
  payment_breakdown: PosPaymentBreakdown;
  notes?: string;
}

export interface PosInvoiceResult {
  invoice_id: string;
  invoice_no: string;
  total_amount: number;
  execution_time_ms: number;
  created_at: string;
}

export interface InvoiceSummary {
  id: string;
  invoice_no: string;
  customer_name: string;
  customer_phone: string | null;
  total_amount: number;
  paid_amount: number;
  payment_method: string;
  status: string;
  items_count: number;
  created_at: string;
}

export interface ProductBatch {
  id: string;
  product_id: string;
  batch_no: string;
  mfg_date: string | null;
  exp_date: string | null;
  mrp: number;
  wholesale_price: number;
  stock_qty: number;
  is_active: boolean;
}

export interface PricingSlab {
  id: string;
  product_id: string;
  min_qty: number;
  max_qty: number | null;
  slab_price: number;
  label: string | null;
}

export interface B2bInvoiceItemInput {
  product_id: string;
  product_name: string;
  barcode?: string;
  hsn_code?: string;
  batch_no?: string;
  exp_date?: string;
  qty: number;
  unit: string;
  unit_price: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  igst_amount: number;
  total_amount: number;
}

export interface B2bInvoiceInput {
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  buyer_gstin?: string;
  place_of_supply: string;
  is_interstate: boolean;
  invoice_type: string;
  transport_mode?: string;
  vehicle_no?: string;
  items: B2bInvoiceItemInput[];
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  round_off: number;
  total_amount: number;
  paid_amount: number;
  payment_method: string;
  payment_breakdown: PosPaymentBreakdown;
  notes?: string;
}

export interface B2bInvoiceResult {
  invoice_id: string;
  invoice_no: string;
  total_amount: number;
  execution_time_ms: number;
  created_at: string;
}

export interface HsnSummaryItem {
  hsn_code: string;
  description: string;
  total_qty: number;
  unit: string;
  taxable_value: number;
  tax_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
}

export interface Gstr1Summary {
  period: string;
  b2b_invoices_count: number;
  b2b_taxable_value: number;
  b2b_tax_amount: number;
  b2c_invoices_count: number;
  b2c_taxable_value: number;
  b2c_tax_amount: number;
  total_taxable_value: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_tax_liability: number;
  gross_turnover: number;
  hsn_items: HsnSummaryItem[];
}

export interface SyncStatus {
  store_id: string;
  store_code: string;
  pending_events: number;
  last_synced_at: string;
  is_online: boolean;
  server_latency_ms: number;
}

export interface SyncResult {
  success: boolean;
  synced_invoices_count: number;
  execution_time_ms: number;
  message: string;
}

export interface PrinterSettings {
  printer_name: string;
  paper_width: string;
  auto_cut: boolean;
  open_cash_drawer: boolean;
  header_text: string;
  footer_text: string;
  show_gstin: boolean;
  show_hsn: boolean;
  copies: number;
}

export interface PrintResult {
  success: boolean;
  bytes_sent: number;
  formatted_preview: string;
  execution_time_ms: number;
  message: string;
}

export interface SystemPrinterInfo {
  name: string;
  is_default: boolean;
  is_online: boolean;
}

/**
 * System and Database IPC service
 */
export const systemService = {
  async getHealth(): Promise<SystemHealth> {
    try {
      return await invoke<SystemHealth>("get_system_health");
    } catch (error) {
      console.warn("Tauri IPC unavailable:", error);
      return {
        app_name: "Enterprise Retail OS (Web Mode)",
        version: "0.1.0-browser",
        database_status: "IndexedDB Mock",
        wal_mode_active: false,
        active_store_id: "STORE-MAIN",
        uptime_seconds: 0,
      };
    }
  },

  async pingDatabase(): Promise<DatabasePingResponse> {
    try {
      return await invoke<DatabasePingResponse>("ping_database");
    } catch (error) {
      console.warn("Tauri IPC ping failed:", error);
      return {
        connected: false,
        latency_ms: 0,
        tables_count: 0,
      };
    }
  },
};

/**
 * Company Store Profile & Onboarding IPC service
 */
export const storeService = {
  async getStoreProfile(): Promise<StoreProfile> {
    try {
      return await invoke<StoreProfile>("get_store_profile");
    } catch (error) {
      console.error("get_store_profile failed:", error);
      return {
        id: "store-main",
        name: "Main Store & Warehouse",
        code: "STORE-01",
        gstin: "27AAAAA0000A1Z5",
        address: "Ground Floor, Commercial Hub",
        city: "Mumbai",
        pincode: "400001",
        state_code: "27-Maharashtra",
        phone: "+91 9876543210",
        email: "contact@mainretailstore.com",
        tagline: "Fresh Quality · Wholesale Rates",
        terms_conditions: "Goods once sold cannot be returned without original cash receipt.",
        currency_symbol: "₹",
        financial_year: "2026-2027",
        invoice_prefix: "INV-2627-",
        thermal_width: "80mm",
      };
    }
  },

  async updateStoreProfile(input: StoreProfileInput): Promise<StoreProfile> {
    return await invoke<StoreProfile>("update_store_profile", { input });
  },

  async getOnboardingStatus(): Promise<boolean> {
    try {
      return await invoke<boolean>("get_onboarding_status");
    } catch (error) {
      console.warn("get_onboarding_status fallback:", error);
      return true;
    }
  },

  async completeOnboarding(input: StoreProfileInput): Promise<StoreProfile> {
    return await invoke<StoreProfile>("complete_onboarding", { input });
  },

  async skipOnboarding(): Promise<boolean> {
    return await invoke<boolean>("skip_onboarding");
  },
};

/**
 * Product Master & High-Speed Search IPC service
 */
export const productService = {
  async searchProducts(query: string = "", limit?: number): Promise<SearchResult> {
    try {
      return await invoke<SearchResult>("search_products", { query, limit });
    } catch (error) {
      console.error("search_products failed:", error);
      return { products: [], execution_time_ms: 0, total_found: 0 };
    }
  },

  async getProductByBarcode(barcode: string): Promise<Product | null> {
    try {
      return await invoke<Product | null>("get_product_by_barcode", { barcode });
    } catch (error) {
      console.error("get_product_by_barcode failed:", error);
      return null;
    }
  },

  async createProduct(input: NewProductInput): Promise<Product> {
    return await invoke<Product>("create_product", { input });
  },

  async updateProduct(input: UpdateProductInput): Promise<Product> {
    return await invoke<Product>("update_product", { input });
  },

  async deleteProduct(id: string): Promise<boolean> {
    return await invoke<boolean>("delete_product", { id });
  },

  async batchImportProducts(products: NewProductInput[]): Promise<number> {
    return await invoke<number>("batch_import_products", { products });
  },
};

/**
 * Customer Master & Khata Ledger IPC service
 */
export const customerService = {
  async searchCustomers(query: string = ""): Promise<Customer[]> {
    try {
      return await invoke<Customer[]>("search_customers", { query });
    } catch (error) {
      console.error("search_customers failed:", error);
      return [];
    }
  },

  async createCustomer(input: NewCustomerInput): Promise<Customer> {
    return await invoke<Customer>("create_customer", { input });
  },

  async getCustomerLedger(customerId: string): Promise<KhataEntry[]> {
    try {
      return await invoke<KhataEntry[]>("get_customer_ledger", { customerId });
    } catch (error) {
      console.error("get_customer_ledger failed:", error);
      return [];
    }
  },

  async recordKhataPayment(input: RecordPaymentInput): Promise<Customer> {
    return await invoke<Customer>("record_khata_payment", { input });
  },

  async updateCreditLimit(customerId: string, creditLimit: number): Promise<Customer> {
    return await invoke<Customer>("update_customer_credit_limit", { customerId, creditLimit });
  },

  async getKhataSummary(): Promise<KhataSummary> {
    try {
      return await invoke<KhataSummary>("get_khata_summary");
    } catch (error) {
      console.error("get_khata_summary failed:", error);
      return {
        total_outstanding: 0,
        total_credit_customers: 0,
        total_settled_recent: 0,
      };
    }
  },
};

/**
 * POS Invoice IPC service
 */
export const invoiceService = {
  async createPosInvoice(input: PosInvoiceInput): Promise<PosInvoiceResult> {
    return await invoke<PosInvoiceResult>("create_pos_invoice", { input });
  },

  async getRecentInvoices(limit?: number): Promise<InvoiceSummary[]> {
    try {
      return await invoke<InvoiceSummary[]>("get_recent_invoices", { limit });
    } catch (error) {
      console.error("get_recent_invoices failed:", error);
      return [];
    }
  },
};

/**
 * Wholesale & B2B Invoicing IPC service
 */
export const wholesaleService = {
  async getProductBatches(productId: string): Promise<ProductBatch[]> {
    try {
      return await invoke<ProductBatch[]>("get_product_batches", { productId });
    } catch (error) {
      console.error("get_product_batches failed:", error);
      return [];
    }
  },

  async getProductPricingSlabs(productId: string): Promise<PricingSlab[]> {
    try {
      return await invoke<PricingSlab[]>("get_product_pricing_slabs", { productId });
    } catch (error) {
      console.error("get_product_pricing_slabs failed:", error);
      return [];
    }
  },

  async createB2bInvoice(input: B2bInvoiceInput): Promise<B2bInvoiceResult> {
    return await invoke<B2bInvoiceResult>("create_b2b_wholesale_invoice", { input });
  },
};

/**
 * Statutory GST Reports & Multi-Store Sync IPC service
 */
export const reportService = {
  async getGstSummary(period?: string): Promise<Gstr1Summary> {
    try {
      return await invoke<Gstr1Summary>("get_gst_report_summary", { period });
    } catch (error) {
      console.error("get_gst_report_summary failed:", error);
      return {
        period: "FY 2026-2027",
        b2b_invoices_count: 0,
        b2b_taxable_value: 0,
        b2b_tax_amount: 0,
        b2c_invoices_count: 0,
        b2c_taxable_value: 0,
        b2c_tax_amount: 0,
        total_taxable_value: 0,
        total_cgst: 0,
        total_sgst: 0,
        total_igst: 0,
        total_tax_liability: 0,
        gross_turnover: 0,
        hsn_items: [],
      };
    }
  },

  async exportTallyXml(): Promise<string> {
    return await invoke<string>("export_tally_xml_sales");
  },

  async getSyncStatus(): Promise<SyncStatus> {
    try {
      return await invoke<SyncStatus>("get_sync_status");
    } catch (error) {
      console.error("get_sync_status failed:", error);
      return {
        store_id: "store-main",
        store_code: "STORE-01",
        pending_events: 0,
        last_synced_at: "Just now",
        is_online: true,
        server_latency_ms: 0,
      };
    }
  },

  async triggerStoreSync(): Promise<SyncResult> {
    return await invoke<SyncResult>("trigger_store_sync");
  },
};

/**
 * ESC/POS Thermal Printing IPC service
 */
export const printerService = {
  async getSettings(): Promise<PrinterSettings> {
    try {
      return await invoke<PrinterSettings>("get_printer_settings");
    } catch (error) {
      console.error("get_printer_settings failed:", error);
      return {
        printer_name: "Default Thermal",
        paper_width: "80mm",
        auto_cut: true,
        open_cash_drawer: true,
        header_text: "TAX INVOICE / CASH BILL",
        footer_text: "Thank you for shopping!",
        show_gstin: true,
        show_hsn: true,
        copies: 1,
      };
    }
  },

  async saveSettings(settings: PrinterSettings): Promise<boolean> {
    return await invoke<boolean>("save_printer_settings", { settings });
  },

  async listPrinters(): Promise<SystemPrinterInfo[]> {
    try {
      return await invoke<SystemPrinterInfo[]>("list_system_printers");
    } catch (error) {
      console.error("list_system_printers failed:", error);
      return [];
    }
  },

  async printInvoiceThermal(invoiceId: string): Promise<PrintResult> {
    return await invoke<PrintResult>("print_invoice_thermal", { invoiceId });
  },
};
