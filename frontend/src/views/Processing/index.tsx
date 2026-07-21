import { Box } from '@mui/material'
import type React from 'react'
import { useEffect } from 'react'
import { Button } from '../../components/Button'
import { ProgressBar } from '../../components/ProgressBar'
import { StatCard } from '../../components/StatCard'
import { useAppStore } from '../../store/appStore'

export const ProcessingView: React.FC = () => {
  const progress = useAppStore((s) => s.progress)
  const paused = useAppStore((s) => s.paused)
  const togglePause = useAppStore((s) => s.togglePause)
  const cancel = useAppStore((s) => s.cancel)

  // §5.4 Space 暂停/继续
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        togglePause()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePause])

  const pct =
    progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
  const failed = progress?.failed ?? 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '56rem', mx: 'auto' }}>
      <Box>
        <Box
          className="tabular-nums"
          sx={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-display-num-lg)',
            fontWeight: 600,
          }}
        >
          {pct}%
        </Box>
        <ProgressBar value={pct} />
        <Box sx={{ mt: 1, color: 'var(--mui-palette-text-secondary)' }}>
          已处理 {progress?.done ?? 0} / {progress?.total ?? 0}
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
        <StatCard value={progress?.done ?? 0} label="已处理" />
        <StatCard value={failed} label="失败" tone={failed > 0 ? 'error' : 'default'} />
        <StatCard value={progress?.skipped ?? 0} label="跳过" tone="muted" />
        <StatCard value={paused ? '已暂停' : '运行中'} label="状态" />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
        <Button variant="destructive" onClick={cancel}>
          取消
        </Button>
        <Button variant="secondary" onClick={togglePause}>
          {paused ? '继续' : '暂停'}
        </Button>
      </Box>
    </Box>
  )
}
