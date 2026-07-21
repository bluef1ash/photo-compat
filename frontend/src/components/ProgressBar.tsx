import { LinearProgress } from '@mui/material'
import type React from 'react'

// 钳制到 [0,100];MUI LinearProgress determinate 自动带 aria-valuenow/min/max
const clamp = (v: number) => Math.min(100, Math.max(0, v))

export const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
  <LinearProgress variant="determinate" value={clamp(value)} />
)
