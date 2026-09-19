import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { initTts } from './utils/tts'

// 预载中文语音列表（部分浏览器需要异步 onvoiceschanged）
initTts()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
