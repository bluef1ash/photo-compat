// src-tauri/src/commands.rs
use crate::config::Config;
use crate::pipeline::scan::scan_directory;
use crate::pipeline::worker::run_pipeline;
use crate::state::{AppState, JobHandle};
use crate::types::{ProcessSummary, ScanResult};
use std::path::PathBuf;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};

#[tauri::command]
pub async fn scan_directory_cmd(path: String) -> Result<ScanResult, crate::error::AppError> {
    scan_directory(&PathBuf::from(&path))
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
        let summary: ProcessSummary =
            run_pipeline(files, &source_root, &out_root, &config, Some(app_clone), &cancel, &paused);
        // 完成后清理 job 句柄（state 已 move，通过 app 获取）
        if let Some(app_state) = app.try_state::<AppState>() {
            app_state.clear_job();
        }
        let _ = app.emit("process://summary", summary);
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
