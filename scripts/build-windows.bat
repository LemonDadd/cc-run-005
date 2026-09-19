@echo off
REM =============================================================================
REM KidMath Windows 构建脚本
REM 产物：src-tauri\target\release\KidMath.exe
REM       src-tauri\target\release\bundle\msi\KidMath_1.0.0_*.msi
REM       src-tauri\target\release\bundle\nsis\KidMath_1.0.0_*-setup.exe
REM
REM 前置要求：
REM   - Node.js 18+（推荐 20，勾选 Add to PATH）与 npm
REM   - Rust 稳定版（https://rustup.rs，默认 MSVC 工具链）
REM   - Microsoft C++ Build Tools（Desktop development with C++）
REM       https://visualstudio.microsoft.com/visual-cpp-build-tools/
REM   - WebView2 运行时（Win11 已内置；旧版 Windows 安装包会自动引导）
REM
REM 首次打包还会自动下载 WiX（生成 MSI）与 NSIS（生成安装程序）。
REM =============================================================================
setlocal enabledelayedexpansion
cd /d "%~dp0\.."

echo ==^> 检查工具链
call node -v || (echo 请先安装 Node.js 18+ & exit /b 1)
call cargo -V || (echo 请先安装 Rust stable: https://rustup.rs & exit /b 1)

echo ==^> 安装前端依赖
call npm install || exit /b 1

echo ==^> 生成本地图标与音效
call npm run gen:assets || exit /b 1

echo ==^> 运行核心规则测试
pushd src-tauri\core
call cargo test || (popd & exit /b 1)
popd

echo ==^> 类型检查并构建前端
call npm run build || exit /b 1

echo ==^> 打包 Windows 应用（.exe / .msi / NSIS 安装包）
call npm run tauri build || exit /b 1

echo.
echo ✅ 完成！产物位于 src-tauri\target\release\bundle\
explorer "src-tauri\target\release\bundle"
endlocal
