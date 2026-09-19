@echo off
REM =============================================================================
REM KidMath Windows 打包脚本
REM 产出：src-tauri\target\release\bundle\msi\KidMath_1.0.0_*.msi
REM       src-tauri\target\release\bundle\nsis\KidMath_1.0.0_*-setup.exe
REM 前置：Node 18+、Rust stable（rustup）、Microsoft Edge WebView2（Win10 1803+ 通常自带）
REM =============================================================================
setlocal enabledelayedexpansion
cd /d "%~dp0\.."

echo ==^> [1/5] 检查工具链
node --version || goto :err
npm --version || goto :err
cargo --version
if errorlevel 1 (
  echo 未找到 Rust，请先从 https://rustup.rs 安装 stable 工具链
  goto :err
)

echo ==^> [2/5] 安装前端依赖
call npm install || goto :err

echo ==^> [3/5] 生成本地音效与图标（纯离线合成，无外部素材）
call node scripts\generate-assets.mjs || goto :err
call npx tauri icon app-icon.png || goto :err

echo ==^> [4/5] 前端生产构建
call npm run build || goto :err

echo ==^> [5/5] Tauri 打包 Windows .msi / .exe
call npm run tauri:build || goto :err

echo.
echo ✅ 打包完成！产物位置：
echo    src-tauri\target\release\bundle\msi\
echo    src-tauri\target\release\bundle\nsis\
exit /b 0

:err
echo.
echo ❌ 打包失败，请查看上方错误信息
exit /b 1
