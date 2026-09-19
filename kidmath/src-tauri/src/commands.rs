// Tauri command 层：前端只能通过这些 IPC 命令访问数据，绝不直接碰文件系统。
// 命令全部为 async，避免在主线程执行 SQLite；内部用 std::Mutex 串行化。
use std::sync::Mutex;

use tauri::State;

use crate::db::Db;
use crate::models::*;

type CmdError = String;

fn db<'a>(state: &'a State<'_, Mutex<Db>>) -> Result<std::sync::MutexGuard<'a, Db>, CmdError> {
    state.lock().map_err(|_| "数据库锁已损坏".to_string())
}

#[tauri::command]
pub async fn list_profiles(state: State<'_, Mutex<Db>>) -> Result<Vec<Profile>, String> {
    db(&state)?.list_profiles()
}

#[tauri::command]
pub async fn create_profile(
    nickname: String,
    birthday: String,
    avatar: String,
    state: State<'_, Mutex<Db>>,
) -> Result<Profile, String> {
    db(&state)?.create_profile(&nickname, &birthday, &avatar)
}

#[tauri::command]
pub async fn update_profile(
    id: i64,
    nickname: Option<String>,
    birthday: Option<String>,
    avatar: Option<String>,
    state: State<'_, Mutex<Db>>,
) -> Result<Profile, String> {
    db(&state)?.update_profile(id, nickname, birthday, avatar)
}

#[tauri::command]
pub async fn delete_profile(id: i64, state: State<'_, Mutex<Db>>) -> Result<(), String> {
    db(&state)?.delete_profile(id)
}

#[tauri::command]
pub async fn get_parent_settings(
    state: State<'_, Mutex<Db>>,
) -> Result<ParentSettings, String> {
    db(&state)?.get_settings()
}

#[tauri::command]
pub async fn verify_pin(pin: String, state: State<'_, Mutex<Db>>) -> Result<bool, String> {
    Ok(db(&state)?.verify_pin(&pin))
}

#[tauri::command]
pub async fn change_pin(
    old_pin: String,
    new_pin: String,
    state: State<'_, Mutex<Db>>,
) -> Result<ParentSettings, String> {
    db(&state)?.change_pin(&old_pin, &new_pin)
}

#[tauri::command]
pub async fn set_daily_limit(
    pin: String,
    minutes: i64,
    state: State<'_, Mutex<Db>>,
) -> Result<ParentSettings, String> {
    db(&state)?.set_daily_limit(&pin, minutes)
}

#[tauri::command]
pub async fn add_usage(
    profile_id: i64,
    seconds: i64,
    state: State<'_, Mutex<Db>>,
) -> Result<DailyUsage, String> {
    db(&state)?.add_usage(profile_id, seconds)
}

#[tauri::command]
pub async fn get_today_usage(
    profile_id: i64,
    state: State<'_, Mutex<Db>>,
) -> Result<Option<DailyUsage>, String> {
    db(&state)?.get_today_usage(profile_id)
}

#[tauri::command]
pub async fn save_round(
    profile_id: i64,
    game_type: String,
    level: i64,
    correct: i64,
    total: i64,
    duration_sec: i64,
    state: State<'_, Mutex<Db>>,
) -> Result<SaveRoundResult, String> {
    db(&state)?.save_round(
        profile_id,
        &game_type,
        level,
        correct,
        total,
        duration_sec,
    )
}

#[tauri::command]
pub async fn list_records(
    profile_id: i64,
    state: State<'_, Mutex<Db>>,
) -> Result<Vec<GameRecord>, String> {
    db(&state)?.list_records(profile_id)
}

#[tauri::command]
pub async fn list_achievements(
    profile_id: i64,
    state: State<'_, Mutex<Db>>,
) -> Result<Vec<Achievement>, String> {
    db(&state)?.list_achievements(profile_id)
}

#[tauri::command]
pub async fn get_inventory(
    profile_id: i64,
    state: State<'_, Mutex<Db>>,
) -> Result<Inventory, String> {
    db(&state)?.get_inventory(profile_id)
}

#[tauri::command]
pub async fn equip_item(
    profile_id: i64,
    slot: String,
    item_id: Option<String>,
    state: State<'_, Mutex<Db>>,
) -> Result<Vec<EquippedItem>, String> {
    db(&state)?.equip_item(profile_id, &slot, item_id)
}

#[tauri::command]
pub async fn get_stats(
    profile_id: i64,
    state: State<'_, Mutex<Db>>,
) -> Result<ProfileStats, String> {
    db(&state)?.get_stats(profile_id)
}

#[tauri::command]
pub async fn set_level_override(
    pin: String,
    profile_id: i64,
    level: Option<i64>,
    state: State<'_, Mutex<Db>>,
) -> Result<Profile, String> {
    db(&state)?.set_level_override(&pin, profile_id, level)
}

#[tauri::command]
pub async fn reset_progress(
    pin: String,
    profile_id: i64,
    state: State<'_, Mutex<Db>>,
) -> Result<Profile, String> {
    db(&state)?.reset_progress(&pin, profile_id)
}
