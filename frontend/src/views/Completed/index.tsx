import CheckIcon from '@mui/icons-material/Check'
import FlagIcon from '@mui/icons-material/Flag'
import ImageIcon from '@mui/icons-material/Image'
import WarningIcon from '@mui/icons-material/Warning'
import { Box, Paper } from '@mui/material'
import type { FC, ReactNode } from 'react'
import { StatCard } from '../../components/StatCard'
import { useAppStore } from '../../store/appStore'
import type { Config } from '../../types'
import { fmtSize } from '../../utils/format'

const ScRow: FC<{ k: string; v: ReactNode }> = ({ k, v }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      py: '6px',
      borderBottom: '1px solid var(--mui-palette-divider)',
      fontSize: 13,
      '&:last-child': { borderBottom: 'none' },
    }}
  >
    <Box sx={{ color: 'var(--mui-palette-text-secondary)' }}>{k}</Box>
    <Box sx={{ color: 'text.primary', fontWeight: 500 }}>{v}</Box>
  </Box>
)

function appliedActions(cfg: Config): string {
  const list: string[] = []
  if (cfg.remove_exif) {
    list.push('去除 EXIF')
  }
  if (cfg.remove_icc) {
    list.push('去除 ICC')
  }
  if (cfg.auto_orient) {
    list.push('修正方向')
  }
  if (cfg.baseline_jpeg) {
    list.push('转 Baseline')
  }
  if (cfg.convert_heic) {
    list.push('转换 HEIC')
  }
  if (cfg.to_srgb) {
    list.push('转 sRGB')
  }
  return list.join(' · ')
}

export const CompletedView: FC = () => {
  const summary = useAppStore((s) => s.summary)
  if (!summary) {
    return null
  }
  const cancelled = summary.cancelled
  const cfg = summary.settings

  return (
    <Box>
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: cancelled ? 'var(--error-soft)' : 'var(--success-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
          }}
        >
          <CheckIcon sx={{ fontSize: 44, color: cancelled ? 'error.main' : 'success.main' }} />
        </Box>
        <Box sx={{ fontSize: 'var(--text-large)', fontWeight: 600 }}>
          {cancelled ? '已取消处理' : '处理完成！'}
        </Box>
        <Box sx={{ fontSize: 14, color: 'var(--mui-palette-text-secondary)', mt: 1 }}>
          {cancelled
            ? `${summary.done} 张已保留在输出目录，其余未处理`
            : `${summary.done} 张照片已转换为兼容格式`}
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 2 }}>
        <StatCard value={summary.total} label="总计处理" icon={<ImageIcon fontSize="small" />} />
        <StatCard
          tone="success"
          value={summary.done}
          label="成功"
          icon={<CheckIcon fontSize="small" />}
        />
        <StatCard
          small
          tone={summary.failed > 0 ? 'error' : 'default'}
          value={summary.failed}
          label="失败"
          icon={<WarningIcon fontSize="small" />}
        />
        <StatCard
          small
          tone="skip"
          value={summary.skipped}
          label="跳过"
          icon={<FlagIcon fontSize="small" />}
        />
      </Box>

      <Paper elevation={1} sx={{ p: '16px 24px', borderRadius: 3, mb: 2 }}>
        <Box sx={{ fontSize: 'var(--text-subtitle)', fontWeight: 600, mb: 1.5 }}>
          已应用的兼容设置
        </Box>
        <ScRow k="兼容模式" v="标准兼容模式" />
        <ScRow k="JPEG 质量" v={cfg.jpeg_quality} />
        <ScRow k="已执行" v={appliedActions(cfg) || '—'} />
      </Paper>

      <Paper elevation={1} sx={{ p: '16px 24px', borderRadius: 3, mb: 2 }}>
        <Box sx={{ fontWeight: 600, mb: 1 }}>输出位置</Box>
        <Box
          sx={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            color: 'var(--mui-palette-primary-main)',
            bgcolor: 'var(--accent-soft)',
            p: '8px 12px',
            borderRadius: 1,
            wordBreak: 'break-all',
          }}
        >
          {summary.output_dir}
        </Box>
        <Box
          sx={{
            fontSize: 12,
            color: 'var(--mui-palette-text-secondary)',
            mt: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <CheckIcon sx={{ fontSize: 14, color: 'var(--mui-palette-success-main)' }} />共{' '}
          {summary.output_file_count} 个文件 · 约 {fmtSize(summary.output_size)}
        </Box>
      </Paper>
    </Box>
  )
}
