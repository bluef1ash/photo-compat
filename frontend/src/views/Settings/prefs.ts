import type { Toast } from '../../store/appStore'
import type { Config } from '../../types'

// re-export 给分组组件使用（避免每个分组单独回溯 ../../types）
export type { Config }

/** 本地偏好持久化键 */
export const PREF_KEY = 'photo-compat:prefs'

/** 仅存于前端 localStorage 的界面偏好（不进后端 config） */
export interface LocalPrefs {
  lang: 'zh' | 'en'
  sound: boolean
  closeAction: 'exit' | 'minimize'
  accent: 'blue' | 'green' | 'purple'
  fontSize: 'standard' | 'large' | 'xl'
  titlebar: 'custom' | 'system'
  tray: boolean
  reduceAnim: boolean
  restoreLastFolder: boolean
  theme: 'system' | 'light' | 'dark'
}

export function defaultPrefs(): LocalPrefs {
  return {
    lang: 'zh',
    sound: true,
    closeAction: 'exit',
    accent: 'blue',
    fontSize: 'standard',
    titlebar: 'custom',
    tray: false,
    reduceAnim: false,
    restoreLastFolder: true,
    theme: 'system',
  }
}

/** 从 localStorage 读取偏好，损坏或缺失则回退默认 */
export function loadPrefs(): LocalPrefs {
  try {
    return { ...defaultPrefs(), ...JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}') }
  } catch {
    return defaultPrefs()
  }
}

/** 分组组件共享：后端配置 + 更新 + toast */
export interface SettingsCtx {
  config: Config
  update: (patch: Partial<Config>) => void
  pushToast: (msg: string, level?: Toast['level']) => void
}

/** 通用/外观分组的本地偏好上下文 */
export interface PrefCtx {
  prefs: LocalPrefs
  updatePref: (patch: Partial<LocalPrefs>) => void
}
