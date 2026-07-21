import { Box } from '@mui/material'
import React from 'react'
import { useAppStore } from '../store/appStore'

const STEPS = ['选目录', '查看结果', '处理', '完成'] as const

// view → 当前步骤索引(未扫描不能前进)
const ORDER: Record<string, number> = {
  home: 0,
  scanning: 0,
  result: 1,
  processing: 2,
  completed: 3,
}

export const Stepper: React.FC = () => {
  const view = useAppStore((s) => s.view)
  const current = ORDER[view] ?? 0
  return (
    <Box component="nav" sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 3, py: 1.5 }}>
      {STEPS.map((label, i) => {
        const active = i <= current
        return (
          <React.Fragment key={label}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                component="span"
                aria-current={i === current ? 'step' : undefined}
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  bgcolor: active
                    ? 'var(--mui-palette-primary-main)'
                    : 'var(--mui-palette-grey-400)',
                  color: active ? '#FFFFFF' : 'var(--mui-palette-text-secondary)',
                }}
              >
                {i + 1}
              </Box>
              <Box
                component="span"
                sx={{
                  fontSize: 'var(--text-caption)',
                  color: active
                    ? 'var(--mui-palette-text-primary)'
                    : 'var(--mui-palette-text-secondary)',
                }}
              >
                {label}
              </Box>
            </Box>
            {i < STEPS.length - 1 && (
              <Box sx={{ flex: 1, height: 1, bgcolor: 'var(--mui-palette-divider)' }} />
            )}
          </React.Fragment>
        )
      })}
    </Box>
  )
}
