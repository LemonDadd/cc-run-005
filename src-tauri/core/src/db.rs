use crate::constants::*;
use crate::models::*;
use chrono::{Local, NaiveDate};
use rusqlite::{params, Connection, OptionalExtension};
use sha2::{Digest, Sha256};
use std::collections::HashSet;

pub type DbResult<T> = Result<T, String>;

fn err<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

pub fn hash_pin(pin: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(PIN_SALT.as_bytes());
    hasher.update(pin.as_bytes());
    hex::encode(hasher.finalize())
}

pub fn today_str() -> String {
    Local::now().date_naive().format("%Y-%m-%d").to_string()
}

/// 初始化（幂等）：建表并写入默认家长设置。
pub fn init(conn: &Connection) -> DbResult<()> {
    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS profile (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            nickname       TEXT NOT NULL,
            birthday       TEXT NOT NULL,
            avatar         TEXT NOT NULL,
            level_override INTEGER,
            stars_total    INTEGER NOT NULL DEFAULT 0,
            equipped       TEXT NOT NULL DEFAULT '{}',
            created_at     TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS game_record (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id INTEGER NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
            game_type  TEXT NOT NULL,
            level      INTEGER NOT NULL,
            correct    INTEGER NOT NULL,
            total      INTEGER NOT NULL,
            accuracy   REAL NOT NULL,
            stars      INTEGER NOT NULL,
            played_at  TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_record_profile ON game_record(profile_id, played_at);

        CREATE TABLE IF NOT EXISTS achievement (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id  INTEGER NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
            code        TEXT NOT NULL,
            unlocked_at TEXT NOT NULL,
            UNIQUE(profile_id, code)
        );

        CREATE TABLE IF NOT EXISTS parent_settings (
            id                  INTEGER PRIMARY KEY CHECK (id = 1),
            pin_hash            TEXT NOT NULL,
            daily_limit_minutes INTEGER NOT NULL DEFAULT 25,
            is_default_pin      INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS daily_usage (
            profile_id INTEGER NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
            date       TEXT NOT NULL,
            used_seconds INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (profile_id, date)
        );

        CREATE TABLE IF NOT EXISTS unlocked_item (
            profile_id  INTEGER NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
            item_code   TEXT NOT NULL,
            unlocked_at TEXT NOT NULL,
            PRIMARY KEY (profile_id, item_code)
        );
        "#,
    )
    .map_err(err)?;

    // 默认家长设置（PIN 0000，每日 25 分钟）。
    let exists: i64 = conn
        .query_row("SELECT COUNT(*) FROM parent_settings WHERE id = 1", [], |r| r.get(0))
        .map_err(err)?;
    if exists == 0 {
        conn.execute(
            "INSERT INTO parent_settings (id, pin_hash, daily_limit_minutes, is_default_pin)
             VALUES (1, ?1, ?2, 1)",
            params![hash_pin(DEFAULT_PIN), DAILY_LIMIT_DEFAULT],
        )
        .map_err(err)?;
    }
    Ok(())
}

// ---------- Profile ----------

pub fn create_profile(conn: &Connection, input: &ProfileInput) -> DbResult<Profile> {
    let nickname = input.nickname.trim();
    if nickname.is_empty() {
        return Err("昵称不能为空".to_string());
    }
    if NaiveDate::parse_from_str(&input.birthday, "%Y-%m-%d").is_err() {
        return Err("生日格式不正确".to_string());
    }
    let now = Local::now().to_rfc3339();
    conn.execute(
        "INSERT INTO profile (nickname, birthday, avatar, level_override, stars_total, equipped, created_at)
         VALUES (?1, ?2, ?3, NULL, 0, '{}', ?4)",
        params![nickname, input.birthday, input.avatar, now],
    )
    .map_err(err)?;
    let id = conn.last_insert_rowid();
    get_profile(conn, id)?.ok_or_else(|| "创建档案失败".to_string())
}

fn row_to_profile(row: &rusqlite::Row<'_>) -> rusqlite::Result<Profile> {
    Ok(Profile {
        id: row.get("id")?,
        nickname: row.get("nickname")?,
        birthday: row.get("birthday")?,
        avatar: row.get("avatar")?,
        level_override: row.get("level_override")?,
        stars_total: row.get("stars_total")?,
        equipped: row.get("equipped")?,
        created_at: row.get("created_at")?,
    })
}

pub fn get_profile(conn: &Connection, id: i64) -> DbResult<Option<Profile>> {
    conn.query_row("SELECT * FROM profile WHERE id = ?1", params![id], row_to_profile)
        .optional()
        .map_err(err)
}

pub fn list_profiles(conn: &Connection) -> DbResult<Vec<Profile>> {
    let mut stmt = conn
        .prepare("SELECT * FROM profile ORDER BY created_at ASC")
        .map_err(err)?;
    let rows = stmt.query_map([], row_to_profile).map_err(err)?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(err)?);
    }
    Ok(out)
}

pub fn update_profile(conn: &Connection, id: i64, input: &ProfileInput) -> DbResult<Profile> {
    let nickname = input.nickname.trim();
    if nickname.is_empty() {
        return Err("昵称不能为空".to_string());
    }
    if NaiveDate::parse_from_str(&input.birthday, "%Y-%m-%d").is_err() {
        return Err("生日格式不正确".to_string());
    }
    let affected = conn
        .execute(
            "UPDATE profile SET nickname = ?1, birthday = ?2, avatar = ?3 WHERE id = ?4",
            params![nickname, input.birthday, input.avatar, id],
        )
        .map_err(err)?;
    if affected == 0 {
        return Err("档案不存在".to_string());
    }
    get_profile(conn, id)?.ok_or_else(|| "档案不存在".to_string())
}

pub fn set_level_override(conn: &Connection, id: i64, level: Option<i64>) -> DbResult<()> {
    if let Some(v) = level {
        if !(1..=5).contains(&v) {
            return Err("难度等级必须在 1-5 之间".to_string());
        }
    }
    let affected = conn
        .execute("UPDATE profile SET level_override = ?1 WHERE id = ?2", params![level, id])
        .map_err(err)?;
    if affected == 0 {
        return Err("档案不存在".to_string());
    }
    Ok(())
}

pub fn set_equipped(conn: &Connection, id: i64, slot: &str, item_code: Option<&str>) -> DbResult<String> {
    let profile = get_profile(conn, id)?.ok_or_else(|| "档案不存在".to_string())?;
    let mut map: serde_json::Map<String, serde_json::Value> =
        serde_json::from_str(&profile.equipped).unwrap_or_default();
    match item_code {
        Some(code) => {
            // 仅允许装备已解锁且槽位匹配的饰品。
            let unlocked: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM unlocked_item WHERE profile_id = ?1 AND item_code = ?2",
                    params![id, code],
                    |r| r.get(0),
                )
                .map_err(err)?;
            if unlocked == 0 {
                return Err("该饰品尚未解锁".to_string());
            }
            let valid_slot = ITEMS.iter().find(|i| i.code == code).map(|i| i.slot);
            if valid_slot != Some(slot) {
                return Err("饰品与装备槽不匹配".to_string());
            }
            map.insert(slot.to_string(), serde_json::Value::String(code.to_string()));
        }
        None => {
            map.remove(slot);
        }
    }
    let json = serde_json::to_string(&map).map_err(err)?;
    conn.execute("UPDATE profile SET equipped = ?1 WHERE id = ?2", params![json, id])
        .map_err(err)?;
    Ok(json)
}

pub fn delete_profile(conn: &Connection, id: i64) -> DbResult<()> {
    let affected = conn.execute("DELETE FROM profile WHERE id = ?1", params![id]).map_err(err)?;
    if affected == 0 {
        return Err("档案不存在".to_string());
    }
    Ok(())
}

// ---------- Parent settings ----------

pub fn get_settings(conn: &Connection) -> DbResult<ParentSettings> {
    conn.query_row(
        "SELECT pin_hash, daily_limit_minutes, is_default_pin FROM parent_settings WHERE id = 1",
        [],
        |r| {
            Ok(ParentSettings {
                pin_hash: r.get(0)?,
                daily_limit_minutes: r.get(1)?,
                is_default_pin: r.get::<_, i64>(2)? != 0,
            })
        },
    )
    .map_err(err)
}

pub fn verify_pin(conn: &Connection, pin: &str) -> DbResult<bool> {
    let s = get_settings(conn)?;
    Ok(s.pin_hash == hash_pin(pin))
}

pub fn change_pin(conn: &Connection, old_pin: &str, new_pin: &str) -> DbResult<()> {
    if !verify_pin(conn, old_pin)? {
        return Err("原 PIN 不正确".to_string());
    }
    if !is_valid_pin(new_pin) {
        return Err("新 PIN 必须是 4 位数字".to_string());
    }
    let is_default = new_pin == DEFAULT_PIN;
    conn.execute(
        "UPDATE parent_settings SET pin_hash = ?1, is_default_pin = ?2 WHERE id = 1",
        params![hash_pin(new_pin), is_default as i64],
    )
    .map_err(err)?;
    Ok(())
}

pub fn is_valid_pin(pin: &str) -> bool {
    pin.len() == 4 && pin.bytes().all(|b| b.is_ascii_digit())
}

pub fn set_daily_limit(conn: &Connection, minutes: i64) -> DbResult<()> {
    if !(DAILY_LIMIT_MIN..=DAILY_LIMIT_MAX).contains(&minutes) {
        return Err(format!("每日时长需在 {DAILY_LIMIT_MIN}-{DAILY_LIMIT_MAX} 分钟之间"));
    }
    conn.execute(
        "UPDATE parent_settings SET daily_limit_minutes = ?1 WHERE id = 1",
        params![minutes],
    )
    .map_err(err)?;
    Ok(())
}

// ---------- Daily usage ----------

pub fn get_used_seconds(conn: &Connection, profile_id: i64, date: &str) -> DbResult<i64> {
    conn.query_row(
        "SELECT COALESCE(used_seconds,0) FROM daily_usage WHERE profile_id = ?1 AND date = ?2",
        params![profile_id, date],
        |r| r.get(0),
    )
    .optional()
    .map(|v| v.flatten().unwrap_or(0))
    .map_err(err)
}

pub fn add_usage(conn: &Connection, profile_id: i64, seconds: i64) -> DbResult<i64> {
    if seconds <= 0 {
        return get_used_seconds(conn, profile_id, &today_str());
    }
    let date = today_str();
    conn.execute(
        "INSERT INTO daily_usage (profile_id, date, used_seconds) VALUES (?1, ?2, ?3)
         ON CONFLICT(profile_id, date) DO UPDATE SET used_seconds = used_seconds + excluded.used_seconds",
        params![profile_id, date, seconds],
    )
    .map_err(err)?;
    get_used_seconds(conn, profile_id, &date)
}

// ---------- Items ----------

pub fn list_items(conn: &Connection, profile_id: i64) -> DbResult<Vec<UnlockedItem>> {
    let mut stmt = conn
        .prepare("SELECT item_code, unlocked_at FROM unlocked_item WHERE profile_id = ?1 ORDER BY unlocked_at ASC")
        .map_err(err)?;
    let rows = stmt.query_map(params![profile_id], |r| {
        Ok(UnlockedItem {
            item_code: r.get(0)?,
            unlocked_at: r.get(1)?,
        })
    }).map_err(err)?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(err)?);
    }
    Ok(out)
}

// ---------- Achievements ----------

pub fn list_achievements(conn: &Connection, profile_id: i64) -> DbResult<Vec<Achievement>> {
    let mut stmt = conn
        .prepare("SELECT id, profile_id, code, unlocked_at FROM achievement WHERE profile_id = ?1 ORDER BY unlocked_at ASC")
        .map_err(err)?;
    let rows = stmt
        .query_map(params![profile_id], |r| {
            Ok(Achievement {
                id: r.get(0)?,
                profile_id: r.get(1)?,
                code: r.get(2)?,
                unlocked_at: r.get(3)?,
            })
        })
        .map_err(err)?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r.map_err(err)?);
    }
    Ok(out)
}

struct EvalContext {
    rounds: i64,
    total_correct: i64,
    stars_total: i64,
    games: HashSet<String>,
    items: i64,
    played_dates: Vec<String>,
    perfect_this_round: bool,
}

/// 判断连续游玩天数是否达到 n（最近一天必须是今天，向前连续）。
fn has_streak(dates: &HashSet<String>, n: usize) -> bool {
    let today = Local::now().date_naive();
    for i in 0..n {
        let d = today - chrono::Duration::days(i as i64);
        if !dates.contains(&d.format("%Y-%m-%d").to_string()) {
            return false;
        }
    }
    true
}

fn evaluate(cx: &EvalContext, already: &HashSet<String>) -> Vec<String> {
    let mut earned = Vec::new();
    let dates: HashSet<String> = cx.played_dates.iter().cloned().collect();
    let mut push = |code: &str, ok: bool| {
        if ok && !already.contains(code) {
            earned.push(code.to_string());
        }
    };
    push("first_round", cx.rounds >= 1);
    push("rounds_10", cx.rounds >= 10);
    push("rounds_25", cx.rounds >= 25);
    push("streak_3_days", has_streak(&dates, 3));
    push("perfect_game", cx.perfect_this_round);
    push("correct_50", cx.total_correct >= 50);
    push("explore_all", GAME_TYPES.iter().all(|g| cx.games.contains(*g)));
    push("items_5", cx.items >= 5);
    push("stars_30", cx.stars_total >= 30);
    earned
}

// ---------- Record a game round ----------

pub fn record_game(conn: &Connection, input: &RecordGameInput) -> DbResult<SessionResult> {
    let profile = get_profile(conn, input.profile_id)?
        .ok_or_else(|| "档案不存在".to_string())?;
    if !GAME_TYPES.contains(&input.game_type.as_str()) {
        return Err("未知的游戏类型".to_string());
    }
    if !(1..=5).contains(&input.level) {
        return Err("难度等级必须在 1-5 之间".to_string());
    }
    if input.total <= 0 || input.correct < 0 || input.correct > input.total {
        return Err("题目数据不合法".to_string());
    }

    let accuracy = input.correct as f64 / input.total as f64;
    let stars = stars_for_accuracy(accuracy);
    let now = Local::now().to_rfc3339();

    let tx = conn.unchecked_transaction().map_err(err)?;

    tx.execute(
        "INSERT INTO game_record (profile_id, game_type, level, correct, total, accuracy, stars, played_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            input.profile_id, input.game_type, input.level, input.correct, input.total,
            accuracy, stars, now
        ],
    )
    .map_err(err)?;

    tx.execute(
        "UPDATE profile SET stars_total = stars_total + ?1 WHERE id = ?2",
        params![stars, input.profile_id],
    )
    .map_err(err)?;
    // 当日游玩时长至少记录一次“有游玩”（秒数由前端心跳累加，这里不重复加时间）。
    let stars_total = profile.stars_total + stars;

    // 解锁饰品：累计每 5 颗星一个，按目录顺序。
    let mut new_items: Vec<UnlockedItem> = Vec::new();
    for item in ITEMS.iter() {
        if stars_total >= item.at_stars {
            let affected = tx
                .execute(
                    "INSERT OR IGNORE INTO unlocked_item (profile_id, item_code, unlocked_at)
                     VALUES (?1, ?2, ?3)",
                    params![input.profile_id, item.code, now],
                )
                .map_err(err)?;
            if affected > 0 {
                new_items.push(UnlockedItem {
                    item_code: item.code.to_string(),
                    unlocked_at: now.clone(),
                });
            }
        }
    }

    // 聚合上下文。
    let rounds: i64 = tx
        .query_row(
            "SELECT COUNT(*) FROM game_record WHERE profile_id = ?1",
            params![input.profile_id],
            |r| r.get(0),
        )
        .map_err(err)?;
    let total_correct: i64 = tx
        .query_row(
            "SELECT COALESCE(SUM(correct),0) FROM game_record WHERE profile_id = ?1",
            params![input.profile_id],
            |r| r.get(0),
        )
        .map_err(err)?;
    let items_count: i64 = tx
        .query_row(
            "SELECT COUNT(*) FROM unlocked_item WHERE profile_id = ?1",
            params![input.profile_id],
            |r| r.get(0),
        )
        .map_err(err)?;
    let mut games = HashSet::new();
    {
        let mut stmt = tx
            .prepare("SELECT DISTINCT game_type FROM game_record WHERE profile_id = ?1")
            .map_err(err)?;
        let rows = stmt
            .query_map(params![input.profile_id], |r| r.get::<_, String>(0))
            .map_err(err)?;
        for r in rows {
            games.insert(r.map_err(err)?);
        }
    }
    let mut played_dates: Vec<String> = Vec::new();
    {
        let mut stmt = tx
            .prepare("SELECT DISTINCT substr(played_at,1,10) FROM game_record WHERE profile_id = ?1")
            .map_err(err)?;
        let rows = stmt
            .query_map(params![input.profile_id], |r| r.get::<_, String>(0))
            .map_err(err)?;
        for r in rows {
            played_dates.push(r.map_err(err)?);
        }
    }
    let already: HashSet<String> = {
        let mut s = HashSet::new();
        for a in list_achievements(&tx, input.profile_id)? {
            s.insert(a.code);
        }
        s
    };

    let cx = EvalContext {
        rounds,
        total_correct,
        stars_total,
        games,
        items: items_count,
        played_dates,
        perfect_this_round: (input.correct == input.total),
    };
    let codes = evaluate(&cx, &already);
    let mut new_achievements: Vec<Achievement> = Vec::new();
    for code in codes {
        tx.execute(
            "INSERT OR IGNORE INTO achievement (profile_id, code, unlocked_at) VALUES (?1, ?2, ?3)",
            params![input.profile_id, code, now],
        )
        .map_err(err)?;
        if let Some(id) = tx
            .query_row(
                "SELECT id FROM achievement WHERE profile_id = ?1 AND code = ?2",
                params![input.profile_id, code],
                |r| r.get::<_, i64>(0),
            )
            .optional()
            .map_err(err)?
        {
            new_achievements.push(Achievement {
                id,
                profile_id: input.profile_id,
                code,
                unlocked_at: now.clone(),
            });
        }
    }

    tx.commit().map_err(err)?;

    Ok(SessionResult {
        stars,
        accuracy,
        correct: input.correct,
        total: input.total,
        stars_total,
        new_items,
        new_achievements,
    })
}

// ---------- Stats ----------

pub fn profile_stats(conn: &Connection, profile_id: i64) -> DbResult<ProfileStats> {
    let profile = get_profile(conn, profile_id)?.ok_or_else(|| "档案不存在".to_string())?;
    let today = today_str();
    let age = age_from_birthday(&profile.birthday, &today);
    let level = effective_level(profile.level_override, age);

    let rounds_total: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM game_record WHERE profile_id = ?1",
            params![profile_id],
            |r| r.get(0),
        )
        .map_err(err)?;
    let (total_correct, total_questions): (i64, i64) = conn
        .query_row(
            "SELECT COALESCE(SUM(correct),0), COALESCE(SUM(total),0) FROM game_record WHERE profile_id = ?1",
            params![profile_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(err)?;
    let accuracy = if total_questions > 0 {
        total_correct as f64 / total_questions as f64
    } else {
        0.0
    };

    let mut games = Vec::new();
    for gt in GAME_TYPES.iter() {
        let (rounds, best, correct, questions): (i64, Option<i64>, i64, i64) = conn
            .query_row(
                "SELECT COUNT(*), MAX(level), COALESCE(SUM(correct),0), COALESCE(SUM(total),0)
                 FROM game_record WHERE profile_id = ?1 AND game_type = ?2",
                params![profile_id, gt],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
            )
            .map_err(err)?;
        if rounds > 0 {
            games.push(GameProgress {
                game_type: gt.to_string(),
                rounds,
                best_level: best.unwrap_or(1),
                total_correct: correct,
                total_questions: questions,
                accuracy: if questions > 0 { correct as f64 / questions as f64 } else { 0.0 },
            });
        }
    }

    let achievements = list_achievements(conn, profile_id)?;
    let items_unlocked: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM unlocked_item WHERE profile_id = ?1",
            params![profile_id],
            |r| r.get(0),
        )
        .map_err(err)?;

    Ok(ProfileStats {
        profile,
        age_years: age,
        effective_level: level,
        rounds_total,
        total_correct,
        total_questions,
        accuracy,
        games,
        achievements,
        items_unlocked,
    })
}
