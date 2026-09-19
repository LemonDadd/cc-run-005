use kidmath_core::*;

// 完整走一遍：建两个孩子 -> 游玩 -> 星星/饰品/成就 -> 家长设置 -> 隔离。
#[test]
fn full_flow_two_profiles_are_isolated() {
    let db = Database::in_memory().unwrap();

    let alice = {
        let c = db.lock();
        create_profile(
            &c,
            &ProfileInput {
                nickname: "Alice".into(),
                birthday: "2020-01-01".into(),
                avatar: "cat".into(),
            },
        )
        .unwrap()
    };
    let bob = {
        let c = db.lock();
        create_profile(
            &c,
            &ProfileInput {
                nickname: "Bob".into(),
                birthday: "2018-06-01".into(),
                avatar: "dog".into(),
            },
        )
        .unwrap()
    };

    // 默认难度按年龄：Alice 当前年龄取决于系统日期，只校验在 1..=5；
    // override 生效。
    {
        let c = db.lock();
        set_level_override(&c, bob.id, Some(5)).unwrap();
    }
    let bob_stats = {
        let c = db.lock();
        profile_stats(&c, bob.id).unwrap()
    };
    assert_eq!(bob_stats.effective_level, 5);

    // Alice 连续打 5 个满分回合 => 每回合 2 星，共 10 星，解锁前两个饰品。
    for _ in 0..5 {
        let c = db.lock();
        let r = record_game(
            &c,
            &RecordGameInput {
                profile_id: alice.id,
                game_type: "counting".into(),
                level: 1,
                correct: 6,
                total: 6,
            },
        )
        .unwrap();
        assert_eq!(r.stars, 2);
    }
    let alice = {
        let c = db.lock();
        get_profile(&c, alice.id).unwrap().unwrap()
    };
    assert_eq!(alice.stars_total, 10);
    {
        let c = db.lock();
        let items = list_items(&c, alice.id).unwrap();
        let codes: Vec<_> = items.iter().map(|i| i.item_code.as_str()).collect();
        assert!(codes.contains(&"hat_party"));
        assert!(codes.contains(&"glasses_star"));
        assert_eq!(items.len(), 2);

        // Bob 没有任何饰品与星星 -> 数据隔离。
        assert_eq!(list_items(&c, bob.id).unwrap().len(), 0);
        let b = get_profile(&c, bob.id).unwrap().unwrap();
        assert_eq!(b.stars_total, 0);
    }

    // 装备/卸下校验：未解锁不能装备，已解锁可以装备并可卸下。
    {
        let c = db.lock();
        assert!(set_equipped(&c, alice.id, "hat", Some("bg_meadow")).is_err()); // 槽位不匹配
        assert!(set_equipped(&c, alice.id, "hat", Some("hat_party")).is_ok());
        let json = set_equipped(&c, alice.id, "hat", None).unwrap();
        assert_eq!(json, "{}");
    }

    // 答对累计 30 题，达成 perfect_game / first_round / correct_50? 5 回合 * 6 = 30 < 50。
    {
        let c = db.lock();
        let ach = list_achievements(&c, alice.id).unwrap();
        let has = |code: &str| ach.iter().any(|a| a.code == code);
        assert!(has("first_round"));
        assert!(has("perfect_game"));
        assert!(!has("correct_50"));
        assert!(!has("explore_all"));
    }

    // 玩遍六种游戏后应达成 explore_all。
    {
        for gt in ["compare", "orchard", "shapes", "pattern", "clock"] {
            let c = db.lock();
            record_game(
                &c,
                &RecordGameInput {
                    profile_id: alice.id,
                    game_type: gt.into(),
                    level: 1,
                    correct: 5,
                    total: 6,
                },
            )
            .unwrap();
        }
        let c = db.lock();
        let ach = list_achievements(&c, alice.id).unwrap();
        assert!(ach.iter().any(|a| a.code == "explore_all"));
    }
}

#[test]
fn parent_pin_lifecycle() {
    let db = Database::in_memory().unwrap();
    let c = db.lock();

    assert!(verify_pin(&c, "0000").unwrap());
    assert!(!verify_pin(&c, "1234").unwrap());
    assert!(change_pin(&c, "0000", "4321").is_ok());
    assert!(verify_pin(&c, "4321").unwrap());
    // 原 PIN 错误不能修改。
    assert!(change_pin(&c, "0000", "9999").is_err());
    // 新 PIN 必须 4 位数字。
    assert!(change_pin(&c, "4321", "12").is_err());
    assert!(change_pin(&c, "4321", "abcd").is_err());

    // 时长边界。
    assert!(set_daily_limit(&c, 25).is_ok());
    assert!(set_daily_limit(&c, 9).is_err());
    assert!(set_daily_limit(&c, 61).is_err());
    assert!(set_daily_limit(&c, 60).is_ok());
}

#[test]
fn usage_accumulates_for_today_and_delete_cascades() {
    let db = Database::in_memory().unwrap();
    let p = {
        let c = db.lock();
        create_profile(
            &c,
            &ProfileInput {
                nickname: "Kid".into(),
                birthday: "2020-01-01".into(),
                avatar: "fox".into(),
            },
        )
        .unwrap()
    };
    {
        let c = db.lock();
        let used = add_usage(&c, p.id, 60).unwrap();
        assert_eq!(used, 60);
        assert_eq!(add_usage(&c, p.id, 30).unwrap(), 90);
    }
    {
        let c = db.lock();
        record_game(
            &c,
            &RecordGameInput {
                profile_id: p.id,
                game_type: "clock".into(),
                level: 1,
                correct: 6,
                total: 6,
            },
        )
        .unwrap();
        delete_profile(&c, p.id).unwrap();
        // 级联删除后记录与档案都不存在。
        assert!(get_profile(&c, p.id).unwrap().is_none());
        assert_eq!(list_items(&c, p.id).unwrap().len(), 0);
        assert_eq!(list_achievements(&c, p.id).unwrap().len(), 0);
    }
}

#[test]
fn non_perfect_round_never_earns_two_stars() {
    let db = Database::in_memory().unwrap();
    let p = {
        let c = db.lock();
        create_profile(
            &c,
            &ProfileInput {
                nickname: "Kid".into(),
                birthday: "2020-01-01".into(),
                avatar: "fox".into(),
            },
        )
        .unwrap()
    };
    let c = db.lock();
    // 5/6 ≈ 0.833，>=0.8 但 <1.0 => 1 星。
    let r = record_game(
        &c,
        &RecordGameInput {
            profile_id: p.id,
            game_type: "counting".into(),
            level: 1,
            correct: 5,
            total: 6,
        },
    )
    .unwrap();
    assert_eq!(r.stars, 1);
    // 4/6 ≈ 0.667 => 0 星，不触发完美成就。
    let r = record_game(
        &c,
        &RecordGameInput {
            profile_id: p.id,
            game_type: "compare".into(),
            level: 1,
            correct: 4,
            total: 6,
        },
    )
    .unwrap();
    assert_eq!(r.stars, 0);
    let ach = list_achievements(&c, p.id).unwrap();
    assert!(!ach.iter().any(|a| a.code == "perfect_game"));
}
