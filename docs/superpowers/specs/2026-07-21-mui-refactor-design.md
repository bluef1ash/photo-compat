# 前端 Tailwind → MUI 重构 设计规格

> **状态**：已批准（用户 2026-07-21 确认：主题方案 B = MUI 接管；整体设计批准）
> **后续**：调用 writing-plans 生成实现计划

## 1. 目标

把现有基于 Tailwind v4 的前端 UI 实现，重构为以 **MUI（@mui/material@9.2.0 + @emotion）为主** 的实现：

- MUI 的 CSS 变量主题（`extendTheme` + `CssVarsProvider`）**接管** 色彩与 Dark 模式，成为唯一主题源
- Tailwind v4 **保留**，作为补充样式手段（布局/间距/自定义微调），其令牌反向引用 MUI 生成的变量，保证与 MUI 同源同步
- 自绘 `icons/Icons.tsx` 全部替换为 `@mui/icons-material`
- 视觉与交互结果与 `design/照片兼容化工具-UI设计规范.md` 保持一致（仅换实现方式，不改外观/行为）

## 2. 背景与现状

- **前端栈**：React 19 + TypeScript + Vite 7 + Zustand + Tailwind v4（`@tailwindcss/vite`），Biome 做 lint/format，Vitest 做测试
- **现状样式入口**：`frontend/src/global.css`，用 `@theme inline` 把语义 CSS 变量映射为 Tailwind 类，`:root` + `@media(prefers-color-scheme:dark)` 提供运行时 Light/Dark 主题
- **刚完成过一次 tailwind-refactor**（`docs/superpowers/plans/2026-07-19-tailwind-refactor.md`）：内联 style → Tailwind 类。本次在其基础上再次重构到 MUI
- **已装依赖**：`@mui/material@9.2.0`、`@emotion/react@11`、`@emotion/styled@11`（emotion 是 MUI v9 默认样式引擎，无需额外配置）
- **待装依赖**：`@mui/icons-material`（图标库）

## 3. 架构决策

### 3.1 主题：MUI CSS 变量主题接管（方案 B）

采用 MUI v6+ 稳定的 CSS 变量主题 API（v9 延续）：

- `extendTheme({ colorSchemes: { light, dark }, typography, shape, components })` 创建主题
- `CssVarsProvider` 包裹应用，自动生成 `--mui-palette-*` 等 CSS 变量，并把 colorScheme 同步到 localStorage
- `useColorScheme()` 提供 `{ mode, setMode, systemMode }`，`defaultMode="system"` 跟随系统
- 删除 `global.css` 里的 `:root` 与 `@media(prefers-color-scheme:dark)` 手动令牌定义（由 MUI 接管）

### 3.2 Tailwind 的角色：补充样式，令牌反向引用 MUI

- Tailwind 不删除，继续用于布局（flex/grid）、间距、自定义微调——「MUI 达不到的样式用 Tailwind 类，不手写 CSS/sx」
- `global.css` 的 `@theme inline` 改为**引用 MUI 生成的变量**，例如 `--color-accent: var(--mui-palette-primary-main)`。这样 Tailwind 类（`bg-accent`/`text-fg`）与 MUI 组件共用同一套变量，切 Dark 时一起变，零重复维护
- MUI 无原生对应的软色（`accent-soft`/`success-soft` 等背景色），在 `extendTheme` 的 `colorSchemes.{light,dark}` 内追加自定义 token，MUI 会生成对应 `--mui-*` 变量，再由 `@theme inline` 映射给 Tailwind

### 3.3 图标：换 @mui/icons-material

- 删除 `frontend/src/icons/Icons.tsx`（`IconSprite` 的 `<symbol>` sprite + `Icon` 组件）
- 各处改为按需 `import { Folder, CheckCircle, ... } from '@mui/icons-material'`
- 语义映射在实现计划中逐个核对（folder/check/warning/info/离线标识等），保证无障碍属性（`aria-label`/`titleAccess`）迁移

## 4. 视觉令牌映射（项目令牌 → MUI palette）

来源：`global.css` 现有 `:root`/`@media dark` 值（Fluent 体系）。

| 项目语义       | Light     | Dark      | MUI 目标                             |
| -------------- | --------- | --------- | ------------------------------------ |
| accent         | `#0067C0` | `#4CC2FF` | `palette.primary.main`               |
| accent-hover   | `#005293` | `#62B6FF` | `palette.primary.dark`（按钮 hover） |
| accent-pressed | `#003F73` | `#7BD1FF` | `palette.primary` 自定义 `pressed`   |
| accent-soft    | `#E5F1FB` | `#0A2B45` | 自定义 token `accentSoft`            |
| bg             | `#F3F3F3` | `#202020` | `palette.background.default`         |
| surface        | `#FFFFFF` | `#2B2B2B` | `palette.background.paper`           |
| surface-alt    | `#FAFAFA` | `#323232` | 自定义 token `surfaceAlt`            |
| fg             | `#1A1A1A` | `#FFFFFF` | `palette.text.primary`               |
| fg-muted       | `#5B5B5B` | `#C5C5C5` | `palette.text.secondary`             |
| fg-disabled    | `#8A8A8A` | `#7A7A7A` | `palette.text.disabled`              |
| border         | `#E5E5E5` | `#3F3F3F` | `palette.divider`                    |
| border-strong  | `#D1D1D1` | `#565656` | `palette.grey[400]`                  |
| success        | `#107C10` | `#107C10` | `palette.success.main`               |
| success-soft   | `#DFF6DD` | —         | 自定义 token `successSoft`           |
| warning        | `#9D5D00` | `#9D5D00` | `palette.warning.main`               |
| warning-soft   | `#FFF4CE` | —         | 自定义 token `warningSoft`           |
| error          | `#C42B1C` | `#C42B1C` | `palette.error.main`                 |
| error-soft     | `#FDE7E9` | —         | 自定义 token `errorSoft`             |
| info           | `#0067C0` | `#4CC2FF` | `palette.info.main`                  |

> 软色的 Dark 值沿用原 global.css 定义；原 global.css 未给软色 dark 值的，由 MUI 默认 alpha 叠加或补一个低饱和 dark 值，在实现时定。

## 5. 约束处理（AGENTS.md 硬约束）

- **字体**：`typography.fontFamily` 设为系统字体栈（`"Segoe UI Variable Text", "Segoe UI", "Cantarell", "Microsoft YaHei UI", "Source Han Sans SC", "Noto Sans CJK SC", ...`），**移除 MUI 默认 Roboto**（禁网络字体）。保留 `CssBaseline`（提供 normalize + 背景同步，不加载字体文件）
- **圆角**：`shape.borderRadius = 4`（按钮/输入）；`Card`/`Paper`/`Dialog`/`Popover` 在 `components` 覆盖为 `8px`；拖拽区 `Box` 用 8px
- **字重**：全局仅 Regular 400 / Semibold 600。`typography` 各变体 `fontWeight` 清理为 400，强调（按钮/标题/步骤数字）用 600。覆盖 MUI Button 默认的 500
- **间距**：4px 栅格不变。MUI `spacing` 默认 8px 单位，组件内优先用 Tailwind 类（`p-4`/`gap-3`）以贴合 4/8/12/16 栅格
- **Dark 模式**：`defaultMode="system"` 跟随系统，与现状行为一致；本次不引入手动切换 UI（YAGNI）
- **无障碍**：
  - 状态编码不依赖颜色——状态点保留「图标/形状 + 文字」双编码
  - `LinearProgress` 透传 `aria-valuenow`/`aria-valuemin`/`aria-valuemax`
  - 焦点环：`:focus-visible { outline: 2px solid var(--mui-palette-primary-main) }`，保留 global.css 焦点规则
  - 键盘 Tab 顺序与现有一致，MUI 组件默认可达
  - 对比度维持 WCAG AA（现有 Fluent 色值已达标）

## 6. 组件映射

| 现组件            | MUI 实现                                     | 关键点                                                                                                                                                                                                                                    |
| ----------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button.tsx`      | MUI `Button` + 薄包装                        | 保留 `variant`(primary/secondary/subtle/destructive) 与 `size`(standard/large/compact) API；映射 primary→contained、secondary→outlined、subtle→text、destructive→outlined 且 color=error；size 映射 MUI size + 高度覆盖；字重 600、圆角 4 |
| `TitleBar.tsx`    | `Box` 手搓                                   | 保留 `data-tauri-drag-region` 拖拽；Logo + 标题文字 + 兼容模式徽章；图标用 MUI                                                                                                                                                            |
| `StatusBar.tsx`   | `Box` 手搓                                   | 状态点（processing 态 accent，否则 disabled）+ 文字 + 「输出到 同目录/compat」+「离线」+ 版本号；图标用 MUI                                                                                                                               |
| `Stepper.tsx`     | `Box` 手搓                                   | 设计规范为「圆形数字 + 文字 + 分隔线」，MUI `Stepper` 的 material 连接线风格不符，手搓更贴合；已完成/当前/未来三态用 palette 区分                                                                                                         |
| `DropZone.tsx`    | `Box` 手搓                                   | 拖拽逻辑（onDragOver/Leave/Drop、setHover、Enter 键）不变；hover 态边框/背景用 Tailwind 条件类；内含 MUI `Button` + MUI 图标                                                                                                              |
| `StatCard.tsx`    | MUI `Paper`（`elevation=0` + border）        | 贴合原设计（border 而非阴影）；大数字（`tabular-nums`，tone 着色：error→`palette.error.main`、muted→`text.secondary`、默认→`text.primary`）+ label；圆角 8                                                                                |
| `ProgressBar.tsx` | MUI `LinearProgress`                         | `variant="determinate"` + `value`；高度/圆角 sx 调；带 aria 属性                                                                                                                                                                          |
| `App.tsx`         | `Box` 容器                                   | 结构不变：IconSprite(删除) → TitleBar → 条件 Stepper → main → StatusBar；容器用 MUI `Box` + Tailwind 布局类                                                                                                                               |
| 视图 ×5           | `Box`/`Container` + Tailwind 布局 + MUI 组件 | Home/Scanning/Result/Processing/Completed 各自容器、栅格、操作栏用 Tailwind 类；内部用 MUI 组件 + MUI 图标                                                                                                                                |

> `ScanningView` 的 spinner：MUI `CircularProgress`（替代手写 animate-spin 圆环），保留文案。

## 7. 文件改动清单

**新增**
- `frontend/src/theme/index.ts` — `extendTheme` 主题定义（colorSchemes + typography + shape + components + 自定义软色 token）+ 导出 `Theme` 与 `ThemeProvider` 封装（含 `CssVarsProvider` + `CssBaseline`，`defaultMode="system"`）

**修改**
- `frontend/src/main.tsx` — 包 `<ThemeProvider>`（封装了 CssVarsProvider）
- `frontend/src/global.css` — 删 `:root`/`@media dark`；`@theme inline` 改为引用 `var(--mui-palette-*)`；保留 `@import "tailwindcss"`、字体栈、半径/字号令牌、`@layer base`（height 100% + focus 环）
- `frontend/src/App.tsx` — 删 `IconSprite`，容器换 `Box` + Tailwind 类
- `frontend/src/components/{Button,TitleBar,StatusBar,Stepper,DropZone,StatCard,ProgressBar}.tsx` — 重写为 MUI 实现
- `frontend/src/views/{Home,Scanning,Result,Processing,Completed}/index.tsx` — 重写为 MUI + Tailwind 布局
- `frontend/src/store/appStore.ts` 及其测试 — 不动（纯状态逻辑，无 UI 依赖）
- 视图/组件中对 `Icon`/`IconSprite` 的引用 — 改为 `@mui/icons-material`
- 组件测试（若有，依 `appStore.test.ts` 模式）— 渲染 MUI 组件的测试需包 `ThemeProvider` wrapper

**删除**
- `frontend/src/icons/Icons.tsx`

**依赖**
- `pnpm add @mui/icons-material`（在 frontend 目录）

## 8. 验收标准

1. `cd frontend && npx tsc --noEmit` 通过
2. `cd frontend && npx vite build` 通过
3. `cd frontend && pnpm test` 通过（组件测试加 ThemeProvider wrapper）
4. `cd frontend && pnpm run check`（Biome）通过
5. 源码内不再有对 `icons/Icons.tsx`、`IconSprite`、`Icon` 的引用（grep 为空）
6. `global.css` 内不再有 `:root { --accent: ... }` 与 `@media (prefers-color-scheme: dark)` 手动令牌块（由 MUI 接管）
7. `cargo tauri dev` 下各视图视觉与设计规范 §12 令牌一致：Fluent 蓝、4px 栅格、圆角 4/8、字重 400/600、Light/Dark 跟随系统正确切换
8. 无障碍：状态不依赖颜色、LinearProgress 有 aria、焦点环可见、Tab 顺序符合阅读顺序

## 9. 风险与注意事项

- **MUI 自动派生色失效**：方案 B 下 palette 值由 MUI 生成 CSS 变量，但 MUI 内部 `darken()/lighten()` 在 hover/emphasis 场景对 CSS 变量字符串无效。需在 `components.MuiButton.styleOverrides` 等处用 `--mui-palette-primary-dark`（即 `accent-hover`）手动指定 hover/active 色
- **Tailwind preflight 与 MUI CssBaseline 共存**：两者都做 reset，可能叠加。若出现样式异常（如按钮基线、列表样式），以 MUI CssBaseline 为准，Tailwind preflight 的冲突项用 `@layer` 调整。实现时验证基础元素渲染
- **@mui/icons-material 包体**：按需 import + tree-shaking，只打包用到的图标，不影响产物体积
- **CSS 变量前缀**：MUI 默认 `--mui` 前缀；`@theme inline` 映射须用准确变量名（如 `var(--mui-palette-primary-main)`），实现时以浏览器 DevTools 实际生成的变量名为准
- **自定义软色 token 的 MUI 生成名**：`extendTheme` colorSchemes 下非 palette 字段的变量命名规则，实现时需实测确认（可能为 `--mui-${customKey}`），相应调整 `@theme inline` 映射
