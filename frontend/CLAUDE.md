# Frontend 前端规则

> 子目录规则,补充根 [CLAUDE.md](../CLAUDE.md)(项目级约束见根)。前端:React 18 + TypeScript + Vite + Zustand + Tailwind v4。

## 目录结构

```
src/
├── components/   复用组件(Button/TitleBar/StatusBar/Stepper/DropZone/StatCard/ProgressBar)
├── views/        主流程视图(Home/Scanning/Result/Processing/Completed)
├── store/        Zustand(appStore.ts 单一业务状态源 + 测试)
├── ipc/          Tauri invoke 封装(commands.ts)
├── icons/        内联 SVG sprite(Icons.tsx)
├── types.ts      与后端 backend/src/types.rs + config.rs 对齐的共享类型
├── App.tsx       框架(标题栏/步骤条/状态栏)+ 视图路由
├── main.tsx      入口(import "./global.less")
├── global.less   唯一样式入口
└── test-setup.ts
```

## 样式规则(用户决策,硬约束)

- **尽可能使用 Tailwind**;**禁止内联 style(样式属性)**;尽量不用 LESS/CSS(动画和特殊情况除外)
- **唯一样式入口**:`src/global.less`(`@import "tailwindcss"` + `@theme inline` + `:root`/`@media` 运行时主题 + `@layer base` body/焦点环)。**不再新增 .less/.css 文件**
- 令牌:用 Tailwind 令牌类 `bg-accent`/`text-fg`/`text-fg-muted`/`p-4`/`rounded-md`/`text-body`/`shadow-rest`/`font-ui` 等。颜色类自动跟随 Light/Dark 运行时主题
- 间距:Tailwind 默认 spacing(4px 栅格,`p-1`=4 / `p-2`=8 / `p-3`=12 / `p-4`=16 / `p-6`=24 / `p-8`=32 / `p-12`=48),禁游离值
- **动态值**:CSS 变量 + 任意值类——`style={{ "--progress": \`${pct}%\` } as React.CSSProperties}` + `className="w-[var(--progress)]"`。**严禁样式属性**(`style={{ width/color/... }}`)
- 字重只用 400 / 600;圆角按钮 4px / 卡片 8px;**无网络字体**;界面**无"登录/云/AI/上传"**字样

## 组件规则

- 函数组件 + TypeScript props 接口;**读 store 不写业务逻辑**(视图纯展示 + 派发 action)
- 样式全 Tailwind 类;图标用 `src/icons`(内联 SVG sprite,`currentColor` 着色)
- 无障碍:状态编码**不依赖颜色**(图标+文字双重);键盘可达;焦点环全局(`:focus-visible`)

## 状态管理

- `src/store/appStore.ts` 是**唯一业务状态源**;视图通过 `useAppStore` 读 + 派发
- 事件 `listen` 后,须在 `reset` 清理 `unlisten`(防泄漏);`startProcess` 订阅前先清旧监听

## IPC

- Tauri 调用封装在 `src/ipc/commands.ts`(`invoke`);事件 `listen` from `@tauri-apps/api/event`;路径 `join` from `@tauri-apps/api/path`
- invoke 参数 camelCase(Tauri 自动转后端 snake_case);命令名与后端 `#[command]` 函数名一致
- 类型与后端 `backend/src/types.rs` + `config.rs` 逐字对齐(`src/types.ts`)

## 测试

- Vitest + Testing Library;**TDD**(先写测试 RED → 实现 GREEN)
- mock `@tauri-apps/plugin-dialog`、`@tauri-apps/api/event`、`../ipc/commands`(jsdom 无 Tauri 运行时)

## 格式化

- biome(2 空格缩进 / 100 列 / 单引号 / 无分号 / organizeImports)

## 常用命令

- `pnpm run build`(或 `npx tsc --noEmit && npx vite build` 绕过 pnpm deps check)
- `pnpm test`(vitest)
- 整项目 dev:`cd ../backend && cargo tauri dev`(beforeDevCommand 在 project root 跑 `pnpm --dir ./frontend run dev`)
