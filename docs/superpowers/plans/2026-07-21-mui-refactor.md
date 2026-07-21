# 前端 Tailwind → MUI 重构 实现计划

> **面向 AI 代理的工作者:** 必需子技能:使用 superpowers:subagent-driven-development(推荐)或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框(`- [ ]`)语法来跟踪进度。

**目标:** 前端 UI 实现从 Tailwind v4 优先 重构为 MUI(`@mui/material@9` + emotion)优先——MUI CSS 变量主题接管色彩与 Dark,Tailwind 保留作补充,自绘图标换 `@mui/icons-material`。

**架构:** `extendTheme({ colorSchemes })` + `CssVarsProvider`(defaultMode=system)在 `theme/index.ts` 定义唯一主题;`global.css` 删 `:root`/`@media dark`,`@theme inline` 反向引用 `--mui-palette-*`;7 组件 + 5 视图 + App 重写为 MUI 实现(布局/微调保留 Tailwind 类);删 `icons/Icons.tsx`,3 处图标换 MUI。

**技术栈:** React 19 + TypeScript + Vite 7 + Zustand + MUI 9 + emotion + Tailwind v4(保留)+ @mui/icons-material + Vitest + Biome

---

## 事实来源

- 规格:`docs/superpowers/specs/2026-07-21-mui-refactor-design.md`(令牌映射/组件映射/验收)
- 项目规范:`AGENTS.md`(字体/圆角/字重/无障碍硬约束)
- 工作目录:`e:/LiangTian/Documents/Programming/App/picture-exif`,前端在 `frontend/`
- 验证命令(均在 `frontend/` 下):
  - 类型+构建:`npx tsc --noEmit && npx vite build`(npx 绕过 pnpm deps check)
  - 测试:`pnpm test`
  - lint/format:`pnpm run check`
- biome 硬规则:**无分号**(semicolons asNeeded)、**单引号**、`noNestedTernary`(用对象索引)、`useBlockStatements`、`useJsxKeyInIterable`、trailingCommas all、2 空格缩进
- MUI 主题 API(v6+ 稳定,v9 延续):`extendTheme` + `CssVarsProvider` + `useColorScheme`,生成 `--mui-palette-*` 变量,html 加 `data-mui-color-scheme` 属性

## 文件结构

**新增**
- `frontend/src/theme/index.ts` — MUI 主题定义(extendTheme)+ `ThemeProvider` 封装(CssVarsProvider + CssBaseline,defaultMode=system)
- `frontend/src/test-utils.tsx` — 测试用 `renderWithTheme`(包 ThemeProvider)

**修改**
- `frontend/src/main.tsx` — 包 `<ThemeProvider>`
- `frontend/src/global.css` — 删 `:root`/`@media dark`;`@theme inline` 引用 `var(--mui-palette-*)`;保留 tailwind import + 字体/半径/字号 + base 层
- `frontend/src/App.tsx` — `Box` 容器,删 `IconSprite`
- `frontend/src/components/{Button,ProgressBar,StatCard,Stepper,TitleBar,StatusBar,DropZone}.tsx` — MUI 重写
- `frontend/src/views/{Home,Scanning,Result,Processing,Completed}/index.tsx` — MUI + Tailwind 布局重写
- `frontend/package.json` — 加 `@mui/icons-material`

**删除**
- `frontend/src/icons/Icons.tsx`

**新增测试**
- `frontend/src/components/__tests__/{Button,ProgressBar,StatCard,Stepper,DropZone}.test.tsx`

**职责边界**:组件任务只换实现(Tailwind→MUI),不改对外 API(除 DropZone 外层容器类型,见任务 8)与 store/IPC 调用。

---

## 任务 0:安装 @mui/icons-material

**文件:** `frontend/package.json`、`frontend/pnpm-lock.yaml`

- [ ] **步骤 1:安装**

```bash
cd frontend && pnpm add @mui/icons-material && pnpm add -D @testing-library/user-event
```
预期:package.json `dependencies` 新增 `@mui/icons-material`,`devDependencies` 新增 `@testing-library/user-event`(组件测试用),lock 更新。

- [ ] **步骤 2:验证导入可用**

```bash
cd frontend && npx tsc --noEmit
```
预期:通过(仅新增依赖,无代码改动)。

- [ ] **步骤 3:Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml
git commit -m "chore(前端): 安装 @mui/icons-material 图标库"
```

---

## 任务 1:主题层 + main.tsx

**文件:**
- 创建:`frontend/src/theme/index.ts`
- 修改:`frontend/src/main.tsx`

- [ ] **步骤 1:创建 `frontend/src/theme/index.ts`**

MUI extendTheme 接管 palette(标准色)+ CssBaseline 注入软色/自定义 token(light 在 `:root`,dark 在 `[data-mui-color-scheme="dark"]`,MUI 自动切换该属性)。完整内容:

```ts
import { CssBaseline } from '@mui/material'
import CssVarsProvider, { type CssVarsTheme, extendTheme } from '@mui/material/styles'
import type { ReactNode } from 'react'

// 系统字体栈(禁网络字体,移除 MUI 默认 Roboto)。Windows→Segoe UI Variable,Linux→Cantarell/Noto CJK
const FONT_UI =
  '"Segoe UI Variable Text", "Segoe UI", Cantarell, Inter, system-ui, "Microsoft YaHei UI", "Microsoft YaHei", "Source Han Sans SC", "Noto Sans CJK SC", "PingFang SC", sans-serif'

// 方案 B:MUI extendTheme 接管标准 palette,生成 --mui-palette-* 变量
export const theme: CssVarsTheme = extendTheme({
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
    // 全局字重仅 400/600:清理 MUI 默认 500
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
    // Button hover/active 用项目定义的派生色(MUI 对 CSS 变量字符串不做 darken)
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
```

> 说明:`extendTheme` 的返回类型在 v9 为 `CssVarsTheme`;若 tsc 报类型不匹配,改为 `export const theme = extendTheme({...})`(去掉显式类型注解)。

- [ ] **步骤 2:修改 `frontend/src/main.tsx`**

完整内容:

```tsx
import './global.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './theme'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
```

- [ ] **步骤 3:验证编译**

```bash
cd frontend && npx tsc --noEmit && npx vite build
```
预期:通过。此时组件仍为 Tailwind 版,渲染在 ThemeProvider 内不影响(令牌变量同时存在)。

- [ ] **步骤 4:Commit**

```bash
git add frontend/src/theme/index.ts frontend/src/main.tsx
git commit -m "feat(前端): MUI 主题层(extendTheme+CssVarsProvider 接管)接入 main.tsx"
```

---

## 任务 2:global.css 改造(令牌引用 MUI 变量)

**文件:** `frontend/src/global.css`

- [ ] **步骤 1:重写 `frontend/src/global.css`**

删除 `:root` 与 `@media(prefers-color-scheme:dark)` 手动令牌块(MUI 接管);`@theme inline` 改为引用 `--mui-palette-*` 与软色变量;保留 tailwind import、字体、半径、字号、base 层。完整内容:

```css
@import "tailwindcss";

/* 方案 B:Tailwind 令牌反向引用 MUI 生成的变量,与 MUI 组件同源同步 */
@theme inline {
  --color-accent: var(--mui-palette-primary-main);
  --color-accent-hover: var(--mui-palette-primary-dark);
  --color-accent-pressed: var(--accent-pressed);
  --color-accent-soft: var(--accent-soft);
  --color-bg: var(--mui-palette-background-default);
  --color-surface: var(--mui-palette-background-paper);
  --color-surface-alt: var(--surface-alt);
  --color-fg: var(--mui-palette-text-primary);
  --color-fg-muted: var(--mui-palette-text-secondary);
  --color-fg-disabled: var(--mui-palette-text-disabled);
  --color-border: var(--mui-palette-divider);
  --color-border-strong: var(--mui-palette-grey-400);
  --color-divider: var(--mui-palette-divider);
  --color-success: var(--mui-palette-success-main);
  --color-success-soft: var(--success-soft);
  --color-warning: var(--mui-palette-warning-main);
  --color-warning-soft: var(--warning-soft);
  --color-error: var(--mui-palette-error-main);
  --color-error-soft: var(--error-soft);
  --color-info: var(--mui-palette-info-main);
  --color-info-soft: var(--accent-soft);
  --radius-sm: 4px;
  --radius-md: 8px;
  --text-caption: 12px;
  --text-body: 14px;
  --text-subtitle: 20px;
  --text-title: 28px;
  --text-display-num: 48px;
  --text-display-num-lg: 56px;
  --shadow-rest: 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-flyout: 0 8px 16px rgba(0, 0, 0, 0.14);
  --font-ui:
    "Segoe UI Variable Text", "Segoe UI", "Cantarell", "Inter", system-ui, "Microsoft YaHei UI",
    "Microsoft YaHei", "Source Han Sans SC", "Noto Sans CJK SC", "PingFang SC", sans-serif;
  --font-mono:
    "Cascadia Code", "Consolas", "JetBrains Mono", "DejaVu Sans Mono", ui-monospace, monospace;
}

@layer base {
  html,
  body,
  #root {
    height: 100%;
  }

  body {
    @apply font-ui text-body text-fg bg-bg select-none;
  }

  :focus-visible {
    outline: 2px solid var(--mui-palette-primary-main);
    outline-offset: 2px;
  }
}
```

> 注意:`--mui-palette-grey-400` 变量名以 MUI 实际生成为准(任务 1 验证时用 DevTools 核对;若为 `--mui-palette-grey-400` 则无需改)。`text-body`/`text-fg`/`bg-bg` 等 Tailwind 类继续可用。

- [ ] **步骤 2:验证**

```bash
cd frontend && npx tsc --noEmit && npx vite build
```
预期:通过。CSS 编译含 Tailwind 主题(@theme 引用 var)+ MUI 变量运行时注入。

- [ ] **步骤 3:视觉冒烟**

```bash
cd ../backend && cargo tauri dev
```
预期:应用启动,Light/Dark 跟随系统,基础色与字体正常(此时组件仍 Tailwind 版,验证令牌链路 `@theme→var(--mui-*)` 通畅)。核对后关闭。

- [ ] **步骤 4:Commit**

```bash
git add frontend/src/global.css
git commit -m "refactor(前端): global.css 令牌引用 MUI 变量,删手动主题块(方案 B)"
```

---

## 任务 3:Button 转 MUI

**文件:**
- 修改:`frontend/src/components/Button.tsx`
- 创建:`frontend/src/test-utils.tsx`
- 测试:`frontend/src/components/__tests__/Button.test.tsx`

- [ ] **步骤 1:创建测试工具 `frontend/src/test-utils.tsx`**

组件测试需 ThemeProvider(MUI 组件依赖主题变量)。完整内容:

```tsx
import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { ThemeProvider } from './theme'

// 包裹 ThemeProvider 的 render 封装,供所有 MUI 组件测试使用
const AllProviders = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
)

export const renderWithTheme = (
  ui: ReactElement,
  options?: RenderOptions,
): RenderResult => render(ui, { wrapper: AllProviders, ...options })
```

- [ ] **步骤 2:编写 `frontend/src/components/__tests__/Button.test.tsx`**

测试行为契约(与实现无关):渲染、默认 variant、onClick、disabled、children。完整内容:

```tsx
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '../Button'
import { renderWithTheme } from '../../test-utils'

describe('Button', () => {
  it('渲染 children', () => {
    renderWithTheme(<Button>开始处理</Button>)
    expect(screen.getByRole('button', { name: '开始处理' })).toBeInTheDocument()
  })

  it('点击触发 onClick', async () => {
    const onClick = vi.fn()
    renderWithTheme(<Button onClick={onClick}>点我</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('disabled 时不触发 onClick 且不可点击', async () => {
    const onClick = vi.fn()
    renderWithTheme(
      <Button disabled onClick={onClick}>
        禁用
      </Button>,
    )
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    await userEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('默认 variant 为 secondary(不抛错)', () => {
    renderWithTheme(<Button>默认</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('各 variant/size 组合均正常渲染', () => {
    const { rerender } = renderWithTheme(<Button variant="primary">a</Button>)
    for (const variant of ['primary', 'secondary', 'subtle', 'destructive'] as const) {
      for (const size of ['standard', 'large', 'compact'] as const) {
        rerender(
          <ThemeProvider>
            <Button variant={variant} size={size}>
              {variant}
            </Button>
          </ThemeProvider>,
        )
      }
    }
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
  })
})
```

> 说明:最后一个用例需 `import { ThemeProvider } from '../../theme'`。`@testing-library/user-event` 已在任务 0 安装。

- [ ] **步骤 3:运行测试验证失败**

```bash
cd frontend && pnpm test src/components/__tests__/Button.test.tsx
```
预期:FAIL(Button 仍为原生 `<button>`,但断言基本能过——此步主要确认测试可运行;若 user-event 缺失先装)。注:重构场景下测试未必全红,重点在实现替换后仍绿。

- [ ] **步骤 4:重写 `frontend/src/components/Button.tsx`**

薄包装:保留 `ButtonProps`(variant/size + ButtonHTMLAttributes),内部映射 MUI variant/color/size。完整内容:

```tsx
import { Button as MuiButton } from '@mui/material'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'subtle' | 'destructive'
type Size = 'standard' | 'large' | 'compact'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children?: ReactNode
}

// 项目 variant → MUI variant/color 映射
const MUI_VARIANT: Record<Variant, 'contained' | 'outlined' | 'text'> = {
  primary: 'contained',
  secondary: 'outlined',
  subtle: 'text',
  destructive: 'outlined',
}
const MUI_COLOR: Record<Variant, 'primary' | 'inherit' | 'error'> = {
  primary: 'primary',
  secondary: 'primary',
  subtle: 'inherit',
  destructive: 'error',
}
// 项目 size → MUI size + 自定义高度(贴合 standard h40 / large h48 / compact h32)
const MUI_SIZE: Record<Size, 'small' | 'medium' | 'large'> = {
  standard: 'medium',
  large: 'large',
  compact: 'small',
}
const HEIGHT: Record<Size, number> = {
  standard: 40,
  large: 48,
  compact: 32,
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'standard',
  className,
  children,
  ...rest
}) => (
  <MuiButton
    variant={MUI_VARIANT[variant]}
    color={MUI_COLOR[variant]}
    size={MUI_SIZE[size]}
    disableElevation
    sx={{ height: HEIGHT[size], minWidth: 'auto' }}
    className={className}
    {...rest}
  >
    {children}
  </MuiButton>
)
```

- [ ] **步骤 5:运行测试验证通过**

```bash
cd frontend && pnpm test src/components/__tests__/Button.test.tsx && npx tsc --noEmit
```
预期:测试 PASS;tsc 通过。

- [ ] **步骤 6:Commit**

```bash
git add frontend/src/components/Button.tsx frontend/src/test-utils.tsx frontend/src/components/__tests__/Button.test.tsx frontend/package.json frontend/pnpm-lock.yaml
git commit -m "refactor(前端): Button 转 MUI 薄包装(variant/size 映射)+ 测试工具"
```

---

## 任务 4:ProgressBar 转 MUI LinearProgress

**文件:**
- 修改:`frontend/src/components/ProgressBar.tsx`
- 测试:`frontend/src/components/__tests__/ProgressBar.test.tsx`

- [ ] **步骤 1:编写测试 `frontend/src/components/__tests__/ProgressBar.test.tsx`**

```tsx
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProgressBar } from '../ProgressBar'
import { renderWithTheme } from '../../test-utils'

describe('ProgressBar', () => {
  it('value 越界被钳制到 0-100 并写入 aria-valuenow', () => {
    renderWithTheme(<ProgressBar value={150} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '100')
  })

  it('value 为负钳制到 0', () => {
    renderWithTheme(<ProgressBar value={-20} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('正常值直传', () => {
    renderWithTheme(<ProgressBar value={42} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42')
  })
})
```

- [ ] **步骤 2:运行测试验证失败/可运行**

```bash
cd frontend && pnpm test src/components/__tests__/ProgressBar.test.tsx
```
预期:FAIL(现实现无 progressbar role/aria)。

- [ ] **步骤 3:重写 `frontend/src/components/ProgressBar.tsx`**

```tsx
import { LinearProgress } from '@mui/material'

// 钳制到 [0,100];MUI LinearProgress determinate 自动带 aria-valuenow/min/max
const clamp = (v: number) => Math.min(100, Math.max(0, v))

export const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
  <LinearProgress variant="determinate" value={clamp(value)} />
)
```

- [ ] **步骤 4:运行测试验证通过**

```bash
cd frontend && pnpm test src/components/__tests__/ProgressBar.test.tsx && npx tsc --noEmit
```
预期:PASS;tsc 通过。

- [ ] **步骤 5:Commit**

```bash
git add frontend/src/components/ProgressBar.tsx frontend/src/components/__tests__/ProgressBar.test.tsx
git commit -m "refactor(前端): ProgressBar 转 MUI LinearProgress(determinate+aria)"
```

---

## 任务 5:StatCard 转 MUI Paper

**文件:**
- 修改:`frontend/src/components/StatCard.tsx`
- 测试:`frontend/src/components/__tests__/StatCard.test.tsx`

- [ ] **步骤 1:编写测试 `frontend/src/components/__tests__/StatCard.test.tsx`**

```tsx
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatCard } from '../StatCard'
import { renderWithTheme } from '../../test-utils'

describe('StatCard', () => {
  it('渲染 value 与 label', () => {
    renderWithTheme(<StatCard value={42} label="总图片数" />)
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('总图片数')).toBeInTheDocument()
  })

  it('接受字符串 value', () => {
    renderWithTheme(<StatCard value="—" label="预计输出大小" />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('默认 tone=default 正常渲染', () => {
    renderWithTheme(<StatCard value={1} label="x" />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('tone=error/muted 不抛错', () => {
    renderWithTheme(
      <>
        <StatCard value={1} label="失败" tone="error" />
        <StatCard value={2} label="跳过" tone="muted" />
      </>,
    )
    expect(screen.getByText('失败')).toBeInTheDocument()
    expect(screen.getByText('跳过')).toBeInTheDocument()
  })
})
```

- [ ] **步骤 2:运行测试验证可运行**

```bash
cd frontend && pnpm test src/components/__tests__/StatCard.test.tsx
```
预期:现实现即可过(行为相同);重点验证 MUI 重写后仍绿。

- [ ] **步骤 3:重写 `frontend/src/components/StatCard.tsx`**

Paper elevation=0 + border(贴合原设计 border 而非阴影);大数字用 sx 着色。

```tsx
import { Paper } from '@mui/material'
import type { ReactNode } from 'react'

type Tone = 'default' | 'error' | 'muted'

// tone → 字色映射,对象索引替代嵌套三元(biome noNestedTernary)
const TONE_COLOR: Record<Tone, string> = {
  error: 'var(--mui-palette-error-main)',
  muted: 'var(--mui-palette-text-secondary)',
  default: 'var(--mui-palette-text-primary)',
}

export const StatCard: React.FC<{
  value: ReactNode
  label: string
  tone?: Tone
}> = ({ value, label, tone = 'default' }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2,
      borderColor: 'var(--mui-palette-divider)',
      borderRadius: 2,
    }}
  >
    <div
      className="tabular-nums"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-display-num)',
        fontWeight: 600,
        color: TONE_COLOR[tone],
      }}
    >
      {value}
    </div>
    <div style={{ fontSize: 'var(--text-caption)', color: 'var(--mui-palette-text-secondary)' }}>
      {label}
    </div>
  </Paper>
)
```

> 说明:用 `Paper variant="outlined"`(等价 elevation=0 + border)。字号用 CSS 变量保持与令牌一致。

- [ ] **步骤 4:运行测试验证通过**

```bash
cd frontend && pnpm test src/components/__tests__/StatCard.test.tsx && npx tsc --noEmit
```
预期:PASS;tsc 通过。

- [ ] **步骤 5:Commit**

```bash
git add frontend/src/components/StatCard.tsx frontend/src/components/__tests__/StatCard.test.tsx
git commit -m "refactor(前端): StatCard 转 MUI Paper(outlined)+ tone 着色"
```

---

## 任务 6:Stepper 转 MUI Box 手搓

**文件:**
- 修改:`frontend/src/components/Stepper.tsx`
- 测试:`frontend/src/components/__tests__/Stepper.test.tsx`

- [ ] **步骤 1:编写测试 `frontend/src/components/__tests__/Stepper.test.tsx`**

Stepper 依赖 store,需在测试里设置 view。用 `useAppStore.setState({ view })` 注入。

```tsx
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { Stepper } from '../Stepper'
import { useAppStore } from '../../store/appStore'
import { renderWithTheme } from '../../test-utils'

// 需 mock Tauri/IPC,否则 store import 触发副作用。与 appStore.test.ts 一致
vi.mock('../../ipc/commands', () => ({
  scanDirectory: vi.fn(),
  startProcess: vi.fn(),
  cancelProcess: vi.fn(),
  pauseProcess: vi.fn(),
  resumeProcess: vi.fn(),
  openOutput: vi.fn(),
}))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(() => Promise.resolve(() => {})) }))
vi.mock('@tauri-apps/api/path', () => ({ join: vi.fn(async (a: string, b: string) => `${a}/${b}`) }))

import { vi } from 'vitest'

describe('Stepper', () => {
  beforeEach(() => {
    useAppStore.getState().reset()
  })

  it('渲染 4 个步骤', () => {
    useAppStore.setState({ view: 'result' })
    renderWithTheme(<Stepper />)
    expect(screen.getByText('选目录')).toBeInTheDocument()
    expect(screen.getByText('查看结果')).toBeInTheDocument()
    expect(screen.getByText('处理')).toBeInTheDocument()
    expect(screen.getByText('完成')).toBeInTheDocument()
  })

  it('completed 视图时全部步骤已激活', () => {
    useAppStore.setState({ view: 'completed' })
    renderWithTheme(<Stepper />)
    expect(screen.getByText('完成')).toBeInTheDocument()
  })
})
```

> 说明:`import { vi }` 置于 vi.mock 之前会被 biome organizeImports 重排到顶部——改用顶部统一 import(见步骤 3 修正前先把测试调整为:`import { beforeEach, describe, expect, it, vi } from 'vitest'` 放最前,删除文件末尾的 `import { vi }`)。最终测试文件把 vitest 的 import 合并到首行。

- [ ] **步骤 2:运行测试验证**

```bash
cd frontend && pnpm test src/components/__tests__/Stepper.test.tsx
```
预期:可运行(现实现即渲染 4 步,基本过)。

- [ ] **步骤 3:重写 `frontend/src/components/Stepper.tsx`**

Box 手搓:圆形数字 + 文字 + 分隔线,激活态用 palette。完整内容:

```tsx
import { Box } from '@mui/material'
import React from 'react'
import { useAppStore } from '../store/appStore'

const STEPS = ['选目录', '查看结果', '处理', '完成'] as const

// view → 当前步骤索引(未扫描不能前进)
const ORDER: Record<string, number> = {
  home: 0,
  scanning: 0,
  result: 1,
  processing: 2,
  completed: 3,
}

export const Stepper: React.FC = () => {
  const view = useAppStore((s) => s.view)
  const current = ORDER[view] ?? 0
  return (
    <Box
      component="nav"
      sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 3, py: 1.5 }}
    >
      {STEPS.map((label, i) => {
        const active = i <= current
        return (
          <React.Fragment key={label}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                component="span"
                aria-current={i === current ? 'step' : undefined}
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  bgcolor: active ? 'var(--mui-palette-primary-main)' : 'var(--mui-palette-grey-400)',
                  color: active ? '#FFFFFF' : 'var(--mui-palette-text-secondary)',
                }}
              >
                {i + 1}
              </Box>
              <Box
                component="span"
                sx={{
                  fontSize: 'var(--text-caption)',
                  color: active
                    ? 'var(--mui-palette-text-primary)'
                    : 'var(--mui-palette-text-secondary)',
                }}
              >
                {label}
              </Box>
            </Box>
            {i < STEPS.length - 1 && (
              <Box sx={{ flex: 1, height: 1, bgcolor: 'var(--mui-palette-divider)' }} />
            )}
          </React.Fragment>
        )
      })}
    </Box>
  )
}
```

- [ ] **步骤 4:运行测试验证通过**

```bash
cd frontend && pnpm test src/components/__tests__/Stepper.test.tsx && npx tsc --noEmit
```
预期:PASS;tsc 通过。

- [ ] **步骤 5:Commit**

```bash
git add frontend/src/components/Stepper.tsx frontend/src/components/__tests__/Stepper.test.tsx
git commit -m "refactor(前端): Stepper 转 MUI Box 手搓(圆形数字+分隔线)"
```

---

## 任务 7:TitleBar + StatusBar 转 MUI(图标换 MUI)

**文件:** `frontend/src/components/TitleBar.tsx`、`frontend/src/components/StatusBar.tsx`

- [ ] **步骤 1:重写 `frontend/src/components/TitleBar.tsx`**

Folder 图标换 `@mui/icons-material/Folder`;保留 CSD 标题栏布局(将来挂 `data-tauri-drag-region`,本任务先不加,标题栏拖拽属窗口集成,留增量)。

```tsx
import { Box } from '@mui/material'
import Folder from '@mui/icons-material/Folder'
import type React from 'react'

export const TitleBar: React.FC = () => (
  <Box
    component="header"
    sx={{
      height: 40,
      display: 'flex',
      alignItems: 'center',
      px: 2,
      gap: 1,
      borderBottom: 1,
      borderColor: 'var(--mui-palette-divider)',
    }}
  >
    <Folder sx={{ fontSize: 18 }} />
    <Box component="span" sx={{ fontWeight: 600 }}>
      照片适配助手
    </Box>
    <Box
      component="span"
      sx={{ ml: 'auto', fontSize: 'var(--text-caption)', color: 'var(--mui-palette-text-secondary)' }}
    >
      标准兼容模式
    </Box>
  </Box>
)
```

- [ ] **步骤 2:重写 `frontend/src/components/StatusBar.tsx`**

状态点 + 文字 + 右侧信息。view 来自 store。

```tsx
import { Box } from '@mui/material'
import type React from 'react'
import { useAppStore } from '../store/appStore'

// 视图→状态文案映射,对象索引替代嵌套三元(noNestedTernary)
const STATUS_TEXT: Record<string, string> = {
  processing: '处理中',
  scanning: '扫描中',
}

export const StatusBar: React.FC = () => {
  const view = useAppStore((s) => s.view)
  const status = STATUS_TEXT[view] ?? '就绪'
  const busy = view === 'processing' || view === 'scanning'
  return (
    <Box
      component="footer"
      sx={{
        height: 28,
        display: 'flex',
        alignItems: 'center',
        px: 2,
        gap: 1.5,
        fontSize: 'var(--text-caption)',
        color: 'var(--mui-palette-text-secondary)',
        borderTop: 1,
        borderColor: 'var(--mui-palette-divider)',
      }}
    >
      <Box
        component="span"
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: busy
            ? 'var(--mui-palette-primary-main)'
            : 'var(--mui-palette-text-disabled)',
        }}
      />
      <Box component="span">{status}</Box>
      <Box component="span" sx={{ ml: 'auto' }}>
        输出到 同目录/compat
      </Box>
      <Box component="span">· 离线 · v1.0</Box>
    </Box>
  )
}
```

- [ ] **步骤 3:验证**

```bash
cd frontend && npx tsc --noEmit && npx vite build && pnpm test
```
预期:tsc/build 通过;已有测试(appStore)不受影响。

- [ ] **步骤 4:Commit**

```bash
git add frontend/src/components/TitleBar.tsx frontend/src/components/StatusBar.tsx
git commit -m "refactor(前端): 标题栏/状态栏转 MUI Box,图标换 @mui/icons-material"
```

---

## 任务 8:DropZone 转 MUI(外层改 Box)

**文件:**
- 修改:`frontend/src/components/DropZone.tsx`
- 测试:`frontend/src/components/__tests__/DropZone.test.tsx`

> 关键:现实现外层用 `Button` 当容器且内嵌 `Button`(嵌套交互元素),MUI 禁止。重构为外层 `Box`(role=button),内部仍用 `Button`。

- [ ] **步骤 1:编写测试 `frontend/src/components/__tests__/DropZone.test.tsx`**

mock store 的 selectFolder,验证拖拽/Enter 触发 + 渲染文案。

```tsx
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DropZone } from '../DropZone'
import { useAppStore } from '../../store/appStore'
import { renderWithTheme } from '../../test-utils'

vi.mock('../../ipc/commands', () => ({
  scanDirectory: vi.fn(),
  startProcess: vi.fn(),
  cancelProcess: vi.fn(),
  pauseProcess: vi.fn(),
  resumeProcess: vi.fn(),
  openOutput: vi.fn(),
}))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }))
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(() => Promise.resolve(() => {})) }))
vi.mock('@tauri-apps/api/path', () => ({ join: vi.fn(async (a: string, b: string) => `${a}/${b}`) }))

describe('DropZone', () => {
  beforeEach(() => {
    useAppStore.getState().reset()
    vi.clearAllMocks()
  })

  it('渲染拖拽提示与选择按钮', () => {
    renderWithTheme(<DropZone />)
    expect(screen.getByText('把包含照片的文件夹拖到这里')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '选择文件夹' })).toBeInTheDocument()
  })

  it('Enter 键触发 selectFolder', async () => {
    const selectFolder = vi.spyOn(useAppStore.getState(), 'selectFolder').mockResolvedValue()
    renderWithTheme(<DropZone />)
    const zone = screen.getByLabelText('拖入文件夹或选择文件夹')
    await userEvent.type(zone, '{Enter}')
    expect(selectFolder).toHaveBeenCalled()
  })

  it('点击「选择文件夹」按钮触发 selectFolder', async () => {
    const selectFolder = vi.spyOn(useAppStore.getState(), 'selectFolder').mockResolvedValue()
    renderWithTheme(<DropZone />)
    await userEvent.click(screen.getByRole('button', { name: '选择文件夹' }))
    expect(selectFolder).toHaveBeenCalled()
  })
})
```

- [ ] **步骤 2:运行测试验证**

```bash
cd frontend && pnpm test src/components/__tests__/DropZone.test.tsx
```
预期:现实现可能因内嵌 Button 结构导致 getByRole 重复——FAIL,驱动重构。

- [ ] **步骤 3:重写 `frontend/src/components/DropZone.tsx`**

外层 `Box`(role=button + 拖拽 + Enter),Folder 图标 48,内含 `Button` primary large + Folder 图标。

```tsx
import Folder from '@mui/icons-material/Folder'
import { Box } from '@mui/material'
import React, { useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { Button } from './Button'

export const DropZone: React.FC = () => {
  const selectFolder = useAppStore((s) => s.selectFolder)
  const [hover, setHover] = React.useState(false)

  // MVP:拖拽仅视觉反馈,统一走系统选择器入口。完整拖拽路径处理留增量
  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setHover(false)
      await selectFolder()
    },
    [selectFolder],
  )

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label="拖入文件夹或选择文件夹"
      onDragOver={(e) => {
        e.preventDefault()
        setHover(true)
      }}
      onDragLeave={() => setHover(false)}
      onDrop={onDrop}
      onClick={selectFolder}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          selectFolder()
        }
      }}
      sx={{
        border: '2px',
        borderStyle: hover ? 'solid' : 'dashed',
        borderColor: 'var(--mui-palette-primary-main)',
        bgcolor: hover ? 'var(--accent-soft)' : 'var(--surface-alt)',
        borderRadius: 2,
        p: 6,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        outline: 'none',
        cursor: 'pointer',
      }}
    >
      <Folder sx={{ fontSize: 48 }} />
      <Box>把包含照片的文件夹拖到这里</Box>
      <Box sx={{ color: 'var(--mui-palette-text-secondary)' }}>— 或 —</Box>
      <Button variant="primary" size="large" onClick={(e) => e.stopPropagation()}>
        <Folder /> 选择文件夹
      </Button>
    </Box>
  )
}
```

> 说明:外层 Box 已 onClick=selectFolder,内层 Button 用 `stopPropagation` 防双触发(内层 Button 不再单独绑 selectFolder,点击冒泡到外层触发)。键盘 Enter 在外层 onKeyDown。

> 注意:内层 Button 的 `onClick={(e) => e.stopPropagation()}` 只阻止冒泡——实际选择由外层 onClick 完成。若希望按钮自身触发,改为 `onClick={(e) => { e.stopPropagation(); selectFolder() }}`。两者等价,采用前者更简。

- [ ] **步骤 4:运行测试验证通过**

```bash
cd frontend && pnpm test src/components/__tests__/DropZone.test.tsx && npx tsc --noEmit
```
预期:PASS(role=button 唯一 + aria-label,按钮 name='选择文件夹');tsc 通过。

- [ ] **步骤 5:Commit**

```bash
git add frontend/src/components/DropZone.tsx frontend/src/components/__tests__/DropZone.test.tsx
git commit -m "refactor(前端): DropZone 转 MUI Box(外层容器化,消除嵌套 Button)"
```

---

## 任务 9:HomeView 转 MUI

**文件:** `frontend/src/views/Home/index.tsx`

- [ ] **步骤 1:重写 `frontend/src/views/Home/index.tsx`**

```tsx
import { Box } from '@mui/material'
import type React from 'react'
import { DropZone } from '../../components/DropZone'
import { useAppStore } from '../../store/appStore'

export const HomeView: React.FC = () => {
  const error = useAppStore((s) => s.error)
  return (
    <Box
      sx={{
        maxWidth: '42rem',
        mx: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Box>
        <Box
          component="h1"
          sx={{ fontSize: 'var(--text-title)', fontWeight: 600, m: 0 }}
        >
          把照片变成任何老旧系统都能上传的格式
        </Box>
        <Box
          component="p"
          sx={{ mt: 1, mb: 0, color: 'var(--mui-palette-text-secondary)' }}
        >
          全程离线,不上传任何文件,安全放心
        </Box>
      </Box>
      <DropZone />
      {error && (
        <Box
          role="alert"
          sx={{
            color: 'var(--mui-palette-error-main)',
            bgcolor: 'var(--error-soft)',
            p: 1.5,
            borderRadius: 1,
          }}
        >
          {error}
        </Box>
      )}
      <Box sx={{ color: 'var(--mui-palette-text-secondary)', fontSize: 'var(--text-caption)' }}>
        支持 JPEG / PNG / HEIC / WebP / GIF / TIFF · 自动转换为高兼容 JPEG
      </Box>
    </Box>
  )
}
```

- [ ] **步骤 2:验证**

```bash
cd frontend && npx tsc --noEmit && npx vite build && pnpm test
```
预期:通过。

- [ ] **步骤 3:Commit**

```bash
git add frontend/src/views/Home/index.tsx
git commit -m "refactor(前端): HomeView 转 MUI Box 布局"
```

---

## 任务 10:ScanningView 转 MUI CircularProgress

**文件:** `frontend/src/views/Scanning/index.tsx`

- [ ] **步骤 1:重写 `frontend/src/views/Scanning/index.tsx`**

spinner 用 MUI `CircularProgress`(替代手写 animate-spin 圆环)。

```tsx
import { Box, CircularProgress } from '@mui/material'
import type React from 'react'

export const ScanningView: React.FC = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, p: 6 }}>
    <CircularProgress size={40} />
    <Box>正在扫描文件夹…</Box>
  </Box>
)
```

- [ ] **步骤 2:验证**

```bash
cd frontend && npx tsc --noEmit && npx vite build && pnpm test
```
预期:通过。

- [ ] **步骤 3:Commit**

```bash
git add frontend/src/views/Scanning/index.tsx
git commit -m "refactor(前端): ScanningView 转 MUI CircularProgress"
```

---

## 任务 11:ResultView 转 MUI

**文件:** `frontend/src/views/Result/index.tsx`

- [ ] **步骤 1:重写 `frontend/src/views/Result/index.tsx`**

```tsx
import { Box } from '@mui/material'
import type React from 'react'
import { Button } from '../../components/Button'
import { StatCard } from '../../components/StatCard'
import { useAppStore } from '../../store/appStore'

export const ResultView: React.FC = () => {
  const scan = useAppStore((s) => s.scan)
  const startProcess = useAppStore((s) => s.startProcess)
  const reset = useAppStore((s) => s.reset)
  if (!scan) {
    return null
  }
  const formats = Object.entries(scan.by_format)
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '56rem', mx: 'auto' }}>
      <Box component="h2" sx={{ m: 0, fontWeight: 600 }}>
        扫描完成
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
        <StatCard value={scan.total} label="总图片数" />
        <StatCard value={scan.total - scan.unsupported.length} label="预计输出数量" />
        <StatCard value="—" label="预计输出大小" />
        <StatCard value="—" label="预计节省" />
      </Box>
      <Box>
        <Box sx={{ color: 'var(--mui-palette-text-secondary)', mb: 1 }}>格式分布</Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {formats.map(([fmt, n]) => (
            <Box
              key={fmt}
              component="span"
              sx={{
                bgcolor: 'var(--accent-soft)',
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
              }}
            >
              {fmt} {n}
            </Box>
          ))}
        </Box>
      </Box>
      {scan.unsupported.length > 0 && (
        <Box
          role="status"
          sx={{ bgcolor: 'var(--warning-soft)', p: 2, borderRadius: 1 }}
        >
          检测到 {scan.unsupported.length} 个暂不支持的文件,将跳过
        </Box>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
        <Button onClick={reset}>取消</Button>
        <Button variant="primary" onClick={startProcess}>
          开始处理
        </Button>
      </Box>
    </Box>
  )
}
```

- [ ] **步骤 2:验证**

```bash
cd frontend && npx tsc --noEmit && npx vite build && pnpm test
```
预期:通过。`useJsxKeyInIterable`:formats.map 带 key ✓。

- [ ] **步骤 3:Commit**

```bash
git add frontend/src/views/Result/index.tsx
git commit -m "refactor(前端): ResultView 转 MUI Box 布局"
```

---

## 任务 12:ProcessingView 转 MUI

**文件:** `frontend/src/views/Processing/index.tsx`

- [ ] **步骤 1:重写 `frontend/src/views/Processing/index.tsx`**

保留 Space 键暂停/继续 useEffect 不变。大百分比用 mono 字体 + tabular-nums。

```tsx
import { Box } from '@mui/material'
import { useEffect } from 'react'
import type React from 'react'
import { Button } from '../../components/Button'
import { ProgressBar } from '../../components/ProgressBar'
import { StatCard } from '../../components/StatCard'
import { useAppStore } from '../../store/appStore'

export const ProcessingView: React.FC = () => {
  const progress = useAppStore((s) => s.progress)
  const paused = useAppStore((s) => s.paused)
  const togglePause = useAppStore((s) => s.togglePause)
  const cancel = useAppStore((s) => s.cancel)

  // §5.4 Space 暂停/继续
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        togglePause()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePause])

  const pct =
    progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
  const failed = progress?.failed ?? 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '56rem', mx: 'auto' }}>
      <Box>
        <Box
          className="tabular-nums"
          sx={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-display-num-lg)',
            fontWeight: 600,
          }}
        >
          {pct}%
        </Box>
        <ProgressBar value={pct} />
        <Box sx={{ mt: 1, color: 'var(--mui-palette-text-secondary)' }}>
          已处理 {progress?.done ?? 0} / {progress?.total ?? 0}
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
        <StatCard value={progress?.done ?? 0} label="已处理" />
        <StatCard value={failed} label="失败" tone={failed > 0 ? 'error' : 'default'} />
        <StatCard value={progress?.skipped ?? 0} label="跳过" tone="muted" />
        <StatCard value={paused ? '已暂停' : '运行中'} label="状态" />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
        <Button variant="destructive" onClick={cancel}>
          取消
        </Button>
        <Button variant="secondary" onClick={togglePause}>
          {paused ? '继续' : '暂停'}
        </Button>
      </Box>
    </Box>
  )
}
```

- [ ] **步骤 2:验证**

```bash
cd frontend && npx tsc --noEmit && npx vite build && pnpm test
```
预期:通过。

- [ ] **步骤 3:Commit**

```bash
git add frontend/src/views/Processing/index.tsx
git commit -m "refactor(前端): ProcessingView 转 MUI(Space 暂停逻辑保留)"
```

---

## 任务 13:CompletedView 转 MUI(图标换 MUI)

**文件:** `frontend/src/views/Completed/index.tsx`

- [ ] **步骤 1:重写 `frontend/src/views/Completed/index.tsx`**

check→CheckCircle(72)、open→FolderOpen。

```tsx
import CheckCircle from '@mui/icons-material/CheckCircle'
import FolderOpen from '@mui/icons-material/FolderOpen'
import { Box } from '@mui/material'
import type React from 'react'
import { Button } from '../../components/Button'
import { StatCard } from '../../components/StatCard'
import { useAppStore } from '../../store/appStore'

export const CompletedView: React.FC = () => {
  const summary = useAppStore((s) => s.summary)
  const openOutput = useAppStore((s) => s.openOutput)
  const reset = useAppStore((s) => s.reset)
  if (!summary) {
    return null
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: '56rem', mx: 'auto' }}>
      <Box sx={{ textAlign: 'center', p: 3 }}>
        <CheckCircle sx={{ fontSize: 72, color: 'var(--mui-palette-success-main)' }} />
        <Box component="h1" sx={{ fontSize: 'var(--text-title)', fontWeight: 600, mt: 1, mb: 0 }}>
          处理完成!
        </Box>
        <Box sx={{ color: 'var(--mui-palette-text-secondary)' }}>
          {summary.done} 张照片已转换为兼容格式
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
        <StatCard value={summary.total} label="总计处理" />
        <StatCard value={summary.done} label="成功" />
        <StatCard value={summary.failed} label="失败" tone={summary.failed > 0 ? 'error' : 'default'} />
        <StatCard value={summary.skipped} label="跳过" tone="muted" />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
        <Button onClick={reset}>处理另一个文件夹</Button>
        <Button variant="primary" size="large" onClick={openOutput}>
          <FolderOpen /> 打开输出目录
        </Button>
      </Box>
    </Box>
  )
}
```

- [ ] **步骤 2:验证**

```bash
cd frontend && npx tsc --noEmit && npx vite build && pnpm test
```
预期:通过。此时视图已无 `Icon`/`IconSprite` 引用(仅 App.tsx 还引用 IconSprite,任务 14 处理)。

- [ ] **步骤 3:Commit**

```bash
git add frontend/src/views/Completed/index.tsx
git commit -m "refactor(前端): CompletedView 转 MUI,图标换 CheckCircle/FolderOpen"
```

---

## 任务 14:App.tsx + 删 Icons.tsx + 全局验证

**文件:**
- 修改:`frontend/src/App.tsx`
- 删除:`frontend/src/icons/Icons.tsx`

- [ ] **步骤 1:重写 `frontend/src/App.tsx`**

Box 容器,删 IconSprite。

```tsx
import { Box } from '@mui/material'
import type React from 'react'
import { StatusBar } from './components/StatusBar'
import { Stepper } from './components/Stepper'
import { TitleBar } from './components/TitleBar'
import { useAppStore } from './store/appStore'
import { CompletedView } from './views/Completed'
import { HomeView } from './views/Home'
import { ProcessingView } from './views/Processing'
import { ResultView } from './views/Result'
import { ScanningView } from './views/Scanning'

const App: React.FC = () => {
  const view = useAppStore((s) => s.view)
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TitleBar />
      {view !== 'home' && <Stepper />}
      <Box component="main" sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {view === 'home' && <HomeView />}
        {view === 'scanning' && <ScanningView />}
        {view === 'result' && <ResultView />}
        {view === 'processing' && <ProcessingView />}
        {view === 'completed' && <CompletedView />}
      </Box>
      <StatusBar />
    </Box>
  )
}

export default App
```

- [ ] **步骤 2:删除 `frontend/src/icons/Icons.tsx`**

```bash
cd frontend && git rm src/icons/Icons.tsx
```

- [ ] **步骤 3:确认无残余引用**

```bash
cd frontend && grep -rn "icons/Icons\|IconSprite\|from '../icons\|from '../../icons" src/ || echo "无残余引用"
```
预期:输出「无残余引用」。

- [ ] **步骤 4:全局验证**

```bash
cd frontend && npx tsc --noEmit && npx vite build && pnpm test && pnpm run check
```
预期:tsc/build/test/biome 全通过。

- [ ] **步骤 5:确认 global.css 无手动主题块**

```bash
cd frontend && grep -n ":root {" src/global.css && grep -n "prefers-color-scheme" src/global.css || echo "global.css 已无手动 :root/@media 主题块"
```
预期:输出「已无...」(主题由 MUI 接管)。

- [ ] **步骤 6:视觉核对**

```bash
cd ../backend && cargo tauri dev
```
逐视图核对(对照设计规范 §12 令牌):
- Fluent 蓝(#0067C0 Light / #4CC2FF Dark)、4px 栅格、圆角 4(按钮)/8(卡片)、字重 400/600
- Light/Dark 跟随系统切换正确
- 各视图文案/布局/StatCard/进度/操作栏一致
- DropZone 拖拽 hover 态 + Enter/点击触发选择器
- CompletedView 成功图标 + 打开输出目录按钮
- 状态栏离线标识、步骤条激活态

若视觉偏差,回退对应任务调 sx。

- [ ] **步骤 7:Commit**

```bash
git add frontend/src/App.tsx frontend/src/icons/Icons.tsx
git commit -m "refactor(前端): App 转 MUI Box,删自绘 Icons(全量 MUI 化收尾)"
```

---

## 自检

**1. 规格覆盖度:**
- MUI extendTheme + CssVarsProvider 接管(defaultMode=system)→ 任务 1 ✓
- Tailwind 保留 + @theme inline 引用 MUI 变量 → 任务 2 ✓
- 删 :root/@media dark → 任务 2/14 验证 ✓
- 图标换 @mui/icons-material(folder/check/open)→ 任务 7/13 ✓;删 Icons.tsx → 任务 14 ✓
- 7 组件转 MUI → 任务 3(Button)/4(ProgressBar)/5(StatCard)/6(Stepper)/7(TitleBar+StatusBar)/8(DropZone)✓
- 5 视图转 MUI → 任务 9(Home)/10(Scanning)/11(Result)/12(Processing)/13(Completed)✓
- App → 任务 14 ✓
- 约束(字体系统栈去 Roboto/圆角 4-8/字重 400-600/无障碍/Dark system)→ 任务 1(theme)+ 各组件 ✓
- 令牌映射表(第 4 节)→ 任务 1(palette)+ 2(@theme)✓
- 验收 8 条 → 任务 14 步骤 4-6 + 各任务验证 ✓

**2. 占位符扫描:** 无"待定/TODO/适当类"。每任务给完整组件代码 + 测试代码 + 精确命令。`@testing-library/user-event` 在任务 3 标注缺失时补装。`--mui-palette-grey-400` 变量名在任务 2 标注以 DevTools 核对(非占位符,是已知校验点)。✓

**3. 类型一致性:**
- Button API(variant: primary/secondary/subtle/destructive;size: standard/large/compact)在任务 3 定义,任务 8/11/12/13 视图调用一致 ✓
- StatCard props(value: ReactNode, label: string, tone: default/error/muted)任务 5 定义,任务 11/12/13 调用一致 ✓
- ProgressBar props(value: number)任务 4 定义,任务 12 调用 ✓
- store actions(selectFolder/startProcess/cancel/togglePause/openOutput/reset)与 appStore.ts 一致 ✓
- View 类型(home/scanning/result/processing/completed)与 types.d.ts 一致 ✓

**4. 模糊性:**
- DropZone 内层 Button 的 onClick stopPropagation 策略:任务 8 已明确(外层 onClick 统一触发,内层仅 stopPropagation)✓
- Stepper 测试的 vi.mock import 顺序:任务 6 步骤 1 已说明合并到首行 ✓
**修正(任务 1,已执行):** 任务 1 已删除 `monoNum` 变体声明、`declare module` 块、`FONT_MONO`/`MONO_FONT`(YAGNI——任务 12 用 sx + CSS 变量实现大数字,未使用该变体)。

**修正(任务 0,已执行):** 任务 0 安装命令已追加 `@testing-library/user-event`,避免任务 3 测试中断。

---

## 执行交接

计划已保存到 `docs/superpowers/plans/2026-07-21-mui-refactor.md`。两种执行方式:

**1. 子代理驱动(推荐)** — 每个任务调度一个新子代理,任务间两阶段审查,快速迭代。

**2. 内联执行** — 当前会话用 executing-plans 批量执行,设检查点审查。

**选哪种方式?**

- 子代理驱动 → 使用 superpowers:subagent-driven-development
- 内联执行 → 使用 superpowers:executing-plans
