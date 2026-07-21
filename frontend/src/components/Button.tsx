import { Button as MuiButton } from '@mui/material'
import type React from 'react'

type Variant = 'primary' | 'secondary' | 'subtle' | 'destructive'
type Size = 'standard' | 'large' | 'compact'

// Omit color/size:避免 HTML 属性与 MUI 枚举类型冲突
export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color' | 'size'> {
  variant?: Variant
  size?: Size
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
}

// 项目 variant → MUI variant 映射（destructive 用 contained 实底，对齐 Material 原型）
const MUI_VARIANT: Record<Variant, 'contained' | 'outlined' | 'text'> = {
  primary: 'contained',
  secondary: 'outlined',
  subtle: 'text',
  destructive: 'contained',
}
const MUI_COLOR: Record<Variant, 'primary' | 'inherit' | 'error'> = {
  primary: 'primary',
  secondary: 'primary',
  subtle: 'inherit',
  destructive: 'error',
}
const MUI_SIZE: Record<Size, 'small' | 'medium' | 'large'> = {
  standard: 'medium',
  large: 'large',
  compact: 'small',
}
// 自定义高度贴合 standard h40 / large h48 / compact h32（原型 .btn 尺寸）
const HEIGHT: Record<Size, number> = {
  standard: 40,
  large: 48,
  compact: 32,
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'standard',
  startIcon,
  endIcon,
  className,
  children,
  ...rest
}) => (
  <MuiButton
    variant={MUI_VARIANT[variant]}
    color={MUI_COLOR[variant]}
    size={MUI_SIZE[size]}
    startIcon={startIcon}
    endIcon={endIcon}
    sx={{ height: HEIGHT[size], minWidth: 'auto' }}
    className={className}
    {...rest}
  >
    {children}
  </MuiButton>
)
