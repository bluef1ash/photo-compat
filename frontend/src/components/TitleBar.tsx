import CloseIcon from '@mui/icons-material/Close'
import CropSquareIcon from '@mui/icons-material/CropSquare'
import MinimizeIcon from '@mui/icons-material/Minimize'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { Box, IconButton } from '@mui/material'
import { getCurrent } from '@tauri-apps/api/window'
import type React from 'react'
import { useAppStore } from '../store/appStore'

// 系统按钮：Windows 风格 46×32 矩形，close hover 红
const SysButton: React.FC<{
  title: string
  onClick: () => void
  close?: boolean
  children: React.ReactNode
}> = ({ title, onClick, close = false, children }) => (
  <Box
    component="button"
    title={title}
    aria-label={title}
    onClick={onClick}
    sx={{
      width: 46,
      height: 32,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--mui-palette-text-primary)',
      border: 'none',
      bgcolor: 'transparent',
      cursor: 'pointer',
      transition: 'background .1s',
      '&:hover': {
        bgcolor: close ? 'var(--mui-palette-error-main)' : 'action.hover',
        color: close ? '#fff' : 'inherit',
      },
    }}
  >
    {children}
  </Box>
)

export const TitleBar: React.FC = () => {
  const toggleMenu = useAppStore((s) => s.toggleMenu)
  const openSettings = useAppStore((s) => s.openSettings)

  const onMinimize = () => {
    void getCurrent().minimize()
  }
  const onToggleMax = () => {
    void getCurrent().toggleMaximize()
  }
  const onClose = () => {
    void getCurrent().close()
  }

  return (
    <Box
      component="header"
      data-tauri-drag-region
      sx={{
        height: 48,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        pl: 2,
        bgcolor: 'var(--mui-palette-background-paper)',
        boxShadow: 1,
        userSelect: 'none',
        position: 'relative',
        zIndex: 5,
      }}
    >
      <Box
        sx={{
          width: 24,
          height: 24,
          borderRadius: '6px',
          bgcolor: 'var(--mui-palette-primary-main)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--mui-palette-primary-contrastText)',
          fontSize: 13,
        }}
      >
        📁
      </Box>
      <Box sx={{ ml: '10px', fontWeight: 500, fontSize: 14, letterSpacing: '0.01em' }}>
        照片适配助手
      </Box>

      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1, pr: '4px' }}>
        {/* 模式徽章：点击进入设置兼容性分组 */}
        <Box
          component="button"
          onClick={() => openSettings()}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--mui-palette-primary-main)',
            bgcolor: 'var(--accent-soft)',
            border: 'none',
            borderRadius: '8px',
            px: '12px',
            py: '6px',
            cursor: 'pointer',
            '&::before': {
              content: '""',
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'var(--mui-palette-primary-main)',
            },
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          标准兼容模式
        </Box>
        <IconButton
          onClick={() => toggleMenu()}
          aria-label="菜单"
          title="菜单"
          size="small"
          sx={{ borderRadius: '6px' }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', ml: '4px' }}>
          <SysButton title="最小化" onClick={onMinimize}>
            <MinimizeIcon sx={{ fontSize: 18 }} />
          </SysButton>
          <SysButton title="最大化" onClick={onToggleMax}>
            <CropSquareIcon sx={{ fontSize: 14 }} />
          </SysButton>
          <SysButton title="关闭" onClick={onClose} close>
            <CloseIcon sx={{ fontSize: 16 }} />
          </SysButton>
        </Box>
      </Box>
    </Box>
  )
}
