# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

照片 EXIF 兼容化桌面工具(代号 PhotoCompat / 照片适配助手)。**只做一件事**:把一个目录里的图片批量转成老旧政务/医疗/教育系统能上传的标准 JPEG——移除 EXIF/ICC、修正方向、转换 HEIC、限制尺寸、统一 sRGB。它不是图像编辑器,不是云相册,不是 AI 工具。

## 当前状态

⚠️ 项目处于**设计阶段,尚无任何源码**。仓库现有:

- `design/照片兼容化工具-UI设计规范.md` — 完整 UI/UX 设计规范(v1.0),**是实现 UI/交互的唯一权威依据**。包含视觉令牌、9 个屏幕设计、组件规范、错误处理矩阵、兼容性选项词典
- `design/index.html` — 设计稿高保真原型(单文件 HTML,可直接浏览器打开预览)
- `.gitignore` — 已按 Cargo/Rust 项目模板配置(Tauri 后端是 Rust)

**当开始搭建工程骨架后,本文件须补充 build / lint / test / 运行单个测试 等命令。**

## 预定技术栈

- **框架**: Tauri 2.x(Rust 后端 + WebView 前端)
- **前端**: React + TypeScript
- **目标平台**: Windows 10 (1809+) / Windows 11(P0 主平台)· Linux 信创 UOS/麒麟/deepin(P1)· 社区 Ubuntu/Debian/Fedora(P2)。macOS 不在本期范围
- **WebView**: Windows 依赖 WebView2,Linux 依赖 webkit2gtk;**三端共用同一套 React 组件与样式,UI 代码不为内核分叉**

## 核心设计原则(实现 UI/交互时必须遵守)

来自设计规范 §1-§2。任何交互实现都不得违背,违背即偏离产品定位:

1. **确定性** — 处理前显示预估数量与体积,处理中显示进度,处理后显示明确清单,绝不"惊喜"
2. **安全感** — 默认绝不破坏原始数据(输出到子目录、不覆盖、保留结构);危险操作永远二次确认
3. **诚实** — 不支持的格式、损坏文件、失败项全部显式告知并记录,绝不静默跳过
4. **极简心智** — 单一主路径、无侧栏、无多标签、无专业术语

**三次点击原则(上限,非目标)**:从打开应用到打开输出目录,核心操作不超过 3 次点击,拖拽路径压到 2 次。把步骤加到 4 次以上的设计要被质疑。

## 关键架构决策(需跨文件理解的部分)

- **不用 Fluent `NavigationView` 常驻侧栏**。这是线性流水线工具,不是多功能应用。主流程用**顶部步骤条**承载:① 选目录 → ② 查看结果 → ③ 处理 → ④ 完成。步骤可回退但**不可跳跃前进**(未扫描不能直接处理)。
- **设置 / 关于 / 日志**通过右上 `⋯` 溢出菜单进入,不进步骤条。
- **跨平台一致**:界面三端长得一样(设计令牌统一),原生能力(文件夹选择器、打开目录、托盘、通知)走各平台系统 API(Win = Win32;Linux = GTK)。**禁止**为 Linux 单独做 GTK/Qt 风格外观。
- **离线即信任**:界面任何位置不出现"登录 / 云 / 上传 / AI / 智能"等字样。状态栏常驻"离线"标识。**不引入网络字体**,全部用系统预装字体。

## 视觉系统硬约束(摘自 §5-§10)

- 设计令牌(color / spacing / type / elevation)应抽取为设计系统常量统一管理
- **间距基于 4px 栅格**,禁止 5/7/10 等游离值。令牌: `xxs=4 xs=8 s=12 m=16 l=24 xl=32 xxl=48`
- 强调色默认 Fluent 系统蓝 `#0067C0`(Light)/ `#4CC2FF`(Dark)。**不用品牌橙红 `#f54900` 作默认强调色**(持续传递警告信号,破坏安全感),仅作可选自定义色提供
- **字重只用 Regular 400 与 Semibold 600**,不用 Bold 700(Fluent 体系以 Semibold 表强调)
- 字体栈按平台回退:Windows → Segoe UI Variable + 微软雅黑 UI;Linux → Cantarell + 思源黑体/Noto Sans CJK SC
- 圆角:按钮/输入框 4px,卡片/对话框/面板/拖拽区 8px

## 默认行为约束(产品默认值,实现时不可改)

- **输出**: 默认到源目录 `/compat` 子文件夹,保留原文件夹结构,不覆盖同名文件
- **兼容选项默认全开**: 移除 EXIF、移除 ICC、自动修正方向、转 Baseline JPEG、转换 HEIC、转 sRGB;JPEG 质量 90;最大宽高 4096px
- **性能按 CPU 架构自适应**: x86_64 用 CPU 核心数;ARM(鲲鹏/飞腾)/ LoongArch(龙芯)默认并行数 min(核心数,4)且留 1 核给系统、内存上限取系统内存 50%、大图采样**强制开不可关**(防 OOM)。程序自动判断架构,**不暴露架构选择给用户**
- **无障碍是一等需求**(目标用户含大量中老年/视力受限群体):状态编码**不依赖颜色**(图标+文字双重编码),键盘 100% 可达且逻辑 Tab 顺序符合阅读顺序,对比度达 WCAG AA,提供 标准/大/超大 字号

## 跨平台实现注意点

- Linux 信创字体回退栈须含思源/Noto CJK;文案**避免生僻字**(部分老国产系统缺字)
- **Wayland**: 全局快捷键仅窗口激活态生效,失焦不注册(规避 Wayland 权限复杂度);自绘标题栏走 CSD
- **托盘**: 探测顺序 AppIndicator → SNI → XEmbed,命中任一即启用;全部缺失(如纯 GNOME)则**完全隐藏**托盘相关 UI 并降级为应用内 Toast
- 路径分隔符内部用平台原生处理,UI 展示保留用户习惯(Windows 反斜杠 `\`,Linux 正斜杠 `/`)
- 需为龙芯(LoongArch)/ 飞腾 / 鲲鹏(ARM)出对应架构安装包(信创国产 CPU)

## 支持的图片格式

JPEG / PNG / WebP / GIF / BMP / TIFF / HEIC。不支持格式(如 PSD / RAW)显式跳过并告知用户(见设计规范屏幕八)。

<!-- superpowers-zh:begin (do not edit between these markers) -->
# Superpowers-ZH 中文增强版

本项目已安装 superpowers-zh 技能框架（20 个 skills）。

## 核心规则

1. **收到任务时，先检查是否有匹配的 skill** — 哪怕只有 1% 的可能性也要检查
2. **设计先于编码** — 收到功能需求时，先用 brainstorming skill 做需求分析
3. **测试先于实现** — 写代码前先写测试（TDD）
4. **验证先于完成** — 声称完成前必须运行验证命令

## 可用 Skills

Skills 位于 `.claude/skills/` 目录，每个 skill 有独立的 `SKILL.md` 文件。

- **brainstorming**: 在任何创造性工作之前必须使用此技能——创建功能、构建组件、添加功能或修改行为。在实现之前先探索用户意图、需求和设计。
- **chinese-code-review**: 中文 review 沟通参考——话术模板、分级标注（必须修复/建议修改/仅供参考）、国内团队常见反模式应对。仅在用户显式 /chinese-code-review 时调用，不要根据上下文自动触发。
- **chinese-commit-conventions**: 中文 commit 与 changelog 配置参考——Conventional Commits 中文适配、commitlint/husky/commitizen 中文模板、conventional-changelog 中文配置。仅在用户显式 /chinese-commit-conventions 时调用，不要根据上下文自动触发。
- **chinese-documentation**: 中文文档排版参考——中英文空格、全半角标点、术语保留、链接格式、中文文案排版指北约定。仅在用户显式 /chinese-documentation 时调用，不要根据上下文自动触发。
- **chinese-git-workflow**: 国内 Git 平台配置参考——Gitee、Coding.net、极狐 GitLab、CNB 的 SSH/HTTPS/凭据/CI 接入差异与镜像同步配置。仅在用户显式 /chinese-git-workflow 时调用，不要根据上下文自动触发。
- **dispatching-parallel-agents**: 当面对 2 个以上可以独立进行、无共享状态或顺序依赖的任务时使用
- **executing-plans**: 当你有一份书面实现计划需要在单独的会话中执行，并设有审查检查点时使用
- **finishing-a-development-branch**: 当实现完成、所有测试通过、需要决定如何集成工作时使用——通过提供合并、PR 或清理等结构化选项来引导开发工作的收尾
- **mcp-builder**: MCP 服务器构建方法论 — 系统化构建生产级 MCP 工具，让 AI 助手连接外部能力
- **receiving-code-review**: 收到代码审查反馈后、实施建议之前使用，尤其当反馈不明确或技术上有疑问时——需要技术严谨性和验证，而非敷衍附和或盲目执行
- **requesting-code-review**: 完成任务、实现重要功能或合并前使用，用于验证工作成果是否符合要求
- **subagent-driven-development**: 当在当前会话中执行包含独立任务的实现计划时使用
- **systematic-debugging**: 遇到任何 bug、测试失败或异常行为时使用，在提出修复方案之前执行
- **test-driven-development**: 在实现任何功能或修复 bug 时使用，在编写实现代码之前
- **using-git-worktrees**: 当需要开始与当前工作区隔离的功能开发，或在执行实现计划之前使用——通过原生工具或 git worktree 回退机制确保隔离工作区存在
- **using-superpowers**: 在开始任何对话时使用——确立如何查找和使用技能，要求在任何响应（包括澄清性问题）之前调用 Skill 工具
- **verification-before-completion**: 在宣称工作完成、已修复或测试通过之前使用，在提交或创建 PR 之前——必须运行验证命令并确认输出后才能声称成功；始终用证据支撑断言
- **workflow-runner**: 在 Claude Code / OpenClaw / Cursor 中直接运行 agency-orchestrator YAML 工作流——无需 API key，使用当前会话的 LLM 作为执行引擎。当用户提供 .yaml 工作流文件或要求多角色协作完成任务时触发。
- **writing-plans**: 当你有规格说明或需求用于多步骤任务时使用，在动手写代码之前
- **writing-skills**: 当创建新技能、编辑现有技能或在部署前验证技能是否有效时使用

## 如何使用

当任务匹配某个 skill 时，使用 `Skill` 工具加载对应 skill 并严格遵循其流程。绝不要用 Read 工具读取 SKILL.md 文件。

如果你认为哪怕只有 1% 的可能性某个 skill 适用于你正在做的事情，你必须调用该 skill 检查。
<!-- superpowers-zh:end -->
