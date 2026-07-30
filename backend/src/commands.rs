// src-tauri/src/commands.rs
use crate::config::Config;
use crate::pipeline::scan::{scan_directory, scan_directory_with_app};
use crate::pipeline::worker::run_pipeline;
use crate::state::{AppState, JobHandle};
use crate::types::{ProcessSummary, ScanResult};
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};

#[tauri::command]
pub async fn scan_directory_cmd(
    path: String,
    app: AppHandle,
) -> Result<ScanResult, crate::error::AppError> {
    // 流式扫描：扫描中 emit `scan://progress`（已发现数 + 当前路径）
    scan_directory_with_app(&PathBuf::from(&path), Some(app))
}

/// 启动处理。立即返回，后台 spawn 处理；进度经事件上报。
#[tauri::command]
pub async fn start_process_cmd(
    source_dir: String,
    config: Config,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), crate::error::AppError> {
    let source_root = PathBuf::from(&source_dir);
    let out_root = source_root.join(&config.subfolder);

    // 内部重新扫描以获取 files 列表（不 emit，前端已在结果页看过扫描）
    let scan = scan_directory(&source_root)?;
    let files = scan.files.clone();

    let cancel = Arc::new(AtomicBool::new(false));
    let paused = Arc::new(AtomicBool::new(false));
    state.set_job(JobHandle {
        cancel: cancel.clone(),
        paused: paused.clone(),
    });

    let app_clone = app.clone();
    tokio::task::spawn_blocking(move || {
        let summary: ProcessSummary = run_pipeline(
            files,
            &source_root,
            &out_root,
            &config,
            Some(app_clone),
            &cancel,
            &paused,
        );
        // 完成后清理 job 句柄（state 已 move，通过 app 获取）
        if let Some(app_state) = app.try_state::<AppState>() {
            app_state.clear_job();
        }
        let _ = app.emit_all("process://summary", summary);
    });

    Ok(())
}

#[tauri::command]
pub async fn cancel_process_cmd(state: State<'_, AppState>) -> Result<bool, ()> {
    Ok(state.cancel_job())
}

#[tauri::command]
pub async fn pause_process_cmd(state: State<'_, AppState>) -> Result<bool, ()> {
    Ok(state.set_paused(true))
}

#[tauri::command]
pub async fn resume_process_cmd(state: State<'_, AppState>) -> Result<bool, ()> {
    Ok(state.set_paused(false))
}

#[tauri::command]
pub async fn open_output_cmd(path: String) -> Result<(), String> {
    opener::open(&path).map_err(|e| e.to_string())
}

/// 读取当前配置（设置页加载用）
#[tauri::command]
pub async fn load_settings_cmd(state: State<'_, AppState>) -> Result<Config, ()> {
    Ok(state.config.lock().unwrap().clone())
}

/// 保存配置：更新内存 + 持久化到 app_data_dir/config.json
#[tauri::command]
pub async fn save_settings_cmd(
    config: Config,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    {
        let mut cfg = state.config.lock().unwrap();
        *cfg = config.clone();
    }
    // 运行时重载日志级别（reload EnvFilter，无需重启 app）
    (state.reload_log_level)(&config.log_level);
    if let Some(dir) = tauri::api::path::app_data_dir(&app.config()) {
        config.save(&dir);
    }
    Ok(())
}

/// 在系统资源管理器/默认编辑器中打开最新日志文件（无则打开 logs 目录）
#[tauri::command]
pub async fn open_log_cmd(app: AppHandle) -> Result<(), String> {
    let dir = tauri::api::path::app_data_dir(&app.config())
        .ok_or("无法获取 app_data_dir".to_string())?
        .join("logs");
    let target = latest_log_file(&dir).unwrap_or_else(|| dir.to_string_lossy().to_string());
    opener::open(&target).map_err(|e| e.to_string())
}

/// 返回最新日志文件路径（供前端 toast 展示）；无则返回 logs 目录
#[tauri::command]
pub async fn export_log_cmd(app: AppHandle) -> Result<String, String> {
    let dir = tauri::api::path::app_data_dir(&app.config())
        .ok_or("无法获取 app_data_dir".to_string())?
        .join("logs");
    Ok(latest_log_file(&dir).unwrap_or_else(|| dir.to_string_lossy().to_string()))
}

/// 找 logs 目录下最新的 photo-compat 日志文件（tracing-appender 按天滚动，
/// 文件名形如 photo-compat.log.YYYY-MM-DD，按名称排序取末位即最新）
fn latest_log_file(dir: &Path) -> Option<String> {
    let mut paths: Vec<PathBuf> = std::fs::read_dir(dir)
        .ok()?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| {
            p.file_name()
                .map(|n| n.to_string_lossy().contains("photo-compat"))
                .unwrap_or(false)
        })
        .collect();
    paths.sort();
    paths.last().map(|p| p.to_string_lossy().to_string())
}
