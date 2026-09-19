import { useState } from "react";
import { api } from "../tauri/api";
import { Modal } from "./Modal";
import { DEFAULT_PIN } from "../game/catalog";
import { playSound } from "../feedback/sound";

interface PinGateProps {
  title?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

// 4 位数字 PIN 门禁。校验完全在后端完成（哈希存储），前端不持久化明文。
export function PinGate({ title = "家长验证", onSuccess, onCancel }: PinGateProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const press = (d: string) => {
    if (checking) return;
    setError(false);
    playSound("click");
    const next = d === "back" ? pin.slice(0, -1) : pin.length < 4 ? pin + d : pin;
    setPin(next);
    if (d !== "back" && next.length === 4) {
      void verify(next);
    }
  };

  const verify = async (value: string) => {
    setChecking(true);
    try {
      const ok = await api.verifyPin(value);
      if (ok) {
        playSound("correct");
        onSuccess();
      } else {
        playSound("wrong");
        setError(true);
        setPin("");
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <Modal>
      <div className="center" style={{ flexDirection: "column", gap: 18, textAlign: "center" }}>
        <div style={{ fontSize: 64 }} aria-hidden>
          🔒
        </div>
        <h2 style={{ fontSize: 34 }}>{title}</h2>
        <div className="pin-dots" aria-label="PIN 输入">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`dot ${i < pin.length ? "on" : ""}`} />
          ))}
        </div>
        <div
          className="muted"
          style={{
            minHeight: 26,
            fontWeight: 800,
            color: error ? "#c24a3a" : undefined,
          }}
        >
          {error ? "PIN 不对哦，请再试一次" : checking ? "验证中…" : " "}
        </div>

        <div className="keypad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button key={d} onClick={() => press(d)}>
              {d}
            </button>
          ))}
          <button onClick={() => press("back")} aria-label="删除">
            ⌫
          </button>
          <button onClick={() => press("0")}>0</button>
          <button onClick={onCancel} aria-label="取消">
            ✕
          </button>
        </div>

        <p className="muted" style={{ fontSize: 17, margin: 0 }}>
          默认 PIN 为 {DEFAULT_PIN}，进入后请尽快修改
        </p>
      </div>
    </Modal>
  );
}
