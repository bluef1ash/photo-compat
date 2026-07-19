// src-tauri/src/types.rs
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::PathBuf;

/// 处理进度状态（强类型枚举，杜绝后端拼写错导致前端运行时不匹配）
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ProgressState {
    Running,
    Paused,
    Done,
    Cancelled,
}

/// 扫描结果(给前端扫描结果页 §5.3)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub total: u32,
    pub by_format: BTreeMap<String, u32>, // "JPEG": 202, "HEIC": 8, ...
    pub unsupported: Vec<String>,         // 不支持格式的文件名
    pub source_dir: String,
    #[serde(skip)]
    pub files: Vec<PathBuf>, // 供 worker 复用，不序列化给前端
}

/// 处理进度事件(§10.4-10.7)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressEvent {
    pub done: u32,
    pub total: u32,
    pub failed: u32,
    pub skipped: u32,
    pub current: String,
    pub state: ProgressState,
}

/// 处理结果摘要(§10.12)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessSummary {
    pub total: u32,
    pub done: u32,
    pub failed: u32,
    pub skipped: u32,
    pub cancelled: bool,
}
