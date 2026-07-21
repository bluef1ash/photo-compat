import { Paper } from '@mui/material'
import type React from 'react'

type Tone = 'default' | 'error' | 'muted'

// tone → 字色映射,对象索引替代嵌套三元(biome noNestedTernary)
const TONE_COLOR: Record<Tone, string> = {
  error: 'var(--mui-palette-error-main)',
  muted: 'var(--mui-palette-text-secondary)',
  default: 'var(--mui-palette-text-primary)',
}

export const StatCard: React.FC<{
  value: React.ReactNode
  label: string
  tone?: Tone
}> = ({ value, label, tone = 'default' }) => (
  <Paper
    variant="outlined"
    sx={{ p: 2, borderColor: 'var(--mui-palette-divider)', borderRadius: 2 }}
  >
    <div
      className="tabular-nums"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-display-num)',
        fontWeight: 600,
        color: TONE_COLOR[tone],
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontSize: 'var(--text-caption)',
        color: 'var(--mui-palette-text-secondary)',
      }}
    >
      {label}
    </div>
  </Paper>
)
