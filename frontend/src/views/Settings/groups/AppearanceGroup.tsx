import { Switch } from '@mui/material'
import type { FC } from 'react'
import { Segmented } from '../../../components/Segmented'
import type { LocalPrefs, PrefCtx } from '../prefs'
import { Row, SettingsGroup } from '../SettingsRow'

type ThemeMode = 'system' | 'light' | 'dark'

interface AppearanceProps extends PrefCtx {
  themeMode: ThemeMode
  onTheme: (m: ThemeMode) => void
}

/** 外观分组：主题、强调色、字号、标题栏、托盘、动画 */
export const AppearanceGroup: FC<AppearanceProps> = ({ prefs, updatePref, themeMode, onTheme }) => (
  <SettingsGroup title="外观" desc="主题、颜色与窗口装饰。">
    <Row title="主题" desc="界面明暗模式。">
      <Segmented
        value={themeMode}
        options={[
          { value: 'system', label: '跟随系统' },
          { value: 'light', label: '浅色' },
          { value: 'dark', label: '深色' },
        ]}
        onChange={(v) => onTheme(v as ThemeMode)}
      />
    </Row>
    <Row title="强调色" desc="按钮与链接的主色调。">
      <Segmented
        value={prefs.accent}
        options={[
          { value: 'blue', label: '系统蓝' },
          { value: 'green', label: '墨绿' },
          { value: 'purple', label: '紫' },
        ]}
        onChange={(v) => updatePref({ accent: v as LocalPrefs['accent'] })}
      />
    </Row>
    <Row title="字号" desc="大字号适合视力不佳用户。" hint="字号缩放为后续增量">
      <Segmented
        value={prefs.fontSize}
        options={[
          { value: 'standard', label: '标准' },
          { value: 'large', label: '大' },
          { value: 'xl', label: '超大' },
        ]}
        onChange={(v) => updatePref({ fontSize: v as LocalPrefs['fontSize'] })}
      />
    </Row>
    <Row
      title="窗口标题栏"
      desc="应用自绘标题栏在三端一致；可切换为系统原生装饰。"
      hint="Linux 桌面可选系统原生（CSD/SSD）"
    >
      <Segmented
        value={prefs.titlebar}
        options={[
          { value: 'custom', label: '应用自绘' },
          { value: 'system', label: '系统原生' },
        ]}
        onChange={(v) => updatePref({ titlebar: v as LocalPrefs['titlebar'] })}
      />
    </Row>
    <Row
      title="最小化到托盘"
      desc="关闭窗口时驻留系统托盘，可继续后台处理。"
      hint="无托盘环境（如纯 GNOME）将自动隐藏此项"
      hintWarn
    >
      <Switch checked={prefs.tray} onChange={(e) => updatePref({ tray: e.target.checked })} />
    </Row>
    <Row title="减少动画" desc="关闭过渡动画。跟随系统辅助设置。">
      <Switch
        checked={prefs.reduceAnim}
        onChange={(e) => updatePref({ reduceAnim: e.target.checked })}
      />
    </Row>
  </SettingsGroup>
)
