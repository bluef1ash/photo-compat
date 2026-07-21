import BoltIcon from '@mui/icons-material/Bolt'
import CheckIcon from '@mui/icons-material/Check'
import FolderIcon from '@mui/icons-material/Folder'
import ImageIcon from '@mui/icons-material/Image'
import IosShareIcon from '@mui/icons-material/IosShare'
import { Box, Paper } from '@mui/material'
import type { FC, ReactNode } from 'react'
import { FileList } from '../../components/FileList'
import { FormatBar } from '../../components/FormatBar'
import { InfoBar } from '../../components/InfoBar'
import { StatCard } from '../../components/StatCard'
import { useAppStore } from '../../store/appStore'
import { fmtSize } from '../../utils/format'

const BlockLabel: FC<{ children: ReactNode }> = ({ children }) => (
  <Box
    sx={{
      fontSize: 12,
      fontWeight: 600,
      color: 'var(--mui-palette-text-secondary)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      mt: 3,
      mb: 1.5,
    }}
  >
    {children}
  </Box>
)

const SummaryItem: FC<{ children: ReactNode }> = ({ children }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: 13,
      color: 'var(--mui-palette-text-secondary)',
    }}
  >
    <CheckIcon sx={{ fontSize: 14, color: 'var(--mui-palette-success-main)' }} />
    {children}
  </Box>
)

export const ResultView: FC = () => {
  const scan = useAppStore((s) => s.scan)
  const selectFolder = useAppStore((s) => s.selectFolder)
  const openSettings = useAppStore((s) => s.openSettings)

  if (!scan) {
    return null
  }

  const w = scan.warnings
  const unsupSum = w.unsupported_groups.reduce((a, g) => a + g.count, 0)
  const saved = Math.max(0, scan.total_source_size - scan.estimated_output_size)
  const hasWarn = w.heic_count > 0 || unsupSum > 0 || w.corrupt_count > 0

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Box sx={{ fontSize: 'var(--text-title)', fontWeight: 600 }}>扫描完成</Box>
          <Box
            sx={{
              fontSize: 13,
              fontFamily: 'var(--font-mono)',
              color: 'var(--mui-palette-text-secondary)',
              mt: '4px',
              wordBreak: 'break-all',
            }}
          >
            {scan.source_dir}
          </Box>
        </Box>
        <Box
          onClick={() => void selectFolder()}
          sx={{
            color: 'var(--mui-palette-primary-main)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            ml: 2,
            flexShrink: 0,
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          ← 重新选择
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 1 }}>
        <StatCard value={scan.total} label="总图片数" icon={<ImageIcon fontSize="small" />} />
        <StatCard
          value={scan.total}
          label="预计输出数量"
          icon={<IosShareIcon fontSize="small" />}
        />
        <StatCard
          value={fmtSize(scan.estimated_output_size)}
          label="预计输出大小"
          icon={<FolderIcon fontSize="small" />}
          small
        />
        <StatCard
          value={fmtSize(saved)}
          label="预计节省"
          icon={<BoltIcon fontSize="small" />}
          small
        />
      </Box>

      <BlockLabel>格式分布</BlockLabel>
      <Paper elevation={1} sx={{ p: 2, borderRadius: 3 }}>
        <FormatBar byFormat={scan.by_format} />
      </Paper>

      {scan.files_detail.length > 0 ? (
        <>
          <BlockLabel>图片文件列表</BlockLabel>
          <Paper elevation={1} sx={{ p: '16px 18px', borderRadius: 3 }}>
            <FileList files={scan.files_detail} total={scan.total} />
          </Paper>
        </>
      ) : null}

      {hasWarn ? (
        <>
          <BlockLabel>兼容性问题与警告</BlockLabel>
          <Box sx={{ mb: 1 }}>
            {w.heic_count > 0 ? (
              <InfoBar
                tone="warn"
                title={`检测到 ${w.heic_count} 张 HEIC（iPhone 照片）`}
                desc="几乎所有老旧系统都不支持 HEIC，将自动转换为 JPEG。"
              />
            ) : null}
            {unsupSum > 0 ? (
              <InfoBar
                tone="warn"
                title={`检测到 ${unsupSum} 个暂不支持的文件`}
                desc={`${w.unsupported_groups.map((g) => `${g.label} ×${g.count}`).join('、')}，将跳过。`}
              />
            ) : null}
            {w.corrupt_count > 0 ? (
              <InfoBar
                tone="err"
                title={`${w.corrupt_count} 张图片疑似损坏`}
                desc="将被跳过并记录到日志，不影响其余文件处理。"
              />
            ) : null}
          </Box>
        </>
      ) : null}

      <Paper elevation={1} sx={{ p: 2, borderRadius: 3, mt: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <SummaryItem>
            输出到{' '}
            <Box component="b" sx={{ color: 'text.primary', fontWeight: 600 }}>
              同目录 / compat 文件夹
            </Box>
          </SummaryItem>
          <SummaryItem>
            <Box component="b" sx={{ color: 'text.primary', fontWeight: 600 }}>
              保留
            </Box>
            文件夹结构
          </SummaryItem>
          <SummaryItem>
            <Box component="b" sx={{ color: 'text.primary', fontWeight: 600 }}>
              不覆盖
            </Box>
            已存在文件
          </SummaryItem>
          <SummaryItem>
            JPEG 质量{' '}
            <Box component="b" sx={{ color: 'text.primary', fontWeight: 600 }}>
              90
            </Box>
          </SummaryItem>
          <Box
            onClick={() => openSettings()}
            sx={{
              ml: 'auto',
              color: 'var(--mui-palette-primary-main)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            修改
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}
