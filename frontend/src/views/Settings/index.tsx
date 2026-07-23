import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import BuildIcon from '@mui/icons-material/Build'
import IosShareIcon from '@mui/icons-material/IosShare'
import PaletteIcon from '@mui/icons-material/Palette'
import SearchIcon from '@mui/icons-material/Search'
import ShieldIcon from '@mui/icons-material/Shield'
import SpeedIcon from '@mui/icons-material/Speed'
import TuneIcon from '@mui/icons-material/Tune'
import { Box, IconButton, InputAdornment, TextField } from '@mui/material'
import { useColorScheme } from '@mui/material/styles'
import type { FC, ReactNode } from 'react'
import { useState } from 'react'
import { useAppStore } from '../../store/appStore'
import type { Config } from '../../types'
import { AdvancedGroup } from './groups/AdvancedGroup'
import { AppearanceGroup } from './groups/AppearanceGroup'
import { CompatGroup } from './groups/CompatGroup'
import { GeneralGroup } from './groups/GeneralGroup'
import { OutputGroup } from './groups/OutputGroup'
import { PerfGroup } from './groups/PerfGroup'
import { type LocalPrefs, loadPrefs, PREF_KEY } from './prefs'

type GroupKey = 'general' | 'output' | 'compat' | 'perf' | 'appearance' | 'advanced'

const NAV: { key: GroupKey; label: string; icon: ReactNode }[] = [
  { key: 'general', label: '通用', icon: <TuneIcon fontSize="small" /> },
  { key: 'output', label: '输出', icon: <IosShareIcon fontSize="small" /> },
  { key: 'compat', label: '兼容性', icon: <ShieldIcon fontSize="small" /> },
  { key: 'perf', label: '性能', icon: <SpeedIcon fontSize="small" /> },
  { key: 'appearance', label: '外观', icon: <PaletteIcon fontSize="small" /> },
  { key: 'advanced', label: '高级', icon: <BuildIcon fontSize="small" /> },
]

export const SettingsView: FC = () => {
  const config = useAppStore((s) => s.config)
  const setConfig = useAppStore((s) => s.setConfig)
  const saveSettings = useAppStore((s) => s.saveSettings)
  const closeSettings = useAppStore((s) => s.closeSettings)
  const pushToast = useAppStore((s) => s.pushToast)
  const { setMode } = useColorScheme()

  const [group, setGroup] = useState<GroupKey>('general')
  const [prefs, setPrefs] = useState<LocalPrefs>(loadPrefs)
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>('system')

  // 更新后端配置：同步内存 + 持久化
  const update = (patch: Partial<Config>) => {
    const next = { ...config, ...patch }
    setConfig(next)
    void saveSettings(next)
  }
  // 更新本地偏好：写 localStorage
  const updatePref = (patch: Partial<LocalPrefs>) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(next))
    } catch {
      // 忽略 localStorage 不可用
    }
  }
  const onTheme = (m: 'system' | 'light' | 'dark') => {
    setThemeMode(m)
    if (setMode) {
      setMode(m)
    }
  }

  // 各分组共享的上下文（config + update + toast / prefs + updatePref）
  const settingsCtx = { config, update, pushToast }
  const prefCtx = { prefs, updatePref }

  return (
    <Box sx={{ display: 'flex', height: '100%' }}>
      {/* 侧栏 */}
      <Box
        sx={{
          width: 200,
          flexShrink: 0,
          bgcolor: 'var(--surface-alt)',
          borderRight: '1px solid var(--mui-palette-divider)',
          p: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          onClick={closeSettings}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: 13,
            color: 'var(--mui-palette-primary-main)',
            fontWeight: 500,
            px: '10px',
            py: 1,
            mb: 1.5,
            cursor: 'pointer',
            borderRadius: 1,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <ArrowBackIcon fontSize="small" /> 返回
        </Box>
        <TextField
          placeholder="搜索设置项"
          size="small"
          sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { fontSize: 13 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: 'var(--mui-palette-text-disabled)' }} />
                </InputAdornment>
              ),
            },
          }}
        />
        {NAV.map((n) => (
          <Box
            key={n.key}
            onClick={() => setGroup(n.key)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              px: '10px',
              py: '9px',
              borderRadius: 1,
              fontSize: 13,
              mb: '1px',
              cursor: 'pointer',
              color: group === n.key ? 'var(--mui-palette-primary-main)' : 'text.primary',
              bgcolor: group === n.key ? 'var(--accent-soft)' : 'transparent',
              fontWeight: group === n.key ? 600 : 400,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {n.icon} {n.label}
          </Box>
        ))}
      </Box>

      {/* 内容区：按选中分组渲染对应面板 */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        {group === 'compat' ? <CompatGroup {...settingsCtx} /> : null}
        {group === 'output' ? <OutputGroup {...settingsCtx} /> : null}
        {group === 'perf' ? <PerfGroup {...settingsCtx} /> : null}
        {group === 'general' ? <GeneralGroup {...settingsCtx} {...prefCtx} /> : null}
        {group === 'appearance' ? (
          <AppearanceGroup {...prefCtx} themeMode={themeMode} onTheme={onTheme} />
        ) : null}
        {group === 'advanced' ? <AdvancedGroup {...settingsCtx} /> : null}
      </Box>

      {/* 关闭按钮（右上角备用） */}
      <IconButton
        onClick={closeSettings}
        size="small"
        sx={{ position: 'absolute', top: 8, right: 8, display: 'none' }}
      />
    </Box>
  )
}
