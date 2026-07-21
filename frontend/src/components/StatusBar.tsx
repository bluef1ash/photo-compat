import { Box } from '@mui/material'
import { useAppStore } from '../store/appStore'
import type { View } from '../types'

type DotClass = 'running' | 'paused' | ''
type StatusKey = 'ready' | 'scanning' | 'processing' | 'paused' | 'done'

const STATUS: Record<StatusKey, { text: string; dot: DotClass }> = {
  ready: { text: '就绪', dot: '' },
  scanning: { text: '扫描中', dot: 'running' },
  processing: { text: '处理中', dot: 'running' },
  paused: { text: '已暂停', dot: 'paused' },
  done: { text: '处理完成', dot: '' },
}

const DOT_BG: Record<DotClass, string> = {
  '': 'var(--mui-palette-success-main)',
  running: 'var(--mui-palette-primary-main)',
  paused: 'var(--mui-palette-warning-main)',
}

// 视图 + 暂停态 → 状态键（避免嵌套三元）
function statusKeyFor(view: View, paused: boolean): StatusKey {
  if (view === 'scanning') {
    return 'scanning'
  }
  if (view === 'processing') {
    return paused ? 'paused' : 'processing'
  }
  if (view === 'completed') {
    return 'done'
  }
  return 'ready'
}

export const StatusBar = () => {
  const view = useAppStore((s) => s.view)
  const paused = useAppStore((s) => s.paused)
  const config = useAppStore((s) => s.config)

  const key = statusKeyFor(view, paused)
  const st = STATUS[key]
  const animated = st.dot === 'running'

  return (
    <Box
      component="footer"
      sx={{
        flexShrink: 0,
        height: 26,
        display: 'flex',
        alignItems: 'center',
        bgcolor: 'var(--surface-alt)',
        borderTop: '1px solid var(--mui-palette-divider)',
        px: '14px',
        fontSize: 'var(--text-caption)',
        color: 'var(--mui-palette-text-secondary)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Box
          component="span"
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: DOT_BG[st.dot],
            animation: animated ? 'pulse 1.4s ease-in-out infinite' : 'none',
          }}
        />
        <Box component="span">{st.text}</Box>
      </Box>
      <Box sx={{ m: '0 auto', display: 'flex', alignItems: 'center' }}>
        标准兼容模式
        <Box component="span" sx={{ color: 'var(--mui-palette-grey-400)', mx: '8px' }}>
          ·
        </Box>
        输出到 同目录/{config.subfolder}
      </Box>
      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
        <span>离线</span>
        <Box component="span" sx={{ color: 'var(--mui-palette-grey-400)', mx: '8px' }}>
          ·
        </Box>
        <span>v1.0</span>
      </Box>
    </Box>
  )
}
