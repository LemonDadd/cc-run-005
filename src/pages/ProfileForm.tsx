import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AVATARS, AVATAR_EMOJI, ageFromBirthday, defaultLevel } from "../game/catalog";
import { useAppStore } from "../store/appStore";
import { playSound } from "../feedback/sound";

interface Props {
  mode: "create" | "edit";
}

function defaultBirthday(): string {
  // 默认 4 岁，对应默认 Level 2。
  const d = new Date();
  d.setFullYear(d.getFullYear() - 4);
  return d.toISOString().slice(0, 10);
}

export function ProfileForm({ mode }: Props) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { profiles, createProfile, updateProfile } = useAppStore();
  const existing = mode === "edit" ? profiles.find((p) => p.id === Number(id)) : undefined;

  const [nickname, setNickname] = useState(existing?.nickname ?? "");
  const [birthday, setBirthday] = useState(existing?.birthday ?? defaultBirthday());
  const [avatar, setAvatar] = useState(existing?.avatar ?? AVATARS[0]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === "edit" && !existing) navigate("/", { replace: true });
  }, [mode, existing, navigate]);

  const age = useMemo(() => ageFromBirthday(birthday), [birthday]);
  const level = defaultLevel(age);

  const save = async () => {
    const name = nickname.trim();
    if (!name) {
      setError("给小朋友起个名字吧");
      return;
    }
    if (!birthday) {
      setError("请选择生日");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = { nickname: name, birthday, avatar };
      if (mode === "create") {
        await createProfile(input);
        playSound("star");
        navigate("/home", { replace: true });
      } else if (existing) {
        await updateProfile(existing.id, input);
        playSound("click");
        navigate("/", { replace: true });
      }
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-screen" style={{ padding: "24px 28px" }}>
      <header className="topbar">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          ← 返回
        </button>
        <span className="spacer" />
      </header>

      <div className="content center">
        <div className="card" style={{ width: "min(680px, 96vw)", display: "grid", gap: 22 }}>
          <h2 style={{ fontSize: 34, textAlign: "center" }}>
            {mode === "create" ? "创建我的小档案 🎒" : "修改我的资料"}
          </h2>

          <div className="field">
            <label htmlFor="nick">我的名字</label>
            <input
              id="nick"
              maxLength={12}
              placeholder="点这里输入名字"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="bday">我的生日</label>
            <input
              id="bday"
              type="date"
              value={birthday}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setBirthday(e.target.value)}
            />
          </div>

          <div className="row" style={{ gap: 18, justifyContent: "center", flexWrap: "wrap" }}>
            <div className="pill">🎂 {age} 岁</div>
            <div className="pill">自动难度 Level {level}</div>
            <div className="pill muted" style={{ fontSize: 17 }}>
              家长可在家长面板调整难度
            </div>
          </div>

          <div className="field">
            <label>选一个头像</label>
            <div className="row wrap" style={{ gap: 12, justifyContent: "center" }}>
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    playSound("click");
                    setAvatar(a);
                  }}
                  aria-label={a}
                  className="avatar"
                  style={{
                    width: 76,
                    height: 76,
                    fontSize: 44,
                    outline: avatar === a ? "6px solid var(--secondary)" : "none",
                    outlineOffset: "2px",
                  }}
                >
                  {AVATAR_EMOJI[a]}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ color: "#c24a3a", fontWeight: 800, textAlign: "center" }}>
              {error}
            </div>
          )}

          <button className="btn btn-block" disabled={saving} onClick={() => void save()}>
            {saving ? "保存中…" : mode === "create" ? "开始玩！🎉" : "保存修改"}
          </button>
        </div>
      </div>
    </div>
  );
}
