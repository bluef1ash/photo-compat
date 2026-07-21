import { Box } from '@mui/material'
import type React from 'react'
import { useAppStore } from '../store/appStore'

// 视图→状态文案映射,对象索引替代嵌套三元(noNestedTernary)
const STATUS_TEXT: Record<string, string> = {
  processing: '处理中',
  scanning: '扫描中',
}

export const StatusBar: React.FC = () => {
  const view = useAppStore((s) => s.view)
  const status = STATUS_TEXT[view] ?? '就绪'
  const busy = view === 'processing' || view === 'scanning'
  return (
    <Box
      component="footer"
      sx={{
        height: 28,
        display: 'flex',
        alignItems: 'center',
        px: 2,
        gap: 1.5,
        fontSize: 'var(--text-caption)',
        color: 'var(--mui-palette-text-secondary)',
        borderTop: '1px solid var(--mui-palette-divider)',
      }}
    >
      <Box
        component="span"
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: busy ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-text-disabled)',
        }}
      />
      <Box component="span">{status}</Box>
      <Box component="span" sx={{ ml: 'auto' }}>
        输出到 同目录/compat
      </Box>
      <Box component="span">· 离线 · v1.0</Box>
    </Box>
  )
}
