# PhotoCompat · 照片适配助手

把一个目录里的图片批量转成老旧政务/医疗/教育系统能上传的标准 JPEG——移除 EXIF/ICC、修正方向、转换 HEIC、限制尺寸、统一 sRGB。全程离线，不联网、不上传任何文件。

## 技术栈

- **框架**: Tauri 2.x（Rust 后端 + WebView 前端）
- **前端**: React 19 + TypeScript + Vite + Zustand + **MUI（@mui/material）** 作 UI 组件库；Tailwind v4 仅作令牌桥（`@theme inline` 反向引用 MUI 生成的 `--mui-palette-*` 变量），不作为主样式手段
- **后端**: Rust（image / kamadak-exif / rayon / walkdir / tracing）
- **目标平台**: Windows 10 (1809+) / Windows 11（P0）· Linux 信创 UOS/麒麟/deepin（P1）· 社区 Ubuntu/Debian/Fedora（P2）

## 设计语言

前端采用 **Material Design（MUI）**：强调色 Material Blue（Light `#1976D2` / Dark `#4CC2FF`）；圆角偏大（按钮 pill / 卡片 12px / 对话框 16px）；字重 400/500/600。设计令牌经 MUI `extendTheme` 统一生成，Tailwind 仅桥接引用，主样式走 MUI `sx` 与主题覆盖。

## 目录结构

```
photo-compat/
├── backend/          Rust 后端（Tauri commands + pipeline）
│   └── src/
│       ├── commands.rs        Tauri 命令薄适配层
│       ├── config.rs          配置默认值 + JSON 持久化
│       ├── error.rs           AppError（7 变体）
│       └── pipeline/          scan → convert → worker 编排
└── frontend/         React 前端（MUI）
    └── src/
        ├── views/             主流程视图（Home/Scanning/Result/Processing/Completed/Settings）
        ├── components/        复用组件
        ├── store/             Zustand 单一业务状态源
        ├── ipc/               Tauri invoke 封装
        └── global.css         唯一样式入口（Tailwind import + @theme 桥接）
```

## 开发

```bash
# 前端
cd frontend && pnpm install && pnpm run dev

# 整项目（Tauri dev，自动拉起前端）
cd backend && cargo tauri dev

# 测试
cd backend && cargo test --lib        # 后端
cd frontend && pnpm test              # 前端（vitest）
```

## 约束

详见 [AGENTS.md](AGENTS.md)、[backend/AGENTS.md](backend/AGENTS.md)、[frontend/AGENTS.md](frontend/AGENTS.md)。
