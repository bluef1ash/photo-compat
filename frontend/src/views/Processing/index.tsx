import BoltIcon from '@mui/icons-material/Bolt'
import CheckIcon from '@mui/icons-material/Check'
import FlagIcon from '@mui/icons-material/Flag'
import ImageIcon from '@mui/icons-material/Image'
import ScheduleIcon from '@mui/icons-material/Schedule'
import WarningIcon from '@mui/icons-material/Warning'
import { Box, Paper } from '@mui/material'
import type { FC } from 'react'
import { Badge } from '../../components/Badge'
import { LogPanel } from '../../components/LogPanel'
import { StatCard } from '../../components/StatCard'
import { useAppStore } from '../../store/appStore'
import { fmtPercent, fmtTime } from '../../utils/format'

export const ProcessingView: FC = () => {
  const progress = useAppStore((s) => s.progress)
  const paused = useAppStore((s) => s.paused)

  const total = progress?.total ?? 0
  const done = progress?.done ?? 0
  const failed = progress?.failed ?? 0
  const skipped = progress?.skipped ?? 0
  const processed = done + failed + skipped
  const pct = fmtPercent(processed, total)
  const fillBg = paused ? 'var(--mui-palette-text-disabled)' : 'var(--mui-palette-primary-main)'

  return (
    <Box>
      <Paper elevation={1} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Box
          sx={{
            fontSize: 'var(--text-display)',
            fontWeight: 600,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {pct}%
        </Box>
        <Box
          sx={{
            height: 8,
            my: 1.5,
            bgcolor: 'var(--mui-palette-divider)',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${pct}%`,
              bgcolor: fillBg,
              borderRadius: 1,
              transition: 'width .2s ease-out',
            }}
          />
        </Box>
        <Box sx={{ fontSize: 14, color: 'var(--mui-palette-text-secondary)' }}>
          已处理{' '}
          <Box component="b" sx={{ color: 'text.primary' }}>
            {processed}
          </Box>{' '}
          / {total}
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mt: 2,
            p: 1.5,
            bgcolor: 'var(--surface-alt)',
            borderRadius: 1,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              bgcolor: 'var(--accent-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--mui-palette-primary-main)',
              flexShrink: 0,
            }}
          >
            <ImageIcon fontSize="small" />
          </Box>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {progress?.current || '准备中…'}
          </Box>
          <Badge variant="accent">{progress?.current_op || '—'}</Badge>
        </Box>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2 }}>
        <StatCard
          small
          value={fmtTime(progress?.elapsed_secs ?? 0)}
          label="已用时间"
          icon={<ScheduleIcon fontSize="small" />}
        />
        <StatCard
          small
          value={fmtTime(progress?.remain_secs ?? 0)}
          label="预计剩余"
          icon={<ScheduleIcon fontSize="small" />}
        />
        <StatCard
          small
          value={(progress?.speed ?? 0).toFixed(1)}
          label="速度（张/秒）"
          icon={<BoltIcon fontSize="small" />}
        />
        <StatCard small value={done} label="已处理" icon={<CheckIcon fontSize="small" />} />
        <StatCard
          small
          tone={failed > 0 ? 'error' : 'default'}
          value={failed}
          label="失败"
          icon={<WarningIcon fontSize="small" />}
        />
        <StatCard
          small
          tone="skip"
          value={skipped}
          label="跳过"
          icon={<FlagIcon fontSize="small" />}
        />
      </Box>

      <LogPanel />
    </Box>
  )
}
