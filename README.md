# KidMath 儿童数学启蒙游戏 🧮

一款面向 **3–8 岁儿童**的**纯离线**桌面应用。免登录、零网络请求、无广告、无内购，
所有资源本地打包。基于 **Tauri 2 + React 18 + TypeScript + SQLite**，运行于
**macOS 与 Windows**。

---

## ✨ 六种小游戏

| 游戏 | 玩法 |
| ---- | ---- |
| 🐟 数数捕鱼 `counting` | 点击游动的鱼逐个计数，再选出总数 |
| ⚖️ 比较大小 `compare` | 点击左右两组物品中“更多”的一边 |
| 🍎 加减法果园 `orchard` | 果园情境的加减应用题，10 以内起步，高 Level 到 20 以内 |
| 🔷 图形配对 `shapes` | 用原生 pointer events 拖拽图形归位，进阶含颜色匹配 |
| 🔁 规律排序 `pattern` | 拖拽/点选补全 ABAB、AABB、ABC、AAB、ABCD 序列 |
| 🕐 认时钟 `clock` | 认识整点与半点 |

- 每种游戏 **5 个难度等级**；每回合 **5–10 题**（随等级增长）。
- **答对**：绿色高亮 + 星星粒子 + 清脆音效 + 语音“答对啦”，反馈在 500ms 内呈现。
- **答错**：轻微抖动 + 温和音效 + 语音“再试一次”，**不显示红叉、不出现“失败”字样、可重试不惩罚**。
- 单回合正确率 **≥ 80% 得 1 颗星，100% 得 2 颗星**（按首次作答计分）。
- 每累计 **5 颗星**解锁一个饰品（帽子、眼镜、背景、伙伴，共 16 个）。
- 九枚成就徽章，覆盖**坚持类 / 精通类 / 探索类**。

## 👶 多儿童档案

- 昵称、生日、卡通头像；年龄由生日自动计算。
- 默认难度 `Level = max(1, min(5, age - 2))`，家长可在家长面板覆盖。
- 不同档案的星星、进度、成就、饰品**完全隔离**；首页可一键“换玩家”。

## 👪 家长面板（4 位 PIN）

- 首次进入默认为 **`0000`**，进入后会提示修改；PIN 使用 **SHA-256 + 固定盐值哈希**存储，不保存明文。
- 修改 PIN（需输入原 PIN；原 PIN 错误无法修改任何设置）。
- 设置每日游玩时长，默认 **25 分钟**，可调 **10–60 分钟**。
  到点弹出温和的“**该休息啦**”动画并自动保存进度、回到首页。
- 查看每个孩子的总正确率与各游戏进度；手动调整 Level；重置进度；删除档案。

---

## 🚀 开发启动

### 环境要求

- **Node.js 18+**（推荐 20）与 npm
- **Rust stable**（<https://rustup.rs>）
- 平台原生依赖（Tauri 2）：
  - **macOS**：`xcode-select --install`
  - **Windows**：Microsoft C++ Build Tools（Desktop development with C++）；WebView2（Win11 内置）
  - **Linux（仅用于浏览器开发/核心测试）**：`npm run dev` 即可，无需系统 GUI 库

### 启动

```bash
npm install
npm run gen:assets      # 生成 src-tauri/icons 与 src/assets/sounds（仓库已带，可重复生成）
npm run dev             # 仅前端，浏览器打开 http://localhost:1420 即可完整体验
```

以 **Tauri 桌面壳**运行（需要已安装对应平台原生依赖）：

```bash
npm run tauri dev
```

> 浏览器开发时，数据层自动降级为 `localStorage` 的等价实现（与 Rust/SQLite 规则一致），
> 仅为开发便利；**桌面构建始终走 Tauri command + SQLite**。前端没有任何文件系统访问。

### 自测

```bash
npm run selftest                 # 六个题目生成器 + 星级规则的纯逻辑自测（约 2.3 万项检查）
(cd src-tauri/core && cargo test)  # Rust 核心：年龄/等级/星级、隔离、PIN、饰品/成就等端到端测试
npm run build                    # tsc 严格类型检查 + Vite 生产构建
```

---

## 📦 打包

### macOS

```bash
./scripts/build-macos.sh
```

产物：`src-tauri/target/release/bundle/dmg/KidMath_1.0.0_*.dmg`（及 `.app`）。

### Windows

```bat
scripts\build-windows.bat
```

产物：

- `src-tauri\target\release\KidMath.exe`
- `src-tauri\target\release\bundle\msi\KidMath_1.0.0_*.msi`
- `src-tauri\target\release\bundle\nsis\KidMath_1.0.0_*-setup.exe`

> 首次在 Windows 打包会自动下载 WiX 与 NSIS。请在联网环境执行一次打包；
> 生成的应用本体完全离线运行，不访问任何网络。

---

## 🔑 如何进入家长面板

1. 在首页（或玩家选择页）点击右上角 **“👪 家长”**。
2. 输入 4 位 PIN（**首次为 `0000`**）。
3. 进入后请在右侧“修改 PIN”中设置新 PIN；当仍是默认 PIN 时面板会持续提示。
4. PIN 错误会被拒绝，无法查看或修改任何家长设置。

---

## 🗂️ 数据与离线说明

- 数据库文件位于系统应用数据目录下的 `kidmath.db`：
  - macOS：`~/Library/Application Support/com.kidmath.app/kidmath.db`
  - Windows：`%APPDATA%\com.kidmath.app\kidmath.db`
- 表：`profile`、`game_record`、`achievement`、`parent_settings`、`daily_usage`、`unlocked_item`。
- 所有数据库操作都封装为 Tauri command（见 `src-tauri/src/lib.rs`），前端**不直接访问文件系统**。
- **未启用 Tauri HTTP 权限**（`src-tauri/capabilities/default.json` 仅核心 IPC/窗口能力）；
  前端**没有任何 `fetch`/`XMLHttpRequest`/axios 调用**；CSP 锁定为 `'self'`，构建产物不引用 CDN。
- 题面朗读优先使用 **Web Speech API 中文语音**；系统无语音时**静音降级**，游戏依旧可玩。
- 音效为脚本生成的本地 WAV（`scripts/gen-assets.mjs`），图形全部为内联 SVG。

## 🏗️ 架构

```
src/
  components/      通用 UI（头像、PIN 键盘、弹窗、SVG 图形/表盘、反馈横幅、休息遮罩）
  feedback/        音效、TTS、星星/彩纸粒子、每日时长计时控制器
  game/
    generators.ts  六个题目的纯函数生成器（数值范围随等级）
    GameShell.tsx  回合外壳：计分、首次答对、重试不惩罚、进度、自动保存
    plays/         六个游戏的交互界面（拖拽使用原生 pointer events）
  pages/           玩家选择、档案表单、首页、奖励、图鉴装扮、家长面板
  store/           Zustand：按档案隔离的当前玩家 / 最近一回合结果
  tauri/           invoke 封装 + 浏览器降级后端（localStorage，仅供开发）
src-tauri/
  src/             Tauri command 薄封装（设置接口不回传 PIN 哈希）
  core/            不依赖 GUI 的纯 Rust 核心：SQLite 迁移、CRUD、星级/饰品/成就规则 + 单元/集成测试
  icons/           应用图标（PNG/ICO/ICNS）
scripts/
  gen-assets.mjs   零依赖生成图标与音效
  build-macos.sh / build-windows.bat
```

第一版**不包含**乘法除法、分数、货币认知、数独——它们在首页“🌟 即将推出”区展示。

## ✅ 验收对照

- 六种游戏均可完整打完一轮并进入 `/reward` 奖励页。
- 两名儿童切换后星星/进度/成就/饰品互不串档（Rust 集成测试覆盖）。
- 家长 PIN 错误无法进入或修改设置。
- 时长到限出现“该休息啦”结束动画并保存进度。
- 全程离线、无网络权限与请求、无 CDN 引用。
- 答对反馈在 500ms 内呈现（本地预加载音效、即时 CSS 动画）。
- 首次启动可创建档案；重启后数据经 SQLite 持久化。
