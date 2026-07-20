# Tailwind v4 样式架构重构 实现计划

> **面向 AI 代理的工作者:** 必需子技能:使用 superpowers:subagent-driven-development(推荐)或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框(`- [ ]`)语法来跟踪进度。

**目标:** 前端样式从「内联 `style` + tokens.less」重构为「Tailwind v4 优先」——global.less 唯一样式入口,7 组件 + 5 视图内联 style 全转 Tailwind 类。

**架构:** `global.less` 含 `@import "tailwindcss"` + `@theme inline`(颜色映射运行时 CSS 变量)+ `:root`/`@media`(Light/Dark 运行时主题)+ `@layer base`(body/焦点环);删 `tokens.less`;组件/视图内联 `style` → Tailwind 令牌类(`bg-accent`/`text-fg`/`p-4` 等);动态值用 CSS 变量 + 任意值类(`style={{ "--x": v }}` + `className="w-[var(--x)]"`)。

**技术栈:** React 18 + TypeScript + Vite + Tailwind v4(`@tailwindcss/vite`)+ Zustand

---

## 事实来源

- 规格:`docs/superpowers/specs/2026-07-19-tailwind-refactor-design.md`(令牌架构/类映射/验收)
- 前端规则:`frontend/CLAUDE.md`(样式硬约束)
- 工作目录:`e:/LiangTian/Documents/Programming/App/picture-exif`(已重组 monorepo,前端在 `frontend/src/`)
- 验证:`cd frontend && npx tsc --noEmit && npx vite build`(npx 绕过 pnpm deps check)

## 文件结构

- 修改:`frontend/src/global.less`(令牌架构,原 tokens.less 内容并入)
- 删除:`frontend/src/tokens.less`
- 修改:`frontend/src/main.tsx`(import 改 `./global.less`)
- 修改:7 组件 `frontend/src/components/{Button,TitleBar,StatusBar,Stepper,DropZone,StatCard,ProgressBar}.tsx`
- 修改:5 视图 `frontend/src/views/{Home,Scanning,Result,Processing,Completed}View.tsx`
- 检查:`frontend/src/App.tsx`(若有内联 style 一并转)

**职责边界**:每组件/视图只改样式(style→className),不改逻辑/props/store 调用。

---

## 任务 1:global.less 令牌架构 + 删 tokens.less + main.tsx

**文件:**
- 修改:`frontend/src/global.less`
- 删除:`frontend/src/tokens.less`
- 修改:`frontend/src/main.tsx`

- [ ] **步骤 1:重写 global.less(规格令牌架构)**

把 `tokens.less` 的 `@theme inline` + `:root` + `@media` 并入 `global.less`,删除 global.less 原有的手动重置/`.tnum`/`button`(Tailwind preflight 接管)。完整内容:

```less
@import "tailwindcss";

@theme inline {
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-pressed: var(--accent-pressed);
  --color-accent-soft: var(--accent-soft);
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-alt: var(--surface-alt);
  --color-fg: var(--fg);
  --color-fg-muted: var(--fg-muted);
  --color-fg-disabled: var(--fg-disabled);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-divider: var(--divider);
  --color-success: var(--success);
  --color-success-soft: var(--success-soft);
  --color-warning: var(--warning);
  --color-warning-soft: var(--warning-soft);
  --color-error: var(--error);
  --color-error-soft: var(--error-soft);
  --color-info: var(--info);
  --color-info-soft: var(--info-soft);
  --radius-sm: 4px;
  --radius-md: 8px;
  --text-caption: 12px;
  --text-body: 14px;
  --text-subtitle: 20px;
  --text-title: 28px;
  --shadow-rest: 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-flyout: 0 8px 16px rgba(0, 0, 0, 0.14);
  --font-ui: "Segoe UI Variable Text", "Segoe UI", "Cantarell", "Inter", system-ui, "Microsoft YaHei UI", "Microsoft YaHei", "Source Han Sans SC", "Noto Sans CJK SC", "PingFang SC", sans-serif;
  --font-mono: "Cascadia Code", "Consolas", "JetBrains Mono", "DejaVu Sans Mono", ui-monospace, monospace;
}

:root {
  --accent: #0067c0;
  --accent-hover: #005293;
  --accent-pressed: #003f73;
  --accent-disabled: #8ab8e8;
  --accent-soft: #e5f1fb;
  --bg: #f3f3f3;
  --surface: #ffffff;
  --surface-alt: #fafafa;
  --fg: #1a1a1a;
  --fg-muted: #5b5b5b;
  --fg-disabled: #8a8a8a;
  --border: #e5e5e5;
  --border-strong: #d1d1d1;
  --divider: #ededed;
  --success: #107c10;
  --success-soft: #dff6dd;
  --warning: #9d5d00;
  --warning-soft: #fff4ce;
  --error: #c42b1c;
  --error-soft: #fde7e9;
  --info: #0067c0;
  --info-soft: #e5f1fb;
}

@media (prefers-color-scheme: dark) {
  :root {
    --accent: #4cc2ff;
    --accent-hover: #62b6ff;
    --accent-pressed: #7bd1ff;
    --accent-disabled: #3a5c7a;
    --accent-soft: #0a2b45;
    --bg: #202020;
    --surface: #2b2b2b;
    --surface-alt: #323232;
    --fg: #ffffff;
    --fg-muted: #c5c5c5;
    --fg-disabled: #7a7a7a;
    --border: #3f3f3f;
    --border-strong: #565656;
    --divider: #383838;
  }
}

@layer base {
  body {
    @apply font-ui text-body text-fg bg-bg select-none;
  }
  :focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
}
```

- [ ] **步骤 2:删除 tokens.less**

```bash
cd e:/LiangTian/Documents/Programming/App/picture-exif && git rm frontend/src/tokens.less
```

- [ ] **步骤 3:main.tsx 改 import**

`frontend/src/main.tsx` 删除 `import "./tokens.less";`,保留 `import "./global.less";`(若当前是两行 import,合并为一行 global.less)。

- [ ] **步骤 4:验证编译**

```bash
cd frontend && npx tsc --noEmit && npx vite build
```
预期:两者通过(`@theme inline` 与 `@apply` 编译正常,CSS 含 Tailwind 主题 + 令牌)。

- [ ] **步骤 5:Commit**

```bash
git add frontend/src/global.less frontend/src/tokens.less frontend/src/main.tsx
git commit -m "feat(样式): global.less 令牌架构(@theme inline+运行时主题),删 tokens.less"
```

---

## 任务 2:Button 转 Tailwind

**文件:** `frontend/src/components/Button.tsx`

- [ ] **步骤 1:替换内联 style 与 style 对象为 Tailwind 类**

删除 `base`/`variantStyle`/`sizeStyle` 三个 style 对象与 `style={{...}}`。改用 `className` 模板字符串拼接 variant + size 类。保留 `ButtonProps`(variant/size/HTMLButtonAttributes)。

目标 className 映射:
- 基础(所有):`inline-flex items-center gap-2 rounded-sm font-semibold text-body border border-transparent`
- variant:
  - `primary`:`bg-accent text-white hover:bg-accent-hover`
  - `secondary`:`bg-surface text-accent border-border-strong hover:bg-surface-alt`
  - `subtle`:`text-fg hover:bg-surface-alt`
  - `destructive`:`text-error border-error`
- size:
  - `standard`:`h-10 px-4`
  - `large`:`h-12 px-6`
  - `compact`:`h-8 px-3`

参考实现(条件 className 拼接):
```tsx
const variantClass: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "bg-surface text-accent border-border-strong hover:bg-surface-alt",
  subtle: "text-fg hover:bg-surface-alt",
  destructive: "text-error border-error",
};
const sizeClass: Record<Size, string> = {
  standard: "h-10 px-4",
  large: "h-12 px-6",
  compact: "h-8 px-3",
};
// ...
<button
  className={`inline-flex items-center gap-2 rounded-sm font-semibold text-body border border-transparent ${variantClass[variant]} ${sizeClass[size]} ${className ?? ""}`}
  {...rest}
>
  {children}
</button>
```
(注意:解构 `className` 出来拼接,其余 `...rest`)

- [ ] **步骤 2:验证 tsc + build + 无残余内联**

```bash
cd frontend && npx tsc --noEmit && npx vite build && grep -n "style={{" src/components/Button.tsx || echo "Button 无内联 style"
```
预期:tsc/build 通过,grep 无输出(无内联 style)。

- [ ] **步骤 3:Commit**

```bash
git add frontend/src/components/Button.tsx
git commit -m "refactor(前端): Button 内联 style 转 Tailwind 类"
```

---

## 任务 3:TitleBar / StatusBar / Stepper 转 Tailwind

**文件:** `frontend/src/components/{TitleBar,StatusBar,Stepper}.tsx`

- [ ] **步骤 1:TitleBar**

替换内联 style 为 className:`h-10 flex items-center px-4 gap-2 border-b border-divider`;Logo 图标 + `<span className="font-semibold">照片适配助手</span>` + 兼容模式徽章 `<span className="ml-auto text-caption text-fg-muted">标准兼容模式</span>`。

- [ ] **步骤 2:StatusBar**

容器:`h-7 flex items-center px-4 gap-3 text-caption text-fg-muted border-t border-divider`。状态点:`<span className={\`w-2 h-2 rounded-full ${processing ? "bg-accent" : "bg-fg-disabled"}\`} />`(根据 view 判断)。状态文字 + `<span className="ml-auto">输出到 同目录/compat</span>` + `· 离线 · v1.0`。

- [ ] **步骤 3:Stepper**

容器:`flex items-center gap-2 px-6 py-3`。每步:圆形 `<div className={\`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${i <= current ? "bg-accent text-white" : "bg-border-strong text-fg-muted"}\`}>{i+1}</div>` + `<span className={\`text-caption ${i <= current ? "text-fg" : "text-fg-muted"}\`}>{label}</span>`;步间分隔 `<div className="flex-1 h-px bg-divider" />`。

- [ ] **步骤 4:验证**

```bash
cd frontend && npx tsc --noEmit && npx vite build && grep -rn "style={{" src/components/TitleBar.tsx src/components/StatusBar.tsx src/components/Stepper.tsx || echo "三组件无内联 style"
```

- [ ] **步骤 5:Commit**

```bash
git add frontend/src/components/TitleBar.tsx frontend/src/components/StatusBar.tsx frontend/src/components/Stepper.tsx
git commit -m "refactor(前端): 标题栏/状态栏/步骤条内联 style 转 Tailwind"
```

---

## 任务 4:StatCard / ProgressBar 转 Tailwind(含动态值)

**文件:** `frontend/src/components/{StatCard,ProgressBar}.tsx`

- [ ] **步骤 1:StatCard(tone 条件类)**

容器:`bg-surface border border-border rounded-md p-4`。大数字:`<div className={\`tabular-nums font-mono text-3xl font-semibold ${tone === "error" ? "text-error" : tone === "muted" ? "text-fg-muted" : "text-fg"}\`}>{value}</div>`。label:`<div className="text-caption text-fg-muted">{label}</div>`。

- [ ] **步骤 2:ProgressBar(CSS 变量 + 任意值类)**

轨道:`<div className="h-2 bg-border rounded-sm overflow-hidden">`。填充:`<div className="h-full bg-accent transition-[width] duration-150 ease-out w-[var(--progress)]" style={{ "--progress": \`${Math.min(100, Math.max(0, value))}%\` } as React.CSSProperties} />`。**仅此一处 `style` 设置 CSS 变量**(规格允许),禁其他样式属性。

- [ ] **步骤 3:验证**

```bash
cd frontend && npx tsc --noEmit && npx vite build && grep -rn "style={{" src/components/StatCard.tsx src/components/ProgressBar.tsx
```
预期:StatCard 无输出;ProgressBar 仅 1 处(`--progress` 变量设置)。

- [ ] **步骤 4:Commit**

```bash
git add frontend/src/components/StatCard.tsx frontend/src/components/ProgressBar.tsx
git commit -m "refactor(前端): 统计卡/进度条转 Tailwind(进度条用 CSS 变量+任意值类)"
```

---

## 任务 5:DropZone 转 Tailwind

**文件:** `frontend/src/components/DropZone.tsx`

- [ ] **步骤 1:替换内联 style 为条件 className**

容器(悬停态切换):`className={\`border-2 ${hover ? "border-solid border-accent bg-accent-soft" : "border-dashed border-accent bg-surface-alt"} rounded-lg p-12 text-center flex flex-col items-center gap-4 outline-none\`}`。保留 `role="button"` `tabIndex={0}` `aria-label` `onKeyDown`(Enter)、`onDragOver`/`onDragLeave`/`onDrop` 逻辑不变(只把 setHover 保留)。

内部:图标 `<Icon name="folder" size={48} />` + `<div>把包含照片的文件夹拖到这里</div>` + `<div className="text-fg-muted">— 或 —</div>` + `<Button variant="primary" size="large" onClick={selectFolder}><Icon name="folder" /> 选择文件夹</Button>`。

- [ ] **步骤 2:验证**

```bash
cd frontend && npx tsc --noEmit && npx vite build && grep -n "style={{" src/components/DropZone.tsx || echo "DropZone 无内联 style"
```

- [ ] **步骤 3:Commit**

```bash
git add frontend/src/components/DropZone.tsx
git commit -m "refactor(前端): 拖拽区内联 style 转 Tailwind 条件类"
```

---

## 任务 6:HomeView / ScanningView 转 Tailwind

**文件:** `frontend/src/views/{Home,Scanning}View.tsx`

- [ ] **步骤 1:HomeView**

容器:`max-w-2xl mx-auto flex flex-col gap-6`。标题区:`<h1 className="text-title m-0">把照片变成任何老旧系统都能上传的格式</h1>` + `<p className="text-fg-muted mt-2 mb-0">全程离线,不上传任何文件,安全放心</p>`。DropZone。error:`<div role="alert" className="text-error bg-error-soft p-3 rounded-sm">`。hint:`<div className="text-fg-muted text-caption">支持 JPEG / PNG / HEIC / WebP / GIF / TIFF · 自动转换为高兼容 JPEG</div>`。

- [ ] **步骤 2:ScanningView(spinner 用 animate-spin)**

容器:`flex flex-col items-center gap-4 p-12`。spinner:`<div className="w-10 h-10 rounded-full border-4 border-border border-t-accent animate-spin" />`(替代手写 keyframes)。`<div>正在扫描文件夹…</div>`。删除原有的 `<style>{@keyframes spin...}</style>`(用 Tailwind animate-spin)。

- [ ] **步骤 3:验证**

```bash
cd frontend && npx tsc --noEmit && npx vite build && grep -rn "style={{" src/views/HomeView.tsx src/views/ScanningView.tsx || echo "两视图无内联 style"
```

- [ ] **步骤 4:Commit**

```bash
git add frontend/src/views/HomeView.tsx frontend/src/views/ScanningView.tsx
git commit -m "refactor(前端): 首页/扫描视图转 Tailwind(spinner 用 animate-spin)"
```

---

## 任务 7:ResultView / ProcessingView 转 Tailwind

**文件:** `frontend/src/views/{Result,Processing}View.tsx`

- [ ] **步骤 1:ResultView**

容器:`flex flex-col gap-6 max-w-4xl mx-auto`。标题 `<h2 className="m-0">扫描完成</h2>`。统计卡网格:`<div className="grid grid-cols-4 gap-4">`(4 个 StatCard)。格式分布:`<div className="text-fg-muted mb-2">格式分布</div>` + 徽章 `<span className="bg-accent-soft px-3 py-1 rounded-sm">{fmt} {n}</span>` 容器 `flex gap-4 flex-wrap`。不支持警告:`<div role="status" className="bg-warning-soft p-4 rounded-sm">`。操作栏:`<div className="flex justify-end gap-3">` + Button。

- [ ] **步骤 2:ProcessingView**

容器:`flex flex-col gap-6 max-w-4xl mx-auto`。大百分比:`<div className="tabular-nums font-mono text-5xl font-semibold">{pct}%</div>` + `<ProgressBar value={pct} />` + `<div className="text-fg-muted mt-2">已处理 {progress?.done ?? 0} / {progress?.total ?? 0}</div>`。统计卡网格 `grid grid-cols-4 gap-4`(StatCard)。操作栏 `flex justify-end gap-3` + Button(取消/暂停)。保留 Space 键 useEffect 不变。

- [ ] **步骤 3:验证**

```bash
cd frontend && npx tsc --noEmit && npx vite build && grep -rn "style={{" src/views/ResultView.tsx src/views/ProcessingView.tsx || echo "两视图无内联 style"
```

- [ ] **步骤 4:Commit**

```bash
git add frontend/src/views/ResultView.tsx frontend/src/views/ProcessingView.tsx
git commit -m "refactor(前端): 扫描结果/处理中视图转 Tailwind"
```

---

## 任务 8:CompletedView / App + 全局验证

**文件:** `frontend/src/views/CompletedView.tsx`、`frontend/src/App.tsx`

- [ ] **步骤 1:CompletedView**

容器:`flex flex-col gap-6 max-w-4xl mx-auto`。成功区:`<div className="text-center p-6">` + `<Icon name="check" size={72} />` + `<h1 className="text-title mt-2 mb-0">处理完成!</h1>` + `<p className="text-fg-muted">{summary.done} 张照片已转换为兼容格式</p>`。统计卡网格 `grid grid-cols-4 gap-4`。操作栏 `flex justify-end gap-3` + Button([打开输出目录] primary large)。

- [ ] **步骤 2:App(检查内联)**

`frontend/src/App.tsx` 若有内联 style(容器 flex 等),转 Tailwind:`<div className="h-full flex flex-col">` + `<main className="flex-1 overflow-auto p-6">`。IconSprite/TitleBar/Stepper/StatusBar 保留。

- [ ] **步骤 3:全局验证**

```bash
cd frontend && npx tsc --noEmit && npx vite build && echo "=== 残余内联 style(应仅 ProgressBar 的 --progress)===" && grep -rn "style={{" src/ || echo "无残余内联 style"
```
预期:tsc/build 通过;grep 仅 `ProgressBar.tsx` 的 `--progress`(CSS 变量设置,允许)。

- [ ] **步骤 4:视觉核对**

`cd ../backend && cargo tauri dev`,核对各视图视觉与设计规格 §12 令牌一致(色值/间距/圆角),Light/Dark 主题切换。若视觉偏差,回调对应任务修类。

- [ ] **步骤 5:Commit**

```bash
git add frontend/src/views/CompletedView.tsx frontend/src/App.tsx
git commit -m "refactor(前端): 完成视图与应用容器转 Tailwind,重构收尾"
```

---

## 自检

**1. 规格覆盖度:**
- global.less 唯一样式入口 + 删 tokens.less + main.tsx → 任务 1 ✓
- @theme inline + 运行时主题 + @layer base → 任务 1(global.less 代码)✓
- 7 组件转 Tailwind → 任务 2(Button)/3(TitleBar/StatusBar/Stepper)/4(StatCard/ProgressBar)/5(DropZone)✓
- 5 视图转 Tailwind → 任务 6(Home/Scanning)/7(Result/Processing)/8(Completed)✓
- 动态值 CSS 变量 + 任意值类 → 任务 4(ProgressBar)✓
- App → 任务 8 ✓
- 验收(0 内联除 CSS 变量/tsc/build/主题)→ 任务 8 步骤 3-4 ✓

**2. 占位符扫描:** 无"待定/TODO/适当类"。每任务给具体 Tailwind 类清单(令牌类 + 默认 spacing)。任务 1 给完整 global.less 代码。✓

**3. 类型一致性:** 令牌类名(`bg-accent`/`text-fg`/`p-4`/`rounded-md`/`text-body`/`shadow-rest`/`font-ui`)在任务 1 的 `@theme inline` 定义,后续任务统一使用。variant/size Record 键(primary/secondary/subtle/destructive;standard/large/compact)与 ButtonProps 一致。StatCard tone(error/muted/default)与原 props 一致。✓

**4. 模糊性:** ProgressBar `style={{ "--progress": ... }}` 是规格允许的唯一例外(CSS 变量,非样式属性),任务 4/8 已明确。ScanningView spinner 用 Tailwind `animate-spin`(替代手写 keyframes),任务 6 已明确删 `<style>` 块。✓

---

## 执行交接

计划已保存到 `docs/superpowers/plans/2026-07-19-tailwind-refactor.md`。两种执行方式:

**1. 子代理驱动(推荐)** — 每个任务调度一个新子代理,任务间两阶段审查,快速迭代。

**2. 内联执行** — 当前会话用 executing-plans 批量执行,设检查点审查。

**选哪种方式?**

- 子代理驱动 → 使用 superpowers:subagent-driven-development
- 内联执行 → 使用 superpowers:executing-plans
