// SQLite 数据访问与业务规则。所有写操作集中在本文件，
// command 层只做参数校验和错误转换。前端永远不直接接触文件系统。
use crate::catalog::*;
use crate::models::*;
use chrono::Local;
use rusqlite::{params, Connection, OptionalExtension};
use std::path::PathBuf;

pub struct Db {
    pub conn: Connection,
}

const DEFAULT_PIN: &str = "0000";

impl Db {
    pub fn open(dir: PathBuf) -> Result<Self, String> {
        std::fs::create_dir_all(&dir).map_err(|e| format!("无法创建数据目录: {e}"))?;
        let path = dir.join("kidmath.db");
        let conn = Connection::open(&path).map_err(|e| format!("无法打开数据库: {e}"))?;
        conn.pragma_update(None, "foreign_keys", "ON")
            .map_err(|e| e.to_string())?;
        let db = Db { conn };
        db.migrate()?;
        Ok(db)
    }

    fn migrate(&self) -> Result<(), String> {
        self.conn
            .execute_batch(
                r#"
                CREATE TABLE IF NOT EXISTS profiles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nickname TEXT NOT NULL,
                    birthday TEXT NOT NULL,
                    avatar TEXT NOT NULL,
                    level_override INTEGER,
                    stars_total INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS game_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
                    game_type TEXT NOT NULL,
                    level INTEGER NOT NULL,
                    correct INTEGER NOT NULL,
                    total INTEGER NOT NULL,
                    accuracy REAL NOT NULL,
                    stars_earned INTEGER NOT NULL,
                    duration_sec INTEGER NOT NULL,
                    played_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_records_profile ON game_records(profile_id);
                CREATE TABLE IF NOT EXISTS achievements (
                    code TEXT NOT NULL,
                    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
                    unlocked_at TEXT NOT NULL,
                    PRIMARY KEY (code, profile_id)
                );
                CREATE TABLE IF NOT EXISTS parent_settings (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    pin_hash TEXT NOT NULL,
                    pin_salt TEXT NOT NULL,
                    pin_is_default INTEGER NOT NULL DEFAULT 1,
                    daily_limit_min INTEGER NOT NULL DEFAULT 25
                );
                CREATE TABLE IF NOT EXISTS daily_usage (
                    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
                    day TEXT NOT NULL,
                    used_sec INTEGER NOT NULL DEFAULT 0,
                    PRIMARY KEY (profile_id, day)
                );
                CREATE TABLE IF NOT EXISTS unlocked_items (
                    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
                    item_id TEXT NOT NULL,
                    unlocked_at TEXT NOT NULL,
                    PRIMARY KEY (profile_id, item_id)
                );
                CREATE TABLE IF NOT EXISTS equipped_items (
                    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
                    slot TEXT NOT NULL,
                    item_id TEXT,
                    PRIMARY KEY (profile_id, slot)
                );
                "#,
            )
            .map_err(|e| e.to_string())?;

        // 首次启动：写入默认家长设置（PIN 0000，随机盐，时长 25 分钟）
        let count: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM parent_settings", [], |r| r.get(0))
            .map_err(|e| e.to_string())?;
        if count == 0 {
            let salt = random_salt();
            let hash = hash_pin(&salt, DEFAULT_PIN);
            self.conn
                .execute(
                    "INSERT INTO parent_settings (id, pin_hash, pin_salt, pin_is_default, daily_limit_min)
                     VALUES (1, ?1, ?2, 1, 25)",
                    params![hash, salt],
                )
                .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    /* ---------------- 工具 ---------------- */

    fn now_iso() -> String {
        Local::now().format("%Y-%m-%dT%H:%M:%S%.3f%:z").to_string()
    }

    fn today() -> String {
        Local::now().format("%Y-%m-%d").to_string()
    }

    pub fn verify_pin(&self, pin: &str) -> bool {
        let row: Result<(String, String), _> = self
            .conn
            .query_row(
                "SELECT pin_hash, pin_salt FROM parent_settings WHERE id = 1",
                [],
                |r| Ok((r.get(0)?, r.get(1)?)),
            );
        match row {
            Ok((stored_hash, salt)) => constant_time_eq(&stored_hash, &hash_pin(&salt, pin)),
            Err(_) => false,
        }
    }

    /* ---------------- 家长设置 ---------------- */

    pub fn get_settings(&self) -> Result<ParentSettings, String> {
        self.conn
            .query_row(
                "SELECT pin_hash, pin_salt, pin_is_default, daily_limit_min FROM parent_settings WHERE id=1",
                [],
                |r| {
                    Ok(ParentSettings {
                        pin_hash: r.get(0)?,
                        pin_salt: r.get(1)?,
                        pin_is_default: r.get::<_, i64>(2)? != 0,
                        daily_limit_min: r.get(3)?,
                    })
                },
            )
            .map_err(|e| e.to_string())
    }

    pub fn change_pin(&self, old_pin: &str, new_pin: &str) -> Result<ParentSettings, String> {
        if new_pin.len() != 4 || !new_pin.chars().all(|c| c.is_ascii_digit()) {
            return Err("新 PIN 必须是 4 位数字".into());
        }
        if !self.verify_pin(old_pin) {
            return Err("原 PIN 不正确".into());
        }
        let salt = random_salt();
        let hash = hash_pin(&salt, new_pin);
        let is_default = new_pin == DEFAULT_PIN;
        self.conn
            .execute(
                "UPDATE parent_settings SET pin_hash=?1, pin_salt=?2, pin_is_default=?3 WHERE id=1",
                params![hash, salt, is_default as i64],
            )
            .map_err(|e| e.to_string())?;
        self.get_settings()
    }

    pub fn set_daily_limit(&self, pin: &str, minutes: i64) -> Result<ParentSettings, String> {
        if !(10..=60).contains(&minutes) {
            return Err("每日时长需在 10-60 分钟之间".into());
        }
        if !self.verify_pin(pin) {
            return Err("PIN 不正确".into());
        }
        self.conn
            .execute(
                "UPDATE parent_settings SET daily_limit_min=?1 WHERE id=1",
                params![minutes],
            )
            .map_err(|e| e.to_string())?;
        self.get_settings()
    }

    /* ---------------- 档案 ---------------- */

    fn row_to_profile(r: &rusqlite::Row) -> rusqlite::Result<Profile> {
        Ok(Profile {
            id: r.get(0)?,
            nickname: r.get(1)?,
            birthday: r.get(2)?,
            avatar: r.get(3)?,
            level_override: r.get(4)?,
            stars_total: r.get(5)?,
            created_at: r.get(6)?,
        })
    }

    const PROFILE_COLS: &'static str =
        "id, nickname, birthday, avatar, level_override, stars_total, created_at";

    pub fn list_profiles(&self) -> Result<Vec<Profile>, String> {
        let mut stmt = self
            .conn
            .prepare(&format!("SELECT {} FROM profiles ORDER BY id", Self::PROFILE_COLS))
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], Self::row_to_profile)
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        for r in rows {
            out.push(r.map_err(|e| e.to_string())?);
        }
        Ok(out)
    }

    pub fn get_profile(&self, id: i64) -> Result<Profile, String> {
        self.conn
            .query_row(
                &format!("SELECT {} FROM profiles WHERE id=?1", Self::PROFILE_COLS),
                params![id],
                Self::row_to_profile,
            )
            .map_err(|_| "档案不存在".to_string())
    }

    pub fn create_profile(
        &self,
        nickname: &str,
        birthday: &str,
        avatar: &str,
    ) -> Result<Profile, String> {
        let nickname = nickname.trim();
        if nickname.is_empty() {
            return Err("昵称不能为空".into());
        }
        if nickname.chars().count() > 12 {
            return Err("昵称最多 12 个字".into());
        }
        if !is_valid_date(birthday) {
            return Err("生日格式不正确".into());
        }
        let now = Self::now_iso();
        self.conn
            .execute(
                "INSERT INTO profiles (nickname, birthday, avatar, level_override, stars_total, created_at)
                 VALUES (?1, ?2, ?3, NULL, 0, ?4)",
                params![nickname, birthday, avatar, now],
            )
            .map_err(|e| e.to_string())?;
        self.get_profile(self.conn.last_insert_rowid())
    }

    pub fn update_profile(
        &self,
        id: i64,
        nickname: Option<String>,
        birthday: Option<String>,
        avatar: Option<String>,
    ) -> Result<Profile, String> {
        if let Some(name) = &nickname {
            let name = name.trim();
            if name.is_empty() {
                return Err("昵称不能为空".into());
            }
            if name.chars().count() > 12 {
                return Err("昵称最多 12 个字".into());
            }
        }
        if let Some(b) = &birthday {
            if !is_valid_date(b) {
                return Err("生日格式不正确".into());
            }
        }
        self.conn
            .execute(
                "UPDATE profiles SET
                    nickname = COALESCE(?2, nickname),
                    birthday = COALESCE(?3, birthday),
                    avatar   = COALESCE(?4, avatar)
                 WHERE id=?1",
                params![id, nickname, birthday, avatar],
            )
            .map_err(|e| e.to_string())?;
        self.get_profile(id)
    }

    pub fn set_level_override(
        &self,
        pin: &str,
        profile_id: i64,
        level: Option<i64>,
    ) -> Result<Profile, String> {
        if !self.verify_pin(pin) {
            return Err("PIN 不正确".into());
        }
        if let Some(l) = level {
            if !(1..=5).contains(&l) {
                return Err("Level 必须在 1-5 之间".into());
            }
        }
        self.conn
            .execute(
                "UPDATE profiles SET level_override=?2 WHERE id=?1",
                params![profile_id, level],
            )
            .map_err(|e| e.to_string())?;
        self.get_profile(profile_id)
    }

    pub fn delete_profile(&self, id: i64) -> Result<(), String> {
        // 外键 ON DELETE CASCADE 自动清理关联数据
        self.conn
            .execute("DELETE FROM profiles WHERE id=?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn reset_progress(&self, pin: &str, profile_id: i64) -> Result<Profile, String> {
        if !self.verify_pin(pin) {
            return Err("PIN 不正确".into());
        }
        let tx = self.conn.unchecked_transaction().map_err(|e| e.to_string())?;
        for table in [
            "game_records",
            "achievements",
            "daily_usage",
            "unlocked_items",
            "equipped_items",
        ] {
            tx.execute(
                &format!("DELETE FROM {table} WHERE profile_id=?1"),
                params![profile_id],
            )
            .map_err(|e| e.to_string())?;
        }
        tx.execute(
            "UPDATE profiles SET stars_total=0 WHERE id=?1",
            params![profile_id],
        )
        .map_err(|e| e.to_string())?;
        tx.commit().map_err(|e| e.to_string())?;
        self.get_profile(profile_id)
    }

    /* ---------------- 时长 ---------------- */

    pub fn add_usage(&self, profile_id: i64, seconds: i64) -> Result<DailyUsage, String> {
        self.get_profile(profile_id)?;
        let seconds = seconds.max(0);
        let day = Self::today();
        self.conn
            .execute(
                "INSERT INTO daily_usage (profile_id, day, used_sec) VALUES (?1, ?2, ?3)
                 ON CONFLICT(profile_id, day) DO UPDATE SET used_sec = used_sec + excluded.used_sec",
                params![profile_id, day, seconds],
            )
            .map_err(|e| e.to_string())?;
        // 时长增加也可能满足“连续 3 天”成就
        let _ = self.grant_achievements(profile_id);
        self.get_today_usage(profile_id)
            .and_then(|o| o.ok_or_else(|| "用量记录不存在".to_string()))
    }

    pub fn get_today_usage(&self, profile_id: i64) -> Result<Option<DailyUsage>, String> {
        let day = Self::today();
        self.conn
            .query_row(
                "SELECT profile_id, day, used_sec FROM daily_usage WHERE profile_id=?1 AND day=?2",
                params![profile_id, day],
                |r| {
                    Ok(DailyUsage {
                        profile_id: r.get(0)?,
                        day: r.get(1)?,
                        used_sec: r.get(2)?,
                    })
                },
            )
            .optional()
            .map_err(|e| e.to_string())
    }

    /* ---------------- 回合 / 成就 / 饰品 ---------------- */

    pub fn list_records(&self, profile_id: i64) -> Result<Vec<GameRecord>, String> {
        let mut stmt = self
            .conn
            .prepare(
                "SELECT id, profile_id, game_type, level, correct, total, accuracy,
                        stars_earned, duration_sec, played_at
                 FROM game_records WHERE profile_id=?1 ORDER BY played_at DESC, id DESC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![profile_id], row_to_record)
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        for r in rows {
            out.push(r.map_err(|e| e.to_string())?);
        }
        Ok(out)
    }

    pub fn save_round(
        &self,
        profile_id: i64,
        game_type: &str,
        level: i64,
        correct: i64,
        total: i64,
        duration_sec: i64,
    ) -> Result<SaveRoundResult, String> {
        if total <= 0 {
            return Err("题目总数必须大于 0".into());
        }
        if correct < 0 || correct > total {
            return Err("正确题数超出范围".into());
        }
        if !(1..=5).contains(&level) {
            return Err("Level 必须在 1-5 之间".into());
        }
        const VALID_GAMES: &[&str] = &[
            "counting",
            "compare",
            "arithmetic",
            "shapes",
            "patterns",
            "clock",
        ];
        if !VALID_GAMES.contains(&game_type) {
            return Err("未知游戏类型".into());
        }
        let mut profile = self.get_profile(profile_id)?;

        let accuracy = correct as f64 / total as f64;
        let stars = if accuracy >= 1.0 { 2 } else if accuracy >= 0.8 { 1 } else { 0 };
        let now = Self::now_iso();

        let tx = self.conn.unchecked_transaction().map_err(|e| e.to_string())?;
        tx.execute(
            "INSERT INTO game_records
                (profile_id, game_type, level, correct, total, accuracy, stars_earned, duration_sec, played_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                profile_id,
                game_type,
                level,
                correct,
                total,
                accuracy,
                stars,
                duration_sec.max(1),
                now
            ],
        )
        .map_err(|e| e.to_string())?;
        let record_id = tx.last_insert_rowid();
        tx.execute(
            "UPDATE profiles SET stars_total = stars_total + ?2 WHERE id=?1",
            params![profile_id, stars],
        )
        .map_err(|e| e.to_string())?;
        tx.commit().map_err(|e| e.to_string())?;

        profile.stars_total += stars;
        let new_items = self.grant_items(profile_id, profile.stars_total)?;
        let new_achievements = self.grant_achievements(profile_id)?;
        let record = self
            .conn
            .query_row(
                "SELECT id, profile_id, game_type, level, correct, total, accuracy,
                        stars_earned, duration_sec, played_at
                 FROM game_records WHERE id=?1",
                params![record_id],
                row_to_record,
            )
            .map_err(|e| e.to_string())?;

        Ok(SaveRoundResult {
            record,
            stars_earned: stars,
            stars_total: profile.stars_total,
            new_achievements,
            newly_unlocked_items: new_items,
        })
    }

    /// 根据累计星星补齐应有饰品，返回本次新解锁 id 列表
    fn grant_items(
        &self,
        profile_id: i64,
        stars_total: i64,
    ) -> Result<Vec<String>, String> {
        let target = expected_item_count(stars_total);
        let mut created = Vec::new();
        for def in ITEMS.iter().take(target) {
            let exists: bool = self
                .conn
                .query_row(
                    "SELECT 1 FROM unlocked_items WHERE profile_id=?1 AND item_id=?2",
                    params![profile_id, def.id],
                    |_| Ok(()),
                )
                .optional()
                .map_err(|e| e.to_string())?
                .is_some();
            if !exists {
                self.conn
                    .execute(
                        "INSERT OR IGNORE INTO unlocked_items (profile_id, item_id, unlocked_at)
                         VALUES (?1, ?2, ?3)",
                        params![profile_id, def.id, Self::now_iso()],
                    )
                    .map_err(|e| e.to_string())?;
                created.push(def.id.to_string());
            }
        }
        Ok(created)
    }

    fn list_achievement_codes(&self, profile_id: i64) -> Result<Vec<String>, String> {
        let mut stmt = self
            .conn
            .prepare("SELECT code FROM achievements WHERE profile_id=?1")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![profile_id], |r| r.get::<_, String>(0))
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        for r in rows {
            out.push(r.map_err(|e| e.to_string())?);
        }
        Ok(out)
    }

    pub fn list_achievements(&self, profile_id: i64) -> Result<Vec<Achievement>, String> {
        let mut stmt = self
            .conn
            .prepare(
                "SELECT code, profile_id, unlocked_at FROM achievements
                 WHERE profile_id=?1 ORDER BY unlocked_at",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![profile_id], |r| {
                Ok(Achievement {
                    code: r.get(0)?,
                    profile_id: r.get(1)?,
                    unlocked_at: r.get(2)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        for r in rows {
            out.push(r.map_err(|e| e.to_string())?);
        }
        Ok(out)
    }

    /// 检查并授予全部成就，返回本次新解锁成就
    fn grant_achievements(&self, profile_id: i64) -> Result<Vec<Achievement>, String> {
        let profile = self.get_profile(profile_id)?;

        // 聚合记录
        #[derive(Default)]
        struct Agg {
            rounds: i64,
            correct: i64,
            has_imperfect: bool,
        }
        let mut game_agg: std::collections::HashMap<String, Agg> = std::collections::HashMap::new();
        {
            let mut stmt = self
                .conn
                .prepare(
                    "SELECT game_type, COUNT(*), SUM(correct), MAX(accuracy)
                     FROM game_records WHERE profile_id=?1 GROUP BY game_type",
                )
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map(params![profile_id], |r| {
                    Ok((
                        r.get::<_, String>(0)?,
                        r.get::<_, i64>(1)?,
                        r.get::<_, Option<i64>>(2)?.unwrap_or(0),
                        r.get::<_, f64>(3)?,
                    ))
                })
                .map_err(|e| e.to_string())?;
            for row in rows {
                let (gt, rounds, correct, best) = row.map_err(|e| e.to_string())?;
                game_agg.insert(
                    gt,
                    Agg {
                        rounds,
                        correct,
                        has_imperfect: best >= 1.0,
                    },
                );
            }
        }

        let total_rounds: i64 = game_agg.values().map(|a| a.rounds).sum();
        let total_correct: i64 = game_agg.values().map(|a| a.correct).sum();
        let played_games = game_agg.len();
        let any_perfect = game_agg.values().any(|a| a.has_imperfect);

        // 游玩日期：记录日期 ∪ 用量日期
        let mut days = std::collections::BTreeSet::new();
        {
            let mut stmt = self
                .conn
                .prepare(
                    "SELECT DISTINCT substr(played_at,1,10) FROM game_records
                     WHERE profile_id=?1 AND played_at != ''
                     UNION
                     SELECT day FROM daily_usage WHERE profile_id=?1",
                )
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map(params![profile_id], |r| r.get::<_, String>(0))
                .map_err(|e| e.to_string())?;
            for r in rows {
                days.insert(r.map_err(|e| e.to_string())?);
            }
        }
        let streak = consecutive_days(&days);

        let unlocked_count: i64 = self
            .conn
            .query_row(
                "SELECT COUNT(*) FROM unlocked_items WHERE profile_id=?1",
                params![profile_id],
                |r| r.get(0),
            )
            .unwrap_or(0);
        let _ = profile;

        let mut want = Vec::new();
        if total_rounds >= 1 {
            want.push("first_round");
        }
        if total_rounds >= 10 {
            want.push("rounds_10");
        }
        if streak >= 3 {
            want.push("streak_3_days");
        }
        if any_perfect {
            want.push("perfect_round");
        }
        if total_correct >= 50 {
            want.push("correct_50");
        }
        if played_games >= 6 {
            want.push("play_all_six");
        }
        if unlocked_count >= 5 {
            want.push("unlock_5_items");
        }

        let have: std::collections::HashSet<String> =
            self.list_achievement_codes(profile_id)?.into_iter().collect();
        let now = Self::now_iso();
        let mut created = Vec::new();
        for code in want {
            if !have.contains(code) {
                self.conn
                    .execute(
                        "INSERT OR IGNORE INTO achievements (code, profile_id, unlocked_at)
                         VALUES (?1, ?2, ?3)",
                        params![code, profile_id, now],
                    )
                    .map_err(|e| e.to_string())?;
                created.push(Achievement {
                    code: code.to_string(),
                    profile_id,
                    unlocked_at: now.clone(),
                });
            }
        }
        Ok(created)
    }

    /* ---------------- 库存与装扮 ---------------- */

    pub fn get_inventory(&self, profile_id: i64) -> Result<Inventory, String> {
        self.get_profile(profile_id)?;
        let mut unlocked = Vec::new();
        {
            let mut stmt = self
                .conn
                .prepare(
                    "SELECT item_id, unlocked_at FROM unlocked_items
                     WHERE profile_id=?1 ORDER BY rowid",
                )
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map(params![profile_id], |r| {
                    Ok(InventoryItem {
                        item_id: r.get(0)?,
                        unlocked_at: r.get(1)?,
                    })
                })
                .map_err(|e| e.to_string())?;
            for r in rows {
                unlocked.push(r.map_err(|e| e.to_string())?);
            }
        }
        let mut equipped = Vec::new();
        {
            let mut stmt = self
                .conn
                .prepare(
                    "SELECT profile_id, slot, item_id FROM equipped_items
                     WHERE profile_id=?1 ORDER BY slot",
                )
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map(params![profile_id], |r| {
                    Ok(EquippedItem {
                        profile_id: r.get(0)?,
                        slot: r.get(1)?,
                        item_id: r.get(2)?,
                    })
                })
                .map_err(|e| e.to_string())?;
            for r in rows {
                equipped.push(r.map_err(|e| e.to_string())?);
            }
        }
        Ok(Inventory { unlocked, equipped })
    }

    pub fn equip_item(
        &self,
        profile_id: i64,
        slot: &str,
        item_id: Option<String>,
    ) -> Result<Vec<EquippedItem>, String> {
        self.get_profile(profile_id)?;
        if !SLOTS.contains(&slot) {
            return Err("未知饰品槽位".into());
        }
        if let Some(id) = &item_id {
            if !item_exists(id) {
                return Err("未知饰品".into());
            }
            if slot_of(id) != Some(slot) {
                return Err("饰品与槽位不匹配".into());
            }
            let owned: bool = self
                .conn
                .query_row(
                    "SELECT 1 FROM unlocked_items WHERE profile_id=?1 AND item_id=?2",
                    params![profile_id, id],
                    |_| Ok(()),
                )
                .optional()
                .map_err(|e| e.to_string())?
                .is_some();
            if !owned {
                return Err("饰品尚未解锁".into());
            }
            self.conn
                .execute(
                    "INSERT INTO equipped_items (profile_id, slot, item_id) VALUES (?1, ?2, ?3)
                     ON CONFLICT(profile_id, slot) DO UPDATE SET item_id=excluded.item_id",
                    params![profile_id, slot, id],
                )
                .map_err(|e| e.to_string())?;
        } else {
            // 脱下
            self.conn
                .execute(
                    "INSERT INTO equipped_items (profile_id, slot, item_id) VALUES (?1, ?2, NULL)
                     ON CONFLICT(profile_id, slot) DO UPDATE SET item_id=NULL",
                    params![profile_id, slot],
                )
                .map_err(|e| e.to_string())?;
        }
        let inv = self.get_inventory(profile_id)?;
        Ok(inv.equipped)
    }

    /* ---------------- 统计 ---------------- */

    pub fn get_stats(&self, profile_id: i64) -> Result<ProfileStats, String> {
        let profile = self.get_profile(profile_id)?;
        let mut games = Vec::new();
        {
            let mut stmt = self
                .conn
                .prepare(
                    "SELECT game_type, COUNT(*), SUM(correct), SUM(total), MAX(accuracy),
                            MAX(level), MAX(played_at)
                     FROM game_records WHERE profile_id=?1 GROUP BY game_type",
                )
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map(params![profile_id], |r| {
                    Ok(GameStat {
                        game_type: r.get(0)?,
                        rounds: r.get(1)?,
                        total_correct: r.get::<_, Option<i64>>(2)?.unwrap_or(0),
                        total_questions: r.get::<_, Option<i64>>(3)?.unwrap_or(0),
                        best_accuracy: r.get(4)?,
                        best_level: r.get::<_, Option<i64>>(5)?.unwrap_or(0),
                        last_played_at: r.get(6)?,
                    })
                })
                .map_err(|e| e.to_string())?;
            for r in rows {
                games.push(r.map_err(|e| e.to_string())?);
            }
        }
        let unlocked_count: i64 = self
            .conn
            .query_row(
                "SELECT COUNT(*) FROM unlocked_items WHERE profile_id=?1",
                params![profile_id],
                |r| r.get(0),
            )
            .unwrap_or(0);

        let mut equipped: std::collections::HashMap<String, Option<String>> =
            std::collections::HashMap::new();
        for slot in SLOTS {
            equipped.insert((*slot).to_string(), None);
        }
        for e in self.get_inventory(profile_id)?.equipped {
            equipped.insert(e.slot, e.item_id);
        }

        let today_used_sec = self
            .get_today_usage(profile_id)?
            .map(|u| u.used_sec)
            .unwrap_or(0);

        let achievements = self.list_achievements(profile_id)?;

        Ok(ProfileStats {
            profile,
            games,
            unlocked_count,
            equipped,
            today_used_sec,
            achievements,
        })
    }
}

fn row_to_record(r: &rusqlite::Row) -> rusqlite::Result<GameRecord> {
    Ok(GameRecord {
        id: r.get(0)?,
        profile_id: r.get(1)?,
        game_type: r.get(2)?,
        level: r.get(3)?,
        correct: r.get(4)?,
        total: r.get(5)?,
        accuracy: r.get(6)?,
        stars_earned: r.get(7)?,
        duration_sec: r.get(8)?,
        played_at: r.get(9)?,
    })
}

fn is_valid_date(s: &str) -> bool {
    // 严格 YYYY-MM-DD
    if s.len() != 10 {
        return false;
    }
    let parts: Vec<&str> = s.split('-').collect();
    if parts.len() != 3 {
        return false;
    }
    let (y, m, d) = (
        parts[0].parse::<i32>(),
        parts[1].parse::<u32>(),
        parts[2].parse::<u32>(),
    );
    match (y, m, d) {
        (Ok(y), Ok(m), Ok(d)) if (1900..=2100).contains(&y) => {
            use chrono::NaiveDate;
            NaiveDate::from_ymd_opt(y, m, d).is_some()
        }
        _ => false,
    }
}

/// 计算连续游玩天数：若今天没玩则从昨天起算
fn consecutive_days(days: &std::collections::BTreeSet<String>) -> i64 {
    if days.is_empty() {
        return 0;
    }
    let today = Local::now().date_naive();
    let mut cursor = today;
    if !days.contains(&cursor.format("%Y-%m-%d").to_string()) {
        cursor = cursor.pred_opt().unwrap_or(cursor);
    }
    let mut streak = 0i64;
    while days.contains(&cursor.format("%Y-%m-%d").to_string()) {
        streak += 1;
        cursor = cursor.pred_opt().unwrap_or(cursor);
    }
    streak
}
