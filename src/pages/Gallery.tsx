import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import {
  ACHIEVEMENTS,
  ITEMS,
  SLOT_NAMES,
  type ItemDef,
} from "../game/catalog";
import { api } from "../tauri/api";
import { useAppStore } from "../store/appStore";
import { playSound } from "../feedback/sound";
import type { Achievement, UnlockedItem } from "../types";

const SLOT_ORDER: ItemDef["slot"][] = ["hat", "glasses", "bg", "pet"];

export function Gallery() {
  const navigate = useNavigate();
  const { current, refreshCurrent } = useAppStore();
  const [items, setItems] = useState<UnlockedItem[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [tab, setTab] = useState<"dress" | "badge">("dress");

  const load = useCallback(async () => {
    if (!current) return;
    const [it, ach] = await Promise.all([
      api.listItems(current.id),
      api.listAchievements(current.id),
    ]);
    setItems(it);
    setAchievements(ach);
  }, [current]);

  useEffect(() => {
    void load();
  }, [load]);

  const owned = useMemo(() => new Set(items.map((i) => i.itemCode)), [items]);
  const earnedCodes = useMemo(() => new Set(achievements.map((a) => a.code)), [achievements]);

  if (!current) return null;

  const equip = async (item: ItemDef) => {
    playSound("click");
    await api.setEquipped(current.id, item.slot, item.code);
    await refreshCurrent();
  };
  const unequip = async (slot: ItemDef["slot"]) => {
    playSound("click");
    await api.setEquipped(current.id, slot, null);
    await refreshCurrent();
  };

  return (
    <div className="app-screen">
      <header className="topbar">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate("/home")}>
          ← 返回
        </button>
        <h2 style={{ fontSize: 32 }}>🎨 饰品图鉴 & 装扮</h2>
        <span className="spacer" />
        <span className="pill">⭐ {current.starsTotal}</span>
      </header>

      <div className="content row" style={{ gap: 24, alignItems: "flex-start", justifyContent: "center" }}>
        {/* 预览 */}
        <div className="card center" style={{ width: 300, gap: 16, position: "sticky", top: 10 }}>
          <Avatar profile={current} size="lg" />
          <div style={{ fontSize: 28, fontWeight: 900 }}>{current.nickname}</div>
          <div className="row wrap" style={{ gap: 8, justifyContent: "center" }}>
            {SLOT_ORDER.map((slot) => (
              <button
                key={slot}
                className="btn btn-ghost btn-sm"
                style={{ minHeight: 44, fontSize: 17 }}
                onClick={() => void unequip(slot)}
              >
                取下{SLOT_NAMES[slot]}
              </button>
            ))}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button
              className={`btn btn-sm ${tab === "dress" ? "" : "btn-ghost"}`}
              onClick={() => setTab("dress")}
            >
              饰品
            </button>
            <button
              className={`btn btn-sm ${tab === "badge" ? "btn-purple" : "btn-ghost"}`}
              onClick={() => setTab("badge")}
            >
              徽章
            </button>
          </div>
        </div>

        {/* 列表 */}
        <div className="grow" style={{ minWidth: 320, maxWidth: 720 }}>
          {tab === "dress" ? (
            SLOT_ORDER.map((slot) => (
              <section key={slot} style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 24, marginBottom: 12 }}>{SLOT_NAMES[slot]}</h3>
                <div className="row wrap" style={{ gap: 14 }}>
                  {ITEMS.filter((i) => i.slot === slot).map((item) => {
                    const has = owned.has(item.code);
                    const equipped = (() => {
                      try {
                        return JSON.parse(current.equipped)[slot] === item.code;
                      } catch {
                        return false;
                      }
                    })();
                    return (
                      <button
                        key={item.code}
                        className="card center"
                        disabled={!has}
                        onClick={() => void equip(item)}
                        style={{
                          width: 132,
                          minHeight: 150,
                          gap: 6,
                          padding: 14,
                          opacity: has ? 1 : 0.55,
                          outline: equipped ? "5px solid var(--success)" : "none",
                          outlineOffset: 2,
                          border: "none",
                        }}
                      >
                        <span style={{ fontSize: 48, filter: has ? "none" : "grayscale(1)" }}>
                          {has ? item.emoji : "🔒"}
                        </span>
                        <strong style={{ fontSize: 19 }}>{item.name}</strong>
                        <span className="muted" style={{ fontSize: 16 }}>
                          {has ? (equipped ? "已穿戴" : "点击穿戴") : `⭐ ${item.atStars} 解锁`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          ) : (
            <div className="row wrap" style={{ gap: 14 }}>
              {ACHIEVEMENTS.map((a) => {
                const has = earnedCodes.has(a.code);
                return (
                  <div
                    key={a.code}
                    className="card center"
                    style={{
                      width: 180,
                      minHeight: 190,
                      gap: 6,
                      padding: 16,
                      textAlign: "center",
                      opacity: has ? 1 : 0.55,
                      background: has ? "#fff" : "#f4f1e8",
                    }}
                  >
                    <span style={{ fontSize: 52, filter: has ? "none" : "grayscale(1)" }}>
                      {has ? a.emoji : "🔒"}
                    </span>
                    <strong style={{ fontSize: 20 }}>{a.name}</strong>
                    <span className="muted" style={{ fontSize: 16 }}>
                      {a.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
