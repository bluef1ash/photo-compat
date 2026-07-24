// src-tauri/src/state.rs
use crate::config::Config;
use crate::log::LogLevelReloader;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

/// 当前处理任务句柄，供 cancel/pause 命令访问。
#[derive(Clone)]
pub struct JobHandle {
    pub cancel: Arc<AtomicBool>,
    pub paused: Arc<AtomicBool>,
}

pub struct AppState {
    pub config: Mutex<Config>,
    pub job: Mutex<Option<JobHandle>>,
    pub reload_log_level: LogLevelReloader,
}

impl AppState {
    pub fn new(config: Config, reload_log_level: LogLevelReloader) -> Self {
        Self {
            config: Mutex::new(config),
            job: Mutex::new(None),
            reload_log_level,
        }
    }

    pub fn set_job(&self, job: JobHandle) {
        *self.job.lock().unwrap() = Some(job);
    }

    pub fn clear_job(&self) {
        *self.job.lock().unwrap() = None;
    }

    /// 触发取消；无任务时返回 false。
    pub fn cancel_job(&self) -> bool {
        if let Some(job) = self.job.lock().unwrap().as_ref() {
            job.cancel.store(true, Ordering::Relaxed);
            true
        } else {
            false
        }
    }

    pub fn set_paused(&self, paused: bool) -> bool {
        if let Some(job) = self.job.lock().unwrap().as_ref() {
            job.paused.store(paused, Ordering::Relaxed);
            true
        } else {
            false
        }
    }
}
