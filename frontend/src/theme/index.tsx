import { CssBaseline } from '@mui/material'
import { CssVarsProvider, extendTheme } from '@mui/material/styles'
import type { ReactNode } from 'react'

// 系统字体栈(禁网络字体,移除 MUI 默认 Roboto)。Windows→Segoe UI Variable,Linux→Cantarell/Noto CJK
const FONT_UI =
  '"Segoe UI Variable Text", "Segoe UI", Cantarell, Inter, system-ui, "Microsoft YaHei UI", "Microsoft YaHei", "Source Han Sans SC", "Noto Sans CJK SC", "PingFang SC", sans-serif'

// 方案 B:MUI extendTheme 接管标准 palette,生成 --mui-palette-* 变量
export const theme = extendTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#0067C0', dark: '#005293', contrastText: '#FFFFFF' },
        background: { default: '#F3F3F3', paper: '#FFFFFF' },
        text: { primary: '#1A1A1A', secondary: '#5B5B5B', disabled: '#8A8A8A' },
        divider: '#E5E5E5',
        success: { main: '#107C10' },
        warning: { main: '#9D5D00' },
        error: { main: '#C42B1C' },
        info: { main: '#0067C0' },
        grey: { 400: '#D1D1D1' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#4CC2FF', dark: '#62B6FF', contrastText: '#000000' },
        background: { default: '#202020', paper: '#2B2B2B' },
        text: { primary: '#FFFFFF', secondary: '#C5C5C5', disabled: '#7A7A7A' },
        divider: '#3F3F3F',
        success: { main: '#107C10' },
        warning: { main: '#9D5D00' },
        error: { main: '#C42B1C' },
        info: { main: '#4CC2FF' },
        grey: { 400: '#565656' },
      },
    },
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: FONT_UI,
    // 全局字重仅 400/600:清理 MUI 默认 500。按钮/标题用 600 表强调
    button: { fontWeight: 600, textTransform: 'none' },
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // 非 palette 的软色/自定义 token,light/dark 各一套,随 MUI colorScheme 属性切换
        ':root': {
          '--accent-pressed': '#003F73',
          '--accent-soft': '#E5F1FB',
          '--surface-alt': '#FAFAFA',
          '--success-soft': '#DFF6DD',
          '--warning-soft': '#FFF4CE',
          '--error-soft': '#FDE7E9',
        },
        '[data-mui-color-scheme="dark"]': {
          '--accent-pressed': '#7BD1FF',
          '--accent-soft': '#0A2B45',
          '--surface-alt': '#323232',
          '--success-soft': '#1E3A1E',
          '--warning-soft': '#3A2E0A',
          '--error-soft': '#3A1A18',
        },
      },
    },
    // 卡片/对话框/面板圆角 8px(按钮/输入保持 shape 4px)
    MuiCard: { styleOverrides: { root: { borderRadius: 8 } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 8 } } },
    MuiPopover: { styleOverrides: { paper: { borderRadius: 8 } } },
    // Button hover/active 用项目派生色(MUI 对 CSS 变量字符串不做 darken)
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 4 },
        contained: {
          backgroundColor: 'var(--mui-palette-primary-main)',
          '&:hover': { backgroundColor: 'var(--mui-palette-primary-dark)' },
          '&:active': { backgroundColor: 'var(--accent-pressed)' },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 2, height: 8 } },
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
