import { create } from "zustand";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { join } from "@tauri-apps/api/path";
import * as cmd from "../ipc/commands";
import type {
  Config,
  ProgressEvent,
  ProcessSummary,
  ScanResult,
  View,
} from "../types";

const DEFAULT_CONFIG: Config = {
  remove_exif: true,
  remove_icc: true,
  auto_orient: true,
  baseline_jpeg: true,
  convert_heic: true,
  to_srgb: true,
  jpeg_quality: 90,
  max_width: 4096,
  max_height: 4096,
  subfolder: "compat",
  overwrite: false,
  keep_structure: true,
  // MVP:前端默认值仅 UI 参考;后端并行由 rayon 默认控制,精确 parallel 生效是增量
  parallel: 4,
};

interface State {
  view: View;
  scan: ScanResult | null;
  progress: ProgressEvent | null;
  summary: ProcessSummary | null;
  error: string | null;
  paused: boolean;
  config: Config;
  unlisten: UnlistenFn | null;
  // actions
  selectFolder: () => Promise<void>;
  startProcess: () => Promise<void>;
  cancel: () => Promise<void>;
  togglePause: () => Promise<void>;
  openOutput: () => Promise<void>;
  setError: (msg: string | null) => void;
  reset: () => void;
}

export const useAppStore = create<State>((set, get) => ({
  view: "home",
  scan: null,
  progress: null,
  summary: null,
  error: null,
  paused: false,
  config: DEFAULT_CONFIG,
  unlisten: null,

  selectFolder: async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || typeof selected !== "string") return;
    set({ view: "scanning", error: null });
    try {
      const result = await cmd.scanDirectory(selected);
      // §15.1 空目录/无图片
      if (result.total === 0) {
        set({
          view: "home",
          error: "这个文件夹里没有可处理的照片",
        });
        return;
      }
      set({ view: "result", scan: result });
    } catch (e) {
      set({ view: "home", error: String(e) });
    }
  },

  startProcess: async () => {
    const scan = get().scan;
    if (!scan) return;
    // 先清理旧监听器，防止重复 startProcess 累积监听器
    const old = get().unlisten;
    if (old) old();

    set({ view: "processing", progress: null, summary: null, paused: false });
    // 订阅进度与完成事件
    const un1 = await listen<ProgressEvent>("process://progress", (e) => {
      const p = e.payload;
      if (p.state === "done" || p.state === "cancelled") {
        // 等待 summary 事件最终汇总
      }
      set({ progress: p });
    });
    const un2 = await listen<ProcessSummary>("process://summary", (e) => {
      set({ summary: e.payload, view: "completed" });
    });
    set({ unlisten: () => { un1(); un2(); } });
    try {
      await cmd.startProcess(scan.source_dir, get().config);
    } catch (e) {
      // 失败回首页 + 错误,防卡 processing
      set({ error: String(e), view: "home" });
    }
  },

  cancel: async () => {
    await cmd.cancelProcess();
  },

  togglePause: async () => {
    const next = !get().paused;
    set({ paused: next });
    if (next) await cmd.pauseProcess();
    else await cmd.resumeProcess();
  },

  openOutput: async () => {
    const scan = get().scan;
    if (!scan) return;
    // 用 Tauri path API 替代字符串拼接，跨平台兼容
    const outDir = await join(scan.source_dir, get().config.subfolder);
    await cmd.openOutput(outDir);
  },

  setError: (msg) => set({ error: msg }),
  reset: () => {
    const u = get().unlisten;
    if (u) u();
    set({
      view: "home",
      scan: null,
      progress: null,
      summary: null,
      error: null,
      paused: false,
      unlisten: null,
    });
  },
}));
