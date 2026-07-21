import DescriptionIcon from '@mui/icons-material/Description'
import InfoIcon from '@mui/icons-material/Info'
import SettingsIcon from '@mui/icons-material/Settings'
import WarningIcon from '@mui/icons-material/Warning'
import { Box, Paper } from '@mui/material'
import { type FC, type ReactNode, useEffect } from 'react'
import { useAppStore } from '../store/appStore'

interface MenuItemDef {
  icon: ReactNode
  label: string
  key?: string
  sepBefore?: boolean
  onClick: () => void
}

export const MenuFlyout: FC = () => {
  const menuOpen = useAppStore((s) => s.menuOpen)
  const toggleMenu = useAppStore((s) => s.toggleMenu)
  const openSettings = useAppStore((s) => s.openSettings)
  const openLog = useAppStore((s) => s.openLog)
  const openModal = useAppStore((s) => s.openModal)

  // 点击外部关闭
  useEffect(() => {
    if (!menuOpen) {
      return
    }
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null
      if (el && !el.closest('[data-menu-flyout]') && !el.closest('[aria-label="菜单"]')) {
        toggleMenu(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen, toggleMenu])

  if (!menuOpen) {
    return null
  }

  const items: MenuItemDef[] = [
    {
      icon: <SettingsIcon fontSize="small" />,
      label: '设置',
      key: 'Ctrl+,',
      onClick: openSettings,
    },
    {
      icon: <DescriptionIcon fontSize="small" />,
      label: '打开日志文件',
      key: 'Ctrl+L',
      onClick: () => void openLog(),
    },
    {
      icon: <InfoIcon fontSize="small" />,
      label: '关于照片适配助手',
      key: 'F1',
      sepBefore: true,
      onClick: () => openModal('about'),
    },
    {
      icon: <WarningIcon fontSize="small" />,
      label: '演示：目录不可访问',
      sepBefore: true,
      onClick: () => openModal('error-dir'),
    },
    {
      icon: <WarningIcon fontSize="small" />,
      label: '演示：权限不足',
      onClick: () => openModal('error-perm'),
    },
    {
      icon: <WarningIcon fontSize="small" />,
      label: '演示：磁盘已满',
      onClick: () => openModal('error-disk'),
    },
  ]

  return (
    <Paper
      data-menu-flyout
      elevation={8}
      sx={{
        position: 'absolute',
        top: 54,
        right: 168,
        width: 224,
        zIndex: 90,
        p: 1,
        borderRadius: 2,
      }}
    >
      {items.map((it) => (
        <Box key={it.label}>
          {it.sepBefore ? (
            <Box sx={{ height: 1, bgcolor: 'var(--mui-palette-divider)', my: '4px' }} />
          ) : null}
          <Box
            onClick={it.onClick}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              px: '10px',
              py: '9px',
              borderRadius: 1,
              fontSize: 13,
              cursor: 'pointer',
              color: 'var(--mui-palette-text-primary)',
              '&:hover': {
                bgcolor: 'var(--accent-soft)',
                color: 'var(--mui-palette-primary-main)',
              },
            }}
          >
            <Box sx={{ color: 'var(--mui-palette-text-secondary)' }}>{it.icon}</Box>
            <Box sx={{ flex: 1 }}>{it.label}</Box>
            {it.key ? (
              <Box
                sx={{
                  fontSize: 11,
                  color: 'var(--mui-palette-text-disabled)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {it.key}
              </Box>
            ) : null}
          </Box>
        </Box>
      ))}
    </Paper>
  )
}
