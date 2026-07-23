import { Box, MenuItem, Select, TextField } from '@mui/material'
import type { FC } from 'react'
import { Button } from '../../../components/Button'
import type { Config, SettingsCtx } from '../prefs'
import { Row, SettingsGroup } from '../SettingsRow'

/** 高级分组：日志、临时目录、配置导入导出、重置 */
export const AdvancedGroup: FC<SettingsCtx> = ({ config, update, pushToast }) => (
  <SettingsGroup title="高级" desc="日志、临时目录与配置管理。普通用户无需调整。">
    <Row title="日志级别" desc="详细日志便于排查，但文件更大。">
      <Select
        size="small"
        value={config.log_level}
        onChange={(e) => update({ log_level: e.target.value as Config['log_level'] })}
        sx={{ fontSize: 13, minWidth: 140 }}
      >
        <MenuItem value="normal">常规</MenuItem>
        <MenuItem value="verbose">详细</MenuItem>
      </Select>
    </Row>
    <Row title="日志保留天数" desc="超期日志自动清理。">
      <TextField
        type="number"
        size="small"
        value={config.log_retention_days}
        onChange={(e) => update({ log_retention_days: Number(e.target.value) })}
        sx={{ width: 90 }}
      />
      <Box sx={{ fontSize: 12, color: 'var(--mui-palette-text-secondary)' }}>天</Box>
    </Row>
    <Row title="临时目录" desc="处理中转目录，建议留足空间。" hint="MVP：暂未启用自定义临时目录">
      <TextField
        size="small"
        value={config.temp_dir ?? ''}
        placeholder="系统默认"
        onChange={(e) => update({ temp_dir: e.target.value || null })}
        sx={{ width: 200, fontSize: 12 }}
      />
    </Row>
    <Row title="导出 / 导入配置" desc="便于备份或在多台电脑间统一部署。">
      <Button
        variant="secondary"
        size="compact"
        onClick={() => pushToast('已导出配置（演示）', 'success')}
      >
        导出
      </Button>
      <Button
        variant="secondary"
        size="compact"
        onClick={() => pushToast('已导入配置（演示）', 'info')}
      >
        导入
      </Button>
    </Row>
    <Row title="重置所有设置" desc="恢复为默认值。" hint="将清除自定义配置，需二次确认" hintWarn>
      <Button
        variant="destructive"
        size="compact"
        onClick={() => pushToast('已重置（演示）', 'warn')}
      >
        重置
      </Button>
    </Row>
  </SettingsGroup>
)
