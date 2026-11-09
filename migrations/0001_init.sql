-- D1 Database Schema & Initial Seed Data for Meal Decider ("今天吃什么")

CREATE TABLE IF NOT EXISTS restaurants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  meal_time TEXT NOT NULL DEFAULT 'both' CHECK (meal_time IN ('lunch', 'dinner', 'both')),
  weight INTEGER NOT NULL DEFAULT 5 CHECK (weight >= 1 AND weight <= 10),
  category TEXT NOT NULL DEFAULT '正餐',
  note TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  last_eaten_at TEXT DEFAULT NULL,
  eat_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meal_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL,
  restaurant_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '正餐',
  meal_type TEXT NOT NULL CHECK (meal_type IN ('lunch', 'dinner')),
  chosen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_restaurants_meal_time ON restaurants(meal_time, enabled);
CREATE INDEX IF NOT EXISTS idx_meal_history_chosen_at ON meal_history(chosen_at DESC);

-- Seed initial restaurants only if the table is empty
INSERT INTO restaurants (name, meal_time, weight, category, note, enabled, eat_count)
SELECT '阿婆广式牛杂煲', 'both', 8, '正餐', '人均 ¥38 · 萝卜入味，牛腩软烂 · 步行 6 分钟', 1, 3
WHERE NOT EXISTS (SELECT 1 FROM restaurants LIMIT 1);

INSERT INTO restaurants (name, meal_time, weight, category, note, enabled, eat_count)
SELECT '川香巷子重庆小面', 'lunch', 7, '面食粉类', '人均 ¥22 · 招牌豌杂面微辣绝配 · 出餐极快', 1, 5
WHERE (SELECT COUNT(*) FROM restaurants) = 1;

INSERT INTO restaurants (name, meal_time, weight, category, note, enabled, eat_count)
SELECT '木屋炭火烧烤·精酿', 'dinner', 8, '小吃夜宵', '人均 ¥75 · 仅晚间17:30后营业 · 必点烤羊排和蒜蓉生蚝', 1, 2
WHERE (SELECT COUNT(*) FROM restaurants) = 2;

INSERT INTO restaurants (name, meal_time, weight, category, note, enabled, eat_count)
SELECT '隆江猪脚饭（老字号）', 'lunch', 6, '快餐简餐', '人均 ¥25 · 肥而不腻，打工人午餐浪漫', 1, 4
WHERE (SELECT COUNT(*) FROM restaurants) = 3;

INSERT INTO restaurants (name, meal_time, weight, category, note, enabled, eat_count)
SELECT '潮汕鲜切牛肉火锅', 'dinner', 9, '火锅烤肉', '人均 ¥95 · 吊龙与匙柄必点 · 适合晚上下班慢享', 1, 2
WHERE (SELECT COUNT(*) FROM restaurants) = 4;

INSERT INTO restaurants (name, meal_time, weight, category, note, enabled, eat_count)
SELECT '桂林老街卤菜粉', 'lunch', 7, '面食粉类', '人均 ¥18 · 锅烧脆皮超香，免费加酸豆角酸笋', 1, 6
WHERE (SELECT COUNT(*) FROM restaurants) = 5;

INSERT INTO restaurants (name, meal_time, weight, category, note, enabled, eat_count)
SELECT '大榕树下顺德煲仔饭', 'both', 8, '正餐', '人均 ¥36 · 腊味双拼锅巴焦香 · 现煲需等 15 分钟', 1, 3
WHERE (SELECT COUNT(*) FROM restaurants) = 6;

INSERT INTO restaurants (name, meal_time, weight, category, note, enabled, eat_count)
SELECT '南门夜市小吃街', 'dinner', 7, '小吃夜宵', '人均 ¥40 · 仅晚上出摊！烤冷面、臭豆腐、炒冰一网打尽', 1, 1
WHERE (SELECT COUNT(*) FROM restaurants) = 7;

INSERT INTO restaurants (name, meal_time, weight, category, note, enabled, eat_count)
SELECT '绿野仙踪牛油果能量碗', 'lunch', 4, '轻食沙拉', '人均 ¥35 · 低卡高蛋白，罪恶感克星（就是有点草味）', 1, 1
WHERE (SELECT COUNT(*) FROM restaurants) = 8;

INSERT INTO restaurants (name, meal_time, weight, category, note, enabled, eat_count)
SELECT '深夜食堂·日式豚骨拉面', 'dinner', 7, '面食粉类', '人均 ¥45 · 浓汤黑蒜油拉面 + 溏心蛋，晚间限定', 1, 2
WHERE (SELECT COUNT(*) FROM restaurants) = 9;

INSERT INTO restaurants (name, meal_time, weight, category, note, enabled, eat_count)
SELECT '外婆家常小炒馆', 'both', 9, '正餐', '人均 ¥42 · 辣椒炒肉下饭神器，离得很近', 1, 4
WHERE (SELECT COUNT(*) FROM restaurants) = 10;

INSERT INTO restaurants (name, meal_time, weight, category, note, enabled, eat_count)
SELECT '麦当劳 / 金拱门', 'both', 3, '快餐简餐', '人均 ¥30 · 实在不知道吃啥时的保底选择，距离稍远', 1, 2
WHERE (SELECT COUNT(*) FROM restaurants) = 11;
