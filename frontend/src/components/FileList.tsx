import ImageIcon from '@mui/icons-material/Image'
import { Box, Paper } from '@mui/material'
import type { FC } from 'react'
import { useAssetSrc } from '../hooks/useAssetSrc'
import { useAppStore } from '../store/appStore'
import type { FileMeta } from '../types'
import { fmtSize } from '../utils/format'
import { Badge } from './Badge'

interface FileListProps {
  files: FileMeta[]
  total: number
}

// 缩略图格子样式：真实缩略图与加载失败占位共用
const thumbSx = {
  width: 40,
  height: 40,
  borderRadius: 1,
  bgcolor: 'var(--surface-alt)',
  border: '1px solid var(--mui-palette-divider)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--mui-palette-text-disabled)',
  flexShrink: 0,
  overflow: 'hidden',
}

const Thumbnail: FC<{ file: FileMeta }> = ({ file }) => {
  // asset URL 解析与解码失败回退逻辑见 useAssetSrc
  const { src, onError } = useAssetSrc(file.path)

  if (!src) {
    return (
      <Box sx={thumbSx}>
        <ImageIcon fontSize="small" />
      </Box>
    )
  }
  return (
    <Box sx={thumbSx}>
      <Box
        component="img"
        src={src}
        alt={file.name}
        loading="lazy"
        onError={onError}
        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </Box>
  )
}

export const FileList: FC<FileListProps> = ({ files, total }) => {
  const openModal = useAppStore((s) => s.openModal)
  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          m: '4px 2px 12px',
        }}
      >
        <Box sx={{ fontSize: 14, fontWeight: 600 }}>共 {total} 张图片</Box>
        {files.length < total ? (
          <Box sx={{ fontSize: 12, color: 'var(--mui-palette-text-secondary)' }}>
            显示前 {files.length} 张
          </Box>
        ) : null}
      </Box>
      <Paper variant="outlined" sx={{ maxHeight: 300, overflowY: 'auto', borderRadius: 2 }}>
        {files.map((f, i) => {
          const parts: string[] = []
          if (f.width > 0) {
            parts.push(`${f.width}×${f.height}`)
          }
          parts.push(fmtSize(f.size_bytes))
          return (
            <Box
              key={f.path || f.name}
              role="button"
              tabIndex={0}
              aria-label={`预览 ${f.name}`}
              title="双击预览"
              onDoubleClick={() => openModal('preview', { files, index: i })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  openModal('preview', { files, index: i })
                }
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: '14px',
                py: 1,
                cursor: 'pointer',
                borderBottom: '1px solid var(--mui-palette-divider)',
                '&:last-child': { borderBottom: 'none' },
                '&:hover': { bgcolor: 'var(--accent-soft)' },
              }}
            >
              <Thumbnail file={f} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {f.name}
                </Box>
                <Box sx={{ fontSize: 11, color: 'var(--mui-palette-text-secondary)', mt: '2px' }}>
                  {parts.join(' · ')}
                </Box>
              </Box>
              <Badge variant={f.format === 'JPEG' ? 'ok' : 'convert'}>{f.status}</Badge>
            </Box>
          )
        })}
      </Paper>
    </Box>
  )
}
