// 检测当前是否运行在 Tauri 桌面壳内。
// Tauri 2 会注入 __TAURI_INTERNALS__。
export const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
