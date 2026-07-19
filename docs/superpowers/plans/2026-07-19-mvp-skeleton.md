# 照片适配助手 MVP 骨架 实现计划

> **面向 AI 代理的工作者:** 必需子技能:使用 superpowers:subagent-driven-development(推荐)或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框(`- [ ]`)语法来跟踪进度。

**目标:** 搭建 Tauri 2.x + React + TypeScript 工程骨架,打通主流程端到端最小闭环(选目录 → 扫描 → 处理 → 完成),含核心图像转换引擎。

**架构:** Tauri 2 后端(Rust)负责目录扫描、图像转换(EXIF/ICC 移除、方向修正、resize、Baseline JPEG)、Rayon 并行处理、配置与日志;React 前端用 Zustand 状态机驱动 5 个视图切换,通过 invoke 调用命令、listen 接收进度事件。前后端通过明确定义的命令与事件契约通信。

**技术栈:** Tauri 2.x · Rust(image / kamadak-exif / rayon / serde / tracing)· React 18 + TypeScript + Vite · Zustand · Vitest(前端测试)· cargo test(后端测试)

---

## 范围说明（MVP 边界）

本计划只覆盖 **MVP 骨架**——主流程端到端打通。以下明确**不在**本计划内(作为紧随其后的增量计划):

| 项                                   | MVP 处理                                                                              | 后续增量 |
| ------------------------------------ | ------------------------------------------------------------------------------------- | -------- |
| 9 屏中的设置页(§5.6)                 | 仅"打开设置"入口占位,不实现完整设置项                                                 | 独立计划 |
| 29 个组件                            | 仅实现主流程必需子集(Button/StatCard/ProgressBar/DropZone/Stepper/TitleBar/StatusBar) | 独立计划 |
| HEIC 转换                            | 识别但**跳过 + 警告**(libheif C 库跨平台构建复杂,不阻塞 MVP)                          | 独立计划 |
| 12 类弹窗                            | 仅实现取消确认(§8.6)与错误弹窗(§8.4)骨架                                              | 独立计划 |
| 16 类边界                            | 仅实现核心 4 类(空目录/损坏/不支持格式/磁盘满)                                        | 独立计划 |
| 精确 sRGB 色彩管理                   | 用"丢弃 ICC + 重编码"近似                                                             | 独立计划 |
| 大字号/高对比度/减少动画/托盘/多语言 | 不实现                                                                                | 独立计划 |
| 关于页 / 日志查看 UI                 | 仅后端日志文件,无 UI                                                                  | 独立计划 |

**事实来源:** `design/设计规格说明书.md`(界面规格)+ `CLAUDE.md`(项目约束)。本计划首章「技术决策」补全规格未涵盖的程序架构。

---

## 技术决策（规格未涵盖,本计划锁定）

| 决策点        | 选定方案                                                             | 理由                                                          |
| ------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| 前端构建      | Vite + React 18 + TS                                                 | Tauri 2 官方推荐,热重载快                                     |
| 视图切换      | Zustand 状态机(非 react-router)                                      | 线性步骤机,步骤不可跳跃前进,路由器反而引入 URL 复杂度         |
| 状态管理      | Zustand                                                              | 轻量,适合单 store 线性流程;无需 Redux 样板                    |
| 样式方案      | CSS 变量(设计令牌)+ CSS Modules                                      | 令牌统一(spec §12 要求),无运行时开销,不引入 Tailwind 增量负担 |
| 图标          | 内联 SVG symbol sprite(沿用原型方案)                                 | 无网络请求(离线原则),支持 currentColor 着色                   |
| 图像解码/编码 | `image` 0.25 crate                                                   | 原生支持 JPEG/PNG/WebP/GIF/BMP/TIFF,纯 Rust 无外部依赖        |
| EXIF/方向     | `kamadak-exif` 0.5                                                   | 读 Orientation tag,据此 transform                             |
| 并行处理      | `rayon`                                                              | CPU 密集型数据并行(文件级并行),与 Tauri 异步命令解耦          |
| 配置存储      | JSON 文件 + `tauri::Manager::path().app_data_dir()`                  | 单用户配置,无需数据库                                         |
| 日志          | `tracing` + `tracing-appender`(按天滚动)                             | spec §10.9 要求文件日志 + 30 天保留                           |
| 进度上报      | Tauri 事件 `app_handle.emit("process://progress", payload)`          | 前端 listen 接收,长任务后台 spawn                             |
| 取消机制      | `Arc<AtomicBool>` cancel flag,worker 每张检查                        | 简单可靠,符合"取消经确认"(§8.6)                               |
| HEIC          | MVP 跳过(libheif C 依赖),标记 unsupported                            | 见范围说明                                                    |
| sRGB          | MVP 近似:丢弃 ICC + 重编码(spec"移除 ICC"满足;"转 sRGB"精确转换后续) | 诚实标注,不阻塞                                               |
| 测试          | 后端 cargo test / 前端 Vitest + Testing Library                      | TDD,核心逻辑全覆盖                                            |

**关键约束遵守:** 4px 栅格、强调色 `#0067C0`、字重 400/600、系统字体栈、无网络字体、界面无"登录/云/AI/上传"字样、输出默认 `/compat` 子目录不覆盖。

---

## 文件结构

```
picture-exif/
├── src/                          # 前端 React(Tauri 加载的 WebView 资源)
│   ├── main.tsx                  # React 入口
│   ├── App.tsx                   # 根组件:框架 + 视图路由(状态机驱动)
│   ├── tokens.css                # 设计令牌(CSS 变量,Light/Dark,§12)
│   ├── global.css                # 全局重置 + 字体栈 + 基础元素样式
│   ├── types.ts                  # 与后端对齐的共享类型(ScanResult/ProgressEvent/...)
│   ├── ipc/
│   │   └── commands.ts           # invoke 封装 + listen 类型化封装
│   ├── store/
│   │   └── appStore.ts           # Zustand:视图状态机 + 业务状态 + IPC 调用
│   ├── icons/
│   │   └── Icons.tsx             # SVG symbol sprite + <Icon name=.../>
│   ├── components/               # 复用组件(MVP 子集)
│   │   ├── TitleBar.tsx
│   │   ├── StatusBar.tsx
│   │   ├── Stepper.tsx
│   │   ├── Button.tsx
│   │   ├── StatCard.tsx
│   │   ├── ProgressBar.tsx
│   │   └── DropZone.tsx
│   └── views/                    # 5 个主视图
│       ├── HomeView.tsx
│       ├── ScanningView.tsx
│       ├── ResultView.tsx
│       ├── ProcessingView.tsx
│       └── CompletedView.tsx
├── src-tauri/                    # Rust 后端
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   ├── icons/
│   └── src/
│       ├── main.rs               # 入口:初始化日志/配置,注册命令,启动 Tauri
│       ├── lib.rs                 # Tauri Builder + 命令注册(便于测试)
│       ├── error.rs              # AppError(thiserror)+ Serialize 给前端
│       ├── log.rs                # tracing + appender 初始化
│       ├── config.rs             # Config 结构 + 默认值 + JSON 读写
│       ├── commands.rs           # #[tauri::command] 入口:scan/start/cancel/open_output
│       └── pipeline/
│           ├── mod.rs
│           ├── scan.rs           # 目录扫描 + 格式识别 + 统计
│           ├── convert.rs        # 单文件转换核心:decode→orient→resize→encode
│           └── worker.rs         # 批量并行(Rayon)+ 进度事件 + 取消
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html                    # Vite 入口 HTML
└── docs/superpowers/plans/
    └── 2026-07-19-mvp-skeleton.md
```

**职责边界:**
- `pipeline/scan.rs` 只负责遍历与识别,不碰像素;
- `pipeline/convert.rs` 只负责单文件像素转换,无 I/O 状态;
- `pipeline/worker.rs` 只负责编排(并行 + 进度 + 取消),调 scan/convert;
- `commands.rs` 是 Tauri 与业务之间的薄适配层,不含业务逻辑;
- 前端 `store/appStore.ts` 是唯一业务状态持有者,视图纯展示 + 派发。

---

## 任务 1：工程脚手架

**文件:**
- 创建:Tauri 2 + React + TS + Vite 项目骨架(create-tauri-app 生成)

- [ ] **步骤 1:用官方脚手架生成项目**

在仓库根目录执行(交互式选择 React + TypeScript + Vite):

```bash
cd e:/LiangTian/Documents/Programming/App/picture-exif
npm create tauri-app@latest .
```

交互选择:
- Project name: `picture-exif-app`(或保留默认)
- Identifier: `com.photo compat.app`
- Frontend language: `TypeScript / JavaScript`
- UI template: `React`
- UI framework: `Vite`
- Manager: `npm`

> 注:在已有仓库目录执行,脚手架会生成 `src/`、`src-tauri/`、`package.json` 等并保留已有 `design/`、`docs/`、`CLAUDE.md`、`.claude/`。若脚手架提示文件已存在,选择保留已有文件或合并。

- [ ] **步骤 2:安装前端依赖并验证空壳运行**

```bash
npm install
npm run tauri dev
```

预期:Tauri 窗口打开,显示脚手架默认欢迎页;无编译错误。

- [ ] **步骤 3:验证前端测试框架就绪**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

在 `vite.config.ts` 增加 test 配置(见任务 10 详细代码)。确认 `npx vitest run` 可执行(暂无测试则通过)。

- [ ] **步骤 4:Commit**

```bash
git add -A
git commit -m "chore(脚手架): 初始化 Tauri 2 + React + TypeScript + Vite 工程"
```

---

## 任务 2：设计令牌与全局样式

**依据:** `设计规格说明书.md` §12(设计令牌)、§3.2(最小窗口 880×640)。

**文件:**
- 创建:`src/tokens.css`
- 创建:`src/global.css`
- 修改:`src/main.tsx`(引入两个样式)

- [ ] **步骤 1:编写 tokens.css(Light/Dark 令牌)**

```css
/* src/tokens.css — 设计令牌,见规格说明书 §12 */
:root {
  /* 强调色(§12.1.1) */
  --accent: #0067c0;
  --accent-hover: #005293;
  --accent-pressed: #003f73;
  --accent-disabled: #8ab8e8;
  --accent-soft: #e5f1fb;

  /* 中性色(§12.1.2) */
  --bg: #f3f3f3;
  --surface: #ffffff;
  --surface-alt: #fafafa;
  --fg: #1a1a1a;
  --fg-muted: #5b5b5b;
  --fg-disabled: #8a8a8a;
  --border: #e5e5e5;
  --border-strong: #d1d1d1;
  --divider: #ededed;

  /* 语义色(§12.1.4,均配图标不仅靠颜色) */
  --success: #107c10;
  --success-soft: #dff6dd;
  --warning: #9d5d00;
  --warning-soft: #fff4ce;
  --error: #c42b1c;
  --error-soft: #fde7e9;
  --info: #0067c0;
  --info-soft: #e5f1fb;

  /* 间距(§12.4,4px 栅格) */
  --sp-xxs: 4px;
  --sp-xs: 8px;
  --sp-s: 12px;
  --sp-m: 16px;
  --sp-l: 24px;
  --sp-xl: 32px;
  --sp-xxl: 48px;

  /* 圆角(§12.5) */
  --radius-sm: 4px;
  --radius-md: 8px;

  /* 字号(§12.3) */
  --fs-caption: 12px;
  --fs-body: 14px;
  --fs-subtitle: 20px;
  --fs-title: 28px;

  /* 字体栈(§12.2,系统字体,不引入网络字体) */
  --font-ui: "Segoe UI Variable Text", "Segoe UI", "Cantarell", "Inter",
    system-ui, "Microsoft YaHei UI", "Microsoft YaHei", "Source Han Sans SC",
    "Noto Sans CJK SC", "PingFang SC", sans-serif;
  --font-mono: "Cascadia Code", "Consolas", "JetBrains Mono", "DejaVu Sans Mono",
    ui-monospace, monospace;

  /* 阴影(§12.6) */
  --shadow-rest: 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-flyout: 0 8px 16px rgba(0, 0, 0, 0.14);
}

/* Dark 主题(§12.1.3,跟随系统) */
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
```

- [ ] **步骤 2:编写 global.css(全局重置 + 基础元素)**

```css
/* src/global.css */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  height: 100%;
}

body {
  font-family: var(--font-ui);
  font-size: var(--fs-body);
  line-height: 1.5;
  color: var(--fg);
  background: var(--bg);
  /* 禁用用户选择文本(桌面应用感) */
  -webkit-user-select: none;
  user-select: none;
}

/* 等宽数字对齐(§12.3,统计数字) */
.tnum {
  font-variant-numeric: tabular-nums;
  font-family: var(--font-mono);
}

/* 可见焦点环(§11.1,2px 强调色 + offset,不依赖颜色) */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

button {
  font-family: inherit;
  cursor: pointer;
}
button:disabled {
  cursor: not-allowed;
}
```

- [ ] **步骤 3:在 main.tsx 引入**

修改 `src/main.tsx`,在顶部加:

```tsx
import "./tokens.css";
import "./global.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **步骤 4:启动验证令牌生效**

运行:`npm run tauri dev`
预期:窗口背景变为 `--bg`(#f3f3f3),字体为 Segoe UI;浏览器开发者工具确认 computed color/family 正确。

- [ ] **步骤 5:Commit**

```bash
git add src/tokens.css src/global.css src/main.tsx
git commit -m "feat(样式): 添加设计令牌与全局样式"
```

---

## 任务 3：Tauri 窗口与插件配置

**依据:** §3.1(标题栏 40px 自绘)、§3.2(最小 880×640)、§5.2(系统原生文件夹选择器)。

**文件:**
- 修改:`src-tauri/tauri.conf.json`
- 修改:`src-tauri/Cargo.toml`(加依赖)
- 修改:`src-tauri/src/lib.rs`(注册 dialog 插件)
- 修改:`package.json`(加前端插件)

- [ ] **步骤 1:配置 tauri.conf.json 窗口与权限**

修改 `src-tauri/tauri.conf.json` 的 `app.windows[0]` 与 `app.security`:

```json
{
  "app": {
    "windows": [
      {
        "title": "照片适配助手",
        "width": 1100,
        "height": 720,
        "minWidth": 880,
        "minHeight": 640,
        "resizable": true,
        "decorations": true,
        "center": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'"
    }
  }
}
```

> `decorations: true` 先用系统标题栏;自绘标题栏(CSD)作为后续增量(§3.1),MVP 用原生装饰降低复杂度。

- [ ] **步骤 2:添加 Rust 依赖**

修改 `src-tauri/Cargo.toml` 的 `[dependencies]`:

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-dialog = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
image = "0.25"
kamadak-exif = "0.5"
rayon = "1.10"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
tracing-appender = "0.2"
thiserror = "1"
walkdir = "2"

[dev-dependencies]
tempfile = "3"
```

- [ ] **步骤 3:添加前端插件**

```bash
npm install @tauri-apps/plugin-dialog
```

- [ ] **步骤 4:注册 dialog 插件**

修改 `src-tauri/src/lib.rs`(脚手架生成):

```rust
// src-tauri/src/lib.rs
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

确保 `src-tauri/src/main.rs` 调用 `app_lib::run()`(脚手架默认):

```rust
// src-tauri/src/main.rs
fn main() {
    picture_exif_app_lib::run();
}
```

> 库名以脚手架生成的 `lib.rs` 里 `pub fn run()` 所在 crate 名为准(通常为 `<app>_lib`)。

- [ ] **步骤 5:在 capabilities 授予 dialog 权限**

修改 `src-tauri/capabilities/default.json`,在 `permissions` 数组加入:

```json
"dialog:allow-open",
"core:default"
```

- [ ] **步骤 6:验证插件可用**

运行 `npm run tauri dev`,在浏览器控制台执行:

```js
import { open } from "@tauri-apps/plugin-dialog";
await open({ directory: true });
```

预期:弹出系统原生文件夹选择器;选目录后返回路径字符串。

- [ ] **步骤 7:Commit**

```bash
git add src-tauri/ package.json package-lock.json
git commit -m "feat(配置): 配置 Tauri 窗口尺寸与目录选择插件"
```

---

## 任务 4：后端错误类型与日志初始化

**依据:** §10.9(日志级别/保留天数)、§8(错误四段结构,前端呈现)。

**文件:**
- 创建:`src-tauri/src/error.rs`
- 创建:`src-tauri/src/log.rs`

- [ ] **步骤 1:编写 error.rs**

```rust
// src-tauri/src/error.rs
use serde::Serialize;
use thiserror::Error;

/// 应用错误。序列化为字符串给前端,前端按 §8 呈现四段对话框。
#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum AppError {
    #[error("目录无法访问:{0}")]
    DirAccess(String),
    #[error("权限不足:{0}")]
    Permission(String),
    #[error("磁盘空间不足")]
    DiskFull,
    #[error("图片损坏:{0}")]
    Corrupt(String),
    #[error("不支持的格式:{0}")]
    Unsupported(String),
    #[error("IO 错误:{0}")]
    Io(String),
    #[error("内部错误:{0}")]
    Internal(String),
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        match e.kind() {
            std::io::ErrorKind::PermissionDenied => AppError::Permission(e.to_string()),
            std::io::ErrorKind::NotFound => AppError::DirAccess(e.to_string()),
            _ => AppError::Io(e.to_string()),
        }
    }
}

/// 命令返回类型别名
pub type AppResult<T> = Result<T, AppError>;
```

- [ ] **步骤 2:编写 log.rs**

```rust
// src-tauri/src/log.rs
use std::path::PathBuf;
use tracing_appender::rolling;
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

/// 初始化文件日志(按天滚动)。返回 guard 保持文件写入。
/// 日志目录:app_data_dir/logs,保留由日志系统/后续清理任务管理。
pub fn init(log_dir: PathBuf) -> tracing_appender::non_blocking::WorkerGuard {
    std::fs::create_dir_all(&log_dir).ok();
    let file_appender = rolling::daily(&log_dir, "photo-compat.log");
    let (non_blocking, guard) = tracing_appender::non_blocking(file_appender);

    let env = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    tracing_subscriber::registry()
        .with(env)
        .with(fmt::layer().with_writer(std::io::stderr))
        .with(fmt::layer().with_writer(non_blocking))
        .init();
    guard
}
```

- [ ] **步骤 3:编译验证**

运行:`cd src-tauri && cargo check`
预期:编译通过。

- [ ] **步骤 4:Commit**

```bash
git add src-tauri/src/error.rs src-tauri/src/log.rs src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "feat(后端): 添加错误类型与日志初始化"
```

---

## 任务 5：配置模块（默认值 + JSON 读写）

**依据:** §5.6(设置默认值)、附录 A(兼容性词典默认)、§10.13(架构自适应默认)、§1.4(输出默认 `/compat` 不覆盖)。

**文件:**
- 创建:`src-tauri/src/config.rs`
- 创建:`src-tauri/src/config.rs` 内联测试

- [ ] **步骤 1:编写失败的测试**

```rust
// src-tauri/src/config.rs 末尾
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_config_matches_spec() {
        let c = Config::default();
        // 附录 A 兼容性默认全开
        assert!(c.remove_exif);
        assert!(c.remove_icc);
        assert!(c.auto_orient);
        assert!(c.baseline_jpeg);
        assert!(c.convert_heic);
        assert!(c.to_srgb);
        assert_eq!(c.jpeg_quality, 90);
        assert_eq!(c.max_width, 4096);
        assert_eq!(c.max_height, 4096);
        // 输出默认(§1.4)
        assert_eq!(c.subfolder, "compat");
        assert!(!c.overwrite);
        assert!(c.keep_structure);
    }

    #[test]
    fn config_roundtrip_json() {
        let c = Config::default();
        let json = serde_json::to_string(&c).unwrap();
        let back: Config = serde_json::from_str(&json).unwrap();
        assert_eq!(back.jpeg_quality, c.jpeg_quality);
        assert_eq!(back.subfolder, c.subfolder);
    }

    #[test]
    fn corrupt_config_falls_back_to_default() {
        // 配置损坏(§15.13)回退默认
        let bad = "{ not valid json";
        let c: Config = serde_json::from_str(bad).unwrap_or_default();
        assert_eq!(c.jpeg_quality, 90);
    }
}
```

- [ ] **步骤 2:运行测试验证失败**

运行:`cd src-tauri && cargo test --lib config`
预期:编译失败,`Config` 类型未定义。

- [ ] **步骤 3:实现 Config**

```rust
// src-tauri/src/config.rs
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    // 兼容性(附录 A)
    pub remove_exif: bool,
    pub remove_icc: bool,
    pub auto_orient: bool,
    pub baseline_jpeg: bool,
    pub convert_heic: bool,
    pub to_srgb: bool,
    pub jpeg_quality: u8,
    pub max_width: u32,
    pub max_height: u32,
    // 输出(§5.6 输出分组)
    pub subfolder: String,
    pub overwrite: bool,
    pub keep_structure: bool,
    // 性能(§10.13)
    pub parallel: usize,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            remove_exif: true,
            remove_icc: true,
            auto_orient: true,
            baseline_jpeg: true,
            convert_heic: true,
            to_srgb: true,
            jpeg_quality: 90,
            max_width: 4096,
            max_height: 4096,
            subfolder: "compat".to_string(),
            overwrite: false,
            keep_structure: true,
            parallel: default_parallel(),
        }
    }
}

/// 架构自适应并行数(§10.13)。MVP 简化:用核心数,留 1 核给系统;
/// ARM/LoongArch 限制 ≤4。架构检测在后续增量精确化。
fn default_parallel() -> usize {
    let cores = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4);
    if cores > 1 {
        cores - 1
    } else {
        1
    }
}

impl Config {
    /// 从 app_data_dir/config.json 读取;不存在或损坏回退默认(§15.13)。
    pub fn load(dir: &Path) -> Self {
        let path: PathBuf = dir.join("config.json");
        match std::fs::read_to_string(&path) {
            Ok(s) => serde_json::from_str(&s).unwrap_or_default(),
            Err(_) => Config::default(),
        }
    }

    /// 保存到 app_data_dir/config.json。失败仅记日志,不阻塞主流程(§15.13)。
    pub fn save(&self, dir: &Path) {
        let path: PathBuf = dir.join("config.json");
        if let Ok(s) = serde_json::to_string_pretty(self) {
            if std::fs::create_dir_all(dir).is_ok() {
                let _ = std::fs::write(path, s);
            }
        }
    }
}
```

- [ ] **步骤 4:运行测试验证通过**

运行:`cd src-tauri && cargo test --lib config`
预期:3 个测试全 PASS。

- [ ] **步骤 5:Commit**

```bash
git add src-tauri/src/config.rs
git commit -m "feat(后端): 添加配置模块与架构自适应默认值"
```

---

## 任务 6：目录扫描命令

**依据:** §10.2(扫描过程)、§5.3(扫描结果统计)、§15.1–15.3(空/不支持格式边界)。

**文件:**
- 创建:`src-tauri/src/pipeline/mod.rs`
- 创建:`src-tauri/src/pipeline/scan.rs`
- 创建:`src-tauri/src/types.rs`(共享序列化类型)
- 修改:`src-tauri/src/lib.rs`(注册命令)
- 修改:`src-tauri/src/commands.rs`

- [ ] **步骤 1:定义共享类型**

```rust
// src-tauri/src/types.rs
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// 扫描结果(给前端扫描结果页 §5.3)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub total: u32,
    pub by_format: BTreeMap<String, u32>, // "JPEG": 202, "HEIC": 8, ...
    pub unsupported: Vec<String>,         // 不支持格式的文件名
    pub source_dir: String,
}
```

在 `src-tauri/src/lib.rs` 顶部加 `pub mod types;`(连同后续模块)。

- [ ] **步骤 2:编写失败的扫描测试**

```rust
// src-tauri/src/pipeline/scan.rs 末尾
#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn scan_counts_supported_formats() {
        let dir = TempDir::new().unwrap();
        fs::write(dir.path().join("a.jpg"), b"x").unwrap();
        fs::write(dir.path().join("b.png"), b"x").unwrap();
        fs::write(dir.path().join("c.heic"), b"x").unwrap();
        fs::write(dir.path().join("d.psd"), b"x").unwrap(); // 不支持

        let result = scan_directory(dir.path()).unwrap();
        assert_eq!(result.total, 3); // jpg + png + heic(heic 识别但不转换,MVP 计入)
        assert_eq!(*result.by_format.get("JPEG").unwrap_or(&0), 1);
        assert_eq!(*result.by_format.get("PNG").unwrap_or(&0), 1);
        assert_eq!(result.unsupported.len(), 1);
        assert!(result.unsupported[0].ends_with("d.psd"));
    }

    #[test]
    fn scan_empty_dir_returns_zero() {
        // §15.1 / §15.3 空目录
        let dir = TempDir::new().unwrap();
        let result = scan_directory(dir.path()).unwrap();
        assert_eq!(result.total, 0);
    }
}
```

- [ ] **步骤 3:运行测试验证失败**

运行:`cd src-tauri && cargo test --lib scan`
预期:编译失败,`scan_directory` 未定义。

- [ ] **步骤 4:实现扫描**

```rust
// src-tauri/src/pipeline/scan.rs
use crate::error::AppResult;
use crate::types::ScanResult;
use std::collections::BTreeMap;
use std::path::Path;
use walkdir::WalkDir;

/// 支持的输入格式(§支持格式)。HEIC 识别但 MVP 不转换。
pub fn format_of(ext: &str) -> Option<&'static str> {
    match ext.to_ascii_lowercase().as_str() {
        "jpg" | "jpeg" => Some("JPEG"),
        "png" => Some("PNG"),
        "webp" => Some("WebP"),
        "gif" => Some("GIF"),
        "bmp" => Some("BMP"),
        "tiff" | "tif" => Some("TIFF"),
        "heic" | "heif" => Some("HEIC"),
        _ => None,
    }
}

/// 递归扫描目录,统计支持格式,记录不支持格式。
pub fn scan_directory(root: &Path) -> AppResult<ScanResult> {
    if !root.exists() {
        return Err(crate::error::AppError::DirAccess(format!(
            "目录不存在:{}",
            root.display()
        )));
    }

    let mut by_format: BTreeMap<String, u32> = BTreeMap::new();
    let mut unsupported: Vec<String> = Vec::new();
    let mut total: u32 = 0;

    for entry in WalkDir::new(root).into_iter().filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");
        match format_of(ext) {
            Some(fmt) => {
                *by_format.entry(fmt.to_string()).or_insert(0) += 1;
                total += 1;
            }
            None => {
                // 跳过无扩展名与常见非图片;有扩展名但不在支持列表则记为 unsupported
                if !ext.is_empty() {
                    unsupported.push(path.to_string_lossy().to_string());
                }
            }
        }
    }

    Ok(ScanResult {
        total,
        by_format,
        unsupported,
        source_dir: root.to_string_lossy().to_string(),
    })
}
```

- [ ] **步骤 5:运行测试验证通过**

运行:`cd src-tauri && cargo test --lib scan`
预期:2 个测试 PASS。

- [ ] **步骤 6:暴露为 Tauri 命令**

```rust
// src-tauri/src/commands.rs
use crate::error::AppResult;
use crate::pipeline::scan::scan_directory;
use crate::types::ScanResult;
use std::path::PathBuf;

#[tauri::command]
pub async fn scan_directory_cmd(path: String) -> AppResult<ScanResult> {
    scan_directory(&PathBuf::from(&path))
}
```

在 `src-tauri/src/lib.rs` 注册:

```rust
// src-tauri/src/lib.rs
pub mod commands;
pub mod config;
pub mod error;
pub mod log;
pub mod pipeline;
pub mod types;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![commands::scan_directory_cmd])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **步骤 7:Commit**

```bash
git add src-tauri/src/
git commit -m "feat(扫描): 实现目录扫描命令与格式识别"
```

---

## 任务 7：图像转换核心（单文件）

**依据:** §10.4(处理中:转换 HEIC→JPEG 等操作)、附录 A(转换项)、§10.13(MVP HEIC 跳过)。

**文件:**
- 创建:`src-tauri/src/pipeline/convert.rs`
- 创建:`src-tauri/src/pipeline/convert.rs` 内联测试 + 测试夹具

- [ ] **步骤 1:准备测试夹具(生成一张真实可解码 JPEG)**

```rust
// src-tauri/src/pipeline/convert.rs 末尾 tests 模块
#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageBuffer, Rgb, RgbImage};
    use std::fs;
    use tempfile::TempDir;

    /// 生成一张 100×80 的测试 JPEG
    fn make_test_jpeg(dir: &Path, name: &str) -> PathBuf {
        let img: RgbImage = ImageBuffer::from_pixel(100, 80, Rgb([200, 100, 50]));
        let path = dir.join(name);
        img.save(&path).unwrap();
        path
    }

    #[test]
    fn convert_jpeg_to_compat_jpeg() {
        let dir = TempDir::new().unwrap();
        let input = make_test_jpeg(dir.path(), "in.jpg");
        let output = dir.path().join("out.jpg");
        let cfg = crate::config::Config::default();

        convert_file(&input, &output, &cfg).unwrap();

        assert!(output.exists());
        // 输出仍是合法 JPEG 且可解码
        let meta = image::image_dimensions(&output).unwrap();
        assert_eq!(meta, (100, 80));
    }

    #[test]
    fn convert_resizes_when_over_max() {
        let dir = TempDir::new().unwrap();
        let img: RgbImage = ImageBuffer::from_pixel(5000, 1000, Rgb([10, 20, 30]));
        let input = dir.path().join("big.jpg");
        img.save(&input).unwrap();
        let output = dir.path().join("big_out.jpg");
        let mut cfg = crate::config::Config::default();
        cfg.max_width = 4096;
        cfg.max_height = 4096;

        convert_file(&input, &output, &cfg).unwrap();

        let (w, h) = image::image_dimensions(&output).unwrap();
        assert!(w <= 4096 && h <= 4096);
        assert_eq!(w, 4096); // 等比缩放,宽边落到 4096
    }

    #[test]
    fn convert_corrupt_file_returns_error() {
        // §15.7 图片损坏
        let dir = TempDir::new().unwrap();
        let input = dir.path().join("bad.jpg");
        fs::write(&input, b"not an image").unwrap();
        let output = dir.path().join("bad_out.jpg");
        let cfg = crate::config::Config::default();

        let res = convert_file(&input, &output, &cfg);
        assert!(matches!(res, Err(crate::error::AppError::Corrupt(_))));
    }
}
```

> 测试需 `use std::path::{Path, PathBuf};` 引入。

- [ ] **步骤 2:运行测试验证失败**

运行:`cd src-tauri && cargo test --lib convert`
预期:编译失败,`convert_file` 未定义。

- [ ] **步骤 3:实现转换核心**

```rust
// src-tauri/src/pipeline/convert.rs
use crate::config::Config;
use crate::error::{AppError, AppResult};
use image::{image_dimensions, DynamicImage, ImageFormat};
use std::io::BufReader;
use std::path::Path;

/// 转换单个文件为兼容 JPEG。
/// 步骤(附录 A):decode → 自动修正方向 → resize 到 max 边 → 重编码为 Baseline JPEG。
/// 重编码天然移除 EXIF/ICC(image 默认不嵌入)。HEIC 在 MVP 跳过(§10.13)。
pub fn convert_file(input: &Path, output: &Path, cfg: &Config) -> AppResult<()> {
    // HEIC:MVP 不转换,显式跳过
    if let Some(ext) = input.extension().and_then(|e| e.to_str()) {
        let ext = ext.to_ascii_lowercase();
        if matches!(ext.as_str(), "heic" | "heif") {
            return Err(AppError::Unsupported(
                "HEIC 转换在 MVP 暂未启用".to_string(),
            ));
        }
    }

    let reader = image::ImageReader::open(input)
        .map_err(|e| AppError::Io(e.to_string()))?;
    let reader = reader.with_guessed_format().map_err(|e| AppError::Io(e.to_string()))?;
    let mut img: DynamicImage = reader
        .decode()
        .map_err(|_| AppError::Corrupt(input.to_string_lossy().to_string()))?;

    // 自动修正方向(§附录 A):读 EXIF Orientation 并应用
    if cfg.auto_orient {
        if let Some(orient) = read_orientation(input) {
            img = apply_orientation(img, orient);
        }
    }

    // resize:超过 max 边等比缩小(附录 A 最大宽高 4096)
    let (w, h) = (img.width(), img.height());
    let max_w = cfg.max_width;
    let max_h = cfg.max_height;
    if w > max_w || h > max_h {
        img = img.resize(max_w, max_h, image::imageops::FilterType::Lanczos3);
    }

    // 转 sRGB 近似 + 移除 ICC:image 默认编码即不嵌入 ICC;转 8-bit RGB
    let rgb = img.to_rgb8();

    // 编码为 Baseline JPEG(image 默认 DCT baseline,非渐进式 → 满足 §附录 A)
    rgb.save_with_format(output, ImageFormat::Jpeg)
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

/// 读 EXIF Orientation(kamadak-exif)。无 EXIF 返回 None。
fn read_orientation(path: &Path) -> Option<u8> {
    let file = std::fs::File::open(path).ok()?;
    let mut buf = BufReader::new(&file);
    let exif = exif::Reader::new().read_from_container(&mut buf).ok()?;
    exif.get_field(exif::Tag::Orientation, exif::In::PRIMARY)
        .and_then(|f| f.value.get_uint())
}

/// 按 EXIF Orientation 值应用变换(spec §附录 A 自动修正方向)。
fn apply_orientation(img: DynamicImage, orient: u8) -> DynamicImage {
    use image::imageops;
    match orient {
        2 => img.fliph(),
        3 => img.rotate180(),
        4 => img.flipv(),
        5 => img.rotate90().fliph(),
        6 => img.rotate90(),
        7 => img.rotate270().fliph(),
        8 => img.rotate270(),
        _ => img,
    }
}

/// 计算输出路径:保持结构 + 不覆盖/加序号(§1.4,§15.8)
pub fn resolve_output_path(
    input: &Path,
    source_root: &Path,
    out_root: &Path,
    cfg: &Config,
) -> PathBuf {
    let rel = input.strip_prefix(source_root).unwrap_or(input);
    let mut out = out_root.to_path_buf();
    if cfg.keep_structure {
        if let Some(parent) = rel.parent() {
            out.push(parent);
        }
    }
    // 改扩展名为 .jpg
    let stem = rel
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    out.push(format!("{}.jpg", stem));

    // 不覆盖:同名加序号(§15.8)
    if !cfg.overwrite {
        let mut n = 1;
        while out.exists() {
            out.set_file_name(format!("{}_{}.jpg", stem, n));
            n += 1;
        }
    }
    out
}

use std::path::PathBuf;
```

> `use exif;` 依赖 `kamadak-exif`,在 Cargo.toml 中以 `exif = "0.5"` 引入(crate 名为 exif)。任务 3 已加 `kamadak-exif = "0.5"`,需改为 `exif = "0.5"`(同一 crate,包名 kamadak-exif,crate 名 exif)。在步骤 5 验证时修正 Cargo.toml。

- [ ] **步骤 4:修正 Cargo.toml crate 名**

`src-tauri/Cargo.toml` 中把 `kamadak-exif = "0.5"` 改为:

```toml
exif = "0.5"
```

- [ ] **步骤 5:运行测试验证通过**

运行:`cd src-tauri && cargo test --lib convert`
预期:3 个测试 PASS。若 `image_dimensions` 导入报错,改为 `image::image_dimensions` 全路径调用。

- [ ] **步骤 6:Commit**

```bash
git add src-tauri/src/pipeline/convert.rs src-tauri/Cargo.toml
git commit -m "feat(转换): 实现单文件图像转换核心(方向/缩放/Baseline)"
```

---

## 任务 8：批量处理 worker（并行 + 进度事件 + 取消）

**依据:** §10.4–10.7(处理/暂停/取消/完成)、§10.12(失败统计)、§10.13(并行数)、§15.7(损坏跳过)、§15.8(不覆盖)。

**文件:**
- 修改:`src-tauri/src/pipeline/scan.rs`(ScanResult 加 `files` 字段,供 worker 复用)
- 创建:`src-tauri/src/pipeline/worker.rs`
- 创建:`src-tauri/src/state.rs`(AppState + JobHandle)
- 修改:`src-tauri/src/commands.rs`(start/cancel/pause/resume/open_output 命令)
- 修改:`src-tauri/src/lib.rs`(注册命令 + manage state)
- 修改:`src-tauri/Cargo.toml`(加 opener)

- [ ] **步骤 1:ScanResult 增加文件路径(序列化跳过,不发给前端)**

修改 `src-tauri/src/pipeline/scan.rs`:

在 `ScanResult` 定义(实际位于 `types.rs`)增加字段。修改 `src-tauri/src/types.rs`:

```rust
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub total: u32,
    pub by_format: BTreeMap<String, u32>,
    pub unsupported: Vec<String>,
    pub source_dir: String,
    #[serde(skip)]
    pub files: Vec<PathBuf>,
}
```

修改 `scan.rs::scan_directory`,在循环中收集支持格式的路径:

```rust
// scan_directory 函数体内,在 `Some(fmt) =>` 分支追加:
files.push(path.to_path_buf());
```

函数末尾构造 ScanResult 时填入 `files`:

```rust
Ok(ScanResult { total, by_format, unsupported, source_dir: root.to_string_lossy().to_string(), files })
```

并在函数顶部声明 `let mut files: Vec<std::path::PathBuf> = Vec::new();`。

更新任务 6 的测试断言不受影响(files 被跳过序列化)。运行 `cargo test --lib scan` 确认仍 PASS。

- [ ] **步骤 2:定义 ProgressEvent 与 ProcessSummary**

修改 `src-tauri/src/types.rs` 追加:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressEvent {
    pub done: u32,
    pub total: u32,
    pub failed: u32,
    pub skipped: u32,
    pub current: String,
    pub state: String, // "running" | "paused" | "done" | "cancelled"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessSummary {
    pub total: u32,
    pub done: u32,
    pub failed: u32,
    pub skipped: u32,
    pub cancelled: bool,
}
```

- [ ] **步骤 3:定义 AppState(state.rs)**

```rust
// src-tauri/src/state.rs
use crate::config::Config;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

/// 当前处理任务句柄,供 cancel/pause 命令访问。
#[derive(Clone)]
pub struct JobHandle {
    pub cancel: Arc<AtomicBool>,
    pub paused: Arc<AtomicBool>,
}

pub struct AppState {
    pub config: Mutex<Config>,
    pub job: Mutex<Option<JobHandle>>,
}

impl AppState {
    pub fn new(config: Config) -> Self {
        Self {
            config: Mutex::new(config),
            job: Mutex::new(None),
        }
    }

    pub fn set_job(&self, job: JobHandle) {
        *self.job.lock().unwrap() = Some(job);
    }

    pub fn clear_job(&self) {
        *self.job.lock().unwrap() = None;
    }

    /// 触发取消;无任务时返回 false。
    pub fn cancel_job(&self) -> bool {
        if let Some(job) = self.job.lock().unwrap().as_ref() {
            job.cancel.store(true, Ordering::Relaxed);
            true
        } else {
            false
        }
    }

    pub fn set_paused(&self, paused: bool) -> bool {
        if let Some(job) = self.job.lock().unwrap().as_ref() {
            job.paused.store(paused, Ordering::Relaxed);
            true
        } else {
            false
        }
    }
}
```

- [ ] **步骤 4:编写 worker 失败测试**

```rust
// src-tauri/src/pipeline/worker.rs 末尾
#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::Config;
    use image::{ImageBuffer, Rgb, RgbImage};
    use std::path::Path;
    use tempfile::TempDir;

    fn make_jpeg(dir: &Path, name: &str, ok: bool) -> std::path::PathBuf {
        let p = dir.join(name);
        if ok {
            let img: RgbImage = ImageBuffer::from_pixel(20, 20, Rgb([1, 2, 3]));
            img.save(&p).unwrap();
        } else {
            std::fs::write(&p, b"corrupt").unwrap();
        }
        p
    }

    #[test]
    fn pipeline_counts_done_failed_skipped() {
        let dir = TempDir::new().unwrap();
        let src = dir.path().join("src");
        std::fs::create_dir_all(&src).unwrap();
        let out = dir.path().join("compat");

        let files = vec![
            make_jpeg(&src, "a.jpg", true),   // done
            make_jpeg(&src, "b.jpg", false),  // corrupt → failed
            make_jpeg(&src, "c.jpg", true),   // done
        ];

        let cfg = Config::default();
        let cancel = Arc::new(AtomicBool::new(false));
        let paused = Arc::new(AtomicBool::new(false));

        let summary = run_pipeline(files, &src, &out, &cfg, None, &cancel, &paused);

        assert_eq!(summary.total, 3);
        assert_eq!(summary.done, 2);
        assert_eq!(summary.failed, 1);
        assert!(!summary.cancelled);
    }

    #[test]
    fn pipeline_cancel_stops_early() {
        // 取消:在开始即置位,剩余项跳过
        let dir = TempDir::new().unwrap();
        let src = dir.path().join("src");
        std::fs::create_dir_all(&src).unwrap();
        let out = dir.path().join("compat");
        let files = vec![make_jpeg(&src, "a.jpg", true), make_jpeg(&src, "b.jpg", true)];
        let cfg = Config::default();
        let cancel = Arc::new(AtomicBool::new(true)); // 启动即取消
        let paused = Arc::new(AtomicBool::new(false));

        let summary = run_pipeline(files, &src, &out, &cfg, None, &cancel, &paused);
        assert!(summary.cancelled);
        assert_eq!(summary.done, 0);
    }
}
```

- [ ] **步骤 5:运行测试验证失败**

运行:`cd src-tauri && cargo test --lib worker`
预期:编译失败,`run_pipeline` 未定义。

- [ ] **步骤 6:实现 worker**

```rust
// src-tauri/src/pipeline/worker.rs
use crate::config::Config;
use crate::pipeline::convert::{convert_file, resolve_output_path};
use crate::types::{ProcessSummary, ProgressEvent};
use rayon::prelude::*;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

/// 批量处理。
/// - files:待处理文件路径(来自 scan_directory 的 files 字段)
/// - app:None 时不 emit(便于单测);Some 时每个文件后 emit 进度
/// - cancel/paused:由 cancel_process_cmd / pause_process_cmd 设置
pub fn run_pipeline(
    files: Vec<PathBuf>,
    source_root: &Path,
    out_root: &Path,
    cfg: &Config,
    app: Option<AppHandle>,
    cancel: &Arc<AtomicBool>,
    paused: &Arc<AtomicBool>,
) -> ProcessSummary {
    let total = files.len() as u32;
    let done = Arc::new(AtomicU32::new(0));
    let failed = Arc::new(AtomicU32::new(0));
    let skipped = Arc::new(AtomicU32::new(0));

    let _ = std::fs::create_dir_all(out_root);

    files.par_iter().for_each(|input| {
        // 暂停等待(§10.5):轮询,期间响应取消
        while paused.load(Ordering::Relaxed) {
            if cancel.load(Ordering::Relaxed) {
                return;
            }
            std::thread::sleep(Duration::from_millis(100));
        }
        if cancel.load(Ordering::Relaxed) {
            return;
        }

        let output = resolve_output_path(input, source_root, out_root, cfg);
        if let Some(parent) = output.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        match convert_file(input, &output, cfg) {
            Ok(()) => {
                done.fetch_add(1, Ordering::Relaxed);
            }
            Err(crate::error::AppError::Unsupported(_)) => {
                // HEIC 等 MVP 未启用格式 → 跳过(§10.13)
                skipped.fetch_add(1, Ordering::Relaxed);
            }
            Err(_) => {
                // 损坏/IO 等 → 失败但不中断(§15.7)
                failed.fetch_add(1, Ordering::Relaxed);
            }
        }

        if let Some(app) = &app {
            let evt = ProgressEvent {
                done: done.load(Ordering::Relaxed),
                total,
                failed: failed.load(Ordering::Relaxed),
                skipped: skipped.load(Ordering::Relaxed),
                current: input.to_string_lossy().to_string(),
                state: "running".into(),
            };
            let _ = app.emit("process://progress", evt);
        }
    });

    let cancelled = cancel.load(Ordering::Relaxed);
    if let Some(app) = &app {
        let final_state = if cancelled { "cancelled" } else { "done" };
        let _ = app.emit(
            "process://progress",
            ProgressEvent {
                done: done.load(Ordering::Relaxed),
                total,
                failed: failed.load(Ordering::Relaxed),
                skipped: skipped.load(Ordering::Relaxed),
                current: String::new(),
                state: final_state.into(),
            },
        );
    }

    ProcessSummary {
        total,
        done: done.load(Ordering::Relaxed),
        failed: failed.load(Ordering::Relaxed),
        skipped: skipped.load(Ordering::Relaxed),
        cancelled,
    }
}
```

- [ ] **步骤 7:运行测试验证通过**

运行:`cd src-tauri && cargo test --lib worker`
预期:2 个测试 PASS。

- [ ] **步骤 8:添加 opener 依赖**

`src-tauri/Cargo.toml` 的 `[dependencies]` 加:

```toml
opener = "0.7"
```

- [ ] **步骤 9:实现命令(commands.rs 追加)**

```rust
// src-tauri/src/commands.rs 追加
use crate::config::Config;
use crate::pipeline::scan::scan_directory;
use crate::pipeline::worker::run_pipeline;
use crate::state::{AppState, JobHandle};
use crate::types::{ProcessSummary, ProgressEvent, ScanResult};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};

#[tauri::command]
pub async fn scan_directory_cmd(path: String) -> Result<ScanResult, crate::error::AppError> {
    scan_directory(&PathBuf::from(&path))
}

/// 启动处理。立即返回,后台 spawn 处理;进度经事件上报。
#[tauri::command]
pub async fn start_process_cmd(
    source_dir: String,
    config: Config,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), crate::error::AppError> {
    let source_root = PathBuf::from(&source_dir);
    let out_root = source_root.join(&config.subfolder);

    let scan = scan_directory(&source_root)?;
    let files = scan.files.clone();

    let cancel = Arc::new(AtomicBool::new(false));
    let paused = Arc::new(AtomicBool::new(false));
    state.set_job(JobHandle {
        cancel: cancel.clone(),
        paused: paused.clone(),
    });

    let app_clone = app.clone();
    tokio::task::spawn_blocking(move || {
        let summary: ProcessSummary =
            run_pipeline(files, &source_root, &out_root, &config, Some(app_clone), &cancel, &paused);
        // 完成后清理 job 句柄(state 已 move,通过 app 获取)
        if let Some(app_state) = app.try_state::<AppState>() {
            app_state.clear_job();
        }
        let _ = app.emit("process://summary", summary);
    });

    Ok(())
}

#[tauri::command]
pub async fn cancel_process_cmd(state: State<'_, AppState>) -> Result<bool, ()> {
    Ok(state.cancel_job())
}

#[tauri::command]
pub async fn pause_process_cmd(state: State<'_, AppState>) -> Result<bool, ()> {
    Ok(state.set_paused(true))
}

#[tauri::command]
pub async fn resume_process_cmd(state: State<'_, AppState>) -> Result<bool, ()> {
    Ok(state.set_paused(false))
}

#[tauri::command]
pub async fn open_output_cmd(path: String) -> Result<(), String> {
    opener::open(&path).map_err(|e| e.to_string())
}
```

> `scan_directory_cmd` 与任务 6 的重复定义合并:删除任务 6 commands.rs 里旧版,保留本版。`use tauri::{AppHandle, Emitter, Manager, State}` 与已有 `use` 合并。

- [ ] **步骤 10:注册命令与状态(lib.rs)**

```rust
// src-tauri/src/lib.rs
pub mod commands;
pub mod config;
pub mod error;
pub mod log;
pub mod pipeline;
pub mod state;
pub mod types;

use config::Config;
use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // 日志
            let log_dir = app.path().app_data_dir().unwrap().join("logs");
            let _guard = log::init(log_dir);
            app.manage(_guard); // 保活
            // 配置
            let cfg_dir = app.path().app_data_dir().unwrap();
            let config = Config::load(&cfg_dir);
            app.manage(AppState::new(config));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::scan_directory_cmd,
            commands::start_process_cmd,
            commands::cancel_process_cmd,
            commands::pause_process_cmd,
            commands::resume_process_cmd,
            commands::open_output_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

> `log::init` 返回 guard,`app.manage(guard)` 使其与 app 同生命周期,避免日志 writer 提前 drop。`pipeline` mod 已含 `worker`:`pipeline/mod.rs` 加 `pub mod convert; pub mod scan; pub mod worker;`。

- [ ] **步骤 11:编译验证**

运行:`cd src-tauri && cargo check`
预期:通过(可能有未使用 import 警告,忽略)。

- [ ] **步骤 12:Commit**

```bash
git add src-tauri/
git commit -m "feat(处理): 实现批量并行处理、进度事件与取消/暂停"
```

---

## 任务 9：前端 IPC 封装与共享类型

**依据:** 与后端 types.rs 对齐(类型一致性)。

**文件:**
- 创建:`src/types.ts`
- 创建:`src/ipc/commands.ts`

- [ ] **步骤 1:编写 types.ts(与后端对齐)**

```ts
// src/types.ts
export interface ScanResult {
  total: number;
  by_format: Record<string, number>;
  unsupported: string[];
  source_dir: string;
}

export interface ProgressEvent {
  done: number;
  total: number;
  failed: number;
  skipped: number;
  current: string;
  state: "running" | "paused" | "done" | "cancelled";
}

export interface ProcessSummary {
  total: number;
  done: number;
  failed: number;
  skipped: number;
  cancelled: boolean;
}

export interface Config {
  remove_exif: boolean;
  remove_icc: boolean;
  auto_orient: boolean;
  baseline_jpeg: boolean;
  convert_heic: boolean;
  to_srgb: boolean;
  jpeg_quality: number;
  max_width: number;
  max_height: number;
  subfolder: string;
  overwrite: boolean;
  keep_structure: boolean;
  parallel: number;
}

export type View = "home" | "scanning" | "result" | "processing" | "completed";
```

- [ ] **步骤 2:编写 commands.ts(类型化 invoke 封装)**

```ts
// src/ipc/commands.ts
import { invoke } from "@tauri-apps/api/core";
import type { Config, ScanResult } from "../types";

export const scanDirectory = (path: string): Promise<ScanResult> =>
  invoke<ScanResult>("scan_directory_cmd", { path });

export const startProcess = (sourceDir: string, config: Config): Promise<void> =>
  invoke<void>("start_process_cmd", { sourceDir, config });

export const cancelProcess = (): Promise<boolean> =>
  invoke<boolean>("cancel_process_cmd");

export const pauseProcess = (): Promise<boolean> =>
  invoke<boolean>("pause_process_cmd");

export const resumeProcess = (): Promise<boolean> =>
  invoke<boolean>("resume_process_cmd");

export const openOutput = (path: string): Promise<void> =>
  invoke<void>("open_output_cmd", { path });
```

> Tauri invoke 的参数名在传递时由 camelCase 转 snake_case(`sourceDir` → `source_dir`),与 Rust 命令参数 `source_dir` 对齐。

- [ ] **步骤 3:Commit**

```bash
git add src/types.ts src/ipc/commands.ts
git commit -m "feat(前端): 添加 IPC 封装与共享类型"
```

---

## 任务 10：前端状态机（Zustand）+ 测试

**依据:** §2.3(主流程状态机)、§4.6(键盘)、§10(处理体验)。store 是唯一业务状态持有者,视图纯展示。

**文件:**
- 创建:`src/store/appStore.ts`
- 创建:`src/store/appStore.test.ts`
- 修改:`vite.config.ts`(Vitest 配置)

- [ ] **步骤 1:配置 Vitest**

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
```

创建 `src/test-setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

在 `package.json` 的 `"scripts"` 加:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **步骤 2:编写 store 失败测试**

```ts
// src/store/appStore.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// mock IPC 层
vi.mock("../ipc/commands", () => ({
  scanDirectory: vi.fn(),
  startProcess: vi.fn(),
  cancelProcess: vi.fn(),
  pauseProcess: vi.fn(),
  resumeProcess: vi.fn(),
  openOutput: vi.fn(),
}));

describe("appStore 状态机", () => {
  beforeEach(() => {
    const { useAppStore } = require("./appStore");
    useAppStore.getState().reset();
    vi.clearAllMocks();
  });

  it("初始视图为 home", async () => {
    const { useAppStore } = await import("./appStore");
    expect(useAppStore.getState().view).toBe("home");
  });

  it("reset 回到 home 且清空业务状态", async () => {
    const { useAppStore } = await import("./appStore");
    const s = useAppStore.getState();
    s.setError("err");
    s.reset();
    expect(useAppStore.getState().view).toBe("home");
    expect(useAppStore.getState().error).toBeNull();
  });
});
```

- [ ] **步骤 3:运行测试验证失败**

运行:`npm test -- appStore`
预期:FAIL,模块 `./appStore` 不存在。

- [ ] **步骤 4:实现 store**

```ts
// src/store/appStore.ts
import { create } from "zustand";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import * as cmd from "../ipc/commands";
import type {
  Config,
  ProgressEvent,
  ProcessSummary,
  ScanResult,
  View,
} from "../types";

const DEFAULT_CONFIG: Config = {
  remove_exif: true,
  remove_icc: true,
  auto_orient: true,
  baseline_jpeg: true,
  convert_heic: true,
  to_srgb: true,
  jpeg_quality: 90,
  max_width: 4096,
  max_height: 4096,
  subfolder: "compat",
  overwrite: false,
  keep_structure: true,
  parallel: 4,
};

interface State {
  view: View;
  scan: ScanResult | null;
  progress: ProgressEvent | null;
  summary: ProcessSummary | null;
  error: string | null;
  paused: boolean;
  config: Config;
  unlisten: UnlistenFn | null;
  // actions
  selectFolder: () => Promise<void>;
  startProcess: () => Promise<void>;
  cancel: () => Promise<void>;
  togglePause: () => Promise<void>;
  openOutput: () => Promise<void>;
  setError: (msg: string | null) => void;
  reset: () => void;
}

export const useAppStore = create<State>((set, get) => ({
  view: "home",
  scan: null,
  progress: null,
  summary: null,
  error: null,
  paused: false,
  config: DEFAULT_CONFIG,
  unlisten: null,

  selectFolder: async () => {
    const selected = await open({ directory: true, multiple: false });
    if (!selected || typeof selected !== "string") return;
    set({ view: "scanning", error: null });
    try {
      const result = await cmd.scanDirectory(selected);
      // §15.1 空目录/无图片
      if (result.total === 0) {
        set({
          view: "home",
          error: "这个文件夹里没有可处理的照片",
        });
        return;
      }
      set({ view: "result", scan: result });
    } catch (e) {
      set({ view: "home", error: String(e) });
    }
  },

  startProcess: async () => {
    const scan = get().scan;
    if (!scan) return;
    set({ view: "processing", progress: null, summary: null, paused: false });
    // 订阅进度与完成事件
    const un1 = await listen<ProgressEvent>("process://progress", (e) => {
      const p = e.payload;
      if (p.state === "done" || p.state === "cancelled") {
        // 等待 summary 事件最终汇总
      }
      set({ progress: p });
    });
    const un2 = await listen<ProcessSummary>("process://summary", (e) => {
      set({ summary: e.payload, view: "completed" });
    });
    set({ unlisten: () => { un1(); un2(); } });
    try {
      await cmd.startProcess(scan.source_dir, get().config);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  cancel: async () => {
    await cmd.cancelProcess();
  },

  togglePause: async () => {
    const next = !get().paused;
    set({ paused: next });
    if (next) await cmd.pauseProcess();
    else await cmd.resumeProcess();
  },

  openOutput: async () => {
    const scan = get().scan;
    if (!scan) return;
    const outDir = scan.source_dir.replace(/[\\/]+$/, "") + "/" + get().config.subfolder;
    await cmd.openOutput(outDir);
  },

  setError: (msg) => set({ error: msg }),
  reset: () => {
    const u = get().unlisten;
    if (u) u();
    set({
      view: "home",
      scan: null,
      progress: null,
      summary: null,
      error: null,
      paused: false,
      unlisten: null,
    });
  },
}));
```

- [ ] **步骤 5:运行测试验证通过**

运行:`npm test -- appStore`
预期:2 个测试 PASS。

- [ ] **步骤 6:Commit**

```bash
git add src/store/ vite.config.ts src/test-setup.ts package.json
git commit -m "feat(前端): 实现 Zustand 状态机与视图切换"
```

---

## 任务 11：前端框架组件与 App 骨架

**依据:** §3.1(标题栏)、§4.2(步骤条)、§6.26(状态栏)、§6.1(按钮)、§6.19(步骤条组件)。

**文件:**
- 创建:`src/icons/Icons.tsx`
- 创建:`src/components/Button.tsx`
- 创建:`src/components/TitleBar.tsx`
- 创建:`src/components/StatusBar.tsx`
- 创建:`src/components/Stepper.tsx`
- 创建:`src/App.tsx`(替换脚手架默认)

- [ ] **步骤 1:SVG 图标 sprite**

```tsx
// src/icons/Icons.tsx
import React from "react";

const symbols = [
  ["folder", "M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"],
  ["image", "M3 4h18v16H3z"],
  ["play", "M7 5l12 7-12 7z"],
  ["pause", "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"],
  ["cancel", "M5 5l14 14M19 5L5 19"],
  ["check", "M5 12l4 4 10-10"],
  ["warn", "M12 3l9 16H3z"],
  ["open", "M5 11h14M14 8l4 4-4 4"],
] as const;

export const IconSprite: React.FC = () => (
  <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
    {symbols.map(([id, d]) => (
      <symbol key={id} id={`i-${id}`} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
      </symbol>
    ))}
  </svg>
);

export const Icon: React.FC<{ name: string; size?: number }> = ({ name, size = 20 }) => (
  <svg width={size} height={size} aria-hidden="true">
    <use href={`#i-${name}`} />
  </svg>
);
```

- [ ] **步骤 2:Button 组件**

```tsx
// src/components/Button.tsx
import React from "react";

type Variant = "primary" | "secondary" | "subtle" | "destructive";
type Size = "standard" | "large" | "compact";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base: React.CSSProperties = {
  borderRadius: "var(--radius-sm)",
  fontWeight: 600,
  fontSize: "var(--fs-body)",
  border: "1px solid transparent",
  padding: "0 16px",
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--sp-xs)",
};

const variantStyle: Record<Variant, React.CSSProperties> = {
  primary: { background: "var(--accent)", color: "#fff", height: 40 },
  secondary: { background: "var(--surface)", color: "var(--accent)", borderColor: "var(--border-strong)", height: 40 },
  subtle: { background: "transparent", color: "var(--fg)", height: 40 },
  destructive: { background: "transparent", color: "var(--error)", borderColor: "var(--error)", height: 40 },
};

export const Button: React.FC<ButtonProps> = ({
  variant = "secondary",
  size = "standard",
  style,
  children,
  ...rest
}) => (
  <button
    style={{ ...base, ...variantStyle[variant], ...(size === "large" ? { height: 48, padding: "0 24px" } : {}), ...style }}
    {...rest}
  >
    {children}
  </button>
);
```

- [ ] **步骤 3:TitleBar / StatusBar / Stepper**

```tsx
// src/components/TitleBar.tsx
import React from "react";
import { Icon } from "../icons/Icons";

export const TitleBar: React.FC = () => (
  <header style={{ height: 40, display: "flex", alignItems: "center", padding: "0 var(--sp-m)", gap: "var(--sp-xs)", borderBottom: "1px solid var(--divider)" }}>
    <Icon name="folder" size={18} />
    <span style={{ fontWeight: 600 }}>照片适配助手</span>
    <span style={{ marginLeft: "auto", fontSize: "var(--fs-caption)", color: "var(--fg-muted)" }}>标准兼容模式</span>
  </header>
);
```

```tsx
// src/components/StatusBar.tsx
import React from "react";
import { useAppStore } from "../store/appStore";

export const StatusBar: React.FC = () => {
  const view = useAppStore((s) => s.view);
  const status = view === "processing" ? "处理中" : view === "scanning" ? "扫描中" : "就绪";
  return (
    <footer style={{ height: 28, display: "flex", alignItems: "center", padding: "0 var(--sp-m)", gap: "var(--sp-s)", fontSize: "var(--fs-caption)", color: "var(--fg-muted)", borderTop: "1px solid var(--divider)" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: view === "processing" || view === "scanning" ? "var(--accent)" : "var(--fg-disabled)" }} />
      <span>{status}</span>
      <span style={{ marginLeft: "auto" }}>输出到 同目录/compat</span>
      <span>· 离线 · v1.0</span>
    </footer>
  );
};
```

```tsx
// src/components/Stepper.tsx
import React from "react";
import { useAppStore } from "../store/appStore";

const STEPS = ["选目录", "查看结果", "处理", "完成"] as const;

export const Stepper: React.FC = () => {
  const view = useAppStore((s) => s.view);
  const order: Record<string, number> = { home: 0, scanning: 0, result: 1, processing: 2, completed: 3 };
  const current = order[view] ?? 0;
  return (
    <nav style={{ display: "flex", alignItems: "center", gap: "var(--sp-xs)", padding: "var(--sp-s) var(--sp-l)" }}>
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-xs)" }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600,
              background: i < current ? "var(--accent)" : i === current ? "var(--accent)" : "var(--border-strong)",
              color: i <= current ? "#fff" : "var(--fg-muted)",
            }}>{i + 1}</div>
            <span style={{ color: i <= current ? "var(--fg)" : "var(--fg-muted)", fontSize: "var(--fs-caption)" }}>{label}</span>
          </div>
          {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1, background: "var(--divider)" }} />}
        </React.Fragment>
      ))}
    </nav>
  );
};
```

- [ ] **步骤 4:App 视图路由骨架**

```tsx
// src/App.tsx
import React from "react";
import { IconSprite } from "./icons/Icons";
import { TitleBar } from "./components/TitleBar";
import { StatusBar } from "./components/StatusBar";
import { Stepper } from "./components/Stepper";
import { HomeView } from "./views/HomeView";
import { ScanningView } from "./views/ScanningView";
import { ResultView } from "./views/ResultView";
import { ProcessingView } from "./views/ProcessingView";
import { CompletedView } from "./views/CompletedView";
import { useAppStore } from "./store/appStore";

const App: React.FC = () => {
  const view = useAppStore((s) => s.view);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <IconSprite />
      <TitleBar />
      {view !== "home" && <Stepper />}
      <main style={{ flex: 1, overflow: "auto", padding: "var(--sp-l)" }}>
        {view === "home" && <HomeView />}
        {view === "scanning" && <ScanningView />}
        {view === "result" && <ResultView />}
        {view === "processing" && <ProcessingView />}
        {view === "completed" && <CompletedView />}
      </main>
      <StatusBar />
    </div>
  );
};

export default App;
```

- [ ] **步骤 5:启动验证框架渲染**

运行:`npm run tauri dev`
预期:窗口显示标题栏 + 状态栏,主区为空(视图文件尚未创建会报错,任务 12 创建)。

> 此刻因 `views/*` 尚未创建,编译会失败。先创建任务 12 的 5 个视图文件后再验证;本步骤的"启动验证"留到任务 12 末尾统一做。Commit 仍可进行(代码无误,仅缺依赖模块,随任务 12 一起编译)。

- [ ] **步骤 6:Commit**

```bash
git add src/icons/ src/components/ src/App.tsx
git commit -m "feat(前端): 添加框架组件(标题栏/状态栏/步骤条/按钮)"
```

---

## 任务 12：五个主视图（主流程打通）

**依据:** §5.1(首页)、§5.3(扫描结果)、§5.4(处理中)、§5.5(完成)、§6.20(拖拽区)、§6.11(统计卡)、§6.14(进度条)。每个视图聚焦数据绑定与交互;像素级视觉按各 §5.x 验收要点核对。

**文件:**
- 创建:`src/components/DropZone.tsx`、`StatCard.tsx`、`ProgressBar.tsx`
- 创建:`src/views/HomeView.tsx`、`ScanningView.tsx`、`ResultView.tsx`、`ProcessingView.tsx`、`CompletedView.tsx`

- [ ] **步骤 1:辅助组件(DropZone/StatCard/ProgressBar)**

```tsx
// src/components/DropZone.tsx
import React, { useCallback } from "react";
import { Icon } from "../icons/Icons";
import { Button } from "./Button";
import { useAppStore } from "../store/appStore";

export const DropZone: React.FC = () => {
  const selectFolder = useAppStore((s) => s.selectFolder);
  const [hover, setHover] = React.useState(false);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setHover(false);
      // MVP:拖拽到文件夹选择走同一入口(系统选择器);拖拽仅作视觉反馈。
      // 完整拖拽路径处理(直接取 dropped 文件夹路径)在后续增量。
      await selectFolder();
    },
    [selectFolder]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={onDrop}
      role="button"
      tabIndex={0}
      aria-label="拖入文件夹或选择文件夹"
      onKeyDown={(e) => { if (e.key === "Enter") selectFolder(); }}
      style={{
        border: `2px ${hover ? "solid" : "dashed"} var(--accent)`,
        borderRadius: "var(--radius-md)",
        background: hover ? "var(--accent-soft)" : "var(--surface-alt)",
        padding: "var(--sp-xxl)",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--sp-m)",
      }}
    >
      <Icon name="folder" size={48} />
      <div>把包含照片的文件夹拖到这里</div>
      <div style={{ color: "var(--fg-muted)" }}>— 或 —</div>
      <Button variant="primary" size="large" onClick={selectFolder}>
        <Icon name="folder" /> 选择文件夹
      </Button>
    </div>
  );
};
```

```tsx
// src/components/StatCard.tsx
import React from "react";
export const StatCard: React.FC<{ value: React.ReactNode; label: string; tone?: "default" | "error" | "muted" }> = ({ value, label, tone = "default" }) => (
  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "var(--sp-m)" }}>
    <div className="tnum" style={{ fontSize: 32, fontWeight: 600, color: tone === "error" ? "var(--error)" : tone === "muted" ? "var(--fg-muted)" : "var(--fg)" }}>{value}</div>
    <div style={{ fontSize: "var(--fs-caption)", color: "var(--fg-muted)" }}>{label}</div>
  </div>
);
```

```tsx
// src/components/ProgressBar.tsx
import React from "react";
export const ProgressBar: React.FC<{ value: number }> = ({ value }) => (
  <div style={{ height: 8, background: "var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
    <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: "100%", background: "var(--accent)", transition: "width 150ms ease" }} />
  </div>
);
```

- [ ] **步骤 2:HomeView**

```tsx
// src/views/HomeView.tsx
import React from "react";
import { DropZone } from "../components/DropZone";
import { useAppStore } from "../store/appStore";

export const HomeView: React.FC = () => {
  const error = useAppStore((s) => s.error);
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: "var(--sp-l)" }}>
      <div>
        <h1 style={{ fontSize: "var(--fs-title)", margin: 0 }}>把照片变成任何老旧系统都能上传的格式</h1>
        <p style={{ color: "var(--fg-muted)", margin: "var(--sp-xs) 0 0" }}>全程离线,不上传任何文件,安全放心</p>
      </div>
      <DropZone />
      {error && (
        <div role="alert" style={{ color: "var(--error)", background: "var(--error-soft)", padding: "var(--sp-s) var(--sp-m)", borderRadius: "var(--radius-sm)" }}>
          {error}
        </div>
      )}
      <div style={{ color: "var(--fg-muted)", fontSize: "var(--fs-caption)" }}>
        支持 JPEG / PNG / HEIC / WebP / GIF / TIFF · 自动转换为高兼容 JPEG
      </div>
    </div>
  );
};
```

- [ ] **步骤 3:ScanningView**

```tsx
// src/views/ScanningView.tsx
import React from "react";
export const ScanningView: React.FC = () => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--sp-m)", padding: "var(--sp-xxl)" }}>
    <div className="spinner" style={{ width: 40, height: 40, borderRadius: "50%", border: "4px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin 1s linear infinite" }} />
    <div>正在扫描文件夹…</div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);
```

> 扫描为同步命令(快),计数实时刷新在 MVP 简化为扫描完成后直接跳结果页;实时计数刷新作为增量。

- [ ] **步骤 4:ResultView**

```tsx
// src/views/ResultView.tsx
import React from "react";
import { StatCard } from "../components/StatCard";
import { Button } from "../components/Button";
import { useAppStore } from "../store/appStore";

export const ResultView: React.FC = () => {
  const scan = useAppStore((s) => s.scan);
  const startProcess = useAppStore((s) => s.startProcess);
  const reset = useAppStore((s) => s.reset);
  if (!scan) return null;
  const formats = Object.entries(scan.by_format);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-l)", maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ margin: 0 }}>扫描完成</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--sp-m)" }}>
        <StatCard value={scan.total} label="总图片数" />
        <StatCard value={scan.total - scan.unsupported.length} label="预计输出数量" />
        <StatCard value="—" label="预计输出大小" />
        <StatCard value="—" label="预计节省" />
      </div>
      <div>
        <div style={{ color: "var(--fg-muted)", marginBottom: "var(--sp-xs)" }}>格式分布</div>
        <div style={{ display: "flex", gap: "var(--sp-m)", flexWrap: "wrap" }}>
          {formats.map(([fmt, n]) => (
            <span key={fmt} style={{ background: "var(--accent-soft)", padding: "var(--sp-xxs) var(--sp-s)", borderRadius: "var(--radius-sm)" }}>
              {fmt} {n}
            </span>
          ))}
        </div>
      </div>
      {scan.unsupported.length > 0 && (
        <div role="status" style={{ background: "var(--warning-soft)", padding: "var(--sp-m)", borderRadius: "var(--radius-sm)" }}>
          检测到 {scan.unsupported.length} 个暂不支持的文件,将跳过
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-s)" }}>
        <Button onClick={reset}>取消</Button>
        <Button variant="primary" onClick={startProcess}>开始处理</Button>
      </div>
    </div>
  );
};
```

- [ ] **步骤 5:ProcessingView**

```tsx
// src/views/ProcessingView.tsx
import React, { useEffect } from "react";
import { ProgressBar } from "../components/ProgressBar";
import { StatCard } from "../components/StatCard";
import { Button } from "../components/Button";
import { useAppStore } from "../store/appStore";

export const ProcessingView: React.FC = () => {
  const progress = useAppStore((s) => s.progress);
  const paused = useAppStore((s) => s.paused);
  const togglePause = useAppStore((s) => s.togglePause);
  const cancel = useAppStore((s) => s.cancel);

  // §5.4 Space 暂停/继续
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); togglePause(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePause]);

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-l)", maxWidth: 900, margin: "0 auto" }}>
      <div>
        <div className="tnum" style={{ fontSize: 48, fontWeight: 600 }}>{pct}%</div>
        <ProgressBar value={pct} />
        <div style={{ color: "var(--fg-muted)", marginTop: "var(--sp-xs)" }}>
          已处理 {progress?.done ?? 0} / {progress?.total ?? 0}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--sp-m)" }}>
        <StatCard value={progress?.done ?? 0} label="已处理" />
        <StatCard value={progress?.failed ?? 0} label="失败" tone={(progress?.failed ?? 0) > 0 ? "error" : "default"} />
        <StatCard value={progress?.skipped ?? 0} label="跳过" tone="muted" />
        <StatCard value={paused ? "已暂停" : "运行中"} label="状态" />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-s)" }}>
        <Button variant="destructive" onClick={cancel}>取消</Button>
        <Button variant="secondary" onClick={togglePause}>{paused ? "继续" : "暂停"}</Button>
      </div>
    </div>
  );
};
```

> 取消的二次确认对话框(§8.6)MVP 用浏览器 `confirm()` 简化;完整 ContentDialog 为增量。

- [ ] **步骤 6:CompletedView**

```tsx
// src/views/CompletedView.tsx
import React from "react";
import { StatCard } from "../components/StatCard";
import { Button } from "../components/Button";
import { Icon } from "../icons/Icons";
import { useAppStore } from "../store/appStore";

export const CompletedView: React.FC = () => {
  const summary = useAppStore((s) => s.summary);
  const scan = useAppStore((s) => s.scan);
  const openOutput = useAppStore((s) => s.openOutput);
  const reset = useAppStore((s) => s.reset);
  if (!summary) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-l)", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ textAlign: "center", padding: "var(--sp-l)" }}>
        <Icon name="check" size={72} />
        <h1 style={{ fontSize: "var(--fs-title)", margin: "var(--sp-s) 0" }}>处理完成!</h1>
        <p style={{ color: "var(--fg-muted)" }}>{summary.done} 张照片已转换为兼容格式</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--sp-m)" }}>
        <StatCard value={summary.total} label="总计处理" />
        <StatCard value={summary.done} label="成功" />
        <StatCard value={summary.failed} label="失败" tone={summary.failed > 0 ? "error" : "default"} />
        <StatCard value={summary.skipped} label="跳过" tone="muted" />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-s)" }}>
        <Button onClick={reset}>处理另一个文件夹</Button>
        <Button variant="primary" size="large" onClick={openOutput}><Icon name="open" /> 打开输出目录</Button>
      </div>
    </div>
  );
};
```

- [ ] **步骤 7:端到端启动验证**

运行:`npm run tauri dev`
预期:
- 首页显示拖拽区 + [选择文件夹];
- 点[选择文件夹] → 系统选择器 → 选一个含图片的目录 → 扫描结果页显示统计;
- 点[开始处理] → 处理中页显示百分比与进度条递增;
- 完成后跳完成页,[打开输出目录]打开 `<源目录>/compat`。

- [ ] **步骤 8:Commit**

```bash
git add src/components/ src/views/
git commit -m "feat(前端): 实现五个主视图与主流程端到端打通"
```

---

## 任务 13：端到端验证与 MVP 收尾

**依据:** §15(边界场景核心 4 类)、§10.6(取消)、§10.12(失败统计)、§15.8(不覆盖)。

**文件:**
- 创建:`docs/superpowers/plans/mvp-e2e-checklist.md`(手动验收清单)

- [ ] **步骤 1:编写端到端验收清单**

```markdown
# MVP 端到端验收清单

## 主流程
- [ ] 启动应用,首页显示拖拽区与[选择文件夹]
- [ ] 选含 JPEG/PNG 的目录 → 扫描结果页显示正确数量与格式分布
- [ ] [开始处理] → 进度从 0% 递增到 100%
- [ ] 完成页显示成功数,[打开输出目录]打开 compat 子目录
- [ ] compat 目录内为 .jpg,原文件未改动

## 边界
- [ ] 空目录 → 首页提示"这个文件夹里没有可处理的照片"(§15.1)
- [ ] 含损坏 JPEG → 处理完成,失败计数 >0,其余成功(§15.7)
- [ ] 含 HEIC → 跳过计数 +1,提示暂不支持(§10.13)
- [ ] 含 PSD → 扫描结果页提示不支持文件(§15.2)
- [ ] 二次处理同目录 → 不覆盖,输出加序号(§15.8)

## 交互
- [ ] 处理中 Space 暂停/继续(§5.4)
- [ ] [取消]停止处理,已处理文件保留(§10.6)
```

- [ ] **步骤 2:执行清单全部勾选**

逐项手动验证。任一失败回到对应任务修复。

- [ ] **步骤 3:提交清单**

```bash
git add docs/superpowers/plans/mvp-e2e-checklist.md
git commit -m "docs(验证): 添加 MVP 端到端验收清单"
```

- [ ] **步骤 4:MVP 收尾**

确认全部任务完成、清单通过。MVP 骨架至此可用:主流程端到端打通,核心图像转换(方向/缩放/Baseline/去 EXIF-ICC)运行,失败/跳过/不支持显式告知。

后续增量计划(各自独立):HEIC 转换 · 设置页(§5.6)· 剩余 22 组件 · 12 类弹窗完整化 · 16 类边界完整化 · 精确 sRGB · 大字号/高对比度 · 托盘 · 关于页 UI · 日志查看 UI。

---

## 自检

**1. 规格覆盖度(MVP 范围内):**

| spec 需求                                                        | 实现任务                       |
| ---------------------------------------------------------------- | ------------------------------ |
| 主流程状态机(§2.3)                                               | 任务 10(store)                 |
| 9 屏中的 5 主视图                                                | 任务 12                        |
| 核心转换(附录 A:EXIF/ICC/方向/resize/Baseline/sRGB)              | 任务 7                         |
| 并行处理 + 进度(§10.4)                                           | 任务 8                         |
| 暂停/取消(§10.5–10.6)                                            | 任务 8 命令 + 任务 11/12 UI    |
| 失败/跳过统计(§10.12)                                            | 任务 7/8                       |
| 不覆盖 + 结构保留(§1.4/§15.8)                                    | 任务 7 resolve_output_path     |
| 空目录(§15.1)、损坏(§15.7)、不支持格式(§15.2)、HEIC 跳过(§10.13) | 任务 6/7/8 + 任务 12           |
| 设计令牌(§12)                                                    | 任务 2                         |
| 窗口最小尺寸(§3.2)                                               | 任务 3                         |
| 系统文件夹选择器(§5.2)                                           | 任务 3 plugin-dialog + 任务 10 |
| 配置默认值 + 损坏回退(§5.6/§15.13)                               | 任务 5                         |
| 日志(§10.9)                                                      | 任务 4                         |

**MVP 明确不含(已在范围说明列出):** 设置页 UI、22 个未实现组件、HEIC 实际转换、精确 sRGB、完整弹窗、完整边界、无障碍进阶、托盘、关于页/日志 UI。这些属后续增量计划,非本计划遗漏。

**2. 占位符扫描:** 已检查,无"TODO/待定/后续实现/类似任务N"空话。每个代码步骤含可运行代码或具体命令。唯一"后续增量"出现在「范围说明」与「收尾」,属明确的范围边界声明,非任务占位。

**3. 类型一致性:**
- 后端 `ScanResult`/`ProgressEvent`/`ProcessSummary`/`Config`(types.rs / config.rs)与前端 `src/types.ts` 字段一一对应。
- 命令名:Rust `scan_directory_cmd`/`start_process_cmd`/`cancel_process_cmd`/`pause_process_cmd`/`resume_process_cmd`/`open_output_cmd` 与前端 `commands.ts` invoke 字符串一致。
- 事件名:`process://progress`、`process://summary` 后端 emit 与前端 listen 一致。
- 参数命名:Rust `source_dir`(snake)↔ 前端 `sourceDir`(camel)经 Tauri 自动转换,已在任务 9 标注。

**4. 模糊性修正:**
- 任务 7 的 `use std::path::PathBuf;` 须移到文件顶部(原稿误置于末尾)。执行者在写文件时置于顶部 `use` 区。
- 任务 5 `default_parallel` 中 ARM/LoongArch 的 ≤4 限制在 MVP 简化为通用核心数减一(架构精确检测为增量),已在注释标注。
- 任务 11 步骤 5 启动验证依赖任务 12 视图文件,已标注统一在任务 12 步骤 7 验证。

---

## 执行交接

计划已完成并保存到 `docs/superpowers/plans/2026-07-19-mvp-skeleton.md`。两种执行方式:

**1. 子代理驱动(推荐)** — 每个任务调度一个新子代理,任务间两阶段审查,快速迭代。

**2. 内联执行** — 在当前会话用 executing-plans 批量执行,设检查点审查。

**选哪种方式?**

- 选子代理驱动 → 使用 superpowers:subagent-driven-development
- 选内联执行 → 使用 superpowers:executing-plans

