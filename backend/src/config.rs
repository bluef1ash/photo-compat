// src-tauri/src/config.rs
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    // 兼容性(附录 A)
    pub remove_exif: bool,
    pub remove_icc: bool,
    pub auto_orient: bool,
    pub baseline_jpeg: bool,
    pub convert_heic: bool,
    pub to_srgb: bool,
    pub jpeg_quality: u8,
    pub max_width: u32,
    pub max_height: u32,
    // 输出(§5.6 输出分组)
    pub subfolder: String,
    pub overwrite: bool,
    pub keep_structure: bool,
    // 性能(§10.13)
    /// MVP:后端并行由 rayon 默认控制,此字段当前未生效;精确并行数控制是后续增量。
    pub parallel: usize,
    // 高级 / 通用（新字段，#[serde(default)] 兼容旧 config.json）
    #[serde(default = "default_log_level")]
    pub log_level: String, // "normal" | "verbose"
    #[serde(default = "default_log_retention_days")]
    pub log_retention_days: u32,
    #[serde(default)]
    pub temp_dir: Option<String>, // None=用系统默认；接线为后续增量
    #[serde(default)]
    pub last_folder: Option<String>, // 启动恢复上次文件夹（通用分组）
}

fn default_log_level() -> String {
    "normal".to_string()
}

fn default_log_retention_days() -> u32 {
    30
}

impl Default for Config {
    fn default() -> Self {
        Self {
            remove_exif: true,
            remove_icc: true,
            auto_orient: true,
            baseline_jpeg: true,
            convert_heic: true,
            to_srgb: true,
            jpeg_quality: 90,
            max_width: 4096,
            max_height: 4096,
            subfolder: "compat".to_string(),
            overwrite: false,
            keep_structure: true,
            parallel: default_parallel(),
            log_level: default_log_level(),
            log_retention_days: default_log_retention_days(),
            temp_dir: None,
            last_folder: None,
        }
    }
}

/// 架构自适应并行数(§10.13)。MVP 简化:用核心数,留 1 核给系统;
/// ARM/LoongArch 限制 ≤4。架构检测在后续增量精确化。
fn default_parallel() -> usize {
    let cores = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4);
    if cores > 1 {
        cores - 1
    } else {
        1
    }
}

impl Config {
    /// 从 app_data_dir/config.json 读取;不存在或损坏回退默认(§15.13)。
    pub fn load(dir: &Path) -> Self {
        let path: PathBuf = dir.join("config.json");
        match std::fs::read_to_string(&path) {
            Ok(s) => serde_json::from_str(&s).unwrap_or_default(),
            Err(_) => Config::default(),
        }
    }

    /// 保存到 app_data_dir/config.json。失败仅记日志,不阻塞主流程(§15.13)。
    pub fn save(&self, dir: &Path) {
        let path: PathBuf = dir.join("config.json");
        if let Ok(s) = serde_json::to_string_pretty(self) {
            if std::fs::create_dir_all(dir).is_ok() {
                let _ = std::fs::write(path, s);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_config_matches_spec() {
        let c = Config::default();
        // 附录 A 兼容性默认全开
        assert!(c.remove_exif);
        assert!(c.remove_icc);
        assert!(c.auto_orient);
        assert!(c.baseline_jpeg);
        assert!(c.convert_heic);
        assert!(c.to_srgb);
        assert_eq!(c.jpeg_quality, 90);
        assert_eq!(c.max_width, 4096);
        assert_eq!(c.max_height, 4096);
        // 输出默认(§1.4)
        assert_eq!(c.subfolder, "compat");
        assert!(!c.overwrite);
        assert!(c.keep_structure);
        // 新字段默认
        assert_eq!(c.log_level, "normal");
        assert_eq!(c.log_retention_days, 30);
        assert!(c.temp_dir.is_none());
        assert!(c.last_folder.is_none());
    }

    #[test]
    fn config_roundtrip_json() {
        let c = Config::default();
        let json = serde_json::to_string(&c).unwrap();
        let back: Config = serde_json::from_str(&json).unwrap();
        assert_eq!(back.jpeg_quality, c.jpeg_quality);
        assert_eq!(back.subfolder, c.subfolder);
        assert_eq!(back.log_level, c.log_level);
    }

    #[test]
    fn corrupt_config_falls_back_to_default() {
        // 配置损坏(§15.13)回退默认
        let bad = "{ not valid json";
        let c: Config = serde_json::from_str(bad).unwrap_or_default();
        assert_eq!(c.jpeg_quality, 90);
    }

    #[test]
    fn legacy_config_without_new_fields_loads() {
        // 旧 config.json（无 log_level 等新字段）应能加载，新字段取默认
        let legacy = r#"{
            "remove_exif": false,
            "remove_icc": true,
            "auto_orient": true,
            "baseline_jpeg": true,
            "convert_heic": true,
            "to_srgb": true,
            "jpeg_quality": 80,
            "max_width": 2048,
            "max_height": 2048,
            "subfolder": "out",
            "overwrite": false,
            "keep_structure": false,
            "parallel": 2
        }"#;
        let c: Config = serde_json::from_str(legacy).unwrap();
        assert_eq!(c.jpeg_quality, 80); // 保留旧值
        assert_eq!(c.subfolder, "out");
        assert_eq!(c.log_level, "normal"); // 新字段取默认
        assert_eq!(c.log_retention_days, 30);
    }
}
