// 资源生成器：纯 Node 内置模块合成全部音效与图标，保证离线、无第三方素材依赖。
// 产物：
//   public/sounds/{correct,wrong,click,star,done}.wav  —— 本地 PCM 音效
//   app-icon.png (1024)  —— 交给 `tauri icon` 生成各平台图标
//   public/icon-32.png   —— 网页 favicon
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/* ---------------- WAV 合成 ---------------- */

function writeWav(path, channels, sampleRate, samples) {
  const numCh = channels.length
  const bytesPerSample = 2
  const blockAlign = numCh * bytesPerSample
  const dataSize = samples * blockAlign
  const buf = Buffer.alloc(44 + dataSize)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataSize, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20) // PCM
  buf.writeUInt16LE(numCh, 22)
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(sampleRate * blockAlign, 28)
  buf.writeUInt16LE(blockAlign, 32)
  buf.writeUInt16LE(16, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(dataSize, 40)
  let off = 44
  for (let i = 0; i < samples; i++) {
    for (let c = 0; c < numCh; c++) {
      const v = Math.max(-1, Math.min(1, channels[c][i]))
      buf.writeInt16LE(Math.round(v * 32760), off)
      off += 2
    }
  }
  writeFileSync(path, buf)
}

const SR = 44100

function tone({ freq, start, dur, type = 'sine', gain = 0.3, slideTo }) {
  const n0 = Math.floor(start * SR)
  const n1 = n0 + Math.floor(dur * SR)
  return (i) => {
    if (i < n0 || i >= n1) return 0
    const t = (i - n0) / SR
    const p = (i - n0) / (n1 - n0)
    // 指数淡入淡出，避免爆音
    const env = Math.min(1, p * 40) * Math.pow(1 - p, 1.6)
    const f = slideTo ? freq * (1 - p) + slideTo * p : freq
    const x = 2 * Math.PI * f * t
    let w = Math.sin(x)
    if (type === 'tri') w = (2 / Math.PI) * Math.asin(Math.sin(x))
    if (type === 'square') w = Math.sign(Math.sin(x)) * 0.5
    return w * env * gain
  }
}

function render(voices, dur) {
  const n = Math.floor(dur * SR)
  const mono = new Float32Array(n)
  for (const v of voices) {
    for (let i = 0; i < n; i++) mono[i] += v(i)
  }
  // 软限幅
  for (let i = 0; i < n; i++) mono[i] = Math.tanh(mono[i] * 1.1) / Math.tanh(1.1)
  return [[mono], n]
}

function makeSounds() {
  const dir = join(root, 'public', 'sounds')
  mkdirSync(dir, { recursive: true })

  // 答对：清脆上行双音 C6→E6
  let [ch, n] = render(
    [
      tone({ freq: 1046.5, start: 0, dur: 0.18, type: 'tri', gain: 0.32 }),
      tone({ freq: 1318.5, start: 0.09, dur: 0.3, type: 'tri', gain: 0.32 }),
      tone({ freq: 2093, start: 0.09, dur: 0.28, gain: 0.06 }),
    ],
    0.5,
  )
  writeWav(join(dir, 'correct.wav'), ch, SR, n)

  // 答错：温和的低音轻轻两下（不刺耳、不吓人）
  ;[ch, n] = render(
    [
      tone({ freq: 392, start: 0, dur: 0.16, type: 'sine', gain: 0.22 }),
      tone({ freq: 330, start: 0.18, dur: 0.22, type: 'sine', gain: 0.22 }),
    ],
    0.5,
  )
  writeWav(join(dir, 'wrong.wav'), ch, SR, n)

  // 点击：短促软泡音
  ;[ch, n] = render([tone({ freq: 660, start: 0, dur: 0.07, type: 'tri', gain: 0.25, slideTo: 880 })], 0.12)
  writeWav(join(dir, 'click.wav'), ch, SR, n)

  // 星星：闪亮琶音
  ;[ch, n] = render(
    [
      tone({ freq: 1318.5, start: 0, dur: 0.12, type: 'tri', gain: 0.26 }),
      tone({ freq: 1568, start: 0.08, dur: 0.12, type: 'tri', gain: 0.26 }),
      tone({ freq: 2093, start: 0.16, dur: 0.22, type: 'tri', gain: 0.26 }),
      tone({ freq: 2637, start: 0.24, dur: 0.3, type: 'sine', gain: 0.2 }),
    ],
    0.6,
  )
  writeWav(join(dir, 'star.wav'), ch, SR, n)

  // 回合完成：小小号曲
  ;[ch, n] = render(
    [
      tone({ freq: 523.25, start: 0, dur: 0.16, gain: 0.28 }),
      tone({ freq: 659.25, start: 0.14, dur: 0.16, gain: 0.28 }),
      tone({ freq: 783.99, start: 0.28, dur: 0.16, gain: 0.28 }),
      tone({ freq: 1046.5, start: 0.42, dur: 0.4, gain: 0.3 }),
      tone({ freq: 1568, start: 0.5, dur: 0.3, type: 'tri', gain: 0.12 }),
    ],
    0.9,
  )
  writeWav(join(dir, 'done.wav'), ch, SR, n)
}

/* ---------------- PNG 编码器 ---------------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td), 0)
  return Buffer.concat([len, td, crc])
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ---------------- 图标绘制（逐像素软件渲染） ---------------- */

// 5x7 点阵字体：0-9 + − = ⭐? 只做数字与运算符
const FONT = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
}

function hexRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}
function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function makeIcon(size) {
  const W = size
  const H = size
  const buf = Buffer.alloc(W * H * 4)
  const cTop = hexRgb('#ff8a3d')
  const cBot = hexRgb('#ffc93c')
  const radius = size * 0.22

  const setPx = (x, y, rgb, alpha = 255) => {
    x = Math.round(x)
    y = Math.round(y)
    if (x < 0 || y < 0 || x >= W || y >= H) return
    const i = (y * W + x) * 4
    const ia = alpha / 255
    const exist = buf[i + 3] / 255
    const outA = ia + exist * (1 - ia)
    if (outA <= 0) return
    buf[i] = Math.round((rgb[0] * ia + buf[i] * exist * (1 - ia)) / outA)
    buf[i + 1] = Math.round((rgb[1] * ia + buf[i + 1] * exist * (1 - ia)) / outA)
    buf[i + 2] = Math.round((rgb[2] * ia + buf[i + 2] * exist * (1 - ia)) / outA)
    buf[i + 3] = Math.round(outA * 255)
  }

  const inRoundRect = (x, y) => {
    const r = radius
    if (x >= r && x <= W - r) return y >= 0 && y <= H
    if (y >= r && y <= H - r) return x >= 0 && x <= W
    const cx = x < r ? r : W - r
    const cy = y < r ? r : H - r
    return (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2
  }

  // 背景渐变圆角矩形
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inRoundRect(x, y)) continue
      const t = y / H
      const rgb = mix(cTop, cBot, t)
      setPx(x, y, rgb, 255)
    }
  }

  const fillEllipse = (cx, cy, rx, ry, hex, rot = 0) => {
    const [r, g, b] = hexRgb(hex)
    const cos = Math.cos(rot)
    const sin = Math.sin(rot)
    const x0 = Math.max(0, Math.floor(cx - Math.max(rx, ry)))
    const x1 = Math.min(W - 1, Math.ceil(cx + Math.max(rx, ry)))
    const y0 = Math.max(0, Math.floor(cy - Math.max(rx, ry)))
    const y1 = Math.min(H - 1, Math.ceil(cy + Math.max(rx, ry)))
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx
        const dy = y - cy
        const lx = cos * dx + sin * dy
        const ly = -sin * dx + cos * dy
        if ((lx / rx) ** 2 + (ly / ry) ** 2 <= 1) {
          // 轻微暗边
          const edge = Math.min(1, ((lx / rx) ** 2 + (ly / ry) ** 2) * 0.35)
          setPx(x, y, [r * (1 - edge * 0.12), g * (1 - edge * 0.12), b * (1 - edge * 0.12)], 255)
        }
      }
    }
  }

  const fillTri = (cx, cy, R, hex) => {
    const [r, g, b] = hexRgb(hex)
    for (let y = Math.max(0, cy - R); y < Math.min(H, cy + R); y++) {
      for (let x = Math.max(0, cx - R); x < Math.min(W, cx + R); x++) {
        // 重心坐标判定（顶点朝上）
        const p = [
          [cx, cy - R],
          [cx - R * 0.92, cy + R * 0.78],
          [cx + R * 0.92, cy + R * 0.78],
        ]
        const d = (p[1][1] - p[2][1]) * (p[0][0] - p[2][0]) + (p[2][0] - p[1][0]) * (p[0][1] - p[2][1])
        const a =
          ((p[1][1] - p[2][1]) * (x - p[2][0]) + (p[2][0] - p[1][0]) * (y - p[2][1])) / d
        const bb =
          ((p[2][1] - p[0][1]) * (x - p[2][0]) + (p[0][0] - p[2][0]) * (y - p[2][1])) / d
        const c = 1 - a - bb
        if (a >= 0 && bb >= 0 && c >= 0) setPx(x, y, [r, g, b], 255)
      }
    }
  }

  const drawStar = (cx, cy, R, hex) => {
    const [r, g, b] = hexRgb(hex)
    for (let y = Math.max(0, cy - R); y < Math.min(H, cy + R); y++) {
      for (let x = Math.max(0, cx - R); x < Math.min(W, cx + R); x++) {
        const ang = Math.atan2(y - cy, x - cx)
        const dist = Math.hypot(x - cx, y - cy)
        const rad = R * (0.55 + 0.45 * Math.abs(Math.cos(2.5 * ang)))
        if (dist <= rad) setPx(x, y, [r, g, b], 255)
      }
    }
  }

  const drawText = (text, cx, cy, px, hex) => {
    const [r, g, b] = hexRgb(hex)
    const cellW = 5
    const cellH = 7
    const gap = Math.round(px * 0.25)
    const totalW = text.length * cellW * px + (text.length - 1) * gap
    let startX = Math.round(cx - totalW / 2)
    const startY = Math.round(cy - (cellH * px) / 2)
    text.split('').forEach((ch, ci) => {
      const glyph = FONT[ch]
      if (!glyph) return
      glyph.forEach((row, ry) => {
        row.split('').forEach((on, rx) => {
          if (on !== '1') return
          for (let yy = 0; yy < px; yy++)
            for (let xx = 0; xx < px; xx++)
              setPx(startX + ci * (cellW * px + gap) + rx * px + xx, startY + ry * px + yy, [r, g, b], 255)
        })
      })
    })
  }

  // 三个彩色图形装饰
  fillEllipse(size * 0.26, size * 0.3, size * 0.12, size * 0.12, '#ffffff')
  fillEllipse(size * 0.26, size * 0.3, size * 0.075, size * 0.075, '#2ea8e6')
  fillTri(size * 0.5, size * 0.27, size * 0.12, '#ef5b5b')
  drawStar(size * 0.74, size * 0.3, size * 0.13, '#46b65c')

  // 白色牌子 + “1+1” 文字
  fillEllipse(size * 0.5, size * 0.66, size * 0.34, size * 0.2, '#ffffff')
  drawText('1+1', size * 0.5, size * 0.655, Math.round(size / 1024 * 52), '#2b2140')

  return encodePng(W, H, buf)
}

function makeIcons() {
  writeFileSync(join(root, 'app-icon.png'), makeIcon(1024))
  mkdirSync(join(root, 'public'), { recursive: true })
  writeFileSync(join(root, 'public', 'icon-32.png'), makeIcon(32))
  writeFileSync(join(root, 'public', 'icon-256.png'), makeIcon(256))
}

makeSounds()
makeIcons()
console.log('✓ 音效与图标已生成到 public/ 与 app-icon.png')
