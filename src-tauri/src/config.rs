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
    pub parallel: usize,
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

// src-tauri/src/config.rs - 先只写测试，实现待补充

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
    }

    #[test]
    fn config_roundtrip_json() {
        let c = Config::default();
        let json = serde_json::to_string(&c).unwrap();
        let back: Config = serde_json::from_str(&json).unwrap();
        assert_eq!(back.jpeg_quality, c.jpeg_quality);
        assert_eq!(back.subfolder, c.subfolder);
    }

    #[test]
    fn corrupt_config_falls_back_to_default() {
        // 配置损坏(§15.13)回退默认
        let bad = "{ not valid json";
        let c: Config = serde_json::from_str(bad).unwrap_or_default();
        assert_eq!(c.jpeg_quality, 90);
    }
}
