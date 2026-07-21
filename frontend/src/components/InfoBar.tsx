import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { Box, Paper } from '@mui/material'
import type React from 'react'

type Tone = 'info' | 'warn' | 'err' | 'success'

const ICON: Record<Tone, React.ReactNode> = {
  info: <InfoOutlinedIcon fontSize="small" />,
  warn: <WarningAmberIcon fontSize="small" />,
  err: <ErrorIcon fontSize="small" />,
  success: <CheckCircleIcon fontSize="small" />,
}
const BG: Record<Tone, string> = {
  info: 'var(--accent-soft)',
  warn: 'var(--warning-soft)',
  err: 'var(--error-soft)',
  success: 'var(--success-soft)',
}
const ICON_COLOR: Record<Tone, string> = {
  info: 'var(--mui-palette-primary-main)',
  warn: 'var(--mui-palette-warning-main)',
  err: 'var(--mui-palette-error-main)',
  success: 'var(--mui-palette-success-main)',
}

export interface InfoBarProps {
  tone?: Tone
  title: React.ReactNode
  desc?: React.ReactNode
  action?: React.ReactNode
  compact?: boolean
  onClick?: () => void
}

// 信息条（原型 .infobar）：图标 + 标题 + 描述 + 可选操作
export const InfoBar: React.FC<InfoBarProps> = ({
  tone = 'info',
  title,
  desc,
  action,
  compact = false,
  onClick,
}) => (
  <Paper
    elevation={0}
    onClick={onClick}
    sx={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 1.5,
      bgcolor: BG[tone],
      borderRadius: 2,
      p: compact ? '10px 16px' : 1.5,
      mb: 1.5,
      cursor: onClick ? 'pointer' : 'default',
    }}
  >
    <Box sx={{ flexShrink: 0, mt: '2px', color: ICON_COLOR[tone], display: 'flex' }}>
      {ICON[tone]}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ fontSize: 'var(--text-body)', fontWeight: 600, mb: '2px' }}>{title}</Box>
      {desc ? (
        <Box
          sx={{
            fontSize: 'var(--text-caption)',
            color: 'var(--mui-palette-text-secondary)',
            lineHeight: 1.5,
          }}
        >
          {desc}
        </Box>
      ) : null}
    </Box>
    {action ? <Box sx={{ flexShrink: 0, ml: 1.5 }}>{action}</Box> : null}
  </Paper>
)
