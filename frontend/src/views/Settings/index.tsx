import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import BuildIcon from '@mui/icons-material/Build'
import IosShareIcon from '@mui/icons-material/IosShare'
import PaletteIcon from '@mui/icons-material/Palette'
import SearchIcon from '@mui/icons-material/Search'
import ShieldIcon from '@mui/icons-material/Shield'
import SpeedIcon from '@mui/icons-material/Speed'
import TuneIcon from '@mui/icons-material/Tune'
import {
  Box,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Slider,
  Switch,
  TextField,
} from '@mui/material'
import { useColorScheme } from '@mui/material/styles'
import type { FC, ReactNode } from 'react'
import { useState } from 'react'
import { Button } from '../../components/Button'
import { Segmented } from '../../components/Segmented'
import { useAppStore } from '../../store/appStore'
import type { Config } from '../../types'

type GroupKey = 'general' | 'output' | 'compat' | 'perf' | 'appearance' | 'advanced'

const NAV: { key: GroupKey; label: string; icon: ReactNode }[] = [
  { key: 'general', label: '通用', icon: <TuneIcon fontSize="small" /> },
  { key: 'output', label: '输出', icon: <IosShareIcon fontSize="small" /> },
  { key: 'compat', label: '兼容性', icon: <ShieldIcon fontSize="small" /> },
  { key: 'perf', label: '性能', icon: <SpeedIcon fontSize="small" /> },
  { key: 'appearance', label: '外观', icon: <PaletteIcon fontSize="small" /> },
  { key: 'advanced', label: '高级', icon: <BuildIcon fontSize="small" /> },
]

const PREF_KEY = 'photo-compat:prefs'

interface LocalPrefs {
  lang: 'zh' | 'en'
  sound: boolean
  closeAction: 'exit' | 'minimize'
  accent: 'blue' | 'green' | 'purple'
  fontSize: 'standard' | 'large' | 'xl'
  titlebar: 'custom' | 'system'
  tray: boolean
  reduceAnim: boolean
}

function defaultPrefs(): LocalPrefs {
  return {
    lang: 'zh',
    sound: true,
    closeAction: 'exit',
    accent: 'blue',
    fontSize: 'standard',
    titlebar: 'custom',
    tray: false,
    reduceAnim: false,
  }
}

function loadPrefs(): LocalPrefs {
  try {
    return { ...defaultPrefs(), ...JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}') }
  } catch {
    return defaultPrefs()
  }
}

const Row: FC<{
  title: ReactNode
  desc?: ReactNode
  hint?: ReactNode
  hintWarn?: boolean
  children: ReactNode
}> = ({ title, desc, hint, hintWarn = false, children }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      py: 2,
      borderBottom: '1px solid var(--mui-palette-divider)',
      '&:last-child': { borderBottom: 'none' },
    }}
  >
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Box
        sx={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        {title}
      </Box>
      {desc ? (
        <Box
          sx={{
            fontSize: 12,
            color: 'var(--mui-palette-text-secondary)',
            mt: '3px',
            lineHeight: 1.5,
          }}
        >
          {desc}
        </Box>
      ) : null}
      {hint ? (
        <Box
          sx={{
            fontSize: 11,
            mt: '4px',
            color: hintWarn ? 'var(--mui-palette-warning-main)' : 'var(--mui-palette-primary-main)',
          }}
        >
          {hint}
        </Box>
      ) : null}
    </Box>
    <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1 }}>{children}</Box>
  </Box>
)

const GroupTitle: FC<{ title: string; desc: string }> = ({ title, desc }) => (
  <Box sx={{ mb: 2 }}>
    <Box sx={{ fontSize: 'var(--text-subtitle)', fontWeight: 600 }}>{title}</Box>
    <Box sx={{ fontSize: 13, color: 'var(--mui-palette-text-secondary)', mt: '4px' }}>{desc}</Box>
  </Box>
)

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

  const update = (patch: Partial<Config>) => {
    const next = { ...config, ...patch }
    setConfig(next)
    void saveSettings(next)
  }
  const updatePref = (patch: Partial<LocalPrefs>) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(next))
    } catch {
      // 忽略
    }
  }
  const onTheme = (m: 'system' | 'light' | 'dark') => {
    setThemeMode(m)
    if (setMode) {
      setMode(m)
    }
  }

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

      {/* 内容区 */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        {group === 'compat' ? (
          <Box>
            <GroupTitle title="兼容性" desc="核心设置。默认值已为 95% 场景优化，通常无需修改。" />
            <Paper elevation={0} sx={{ p: '0 16px' }}>
              <Row title="移除拍摄信息（EXIF）" desc="删除相机型号、拍摄时间、GPS 定位等隐藏信息。">
                <Switch
                  checked={config.remove_exif}
                  onChange={(e) => update({ remove_exif: e.target.checked })}
                />
              </Row>
              <Row
                title="移除颜色配置（ICC）"
                desc="删除颜色管理信息。部分老系统不识别 ICC 会报错。"
              >
                <Switch
                  checked={config.remove_icc}
                  onChange={(e) => update({ remove_icc: e.target.checked })}
                />
              </Row>
              <Row
                title="自动修正方向"
                desc="根据拍摄方向把照片摆正，避免 iPhone 照片在老系统里横倒显示。"
              >
                <Switch
                  checked={config.auto_orient}
                  onChange={(e) => update({ auto_orient: e.target.checked })}
                />
              </Row>
              <Row
                title="转为基础式 JPEG（Baseline）"
                desc="把渐进式 JPEG 转成基础式，解决老系统只显示半张图的问题。"
              >
                <Switch
                  checked={config.baseline_jpeg}
                  onChange={(e) => update({ baseline_jpeg: e.target.checked })}
                />
              </Row>
              <Row title="转换 HEIC" desc="把 iPhone 默认的 HEIC 格式转成 JPEG。">
                <Switch
                  checked={config.convert_heic}
                  onChange={(e) => update({ convert_heic: e.target.checked })}
                />
              </Row>
              <Row
                title="转为 sRGB 色彩空间"
                desc="统一为兼容性最好的色彩空间，避免老系统色彩错乱。"
              >
                <Switch
                  checked={config.to_srgb}
                  onChange={(e) => update({ to_srgb: e.target.checked })}
                />
              </Row>
              <Row
                title="JPEG 质量"
                desc="0–100，越高越清晰、文件越大。90 兼顾画质与兼容。"
                hint="推荐 90 · 低于 75 可能肉眼可见模糊"
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Slider
                    value={config.jpeg_quality}
                    min={60}
                    max={100}
                    onChange={(_, v) => update({ jpeg_quality: v as number })}
                    sx={{ width: 160 }}
                  />
                  <Box
                    sx={{
                      minWidth: 32,
                      textAlign: 'right',
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {config.jpeg_quality}
                  </Box>
                </Box>
              </Row>
              <Row title="最大宽度" desc="超宽图按此值缩小。老系统常拒绝超大图。">
                <TextField
                  type="number"
                  size="small"
                  value={config.max_width}
                  onChange={(e) => update({ max_width: Number(e.target.value) })}
                  sx={{ width: 90 }}
                />
                <Box sx={{ fontSize: 12, color: 'var(--mui-palette-text-secondary)' }}>px</Box>
              </Row>
              <Row title="最大高度" desc="同上。">
                <TextField
                  type="number"
                  size="small"
                  value={config.max_height}
                  onChange={(e) => update({ max_height: Number(e.target.value) })}
                  sx={{ width: 90 }}
                />
                <Box sx={{ fontSize: 12, color: 'var(--mui-palette-text-secondary)' }}>px</Box>
              </Row>
            </Paper>
          </Box>
        ) : null}

        {group === 'output' ? (
          <Box>
            <GroupTitle
              title="输出"
              desc="控制处理结果的保存位置与命名方式。默认安全：写入子目录、不覆盖原文件。"
            />
            <Paper elevation={0} sx={{ p: '0 16px' }}>
              <Row title="输出位置" desc="结果保存到哪里。">
                <Segmented
                  value="subfolder"
                  options={[
                    { value: 'subfolder', label: '同目录子文件夹' },
                    { value: 'custom', label: '指定目录' },
                  ]}
                  onChange={() => pushToast('指定目录暂未启用', 'info')}
                />
              </Row>
              <Row title="子文件夹名" desc="输出子目录的名称。">
                <TextField
                  size="small"
                  value={config.subfolder}
                  onChange={(e) => update({ subfolder: String(e.target.value) })}
                  sx={{ width: 130 }}
                />
              </Row>
              <Row
                title="保留文件夹结构"
                desc="输出时镜像原目录树；关闭则全部平铺到一个文件夹（同名自动加序号）。"
              >
                <Switch
                  checked={config.keep_structure}
                  onChange={(e) => update({ keep_structure: e.target.checked })}
                />
              </Row>
              <Row
                title="覆盖已存在文件"
                desc="开启则同名文件直接覆盖（危险）；关闭则跳过或加序号。"
                hint="谨慎：开启可能覆盖原始结果"
                hintWarn
              >
                <Switch
                  checked={config.overwrite}
                  onChange={(e) => update({ overwrite: e.target.checked })}
                />
              </Row>
            </Paper>
          </Box>
        ) : null}

        {group === 'perf' ? (
          <Box>
            <GroupTitle
              title="性能"
              desc="处理速度与资源占用。并行数与内存上限会按 CPU 架构自动调整。"
            />
            <Paper elevation={0} sx={{ p: '0 16px' }}>
              <Row
                title="并行处理数"
                desc="同时处理的图片数量。越多越快，但占内存越大。"
                hint="MVP：后端并行由 rayon 默认控制，此值暂未生效"
              >
                <TextField
                  type="number"
                  size="small"
                  value={config.parallel}
                  onChange={(e) => update({ parallel: Number(e.target.value) })}
                  sx={{ width: 90 }}
                />
              </Row>
              <Row title="处理优先级" desc='"低"时后台处理不卡前台其他程序。'>
                <Segmented
                  value="normal"
                  options={[
                    { value: 'normal', label: '正常' },
                    { value: 'low', label: '低' },
                  ]}
                  onChange={() => pushToast('优先级切换（演示）', 'info')}
                />
              </Row>
            </Paper>
          </Box>
        ) : null}

        {group === 'general' ? (
          <Box>
            <GroupTitle title="通用" desc="基础偏好设置，影响应用整体行为。" />
            <Paper elevation={0} sx={{ p: '0 16px' }}>
              <Row title="界面语言" desc="应用界面显示的语言。">
                <Segmented
                  value={prefs.lang}
                  options={[
                    { value: 'zh', label: '简体中文' },
                    { value: 'en', label: 'English' },
                  ]}
                  onChange={(v) => updatePref({ lang: v as LocalPrefs['lang'] })}
                />
              </Row>
              <Row title="启动时恢复上次文件夹" desc="打开应用时自动进入上次处理的目录。">
                <Switch
                  checked={!!config.last_folder}
                  onChange={(e) =>
                    update({ last_folder: e.target.checked ? (config.last_folder ?? ' ') : null })
                  }
                />
              </Row>
              <Row title="处理完成提示音" desc="全部处理完成后播放一声提示音。">
                <Switch
                  checked={prefs.sound}
                  onChange={(e) => updatePref({ sound: e.target.checked })}
                />
              </Row>
              <Row title="关闭窗口时" desc="点击关闭按钮时的行为。">
                <Segmented
                  value={prefs.closeAction}
                  options={[
                    { value: 'exit', label: '退出' },
                    { value: 'minimize', label: '最小化到托盘' },
                  ]}
                  onChange={(v) => updatePref({ closeAction: v as LocalPrefs['closeAction'] })}
                />
              </Row>
            </Paper>
          </Box>
        ) : null}

        {group === 'appearance' ? (
          <Box>
            <GroupTitle title="外观" desc="主题、颜色与窗口装饰。" />
            <Paper elevation={0} sx={{ p: '0 16px' }}>
              <Row title="主题" desc="界面明暗模式。">
                <Segmented
                  value={themeMode}
                  options={[
                    { value: 'system', label: '跟随系统' },
                    { value: 'light', label: '浅色' },
                    { value: 'dark', label: '深色' },
                  ]}
                  onChange={(v) => onTheme(v as 'system' | 'light' | 'dark')}
                />
              </Row>
              <Row title="强调色" desc="按钮与链接的主色调。">
                <Segmented
                  value={prefs.accent}
                  options={[
                    { value: 'blue', label: '系统蓝' },
                    { value: 'green', label: '墨绿' },
                    { value: 'purple', label: '紫' },
                  ]}
                  onChange={(v) => updatePref({ accent: v as LocalPrefs['accent'] })}
                />
              </Row>
              <Row title="字号" desc="大字号适合视力不佳用户。" hint="字号缩放为后续增量">
                <Segmented
                  value={prefs.fontSize}
                  options={[
                    { value: 'standard', label: '标准' },
                    { value: 'large', label: '大' },
                    { value: 'xl', label: '超大' },
                  ]}
                  onChange={(v) => updatePref({ fontSize: v as LocalPrefs['fontSize'] })}
                />
              </Row>
              <Row
                title="窗口标题栏"
                desc="应用自绘标题栏在三端一致；可切换为系统原生装饰。"
                hint="Linux 桌面可选系统原生（CSD/SSD）"
              >
                <Segmented
                  value={prefs.titlebar}
                  options={[
                    { value: 'custom', label: '应用自绘' },
                    { value: 'system', label: '系统原生' },
                  ]}
                  onChange={(v) => updatePref({ titlebar: v as LocalPrefs['titlebar'] })}
                />
              </Row>
              <Row
                title="最小化到托盘"
                desc="关闭窗口时驻留系统托盘，可继续后台处理。"
                hint="无托盘环境（如纯 GNOME）将自动隐藏此项"
                hintWarn
              >
                <Switch
                  checked={prefs.tray}
                  onChange={(e) => updatePref({ tray: e.target.checked })}
                />
              </Row>
              <Row title="减少动画" desc="关闭过渡动画。跟随系统辅助设置。">
                <Switch
                  checked={prefs.reduceAnim}
                  onChange={(e) => updatePref({ reduceAnim: e.target.checked })}
                />
              </Row>
            </Paper>
          </Box>
        ) : null}

        {group === 'advanced' ? (
          <Box>
            <GroupTitle title="高级" desc="日志、临时目录与配置管理。普通用户无需调整。" />
            <Paper elevation={0} sx={{ p: '0 16px' }}>
              <Row title="日志级别" desc="详细日志便于排查，但文件更大。">
                <Select
                  size="small"
                  value={config.log_level}
                  onChange={(e) => update({ log_level: e.target.value as Config['log_level'] })}
                  sx={{ fontSize: 13, minWidth: 140 }}
                >
                  <MenuItem value="normal">常规</MenuItem>
                  <MenuItem value="verbose">详细</MenuItem>
                </Select>
              </Row>
              <Row title="日志保留天数" desc="超期日志自动清理。">
                <TextField
                  type="number"
                  size="small"
                  value={config.log_retention_days}
                  onChange={(e) => update({ log_retention_days: Number(e.target.value) })}
                  sx={{ width: 90 }}
                />
                <Box sx={{ fontSize: 12, color: 'var(--mui-palette-text-secondary)' }}>天</Box>
              </Row>
              <Row
                title="临时目录"
                desc="处理中转目录，建议留足空间。"
                hint="MVP：暂未启用自定义临时目录"
              >
                <TextField
                  size="small"
                  value={config.temp_dir ?? ''}
                  placeholder="系统默认"
                  onChange={(e) => update({ temp_dir: e.target.value || null })}
                  sx={{ width: 200, fontSize: 12 }}
                />
              </Row>
              <Row title="导出 / 导入配置" desc="便于备份或在多台电脑间统一部署。">
                <Button
                  variant="secondary"
                  size="compact"
                  onClick={() => pushToast('已导出配置（演示）', 'success')}
                >
                  导出
                </Button>
                <Button
                  variant="secondary"
                  size="compact"
                  onClick={() => pushToast('已导入配置（演示）', 'info')}
                >
                  导入
                </Button>
              </Row>
              <Row
                title="重置所有设置"
                desc="恢复为默认值。"
                hint="将清除自定义配置，需二次确认"
                hintWarn
              >
                <Button
                  variant="destructive"
                  size="compact"
                  onClick={() => pushToast('已重置（演示）', 'warn')}
                >
                  重置
                </Button>
              </Row>
            </Paper>
          </Box>
        ) : null}
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
