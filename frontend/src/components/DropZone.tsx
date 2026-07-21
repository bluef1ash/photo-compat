import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import { Box } from '@mui/material'
import { listen } from '@tauri-apps/api/event'
import { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { Button } from './Button'

export const DropZone: React.FC = () => {
  const selectFolder = useAppStore((s) => s.selectFolder)
  const startScan = useAppStore((s) => s.startScan)
  const [hover, setHover] = useState(false)

  // Tauri 2 文件拖拽：窗口级 file-drop 事件携带真实路径（HTML5 drop 在 webview 拿不到路径）
  useEffect(() => {
    const un = listen<string[]>('tauri://file-drop', (e) => {
      if (e.payload.length > 0) {
        setHover(false)
        void startScan(e.payload[0])
      }
    })
    return () => {
      void un.then((fn) => fn())
    }
  }, [startScan])

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label="拖入文件夹或选择文件夹"
      onDragOver={(e) => {
        e.preventDefault()
        setHover(true)
      }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        e.preventDefault()
        setHover(false)
      }}
      onClick={() => void selectFolder()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          void selectFolder()
        }
      }}
      sx={{
        border: '2px',
        borderStyle: hover ? 'solid' : 'dashed',
        borderColor: hover ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-grey-400)',
        bgcolor: hover ? 'var(--accent-soft)' : 'var(--surface-alt)',
        borderRadius: 3,
        p: 6,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
        outline: 'none',
        cursor: 'pointer',
        transition: 'all .15s',
        transform: hover ? 'scale(1.005)' : 'none',
        boxShadow: hover ? 'var(--shadow-hover)' : 'none',
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          bgcolor: hover ? 'var(--mui-palette-background-paper)' : 'var(--accent-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--mui-palette-primary-main)',
          mb: 1,
        }}
      >
        <FolderOpenIcon sx={{ fontSize: 32 }} />
      </Box>
      <Box sx={{ fontSize: 'var(--text-subtitle)', fontWeight: 600 }}>
        把包含照片的文件夹拖到这里
      </Box>
      <Box sx={{ fontSize: 'var(--text-caption)', color: 'var(--mui-palette-text-disabled)' }}>
        — 或 —
      </Box>
      {/* 内层按钮不绑 onClick：点击冒泡到外层 Box，避免双触发 */}
      <Button variant="primary" size="large" startIcon={<FolderOpenIcon />}>
        选择文件夹
      </Button>
      <Box
        sx={{ fontSize: 'var(--text-caption)', color: 'var(--mui-palette-text-secondary)', mt: 1 }}
      >
        支持 JPEG / PNG / HEIC / WebP / GIF / TIFF · 自动转换为高兼容 JPEG
      </Box>
    </Box>
  )
}
