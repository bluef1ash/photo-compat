// src/ipc/commands.ts
import { invoke } from '@tauri-apps/api/tauri'
import type { Config, ScanResult } from '../types'

/** 扫描目录（扫描中经 scan://progress 事件流式上报已发现数） */
export const scanDirectory = (path: string): Promise<ScanResult> =>
  invoke<ScanResult>('scan_directory_cmd', { path })

/** 启动处理（后台 spawn；进度经 process://progress、日志经 process://log、汇总经 process://summary） */
export const startProcess = (sourceDir: string, config: Config): Promise<void> =>
  invoke<void>('start_process_cmd', { sourceDir, config })

export const cancelProcess = (): Promise<boolean> => invoke<boolean>('cancel_process_cmd')

export const pauseProcess = (): Promise<boolean> => invoke<boolean>('pause_process_cmd')

export const resumeProcess = (): Promise<boolean> => invoke<boolean>('resume_process_cmd')

export const openOutput = (path: string): Promise<void> => invoke<void>('open_output_cmd', { path })

/** 读取当前配置（设置页加载） */
export const loadSettings = (): Promise<Config> => invoke<Config>('load_settings_cmd')

/** 保存配置（内存 + 持久化） */
export const saveSettings = (config: Config): Promise<void> =>
  invoke<void>('save_settings_cmd', { config })

/** 在系统资源管理器中打开最新日志文件 */
export const openLog = (): Promise<void> => invoke<void>('open_log_cmd')

/** 返回最新日志文件路径（供 toast 展示） */
export const exportLog = (): Promise<string> => invoke<string>('export_log_cmd')
