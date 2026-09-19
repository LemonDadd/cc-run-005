#!/usr/bin/env bash
# =============================================================================
# KidMath macOS 构建脚本
# 产物：src-tauri/target/release/bundle/dmg/KidMath_1.0.0_*.dmg
#       （同时生成 .app）
# 前置要求：
#   - Node.js 18+（推荐 20）与 npm
#   - Rust 稳定版（https://rustup.rs）
#   - Xcode Command Line Tools:  xcode-select --install
# Tauri 会自动处理应用签名占位；如需公证请自行配置 Apple 开发者证书。
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> 检查 Node / Rust"
node -v
npm -v
cargo -V || { echo "请先安装 Rust: https://rustup.rs"; exit 1; }

if ! xcode-select -p >/dev/null 2>&1; then
  echo "请先安装 Xcode Command Line Tools: xcode-select --install"
  exit 1
fi

echo "==> 安装前端依赖"
npm install

echo "==> 生成本地图标与音效（已随仓库提供，可重复执行）"
npm run gen:assets

echo "==> 运行核心规则测试（可选但推荐）"
(cd src-tauri/core && cargo test)

echo "==> 类型检查并构建前端"
npm run build

echo "==> 打包 macOS 应用（.app / .dmg）"
npm run tauri build

echo ""
echo "✅ 完成！产物位于 src-tauri/target/release/bundle/"
open "src-tauri/target/release/bundle/dmg" 2>/dev/null || true
