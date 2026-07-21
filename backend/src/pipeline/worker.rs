// src-tauri/src/pipeline/worker.rs
use crate::config::Config;
use crate::pipeline::convert::{convert_file, resolve_output_path};
use crate::pipeline::scan::format_of;
use crate::types::{LogEntry, ProcessSummary, ProgressEvent, ProgressState};
use chrono::Local;
use rayon::prelude::*;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use walkdir::WalkDir;

// 编译期验证 AppHandle 线程安全（Tauri 2 AppHandle: Send+Sync，par_iter 并发 emit 安全）
const _: () = {
    fn _assert_send_sync<T: Send + Sync>() {}
    fn _check() {
        _assert_send_sync::<tauri::AppHandle>();
    }
};

/// 当前时间戳（本地，HH:MM:SS），用于日志条目
fn now_ts() -> String {
    Local::now().format("%H:%M:%S").to_string()
}

/// 按输入扩展名给出操作描述（处理中「当前文件」操作标签）
fn op_for_format(ext: &str) -> String {
    match format_of(ext) {
        Some("JPEG") => "去除 EXIF · 重编码".to_string(),
        Some("HEIC") => "HEIC → JPEG".to_string(),
        Some(other) => format!("{} → JPEG", other),
        None => "处理".to_string(),
    }
}

/// 统计目录下文件总大小与数量（用于 summary 的输出统计）
fn dir_stats(root: &Path) -> (u64, u32) {
    let mut size: u64 = 0;
    let mut count: u32 = 0;
    for entry in WalkDir::new(root).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            size += entry.metadata().map(|m| m.len()).unwrap_or(0);
            count += 1;
        }
    }
    (size, count)
}

/// 由已处理数与耗时计算速度与剩余时间
fn speed_and_remain(processed: u32, total: u32, elapsed: f64) -> (f64, f64) {
    let speed = if elapsed > 0.0 {
        processed as f64 / elapsed
    } else {
        0.0
    };
    let remain = if speed > 0.0 {
        (total.saturating_sub(processed)) as f64 / speed
    } else {
        0.0
    };
    (speed, remain)
}

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
    log_fn: impl Fn(&E, &LogEntry) + Sync,
) -> ProcessSummary
where
    E: Clone + Sync,
{
    let total = files.len() as u32;
    let done = Arc::new(AtomicU32::new(0));
    let failed = Arc::new(AtomicU32::new(0));
    let skipped = Arc::new(AtomicU32::new(0));
    let start = Instant::now();

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

        let ext = input
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");
        let op = op_for_format(ext);
        let file_name = input
            .file_name()
            .map(|f| f.to_string_lossy().to_string())
            .unwrap_or_else(|| input.to_string_lossy().to_string());

        // 处理并按结果归类计数 + 准备日志
        let (log_level, log_msg): (&str, String) = match convert_file(input, &output, cfg) {
            Ok(()) => {
                done.fetch_add(1, Ordering::Relaxed);
                ("ok", format!("{}：{}", op, file_name))
            }
            Err(crate::error::AppError::Unsupported(_)) => {
                // HEIC 等 MVP 未启用格式 → 跳过（§10.13）
                skipped.fetch_add(1, Ordering::Relaxed);
                ("warn", format!("跳过（暂不支持）：{}", file_name))
            }
            Err(_) => {
                // 损坏/IO 等 → 失败但不中断（§15.7）
                failed.fetch_add(1, Ordering::Relaxed);
                ("err", format!("失败：{}", file_name))
            }
        };

        if let Some(emitter) = emitter {
            let done_now = done.load(Ordering::Relaxed);
            let failed_now = failed.load(Ordering::Relaxed);
            let skipped_now = skipped.load(Ordering::Relaxed);
            let processed = done_now + failed_now + skipped_now;
            let elapsed = start.elapsed().as_secs_f64();
            let (speed, remain) = speed_and_remain(processed, total, elapsed);

            log_fn(
                emitter,
                &LogEntry {
                    ts: now_ts(),
                    level: log_level.to_string(),
                    msg: log_msg,
                },
            );

            let evt = ProgressEvent {
                done: done_now,
                total,
                failed: failed_now,
                skipped: skipped_now,
                current: file_name,
                current_op: op,
                elapsed_secs: elapsed,
                speed,
                remain_secs: remain,
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
        let done_now = done.load(Ordering::Relaxed);
        let failed_now = failed.load(Ordering::Relaxed);
        let skipped_now = skipped.load(Ordering::Relaxed);
        let processed = done_now + failed_now + skipped_now;
        let elapsed = start.elapsed().as_secs_f64();
        let (speed, remain) = speed_and_remain(processed, total, elapsed);
        let evt = ProgressEvent {
            done: done_now,
            total,
            failed: failed_now,
            skipped: skipped_now,
            current: String::new(),
            current_op: String::new(),
            elapsed_secs: elapsed,
            speed,
            remain_secs: remain,
            state: final_state,
        };
        emit_fn(emitter, &evt);
    }

    let done_n = done.load(Ordering::Relaxed);
    let failed_n = failed.load(Ordering::Relaxed);
    let skipped_n = skipped.load(Ordering::Relaxed);
    let processed = done_n + failed_n + skipped_n;
    let duration = start.elapsed().as_secs_f64();
    let avg_speed = if duration > 0.0 {
        processed as f64 / duration
    } else {
        0.0
    };
    let (output_size, output_file_count) = dir_stats(out_root);

    ProcessSummary {
        total,
        done: done_n,
        failed: failed_n,
        skipped: skipped_n,
        cancelled,
        output_dir: out_root.to_string_lossy().to_string(),
        duration_secs: duration,
        avg_speed,
        output_size,
        output_file_count,
        settings: cfg.clone(),
    }
}

/// 批量处理（公开接口）。
/// - files: 待处理文件路径（来自 scan_directory 的 files 字段）
/// - app: None 时不 emit（便于单测）；Some 时每个文件后 emit 进度与日志
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
    run_pipeline_internal(
        files,
        source_root,
        out_root,
        cfg,
        &app,
        cancel,
        paused,
        |handle, evt| {
            let _ = handle.emit("process://progress", evt);
        },
        |handle, log| {
            let _ = handle.emit("process://log", log);
        },
    )
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
            make_jpeg(&src, "a.jpg", true),  // done
            make_jpeg(&src, "b.jpg", false), // corrupt → failed
            make_jpeg(&src, "c.jpg", true),  // done
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
            |_, _| {},
        );

        assert_eq!(summary.total, 3);
        assert_eq!(summary.done, 2);
        assert_eq!(summary.failed, 1);
        assert!(!summary.cancelled);
        // 新字段：输出位置与统计
        assert!(summary.output_dir.ends_with("compat"));
        assert_eq!(summary.output_file_count, 2); // 两张成功输出
        assert!(summary.duration_secs >= 0.0);
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
            |_, _| {},
        );
        assert!(summary.cancelled);
        assert_eq!(summary.done, 0);
    }

    #[test]
    fn pipeline_emits_progress_and_logs() {
        // 验证 progress 与 log emitter 被调用
        use std::sync::{Arc, Mutex};
        let dir = TempDir::new().unwrap();
        let src = dir.path().join("src");
        std::fs::create_dir_all(&src).unwrap();
        let out = dir.path().join("compat");
        let files = vec![make_jpeg(&src, "a.jpg", true)];
        let cfg = Config::default();
        let cancel = Arc::new(AtomicBool::new(false));
        let paused = Arc::new(AtomicBool::new(false));

        let progress_count = Arc::new(Mutex::new(0u32));
        let log_msgs = Arc::new(Mutex::new(Vec::<String>::new()));
        let pc = progress_count.clone();
        let lm = log_msgs.clone();

        run_pipeline_internal(
            files,
            &src,
            &out,
            &cfg,
            &Some(()),
            &cancel,
            &paused,
            |_, _evt| {
                *progress_count.lock().unwrap() += 1;
            },
            |_, log| {
                log_msgs.lock().unwrap().push(log.msg.clone());
            },
        );

        // 至少一条进度（处理中）+ 一条最终进度
        assert!(*pc.lock().unwrap() >= 1);
        let msgs = lm.lock().unwrap();
        assert!(msgs.iter().any(|m| m.contains("a.jpg")));
    }
}
