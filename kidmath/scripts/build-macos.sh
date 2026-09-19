#!/usr/bin/env bash
# =============================================================================
# KidMath macOS 打包脚本
# 产出：src-tauri/target/release/bundle/dmg/KidMath_1.0.0_*.dmg
#       src-tauri/target/release/bundle/macos/KidMath.app
# 前置：Node 18+、Rust stable（rustup）、Xcode Command Line Tools
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> [1/5] 检查工具链"
node --version
npm --version
if ! command -v cargo >/dev/null 2>&1; then
  source "$HOME/.cargo/env"
fi
cargo --version

echo "==> [2/5] 安装前端依赖"
npm install

echo "==> [3/5] 生成本地音效与图标（纯离线合成，无外部素材）"
node scripts/generate-assets.mjs
npx tauri icon app-icon.png

echo "==> [4/5] 前端生产构建"
npm run build

echo "==> [5/5] Tauri 打包 macOS .app / .dmg"
npm run tauri:build

echo ""
echo "✅ 打包完成！产物位置："
echo "   src-tauri/target/release/bundle/macos/"
echo "   src-tauri/target/release/bundle/dmg/"
