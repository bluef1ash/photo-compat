// src-tauri/src/log.rs
use std::path::PathBuf;
use tracing_appender::rolling;
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

/// 初始化文件日志(按天滚动)。返回 guard 保持文件写入。
/// 日志目录:app_data_dir/logs,保留由日志系统/后续清理任务管理。
/// log_level: "verbose" → debug 及以上；其他 → info（可被 RUST_LOG 环境变量覆盖）
pub fn init(log_dir: PathBuf, log_level: &str) -> tracing_appender::non_blocking::WorkerGuard {
    std::fs::create_dir_all(&log_dir).ok();
    let file_appender = rolling::daily(&log_dir, "photo-compat.log");
    let (non_blocking, guard) = tracing_appender::non_blocking(file_appender);

    let default_level = if log_level == "verbose" { "debug" } else { "info" };
    let env = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(default_level));
    tracing_subscriber::registry()
        .with(env)
        .with(fmt::layer().with_writer(std::io::stderr))
        .with(fmt::layer().with_writer(non_blocking))
        .init();
    guard
}
