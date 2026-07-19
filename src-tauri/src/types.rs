// src-tauri/src/types.rs
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// 扫描结果(给前端扫描结果页 §5.3)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub total: u32,
    pub by_format: BTreeMap<String, u32>, // "JPEG": 202, "HEIC": 8, ...
    pub unsupported: Vec<String>,         // 不支持格式的文件名
    pub source_dir: String,
}
