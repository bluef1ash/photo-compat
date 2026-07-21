import CheckIcon from '@mui/icons-material/Check'
import { Box } from '@mui/material'
import { Fragment } from 'react'
import { useAppStore } from '../store/appStore'

const STEPS = ['选目录', '查看结果', '处理', '完成'] as const

// view → 当前步骤索引（未扫描不能前进；settings 不显示步骤条）
const ORDER: Record<string, number> = {
  home: 0,
  scanning: 0,
  result: 1,
  processing: 2,
  completed: 3,
}

const LABEL_COLOR = {
  current: 'var(--mui-palette-text-primary)',
  done: 'var(--mui-palette-text-secondary)',
  todo: 'var(--mui-palette-text-disabled)',
} as const

// 步骤标签字色（避免嵌套三元）
function stepLabelColor(isCurrent: boolean, done: boolean): string {
  if (isCurrent) {
    return LABEL_COLOR.current
  }
  if (done) {
    return LABEL_COLOR.done
  }
  return LABEL_COLOR.todo
}

export const Stepper = () => {
  const view = useAppStore((s) => s.view)
  const current = ORDER[view] ?? 0
  return (
    <Box
      component="nav"
      sx={{
        flexShrink: 0,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'var(--mui-palette-background-default)',
        borderBottom: '1px solid var(--mui-palette-divider)',
        px: 6,
      }}
    >
      {STEPS.map((label, i) => {
        const done = i < current
        const isCurrent = i === current
        const accent = done || isCurrent
        return (
          <Fragment key={label}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Box
                aria-current={isCurrent ? 'step' : undefined}
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  flexShrink: 0,
                  bgcolor: accent
                    ? 'var(--mui-palette-primary-main)'
                    : 'var(--mui-palette-background-paper)',
                  border: '2px solid',
                  borderColor: accent
                    ? 'var(--mui-palette-primary-main)'
                    : 'var(--mui-palette-grey-400)',
                  color: accent
                    ? 'var(--mui-palette-primary-contrastText)'
                    : 'var(--mui-palette-text-secondary)',
                  boxShadow: isCurrent ? '0 0 0 4px var(--accent-soft)' : 'none',
                  transition: 'all .15s',
                }}
              >
                {done ? <CheckIcon sx={{ fontSize: 16 }} /> : i + 1}
              </Box>
              <Box
                sx={{
                  fontSize: 13,
                  fontWeight: isCurrent ? 600 : 500,
                  whiteSpace: 'nowrap',
                  color: stepLabelColor(isCurrent, done),
                }}
              >
                {label}
              </Box>
            </Box>
            {i < STEPS.length - 1 ? (
              <Box
                sx={{
                  width: 48,
                  height: 2,
                  mx: '14px',
                  flexShrink: 0,
                  borderRadius: 1,
                  bgcolor: done ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-divider)',
                  transition: 'background .15s',
                }}
              />
            ) : null}
          </Fragment>
        )
      })}
    </Box>
  )
}
