use crate::db::DatabaseState;
use crate::commands::invoices::PosPaymentBreakdown;
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProductBatch {
    pub id: String,
    pub product_id: String,
    pub batch_no: String,
    pub mfg_date: Option<String>,
    pub exp_date: Option<String>,
    pub mrp: f64,
    pub wholesale_price: f64,
    pub stock_qty: f64,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PricingSlab {
    pub id: String,
    pub product_id: String,
    pub min_qty: f64,
    pub max_qty: Option<f64>,
    pub slab_price: f64,
    pub label: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct B2bInvoiceItemInput {
    pub product_id: String,
    pub product_name: String,
    pub barcode: Option<String>,
    pub hsn_code: Option<String>,
    pub batch_no: Option<String>,
    pub exp_date: Option<String>,
    pub qty: f64,
    pub unit: String,
    pub unit_price: f64,
    pub discount_amount: f64,
    pub tax_rate: f64,
    pub tax_amount: f64,
    pub igst_amount: f64,
    pub total_amount: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct B2bInvoiceInput {
    pub customer_id: String,
    pub customer_name: String,
    pub customer_phone: Option<String>,
    pub buyer_gstin: Option<String>,
    pub place_of_supply: String,
    pub is_interstate: bool,
    pub invoice_type: String, // "B2B_INVOICE" or "DELIVERY_CHALLAN"
    pub transport_mode: Option<String>,
    pub vehicle_no: Option<String>,
    pub items: Vec<B2bInvoiceItemInput>,
    pub subtotal: f64,
    pub discount_amount: f64,
    pub tax_amount: f64,
    pub round_off: f64,
    pub total_amount: f64,
    pub paid_amount: f64,
    pub payment_method: String,
    pub payment_breakdown: PosPaymentBreakdown,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct B2bInvoiceResult {
    pub invoice_id: String,
    pub invoice_no: String,
    pub total_amount: f64,
    pub execution_time_ms: f64,
    pub created_at: String,
}

/// Fetch available batches for a product with expiry dates & batch stock
#[tauri::command]
pub fn get_product_batches(
    db: State<'_, DatabaseState>,
    product_id: String,
) -> Result<Vec<ProductBatch>, String> {
    let conn = db.conn.lock();

    let mut stmt = conn
        .prepare(
            "SELECT id, product_id, batch_no, mfg_date, exp_date, mrp, wholesale_price, stock_qty, is_active
             FROM product_batches
             WHERE product_id = ?1 AND is_active = 1
             ORDER BY exp_date ASC, batch_no ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([&product_id], |r| {
            let is_active_int: i32 = r.get(8)?;
            Ok(ProductBatch {
                id: r.get(0)?,
                product_id: r.get(1)?,
                batch_no: r.get(2)?,
                mfg_date: r.get(3)?,
                exp_date: r.get(4)?,
                mrp: r.get(5)?,
                wholesale_price: r.get(6)?,
                stock_qty: r.get(7)?,
                is_active: is_active_int == 1,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut batches = Vec::new();
    for r in rows {
        batches.push(r.map_err(|e| e.to_string())?);
    }

    Ok(batches)
}

/// Fetch tiered volume pricing slabs for a product
#[tauri::command]
pub fn get_product_pricing_slabs(
    db: State<'_, DatabaseState>,
    product_id: String,
) -> Result<Vec<PricingSlab>, String> {
    let conn = db.conn.lock();

    let mut stmt = conn
        .prepare(
            "SELECT id, product_id, min_qty, max_qty, slab_price, label
             FROM pricing_slabs
             WHERE product_id = ?1
             ORDER BY min_qty ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([&product_id], |r| {
            Ok(PricingSlab {
                id: r.get(0)?,
                product_id: r.get(1)?,
                min_qty: r.get(2)?,
                max_qty: r.get(3)?,
                slab_price: r.get(4)?,
                label: r.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut slabs = Vec::new();
    for r in rows {
        slabs.push(r.map_err(|e| e.to_string())?);
    }

    Ok(slabs)
}

/// Create B2B Wholesale Invoice or Delivery Challan Atomically
#[tauri::command]
pub fn create_b2b_wholesale_invoice(
    db: State<'_, DatabaseState>,
    input: B2bInvoiceInput,
) -> Result<B2bInvoiceResult, String> {
    let start = Instant::now();
    if input.items.is_empty() {
        return Err("Wholesale order must contain at least one line item".to_string());
    }

    let mut conn = db.conn.lock();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Generate Sequential Wholesale Invoice / Challan Number
    let is_challan = input.invoice_type == "DELIVERY_CHALLAN";
    let prefix = if is_challan { "DC-2627-" } else { "WS-2627-" };

    let next_seq: i64 = tx
        .query_row(
            "SELECT COALESCE(CAST(value AS INTEGER), 1) FROM system_config WHERE key = 'next_wholesale_seq'",
            [],
            |r| r.get(0),
        )
        .unwrap_or(1);

    let invoice_no = format!("{}{:04}", prefix, next_seq);

    // Increment wholesale sequence counter
    tx.execute(
        "UPDATE system_config SET value = ?1, updated_at = CURRENT_TIMESTAMP WHERE key = 'next_wholesale_seq'",
        rusqlite::params![(next_seq + 1).to_string()],
    )
    .map_err(|e| e.to_string())?;

    // 2. Insert Invoice Header with B2B Details
    let invoice_id = format!("b2b-{}", chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0));
    let payment_json = serde_json::to_string(&input.payment_breakdown).unwrap_or_default();
    let status = if is_challan {
        "CHALLAN_DISPATCHED"
    } else if input.paid_amount >= input.total_amount {
        "PAID"
    } else {
        "CREDIT"
    };

    tx.execute(
        "INSERT INTO invoices (
            id, invoice_no, store_id, customer_id, customer_name, customer_phone, subtotal, discount_amount, tax_amount, round_off, total_amount, paid_amount, payment_method, payment_breakdown_json, status, notes, invoice_type, buyer_gstin, place_of_supply, transport_mode, vehicle_no, is_interstate
        ) VALUES (
            ?1, ?2, 'store-main', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21
        )",
        rusqlite::params![
            invoice_id,
            invoice_no,
            input.customer_id,
            input.customer_name,
            input.customer_phone,
            input.subtotal,
            input.discount_amount,
            input.tax_amount,
            input.round_off,
            input.total_amount,
            input.paid_amount,
            input.payment_method,
            payment_json,
            status,
            input.notes,
            input.invoice_type,
            input.buyer_gstin,
            input.place_of_supply,
            input.transport_mode,
            input.vehicle_no,
            if input.is_interstate { 1 } else { 0 }
        ],
    )
    .map_err(|e| format!("Failed to insert B2B invoice: {}", e))?;

    // 3. Insert Line Items with Batch and Tax split
    for (idx, item) in input.items.iter().enumerate() {
        let item_id = format!("item-b2b-{}-{}", invoice_id, idx);
        tx.execute(
            "INSERT INTO invoice_items (
                id, invoice_id, product_id, product_name, barcode, hsn_code, qty, unit, unit_price, discount_amount, tax_rate, tax_amount, total_amount, batch_no, exp_date, igst_amount
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16
            )",
            rusqlite::params![
                item_id,
                invoice_id,
                item.product_id,
                item.product_name,
                item.barcode,
                item.hsn_code,
                item.qty,
                item.unit,
                item.unit_price,
                item.discount_amount,
                item.tax_rate,
                item.tax_amount,
                item.total_amount,
                item.batch_no,
                item.exp_date,
                item.igst_amount
            ],
        )
        .map_err(|e| format!("Failed to insert B2B invoice item: {}", e))?;

        // Deduct batch stock if batch_no is provided
        if let Some(ref batch) = item.batch_no {
            tx.execute(
                "UPDATE product_batches SET stock_qty = stock_qty - ?1 WHERE product_id = ?2 AND batch_no = ?3",
                rusqlite::params![item.qty, item.product_id, batch],
            )
            .map_err(|e| format!("Failed to deduct batch stock: {}", e))?;
        }

        // Deduct master product stock
        tx.execute(
            "UPDATE products SET stock_qty = stock_qty - ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            rusqlite::params![item.qty, item.product_id],
        )
        .map_err(|e| format!("Failed to deduct product master stock: {}", e))?;
    }

    // 4. Update Customer Khata if Credit was utilized
    if input.payment_breakdown.credit > 0.0 && input.customer_id != "cust-walkin" {
        let prev_balance: f64 = tx
            .query_row(
                "SELECT current_balance FROM customers WHERE id = ?1",
                [&input.customer_id],
                |r| r.get(0),
            )
            .unwrap_or(0.0);

        let new_balance = prev_balance + input.payment_breakdown.credit;

        tx.execute(
            "UPDATE customers SET current_balance = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            rusqlite::params![new_balance, input.customer_id],
        )
        .map_err(|e| format!("Failed to update customer balance: {}", e))?;

        let khata_id = format!("khata-b2b-{}", chrono::Utc::now().timestamp_millis());
        tx.execute(
            "INSERT INTO khata_entries (
                id, customer_id, entry_type, amount, balance_after, payment_method, invoice_id, reference_no, notes
            ) VALUES (?1, ?2, 'DEBIT', ?3, ?4, 'CREDIT', ?5, ?6, ?7)",
            rusqlite::params![
                khata_id,
                input.customer_id,
                input.payment_breakdown.credit,
                new_balance,
                invoice_id,
                invoice_no,
                "B2B Wholesale credit invoice"
            ],
        )
        .map_err(|e| format!("Failed to record wholesale khata entry: {}", e))?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    let elapsed = start.elapsed().as_secs_f64() * 1000.0;
    let now_str = chrono::Utc::now().to_rfc3339();

    Ok(B2bInvoiceResult {
        invoice_id,
        invoice_no,
        total_amount: input.total_amount,
        execution_time_ms: (elapsed * 100.0).round() / 100.0,
        created_at: now_str,
    })
}
