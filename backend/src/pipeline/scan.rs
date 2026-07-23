// src-tauri/src/pipeline/scan.rs
use crate::error::AppResult;
use crate::types::{FileMeta, ScanProgress, ScanResult, ScanWarnings, UnsupportedGroup};
use image::ImageReader;
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// 结果页文件列表展示的详情条数上限（前 N 张读尺寸）
const FILE_DETAIL_LIMIT: usize = 12;

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

/// 不支持扩展名的人类可读标签（结果页警告展示）
fn unsupported_label(ext: &str) -> String {
    match ext {
        "psd" => "PSD 设计源文件".to_string(),
        "raw" | "cr2" | "nef" | "arw" | "dng" | "rw2" | "orf" | "raf" => {
            "RAW 相机原始文件".to_string()
        }
        "svg" => "SVG 矢量图".to_string(),
        "pdf" => "PDF 文档".to_string(),
        "tga" | "dds" | "ico" | "jp2" | "avif" => "其他不支持的图片格式".to_string(),
        _ => "其他不支持的格式".to_string(),
    }
}

/// 各格式转 JPEG 的体积经验系数（粗估，用于「预计输出大小」）
fn estimate_output_ratio(format: &str) -> f64 {
    match format {
        "JPEG" => 0.85, // 重编码略减
        "PNG" => 0.45,  // 无损→有损，显著减小
        "WebP" => 0.6,
        "GIF" => 0.5,
        "BMP" => 0.15, // 无压缩→JPEG，大幅减小
        "TIFF" => 0.2,
        "HEIC" => 0.5, // 高效→JPEG，增大
        _ => 0.6,
    }
}

/// 结果页文件列表的「处理状态」文案
fn file_status(format: &str) -> String {
    match format {
        "JPEG" => "去除 EXIF".to_string(),
        "HEIC" => "转 JPEG".to_string(),
        other => format!("{} → JPEG", other),
    }
}

/// 读图片尺寸；失败返回 (0,0)，不阻塞扫描流程
fn read_dimensions(path: &Path) -> (u32, u32) {
    let Ok(reader) = ImageReader::open(path) else {
        return (0, 0);
    };
    let Ok(reader) = reader.with_guessed_format() else {
        return (0, 0);
    };
    reader.into_dimensions().unwrap_or((0, 0))
}

/// 内部实现：泛型 emitter，便于单测不依赖 Tauri。
/// 流式扫描：每发现一张支持图片即 emit `scan://progress`（照片目录量级下可接受；
/// 超大目录如需节流可改为按计数批量发，此处保持简单）。
fn scan_directory_internal<E>(
    root: &Path,
    emitter: &Option<E>,
    emit_fn: impl Fn(&E, &ScanProgress),
) -> AppResult<ScanResult> {
    if !root.exists() {
        return Err(crate::error::AppError::DirAccess(format!(
            "目录不存在:{}",
            root.display()
        )));
    }

    let mut by_format: BTreeMap<String, u32> = BTreeMap::new();
    let mut unsupported: Vec<String> = Vec::new();
    // 不支持分组聚合：ext(lower) -> (count, sample_files)
    let mut unsup_map: BTreeMap<String, (u32, Vec<String>)> = BTreeMap::new();
    let mut size_by_format: BTreeMap<String, u64> = BTreeMap::new();
    let mut total: u32 = 0;
    let mut total_source_size: u64 = 0;
    let mut files: Vec<PathBuf> = Vec::new();
    // 前 N 张详情候选（路径、格式、大小），扫描结束后统一读尺寸
    let mut detail_candidates: Vec<(PathBuf, String, u64)> = Vec::new();

    for entry in WalkDir::new(root).into_iter().filter_map(|e| match e {
        Ok(entry) => Some(entry),
        Err(err) => {
            tracing::warn!("扫描跳过不可访问的路径: {}", err);
            None
        }
    }) {
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
        let size = entry.metadata().map(|m| m.len()).unwrap_or(0);

        match format_of(ext) {
            Some(fmt) => {
                *by_format.entry(fmt.to_string()).or_insert(0) += 1;
                *size_by_format.entry(fmt.to_string()).or_insert(0) += size;
                total += 1;
                total_source_size += size;
                files.push(path.to_path_buf());
                if detail_candidates.len() < FILE_DETAIL_LIMIT {
                    detail_candidates.push((path.to_path_buf(), fmt.to_string(), size));
                }
                // 流式 emit 进度
                if let Some(emitter) = emitter {
                    emit_fn(
                        emitter,
                        &ScanProgress {
                            found: total,
                            current_path: path.to_string_lossy().to_string(),
                        },
                    );
                }
            }
            None => {
                // 跳过无扩展名与常见非图片;有扩展名但不在支持列表则记为 unsupported
                if !ext.is_empty() {
                    let name = path.to_string_lossy().to_string();
                    unsupported.push(name);
                    let key = ext.to_ascii_lowercase();
                    let entry = unsup_map.entry(key).or_insert((0, Vec::new()));
                    entry.0 += 1;
                    if entry.1.len() < 3 {
                        entry.1.push(
                            path.file_name()
                                .map(|f| f.to_string_lossy().to_string())
                                .unwrap_or_default(),
                        );
                    }
                }
            }
        }
    }

    // 前 N 张详情：读尺寸 + 状态文案
    let files_detail: Vec<FileMeta> = detail_candidates
        .iter()
        .map(|(path, fmt, size)| {
            let (w, h) = read_dimensions(path);
            FileMeta {
                name: path
                    .file_name()
                    .map(|f| f.to_string_lossy().to_string())
                    .unwrap_or_default(),
                path: path.to_string_lossy().to_string(),
                format: fmt.clone(),
                size_bytes: *size,
                width: w,
                height: h,
                status: file_status(fmt),
            }
        })
        .collect();

    // 估算输出大小：各格式源大小 × 经验系数之和
    let estimated_output_size: u64 = size_by_format
        .iter()
        .map(|(fmt, sz)| (*sz as f64 * estimate_output_ratio(fmt)) as u64)
        .sum();

    // 不支持分组（按数量降序，便于前端展示）
    let mut unsupported_groups: Vec<UnsupportedGroup> = unsup_map
        .iter()
        .map(|(ext, (count, sample))| UnsupportedGroup {
            ext: format!(".{}", ext),
            label: unsupported_label(ext),
            count: *count,
            files: sample.clone(),
        })
        .collect();
    unsupported_groups.sort_by(|a, b| b.count.cmp(&a.count));

    let heic_count = *by_format.get("HEIC").unwrap_or(&0);

    Ok(ScanResult {
        total,
        by_format,
        unsupported,
        unsupported_groups: unsupported_groups.clone(),
        source_dir: root.to_string_lossy().to_string(),
        files_detail,
        total_source_size,
        estimated_output_size,
        warnings: ScanWarnings {
            heic_count,
            corrupt_count: 0, // 扫描阶段无法判定损坏，处理时才知
            unsupported_groups,
        },
        files,
    })
}

/// 公开入口：无 emit（兼容同步调用、内部复用与单测）
pub fn scan_directory(root: &Path) -> AppResult<ScanResult> {
    scan_directory_internal::<()>(root, &None, |_, _| {})
}

/// 公开入口：带 AppHandle，扫描中流式 emit `scan://progress`
pub fn scan_directory_with_app(
    root: &Path,
    app: Option<tauri::AppHandle>,
) -> AppResult<ScanResult> {
    use tauri::Emitter;
    scan_directory_internal(root, &app, |handle, p| {
        let _ = handle.emit("scan://progress", p);
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
        // 新字段：警告聚合
        assert_eq!(result.warnings.heic_count, 1);
        assert_eq!(result.warnings.unsupported_groups.len(), 1);
        assert_eq!(result.warnings.unsupported_groups[0].count, 1);
        // 新字段：文件详情（假内容读尺寸失败，w/h=0，但不报错）
        assert!(result.files_detail.iter().any(|f| f.format == "JPEG"));
    }

    #[test]
    fn scan_empty_dir_returns_zero() {
        // §15.1 / §15.3 空目录
        let dir = TempDir::new().unwrap();
        let result = scan_directory(dir.path()).unwrap();
        assert_eq!(result.total, 0);
        assert_eq!(result.estimated_output_size, 0);
        assert!(result.files_detail.is_empty());
    }

    #[test]
    fn scan_emits_progress_stream() {
        // 验证流式 emitter 被调用
        use std::sync::{Arc, Mutex};
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("a.jpg"), b"x").unwrap();
        fs::write(dir.path().join("b.png"), b"x").unwrap();

        let calls = Arc::new(Mutex::new(Vec::<ScanProgress>::new()));
        let calls_clone = calls.clone();
        scan_directory_internal::<()>(
            dir.path(),
            &Some(()),
            move |_, p| calls_clone.lock().unwrap().push(p.clone()),
        )
        .unwrap();

        let recorded = calls.lock().unwrap();
        assert_eq!(recorded.len(), 2); // 每张发一次
        assert_eq!(recorded.last().unwrap().found, 2);
    }
}
