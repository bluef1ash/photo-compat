// src/types.ts
// 与后端 backend/src/types.rs、config.rs 对齐。serde 默认 snake_case。

/** 单文件元信息（结果页文件列表，前 N 张） */
export interface FileMeta {
  name: string
  path: string // 文件绝对路径（结果页缩略图用 convertFileSrc 渲染）
  format: string // JPEG/PNG/HEIC...
  size_bytes: number
  width: number // 0 表示未读取
  height: number
  status: string // "转 JPEG" / "去除 EXIF" / "无需转换"
}

/** 不支持格式的分组详情 */
export interface UnsupportedGroup {
  ext: string // ".psd"
  label: string // "PSD 设计源文件"
  count: number
  files: string[] // 样例文件名
}

/** 扫描阶段警告聚合 */
export interface ScanWarnings {
  heic_count: number
  corrupt_count: number // 扫描阶段通常 0
  unsupported_groups: UnsupportedGroup[]
}

/** 扫描结果（对应后端 ScanResult） */
export interface ScanResult {
  total: number
  by_format: Record<string, number>
  unsupported: string[]
  unsupported_groups: UnsupportedGroup[]
  source_dir: string
  files_detail: FileMeta[]
  total_source_size: number
  estimated_output_size: number
  warnings: ScanWarnings
}

/** 扫描进度事件（scan://progress） */
export interface ScanProgress {
  found: number
  current_path: string
}

/** 处理进度状态 */
export type ProgressState = 'running' | 'paused' | 'done' | 'cancelled'

/** 处理进度事件（process://progress） */
export interface ProgressEvent {
  done: number
  total: number
  failed: number
  skipped: number
  current: string
  current_op: string
  elapsed_secs: number
  speed: number
  remain_secs: number
  state: ProgressState
}

/** 处理结果摘要（process://summary） */
export interface ProcessSummary {
  total: number
  done: number
  failed: number
  skipped: number
  cancelled: boolean
  output_dir: string
  duration_secs: number
  avg_speed: number
  output_size: number
  output_file_count: number
  settings: Config
}

/** 实时日志条目（process://log） */
export interface LogEntry {
  ts: string // HH:MM:SS
  level: 'ok' | 'warn' | 'err' | 'info'
  msg: string
}

/** 处理配置（对应后端 Config） */
export interface Config {
  // 兼容性
  remove_exif: boolean
  remove_icc: boolean
  auto_orient: boolean
  baseline_jpeg: boolean
  convert_heic: boolean
  to_srgb: boolean
  jpeg_quality: number
  max_width: number
  max_height: number
  // 输出
  subfolder: string
  overwrite: boolean
  keep_structure: boolean
  // 性能
  parallel: number
  // 高级 / 通用
  log_level: 'normal' | 'verbose'
  log_retention_days: number
  temp_dir: string | null
  last_folder: string | null
}

/** 视图（含设置页） */
export type View = 'home' | 'scanning' | 'result' | 'processing' | 'completed' | 'settings'

/** 最近文件夹条目（前端 localStorage 自存，非后端字段） */
export interface RecentFolder {
  path: string
  ts: number // 上次处理时间戳
  count: number // 张数
  mode: string // 兼容模式名
}
