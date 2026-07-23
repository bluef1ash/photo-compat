import { TextField } from '@mui/material'
import type { FC } from 'react'
import { Segmented } from '../../../components/Segmented'
import type { SettingsCtx } from '../prefs'
import { Row, SettingsGroup } from '../SettingsRow'

/** 性能分组：并行数（MVP 未生效）与处理优先级 */
export const PerfGroup: FC<SettingsCtx> = ({ config, update, pushToast }) => (
  <SettingsGroup title="性能" desc="处理速度与资源占用。并行数与内存上限会按 CPU 架构自动调整。">
    <Row
      title="并行处理数"
      desc="同时处理的图片数量。越多越快，但占内存越大。"
      hint="MVP：后端并行由 rayon 默认控制，此值暂未生效"
    >
      <TextField
        type="number"
        size="small"
        value={config.parallel}
        onChange={(e) => update({ parallel: Number(e.target.value) })}
        sx={{ width: 90 }}
      />
    </Row>
    <Row title="处理优先级" desc='"低"时后台处理不卡前台其他程序。'>
      <Segmented
        value="normal"
        options={[
          { value: 'normal', label: '正常' },
          { value: 'low', label: '低' },
        ]}
        onChange={() => pushToast('优先级切换（演示）', 'info')}
      />
    </Row>
  </SettingsGroup>
)
