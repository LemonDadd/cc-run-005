// 防止 Windows release 窗口弹出额外的控制台
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    kidmath_lib::run()
}
