import { Box, Paper } from '@mui/material'
import type { FC } from 'react'
import { type Toast, useAppStore } from '../store/appStore'

const ICON: Record<Toast['level'], string> = {
  info: 'ℹ',
  success: '✓',
  warn: '⚠',
  err: '✕',
}

const ACCENT: Record<Toast['level'], string> = {
  info: 'var(--mui-palette-primary-main)',
  success: 'var(--mui-palette-success-main)',
  warn: 'var(--mui-palette-warning-main)',
  err: 'var(--mui-palette-error-main)',
}

// 深色 Snackbar 堆叠（原型 .toast：右下角，深底白字）
export const ToastHost: FC = () => {
  const toasts = useAppStore((s) => s.toasts)
  if (toasts.length === 0) {
    return null
  }
  return (
    <Box
      sx={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 1200,
      }}
    >
      {toasts.map((t) => (
        <Paper
          key={t.id}
          elevation={8}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            bgcolor: '#33373d',
            color: '#fff',
            borderRadius: 2,
            px: 2,
            py: 1.5,
            minWidth: 288,
            maxWidth: 400,
          }}
        >
          <Box component="span" sx={{ color: ACCENT[t.level], fontWeight: 700 }}>
            {ICON[t.level]}
          </Box>
          <Box sx={{ fontSize: 14, flex: 1 }}>{t.msg}</Box>
        </Paper>
      ))}
    </Box>
  )
}
