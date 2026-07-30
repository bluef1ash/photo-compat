import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { join } from '@tauri-apps/api/path'
import { open } from '@tauri-apps/api/dialog'
import { create } from 'zustand'
import * as cmd from '../ipc/commands'
import type {
  Config,
  LogEntry,
  ProcessSummary,
  ProgressEvent,
  RecentFolder,
  ScanProgress,
  ScanResult,
  View,
} from '../types'
import { loadPrefs } from '../views/Settings/prefs'

// MVP 前端默认配置（后端并行实际由 rayon 控制；此处仅 UI 参考）
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
  subfolder: 'compat',
  overwrite: false,
  keep_structure: true,
  parallel: 4,
  log_level: 'normal',
  log_retention_days: 30,
  temp_dir: null,
  last_folder: null,
}

const RECENT_KEY = 'photo-compat:recent'
const MAX_LOGS = 500
const MAX_RECENT = 10

/** 模态类型（对应原型 MODALS） */
export type ModalType =
  | 'error-dir'
  | 'error-perm'
  | 'error-disk'
  | 'unsupported'
  | 'about'
  | 'confirm-cancel'
  | 'preview'

export interface ModalState {
  type: ModalType
  data?: Record<string, unknown>
}

export interface Toast {
  id: number
  msg: string
  level: 'info' | 'success' | 'warn' | 'err'
}

function loadRecent(): RecentFolder[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as RecentFolder[]
  } catch {
    return []
  }
}

/** 兼容模式名（MVP 固定标准兼容模式） */
function modeOf(_c: Config): string {
  return '标准兼容模式'
}

/** 从后端 AppError（{kind,message}）或字符串提取可读信息 */
function errMsg(e: unknown): string {
  if (typeof e === 'string') {
    return e
  }
  if (e && typeof e === 'object') {
    const o = e as { message?: string }
    if (o.message) {
      return o.message
    }
  }
  return String(e)
}

/** 把后端错误 kind 映射到对应错误模态；无映射返回 null */
function errorKindOf(e: unknown): ModalType | null {
  if (e && typeof e === 'object') {
    const k = (e as { kind?: string }).kind
    if (k === 'DirAccess') {
      return 'error-dir'
    }
    if (k === 'Permission') {
      return 'error-perm'
    }
    if (k === 'DiskFull') {
      return 'error-disk'
    }
  }
  return null
}

interface State {
  view: View
  prevView: View | null
  scan: ScanResult | null
  scanProgress: ScanProgress | null
  progress: ProgressEvent | null
  summary: ProcessSummary | null
  error: string | null
  paused: boolean
  config: Config
  unlisten: UnlistenFn | null
  scanUnlisten: UnlistenFn | null
  logs: LogEntry[]
  recent: RecentFolder[]
  modal: ModalState | null
  toasts: Toast[]
  menuOpen: boolean
  toastSeq: number
  logOpen: boolean // 处理中日志面板展开态

  // 流程 actions
  selectFolder: (path?: string) => Promise<void>
  startScan: (path: string) => Promise<void>
  startProcess: () => Promise<void>
  cancel: () => Promise<void>
  togglePause: () => Promise<void>
  openOutput: () => Promise<void>
  setError: (msg: string | null) => void
  reset: () => void
  // 设置 actions
  loadSettings: () => Promise<void>
  saveSettings: (config: Config) => Promise<void>
  openLog: () => Promise<void>
  exportLog: () => Promise<void>
  // 交互 actions
  pushToast: (msg: string, level?: Toast['level']) => void
  dismissToast: (id: number) => void
  openModal: (type: ModalType, data?: Record<string, unknown>) => void
  closeModal: () => void
  toggleMenu: (force?: boolean) => void
  openSettings: () => void
  closeSettings: () => void
  setLogOpen: (open: boolean) => void
  setConfig: (config: Config) => void
  addRecent: (folder: RecentFolder) => void
  restoreLastFolder: () => Promise<void>
}

export const useAppStore = create<State>((set, get) => ({
  view: 'home',
  prevView: null,
  scan: null,
  scanProgress: null,
  progress: null,
  summary: null,
  error: null,
  paused: false,
  config: DEFAULT_CONFIG,
  unlisten: null,
  scanUnlisten: null,
  logs: [],
  recent: loadRecent(),
  modal: null,
  toasts: [],
  menuOpen: false,
  toastSeq: 0,
  logOpen: false,

  // 选择文件夹（无 path 时打开系统选择器；拖拽可直传 path）
  selectFolder: async (path) => {
    if (!path) {
      const selected = await open({ directory: true, multiple: false })
      if (!selected || typeof selected !== 'string') {
        return
      }
      path = selected
    }
    await get().startScan(path)
  },

  // 扫描：订阅 scan://progress 流式计数，完成后进 result
  startScan: async (path) => {
    set({ view: 'scanning', error: null, scanProgress: null, modal: null })
    const un = await listen<ScanProgress>('scan://progress', (e) => {
      set({ scanProgress: e.payload })
    })
    set({ scanUnlisten: () => un })
    try {
      const result = await cmd.scanDirectory(path)
      un()
      set({ scanUnlisten: null })
      if (result.total === 0) {
        set({ view: 'home', error: '这个文件夹里没有可处理的照片' })
        return
      }
      set({ view: 'result', scan: result })
      // 记录上次文件夹路径（供下次启动恢复，持久化到后端 config.json）
      const next = { ...get().config, last_folder: path }
      set({ config: next })
      void cmd.saveSettings(next)
    } catch (e) {
      un()
      set({ scanUnlisten: null, view: 'home', error: errMsg(e) })
      const kind = errorKindOf(e)
      if (kind) {
        set({ modal: { type: kind } })
      }
    }
  },

  // 启动处理：订阅进度 + 日志 + 汇总
  startProcess: async () => {
    const scan = get().scan
    if (!scan) {
      return
    }
    const old = get().unlisten
    if (old) {
      old()
    }

    set({
      view: 'processing',
      progress: null,
      summary: null,
      paused: false,
      logs: [],
      logOpen: false,
    })
    const un1 = await listen<ProgressEvent>('process://progress', (e) => {
      set({ progress: e.payload })
    })
    const un2 = await listen<LogEntry>('process://log', (e) => {
      const logs = [...get().logs, e.payload]
      if (logs.length > MAX_LOGS) {
        logs.splice(0, logs.length - MAX_LOGS)
      }
      set({ logs })
    })
    const un3 = await listen<ProcessSummary>('process://summary', (e) => {
      const s = e.payload
      set({ summary: s, view: 'completed' })
      // 记录最近文件夹（取消则不计）
      const sc = get().scan
      if (sc && !s.cancelled) {
        get().addRecent({
          path: sc.source_dir,
          ts: Date.now(),
          count: s.done,
          mode: modeOf(get().config),
        })
      }
    })
    set({
      unlisten: () => {
        un1()
        un2()
        un3()
      },
    })
    try {
      await cmd.startProcess(scan.source_dir, get().config)
    } catch (e) {
      set({ error: errMsg(e), view: 'home' })
    }
  },

  cancel: async () => {
    await cmd.cancelProcess()
  },

  togglePause: async () => {
    const next = !get().paused
    set({ paused: next })
    if (next) {
      await cmd.pauseProcess()
    } else {
      await cmd.resumeProcess()
    }
  },

  openOutput: async () => {
    const summary = get().summary
    if (summary?.output_dir) {
      await cmd.openOutput(summary.output_dir)
      return
    }
    const scan = get().scan
    if (!scan) {
      return
    }
    const outDir = await join(scan.source_dir, get().config.subfolder)
    await cmd.openOutput(outDir)
  },

  setError: (msg) => set({ error: msg }),

  reset: () => {
    const u = get().unlisten
    if (u) {
      u()
    }
    const su = get().scanUnlisten
    if (su) {
      su()
    }
    set({
      view: 'home',
      scan: null,
      scanProgress: null,
      progress: null,
      summary: null,
      error: null,
      paused: false,
      unlisten: null,
      scanUnlisten: null,
      logs: [],
      modal: null,
      menuOpen: false,
      logOpen: false,
    })
  },

  loadSettings: async () => {
    try {
      const c = await cmd.loadSettings()
      set({ config: c })
    } catch {
      // 失败保留默认
    }
  },

  saveSettings: async (config) => {
    set({ config })
    try {
      await cmd.saveSettings(config)
      // 自动保存：每个开关都触发，成功不打扰用户；仅失败时提示
    } catch (e) {
      get().pushToast(`保存失败：${errMsg(e)}`, 'err')
    }
  },

  openLog: async () => {
    try {
      await cmd.openLog()
      get().pushToast('已打开日志文件', 'info')
    } catch (e) {
      get().pushToast(`打开失败：${errMsg(e)}`, 'err')
    }
  },

  exportLog: async () => {
    try {
      const p = await cmd.exportLog()
      get().pushToast(`日志路径：${p}`, 'success')
    } catch (e) {
      get().pushToast(`导出失败：${errMsg(e)}`, 'err')
    }
  },

  pushToast: (msg, level = 'info') => {
    const id = get().toastSeq + 1
    set({ toastSeq: id, toasts: [...get().toasts, { id, msg, level }] })
    // 3.4s 自动消失
    setTimeout(() => get().dismissToast(id), 3400)
  },

  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  openModal: (type, data) => set({ modal: { type, data } }),
  closeModal: () => set({ modal: null }),

  toggleMenu: (force) => set({ menuOpen: force ?? !get().menuOpen }),

  openSettings: () => {
    void get().loadSettings()
    set({ prevView: get().view, view: 'settings', menuOpen: false })
  },
  closeSettings: () => set({ view: get().prevView ?? 'home', prevView: null }),

  setLogOpen: (open) => set({ logOpen: open }),

  setConfig: (config) => set({ config }),

  // 启动恢复：若偏好开启且有上次目录，自动进入该目录扫描
  restoreLastFolder: async () => {
    const { restoreLastFolder } = loadPrefs()
    if (restoreLastFolder) {
      const last = get().config.last_folder
      if (last) {
        await get().startScan(last)
      }
    }
  },

  addRecent: (folder) => {
    const list = get().recent.filter((r) => r.path !== folder.path)
    list.unshift(folder)
    if (list.length > MAX_RECENT) {
      list.length = MAX_RECENT
    }
    set({ recent: list })
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(list))
    } catch {
      // 忽略 localStorage 不可用
    }
  },
}))
