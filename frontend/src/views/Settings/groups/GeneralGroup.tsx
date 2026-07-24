import { Switch } from '@mui/material'
import type { FC } from 'react'
import type { PrefCtx } from '../prefs'
import { Row, SettingsGroup } from '../SettingsRow'

/** 通用分组：界面语言、启动恢复、提示音、关闭行为 */
export const GeneralGroup: FC<PrefCtx> = ({ prefs, updatePref }) => (
  <SettingsGroup title="通用" desc="基础偏好设置，影响应用整体行为。">
    <Row title="启动时恢复上次文件夹" desc="打开应用时自动进入上次处理的目录。">
      <Switch
        checked={prefs.restoreLastFolder}
        onChange={(e) => updatePref({ restoreLastFolder: e.target.checked })}
      />
    </Row>
    <Row title="处理完成提示音" desc="全部处理完成后播放一声提示音。">
      <Switch checked={prefs.sound} onChange={(e) => updatePref({ sound: e.target.checked })} />
    </Row>
  </SettingsGroup>
)
