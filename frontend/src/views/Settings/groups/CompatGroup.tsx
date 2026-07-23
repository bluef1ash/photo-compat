import { Box, Slider, Switch, TextField } from '@mui/material'
import type { FC } from 'react'
import type { SettingsCtx } from '../prefs'
import { Row, SettingsGroup } from '../SettingsRow'

/** 兼容性分组：核心转换开关与质量/尺寸上限 */
export const CompatGroup: FC<SettingsCtx> = ({ config, update }) => (
  <SettingsGroup title="兼容性" desc="核心设置。默认值已为 95% 场景优化，通常无需修改。">
    <Row title="移除拍摄信息（EXIF）" desc="删除相机型号、拍摄时间、GPS 定位等隐藏信息。">
      <Switch
        checked={config.remove_exif}
        onChange={(e) => update({ remove_exif: e.target.checked })}
      />
    </Row>
    <Row title="移除颜色配置（ICC）" desc="删除颜色管理信息。部分老系统不识别 ICC 会报错。">
      <Switch
        checked={config.remove_icc}
        onChange={(e) => update({ remove_icc: e.target.checked })}
      />
    </Row>
    <Row title="自动修正方向" desc="根据拍摄方向把照片摆正，避免 iPhone 照片在老系统里横倒显示。">
      <Switch
        checked={config.auto_orient}
        onChange={(e) => update({ auto_orient: e.target.checked })}
      />
    </Row>
    <Row
      title="转为基础式 JPEG（Baseline）"
      desc="把渐进式 JPEG 转成基础式，解决老系统只显示半张图的问题。"
    >
      <Switch
        checked={config.baseline_jpeg}
        onChange={(e) => update({ baseline_jpeg: e.target.checked })}
      />
    </Row>
    <Row title="转换 HEIC" desc="把 iPhone 默认的 HEIC 格式转成 JPEG。">
      <Switch
        checked={config.convert_heic}
        onChange={(e) => update({ convert_heic: e.target.checked })}
      />
    </Row>
    <Row title="转为 sRGB 色彩空间" desc="统一为兼容性最好的色彩空间，避免老系统色彩错乱。">
      <Switch checked={config.to_srgb} onChange={(e) => update({ to_srgb: e.target.checked })} />
    </Row>
    <Row
      title="JPEG 质量"
      desc="0–100，越高越清晰、文件越大。90 兼顾画质与兼容。"
      hint="推荐 90 · 低于 75 可能肉眼可见模糊"
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Slider
          value={config.jpeg_quality}
          min={60}
          max={100}
          onChange={(_, v) => update({ jpeg_quality: v as number })}
          sx={{ width: 160 }}
        />
        <Box
          sx={{
            minWidth: 32,
            textAlign: 'right',
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {config.jpeg_quality}
        </Box>
      </Box>
    </Row>
    <Row title="最大宽度" desc="超宽图按此值缩小。老系统常拒绝超大图。">
      <TextField
        type="number"
        size="small"
        value={config.max_width}
        onChange={(e) => update({ max_width: Number(e.target.value) })}
        sx={{ width: 90 }}
      />
      <Box sx={{ fontSize: 12, color: 'var(--mui-palette-text-secondary)' }}>px</Box>
    </Row>
    <Row title="最大高度" desc="同上。">
      <TextField
        type="number"
        size="small"
        value={config.max_height}
        onChange={(e) => update({ max_height: Number(e.target.value) })}
        sx={{ width: 90 }}
      />
      <Box sx={{ fontSize: 12, color: 'var(--mui-palette-text-secondary)' }}>px</Box>
    </Row>
  </SettingsGroup>
)
