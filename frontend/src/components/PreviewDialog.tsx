import BrokenImageOutlinedIcon from '@mui/icons-material/BrokenImageOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from '@mui/material'
import type { FC, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useAssetSrc } from '../hooks/useAssetSrc'
import { useAppStore } from '../store/appStore'
import type { FileMeta } from '../types'
import { fmtSize } from '../utils/format'
import { Button } from './Button'

interface PreviewDialogProps {
  files: FileMeta[]
  initialIndex: number
  onClose: () => void
}

// 舞台左右导航按钮：半透明圆形浮层（对齐设计原型 preview-nav）
const navBtnSx = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: 40,
  height: 40,
  bgcolor: 'rgba(0,0,0,0.55)',
  color: '#fff',
  '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
} as const

// 信息键值对（对齐设计原型 preview-info .pi）
const Info: FC<{ k: string; v: ReactNode }> = ({ k, v }) => (
  <Box sx={{ minWidth: 80 }}>
    <Box
      sx={{
        fontSize: 11,
        color: 'var(--mui-palette-text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {k}
    </Box>
    <Box sx={{ fontSize: 13, fontWeight: 500, mt: '3px' }}>{v}</Box>
  </Box>
)

export const PreviewDialog: FC<PreviewDialogProps> = ({ files, initialIndex, onClose }) => {
  const [index, setIndex] = useState(initialIndex)
  const jpegQuality = useAppStore((s) => s.config.jpeg_quality)
  const total = files.length
  const f = files[index]
  const { src, failed } = useAssetSrc(f.path)

  const nav = (d: number) => setIndex((i) => (i + d + total) % total)

  // 键盘左右切换（Esc 由 Dialog onClose + 全局处理器关闭）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setIndex((i) => (i - 1 + total) % total)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setIndex((i) => (i + 1) % total)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [total])

  return (
    <Dialog
      open
      onClose={onClose}
      slotProps={{ paper: { sx: { width: 680, maxWidth: '94vw', borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ fontWeight: 600, pr: 6, wordBreak: 'break-all' }}>
        {f.name}
        <Box
          component="span"
          sx={{ fontSize: 12, fontWeight: 400, color: 'var(--mui-palette-text-secondary)', ml: 1 }}
        >
          {index + 1} / {total}
        </Box>
      </DialogTitle>
      <DialogContent>
        {/* 预览舞台：深色背景衬托图片，max-height 440 contain */}
        <Box
          sx={{
            position: 'relative',
            bgcolor: '#111',
            borderRadius: 2,
            minHeight: 280,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            mb: 2,
          }}
        >
          {total > 1 ? (
            <>
              <IconButton
                onClick={() => nav(-1)}
                aria-label="上一张"
                sx={{ ...navBtnSx, left: 10 }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <IconButton
                onClick={() => nav(1)}
                aria-label="下一张"
                sx={{ ...navBtnSx, right: 10 }}
              >
                <ChevronRightIcon />
              </IconButton>
            </>
          ) : null}
          {src && !failed ? (
            <Box
              component="img"
              src={src}
              alt={f.name}
              sx={{ maxWidth: '100%', maxHeight: 440, objectFit: 'contain', display: 'block' }}
            />
          ) : (
            <Box sx={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', py: 6 }}>
              <BrokenImageOutlinedIcon sx={{ fontSize: 48, mb: 1 }} />
              <Box sx={{ fontSize: 13 }}>无法预览此格式</Box>
            </Box>
          )}
        </Box>
        {/* 信息区：原始格式 / 尺寸 / 大小 / 将执行 / 序号 */}
        <Box sx={{ display: 'flex', gap: 3.5, flexWrap: 'wrap' }}>
          <Info k="原始格式" v={f.format === 'JPEG' ? f.format : `${f.format} → JPEG`} />
          <Info k="尺寸" v={f.width > 0 ? `${f.width}×${f.height}` : '—'} />
          <Info k="大小" v={fmtSize(f.size_bytes)} />
          <Info k="将执行" v={`${f.status} · 质量 ${jpegQuality}`} />
          <Info k="序号" v={`${index + 1} / ${total}`} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button variant="primary" onClick={onClose}>
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  )
}
