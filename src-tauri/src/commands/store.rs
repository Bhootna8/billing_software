use crate::db::DatabaseState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StoreProfile {
    pub id: String,
    pub name: String,
    pub code: String,
    pub gstin: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub pincode: Option<String>,
    pub state_code: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub tagline: Option<String>,
    pub terms_conditions: Option<String>,
    pub currency_symbol: String,
    pub financial_year: String,
    pub invoice_prefix: String,
    pub thermal_width: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StoreProfileInput {
    pub name: String,
    pub code: String,
    pub gstin: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub pincode: Option<String>,
    pub state_code: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub tagline: Option<String>,
    pub terms_conditions: Option<String>,
    pub currency_symbol: Option<String>,
    pub financial_year: Option<String>,
    pub invoice_prefix: Option<String>,
    pub thermal_width: Option<String>,
}

/// Fetch complete company store profile and system config
#[tauri::command]
pub fn get_store_profile(db: State<'_, DatabaseState>) -> Result<StoreProfile, String> {
    let conn = db.conn.lock();

    let (id, name, code, gstin, address, city, pincode, state_code, phone, email, tagline, terms_conditions): (
        String,
        String,
        String,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
    ) = conn
        .query_row(
            "SELECT id, name, code, gstin, address, city, pincode, state_code, phone, email, tagline, terms_conditions
             FROM stores WHERE id = 'store-main' LIMIT 1",
            [],
            |r| {
                Ok((
                    r.get(0)?,
                    r.get(1)?,
                    r.get(2)?,
                    r.get(3)?,
                    r.get(4)?,
                    r.get(5)?,
                    r.get(6)?,
                    r.get(7)?,
                    r.get(8)?,
                    r.get(9)?,
                    r.get(10)?,
                    r.get(11)?,
                ))
            },
        )
        .map_err(|e| e.to_string())?;

    // Fetch associated system config
    let currency_symbol: String = conn
        .query_row("SELECT value FROM system_config WHERE key = 'currency_symbol'", [], |r| r.get(0))
        .unwrap_or_else(|_| "₹".to_string());

    let financial_year: String = conn
        .query_row("SELECT value FROM system_config WHERE key = 'financial_year'", [], |r| r.get(0))
        .unwrap_or_else(|_| "2026-2027".to_string());

    let invoice_prefix: String = conn
        .query_row("SELECT value FROM system_config WHERE key = 'invoice_prefix'", [], |r| r.get(0))
        .unwrap_or_else(|_| "INV-2627-".to_string());

    let thermal_width: String = conn
        .query_row("SELECT value FROM system_config WHERE key = 'thermal_printer_width'", [], |r| r.get(0))
        .unwrap_or_else(|_| "80mm".to_string());

    Ok(StoreProfile {
        id,
        name,
        code,
        gstin,
        address,
        city,
        pincode,
        state_code: state_code.unwrap_or_else(|| "27-Maharashtra".to_string()),
        phone,
        email,
        tagline,
        terms_conditions,
        currency_symbol,
        financial_year,
        invoice_prefix,
        thermal_width,
    })
}

/// Update company store profile & settings
#[tauri::command]
pub fn update_store_profile(
    db: State<'_, DatabaseState>,
    input: StoreProfileInput,
) -> Result<StoreProfile, String> {
    let mut conn = db.conn.lock();
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE stores SET 
            name = ?1,
            code = ?2,
            gstin = ?3,
            address = ?4,
            city = ?5,
            pincode = ?6,
            state_code = ?7,
            phone = ?8,
            email = ?9,
            tagline = ?10,
            terms_conditions = ?11
         WHERE id = 'store-main';",
        rusqlite::params![
            input.name,
            input.code,
            input.gstin,
            input.address,
            input.city,
            input.pincode,
            input.state_code,
            input.phone,
            input.email,
            input.tagline,
            input.terms_conditions
        ],
    )
    .map_err(|e| e.to_string())?;

    if let Some(cur) = input.currency_symbol {
        tx.execute(
            "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('currency_symbol', ?1, CURRENT_TIMESTAMP)",
            [&cur],
        )
        .map_err(|e| e.to_string())?;
    }

    if let Some(fy) = input.financial_year {
        tx.execute(
            "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('financial_year', ?1, CURRENT_TIMESTAMP)",
            [&fy],
        )
        .map_err(|e| e.to_string())?;
    }

    if let Some(pfx) = input.invoice_prefix {
        tx.execute(
            "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('invoice_prefix', ?1, CURRENT_TIMESTAMP)",
            [&pfx],
        )
        .map_err(|e| e.to_string())?;
    }

    if let Some(tw) = input.thermal_width {
        tx.execute(
            "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('thermal_printer_width', ?1, CURRENT_TIMESTAMP)",
            [&tw],
        )
        .map_err(|e| e.to_string())?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    drop(conn);

    get_store_profile(db)
}

/// Check if first-time onboarding has been completed or skipped
#[tauri::command]
pub fn get_onboarding_status(db: State<'_, DatabaseState>) -> Result<bool, String> {
    let conn = db.conn.lock();
    let val: String = conn
        .query_row(
            "SELECT value FROM system_config WHERE key = 'onboarding_completed'",
            [],
            |r| r.get(0),
        )
        .unwrap_or_else(|_| "0".to_string());

    Ok(val == "1")
}

/// Complete first-time onboarding wizard and mark completed
#[tauri::command]
pub fn complete_onboarding(
    db: State<'_, DatabaseState>,
    input: StoreProfileInput,
) -> Result<StoreProfile, String> {
    let profile = update_store_profile(db.clone(), input)?;
    let conn = db.conn.lock();

    conn.execute(
        "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('onboarding_completed', '1', CURRENT_TIMESTAMP)",
        [],
    )
    .map_err(|e| e.to_string())?;

    Ok(profile)
}

/// Skip first-time onboarding wizard
#[tauri::command]
pub fn skip_onboarding(db: State<'_, DatabaseState>) -> Result<bool, String> {
    let conn = db.conn.lock();
    conn.execute(
        "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('onboarding_completed', '1', CURRENT_TIMESTAMP)",
        [],
    )
    .map_err(|e| e.to_string())?;

    Ok(true)
}
