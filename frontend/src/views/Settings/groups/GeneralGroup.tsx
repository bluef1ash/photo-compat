import { Switch } from '@mui/material'
import type { FC } from 'react'
import { Segmented } from '../../../components/Segmented'
import type { LocalPrefs, PrefCtx, SettingsCtx } from '../prefs'
import { Row, SettingsGroup } from '../SettingsRow'

/** 通用分组：界面语言、启动恢复、提示音、关闭行为 */
export const GeneralGroup: FC<SettingsCtx & PrefCtx> = ({ config, update, prefs, updatePref }) => (
  <SettingsGroup title="通用" desc="基础偏好设置，影响应用整体行为。">
    <Row title="界面语言" desc="应用界面显示的语言。">
      <Segmented
        value={prefs.lang}
        options={[
          { value: 'zh', label: '简体中文' },
          { value: 'en', label: 'English' },
        ]}
        onChange={(v) => updatePref({ lang: v as LocalPrefs['lang'] })}
      />
    </Row>
    <Row title="启动时恢复上次文件夹" desc="打开应用时自动进入上次处理的目录。">
      <Switch
        checked={!!config.last_folder}
        onChange={(e) =>
          update({ last_folder: e.target.checked ? (config.last_folder ?? ' ') : null })
        }
      />
    </Row>
    <Row title="处理完成提示音" desc="全部处理完成后播放一声提示音。">
      <Switch checked={prefs.sound} onChange={(e) => updatePref({ sound: e.target.checked })} />
    </Row>
    <Row title="关闭窗口时" desc="点击关闭按钮时的行为。">
      <Segmented
        value={prefs.closeAction}
        options={[
          { value: 'exit', label: '退出' },
          { value: 'minimize', label: '最小化到托盘' },
        ]}
        onChange={(v) => updatePref({ closeAction: v as LocalPrefs['closeAction'] })}
      />
    </Row>
  </SettingsGroup>
)
