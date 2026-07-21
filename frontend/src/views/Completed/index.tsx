import CheckCircle from '@mui/icons-material/CheckCircle'
import FolderOpen from '@mui/icons-material/FolderOpen'
import { Box } from '@mui/material'
import type React from 'react'
import { Button } from '../../components/Button'
import { StatCard } from '../../components/StatCard'
import { useAppStore } from '../../store/appStore'

export const CompletedView: React.FC = () => {
  const summary = useAppStore((s) => s.summary)
  const openOutput = useAppStore((s) => s.openOutput)
  const reset = useAppStore((s) => s.reset)
  if (!summary) {
    return null
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '56rem', mx: 'auto' }}>
      <Box sx={{ textAlign: 'center', p: 3 }}>
        <CheckCircle sx={{ fontSize: 72, color: 'var(--mui-palette-success-main)' }} />
        <Box component="h1" sx={{ fontSize: 'var(--text-title)', fontWeight: 600, mt: 1, mb: 0 }}>
          处理完成!
        </Box>
        <Box sx={{ color: 'var(--mui-palette-text-secondary)' }}>
          {summary.done} 张照片已转换为兼容格式
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
        <StatCard value={summary.total} label="总计处理" />
        <StatCard value={summary.done} label="成功" />
        <StatCard
          value={summary.failed}
          label="失败"
          tone={summary.failed > 0 ? 'error' : 'default'}
        />
        <StatCard value={summary.skipped} label="跳过" tone="muted" />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
        <Button onClick={reset}>处理另一个文件夹</Button>
        <Button variant="primary" size="large" onClick={openOutput}>
          <FolderOpen /> 打开输出目录
        </Button>
      </Box>
    </Box>
  )
}
