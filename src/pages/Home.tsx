import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { PinGate } from "../components/PinGate";
import {
  COMING_SOON,
  GAMES,
  GAME_TYPES,
  ageFromBirthday,
} from "../game/catalog";
import { useAppStore } from "../store/appStore";
import { usageController } from "../feedback/usage";
import { isSoundEnabled, setSoundEnabled, playSound } from "../feedback/sound";
import { isTtsEnabled, setTtsEnabled } from "../feedback/tts";
import type { GameType, UsageStatus } from "../types";

export function Home() {
  const navigate = useNavigate();
  const { current, switchPlayer, refreshCurrent } = useAppStore();
  const [showPin, setShowPin] = useState(false);
  const [usage, setUsage] = useState<UsageStatus | null>(null);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [ttsOn, setTtsOn] = useState(isTtsEnabled());

  useEffect(() => {
    void refreshCurrent();
  }, [refreshCurrent]);

  useEffect(() => {
    if (!current) return;
    void usageController.refresh(current.id).then(setUsage);
    const unsub = usageController.subscribe(setUsage);
    return unsub;
  }, [current]);

  if (!current) return null;
  const age = ageFromBirthday(current.birthday);

  const enterGame = (g: GameType) => {
    if (usage?.limitReached) return;
    playSound("click");
    navigate(`/game/${g}`);
  };

  return (
    <div className="app-screen">
      <header className="topbar">
        <button
          className="row"
          style={{
            background: "none",
            padding: 0,
            alignItems: "center",
            gap: 12,
          }}
          onClick={() => {
            playSound("click");
            navigate("/gallery");
          }}
        >
          <Avatar profile={current} size="sm" />
          <span style={{ textAlign: "left" }}>
            <span style={{ display: "block", fontSize: 24, fontWeight: 900 }}>
              {current.nickname}
            </span>
            <span className="muted" style={{ fontSize: 17 }}>
              {age} 岁
            </span>
          </span>
        </button>

        <span className="spacer" />

        <span className="pill" style={{ fontSize: 22 }}>
          ⭐ {current.starsTotal}
        </span>
        <button
          className="pill"
          title="声音开关"
          onClick={() => {
            const v = !soundOn;
            setSoundEnabled(v);
            setSoundOn(v);
            if (v) playSound("click");
          }}
        >
          {soundOn ? "🔊" : "🔇"}
        </button>
        <button
          className="pill"
          title="语音朗读开关"
          onClick={() => {
            const v = !ttsOn;
            setTtsEnabled(v);
            setTtsOn(v);
          }}
        >
          {ttsOn ? "🗣️" : "🤐"}
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            playSound("click");
            void usageController.stop().then(() => {
              switchPlayer();
              navigate("/");
            });
          }}
        >
          🔄 换玩家
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            playSound("click");
            setShowPin(true);
          }}
        >
          👪 家长
        </button>
      </header>

      {usage && (
        <div style={{ padding: "0 28px" }}>
          <div className="row" style={{ gap: 10 }}>
            <span className="muted" style={{ fontSize: 17 }}>
              今日还可以玩 {Math.ceil(usage.remainingSeconds / 60)} 分钟
            </span>
            <div className="grow progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(100, (usage.usedSeconds / usage.limitSeconds) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="content">
        <div
          className="row wrap"
          style={{ gap: 20, justifyContent: "center", paddingTop: 10 }}
        >
          {GAME_TYPES.map((g) => {
            const meta = GAMES[g];
            const locked = !!usage?.limitReached;
            return (
              <button
                key={g}
                className="card center"
                disabled={locked}
                onClick={() => enterGame(g)}
                style={{
                  width: 250,
                  height: 220,
                  border: "none",
                  background: meta.gradient,
                  color: "#fff",
                  gap: 10,
                  opacity: locked ? 0.6 : 1,
                }}
              >
                <span className="float" style={{ fontSize: 78 }} aria-hidden>
                  {meta.emoji}
                </span>
                <span style={{ fontSize: 28, fontWeight: 900, textShadow: "0 2px 0 rgba(0,0,0,.12)" }}>
                  {meta.name}
                </span>
                <span style={{ fontSize: 18, opacity: 0.95 }}>{meta.description}</span>
              </button>
            );
          })}
        </div>

        <section style={{ marginTop: 30 }}>
          <h3 className="muted" style={{ fontSize: 24, marginBottom: 14 }}>
            🌟 即将推出
          </h3>
          <div className="row wrap" style={{ gap: 14 }}>
            {COMING_SOON.map((c) => (
              <div
                key={c.name}
                className="row"
                style={{
                  background: "#fff",
                  borderRadius: 999,
                  padding: "12px 22px",
                  boxShadow: "var(--shadow)",
                  opacity: 0.75,
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 30 }} aria-hidden>
                  {c.emoji}
                </span>
                <span style={{ fontWeight: 800, fontSize: 20 }}>{c.name}</span>
                <span className="muted" style={{ fontSize: 16 }}>
                  敬请期待
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {showPin && (
        <PinGate
          onCancel={() => setShowPin(false)}
          onSuccess={() => navigate("/parent")}
        />
      )}
    </div>
  );
}
