// Cloudflare Worker Handler for Animem.uz
// High-performance edge server with native D1 database, edge JWT auth, media storage, and S3 video streamer proxy

const ACCOUNT_ID = "778abe99df133217050e4af575708af8";
const DATABASE_ID = "11e1d448-17a4-4156-ba89-434fa4e6bb1e";
const STREAM_ORIGIN = "https://s3.animem.uz";
const JWT_SECRET = "animem-super-jwt-secret-key-2026-secure";

function toSlug(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/o['’`‘ʻʼ]/g, "o")
    .replace(/g['’`‘ʻʼ]/g, "g")
    .replace(/[^a-z0-9\u0400-\u04FF]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Range, X-Requested-With",
    ...extra,
  };
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders({
      "Content-Type": "application/json",
      ...extraHeaders,
    }),
  });
}

async function parseJsonBody(request) {
  try {
    const text = await request.text();
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

// ============================================================================
// CLOUDFLARE D1 DATABASE EXECUTION ENGINE
// ============================================================================
async function executeD1(env, sql, params = []) {
  // 1. Native D1 binding (fastest, zero-network edge binding)
  const d1 = env.DB || env.animem;
  if (d1 && typeof d1.prepare === "function") {
    try {
      const stmt = d1.prepare(sql).bind(...params);
      const res = await stmt.run();
      return { results: res.results || [], meta: res.meta || {} };
    } catch (e) {
      console.warn("D1 native run failed, trying REST fallback:", e.message);
    }
  }

  // 2. Direct Cloudflare D1 REST API fallback
  const token = env.CLOUDFLARE_D1_TOKEN || "";
  if (!token) return { results: [], meta: {} };

  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID || ACCOUNT_ID}/d1/database/${env.CLOUDFLARE_DATABASE_ID || DATABASE_ID}/query`;

  const cleanSql = sql.replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP");
  const cleanParams = params.map((p) => {
    if (typeof p === "boolean") return p ? 1 : 0;
    if (p instanceof Date) return p.toISOString().slice(0, 19).replace("T", " ");
    return p;
  });

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql: cleanSql, params: cleanParams }),
  });

  const data = await resp.json();
  if (data?.success && data?.result?.[0]) {
    return { results: data.result[0].results || [], meta: data.result[0].meta || {} };
  }
  return { results: [], meta: {} };
}

async function queryD1(env, sql, params = []) {
  const d1 = env.DB || env.animem;
  if (d1 && typeof d1.prepare === "function") {
    try {
      const stmt = d1.prepare(sql).bind(...params);
      const res = await stmt.all();
      return res.results || [];
    } catch (e) {
      console.warn("D1 native all failed, trying REST fallback:", e.message);
    }
  }
  const exec = await executeD1(env, sql, params);
  return exec.results || [];
}

// Auto-initialize required D1 tables if missing
let tablesInitialized = false;
async function ensureTables(env) {
  if (tablesInitialized) return;
  tablesInitialized = true;
  try {
    await executeD1(env, `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        phone TEXT,
        role TEXT DEFAULT 'user',
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await executeD1(env, `
      CREATE TABLE IF NOT EXISTS watch_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        anime_id INTEGER,
        episode_id INTEGER,
        episode_number REAL,
        time REAL,
        duration REAL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, anime_id)
      );
    `);
    await executeD1(env, `
      CREATE TABLE IF NOT EXISTS user_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        anime_id INTEGER,
        status TEXT DEFAULT 'watching',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, anime_id)
      );
    `);
    await executeD1(env, `
      CREATE TABLE IF NOT EXISTS shop_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        image_url TEXT NOT NULL,
        price INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS shop_purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        is_equipped INTEGER DEFAULT 0,
        purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS shop_orders (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        amount_uzs INTEGER NOT NULL,
        tezcheck_bill_id TEXT DEFAULT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        paid_at TIMESTAMP NULL DEFAULT NULL
      );
      CREATE TABLE IF NOT EXISTS media_files (
        id TEXT PRIMARY KEY,
        data TEXT,
        mime_type TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    try {
      await executeD1(env, "ALTER TABLE episodes ADD COLUMN is_filler INTEGER DEFAULT 0;");
      try { await executeD1(env, "ALTER TABLE users ADD COLUMN avatar_frame_url TEXT DEFAULT NULL;"); } catch (e) {}
      try { await executeD1(env, "ALTER TABLE users ADD COLUMN banner_url TEXT DEFAULT NULL;"); } catch (e) {}
      try { await executeD1(env, "ALTER TABLE comments ADD COLUMN manga_id INTEGER DEFAULT NULL;"); } catch (e) {}
    } catch (e) {}
  } catch (e) {
    console.warn("Table ensure notice:", e.message);
  }
}

// ============================================================================
// EDGE JWT AUTHENTICATION & PASSWORD CRYPTO (Web Crypto API)
// ============================================================================
async function signJwt(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const encHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encPayload = btoa(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 30 * 86400 }))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const data = new TextEncoder().encode(`${encHeader}.${encPayload}`);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, data);
  const encSig = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encHeader}.${encPayload}.${encSig}`;
}

async function verifyJwt(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const secrets = [JWT_SECRET, "anime_super_secret_key"];
  for (const secret of secrets) {
    try {
      const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      );
      let b64 = parts[2].replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const sigBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const valid = await crypto.subtle.verify("HMAC", key, sigBytes, data);
      if (!valid) continue;
      let payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (payloadB64.length % 4) payloadB64 += "=";
      const payload = JSON.parse(atob(payloadB64));
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) continue;
      return payload;
    } catch {}
  }
  return null;
}

async function hashPassword(password) {
  const data = new TextEncoder().encode(password + "animem_salt_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyPassword(password, storedHash) {
  if (!storedHash || !password) return false;
  if (storedHash === password) return true;
  const hash = await hashPassword(password);
  if (storedHash === hash) return true;
  // If stored as bcrypt ($2a$ / $2b$): allow password if matches fallback or plain
  return false;
}

async function getAuthUser(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const payload = await verifyJwt(token);
  if (!payload || !payload.id) return null;
  const rows = await queryD1(env, "SELECT id, name, email, role, avatar_url, phone FROM users WHERE id = ?;", [payload.id]);
  return rows[0] || null;
}

// In-memory Telegram auth session tracker
const telegramSessions = new Map();

// ============================================================================
// MAIN CLOUDFLARE WORKER ROUTER
// ============================================================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Range, X-Requested-With",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // 1. VIDEO STREAMING & HLS PROXY TO STANDALONE VPS (Ultra-fast Cloudflare Edge caching)
    if (path.startsWith("/api/tgstream/") || path.startsWith("/api/tghls/")) {
      const streamTarget = `${STREAM_ORIGIN}${path}${url.search}`;
      const streamHeaders = new Headers(request.headers);
      streamHeaders.set("Referer", "https://animem.uz/");
      streamHeaders.set("Origin", "https://animem.uz");

      return fetch(streamTarget, {
        method: request.method,
        headers: streamHeaders,
        cf: {
          cacheEverything: true,
          cacheTtl: path.endsWith(".m3u8") ? 60 : 2592000,
          cacheKey: request.url,
        },
      });
    }

    await ensureTables(env);

    // 2. HEALTH & PING
    if (path === "/api/health" || path === "/health" || path === "/ping") {
      return jsonResponse({ status: "ok", edge: true, d1: true, version: "2.0.0" });
    }

    // 3. AUTHENTICATION & USER ENDPOINTS
    if (path === "/api/auth/login" && method === "POST") {
      const body = await parseJsonBody(request);
      const { email, password } = body;
      if (!email || !password) {
        return jsonResponse({ error: "Email va parolni kiriting!" }, 400);
      }
      const rows = await queryD1(env, "SELECT * FROM users WHERE email = ? LIMIT 1;", [email.toLowerCase().trim()]);
      const user = rows[0];
      if (!user) {
        return jsonResponse({ error: "Email yoki parol xato!" }, 400);
      }
      const isMatch = await verifyPassword(password, user.password);
      if (!isMatch) {
        return jsonResponse({ error: "Email yoki parol xato!" }, 400);
      }
      const userPayload = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || "user",
        avatar_url: user.avatar_url || null,
        phone: user.phone || null,
      };
      const token = await signJwt(userPayload);
      return jsonResponse({ token, user: userPayload });
    }

    if (path === "/api/auth/register" && method === "POST") {
      const body = await parseJsonBody(request);
      const { name, email, password } = body;
      if (!name || !email || !password) {
        return jsonResponse({ error: "Barcha maydonlarni to'ldiring!" }, 400);
      }
      const cleanEmail = email.toLowerCase().trim();
      const existing = await queryD1(env, "SELECT id FROM users WHERE email = ? LIMIT 1;", [cleanEmail]);
      if (existing.length > 0) {
        return jsonResponse({ error: "Ushbu email bilan allaqachon ro'yxatdan o'tilgan!" }, 400);
      }
      const hashedPassword = await hashPassword(password);
      const role = cleanEmail === "mosinjonovjasurbek28@gmail.com" ? "admin" : "user";
      const exec = await executeD1(env, "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?);", [name, cleanEmail, hashedPassword, role]);
      const newId = exec.meta?.last_row_id || Date.now();
      const userPayload = { id: newId, name, email: cleanEmail, role, avatar_url: null };
      const token = await signJwt(userPayload);
      return jsonResponse({ token, user: userPayload }, 201);
    }

    if (path === "/api/auth/google" && method === "POST") {
      const body = await parseJsonBody(request);
      const { email, name, avatar_url } = body;
      if (!email || !name) {
        return jsonResponse({ error: "Kerakli ma'lumotlar yo'q" }, 400);
      }
      const cleanEmail = email.toLowerCase().trim();
      let rows = await queryD1(env, "SELECT * FROM users WHERE email = ? LIMIT 1;", [cleanEmail]);
      let user = rows[0];
      if (!user) {
        const role = cleanEmail === "mosinjonovjasurbek28@gmail.com" ? "admin" : "user";
        const exec = await executeD1(env, "INSERT INTO users (name, email, role, avatar_url) VALUES (?, ?, ?, ?);", [name, cleanEmail, role, avatar_url || null]);
        user = { id: exec.meta?.last_row_id || Date.now(), name, email: cleanEmail, role, avatar_url: avatar_url || null };
      } else if (!user.avatar_url && avatar_url) {
        await executeD1(env, "UPDATE users SET avatar_url = ? WHERE id = ?;", [avatar_url, user.id]);
        user.avatar_url = avatar_url;
      }
      const userPayload = { id: user.id, name: user.name, email: user.email, role: user.role || "user", avatar_url: user.avatar_url };
      const token = await signJwt(userPayload);
      return jsonResponse({ token, user: userPayload });
    }

    if (path === "/api/auth/phone-login" && method === "POST") {
      const body = await parseJsonBody(request);
      const { phone, password } = body;
      if (!phone || !password) {
        return jsonResponse({ error: "Telefon va parolni kiriting!" }, 400);
      }
      const cleanPhone = phone.replace(/[^0-9+]/g, "");
      const rows = await queryD1(env, "SELECT * FROM users WHERE phone = ? LIMIT 1;", [cleanPhone]);
      const user = rows[0];
      if (!user) {
        return jsonResponse({ error: "Ushbu telefon raqamli foydalanuvchi topilmadi!" }, 400);
      }
      const isMatch = await verifyPassword(password, user.password);
      if (!isMatch) {
        return jsonResponse({ error: "Parol noto'g'ri!" }, 400);
      }
      const userPayload = { id: user.id, name: user.name, email: user.email, role: user.role || "user", avatar_url: user.avatar_url, phone: user.phone };
      const token = await signJwt(userPayload);
      return jsonResponse({ token, user: userPayload });
    }

    if ((path === "/api/auth/me" || path === "/api/user/me") && method === "GET") {
      const user = await getAuthUser(request, env);
      if (!user) {
        return jsonResponse({ error: "Avtorizatsiya qilinmagan" }, 401);
      }
      return jsonResponse({ user });
    }

    if (path === "/api/user/ping" && method === "POST") {
      return jsonResponse({ status: "ok" });
    }

    // Telegram session authentication endpoints
    if (path === "/api/auth/telegram/session" && method === "GET") {
      const sessionId = "tg_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 8);
      telegramSessions.set(sessionId, { status: "pending", createdAt: Date.now() });
      return jsonResponse({ sessionId });
    }

    const tgStatusMatch = path.match(/^\/api\/auth\/telegram\/status\/([^\/]+)$/);
    if (tgStatusMatch && method === "GET") {
      const sid = tgStatusMatch[1];
      const sess = telegramSessions.get(sid);
      if (!sess) return jsonResponse({ status: "expired" });
      return jsonResponse(sess);
    }

    // 4. WATCH PROGRESS & USER LISTS
    if (path === "/api/user/watch-progress") {
      const user = await getAuthUser(request, env);
      if (method === "GET") {
        if (!user) return jsonResponse([]);
        const rows = await queryD1(env, "SELECT * FROM watch_progress WHERE user_id = ? ORDER BY updated_at DESC;", [user.id]);
        return jsonResponse(rows);
      }
      if (method === "POST") {
        if (!user) return jsonResponse({ success: false }, 401);
        const body = await parseJsonBody(request);
        const { anime_id, episode_id, episode_number, time, duration } = body;
        await executeD1(
          env,
          `INSERT INTO watch_progress (user_id, anime_id, episode_id, episode_number, time, duration, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(user_id, anime_id) DO UPDATE SET
             episode_id = excluded.episode_id,
             episode_number = excluded.episode_number,
             time = excluded.time,
             duration = excluded.duration,
             updated_at = CURRENT_TIMESTAMP;`,
          [user.id, anime_id, episode_id || null, episode_number || 1, time || 0, duration || 0]
        );
        return jsonResponse({ success: true });
      }
    }

    if (path === "/api/user/my-list" || path === "/api/user/favorites") {
      const user = await getAuthUser(request, env);
      if (method === "GET") {
        if (!user) return jsonResponse([]);
        const rows = await queryD1(
          env,
          `SELECT l.*, a.title, a.poster, a.year, a.type 
           FROM user_lists l 
           JOIN animes a ON l.anime_id = a.id 
           WHERE l.user_id = ? 
           ORDER BY l.id DESC;`,
          [user.id]
        );
        return jsonResponse(rows);
      }
      if (method === "POST") {
        if (!user) return jsonResponse({ success: false }, 401);
        const body = await parseJsonBody(request);
        const { anime_id, status } = body;
        await executeD1(
          env,
          `INSERT INTO user_lists (user_id, anime_id, status) VALUES (?, ?, ?)
           ON CONFLICT(user_id, anime_id) DO UPDATE SET status = excluded.status;`,
          [user.id, anime_id, status || "watching"]
        );
        return jsonResponse({ success: true });
      }
    }

    const deleteFavMatch = path.match(/^\/api\/user\/my-list\/([0-9]+)$/);
    if (deleteFavMatch && method === "DELETE") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ success: false }, 401);
      const animeId = deleteFavMatch[1];
      await executeD1(env, "DELETE FROM user_lists WHERE user_id = ? AND anime_id = ?;", [user.id, animeId]);
      return jsonResponse({ success: true });
    }

    // 5. COMMENTS & RATINGS
    if ((path === "/api/comments" || path.endsWith("/comments")) && method === "POST") {
      const user = await getAuthUser(request, env);
      const body = await parseJsonBody(request);
      const animeMatch = path.match(/^\/api\/animes\/([0-9]+)\/comments$/);
      const animeId = animeMatch ? animeMatch[1] : (body.anime_id || body.animeId);
      const text = body.text || "";
      const userId = user ? user.id : (body.user_id || 0);

      if (!animeId || !text) {
        return jsonResponse({ error: "Fikr matni kiritilmagan" }, 400);
      }

      await executeD1(
        env,
        `INSERT INTO comments (anime_id, user_id, text, likes, dislikes, liked_users, disliked_users, replies, created_at)
         VALUES (?, ?, ?, 0, 0, '[]', '[]', '[]', CURRENT_TIMESTAMP);`,
        [animeId, userId, text]
      );
      return jsonResponse({ success: true }, 201);
    }

    const commentLikeMatch = path.match(/^\/api\/comments\/([0-9]+)\/like$/);
    if (commentLikeMatch && method === "POST") {
      const commentId = commentLikeMatch[1];
      const body = await parseJsonBody(request);
      const { user_id, action } = body;
      const rows = await queryD1(env, "SELECT * FROM comments WHERE id = ?;", [commentId]);
      if (rows.length > 0) {
        const c = rows[0];
        let liked = [];
        try { liked = JSON.parse(c.liked_users || "[]"); } catch {}
        if (action === "like") {
          if (!liked.includes(user_id)) liked.push(user_id);
          else liked = liked.filter((u) => u !== user_id);
        }
        await executeD1(env, "UPDATE comments SET likes = ?, liked_users = ? WHERE id = ?;", [liked.length, JSON.stringify(liked), commentId]);
      }
      return jsonResponse({ success: true });
    }

    const commentDeleteMatch = path.match(/^\/api\/comments\/([0-9]+)$/);
    if (commentDeleteMatch && method === "DELETE") {
      const commentId = commentDeleteMatch[1];
      await executeD1(env, "DELETE FROM comments WHERE id = ?;", [commentId]);
      return jsonResponse({ success: true });
    }

    if ((path.endsWith("/rate") || path === "/api/ratings") && method === "POST") {
      const user = await getAuthUser(request, env);
      const body = await parseJsonBody(request);
      const rateMatch = path.match(/^\/api\/animes\/([0-9]+)\/rate$/);
      const animeId = rateMatch ? rateMatch[1] : body.anime_id;
      const rating = Number(body.rating || 0);
      const userId = user ? user.id : (body.user_id || 1);

      if (animeId && rating >= 1 && rating <= 10) {
        await executeD1(
          env,
          `INSERT INTO ratings (anime_id, user_id, rating, created_at)
           VALUES (?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(anime_id, user_id) DO UPDATE SET rating = excluded.rating;`,
          [animeId, userId, rating]
        );
      }
      return jsonResponse({ success: true });
    }

    // 6. MEDIA UPLOAD (Stores directly in D1 media_files)
    if ((path === "/api/media/upload" || path === "/api/upload") && method === "POST") {
      try {
        const contentType = request.headers.get("content-type") || "";
        let data = "";
        let mimeType = "image/jpeg";

        if (contentType.includes("application/json")) {
          const body = await parseJsonBody(request);
          data = body.data || body.file || "";
          mimeType = body.mime_type || "image/jpeg";
        } else if (contentType.includes("multipart/form-data")) {
          const formData = await request.formData();
          const file = formData.get("file") || formData.get("image");
          if (file && typeof file.arrayBuffer === "function") {
            const buf = await file.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let binary = "";
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            data = btoa(binary);
            mimeType = file.type || "image/jpeg";
          }
        }

        if (!data) {
          return jsonResponse({ error: "Fayl yuborilmadi" }, 400);
        }

        const id = "img_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 7);
        await executeD1(env, "INSERT INTO media_files (id, data, mime_type, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP);", [id, data, mimeType]);

        return jsonResponse({ success: true, url: `/api/media/${id}`, id });
      } catch (e) {
        return jsonResponse({ error: "Yuklashda xatolik yuz berdi: " + e.message }, 500);
      }
    }

    // 7. ADMIN ENDPOINTS (Animes, Episodes, Users)
    if (path === "/api/admin/users" && method === "GET") {
      const rows = await queryD1(env, "SELECT id, name, email, role, phone, created_at FROM users ORDER BY id DESC LIMIT 100;");
      return jsonResponse(rows);
    }

    const userRoleMatch = path.match(/^\/api\/admin\/users\/([0-9]+)\/role$/);
    if (userRoleMatch && method === "PUT") {
      const userId = userRoleMatch[1];
      const body = await parseJsonBody(request);
      await executeD1(env, "UPDATE users SET role = ? WHERE id = ?;", [body.role || "user", userId]);
      return jsonResponse({ success: true });
    }

    const userDeleteMatch = path.match(/^\/api\/admin\/users\/([0-9]+)$/);
    if (userDeleteMatch && method === "DELETE") {
      const userId = userDeleteMatch[1];
      await executeD1(env, "DELETE FROM users WHERE id = ?;", [userId]);
      return jsonResponse({ success: true });
    }

    if ((path === "/api/admin/animes" || path === "/api/animes") && method === "POST") {
      const body = await parseJsonBody(request);
      const exec = await executeD1(
        env,
        `INSERT INTO animes (title, description, poster, banner, status, year, genres, type, age_rating)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [body.title || "", body.description || "", body.poster || "", body.banner || "", body.status || "Chiqmoqda", body.year || 2026, body.genres || "[]", body.type || "Anime", body.age_rating || "16+"]
      );
      return jsonResponse({ success: true, id: exec.meta?.last_row_id }, 201);
    }

    const animePutMatch = path.match(/^\/api\/(?:admin\/)?animes\/([0-9]+)$/);
    if (animePutMatch && method === "PUT") {
      const id = animePutMatch[1];
      const body = await parseJsonBody(request);
      await executeD1(
        env,
        `UPDATE animes SET title = ?, description = ?, poster = ?, banner = ?, status = ?, year = ?, genres = ?, type = ?, age_rating = ?
         WHERE id = ?;`,
        [body.title, body.description, body.poster, body.banner, body.status, body.year, body.genres, body.type, body.age_rating, id]
      );
      return jsonResponse({ success: true });
    }

    if (animePutMatch && method === "DELETE") {
      const id = animePutMatch[1];
      await executeD1(env, "DELETE FROM animes WHERE id = ?;", [id]);
      await executeD1(env, "DELETE FROM episodes WHERE anime_id = ?;", [id]);
      return jsonResponse({ success: true });
    }

    // Bulk Episode Upsert: /api/animes/:id/episodes/bulk
    const animeEpBulkMatch = path.match(/^\/api\/animes\/([0-9]+)\/episodes\/bulk$/);
    if (animeEpBulkMatch && method === "POST") {
      const animeId = animeEpBulkMatch[1];
      const body = await parseJsonBody(request);
      const episodes = Array.isArray(body.episodes) ? body.episodes : [];
      for (const ep of episodes) {
        const epNum = Number(ep.episode_number);
        if (isNaN(epNum)) continue;
        const videoUrl = ep.video_url || "";
        const isFiller = ep.is_filler ? 1 : 0;
        const existing = await queryD1(env, "SELECT id FROM episodes WHERE anime_id = ? AND episode_number = ?;", [animeId, epNum]);
        if (existing.length > 0) {
          await executeD1(env, "UPDATE episodes SET video_url = ?, is_filler = ? WHERE anime_id = ? AND episode_number = ?;", [videoUrl, isFiller, animeId, epNum]);
        } else {
          await executeD1(env, "INSERT INTO episodes (anime_id, episode_number, video_url, is_filler) VALUES (?, ?, ?, ?);", [animeId, epNum, videoUrl, isFiller]);
        }
      }
      return jsonResponse({ success: true, message: "Barcha qismlar muvaffaqiyatli saqlandi", count: episodes.length });
    }

    // Single Episode Upsert: /api/animes/:id/episodes
    const animeEpPostMatch = path.match(/^\/api\/animes\/([0-9]+)\/episodes$/);
    if (animeEpPostMatch && method === "POST") {
      const animeId = animeEpPostMatch[1];
      const body = await parseJsonBody(request);
      const epNum = Number(body.episode_number || 1);
      const videoUrl = body.video_url || "";
      const isFiller = body.is_filler ? 1 : 0;

      const existing = await queryD1(env, "SELECT id FROM episodes WHERE anime_id = ? AND episode_number = ?;", [animeId, epNum]);
      if (existing.length > 0) {
        await executeD1(env, "UPDATE episodes SET video_url = ?, is_filler = ? WHERE anime_id = ? AND episode_number = ?;", [videoUrl, isFiller, animeId, epNum]);
        return jsonResponse({ success: true, message: "Qism yangilandi" });
      } else {
        const exec = await executeD1(env, "INSERT INTO episodes (anime_id, episode_number, video_url, is_filler) VALUES (?, ?, ?, ?);", [animeId, epNum, videoUrl, isFiller]);
        return jsonResponse({ success: true, message: "Qism saqlandi", id: exec.meta?.last_row_id }, 201);
      }
    }

    // Delete Episode: /api/animes/:id/episodes/:episodeNumber
    const animeEpDeleteMatch = path.match(/^\/api\/animes\/([0-9]+)\/episodes\/([0-9]+)$/);
    if (animeEpDeleteMatch && method === "DELETE") {
      const animeId = animeEpDeleteMatch[1];
      const epNum = animeEpDeleteMatch[2];
      await executeD1(env, "DELETE FROM episodes WHERE anime_id = ? AND episode_number = ?;", [animeId, epNum]);
      return jsonResponse({ success: true });
    }

    if ((path === "/api/admin/episodes" || path === "/api/episodes") && method === "POST") {
      const body = await parseJsonBody(request);
      const exec = await executeD1(
        env,
        `INSERT INTO episodes (anime_id, episode_number, title, video_url, telegram_url, duration, is_filler)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [body.anime_id, body.episode_number || 1, body.title || "", body.video_url || "", body.telegram_url || "", body.duration || 0, body.is_filler ? 1 : 0]
      );
      return jsonResponse({ success: true, id: exec.meta?.last_row_id }, 201);
    }

    const episodeMatch = path.match(/^\/api\/(?:admin\/)?episodes\/([0-9]+)$/);
    if (episodeMatch && method === "PUT") {
      const id = episodeMatch[1];
      const body = await parseJsonBody(request);
      await executeD1(
        env,
        `UPDATE episodes SET episode_number = ?, title = ?, video_url = ?, telegram_url = ?, duration = ?, is_filler = ? WHERE id = ?;`,
        [body.episode_number, body.title, body.video_url, body.telegram_url, body.duration, body.is_filler ? 1 : 0, id]
      );
      return jsonResponse({ success: true });
    }

    if (episodeMatch && method === "DELETE") {
      const id = episodeMatch[1];
      await executeD1(env, "DELETE FROM episodes WHERE id = ?;", [id]);
      return jsonResponse({ success: true });
    }

    // 8. CHAT, COMMENTS, SHOP & PUSH NOTIFICATIONS
    if (path === "/api/chat/messages" && method === "POST") {
      const user = await getAuthUser(request, env);
      const body = await parseJsonBody(request);
      const msgContent = body.content || body.text;
      if (!msgContent || !String(msgContent).trim()) {
        return jsonResponse({ error: "Xabar matni bo'sh bo'lishi mumkin emas" }, 400);
      }
      const res = await executeD1(
        env,
        `INSERT INTO messages (user_id, user_name, content, reply_to_id, reply_to_name, reply_to_content, created_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);`,
        [
          user ? user.id : (body.user_id || 0),
          user ? user.name : (body.user_name || "Mehmon"),
          String(msgContent).trim(),
          body.reply_to_id || null,
          body.reply_to_name || null,
          body.reply_to_content || null
        ]
      );
      return jsonResponse({ success: true, insertId: res.meta?.last_row_id });
    }

    const chatMsgMatch = path.match(/^\/api\/chat\/messages\/([0-9]+)$/);
    if (chatMsgMatch && method === "DELETE") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const msgId = chatMsgMatch[1];
      if (user.role === "admin") {
        await executeD1(env, "DELETE FROM messages WHERE id = ?;", [msgId]);
      } else {
        await executeD1(env, "DELETE FROM messages WHERE id = ? AND user_id = ?;", [msgId, user.id]);
      }
      return jsonResponse({ success: true });
    }

    // Add Comment: POST /api/animes/:id/comments or POST /api/dramas/:id/comments or POST /api/mangas/:id/comments
    const addCommentMatch = path.match(/^\/api\/(animes|dramas|mangas)\/([0-9]+)\/comments$/);
    if (addCommentMatch && method === "POST") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Izoh qoldirish uchun tizimga kiring" }, 401);
      const type = addCommentMatch[1];
      const targetId = parseInt(addCommentMatch[2]);
      const body = await parseJsonBody(request);
      if (!body.content || !String(body.content).trim()) {
        return jsonResponse({ error: "Izoh bo'sh bo'lishi mumkin emas" }, 400);
      }
      const animeId = type === "animes" ? targetId : null;
      const dramaId = type === "dramas" ? targetId : null;
      const mangaId = type === "mangas" ? targetId : null;
      await executeD1(
        env,
        `INSERT INTO comments (anime_id, drama_id, manga_id, user_id, content, likes, dislikes, liked_users, disliked_users, replies, created_at)
         VALUES (?, ?, ?, ?, ?, 0, 0, '[]', '[]', '[]', CURRENT_TIMESTAMP);`,
        [animeId, dramaId, mangaId, user.id, String(body.content).trim()]
      );
      return jsonResponse({ success: true });
    }

    // Delete Comment: DELETE /api/comments/:id
    const delCommentMatch = path.match(/^\/api\/comments\/([0-9]+)$/);
    if (delCommentMatch && method === "DELETE") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const commentId = delCommentMatch[1];
      if (user.role === "admin") {
        await executeD1(env, "DELETE FROM comments WHERE id = ?;", [commentId]);
      } else {
        await executeD1(env, "DELETE FROM comments WHERE id = ? AND user_id = ?;", [commentId, user.id]);
      }
      return jsonResponse({ success: true });
    }

    // Like Comment: POST /api/comments/:id/like
    const likeCommentMatch = path.match(/^\/api\/comments\/([0-9]+)\/like$/);
    if (likeCommentMatch && method === "POST") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const commentId = likeCommentMatch[1];
      const rows = await queryD1(env, "SELECT * FROM comments WHERE id = ?;", [commentId]);
      if (rows.length > 0) {
        let likedUsers = [];
        try { likedUsers = JSON.parse(rows[0].liked_users || "[]"); } catch {}
        const idx = likedUsers.indexOf(user.id);
        if (idx === -1) likedUsers.push(user.id); else likedUsers.splice(idx, 1);
        await executeD1(env, "UPDATE comments SET liked_users = ?, likes = ? WHERE id = ?;", [JSON.stringify(likedUsers), likedUsers.length, commentId]);
      }
      return jsonResponse({ success: true });
    }

    // Dislike Comment: POST /api/comments/:id/dislike
    const dislikeCommentMatch = path.match(/^\/api\/comments\/([0-9]+)\/dislike$/);
    if (dislikeCommentMatch && method === "POST") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const commentId = dislikeCommentMatch[1];
      const rows = await queryD1(env, "SELECT * FROM comments WHERE id = ?;", [commentId]);
      if (rows.length > 0) {
        let dislikedUsers = [];
        try { dislikedUsers = JSON.parse(rows[0].disliked_users || "[]"); } catch {}
        const idx = dislikedUsers.indexOf(user.id);
        if (idx === -1) dislikedUsers.push(user.id); else dislikedUsers.splice(idx, 1);
        await executeD1(env, "UPDATE comments SET disliked_users = ?, dislikes = ? WHERE id = ?;", [JSON.stringify(dislikedUsers), dislikedUsers.length, commentId]);
      }
      return jsonResponse({ success: true });
    }

    // Reply to Comment: POST /api/comments/:id/reply
    const replyCommentMatch = path.match(/^\/api\/comments\/([0-9]+)\/reply$/);
    if (replyCommentMatch && method === "POST") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const commentId = replyCommentMatch[1];
      const body = await parseJsonBody(request);
      if (!body.content || !String(body.content).trim()) return jsonResponse({ error: "Javob bo'sh" }, 400);
      const rows = await queryD1(env, "SELECT * FROM comments WHERE id = ?;", [commentId]);
      if (rows.length > 0) {
        let replies = [];
        try { replies = JSON.parse(rows[0].replies || "[]"); } catch {}
        replies.push({
          id: Date.now(),
          user_id: user.id,
          user_name: user.name,
          user_avatar: user.avatar_url || null,
          user_avatar_frame: user.avatar_frame_url || null,
          content: String(body.content).trim(),
          created_at: new Date().toISOString()
        });
        await executeD1(env, "UPDATE comments SET replies = ? WHERE id = ?;", [JSON.stringify(replies), commentId]);
      }
      return jsonResponse({ success: true });
    }

    // 8.1 SHOP ENDPOINTS
    if (path === "/api/shop/items" && method === "GET") {
      const category = url.searchParams.get("category");
      let sql = "SELECT * FROM shop_items WHERE is_active = 1";
      const params = [];
      if (category && category !== "all") {
        sql += " AND category = ?";
        params.push(category);
      }
      sql += " ORDER BY id DESC;";
      const rows = await queryD1(env, sql, params);
      return jsonResponse(rows);
    }

    if (path === "/api/shop/my-inventory" && method === "GET") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const rows = await queryD1(
        env,
        `SELECT sp.id, sp.user_id, sp.item_id, sp.is_equipped, sp.purchased_at,
                si.title, si.category, si.image_url, si.price
         FROM shop_purchases sp
         JOIN shop_items si ON sp.item_id = si.id
         WHERE sp.user_id = ?
         ORDER BY sp.purchased_at DESC;`,
        [user.id]
      );
      return jsonResponse(rows);
    }

    if (path === "/api/shop/equip" && method === "POST") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const body = await parseJsonBody(request);
      const { purchase_id, equip } = body;
      const purchases = await queryD1(
        env,
        `SELECT sp.*, si.category, si.image_url
         FROM shop_purchases sp
         JOIN shop_items si ON sp.item_id = si.id
         WHERE sp.id = ? AND sp.user_id = ?;`,
        [purchase_id, user.id]
      );
      if (purchases.length === 0) return jsonResponse({ error: "Mahsulot topilmadi" }, 404);
      const purchase = purchases[0];

      if (equip) {
        const prev = await queryD1(
          env,
          `SELECT sp.id FROM shop_purchases sp
           JOIN shop_items si ON sp.item_id = si.id
           WHERE sp.user_id = ? AND si.category = ? AND sp.is_equipped = 1;`,
          [user.id, purchase.category]
        );
        for (const p of prev) {
          await executeD1(env, "UPDATE shop_purchases SET is_equipped = 0 WHERE id = ?;", [p.id]);
        }
        await executeD1(env, "UPDATE shop_purchases SET is_equipped = 1 WHERE id = ?;", [purchase.id]);
        if (purchase.category === "frame") {
          await executeD1(env, "UPDATE users SET avatar_frame_url = ? WHERE id = ?;", [purchase.image_url, user.id]);
        } else if (purchase.category === "avatar") {
          await executeD1(env, "UPDATE users SET avatar_url = ? WHERE id = ?;", [purchase.image_url, user.id]);
        } else if (purchase.category === "banner") {
          await executeD1(env, "UPDATE users SET banner_url = ? WHERE id = ?;", [purchase.image_url, user.id]);
        }
      } else {
        await executeD1(env, "UPDATE shop_purchases SET is_equipped = 0 WHERE id = ?;", [purchase.id]);
        if (purchase.category === "frame") {
          await executeD1(env, "UPDATE users SET avatar_frame_url = NULL WHERE id = ?;", [user.id]);
        } else if (purchase.category === "banner") {
          await executeD1(env, "UPDATE users SET banner_url = NULL WHERE id = ?;", [user.id]);
        }
      }
      return jsonResponse({ success: true, is_equipped: !!equip });
    }

    if (path === "/api/shop/checkout" && method === "POST") {
      const user = await getAuthUser(request, env);
      if (!user) return jsonResponse({ error: "Avtorizatsiyadan o'ting" }, 401);
      const body = await parseJsonBody(request);
      const { item_id, is_test } = body;
      const items = await queryD1(env, "SELECT * FROM shop_items WHERE id = ? AND is_active = 1;", [item_id]);
      if (items.length === 0) return jsonResponse({ error: "Mahsulot topilmadi" }, 404);
      const item = items[0];

      const existing = await queryD1(env, "SELECT id FROM shop_purchases WHERE user_id = ? AND item_id = ?;", [user.id, item_id]);
      if (existing.length > 0) return jsonResponse({ error: "Ushbu mahsulot allaqachon inventaringizda mavjud!" }, 400);

      const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const amountUzs = item.price;

      if (is_test || amountUzs === 0 || user.role === "admin") {
        await executeD1(
          env,
          "INSERT INTO shop_orders (id, user_id, item_id, amount_uzs, status, paid_at) VALUES (?, ?, ?, ?, 'paid', CURRENT_TIMESTAMP);",
          [orderId, user.id, item_id, amountUzs]
        );
        await executeD1(env, "INSERT INTO shop_purchases (user_id, item_id) VALUES (?, ?);", [user.id, item_id]);
        return jsonResponse({
          success: true,
          order_id: orderId,
          is_test: true,
          message: "Xarid muvaffaqiyatli amalga oshirildi va profilingizga qo'shildi!",
          item
        });
      }

      await executeD1(
        env,
        "INSERT INTO shop_orders (id, user_id, item_id, amount_uzs, status) VALUES (?, ?, ?, ?, 'pending');",
        [orderId, user.id, item_id, amountUzs]
      );

      const tezShopId = env.TEZCHECK_SHOP_ID || "124";
      const tezApiKey = env.TEZCHECK_API_KEY || "ee77747df48bae33ee5bee58047c3ab093a84a76";
      const returnUrl = `https://animem.uz/shop?order_id=${orderId}`;

      try {
        const tezRes = await fetch("https://api.tezcheck.uz/api/v1/bills", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${tezApiKey}`
          },
          body: JSON.stringify({
            shop_id: tezShopId,
            order_id: orderId,
            amount: amountUzs,
            description: `Animem.uz do'koni: ${item.title}`,
            return_url: returnUrl
          })
        });
        const tezData = await tezRes.json();
        const payUrl = tezData?.data?.pay_url || tezData?.pay_url;
        if (payUrl) {
          return jsonResponse({ success: true, order_id: orderId, pay_url: payUrl });
        }
      } catch (e) {
        console.warn("TezCheck fetch error:", e.message);
      }

      await executeD1(
        env,
        "UPDATE shop_orders SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?;",
        [orderId]
      );
      await executeD1(env, "INSERT INTO shop_purchases (user_id, item_id) VALUES (?, ?);", [user.id, item_id]);
      return jsonResponse({
        success: true,
        order_id: orderId,
        message: "Xarid muvaffaqiyatli amalga oshirildi!",
        item
      });
    }

    const verifyMatch = path.match(/^\/api\/shop\/verify-order\/([a-zA-Z0-9_\-]+)$/);
    if (verifyMatch && method === "GET") {
      const orderId = verifyMatch[1];
      const orders = await queryD1(env, "SELECT * FROM shop_orders WHERE id = ?;", [orderId]);
      if (orders.length === 0) return jsonResponse({ error: "Buyurtma topilmadi" }, 404);
      const order = orders[0];
      if (order.status === "paid") {
        return jsonResponse({ status: "paid", message: "To'lov qabul qilingan!" });
      }
      return jsonResponse({ status: order.status });
    }

    // ADMIN SHOP ENDPOINTS
    if (path === "/api/admin/shop/items" && method === "GET") {
      const rows = await queryD1(env, "SELECT * FROM shop_items ORDER BY id DESC;");
      return jsonResponse(rows);
    }

    if (path === "/api/admin/shop/orders" && method === "GET") {
      const rows = await queryD1(
        env,
        `SELECT so.*, u.name as user_name, u.email as user_email, si.title as item_title, si.category as item_category
         FROM shop_orders so
         LEFT JOIN users u ON so.user_id = u.id
         LEFT JOIN shop_items si ON so.item_id = si.id
         ORDER BY so.created_at DESC LIMIT 100;`
      );
      return jsonResponse(rows);
    }

    if (path === "/api/admin/shop/settings") {
      if (method === "GET") {
        return jsonResponse({ shop_id: env.TEZCHECK_SHOP_ID || "124", has_api_key: true });
      }
      return jsonResponse({ success: true });
    }

    if (path === "/api/admin/shop/claim-all" && method === "POST") {
      const user = await getAuthUser(request, env);
      if (!user || user.role !== "admin") return jsonResponse({ error: "Faqat admin uchun" }, 403);
      const allItems = await queryD1(env, "SELECT id FROM shop_items WHERE is_active = 1;");
      let count = 0;
      for (const it of allItems) {
        const exist = await queryD1(env, "SELECT id FROM shop_purchases WHERE user_id = ? AND item_id = ?;", [user.id, it.id]);
        if (exist.length === 0) {
          await executeD1(env, "INSERT INTO shop_purchases (user_id, item_id) VALUES (?, ?);", [user.id, it.id]);
          count++;
        }
      }
      return jsonResponse({ success: true, count, message: `${count} ta mahsulot inventaringizga bepul qo'shildi!` });
    }

    if (path === "/api/notifications" && method === "POST") {
      const body = await parseJsonBody(request);
      await executeD1(
        env,
        `INSERT INTO notifications (title, message, type, link, created_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP);`,
        [body.title || "", body.message || "", body.type || "system", body.link || ""]
      );
      return jsonResponse({ success: true });
    }

    if (path === "/api/push/vapid-public-key" && method === "GET") {
      return jsonResponse({ publicKey: "BNo_Gg_l4U1Gj1c-E7B68Y52p7dO64lXvC4L91x5NlB1qGgJ7fK1lZlU9sX4_y9zL2pX2s9k-M6Z3q1j5a4g6gE" });
    }

    if (path === "/api/push/subscribe" && method === "POST") {
      return jsonResponse({ success: true });
    }

    // 9. READ-ONLY DATA ENDPOINTS SERVED DIRECTLY FROM D1 (GET requests)
    if (method === "GET" && path.startsWith("/api/")) {
      const corsHeadersObj = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=15, stale-while-revalidate=60",
      };

      try {
        // All Animes: /api/animes
        if (path === "/api/animes") {
          const rows = await queryD1(env, "SELECT * FROM animes ORDER BY id DESC;");
          return new Response(JSON.stringify(rows), { headers: corsHeadersObj });
        }

        // Anime by slug: /api/animes/by-slug/:slug
        const slugMatch = path.match(/^\/api\/animes\/by-slug\/([^\/]+)$/);
        if (slugMatch) {
          const slug = decodeURIComponent(slugMatch[1]);
          if (/^\d+$/.test(slug)) {
            const rows = await queryD1(env, "SELECT * FROM animes WHERE id = ?;", [slug]);
            if (rows.length > 0) return new Response(JSON.stringify(rows[0]), { headers: corsHeadersObj });
          }
          const rows = await queryD1(env, "SELECT * FROM animes;");
          const anime = rows.find((r) => toSlug(r.title) === slug || String(r.id) === slug);
          if (anime) {
            return new Response(JSON.stringify(anime), { headers: corsHeadersObj });
          }
          return new Response(JSON.stringify({ error: "Anime topilmadi" }), { status: 404, headers: corsHeadersObj });
        }

        // Single Anime: /api/animes/:id
        const animeMatch = path.match(/^\/api\/animes\/([0-9]+)$/);
        if (animeMatch) {
          const id = animeMatch[1];
          const rows = await queryD1(env, "SELECT * FROM animes WHERE id = ?;", [id]);
          if (rows.length > 0) {
            return new Response(JSON.stringify(rows[0]), { headers: corsHeadersObj });
          }
          return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeadersObj });
        }

        // Anime episodes: /api/animes/:id/episodes
        const epMatch = path.match(/^\/api\/animes\/([0-9]+)\/episodes$/);
        if (epMatch) {
          const animeId = epMatch[1];
          const rows = await queryD1(env, "SELECT * FROM episodes WHERE anime_id = ? ORDER BY episode_number ASC;", [animeId]);
          return new Response(JSON.stringify(rows), { headers: corsHeadersObj });
        }

        // Ratings summary: /api/animes/:id/ratings-summary
        const ratingMatch = path.match(/^\/api\/animes\/([0-9]+)\/ratings-summary$/);
        if (ratingMatch) {
          const animeId = ratingMatch[1];
          const rows = await queryD1(env, "SELECT AVG(rating) as avg, COUNT(*) as count FROM ratings WHERE anime_id = ?;", [animeId]);
          return new Response(JSON.stringify(rows[0] || { avg: 0, count: 0 }), { headers: corsHeadersObj });
        }

        // User rating: /api/animes/:id/rating
        const userRatingMatch = path.match(/^\/api\/animes\/([0-9]+)\/rating$/);
        if (userRatingMatch) {
          const user = await getAuthUser(request, env);
          if (user) {
            const animeId = userRatingMatch[1];
            const rows = await queryD1(env, "SELECT rating FROM ratings WHERE anime_id = ? AND user_id = ?;", [animeId, user.id]);
            return new Response(JSON.stringify(rows[0] || { rating: 0 }), { headers: corsHeadersObj });
          }
          return new Response(JSON.stringify({ rating: 0 }), { headers: corsHeadersObj });
        }

        // Comments: /api/animes/:id/comments or /api/comments/:id
        const commentMatch = path.match(/^\/api\/(?:animes|comments)\/([0-9]+)(?:\/comments)?$/);
        if (commentMatch) {
          const animeId = commentMatch[1];
          const rows = await queryD1(
            env,
            `SELECT c.*, 
                    COALESCE(u.name, 'Foydalanuvchi') AS user_name, 
                    u.avatar_url AS user_avatar, 
                    u.avatar_frame_url AS user_avatar_frame, 
                    u.avatar_frame_url AS avatar_frame_url 
             FROM comments c 
             LEFT JOIN users u ON (c.user_id = u.id AND c.user_id > 0) 
             WHERE c.anime_id = ? 
             ORDER BY c.id DESC LIMIT 100;`,
            [animeId]
          );
          const parsed = rows.map((r) => {
            let liked_users = [];
            let disliked_users = [];
            let replies = [];
            try { liked_users = JSON.parse(r.liked_users || "[]"); } catch {}
            try { disliked_users = JSON.parse(r.disliked_users || "[]"); } catch {}
            try { replies = JSON.parse(r.replies || "[]"); } catch {}
            return { ...r, liked_users, disliked_users, replies };
          });
          return new Response(JSON.stringify(parsed), { headers: corsHeadersObj });
        }

        // Recent comments: /api/comments/recent
        if (path === "/api/comments/recent") {
          const rows = await queryD1(
            env,
            `SELECT c.*, 
                    COALESCE(u.name, 'Foydalanuvchi') AS user_name, 
                    u.avatar_url AS user_avatar, 
                    u.avatar_frame_url AS user_avatar_frame, 
                    u.avatar_frame_url AS avatar_frame_url, 
                    a.title AS anime_title 
             FROM comments c 
             LEFT JOIN users u ON (c.user_id = u.id AND c.user_id > 0) 
             LEFT JOIN animes a ON c.anime_id = a.id 
             ORDER BY c.id DESC LIMIT 20;`
          );
          const parsed = rows.map((r) => {
            let liked_users = [];
            let disliked_users = [];
            let replies = [];
            try { liked_users = JSON.parse(r.liked_users || "[]"); } catch {}
            try { disliked_users = JSON.parse(r.disliked_users || "[]"); } catch {}
            try { replies = JSON.parse(r.replies || "[]"); } catch {}
            return { ...r, liked_users, disliked_users, replies };
          });
          return new Response(JSON.stringify(parsed), { headers: corsHeadersObj });
        }

        // Dramas: /api/dramas
        if (path === "/api/dramas") {
          const rows = await queryD1(env, "SELECT * FROM dramas ORDER BY id DESC;");
          return new Response(JSON.stringify(rows), { headers: corsHeadersObj });
        }

        // Drama details: /api/dramas/:id
        const dramaMatch = path.match(/^\/api\/dramas\/([0-9]+)$/);
        if (dramaMatch) {
          const id = dramaMatch[1];
          const rows = await queryD1(env, "SELECT * FROM dramas WHERE id = ?;", [id]);
          return new Response(JSON.stringify(rows[0] || {}), { headers: corsHeadersObj });
        }

        // Drama episodes: /api/dramas/episodes/:id or /api/dramas/:id/episodes
        const dramaEpMatch = path.match(/^\/api\/dramas\/(?:episodes\/)?([0-9]+)(?:\/episodes)?$/);
        if (dramaEpMatch) {
          const dramaId = dramaEpMatch[1];
          const rows = await queryD1(env, "SELECT * FROM drama_episodes WHERE drama_id = ? ORDER BY qism ASC;", [dramaId]);
          return new Response(JSON.stringify(rows), { headers: corsHeadersObj });
        }

        // Mangas: /api/mangas
        if (path === "/api/mangas") {
          const rows = await queryD1(env, "SELECT * FROM mangas ORDER BY id DESC;");
          return new Response(JSON.stringify(rows), { headers: corsHeadersObj });
        }

        // Manga details: /api/mangas/:id
        const mangaMatch = path.match(/^\/api\/mangas\/([0-9]+)$/);
        if (mangaMatch) {
          const id = mangaMatch[1];
          const rows = await queryD1(env, "SELECT * FROM mangas WHERE id = ?;", [id]);
          return new Response(JSON.stringify(rows[0] || {}), { headers: corsHeadersObj });
        }

        // Manga chapters: /api/mangas/:id/chapters/:chapter
        const mangaChMatch = path.match(/^\/api\/mangas\/([0-9]+)\/chapters\/([0-9]+)$/);
        if (mangaChMatch) {
          const mangaId = mangaChMatch[1];
          const chNum = mangaChMatch[2];
          const rows = await queryD1(env, "SELECT * FROM manga_chapters WHERE manga_id = ? AND chapter_number = ?;", [mangaId, chNum]);
          return new Response(JSON.stringify(rows[0] || {}), { headers: corsHeadersObj });
        }

        // Reels: /api/reels
        if (path === "/api/reels") {
          const rows = await queryD1(env, "SELECT * FROM reels ORDER BY id DESC;");
          return new Response(JSON.stringify(rows), { headers: corsHeadersObj });
        }

        // Notifications: /api/notifications
        if (path === "/api/notifications") {
          const rows = await queryD1(env, "SELECT * FROM notifications ORDER BY id DESC LIMIT 50;");
          return new Response(JSON.stringify(rows), { headers: corsHeadersObj });
        }

        // Chat messages: /api/chat/messages
        if (path === "/api/chat/messages") {
          const rows = await queryD1(
            env,
            `SELECT m.*, 
                    COALESCE(u.name, m.user_name, 'Foydalanuvchi') AS user_name, 
                    u.avatar_url AS user_avatar, 
                    u.avatar_frame_url AS user_avatar_frame, 
                    u.avatar_frame_url AS avatar_frame_url
             FROM messages m
             LEFT JOIN users u ON (m.user_id = u.id AND m.user_id > 0)
             ORDER BY m.id DESC LIMIT 50;`
          );
          return new Response(JSON.stringify(rows), { headers: corsHeadersObj });
        }

        // Wallpapers & Gifs
        if (path === "/api/wallpapers") {
          const rows = await queryD1(env, "SELECT * FROM wallpapers ORDER BY id DESC;");
          return new Response(JSON.stringify(rows), { headers: corsHeadersObj });
        }
        if (path === "/api/gifs") {
          const rows = await queryD1(env, "SELECT * FROM gifs ORDER BY id DESC;");
          return new Response(JSON.stringify(rows), { headers: corsHeadersObj });
        }

        // Media files: /api/media/:id
        const mediaMatch = path.match(/^\/api\/media\/([a-zA-Z0-9_\-\.]+)$/);
        if (mediaMatch) {
          const mediaId = mediaMatch[1];
          const rows = await queryD1(env, "SELECT data, mime_type FROM media_files WHERE id = ?;", [mediaId]);
          if (rows.length > 0 && rows[0].data) {
            const rawData = rows[0].data;
            let mimeType = rows[0].mime_type || "image/jpeg";
            let b64 = rawData;
            if (rawData.startsWith("data:")) {
              const parts = rawData.split(",");
              mimeType = parts[0].split(":")[1].split(";")[0];
              b64 = parts[1];
            }
            const binaryStr = atob(b64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            return new Response(bytes.buffer, {
              headers: {
                "Content-Type": mimeType,
                "Cache-Control": "public, max-age=86400",
                "Access-Control-Allow-Origin": "*",
              },
            });
          }
        }
      } catch (err) {
        console.warn("D1 query error:", err.message);
        return jsonResponse({ error: "Ma'lumotlar bazasida xatolik", detail: err.message }, 500);
      }
    }

    // 10. STATIC ASSETS & SPA ROUTING VIA CLOUDFLARE ASSETS
    if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};
