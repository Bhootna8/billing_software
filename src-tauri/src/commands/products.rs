use crate::db::DatabaseState;
use serde::{Deserialize, Serialize};
use std::time::Instant;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Product {
    pub id: String,
    pub barcode: Option<String>,
    pub sku: Option<String>,
    pub name: String,
    pub category: Option<String>,
    pub brand: Option<String>,
    pub unit: String,
    pub hsn_code: Option<String>,
    pub tax_rate: f64,
    pub purchase_price: f64,
    pub mrp: f64,
    pub selling_price: f64,
    pub wholesale_price: f64,
    pub stock_qty: f64,
    pub min_stock_alert: f64,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NewProductInput {
    pub barcode: Option<String>,
    pub sku: Option<String>,
    pub name: String,
    pub category: Option<String>,
    pub brand: Option<String>,
    pub unit: Option<String>,
    pub hsn_code: Option<String>,
    pub tax_rate: Option<f64>,
    pub purchase_price: Option<f64>,
    pub mrp: Option<f64>,
    pub selling_price: f64,
    pub wholesale_price: Option<f64>,
    pub stock_qty: Option<f64>,
    pub min_stock_alert: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProductInput {
    pub id: String,
    pub barcode: Option<String>,
    pub sku: Option<String>,
    pub name: String,
    pub category: Option<String>,
    pub brand: Option<String>,
    pub unit: Option<String>,
    pub hsn_code: Option<String>,
    pub tax_rate: Option<f64>,
    pub purchase_price: Option<f64>,
    pub mrp: Option<f64>,
    pub selling_price: f64,
    pub wholesale_price: Option<f64>,
    pub stock_qty: Option<f64>,
    pub min_stock_alert: Option<f64>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub products: Vec<Product>,
    pub execution_time_ms: f64,
    pub total_found: usize,
}

/// Fast lookup: Search by Barcode, SKU, or Name with sub-millisecond indexed response
#[tauri::command]
pub fn search_products(
    db: State<'_, DatabaseState>,
    query: String,
    limit: Option<usize>,
) -> Result<SearchResult, String> {
    let start = Instant::now();
    let conn = db.conn.lock();
    let max_limit = limit.unwrap_or(50).min(200);

    let trimmed = query.trim();
    let sql = if trimmed.is_empty() {
        "SELECT id, barcode, sku, name, category, brand, unit, hsn_code, tax_rate, purchase_price, mrp, selling_price, wholesale_price, stock_qty, min_stock_alert, is_active, created_at, updated_at
         FROM products
         WHERE is_active = 1
         ORDER BY name ASC
         LIMIT ?1"
    } else {
        "SELECT id, barcode, sku, name, category, brand, unit, hsn_code, tax_rate, purchase_price, mrp, selling_price, wholesale_price, stock_qty, min_stock_alert, is_active, created_at, updated_at
         FROM products
         WHERE is_active = 1 AND (
             barcode = ?1 
             OR sku LIKE ?2 
             OR name LIKE ?2
             OR category LIKE ?2
         )
         ORDER BY 
             CASE WHEN barcode = ?1 THEN 0
                  WHEN sku = ?1 THEN 1
                  WHEN name LIKE ?3 THEN 2
                  ELSE 3 END,
             name ASC
         LIMIT ?4"
    };

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    let rows = if trimmed.is_empty() {
        stmt.query_map([max_limit as i64], map_product_row)
            .map_err(|e| e.to_string())?
    } else {
        let pattern_any = format!("%{}%", trimmed);
        let pattern_prefix = format!("{}%", trimmed);
        stmt.query_map(
            rusqlite::params![trimmed, pattern_any, pattern_prefix, max_limit as i64],
            map_product_row,
        )
        .map_err(|e| e.to_string())?
    };

    let mut products = Vec::new();
    for row in rows {
        products.push(row.map_err(|e| e.to_string())?);
    }

    let elapsed = start.elapsed().as_secs_f64() * 1000.0;
    let total_found = products.len();

    Ok(SearchResult {
        products,
        execution_time_ms: (elapsed * 100.0).round() / 100.0,
        total_found,
    })
}

/// Instant Barcode lookup (Exact match optimized)
#[tauri::command]
pub fn get_product_by_barcode(
    db: State<'_, DatabaseState>,
    barcode: String,
) -> Result<Option<Product>, String> {
    let conn = db.conn.lock();
    let mut stmt = conn
        .prepare(
            "SELECT id, barcode, sku, name, category, brand, unit, hsn_code, tax_rate, purchase_price, mrp, selling_price, wholesale_price, stock_qty, min_stock_alert, is_active, created_at, updated_at
             FROM products
             WHERE barcode = ?1 AND is_active = 1
             LIMIT 1",
        )
        .map_err(|e| e.to_string())?;

    let mut rows = stmt
        .query_map([barcode.trim()], map_product_row)
        .map_err(|e| e.to_string())?;

    if let Some(row) = rows.next() {
        Ok(Some(row.map_err(|e| e.to_string())?))
    } else {
        Ok(None)
    }
}

/// Create a new Product
#[tauri::command]
pub fn create_product(
    db: State<'_, DatabaseState>,
    input: NewProductInput,
) -> Result<Product, String> {
    let conn = db.conn.lock();
    let new_id = format!("prod-{}", chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0));

    let barcode = input.barcode.as_deref().map(str::trim).filter(|s| !s.is_empty());
    let sku = input.sku.as_deref().map(str::trim).filter(|s| !s.is_empty());
    let name = input.name.trim();

    if name.is_empty() {
        return Err("Product name cannot be empty".to_string());
    }

    let unit = input.unit.unwrap_or_else(|| "PCS".to_string());
    let category = input.category.unwrap_or_else(|| "General".to_string());
    let tax_rate = input.tax_rate.unwrap_or(0.0);
    let purchase_price = input.purchase_price.unwrap_or(0.0);
    let mrp = input.mrp.unwrap_or(input.selling_price);
    let wholesale_price = input.wholesale_price.unwrap_or(input.selling_price);
    let stock_qty = input.stock_qty.unwrap_or(0.0);
    let min_stock_alert = input.min_stock_alert.unwrap_or(5.0);

    conn.execute(
        "INSERT INTO products (
            id, barcode, sku, name, category, brand, unit, hsn_code, tax_rate, purchase_price, mrp, selling_price, wholesale_price, stock_qty, min_stock_alert, is_active
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, 1
        )",
        rusqlite::params![
            new_id,
            barcode,
            sku,
            name,
            category,
            input.brand,
            unit,
            input.hsn_code,
            tax_rate,
            purchase_price,
            mrp,
            input.selling_price,
            wholesale_price,
            stock_qty,
            min_stock_alert
        ],
    )
    .map_err(|e| format!("Failed to create product: {}", e))?;

    // Fetch and return the newly created product
    drop(conn);
    get_product_by_id(&db, &new_id)
}

/// Update an existing Product
#[tauri::command]
pub fn update_product(
    db: State<'_, DatabaseState>,
    input: UpdateProductInput,
) -> Result<Product, String> {
    let conn = db.conn.lock();

    let barcode = input.barcode.as_deref().map(str::trim).filter(|s| !s.is_empty());
    let sku = input.sku.as_deref().map(str::trim).filter(|s| !s.is_empty());
    let name = input.name.trim();

    if name.is_empty() {
        return Err("Product name cannot be empty".to_string());
    }

    conn.execute(
        "UPDATE products SET
            barcode = ?1,
            sku = ?2,
            name = ?3,
            category = ?4,
            brand = ?5,
            unit = COALESCE(?6, unit),
            hsn_code = ?7,
            tax_rate = COALESCE(?8, tax_rate),
            purchase_price = COALESCE(?9, purchase_price),
            mrp = COALESCE(?10, mrp),
            selling_price = ?11,
            wholesale_price = COALESCE(?12, wholesale_price),
            stock_qty = COALESCE(?13, stock_qty),
            min_stock_alert = COALESCE(?14, min_stock_alert),
            is_active = COALESCE(?15, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?16",
        rusqlite::params![
            barcode,
            sku,
            name,
            input.category,
            input.brand,
            input.unit,
            input.hsn_code,
            input.tax_rate,
            input.purchase_price,
            input.mrp,
            input.selling_price,
            input.wholesale_price,
            input.stock_qty,
            input.min_stock_alert,
            input.is_active.map(|b| if b { 1 } else { 0 }),
            input.id
        ],
    )
    .map_err(|e| format!("Failed to update product: {}", e))?;

    drop(conn);
    get_product_by_id(&db, &input.id)
}

/// Soft delete product
#[tauri::command]
pub fn delete_product(db: State<'_, DatabaseState>, id: String) -> Result<bool, String> {
    let conn = db.conn.lock();
    let rows_affected = conn
        .execute(
            "UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            [&id],
        )
        .map_err(|e| e.to_string())?;

    Ok(rows_affected > 0)
}

/// Batch Import Products
#[tauri::command]
pub fn batch_import_products(
    db: State<'_, DatabaseState>,
    products: Vec<NewProductInput>,
) -> Result<usize, String> {
    let mut conn = db.conn.lock();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    let mut imported = 0;
    for (idx, p) in products.into_iter().enumerate() {
        let name = p.name.trim();
        if name.is_empty() {
            continue;
        }

        let new_id = format!("prod-import-{}-{}", chrono::Utc::now().timestamp_millis(), idx);
        let barcode = p.barcode.as_deref().map(str::trim).filter(|s| !s.is_empty());
        let sku = p.sku.as_deref().map(str::trim).filter(|s| !s.is_empty());
        let unit = p.unit.unwrap_or_else(|| "PCS".to_string());
        let category = p.category.unwrap_or_else(|| "General".to_string());
        let tax_rate = p.tax_rate.unwrap_or(0.0);
        let purchase_price = p.purchase_price.unwrap_or(0.0);
        let mrp = p.mrp.unwrap_or(p.selling_price);
        let wholesale_price = p.wholesale_price.unwrap_or(p.selling_price);
        let stock_qty = p.stock_qty.unwrap_or(0.0);
        let min_stock_alert = p.min_stock_alert.unwrap_or(5.0);

        tx.execute(
            "INSERT INTO products (
                id, barcode, sku, name, category, brand, unit, hsn_code, tax_rate, purchase_price, mrp, selling_price, wholesale_price, stock_qty, min_stock_alert, is_active
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, 1
            )",
            rusqlite::params![
                new_id,
                barcode,
                sku,
                name,
                category,
                p.brand,
                unit,
                p.hsn_code,
                tax_rate,
                purchase_price,
                mrp,
                p.selling_price,
                wholesale_price,
                stock_qty,
                min_stock_alert
            ],
        )
        .map_err(|e| format!("Error at row {}: {}", idx + 1, e))?;

        imported += 1;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(imported)
}

// Internal helper function
fn get_product_by_id(db: &DatabaseState, id: &str) -> Result<Product, String> {
    let conn = db.conn.lock();
    let mut stmt = conn
        .prepare(
            "SELECT id, barcode, sku, name, category, brand, unit, hsn_code, tax_rate, purchase_price, mrp, selling_price, wholesale_price, stock_qty, min_stock_alert, is_active, created_at, updated_at
             FROM products
             WHERE id = ?1
             LIMIT 1",
        )
        .map_err(|e| e.to_string())?;

    stmt.query_row([id], map_product_row)
        .map_err(|e| format!("Product not found: {}", e))
}

fn map_product_row(row: &rusqlite::Row) -> rusqlite::Result<Product> {
    let is_active_int: i32 = row.get(15)?;
    Ok(Product {
        id: row.get(0)?,
        barcode: row.get(1)?,
        sku: row.get(2)?,
        name: row.get(3)?,
        category: row.get(4)?,
        brand: row.get(5)?,
        unit: row.get(6)?,
        hsn_code: row.get(7)?,
        tax_rate: row.get(8)?,
        purchase_price: row.get(9)?,
        mrp: row.get(10)?,
        selling_price: row.get(11)?,
        wholesale_price: row.get(12)?,
        stock_qty: row.get(13)?,
        min_stock_alert: row.get(14)?,
        is_active: is_active_int == 1,
        created_at: row.get(16)?,
        updated_at: row.get(17)?,
    })
}
