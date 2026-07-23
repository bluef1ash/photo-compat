import { Switch, TextField } from '@mui/material'
import type { FC } from 'react'
import { Segmented } from '../../../components/Segmented'
import type { SettingsCtx } from '../prefs'
import { Row, SettingsGroup } from '../SettingsRow'

/** 输出分组：保存位置、子目录名、结构保留、覆盖策略 */
export const OutputGroup: FC<SettingsCtx> = ({ config, update, pushToast }) => (
  <SettingsGroup
    title="输出"
    desc="控制处理结果的保存位置与命名方式。默认安全：写入子目录、不覆盖原文件。"
  >
    <Row title="输出位置" desc="结果保存到哪里。">
      <Segmented
        value="subfolder"
        options={[
          { value: 'subfolder', label: '同目录子文件夹' },
          { value: 'custom', label: '指定目录' },
        ]}
        onChange={() => pushToast('指定目录暂未启用', 'info')}
      />
    </Row>
    <Row title="子文件夹名" desc="输出子目录的名称。">
      <TextField
        size="small"
        value={config.subfolder}
        onChange={(e) => update({ subfolder: String(e.target.value) })}
        sx={{ width: 130 }}
      />
    </Row>
    <Row
      title="保留文件夹结构"
      desc="输出时镜像原目录树；关闭则全部平铺到一个文件夹（同名自动加序号）。"
    >
      <Switch
        checked={config.keep_structure}
        onChange={(e) => update({ keep_structure: e.target.checked })}
      />
    </Row>
    <Row
      title="覆盖已存在文件"
      desc="开启则同名文件直接覆盖（危险）；关闭则跳过或加序号。"
      hint="谨慎：开启可能覆盖原始结果"
      hintWarn
    >
      <Switch
        checked={config.overwrite}
        onChange={(e) => update({ overwrite: e.target.checked })}
      />
    </Row>
  </SettingsGroup>
)
