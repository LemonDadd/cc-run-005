import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "../store/sessionStore";
import { ACHIEVEMENT_BY_CODE, GAMES, ITEM_BY_CODE } from "../game/catalog";
import { celebrate } from "../feedback";
import { playSound } from "../feedback/sound";

export function Reward() {
  const navigate = useNavigate();
  const { gameType, level, result, clear } = useSessionStore();

  useEffect(() => {
    if (!result) {
      navigate("/home", { replace: true });
      return;
    }
    const t = window.setTimeout(() => celebrate(), 250);
    return () => window.clearTimeout(t);
  }, [result, navigate]);

  const stars = result?.stars ?? 0;
  const percent = useMemo(
    () => Math.round((result?.accuracy ?? 0) * 100),
    [result]
  );

  if (!result || !gameType) return null;
  const meta = GAMES[gameType];

  const again = () => {
    playSound("click");
    clear();
    navigate(`/game/${gameType}`, { replace: true });
  };
  const home = () => {
    playSound("click");
    clear();
    navigate("/home", { replace: true });
  };

  return (
    <div className="app-screen center" style={{ padding: 24 }}>
      <div className="card" style={{ width: "min(720px,96vw)", textAlign: "center", display: "grid", gap: 18 }}>
        <div style={{ fontSize: 70 }} aria-hidden>
          {meta.emoji}
        </div>
        <h1 style={{ fontSize: 40 }}>
          {stars === 2 ? "太棒啦，全部答对！" : stars === 1 ? "真厉害，完成一回合！" : "完成啦，继续加油！"}
        </h1>

        <div className="row" style={{ justifyContent: "center", gap: 16, fontSize: 64 }}>
          {[0, 1].map((i) => (
            <span
              key={i}
              className={i < stars ? "float" : ""}
              style={{
                opacity: i < stars ? 1 : 0.22,
                animationDelay: `${i * 0.25}s`,
              }}
              aria-hidden
            >
              ⭐
            </span>
          ))}
        </div>

        <div className="row wrap" style={{ justifyContent: "center", gap: 12 }}>
          <span className="pill">正确率 {percent}%</span>
          <span className="pill">
            答对 {result.correct} / {result.total} 题
          </span>
          <span className="pill">Level {level}</span>
          <span className="pill">累计 ⭐ {result.starsTotal}</span>
        </div>

        {result.newItems.length > 0 && (
          <div className="card" style={{ background: "#fff7e0", boxShadow: "none" }}>
            <h3 style={{ fontSize: 26 }}>🎁 解锁新饰品！</h3>
            <div className="row wrap" style={{ justifyContent: "center", gap: 14, marginTop: 10 }}>
              {result.newItems.map((it) => {
                const def = ITEM_BY_CODE[it.itemCode];
                return (
                  <div key={it.itemCode} className="center" style={{ gap: 4 }}>
                    <span style={{ fontSize: 52 }} aria-hidden>
                      {def?.emoji ?? "🎁"}
                    </span>
                    <strong style={{ fontSize: 19 }}>{def?.name ?? it.itemCode}</strong>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {result.newAchievements.length > 0 && (
          <div className="card" style={{ background: "#eef4ff", boxShadow: "none" }}>
            <h3 style={{ fontSize: 26 }}>🏅 获得新徽章！</h3>
            <div className="row wrap" style={{ justifyContent: "center", gap: 14, marginTop: 10 }}>
              {result.newAchievements.map((a) => {
                const def = ACHIEVEMENT_BY_CODE[a.code];
                return (
                  <div key={a.code} className="center" style={{ gap: 4, maxWidth: 160 }}>
                    <span style={{ fontSize: 50 }} aria-hidden>
                      {def?.emoji ?? "🏅"}
                    </span>
                    <strong style={{ fontSize: 20 }}>{def?.name ?? a.code}</strong>
                    <span className="muted" style={{ fontSize: 16 }}>
                      {def?.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="row wrap" style={{ justifyContent: "center", gap: 14 }}>
          <button className="btn" onClick={again}>
            🔁 再玩一次
          </button>
          <button className="btn btn-purple" onClick={() => { playSound("click"); navigate("/gallery"); }}>
            🎨 去装扮
          </button>
          <button className="btn btn-secondary" onClick={home}>
            🏠 回首页
          </button>
        </div>
      </div>
    </div>
  );
}
