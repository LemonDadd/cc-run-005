import type { ShapeKind } from "../game/generators";

interface ShapeViewProps {
  shape: ShapeKind;
  color: string;
  size?: number;
  stroke?: boolean;
  opacity?: number;
}

// 纯内联 SVG，圆润卡通风格；不依赖任何外部图片或 CDN。
export function ShapeView({
  shape,
  color,
  size = 96,
  stroke = true,
  opacity = 1,
}: ShapeViewProps) {
  const sw = size * 0.05;
  const strokeColor = "rgba(45,42,74,0.25)";
  const common = {
    fill: color,
    opacity,
    ...(stroke ? { stroke: strokeColor, strokeWidth: sw, strokeLinejoin: "round" as const } : {}),
  };

  let body: React.ReactNode = null;
  switch (shape) {
    case "circle":
      body = <circle cx="50" cy="50" r="42" {...common} />;
      break;
    case "square":
      body = <rect x="10" y="10" width="80" height="80" rx="20" {...common} />;
      break;
    case "triangle":
      body = <polygon points="50,10 90,86 10,86" {...common} />;
      break;
    case "star": {
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 42 : 18;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push(`${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`);
      }
      body = <polygon points={pts.join(" ")} {...common} />;
      break;
    }
    case "heart":
      body = (
        <path
          d="M50 86 C20 64 10 46 10 32 C10 18 22 10 34 10 C42 10 48 15 50 22 C52 15 58 10 66 10 C78 10 90 18 90 32 C90 46 80 64 50 86 Z"
          {...common}
        />
      );
      break;
    case "pentagon":
      body = <polygon points="50,8 92,38 76,88 24,88 8,38" {...common} />;
      break;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      style={{ display: "block", pointerEvents: "none" }}
    >
      {body}
    </svg>
  );
}

/** 表盘（认时钟游戏）。 */
export function ClockFace({
  hour,
  minute,
  size = 280,
}: {
  hour: number;
  minute: 0 | 30;
  size?: number;
}) {
  const minuteAngle = minute * 6; // 30 分 = 180°
  const hourAngle = ((hour % 12) + minute / 60) * 30;
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="时钟">
      <circle cx="100" cy="100" r="92" fill="#fff" stroke="#2d2a4a" strokeWidth="8" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6 - Math.PI / 2;
        const x1 = 100 + Math.cos(a) * 78;
        const y1 = 100 + Math.sin(a) * 78;
        const x2 = 100 + Math.cos(a) * 88;
        const y2 = 100 + Math.sin(a) * 88;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#2d2a4a"
            strokeWidth="5"
            strokeLinecap="round"
          />
        );
      })}
      <g transform={`rotate(${hourAngle} 100 100)`}>
        <line x1="100" y1="108" x2="100" y2="52" stroke="#2d2a4a" strokeWidth="9" strokeLinecap="round" />
      </g>
      <g transform={`rotate(${minuteAngle} 100 100)`}>
        <line x1="100" y1="112" x2="100" y2="34" stroke="#ff6b6b" strokeWidth="6" strokeLinecap="round" />
      </g>
      <circle cx="100" cy="100" r="8" fill="#2d2a4a" />
    </svg>
  );
}
