import { Button as MuiButton } from '@mui/material'
import type React from 'react'

type Variant = 'primary' | 'secondary' | 'subtle' | 'destructive'
type Size = 'standard' | 'large' | 'compact'

// Omit color:避免 HTML color(string) 与 MUI color(枚举) 类型冲突
export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  variant?: Variant
  size?: Size
}

// 项目 variant → MUI variant 映射
const MUI_VARIANT: Record<Variant, 'contained' | 'outlined' | 'text'> = {
  primary: 'contained',
  secondary: 'outlined',
  subtle: 'text',
  destructive: 'outlined',
}
// 项目 variant → MUI color 映射
const MUI_COLOR: Record<Variant, 'primary' | 'inherit' | 'error'> = {
  primary: 'primary',
  secondary: 'primary',
  subtle: 'inherit',
  destructive: 'error',
}
// 项目 size → MUI size 映射
const MUI_SIZE: Record<Size, 'small' | 'medium' | 'large'> = {
  standard: 'medium',
  large: 'large',
  compact: 'small',
}
// 自定义高度贴合 standard h40 / large h48 / compact h32
const HEIGHT: Record<Size, number> = {
  standard: 40,
  large: 48,
  compact: 32,
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'standard',
  className,
  children,
  ...rest
}) => (
  <MuiButton
    variant={MUI_VARIANT[variant]}
    color={MUI_COLOR[variant]}
    size={MUI_SIZE[size]}
    disableElevation
    sx={{ height: HEIGHT[size], minWidth: 'auto' }}
    className={className}
    {...rest}
  >
    {children}
  </MuiButton>
)
