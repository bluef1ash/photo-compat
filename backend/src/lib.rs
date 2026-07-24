pub mod error;
#[allow(dead_code)]
pub mod log;
pub mod config;
pub mod types;
pub mod pipeline;
pub mod state;
pub mod commands;

use config::Config;
use state::AppState;
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // 配置优先：先加载（拿 log_level），再据此初始化日志
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("无法获取 app_data_dir 目录");
            let config = Config::load(&data_dir);

            let log_dir = data_dir.join("logs");
            let (_guard, reload_fn) = log::init(log_dir.clone(), &config.log_level);
            log::cleanup_old_logs(&log_dir, config.log_retention_days);
            app.manage(_guard); // 保活

            app.manage(AppState::new(config, reload_fn));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::scan_directory_cmd,
            commands::start_process_cmd,
            commands::cancel_process_cmd,
            commands::pause_process_cmd,
            commands::resume_process_cmd,
            commands::open_output_cmd,
            commands::load_settings_cmd,
            commands::save_settings_cmd,
            commands::open_log_cmd,
            commands::export_log_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
