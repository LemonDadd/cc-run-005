// KidMath Tauri 后端入口：初始化 SQLite、注册全部 IPC 命令。
mod catalog;
mod commands;
mod db;
mod models;

use std::sync::Mutex;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // 数据库放在各平台标准应用数据目录：
            // macOS: ~/Library/Application Support/com.kidmath.app
            // Windows: %APPDATA%\com.kidmath.app
            let dir = app
                .path()
                .app_data_dir()
                .expect("无法获取应用数据目录");
            let database = db::Db::open(dir).expect("数据库初始化失败");
            app.manage(Mutex::new(database));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_profiles,
            commands::create_profile,
            commands::update_profile,
            commands::delete_profile,
            commands::get_parent_settings,
            commands::verify_pin,
            commands::change_pin,
            commands::set_daily_limit,
            commands::add_usage,
            commands::get_today_usage,
            commands::save_round,
            commands::list_records,
            commands::list_achievements,
            commands::get_inventory,
            commands::equip_item,
            commands::get_stats,
            commands::set_level_override,
            commands::reset_progress,
        ])
        .run(tauri::generate_context!())
        .expect("启动 KidMath 失败");
}
