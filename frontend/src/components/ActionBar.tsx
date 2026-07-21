import DescriptionIcon from '@mui/icons-material/Description'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import IosShareIcon from '@mui/icons-material/IosShare'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { Box, Paper } from '@mui/material'
import type { FC, ReactNode } from 'react'
import { useAppStore } from '../store/appStore'
import { fmtSize, fmtTime } from '../utils/format'
import { Button } from './Button'

// 操作栏容器：左侧信息，右侧按钮（原型 .action-bar）
const Bar: FC<{ info: ReactNode; children: ReactNode }> = ({ info, children }) => (
  <Paper
    elevation={0}
    sx={{
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      px: 3,
      py: 1.5,
      borderTop: '1px solid var(--mui-palette-divider)',
      bgcolor: 'var(--surface-alt)',
    }}
  >
    <Box
      sx={{
        fontSize: 'var(--text-caption)',
        color: 'var(--mui-palette-text-secondary)',
        mr: 'auto',
      }}
    >
      {info}
    </Box>
    {children}
  </Paper>
)

export const ActionBar: FC = () => {
  const view = useAppStore((s) => s.view)
  const scan = useAppStore((s) => s.scan)
  const summary = useAppStore((s) => s.summary)
  const config = useAppStore((s) => s.config)
  const paused = useAppStore((s) => s.paused)
  const startProcess = useAppStore((s) => s.startProcess)
  const reset = useAppStore((s) => s.reset)
  const togglePause = useAppStore((s) => s.togglePause)
  const openLog = useAppStore((s) => s.openLog)
  const exportLog = useAppStore((s) => s.exportLog)
  const openOutput = useAppStore((s) => s.openOutput)
  const openModal = useAppStore((s) => s.openModal)

  if (view === 'result') {
    return (
      <Bar
        info={
          <span>
            共{' '}
            <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {scan?.total ?? 0}
            </Box>{' '}
            张，预计输出约 {fmtSize(scan?.estimated_output_size ?? 0)}
          </span>
        }
      >
        <Button variant="secondary" onClick={() => reset()}>
          取消
        </Button>
        <Button variant="primary" startIcon={<PlayArrowIcon />} onClick={() => void startProcess()}>
          开始处理
        </Button>
      </Bar>
    )
  }

  if (view === 'processing') {
    return (
      <Bar info={<span>标准兼容模式 · 质量 {config.jpeg_quality} · 去除 EXIF/ICC</span>}>
        <Button variant="subtle" startIcon={<DescriptionIcon />} onClick={() => void openLog()}>
          打开日志文件
        </Button>
        <Button variant="destructive" onClick={() => openModal('confirm-cancel')}>
          取消
        </Button>
        <Button variant="secondary" startIcon={<PauseIcon />} onClick={() => void togglePause()}>
          {paused ? '继续' : '暂停'}
        </Button>
      </Bar>
    )
  }

  if (view === 'completed') {
    const avg = summary?.avg_speed ?? 0
    return (
      <Bar
        info={
          <span>
            处理用时 {fmtTime(summary?.duration_secs ?? 0)} · 平均 {avg.toFixed(1)} 张/秒
          </span>
        }
      >
        <Button variant="subtle" startIcon={<IosShareIcon />} onClick={() => void exportLog()}>
          导出日志
        </Button>
        <Button variant="secondary" onClick={() => reset()}>
          处理另一个文件夹
        </Button>
        <Button
          variant="primary"
          size="large"
          startIcon={<FolderOpenIcon />}
          onClick={() => void openOutput()}
        >
          打开输出目录
        </Button>
      </Bar>
    )
  }

  return null
}
