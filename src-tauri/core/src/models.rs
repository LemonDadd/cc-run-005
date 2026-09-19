use serde::{Deserialize, Serialize};

/// 儿童档案。不同档案的星星、进度、成就完全隔离。
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: i64,
    pub nickname: String,
    /// ISO 日期，如 2020-05-12
    pub birthday: String,
    /// 卡通头像标识，如 cat
    pub avatar: String,
    /// 家长手动覆盖的难度等级（null 表示使用按年龄自动推算的默认值）
    pub level_override: Option<i64>,
    /// 累计获得的星星总数（用于解锁饰品）
    pub stars_total: i64,
    /// 已装备的饰品槽位，JSON 对象，如 {"hat":"crown","bg":"sky"}
    pub equipped: String,
    pub created_at: String,
}

/// 单回合游戏记录。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameRecord {
    pub id: i64,
    pub profile_id: i64,
    pub game_type: String,
    pub level: i64,
    pub correct: i64,
    pub total: i64,
    /// 0.0 - 1.0，按“首次作答正确”计算，便于重试
    pub accuracy: f64,
    /// 本回合获得的星星（0/1/2）
    pub stars: i64,
    pub played_at: String,
}

/// 成就徽章。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Achievement {
    pub id: i64,
    pub profile_id: i64,
    /// 成就代码，见 constants::ACHIEVEMENTS
    pub code: String,
    pub unlocked_at: String,
}

/// 家长设置。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParentSettings {
    /// PIN 的 SHA-256 哈希（盐值固定写入应用，见 hash_pin）
    pub pin_hash: String,
    /// 每日游玩时长（分钟），范围 10-60，默认 25
    pub daily_limit_minutes: i64,
    /// 是否使用的仍是默认 PIN 0000（用于首页提示修改）
    pub is_default_pin: bool,
}

/// 每日游玩时长记录。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyUsage {
    pub date: String,
    pub used_seconds: i64,
}

/// 已解锁饰品。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UnlockedItem {
    pub item_code: String,
    pub unlocked_at: String,
}

/// 某个游戏的聚合进度。
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GameProgress {
    pub game_type: String,
    pub rounds: i64,
    pub best_level: i64,
    pub total_correct: i64,
    pub total_questions: i64,
    /// 0.0 - 1.0
    pub accuracy: f64,
}

/// 家长面板看到的单个孩子的统计。
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProfileStats {
    pub profile: Profile,
    pub age_years: i64,
    pub effective_level: i64,
    pub rounds_total: i64,
    pub total_correct: i64,
    pub total_questions: i64,
    pub accuracy: f64,
    pub games: Vec<GameProgress>,
    pub achievements: Vec<Achievement>,
    pub items_unlocked: i64,
}

/// 提交一回合游戏后的结算结果。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionResult {
    pub stars: i64,
    pub accuracy: f64,
    pub correct: i64,
    pub total: i64,
    pub stars_total: i64,
    /// 本次新解锁的饰品
    pub new_items: Vec<UnlockedItem>,
    /// 本次新解锁的成就
    pub new_achievements: Vec<Achievement>,
}

/// 创建/更新档案输入。
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileInput {
    pub nickname: String,
    pub birthday: String,
    pub avatar: String,
}

/// 提交一回合游戏输入。
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecordGameInput {
    pub profile_id: i64,
    pub game_type: String,
    pub level: i64,
    pub correct: i64,
    pub total: i64,
}
