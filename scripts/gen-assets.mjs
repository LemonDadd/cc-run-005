// 纯 Node（仅用内置 zlib）生成 KidMath 全部本地静态资源：
//   1) 应用图标：PNG / ICO / ICNS（卡通星星，圆角渐变底）
//   2) 音效：WAV（答对、答错、点击、星星、通关）
// 运行：npm run gen:assets
// 产物签入仓库，最终构建不依赖任何外网资源。
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ---------------- PNG 编码 ---------------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  // 每行前置过滤器字节 0。
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDT" ? "IDAT" : "IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------------- 图标绘制 ---------------- */

const TOP = [0xff, 0xd2, 0x3f]; // 明黄
const BOTTOM = [0xff, 0x80, 0x3d]; // 暖橙
const DOT_COLORS = [
  [0x5a, 0xc8, 0xff],
  [0x7b, 0xe0, 0x7b],
  [0xff, 0x6b, 0x8a],
  [0xb1, 0x8c, 0xff],
];

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function roundedRectCoverage(x, y, w, h, r) {
  // 返回点在圆角矩形内的覆盖率（0/1，足够图标使用）。
  const qx = Math.abs(x - w / 2) - (w / 2 - r);
  const qy = Math.abs(y - h / 2) - (h / 2 - r);
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  const d = Math.hypot(ax, ay);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
  if (outside <= -1) return 1;
  if (outside >= 1) return 0;
  return 1 - (outside + 1) / 2;
  void d;
}

function starPath(cx, cy, outer, inner, points = 5) {
  const path = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    path.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return path;
}

function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0],
      yi = poly[i][1],
      xj = poly[j][0],
      yj = poly[j][1];
    const hit =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function circleCov(px, py, cx, cy, r) {
  const d = Math.hypot(px - cx, py - cy) - r;
  if (d <= -0.75) return 1;
  if (d >= 0.75) return 0;
  return 0.5 - d / 1.5;
}

function renderIcon(N) {
  const S = 2; // 2x 超采样
  const W = N * S;
  const buf = Buffer.alloc(N * N * 4);
  const radius = N * 0.22;
  const star = starPath(N / 2, N * 0.52, N * 0.30, N * 0.13);
  const dots = [
    [N * 0.27, N * 0.27],
    [N * 0.73, N * 0.27],
    [N * 0.27, N * 0.77],
    [N * 0.73, N * 0.77],
  ];
  const dr = N * 0.06;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      let accR = 0,
        accG = 0,
        accB = 0,
        accA = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const px = x + (sx + 0.5) / S;
          const py = y + (sy + 0.5) / S;
          let cr_ = 0,
            cg = 0,
            cb = 0,
            ca = 0;
          const bg = roundedRectCoverage(px, py, N, N, radius);
          if (bg > 0) {
            const grad = py / N;
            [cr_, cg, cb] = mix(TOP, BOTTOM, grad);
            ca = bg;
            // 四颗彩色小点
            for (let i = 0; i < dots.length; i++) {
              const dc = circleCov(px, py, dots[i][0], dots[i][1], dr);
              if (dc > 0) {
                const t = dc;
                const dot = DOT_COLORS[i];
                cr_ = cr_ * (1 - t) + dot[0] * t;
                cg = cg * (1 - t) + dot[1] * t;
                cb = cb * (1 - t) + dot[2] * t;
              }
            }
            // 白色星星
            if (pointInPoly(px, py, star)) {
              cr_ = 255;
              cg = 255;
              cb = 255;
            }
          }
          accR += cr_ * bg;
          accG += cg * bg;
          accB += cb * bg;
          accA += ca;
        }
      }
      a = Math.min(1, accA / (S * S));
      if (a > 0) {
        r = Math.round(accR / (S * S) / Math.max(a, 1e-6));
        g = Math.round(accG / (S * S) / Math.max(a, 1e-6));
        b = Math.round(accB / (S * S) / Math.max(a, 1e-6));
      }
      const o = (y * N + x) * 4;
      buf[o] = r;
      buf[o + 1] = g;
      buf[o + 2] = b;
      buf[o + 3] = Math.round(a * 255);
    }
  }
  return buf;
}

function icoFile(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach((e, i) => {
    const o = i * 16;
    dir[o] = e.size >= 256 ? 0 : e.size;
    dir[o + 1] = e.size >= 256 ? 0 : e.size;
    dir[o + 2] = 0;
    dir[o + 3] = 0;
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(e.png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += e.png.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.png)]);
}

function icnsFile(entries) {
  // entries: [[ostype, png]]，macOS 支持 PNG 负载类型。
  const blocks = entries.map(([type, png]) => {
    const head = Buffer.alloc(8);
    head.write(type, 0, "ascii");
    head.writeUInt32BE(png.length + 8, 4);
    return Buffer.concat([head, png]);
  });
  const total = 8 + blocks.reduce((n, b) => n + b.length, 0);
  const header = Buffer.alloc(8);
  header.write("icns", 0, "ascii");
  header.writeUInt32BE(total, 4);
  return Buffer.concat([header, ...blocks]);
}

/* ---------------- WAV 音效合成 ---------------- */

function writeWav(samples, sampleRate = 44100) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

function osc(type, phase) {
  const p = phase - Math.floor(phase);
  switch (type) {
    case "square":
      return p < 0.5 ? 1 : -1;
    case "triangle":
      return 1 - 4 * Math.abs(Math.round(p) - p);
    case "saw":
      return 2 * p - 1;
    default:
      return Math.sin(2 * Math.PI * p);
  }
}

function buildTone(sr, freqs, dur, opts = {}) {
  const { type = "sine", gain = 0.3, attack = 0.01, release = 0.06, glideTo = null } = opts;
  const n = Math.round(dur * sr);
  const out = new Float64Array(n);
  const phase = new Array(freqs.length).fill(0);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let env = gain;
    if (t < attack) env *= t / attack;
    const relStart = dur - release;
    if (t > relStart) env *= Math.max(0, (dur - t) / release);
    let v = 0;
    freqs.forEach((f0, k) => {
      const f = glideTo ? f0 + (glideTo - f0) * (t / dur) : f0;
      phase[k] += f / sr;
      v += (k === 0 ? 1 : 0.5) * osc(type, phase[k]);
    });
    out[i] = (v / 1.4) * env;
  }
  return out;
}

function seq(sr, parts) {
  // parts: [{freq, dur, ...opts}]
  const total = parts.reduce((s, p) => s + Math.round(p.dur * sr), 0);
  const out = new Float64Array(total);
  let off = 0;
  for (const p of parts) {
    const t = buildTone(sr, [].concat(p.freq), p.dur, p);
    out.set(t, off);
    off += t.length;
  }
  return out;
}

function generateAllSounds() {
  const sr = 44100;
  const sounds = {
    // 答对：明亮快速上行琶音，清脆愉快。
    correct: seq(sr, [
      { freq: 880, dur: 0.09, type: "triangle", gain: 0.32, release: 0.05 },
      { freq: 1174.7, dur: 0.09, type: "triangle", gain: 0.32, release: 0.05 },
      { freq: 1568, dur: 0.16, type: "triangle", gain: 0.34, release: 0.12 },
    ]),
    // 答错：柔和下行两音，不刺耳。
    wrong: seq(sr, [
      { freq: 392, dur: 0.16, type: "sine", gain: 0.22, attack: 0.02, release: 0.1 },
      { freq: 329.6, dur: 0.22, type: "sine", gain: 0.2, attack: 0.02, release: 0.16 },
    ]),
    click: buildTone(sr, [660], 0.06, {
      type: "square",
      gain: 0.12,
      attack: 0.005,
      release: 0.04,
    }),
    star: buildTone(sr, [1568, 2093], 0.3, {
      type: "sine",
      gain: 0.28,
      attack: 0.01,
      release: 0.22,
    }),
    win: seq(sr, [
      { freq: 523.25, dur: 0.13, type: "triangle", gain: 0.3, release: 0.06 },
      { freq: 659.25, dur: 0.13, type: "triangle", gain: 0.3, release: 0.06 },
      { freq: 783.99, dur: 0.13, type: "triangle", gain: 0.3, release: 0.06 },
      { freq: 1046.5, dur: 0.26, type: "triangle", gain: 0.32, release: 0.2 },
    ]),
  };
  const dir = join(root, "src", "assets", "sounds");
  mkdirSync(dir, { recursive: true });
  for (const [name, samples] of Object.entries(sounds)) {
    writeFileSync(join(dir, `${name}.wav`), writeWav(samples, sr));
    console.log("sound:", join("src/assets/sounds", `${name}.wav`));
  }
}

function generateAllIcons() {
  const dir = join(root, "src-tauri", "icons");
  mkdirSync(dir, { recursive: true });
  const sizes = [16, 24, 32, 48, 64, 128, 256, 512];
  const pngs = new Map();
  for (const n of sizes) {
    pngs.set(n, encodePNG(n, n, renderIcon(n)));
  }
  writeFileSync(join(dir, "32x32.png"), pngs.get(32));
  writeFileSync(join(dir, "128x128.png"), pngs.get(128));
  writeFileSync(join(dir, "128x128@2x.png"), pngs.get(256));
  writeFileSync(join(dir, "icon.png"), pngs.get(512));
  // Windows：内嵌 PNG 的 ICO（Vista+ 支持）。
  const ico = icoFile(
    [16, 32, 48, 64, 128, 256].map((size) => ({ size, png: pngs.get(size) }))
  );
  writeFileSync(join(dir, "icon.ico"), ico);
  // macOS：PNG 负载的 ICNS。
  const icns = icnsFile([
    ["ic11", pngs.get(32)],
    ["ic12", pngs.get(64)],
    ["ic07", pngs.get(128)],
    ["ic13", pngs.get(256)],
    ["ic14", pngs.get(512)],
  ]);
  writeFileSync(join(dir, "icon.icns"), icns);
  console.log("icons written to", join("src-tauri", "icons"));
}

generateAllIcons();
generateAllSounds();
console.log("ASSETS_DONE");
