import React from 'react'

type Variant = 'primary' | 'secondary' | 'subtle' | 'destructive'
type Size = 'standard' | 'large' | 'compact'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'bg-surface text-accent border-border-strong hover:bg-surface-alt',
  subtle: 'text-fg hover:bg-surface-alt',
  destructive: 'text-error border-error',
}

const sizeClass: Record<Size, string> = {
  standard: 'h-10 px-4',
  large: 'h-12 px-6',
  compact: 'h-8 px-3',
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'standard',
  className,
  children,
  ...rest
}) => (
  <button
    className={`inline-flex items-center gap-2 rounded-sm font-semibold text-body border border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${variantClass[variant]} ${sizeClass[size]} ${className ?? ''}`}
    {...rest}
  >
    {children}
  </button>
)
