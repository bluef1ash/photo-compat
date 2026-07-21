import { Chip } from '@mui/material'
import type React from 'react'

type Variant = 'default' | 'convert' | 'ok' | 'warn' | 'err' | 'accent'

// 项目 variant → MUI Chip color 映射（原型 .badge 系列）
const COLOR: Record<Variant, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  default: 'default',
  convert: 'warning',
  ok: 'success',
  warn: 'warning',
  err: 'error',
  accent: 'primary',
}

export const Badge: React.FC<{ variant?: Variant; children: React.ReactNode }> = ({
  variant = 'default',
  children,
}) => (
  <Chip
    label={children}
    size="small"
    color={COLOR[variant]}
    variant={variant === 'default' ? 'outlined' : 'filled'}
    sx={{ height: 22, fontSize: 11, fontWeight: 500 }}
  />
)
