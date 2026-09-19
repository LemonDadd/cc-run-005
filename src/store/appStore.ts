import { create } from "zustand";
import { api } from "../tauri/api";
import type { Profile, ProfileInput, SafeSettings } from "../types";

const ACTIVE_KEY = "kidmath.activeProfileId";

function readActiveId(): number | null {
  try {
    const v = localStorage.getItem(ACTIVE_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

interface AppState {
  profiles: Profile[];
  current: Profile | null;
  settings: SafeSettings | null;
  booted: boolean;
  busy: boolean;

  boot: () => Promise<void>;
  loadProfiles: () => Promise<Profile[]>;
  selectProfile: (id: number) => Promise<void>;
  refreshCurrent: () => Promise<void>;
  createProfile: (input: ProfileInput) => Promise<Profile>;
  updateProfile: (id: number, input: ProfileInput) => Promise<void>;
  removeProfile: (id: number) => Promise<void>;
  switchPlayer: () => void;
  loadSettings: () => Promise<SafeSettings>;
  reloadSettings: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  profiles: [],
  current: null,
  settings: null,
  booted: false,
  busy: false,

  boot: async () => {
    set({ busy: true });
    try {
      const [profiles, settings] = await Promise.all([
        api.listProfiles(),
        api.getSettings(),
      ]);
      const activeId = readActiveId();
      const current =
        profiles.find((p) => p.id === activeId) ?? profiles[0] ?? null;
      if (current) localStorage.setItem(ACTIVE_KEY, String(current.id));
      set({ profiles, current, settings, booted: true, busy: false });
    } finally {
      set({ booted: true, busy: false });
    }
  },

  loadProfiles: async () => {
    const profiles = await api.listProfiles();
    set({ profiles });
    return profiles;
  },

  selectProfile: async (id) => {
    await get().loadProfiles();
    const current = get().profiles.find((p) => p.id === id) ?? null;
    if (current) {
      localStorage.setItem(ACTIVE_KEY, String(id));
      set({ current });
    }
  },

  refreshCurrent: async () => {
    const { current } = get();
    if (!current) return;
    const profiles = await api.listProfiles();
    const updated = profiles.find((p) => p.id === current.id) ?? null;
    set({ profiles, current: updated });
  },

  createProfile: async (input) => {
    const profile = await api.createProfile(input);
    const profiles = await get().loadProfiles();
    localStorage.setItem(ACTIVE_KEY, String(profile.id));
    set({ current: profiles.find((p) => p.id === profile.id) ?? profile });
    return profile;
  },

  updateProfile: async (id, input) => {
    await api.updateProfile(id, input);
    const profiles = await get().loadProfiles();
    const { current } = get();
    if (current?.id === id) {
      set({ current: profiles.find((p) => p.id === id) ?? current });
    }
  },

  removeProfile: async (id) => {
    await api.deleteProfile(id);
    if (readActiveId() === id) localStorage.removeItem(ACTIVE_KEY);
    const profiles = await get().loadProfiles();
    const current = profiles[0] ?? null;
    if (current) localStorage.setItem(ACTIVE_KEY, String(current.id));
    set({ current });
  },

  switchPlayer: () => {
    localStorage.removeItem(ACTIVE_KEY);
    set({ current: null });
  },

  loadSettings: async () => {
    const settings = await api.getSettings();
    set({ settings });
    return settings;
  },

  reloadSettings: async () => {
    const settings = await api.getSettings();
    set({ settings });
  },
}));

export interface EquippedSlots {
  hat?: string;
  glasses?: string;
  bg?: string;
  pet?: string;
}

export function parseEquipped(profile: Profile | null): EquippedSlots {
  if (!profile?.equipped) return {};
  try {
    return JSON.parse(profile.equipped) as EquippedSlots;
  } catch {
    return {};
  }
}
