// 路由：/ 启动选择玩家、/home、/game/:gameType、/reward、/gallery、/parent
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { GameRoute } from './pages/GameRoute'
import { GalleryPage } from './pages/GalleryPage'
import { HomePage } from './pages/HomePage'
import { ParentPage } from './pages/ParentPage'
import { ProfileSelectPage } from './pages/ProfileSelectPage'
import { RewardPage } from './pages/RewardPage'

// 桌面端使用 HashRouter：Tauri 生产环境以自定义协议加载文件，
// hash 路由不需要服务端 fallback，离线最稳妥。
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ProfileSelectPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/game/:gameType" element={<GameRoute />} />
        <Route path="/reward" element={<RewardPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/parent" element={<ParentPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
