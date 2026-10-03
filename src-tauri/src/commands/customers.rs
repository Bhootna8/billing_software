use crate::db::DatabaseState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Customer {
    pub id: String,
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub gstin: Option<String>,
    pub address: Option<String>,
    pub credit_limit: f64,
    pub current_balance: f64,
    pub loyalty_points: i64,
    pub is_active: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewCustomerInput {
    pub name: String,
    pub phone: String,
    pub gstin: Option<String>,
    pub credit_limit: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KhataEntry {
    pub id: String,
    pub customer_id: String,
    pub entry_type: String, // "DEBIT" (Bill credit) or "CREDIT" (Payment settlement)
    pub amount: f64,
    pub balance_after: f64,
    pub payment_method: String,
    pub invoice_id: Option<String>,
    pub reference_no: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecordPaymentInput {
    pub customer_id: String,
    pub amount: f64,
    pub payment_method: String, // "CASH", "UPI", "BANK_TRANSFER", "CHEQUE"
    pub reference_no: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KhataSummary {
    pub total_outstanding: f64,
    pub total_credit_customers: usize,
    pub total_settled_recent: f64,
}

/// Search customers by Name, Phone, or GSTIN (Sub-1ms)
#[tauri::command]
pub fn search_customers(
    db: State<'_, DatabaseState>,
    query: String,
) -> Result<Vec<Customer>, String> {
    let conn = db.conn.lock();
    let trimmed = query.trim();

    let sql = if trimmed.is_empty() {
        "SELECT id, name, phone, email, gstin, address, credit_limit, current_balance, loyalty_points, is_active, created_at
         FROM customers
         WHERE is_active = 1
         ORDER BY CASE WHEN id = 'cust-walkin' THEN 0 ELSE 1 END, current_balance DESC, name ASC
         LIMIT 50"
    } else {
        "SELECT id, name, phone, email, gstin, address, credit_limit, current_balance, loyalty_points, is_active, created_at
         FROM customers
         WHERE is_active = 1 AND (
             phone LIKE ?1 OR name LIKE ?1 OR gstin LIKE ?1
         )
         ORDER BY CASE WHEN id = 'cust-walkin' THEN 0 ELSE 1 END, current_balance DESC, name ASC
         LIMIT 50"
    };

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    let rows = if trimmed.is_empty() {
        stmt.query_map([], map_customer_row)
            .map_err(|e| e.to_string())?
    } else {
        let pattern = format!("%{}%", trimmed);
        stmt.query_map([pattern], map_customer_row)
            .map_err(|e| e.to_string())?
    };

    let mut customers = Vec::new();
    for row in rows {
        customers.push(row.map_err(|e| e.to_string())?);
    }

    Ok(customers)
}

/// Quick-add Customer
#[tauri::command]
pub fn create_customer(
    db: State<'_, DatabaseState>,
    input: NewCustomerInput,
) -> Result<Customer, String> {
    let conn = db.conn.lock();
    let name = input.name.trim();
    let phone = input.phone.trim();

    if name.is_empty() {
        return Err("Customer name is required".to_string());
    }

    let customer_id = format!("cust-{}", chrono::Utc::now().timestamp_millis());
    let credit_limit = input.credit_limit.unwrap_or(10000.0);

    conn.execute(
        "INSERT INTO customers (id, name, phone, gstin, credit_limit, current_balance)
         VALUES (?1, ?2, ?3, ?4, ?5, 0.0)",
        rusqlite::params![customer_id, name, phone, input.gstin, credit_limit],
    )
    .map_err(|e| format!("Failed to create customer: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, phone, email, gstin, address, credit_limit, current_balance, loyalty_points, is_active, created_at
             FROM customers WHERE id = ?1 LIMIT 1",
        )
        .map_err(|e| e.to_string())?;

    stmt.query_row([customer_id], map_customer_row)
        .map_err(|e| format!("Customer query error: {}", e))
}

/// Fetch complete Khata ledger history for a specific customer
#[tauri::command]
pub fn get_customer_ledger(
    db: State<'_, DatabaseState>,
    customer_id: String,
) -> Result<Vec<KhataEntry>, String> {
    let conn = db.conn.lock();

    let mut stmt = conn
        .prepare(
            "SELECT id, customer_id, entry_type, amount, balance_after, payment_method, invoice_id, reference_no, notes, created_at
             FROM khata_entries
             WHERE customer_id = ?1
             ORDER BY created_at DESC
             LIMIT 100",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([&customer_id], |row| {
            Ok(KhataEntry {
                id: row.get(0)?,
                customer_id: row.get(1)?,
                entry_type: row.get(2)?,
                amount: row.get(3)?,
                balance_after: row.get(4)?,
                payment_method: row.get(5)?,
                invoice_id: row.get(6)?,
                reference_no: row.get(7)?,
                notes: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut entries = Vec::new();
    for row in rows {
        entries.push(row.map_err(|e| e.to_string())?);
    }

    Ok(entries)
}

/// Record a payment settlement against customer's outstanding Khata balance atomically
#[tauri::command]
pub fn record_khata_payment(
    db: State<'_, DatabaseState>,
    input: RecordPaymentInput,
) -> Result<Customer, String> {
    if input.amount <= 0.0 {
        return Err("Payment amount must be greater than zero".to_string());
    }

    let mut conn = db.conn.lock();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Get current customer balance
    let current_balance: f64 = tx
        .query_row(
            "SELECT current_balance FROM customers WHERE id = ?1",
            [&input.customer_id],
            |r| r.get(0),
        )
        .map_err(|e| format!("Customer not found: {}", e))?;

    let new_balance = (current_balance - input.amount).max(0.0);
    let entry_id = format!("khata-pay-{}", chrono::Utc::now().timestamp_millis());

    // 2. Insert Khata CREDIT entry
    tx.execute(
        "INSERT INTO khata_entries (
            id, customer_id, entry_type, amount, balance_after, payment_method, reference_no, notes
        ) VALUES (?1, ?2, 'CREDIT', ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![
            entry_id,
            input.customer_id,
            input.amount,
            new_balance,
            input.payment_method,
            input.reference_no,
            input.notes
        ],
    )
    .map_err(|e| format!("Failed to record khata entry: {}", e))?;

    // 3. Update Customer balance
    tx.execute(
        "UPDATE customers SET current_balance = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        rusqlite::params![new_balance, input.customer_id],
    )
    .map_err(|e| format!("Failed to update customer balance: {}", e))?;

    tx.commit().map_err(|e| e.to_string())?;

    // 4. Return updated customer record
    let mut stmt = conn
        .prepare(
            "SELECT id, name, phone, email, gstin, address, credit_limit, current_balance, loyalty_points, is_active, created_at
             FROM customers WHERE id = ?1 LIMIT 1",
        )
        .map_err(|e| e.to_string())?;

    stmt.query_row([&input.customer_id], map_customer_row)
        .map_err(|e| format!("Query error: {}", e))
}

/// Update customer credit limit
#[tauri::command]
pub fn update_customer_credit_limit(
    db: State<'_, DatabaseState>,
    customer_id: String,
    credit_limit: f64,
) -> Result<Customer, String> {
    let conn = db.conn.lock();

    conn.execute(
        "UPDATE customers SET credit_limit = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        rusqlite::params![credit_limit, customer_id],
    )
    .map_err(|e| format!("Failed to update credit limit: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, phone, email, gstin, address, credit_limit, current_balance, loyalty_points, is_active, created_at
             FROM customers WHERE id = ?1 LIMIT 1",
        )
        .map_err(|e| e.to_string())?;

    stmt.query_row([&customer_id], map_customer_row)
        .map_err(|e| format!("Query error: {}", e))
}

/// Get aggregate Khata statistics (Total market credit, active credit accounts)
#[tauri::command]
pub fn get_khata_summary(db: State<'_, DatabaseState>) -> Result<KhataSummary, String> {
    let conn = db.conn.lock();

    let total_outstanding: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(current_balance), 0.0) FROM customers WHERE id != 'cust-walkin'",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0.0);

    let count_i64: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM customers WHERE id != 'cust-walkin' AND current_balance > 0.0",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    let settled_recent: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0.0) FROM khata_entries WHERE entry_type = 'CREDIT'",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0.0);

    Ok(KhataSummary {
        total_outstanding,
        total_credit_customers: count_i64 as usize,
        total_settled_recent: settled_recent,
    })
}

fn map_customer_row(row: &rusqlite::Row) -> rusqlite::Result<Customer> {
    let is_active_int: i32 = row.get(9)?;
    Ok(Customer {
        id: row.get(0)?,
        name: row.get(1)?,
        phone: row.get(2)?,
        email: row.get(3)?,
        gstin: row.get(4)?,
        address: row.get(5)?,
        credit_limit: row.get(6)?,
        current_balance: row.get(7)?,
        loyalty_points: row.get(8)?,
        is_active: is_active_int == 1,
        created_at: row.get(10)?,
    })
}
