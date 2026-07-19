// src/types.ts
/** 对应后端 ScanResult。后端 `files` 字段（#[serde(skip)]）不序列化到前端,故此处无此字段。 */
export interface ScanResult {
  total: number;
  by_format: Record<string, number>;
  unsupported: string[];
  source_dir: string;
}

export interface ProgressEvent {
  done: number;
  total: number;
  failed: number;
  skipped: number;
  current: string;
  state: "running" | "paused" | "done" | "cancelled";
}

export interface ProcessSummary {
  total: number;
  done: number;
  failed: number;
  skipped: number;
  cancelled: boolean;
}

export interface Config {
  remove_exif: boolean;
  remove_icc: boolean;
  auto_orient: boolean;
  baseline_jpeg: boolean;
  convert_heic: boolean;
  to_srgb: boolean;
  jpeg_quality: number;
  max_width: number;
  max_height: number;
  subfolder: string;
  overwrite: boolean;
  keep_structure: boolean;
  parallel: number;
}

export type View = "home" | "scanning" | "result" | "processing" | "completed";
