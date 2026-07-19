// src-tauri/src/pipeline/scan.rs
use crate::error::AppResult;
use crate::types::ScanResult;
use std::collections::BTreeMap;
use std::path::Path;
use walkdir::WalkDir;

/// 支持的输入格式(§支持格式)。HEIC 识别但 MVP 不转换。
pub fn format_of(ext: &str) -> Option<&'static str> {
    match ext.to_ascii_lowercase().as_str() {
        "jpg" | "jpeg" => Some("JPEG"),
        "png" => Some("PNG"),
        "webp" => Some("WebP"),
        "gif" => Some("GIF"),
        "bmp" => Some("BMP"),
        "tiff" | "tif" => Some("TIFF"),
        "heic" | "heif" => Some("HEIC"),
        _ => None,
    }
}

/// 递归扫描目录,统计支持格式,记录不支持格式。
pub fn scan_directory(root: &Path) -> AppResult<ScanResult> {
    if !root.exists() {
        return Err(crate::error::AppError::DirAccess(format!(
            "目录不存在:{}",
            root.display()
        )));
    }

    let mut by_format: BTreeMap<String, u32> = BTreeMap::new();
    let mut unsupported: Vec<String> = Vec::new();
    let mut total: u32 = 0;

    for entry in WalkDir::new(root).into_iter().filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");
        match format_of(ext) {
            Some(fmt) => {
                *by_format.entry(fmt.to_string()).or_insert(0) += 1;
                total += 1;
            }
            None => {
                // 跳过无扩展名与常见非图片;有扩展名但不在支持列表则记为 unsupported
                if !ext.is_empty() {
                    unsupported.push(path.to_string_lossy().to_string());
                }
            }
        }
    }

    Ok(ScanResult {
        total,
        by_format,
        unsupported,
        source_dir: root.to_string_lossy().to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn scan_counts_supported_formats() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("a.jpg"), b"x").unwrap();
        fs::write(dir.path().join("b.png"), b"x").unwrap();
        fs::write(dir.path().join("c.heic"), b"x").unwrap();
        fs::write(dir.path().join("d.psd"), b"x").unwrap(); // 不支持

        let result = scan_directory(dir.path()).unwrap();
        assert_eq!(result.total, 3); // jpg + png + heic(heic 识别但不转换,MVP 计入)
        assert_eq!(*result.by_format.get("JPEG").unwrap_or(&0), 1);
        assert_eq!(*result.by_format.get("PNG").unwrap_or(&0), 1);
        assert_eq!(result.unsupported.len(), 1);
        assert!(result.unsupported[0].ends_with("d.psd"));
    }

    #[test]
    fn scan_empty_dir_returns_zero() {
        // §15.1 / §15.3 空目录
        let dir = TempDir::new().unwrap();
        let result = scan_directory(dir.path()).unwrap();
        assert_eq!(result.total, 0);
    }
}
