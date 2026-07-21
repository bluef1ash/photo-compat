import { Box } from '@mui/material'
import type { FC } from 'react'
import { useAppStore } from '../../store/appStore'

export const ScanningView: FC = () => {
  const scanProgress = useAppStore((s) => s.scanProgress)
  const found = scanProgress?.found ?? 0
  const path = scanProgress?.current_path ?? ''

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 2,
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          border: '5px solid var(--accent-soft)',
          borderTopColor: 'var(--mui-palette-primary-main)',
          animation: 'spin .9s linear infinite',
        }}
      />
      <Box sx={{ fontSize: 'var(--text-subtitle)', fontWeight: 600 }}>正在扫描文件夹…</Box>
      <Box sx={{ fontSize: 'var(--text-body)', color: 'var(--mui-palette-text-secondary)' }}>
        已发现
        <Box
          component="b"
          sx={{
            display: 'block',
            color: 'var(--mui-palette-primary-main)',
            fontSize: 'var(--text-display)',
            fontWeight: 600,
            mt: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {found}
        </Box>
        <Box component="span" sx={{ fontSize: 13, color: 'var(--mui-palette-text-disabled)' }}>
          张图片
        </Box>
      </Box>
      <Box
        sx={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--mui-palette-text-secondary)',
          maxWidth: 560,
          wordBreak: 'break-all',
        }}
      >
        {path}
      </Box>
    </Box>
  )
}
