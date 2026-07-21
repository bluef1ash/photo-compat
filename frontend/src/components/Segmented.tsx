import { ToggleButton, ToggleButtonGroup } from '@mui/material'

interface Option<T extends string> {
  value: T
  label: string
}

interface SegmentedProps<T extends string> {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
}

// 分段控件（原型 .seg）：单选段，用于设置页主题/字号等枚举选项
export function Segmented<T extends string>({ value, options, onChange }: SegmentedProps<T>) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      size="small"
      onChange={(_, v) => {
        if (v) {
          onChange(v as T)
        }
      }}
    >
      {options.map((o) => (
        <ToggleButton key={o.value} value={o.value} sx={{ px: '14px', py: '6px', fontSize: 13 }}>
          {o.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
