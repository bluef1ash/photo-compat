import { type RenderOptions, type RenderResult, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { ThemeProvider } from './theme'

// 包裹 ThemeProvider 的 render 封装,供所有 MUI 组件测试使用
const AllProviders = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
)

export const renderWithTheme = (ui: ReactElement, options?: RenderOptions): RenderResult =>
  render(ui, { wrapper: AllProviders, ...options })
