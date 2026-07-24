// src-tauri/src/log.rs
use std::path::PathBuf;
use tracing_appender::rolling;
use tracing_subscriber::{fmt, prelude::*, reload, EnvFilter};

/// 运行时切换日志级别的回调（用 trait 对象封装，避免 AppState 暴露泛型 handle）
pub type LogLevelReloader = Box<dyn Fn(&str) + Send + Sync>;

/// 把配置 log_level 映射到 tracing 级别
fn level_of(log_level: &str) -> &'static str {
    if log_level == "verbose" {
        "debug"
    } else {
        "info"
    }
}

/// 初始化文件日志(按天滚动)。返回 (guard, reloader)。
/// reloader 可在设置页切换 log_level 时即时生效（reload EnvFilter，无需重启）。
pub fn init(
    log_dir: PathBuf,
    log_level: &str,
) -> (tracing_appender::non_blocking::WorkerGuard, LogLevelReloader) {
    std::fs::create_dir_all(&log_dir).ok();
    let file_appender = rolling::daily(&log_dir, "photo-compat.log");
    let (non_blocking, guard) = tracing_appender::non_blocking(file_appender);

    let default_level = level_of(log_level);
    let filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(default_level));
    let (filter_layer, reload_handle) = reload::Layer::new(filter);
    tracing_subscriber::registry()
        .with(filter_layer)
        .with(fmt::layer().with_writer(std::io::stderr))
        .with(fmt::layer().with_writer(non_blocking))
        .init();
    let reloader: LogLevelReloader = Box::new(move |level: &str| {
        let _ = reload_handle.reload(EnvFilter::new(level_of(level)));
    });
    (guard, reloader)
}

/// 清理超过保留天数的滚动日志文件（tracing-appender 按天滚动，文件名末尾为 YYYY-MM-DD）。
/// 启动时调用一次；保留期内与当天、非 photo-compat 文件不受影响。
pub fn cleanup_old_logs(log_dir: &std::path::Path, retention_days: u32) {
    let cutoff = chrono::Local::now().date_naive() - chrono::Duration::days(retention_days as i64);
    let Ok(entries) = std::fs::read_dir(log_dir) else {
        return;
    };
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.contains("photo-compat") {
            continue;
        }
        // 文件名末尾段为日期：photo-compat.log.YYYY-MM-DD
        if let Some(date_str) = name.rsplit('.').next() {
            if let Ok(d) = chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
                if d < cutoff {
                    let _ = std::fs::remove_file(entry.path());
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Local;
    use tempfile::TempDir;

    #[test]
    fn cleanup_removes_old_logs_keeps_recent() {
        let dir = TempDir::new().unwrap();
        let today = Local::now().format("%Y-%m-%d").to_string();
        std::fs::write(dir.path().join(format!("photo-compat.log.{today}")), b"x").unwrap();
        std::fs::write(dir.path().join("photo-compat.log.2020-01-01"), b"x").unwrap();
        std::fs::write(dir.path().join("other.log"), b"x").unwrap();

        cleanup_old_logs(dir.path(), 7);

        // 今天的保留、超期的删除、无关文件不动
        assert!(dir.path().join(format!("photo-compat.log.{today}")).exists());
        assert!(!dir.path().join("photo-compat.log.2020-01-01").exists());
        assert!(dir.path().join("other.log").exists());
    }

    #[test]
    fn cleanup_handles_missing_dir() {
        // 日志目录不存在时不应 panic
        cleanup_old_logs(std::path::Path::new("/nonexistent/path/xyz"), 7);
    }
}
