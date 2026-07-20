# Tailwind v4 样式架构重构 设计

> 日期:2026-07-19 · 事实来源:`design/设计规格说明书.md`(令牌 §12)+ 用户决策

## 目标

前端样式从「内联 `style` + `tokens.less` CSS 变量」重构为「Tailwind v4 优先」:
- 令牌迁移到 Tailwind `@theme`
- 7 组件 + 5 视图的内联 `style={{}}` 全部转 Tailwind 类
- `tokens.less` 内容并入 `global.less`,删除 `tokens.less`,前端仅留 1 个 less 文件

**用户决策(约束)**:前端尽可能使用 Tailwind;**禁止内联 style(行级样式属性)**;尽量不用 LESS/CSS 文件(动画和特殊情况除外)。

**运行时主题硬约束**:颜色令牌是 Light/Dark 运行时切换(`prefers-color-scheme`),必须保留 CSS 变量机制——Tailwind `@theme` 是编译时,无法独自实现运行时切换。

## 令牌架构(方案 A:`@theme inline` 引用运行时变量)

`global.less` 成为**唯一样式入口**(`tokens.less` 内容并入后删除 `tokens.less`):

```less
@import "tailwindcss";

/* Tailwind 令牌映射到运行时 CSS 变量(inline 使 Tailwind 直接用 var(),不解析) */
@theme inline {
  /* 颜色 → 运行时变量 */
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
  /* 固定值令牌 */
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

/* 运行时主题(保留原 tokens.less 的 :root 与 @media,值不变) */
:root {
  --accent: #0067c0;  --accent-hover: #005293;  --accent-pressed: #003f73;
  --accent-disabled: #8ab8e8;  --accent-soft: #e5f1fb;
  --bg: #f3f3f3;  --surface: #ffffff;  --surface-alt: #fafafa;
  --fg: #1a1a1a;  --fg-muted: #5b5b5b;  --fg-disabled: #8a8a8a;
  --border: #e5e5e5;  --border-strong: #d1d1d1;  --divider: #ededed;
  --success: #107c10;  --success-soft: #dff6dd;
  --warning: #9d5d00;  --warning-soft: #fff4ce;
  --error: #c42b1c;  --error-soft: #fde7e9;
  --info: #0067c0;  --info-soft: #e5f1fb;
}

@media (prefers-color-scheme: dark) {
  :root {
    --accent: #4cc2ff;  --accent-hover: #62b6ff;  --accent-pressed: #7bd1ff;
    --accent-disabled: #3a5c7a;  --accent-soft: #0a2b45;
    --bg: #202020;  --surface: #2b2b2b;  --surface-alt: #323232;
    --fg: #ffffff;  --fg-muted: #c5c5c5;  --fg-disabled: #7a7a7a;
    --border: #3f3f3f;  --border-strong: #565656;  --divider: #383838;
  }
}

/* 全局基础(重置靠 Tailwind preflight;body 全局样式;焦点环 §11.1) */
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

**间距**:用 Tailwind 默认 spacing(4px 基,`p-1`=4 / `p-2`=8 / `p-3`=12 / `p-4`=16 / `p-6`=24 / `p-8`=32 / `p-12`=48),与规格 §12.4 的 4px 栅格一致,无需自定义。

**生成的 Tailwind 类**:`bg-accent`、`bg-surface`、`text-fg`、`text-fg-muted`、`border-border`、`rounded-sm`、`rounded-md`、`text-body`、`shadow-rest`、`font-ui` 等,颜色类自动跟随运行时主题。

## 样式入口(tokens.less 并入 global.less,删除 tokens.less)

| 原 tokens.less / global.less 内容 | 处理 |
| --- | --- |
| `@import "tailwindcss"`(原 global.less) | 保留在 global.less 顶部 |
| `@theme inline` + `:root` + `@media`(原 tokens.less) | 并入 global.less |
| `*,:before,:after { box-sizing }` / `html,body,#root` 重置(原 global.less) | 删,Tailwind preflight 接管 |
| `body { font-family/font-size/color/background/user-select }` | `@layer base { body { @apply font-ui text-body text-fg bg-bg select-none; } }`(全局 body,避免每组件重复) |
| `.tnum` | 删类,组件用 `tabular-nums font-mono` |
| `:focus-visible` | 保留在 global.less `@layer base` |
| `button { font-family/cursor }` `button:disabled` | Tailwind preflight 接管 + 组件类 |
| `tokens.less` | 删除(内容已并入 global.less) |

`main.tsx` 改 `import "./global.less"`(删 tokens.less import)。

## 组件/视图重构(7 组件 + 5 视图)

内联 `style={{}}` → Tailwind 类(令牌类 + 默认 spacing)。

**固定值直接类**:`Button` 的 `sizeStyle`(standard=`h-10 px-4`、large=`h-12 px-6`、compact=`h-8 px-3`)+ `variant`(primary=`bg-accent text-white hover:bg-accent-hover`、secondary=`bg-surface text-accent border border-border-strong`、subtle=`text-fg`、destructive=`text-error border border-error`)。

**动态值用 CSS 变量 + 任意值类**(严格禁内联样式属性):
- `ProgressBar`:`style={{ "--progress": "${pct}%" } as React.CSSProperties}` + `className="w-[var(--progress)] h-2 bg-accent transition-[width] duration-150"`
- `StatCard` tone:`text-error` / `text-fg-muted`(条件 className,非内联)
- `ScanningView` spinner:`animate-spin`(Tailwind 内置,替代手写 keyframes)

**禁忌**:`style={{ width: ... }}`、`style={{ color: ... }}` 等样式属性。仅允许 `style={{ "--var": value }}` 设置 CSS 变量(配合 Tailwind 任意值类)。

## 步骤(全量,一次到位)

1. **样式入口**:`global.less` 重构(@import + @theme inline + :root/@media + @layer base body/焦点环);删 `tokens.less`;`main.tsx` 改 `import "./global.less"`;验证 `vite build`
2. **7 组件转 Tailwind**:Button / TitleBar / StatusBar / Stepper / DropZone / StatCard / ProgressBar(逐个,内联→类)
3. **5 视图转 Tailwind**:HomeView / ScanningView / ResultView / ProcessingView / CompletedView
4. **验证**:`tsc --noEmit` + `vite build` + grep 残余 `style={{`(应为 0,除 CSS 变量设置)+ 视觉核对

## 验收标准

- **0 处内联样式属性**(grep `style={{` 仅剩 CSS 变量设置 `style={{ "--xxx": ... }}`)
- 前端仅 `global.less` 一个 less 文件(`tokens.less` 删除)
- 运行时 Light/Dark 主题切换工作(`prefers-color-scheme`)
- `tsc --noEmit` + `vite build` 通过
- 视觉与 `design/设计规格说明书.md` §12 令牌一致(色值/间距/圆角/字号)

## 范围外(后续增量,非本重构)

- 设计规格的完整 29 组件(本重构只覆盖已有 7 组件 + 5 视图)
- 设置页 UI、HEIC 转换等 MVP 边界外的功能
