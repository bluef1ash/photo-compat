import { Box, Paper } from '@mui/material'
import type React from 'react'

type Tone = 'default' | 'error' | 'warn' | 'skip' | 'success'

// tone → 数字字色，对象索引替代嵌套三元（biome noNestedTernary）
const TONE_COLOR: Record<Tone, string> = {
  default: 'var(--mui-palette-text-primary)',
  error: 'var(--mui-palette-error-main)',
  warn: 'var(--mui-palette-warning-main)',
  skip: 'var(--mui-palette-text-secondary)',
  success: 'var(--mui-palette-success-main)',
}

export interface StatCardProps {
  value: React.ReactNode
  label: string
  icon?: React.ReactNode
  tone?: Tone
  small?: boolean
  clickable?: boolean
  onClick?: () => void
}

// 统计卡：Material elevation（无边框），右上角图标，等宽数字（原型 .stat-card）
export const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  icon,
  tone = 'default',
  small = false,
  clickable = false,
  onClick,
}) => (
  <Paper
    elevation={1}
    onClick={onClick}
    sx={{
      p: 2,
      pl: 3,
      borderRadius: 3,
      position: 'relative',
      overflow: 'hidden',
      cursor: clickable ? 'pointer' : 'default',
      transition: 'box-shadow .2s, transform .12s',
      ...(clickable
        ? {
            '&:hover': { boxShadow: 6, transform: 'translateY(-1px)' },
          }
        : {}),
    }}
  >
    {icon ? (
      <Box
        sx={{
          position: 'absolute',
          top: '14px',
          right: '14px',
          color: 'var(--mui-palette-text-disabled)',
          opacity: 0.5,
          fontSize: 18,
        }}
      >
        {icon}
      </Box>
    ) : null}
    <Box
      className="tabular-nums"
      sx={{
        mt: 1.5,
        fontSize: small ? '32px' : 'var(--text-display)',
        fontWeight: 600,
        lineHeight: 1.05,
        color: TONE_COLOR[tone],
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {value}
    </Box>
    <Box
      sx={{
        mt: '6px',
        fontSize: 'var(--text-caption)',
        color: 'var(--mui-palette-text-secondary)',
      }}
    >
      {label}
    </Box>
  </Paper>
)
