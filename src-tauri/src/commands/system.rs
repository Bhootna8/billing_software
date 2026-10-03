use crate::db::DatabaseState;
use serde::Serialize;
use std::time::Instant;
use tauri::State;

#[derive(Serialize)]
pub struct SystemHealth {
    pub app_name: String,
    pub version: String,
    pub database_status: String,
    pub wal_mode_active: bool,
    pub active_store_id: String,
    pub uptime_seconds: u64,
}

#[derive(Serialize)]
pub struct DatabasePingResponse {
    pub connected: bool,
    pub latency_ms: u64,
    pub tables_count: usize,
}

#[tauri::command]
pub fn get_system_health(db: State<'_, DatabaseState>) -> Result<SystemHealth, String> {
    let conn = db.conn.lock();
    
    // Check WAL mode status
    let journal_mode: String = conn
        .query_row("PRAGMA journal_mode;", [], |row| row.get(0))
        .unwrap_or_else(|_| "unknown".to_string());

    Ok(SystemHealth {
        app_name: "Enterprise Billing & Retail OS".to_string(),
        version: "0.1.0".to_string(),
        database_status: "Connected (SQLite Engine)".to_string(),
        wal_mode_active: journal_mode.to_lowercase() == "wal",
        active_store_id: "store-main".to_string(),
        uptime_seconds: 1,
    })
}

#[tauri::command]
pub fn ping_database(db: State<'_, DatabaseState>) -> Result<DatabasePingResponse, String> {
    let start = Instant::now();
    let conn = db.conn.lock();

    // Query SQLite master tables count (reading as i64 then casting to usize)
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let latency_ms = start.elapsed().as_millis() as u64;

    Ok(DatabasePingResponse {
        connected: true,
        latency_ms,
        tables_count: count as usize,
    })
}
