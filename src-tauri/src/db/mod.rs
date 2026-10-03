pub mod migrations;

use parking_lot::Mutex;
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

#[derive(Clone)]
pub struct DatabaseState {
    pub conn: Arc<Mutex<Connection>>,
}

impl DatabaseState {
    pub fn new(app: &AppHandle) -> Result<Self, Box<dyn std::error::Error>> {
        // Resolve persistent local app data directory
        let app_dir = app
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| PathBuf::from("./data"));

        std::fs::create_dir_all(&app_dir)?;
        let db_path = app_dir.join("billing_enterprise.db");

        let mut conn = Connection::open(&db_path)?;
        
        // Execute migrations
        migrations::run_migrations(&mut conn)?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }
}
