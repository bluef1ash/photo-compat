import FolderIcon from '@mui/icons-material/Folder'
import { Box, Paper } from '@mui/material'
import type { FC } from 'react'
import { Button } from '../../components/Button'
import { DropZone } from '../../components/DropZone'
import { InfoBar } from '../../components/InfoBar'
import { useAppStore } from '../../store/appStore'
import { fmtRelative } from '../../utils/format'

export const HomeView: FC = () => {
  const recent = useAppStore((s) => s.recent)
  const selectFolder = useAppStore((s) => s.selectFolder)
  const error = useAppStore((s) => s.error)
  const openSettings = useAppStore((s) => s.openSettings)

  return (
    <Box>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Box sx={{ fontSize: 'var(--text-title)', fontWeight: 600, lineHeight: 1.2 }}>
          把照片变成任何老旧系统都能上传的格式
        </Box>
        <Box
          sx={{ fontSize: 'var(--text-body)', color: 'var(--mui-palette-text-secondary)', mt: 1 }}
        >
          全程离线，不上传任何文件，安全放心
        </Box>
      </Box>

      <DropZone />

      {error ? <InfoBar tone="warn" title={error} /> : null}

      {recent.length > 0 ? (
        <Box sx={{ mt: 3, mb: 3 }}>
          <Box sx={{ fontSize: 14, fontWeight: 600, mb: 1.5 }}>最近文件夹</Box>
          {recent.map((r) => (
            <Paper
              key={r.path}
              elevation={0}
              onClick={() => void selectFolder(r.path)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 2,
                py: 1.5,
                mb: 1,
                borderRadius: 2,
                border: '1px solid var(--mui-palette-divider)',
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'var(--mui-palette-primary-main)',
                  boxShadow: 'var(--shadow-rest)',
                },
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  bgcolor: 'var(--accent-soft)',
                  color: 'var(--mui-palette-primary-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FolderIcon fontSize="small" />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {r.path}
                </Box>
                <Box
                  sx={{
                    fontSize: 'var(--text-caption)',
                    color: 'var(--mui-palette-text-secondary)',
                    mt: '2px',
                  }}
                >
                  上次处理：{fmtRelative(r.ts)} · {r.count} 张 · {r.mode}
                </Box>
              </Box>
              <Button variant="secondary" size="compact">
                继续
              </Button>
            </Paper>
          ))}
        </Box>
      ) : null}

      <InfoBar
        tone="info"
        compact
        title="会做什么"
        desc="转成 JPEG · 去除拍摄信息（EXIF）· 修正方向 · 去除颜色配置（ICC）· 转为基础式 JPEG · 转换 HEIC · 限制 4096px"
        action={
          <Button variant="subtle" size="compact" onClick={() => openSettings()}>
            查看 / 修改
          </Button>
        }
      />
    </Box>
  )
}
