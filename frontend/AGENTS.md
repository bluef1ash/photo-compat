# Frontend 前端规则

> 子目录规则，补充根 [AGENTS.md](../AGENTS.md)（项目级约束见根）。前端：React 19 + TypeScript + Vite + Zustand + **MUI（@mui/material）**。

## 技术栈（现状）

- **UI 组件库**: MUI `@mui/material` + `@mui/icons-material`（Material Design 体系）
- **主题**: `src/theme/index.tsx` 用 `extendTheme` + `CssVarsProvider` 接管 palette，生成 `--mui-palette-*` CSS 变量
- **Tailwind v4**: 仅作令牌桥（`global.css` 的 `@theme inline` 反向引用 MUI 变量），不作为主样式手段；不新增 `.less`
- **状态**: Zustand（`src/store/appStore.ts` 单一业务状态源）
- **构建**: Vite；**已移除 LESS**（less 预处理会破坏 utilities 生成）

## 编写代码行为准则

- **组件化规范**:
    * **页面文件**: 单个页面文件（`index.tsx`）建议不超过 **200 行**，最大上限 **300 行**。超过时必须拆分为独立组件放到该视图的子目录。
    * **拆分粒度**: 页面负责组合子组件 + 传递数据，子组件各司其职（侧栏导航、分组面板、行控件等各自独立）。
    * **公共组件封装**: 多页面复用的组件统一放 `src/components/`；某视图独有的组件放该视图的 `components/` 子目录。
    * **严禁重复造轮子**: 新功能前先检查 `src/components/` 与 `src/hooks/` 是否已有可复用实现，扩展优先于新建。
    * **工具函数**: 统一存放于 `src/utils/`（如 `format.ts`），不在视图目录下零散定义。
- **注释**: 复杂逻辑必须用中文注释。
- **增量修改**: 优先小而安全的修改，避免大规模重写。

## 目录结构

```
src/
├── components/   复用组件(Button/TitleBar/StatusBar/Stepper/DropZone/StatCard/
│                 ProgressBar/Segmented/Badge/MenuFlyout/ModalHost 等)
├── views/        主流程视图(Home/Scanning/Result/Processing/Completed/Settings)
├── store/        Zustand(appStore.ts 单一业务状态源 + 测试)
├── hooks/        可复用 hook(useAssetSrc)
├── ipc/          Tauri invoke 封装(commands.ts)
├── theme/        MUI 主题(index.tsx: extendTheme + CssVarsProvider)
├── utils/        工具函数(format.ts)
├── tests/        组件测试(*.test.tsx)
├── types.d.ts    与后端 backend/src/types.rs + config.rs 对齐的共享类型
├── App.tsx       框架(标题栏/步骤条/状态栏)+ 视图路由
├── main.tsx      入口(import "./global.css")
└── global.css    唯一样式入口(Tailwind import + @theme inline 桥接 MUI 变量 + 运行时主题)
```

## 样式规则（硬约束）

- **主样式走 MUI**: 组件样式用 `sx={{}}` 或 `theme` 组件覆盖（`components.MuiXxx.styleOverrides`）；**禁止** React 行内 `style={{}}` 属性（用 `sx` 或 `Box component="img"` 等替代）。
- **唯一样式入口**: `src/global.css`——`@import "tailwindcss"` + `@theme inline`（令牌桥）+ `:root`/`@media`/`[data-mui-color-scheme]` 运行时主题 + `@layer base` + 全局动画。**不再新增 .less/.css 文件**。
- **禁用 LESS**: less 预处理会破坏 @tailwindcss/vite 的 utilities JIT 生成与 @apply 展开（已实测）；`package.json` 不应保留 less 依赖。
- **令牌引用**: 颜色/令牌走 MUI palette 变量（`var(--mui-palette-primary-main)` 等）或 `global.css` 语义 token（`--accent-*` / `--surface-alt` / `--*-soft`），自动跟随 Light/Dark 运行时主题。
- **字重**: Material 标准 400 / 500 / 600，不用 Bold 700。
- **圆角**: Material 体系（按钮 pill / 卡片 12px / 对话框 16px / 面板 12px / Chip 8px），由 `theme` 统一控制。
- **间距**: 4px 栅格（MUI spacing scale：1=4 / 2=8 / 3=12 / 4=16 / 6=24 / 8=32 / 12=48），禁游离值。
- **无网络字体**；界面**无"登录/云/AI"**字样（"不上传"等正向描述除外）。

## 组件规则

- 函数组件 + TypeScript props 接口；**读 store 不写业务逻辑**（视图纯展示 + 派发 action）。
- 图标用 `@mui/icons-material`；MUI 组件（Box/Paper/Stack 等）优先于原生 HTML 标签。
- 无障碍: 状态编码**不依赖颜色**（图标+文字双重）；键盘可达；焦点环全局（`:focus-visible`）。

## 状态管理

- `src/store/appStore.ts` 是**唯一业务状态源**；视图通过 `useAppStore` 读 + 派发。
- 事件 `listen` 后，须在 `reset` 清理 `unlisten`（防泄漏）；`startProcess` 订阅前先清旧监听。

## IPC

- Tauri 调用封装在 `src/ipc/commands.ts`（`invoke`）；事件 `listen` from `@tauri-apps/api/event`；路径 `join` from `@tauri-apps/api/path`。
- invoke 参数 camelCase（Tauri 自动转后端 snake_case）；命令名与后端 `#[command]` 函数名一致。
- 类型与后端 `backend/src/types.rs` + `config.rs` 逐字对齐（`src/types.d.ts`）。

## 测试

- Vitest + Testing Library；**TDD**（先写测试 RED → 实现 GREEN）。
- mock `@tauri-apps/plugin-dialog`、`@tauri-apps/api/event`、`../ipc/commands`（jsdom 无 Tauri 运行时）。

## 格式化

- biome（2 空格缩进 / 100 列 / 单引号 / 无分号 / organizeImports）。

## 常用命令

- `pnpm run build`（或 `npx tsc --noEmit && npx vite build` 绕过 pnpm deps check）
- `pnpm test`（vitest）
- 整项目 dev：`cd ../backend && cargo tauri dev`（beforeDevCommand 在 project root 跑 `pnpm --dir ./frontend run dev`）
