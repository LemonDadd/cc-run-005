# 🧮 KidMath 儿童数学启蒙

一款面向 **3–8 岁儿童**的**纯离线**数学启蒙桌面游戏，基于 **Tauri 2 + React 18 + TypeScript + SQLite**，可运行在 **macOS** 与 **Windows**。

> 全程免登录、零网络请求、无广告、无内购，所有美术、音效资源均本地打包。

---

## ✨ 功能一览

### 六个数学小游戏（每个 5 个难度等级，每回合 5–10 题）

| 游戏 | 玩法 | 难度变化 |
| --- | --- | --- |
| 🐟 数数捕鱼 | 点击游过的小鱼计数，再选出总数 | 鱼的数量 1–3 → 10–15，游速更快 |
| 🍎 比较大小 | 点击左右两组物品中更多的一边 | 数量上限 3 → 10，差距缩小、可异种水果 |
| 🍐 加减法果园 | 果园情境应用题，看图列式选答案 | 5 以内 → 10 以内 → 20 以内加减混合 |
| 🔷 图形配对 | 拖拽图形到对应形状的“家” | 3 形 → 6 形，进阶同时要求颜色匹配 |
| ⭐ 规律排序 | 观察规律，拖图块补全序列 | ABAB → ABC → ABCD，干扰项更多 |
| 🕐 认时钟 | 看钟面在选项中选出时间 | 整点起步，Level 3 起加入半点 |

统一规则：**答对得分**（绿色高亮 + 星星粒子 + 清脆音效 + 语音“答对啦”），**答错可无限重试、不扣分不惩罚**（轻微抖动 + 温和音效 + “再试一次”，界面不出现红叉与“失败”字样）。答对反馈在点击同一帧呈现，远低于 500ms。

### 多儿童档案（数据完全隔离）

- 每个档案：昵称、生日、8 选 1 卡通头像（纯 SVG）
- 年龄由生日自动计算，默认难度 `Level = max(1, min(5, age-2))`，家长可手动覆盖
- 不同档案的星星、游戏记录、成就、饰品、装扮、当日时长**完全隔离**
- 首页一键切换玩家

### ⭐ 激励系统

- 单回合正确率 **≥ 80% 得 1 颗星**，**100% 得 2 颗星**
- **每累计 5 颗星**自动解锁一个饰品（帽子、眼镜、背景、小伙伴，共 12 个）
- `/gallery` 饰品图鉴 & 装扮页，可随时穿戴/脱下
- 七枚成就徽章：
  - **坚持类**：🌱 初次尝试（完成首回合）、💪 坚持不懈（累计 10 回合）、📅 连续三天
  - **精通类**：🎯 满分达人（单轮 100%）、🧠 答题小能手（累计答对 50 题）
  - **探索类**：🗺️ 小小探索家（玩遍六种游戏）、🎁 收藏家（解锁 5 个饰品）

### 👪 家长面板（4 位 PIN）

- 首次启动 PIN 为 **`0000`**，进入后会提示修改；PIN 以**每用户随机盐 + SHA-256 哈希**存储于本地 SQLite，恒定时间比较，无法逆向
- PIN 错误无法进入面板、无法修改任何设置
- 修改 PIN（4 位数字）
- 设置每日游玩时长：默认 **25 分钟**，可调 **10–60 分钟**；到点弹出温和的“🌙 该休息啦”动画，**自动保存进度并返回首页**（全程无“失败”措辞）
- 查看每个孩子：综合正确率、最佳单轮、各游戏进度/最高等级、今日时长、星星、成就
- 手动调整 Level 1–5 或恢复“按年龄自动”
- 重置该孩子进度（保留档案）/ 删除整个档案

### 第一版明确不做（首页显示“即将推出”）

乘除法、分数、货币认知、数独。

---

## 🗺️ 页面路由

| 路径 | 页面 |
| --- | --- |
| `/` | 启动 / 选择玩家（首次启动引导创建档案） |
| `/home` | 首页：头像、星星、六个游戏入口、“即将推出”、切换玩家、家长入口 |
| `/game/:gameType` | 游戏容器（`counting` / `compare` / `arithmetic` / `shapes` / `patterns` / `clock`） |
| `/reward` | 奖励结算页（星星、正确率、新成就、新饰品） |
| `/gallery` | 饰品图鉴与装扮页 |
| `/parent` | 家长面板（先过 PIN） |

> 桌面端使用 HashRouter（`/#/home`），自定义协议加载本地文件无需服务端 fallback。

---

## 🚀 开发启动

### 环境要求

- **Node.js 18+**（推荐 20 LTS）与 npm 9+
- **Rust stable**（通过 <https://rustup.rs> 安装；Windows 还需安装 [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)；macOS 需 `xcode-select --install`）
- Windows 10 1803+ 自带 WebView2；更旧系统安装包会自动引导安装
- Tauri 2 平台依赖见官方文档：<https://v2.tauri.app/start/prerequisites/>

### 首次运行

```bash
# 1. 安装前端依赖
npm install

# 2. （可选）重新生成本地音效与图标——脚本纯 Node 内置模块，无任何外部素材下载
node scripts/generate-assets.mjs

# 3. 开发模式（自动起 Vite 1420 端口并打开桌面窗口，支持热更新）
npm run tauri:dev
```

只想在浏览器里快速预览 UI（数据用 localStorage 降级，规则与 SQLite 后端一致）：

```bash
npm run dev
# 打开 http://127.0.0.1:1420
```

> 浏览器预览仅用于调试界面与游戏逻辑；**正式数据持久化、PIN 哈希、家长设置均由 Tauri + SQLite 提供**。

---

## 📦 打包方法

### macOS

```bash
./scripts/build-macos.sh
```

产物：

- `src-tauri/target/release/bundle/macos/KidMath.app`
- `src-tauri/target/release/bundle/dmg/KidMath_1.0.0_*.dmg`

> 在 Apple Silicon 机器上交叉构建 Intel 版可先执行：
> `rustup target add x86_64-apple-darwin && npm run tauri:build -- --target x86_64-apple-darwin`

### Windows（在 Windows 上执行）

```bat
scripts\build-windows.bat
```

产物：

- `src-tauri\target\release\bundle\msi\KidMath_1.0.0_*.msi`
- `src-tauri\target\release\bundle\nsis\KidMath_1.0.0_*-setup.exe`

两个脚本都会依次执行：依赖安装 → 本地资源生成 → 图标生成 → 前端构建 → Tauri 打包。

### 图标重新生成

源图 `app-icon.png`（1024×1024）已随仓库提供。如需替换，替换后执行：

```bash
npm run icons   # 等价于 npx tauri icon app-icon.png
```

---

## 🔢 如何用 PIN 进入家长面板

1. 在**首页右上角点击「👪 家长」**（玩家选择页底部也有入口）。
2. 在数字键盘上输入 4 位 PIN。
   - **第一次使用：默认 PIN 为 `0000`**。
   - 输入满 4 位自动校验，错误会温和抖动并清空，不泄露正确位数以外的信息。
3. 进入后可在「家长设置」标签页：
   - 修改 PIN（**建议第一次进入就改掉默认的 0000**；若仍设为 0000 会再次确认提醒）
   - 拖动滑块调整每日时长（10–60 分钟）并保存
4. 「孩子进度」标签页可切换不同档案查看统计、调整 Level、重置进度、删除档案。
   - 所有敏感写操作在 Rust 端会**再次校验 PIN**，即使绕过前端也无法修改。

> 忘记 PIN：数据库仅保存哈希无法找回。可在应用数据目录删除/重命名 `kidmath.db` 后重启（**会清空全部孩子数据**）：
> - macOS：`~/Library/Application Support/com.kidmath.app/kidmath.db`
> - Windows：`%APPDATA%\com.kidmath.app\kidmath.db`

---

## 🔒 离线与隐私

- **没有任何 `fetch` / `axios` / WebSocket / CDN 引用**；Tauri 权限未申请 `http`、`shell`、`fs` 等能力（见 `src-tauri/capabilities/default.json`）
- CSP 禁止加载远程脚本/样式/字体/图片（`script-src 'self'`、无 `http(s)` 源）
- 所有数据库操作经 **Tauri command**（IPC）封装，前端不直接访问文件系统
- 数据只保存在本机应用数据目录的 SQLite 文件中
- TTS 优先使用系统 **Web Speech API** 中文语音；无语音时**自动静音降级，游戏照常可玩**；音效为本地合成的 wav

---

## 🧱 技术结构

```
kidmath/
├── index.html
├── package.json
├── vite.config.ts                # 固定 127.0.0.1:1420，离线构建
├── scripts/
│   ├── generate-assets.mjs       # 纯 Node 合成 5 个 wav 音效 + 应用图标
│   ├── build-macos.sh            # macOS 一键打包
│   └── build-windows.bat         # Windows 一键打包
├── public/
│   ├── sounds/{correct,wrong,click,star,done}.wav
│   └── icon-*.png
└── src/
    ├── main.tsx / App.tsx        # HashRouter 路由
    ├── types.ts                  # 与 Rust 序列化结构对齐
    ├── constants/games.ts        # 游戏元信息、饰品目录、成就定义
    ├── lib/
    │   ├── db.ts                 # 数据访问：Tauri invoke 封装 + 浏览器降级
    │   ├── db-extra.ts           # 家长（需 PIN）命令
    │   ├── browserDb.ts          # 浏览器预览用 localStorage 后端（规则同 Rust）
    │   └── store.ts              # Zustand 全局状态（按档案隔离）
    ├── hooks/
    │   ├── useFeedback.tsx       # 绿色高亮/粒子/抖动（<500ms）
    │   ├── useDraggable.ts       # 原生 Pointer Events 拖拽 + 失败回弹
    │   └── usePlayTime.ts        # 每日时长计时 + “该休息啦”
    ├── assets/svgs/              # 全部 SVG 美术：头像、形状、水果、时钟
    ├── components/               # TopBar / PinPad / RestOverlay / SoundToggle
    ├── games/
    │   ├── common/GameShell.tsx  # 回合框架（5–10 题、进度点、结算入库）
    │   ├── counting/ compare/ arithmetic/
    │   ├── shapes/ patterns/ clock/
    └── pages/                    # / /home /game /reward /gallery /parent
src-tauri/
├── Cargo.toml                    # rusqlite(bundled) + sha2 + chrono
├── tauri.conf.json               # 无 http 权限 + 严格 CSP
├── capabilities/default.json     # 仅 core 默认能力
└── src/
    ├── main.rs / lib.rs          # 注册 18 个 invoke command
    ├── models.rs                 # Profile/GameRecord/Achievement/... 结构
    ├── catalog.rs                # 饰品目录、PIN 加盐哈希
    ├── db.rs                     # SQLite 迁移、统计、成就、饰品业务规则
    └── commands.rs               # IPC 命令（PIN 敏感操作二次校验）
```

### 数据库表

`profiles`、`game_records`、`achievements`、`parent_settings`（单行：PIN 哈希/盐/是否默认/每日时长）、`daily_usage`、`unlocked_items`、`equipped_items`。外键 `ON DELETE CASCADE` 保证删除档案时关联数据一并清理。

---

## 🎨 幼儿友好设计

- 主按钮 **≥80px 高**，按钮文字 **≥24px**，正文 **≥20px**
- 高对比配色、圆润卡通造型、大圆角、厚投影
- 所有按钮按下有缩放反馈；拖拽失败自动回弹
- 页面/弹层转场动画均 **<300ms**
- 不出现“失败/错”等否定字样，只有“再试一次”
- 拖拽使用原生 Pointer Events（同时适配鼠标与触摸屏）

---

## 🧪 验收对照

- [x] 六种游戏均可完整打完一轮并进入 `/reward` 奖励页
- [x] 两名儿童切换后星星/进度/成就/饰品互不串档（外键隔离 + Zustand 按档案状态）
- [x] 家长 PIN 错误无法进入、无法改设置（Rust 端哈希校验）
- [x] 时长到限出现“该休息啦”动画并保存进度返回首页
- [x] 离线可运行（无网络权限、无远程资源、CSP 锁定）
- [x] 答对反馈 <500ms（点击当帧触发样式/音效/粒子）
- [x] 首次启动可创建档案（无档案时强制引导）
- [x] 重启后数据持久化（macOS/Windows 应用数据目录下 SQLite）
