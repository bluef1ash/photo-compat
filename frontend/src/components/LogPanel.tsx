import ListIcon from '@mui/icons-material/List'
import { Box, Paper } from '@mui/material'
import type { FC } from 'react'
import { useAppStore } from '../store/appStore'
import type { LogEntry } from '../types'

const LEVEL_COLOR: Record<LogEntry['level'], string> = {
  ok: 'var(--mui-palette-success-main)',
  warn: 'var(--mui-palette-warning-main)',
  err: 'var(--mui-palette-error-main)',
  info: 'var(--mui-palette-text-secondary)',
}

export const LogPanel: FC = () => {
  const logs = useAppStore((s) => s.logs)
  const logOpen = useAppStore((s) => s.logOpen)
  const setLogOpen = useAppStore((s) => s.setLogOpen)

  return (
    <Paper variant="outlined" sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
      <Box
        onClick={() => setLogOpen(!logOpen)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 1.5,
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': { bgcolor: 'var(--surface-alt)' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 13, fontWeight: 600 }}>
          <ListIcon fontSize="small" /> 实时日志
        </Box>
        <Box sx={{ fontSize: 12, color: 'var(--mui-palette-primary-main)', fontWeight: 500 }}>
          {logOpen ? '隐藏' : '展开'}
        </Box>
      </Box>
      {logOpen ? (
        <Box
          sx={{
            maxHeight: 200,
            overflowY: 'auto',
            borderTop: '1px solid var(--mui-palette-divider)',
            py: 1,
          }}
        >
          {logs.length === 0 ? (
            <Box sx={{ px: 2, py: 1, fontSize: 12, color: 'var(--mui-palette-text-disabled)' }}>
              暂无日志
            </Box>
          ) : (
            logs.map((l) => (
              <Box
                key={`${l.ts}-${l.msg}`}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  px: 2,
                  py: '4px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                <Box sx={{ color: 'var(--mui-palette-text-disabled)', flexShrink: 0 }}>{l.ts}</Box>
                <Box sx={{ color: LEVEL_COLOR[l.level] }}>{l.msg}</Box>
              </Box>
            ))
          )}
        </Box>
      ) : null}
    </Paper>
  )
}
