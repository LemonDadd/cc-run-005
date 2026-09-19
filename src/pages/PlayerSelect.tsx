import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/appStore";
import { Avatar } from "../components/Avatar";
import { api } from "../tauri/api";
import { ageFromBirthday } from "../game/catalog";
import { playSound } from "../feedback/sound";
import type { LevelInfo } from "../types";

export function PlayerSelect() {
  const navigate = useNavigate();
  const { profiles, selectProfile, boot } = useAppStore();
  const [ages, setAges] = useState<Record<number, LevelInfo>>({});

  useEffect(() => {
    void boot();
  }, [boot]);

  useEffect(() => {
    let alive = true;
    Promise.all(
      profiles.map(async (p) => [p.id, await api.profileLevelInfo(p.id)] as const)
    ).then((entries) => {
      if (alive) setAges(Object.fromEntries(entries));
    });
    return () => {
      alive = false;
    };
  }, [profiles]);

  const enter = async (id: number) => {
    playSound("click");
    await selectProfile(id);
    navigate("/home");
  };

  return (
    <div className="app-screen" style={{ padding: "24px 28px" }}>
      <header className="topbar">
        <h1 style={{ fontSize: 40 }}>
          <span aria-hidden>🧮</span> KidMath
        </h1>
        <span className="spacer" />
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            playSound("click");
            navigate("/parent");
          }}
          aria-label="家长入口"
        >
          👪 家长
        </button>
      </header>

      <div className="content center" style={{ flexDirection: "column", gap: 26 }}>
        <div className="center" style={{ flexDirection: "column", gap: 6, textAlign: "center" }}>
          <h2 style={{ fontSize: 34 }}>
            {profiles.length === 0 ? "欢迎来到 KidMath！" : "今天谁来玩呀？"}
          </h2>
          <p className="muted" style={{ fontSize: 22, margin: 0 }}>
            点一点你的头像，开始数学冒险吧 🚀
          </p>
        </div>

        <div
          className="row wrap"
          style={{ justifyContent: "center", maxWidth: 980, gap: 24 }}
        >
          {profiles.map((p) => {
            const info = ages[p.id];
            const age = info?.ageYears ?? ageFromBirthday(p.birthday);
            return (
              <div
                key={p.id}
                className="card center"
                style={{
                  width: 220,
                  gap: 12,
                  cursor: "pointer",
                  textAlign: "center",
                  padding: 24,
                }}
                onClick={() => void enter(p.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void enter(p.id);
                }}
              >
                <Avatar profile={p} size="lg" />
                <div style={{ fontSize: 28, fontWeight: 900 }}>{p.nickname}</div>
                <div className="pill" style={{ fontSize: 18 }}>
                  {age} 岁 · ⭐ {p.starsTotal}
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ minHeight: 44, fontSize: 18 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    playSound("click");
                    navigate(`/profile/${p.id}/edit`);
                  }}
                >
                  ✏️ 修改资料
                </button>
              </div>
            );
          })}

          <button
            className="card center"
            style={{
              width: 220,
              height: 280,
              gap: 10,
              border: "4px dashed #d8d0bb",
              background: "rgba(255,255,255,0.7)",
              boxShadow: "none",
            }}
            onClick={() => {
              playSound("click");
              navigate("/profile/new");
            }}
          >
            <span style={{ fontSize: 72 }} aria-hidden>
              ➕
            </span>
            <span style={{ fontSize: 24, fontWeight: 800 }}>添加小朋友</span>
          </button>
        </div>
      </div>
    </div>
  );
}
