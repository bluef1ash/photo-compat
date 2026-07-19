// src-tauri/src/pipeline/worker.rs
use crate::config::Config;
use crate::pipeline::convert::{convert_file, resolve_output_path};
use crate::types::{ProcessSummary, ProgressEvent, ProgressState};
use rayon::prelude::*;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;
use std::time::Duration;

// 编译期验证 AppHandle 线程安全（Tauri 2 AppHandle: Send+Sync，par_iter 并发 emit 安全）
const _: () = {
    fn _assert_send_sync<T: Send + Sync>() {}
    fn _check() {
        _assert_send_sync::<tauri::AppHandle>();
    }
};

// 内部实现函数，使用泛型来避免依赖 Tauri 类型
fn run_pipeline_internal<E>(
    files: Vec<PathBuf>,
    source_root: &Path,
    out_root: &Path,
    cfg: &Config,
    emitter: &Option<E>,
    cancel: &Arc<AtomicBool>,
    paused: &Arc<AtomicBool>,
    emit_fn: impl Fn(&E, &ProgressEvent) + Sync,
) -> ProcessSummary
where
    E: Clone + Sync,
{
    let total = files.len() as u32;
    let done = Arc::new(AtomicU32::new(0));
    let failed = Arc::new(AtomicU32::new(0));
    let skipped = Arc::new(AtomicU32::new(0));

    let _ = std::fs::create_dir_all(out_root);

    files.par_iter().for_each(|input| {
        // 暂停等待（§10.5）：轮询，期间响应取消
        while paused.load(Ordering::Relaxed) {
            if cancel.load(Ordering::Relaxed) {
                return;
            }
            std::thread::sleep(Duration::from_millis(100));
        }
        if cancel.load(Ordering::Relaxed) {
            return;
        }

        let output = resolve_output_path(input, source_root, out_root, cfg);
        if let Some(parent) = output.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        match convert_file(input, &output, cfg) {
            Ok(()) => {
                done.fetch_add(1, Ordering::Relaxed);
            }
            Err(crate::error::AppError::Unsupported(_)) => {
                // HEIC 等 MVP 未启用格式 → 跳过（§10.13）
                skipped.fetch_add(1, Ordering::Relaxed);
            }
            Err(_) => {
                // 损坏/IO 等 → 失败但不中断（§15.7）
                failed.fetch_add(1, Ordering::Relaxed);
            }
        }

        if let Some(emitter) = emitter {
            let evt = ProgressEvent {
                done: done.load(Ordering::Relaxed),
                total,
                failed: failed.load(Ordering::Relaxed),
                skipped: skipped.load(Ordering::Relaxed),
                current: input.to_string_lossy().to_string(),
                state: ProgressState::Running,
            };
            // AppHandle: Send+Sync，emit 内部线程安全，可在 rayon par_iter 并发调用
            emit_fn(emitter, &evt);
        }
    });

    let cancelled = cancel.load(Ordering::Relaxed);

    if let Some(emitter) = emitter {
        let final_state = if cancelled {
            ProgressState::Cancelled
        } else {
            ProgressState::Done
        };
        let evt = ProgressEvent {
            done: done.load(Ordering::Relaxed),
            total,
            failed: failed.load(Ordering::Relaxed),
            skipped: skipped.load(Ordering::Relaxed),
            current: String::new(),
            state: final_state,
        };
        emit_fn(emitter, &evt);
    }

    ProcessSummary {
        total,
        done: done.load(Ordering::Relaxed),
        failed: failed.load(Ordering::Relaxed),
        skipped: skipped.load(Ordering::Relaxed),
        cancelled,
    }
}

/// 批量处理（公开接口）。
/// - files: 待处理文件路径（来自 scan_directory 的 files 字段）
/// - app: None 时不 emit（便于单测）；Some 时每个文件后 emit 进度
/// - cancel/paused: 由 cancel_process_cmd / pause_process_cmd 设置
#[allow(clippy::too_many_arguments)]
pub fn run_pipeline(
    files: Vec<PathBuf>,
    source_root: &Path,
    out_root: &Path,
    cfg: &Config,
    app: Option<tauri::AppHandle>,
    cancel: &Arc<AtomicBool>,
    paused: &Arc<AtomicBool>,
) -> ProcessSummary {
    use tauri::Emitter;
    run_pipeline_internal(files, source_root, out_root, cfg, &app, cancel, paused, |handle, evt| {
        let _ = handle.emit("process://progress", evt);
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::Config;
    use image::{ImageBuffer, Rgb, RgbImage};
    use std::path::Path;
    use tempfile::TempDir;

    fn make_jpeg(dir: &Path, name: &str, ok: bool) -> std::path::PathBuf {
        let p = dir.join(name);
        if ok {
            let img: RgbImage = ImageBuffer::from_pixel(20, 20, Rgb([1, 2, 3]));
            img.save(&p).unwrap();
        } else {
            std::fs::write(&p, b"corrupt").unwrap();
        }
        p
    }

    #[test]
    fn pipeline_counts_done_failed_skipped() {
        let dir = TempDir::new().unwrap();
        let src = dir.path().join("src");
        std::fs::create_dir_all(&src).unwrap();
        let out = dir.path().join("compat");

        let files = vec![
            make_jpeg(&src, "a.jpg", true), // done
            make_jpeg(&src, "b.jpg", false), // corrupt → failed
            make_jpeg(&src, "c.jpg", true), // done
        ];

        let cfg = Config::default();
        let cancel = Arc::new(AtomicBool::new(false));
        let paused = Arc::new(AtomicBool::new(false));

        // 测试时使用内部函数，不使用 emitter
        let summary = run_pipeline_internal(
            files,
            &src,
            &out,
            &cfg,
            &None::<()>,
            &cancel,
            &paused,
            |_, _| {},
        );

        assert_eq!(summary.total, 3);
        assert_eq!(summary.done, 2);
        assert_eq!(summary.failed, 1);
        assert!(!summary.cancelled);
    }

    #[test]
    fn pipeline_cancel_stops_early() {
        // 取消：在开始即置位，剩余项跳过
        let dir = TempDir::new().unwrap();
        let src = dir.path().join("src");
        std::fs::create_dir_all(&src).unwrap();
        let out = dir.path().join("compat");
        let files = vec![
            make_jpeg(&src, "a.jpg", true),
            make_jpeg(&src, "b.jpg", true),
        ];
        let cfg = Config::default();
        let cancel = Arc::new(AtomicBool::new(true)); // 启动即取消
        let paused = Arc::new(AtomicBool::new(false));

        let summary = run_pipeline_internal(
            files,
            &src,
            &out,
            &cfg,
            &None::<()>,
            &cancel,
            &paused,
            |_, _| {},
        );
        assert!(summary.cancelled);
        assert_eq!(summary.done, 0);
    }
}
