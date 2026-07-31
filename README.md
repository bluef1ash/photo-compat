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

## 编译依赖（原生库）

部分图像处理能力依赖原生 C/C++ 库，由 Rust 构建脚本自动拉取编译，**无需手动安装系统库**，但需要对应的编译工具链。

### 色彩转换（lcms2，始终启用）

`to_srgb` 色彩空间转换依赖 [lcms2](https://crates.io/crates/lcms2)，其 `static` 特性用 `cc` crate 从源码静态编译。仅需一个 **C 编译器**（Windows 自带 MSVC、Linux 用 gcc/clang），无任何系统包要求，三端（含信创龙芯/飞腾）开箱即用。

### HEIC 转换（libheif，可选 `heic` 特性）

HEIC/HEIF 解码依赖 [libheif](https://github.com/niclaslindberg/libheif-rs)，**默认不启用**，以保证默认构建在三端都能直接编译。启用方式：

```bash
cd backend && cargo tauri dev --features heic      # 开发
cd backend && cargo tauri build --features heic    # 发布
```

`heic` 特性开启 `embedded-libheif`：从 `libheif-sys` 内置源码用 **cmake** 编译 libheif，并把编解码器（libde265 解 HEVC、aom 等）作为子项目一并编译。

| 平台                                       | 编译要求                      | 安装/准备                                                                                                      |
| ------------------------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Linux**（含信创 UOS/麒麟/deepin/Ubuntu） | `cmake` + C++ 编译器（C++17） | Debian 系：`sudo apt-get install -y cmake g++`；Fedora/RHEL：`sudo dnf install -y cmake gcc-c++`               |
| **Windows (MSVC)**                         | 走 vcpkg 安装 libheif         | 在 `backend/` 下 `cargo install cargo-vcpkg && cargo vcpkg build`（首次联网下载并编译 vcpkg 版 libheif，较慢） |

> ⚠️ **Linux 首次编译需联网**：libheif 的 cmake 会用 `FetchContent` 拉取 libde265/aom 等编解码器源码再本地编译，首次耗时约 10–20 分钟（之后有缓存）。**离线/信创内网环境**若无法联网，可改用系统包：`sudo apt-get install -y libheif-dev`（≥1.17，会自动带上 libde265/libaom），但当前 `heic` 特性固定走 `embedded-libheif`，如需对接系统 libheif 请单独评估。
>
> 未启用 `heic` 特性时，HEIC/HEIF 文件会按「不支持」诚实跳过，其余格式（含色彩转换）功能不受影响。

## 发布（GitHub Actions）

推送 `v*` tag（如 `v0.2.0`）触发 `.github/workflows/release.yml` 多平台打包并发布 Release。版本号取自 tag（去掉 `v` 前缀）并同步进 `backend/tauri.conf.json`，安装包与 Release 资产文件名中的版本随之变化，无需手动改版本号；手动触发时沿用仓库当前版本。

安装后的应用名与快捷方式为「照片适配助手」（`productName`），可执行文件名保持英文 `photo-compat`（`mainBinaryName`）；Release 资产上传名固定为英文 `photo-compat-<版本>-<平台>-<架构>-<类型>...`，避免中文文件名在旧下载/解压工具中出现编码问题。

## 约束

详见 [AGENTS.md](AGENTS.md)、[backend/AGENTS.md](backend/AGENTS.md)、[frontend/AGENTS.md](frontend/AGENTS.md)。
