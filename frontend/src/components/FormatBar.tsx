import { Box } from '@mui/material'
import type { FC } from 'react'
import { Badge } from './Badge'

// 格式展示顺序，未列出的格式追加在末尾
const ORDER = ['JPEG', 'PNG', 'HEIC', 'WebP', 'GIF', 'TIFF', 'BMP'] as const

interface FormatBarProps {
  byFormat: Record<string, number>
}

export const FormatBar: FC<FormatBarProps> = ({ byFormat }) => {
  const entries = Object.entries(byFormat)
  const sorted = [...entries].sort((a, b) => {
    const ia = ORDER.indexOf(a[0] as (typeof ORDER)[number])
    const ib = ORDER.indexOf(b[0] as (typeof ORDER)[number])
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })
  const max = Math.max(...entries.map(([, c]) => c), 1)

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px 16px' }}>
      {sorted.map(([name, count]) => {
        const convert = name !== 'JPEG'
        return (
          <Box key={name}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {name}
                {convert ? (
                  <Badge variant="convert">将转换</Badge>
                ) : (
                  <Badge variant="ok">无需转换</Badge>
                )}
              </Box>
              <Box sx={{ fontSize: 13, color: 'var(--mui-palette-text-secondary)' }}>{count}</Box>
            </Box>
            <Box
              sx={{
                height: 6,
                mt: '6px',
                bgcolor: 'var(--mui-palette-divider)',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: `${(count / max) * 100}%`,
                  bgcolor: 'var(--mui-palette-primary-main)',
                  borderRadius: 1,
                }}
              />
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}
