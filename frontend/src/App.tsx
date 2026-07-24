import { Box } from '@mui/material'
import { useColorScheme } from '@mui/material/styles'
import { useEffect } from 'react'
import { ActionBar } from './components/ActionBar'
import { MenuFlyout } from './components/MenuFlyout'
import { ModalHost } from './components/ModalHost'
import { StatusBar } from './components/StatusBar'
import { Stepper } from './components/Stepper'
import { TitleBar } from './components/TitleBar'
import { ToastHost } from './components/ToastHost'
import { useAppStore } from './store/appStore'
import { CompletedView } from './views/Completed'
import { HomeView } from './views/Home'
import { ProcessingView } from './views/Processing'
import { ResultView } from './views/Result'
import { ScanningView } from './views/Scanning'
import { SettingsView } from './views/Settings'
import { loadPrefs } from './views/Settings/prefs'

const App = () => {
  const view = useAppStore((s) => s.view)
  const { setMode } = useColorScheme()

  // 启动加载后端配置 + 恢复持久化的主题偏好
  useEffect(() => {
    void useAppStore.getState().loadSettings().then(() => {
      void useAppStore.getState().restoreLastFolder()
    })
    const { theme } = loadPrefs()
    if (theme && theme !== 'system' && setMode) {
      setMode(theme)
    }
  }, [setMode])

  // 全局键盘快捷键（Esc/Ctrl+,/Ctrl+O/Ctrl+L/F1/Space/Enter）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useAppStore.getState()

      if (e.key === 'Escape') {
        if (s.modal) {
          s.closeModal()
        } else if (s.menuOpen) {
          s.toggleMenu(false)
        } else if (s.view === 'settings') {
          s.closeSettings()
        } else if (s.view === 'result') {
          s.reset()
        } else if (s.view === 'processing') {
          void s.cancel()
        }
        return
      }

      // 模态打开时，除 Esc 外不响应全局快捷键，避免预览/确认弹窗内误触发主流程
      if (s.modal) {
        return
      }

      if (e.ctrlKey && e.key === ',') {
        e.preventDefault()
        if (s.view === 'settings') {
          s.closeSettings()
        } else {
          s.openSettings()
        }
        return
      }

      if (e.ctrlKey && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault()
        if (s.view === 'completed') {
          void s.openOutput()
        } else {
          void s.selectFolder()
        }
        return
      }

      if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault()
        void s.openLog()
        return
      }

      if (e.key === 'F1') {
        e.preventDefault()
        s.openModal('about')
        return
      }

      if (e.key === ' ' && s.view === 'processing') {
        e.preventDefault()
        void s.togglePause()
        return
      }

      if (e.key === 'Enter') {
        if (s.view === 'home' || s.view === 'scanning') {
          e.preventDefault()
          void s.selectFolder()
        } else if (s.view === 'result') {
          e.preventDefault()
          void s.startProcess()
        } else if (s.view === 'completed') {
          e.preventDefault()
          void s.openOutput()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const flush = view === 'settings' || view === 'scanning'

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <TitleBar />
      {view !== 'settings' ? <Stepper /> : null}
      <Box
        component="main"
        sx={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
          bgcolor: 'var(--mui-palette-background-default)',
          p: flush ? 0 : '32px',
        }}
      >
        {view === 'home' ? <HomeView /> : null}
        {view === 'scanning' ? <ScanningView /> : null}
        {view === 'result' ? <ResultView /> : null}
        {view === 'processing' ? <ProcessingView /> : null}
        {view === 'completed' ? <CompletedView /> : null}
        {view === 'settings' ? (
          <Box sx={{ height: '100%' }}>
            <SettingsView />
          </Box>
        ) : null}
      </Box>
      <ActionBar />
      <StatusBar />
      <MenuFlyout />
      <ModalHost />
      <ToastHost />
    </Box>
  )
}

export default App
