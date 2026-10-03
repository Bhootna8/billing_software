use crate::db::DatabaseState;
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PosInvoiceItemInput {
    pub product_id: String,
    pub product_name: String,
    pub barcode: Option<String>,
    pub hsn_code: Option<String>,
    pub qty: f64,
    pub unit: String,
    pub unit_price: f64,
    pub discount_amount: f64,
    pub tax_rate: f64,
    pub tax_amount: f64,
    pub total_amount: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PosPaymentBreakdown {
    pub cash: f64,
    pub upi: f64,
    pub card: f64,
    pub credit: f64,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PosInvoiceInput {
    pub customer_id: String,
    pub customer_name: String,
    pub customer_phone: Option<String>,
    pub items: Vec<PosInvoiceItemInput>,
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
pub struct PosInvoiceResult {
    pub invoice_id: String,
    pub invoice_no: String,
    pub total_amount: f64,
    pub execution_time_ms: f64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvoiceSummary {
    pub id: String,
    pub invoice_no: String,
    pub customer_name: String,
    pub customer_phone: Option<String>,
    pub total_amount: f64,
    pub paid_amount: f64,
    pub payment_method: String,
    pub status: String,
    pub items_count: usize,
    pub created_at: String,
}

/// Create POS Invoice atomically: Writes header, line items, reduces inventory stock, and updates customer khata
#[tauri::command]
pub fn create_pos_invoice(
    db: State<'_, DatabaseState>,
    input: PosInvoiceInput,
) -> Result<PosInvoiceResult, String> {
    let start = Instant::now();
    if input.items.is_empty() {
        return Err("Cannot create invoice with zero items".to_string());
    }

    let mut conn = db.conn.lock();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Generate Sequential Invoice Number (e.g., INV-2627-0001)
    let prefix: String = tx
        .query_row(
            "SELECT value FROM system_config WHERE key = 'invoice_prefix'",
            [],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| "INV-2627-".to_string());

    let next_seq: i64 = tx
        .query_row(
            "SELECT COALESCE(CAST(value AS INTEGER), 1) FROM system_config WHERE key = 'next_invoice_seq'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(1);

    let invoice_no = format!("{}{:04}", prefix, next_seq);

    // Update sequence counter
    tx.execute(
        "UPDATE system_config SET value = ?1, updated_at = CURRENT_TIMESTAMP WHERE key = 'next_invoice_seq'",
        rusqlite::params![(next_seq + 1).to_string()],
    )
    .map_err(|e| e.to_string())?;

    // 2. Insert Invoice Header
    let invoice_id = format!("inv-{}", chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0));
    let payment_json = serde_json::to_string(&input.payment_breakdown).unwrap_or_default();
    let status = if input.paid_amount >= input.total_amount {
        "PAID"
    } else if input.payment_breakdown.credit > 0.0 {
        "CREDIT"
    } else {
        "PARTIAL"
    };

    tx.execute(
        "INSERT INTO invoices (
            id, invoice_no, store_id, customer_id, customer_name, customer_phone, subtotal, discount_amount, tax_amount, round_off, total_amount, paid_amount, payment_method, payment_breakdown_json, status, notes
        ) VALUES (
            ?1, ?2, 'store-main', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15
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
            input.notes
        ],
    )
    .map_err(|e| format!("Failed to insert invoice: {}", e))?;

    // 3. Insert Line Items and Deduct Inventory Stock Atomically
    for (idx, item) in input.items.iter().enumerate() {
        let item_id = format!("item-{}-{}", invoice_id, idx);
        tx.execute(
            "INSERT INTO invoice_items (
                id, invoice_id, product_id, product_name, barcode, hsn_code, qty, unit, unit_price, discount_amount, tax_rate, tax_amount, total_amount
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13
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
                item.total_amount
            ],
        )
        .map_err(|e| format!("Failed to insert invoice item {}: {}", idx + 1, e))?;

        // Deduct inventory stock
        tx.execute(
            "UPDATE products SET stock_qty = stock_qty - ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            rusqlite::params![item.qty, item.product_id],
        )
        .map_err(|e| format!("Failed to deduct stock for {}: {}", item.product_name, e))?;
    }

    // 4. Update Customer Khata / Credit Balance & Record DEBIT Entry if credit payment was used
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
        .map_err(|e| format!("Failed to update customer credit balance: {}", e))?;

        let khata_id = format!("khata-inv-{}", chrono::Utc::now().timestamp_millis());
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
                "Credit billing sale on POS"
            ],
        )
        .map_err(|e| format!("Failed to record credit khata entry: {}", e))?;
    }

    tx.commit().map_err(|e| e.to_string())?;

    let elapsed = start.elapsed().as_secs_f64() * 1000.0;
    let now_str = chrono::Utc::now().to_rfc3339();

    Ok(PosInvoiceResult {
        invoice_id,
        invoice_no,
        total_amount: input.total_amount,
        execution_time_ms: (elapsed * 100.0).round() / 100.0,
        created_at: now_str,
    })
}

/// Get recent invoices for quick reprint & activity monitor
#[tauri::command]
pub fn get_recent_invoices(
    db: State<'_, DatabaseState>,
    limit: Option<usize>,
) -> Result<Vec<InvoiceSummary>, String> {
    let conn = db.conn.lock();
    let max_limit = limit.unwrap_or(20).min(100);

    let mut stmt = conn
        .prepare(
            "SELECT i.id, i.invoice_no, i.customer_name, i.customer_phone, i.total_amount, i.paid_amount, i.payment_method, i.status, i.created_at,
                    (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) as items_count
             FROM invoices i
             ORDER BY i.created_at DESC
             LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([max_limit as i64], |row| {
            let count_i64: i64 = row.get(9)?;
            Ok(InvoiceSummary {
                id: row.get(0)?,
                invoice_no: row.get(1)?,
                customer_name: row.get(2)?,
                customer_phone: row.get(3)?,
                total_amount: row.get(4)?,
                paid_amount: row.get(5)?,
                payment_method: row.get(6)?,
                status: row.get(7)?,
                created_at: row.get(8)?,
                items_count: count_i64 as usize,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut invoices = Vec::new();
    for row in rows {
        invoices.push(row.map_err(|e| e.to_string())?);
    }

    Ok(invoices)
}
