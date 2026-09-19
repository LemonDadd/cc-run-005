/// 与前端 src/game/catalog.ts 保持一致的共享常量与纯规则函数。

pub const GAME_TYPES: [&str; 6] = [
    "counting",
    "compare",
    "orchard",
    "shapes",
    "pattern",
    "clock",
];

/// 每回合题目数随等级在 5-10 之间浮动。
pub fn question_count_for_level(level: i64) -> i64 {
    4 + level.clamp(1, 5) + 1
}

/// 年龄按“是否已过生日”计算整岁。
pub fn age_from_birthday(birthday: &str, today: &str) -> i64 {
    // birthday / today 均为 YYYY-MM-DD
    let b: Vec<&str> = birthday.split('-').collect();
    let t: Vec<&str> = today.split('-').collect();
    if b.len() != 3 || t.len() != 3 {
        return 0;
    }
    let by: i32 = b[0].parse().unwrap_or(0);
    let bm: u32 = b[1].parse().unwrap_or(1);
    let bd: u32 = b[2].parse().unwrap_or(1);
    let ty: i32 = t[0].parse().unwrap_or(0);
    let tm: u32 = t[1].parse().unwrap_or(1);
    let td: u32 = t[2].parse().unwrap_or(1);
    if by <= 0 || ty < by {
        return 0;
    }
    let mut age = (ty - by) as i64;
    if (tm, td) < (bm, bd) {
        age -= 1;
    }
    age.max(0)
}

/// 默认难度 = max(1, min(5, age - 2))，家长可用 level_override 覆盖。
pub fn default_level(age_years: i64) -> i64 {
    (age_years - 2).clamp(1, 5)
}

pub fn effective_level(level_override: Option<i64>, age_years: i64) -> i64 {
    match level_override {
        Some(v) if (1..=5).contains(&v) => v,
        _ => default_level(age_years.max(3)),
    }
}

/// 正确率门槛：>=0.8 得 1 星，>=1.0（首次全对）得 2 星。
pub fn stars_for_accuracy(accuracy: f64) -> i64 {
    if accuracy >= 1.0 - f64::EPSILON {
        2
    } else if accuracy >= 0.8 - f64::EPSILON {
        1
    } else {
        0
    }
}

pub const DAILY_LIMIT_DEFAULT: i64 = 25;
pub const DAILY_LIMIT_MIN: i64 = 10;
pub const DAILY_LIMIT_MAX: i64 = 60;

pub const DEFAULT_PIN: &str = "0000";
/// 与应用绑定的固定盐值（纯本地离线应用，PIN 仅用于家长门禁）。
pub const PIN_SALT: &str = "kidmath::parent-pin::v1";

/// 饰品目录，按累计星星 5、10、15…… 依次解锁，最多 16 个。
pub struct ItemDef {
    pub code: &'static str,
    pub name: &'static str,
    pub slot: &'static str,
    pub at_stars: i64,
}

pub const ITEMS: [ItemDef; 16] = [
    ItemDef { code: "hat_party",   name: "派对帽",   slot: "hat",     at_stars: 5 },
    ItemDef { code: "glasses_star",name: "星星眼镜", slot: "glasses", at_stars: 10 },
    ItemDef { code: "bg_meadow",   name: "青青草地", slot: "bg",      at_stars: 15 },
    ItemDef { code: "pet_bunny",   name: "小兔子",   slot: "pet",     at_stars: 20 },
    ItemDef { code: "hat_crown",   name: "小皇冠",   slot: "hat",     at_stars: 25 },
    ItemDef { code: "glasses_sun", name: "太阳眼镜", slot: "glasses", at_stars: 30 },
    ItemDef { code: "bg_night",    name: "星空夜幕", slot: "bg",      at_stars: 35 },
    ItemDef { code: "pet_cat",     name: "小猫咪",   slot: "pet",     at_stars: 40 },
    ItemDef { code: "hat_cap",     name: "棒球帽",   slot: "hat",     at_stars: 45 },
    ItemDef { code: "glasses_round",name:"圆圆眼镜", slot: "glasses", at_stars: 50 },
    ItemDef { code: "bg_beach",    name: "阳光沙滩", slot: "bg",      at_stars: 55 },
    ItemDef { code: "pet_dog",     name: "小狗狗",   slot: "pet",     at_stars: 60 },
    ItemDef { code: "hat_wizard",  name: "魔法帽",   slot: "hat",     at_stars: 65 },
    ItemDef { code: "glasses_shield",name:"潜水镜",  slot: "glasses", at_stars: 70 },
    ItemDef { code: "bg_rainbow",  name: "彩虹花园", slot: "bg",      at_stars: 75 },
    ItemDef { code: "pet_dragon",  name: "小恐龙",   slot: "pet",     at_stars: 80 },
];

pub struct AchievementDef {
    pub code: &'static str,
    pub name: &'static str,
    pub category: &'static str,
    pub desc: &'static str,
}

pub const ACHIEVEMENTS: [AchievementDef; 9] = [
    AchievementDef { code: "first_round",   name: "初次冒险",   category: "persistence", desc: "完成第一回合游戏" },
    AchievementDef { code: "rounds_10",     name: "坚持不懈",   category: "persistence", desc: "累计完成 10 个回合" },
    AchievementDef { code: "streak_3_days", name: "连续三天",   category: "persistence", desc: "连续 3 天玩 KidMath" },
    AchievementDef { code: "perfect_game",  name: "完美一局",   category: "mastery",     desc: "某游戏一回合 100% 正确" },
    AchievementDef { code: "correct_50",    name: "答题小能手", category: "mastery",     desc: "累计答对 50 题" },
    AchievementDef { code: "explore_all",   name: "小小探险家", category: "exploration", desc: "玩遍六种游戏" },
    AchievementDef { code: "items_5",       name: "收藏家",     category: "exploration", desc: "解锁 5 个饰品" },
    AchievementDef { code: "stars_30",      name: "闪耀明星",   category: "mastery",     desc: "累计获得 30 颗星" },
    AchievementDef { code: "rounds_25",     name: "游戏达人",   category: "persistence", desc: "累计完成 25 个回合" },
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn age_calculation_before_and_after_birthday() {
        assert_eq!(age_from_birthday("2018-06-01", "2024-05-31"), 5);
        assert_eq!(age_from_birthday("2018-06-01", "2024-06-01"), 6);
        assert_eq!(age_from_birthday("2018-06-01", "2024-12-31"), 6);
        assert_eq!(age_from_birthday("2024-06-01", "2024-06-01"), 0);
    }

    #[test]
    fn default_level_follows_age_band() {
        assert_eq!(default_level(3), 1);
        assert_eq!(default_level(4), 2);
        assert_eq!(default_level(5), 3);
        assert_eq!(default_level(7), 5);
        assert_eq!(default_level(8), 5);
        assert_eq!(default_level(30), 5);
    }

    #[test]
    fn override_takes_precedence_when_valid() {
        assert_eq!(effective_level(Some(2), 6), 2);
        assert_eq!(effective_level(Some(9), 6), 4);
        assert_eq!(effective_level(None, 6), 4);
    }

    #[test]
    fn stars_band() {
        assert_eq!(stars_for_accuracy(1.0), 2);
        assert_eq!(stars_for_accuracy(0.8), 1);
        assert_eq!(stars_for_accuracy(0.79), 0);
    }

    #[test]
    fn question_count_in_range() {
        for l in 1..=5 {
            let n = question_count_for_level(l);
            assert!((5..=10).contains(&n), "level {l} count {n} out of 5..=10");
        }
        assert_eq!(question_count_for_level(1), 6);
        assert_eq!(question_count_for_level(5), 10);
    }
}
