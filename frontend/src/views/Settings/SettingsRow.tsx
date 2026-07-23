import { Box, Paper } from '@mui/material'
import type { FC, ReactNode } from 'react'

/** 设置行：左侧标题/描述/提示，右侧控件 */
export const Row: FC<{
  title: ReactNode
  desc?: ReactNode
  hint?: ReactNode
  hintWarn?: boolean
  children: ReactNode
}> = ({ title, desc, hint, hintWarn = false, children }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      py: 2,
      borderBottom: '1px solid var(--mui-palette-divider)',
      '&:last-child': { borderBottom: 'none' },
    }}
  >
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Box
        sx={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}
      >
        {title}
      </Box>
      {desc ? (
        <Box
          sx={{
            fontSize: 12,
            color: 'var(--mui-palette-text-secondary)',
            mt: '3px',
            lineHeight: 1.5,
          }}
        >
          {desc}
        </Box>
      ) : null}
      {hint ? (
        <Box
          sx={{
            fontSize: 11,
            mt: '4px',
            color: hintWarn ? 'var(--mui-palette-warning-main)' : 'var(--mui-palette-primary-main)',
          }}
        >
          {hint}
        </Box>
      ) : null}
    </Box>
    <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1 }}>{children}</Box>
  </Box>
)

/** 分组小标题 */
const GroupTitle: FC<{ title: string; desc: string }> = ({ title, desc }) => (
  <Box sx={{ mb: 2 }}>
    <Box sx={{ fontSize: 'var(--text-subtitle)', fontWeight: 600 }}>{title}</Box>
    <Box sx={{ fontSize: 13, color: 'var(--mui-palette-text-secondary)', mt: '4px' }}>{desc}</Box>
  </Box>
)

/** 分组容器：标题 + Paper 行列表，各分组组件复用 */
export const SettingsGroup: FC<{ title: string; desc: string; children: ReactNode }> = ({
  title,
  desc,
  children,
}) => (
  <Box>
    <GroupTitle title={title} desc={desc} />
    <Paper elevation={0} sx={{ p: '0 16px' }}>
      {children}
    </Paper>
  </Box>
)
