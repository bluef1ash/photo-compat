import { Box, CircularProgress } from '@mui/material'
import type React from 'react'

export const ScanningView: React.FC = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, p: 6 }}>
    <CircularProgress size={40} />
    <Box>正在扫描文件夹…</Box>
  </Box>
)
