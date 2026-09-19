// 饰品目录（与前端 src/constants/games.ts 的 ITEM_CATALOG 顺序严格一致）。
// 每累计 STARS_PER_ITEM 颗星按顺序解锁下一个饰品。

pub const STARS_PER_ITEM: i64 = 5;

#[derive(Debug, Clone)]
pub struct ItemDef {
    pub id: &'static str,
    pub slot: &'static str,
}

pub const ITEMS: &[ItemDef] = &[
    ItemDef { id: "hat_party", slot: "hat" },
    ItemDef { id: "glasses_star", slot: "glasses" },
    ItemDef { id: "bg_sky", slot: "background" },
    ItemDef { id: "pet_dog", slot: "pet" },
    ItemDef { id: "hat_crown", slot: "hat" },
    ItemDef { id: "glasses_round", slot: "glasses" },
    ItemDef { id: "bg_rainbow", slot: "background" },
    ItemDef { id: "pet_cat", slot: "pet" },
    ItemDef { id: "hat_cap", slot: "hat" },
    ItemDef { id: "bg_space", slot: "background" },
    ItemDef { id: "pet_dino", slot: "pet" },
    ItemDef { id: "glasses_sun", slot: "glasses" },
];

pub const SLOTS: &[&str] = &["hat", "glasses", "background", "pet"];

pub fn item_exists(id: &str) -> bool {
    ITEMS.iter().any(|i| i.id == id)
}

pub fn slot_of(id: &str) -> Option<&'static str> {
    ITEMS.iter().find(|i| i.id == id).map(|i| i.slot)
}

/// 给定累计星星，返回应拥有的饰品数量
pub fn expected_item_count(stars_total: i64) -> usize {
    std::cmp::min(ITEMS.len(), (stars_total / STARS_PER_ITEM) as usize)
}

/// 安全哈希：SHA-256(salt + pin)，输出十六进制。
pub fn hash_pin(salt: &str, pin: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(salt.as_bytes());
    hasher.update(pin.as_bytes());
    hex::encode(hasher.finalize())
}

/// 生成 16 字节随机盐（十六进制 32 字符）
pub fn random_salt() -> String {
    let mut bytes = [0u8; 16];
    getrandom::getrandom(&mut bytes).expect("系统随机数不可用");
    hex::encode(bytes)
}

/// 恒定时间比较，避免 PIN 计时侧信道
pub fn constant_time_eq(a: &str, b: &str) -> bool {
    let ab = a.as_bytes();
    let bb = b.as_bytes();
    if ab.len() != bb.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in ab.iter().zip(bb.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}
