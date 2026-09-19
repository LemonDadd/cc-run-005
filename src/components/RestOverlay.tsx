interface RestOverlayProps {
  usedMinutes: number;
  onGoHome: () => void;
}

// 每日时长到点时的温和休息动画（无“失败”字样）。进度已在触发时保存。
export function RestOverlay({ usedMinutes, onGoHome }: RestOverlayProps) {
  return (
    <div className="overlay">
      <div
        className="modal center"
        style={{ textAlign: "center", gap: 14, maxWidth: 520 }}
      >
        <div className="rest-moon" aria-hidden>
          🌙😴
        </div>
        <div className="zzz" aria-hidden>
          <span>Z</span>
          <span>z</span>
          <span>z</span>
        </div>
        <h2 style={{ fontSize: 38 }}>该休息啦～</h2>
        <p className="muted" style={{ fontSize: 22, margin: "4px 0 10px" }}>
          今天已经玩了 {Math.round(usedMinutes)} 分钟，
          <br />
          你的星星和进度都已经收好啦！🌟
        </p>
        <button className="btn btn-block" onClick={onGoHome} autoFocus>
          回到首页 🏠
        </button>
      </div>
    </div>
  );
}
