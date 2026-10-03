use rusqlite::{Connection, Result};

pub fn run_migrations(conn: &mut Connection) -> Result<()> {
    // 1. Optimize SQLite for high-throughput desktop POS (WAL mode, Normal sync, Foreign Keys)
    conn.execute_batch(
        "
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA foreign_keys = ON;
        PRAGMA busy_timeout = 5000;
        ",
    )?;

    // 2. Migration Tracker Table
    conn.execute(
        "
        CREATE TABLE IF NOT EXISTS _schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        ",
        [],
    )?;

    // 3. Check current version
    let current_version: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM _schema_migrations",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // Migration 1: Base Enterprise Schema
    if current_version < 1 {
        let tx = conn.transaction()?;

        // System Stores Table
        tx.execute(
            "
            CREATE TABLE IF NOT EXISTS stores (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                code TEXT NOT NULL UNIQUE,
                gstin TEXT,
                address TEXT,
                phone TEXT,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            ",
            [],
        )?;

        // Default Main Store
        tx.execute(
            "
            INSERT OR IGNORE INTO stores (id, name, code, gstin, address, phone)
            VALUES ('store-main', 'Main Store & Warehouse', 'STORE-01', '27AAAAA0000A1Z5', 'Ground Floor, Commercial Hub', '+91 9876543210');
            ",
            [],
        )?;

        // System Configuration
        tx.execute(
            "
            CREATE TABLE IF NOT EXISTS system_config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            ",
            [],
        )?;

        tx.execute(
            "
            INSERT OR IGNORE INTO system_config (key, value)
            VALUES 
                ('financial_year', '2026-2027'),
                ('currency_symbol', '₹'),
                ('tax_mode', 'GST'),
                ('invoice_prefix', 'INV-2627-'),
                ('wholesale_invoice_prefix', 'WS-2627-'),
                ('next_invoice_seq', '1'),
                ('next_wholesale_seq', '1'),
                ('thermal_printer_width', '80mm');
            ",
            [],
        )?;

        // Track Migration 1
        tx.execute(
            "INSERT INTO _schema_migrations (version, name) VALUES (1, 'base_enterprise_tables');",
            [],
        )?;

        tx.commit()?;
    }

    // Migration 2: Product Catalog & SKU Master
    if current_version < 2 {
        let tx = conn.transaction()?;

        tx.execute(
            "
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                barcode TEXT UNIQUE,
                sku TEXT UNIQUE,
                name TEXT NOT NULL,
                category TEXT DEFAULT 'General',
                brand TEXT,
                unit TEXT DEFAULT 'PCS',
                hsn_code TEXT,
                tax_rate REAL DEFAULT 0.0,
                purchase_price REAL DEFAULT 0.0,
                mrp REAL DEFAULT 0.0,
                selling_price REAL NOT NULL,
                wholesale_price REAL DEFAULT 0.0,
                stock_qty REAL DEFAULT 0.0,
                min_stock_alert REAL DEFAULT 5.0,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            ",
            [],
        )?;

        // High-Speed Lookup Indexes
        tx.execute(
            "CREATE INDEX IF NOT EXISTS idx_products_barcode ON products (barcode);",
            [],
        )?;
        tx.execute(
            "CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku);",
            [],
        )?;
        tx.execute(
            "CREATE INDEX IF NOT EXISTS idx_products_name ON products (name COLLATE NOCASE);",
            [],
        )?;
        tx.execute(
            "CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);",
            [],
        )?;

        // Seed Sample FMCG & Retail Products
        tx.execute(
            "
            INSERT OR IGNORE INTO products (id, barcode, sku, name, category, brand, unit, hsn_code, tax_rate, purchase_price, mrp, selling_price, wholesale_price, stock_qty)
            VALUES 
                ('prod-1', '8901030383456', 'DOVE-SOAP-100G', 'Dove Cream Beauty Bathing Bar 100g', 'Personal Care', 'Dove', 'PCS', '34011110', 18.0, 42.0, 65.0, 58.0, 50.0, 150.0),
                ('prod-2', '8901491101837', 'LAYS-MAGIC-MASALA', 'Lays Classic Magic Masala 50g', 'Snacks & FMCG', 'Lays', 'PCS', '21069099', 12.0, 15.5, 20.0, 20.0, 17.0, 240.0),
                ('prod-3', '8901063012484', 'BRIT-GOODDAY-CASHEW', 'Britannia Good Day Cashew Cookies 200g', 'Bakery & Biscuits', 'Britannia', 'PCS', '19053100', 18.0, 32.0, 45.0, 42.0, 36.0, 120.0),
                ('prod-4', '8901058852354', 'MAGGI-NOODLES-70G', 'Maggi 2-Minute Instant Masala Noodles 70g', 'Instant Food', 'Nestle', 'PCS', '19023010', 12.0, 11.2, 14.0, 14.0, 12.0, 500.0),
                ('prod-5', '8901725181222', 'TATA-SALT-1KG', 'Tata Salt Vacuum Evaporated Iodised 1kg', 'Groceries', 'Tata', 'PKT', '25010010', 5.0, 22.0, 28.0, 27.0, 24.0, 80.0),
                ('prod-6', '8901207010116', 'DETTOL-LIQUID-250ML', 'Dettol Antiseptic Liquid 250ml', 'Healthcare', 'Dettol', 'BTL', '30049086', 12.0, 125.0, 160.0, 152.0, 138.0, 60.0);
            ",
            [],
        )?;

        // Track Migration 2
        tx.execute(
            "INSERT INTO _schema_migrations (version, name) VALUES (2, 'product_catalog_master');",
            [],
        )?;

        tx.commit()?;
    }

    // Migration 3: POS Invoices, Line Items, and Customer Master
    if current_version < 3 {
        let tx = conn.transaction()?;

        // Customers Table
        tx.execute(
            "
            CREATE TABLE IF NOT EXISTS customers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT UNIQUE,
                email TEXT,
                gstin TEXT,
                address TEXT,
                credit_limit REAL DEFAULT 0.0,
                current_balance REAL DEFAULT 0.0,
                loyalty_points INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            ",
            [],
        )?;

        // Seed Default Walk-in Customer
        tx.execute(
            "
            INSERT OR IGNORE INTO customers (id, name, phone, gstin, credit_limit, current_balance)
            VALUES 
                ('cust-walkin', 'Walk-in Retail Customer', '0000000000', NULL, 0.0, 0.0),
                ('cust-1', 'Rajesh Sharma', '+91 9820123456', '27AABCS1429B1ZB', 15000.0, 2450.0),
                ('cust-2', 'Pooja Enterprises', '+91 9988776655', '27AAGCP9871A1ZG', 50000.0, 8400.0),
                ('cust-3', 'Vikas Kirana Store', '+91 9811223344', '29ABCDE1234F1Z5', 25000.0, 0.0);
            ",
            [],
        )?;

        // POS Invoices Header Table
        tx.execute(
            "
            CREATE TABLE IF NOT EXISTS invoices (
                id TEXT PRIMARY KEY,
                invoice_no TEXT NOT NULL UNIQUE,
                store_id TEXT NOT NULL DEFAULT 'store-main',
                customer_id TEXT NOT NULL DEFAULT 'cust-walkin',
                customer_name TEXT NOT NULL,
                customer_phone TEXT,
                subtotal REAL NOT NULL,
                discount_amount REAL DEFAULT 0.0,
                tax_amount REAL DEFAULT 0.0,
                round_off REAL DEFAULT 0.0,
                total_amount REAL NOT NULL,
                paid_amount REAL NOT NULL,
                payment_method TEXT NOT NULL,
                payment_breakdown_json TEXT,
                status TEXT NOT NULL DEFAULT 'PAID',
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            ",
            [],
        )?;

        // Invoices Items Table
        tx.execute(
            "
            CREATE TABLE IF NOT EXISTS invoice_items (
                id TEXT PRIMARY KEY,
                invoice_id TEXT NOT NULL,
                product_id TEXT NOT NULL,
                product_name TEXT NOT NULL,
                barcode TEXT,
                hsn_code TEXT,
                qty REAL NOT NULL,
                unit TEXT DEFAULT 'PCS',
                unit_price REAL NOT NULL,
                discount_amount REAL DEFAULT 0.0,
                tax_rate REAL DEFAULT 0.0,
                tax_amount REAL DEFAULT 0.0,
                total_amount REAL NOT NULL,
                FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id)
            );
            ",
            [],
        )?;

        // Fast Lookup Indexes for Invoices
        tx.execute(
            "CREATE INDEX IF NOT EXISTS idx_invoices_invoice_no ON invoices (invoice_no);",
            [],
        )?;
        tx.execute(
            "CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices (customer_id);",
            [],
        )?;
        tx.execute(
            "CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices (created_at DESC);",
            [],
        )?;
        tx.execute(
            "CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items (invoice_id);",
            [],
        )?;
        tx.execute(
            "CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);",
            [],
        )?;

        // Track Migration 3
        tx.execute(
            "INSERT INTO _schema_migrations (version, name) VALUES (3, 'pos_invoices_and_customers');",
            [],
        )?;

        tx.commit()?;
    }

    // Migration 4: Khata Credit Ledger & Payment Settlements
    if current_version < 4 {
        let tx = conn.transaction()?;

        tx.execute(
            "
            CREATE TABLE IF NOT EXISTS khata_entries (
                id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                entry_type TEXT NOT NULL,
                amount REAL NOT NULL,
                balance_after REAL NOT NULL,
                payment_method TEXT DEFAULT 'CASH',
                invoice_id TEXT,
                reference_no TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
            );
            ",
            [],
        )?;

        tx.execute(
            "CREATE INDEX IF NOT EXISTS idx_khata_customer ON khata_entries (customer_id, created_at DESC);",
            [],
        )?;
        tx.execute(
            "CREATE INDEX IF NOT EXISTS idx_khata_type ON khata_entries (entry_type);",
            [],
        )?;

        // Seed Sample Khata History
        tx.execute(
            "
            INSERT OR IGNORE INTO khata_entries (id, customer_id, entry_type, amount, balance_after, payment_method, reference_no, notes, created_at)
            VALUES 
                ('khata-1', 'cust-1', 'DEBIT', 3450.0, 3450.0, 'CREDIT', 'INV-2627-0001', 'Monthly grocery credit purchase', datetime('now', '-5 days')),
                ('khata-2', 'cust-1', 'CREDIT', 1000.0, 2450.0, 'UPI', 'UPI/26081234', 'Partial settlement via GPay', datetime('now', '-2 days')),
                ('khata-3', 'cust-2', 'DEBIT', 12400.0, 12400.0, 'CREDIT', 'INV-2627-0002', 'Bulk wholesale order credit', datetime('now', '-7 days')),
                ('khata-4', 'cust-2', 'CREDIT', 4000.0, 8400.0, 'BANK_TRANSFER', 'IMPS/987123', 'Account transfer payment', datetime('now', '-1 days'));
            ",
            [],
        )?;

        // Track Migration 4
        tx.execute(
            "INSERT INTO _schema_migrations (version, name) VALUES (4, 'khata_credit_ledger');",
            [],
        )?;

        tx.commit()?;
    }

    // Migration 5: Wholesale Batches, Volume Pricing Slabs, and B2B Invoicing
    if current_version < 5 {
        let tx = conn.transaction()?;

        // Product Batches Table (FMCG/Pharma Expiry & Batch Matrix)
        tx.execute(
            "
            CREATE TABLE IF NOT EXISTS product_batches (
                id TEXT PRIMARY KEY,
                product_id TEXT NOT NULL,
                batch_no TEXT NOT NULL,
                mfg_date TEXT,
                exp_date TEXT,
                mrp REAL NOT NULL,
                wholesale_price REAL NOT NULL,
                stock_qty REAL NOT NULL DEFAULT 0.0,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            );
            ",
            [],
        )?;

        // Volume Pricing Slabs Table
        tx.execute(
            "
            CREATE TABLE IF NOT EXISTS pricing_slabs (
                id TEXT PRIMARY KEY,
                product_id TEXT NOT NULL,
                min_qty REAL NOT NULL,
                max_qty REAL,
                slab_price REAL NOT NULL,
                label TEXT,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            );
            ",
            [],
        )?;

        // Add B2B columns to invoices and invoice_items if not present
        let _ = tx.execute("ALTER TABLE invoices ADD COLUMN invoice_type TEXT DEFAULT 'RETAIL'", []);
        let _ = tx.execute("ALTER TABLE invoices ADD COLUMN buyer_gstin TEXT", []);
        let _ = tx.execute("ALTER TABLE invoices ADD COLUMN place_of_supply TEXT DEFAULT '27-Maharashtra'", []);
        let _ = tx.execute("ALTER TABLE invoices ADD COLUMN transport_mode TEXT", []);
        let _ = tx.execute("ALTER TABLE invoices ADD COLUMN vehicle_no TEXT", []);
        let _ = tx.execute("ALTER TABLE invoices ADD COLUMN is_interstate INTEGER DEFAULT 0", []);

        let _ = tx.execute("ALTER TABLE invoice_items ADD COLUMN batch_no TEXT", []);
        let _ = tx.execute("ALTER TABLE invoice_items ADD COLUMN exp_date TEXT", []);
        let _ = tx.execute("ALTER TABLE invoice_items ADD COLUMN igst_amount REAL DEFAULT 0.0", []);

        // Seed Sample Batches
        tx.execute(
            "
            INSERT OR IGNORE INTO product_batches (id, product_id, batch_no, mfg_date, exp_date, mrp, wholesale_price, stock_qty)
            VALUES 
                ('batch-1', 'prod-1', 'B-DV2601', '2026-01-10', '2027-12-31', 65.0, 50.0, 100.0),
                ('batch-2', 'prod-1', 'B-DV2602', '2026-02-15', '2028-01-31', 65.0, 50.0, 50.0),
                ('batch-3', 'prod-3', 'B-GD2605', '2026-03-01', '2026-09-30', 45.0, 36.0, 120.0),
                ('batch-4', 'prod-4', 'B-MG2608', '2026-02-20', '2026-11-30', 14.0, 12.0, 500.0);
            ",
            [],
        )?;

        // Seed Volume Pricing Slabs
        tx.execute(
            "
            INSERT OR IGNORE INTO pricing_slabs (id, product_id, min_qty, max_qty, slab_price, label)
            VALUES 
                ('slab-1', 'prod-1', 1.0, 10.0, 52.0, 'Standard 1-10 PCS'),
                ('slab-2', 'prod-1', 11.0, 50.0, 48.0, 'Medium Carton 11-50 PCS'),
                ('slab-3', 'prod-1', 51.0, 500.0, 45.0, 'Bulk Box 50+ PCS'),
                ('slab-4', 'prod-3', 1.0, 24.0, 38.0, 'Pack 1-24 PCS'),
                ('slab-5', 'prod-3', 25.0, 200.0, 34.0, 'Bulk Carton 25+ PCS');
            ",
            [],
        )?;

        // Indexes
        tx.execute("CREATE INDEX IF NOT EXISTS idx_batches_product ON product_batches(product_id);", [])?;
        tx.execute("CREATE INDEX IF NOT EXISTS idx_slabs_product ON pricing_slabs(product_id);", [])?;

        // Track Migration 5
        tx.execute(
            "INSERT INTO _schema_migrations (version, name) VALUES (5, 'wholesale_b2b_and_batches');",
            [],
        )?;

        tx.commit()?;
    }

    // Migration 6: Company Profile, Store Branding, and First-Time Onboarding
    if current_version < 6 {
        let tx = conn.transaction()?;

        // Add additional profile fields to stores table
        let _ = tx.execute("ALTER TABLE stores ADD COLUMN email TEXT", []);
        let _ = tx.execute("ALTER TABLE stores ADD COLUMN tagline TEXT DEFAULT 'Fresh Quality · Wholesale Rates'", []);
        let _ = tx.execute("ALTER TABLE stores ADD COLUMN state_code TEXT DEFAULT '27-Maharashtra'", []);
        let _ = tx.execute("ALTER TABLE stores ADD COLUMN city TEXT DEFAULT 'Mumbai'", []);
        let _ = tx.execute("ALTER TABLE stores ADD COLUMN pincode TEXT DEFAULT '400001'", []);
        let _ = tx.execute("ALTER TABLE stores ADD COLUMN terms_conditions TEXT DEFAULT 'Goods once sold cannot be returned without original cash receipt.'", []);

        // Add onboarding tracking key in system_config
        tx.execute(
            "INSERT OR IGNORE INTO system_config (key, value) VALUES ('onboarding_completed', '0');",
            [],
        )?;

        // Update default store with standard details
        tx.execute(
            "UPDATE stores SET 
                email = 'contact@mainretailstore.com',
                tagline = 'Fresh Quality · Wholesale Rates',
                state_code = '27-Maharashtra',
                city = 'Mumbai',
                pincode = '400001'
             WHERE id = 'store-main';",
            [],
        )?;

        // Track Migration 6
        tx.execute(
            "INSERT INTO _schema_migrations (version, name) VALUES (6, 'company_profile_and_onboarding');",
            [],
        )?;

        tx.commit()?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn test_migrations_create_tables_and_seed_defaults() {
        let mut conn = Connection::open_in_memory().expect("In-memory SQLite should open");
        run_migrations(&mut conn).expect("Migrations should run without error");

        // Verify default store
        let store_name: String = conn
            .query_row("SELECT name FROM stores WHERE code = 'STORE-01'", [], |r| r.get(0))
            .expect("Default store should exist");
        assert_eq!(store_name, "Main Store & Warehouse");

        // Verify products table & seeded items
        let product_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM products", [], |r| r.get(0))
            .expect("Product count query should succeed");
        assert!(product_count >= 6, "Seeded products should be at least 6");

        // Verify batches table
        let batch_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM product_batches", [], |r| r.get(0))
            .expect("Batches query should succeed");
        assert!(batch_count >= 4, "Seeded batches should be at least 4");

        // Verify pricing slabs
        let slab_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM pricing_slabs", [], |r| r.get(0))
            .expect("Slabs query should succeed");
        assert!(slab_count >= 5, "Seeded slabs should be at least 5");

        // Verify migration tracking
        let version: i32 = conn
            .query_row("SELECT MAX(version) FROM _schema_migrations", [], |r| r.get(0))
            .expect("Max migration version should exist");
        assert_eq!(version, 6);
    }
}
