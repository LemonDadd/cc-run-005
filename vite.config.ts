import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri 期望固定端口；所有资源本地构建，不使用任何代理与外部 CDN。
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    target: "es2021",
    outDir: "dist",
    sourcemap: false,
  },
});
