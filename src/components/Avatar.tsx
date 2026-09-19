import { AVATAR_EMOJI, ITEM_BY_CODE } from "../game/catalog";
import { parseEquipped, type EquippedSlots } from "../store/appStore";
import type { Profile } from "../types";

interface AvatarProps {
  profile: Pick<Profile, "avatar" | "equipped"> | Profile;
  size?: "sm" | "md" | "lg";
  showEquip?: boolean;
}

const BG: Record<string, string> = {
  bg_meadow: "linear-gradient(160deg,#dff8d0,#a8e6a0)",
  bg_night: "linear-gradient(160deg,#3b3a72,#1d1c44)",
  bg_beach: "linear-gradient(160deg,#fff0c2,#9fe0ff)",
  bg_rainbow: "linear-gradient(160deg,#ffd6e8,#c8f0ff,#d9ffd6)",
};

export function Avatar({ profile, size = "md", showEquip = true }: AvatarProps) {
  const emoji = AVATAR_EMOJI[profile.avatar] ?? "🐱";
  const equipped: EquippedSlots = parseEquipped(profile as Profile);
  const bg = equipped.bg ? BG[equipped.bg] : undefined;
  return (
    <div
      className={`avatar ${size === "lg" ? "avatar-lg" : size === "sm" ? "avatar-sm" : ""}`}
      style={bg ? { background: bg } : undefined}
    >
      <span aria-hidden>{emoji}</span>
      {showEquip && equipped.hat && (
        <span className="equip equip-hat" aria-hidden>
          {ITEM_BY_CODE[equipped.hat]?.emoji ?? ""}
        </span>
      )}
      {showEquip && equipped.glasses && (
        <span className="equip equip-glasses" aria-hidden>
          {ITEM_BY_CODE[equipped.glasses]?.emoji ?? ""}
        </span>
      )}
      {showEquip && equipped.pet && (
        <span className="equip equip-pet" aria-hidden>
          {ITEM_BY_CODE[equipped.pet]?.emoji ?? ""}
        </span>
      )}
    </div>
  );
}
