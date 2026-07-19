// src-tauri/src/commands.rs
use crate::error::AppResult;
use crate::pipeline::scan::scan_directory;
use crate::types::ScanResult;
use std::path::PathBuf;

#[tauri::command]
pub async fn scan_directory_cmd(path: String) -> AppResult<ScanResult> {
    scan_directory(&PathBuf::from(&path))
}
