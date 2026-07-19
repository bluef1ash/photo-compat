// src-tauri/src/error.rs
use serde::Serialize;
use thiserror::Error;

/// 应用错误。序列化为字符串给前端,前端按 §8 呈现四段对话框。
#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum AppError {
    #[error("目录无法访问:{0}")]
    DirAccess(String),
    #[error("权限不足:{0}")]
    Permission(String),
    #[error("磁盘空间不足")]
    DiskFull,
    #[error("图片损坏:{0}")]
    Corrupt(String),
    #[error("不支持的格式:{0}")]
    Unsupported(String),
    #[error("IO 错误:{0}")]
    Io(String),
    #[error("内部错误:{0}")]
    Internal(String),
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        match e.kind() {
            std::io::ErrorKind::PermissionDenied => AppError::Permission(e.to_string()),
            std::io::ErrorKind::NotFound => AppError::DirAccess(e.to_string()),
            _ => AppError::Io(e.to_string()),
        }
    }
}

/// 命令返回类型别名
pub type AppResult<T> = Result<T, AppError>;
