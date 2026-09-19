use kidmath_core::{
    db, effective_level, age_from_birthday, today_str, Database, ParentSettings as CoreSettings,
    ProfileInput, RecordGameInput,
};
use kidmath_core::models::{
    Achievement, Profile, ProfileStats, UnlockedItem,
};
use serde::Serialize;
use tauri::Manager;

/// 返回给前端的家长设置（不含 PIN 哈希，避免敏感数据离开后端）。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SafeSettings {
    daily_limit_minutes: i64,
    is_default_pin: bool,
}

impl From<CoreSettings> for SafeSettings {
    fn from(s: CoreSettings) -> Self {
        SafeSettings {
            daily_limit_minutes: s.daily_limit_minutes,
            is_default_pin: s.is_default_pin,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct UsageStatus {
    date: String,
    used_seconds: i64,
    limit_seconds: i64,
    remaining_seconds: i64,
    limit_reached: bool,
}

fn usage_status(db: &Database, profile_id: i64) -> Result<UsageStatus, String> {
    let c = db.lock();
    let s = db::get_settings(&c)?;
    let date = today_str();
    let used = db::get_used_seconds(&c, profile_id, &date)?;
    let limit = s.daily_limit_minutes * 60;
    let remaining = (limit - used).max(0);
    Ok(UsageStatus {
        date,
        used_seconds: used,
        limit_seconds: limit,
        remaining_seconds: remaining,
        limit_reached: used >= limit,
    })
}

#[tauri::command]
fn list_profiles(db: tauri::State<'_, Database>) -> Result<Vec<Profile>, String> {
    db::list_profiles(&db.lock())
}

#[tauri::command]
fn create_profile(db: tauri::State<'_, Database>, input: ProfileInput) -> Result<Profile, String> {
    db::create_profile(&db.lock(), &input)
}

#[tauri::command]
fn update_profile(
    db: tauri::State<'_, Database>,
    id: i64,
    input: ProfileInput,
) -> Result<Profile, String> {
    db::update_profile(&db.lock(), id, &input)
}

#[tauri::command]
fn delete_profile(db: tauri::State<'_, Database>, id: i64) -> Result<(), String> {
    db::delete_profile(&db.lock(), id)
}

#[tauri::command]
fn set_level_override(
    db: tauri::State<'_, Database>,
    profile_id: i64,
    level: Option<i64>,
) -> Result<(), String> {
    db::set_level_override(&db.lock(), profile_id, level)
}

#[tauri::command]
fn set_equipped(
    db: tauri::State<'_, Database>,
    profile_id: i64,
    slot: String,
    item_code: Option<String>,
) -> Result<String, String> {
    db::set_equipped(&db.lock(), profile_id, &slot, item_code.as_deref())
}

#[tauri::command]
fn get_settings(db: tauri::State<'_, Database>) -> Result<SafeSettings, String> {
    Ok(db::get_settings(&db.lock())?.into())
}

#[tauri::command]
fn verify_pin(db: tauri::State<'_, Database>, pin: String) -> Result<bool, String> {
    db::verify_pin(&db.lock(), &pin)
}

#[tauri::command]
fn change_pin(
    db: tauri::State<'_, Database>,
    old_pin: String,
    new_pin: String,
) -> Result<(), String> {
    db::change_pin(&db.lock(), &old_pin, &new_pin)
}

#[tauri::command]
fn set_daily_limit(db: tauri::State<'_, Database>, minutes: i64) -> Result<(), String> {
    db::set_daily_limit(&db.lock(), minutes)
}

#[tauri::command]
fn get_usage(db: tauri::State<'_, Database>, profile_id: i64) -> Result<UsageStatus, String> {
    usage_status(&db, profile_id)
}

#[tauri::command]
fn add_usage(
    db: tauri::State<'_, Database>,
    profile_id: i64,
    seconds: i64,
) -> Result<UsageStatus, String> {
    db::add_usage(&db.lock(), profile_id, seconds)?;
    usage_status(&db, profile_id)
}

#[tauri::command]
fn record_game(
    db: tauri::State<'_, Database>,
    input: RecordGameInput,
) -> Result<kidmath_core::SessionResult, String> {
    db::record_game(&db.lock(), &input)
}

#[tauri::command]
fn get_stats(db: tauri::State<'_, Database>, profile_id: i64) -> Result<ProfileStats, String> {
    db::profile_stats(&db.lock(), profile_id)
}

#[tauri::command]
fn list_items(
    db: tauri::State<'_, Database>,
    profile_id: i64,
) -> Result<Vec<UnlockedItem>, String> {
    db::list_items(&db.lock(), profile_id)
}

#[tauri::command]
fn list_achievements(
    db: tauri::State<'_, Database>,
    profile_id: i64,
) -> Result<Vec<Achievement>, String> {
    db::list_achievements(&db.lock(), profile_id)
}

/// 供前端展示年龄/默认难度的便捷只读接口。
#[tauri::command]
fn profile_level_info(
    db: tauri::State<'_, Database>,
    profile_id: i64,
) -> Result<serde_json::Value, String> {
    let c = db.lock();
    let p = db::get_profile(&c, profile_id)?
        .ok_or_else(|| "档案不存在".to_string())?;
    let age = age_from_birthday(&p.birthday, &today_str());
    let level = effective_level(p.level_override, age);
    Ok(serde_json::json!({ "ageYears": age, "effectiveLevel": level }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // 数据库放在系统应用数据目录，全程本地文件，无任何网络访问。
            let dir = app
                .path()
                .app_data_dir()
                .expect("无法获取应用数据目录");
            let db_path = dir.join("kidmath.db");
            let database = Database::open(&db_path)
                .unwrap_or_else(|e| panic!("无法打开数据库 {}: {e}", db_path.display()));
            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_profiles,
            create_profile,
            update_profile,
            delete_profile,
            set_level_override,
            set_equipped,
            get_settings,
            verify_pin,
            change_pin,
            set_daily_limit,
            get_usage,
            add_usage,
            record_game,
            get_stats,
            list_items,
            list_achievements,
            profile_level_info,
        ])
        .run(tauri::generate_context!())
        .expect("运行 KidMath 时出错");
}
