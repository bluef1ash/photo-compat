import { Box } from '@mui/material'
import type React from 'react'
import { Button } from '../../components/Button'
import { StatCard } from '../../components/StatCard'
import { useAppStore } from '../../store/appStore'

export const ResultView: React.FC = () => {
  const scan = useAppStore((s) => s.scan)
  const startProcess = useAppStore((s) => s.startProcess)
  const reset = useAppStore((s) => s.reset)
  if (!scan) {
    return null
  }
  const formats = Object.entries(scan.by_format)
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '56rem', mx: 'auto' }}>
      <Box component="h2" sx={{ m: 0, fontWeight: 600 }}>
        扫描完成
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
        <StatCard value={scan.total} label="总图片数" />
        <StatCard value={scan.total - scan.unsupported.length} label="预计输出数量" />
        <StatCard value="—" label="预计输出大小" />
        <StatCard value="—" label="预计节省" />
      </Box>
      <Box>
        <Box sx={{ color: 'var(--mui-palette-text-secondary)', mb: 1 }}>格式分布</Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {formats.map(([fmt, n]) => (
            <Box
              key={fmt}
              component="span"
              sx={{ bgcolor: 'var(--accent-soft)', px: 1.5, py: 0.5, borderRadius: 1 }}
            >
              {fmt} {n}
            </Box>
          ))}
        </Box>
      </Box>
      {scan.unsupported.length > 0 && (
        <Box role="status" sx={{ bgcolor: 'var(--warning-soft)', p: 2, borderRadius: 1 }}>
          检测到 {scan.unsupported.length} 个暂不支持的文件,将跳过
        </Box>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
        <Button onClick={reset}>取消</Button>
        <Button variant="primary" onClick={startProcess}>
          开始处理
        </Button>
      </Box>
    </Box>
  )
}
