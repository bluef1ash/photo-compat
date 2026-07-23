import { CssBaseline } from '@mui/material'
import { CssVarsProvider, extendTheme } from '@mui/material/styles'
import type { ReactNode } from 'react'

// Material 字体栈：Roboto 优先（禁网络字体，CJK 回退思源/雅黑）。跨平台一致呈现
const FONT_UI =
  'Roboto, "Helvetica Neue", "Noto Sans SC", "Source Han Sans SC", "Microsoft YaHei UI", "Segoe UI", system-ui, sans-serif'

// 方案 B:MUI extendTheme 接管标准 palette,生成 --mui-palette-* 变量。
// 令牌对齐 Material 原型（design/assets/styles.css）：MUI Blue 700、Material elevation、pill 按钮。
export const theme = extendTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: '#1976d2',
          light: '#42a5f5',
          dark: '#1565c0',
          contrastText: '#FFFFFF',
        },
        background: { default: '#f5f5f5', paper: '#ffffff' },
        text: {
          primary: 'rgba(0,0,0,0.87)',
          secondary: 'rgba(0,0,0,0.6)',
          disabled: 'rgba(0,0,0,0.38)',
        },
        divider: 'rgba(0,0,0,0.12)',
        success: { main: '#2e7d32' },
        warning: { main: '#ed6c02' },
        error: { main: '#d32f2f' },
        info: { main: '#1976d2' },
        grey: { 400: 'rgba(0,0,0,0.24)' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#4cc2ff', dark: '#62b6ff', contrastText: '#000000' },
        background: { default: '#202020', paper: '#2b2b2b' },
        text: {
          primary: '#FFFFFF',
          secondary: 'rgba(255,255,255,0.7)',
          disabled: 'rgba(255,255,255,0.5)',
        },
        divider: 'rgba(255,255,255,0.12)',
        success: { main: '#2e7d32' },
        warning: { main: '#ed6c02' },
        error: { main: '#d32f2f' },
        info: { main: '#4cc2ff' },
        grey: { 400: 'rgba(255,255,255,0.24)' },
      },
    },
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: FONT_UI,
    // Material contained 按钮：Medium 500 + uppercase + 字距
    button: { fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' },
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // 自定义语义 token（accent/surface/soft/radius）已迁至 global.css：
        // system 模式下 MUI 不写 data-mui-color-scheme 属性，只挂属性选择器会造成深色半切换。
      },
    },
    // 卡片/对话框/面板圆角：Material 加大（12/16）。按钮保持 pill
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 'var(--radius-pill)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        },
      },
    },
    MuiIconButton: { styleOverrides: { root: { borderRadius: '50%' } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 12, backgroundImage: 'none' } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 16 } } },
    MuiPopover: { styleOverrides: { paper: { borderRadius: 12 } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 500 } } },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: 2, height: 8 } } },
    MuiSwitch: {
      styleOverrides: {
        root: { width: 52, height: 30, padding: 0 },
        switchBase: {
          padding: '3px',
          '&.Mui-checked': {
            transform: 'translateX(22px)',
          },
        },
        thumb: { width: 24, height: 24 },
        track: { borderRadius: 30 },
      },
    },
  },
})

// 封装 Provider:CssVarsProvider 接管主题,CssBaseline 提供 normalize,defaultMode 跟随系统
export const ThemeProvider = ({ children }: { children: ReactNode }) => (
  <CssVarsProvider theme={theme} defaultMode="system">
    <CssBaseline enableColorScheme />
    {children}
  </CssVarsProvider>
)
