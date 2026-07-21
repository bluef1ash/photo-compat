import { Box } from '@mui/material'
import type React from 'react'
import { DropZone } from '../../components/DropZone'
import { useAppStore } from '../../store/appStore'

export const HomeView: React.FC = () => {
  const error = useAppStore((s) => s.error)
  return (
    <Box sx={{ maxWidth: '42rem', mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Box component="h1" sx={{ fontSize: 'var(--text-title)', fontWeight: 600, m: 0 }}>
          把照片变成任何老旧系统都能上传的格式
        </Box>
        <Box component="p" sx={{ mt: 1, mb: 0, color: 'var(--mui-palette-text-secondary)' }}>
          全程离线,不上传任何文件,安全放心
        </Box>
      </Box>
      <DropZone />
      {error && (
        <Box
          role="alert"
          sx={{
            color: 'var(--mui-palette-error-main)',
            bgcolor: 'var(--error-soft)',
            p: 1.5,
            borderRadius: 1,
          }}
        >
          {error}
        </Box>
      )}
      <Box sx={{ color: 'var(--mui-palette-text-secondary)', fontSize: 'var(--text-caption)' }}>
        支持 JPEG / PNG / HEIC / WebP / GIF / TIFF · 自动转换为高兼容 JPEG
      </Box>
    </Box>
  )
}
