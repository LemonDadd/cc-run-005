// 与前端 TypeScript 接口一一对应的序列化结构（JSON 字段保持 snake_case，
// 只有库存接口的 { itemId, unlockedAt } 按前端约定做单独重命名）。
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Profile {
    pub id: i64,
    pub nickname: String,
    pub birthday: String, // YYYY-MM-DD
    pub avatar: String,
    pub level_override: Option<i64>,
    pub stars_total: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GameRecord {
    pub id: i64,
    pub profile_id: i64,
    pub game_type: String,
    pub level: i64,
    pub correct: i64,
    pub total: i64,
    pub accuracy: f64,
    pub stars_earned: i64,
    pub duration_sec: i64,
    pub played_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Achievement {
    pub code: String,
    pub profile_id: i64,
    pub unlocked_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ParentSettings {
    pub pin_hash: String,
    pub pin_salt: String,
    pub pin_is_default: bool,
    pub daily_limit_min: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DailyUsage {
    pub profile_id: i64,
    pub day: String,
    pub used_sec: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EquippedItem {
    pub profile_id: i64,
    pub slot: String,
    pub item_id: Option<String>,
}

/// 库存接口：前端读取时使用 camelCase
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InventoryItem {
    pub item_id: String,
    pub unlocked_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Inventory {
    pub unlocked: Vec<InventoryItem>,
    pub equipped: Vec<EquippedItem>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GameStat {
    pub game_type: String,
    pub rounds: i64,
    pub total_correct: i64,
    pub total_questions: i64,
    pub best_accuracy: f64,
    pub best_level: i64,
    pub last_played_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProfileStats {
    pub profile: Profile,
    pub games: Vec<GameStat>,
    pub unlocked_count: i64,
    /// {"hat": id|null, ...}
    pub equipped: std::collections::HashMap<String, Option<String>>,
    pub today_used_sec: i64,
    pub achievements: Vec<Achievement>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SaveRoundResult {
    pub record: GameRecord,
    pub stars_earned: i64,
    pub stars_total: i64,
    pub new_achievements: Vec<Achievement>,
    pub newly_unlocked_items: Vec<String>,
}
