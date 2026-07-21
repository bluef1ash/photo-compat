import Folder from '@mui/icons-material/Folder'
import { Box } from '@mui/material'
import React, { useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { Button } from './Button'

export const DropZone: React.FC = () => {
  const selectFolder = useAppStore((s) => s.selectFolder)
  const [hover, setHover] = React.useState(false)

  // MVP:拖拽仅视觉反馈,统一走系统选择器入口。完整拖拽路径处理留增量
  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setHover(false)
      await selectFolder()
    },
    [selectFolder],
  )

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
      onDrop={onDrop}
      onClick={selectFolder}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          selectFolder()
        }
      }}
      sx={{
        border: '2px',
        borderStyle: hover ? 'solid' : 'dashed',
        borderColor: 'var(--mui-palette-primary-main)',
        bgcolor: hover ? 'var(--accent-soft)' : 'var(--surface-alt)',
        borderRadius: 2,
        p: 6,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        outline: 'none',
        cursor: 'pointer',
      }}
    >
      <Folder sx={{ fontSize: 48 }} />
      <Box>把包含照片的文件夹拖到这里</Box>
      <Box sx={{ color: 'var(--mui-palette-text-secondary)' }}>— 或 —</Box>
      {/* 内层 Button 不绑 onClick:点击冒泡到外层 Box 的 selectFolder,避免双触发 */}
      <Button variant="primary" size="large">
        <Folder /> 选择文件夹
      </Button>
    </Box>
  )
}
