import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PinGate } from "../components/PinGate";
import {
  DAILY_LIMIT_MAX,
  DAILY_LIMIT_MIN,
  GAMES,
  GAME_TYPES,
  ageFromBirthday,
} from "../game/catalog";
import { api } from "../tauri/api";
import { useAppStore } from "../store/appStore";
import { playSound } from "../feedback/sound";
import type { ProfileStats, SafeSettings } from "../types";

export function ParentPanel() {
  const navigate = useNavigate();
  const { profiles } = useAppStore();
  const [unlocked, setUnlocked] = useState(false);
  const [settings, setSettings] = useState<SafeSettings | null>(null);
  const [stats, setStats] = useState<ProfileStats[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const s = await api.getSettings();
    setSettings(s);
    const all = await Promise.all(profiles.map((p) => api.getStats(p.id)));
    setStats(all);
    setSelectedId((cur) => (all.some((x) => x.profile.id === cur) ? cur : all[0]?.profile.id ?? null));
  }, [profiles]);

  useEffect(() => {
    if (unlocked) void load();
  }, [unlocked, load]);

  if (!unlocked) {
    return (
      <div className="app-screen center">
        <button
          className="btn btn-ghost"
          style={{ position: "absolute", top: 24, left: 28 }}
          onClick={() => navigate(-1)}
        >
          ← 返回
        </button>
        <PinGate title="家长面板" onSuccess={() => setUnlocked(true)} onCancel={() => navigate("/home")} />
      </div>
    );
  }

  const current = stats.find((s) => s.profile.id === selectedId) ?? null;

  return (
    <div className="app-screen">
      <header className="topbar">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            playSound("click");
            navigate("/");
          }}
        >
          ← 退出家长面板
        </button>
        <h2 style={{ fontSize: 30 }}>👪 家长面板</h2>
        <span className="spacer" />
      </header>

      <div className="content row" style={{ gap: 24, alignItems: "flex-start" }}>
        {/* 左：孩子列表 */}
        <div className="card" style={{ width: 280 }}>
          <h3 style={{ fontSize: 24, marginBottom: 12 }}>孩子</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {stats.length === 0 && <p className="muted">还没有孩子档案</p>}
            {stats.map((s) => (
              <button
                key={s.profile.id}
                className="option-btn"
                style={{
                  minHeight: 64,
                  fontSize: 22,
                  textAlign: "left",
                  padding: "10px 16px",
                  background: selectedId === s.profile.id ? "var(--success-bg)" : "#fff",
                  boxShadow: selectedId === s.profile.id ? "0 0 0 3px var(--success)" : undefined,
                }}
                onClick={() => setSelectedId(s.profile.id)}
              >
                {s.profile.nickname} · {s.ageYears}岁
              </button>
            ))}
          </div>
        </div>

        {/* 中：孩子统计与管理 */}
        <div className="grow card" style={{ minWidth: 380 }}>
          {current ? <ChildManager key={current.profile.id} stats={current} onChanged={() => void load()} /> : (
            <p className="muted">请选择一个孩子</p>
          )}
        </div>

        {/* 右：全局设置 */}
        <div className="card" style={{ width: 320 }}>
          <SettingsManager settings={settings} onChanged={() => void load()} />
        </div>
      </div>
    </div>
  );
}

function ChildManager({
  stats,
  onChanged,
}: {
  stats: ProfileStats;
  onChanged: () => void;
}) {
  const { removeProfile } = useAppStore();
  const [level, setLevel] = useState(stats.effectiveLevel);
  const [override, setOverride] = useState(stats.profile.levelOverride != null);
  const [msg, setMsg] = useState<string | null>(null);
  const age = ageFromBirthday(stats.profile.birthday);

  const saveLevel = async () => {
    await api.setLevelOverride(stats.profile.id, override ? level : null);
    playSound("correct");
    setMsg("难度已保存");
    onChanged();
    window.setTimeout(() => setMsg(null), 1500);
  };

  const resetProgress = async () => {
    if (!window.confirm(`确定清空 ${stats.profile.nickname} 的全部星星、记录、徽章和饰品吗？此操作不可恢复。`))
      return;
    // 删除后用相同资料重建一个空档案（保留昵称/生日/头像）。
    const p = stats.profile;
    await api.deleteProfile(p.id);
    await api.createProfile({
      nickname: p.nickname,
      birthday: p.birthday,
      avatar: p.avatar,
    });
    await useAppStore.getState().loadProfiles();
    onChanged();
  };

  const deleteChild = async () => {
    if (!window.confirm(`确定删除 ${stats.profile.nickname} 的整个档案吗？此操作不可恢复。`)) return;
    await removeProfile(stats.profile.id);
    onChanged();
  };

  const pct = Math.round(stats.accuracy * 100);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ fontSize: 28 }}>
          {stats.profile.nickname}
          <span className="muted" style={{ fontSize: 20, marginLeft: 10 }}>
            {age} 岁
          </span>
        </h3>
        <span className="pill">⭐ {stats.profile.starsTotal}</span>
      </div>

      <div className="row wrap" style={{ gap: 10 }}>
        <span className="pill">总回合 {stats.roundsTotal}</span>
        <span className="pill">答对 {stats.totalCorrect} 题</span>
        <span className="pill">总正确率 {pct}%</span>
        <span className="pill">徽章 {stats.achievements.length}</span>
        <span className="pill">饰品 {stats.itemsUnlocked}</span>
      </div>

      <div>
        <h4 style={{ fontSize: 22, margin: "6px 0" }}>各游戏进度</h4>
        <div className="row wrap" style={{ gap: 10 }}>
          {GAME_TYPES.map((g) => {
            const gp = stats.games.find((x) => x.gameType === g);
            return (
              <div
                key={g}
                className="card"
                style={{ width: 200, padding: 14, boxShadow: "none", background: "#f7f4ea" }}
              >
                <strong style={{ fontSize: 20 }}>
                  {GAMES[g].emoji} {GAMES[g].name}
                </strong>
                {gp ? (
                  <div className="muted" style={{ fontSize: 17, marginTop: 4 }}>
                    回合 {gp.rounds} · 最高 Lv{gp.bestLevel}
                    <br />
                    正确率 {Math.round(gp.accuracy * 100)}%
                  </div>
                ) : (
                  <div className="muted" style={{ fontSize: 17, marginTop: 4 }}>
                    还没玩过
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ background: "#f2f8ff", boxShadow: "none" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <strong style={{ fontSize: 22 }}>难度等级（自动：{Math.max(1, Math.min(5, age - 2))}）</strong>
          <label className="row" style={{ fontSize: 19, gap: 8 }}>
            <input
              type="checkbox"
              checked={override}
              onChange={(e) => setOverride(e.target.checked)}
              style={{ width: 24, height: 24 }}
            />
            手动调整
          </label>
        </div>
        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          {[1, 2, 3, 4, 5].map((lv) => (
            <button
              key={lv}
              className="option-btn"
              disabled={!override}
              onClick={() => setLevel(lv)}
              style={{
                minHeight: 56,
                flex: 1,
                background: level === lv ? "var(--secondary)" : "#fff",
                color: level === lv ? "#fff" : "var(--ink)",
                opacity: override ? 1 : 0.6,
              }}
            >
              Lv{lv}
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 12, gap: 10 }}>
          <button className="btn btn-sm btn-secondary" disabled={!override} onClick={() => void saveLevel()}>
            保存难度
          </button>
          {msg && <span style={{ color: "var(--success)", fontWeight: 800 }}>{msg}</span>}
        </div>
      </div>

      <div className="row wrap" style={{ gap: 12 }}>
        <button className="btn btn-sm btn-ghost" onClick={() => void resetProgress()}>
          ♻️ 重置该孩子进度
        </button>
        <button
          className="btn btn-sm"
          style={{ background: "linear-gradient(180deg,#ff8a8a,#e05050)", boxShadow: "0 6px 0 #b53b3b,var(--shadow)" }}
          onClick={() => void deleteChild()}
        >
          🗑️ 删除档案
        </button>
      </div>
    </div>
  );
}

function SettingsManager({
  settings,
  onChanged,
}: {
  settings: SafeSettings | null;
  onChanged: () => void;
}) {
  const [minutes, setMinutes] = useState(settings?.dailyLimitMinutes ?? 25);
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinMsg, setPinMsg] = useState<string | null>(null);
  const [pinErr, setPinErr] = useState(false);

  useEffect(() => {
    if (settings) setMinutes(settings.dailyLimitMinutes);
  }, [settings]);

  const saveMinutes = async () => {
    try {
      await api.setDailyLimit(minutes);
      playSound("correct");
      onChanged();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const savePin = async () => {
    setPinErr(false);
    if (!/^\d{4}$/.test(newPin)) {
      setPinMsg("新 PIN 必须是 4 位数字");
      setPinErr(true);
      return;
    }
    try {
      await api.changePin(oldPin, newPin);
      playSound("correct");
      setPinMsg("PIN 已修改");
      setOldPin("");
      setNewPin("");
      onChanged();
    } catch (e) {
      playSound("wrong");
      setPinMsg((e as Error).message || "原 PIN 不正确");
      setPinErr(true);
    }
    window.setTimeout(() => setPinMsg(null), 1800);
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <h3 style={{ fontSize: 24 }}>全局设置</h3>

      {settings?.isDefaultPin && (
        <div style={{ background: "#fff2d6", borderRadius: 16, padding: 12, fontSize: 18 }}>
          ⚠️ 当前仍是默认 PIN（0000），建议修改。
        </div>
      )}

      <div>
        <strong style={{ fontSize: 21 }}>每日游玩时长</strong>
        <p className="muted" style={{ fontSize: 17, margin: "4px 0 10px" }}>
          {DAILY_LIMIT_MIN}-{DAILY_LIMIT_MAX} 分钟，到点温和提醒并保存进度。
        </p>
        <div className="row">
          <input
            type="range"
            min={DAILY_LIMIT_MIN}
            max={DAILY_LIMIT_MAX}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            style={{ flex: 1, height: 30 }}
          />
          <span className="pill" style={{ minWidth: 96, justifyContent: "center" }}>
            {minutes} 分钟
          </span>
        </div>
        <button className="btn btn-sm btn-secondary" style={{ marginTop: 10 }} onClick={() => void saveMinutes()}>
          保存时长
        </button>
      </div>

      <div>
        <strong style={{ fontSize: 21 }}>修改 PIN</strong>
        <div className="field" style={{ marginTop: 8 }}>
          <input
            inputMode="numeric"
            maxLength={4}
            placeholder="当前 PIN"
            value={oldPin}
            onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <div className="field">
          <input
            inputMode="numeric"
            maxLength={4}
            placeholder="新 PIN（4 位数字）"
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <button className="btn btn-sm" onClick={() => void savePin()}>
          保存 PIN
        </button>
        {pinMsg && (
          <div
            style={{
              marginTop: 8,
              fontWeight: 800,
              color: pinErr ? "#c24a3a" : "var(--success)",
            }}
          >
            {pinMsg}
          </div>
        )}
      </div>
    </div>
  );
}
