// src-tauri/src/types.rs
use crate::config::Config;
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

/// 单文件元信息（结果页文件列表用，仅前 N 张读详情）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMeta {
    pub name: String,
    pub path: String, // 文件绝对路径（结果页缩略图用 convertFileSrc 渲染）
    pub format: String, // JPEG/PNG/HEIC...
    pub size_bytes: u64,
    pub width: u32,  // 0 表示未读取（读取失败不阻塞扫描）
    pub height: u32,
    pub status: String, // "转 JPEG" / "去除 EXIF" / "无需转换"
}

/// 不支持格式的分组详情（结果页「兼容性问题与警告」用）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnsupportedGroup {
    pub ext: String,        // ".psd"
    pub label: String,      // "PSD 设计源文件"
    pub count: u32,
    pub files: Vec<String>, // 样例文件名（最多若干个）
}

/// 扫描阶段的警告聚合
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanWarnings {
    pub heic_count: u32,     // iPhone 照片数（老系统普遍不支持）
    pub corrupt_count: u32,  // 扫描阶段通常 0（需解码才知损坏）
    pub unsupported_groups: Vec<UnsupportedGroup>,
}

/// 扫描结果(给前端扫描结果页 §5.3)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub total: u32,
    pub by_format: BTreeMap<String, u32>, // "JPEG": 202, "HEIC": 8, ...
    pub unsupported: Vec<String>,         // 不支持格式的文件名（扁平清单，保留兼容）
    pub unsupported_groups: Vec<UnsupportedGroup>, // 分组详情
    pub source_dir: String,
    pub files_detail: Vec<FileMeta>, // 前 N 张文件详情（结果页列表）
    pub total_source_size: u64,      // 源文件总大小（字节）
    pub estimated_output_size: u64,  // 估算输出大小（按格式经验系数）
    pub warnings: ScanWarnings,
    #[serde(skip)]
    pub files: Vec<PathBuf>, // 供 worker 复用，不序列化给前端
}

/// 扫描进度事件（scan://progress，扫描中实时计数）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgress {
    pub found: u32,
    pub current_path: String,
}

/// 处理进度事件(§10.4-10.7)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressEvent {
    pub done: u32,
    pub total: u32,
    pub failed: u32,
    pub skipped: u32,
    pub current: String,
    pub current_op: String, // 当前操作描述，如 "PNG → JPEG · 转换"
    pub elapsed_secs: f64,  // 已用时间
    pub speed: f64,         // 速度（张/秒）
    pub remain_secs: f64,   // 预计剩余
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
    pub output_dir: String,       // 完整输出路径
    pub duration_secs: f64,       // 处理用时
    pub avg_speed: f64,           // 平均速度（张/秒）
    pub output_size: u64,         // 输出总大小（字节）
    pub output_file_count: u32,   // 输出文件数
    pub settings: Config,         // 已应用配置快照
}

/// 实时日志条目（process://log）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub ts: String,    // 格式化时间戳 HH:MM:SS
    pub level: String, // "ok"|"warn"|"err"|"info"
    pub msg: String,
}
