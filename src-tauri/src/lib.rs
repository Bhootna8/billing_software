pub mod commands;
pub mod db;

use db::DatabaseState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Initialize SQLite Database State
            let db_state = DatabaseState::new(app.handle())
                .expect("Failed to initialize SQLite Database state");
            app.manage(db_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // System Commands
            commands::system::get_system_health,
            commands::system::ping_database,
            // Product Catalog Commands
            commands::products::search_products,
            commands::products::get_product_by_barcode,
            commands::products::create_product,
            commands::products::update_product,
            commands::products::delete_product,
            commands::products::batch_import_products,
            // POS Invoices & Customer Commands
            commands::invoices::create_pos_invoice,
            commands::invoices::get_recent_invoices,
            commands::customers::search_customers,
            commands::customers::create_customer,
            commands::customers::get_customer_ledger,
            commands::customers::record_khata_payment,
            commands::customers::update_customer_credit_limit,
            commands::customers::get_khata_summary,
            // Wholesale & B2B Invoicing Commands
            commands::wholesale::get_product_batches,
            commands::wholesale::get_product_pricing_slabs,
            commands::wholesale::create_b2b_wholesale_invoice,
            // Thermal ESC/POS Printing Commands
            commands::printing::get_printer_settings,
            commands::printing::save_printer_settings,
            commands::printing::list_system_printers,
            commands::printing::print_invoice_thermal,
            // Statutory GST Reports & Sync Commands
            commands::reports::get_gst_report_summary,
            commands::reports::export_tally_xml_sales,
            commands::reports::get_sync_status,
            commands::reports::trigger_store_sync,
            // Store Profile & Onboarding Commands
            commands::store::get_store_profile,
            commands::store::update_store_profile,
            commands::store::get_onboarding_status,
            commands::store::complete_onboarding,
            commands::store::skip_onboarding
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
