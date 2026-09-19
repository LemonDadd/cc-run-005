// 防止 Windows Release 下弹出控制台窗口。
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    kidmath_lib::run()
}
