import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 纯离线构建：所有资源本地打包，产物不引用任何 CDN
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: '127.0.0.1',
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: 'es2021',
    sourcemap: !!process.env.TAURI_DEBUG,
  },
})
