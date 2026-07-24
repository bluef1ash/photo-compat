# Backend 后端规则

> 子目录规则,补充根 [AGENTS.md](../AGENTS.md)(项目级约束见根)。后端:Tauri 2.x + Rust。

## 目录结构

```
src/
├── main.rs              入口(调 lib::run)
├── lib.rs               Tauri Builder + 命令注册 + setup(日志/配置/AppState)
├── error.rs             AppError(7 变体 + From<io::Error> + serde 给前端)
├── log.rs               tracing + appender 初始化(返回 WorkerGuard)
├── config.rs            Config 默认值 + JSON 读写 + 损坏回退
├── state.rs             AppState(Config + 当前 JobHandle)
├── types.rs             ScanResult / ProgressEvent / ProcessSummary / ProgressState
├── commands.rs          #[tauri::command] 薄适配层
└── pipeline/
    ├── mod.rs
    ├── scan.rs          目录遍历 + 格式识别 + 统计(不碰像素)
    ├── convert.rs       单文件像素转换(无 I/O 状态)
    └── worker.rs        批量编排(Rayon 并行 + 进度 + 取消/暂停)
```

## 模块职责(边界,勿越界)

- `pipeline/scan.rs`:遍历 + 识别 + 统计,**不碰像素**
- `pipeline/convert.rs`:单文件 decode→orient→resize→encode,**无 I/O 状态**
- `pipeline/worker.rs`:编排(并行 + 进度 + 取消/暂停),调 scan/convert
- `commands.rs`:Tauri 与业务**薄适配层**,不含业务逻辑

## 命令(#[tauri::command])

- 命名 `xxx_cmd` 后缀;`async`;参数 snake_case(前端 invoke camelCase 自动转)
- invoke 契约与前端 `frontend/src/types.ts` + `ipc/commands.ts` 对齐
- 事件:`emit "process://progress"` / `"process://summary"`;`AppHandle: Send + Sync`,`par_iter` 并发 emit 安全

## 错误(AppError)

- 7 变体:`DirAccess` / `Permission` / `DiskFull` / `Corrupt` / `Unsupported` / `Io` / `Internal`
- `From<io::Error>` 按 `ErrorKind` 分流;`#[serde(tag = "kind", content = "message")]` 给前端路由四段弹窗
- 失败**不中断主流程**(§15.7);`Unsupported`→跳过计数(§10.13 HEIC MVP 跳过)
- **HEIC**:由 cargo `heic` 特性门控（默认关）。启用 `--features heic` 后经 libheif 的 `image` 解码钩子复用本管线；未启用或 `convert_heic=false` 时按 `Unsupported` 跳过。

## 原生依赖(编译期)

- **lcms2**(始终启用,`to_srgb` 色彩转换):`lcms2-sys` `static` 特性用 `cc` 从源码静态编译,仅需 C 编译器,无系统库要求。
- **libheif**(可选 `heic` 特性):`embedded-libheif` 从内置源码用 **cmake** 编译。Linux 需 `cmake`+`g++`(首次联网拉 libde265/aom);Windows(MSVC) 走 vcpkg。详见根 README「编译依赖」。

## 并发

- `Rayon par_iter` 文件级并行;`Arc<AtomicBool>` cancel/paused,worker 每项检查
- 暂停轮询期间响应 cancel(不死锁)

## 配置与日志

- `Config` 默认值(附录 A:兼容全开 / JPEG 90 / 4096px / `compat` 子目录不覆盖);JSON 持久化;损坏 `unwrap_or_default` 回退(§15.13)
- `tracing` + `tracing-appender` 按天滚动;`WorkerGuard` 在 setup `app.manage` 保活
- 默认值**不可改**:输出 `/compat` 不覆盖;并行架构自适应(x86 核心数-1,ARM/LoongArch 保守;MVP 由 rayon 默认控制,`config.parallel` 字段未生效)

## 测试

- `cargo test --lib`;**TDD**(先写测试 RED → 实现 GREEN)
- worker 测试用 `Option<AppHandle>`(None 不 emit)或泛型 `run_pipeline_internal` 避开 Tauri 运行时依赖

## 常用命令

- `cargo check`
- `cargo test --lib`
- 整项目 dev:`cargo tauri dev`(从 backend/ 跑;beforeDevCommand 在 project root 执行)
