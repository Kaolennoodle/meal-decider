export interface Env {
  DB: D1Database;
  ADMIN_PIN?: string;
}

export interface RestaurantRow {
  id: number;
  name: string;
  meal_time: 'lunch' | 'dinner' | 'both';
  weight: number;
  category: string;
  note: string;
  enabled: number;
  last_eaten_at: string | null;
  eat_count: number;
  created_at: string;
}

export interface HistoryRow {
  id: number;
  restaurant_id: number;
  restaurant_name: string;
  category: string;
  meal_type: 'lunch' | 'dinner';
  chosen_at: string;
}

const INITIAL_SEED_RESTAURANTS: Array<Omit<RestaurantRow, 'id' | 'last_eaten_at' | 'created_at'>> = [
  { name: '阿婆广式牛杂煲', meal_time: 'both', weight: 8, category: '正餐', note: '人均 ¥38 · 萝卜入味，牛腩软烂 · 步行 6 分钟', enabled: 1, eat_count: 3 },
  { name: '川香巷子重庆小面', meal_time: 'lunch', weight: 7, category: '面食粉类', note: '人均 ¥22 · 招牌豌杂面微辣绝配 · 出餐极快', enabled: 1, eat_count: 5 },
  { name: '木屋炭火烧烤·精酿', meal_time: 'dinner', weight: 8, category: '小吃夜宵', note: '人均 ¥75 · 仅晚间17:30后营业 · 必点烤羊排和蒜蓉生蚝', enabled: 1, eat_count: 2 },
  { name: '隆江猪脚饭（老字号）', meal_time: 'lunch', weight: 6, category: '快餐简餐', note: '人均 ¥25 · 肥而不腻，打工人午餐浪漫', enabled: 1, eat_count: 4 },
  { name: '潮汕鲜切牛肉火锅', meal_time: 'dinner', weight: 9, category: '火锅烤肉', note: '人均 ¥95 · 吊龙与匙柄必点 · 适合晚上下班慢享', enabled: 1, eat_count: 2 },
  { name: '桂林老街卤菜粉', meal_time: 'lunch', weight: 7, category: '面食粉类', note: '人均 ¥18 · 锅烧脆皮超香，免费加酸豆角酸笋', enabled: 1, eat_count: 6 },
  { name: '大榕树下顺德煲仔饭', meal_time: 'both', weight: 8, category: '正餐', note: '人均 ¥36 · 腊味双拼锅巴焦香 · 现煲需等 15 分钟', enabled: 1, eat_count: 3 },
  { name: '南门夜市小吃街', meal_time: 'dinner', weight: 7, category: '小吃夜宵', note: '人均 ¥40 · 仅晚上出摊！烤冷面、臭豆腐、炒冰一网打尽', enabled: 1, eat_count: 1 },
  { name: '绿野仙踪牛油果能量碗', meal_time: 'lunch', weight: 4, category: '轻食沙拉', note: '人均 ¥35 · 低卡高蛋白，罪恶感克星（就是有点草味）', enabled: 1, eat_count: 1 },
  { name: '深夜食堂·日式豚骨拉面', meal_time: 'dinner', weight: 7, category: '面食粉类', note: '人均 ¥45 · 浓汤黑蒜油拉面 + 溏心蛋，晚间限定', enabled: 1, eat_count: 2 },
  { name: '外婆家常小炒馆', meal_time: 'both', weight: 9, category: '正餐', note: '人均 ¥42 · 辣椒炒肉下饭神器，离得很近', enabled: 1, eat_count: 4 },
  { name: '麦当劳 / 金拱门', meal_time: 'both', weight: 3, category: '快餐简餐', note: '人均 ¥30 · 实在不知道吃啥时的保底选择，距离稍远', enabled: 1, eat_count: 2 },
];

let schemaInitialized = false;

async function ensureSchemaAndSeed(db: D1Database): Promise<void> {
  if (schemaInitialized) return;
  try {
    await db.batch([
      db.prepare(`
        CREATE TABLE IF NOT EXISTS restaurants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          meal_time TEXT NOT NULL DEFAULT 'both',
          weight INTEGER NOT NULL DEFAULT 5,
          category TEXT NOT NULL DEFAULT '正餐',
          note TEXT NOT NULL DEFAULT '',
          enabled INTEGER NOT NULL DEFAULT 1,
          last_eaten_at TEXT DEFAULT NULL,
          eat_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS meal_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          restaurant_id INTEGER NOT NULL,
          restaurant_name TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT '正餐',
          meal_type TEXT NOT NULL,
          chosen_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `),
    ]);

    const countRow = await db.prepare('SELECT COUNT(*) as total FROM restaurants').first<{ total: number }>();
    if (!countRow || countRow.total === 0) {
      const insertStmt = db.prepare(
        'INSERT INTO restaurants (name, meal_time, weight, category, note, enabled, eat_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      const nowIso = new Date().toISOString();
      await db.batch(
        INITIAL_SEED_RESTAURANTS.map((r) =>
          insertStmt.bind(r.name, r.meal_time, r.weight, r.category, r.note, r.enabled, r.eat_count, nowIso)
        )
      );
    }
    schemaInitialized = true;
  } catch (err) {
    console.error('Database init error:', err);
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function verifyPin(request: Request, env: Env): boolean {
  const expectedPin = (env.ADMIN_PIN || '8888').trim();
  const providedPin = (request.headers.get('X-Admin-Pin') || '').trim();
  return providedPin === expectedPin;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/')) {
      return new Response('Not Found', { status: 404 });
    }

    await ensureSchemaAndSeed(env.DB);

    const path = url.pathname;
    const method = request.method.toUpperCase();

    try {
      // 1. Verify Admin PIN
      if (path === '/api/verify-pin' && method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as { pin?: string };
        const expectedPin = (env.ADMIN_PIN || '8888').trim();
        const isValid = (body.pin || '').trim() === expectedPin;
        if (!isValid) {
          return jsonResponse({ ok: false, error: '口令不正确，请重试' }, 401);
        }
        return jsonResponse({ ok: true });
      }

      // 2. Get all restaurants + recent history
      if (path === '/api/bootstrap' && method === 'GET') {
        const [restaurantsResult, historyResult] = await env.DB.batch([
          env.DB.prepare('SELECT * FROM restaurants ORDER BY weight DESC, id ASC'),
          env.DB.prepare('SELECT * FROM meal_history ORDER BY id DESC LIMIT 20'),
        ]);

        return jsonResponse({
          ok: true,
          restaurants: (restaurantsResult.results || []) as RestaurantRow[],
          history: (historyResult.results || []) as HistoryRow[],
        });
      }

      // 3. Record "Eat this!" choice (publicly accessible so users can confirm a draw easily)
      if (path === '/api/choose' && method === 'POST') {
        const body = (await request.json()) as {
          restaurant_id: number;
          meal_type: 'lunch' | 'dinner';
        };
        if (!body.restaurant_id) {
          return jsonResponse({ ok: false, error: '缺少餐厅 ID' }, 400);
        }

        const restaurant = await env.DB.prepare('SELECT * FROM restaurants WHERE id = ?')
          .bind(body.restaurant_id)
          .first<RestaurantRow>();

        if (!restaurant) {
          return jsonResponse({ ok: false, error: '未找到该餐厅' }, 404);
        }

        const nowIso = new Date().toISOString();
        const mealType = body.meal_type === 'dinner' ? 'dinner' : 'lunch';

        await env.DB.batch([
          env.DB.prepare(
            'UPDATE restaurants SET last_eaten_at = ?, eat_count = eat_count + 1 WHERE id = ?'
          ).bind(nowIso, restaurant.id),
          env.DB.prepare(
            'INSERT INTO meal_history (restaurant_id, restaurant_name, category, meal_type, chosen_at) VALUES (?, ?, ?, ?, ?)'
          ).bind(restaurant.id, restaurant.name, restaurant.category, mealType, nowIso),
        ]);

        const [updatedRestaurant, historyResult] = await Promise.all([
          env.DB.prepare('SELECT * FROM restaurants WHERE id = ?').bind(restaurant.id).first<RestaurantRow>(),
          env.DB.prepare('SELECT * FROM meal_history ORDER BY id DESC LIMIT 20').all<HistoryRow>(),
        ]);

        return jsonResponse({
          ok: true,
          restaurant: updatedRestaurant,
          history: historyResult.results || [],
        });
      }

      // 4. Create new restaurant (PIN protected)
      if (path === '/api/restaurants' && method === 'POST') {
        if (!verifyPin(request, env)) {
          return jsonResponse({ ok: false, error: '需要正确的管理口令才能修改选项库' }, 401);
        }

        const body = (await request.json()) as Partial<RestaurantRow>;
        const name = (body.name || '').trim();
        if (!name) {
          return jsonResponse({ ok: false, error: '餐厅名称不能为空' }, 400);
        }

        const mealTime =
          body.meal_time === 'lunch' || body.meal_time === 'dinner' ? body.meal_time : 'both';
        const weight = Math.min(10, Math.max(1, Number(body.weight) || 5));
        const category = (body.category || '正餐').trim() || '正餐';
        const note = (body.note || '').trim();
        const enabled = body.enabled === 0 ? 0 : 1;
        const nowIso = new Date().toISOString();

        const res = await env.DB.prepare(
          `INSERT INTO restaurants (name, meal_time, weight, category, note, enabled, eat_count, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
        )
          .bind(name, mealTime, weight, category, note, enabled, nowIso)
          .run();

        const created = await env.DB.prepare('SELECT * FROM restaurants WHERE id = ?')
          .bind(res.meta.last_row_id)
          .first<RestaurantRow>();

        return jsonResponse({ ok: true, restaurant: created }, 201);
      }

      // 5. Update or Delete a specific restaurant: /api/restaurants/:id
      const matchId = path.match(/^\/api\/restaurants\/(\d+)$/);
      if (matchId) {
        if (!verifyPin(request, env)) {
          return jsonResponse({ ok: false, error: '需要正确的管理口令才能修改选项库' }, 401);
        }

        const id = Number(matchId[1]);

        if (method === 'PUT' || method === 'PATCH') {
          const existing = await env.DB.prepare('SELECT * FROM restaurants WHERE id = ?')
            .bind(id)
            .first<RestaurantRow>();
          if (!existing) {
            return jsonResponse({ ok: false, error: '餐厅不存在' }, 404);
          }

          const body = (await request.json()) as Partial<RestaurantRow>;
          const name = body.name !== undefined ? body.name.trim() : existing.name;
          if (!name) {
            return jsonResponse({ ok: false, error: '餐厅名称不能为空' }, 400);
          }

          const mealTime =
            body.meal_time === 'lunch' || body.meal_time === 'dinner' || body.meal_time === 'both'
              ? body.meal_time
              : existing.meal_time;
          const weight =
            body.weight !== undefined
              ? Math.min(10, Math.max(1, Number(body.weight) || 5))
              : existing.weight;
          const category =
            body.category !== undefined ? body.category.trim() || '正餐' : existing.category;
          const note = body.note !== undefined ? body.note.trim() : existing.note;
          const enabled =
            body.enabled !== undefined ? (body.enabled ? 1 : 0) : existing.enabled;

          await env.DB.prepare(
            `UPDATE restaurants
             SET name = ?, meal_time = ?, weight = ?, category = ?, note = ?, enabled = ?
             WHERE id = ?`
          )
            .bind(name, mealTime, weight, category, note, enabled, id)
            .run();

          const updated = await env.DB.prepare('SELECT * FROM restaurants WHERE id = ?')
            .bind(id)
            .first<RestaurantRow>();

          return jsonResponse({ ok: true, restaurant: updated });
        }

        if (method === 'DELETE') {
          await env.DB.prepare('DELETE FROM restaurants WHERE id = ?').bind(id).run();
          return jsonResponse({ ok: true, deletedId: id });
        }
      }

      // 6. Reset cooldown / clear history (PIN protected)
      if (path === '/api/history/clear' && method === 'POST') {
        if (!verifyPin(request, env)) {
          return jsonResponse({ ok: false, error: '需要正确的管理口令才能重置记录' }, 401);
        }
        await env.DB.batch([
          env.DB.prepare('DELETE FROM meal_history'),
          env.DB.prepare('UPDATE restaurants SET last_eaten_at = NULL'),
        ]);
        return jsonResponse({ ok: true });
      }

      return jsonResponse({ ok: false, error: '未知的 API 路径' }, 404);
    } catch (error) {
      console.error('API Error:', error);
      return jsonResponse(
        { ok: false, error: error instanceof Error ? error.message : '服务器内部错误' },
        500
      );
    }
  },
};
