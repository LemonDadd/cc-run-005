pub mod constants;
pub mod db;
pub mod models;

pub use constants::*;
pub use db::*;
pub use models::*;

use std::path::Path;
use std::sync::Mutex;

use rusqlite::Connection;

/// 对 SQLite 连接的线程安全封装。所有读写都经过这把锁，
/// 既能满足 Tauri 多线程 command 调用，也避免了 rusqlite 的 Send 约束问题。
pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    /// 打开（必要时创建）磁盘数据库文件。
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self, String> {
        if let Some(parent) = path.as_ref().parent() {
            if !parent.as_os_str().is_empty() {
                std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
        }
        let conn = Connection::open(path).map_err(|e| e.to_string())?;
        db::init(&conn)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    /// 内存数据库，主要用于测试与浏览器/无文件场景的对照。
    pub fn in_memory() -> Result<Self, String> {
        let conn = Connection::open_in_memory().map_err(|e| e.to_string())?;
        db::init(&conn)?;
        Ok(Self { conn: Mutex::new(conn) })
    }

    pub fn lock(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.conn.lock().expect("database mutex poisoned")
    }
}
