import { Box, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import type { FC, ReactNode } from 'react'
import { type ModalType, useAppStore } from '../store/appStore'
import { Button } from './Button'

const TITLE: Record<ModalType, string> = {
  'error-dir': '目录无法访问',
  'error-perm': '权限不足',
  'error-disk': '磁盘空间不足',
  unsupported: '包含不支持的格式',
  about: '关于照片适配助手',
  'confirm-cancel': '确认取消处理？',
  preview: '图片预览',
}

interface Body {
  desc: ReactNode
}

const BODY: Record<ModalType, Body> = {
  'error-dir': {
    desc: '无法访问该目录，可能已被移动、删除，或当前用户没有权限。请检查路径后重新选择。',
  },
  'error-perm': {
    desc: '系统拒绝了访问请求。请以管理员身份运行本程序，或将目录权限授予当前用户。',
  },
  'error-disk': {
    desc: '目标磁盘空间不足，无法写入结果。请清理磁盘或更换输出目录后重试。',
  },
  unsupported: {
    desc: '检测到暂不支持的文件格式，处理时将自动跳过（可查看清单）。',
  },
  about: {
    desc: (
      <Box>
        <Box sx={{ fontSize: 13, color: 'var(--mui-palette-text-secondary)', mb: 1 }}>
          把照片批量转成任何老旧系统都能上传的格式。全程离线，不上传任何文件。
        </Box>
        <Box sx={{ fontSize: 13 }}>版本 v1.0 · 仅供本地处理 · 支持 JPEG/PNG/HEIC/WebP/GIF/TIFF</Box>
      </Box>
    ),
  },
  'confirm-cancel': {
    desc: '取消后已处理的文件会保留在输出目录，其余文件将不再处理。确定要取消吗？',
  },
  preview: { desc: '图片预览（占位）' },
}

export const ModalHost: FC = () => {
  const modal = useAppStore((s) => s.modal)
  const closeModal = useAppStore((s) => s.closeModal)
  const reset = useAppStore((s) => s.reset)
  const cancel = useAppStore((s) => s.cancel)
  const pushToast = useAppStore((s) => s.pushToast)

  const open = !!modal
  const type = modal?.type ?? 'about'

  const onClose = () => closeModal()

  const actions = (): ReactNode => {
    switch (type) {
      case 'confirm-cancel':
        return (
          <>
            <Button variant="secondary" onClick={closeModal}>
              继续处理
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void cancel()
                closeModal()
              }}
            >
              确认取消
            </Button>
          </>
        )
      case 'error-disk':
        return (
          <Button variant="primary" onClick={closeModal}>
            关闭
          </Button>
        )
      case 'about':
        return (
          <>
            <Button
              variant="subtle"
              onClick={() => {
                pushToast('已复制版本号 v1.0', 'success')
              }}
            >
              复制版本号
            </Button>
            <Button variant="primary" onClick={closeModal}>
              关闭
            </Button>
          </>
        )
      case 'unsupported':
        return (
          <>
            <Button variant="secondary" onClick={() => closeModal()}>
              取消
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                pushToast('已继续，不支持的文件将跳过', 'info')
                closeModal()
              }}
            >
              继续
            </Button>
          </>
        )
      case 'error-dir':
      case 'error-perm':
        return (
          <>
            <Button
              variant="subtle"
              onClick={() => {
                pushToast('已跳转到帮助', 'info')
              }}
            >
              帮助
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                reset()
                closeModal()
              }}
            >
              重新选择
            </Button>
            <Button variant="primary" onClick={closeModal}>
              关闭
            </Button>
          </>
        )
      default:
        return (
          <Button variant="primary" onClick={closeModal}>
            关闭
          </Button>
        )
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>{TITLE[type]}</DialogTitle>
      <DialogContent>
        <Box sx={{ fontSize: 14, color: 'var(--mui-palette-text-secondary)', lineHeight: 1.6 }}>
          {BODY[type].desc}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>{actions()}</DialogActions>
    </Dialog>
  )
}
