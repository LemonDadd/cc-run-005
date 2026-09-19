import { create } from "zustand";
import { useAppStore } from "./appStore";
import type { GameType, SessionResult } from "../types";

export { useAppStore };

interface SessionState {
  gameType: GameType | null;
  level: number;
  result: SessionResult | null;
  setSession: (s: { gameType: GameType; level: number; result: SessionResult }) => void;
  clear: () => void;
}

// 奖励页读取的最近一回合结算结果（数据已落 SQLite，这里仅用于页面间传递展示）。
export const useSessionStore = create<SessionState>((set) => ({
  gameType: null,
  level: 1,
  result: null,
  setSession: ({ gameType, level, result }) => set({ gameType, level, result }),
  clear: () => set({ gameType: null, result: null }),
}));
