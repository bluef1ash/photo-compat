import Folder from '@mui/icons-material/Folder'
import { Box } from '@mui/material'
import type React from 'react'

export const TitleBar: React.FC = () => (
  <Box
    component="header"
    sx={{
      height: 40,
      display: 'flex',
      alignItems: 'center',
      px: 2,
      gap: 1,
      borderBottom: '1px solid var(--mui-palette-divider)',
    }}
  >
    <Folder sx={{ fontSize: 18 }} />
    <Box component="span" sx={{ fontWeight: 600 }}>
      照片适配助手
    </Box>
    <Box
      component="span"
      sx={{
        ml: 'auto',
        fontSize: 'var(--text-caption)',
        color: 'var(--mui-palette-text-secondary)',
      }}
    >
      标准兼容模式
    </Box>
  </Box>
)
