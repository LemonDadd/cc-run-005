import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./env";
import { webBackend } from "./webBackend";
import type {
  Achievement,
  LevelInfo,
  Profile,
  ProfileInput,
  ProfileStats,
  RecordGameInput,
  SafeSettings,
  SessionResult,
  UnlockedItem,
  UsageStatus,
} from "../types";

// 所有数据库操作都经此封装：桌面端走 Tauri command（前端不直接访问文件系统），
// 浏览器开发/预览时走内存+localStorage 的等价实现，UI 行为保持一致。
async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    return invoke<T>(cmd, args);
  }
  return webBackend.handle<T>(cmd, args ?? {});
}

export const api = {
  listProfiles: () => call<Profile[]>("list_profiles"),
  createProfile: (input: ProfileInput) =>
    call<Profile>("create_profile", { input }),
  updateProfile: (id: number, input: ProfileInput) =>
    call<Profile>("update_profile", { id, input }),
  deleteProfile: (id: number) => call<void>("delete_profile", { id }),
  setLevelOverride: (profileId: number, level: number | null) =>
    call<void>("set_level_override", { profileId, level }),
  setEquipped: (profileId: number, slot: string, itemCode: string | null) =>
    call<string>("set_equipped", { profileId, slot, itemCode }),

  getSettings: () => call<SafeSettings>("get_settings"),
  verifyPin: (pin: string) => call<boolean>("verify_pin", { pin }),
  changePin: (oldPin: string, newPin: string) =>
    call<void>("change_pin", { oldPin, newPin }),
  setDailyLimit: (minutes: number) =>
    call<void>("set_daily_limit", { minutes }),

  getUsage: (profileId: number) =>
    call<UsageStatus>("get_usage", { profileId }),
  addUsage: (profileId: number, seconds: number) =>
    call<UsageStatus>("add_usage", { profileId, seconds }),

  recordGame: (input: RecordGameInput) =>
    call<SessionResult>("record_game", { input }),
  getStats: (profileId: number) =>
    call<ProfileStats>("get_stats", { profileId }),
  listItems: (profileId: number) =>
    call<UnlockedItem[]>("list_items", { profileId }),
  listAchievements: (profileId: number) =>
    call<Achievement[]>("list_achievements", { profileId }),
  profileLevelInfo: (profileId: number) =>
    call<LevelInfo>("profile_level_info", { profileId }),
};
