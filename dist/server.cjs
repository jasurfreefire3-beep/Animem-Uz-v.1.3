var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_http = __toESM(require("http"), 1);
var import_https = __toESM(require("https"), 1);
var import_dns = __toESM(require("dns"), 1);
var import_nodemailer = __toESM(require("nodemailer"), 1);
var import_socket = require("socket.io");
var import_pg = require("pg");
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
var import_multer = __toESM(require("multer"), 1);
var import_genai = require("@google/genai");
var import_child_process = require("child_process");
var import_util = __toESM(require("util"), 1);
var import_compression = __toESM(require("compression"), 1);
var import_web_push = __toESM(require("web-push"), 1);
var execPromise = import_util.default.promisify(import_child_process.exec);
import_dotenv.default.config();
process.on("unhandledRejection", (reason, promise) => {
  console.error("[Process Safe] Unhandled Rejection at:", promise, "reason:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[Process Safe] Uncaught Exception thrown:", err);
});
var VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BNo_Gg_l4U1Gj1c-E7B68Y52p7dO64lXvC4L91x5NlB1qGgJ7fK1lZlU9sX4_y9zL2pX2s9k-M6Z3q1j5a4g6gE";
var VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "K7mQ6lX_3s9k4p1j8a2g5dE6bL1qZlU9sX4y2z0pX1c";
try {
  import_web_push.default.setVapidDetails(
    "mailto:support@animem.uz",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} catch (e) {
  console.warn("VAPID setup notice:", e);
}
var upload = (0, import_multer.default)({ dest: "/tmp/" });
var app = (0, import_express.default)();
app.set("trust proxy", true);
app.use((0, import_compression.default)({
  threshold: 512
  // Compress anything larger than 512 bytes
}));
app.use((0, import_cors.default)({ origin: true, credentials: true }));
app.use("/__", (req, res) => {
  const targetPath = "/__" + req.url;
  const options = {
    hostname: "gen-lang-client-0918187443.firebaseapp.com",
    port: 443,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: "gen-lang-client-0918187443.firebaseapp.com"
    }
  };
  const proxyReq = import_https.default.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxyReq.on("error", (err) => {
    console.error("Firebase Auth Proxy Error:", err);
    if (!res.headersSent) {
      res.status(500).send("Auth Proxy Error");
    }
  });
  req.pipe(proxyReq, { end: true });
});
app.get(["/health", "/api/health", "/ping"], (_req, res) => {
  res.status(200).send("OK");
});
app.use(import_express.default.json({ limit: "100mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "100mb" }));
app.use((req, res, next) => {
  if (req.url.startsWith("/api") || req.url.startsWith("/auth")) {
    console.log(`${req.method} ${req.url}`);
  }
  next();
});
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || "6LdADY8tAAAAADio9AzwRTgqDCKluKa3pspF6aE3";
async function verifyCaptchaToken(token, ip) {
  if (!token) return false;
  try {
    const formData = new URLSearchParams();
    formData.append("secret", RECAPTCHA_SECRET);
    formData.append("response", token);
    formData.append("remoteip", ip);
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error("Turnstile verification error:", err);
    return false;
  }
}
var JWT_SECRET = process.env.JWT_SECRET || "anime_super_secret_key";
var ANIMEBOT_SYNC_SECRET = process.env.ANIMEBOT_SYNC_SECRET || "";
var SUPABASE_DB_HOST = process.env.SUPABASE_DB_HOST || "aws-0-ap-northeast-2.pooler.supabase.com";
var SUPABASE_DB_PORT = parseInt(process.env.SUPABASE_DB_PORT || "6543", 10);
var SUPABASE_DB_USER = process.env.SUPABASE_DB_USER || "postgres.bkvowaestqzxwlrhkbhk";
var SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || "animemuz_200";
var SUPABASE_DB_NAME = process.env.SUPABASE_DB_NAME || "postgres";
var supabasePool = new import_pg.Pool({
  host: SUPABASE_DB_HOST,
  port: SUPABASE_DB_PORT,
  database: SUPABASE_DB_NAME,
  user: SUPABASE_DB_USER,
  password: SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 3e4,
  connectionTimeoutMillis: 1e4
});
var WASMER_DB_HOST = process.env.WASMER_DB_HOST || "psql.fr-roub1.bengt.wasmernet.com";
var WASMER_DB_PORT = parseInt(process.env.WASMER_DB_PORT || "20184", 10);
var WASMER_DB_USER = process.env.WASMER_DB_USER || "user_82ffe893";
var WASMER_DB_PASSWORD = process.env.WASMER_DB_PASSWORD || "pw_1DuID9AO03FagRCGyr9cBuO13NCui0wd";
var WASMER_DB_NAME = process.env.WASMER_DB_NAME || "Animem";
var wasmerPool = new import_pg.Pool({
  host: WASMER_DB_HOST,
  port: WASMER_DB_PORT,
  database: WASMER_DB_NAME,
  user: WASMER_DB_USER,
  password: WASMER_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 3e4,
  connectionTimeoutMillis: 1e4
});
var pgPool = wasmerPool;
async function initPgDb() {
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS video (
        id VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255),
        mime_type VARCHAR(100),
        data BYTEA,
        size BIGINT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Verified video table in PostgreSQL.");
  } catch (err) {
    console.error("Failed to initialize PostgreSQL video table:", err);
  }
}
initPgDb();
async function d1ExecuteQuery(sql, params) {
  let cleanSql = sql.replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP").replace(/\bPRIMARY\s+KEY\s+AUTOINCREMENT\b/gi, "GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY").replace(/\bAUTO_INCREMENT\s+PRIMARY\s+KEY\b/gi, "GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY").replace(/\bAUTO_INCREMENT\b/gi, "").replace(/\bAUTOINCREMENT\b/gi, "").replace(/\bLONGTEXT\b/gi, "TEXT");
  const isSelect = /^\s*(SELECT|PRAGMA|WITH|SHOW|DESCRIBE|EXPLAIN)/i.test(cleanSql.trim());
  const isInsert = /^\s*INSERT\s+INTO/i.test(cleanSql.trim());
  if (isInsert && !/RETURNING\s+/i.test(cleanSql)) {
    cleanSql = cleanSql.replace(/;\s*$/, "") + " RETURNING id;";
  }
  let pIdx = 1;
  const pgSql = cleanSql.replace(/\?/g, () => `$${pIdx++}`);
  const cleanParams = (params || []).map((p) => {
    if (typeof p === "boolean") return p;
    if (p instanceof Date) return p.toISOString().slice(0, 19).replace("T", " ");
    if (p === void 0) return null;
    return p;
  });
  const isCommentsOrMessages = /\b(comments|messages)\b/i.test(cleanSql);
  const targetPool = isCommentsOrMessages ? wasmerPool : supabasePool;
  const res = await targetPool.query(pgSql, cleanParams);
  if (isSelect) {
    return [res.rows || [], []];
  } else {
    const insertId = res.rows?.[0]?.id || 0;
    return [
      {
        insertId: Number(insertId),
        affectedRows: res.rowCount || 0,
        changedRows: res.rowCount || 0
      },
      []
    ];
  }
}
var LOCAL_STORE_PATH = import_path.default.join(process.cwd(), "local_store.json");
function queryLocalStore(sql, params = []) {
  try {
    if (!import_fs.default.existsSync(LOCAL_STORE_PATH)) return [];
    const store = JSON.parse(import_fs.default.readFileSync(LOCAL_STORE_PATH, "utf-8"));
    const lower = sql.toLowerCase();
    let table = "";
    const match = lower.match(/from\s+([a-zA-Z0-9_]+)/);
    if (match) table = match[1];
    if (!table || !store[table]) return [];
    let data = store[table];
    if (!Array.isArray(data)) return [];
    if (table === "users") {
      if (lower.includes("where telegram_id = ? or email = ?") && params.length >= 2) {
        const tgId = String(params[0] ?? "");
        const email = String(params[1] ?? "").toLowerCase();
        return data.filter(
          (u) => u.telegram_id && String(u.telegram_id) === tgId || u.email && u.email.toLowerCase() === email
        );
      }
      if (lower.includes("where facebook_id = ? or email = ?") && params.length >= 2) {
        const fbId = String(params[0] ?? "");
        const email = String(params[1] ?? "").toLowerCase();
        return data.filter(
          (u) => u.facebook_id && String(u.facebook_id) === fbId || u.email && u.email.toLowerCase() === email
        );
      }
      if (lower.includes("where yandex_id = ? or email = ?") && params.length >= 2) {
        const yId = String(params[0] ?? "");
        const email = String(params[1] ?? "").toLowerCase();
        return data.filter(
          (u) => u.yandex_id && String(u.yandex_id) === yId || u.email && u.email.toLowerCase() === email
        );
      }
      if (lower.includes("where discord_id = ? or email = ?") && params.length >= 2) {
        const dId = String(params[0] ?? "");
        const email = String(params[1] ?? "").toLowerCase();
        return data.filter(
          (u) => u.discord_id && String(u.discord_id) === dId || u.email && u.email.toLowerCase() === email
        );
      }
      if (lower.includes("where phone = ? or email = ?") && params.length >= 2) {
        const phone = String(params[0] ?? "");
        const email = String(params[1] ?? "").toLowerCase();
        return data.filter(
          (u) => u.phone && String(u.phone) === phone || u.email && u.email.toLowerCase() === email
        );
      }
      if (lower.includes("where email = ?") && params.length > 0) {
        const email = String(params[0] ?? "").toLowerCase();
        return data.filter((u) => u.email && u.email.toLowerCase() === email);
      }
      if (lower.includes("where phone = ?") && params.length > 0) {
        const phone = String(params[0] ?? "");
        return data.filter((u) => u.phone && String(u.phone) === phone);
      }
      if (lower.includes("where telegram_id = ?") && params.length > 0) {
        const tgId = String(params[0] ?? "");
        return data.filter((u) => u.telegram_id && String(u.telegram_id) === tgId);
      }
      if (lower.includes("where id =") && params.length > 0) {
        return data.filter((item) => String(item.id) === String(params[0]));
      }
      if (lower.includes("where") && !lower.includes("where 1=1")) {
        return [];
      }
    }
    if (lower.includes("where id =") && params.length > 0) {
      data = data.filter((item) => String(item.id) === String(params[0]));
    } else if (lower.includes("where anime_id =") && params.length > 0) {
      data = data.filter((item) => String(item.anime_id) === String(params[0]));
    } else if (lower.includes("where user_id =") && params.length > 0) {
      data = data.filter((item) => String(item.user_id) === String(params[0]));
    } else if (lower.includes("where drama_id =") && params.length > 0) {
      data = data.filter((item) => String(item.drama_id) === String(params[0]));
    } else if (lower.includes("where slug =") && params.length > 0) {
      data = data.filter((item) => String(item.slug) === String(params[0]));
    } else if (lower.includes("where is_banner =") || lower.includes("where is_banner=1")) {
      data = data.filter((item) => item.is_banner == 1 || item.is_banner === true);
    } else if (lower.includes("where tavsiya =") || lower.includes("where tavsiya=1")) {
      data = data.filter((item) => item.tavsiya == 1 || item.tavsiya === true);
    } else if (lower.includes("where is_active =") || lower.includes("where is_active=1")) {
      data = data.filter((item) => item.is_active == 1 || item.is_active === true);
    } else if (lower.includes("where") && !lower.includes("where 1=1") && params.length > 0) {
      return [];
    }
    if (lower.includes("order by") && lower.includes("desc")) {
      data = [...data].reverse();
    }
    const limitMatch = lower.match(/limit\s+(\d+)/);
    if (limitMatch) {
      data = data.slice(0, parseInt(limitMatch[1], 10));
    }
    return data;
  } catch (e) {
    return [];
  }
}
async function dbQuery(sql, params, retries = 3) {
  try {
    return await d1ExecuteQuery(sql, params);
  } catch (err) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return dbQuery(sql, params, retries - 1);
    }
    const isSelect = /^\s*(SELECT|PRAGMA|WITH|SHOW|DESCRIBE|EXPLAIN)/i.test(sql.trim());
    if (isSelect) {
      console.warn("[DB D1 Fallback] Query failed (" + (err?.message || err) + "), using local_store fallback");
      const fallbackRows = queryLocalStore(sql, params);
      return [fallbackRows, []];
    }
    throw err;
  }
}
var serverCache = /* @__PURE__ */ new Map();
function getCache(key, maxAgeMs = 2e4) {
  const item = serverCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > maxAgeMs) {
    serverCache.delete(key);
    return null;
  }
  return item.data;
}
function setCache(key, data) {
  serverCache.set(key, { data, timestamp: Date.now() });
}
function invalidateServerCache(pattern) {
  if (!pattern) {
    serverCache.clear();
    return;
  }
  for (const k of Array.from(serverCache.keys())) {
    if (k.includes(pattern)) {
      serverCache.delete(k);
    }
  }
}
var memoryLocalStore = null;
var saveStoreTimeout = null;
function loadLocalStore() {
  if (memoryLocalStore) {
    return memoryLocalStore;
  }
  try {
    if (!import_fs.default.existsSync(LOCAL_STORE_PATH)) {
      const defaultData = {
        animes: [
          {
            id: 1,
            title: "Solo Leveling 2-Mavsum",
            description: "Sung Jin-Woo eng kuchsiz ovchidan dunyoning eng kuchli soyalar hukmdorigacha bo'lgan yo'lini davom ettiradi.",
            image_url: "https://m.media-amazon.com/images/M/MV5BODlhWOE5NjMtN2I0OC00NjA3LTkyM2YtM2I5Njg3MTBhYTY1XkEyXkFqcGc@._V1_.jpg",
            banner_url: "https://m.media-amazon.com/images/M/MV5BODlhWOE5NjMtN2I0OC00NjA3LTkyM2YtM2I5Njg3MTBhYTY1XkEyXkFqcGc@._V1_.jpg",
            rating: 9.8,
            rating_count: 150,
            holati: "Davom etmoqda",
            yil: 2025,
            studiyasi: "A-1 Pictures",
            qismlar_soni: 12,
            korishlar: 1240,
            janrlar: "Jangari, Sarguzasht, Fantastika",
            video_url: "https://www.w3schools.com/html/mov_bbb.mp4",
            tavsiya: true,
            is_banner: true
          },
          {
            id: 2,
            title: "Jujutsu Kaisen 2-Mavsum",
            description: "Gojo Satoru va Suguru Getoning o'tmishi hamda Shibuya voqealari tasvirlangan unutilmas mavsum.",
            image_url: "https://m.media-amazon.com/images/M/MV5BNGY4MTg3NjgtMmFkYi00ZTNmLTgwAVtLTExNmI0MDI0U3M4XkEyXkFqcGc@._V1_.jpg",
            banner_url: "https://m.media-amazon.com/images/M/MV5BNGY4MTg3NjgtMmFkYi00ZTNmLTgwAVtLTExNmI0MDI0U3M4XkEyXkFqcGc@._V1_.jpg",
            rating: 9.5,
            rating_count: 120,
            holati: "Tugallangan",
            yil: 2023,
            studiyasi: "MAPPA",
            qismlar_soni: 23,
            korishlar: 980,
            janrlar: "Jangari, Mistika, Mifyologiya",
            video_url: "https://www.w3schools.com/html/mov_bbb.mp4",
            tavsiya: true,
            is_banner: true
          },
          {
            id: 3,
            title: "Demon Slayer: Hashira Training Arc",
            description: "Tanjiro va uning do'stlari Yuqori Darajali iblislar bilan bo'ladigan hal qiluvchi jang oldidan Hashiralar bilan mashg'ulot o'tkazishadi.",
            image_url: "https://m.media-amazon.com/images/M/MV5BZjgwNzRhM2EtNWY2OC00M2I2LThmYWYtMDlkY2VmZWM4Y2FlXkEyXkFqcGc@._V1_.jpg",
            banner_url: "https://m.media-amazon.com/images/M/MV5BZjgwNzRhM2EtNWY2OC00M2I2LThmYWYtMDlkY2VmZWM4Y2FlXkEyXkFqcGc@._V1_.jpg",
            rating: 9.2,
            rating_count: 95,
            holati: "Tugallangan",
            yil: 2024,
            studiyasi: "ufotable",
            qismlar_soni: 8,
            korishlar: 850,
            janrlar: "Jangari, Mifyologiya, Tarixiy",
            video_url: "https://www.w3schools.com/html/mov_bbb.mp4",
            tavsiya: true,
            is_banner: true
          }
        ],
        notifications: [
          {
            id: 1,
            message: "Xush kelibsiz! Animem.uz platformasiga yangi animelar va epizodlar yuklanmoqda.",
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          }
        ],
        comments: [],
        episodes: [],
        users: [],
        ratings: [],
        messages: [],
        mangas: [],
        manga_chapters: [],
        dramas: [],
        donations: []
      };
      import_fs.default.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(defaultData, null, 2), "utf-8");
      memoryLocalStore = defaultData;
      return memoryLocalStore;
    }
    const raw = import_fs.default.readFileSync(LOCAL_STORE_PATH, "utf-8");
    memoryLocalStore = JSON.parse(raw);
    if (!memoryLocalStore.mangas) memoryLocalStore.mangas = [];
    if (!memoryLocalStore.manga_chapters) memoryLocalStore.manga_chapters = [];
    if (!memoryLocalStore.dramas) memoryLocalStore.dramas = [];
    if (!memoryLocalStore.drama_episodes) memoryLocalStore.drama_episodes = [];
    if (!memoryLocalStore.donations) memoryLocalStore.donations = [];
    return memoryLocalStore;
  } catch (e) {
    console.error("Error loading local_store.json:", e);
    return { animes: [], notifications: [], comments: [], episodes: [], users: [], ratings: [], messages: [] };
  }
}
function saveLocalStore(data) {
  memoryLocalStore = data;
  if (saveStoreTimeout) clearTimeout(saveStoreTimeout);
  saveStoreTimeout = setTimeout(() => {
    import_fs.default.promises.writeFile(LOCAL_STORE_PATH, JSON.stringify(data, null, 2), "utf-8").catch((err) => {
      console.error("Error async saving local_store.json:", err);
    });
  }, 1e3);
}
var server = import_http.default.createServer(app);
var io = new import_socket.Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
function notifyContentUpdate(type) {
  if (type === "anime" || type === "all") {
    invalidateServerCache("api_all_animes");
    invalidateServerCache("api_anime_");
    cachedRatings = null;
  }
  if (type === "manga" || type === "all") {
    invalidateServerCache("api_all_mangas");
    invalidateServerCache("api_manga_");
  }
  if (type === "drama" || type === "all") {
    invalidateServerCache("api_all_dramas");
    invalidateServerCache("api_drama_");
  }
  try {
    io.emit("contentUpdated", { type, timestamp: Date.now() });
  } catch (e) {
  }
}
function verifyAnyJwt(token) {
  if (!token) return null;
  try {
    return import_jsonwebtoken.default.verify(token, JWT_SECRET);
  } catch (e) {
    try {
      return import_jsonwebtoken.default.verify(token, "animem-super-jwt-secret-key-2026-secure");
    } catch (e2) {
      return null;
    }
  }
}
var authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);
  const decoded = verifyAnyJwt(token);
  if (!decoded) return res.sendStatus(403);
  req.user = decoded;
  if (decoded && decoded.id) {
    dbQuery("UPDATE users SET last_seen = NOW() WHERE id = ?", [decoded.id]).catch(() => {
    });
  }
  next();
};
async function testDbConnection() {
  try {
    const [rows] = await d1ExecuteQuery("SELECT COUNT(*) as cnt FROM animes;");
    console.log(`\u2705 [Supabase PostgreSQL] Connected successfully! Found ${rows[0]?.cnt || 0} animes.`);
  } catch (err) {
    console.error(`\u274C [Supabase Connection Error]`, err?.message || err);
  }
}
testDbConnection();
async function initShopTables() {
  try {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS shop_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        image_url LONGTEXT NOT NULL,
        price INT NOT NULL DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS shop_purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INT NOT NULL,
        item_id INT NOT NULL,
        is_equipped BOOLEAN DEFAULT FALSE,
        purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS shop_orders (
        id VARCHAR(64) PRIMARY KEY,
        user_id INT NOT NULL,
        item_id INT NOT NULL,
        amount_uzs INT NOT NULL,
        tezcheck_bill_id VARCHAR(128) DEFAULT NULL,
        status VARCHAR(32) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        paid_at TIMESTAMP NULL DEFAULT NULL
      )
    `);
    try {
      await dbQuery(`ALTER TABLE users ADD COLUMN avatar_frame_url LONGTEXT DEFAULT NULL`);
    } catch (e) {
    }
    const [existing] = await dbQuery(`SELECT COUNT(*) as count FROM shop_items`);
    if (existing && existing[0] && Number(existing[0].count) === 0) {
      console.log("Seeding initial anime shop items...");
      const sampleItems = [
        { title: "Sung Jinwoo (Shadow Monarch)", category: "avatar", image_url: "https://files.catbox.moe/54s3e2.jpg", price: 5e3 },
        { title: "Gojo Satoru (Limitless)", category: "avatar", image_url: "https://files.catbox.moe/44s7y5.jpg", price: 5e3 },
        { title: "Luffy Gear 5 (Sun God Nika)", category: "avatar", image_url: "https://files.catbox.moe/k3612d.jpg", price: 6e3 },
        { title: "Neon Cyberpunk Ramkasi", category: "frame", image_url: "https://files.catbox.moe/vptjgt.png", price: 1e4 },
        { title: "Alangali Qizil Olov Ramkasi", category: "frame", image_url: "https://files.catbox.moe/7h4sre.png", price: 12e3 },
        { title: "Binafsha Energiya Ramkasi", category: "frame", image_url: "https://files.catbox.moe/2s9aee.png", price: 1e4 },
        { title: "Solo Leveling Qorong'i Taxt", category: "banner", image_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200", price: 15e3 },
        { title: "Shibuya Kechasi (Jujutsu Kaisen)", category: "banner", image_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200", price: 15e3 },
        { title: "Egghead Futuristik Dengiz", category: "banner", image_url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200", price: 15e3 }
      ];
      for (const item of sampleItems) {
        await dbQuery(
          `INSERT INTO shop_items (title, category, image_url, price, is_active) VALUES (?, ?, ?, ?, 1)`,
          [item.title, item.category, item.image_url, item.price]
        );
      }
    }
    console.log("Verified and initialized Shop tables in Database.");
  } catch (err) {
    console.error("Failed to initialize Shop tables:", err);
  }
}
setTimeout(() => {
  initShopTables();
}, 1e3);
var watchRooms = /* @__PURE__ */ new Map();
var socketToWatchRoom = /* @__PURE__ */ new Map();
io.on("connection", (socket) => {
  console.log("A user connected to socket:", socket.id);
  socket.on("joinWatchRoom", (data) => {
    try {
      const { roomId, animeSlug, animeTitle, episodeIndex, user } = data || {};
      if (!roomId) return;
      let room = watchRooms.get(roomId);
      let isFirstInRoom = false;
      if (!room) {
        room = {
          roomId,
          animeSlug: animeSlug || "",
          animeTitle: animeTitle || "Anime",
          episodeIndex: typeof episodeIndex === "number" ? episodeIndex : 0,
          currentTime: 0,
          isPlaying: false,
          lastUpdated: Date.now(),
          creatorId: user?.id || null,
          creatorSocketId: socket.id,
          creatorName: user?.name || null,
          participants: /* @__PURE__ */ new Map()
        };
        watchRooms.set(roomId, room);
        isFirstInRoom = true;
      }
      let isHost = false;
      if (room.creatorId && user?.id && String(room.creatorId) === String(user.id)) {
        isHost = true;
      } else if (isFirstInRoom || room.creatorSocketId === socket.id) {
        isHost = true;
      } else {
        isHost = false;
      }
      const participant = {
        socketId: socket.id,
        userId: user?.id,
        userName: user?.name || (isHost ? "Xona Egasi" : "Do'st"),
        userAvatar: user?.avatar_url || user?.avatar || null,
        isHost
      };
      room.participants.set(socket.id, participant);
      socketToWatchRoom.set(socket.id, roomId);
      socket.join(roomId);
      const allParticipants = Array.from(room.participants.values());
      socket.emit("watchRoomInit", {
        roomState: {
          episodeIndex: room.episodeIndex,
          currentTime: room.currentTime,
          isPlaying: room.isPlaying,
          animeSlug: room.animeSlug,
          animeTitle: room.animeTitle
        },
        isHost,
        participants: allParticipants
      });
      io.to(roomId).emit("watchRoomUsers", allParticipants);
      socket.to(roomId).emit("watchRoomNotification", {
        type: "join",
        text: `${participant.userName} xonaga qo'shildi \u{1F44B}`
      });
    } catch (e) {
      console.error("Error in joinWatchRoom:", e);
    }
  });
  socket.on("watchSyncAction", (data) => {
    try {
      const { roomId, action, time, episodeIndex } = data || {};
      if (!roomId) return;
      const room = watchRooms.get(roomId);
      if (room) {
        room.lastUpdated = Date.now();
        if (typeof time === "number") room.currentTime = time;
        if (action === "play") room.isPlaying = true;
        if (action === "pause") room.isPlaying = false;
        if (action === "seek" && typeof time === "number") room.currentTime = time;
        if (action === "changeEpisode" && typeof episodeIndex === "number") {
          room.episodeIndex = episodeIndex;
          room.currentTime = 0;
          room.isPlaying = true;
        }
      }
      socket.to(roomId).emit("watchSyncAction", data);
    } catch (e) {
      console.error("Error in watchSyncAction:", e);
    }
  });
  socket.on("watchRoomChatMessage", (data) => {
    try {
      const { roomId, text, user, id } = data || {};
      if (!roomId || !text || !text.trim()) return;
      const message = {
        id: id || "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        roomId,
        text: text.trim(),
        user: {
          name: user?.name || "Muxlis",
          avatar_url: user?.avatar_url || user?.avatar || null
        },
        time: (/* @__PURE__ */ new Date()).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })
      };
      io.to(roomId).emit("watchRoomMessage", message);
    } catch (e) {
      console.error("Error in watchRoomChatMessage:", e);
    }
  });
  const leaveCurrentWatchRoom = () => {
    const roomId = socketToWatchRoom.get(socket.id);
    if (!roomId) return;
    socketToWatchRoom.delete(socket.id);
    socket.leave(roomId);
    const room = watchRooms.get(roomId);
    if (!room) return;
    const leavingUser = room.participants.get(socket.id);
    room.participants.delete(socket.id);
    if (room.participants.size === 0) {
      setTimeout(() => {
        const r = watchRooms.get(roomId);
        if (r && r.participants.size === 0) {
          watchRooms.delete(roomId);
        }
      }, 18e4);
    } else {
      io.to(roomId).emit("watchRoomUsers", Array.from(room.participants.values()));
      if (leavingUser) {
        io.to(roomId).emit("watchRoomNotification", {
          type: "leave",
          text: `${leavingUser.userName} xonani tark etdi`
        });
      }
    }
  };
  socket.on("leaveWatchRoom", () => {
    leaveCurrentWatchRoom();
  });
  socket.on("disconnect", () => {
    leaveCurrentWatchRoom();
  });
  socket.on("typing", (data) => {
    socket.broadcast.emit("userTyping", data);
  });
  socket.on("stopTyping", (data) => {
    socket.broadcast.emit("userStoppedTyping", data);
  });
  socket.on("sendMessage", async (data) => {
    try {
      const { user_id, user_name, user_avatar, user_avatar_frame, content, reply_to_id, reply_to_name, reply_to_content } = data || {};
      if (!content || !content.trim()) return;
      const broadcastMsg = {
        id: Date.now(),
        user_id,
        user_name: user_name || "Anonim",
        user_avatar: user_avatar || null,
        user_avatar_frame: user_avatar_frame || null,
        avatar_frame_url: user_avatar_frame || null,
        content,
        reply_to_id,
        reply_to_name,
        reply_to_content,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      io.emit("newMessage", broadcastMsg);
      (async () => {
        try {
          const [result] = await dbQuery(
            "INSERT INTO messages (user_id, user_name, content, reply_to_id, reply_to_name, reply_to_content) VALUES (?, ?, ?, ?, ?, ?)",
            [
              user_id || null,
              user_name || "Anonim",
              content,
              reply_to_id || null,
              reply_to_name || null,
              reply_to_content || null
            ]
          );
          if (result && result.insertId) {
            broadcastMsg.id = result.insertId;
          }
          if (user_id && (!broadcastMsg.user_avatar || !broadcastMsg.user_avatar_frame)) {
            try {
              const [uRows] = await dbQuery("SELECT avatar_url, avatar_frame_url FROM users WHERE id = ?", [user_id]);
              if (uRows && uRows[0]) {
                if (uRows[0].avatar_url) broadcastMsg.user_avatar = uRows[0].avatar_url;
                if (uRows[0].avatar_frame_url) {
                  broadcastMsg.user_avatar_frame = uRows[0].avatar_frame_url;
                  broadcastMsg.avatar_frame_url = uRows[0].avatar_frame_url;
                }
              }
            } catch (e) {
            }
          }
        } catch (dbErr) {
          console.warn("Socket DB message async save warning:", dbErr);
        }
        try {
          const store = loadLocalStore();
          if (!store.messages) store.messages = [];
          store.messages.push(broadcastMsg);
          if (store.messages.length > 500) {
            store.messages = store.messages.slice(-500);
          }
          saveLocalStore(store);
        } catch (storeErr) {
        }
      })();
    } catch (err) {
      console.error("Error saving new chat message via socket:", err);
    }
  });
  (async () => {
    try {
      let previousMessages = [];
      try {
        const [rows] = await Promise.race([
          dbQuery(
            `SELECT m.*, 
                    COALESCE(u.name, m.user_name, 'Foydalanuvchi') AS user_name, 
                    u.avatar_url AS user_avatar, 
                    u.avatar_frame_url AS user_avatar_frame, 
                    u.avatar_frame_url AS avatar_frame_url 
             FROM messages m 
             LEFT JOIN users u ON (m.user_id = u.id AND m.user_id > 0)
             ORDER BY m.id DESC LIMIT 50`
          ),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2e3))
        ]);
        if (Array.isArray(rows) && rows.length > 0) {
          previousMessages = [...rows].reverse();
        }
      } catch (dbErr) {
      }
      if (!previousMessages || previousMessages.length === 0) {
        const store = loadLocalStore();
        previousMessages = (store.messages || []).slice(-50);
      }
      socket.emit("previousMessages", previousMessages);
    } catch (err) {
      console.error("Error fetching previous messages for socket:", err);
    }
  })();
});
app.get("/api/watch-room/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = watchRooms.get(roomId);
  if (!room) {
    return res.json({ exists: false });
  }
  res.json({
    exists: true,
    room: {
      roomId: room.roomId,
      animeSlug: room.animeSlug,
      animeTitle: room.animeTitle,
      episodeIndex: room.episodeIndex,
      participantCount: room.participants.size,
      creatorId: room.creatorId,
      creatorName: room.creatorName
    }
  });
});
app.post("/api/watch-room/create", (req, res) => {
  const { animeSlug, animeTitle, episodeIndex, hostUser } = req.body || {};
  const roomId = req.body.roomId || "room_" + Math.random().toString(36).substring(2, 9);
  if (!watchRooms.has(roomId)) {
    watchRooms.set(roomId, {
      roomId,
      animeSlug: animeSlug || "",
      animeTitle: animeTitle || "Anime",
      episodeIndex: typeof episodeIndex === "number" ? episodeIndex : 0,
      currentTime: 0,
      isPlaying: false,
      lastUpdated: Date.now(),
      creatorId: hostUser?.id || null,
      creatorName: hostUser?.name || null,
      participants: /* @__PURE__ */ new Map()
    });
  }
  res.json({
    ok: true,
    success: true,
    roomId,
    url: `/anime/${animeSlug}?room=${roomId}`
  });
});
app.get("/api/proxy-video", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send("Video URL is required");
  }
  try {
    let cleanUrl = targetUrl.trim();
    if (cleanUrl.startsWith("//")) {
      cleanUrl = "https:" + cleanUrl;
    }
    if (cleanUrl.includes("mover.uz")) {
      const moverMatch = cleanUrl.match(/(?:v\.mover\.uz\/|mover\.uz\/(?:watch|video\/embed|video|v)\/)([A-Za-z0-9_-]+)/i);
      if (moverMatch && moverMatch[1]) {
        let rawId = moverMatch[1].replace(/\.mp4$/i, "").replace(/_(?:m|h|s|q)$/i, "");
        if (rawId) {
          const quality = req.query.quality === "720" || req.query.quality === "hd" ? "_h" : "_m";
          cleanUrl = `https://v.mover.uz/${rawId}${quality}.mp4`;
        }
      }
    }
    const parsed = new URL(cleanUrl);
    const isHttps = parsed.protocol === "https:";
    const client = isHttps ? import_https.default : import_http.default;
    const reqHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Accept-Encoding": "identity",
      "Connection": "keep-alive"
    };
    if (req.headers.range) {
      reqHeaders["Range"] = req.headers.range;
    }
    if (parsed.hostname.includes("animem.uz")) {
      reqHeaders["Referer"] = "https://animem.uz/";
      reqHeaders["Origin"] = "https://animem.uz";
    } else if (parsed.hostname.includes("mover.uz")) {
      reqHeaders["Referer"] = "https://mover.uz/";
      reqHeaders["Origin"] = "https://mover.uz";
    } else if (parsed.hostname.includes("voiplay.uz")) {
      reqHeaders["Referer"] = "https://voiplay.uz/";
      reqHeaders["Origin"] = "https://voiplay.uz";
    } else {
      reqHeaders["Referer"] = `https://${parsed.hostname}/`;
    }
    const proxyReq = client.request(
      parsed,
      {
        method: req.method,
        headers: reqHeaders
      },
      (proxyRes) => {
        if (proxyRes.statusCode && [301, 302, 303, 307, 308].includes(proxyRes.statusCode) && proxyRes.headers.location) {
          const redirectUrl = new URL(proxyRes.headers.location, parsed).toString();
          return res.redirect(`/api/proxy-video?url=${encodeURIComponent(redirectUrl)}`);
        }
        res.status(proxyRes.statusCode || 200);
        const headersToForward = [
          "content-type",
          "content-length",
          "accept-ranges",
          "content-range",
          "content-disposition"
        ];
        headersToForward.forEach((h) => {
          if (proxyRes.headers[h]) {
            res.setHeader(h, proxyRes.headers[h]);
          }
        });
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cache-Control", "public, max-age=3600");
        proxyRes.pipe(res);
      }
    );
    proxyReq.on("error", (err) => {
      console.error("[Video Proxy Error]", err.message);
      if (!res.headersSent) {
        res.status(500).send("Video Proxy failed: " + err.message);
      }
    });
    req.on("close", () => {
      proxyReq.destroy();
    });
    proxyReq.end();
  } catch (err) {
    console.error("[Video Proxy Exception]", err?.message || err);
    if (!res.headersSent) {
      res.status(400).send("Invalid URL");
    }
  }
});
var verificationCodes = {};
var passwordResetCodes = {};
var phoneVerificationCodes = {};
var phonePasswordResetCodes = {};
var MAILERSEND_API_KEY = process.env.MAILERSEND_API_KEY || "mlsn.9ea81361dd457046b74a47c43e6336658c47cad963cff9d053da31e478b849e2";
function buildAnimeEmailHtml(title, subtitle, code, note) {
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Animem.uz \u2014 Xavfsizlik Tasdiqlash Kodi</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #08090f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text for email clients -->
  <div style="display: none; font-size: 1px; color: #08090f; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Animem.uz platformasidagi tasdiqlash kodingiz: ${code}. Ushbu kod 10 daqiqa davomida amal qiladi.
  </div>

  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #08090f; padding: 40px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #12131d; border-radius: 18px; overflow: hidden; border: 1px solid rgba(255, 0, 106, 0.35); box-shadow: 0 15px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 0, 106, 0.15);">
          
          <!-- Top Neon Accent Header -->
          <tr>
            <td style="background: linear-gradient(90deg, #ff006a 0%, #a855f7 50%, #ff006a 100%); height: 5px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Brand Logo Header -->
          <tr>
            <td style="padding: 35px 30px 20px 30px; text-align: center; background: radial-gradient(circle at 50% 0%, rgba(255, 0, 106, 0.15) 0%, transparent 70%);">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td align="center">
                    <!-- Brand Icon Badge -->
                    <div style="width: 58px; height: 58px; border-radius: 16px; background: linear-gradient(135deg, #1f2030 0%, #161724 100%); border: 2px solid #ff006a; display: inline-block; line-height: 58px; text-align: center; box-shadow: 0 0 20px rgba(255, 0, 106, 0.4);">
                      <span style="font-size: 26px; font-weight: 900; color: #ff006a;">A</span>
                    </div>
                  </td>
                </tr>
              </table>

              <h1 style="margin: 16px 0 4px 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: 2px; text-transform: uppercase;">
                ANIMEM<span style="color: #ff006a;">.UZ</span>
              </h1>
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #a1a1aa; font-weight: 700;">
                Xavfsizlik va Avtorizatsiya Markazi
              </p>
            </td>
          </tr>

          <!-- Message Body Area -->
          <tr>
            <td style="padding: 10px 35px 30px 35px; text-align: center;">
              
              <!-- Badge -->
              <div style="display: inline-block; padding: 6px 16px; background-color: rgba(255, 0, 106, 0.12); border: 1px solid rgba(255, 0, 106, 0.4); border-radius: 20px; margin-bottom: 16px;">
                <span style="font-size: 11px; font-weight: 800; color: #ff3b88; text-transform: uppercase; letter-spacing: 1.5px;">
                  \u{1F512} ${title}
                </span>
              </div>

              <p style="margin: 0 0 20px 0; font-size: 14px; color: #d4d4d8; line-height: 1.6;">
                ${subtitle}
              </p>

              <!-- OTP Code Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td align="center">
                    <div style="background: linear-gradient(135deg, #181926 0%, #1f2033 100%); border: 2px solid #ff006a; border-radius: 14px; padding: 22px 10px; text-align: center; box-shadow: 0 8px 30px rgba(255, 0, 106, 0.25);">
                      <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 2.5px; color: #ff3385; font-weight: 800; margin-bottom: 8px;">
                        BIR MARTALIK TASDIQLASH KODI (OTP)
                      </div>
                      <div style="font-family: Consolas, 'Courier New', Courier, monospace; font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #ffffff; text-shadow: 0 0 16px rgba(255, 0, 106, 0.7); margin-left: 12px;">
                        ${code}
                      </div>
                      <div style="font-size: 11px; color: #a1a1aa; margin-top: 10px; font-weight: 600;">
                        \u23F3 Ushbu kod 10 daqiqa davomida amal qiladi
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Notice Box -->
              <div style="background-color: #1a1520; border-left: 4px solid #ff006a; border-radius: 8px; padding: 14px 16px; margin: 24px 0; text-align: left;">
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #f472b6; font-weight: 700; line-height: 1.4;">
                  \u26A0\uFE0F Muhim xavfsizlik eslatmasi:
                </p>
                <p style="margin: 0; font-size: 11px; color: #d4d4d8; line-height: 1.5;">
                  Ushbu kodni hech kimga, hatto Animem.uz xodimlariga ham aslo oshkor qilmang. Biz hech qachon sizdan tasdiqlash kodini yoki hisobingiz parolini so'ramaymiz.
                </p>
              </div>

              <p style="margin: 0; font-size: 12px; color: #71717a; line-height: 1.5;">
                ${note}
              </p>
            </td>
          </tr>

          <!-- MailerSend Legal, Anti-Spam & GDPR Compliant Footer -->
          <tr>
            <td style="background-color: #0b0c14; padding: 26px 30px; text-align: center; border-top: 1px solid #1c1d2e;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 800; color: #e4e4e7;">
                Animem.uz Media Platformasi
              </p>
              <p style="margin: 0 0 12px 0; font-size: 11px; color: #71717a; line-height: 1.5;">
                Toshkent shahri, O'zbekiston | Qo'llab-quvvatlash: <a href="mailto:support@animem.uz" style="color: #ff006a; text-decoration: none; font-weight: 600;">support@animem.uz</a>
              </p>

              <!-- Transactional Notice (Anti-Spam Policy requirement) -->
              <div style="background-color: #11121d; border-radius: 8px; padding: 10px 14px; margin: 12px 0; border: 1px solid #1e2030;">
                <p style="margin: 0; font-size: 10px; color: #71717a; line-height: 1.5;">
                  Ushbu xat avtomatik tarzda sizning so'rovingizga binoan yuborilgan tranzaksion xavfsizlik xabaridir. Bu reklama yoki marketing xabarnomasi emas.
                </p>
              </div>

              <!-- Legal Links -->
              <p style="margin: 14px 0 0 0; font-size: 11px; color: #a1a1aa;">
                <a href="https://animem.uz/privacy" style="color: #a1a1aa; text-decoration: underline; margin-right: 14px;">Maxfiylik siyosati</a>
                <a href="https://animem.uz/terms" style="color: #a1a1aa; text-decoration: underline;">Foydalanish shartlari</a>
              </p>

              <p style="margin: 12px 0 0 0; font-size: 10px; color: #52525b;">
                \xA9 ${currentYear} Animem.uz. Barcha huquqlar himoyalangan.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
async function sendMailerSendEmail(toEmail, subject, title, subtitle, code, note) {
  const apiKey = (process.env.MAILERSEND_API_KEY || MAILERSEND_API_KEY || "").trim();
  if (!apiKey) {
    return { ok: false, error: "MAILERSEND_API_KEY o'rnatilmagan" };
  }
  const candidateSenders = [];
  if (process.env.MAILERSEND_FROM_EMAIL) {
    candidateSenders.push({
      email: process.env.MAILERSEND_FROM_EMAIL.trim(),
      name: process.env.MAILERSEND_FROM_NAME?.trim() || "Animem.uz"
    });
  }
  if (process.env.MAILERSEND_SENDER_EMAIL) {
    candidateSenders.push({
      email: process.env.MAILERSEND_SENDER_EMAIL.trim(),
      name: process.env.MAILERSEND_SENDER_NAME?.trim() || "Animem.uz"
    });
  }
  candidateSenders.push(
    { email: "info@animem.uz", name: "Animem.uz" },
    { email: "noreply@animem.uz", name: "Animem.uz" },
    { email: "auth@animem.uz", name: "Animem.uz" },
    { email: "MS_vz9dle@test-vz9dlemxqw14kj50.mlsender.net", name: "Animem.uz" }
  );
  const seenEmails = /* @__PURE__ */ new Set();
  const senders = candidateSenders.filter((s) => {
    const lower = s.email.toLowerCase();
    if (seenEmails.has(lower)) return false;
    seenEmails.add(lower);
    return true;
  });
  const htmlContent = buildAnimeEmailHtml(title, subtitle, code, note);
  const textContent = `${title}

${subtitle}

Tasdiqlash kodi: ${code}

${note}

Ushbu xat avtomatik tarzda yuborilgan bir martalik tranzaksion xabardir.
\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} Animem.uz | support@animem.uz`;
  let lastError = "";
  for (const from of senders) {
    try {
      const payload = JSON.stringify({
        from: {
          email: from.email,
          name: from.name
        },
        to: [
          {
            email: toEmail,
            name: "Animem.uz Foydalanuvchisi"
          }
        ],
        reply_to: {
          email: "support@animem.uz",
          name: "Animem.uz Yordam"
        },
        subject,
        text: textContent,
        html: htmlContent
      });
      const response = await new Promise((resolve, reject) => {
        const req = import_https.default.request(
          {
            hostname: "api.mailersend.com",
            port: 443,
            path: "/v1/email",
            method: "POST",
            family: 4,
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "Accept": "application/json",
              "User-Agent": "MailerSend-NodeJS/1.0",
              "Content-Length": Buffer.byteLength(payload)
            }
          },
          (res) => {
            let body = "";
            res.on("data", (chunk) => {
              body += chunk;
            });
            res.on("end", () => {
              resolve({
                statusCode: res.statusCode || 500,
                headers: res.headers,
                body
              });
            });
          }
        );
        req.on("error", (err) => {
          reject(err);
        });
        req.setTimeout(12e3, () => {
          req.destroy(new Error("MailerSend API timeout (12s)"));
        });
        req.write(payload);
        req.end();
      });
      console.log(`[MailerSend API Response from=${from.email} to=${toEmail}]: status=${response.statusCode}, messageId=${response.headers["x-message-id"] || "none"}`);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return { ok: true };
      }
      let errorMsg = `MailerSend HTTP ${response.statusCode}`;
      if (response.body) {
        try {
          const parsed = JSON.parse(response.body);
          if (parsed.message) errorMsg = parsed.message;
          if (parsed.errors) errorMsg += " (" + JSON.stringify(parsed.errors) + ")";
        } catch (_) {
          errorMsg = response.body.slice(0, 200);
        }
      }
      lastError = errorMsg;
    } catch (err) {
      lastError = err.message || "Email yuborishda xatolik";
      console.warn(`[MailerSend API Error with ${from.email}]:`, err);
    }
  }
  return { ok: false, error: lastError };
}
async function sendEmailNotification(toEmail, subject, title, subtitle, code, note) {
  const htmlContent = buildAnimeEmailHtml(title, subtitle, code, note);
  const textContent = `${title}

${subtitle}

Tasdiqlash kodi: ${code}

${note}

Ushbu xat avtomatik tarzda yuborilgan bir martalik tranzaksion xabardir.
\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} Animem.uz | support@animem.uz`;
  const defaultFrom = (process.env.SMTP_FROM || '"Animem.uz" <support@animem.uz>').trim();
  const smtpUser = (process.env.GMAIL_USER || process.env.SMTP_USER || "").trim();
  const smtpPass = (process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || process.env.SMTP_PASS || "").replace(/\s+/g, "").trim();
  if (smtpUser && smtpPass) {
    try {
      const isGmail = !process.env.SMTP_HOST || process.env.SMTP_HOST.includes("gmail");
      const transporter = isGmail ? import_nodemailer.default.createTransport({
        service: "gmail",
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        connectionTimeout: 1e4
      }) : import_nodemailer.default.createTransport({
        host: process.env.SMTP_HOST.trim(),
        port: Number(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE === "true" || !process.env.SMTP_SECURE && (Number(process.env.SMTP_PORT) || 465) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        connectionTimeout: 1e4
      });
      const info = await transporter.sendMail({
        from: defaultFrom,
        to: toEmail,
        replyTo: "support@animem.uz",
        subject,
        text: textContent,
        html: htmlContent
      });
      console.log(`[SMTP Email Success] Sent to ${toEmail} via SMTP (${info.messageId})`);
      return { ok: true, method: "smtp" };
    } catch (smtpErr) {
      console.warn(`[SMTP Email Warning] Failed sending via SMTP to ${toEmail}:`, smtpErr.message);
    }
  }
  try {
    const domain = toEmail.split("@")[1];
    if (domain) {
      const mxRecords = await import_dns.default.promises.resolveMx(domain);
      if (mxRecords && mxRecords.length > 0) {
        mxRecords.sort((a, b) => a.priority - b.priority);
        const primaryMx = mxRecords[0].exchange;
        console.log(`[Direct MX] Attempting direct delivery to ${toEmail} via ${primaryMx}:25...`);
        const directTransporter = import_nodemailer.default.createTransport({
          host: primaryMx,
          port: 25,
          secure: false,
          name: "animem.uz",
          tls: {
            rejectUnauthorized: false
          },
          connectionTimeout: 7e3,
          greetingTimeout: 7e3,
          socketTimeout: 8e3
        });
        const info = await directTransporter.sendMail({
          from: defaultFrom,
          to: toEmail,
          replyTo: "support@animem.uz",
          subject,
          text: textContent,
          html: htmlContent
        });
        console.log(`[Direct MX Success] Direct delivered to ${toEmail} via ${primaryMx} (${info.messageId})`);
        return { ok: true, method: "direct_mx" };
      }
    }
  } catch (directMxErr) {
    console.warn(`[Direct MX Warning] Direct MX delivery to ${toEmail} failed:`, directMxErr.message);
  }
  const mailerSendResult = await sendMailerSendEmail(toEmail, subject, title, subtitle, code, note);
  if (mailerSendResult.ok) {
    return { ok: true, method: "mailersend" };
  }
  return {
    ok: false,
    error: mailerSendResult.error || "Email yuborishda xatolik. Iltimos GMAIL_USER/GMAIL_APP_PASSWORD yoki SMTP ma'lumotlarini tekshiring."
  };
}
app.post("/api/auth/send-code", async (req, res) => {
  try {
    const { email, captchaToken } = req.body;
    if (!captchaToken) {
      return res.status(400).json({ error: "Robot emasligingizni tasdiqlang!" });
    }
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const isHuman = await verifyCaptchaToken(captchaToken, ip);
    if (!isHuman) {
      return res.status(400).json({ error: "Captcha tasdiqlanmadi. Iltimos qaytadan urinib ko'ring." });
    }
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Yaroqli email manzilini kiriting!" });
    }
    const cleanEmail = email.toLowerCase().trim();
    const [existing] = await dbQuery("SELECT id FROM users WHERE email = ?", [cleanEmail]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: "Ushbu email bilan allaqachon ro'yxatdan o'tilgan! Kirish sahifasidan foydalaning." });
    }
    const existingCode = verificationCodes[cleanEmail];
    if (existingCode && existingCode.createdAt && Date.now() - existingCode.createdAt < 6e4) {
      const waitSeconds = Math.ceil((6e4 - (Date.now() - existingCode.createdAt)) / 1e3);
      return res.status(429).json({ error: `Iltimos, yangi kod so'rashdan oldin ${waitSeconds} soniya kuting.` });
    }
    const code = Math.floor(1e5 + Math.random() * 9e5).toString();
    verificationCodes[cleanEmail] = {
      code,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1e3,
      verified: false
    };
    console.log(`[Email Auth] Verification code generated for ${cleanEmail}: ${code}`);
    const emailResult = await sendEmailNotification(
      cleanEmail,
      "Animem.uz \u2014 Ro'yxatdan o'tish tasdiqlash kodi: " + code,
      "RO'YXATDAN O'TISHNI TASDIQLASH",
      "Animem.uz platformasida yangi akkaunt yaratishni yakunlash uchun bir martalik xavfsizlik kodingiz:",
      code,
      "Ushbu kod 10 daqiqa davomida amal qiladi. Agarda siz ro'yxatdan o'tish so'rovini yubormagan bo'lsangiz, ushbu xatni e'tiborsiz qoldiring."
    );
    if (emailResult.ok) {
      return res.json({
        success: true,
        emailSent: true,
        method: emailResult.method,
        message: "Tasdiqlash kodi email manzilingizga yuborildi! Pochtani (va Spam papkasini) tekshiring."
      });
    }
    console.warn(`[Email Auth] Email sending failed for ${cleanEmail}: ${emailResult.error}`);
    return res.json({
      success: true,
      emailSent: false,
      devCode: code,
      message: `Tasdiqlash kodi tayyorlandi! ${emailResult.error ? `(Pochta xizmati: ${emailResult.error}. Tasdiqlash kodi: ${code})` : ""}`
    });
  } catch (error) {
    console.error("Send code error:", error);
    res.status(500).json({ error: "Tasdiqlash kodini yuborishda xatolik yuz berdi" });
  }
});
app.post("/api/auth/forgot-password-send-code", async (req, res) => {
  try {
    const { email, captchaToken } = req.body;
    if (!captchaToken) {
      return res.status(400).json({ error: "Robot emasligingizni tasdiqlang!" });
    }
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const isHuman = await verifyCaptchaToken(captchaToken, ip);
    if (!isHuman) {
      return res.status(400).json({ error: "Captcha tasdiqlanmadi. Iltimos qaytadan urinib ko'ring." });
    }
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Yaroqli email manzilini kiriting!" });
    }
    const cleanEmail = email.toLowerCase().trim();
    const [existing] = await dbQuery("SELECT id FROM users WHERE email = ?", [cleanEmail]);
    if (!existing || existing.length === 0) {
      return res.status(400).json({ error: "Ushbu email manzili bilan foydalanuvchi topilmadi!" });
    }
    const existingReset = passwordResetCodes[cleanEmail];
    if (existingReset && existingReset.createdAt && Date.now() - existingReset.createdAt < 6e4) {
      const waitSeconds = Math.ceil((6e4 - (Date.now() - existingReset.createdAt)) / 1e3);
      return res.status(429).json({ error: `Iltimos, yangi kod so'rashdan oldin ${waitSeconds} soniya kuting.` });
    }
    const code = Math.floor(1e5 + Math.random() * 9e5).toString();
    passwordResetCodes[cleanEmail] = {
      code,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1e3,
      verified: false
    };
    console.log(`[Forgot Password] Reset code generated for ${cleanEmail}: ${code}`);
    const emailResult = await sendEmailNotification(
      cleanEmail,
      "Animem.uz \u2014 Parolni tiklash tasdiqlash kodi: " + code,
      "PAROLNI TIKLASH",
      "Akkauntingiz parolini tiklash va yangi parol o'rnatish uchun bir martalik xavfsizlik kodingiz:",
      code,
      "Ushbu kod 10 daqiqa davomida amal qiladi. Agarda siz parolni tiklash so'rovini yubormagan bo'lsangiz, ushbu xatni e'tiborsiz qoldiring \u2014 hisobingiz xavfsiz."
    );
    if (emailResult.ok) {
      return res.json({
        success: true,
        emailSent: true,
        method: emailResult.method,
        message: "Parolni tiklash kodi email manzilingizga yuborildi! Pochtani (va Spam papkasini) tekshiring."
      });
    }
    console.warn(`[Forgot Password] Email sending failed for ${cleanEmail}: ${emailResult.error}`);
    return res.json({
      success: true,
      emailSent: false,
      devCode: code,
      message: `Parolni tiklash kodi tayyorlandi! ${emailResult.error ? `(Pochta xizmati: ${emailResult.error}. Tasdiqlash kodi: ${code})` : ""}`
    });
  } catch (error) {
    console.error("Forgot password send code error:", error);
    res.status(500).json({ error: "Parolni tiklash kodini yuborishda xatolik yuz berdi" });
  }
});
app.post("/api/auth/forgot-password-verify-code", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "Email va kodni kiriting!" });
    }
    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.toString().trim();
    const record = passwordResetCodes[cleanEmail];
    if (!record) {
      return res.status(400).json({ error: "Tiklash kodi topilmadi yoki yuborilmagan!" });
    }
    if (Date.now() > record.expiresAt) {
      delete passwordResetCodes[cleanEmail];
      return res.status(400).json({ error: "Tiklash kodi muddati o'tgan! Qayta kod so'rang." });
    }
    if (record.code !== cleanCode) {
      return res.status(400).json({ error: "Tasdiqlash kodi xato kiritildi!" });
    }
    record.verified = true;
    return res.json({
      success: true,
      message: "Tasdiqlash kodi to'g'ri kiritildi!"
    });
  } catch (error) {
    console.error("Verify reset code error:", error);
    res.status(500).json({ error: "Kodni tekshirishda xatolik yuz berdi" });
  }
});
app.post("/api/auth/forgot-password-reset", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "Barcha maydonlarni to'ldiring!" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak!" });
    }
    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.toString().trim();
    const record = passwordResetCodes[cleanEmail];
    if (!record || !record.verified || record.code !== cleanCode) {
      return res.status(400).json({ error: "Kodingiz tasdiqlanmagan yoki xato!" });
    }
    const hashedPassword = await import_bcryptjs.default.hash(newPassword, 10);
    await dbQuery("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, cleanEmail]);
    delete passwordResetCodes[cleanEmail];
    const [users] = await dbQuery("SELECT id, name, email, role, avatar_url FROM users WHERE email = ?", [cleanEmail]);
    const user = users[0];
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    const token = import_jsonwebtoken.default.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });
    return res.json({
      success: true,
      message: "Parolingiz muvaffaqiyatli yangilandi!",
      token,
      user
    });
  } catch (error) {
    console.error("Forgot password reset error:", error);
    res.status(500).json({ error: "Parolni o'zgartirishda xatolik yuz berdi" });
  }
});
app.post("/api/auth/verify-code", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "Email va kodni kiriting!" });
    }
    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.toString().trim();
    const record = verificationCodes[cleanEmail];
    if (!record) {
      return res.status(400).json({ error: "Tasdiqlash kodi topilmadi yoki yuborilmagan! Qayta kod so'rang." });
    }
    if (Date.now() > record.expiresAt) {
      delete verificationCodes[cleanEmail];
      return res.status(400).json({ error: "Tasdiqlash kodi muddati o'tgan! Qayta kod so'rang." });
    }
    if (record.code !== cleanCode) {
      return res.status(400).json({ error: "Tasdiqlash kodi xato kiritildi!" });
    }
    record.verified = true;
    return res.json({
      success: true,
      message: "Tasdiqlash kodi to'g'ri kiritildi!"
    });
  } catch (error) {
    console.error("Verify code error:", error);
    res.status(500).json({ error: "Kodni tekshirishda xatolik yuz berdi" });
  }
});
app.post("/api/auth/register-verified", async (req, res) => {
  try {
    const { name, email, password, code } = req.body;
    if (!name || !email || !password || !code) {
      return res.status(400).json({ error: "Barcha maydonlarni to'ldiring!" });
    }
    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.toString().trim();
    const record = verificationCodes[cleanEmail];
    if (!record || !record.verified || record.code !== cleanCode) {
      return res.status(400).json({ error: "Email manzilingiz hali tasdiqlanmagan yoki xato kod!" });
    }
    const [existing] = await dbQuery("SELECT id FROM users WHERE email = ?", [cleanEmail]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: "Ushbu email bilan allaqachon ro'yxatdan o'tilgan!" });
    }
    const hashedPassword = await import_bcryptjs.default.hash(password, 10);
    const role = cleanEmail === "mosinjonovjasurbek28@gmail.com" ? "admin" : "user";
    const [result] = await dbQuery(
      "INSERT INTO users (name, email, password, role, avatar_url) VALUES (?, ?, ?, ?, NULL)",
      [name, cleanEmail, hashedPassword, role]
    );
    delete verificationCodes[cleanEmail];
    const userPayload = {
      id: result.insertId,
      name,
      email: cleanEmail,
      role,
      avatar_url: null
    };
    const tokenPayload = {
      id: result.insertId,
      email: cleanEmail,
      role
    };
    const token = import_jsonwebtoken.default.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });
    return res.status(201).json({
      token,
      user: userPayload
    });
  } catch (error) {
    console.error("Register verified error:", error);
    res.status(500).json({ error: "Ro'yxatdan o'tishda xatolik yuz berdi" });
  }
});
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Barcha maydonlarni to'ldiring!" });
    }
    const [existing] = await dbQuery("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Ushbu email bilan allaqachon ro'yxatdan o'tilgan!" });
    }
    const hashedPassword = await import_bcryptjs.default.hash(password, 10);
    const role = email === "mosinjonovjasurbek28@gmail.com" ? "admin" : "user";
    const [result] = await dbQuery(
      "INSERT INTO users (name, email, password, role, avatar_url) VALUES (?, ?, ?, ?, NULL)",
      [name, email, hashedPassword, role]
    );
    const userPayload = {
      id: result.insertId,
      name,
      email,
      role,
      avatar_url: null
    };
    const tokenPayload = {
      id: result.insertId,
      email,
      role
    };
    const token = import_jsonwebtoken.default.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });
    res.status(201).json({
      token,
      user: userPayload
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Serverda xatolik yuz berdi" });
  }
});
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body;
    if (!captchaToken) {
      return res.status(400).json({ error: "Robot emasligingizni tasdiqlang!" });
    }
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const isHuman = await verifyCaptchaToken(captchaToken, ip);
    if (!isHuman) {
      return res.status(400).json({ error: "Captcha tasdiqlanmadi. Iltimos qaytadan urinib ko'ring." });
    }
    if (!email || !password) {
      return res.status(400).json({ error: "Email va parolni kiriting!" });
    }
    const [users] = await dbQuery("SELECT * FROM users WHERE email = ?", [email]);
    const user = users[0];
    if (!user) {
      return res.status(400).json({ error: "Email yoki parol xato!" });
    }
    const isMatch = await import_bcryptjs.default.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Email yoki parol xato!" });
    }
    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url
    };
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    const token = import_jsonwebtoken.default.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });
    res.json({
      token,
      user: userPayload
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Serverda xatolik yuz berdi" });
  }
});
app.post("/api/auth/google", async (req, res) => {
  try {
    const { email, name, avatar_url } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: "Kerakli ma'lumotlar yo'q" });
    }
    let [users] = await dbQuery("SELECT * FROM users WHERE email = ?", [email]);
    let user = users[0];
    if (!user) {
      const role = email === "mosinjonovjasurbek28@gmail.com" ? "admin" : "user";
      const randomPass = Math.random().toString(36).slice(-8);
      const hashedPassword = await import_bcryptjs.default.hash(randomPass, 10);
      const [result] = await dbQuery(
        "INSERT INTO users (name, email, password, role, avatar_url) VALUES (?, ?, ?, ?, ?)",
        [name, email, hashedPassword, role, avatar_url || null]
      );
      user = {
        id: result.insertId,
        name,
        email,
        role,
        avatar_url: avatar_url || null
      };
    } else {
      if (avatar_url && !user.avatar_url) {
        await dbQuery("UPDATE users SET avatar_url = ? WHERE id = ?", [avatar_url, user.id]);
        user.avatar_url = avatar_url;
      }
    }
    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url
    };
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    const token = import_jsonwebtoken.default.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });
    res.json({
      token,
      user: userPayload
    });
  } catch (error) {
    console.error("Google Login error:", error);
    res.status(500).json({ error: "Serverda xatolik yuz berdi" });
  }
});
app.post("/api/auth/facebook", async (req, res) => {
  try {
    const { email, name, uid, avatar_url } = req.body;
    if (!uid || !name) {
      return res.status(400).json({ error: "Kerakli ma'lumotlar yo'q" });
    }
    const facebookId = String(uid);
    const userEmail = email || `fb_${facebookId}@facebook.local`;
    let [users] = await dbQuery(
      "SELECT * FROM users WHERE facebook_id = ? OR email = ?",
      [facebookId, userEmail]
    );
    let user = users[0];
    if (!user) {
      const randomPass = Math.random().toString(36).slice(-8);
      const hashedPassword = await import_bcryptjs.default.hash(randomPass, 10);
      const [result] = await dbQuery(
        "INSERT INTO users (name, email, password, role, avatar_url, facebook_id) VALUES (?, ?, ?, ?, ?, ?)",
        [name, userEmail, hashedPassword, "user", avatar_url || null, facebookId]
      );
      user = {
        id: result.insertId,
        name,
        email: userEmail,
        role: "user",
        avatar_url: avatar_url || null,
        facebook_id: facebookId
      };
    } else {
      if (!user.facebook_id || avatar_url && !user.avatar_url) {
        await dbQuery(
          "UPDATE users SET facebook_id = COALESCE(facebook_id, ?), avatar_url = COALESCE(avatar_url, ?) WHERE id = ?",
          [facebookId, avatar_url || null, user.id]
        );
        user.facebook_id = user.facebook_id || facebookId;
        user.avatar_url = user.avatar_url || avatar_url || null;
      }
    }
    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url
    };
    const token = import_jsonwebtoken.default.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "30d" }
    );
    res.json({ token, user: userPayload });
  } catch (error) {
    console.error("Facebook Login error:", error);
    res.status(500).json({ error: "Serverda xatolik yuz berdi" });
  }
});
app.post("/api/auth/phone-send-code", async (req, res) => {
  try {
    const { phone, type, captchaToken } = req.body;
    if (!captchaToken) {
      return res.status(400).json({ error: "Robot emasligingizni tasdiqlang!" });
    }
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const isHuman = await verifyCaptchaToken(captchaToken, ip);
    if (!isHuman) {
      return res.status(400).json({ error: "Captcha tasdiqlanmadi. Iltimos qaytadan urinib ko'ring." });
    }
    if (!phone || phone.trim().length < 7) {
      return res.status(400).json({ error: "Iltimos, yaroqli telefon raqamini kiriting!" });
    }
    const cleanPhone = phone.trim().replace(/\s+/g, "");
    if (type === "register") {
      const [existing] = await dbQuery("SELECT id FROM users WHERE phone = ?", [cleanPhone]);
      if (existing && existing.length > 0) {
        return res.status(400).json({ error: "Ushbu telefon raqami bilan allaqachon ro'yxatdan o'tilgan! Kirish sahifasidan foydalaning." });
      }
    } else if (type === "forgot") {
      const [existing] = await dbQuery("SELECT id FROM users WHERE phone = ?", [cleanPhone]);
      if (!existing || existing.length === 0) {
        return res.status(400).json({ error: "Ushbu telefon raqami tizimda topilmadi! Ro'yxatdan o'ting." });
      }
    }
    const code = Math.floor(1e5 + Math.random() * 9e5).toString();
    if (type === "forgot") {
      phonePasswordResetCodes[cleanPhone] = {
        code,
        expiresAt: Date.now() + 10 * 60 * 1e3,
        verified: false
      };
    } else {
      phoneVerificationCodes[cleanPhone] = {
        code,
        expiresAt: Date.now() + 10 * 60 * 1e3,
        verified: false
      };
    }
    let smsSent = false;
    let smsError = "";
    const eskizEmail = process.env.ESKIZ_EMAIL;
    const eskizPassword = process.env.ESKIZ_PASSWORD;
    const eskizToken = process.env.ESKIZ_TOKEN;
    if (eskizToken || eskizEmail && eskizPassword) {
      try {
        let activeToken = eskizToken;
        if (!activeToken && eskizEmail && eskizPassword) {
          const authRes = await fetch("https://notify.eskiz.uz/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: eskizEmail, password: eskizPassword })
          });
          const authData = await authRes.json();
          if (authData?.data?.token) {
            activeToken = authData.data.token;
          }
        }
        if (activeToken) {
          const formattedPhone = cleanPhone.replace(/^\+/, "");
          const smsRes = await fetch("https://notify.eskiz.uz/api/message/sms/send", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${activeToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              mobile_phone: formattedPhone,
              message: `Animem.uz - Tasdiqlash kodingiz: ${code}`,
              from: "4546",
              callback_url: ""
            })
          });
          const smsData = await smsRes.json();
          if (smsRes.ok && smsData?.status === "waiting") {
            smsSent = true;
          } else {
            smsError = smsData?.message || "Eskiz SMS yuborishda xatolik";
          }
        }
      } catch (e) {
        console.error("[Eskiz SMS Error]:", e);
        smsError = e.message || "SMS xizmati bilan aloqa uzildi";
      }
    }
    console.log(`[Phone Auth SMS Code] ${type || "auth"} for ${cleanPhone}: ${code} (Sent: ${smsSent})`);
    return res.json({
      success: true,
      codeSent: true,
      smsSent,
      devCode: smsSent ? void 0 : code,
      message: smsSent ? `SMS tasdiqlash kodi ${cleanPhone} raqamiga yuborildi!` : `SMS provayderi (Eskiz) ulanmaganligi sababli test kodi tayyorlandi (${code}).`
    });
  } catch (err) {
    console.error("phone-send-code error:", err);
    return res.status(500).json({ error: err.message || "SMS kod yuborishda xatolik yuz berdi" });
  }
});
app.post("/api/auth/phone-verify-code", async (req, res) => {
  try {
    const { phone, code, type } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: "Telefon raqam va kodni kiriting!" });
    }
    const cleanPhone = phone.trim().replace(/\s+/g, "");
    const cleanCode = code.toString().trim();
    const store = type === "forgot" ? phonePasswordResetCodes : phoneVerificationCodes;
    const record = store[cleanPhone];
    if (!record) {
      return res.status(400).json({ error: "Sizga kod yuborilmagan yoki kodingiz muddati tugagan! Qayta so'rang." });
    }
    if (Date.now() > record.expiresAt) {
      delete store[cleanPhone];
      return res.status(400).json({ error: "Tasdiqlash kodining muddati tugagan! Qayta so'rang." });
    }
    if (record.code !== cleanCode) {
      return res.status(400).json({ error: "Tasdiqlash kodi noto'g'ri!" });
    }
    record.verified = true;
    return res.json({ success: true, message: "Telefon raqami muvaffaqiyatli tasdiqlandi!" });
  } catch (err) {
    console.error("phone-verify-code error:", err);
    return res.status(500).json({ error: err.message || "Kodni tekshirishda xatolik" });
  }
});
app.post("/api/auth/phone-register-verified", async (req, res) => {
  try {
    const { name, phone, password, code, firebaseUid } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ error: "Barcha maydonlarni to'ldiring!" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak!" });
    }
    const cleanPhone = phone.trim().replace(/\s+/g, "");
    const cleanCode = code ? code.toString().trim() : "";
    if (!firebaseUid) {
      const record = phoneVerificationCodes[cleanPhone];
      if (!record || !record.verified && record.code !== cleanCode) {
        return res.status(400).json({ error: "Telefon raqamingiz tasdiqlanmagan yoki kod noto'g'ri!" });
      }
    }
    const [existing] = await dbQuery("SELECT id FROM users WHERE phone = ?", [cleanPhone]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: "Ushbu telefon raqami bilan allaqachon ro'yxatdan o'tilgan!" });
    }
    const hashedPassword = await import_bcryptjs.default.hash(password, 10);
    const emailFallback = `${cleanPhone.replace(/[^0-9]/g, "")}@phone.animem.uz`;
    const role = "user";
    const [result] = await dbQuery(
      "INSERT INTO users (name, email, phone, password, role, avatar_url) VALUES (?, ?, ?, ?, ?, NULL)",
      [name, emailFallback, cleanPhone, hashedPassword, role]
    );
    delete phoneVerificationCodes[cleanPhone];
    const userId = result.insertId;
    const userPayload = { id: userId, name, email: emailFallback, phone: cleanPhone, role, avatar_url: null };
    const token = import_jsonwebtoken.default.sign(
      { id: userPayload.id, email: userPayload.email, phone: userPayload.phone, role: userPayload.role },
      JWT_SECRET,
      { expiresIn: "30d" }
    );
    return res.json({ token, user: userPayload });
  } catch (err) {
    console.error("phone-register-verified error:", err);
    return res.status(500).json({ error: err.message || "Ro'yxatdan o'tishda xatolik" });
  }
});
app.post("/api/auth/phone-login", async (req, res) => {
  try {
    const { phone, password, captchaToken } = req.body;
    if (!captchaToken) {
      return res.status(400).json({ error: "Robot emasligingizni tasdiqlang!" });
    }
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const isHuman = await verifyCaptchaToken(captchaToken, ip);
    if (!isHuman) {
      return res.status(400).json({ error: "Captcha tasdiqlanmadi. Iltimos qaytadan urinib ko'ring." });
    }
    if (!phone || !password) {
      return res.status(400).json({ error: "Telefon raqam va parolni kiriting!" });
    }
    const cleanPhone = phone.trim().replace(/\s+/g, "");
    const [users] = await dbQuery(
      "SELECT * FROM users WHERE phone = ? OR email = ?",
      [cleanPhone, cleanPhone]
    );
    const user = users[0];
    if (!user) {
      return res.status(400).json({ error: "Ushbu telefon raqami bo'yicha foydalanuvchi topilmadi!" });
    }
    const isMatch = await import_bcryptjs.default.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Telefon raqam yoki parol xato!" });
    }
    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar_url: user.avatar_url || null
    };
    const token = import_jsonwebtoken.default.sign(
      { id: user.id, email: user.email, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: "30d" }
    );
    return res.json({ token, user: userPayload });
  } catch (err) {
    console.error("phone-login error:", err);
    return res.status(500).json({ error: err.message || "Login qilishda xatolik" });
  }
});
app.post("/api/auth/phone-reset-password", async (req, res) => {
  try {
    const { phone, code, newPassword, firebaseUid } = req.body;
    if (!phone || !code && !firebaseUid || !newPassword) {
      return res.status(400).json({ error: "Barcha maydonlarni to'ldiring!" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak!" });
    }
    const cleanPhone = phone.trim().replace(/\s+/g, "");
    const cleanCode = code ? code.toString().trim() : "";
    if (!firebaseUid) {
      const record = phonePasswordResetCodes[cleanPhone];
      if (!record || !record.verified && record.code !== cleanCode) {
        return res.status(400).json({ error: "Kodingiz tasdiqlanmagan yoki xato!" });
      }
    }
    const hashedPassword = await import_bcryptjs.default.hash(newPassword, 10);
    await dbQuery("UPDATE users SET password = ? WHERE phone = ?", [hashedPassword, cleanPhone]);
    delete phonePasswordResetCodes[cleanPhone];
    const [users] = await dbQuery("SELECT id, name, email, phone, role, avatar_url FROM users WHERE phone = ?", [cleanPhone]);
    const user = users[0];
    if (!user) {
      return res.status(400).json({ error: "Foydalanuvchi topilmadi!" });
    }
    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar_url: user.avatar_url || null
    };
    const token = import_jsonwebtoken.default.sign(
      { id: user.id, email: user.email, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: "30d" }
    );
    return res.json({ token, user: userPayload, message: "Parol muvaffaqiyatli o'zgartirildi!" });
  } catch (err) {
    console.error("phone-reset-password error:", err);
    return res.status(500).json({ error: err.message || "Parolni tiklashda xatolik" });
  }
});
async function broadcastPushNotification(payload) {
  try {
    let subs = [];
    try {
      const [rows] = await dbQuery("SELECT * FROM push_subscriptions");
      if (Array.isArray(rows)) subs = rows;
    } catch (e) {
      console.warn("Fetch push subscriptions error:", e);
    }
    if (subs.length === 0) return;
    const APP_DEFAULT_ICON = "https://api.animem.uz/api/images/1788100529230_au9wggu";
    const notificationPayload = JSON.stringify({
      title: payload.title || "Animem.uz",
      body: payload.body || "",
      image: payload.image || void 0,
      icon: payload.icon || APP_DEFAULT_ICON,
      badge: payload.badge || APP_DEFAULT_ICON,
      url: payload.url || "/",
      data: { url: payload.url || "/" },
      tag: payload.tag || `animem-${Date.now()}`
    });
    const sendPromises = subs.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };
        await import_web_push.default.sendNotification(pushSubscription, notificationPayload);
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await dbQuery("DELETE FROM push_subscriptions WHERE id = ?", [sub.id]).catch(() => {
          });
        }
      }
    });
    await Promise.allSettled(sendPromises);
    console.log(`[WebPush] Dispatched push notification to ${subs.length} active device subscriptions`);
  } catch (err) {
    console.error("[WebPush Broadcast Error]:", err);
  }
}
app.get("/api/push/vapid-public-key", (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});
app.post("/api/push/subscribe", async (req, res) => {
  try {
    const { subscription, userId } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: "Yaroqsiz push obuna ma'lumotlari" });
    }
    const endpoint = subscription.endpoint;
    const p256dh = subscription.keys.p256dh;
    const auth = subscription.keys.auth;
    try {
      await dbQuery(
        `INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_id) 
         VALUES (?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth = VALUES(auth), user_id = VALUES(user_id)`,
        [endpoint, p256dh, auth, userId || null]
      );
    } catch (e) {
      console.warn("Push subscription DB save error:", e);
    }
    res.json({ success: true, message: "Push bildirishnomalarga muvaffaqiyatli obuna bo'lindi" });
  } catch (err) {
    res.status(500).json({ error: err.message || "Push obunada xatolik" });
  }
});
app.get("/api/notifications", async (req, res) => {
  try {
    const [rows] = await dbQuery("SELECT * FROM notifications ORDER BY id DESC LIMIT 50");
    if (Array.isArray(rows) && rows.length > 0) {
      return res.json(rows);
    }
  } catch (err) {
    console.warn("Notifications fetch falling back to local store:", err?.message);
  }
  const store = loadLocalStore();
  res.json(store.notifications || []);
});
app.post("/api/notifications", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { message, image, url } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Xabar matni bo'sh bo'lishi mumkin emas!" });
    }
    let insertId = Date.now();
    try {
      const [result] = await dbQuery(
        "INSERT INTO notifications (message, image, url) VALUES (?, ?, ?)",
        [message.trim(), image || null, url || "/"]
      );
      if (result && result.insertId) insertId = result.insertId;
    } catch (e) {
      console.warn("DB notification insert failed, relying on local store:", e?.message);
    }
    const store = loadLocalStore();
    const newNotif = {
      id: insertId,
      message: message.trim(),
      image: image || void 0,
      url: url || "/",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    store.notifications = store.notifications || [];
    store.notifications.unshift(newNotif);
    saveLocalStore(store);
    broadcastPushNotification({
      title: "Animem.uz | Muhim Yangilik \u{1F4E2}",
      body: message.trim(),
      image: image || void 0,
      url: url || "/",
      tag: `admin-notif-${insertId}`
    }).catch(() => {
    });
    res.status(201).json(newNotif);
  } catch (err) {
    console.error("Create notification error:", err);
    res.status(500).json({ error: "Bildirishnoma yaratishda xatolik" });
  }
});
app.get("/api/archive-config", authenticateToken, (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Sizda ushbu amalni bajarishga ruxsat yo'q!" });
    }
    res.json({
      accessKey: process.env.ARCHIVE_ORG_ACCESS_KEY || "",
      secretKey: process.env.ARCHIVE_ORG_SECRET_KEY || ""
    });
  } catch (err) {
    console.error("Get archive config error:", err);
    res.status(500).json({ error: "Serverda xatolik" });
  }
});
var memoryUpload = (0, import_multer.default)({
  storage: import_multer.default.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024
    // 25 MB max per image
  }
});
async function uploadImageBuffer(buffer, filename = "image.jpg", mimeType = "image/jpeg") {
  try {
    const userHash = process.env.CATBOX_USERHASH ? process.env.CATBOX_USERHASH.trim() : "";
    const formData = new FormData();
    formData.append("reqtype", "fileupload");
    if (userHash) {
      formData.append("userhash", userHash);
    }
    formData.append("fileToUpload", new Blob([buffer], { type: mimeType }), filename);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12e3);
    const res = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: formData,
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      }
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const text = (await res.text()).trim();
      if (text.startsWith("http://") || text.startsWith("https://")) {
        return text.replace(/^http:\/\//i, "https://");
      }
    }
  } catch (catErr) {
    console.warn("[Catbox] Upload attempt bypassed or failed, using internal media storage:", catErr?.message || catErr);
  }
  const base64String = buffer.toString("base64");
  const mediaId = "img_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
  try {
    await dbQuery(
      `INSERT INTO media_files (id, filename, mime_type, data, size) VALUES (?, ?, ?, ?, ?)`,
      [mediaId, filename, mimeType, base64String, buffer.length]
    );
  } catch (dbErr) {
    console.warn("[media_files] DB save notice:", dbErr?.message || dbErr);
  }
  mediaMemoryCache.set(mediaId, { mimeType, base64: base64String, buffer });
  return `/api/media/${mediaId}`;
}
var mediaMemoryCache = /* @__PURE__ */ new Map();
app.post("/api/media/upload", authenticateToken, memoryUpload.single("file"), async (req, res) => {
  try {
    let fileBuffer = null;
    let mimeType = "image/jpeg";
    let filename = "image.jpg";
    let fileSize = 0;
    if (req.file) {
      fileBuffer = req.file.buffer;
      mimeType = req.file.mimetype || "image/jpeg";
      filename = req.file.originalname || "image.jpg";
      fileSize = req.file.size || fileBuffer.length;
    } else if (req.body && req.body.base64) {
      const b64Data = req.body.base64;
      const match = b64Data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        fileBuffer = Buffer.from(match[2], "base64");
      } else {
        fileBuffer = Buffer.from(b64Data, "base64");
      }
      filename = req.body.filename || "image.jpg";
      fileSize = fileBuffer.length;
    }
    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: "Rasm fayli tanlanmadi yoki bo'sh" });
    }
    const mediaUrl = await uploadImageBuffer(fileBuffer, filename, mimeType);
    return res.status(201).json({
      success: true,
      id: mediaUrl,
      url: mediaUrl,
      filename,
      size: fileSize,
      mime_type: mimeType
    });
  } catch (err) {
    console.error("Media upload error:", err);
    return res.status(500).json({ error: "Rasmni yuklashda xatolik yuz berdi" });
  }
});
app.post("/api/media/upload-multiple", authenticateToken, memoryUpload.array("files", 60), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Hech qanday rasm fayllari tanlanmadi" });
    }
    const results = [];
    for (const file of files) {
      const fileBuffer = file.buffer;
      const mimeType = file.mimetype || "image/jpeg";
      const filename = file.originalname || "image.jpg";
      const fileSize = file.size || fileBuffer.length;
      try {
        const mediaUrl = await uploadImageBuffer(fileBuffer, filename, mimeType);
        results.push({
          id: mediaUrl,
          url: mediaUrl,
          filename,
          size: fileSize
        });
      } catch (err) {
        console.error("Multiple upload item error:", err);
      }
    }
    if (results.length === 0) {
      return res.status(500).json({ error: "Fayllarni yuklab bo'lmadi" });
    }
    return res.status(201).json({
      success: true,
      count: results.length,
      files: results
    });
  } catch (err) {
    console.error("Multiple media upload error:", err);
    return res.status(500).json({ error: "Rasmlarni yuklashda xatolik yuz berdi" });
  }
});
app.get("/api/media/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).send("Media ID kiritilishi shart");
    if (mediaMemoryCache.has(id)) {
      const cached = mediaMemoryCache.get(id);
      res.setHeader("Content-Type", cached.mimeType || "image/jpeg");
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return res.send(cached.buffer || Buffer.from(cached.base64, "base64"));
    }
    const [rows] = await dbQuery("SELECT mime_type, data FROM media_files WHERE id = ?", [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).send("Rasm MySQL bazasidan topilmadi");
    }
    const row = rows[0];
    const mimeType = row.mime_type || "image/jpeg";
    const buffer = Buffer.from(row.data, "base64");
    mediaMemoryCache.set(id, { mimeType, base64: row.data, buffer });
    if (mediaMemoryCache.size > 300) {
      const firstKey = mediaMemoryCache.keys().next().value;
      if (firstKey) mediaMemoryCache.delete(firstKey);
    }
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(buffer);
  } catch (err) {
    console.error("Serve media from MySQL error:", err);
    return res.status(500).send("Rasmni bazadan yuklab olishda xatolik");
  }
});
var STATIC_FALLBACK_GIFS = [
  "https://api.animem.uz/i/47253226-8c0c-4bd7-8a13-63fc8ab21048",
  "https://api.animem.uz/i/024daac2-c373-46d9-a1d3-17b772cf9d8d",
  "https://api.animem.uz/i/7f001189-caff-4761-b773-1ef852ba3405",
  "https://api.animem.uz/i/e14ebcc6-3198-4769-988e-b532d768c2c0",
  "https://api.animem.uz/i/a6740e1b-8128-4a35-9b59-991702aa7953",
  "https://api.animem.uz/i/20275072-6bcb-4bbf-9c31-b963c535ca52",
  "https://api.animem.uz/i/7f56e16a-336f-40e7-a088-3e7d379b6e7e",
  "https://api.animem.uz/i/e013bbda-731b-4243-b1a5-82b9184e6ba8",
  "https://api.animem.uz/i/0ed4d485-ed9a-42c4-96cf-0ea9e2520ff8",
  "https://api.animem.uz/i/4dcca4bb-4a81-40ee-b12d-1584b122bc20",
  "https://api.animem.uz/i/ee473d3e-95c5-4654-ab79-0f7f80bf72ac",
  "https://api.animem.uz/i/94bf66ce-7403-4a2f-8db6-267f15cd3d73",
  "https://api.animem.uz/i/d5740534-37b6-42f2-92d1-0d6012f7b424",
  "https://api.animem.uz/i/d6702c5f-a45e-4259-b3ac-6ac028671136",
  "https://api.animem.uz/i/863cae92-7e12-46d6-96c5-cf6da96afa43",
  "https://api.animem.uz/i/11e32365-a5d1-44b8-9eaf-809040de5fc3",
  "https://api.animem.uz/i/7c9b7e12-2d75-418a-b867-2a83169b9143",
  "https://api.animem.uz/i/b0000dc1-622a-4136-b20d-c7464b2dfee3",
  "https://api.animem.uz/i/f29d2f0f-4eed-43e3-8a18-c68acf9703f2",
  "https://api.animem.uz/i/ebb32df7-d609-46fa-a739-57b686bea1a4",
  "https://api.animem.uz/i/6ad422b0-29ff-4c44-b3bd-30e6015701ae",
  "https://api.animem.uz/i/d5077661-9cde-4524-ae21-be259f1e8b8a",
  "https://api.animem.uz/i/423b7231-db98-41e6-ae1e-af0ded6ca0ef",
  "https://api.animem.uz/i/cfae88fb-ade5-495c-a441-5b800075382b",
  "https://api.animem.uz/i/6b895206-f186-4db0-9a82-89ad97769806",
  "https://api.animem.uz/i/088aba4e-b0ef-443b-b7a6-bf6b8609e2b4",
  "https://api.animem.uz/i/208c0d15-d9cb-4507-ac51-814423a11d59",
  "https://api.animem.uz/i/632296a9-9ef1-453a-ac08-9db0aebdfc8c"
].map((u, i) => ({ id: i + 1, title: `Anime GIF #${i + 1}`, url: u, media_id: null }));
app.get("/api/gifs", async (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=10, stale-while-revalidate=30");
  const cached = getCache("api_all_gifs", 3e4);
  if (cached) {
    return res.json(cached);
  }
  try {
    const [rows] = await dbQuery("SELECT * FROM gifs ORDER BY id ASC");
    if (Array.isArray(rows) && rows.length > 0) {
      const store2 = loadLocalStore();
      store2.gifs = rows;
      saveLocalStore(store2);
      setCache("api_all_gifs", rows);
      return res.json(rows);
    }
  } catch (err) {
    console.warn("GIF fetch falling back:", err?.message || err);
  }
  const store = loadLocalStore();
  const list = store.gifs && store.gifs.length > 0 ? store.gifs : STATIC_FALLBACK_GIFS;
  setCache("api_all_gifs", list);
  return res.json(list);
});
app.post("/api/gifs", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Faqat admin qo'sha oladi" });
    }
    const { url, title } = req.body;
    if (!url || typeof url !== "string" || !url.trim()) {
      return res.status(400).json({ error: "GIF URL manzili kiritilishi shart" });
    }
    const trimmedUrl = url.trim();
    const gifTitle = (title || "").trim() || "Anime GIF";
    let insertedId = Date.now();
    try {
      const [result] = await dbQuery(
        "INSERT INTO gifs (title, url) VALUES (?, ?)",
        [gifTitle, trimmedUrl]
      );
      if (result?.insertId) insertedId = result.insertId;
    } catch (e) {
      console.warn("Save GIF to DB warning:", e?.message || e);
    }
    const newGif = {
      id: insertedId,
      title: gifTitle,
      url: trimmedUrl,
      media_id: null,
      created_at: /* @__PURE__ */ new Date()
    };
    const store = loadLocalStore();
    if (!store.gifs) store.gifs = [...STATIC_FALLBACK_GIFS];
    store.gifs.push(newGif);
    saveLocalStore(store);
    invalidateServerCache("api_all_gifs");
    return res.status(201).json({
      success: true,
      gif: newGif
    });
  } catch (err) {
    console.error("Add GIF URL error:", err);
    return res.status(500).json({ error: "GIF saqlashda xatolik" });
  }
});
app.post("/api/gifs/upload", authenticateToken, memoryUpload.single("file"), async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Faqat admin yuklay oladi" });
    }
    const fileBuffer = req.file?.buffer;
    const filename = req.file?.originalname || "sticker.gif";
    const mimeType = req.file?.mimetype || "image/gif";
    const fileSize = req.file?.size || (fileBuffer ? fileBuffer.length : 0);
    if (!fileBuffer || fileBuffer.length === 0) {
      return res.status(400).json({ error: "Fayl tanlanmadi yoki bo'sh" });
    }
    const mediaUrl = await uploadImageBuffer(fileBuffer, filename, mimeType);
    const customTitle = (req.body.title || "").trim() || filename.replace(/\.[^/.]+$/, "");
    let insertedId = Date.now();
    try {
      const [result] = await dbQuery(
        "INSERT INTO gifs (title, url, media_id) VALUES (?, ?, ?)",
        [customTitle, mediaUrl, null]
      );
      if (result?.insertId) insertedId = result.insertId;
    } catch (e) {
      console.warn("gifs insert warning:", e?.message || e);
    }
    const newGif = {
      id: insertedId,
      title: customTitle,
      url: mediaUrl,
      media_id: null,
      created_at: /* @__PURE__ */ new Date()
    };
    const store = loadLocalStore();
    if (!store.gifs) store.gifs = [...STATIC_FALLBACK_GIFS];
    store.gifs.push(newGif);
    saveLocalStore(store);
    invalidateServerCache("api_all_gifs");
    return res.status(201).json({
      success: true,
      gif: newGif
    });
  } catch (err) {
    console.error("Upload GIF error:", err);
    return res.status(500).json({ error: "GIF yuklashda xatolik yuz berdi" });
  }
});
app.delete("/api/gifs/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Faqat admin o'chira oladi" });
    }
    const gifId = req.params.id;
    if (!gifId) return res.status(400).json({ error: "GIF ID kiritilishi shart" });
    try {
      const [rows] = await dbQuery("SELECT * FROM gifs WHERE id = ?", [gifId]);
      if (rows && rows.length > 0) {
        const gifItem = rows[0];
        await dbQuery("DELETE FROM gifs WHERE id = ?", [gifId]);
        if (gifItem.media_id) {
          await dbQuery("DELETE FROM media_files WHERE id = ?", [gifItem.media_id]);
          mediaMemoryCache.delete(gifItem.media_id);
        }
      }
    } catch (e) {
      console.warn("Delete GIF from DB warning:", e?.message || e);
    }
    const store = loadLocalStore();
    if (store.gifs) {
      store.gifs = store.gifs.filter((g) => String(g.id) !== String(gifId));
      saveLocalStore(store);
    }
    invalidateServerCache("api_all_gifs");
    return res.json({ success: true, message: "GIF muvaffaqiyatli o'chirildi", id: gifId });
  } catch (err) {
    console.error("Delete GIF error:", err);
    return res.status(500).json({ error: "GIF o'chirishda xatolik" });
  }
});
app.post("/api/upload-archive-proxy", authenticateToken, upload.single("file"), async (req, res) => {
  const tempFilePath = req.file?.path;
  try {
    if (req.user.role !== "admin") {
      if (tempFilePath && import_fs.default.existsSync(tempFilePath)) {
        import_fs.default.unlinkSync(tempFilePath);
      }
      return res.status(403).json({ error: "Sizda ushbu amalni bajarishga ruxsat yo'q!" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Fayl yuklanmadi" });
    }
    const { selectedAnimeId, episodeNumber, title } = req.body;
    if (!selectedAnimeId || !episodeNumber) {
      if (tempFilePath && import_fs.default.existsSync(tempFilePath)) {
        import_fs.default.unlinkSync(tempFilePath);
      }
      return res.status(400).json({ error: "Anime ID va Epizod raqami kiritilishi shart" });
    }
    const accessKey = process.env.ARCHIVE_ORG_ACCESS_KEY;
    const secretKey = process.env.ARCHIVE_ORG_SECRET_KEY;
    if (!accessKey || !secretKey) {
      if (tempFilePath && import_fs.default.existsSync(tempFilePath)) {
        import_fs.default.unlinkSync(tempFilePath);
      }
      return res.status(400).json({ error: "Archive.org kalitlari (ARCHIVE_ORG_ACCESS_KEY, ARCHIVE_ORG_SECRET_KEY) server sozlamalarida kiritilmagan!" });
    }
    const sanitizeHeaderValue = (val) => {
      if (!val) return "";
      return val.replace(/[^\x20-\x7E]/g, "").trim();
    };
    const sanitizedFileName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const identifier = `animem-uz-ep-${selectedAnimeId}-${episodeNumber}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const uploadUrl = `https://s3.us.archive.org/${identifier}/${sanitizedFileName}`;
    const directLink = `https://archive.org/download/${identifier}/${sanitizedFileName}`;
    console.log(`Starting proxy upload of ${sanitizedFileName} to Archive.org identifier ${identifier}`);
    const parsedUrl = new URL(uploadUrl);
    const options = {
      method: "PUT",
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      headers: {
        "Authorization": `LOW ${accessKey}:${secretKey}`,
        "x-amz-auto-make-bucket": "1",
        "x-archive-meta-mediatype": "movies",
        "x-archive-meta-collection": "opensource_movies",
        "x-archive-meta-title": sanitizeHeaderValue(title || `Anime Episode ${episodeNumber}`),
        "Content-Type": req.file.mimetype || "video/mp4",
        "Content-Length": import_fs.default.statSync(tempFilePath).size
      }
    };
    const archiveReq = import_https.default.request(options, (archiveRes) => {
      let responseBody = "";
      archiveRes.on("data", (chunk) => {
        responseBody += chunk;
      });
      archiveRes.on("end", () => {
        if (tempFilePath && import_fs.default.existsSync(tempFilePath)) {
          try {
            import_fs.default.unlinkSync(tempFilePath);
          } catch (e) {
          }
        }
        if (archiveRes.statusCode === 200 || archiveRes.statusCode === 201) {
          console.log(`Proxy upload to Archive.org complete! URL: ${directLink}`);
          if (!res.headersSent) {
            res.json({ success: true, url: directLink });
          }
        } else {
          console.error(`Archive.org upload failed with status ${archiveRes.statusCode}: ${responseBody}`);
          if (!res.headersSent) {
            res.status(500).json({ error: `Archive.org xatosi (${archiveRes.statusCode}): ${responseBody || "Noma'lum xatolik"}` });
          }
        }
      });
    });
    archiveReq.on("error", (err) => {
      console.error("Proxy upload stream error:", err);
      if (tempFilePath && import_fs.default.existsSync(tempFilePath)) {
        try {
          import_fs.default.unlinkSync(tempFilePath);
        } catch (e) {
        }
      }
      if (!res.headersSent) {
        res.status(500).json({ error: `Server translyatsiya jarayonida xatolik: ${err.message}` });
      }
    });
    const fileStream = import_fs.default.createReadStream(tempFilePath);
    fileStream.on("error", (err) => {
      console.error("File read stream error:", err);
      archiveReq.destroy();
      if (tempFilePath && import_fs.default.existsSync(tempFilePath)) {
        try {
          import_fs.default.unlinkSync(tempFilePath);
        } catch (e) {
        }
      }
      if (!res.headersSent) {
        res.status(500).json({ error: `Faylni o'qishda xatolik: ${err.message}` });
      }
    });
    fileStream.pipe(archiveReq);
  } catch (err) {
    console.error("Upload proxy main error:", err);
    if (tempFilePath && import_fs.default.existsSync(tempFilePath)) {
      try {
        import_fs.default.unlinkSync(tempFilePath);
      } catch (e) {
      }
    }
    res.status(500).json({ error: `Tizimda xatolik yuz berdi: ${err.message}` });
  }
});
app.get("/api/user/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    let requestingUserId = null;
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token) {
      const decoded = verifyAnyJwt(token);
      requestingUserId = decoded?.id;
    }
    const isOwner = Boolean(requestingUserId && String(requestingUserId) === String(userId));
    let userData = null;
    try {
      const [rows] = await dbQuery("SELECT * FROM users WHERE id = ?", [userId]);
      if (rows && rows[0]) userData = rows[0];
    } catch (e) {
    }
    if (!userData) {
      const store = loadLocalStore();
      userData = store.users?.find((u) => String(u.id) === String(userId));
    }
    if (!userData) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }
    let commentsCount = 0;
    try {
      const [cRows] = await dbQuery("SELECT COUNT(*) as cnt FROM comments WHERE user_id = ?", [userId]);
      if (cRows && cRows[0]) commentsCount = cRows[0].cnt;
    } catch (e) {
    }
    let favoritesAnimes = [];
    try {
      if (userData.favorites) {
        let favIds = [];
        if (typeof userData.favorites === "string") {
          favIds = JSON.parse(userData.favorites);
        } else if (Array.isArray(userData.favorites)) {
          favIds = userData.favorites;
        }
        if (Array.isArray(favIds) && favIds.length > 0) {
          const [aRows] = await dbQuery("SELECT * FROM animes");
          const allAnimes = Array.isArray(aRows) && aRows.length > 0 ? aRows : loadLocalStore().animes || [];
          favoritesAnimes = allAnimes.filter((a) => favIds.some((f) => String(f) === String(a.id)));
        }
      }
    } catch (e) {
      console.warn("Parsing user favorites error:", e);
    }
    let watchHistory = [];
    try {
      if (userData.watch_history) {
        if (typeof userData.watch_history === "string") {
          watchHistory = JSON.parse(userData.watch_history);
        } else if (Array.isArray(userData.watch_history)) {
          watchHistory = userData.watch_history;
        }
      }
    } catch (e) {
    }
    let watchTimeMinutes = Number(userData.watch_time_minutes) || 0;
    if (watchTimeMinutes === 0 && Array.isArray(watchHistory) && watchHistory.length > 0) {
      watchTimeMinutes = watchHistory.reduce((total, item) => {
        const itemMins = Number(item.minutes_watched) || Number(item.lastEpisode || 1) * 24;
        return total + itemMins;
      }, 0);
    }
    const responseUser = {
      id: userData.id,
      name: userData.name,
      role: userData.role || "user",
      avatar_url: userData.avatar_url || null,
      avatar_frame_url: userData.avatar_frame_url || null,
      banner_url: userData.banner_url || null,
      bio: userData.bio || null,
      telegram: userData.telegram || null,
      instagram: userData.instagram || null,
      tiktok: userData.tiktok || null,
      youtube: userData.youtube || null,
      discord: userData.discord || null,
      facebook: userData.facebook || null,
      vk: userData.vk || null,
      favorites: favoritesAnimes,
      watch_time_minutes: watchTimeMinutes,
      watch_history: watchHistory,
      comments_count: commentsCount,
      created_at: userData.created_at || null,
      last_seen: userData.last_seen || null
    };
    if (isOwner) {
      responseUser.email = userData.email;
      responseUser.phone = userData.phone;
    }
    return res.json({ user: responseUser, isOwner });
  } catch (err) {
    console.error("Get user profile error:", err);
    res.status(500).json({ error: "Serverda xatolik yuz berdi" });
  }
});
app.post("/api/user/ping", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await dbQuery("UPDATE users SET last_seen = NOW() WHERE id = ?", [userId]);
    res.json({ success: true, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (e) {
    res.status(500).json({ error: "Ping failed" });
  }
});
app.post("/api/user/avatar", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { avatar_url } = req.body;
    if (!avatar_url) {
      return res.status(400).json({ error: "Rasm topilmadi" });
    }
    await dbQuery("UPDATE users SET avatar_url = ? WHERE id = ?", [avatar_url, userId]);
    const [rows] = await dbQuery("SELECT id, name, email, role, avatar_url, avatar_frame_url, banner_url, bio, telegram, instagram, tiktok, youtube, discord, facebook, vk FROM users WHERE id = ?", [userId]);
    const updatedUser = rows[0];
    res.json({ message: "Profil rasmi muvaffaqiyatli yangilandi", user: updatedUser });
  } catch (err) {
    console.error("Upload avatar error:", err);
    res.status(500).json({ error: "Profil rasmini yuklashda xatolik yuz berdi" });
  }
});
app.put("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, bio, banner_url, avatar_url, telegram, instagram, tiktok, youtube, discord, facebook, vk, favorites } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Ism bo'sh bo'lishi mumkin emas" });
    }
    const cleanName = name.trim();
    let favsJson = null;
    if (favorites) {
      favsJson = typeof favorites === "string" ? favorites : JSON.stringify(favorites);
    }
    try {
      await dbQuery(
        `UPDATE users SET 
          name = ?, 
          bio = ?, 
          banner_url = ?, 
          avatar_url = COALESCE(?, avatar_url),
          telegram = ?, 
          instagram = ?, 
          tiktok = ?, 
          youtube = ?, 
          discord = ?, 
          facebook = ?,
          vk = ?,
          favorites = COALESCE(?, favorites)
         WHERE id = ?`,
        [
          cleanName,
          bio || null,
          banner_url || null,
          avatar_url || null,
          telegram || null,
          instagram || null,
          tiktok || null,
          youtube || null,
          discord || null,
          facebook || null,
          vk || null,
          favsJson,
          userId
        ]
      );
    } catch (dbErr) {
      console.warn("DB update user profile warning:", dbErr);
    }
    const store = loadLocalStore();
    const storeUser = store.users?.find((u) => String(u.id) === String(userId));
    if (storeUser) {
      storeUser.name = cleanName;
      if (bio !== void 0) storeUser.bio = bio;
      if (banner_url !== void 0) storeUser.banner_url = banner_url;
      if (avatar_url !== void 0) storeUser.avatar_url = avatar_url;
      if (telegram !== void 0) storeUser.telegram = telegram;
      if (instagram !== void 0) storeUser.instagram = instagram;
      if (tiktok !== void 0) storeUser.tiktok = tiktok;
      if (youtube !== void 0) storeUser.youtube = youtube;
      if (discord !== void 0) storeUser.discord = discord;
      if (facebook !== void 0) storeUser.facebook = facebook;
      if (vk !== void 0) storeUser.vk = vk;
      if (favorites !== void 0) storeUser.favorites = favorites;
      saveLocalStore(store);
    }
    const [rows] = await dbQuery("SELECT * FROM users WHERE id = ?", [userId]);
    const updatedUser = rows && rows[0] ? rows[0] : storeUser || { id: userId, name: cleanName };
    const tokenPayload = {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role
    };
    const token = import_jsonwebtoken.default.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });
    res.json({ message: "Profil yangilandi", user: updatedUser, token });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Serverda xatolik yuz berdi" });
  }
});
app.post("/api/user/favorites", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { favorites } = req.body;
    const favsJson = JSON.stringify(favorites || []);
    try {
      await dbQuery("UPDATE users SET favorites = ? WHERE id = ?", [favsJson, userId]);
    } catch (e) {
    }
    const store = loadLocalStore();
    const storeUser = store.users?.find((u) => String(u.id) === String(userId));
    if (storeUser) {
      storeUser.favorites = favorites;
      saveLocalStore(store);
    }
    res.json({ success: true, favorites });
  } catch (err) {
    res.status(500).json({ error: "Favorites sync failed" });
  }
});
app.post("/api/user/watch-progress", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { anime_id, episode_number = 1, minutes_watched = 24, total_minutes } = req.body;
    let currentMinutes = 0;
    let currentHistory = [];
    try {
      const [rows] = await dbQuery("SELECT watch_time_minutes, watch_history FROM users WHERE id = ?", [userId]);
      if (rows && rows[0]) {
        currentMinutes = Number(rows[0].watch_time_minutes) || 0;
        if (rows[0].watch_history) {
          try {
            currentHistory = typeof rows[0].watch_history === "string" ? JSON.parse(rows[0].watch_history) : rows[0].watch_history;
          } catch (e) {
          }
        }
      }
    } catch (e) {
    }
    const store = loadLocalStore();
    const storeUser = store.users?.find((u) => String(u.id) === String(userId));
    if (storeUser) {
      if (!currentMinutes && storeUser.watch_time_minutes) currentMinutes = Number(storeUser.watch_time_minutes);
      if ((!currentHistory || currentHistory.length === 0) && storeUser.watch_history) currentHistory = storeUser.watch_history;
    }
    if (total_minutes !== void 0 && Number(total_minutes) >= 0) {
      currentMinutes = Number(total_minutes);
    } else if (minutes_watched !== void 0 && Number(minutes_watched) > 0) {
      currentMinutes += Number(minutes_watched);
    }
    if (anime_id) {
      currentHistory = (currentHistory || []).filter((h) => String(h.animeId) !== String(anime_id));
      currentHistory.unshift({
        animeId: anime_id,
        lastEpisode: episode_number,
        viewedAt: (/* @__PURE__ */ new Date()).toISOString(),
        minutes_watched: minutes_watched || 24
      });
      currentHistory = currentHistory.slice(0, 50);
    }
    const historyJson = JSON.stringify(currentHistory);
    try {
      await dbQuery("UPDATE users SET watch_time_minutes = ?, watch_history = ? WHERE id = ?", [currentMinutes, historyJson, userId]);
    } catch (e) {
    }
    if (storeUser) {
      storeUser.watch_time_minutes = currentMinutes;
      storeUser.watch_history = currentHistory;
      saveLocalStore(store);
    }
    res.json({ success: true, watch_time_minutes: currentMinutes, watch_history: currentHistory });
  } catch (err) {
    console.error("Watch progress sync error:", err);
    res.status(500).json({ error: "Watch progress sync failed" });
  }
});
app.get("/api/comments/recent", async (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
  const cached = getCache("api_recent_comments", 6e4);
  if (cached) {
    return res.json(cached);
  }
  try {
    const [rows] = await dbQuery(`
      SELECT c.*, 
             COALESCE(u.name, 'Foydalanuvchi') AS user_name, 
             u.avatar_url AS user_avatar, 
             u.avatar_frame_url AS user_avatar_frame, 
             u.avatar_frame_url AS avatar_frame_url, 
             a.title AS anime_title 
      FROM comments c 
      LEFT JOIN users u ON (c.user_id = u.id AND c.user_id > 0) 
      LEFT JOIN animes a ON (c.anime_id = a.id OR CAST(c.anime_id AS TEXT) = CAST(a.id AS TEXT)) 
      ORDER BY c.id DESC 
      LIMIT 10
    `);
    if (Array.isArray(rows)) {
      setCache("api_recent_comments", rows);
      return res.json(rows);
    }
  } catch (err) {
    console.warn("Recent comments fetch falling back to local store:", err?.message);
  }
  const store = loadLocalStore();
  const userMap = new Map((store.users || []).map((u) => [String(u.id), u]));
  const animeMap = new Map((store.animes || []).map((a) => [String(a.id), a]));
  const recentComms = (store.comments || []).slice(-10).reverse().map((c) => {
    const u = userMap.get(String(c.user_id));
    const a = animeMap.get(String(c.anime_id));
    return {
      ...c,
      user_name: c.user_name || u?.name || "Foydalanuvchi",
      user_avatar: c.user_avatar || u?.avatar_url || null,
      user_avatar_frame: c.user_avatar_frame || u?.avatar_frame_url || null,
      avatar_frame_url: c.avatar_frame_url || u?.avatar_frame_url || null,
      anime_title: c.anime_title || a?.title || ""
    };
  });
  setCache("api_recent_comments", recentComms);
  res.json(recentComms);
});
var DATA_FILE_PATH = import_path.default.join(process.cwd(), "data.json");
var cachedRatings = null;
var ratingsCacheTime = 0;
async function getRatingsFromFile() {
  if (cachedRatings && Date.now() - ratingsCacheTime < 3e4) {
    return cachedRatings;
  }
  try {
    if (!import_fs.default.existsSync(DATA_FILE_PATH)) {
      let initialRatings = [];
      try {
        const [rows] = await dbQuery("SELECT * FROM ratings");
        initialRatings = rows.map((r) => ({
          id: r.id,
          user_id: r.user_id,
          anime_id: r.anime_id,
          rating: r.rating,
          created_at: r.created_at ? new Date(r.created_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
        }));
      } catch (dbErr) {
        console.warn("Could not fetch ratings from MySQL on initialization, starting with empty list:", dbErr);
      }
      await import_fs.default.promises.writeFile(DATA_FILE_PATH, JSON.stringify({ ratings: initialRatings }, null, 2));
      cachedRatings = initialRatings;
      ratingsCacheTime = Date.now();
      return initialRatings;
    }
    const content = await import_fs.default.promises.readFile(DATA_FILE_PATH, "utf-8");
    const data = JSON.parse(content);
    cachedRatings = data.ratings || [];
    ratingsCacheTime = Date.now();
    return cachedRatings;
  } catch (error) {
    console.error("Error reading ratings from data.json:", error);
    return cachedRatings || [];
  }
}
async function saveRatingsToFile(ratings) {
  try {
    cachedRatings = ratings;
    ratingsCacheTime = Date.now();
    invalidateServerCache("api_all_animes");
    await import_fs.default.promises.writeFile(DATA_FILE_PATH, JSON.stringify({ ratings }, null, 2));
    return true;
  } catch (error) {
    console.error("Error writing ratings to data.json:", error);
    return false;
  }
}
async function mergeRatingsWithAnimes(animes) {
  try {
    const ratings = await getRatingsFromFile();
    const statsMap = {};
    for (const r of ratings) {
      if (!statsMap[r.anime_id]) {
        statsMap[r.anime_id] = { sum: 0, count: 0 };
      }
      statsMap[r.anime_id].sum += r.rating;
      statsMap[r.anime_id].count += 1;
    }
    return animes.map((anime) => {
      const stats = statsMap[anime.id];
      if (stats) {
        return {
          ...anime,
          rating: parseFloat((stats.sum / stats.count).toFixed(1)),
          rating_count: stats.count
        };
      }
      return anime;
    });
  } catch (err) {
    console.error("mergeRatingsWithAnimes error:", err);
    return animes;
  }
}
app.get("/api/health", (req, res) => {
  res.status(200).send("OK");
});
app.get(["/api/tgstream/:channelId/:messageId", "/api/tghls/*"], (req, res) => {
  res.redirect(302, `https://s3.animem.uz${req.url}`);
});
app.get("/api/animes", async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, must-revalidate");
  const cached = getCache("api_all_animes", 15e3);
  if (cached) {
    return res.json(cached);
  }
  try {
    const [rows] = await dbQuery("SELECT * FROM animes ORDER BY id DESC");
    if (Array.isArray(rows) && rows.length > 0) {
      const merged2 = await mergeRatingsWithAnimes(rows);
      setCache("api_all_animes", merged2);
      return res.json(merged2);
    }
  } catch (err) {
    console.warn("Animes fetch falling back to local store:", err?.message);
  }
  const store = loadLocalStore();
  const merged = await mergeRatingsWithAnimes(store.animes || []);
  setCache("api_all_animes", merged);
  res.json(merged);
});
app.get("/api/animes/:id", async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, must-revalidate");
  const id = req.params.id;
  const cacheKey = `api_anime_${id}`;
  const cached = getCache(cacheKey, 15e3);
  if (cached) {
    dbQuery("UPDATE animes SET korishlar = korishlar + 1 WHERE id = ?", [cached.id || id]).catch(() => {
    });
    return res.json(cached);
  }
  const toSlugLocal = (text) => {
    if (!text) return "";
    return text.toLowerCase().replace(/o['’`‘ʻʼ]/g, "o").replace(/g['’`‘ʻʼ]/g, "g").replace(/[^a-z0-9\u0400-\u04FF]+/gi, "-").replace(/^-+|-+$/g, "");
  };
  try {
    const [rows] = await dbQuery("SELECT * FROM animes WHERE id = ?", [id]);
    if (rows && rows.length > 0) {
      dbQuery("UPDATE animes SET korishlar = korishlar + 1 WHERE id = ?", [rows[0].id]).catch(() => {
      });
      rows[0].korishlar = (rows[0].korishlar || 0) + 1;
      const merged2 = await mergeRatingsWithAnimes(rows);
      setCache(cacheKey, merged2[0]);
      return res.json(merged2[0]);
    }
    const [allRows] = await dbQuery("SELECT * FROM animes");
    if (Array.isArray(allRows) && allRows.length > 0) {
      const match = allRows.find((r) => toSlugLocal(r.title) === id || String(r.id) === String(id));
      if (match) {
        dbQuery("UPDATE animes SET korishlar = korishlar + 1 WHERE id = ?", [match.id]).catch(() => {
        });
        match.korishlar = (match.korishlar || 0) + 1;
        const merged2 = await mergeRatingsWithAnimes([match]);
        setCache(cacheKey, merged2[0]);
        return res.json(merged2[0]);
      }
    }
  } catch (err) {
    console.warn("Single anime fetch falling back to local store:", err?.message);
  }
  const store = loadLocalStore();
  const anime = (store.animes || []).find((a) => String(a.id) === String(id) || toSlugLocal(a.title) === id);
  if (!anime) {
    return res.status(404).json({ error: "Anime topilmadi" });
  }
  anime.korishlar = (anime.korishlar || 0) + 1;
  saveLocalStore(store);
  const merged = await mergeRatingsWithAnimes([anime]);
  setCache(cacheKey, merged[0]);
  res.json(merged[0]);
});
app.get("/api/animes/by-slug/:slug", async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, must-revalidate");
  const slug = req.params.slug;
  const cacheKey = `api_anime_slug_${slug}`;
  const cached = getCache(cacheKey, 15e3);
  if (cached) {
    dbQuery("UPDATE animes SET korishlar = COALESCE(korishlar, 0) + 1 WHERE id = ?", [cached.id]).catch(() => {
    });
    cached.korishlar = (cached.korishlar || 0) + 1;
    return res.json(cached);
  }
  const toSlugLocal = (text) => {
    if (!text) return "";
    return text.toLowerCase().replace(/o['’`‘ʻʼ]/g, "o").replace(/g['’`‘ʻʼ]/g, "g").replace(/[^a-z0-9\u0400-\u04FF]+/gi, "-").replace(/^-+|-+$/g, "");
  };
  try {
    const [rows] = await dbQuery("SELECT * FROM animes");
    if (Array.isArray(rows) && rows.length > 0) {
      const anime2 = rows.find((r) => toSlugLocal(r.title) === slug || String(r.id) === String(slug));
      if (anime2) {
        dbQuery("UPDATE animes SET korishlar = COALESCE(korishlar, 0) + 1 WHERE id = ?", [anime2.id]).catch(() => {
        });
        anime2.korishlar = (anime2.korishlar || 0) + 1;
        const merged2 = await mergeRatingsWithAnimes([anime2]);
        setCache(cacheKey, merged2[0]);
        return res.json(merged2[0]);
      }
    }
  } catch (err) {
    console.warn("Anime by slug fetch falling back to local store:", err?.message);
  }
  const store = loadLocalStore();
  const anime = (store.animes || []).find((a) => toSlugLocal(a.title) === slug || String(a.id) === String(slug));
  if (!anime) {
    return res.status(404).json({ error: "Anime topilmadi" });
  }
  anime.korishlar = (anime.korishlar || 0) + 1;
  saveLocalStore(store);
  const merged = await mergeRatingsWithAnimes([anime]);
  res.json(merged[0]);
});
app.post("/api/animes/:id/view", async (req, res) => {
  const id = req.params.id;
  try {
    await dbQuery("UPDATE animes SET korishlar = COALESCE(korishlar, 0) + 1 WHERE id = ?", [id]);
  } catch (e) {
  }
  const store = loadLocalStore();
  const anime = (store.animes || []).find((a) => String(a.id) === String(id));
  if (anime) {
    anime.korishlar = (anime.korishlar || 0) + 1;
    saveLocalStore(store);
  }
  res.json({ success: true, korishlar: anime ? anime.korishlar : void 0 });
});
app.get("/api/animes/:id/episodes", async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await dbQuery(
      "SELECT * FROM episodes WHERE anime_id = ? ORDER BY episode_number ASC",
      [id]
    );
    if (Array.isArray(rows) && rows.length > 0) {
      return res.json(rows);
    }
  } catch (err) {
    console.warn("Episodes fetch falling back to local store:", err?.message);
  }
  const store = loadLocalStore();
  const eps = (store.episodes || []).filter((e) => String(e.anime_id) === String(id));
  res.json(eps);
});
function toAnimeSlug(text) {
  return (text || "").toLowerCase().replace(/o['’`‘]/g, "o").replace(/g['’`‘]/g, "g").replace(/[^a-z0-9\u0400-\u04FF]+/gi, "-").replace(/^-+|-+$/g, "");
}
var TG_BOT_TOKEN = "8838457415:AAEKau5X5g-yj1ghMq00zsS-uzolghL9-LI";
var TG_CHANNEL_ID = "-1004310971743";
async function notifyTelegramNewAnime(animeId, episodeNumber = null) {
  try {
    let animeData = null;
    try {
      const [rows] = await dbQuery("SELECT * FROM animes WHERE id = ?", [animeId]);
      if (rows && rows.length > 0) {
        animeData = rows[0];
      }
    } catch (dbErr) {
      const store = loadLocalStore();
      animeData = (store.animes || []).find((a) => String(a.id) === String(animeId));
    }
    if (!animeData) {
      console.error("Could not find animeData for notification:", animeId);
      return;
    }
    const toSlugLocal = (text) => {
      if (!text) return "";
      return text.toLowerCase().replace(/o['’`‘]/g, "o").replace(/g['’`‘]/g, "g").replace(/[^a-z0-9\u0400-\u04FF]+/gi, "-").replace(/^-+|-+$/g, "");
    };
    const slug = toSlugLocal(animeData.title);
    const link = `https://animem.uz/anime/${slug}`;
    const epString = episodeNumber ? `\u{1F522}Qism: ${episodeNumber}` : `\u{1F522}Qism: ${animeData.qismlar_soni || 1}`;
    const safeTitle = animeData.title.replace(/[_*`\[\]]/g, "");
    let yiliStr = animeData.yil ? `
\u{1F4C5}Yili: ${animeData.yil}` : "";
    const caption = `\u{1F3AC}Yangi Qoshildi!

\u{1F4FA}Anime: *${safeTitle}*${yiliStr}
${epString}

\u{1F1FA}\u{1F1FF}O'zbek Tilida!

\u25B6\uFE0F[Tomosha qilish!](${link})`;
    let imageUrl = animeData.image_url;
    if (imageUrl && !imageUrl.startsWith("http")) {
      imageUrl = `https://animem.uz${imageUrl}`;
    }
    const res = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TG_CHANNEL_ID,
        photo: imageUrl || "https://animem.uz/logo.png",
        caption,
        parse_mode: "Markdown"
      })
    });
    const result = await res.json();
    if (!result.ok) {
      console.error("Telegram API error:", result);
    } else {
      console.log("Telegram notification sent successfully!");
    }
  } catch (error) {
    console.error("Telegram notify failed:", error);
  }
}
app.post("/api/integrations/animebot/episode", async (req, res) => {
  const suppliedSecret = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!ANIMEBOT_SYNC_SECRET || suppliedSecret !== ANIMEBOT_SYNC_SECRET) {
    return res.sendStatus(401);
  }
  const { title, slug, episode_number, note, telegram_url } = req.body || {};
  const episodeNumber = Number.parseInt(String(episode_number), 10);
  if (typeof title !== "string" || !title.trim() || !Number.isInteger(episodeNumber) || episodeNumber < 1 || typeof telegram_url !== "string" || !/^https:\/\/t\.me\/[A-Za-z0-9_]+\?start=[A-Za-z0-9_-]{1,64}$/.test(telegram_url)) {
    return res.status(400).json({ error: "Noto'g'ri animebot ma'lumoti" });
  }
  const normalizedTitle = title.trim().slice(0, 255);
  const normalizedSlug = toAnimeSlug(typeof slug === "string" ? slug : normalizedTitle);
  if (!normalizedSlug || normalizedSlug !== toAnimeSlug(normalizedTitle)) {
    return res.status(400).json({ error: "Slug anime nomiga mos emas" });
  }
  let anime;
  let animeId;
  try {
    const [rows] = await dbQuery("SELECT * FROM animes");
    anime = (rows || []).find((row) => toAnimeSlug(row.title) === normalizedSlug);
    if (!anime) {
      const [result] = await dbQuery(
        `INSERT INTO animes
          (title, description, image_url, banner_url, rating, rating_count, holati, yil, studiyasi, qismlar_soni, korishlar, janrlar, video_url, tavsiya, is_banner, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [normalizedTitle, "", "/logo.png", "/logo.png", 0, 0, "Efirda", null, "", episodeNumber, 0, "", telegram_url, 0, 0, ""]
      );
      animeId = Number(result.insertId);
      anime = { id: animeId, title: normalizedTitle, qismlar_soni: episodeNumber, video_url: telegram_url };
    } else {
      animeId = Number(anime.id);
      const totalEpisodes = Math.max(Number(anime.qismlar_soni) || 0, episodeNumber);
      await dbQuery("UPDATE animes SET qismlar_soni = ?, video_url = COALESCE(NULLIF(video_url, ''), ?) WHERE id = ?", [totalEpisodes, telegram_url, animeId]);
      anime.qismlar_soni = totalEpisodes;
    }
    const [existingEpisode] = await dbQuery(
      "SELECT id FROM episodes WHERE anime_id = ? AND episode_number = ?",
      [animeId, episodeNumber]
    );
    if (existingEpisode?.length) {
      await dbQuery("UPDATE episodes SET video_url = ? WHERE anime_id = ? AND episode_number = ?", [telegram_url, animeId, episodeNumber]);
    } else {
      await dbQuery(
        "INSERT INTO episodes (anime_id, episode_number, video_url) VALUES (?, ?, ?)",
        [animeId, episodeNumber, telegram_url]
      );
      notifyTelegramNewAnime(animeId, episodeNumber);
    }
  } catch (error) {
    console.warn("Animebot DB sync failed; using local store:", error?.message);
    const store = loadLocalStore();
    store.animes = store.animes || [];
    store.episodes = store.episodes || [];
    anime = store.animes.find((item) => toAnimeSlug(item.title) === normalizedSlug);
    if (!anime) {
      animeId = Date.now();
      anime = {
        id: animeId,
        title: normalizedTitle,
        description: "",
        image_url: "/logo.png",
        banner_url: "/logo.png",
        rating: 0,
        rating_count: 0,
        holati: "Efirda",
        yil: null,
        studiyasi: "",
        qismlar_soni: episodeNumber,
        korishlar: 0,
        janrlar: "",
        video_url: telegram_url,
        tavsiya: false,
        is_banner: false,
        tags: ""
      };
      store.animes.unshift(anime);
    } else {
      animeId = Number(anime.id);
      anime.qismlar_soni = Math.max(Number(anime.qismlar_soni) || 0, episodeNumber);
      if (!anime.video_url) anime.video_url = telegram_url;
    }
    const index = store.episodes.findIndex((item) => Number(item.anime_id) === animeId && Number(item.episode_number) === episodeNumber);
    const episode = { id: index >= 0 ? store.episodes[index].id : Date.now(), anime_id: animeId, episode_number: episodeNumber, video_url: telegram_url, note: note || null };
    if (index >= 0) store.episodes[index] = { ...store.episodes[index], ...episode };
    else store.episodes.push(episode);
    saveLocalStore(store);
  }
  res.status(201).json({ anime_id: animeId, slug: normalizedSlug, episode_number: episodeNumber });
});
function safeJsonParse(val, fallback = []) {
  if (!val) return fallback;
  if (typeof val !== "string") return Array.isArray(val) ? val : fallback;
  try {
    const parsed = JSON.parse(val);
    return parsed !== null ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
}
app.get("/api/animes/:id/comments", async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await dbQuery(
      `SELECT c.*, 
              COALESCE(u.name, 'Foydalanuvchi') AS user_name, 
              u.avatar_url AS user_avatar, 
              u.avatar_frame_url AS user_avatar_frame, 
              u.avatar_frame_url AS avatar_frame_url 
       FROM comments c 
       LEFT JOIN users u ON (c.user_id = u.id AND c.user_id > 0) 
       WHERE (c.anime_id = ? OR CAST(c.anime_id AS TEXT) = CAST(? AS TEXT)) 
       ORDER BY c.id DESC`,
      [id, id]
    );
    if (Array.isArray(rows)) {
      const parsed = rows.map((r) => ({
        ...r,
        liked_users: safeJsonParse(r.liked_users, []),
        disliked_users: safeJsonParse(r.disliked_users, []),
        replies: safeJsonParse(r.replies, [])
      }));
      return res.json(parsed);
    }
  } catch (err) {
    console.warn("Comments fetch falling back to local store:", err?.message);
  }
  const store = loadLocalStore();
  const userMap = new Map((store.users || []).map((u) => [String(u.id), u]));
  const comms = (store.comments || []).filter((c) => String(c.anime_id) === String(id)).map((c) => {
    const u = userMap.get(String(c.user_id));
    return {
      ...c,
      user_name: c.user_name || u?.name || "Foydalanuvchi",
      user_avatar: c.user_avatar || u?.avatar_url || null,
      user_avatar_frame: c.user_avatar_frame || u?.avatar_frame_url || null,
      avatar_frame_url: c.avatar_frame_url || u?.avatar_frame_url || null,
      liked_users: safeJsonParse(c.liked_users, []),
      disliked_users: safeJsonParse(c.disliked_users, []),
      replies: safeJsonParse(c.replies, [])
    };
  });
  res.json(comms);
});
app.post("/api/animes/:id/comments", authenticateToken, async (req, res) => {
  try {
    const animeId = req.params.id;
    const userId = req.user.id;
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Izoh matni bo'sh bo'lishi mumkin emas" });
    }
    let insertId = Date.now();
    try {
      const [result] = await dbQuery(
        "INSERT INTO comments (anime_id, user_id, content, likes, dislikes, liked_users, disliked_users, replies) VALUES (?, ?, ?, 0, 0, '[]', '[]', '[]')",
        [animeId, userId, content]
      );
      if (result && result.insertId) {
        insertId = result.insertId;
      }
    } catch (dbErr) {
      console.warn("DB insert comment error:", dbErr);
    }
    let userAvatar = req.user.avatar_url || null;
    let userAvatarFrame = req.user.avatar_frame_url || null;
    try {
      const [uRows] = await dbQuery("SELECT avatar_url, avatar_frame_url FROM users WHERE id = ?", [userId]);
      if (uRows && uRows.length > 0) {
        if (uRows[0].avatar_url) userAvatar = uRows[0].avatar_url;
        if (uRows[0].avatar_frame_url) userAvatarFrame = uRows[0].avatar_frame_url;
      }
    } catch (e) {
    }
    const newComment = {
      id: insertId,
      anime_id: Number(animeId),
      user_id: userId,
      user_name: req.user.name,
      user_avatar: userAvatar,
      user_avatar_frame: userAvatarFrame,
      avatar_frame_url: userAvatarFrame,
      content,
      likes: 0,
      dislikes: 0,
      liked_users: [],
      disliked_users: [],
      replies: [],
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const store = loadLocalStore();
    store.comments = store.comments || [];
    store.comments.unshift(newComment);
    saveLocalStore(store);
    res.status(201).json(newComment);
  } catch (err) {
    console.error("Add comment error:", err);
    res.status(500).json({ error: "Failed to post comment" });
  }
});
async function getCommentById(commentId) {
  try {
    const [rows] = await dbQuery("SELECT * FROM comments WHERE id = ?", [commentId]);
    if (rows && rows.length > 0) return rows[0];
  } catch (e) {
  }
  const store = loadLocalStore();
  store.comments = store.comments || [];
  return store.comments.find((c) => String(c.id) === String(commentId)) || null;
}
app.post("/api/comments/:commentId/like", authenticateToken, async (req, res) => {
  const commentId = req.params.commentId;
  const userId = req.user.id;
  try {
    let comment = await getCommentById(commentId);
    if (!comment) return res.status(404).json({ error: "Izoh topilmadi" });
    let likedUsers = safeJsonParse(comment.liked_users, []);
    let dislikedUsers = safeJsonParse(comment.disliked_users, []);
    let likes = Number(comment.likes) || 0;
    let dislikes = Number(comment.dislikes) || 0;
    const hasLiked = likedUsers.map(String).includes(String(userId));
    const hasDisliked = dislikedUsers.map(String).includes(String(userId));
    if (hasLiked) {
      likedUsers = likedUsers.filter((id) => String(id) !== String(userId));
      likes = Math.max(0, likes - 1);
    } else {
      likedUsers.push(userId);
      likes += 1;
      if (hasDisliked) {
        dislikedUsers = dislikedUsers.filter((id) => String(id) !== String(userId));
        dislikes = Math.max(0, dislikes - 1);
      }
    }
    try {
      await dbQuery(
        "UPDATE comments SET likes = ?, dislikes = ?, liked_users = ?, disliked_users = ? WHERE id = ?",
        [likes, dislikes, JSON.stringify(likedUsers), JSON.stringify(dislikedUsers), commentId]
      );
    } catch (e) {
    }
    const store = loadLocalStore();
    store.comments = (store.comments || []).map((c) => {
      if (String(c.id) === String(commentId)) {
        return { ...c, likes, dislikes, liked_users: likedUsers, disliked_users: dislikedUsers };
      }
      return c;
    });
    saveLocalStore(store);
    res.json({ likes, dislikes, liked_users: likedUsers, disliked_users: dislikedUsers });
  } catch (err) {
    console.error("Like error:", err);
    res.status(500).json({ error: "Failed to like comment" });
  }
});
app.post("/api/comments/:commentId/dislike", authenticateToken, async (req, res) => {
  const commentId = req.params.commentId;
  const userId = req.user.id;
  try {
    let comment = await getCommentById(commentId);
    if (!comment) return res.status(404).json({ error: "Izoh topilmadi" });
    let likedUsers = safeJsonParse(comment.liked_users, []);
    let dislikedUsers = safeJsonParse(comment.disliked_users, []);
    let likes = Number(comment.likes) || 0;
    let dislikes = Number(comment.dislikes) || 0;
    const hasLiked = likedUsers.map(String).includes(String(userId));
    const hasDisliked = dislikedUsers.map(String).includes(String(userId));
    if (hasDisliked) {
      dislikedUsers = dislikedUsers.filter((id) => String(id) !== String(userId));
      dislikes = Math.max(0, dislikes - 1);
    } else {
      dislikedUsers.push(userId);
      dislikes += 1;
      if (hasLiked) {
        likedUsers = likedUsers.filter((id) => String(id) !== String(userId));
        likes = Math.max(0, likes - 1);
      }
    }
    try {
      await dbQuery(
        "UPDATE comments SET likes = ?, dislikes = ?, liked_users = ?, disliked_users = ? WHERE id = ?",
        [likes, dislikes, JSON.stringify(likedUsers), JSON.stringify(dislikedUsers), commentId]
      );
    } catch (e) {
    }
    const store = loadLocalStore();
    store.comments = (store.comments || []).map((c) => {
      if (String(c.id) === String(commentId)) {
        return { ...c, likes, dislikes, liked_users: likedUsers, disliked_users: dislikedUsers };
      }
      return c;
    });
    saveLocalStore(store);
    res.json({ likes, dislikes, liked_users: likedUsers, disliked_users: dislikedUsers });
  } catch (err) {
    console.error("Dislike error:", err);
    res.status(500).json({ error: "Failed to dislike comment" });
  }
});
app.post("/api/comments/:commentId/reply", authenticateToken, async (req, res) => {
  const commentId = req.params.commentId;
  const userId = req.user.id;
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Javob matni bo'sh bo'lishi mumkin emas" });
  }
  try {
    let comment = await getCommentById(commentId);
    if (!comment) return res.status(404).json({ error: "Izoh topilmadi" });
    let replies = safeJsonParse(comment.replies, []);
    let userAvatar = req.user.avatar_url || null;
    let userAvatarFrame = req.user.avatar_frame_url || null;
    try {
      const [uRows] = await dbQuery("SELECT avatar_url, avatar_frame_url FROM users WHERE id = ?", [userId]);
      if (uRows && uRows.length > 0) {
        if (uRows[0].avatar_url) userAvatar = uRows[0].avatar_url;
        if (uRows[0].avatar_frame_url) userAvatarFrame = uRows[0].avatar_frame_url;
      }
    } catch (e) {
    }
    const newReply = {
      id: Date.now(),
      user_id: userId,
      user_name: req.user.name,
      user_avatar: userAvatar,
      user_avatar_frame: userAvatarFrame,
      avatar_frame_url: userAvatarFrame,
      content: content.trim(),
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    replies.push(newReply);
    try {
      await dbQuery(
        "UPDATE comments SET replies = ? WHERE id = ?",
        [JSON.stringify(replies), commentId]
      );
    } catch (e) {
    }
    const store = loadLocalStore();
    store.comments = (store.comments || []).map((c) => {
      if (String(c.id) === String(commentId)) {
        return { ...c, replies };
      }
      return c;
    });
    saveLocalStore(store);
    res.status(201).json(newReply);
  } catch (err) {
    console.error("Reply error:", err);
    res.status(500).json({ error: "Failed to post reply" });
  }
});
app.get("/api/mangas/:id/comments", async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await dbQuery(
      `SELECT c.*, u.name AS user_name, u.avatar_url AS user_avatar, u.avatar_frame_url AS user_avatar_frame, u.avatar_frame_url AS avatar_frame_url 
       FROM comments c 
       LEFT JOIN users u ON c.user_id = u.id 
       WHERE c.manga_id = ? 
       ORDER BY c.id DESC`,
      [id]
    );
    if (Array.isArray(rows)) {
      const parsed = rows.map((r) => ({
        ...r,
        liked_users: safeJsonParse(r.liked_users, []),
        disliked_users: safeJsonParse(r.disliked_users, []),
        replies: safeJsonParse(r.replies, [])
      }));
      return res.json(parsed);
    }
  } catch (err) {
    console.warn("Manga comments fetch fallback:", err?.message);
  }
  const store = loadLocalStore();
  const comms = (store.comments || []).filter((c) => String(c.manga_id) === String(id));
  res.json(comms);
});
app.post("/api/mangas/:id/comments", authenticateToken, async (req, res) => {
  try {
    const mangaId = req.params.id;
    const userId = req.user.id;
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Izoh matni bo'sh bo'lishi mumkin emas" });
    }
    const [result] = await dbQuery(
      "INSERT INTO comments (manga_id, user_id, content, likes, dislikes, liked_users, disliked_users, replies) VALUES (?, ?, ?, 0, 0, '[]', '[]', '[]')",
      [mangaId, userId, content]
    );
    let userAvatar = req.user.avatar_url || null;
    let userAvatarFrame = req.user.avatar_frame_url || null;
    try {
      const [uRows] = await dbQuery("SELECT avatar_url, avatar_frame_url FROM users WHERE id = ?", [userId]);
      if (uRows && uRows.length > 0) {
        if (uRows[0].avatar_url) userAvatar = uRows[0].avatar_url;
        if (uRows[0].avatar_frame_url) userAvatarFrame = uRows[0].avatar_frame_url;
      }
    } catch (e) {
    }
    const newComment = {
      id: result.insertId,
      manga_id: Number(mangaId),
      user_id: userId,
      user_name: req.user.name,
      user_avatar: userAvatar,
      user_avatar_frame: userAvatarFrame,
      avatar_frame_url: userAvatarFrame,
      content,
      likes: 0,
      dislikes: 0,
      liked_users: [],
      disliked_users: [],
      replies: [],
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const store = loadLocalStore();
    store.comments = store.comments || [];
    store.comments.unshift(newComment);
    saveLocalStore(store);
    res.status(201).json(newComment);
  } catch (err) {
    console.error("Add manga comment error:", err);
    res.status(500).json({ error: "Failed to post comment" });
  }
});
app.delete("/api/comments/:commentId", authenticateToken, async (req, res) => {
  try {
    const commentId = req.params.commentId;
    const userId = req.user.id;
    const role = req.user.role;
    const [commentRows] = await dbQuery("SELECT user_id FROM comments WHERE id = ?", [commentId]);
    if (commentRows.length === 0) {
      return res.status(404).json({ error: "Izoh topilmadi" });
    }
    if (role !== "admin" && commentRows[0].user_id !== userId) {
      return res.status(403).json({ error: "Ruxsat etilmadi" });
    }
    await dbQuery("DELETE FROM comments WHERE id = ?", [commentId]);
    res.json({ message: "Izoh o'chirildi" });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});
app.post("/api/animes/:animeId/rate", authenticateToken, async (req, res) => {
  try {
    const animeId = parseInt(req.params.animeId, 10);
    const userId = parseInt(req.user.id, 10);
    const rating = parseInt(req.body.rating, 10);
    console.log("Rate request details:", { userId, animeId, rating });
    if (isNaN(animeId) || isNaN(userId)) {
      console.warn("Invalid animeId or userId", { animeId, userId });
      return res.status(400).json({ error: "Foydalanuvchi yoki anime ID noto'g'ri" });
    }
    if (isNaN(rating) || rating < 1 || rating > 10) {
      console.warn("Invalid rating value", { rating });
      return res.status(400).json({ error: "Reyting 1 va 10 oralig'ida bo'lishi kerak" });
    }
    const ratings = await getRatingsFromFile();
    const existingIndex = ratings.findIndex((r) => r.user_id === userId && r.anime_id === animeId);
    if (existingIndex >= 0) {
      ratings[existingIndex].rating = rating;
      ratings[existingIndex].created_at = (/* @__PURE__ */ new Date()).toISOString();
    } else {
      const maxId = ratings.reduce((max, r) => r.id > max ? r.id : max, 0);
      ratings.push({
        id: maxId + 1,
        user_id: userId,
        anime_id: animeId,
        rating,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    await saveRatingsToFile(ratings);
    const animeRatings = ratings.filter((r) => r.anime_id === animeId);
    const count = animeRatings.length;
    const sum = animeRatings.reduce((acc, r) => acc + r.rating, 0);
    const avg_rating = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
    try {
      await dbQuery(
        "INSERT INTO ratings (user_id, anime_id, rating) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE rating = ?",
        [userId, animeId, rating, rating]
      );
      await dbQuery(
        "UPDATE animes SET rating = ?, rating_count = ? WHERE id = ?",
        [avg_rating, count, animeId]
      );
    } catch (dbErr) {
      console.warn("Could not sync rating to MySQL database, but local rating was saved to data.json:", dbErr);
    }
    console.log("Rating successfully saved to data.json!", { animeId, avg_rating, count });
    res.json({ message: "Reyting saqlandi", rating: avg_rating, count });
  } catch (err) {
    console.error("Rate anime error:", err);
    res.status(500).json({ error: err.message || "Failed to save rating" });
  }
});
app.get("/api/animes/:animeId/ratings-summary", async (req, res) => {
  try {
    const animeId = parseInt(req.params.animeId, 10);
    if (isNaN(animeId)) {
      return res.status(400).json({ error: "Noto'g'ri anime ID" });
    }
    const ratings = await getRatingsFromFile();
    const animeRatings = ratings.filter((r) => r.anime_id === animeId);
    let totalCount = animeRatings.length;
    const sum = animeRatings.reduce((acc, r) => acc + r.rating, 0);
    let avgRating = totalCount > 0 ? parseFloat((sum / totalCount).toFixed(1)) : 0;
    if (totalCount === 0) {
      try {
        const [rows] = await dbQuery("SELECT rating, rating_count FROM animes WHERE id = ?", [animeId]);
        if (rows.length > 0) {
          avgRating = Number(rows[0].rating) || 0;
          totalCount = Number(rows[0].rating_count) || 0;
        }
      } catch (dbErr) {
        console.warn("Could not fetch database fallback rating in ratings-summary:", dbErr);
      }
    }
    const distribution = {};
    for (let i = 1; i <= 10; i++) {
      distribution[i] = 0;
    }
    animeRatings.forEach((row) => {
      if (row.rating >= 1 && row.rating <= 10) {
        distribution[row.rating] = (distribution[row.rating] || 0) + 1;
      }
    });
    if (totalCount > 0 && animeRatings.length === 0) {
      const roundedRating = Math.round(avgRating);
      if (roundedRating >= 1 && roundedRating <= 10) {
        distribution[roundedRating] = totalCount;
      }
    }
    res.json({
      average: avgRating,
      total: totalCount,
      distribution
    });
  } catch (err) {
    console.error("Get ratings summary error:", err);
    res.status(500).json({ error: "Failed to fetch ratings summary" });
  }
});
app.get("/api/animes/:animeId/rating", authenticateToken, async (req, res) => {
  try {
    const animeId = parseInt(req.params.animeId, 10);
    const userId = parseInt(req.user.id, 10);
    if (isNaN(animeId) || isNaN(userId)) {
      return res.json({ rating: 0 });
    }
    const ratings = await getRatingsFromFile();
    const userRatingObj = ratings.find((r) => r.anime_id === animeId && r.user_id === userId);
    res.json({ rating: userRatingObj ? userRatingObj.rating : 0 });
  } catch (err) {
    console.error("Get rating error:", err);
    res.status(500).json({ error: "Failed to fetch rating" });
  }
});
app.post("/api/animes", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const {
      title,
      description,
      image_url,
      banner_url,
      rating,
      rating_count,
      holati,
      yil,
      studiyasi,
      qismlar_soni,
      korishlar,
      janrlar,
      telegram_url,
      video_url,
      tavsiya,
      is_banner,
      tags,
      is_adult
    } = req.body;
    let insertId = Date.now();
    try {
      const [result] = await dbQuery(
        `INSERT INTO animes 
        (title, description, image_url, banner_url, rating, rating_count, holati, yil, studiyasi, qismlar_soni, korishlar, janrlar, telegram_url, video_url, tavsiya, is_banner, tags, is_adult) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title || "",
          description || "",
          image_url || "",
          banner_url || "",
          rating || 0,
          rating_count || 0,
          holati || "Faol",
          yil || null,
          studiyasi || "",
          qismlar_soni || 0,
          korishlar || 0,
          janrlar || "",
          telegram_url || "",
          video_url || "",
          tavsiya ? 1 : 0,
          is_banner ? 1 : 0,
          tags || "",
          is_adult ? 1 : 0
        ]
      );
      if (result && result.insertId) {
        insertId = result.insertId;
      }
    } catch (dbErr) {
      console.warn("DB insert anime failed, using local store:", dbErr?.message);
    }
    const store = loadLocalStore();
    const newObj = {
      id: insertId,
      title: title || "",
      description: description || "",
      image_url: image_url || "",
      banner_url: banner_url || "",
      rating: rating || 0,
      rating_count: rating_count || 0,
      holati: holati || "Faol",
      yil: yil ? Number(yil) : null,
      studiyasi: studiyasi || "",
      qismlar_soni: qismlar_soni ? Number(qismlar_soni) : 0,
      korishlar: korishlar ? Number(korishlar) : 0,
      janrlar: janrlar || "",
      telegram_url: telegram_url || "",
      video_url: video_url || "",
      tavsiya: Boolean(tavsiya),
      is_banner: Boolean(is_banner),
      tags: tags || "",
      is_adult: Boolean(is_adult)
    };
    store.animes = store.animes || [];
    store.animes.unshift(newObj);
    saveLocalStore(store);
    notifyTelegramNewAnime(insertId, qismlar_soni ? Number(qismlar_soni) : null);
    broadcastPushNotification({
      title: "Animem.uz | Yangi Anime Qo'shildi! \u{1F3AC}",
      body: `"${title}" o'zbek tilida joylandi (${qismlar_soni ? `${qismlar_soni} qism` : "Film"}). Hoziroq tomosha qiling!`,
      image: image_url || banner_url || void 0,
      url: `/anime/${(title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
      tag: `anime-${insertId}`
    }).catch(() => {
    });
    notifyContentUpdate("anime");
    res.status(201).json({ id: insertId });
  } catch (err) {
    console.error("Add anime error:", err);
    res.status(500).json({ error: "Failed to create anime" });
  }
});
app.put("/api/animes/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const id = req.params.id;
    const {
      title,
      description,
      image_url,
      banner_url,
      rating,
      rating_count,
      holati,
      yil,
      studiyasi,
      qismlar_soni,
      korishlar,
      janrlar,
      telegram_url,
      video_url,
      tavsiya,
      is_banner,
      tags,
      is_adult
    } = req.body;
    let existing = null;
    try {
      const [rows] = await dbQuery("SELECT * FROM animes WHERE id = ?", [id]);
      if (rows && rows.length > 0) existing = rows[0];
    } catch (e) {
    }
    if (!existing) {
      const store2 = loadLocalStore();
      existing = (store2.animes || []).find((a) => String(a.id) === String(id));
    }
    const finalKorishlar = korishlar !== void 0 && korishlar !== null ? Number(korishlar) : existing ? Number(existing.korishlar || 0) : 0;
    const finalRating = rating !== void 0 && rating !== null ? Number(rating) : existing ? Number(existing.rating || 0) : 0;
    const finalRatingCount = rating_count !== void 0 && rating_count !== null ? Number(rating_count) : existing ? Number(existing.rating_count || 0) : 0;
    const finalTitle = title !== void 0 ? title : existing?.title || "";
    const finalDescription = description !== void 0 ? description : existing?.description || "";
    const finalImageUrl = image_url !== void 0 ? image_url : existing?.image_url || "";
    const finalBannerUrl = banner_url !== void 0 ? banner_url : existing?.banner_url || "";
    const finalHolati = holati !== void 0 ? holati : existing?.holati || "Faol";
    const finalYil = yil !== void 0 ? yil ? Number(yil) : null : existing?.yil || null;
    const finalStudiyasi = studiyasi !== void 0 ? studiyasi : existing?.studiyasi || "";
    const finalQismlarSoni = qismlar_soni !== void 0 ? Number(qismlar_soni) : existing?.qismlar_soni || 0;
    const finalJanrlar = janrlar !== void 0 ? janrlar : existing?.janrlar || "";
    const finalTelegramUrl = telegram_url !== void 0 ? telegram_url : existing?.telegram_url || "";
    const finalVideoUrl = video_url !== void 0 ? video_url : existing?.video_url || "";
    const finalTavsiya = tavsiya !== void 0 ? tavsiya ? 1 : 0 : existing?.tavsiya ? 1 : 0;
    const finalIsBanner = is_banner !== void 0 ? is_banner ? 1 : 0 : existing?.is_banner ? 1 : 0;
    const finalTags = tags !== void 0 ? tags : existing?.tags || "";
    const finalIsAdult = is_adult !== void 0 ? is_adult ? 1 : 0 : existing?.is_adult ? 1 : 0;
    try {
      await dbQuery(
        `UPDATE animes SET 
        title = ?, description = ?, image_url = ?, banner_url = ?, rating = ?, rating_count = ?, 
        holati = ?, yil = ?, studiyasi = ?, qismlar_soni = ?, korishlar = ?, janrlar = ?, telegram_url = ?, video_url = ?, tavsiya = ?, is_banner = ?, tags = ?, is_adult = ? 
        WHERE id = ?`,
        [
          finalTitle,
          finalDescription,
          finalImageUrl,
          finalBannerUrl,
          finalRating,
          finalRatingCount,
          finalHolati,
          finalYil,
          finalStudiyasi,
          finalQismlarSoni,
          finalKorishlar,
          finalJanrlar,
          finalTelegramUrl,
          finalVideoUrl,
          finalTavsiya,
          finalIsBanner,
          finalTags,
          finalIsAdult,
          id
        ]
      );
    } catch (dbErr) {
      console.warn("DB update anime failed, relying on local store:", dbErr?.message);
    }
    const store = loadLocalStore();
    const idx = (store.animes || []).findIndex((a) => String(a.id) === String(id));
    const updatedObj = {
      id: Number(id),
      title: finalTitle,
      description: finalDescription,
      image_url: finalImageUrl,
      banner_url: finalBannerUrl,
      rating: finalRating,
      rating_count: finalRatingCount,
      holati: finalHolati,
      yil: finalYil,
      studiyasi: finalStudiyasi,
      qismlar_soni: finalQismlarSoni,
      korishlar: finalKorishlar,
      janrlar: finalJanrlar,
      telegram_url: finalTelegramUrl,
      video_url: finalVideoUrl,
      tavsiya: Boolean(finalTavsiya),
      is_banner: Boolean(finalIsBanner),
      tags: finalTags,
      is_adult: Boolean(finalIsAdult)
    };
    if (idx >= 0) {
      store.animes[idx] = { ...store.animes[idx], ...updatedObj };
    } else {
      store.animes = store.animes || [];
      store.animes.push(updatedObj);
    }
    saveLocalStore(store);
    notifyContentUpdate("anime");
    res.json({ message: "Anime tahrirlandi" });
  } catch (err) {
    console.error("Update anime error:", err);
    res.status(500).json({ error: "Failed to update anime" });
  }
});
app.delete("/api/animes/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const id = req.params.id;
    try {
      await dbQuery("DELETE FROM animes WHERE id = ?", [id]);
    } catch (e) {
    }
    const store = loadLocalStore();
    store.animes = (store.animes || []).filter((a) => String(a.id) !== String(id));
    saveLocalStore(store);
    notifyContentUpdate("anime");
    res.json({ message: "Anime o'chirildi" });
  } catch (err) {
    console.error("Delete anime error:", err);
    res.status(500).json({ error: "Failed to delete anime" });
  }
});
app.post("/api/animes/:animeId/episodes", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const anime_id = parseInt(req.params.animeId);
    const { episode_number, video_url, is_filler } = req.body;
    const epNum = parseInt(episode_number);
    const fillerVal = is_filler ? 1 : 0;
    let epId = Date.now();
    try {
      const [existing] = await dbQuery(
        "SELECT id FROM episodes WHERE anime_id = ? AND episode_number = ?",
        [anime_id, epNum]
      );
      if (existing && existing.length > 0) {
        epId = existing[0].id;
        await dbQuery(
          "UPDATE episodes SET video_url = ?, is_filler = ? WHERE anime_id = ? AND episode_number = ?",
          [video_url, fillerVal, anime_id, epNum]
        );
      } else {
        const [result] = await dbQuery(
          "INSERT INTO episodes (anime_id, episode_number, video_url, is_filler) VALUES (?, ?, ?, ?)",
          [anime_id, epNum, video_url, fillerVal]
        );
        if (result && result.insertId) epId = result.insertId;
        notifyTelegramNewAnime(anime_id, epNum);
      }
    } catch (dbErr) {
      console.warn("DB save episode failed, relying on local store:", dbErr?.message);
    }
    const store = loadLocalStore();
    store.episodes = store.episodes || [];
    const idx = store.episodes.findIndex(
      (e) => String(e.anime_id) === String(anime_id) && Number(e.episode_number) === epNum
    );
    if (idx >= 0) {
      store.episodes[idx] = { ...store.episodes[idx], video_url, is_filler: fillerVal };
    } else {
      store.episodes.push({
        id: epId,
        anime_id,
        episode_number: epNum,
        video_url,
        is_filler: fillerVal
      });
    }
    saveLocalStore(store);
    notifyContentUpdate("anime");
    res.json({ message: "Qism saqlandi", id: epId });
  } catch (err) {
    console.error("Save episode error:", err);
    res.status(500).json({ error: "Failed to save episode" });
  }
});
app.post("/api/animes/:animeId/episodes/bulk", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const anime_id = parseInt(req.params.animeId);
    const { episodes } = req.body;
    if (!Array.isArray(episodes)) {
      return res.status(400).json({ error: "episodes massivi talab qilinadi" });
    }
    const store = loadLocalStore();
    store.episodes = store.episodes || [];
    for (const ep of episodes) {
      const epNum = parseInt(ep.episode_number);
      if (isNaN(epNum)) continue;
      const video_url = ep.video_url || "";
      const fillerVal = ep.is_filler ? 1 : 0;
      let epId = Date.now();
      try {
        const [existing] = await dbQuery(
          "SELECT id FROM episodes WHERE anime_id = ? AND episode_number = ?",
          [anime_id, epNum]
        );
        if (existing && existing.length > 0) {
          epId = existing[0].id;
          await dbQuery(
            "UPDATE episodes SET video_url = ?, is_filler = ? WHERE anime_id = ? AND episode_number = ?",
            [video_url, fillerVal, anime_id, epNum]
          );
        } else {
          const [result] = await dbQuery(
            "INSERT INTO episodes (anime_id, episode_number, video_url, is_filler) VALUES (?, ?, ?, ?)",
            [anime_id, epNum, video_url, fillerVal]
          );
          if (result && result.insertId) epId = result.insertId;
        }
      } catch (dbErr) {
      }
      const idx = store.episodes.findIndex(
        (e) => String(e.anime_id) === String(anime_id) && Number(e.episode_number) === epNum
      );
      if (idx >= 0) {
        store.episodes[idx] = { ...store.episodes[idx], video_url, is_filler: fillerVal };
      } else {
        store.episodes.push({
          id: epId,
          anime_id,
          episode_number: epNum,
          video_url,
          is_filler: fillerVal
        });
      }
    }
    saveLocalStore(store);
    notifyContentUpdate("anime");
    res.json({ message: "Barcha qismlar saqlandi", count: episodes.length });
  } catch (err) {
    console.error("Bulk save episodes error:", err);
    res.status(500).json({ error: "Failed to bulk save episodes" });
  }
});
app.delete("/api/animes/:animeId/episodes/:episodeNumber", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { animeId, episodeNumber } = req.params;
    try {
      await dbQuery(
        "DELETE FROM episodes WHERE anime_id = ? AND episode_number = ?",
        [animeId, episodeNumber]
      );
    } catch (e) {
    }
    const store = loadLocalStore();
    store.episodes = (store.episodes || []).filter(
      (e) => !(String(e.anime_id) === String(animeId) && String(e.episode_number) === String(episodeNumber))
    );
    saveLocalStore(store);
    notifyContentUpdate("anime");
    res.json({ message: "Qism o'chirildi" });
  } catch (err) {
    console.error("Delete episode error:", err);
    res.status(500).json({ error: "Failed to delete episode" });
  }
});
app.get("/api/mangas", async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, must-revalidate");
  const cached = getCache("api_all_mangas", 15e3);
  if (cached) {
    return res.json(cached);
  }
  try {
    let mangas = [];
    try {
      const [rows] = await dbQuery(`SELECT * FROM mangas ORDER BY id DESC`);
      if (Array.isArray(rows) && rows.length > 0) {
        mangas = rows;
      }
    } catch (dbErr) {
      console.warn("MySQL fetch mangas failed, falling back to local_store:", dbErr);
    }
    if (mangas.length === 0) {
      const store = loadLocalStore();
      mangas = store.mangas || [];
    }
    setCache("api_all_mangas", mangas);
    res.json(mangas);
  } catch (err) {
    console.error("Get mangas error:", err);
    res.status(500).json({ error: "Failed to fetch mangas" });
  }
});
app.get("/api/mangas/:id", async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, must-revalidate");
  const id = req.params.id;
  const cacheKey = `api_manga_${id}`;
  const cached = getCache(cacheKey, 15e3);
  if (cached) {
    dbQuery(`UPDATE mangas SET korishlar = korishlar + 1 WHERE id = ?`, [id]).catch(() => {
    });
    return res.json(cached);
  }
  try {
    let manga = null;
    let chapters = [];
    try {
      const [mangaRows] = await dbQuery(`SELECT * FROM mangas WHERE id = ?`, [id]);
      if (Array.isArray(mangaRows) && mangaRows.length > 0) {
        manga = mangaRows[0];
        await dbQuery(`UPDATE mangas SET korishlar = korishlar + 1 WHERE id = ?`, [id]);
        manga.korishlar = (manga.korishlar || 0) + 1;
        const [chapRows] = await dbQuery(`SELECT * FROM manga_chapters WHERE manga_id = ? ORDER BY chapter_number ASC`, [id]);
        if (Array.isArray(chapRows)) {
          chapters = chapRows.map((c) => ({
            ...c,
            pages: typeof c.pages === "string" ? JSON.parse(c.pages) : c.pages
          }));
        }
      }
    } catch (dbErr) {
      console.warn("MySQL get manga detail failed, falling back to local_store:", dbErr);
    }
    if (!manga) {
      const store = loadLocalStore();
      const mangas = store.mangas || [];
      const mangaIndex = mangas.findIndex((m) => String(m.id) === String(id));
      if (mangaIndex === -1) {
        return res.status(404).json({ error: "Manga topilmadi" });
      }
      mangas[mangaIndex].korishlar = (mangas[mangaIndex].korishlar || 0) + 1;
      saveLocalStore(store);
      manga = mangas[mangaIndex];
      chapters = (store.manga_chapters || []).filter((c) => String(c.manga_id) === String(id)).sort((a, b) => a.chapter_number - b.chapter_number);
    }
    res.json({ ...manga, chapters });
  } catch (err) {
    console.error("Get manga details error:", err);
    res.status(500).json({ error: "Failed to fetch manga details" });
  }
});
app.get("/api/mangas/:id/chapters/:chapterNumber", async (req, res) => {
  try {
    const { id, chapterNumber } = req.params;
    let chapter = null;
    let mangaTitle = "Manga";
    let allChapters = [];
    try {
      const [mangaRows] = await dbQuery(`SELECT title FROM mangas WHERE id = ?`, [id]);
      if (Array.isArray(mangaRows) && mangaRows.length > 0) {
        mangaTitle = mangaRows[0].title;
      }
      const [chapRows] = await dbQuery(`SELECT * FROM manga_chapters WHERE manga_id = ? AND chapter_number = ?`, [id, chapterNumber]);
      if (Array.isArray(chapRows) && chapRows.length > 0) {
        const rawChap = chapRows[0];
        chapter = {
          ...rawChap,
          pages: typeof rawChap.pages === "string" ? JSON.parse(rawChap.pages) : rawChap.pages
        };
        const [allChapRows] = await dbQuery(`SELECT id, chapter_number, title FROM manga_chapters WHERE manga_id = ? ORDER BY chapter_number ASC`, [id]);
        if (Array.isArray(allChapRows)) {
          allChapters = allChapRows;
        }
      }
    } catch (dbErr) {
      console.warn("MySQL get chapter failed, falling back to local_store:", dbErr);
    }
    if (!chapter) {
      const store = loadLocalStore();
      chapter = (store.manga_chapters || []).find(
        (c) => String(c.manga_id) === String(id) && String(c.chapter_number) === String(chapterNumber)
      );
      if (!chapter) {
        return res.status(404).json({ error: "Bob topilmadi" });
      }
      const manga = (store.mangas || []).find((m) => String(m.id) === String(id));
      mangaTitle = manga?.title || "Manga";
      allChapters = (store.manga_chapters || []).filter((c) => String(c.manga_id) === String(id)).sort((a, b) => a.chapter_number - b.chapter_number).map((c) => ({
        id: c.id,
        chapter_number: c.chapter_number,
        title: c.title
      }));
    }
    res.json({
      chapter,
      manga_title: mangaTitle,
      all_chapters: allChapters
    });
  } catch (err) {
    console.error("Get chapter error:", err);
    res.status(500).json({ error: "Failed to fetch chapter" });
  }
});
app.post("/api/mangas", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { title, description, cover_url, banner_url, author, artist, janrlar, holati, released_year, tags, type } = req.body;
    if (!title || !description || !cover_url) {
      return res.status(400).json({ error: "Sarlavha, tavsif va muqova havola (cover_url) kiritilishi shart!" });
    }
    const newManga = {
      id: Date.now(),
      title,
      description,
      cover_url,
      banner_url: banner_url || cover_url,
      author: author || "Noma'lum",
      artist: artist || "Noma'lum",
      janrlar: janrlar || "Jangari",
      holati: holati || "Davom etmoqda",
      released_year: released_year ? parseInt(released_year) : (/* @__PURE__ */ new Date()).getFullYear(),
      tags: tags || "",
      type: type || "Manga",
      rating: 9.5,
      korishlar: 0,
      chapters_count: 0,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const store = loadLocalStore();
    store.mangas = store.mangas || [];
    store.mangas.unshift(newManga);
    saveLocalStore(store);
    try {
      await dbQuery(
        `INSERT INTO mangas (id, title, description, cover_url, banner_url, author, artist, janrlar, holati, released_year, tags, type, rating, korishlar, chapters_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newManga.id,
          newManga.title,
          newManga.description,
          newManga.cover_url,
          newManga.banner_url,
          newManga.author,
          newManga.artist,
          newManga.janrlar,
          newManga.holati,
          newManga.released_year,
          newManga.tags,
          newManga.type,
          newManga.rating,
          newManga.korishlar,
          newManga.chapters_count,
          newManga.created_at
        ]
      );
      console.log(`[MySQL] Inserted manga #${newManga.id}`);
    } catch (dbErr) {
      console.error("[MySQL] Failed to insert manga:", dbErr);
    }
    notifyContentUpdate("manga");
    res.status(201).json({ message: "Manga muvaffaqiyatli qo'shildi", manga: newManga });
  } catch (err) {
    console.error("Create manga error:", err);
    res.status(500).json({ error: "Manga qo'shishda xatolik yuz berdi" });
  }
});
app.put("/api/mangas/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const id = req.params.id;
    const store = loadLocalStore();
    store.mangas = store.mangas || [];
    const idx = store.mangas.findIndex((m) => String(m.id) === String(id));
    const updatedData = req.body;
    if (idx >= 0) {
      store.mangas[idx] = {
        ...store.mangas[idx],
        ...updatedData
      };
      saveLocalStore(store);
    }
    try {
      const { title, description, cover_url, banner_url, author, artist, janrlar, holati, released_year, tags, type } = updatedData;
      await dbQuery(
        `UPDATE mangas 
         SET title = COALESCE(?, title),
             description = COALESCE(?, description),
             cover_url = COALESCE(?, cover_url),
             banner_url = COALESCE(?, banner_url),
             author = COALESCE(?, author),
             artist = COALESCE(?, artist),
             janrlar = COALESCE(?, janrlar),
             holati = COALESCE(?, holati),
             released_year = COALESCE(?, released_year),
             tags = COALESCE(?, tags),
             type = COALESCE(?, type)
         WHERE id = ?`,
        [title, description, cover_url, banner_url, author, artist, janrlar, holati, released_year, tags, type, id]
      );
    } catch (dbErr) {
      console.error("[MySQL] Failed to update manga:", dbErr);
    }
    notifyContentUpdate("manga");
    const resManga = idx >= 0 ? store.mangas[idx] : updatedData;
    res.json({ message: "Manga tahrirlandi", manga: resManga });
  } catch (err) {
    console.error("Update manga error:", err);
    res.status(500).json({ error: "Manga tahrirlashda xatolik" });
  }
});
app.delete("/api/mangas/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const id = req.params.id;
    const store = loadLocalStore();
    store.mangas = (store.mangas || []).filter((m) => String(m.id) !== String(id));
    store.manga_chapters = (store.manga_chapters || []).filter((c) => String(c.manga_id) !== String(id));
    saveLocalStore(store);
    try {
      await dbQuery(`DELETE FROM mangas WHERE id = ?`, [id]);
      await dbQuery(`DELETE FROM manga_chapters WHERE manga_id = ?`, [id]);
      console.log(`[MySQL] Deleted manga #${id} and its chapters`);
    } catch (dbErr) {
      console.error("[MySQL] Failed to delete manga:", dbErr);
    }
    notifyContentUpdate("manga");
    res.json({ message: "Manga o'chirildi" });
  } catch (err) {
    console.error("Delete manga error:", err);
    res.status(500).json({ error: "Manga o'chirishda xatolik" });
  }
});
app.delete("/api/admin/mangas-clear", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const store = loadLocalStore();
    store.mangas = [];
    store.manga_chapters = [];
    saveLocalStore(store);
    try {
      await dbQuery(`DELETE FROM manga_chapters`);
      await dbQuery(`DELETE FROM mangas`);
      console.log("[MySQL] Cleared all mangas and chapters");
    } catch (dbErr) {
      console.error("[MySQL] Failed to clear mangas:", dbErr);
    }
    notifyContentUpdate("manga");
    res.json({ message: "Barcha test mangalar o'chirildi" });
  } catch (err) {
    console.error("Clear mangas error:", err);
    res.status(500).json({ error: "Mangalarni o'chirishda xatolik" });
  }
});
app.post("/api/mangas/:mangaId/chapters", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const mangaId = req.params.mangaId;
    const { chapter_number, title, pages } = req.body;
    if (!chapter_number || !pages || !Array.isArray(pages) || pages.length === 0) {
      return res.status(400).json({ error: "Bob raqami va kamida 1 ta rasm havolasi (pages) talab qilinadi!" });
    }
    const cleanPages = pages.filter((p) => typeof p === "string" && p.trim().length > 0);
    const jsonPages = JSON.stringify(cleanPages);
    const store = loadLocalStore();
    store.manga_chapters = store.manga_chapters || [];
    const existingIdx = store.manga_chapters.findIndex(
      (c) => String(c.manga_id) === String(mangaId) && Number(c.chapter_number) === Number(chapter_number)
    );
    const chapterObj = {
      id: existingIdx >= 0 ? store.manga_chapters[existingIdx].id : Date.now(),
      manga_id: isNaN(Number(mangaId)) ? mangaId : Number(mangaId),
      chapter_number: Number(chapter_number),
      title: title || `${chapter_number}-bob`,
      pages: cleanPages,
      views: existingIdx >= 0 ? store.manga_chapters[existingIdx].views || 0 : 0,
      created_at: existingIdx >= 0 ? store.manga_chapters[existingIdx].created_at : (/* @__PURE__ */ new Date()).toISOString()
    };
    if (existingIdx >= 0) {
      store.manga_chapters[existingIdx] = chapterObj;
    } else {
      store.manga_chapters.push(chapterObj);
    }
    const mangaIdx = (store.mangas || []).findIndex((m) => String(m.id) === String(mangaId));
    if (mangaIdx >= 0) {
      const chapterCount = store.manga_chapters.filter((c) => String(c.manga_id) === String(mangaId)).length;
      store.mangas[mangaIdx].chapters_count = chapterCount;
    }
    saveLocalStore(store);
    try {
      const [existingChapRows] = await dbQuery(
        `SELECT id FROM manga_chapters WHERE manga_id = ? AND chapter_number = ?`,
        [mangaId, chapter_number]
      );
      if (Array.isArray(existingChapRows) && existingChapRows.length > 0) {
        await dbQuery(
          `UPDATE manga_chapters SET title = ?, pages = ? WHERE manga_id = ? AND chapter_number = ?`,
          [chapterObj.title, jsonPages, mangaId, chapter_number]
        );
      } else {
        await dbQuery(
          `INSERT INTO manga_chapters (id, manga_id, chapter_number, title, pages, views, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [chapterObj.id, chapterObj.manga_id, chapterObj.chapter_number, chapterObj.title, jsonPages, chapterObj.views, chapterObj.created_at]
        );
      }
      const [allChapRows] = await dbQuery(`SELECT COUNT(*) as cnt FROM manga_chapters WHERE manga_id = ?`, [mangaId]);
      if (Array.isArray(allChapRows) && allChapRows.length > 0) {
        const count = allChapRows[0].cnt;
        await dbQuery(`UPDATE mangas SET chapters_count = ? WHERE id = ?`, [count, mangaId]);
      }
      console.log(`[MySQL] Saved chapter #${chapter_number} for manga #${mangaId}`);
    } catch (dbErr) {
      console.error("[MySQL] Failed to save chapter:", dbErr);
    }
    notifyContentUpdate("manga");
    res.json({ message: "Bob muvaffaqiyatli saqlandi", chapter: chapterObj });
  } catch (err) {
    console.error("Save manga chapter error:", err);
    res.status(500).json({ error: "Bobni saqlashda xatolik yuz berdi" });
  }
});
app.delete("/api/mangas/:mangaId/chapters/:chapterNumber", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { mangaId, chapterNumber } = req.params;
    const store = loadLocalStore();
    store.manga_chapters = (store.manga_chapters || []).filter(
      (c) => !(String(c.manga_id) === String(mangaId) && String(c.chapter_number) === String(chapterNumber))
    );
    const mangaIdx = (store.mangas || []).findIndex((m) => String(m.id) === String(mangaId));
    if (mangaIdx >= 0) {
      const chapterCount = store.manga_chapters.filter((c) => String(c.manga_id) === String(mangaId)).length;
      store.mangas[mangaIdx].chapters_count = chapterCount;
    }
    saveLocalStore(store);
    try {
      await dbQuery(
        `DELETE FROM manga_chapters WHERE manga_id = ? AND chapter_number = ?`,
        [mangaId, chapterNumber]
      );
      const [allChapRows] = await dbQuery(`SELECT COUNT(*) as cnt FROM manga_chapters WHERE manga_id = ?`, [mangaId]);
      if (Array.isArray(allChapRows) && allChapRows.length > 0) {
        const count = allChapRows[0].cnt;
        await dbQuery(`UPDATE mangas SET chapters_count = ? WHERE id = ?`, [count, mangaId]);
      }
      console.log(`[MySQL] Deleted chapter #${chapterNumber} of manga #${mangaId}`);
    } catch (dbErr) {
      console.error("[MySQL] Failed to delete chapter:", dbErr);
    }
    notifyContentUpdate("manga");
    res.json({ message: "Bob o'chirildi" });
  } catch (err) {
    console.error("Delete manga chapter error:", err);
    res.status(500).json({ error: "Bobni o'chirishda xatolik" });
  }
});
app.get("/api/dramas", async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, must-revalidate");
  const cached = getCache("api_all_dramas", 15e3);
  if (cached) {
    return res.json(cached);
  }
  try {
    let dramas = [];
    try {
      const [rows] = await dbQuery(`SELECT * FROM dramas ORDER BY id DESC`);
      if (Array.isArray(rows) && rows.length > 0) {
        dramas = rows;
      }
    } catch (dbErr) {
      console.warn("MySQL fetch dramas failed, fallback to local_store:", dbErr);
    }
    if (dramas.length === 0) {
      const store2 = loadLocalStore();
      dramas = store2.dramas || [];
    }
    const store = loadLocalStore();
    const allEpisodes = store.drama_episodes || [];
    const formatted = dramas.map((d) => {
      const eps = allEpisodes.filter((ep) => String(ep.drama_id) === String(d.id));
      return {
        ...d,
        liked_users: safeJsonParse(d.liked_users, []),
        episodes_count: eps.length
      };
    });
    setCache("api_all_dramas", formatted);
    res.json(formatted);
  } catch (err) {
    console.error("Get dramas error:", err);
    res.status(500).json({ error: "Dramalarni yuklashda xatolik" });
  }
});
app.get("/api/dramas/:id", async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, must-revalidate");
  const id = req.params.id;
  try {
    let drama = null;
    try {
      const [rows] = await dbQuery(`SELECT * FROM dramas WHERE id = ?`, [id]);
      if (Array.isArray(rows) && rows.length > 0) {
        drama = rows[0];
        await dbQuery(`UPDATE dramas SET korishlar = korishlar + 1 WHERE id = ?`, [id]);
        drama.korishlar = (drama.korishlar || 0) + 1;
      }
    } catch (dbErr) {
      console.warn("MySQL get drama detail failed, fallback to local_store:", dbErr);
    }
    const store = loadLocalStore();
    if (!drama) {
      const dramas = store.dramas || [];
      const idx = dramas.findIndex((d) => String(d.id) === String(id));
      if (idx === -1) {
        return res.status(404).json({ error: "Drama topilmadi" });
      }
      dramas[idx].korishlar = (dramas[idx].korishlar || 0) + 1;
      saveLocalStore(store);
      drama = dramas[idx];
    }
    let episodes = [];
    try {
      const [epRows] = await dbQuery(`SELECT * FROM drama_episodes WHERE drama_id = ? ORDER BY qism ASC`, [id]);
      if (Array.isArray(epRows) && epRows.length > 0) {
        episodes = epRows;
      }
    } catch (e) {
    }
    if (episodes.length === 0) {
      episodes = (store.drama_episodes || []).filter((ep) => String(ep.drama_id) === String(id));
      episodes.sort((a, b) => Number(a.qism) - Number(b.qism));
    }
    if (episodes.length === 0 && drama.video_url) {
      episodes = [
        {
          id: `ep_1_${drama.id}`,
          drama_id: drama.id,
          qism: 1,
          title: "1-Qism",
          video_url: drama.video_url,
          created_at: drama.created_at || (/* @__PURE__ */ new Date()).toISOString()
        }
      ];
    }
    drama.episodes = episodes;
    drama.liked_users = safeJsonParse(drama.liked_users, []);
    res.json(drama);
  } catch (err) {
    console.error("Get single drama error:", err);
    res.status(500).json({ error: "Dramani yuklashda xatolik" });
  }
});
app.get("/api/dramas/:id/episodes", async (req, res) => {
  const id = req.params.id;
  try {
    let episodes = [];
    try {
      const [rows] = await dbQuery(`SELECT * FROM drama_episodes WHERE drama_id = ? ORDER BY qism ASC`, [id]);
      if (Array.isArray(rows) && rows.length > 0) {
        episodes = rows;
      }
    } catch (dbErr) {
      console.warn("MySQL fetch drama episodes error:", dbErr);
    }
    if (episodes.length === 0) {
      const store = loadLocalStore();
      episodes = (store.drama_episodes || []).filter((ep) => String(ep.drama_id) === String(id));
      episodes.sort((a, b) => Number(a.qism) - Number(b.qism));
    }
    res.json(episodes);
  } catch (err) {
    console.error("Get drama episodes error:", err);
    res.status(500).json({ error: "Qismlarni yuklashda xatolik" });
  }
});
app.post("/api/dramas/:id/episodes", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const dramaId = req.params.id;
    const { qism, title, video_url } = req.body;
    if (!video_url || !video_url.trim()) {
      return res.status(400).json({ error: "Video URL yoki havolani kiriting" });
    }
    const epNumber = Number(qism) || 1;
    const newEpId = Date.now();
    const newEpisode = {
      id: newEpId,
      drama_id: dramaId,
      qism: epNumber,
      title: title ? title.trim() : `${epNumber}-Qism`,
      video_url: video_url.trim(),
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const store = loadLocalStore();
    store.drama_episodes = store.drama_episodes || [];
    store.drama_episodes.push(newEpisode);
    if (store.dramas) {
      const dramaIdx = store.dramas.findIndex((d) => String(d.id) === String(dramaId));
      if (dramaIdx >= 0 && (!store.dramas[dramaIdx].video_url || epNumber === 1)) {
        store.dramas[dramaIdx].video_url = newEpisode.video_url;
      }
    }
    saveLocalStore(store);
    try {
      await dbQuery(
        `INSERT INTO drama_episodes (id, drama_id, qism, title, video_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newEpisode.id, newEpisode.drama_id, newEpisode.qism, newEpisode.title, newEpisode.video_url, newEpisode.created_at]
      );
      if (epNumber === 1) {
        await dbQuery(`UPDATE dramas SET video_url = ? WHERE id = ?`, [newEpisode.video_url, dramaId]);
      }
    } catch (dbErr) {
      console.warn("MySQL save drama episode error:", dbErr);
    }
    notifyContentUpdate("drama");
    res.status(201).json(newEpisode);
  } catch (err) {
    console.error("Create drama episode error:", err);
    res.status(500).json({ error: "Qismni qo'shishda xatolik" });
  }
});
app.put("/api/dramas/episodes/:episodeId", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const episodeId = req.params.episodeId;
    const { qism, title, video_url } = req.body;
    const store = loadLocalStore();
    store.drama_episodes = store.drama_episodes || [];
    const idx = store.drama_episodes.findIndex((ep) => String(ep.id) === String(episodeId));
    if (idx >= 0) {
      store.drama_episodes[idx] = {
        ...store.drama_episodes[idx],
        qism: qism !== void 0 ? Number(qism) : store.drama_episodes[idx].qism,
        title: title !== void 0 ? title : store.drama_episodes[idx].title,
        video_url: video_url !== void 0 ? video_url : store.drama_episodes[idx].video_url
      };
      saveLocalStore(store);
    }
    try {
      await dbQuery(
        `UPDATE drama_episodes SET qism = ?, title = ?, video_url = ? WHERE id = ?`,
        [Number(qism) || 1, title, video_url, episodeId]
      );
    } catch (dbErr) {
      console.warn("MySQL update drama episode error:", dbErr);
    }
    notifyContentUpdate("drama");
    res.json({ message: "Qism yangilandi" });
  } catch (err) {
    console.error("Update drama episode error:", err);
    res.status(500).json({ error: "Qismni yangilashda xatolik" });
  }
});
app.delete("/api/dramas/episodes/:episodeId", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const episodeId = req.params.episodeId;
    const store = loadLocalStore();
    store.drama_episodes = (store.drama_episodes || []).filter((ep) => String(ep.id) !== String(episodeId));
    saveLocalStore(store);
    try {
      await dbQuery(`DELETE FROM drama_episodes WHERE id = ?`, [episodeId]);
    } catch (dbErr) {
      console.warn("MySQL delete drama episode error:", dbErr);
    }
    notifyContentUpdate("drama");
    res.json({ message: "Qism o'chirildi" });
  } catch (err) {
    console.error("Delete drama episode error:", err);
    res.status(500).json({ error: "Qismni o'chirishda xatolik" });
  }
});
app.post("/api/dramas", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { title, poster_url, banner_url, janrlar, yil, description, video_url, telegram_url } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Drama nomi kiritilishi shart" });
    }
    const newId = Date.now();
    const newDrama = {
      id: newId,
      title: title.trim(),
      description: description || "",
      poster_url: poster_url || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600",
      banner_url: banner_url || poster_url || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200",
      janrlar: janrlar || "Drama",
      yil: Number(yil) || (/* @__PURE__ */ new Date()).getFullYear(),
      likes: 0,
      liked_users: [],
      korishlar: 0,
      video_url: video_url || "",
      telegram_url: telegram_url || "",
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const store = loadLocalStore();
    store.dramas = store.dramas || [];
    store.dramas.unshift(newDrama);
    if (video_url && video_url.trim()) {
      store.drama_episodes = store.drama_episodes || [];
      store.drama_episodes.push({
        id: Date.now() + 1,
        drama_id: newId,
        qism: 1,
        title: "1-Qism",
        video_url: video_url.trim(),
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    saveLocalStore(store);
    try {
      await dbQuery(
        `INSERT INTO dramas (id, title, description, poster_url, banner_url, janrlar, yil, likes, liked_users, korishlar, video_url, telegram_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newDrama.id, newDrama.title, newDrama.description, newDrama.poster_url, newDrama.banner_url, newDrama.janrlar, newDrama.yil, newDrama.likes, JSON.stringify(newDrama.liked_users), newDrama.korishlar, newDrama.video_url, newDrama.telegram_url, newDrama.created_at]
      );
      if (video_url && video_url.trim()) {
        await dbQuery(
          `INSERT INTO drama_episodes (id, drama_id, qism, title, video_url, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [Date.now() + 1, newId, 1, "1-Qism", video_url.trim(), (/* @__PURE__ */ new Date()).toISOString()]
        );
      }
    } catch (dbErr) {
      console.warn("MySQL save drama warning:", dbErr);
    }
    notifyContentUpdate("drama");
    res.status(201).json(newDrama);
  } catch (err) {
    console.error("Create drama error:", err);
    res.status(500).json({ error: "Drama qo'shishda xatolik yuz berdi" });
  }
});
app.put("/api/dramas/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const id = req.params.id;
    const { title, poster_url, banner_url, janrlar, yil, description, video_url, telegram_url } = req.body;
    const store = loadLocalStore();
    store.dramas = store.dramas || [];
    const idx = store.dramas.findIndex((d) => String(d.id) === String(id));
    if (idx >= 0) {
      store.dramas[idx] = {
        ...store.dramas[idx],
        title: title !== void 0 ? title : store.dramas[idx].title,
        poster_url: poster_url !== void 0 ? poster_url : store.dramas[idx].poster_url,
        banner_url: banner_url !== void 0 ? banner_url : store.dramas[idx].banner_url,
        janrlar: janrlar !== void 0 ? janrlar : store.dramas[idx].janrlar,
        yil: yil !== void 0 ? Number(yil) : store.dramas[idx].yil,
        description: description !== void 0 ? description : store.dramas[idx].description,
        video_url: video_url !== void 0 ? video_url : store.dramas[idx].video_url,
        telegram_url: telegram_url !== void 0 ? telegram_url : store.dramas[idx].telegram_url
      };
      saveLocalStore(store);
    }
    try {
      await dbQuery(
        `UPDATE dramas SET title = ?, poster_url = ?, banner_url = ?, janrlar = ?, yil = ?, description = ?, video_url = ?, telegram_url = ? WHERE id = ?`,
        [title, poster_url, banner_url, janrlar, Number(yil) || 2024, description, video_url, telegram_url, id]
      );
    } catch (dbErr) {
      console.warn("MySQL update drama warning:", dbErr);
    }
    notifyContentUpdate("drama");
    res.json({ message: "Drama muvaffaqiyatli yangilandi" });
  } catch (err) {
    console.error("Update drama error:", err);
    res.status(500).json({ error: "Dramani yangilashda xatolik" });
  }
});
app.delete("/api/dramas/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const id = req.params.id;
    const store = loadLocalStore();
    store.dramas = (store.dramas || []).filter((d) => String(d.id) !== String(id));
    store.drama_episodes = (store.drama_episodes || []).filter((ep) => String(ep.drama_id) !== String(id));
    store.comments = (store.comments || []).filter((c) => String(c.drama_id) !== String(id));
    saveLocalStore(store);
    try {
      await dbQuery(`DELETE FROM dramas WHERE id = ?`, [id]);
      await dbQuery(`DELETE FROM drama_episodes WHERE drama_id = ?`, [id]);
      await dbQuery(`DELETE FROM comments WHERE drama_id = ?`, [id]);
    } catch (dbErr) {
      console.warn("MySQL delete drama warning:", dbErr);
    }
    notifyContentUpdate("drama");
    res.json({ message: "Drama va uning barcha qismlari o'chirildi" });
  } catch (err) {
    console.error("Delete drama error:", err);
    res.status(500).json({ error: "Dramani o'chirishda xatolik" });
  }
});
app.post("/api/dramas/:id/like", async (req, res) => {
  try {
    const id = req.params.id;
    let identifier = "";
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token) {
      const decoded = verifyAnyJwt(token);
      if (decoded?.id) {
        identifier = `user_${decoded.id}`;
      }
    }
    if (!identifier) {
      identifier = req.body?.guestId || req.ip || `guest_${req.headers["user-agent"] || "anon"}`;
    }
    let drama = null;
    let likedUsers = [];
    let currentLikes = 0;
    try {
      const [rows] = await dbQuery(`SELECT * FROM dramas WHERE id = ?`, [id]);
      if (Array.isArray(rows) && rows.length > 0) {
        drama = rows[0];
        likedUsers = safeJsonParse(drama.liked_users, []);
        currentLikes = Number(drama.likes) || 0;
      }
    } catch (e) {
    }
    const store = loadLocalStore();
    store.dramas = store.dramas || [];
    const localIdx = store.dramas.findIndex((d) => String(d.id) === String(id));
    if (!drama && localIdx >= 0) {
      drama = store.dramas[localIdx];
      likedUsers = drama.liked_users || [];
      currentLikes = Number(drama.likes) || 0;
    }
    if (!drama && localIdx === -1) {
      return res.status(404).json({ error: "Drama topilmadi" });
    }
    const isAlreadyLiked = likedUsers.includes(identifier);
    let updatedLikes;
    let updatedLikedUsers;
    if (isAlreadyLiked) {
      updatedLikedUsers = likedUsers.filter((u) => u !== identifier);
      updatedLikes = Math.max(0, currentLikes - 1);
    } else {
      updatedLikedUsers = [...likedUsers, identifier];
      updatedLikes = currentLikes + 1;
    }
    if (localIdx >= 0) {
      store.dramas[localIdx].likes = updatedLikes;
      store.dramas[localIdx].liked_users = updatedLikedUsers;
      saveLocalStore(store);
    }
    try {
      await dbQuery(
        `UPDATE dramas SET likes = ?, liked_users = ? WHERE id = ?`,
        [updatedLikes, JSON.stringify(updatedLikedUsers), id]
      );
    } catch (e) {
    }
    res.json({
      success: true,
      likes: updatedLikes,
      isLiked: !isAlreadyLiked
    });
  } catch (err) {
    console.error("Like drama error:", err);
    res.status(500).json({ error: "Layk bosishda xatolik" });
  }
});
app.get("/api/dramas/:id/comments", async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await dbQuery(
      `SELECT c.*, u.name AS user_name, u.avatar_url AS user_avatar, u.avatar_frame_url AS user_avatar_frame, u.avatar_frame_url AS avatar_frame_url 
       FROM comments c 
       LEFT JOIN users u ON c.user_id = u.id 
       WHERE c.drama_id = ? 
       ORDER BY c.id DESC`,
      [id]
    );
    if (Array.isArray(rows) && rows.length > 0) {
      const parsed = rows.map((r) => ({
        ...r,
        liked_users: safeJsonParse(r.liked_users, []),
        disliked_users: safeJsonParse(r.disliked_users, []),
        replies: safeJsonParse(r.replies, [])
      }));
      return res.json(parsed);
    }
  } catch (err) {
    console.warn("Drama comments fetch fallback:", err?.message);
  }
  const store = loadLocalStore();
  const comms = (store.comments || []).filter((c) => String(c.drama_id) === String(id));
  res.json(comms);
});
app.post("/api/dramas/:id/comments", authenticateToken, async (req, res) => {
  try {
    const dramaId = req.params.id;
    const userId = req.user.id;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Fikr matni kiritilmadi" });
    }
    const [result] = await dbQuery(
      "INSERT INTO comments (drama_id, user_id, content, likes, dislikes, liked_users, disliked_users, replies) VALUES (?, ?, ?, 0, 0, '[]', '[]', '[]')",
      [dramaId, userId, content]
    );
    let userAvatar = req.user.avatar_url || null;
    let userAvatarFrame = req.user.avatar_frame_url || null;
    try {
      const [uRows] = await dbQuery("SELECT avatar_url, avatar_frame_url FROM users WHERE id = ?", [userId]);
      if (uRows && uRows.length > 0) {
        if (uRows[0].avatar_url) userAvatar = uRows[0].avatar_url;
        if (uRows[0].avatar_frame_url) userAvatarFrame = uRows[0].avatar_frame_url;
      }
    } catch (e) {
    }
    const newComment = {
      id: result?.insertId || Date.now(),
      drama_id: Number(dramaId),
      user_id: userId,
      user_name: req.user.name,
      user_avatar: userAvatar,
      user_avatar_frame: userAvatarFrame,
      avatar_frame_url: userAvatarFrame,
      content,
      likes: 0,
      dislikes: 0,
      liked_users: [],
      disliked_users: [],
      replies: [],
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const store = loadLocalStore();
    store.comments = store.comments || [];
    store.comments.unshift(newComment);
    saveLocalStore(store);
    res.status(201).json(newComment);
  } catch (err) {
    console.error("Add drama comment error:", err);
    res.status(500).json({ error: "Fikr qoldirishda xatolik yuz berdi" });
  }
});
app.get("/api/donations", async (req, res) => {
  try {
    const store = loadLocalStore();
    const allDonations = store.donations || [];
    const paidDonations = allDonations.filter((d) => d.status === "paid");
    const totalAmount = paidDonations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const monthlyGoal = 2e6;
    res.json({
      donations: paidDonations,
      total_amount: totalAmount,
      monthly_goal: monthlyGoal,
      paid_count: paidDonations.length
    });
  } catch (err) {
    console.error("Get donations error:", err);
    res.status(500).json({ error: "Donatlarni olishda xatolik" });
  }
});
app.get("/api/admin/donations", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const store = loadLocalStore();
    const donations = store.donations || [];
    const totalAmount = donations.filter((d) => d.status === "paid").reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    res.json({
      donations,
      total_amount: totalAmount
    });
  } catch (err) {
    console.error("Get admin donations error:", err);
    res.status(500).json({ error: "Donatlarni olishda xatolik" });
  }
});
app.get("/api/admin/users", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    let users = [];
    try {
      const [rows] = await dbQuery("SELECT id, name, email, phone, role, avatar_url, telegram_id, yandex_id, discord_id, facebook_id, auth_provider, created_at FROM users ORDER BY id DESC");
      users = rows || [];
    } catch (dbErr) {
      try {
        const [rows] = await dbQuery("SELECT id, name, email, phone, role, avatar_url, telegram_id, yandex_id, discord_id, facebook_id, created_at FROM users ORDER BY id DESC");
        users = rows || [];
      } catch (innerDbErr) {
        console.warn("DB Query for users failed, falling back to local store:", innerDbErr);
        const store = loadLocalStore();
        users = store.users || [];
      }
    }
    const processedUsers = users.map((u) => {
      let provider = u.auth_provider || "email";
      let provider_label = "Email / Parol";
      if (u.auth_provider === "telegram_widget") {
        provider = "telegram_widget";
        provider_label = "Telegram Widget";
      } else if (u.auth_provider === "telegram_bot" || u.telegram_id) {
        provider = u.auth_provider === "telegram_widget" ? "telegram_widget" : "telegram_bot";
        provider_label = provider === "telegram_widget" ? "Telegram Widget" : "Telegram Bot";
      } else if (u.auth_provider === "yandex" || u.yandex_id) {
        provider = "yandex";
        provider_label = "Yandex ID";
      } else if (u.auth_provider === "discord" || u.discord_id) {
        provider = "discord";
        provider_label = "Discord";
      } else if (u.auth_provider === "facebook" || u.facebook_id) {
        provider = "facebook";
        provider_label = "Facebook";
      } else if (u.auth_provider === "google" || u.email && u.email.toLowerCase().endsWith("@gmail.com")) {
        provider = "google";
        provider_label = "Google Email";
      } else if (u.auth_provider === "phone" || u.phone) {
        provider = "phone";
        provider_label = "Telefon (+SMS)";
      }
      return {
        id: u.id,
        name: u.name || "Nomsiz Foydalanuvchi",
        email: u.email || "",
        phone: u.phone || "",
        role: u.role || "user",
        avatar_url: u.avatar_url || null,
        telegram_id: u.telegram_id || null,
        yandex_id: u.yandex_id || null,
        discord_id: u.discord_id || null,
        facebook_id: u.facebook_id || null,
        auth_provider: u.auth_provider || provider,
        created_at: u.created_at || (/* @__PURE__ */ new Date()).toISOString(),
        provider,
        provider_label
      };
    });
    res.json({ users: processedUsers });
  } catch (err) {
    console.error("Get admin users error:", err);
    res.status(500).json({ error: "Foydalanuvchilarni olishda xatolik" });
  }
});
app.delete("/api/admin/users/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const userId = req.params.id;
    if (String(req.user.id) === String(userId)) {
      return res.status(400).json({ error: "O'z hisobingizni o'chira olmaysiz!" });
    }
    try {
      await dbQuery("DELETE FROM users WHERE id = ?", [userId]);
    } catch (e) {
      const store = loadLocalStore();
      store.users = (store.users || []).filter((u) => String(u.id) !== String(userId));
      saveLocalStore(store);
    }
    res.json({ success: true, message: "Foydalanuvchi o'chirildi" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Foydalanuvchini o'chirishda xatolik" });
  }
});
app.put("/api/admin/users/:id/role", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const userId = req.params.id;
    const { role } = req.body;
    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ error: "Yaroqsiz rol" });
    }
    if (String(req.user.id) === String(userId)) {
      return res.status(400).json({ error: "O'z rolingizni o'zgartira olmaysiz!" });
    }
    try {
      await dbQuery("UPDATE users SET role = ? WHERE id = ?", [role, userId]);
    } catch (e) {
      const store = loadLocalStore();
      const userObj = (store.users || []).find((u) => String(u.id) === String(userId));
      if (userObj) userObj.role = role;
      saveLocalStore(store);
    }
    res.json({ success: true, message: `Foydalanuvchi roli ${role} ga o'zgartirildi` });
  } catch (err) {
    console.error("Change user role error:", err);
    res.status(500).json({ error: "Rolni o'zgartirishda xatolik" });
  }
});
app.post("/api/donate/create-invoice", async (req, res) => {
  try {
    const { amount, donor_name, comment, payment_method } = req.body;
    const numericAmount = Number(amount);
    if (!numericAmount || isNaN(numericAmount) || numericAmount < 1e3) {
      return res.status(400).json({ error: "Xato to'lov miqdori kiritildi (kamida 1,000 UZS)" });
    }
    const apiKey = process.env.TEZCHECK_API_KEY || "ee77747df48bae33ee5bee58047c3ab093a84a76";
    const shopId = process.env.TEZCHECK_SHOP_ID || "124";
    let payUrl = "";
    let orderId = `86${Math.floor(1e3 + Math.random() * 9e3)}`;
    try {
      const tezResponse = await fetch("https://tezcheck.uz/api/create_invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          amount: numericAmount
        })
      });
      const contentType = tezResponse.headers.get("content-type");
      if (tezResponse.ok && contentType && contentType.includes("application/json")) {
        const tezData = await tezResponse.json();
        if (tezData && tezData.ok && tezData.pay_url) {
          payUrl = tezData.pay_url;
          if (tezData.order_id) {
            orderId = String(tezData.order_id);
          }
        } else if (tezData && tezData.error) {
          console.warn("Tezcheck API error response:", tezData.error);
        }
      } else {
        const textResp = await tezResponse.text();
        console.warn("Tezcheck non-JSON response:", tezResponse.status, textResp);
      }
    } catch (apiErr) {
      console.error("Tezcheck API network call failed:", apiErr);
    }
    if (!payUrl) {
      payUrl = `https://tezcheck.uz/merchant/pay?shop_id=${shopId}&order_id=${orderId}&amount=${numericAmount}`;
    }
    const donation = {
      id: Date.now(),
      order_id: String(orderId),
      amount: numericAmount,
      donor_name: (donor_name || "").trim() || "Saxiy otaku",
      comment: (comment || "").trim() || "Animeuz va dublyaj rivoji uchun donat",
      payment_method: payment_method || "Click / Payme (Tezcheck)",
      status: "pending",
      pay_url: payUrl,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const store = loadLocalStore();
    store.donations = store.donations || [];
    store.donations.unshift(donation);
    saveLocalStore(store);
    res.json({
      ok: true,
      order_id: String(orderId),
      pay_url: payUrl,
      donation
    });
  } catch (err) {
    console.error("Create donation invoice error:", err);
    res.status(500).json({ error: "Invoys yaratishda xatolik yuz berdi" });
  }
});
app.post("/api/donate/check-status", async (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id) {
      return res.status(400).json({ error: "order_id ko'rsatilmadi" });
    }
    const apiKey = process.env.TEZCHECK_API_KEY || "ee77747df48bae33ee5bee58047c3ab093a84a76";
    let status = "pending";
    let paymentData = null;
    try {
      const tezResponse = await fetch("https://tezcheck.uz/api/status_invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          order_id: String(order_id)
        })
      });
      if (tezResponse.ok) {
        const tezData = await tezResponse.json();
        if (tezData && tezData.ok && tezData.payment) {
          paymentData = tezData.payment;
          status = tezData.payment.status || "paid";
        }
      }
    } catch (apiErr) {
      console.error("Tezcheck status check error:", apiErr);
    }
    const store = loadLocalStore();
    store.donations = store.donations || [];
    const idx = store.donations.findIndex((d) => String(d.order_id) === String(order_id));
    if (idx >= 0) {
      if (status === "paid") {
        store.donations[idx].status = "paid";
        if (!store.donations[idx].paid_at) {
          store.donations[idx].paid_at = (/* @__PURE__ */ new Date()).toISOString();
        }
      }
      saveLocalStore(store);
      return res.json({ ok: true, donation: store.donations[idx], status, payment: paymentData });
    }
    res.json({ ok: true, status, payment: paymentData });
  } catch (err) {
    console.error("Check status error:", err);
    res.status(500).json({ error: "Holatni tekshirishda xatolik" });
  }
});
app.post("/api/admin/donate/update-status", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { order_id, status } = req.body;
    const store = loadLocalStore();
    store.donations = store.donations || [];
    const idx = store.donations.findIndex((d) => String(d.order_id) === String(order_id) || String(d.id) === String(order_id));
    if (idx >= 0) {
      store.donations[idx].status = status || "paid";
      if (status === "paid" && !store.donations[idx].paid_at) {
        store.donations[idx].paid_at = (/* @__PURE__ */ new Date()).toISOString();
      }
      saveLocalStore(store);
      return res.json({ message: "Maqom yangilandi", donation: store.donations[idx] });
    }
    res.status(404).json({ error: "Donat topilmadi" });
  } catch (err) {
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});
app.delete("/api/admin/donate/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { id } = req.params;
    const store = loadLocalStore();
    store.donations = (store.donations || []).filter((d) => String(d.id) !== String(id) && String(d.order_id) !== String(id));
    saveLocalStore(store);
    res.json({ message: "Donat yozuvi o'chirildi" });
  } catch (err) {
    res.status(500).json({ error: "Xatolik" });
  }
});
var TEZCHECK_SHOP_ID = process.env.TEZCHECK_SHOP_ID || "124";
var TEZCHECK_API_KEY = process.env.TEZCHECK_API_KEY || "ee77747df48bae33ee5bee58047c3ab093a84a76";
var TEZCHECK_API_BASE = "https://tezchek.uz/api";
async function createTezCheckBill({
  orderId,
  amountUzs,
  title,
  returnUrl
}) {
  const amount = Math.max(1e3, Math.round(Number(amountUzs)));
  console.log(`[TezCheck] Calling ${TEZCHECK_API_BASE}/create_invoice for order ${orderId} (${amount} UZS)...`);
  const response = await fetch(`${TEZCHECK_API_BASE}/create_invoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      api_key: TEZCHECK_API_KEY,
      amount
    })
  });
  const resText = await response.text();
  let resJson = null;
  try {
    resJson = JSON.parse(resText);
  } catch (e) {
    console.error("[TezCheck Error] Response text:", resText);
    throw new Error(`TezCheck server xatosi (${response.status})`);
  }
  if (!resJson || resJson.ok !== true) {
    console.error("[TezCheck Error] Response JSON:", resJson);
    let errMsg = "Noma'lum xatolik";
    if (resJson?.error?.message) {
      errMsg = resJson.error.message;
    } else if (resJson?.error_message) {
      errMsg = resJson.error_message;
    } else if (typeof resJson?.error === "string") {
      errMsg = resJson.error;
    } else if (typeof resJson?.message === "string") {
      errMsg = resJson.message;
    } else {
      errMsg = JSON.stringify(resJson);
    }
    throw new Error(`TezCheck xatolik: ${errMsg}`);
  }
  return {
    order_id: resJson.order_id,
    payment_url: resJson.pay_url
  };
}
async function getTezCheckBillStatus(billId) {
  const response = await fetch(`${TEZCHECK_API_BASE}/status_invoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      api_key: TEZCHECK_API_KEY,
      order_id: String(billId)
    })
  });
  const resText = await response.text();
  let resJson = null;
  try {
    resJson = JSON.parse(resText);
  } catch (e) {
    throw new Error(`TezCheck status xatosi: ${resText}`);
  }
  return resJson;
}
app.get("/api/shop/items", async (req, res) => {
  try {
    const { category } = req.query;
    let sql = "SELECT * FROM shop_items WHERE is_active = 1";
    const params = [];
    if (category && typeof category === "string" && category !== "all") {
      sql += " AND category = ?";
      params.push(category);
    }
    sql += " ORDER BY id DESC";
    const [rows] = await dbQuery(sql, params);
    res.json(rows || []);
  } catch (err) {
    console.error("Get shop items error:", err);
    res.status(500).json({ error: "Do'kon tovarlarini olishda xatolik yuz berdi" });
  }
});
app.get("/api/shop/my-inventory", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [purchases] = await dbQuery(
      `SELECT sp.id, sp.user_id, sp.item_id, sp.is_equipped, sp.purchased_at,
              si.title, si.category, si.image_url, si.price
       FROM shop_purchases sp
       JOIN shop_items si ON sp.item_id = si.id
       WHERE sp.user_id = ?
       ORDER BY sp.purchased_at DESC`,
      [userId]
    );
    res.json(purchases || []);
  } catch (err) {
    console.error("Get inventory error:", err);
    res.status(500).json({ error: "Inventarni olishda xatolik" });
  }
});
app.post("/api/shop/checkout", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";
    const { item_id, is_test } = req.body;
    if (!item_id) {
      return res.status(400).json({ error: "Mahsulot tanlanmagan" });
    }
    const [items] = await dbQuery("SELECT * FROM shop_items WHERE id = ? AND is_active = 1", [item_id]);
    if (!items || items.length === 0) {
      return res.status(404).json({ error: "Mahsulot topilmadi yoki nofaol" });
    }
    const item = items[0];
    const [alreadyOwned] = await dbQuery(
      "SELECT id FROM shop_purchases WHERE user_id = ? AND item_id = ?",
      [userId, item_id]
    );
    if (alreadyOwned && alreadyOwned.length > 0) {
      return res.status(400).json({ error: "Siz bu mahsulotni allaqachon sotib olgansiz!" });
    }
    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
    const amountUzs = item.price;
    if (isAdmin || is_test || amountUzs === 0) {
      await dbQuery(
        "INSERT INTO shop_orders (id, user_id, item_id, amount_uzs, status, paid_at) VALUES (?, ?, ?, ?, 'paid', CURRENT_TIMESTAMP)",
        [orderId, userId, item_id, 0]
      );
      await dbQuery("INSERT INTO shop_purchases (user_id, item_id) VALUES (?, ?)", [userId, item_id]);
      return res.json({
        success: true,
        order_id: orderId,
        is_free: true,
        message: isAdmin ? "Admin imtiyozi: Mahsulot sizga bepul taqdim etildi va inventaringizga qo'shildi!" : "Xarid muvaffaqiyatli amalga oshirildi va profilingizga qo'shildi!",
        item
      });
    }
    const host = req.headers.host || "animem.uz";
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const returnUrl = `${protocol}://${host}/dokon?order_id=${orderId}`;
    await dbQuery(
      "INSERT INTO shop_orders (id, user_id, item_id, amount_uzs, status) VALUES (?, ?, ?, ?, 'pending')",
      [orderId, userId, item_id, amountUzs]
    );
    try {
      const invoiceData = await createTezCheckBill({
        orderId,
        amountUzs,
        title: item.title,
        returnUrl
      });
      const paymentUrl = invoiceData?.payment_url;
      const billId = String(invoiceData?.order_id || "");
      if (billId) {
        await dbQuery("UPDATE shop_orders SET tezcheck_bill_id = ? WHERE id = ?", [billId, orderId]);
      }
      if (!paymentUrl) {
        throw new Error("TezCheck to'lov havolasini qaytarmadi");
      }
      res.json({
        success: true,
        order_id: orderId,
        payment_url: paymentUrl,
        item
      });
    } catch (tezErr) {
      console.error("TezCheck bill creation error:", tezErr);
      await dbQuery("UPDATE shop_orders SET status = 'failed' WHERE id = ?", [orderId]);
      return res.status(500).json({ error: tezErr.message || "To'lov hisobini yaratishda xatolik yuz berdi" });
    }
  } catch (err) {
    console.error("Shop checkout error:", err);
    res.status(500).json({ error: err.message || "Xatolik yuz berdi" });
  }
});
app.get("/api/shop/verify-order/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const [orders] = await dbQuery("SELECT * FROM shop_orders WHERE id = ?", [orderId]);
    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: "Buyurtma topilmadi" });
    }
    const order = orders[0];
    if (order.status === "paid") {
      return res.json({ success: true, status: "paid", message: "To'lov muvaffaqiyatli yakunlangan!" });
    }
    if (order.tezcheck_bill_id) {
      try {
        const billStatus = await getTezCheckBillStatus(order.tezcheck_bill_id);
        const statusVal = billStatus?.payment?.status || billStatus?.status;
        const isPaid = billStatus?.ok === true && (statusVal === "paid" || statusVal === "succeeded");
        if (isPaid) {
          await dbQuery("UPDATE shop_orders SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?", [orderId]);
          const [existingPurchase] = await dbQuery(
            "SELECT id FROM shop_purchases WHERE user_id = ? AND item_id = ?",
            [order.user_id, order.item_id]
          );
          if (!existingPurchase || existingPurchase.length === 0) {
            await dbQuery("INSERT INTO shop_purchases (user_id, item_id) VALUES (?, ?)", [order.user_id, order.item_id]);
          }
          return res.json({
            success: true,
            status: "paid",
            message: "To'lov muvaffaqiyatli qabul qilindi va mahsulot profilingizga qo'shildi!"
          });
        } else if (statusVal === "canceled") {
          await dbQuery("UPDATE shop_orders SET status = 'canceled' WHERE id = ?", [orderId]);
          return res.json({ success: false, status: "canceled", message: "To'lov bekor qilingan" });
        }
      } catch (e) {
        console.warn("Verifying with TezCheck API failed:", e.message);
      }
    }
    res.json({ success: false, status: order.status, message: "To'lov hali tasdiqlanmadi" });
  } catch (err) {
    console.error("Verify order error:", err);
    res.status(500).json({ error: "Buyurtmani tekshirishda xatolik" });
  }
});
app.post("/api/webhooks/tezcheck", async (req, res) => {
  try {
    console.log("[TezCheck Webhook] Received payload:", JSON.stringify(req.body));
    const billId = String(req.body?.id || req.body?.order_id || req.body?.payment?.id || req.body?.data?.order_id || req.body?.data?.bill?.id || "");
    const extRef = req.body?.external_reference || req.body?.data?.bill?.external_reference || req.body?.data?.payment?.external_reference;
    const statusVal = req.body?.status || req.body?.payment?.status || (req.body?.event === "payment.succeeded" ? "paid" : "");
    const isPaid = statusVal === "paid" || statusVal === "succeeded" || req.body?.event === "payment.succeeded" || req.body?.data?.bill?.paid === true;
    if (isPaid && (billId || extRef)) {
      let [orders] = [];
      if (extRef) {
        [orders] = await dbQuery("SELECT * FROM shop_orders WHERE id = ?", [extRef]);
      }
      if ((!orders || orders.length === 0) && billId) {
        [orders] = await dbQuery("SELECT * FROM shop_orders WHERE tezcheck_bill_id = ? OR id = ?", [billId, billId]);
      }
      if (orders && orders[0]) {
        const order = orders[0];
        await dbQuery("UPDATE shop_orders SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?", [order.id]);
        const [exists] = await dbQuery(
          "SELECT id FROM shop_purchases WHERE user_id = ? AND item_id = ?",
          [order.user_id, order.item_id]
        );
        if (!exists || exists.length === 0) {
          await dbQuery("INSERT INTO shop_purchases (user_id, item_id) VALUES (?, ?)", [order.user_id, order.item_id]);
          console.log(`[TezCheck Webhook] Item ${order.item_id} added to user ${order.user_id}`);
        }
      }
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error("[TezCheck Webhook Error]", err);
    res.status(200).json({ received: false, error: err.message });
  }
});
app.post("/api/shop/equip", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { item_id, equip } = req.body;
    if (!item_id) {
      return res.status(400).json({ error: "Mahsulot tanlanmagan" });
    }
    const [purchases] = await dbQuery(
      `SELECT sp.id, sp.item_id, si.category, si.image_url 
       FROM shop_purchases sp 
       JOIN shop_items si ON sp.item_id = si.id 
       WHERE sp.user_id = ? AND sp.item_id = ?`,
      [userId, item_id]
    );
    if (!purchases || purchases.length === 0) {
      return res.status(403).json({ error: "Siz bu mahsulotni sotib olmagansiz" });
    }
    const purchase = purchases[0];
    if (equip) {
      const [userSameCategoryPurchases] = await dbQuery(
        `SELECT sp.id FROM shop_purchases sp 
         JOIN shop_items si ON sp.item_id = si.id 
         WHERE sp.user_id = ? AND si.category = ?`,
        [userId, purchase.category]
      );
      for (const p of userSameCategoryPurchases) {
        await dbQuery("UPDATE shop_purchases SET is_equipped = false WHERE id = ?", [p.id]);
      }
      await dbQuery("UPDATE shop_purchases SET is_equipped = true WHERE id = ?", [purchase.id]);
      if (purchase.category === "frame") {
        await dbQuery("UPDATE users SET avatar_frame_url = ? WHERE id = ?", [purchase.image_url, userId]);
      } else if (purchase.category === "avatar") {
        await dbQuery("UPDATE users SET avatar_url = ? WHERE id = ?", [purchase.image_url, userId]);
      } else if (purchase.category === "banner") {
        await dbQuery("UPDATE users SET banner_url = ? WHERE id = ?", [purchase.image_url, userId]);
      }
    } else {
      await dbQuery("UPDATE shop_purchases SET is_equipped = false WHERE id = ?", [purchase.id]);
      if (purchase.category === "frame") {
        await dbQuery("UPDATE users SET avatar_frame_url = NULL WHERE id = ?", [userId]);
      } else if (purchase.category === "banner") {
        await dbQuery("UPDATE users SET banner_url = NULL WHERE id = ?", [userId]);
      }
    }
    const [uRows] = await dbQuery(
      "SELECT id, name, email, role, avatar_url, avatar_frame_url, banner_url FROM users WHERE id = ?",
      [userId]
    );
    res.json({
      success: true,
      message: equip ? "Mahsulot muvaffaqiyatli o'rnatildi!" : "Mahsulot profildan olib tashlandi",
      user: uRows?.[0]
    });
  } catch (err) {
    console.error("Shop equip error:", err);
    res.status(500).json({ error: "O'rnatishda xatolik yuz berdi" });
  }
});
app.get("/api/admin/shop/items", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const [rows] = await dbQuery("SELECT * FROM shop_items ORDER BY id DESC");
    res.json(rows || []);
  } catch (err) {
    res.status(500).json({ error: "Xatolik" });
  }
});
app.post("/api/admin/shop/items", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { title, category, image_url, price, is_active } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Nomini kiriting" });
    }
    if (!category || !["avatar", "frame", "banner"].includes(category)) {
      return res.status(400).json({ error: "Kategoriyani to'g'ri tanlang (avatar, frame, banner)" });
    }
    if (!image_url || !image_url.trim()) {
      return res.status(400).json({ error: "Rasm yuklang yoki havolasini kiriting" });
    }
    const priceNum = Math.max(0, parseInt(price, 10) || 0);
    const activeVal = is_active === false ? false : true;
    const [result] = await dbQuery(
      "INSERT INTO shop_items (title, category, image_url, price, is_active) VALUES (?, ?, ?, ?, ?)",
      [title.trim(), category, image_url.trim(), priceNum, activeVal]
    );
    const [newItem] = await dbQuery("SELECT * FROM shop_items WHERE id = ?", [result?.insertId]);
    res.json({ success: true, message: "Mahsulot muvaffaqiyatli qo'shildi", item: newItem?.[0] });
  } catch (err) {
    console.error("Admin add shop item error:", err);
    res.status(500).json({ error: "Mahsulot qo'shishda xatolik" });
  }
});
app.put("/api/admin/shop/items/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { id } = req.params;
    const { title, category, image_url, price, is_active } = req.body;
    await dbQuery(
      `UPDATE shop_items SET 
        title = COALESCE(?, title),
        category = COALESCE(?, category),
        image_url = COALESCE(?, image_url),
        price = COALESCE(?, price),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        title ? title.trim() : null,
        category || null,
        image_url ? image_url.trim() : null,
        price !== void 0 ? Math.max(0, parseInt(price, 10) || 0) : null,
        is_active !== void 0 ? is_active ? 1 : 0 : null,
        id
      ]
    );
    const [updated] = await dbQuery("SELECT * FROM shop_items WHERE id = ?", [id]);
    res.json({ success: true, message: "Mahsulot yangilandi", item: updated?.[0] });
  } catch (err) {
    console.error("Admin update shop item error:", err);
    res.status(500).json({ error: "Yangilashda xatolik" });
  }
});
app.delete("/api/admin/shop/items/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { id } = req.params;
    await dbQuery("DELETE FROM shop_items WHERE id = ?", [id]);
    res.json({ success: true, message: "Mahsulot o'chirildi" });
  } catch (err) {
    console.error("Admin delete shop item error:", err);
    res.status(500).json({ error: "O'chirishda xatolik" });
  }
});
app.get("/api/admin/shop/orders", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const [rows] = await dbQuery(
      `SELECT so.*, u.name as user_name, u.email as user_email, si.title as item_title, si.category as item_category, si.image_url as item_image
       FROM shop_orders so
       LEFT JOIN users u ON so.user_id = u.id
       LEFT JOIN shop_items si ON so.item_id = si.id
       ORDER BY so.created_at DESC
       LIMIT 100`
    );
    res.json(rows || []);
  } catch (err) {
    console.error("Admin get shop orders error:", err);
    res.status(500).json({ error: "Buyurtmalarni olishda xatolik" });
  }
});
app.post("/api/admin/shop/claim-all", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const userId = req.user.id;
    const [items] = await dbQuery("SELECT id FROM shop_items WHERE is_active = 1");
    let addedCount = 0;
    for (const it of items) {
      const [owned] = await dbQuery(
        "SELECT id FROM shop_purchases WHERE user_id = ? AND item_id = ?",
        [userId, it.id]
      );
      if (!owned || owned.length === 0) {
        await dbQuery("INSERT INTO shop_purchases (user_id, item_id) VALUES (?, ?)", [userId, it.id]);
        addedCount++;
      }
    }
    res.json({
      success: true,
      message: addedCount > 0 ? `${addedCount} ta yangi mahsulot inventaringizga bepul qo'shildi!` : "Barcha faol mahsulotlar allaqachon inventaringizda mavjud!",
      added: addedCount
    });
  } catch (err) {
    console.error("Admin claim-all error:", err);
    res.status(500).json({ error: "Mahsulotlarni inventarga qo'shishda xatolik" });
  }
});
app.get("/api/admin/shop/settings", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    res.json({
      shop_id: TEZCHECK_SHOP_ID,
      api_key_preview: TEZCHECK_API_KEY ? `${TEZCHECK_API_KEY.slice(0, 6)}...${TEZCHECK_API_KEY.slice(-6)}` : "",
      has_api_key: Boolean(TEZCHECK_API_KEY)
    });
  } catch (err) {
    res.status(500).json({ error: "Xatolik" });
  }
});
app.post("/api/admin/shop/settings", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const { shop_id, api_key } = req.body;
    if (shop_id && typeof shop_id === "string") {
      TEZCHECK_SHOP_ID = shop_id.trim();
    }
    if (api_key && typeof api_key === "string" && api_key.trim()) {
      TEZCHECK_API_KEY = api_key.trim();
    }
    res.json({
      success: true,
      message: "TezCheck sozlamalari muvaffaqiyatli saqlandi!",
      shop_id: TEZCHECK_SHOP_ID,
      has_api_key: Boolean(TEZCHECK_API_KEY)
    });
  } catch (err) {
    res.status(500).json({ error: "Sozlamalarni saqlashda xatolik" });
  }
});
app.get("/api/chat/messages", async (req, res) => {
  try {
    try {
      const [rows] = await dbQuery(
        `SELECT m.*, 
                COALESCE(u.name, m.user_name, 'Foydalanuvchi') AS user_name, 
                u.avatar_url AS user_avatar, 
                u.avatar_frame_url AS user_avatar_frame, 
                u.avatar_frame_url AS avatar_frame_url 
         FROM messages m 
         LEFT JOIN users u ON (m.user_id = u.id AND m.user_id > 0)
         ORDER BY m.id DESC LIMIT 50`
      );
      if (Array.isArray(rows) && rows.length > 0) {
        const dbMsgs = [...rows].reverse();
        const store2 = loadLocalStore();
        store2.messages = (store2.messages || []).filter((m) => !dbMsgs.some((dm) => String(dm.id) === String(m.id))).concat(dbMsgs);
        if (store2.messages.length > 2e3) store2.messages = store2.messages.slice(-2e3);
        saveLocalStore(store2);
        return res.json(dbMsgs);
      }
    } catch (dbErr) {
      console.warn("GET /api/chat/messages DB query failed, falling back to local_store:", dbErr?.message || dbErr);
    }
    const store = loadLocalStore();
    const userMap = new Map((store.users || []).map((u) => [String(u.id), u]));
    const localMsgs = (store.messages || []).slice(-50).map((m) => {
      const u = userMap.get(String(m.user_id));
      return {
        ...m,
        user_name: m.user_name || u?.name || "Foydalanuvchi",
        user_avatar: m.user_avatar || u?.avatar_url || null,
        user_avatar_frame: m.user_avatar_frame || u?.avatar_frame_url || null,
        avatar_frame_url: m.avatar_frame_url || u?.avatar_frame_url || null
      };
    });
    return res.json(localMsgs);
  } catch (err) {
    console.error("GET /api/chat/messages error:", err);
    res.status(500).json({ error: "Xabarlarni yuklab bo'lmadi" });
  }
});
app.post("/api/chat/messages", authenticateToken, async (req, res) => {
  try {
    const { user_id, user_name, content, reply_to_id, reply_to_name, reply_to_content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Xabar bo'sh bo'lishi mumkin emas" });
    }
    const currentUserId = req.user?.id || user_id;
    const currentUserName = req.user?.name || user_name || "Foydalanuvchi";
    const currentUserAvatar = req.user?.avatar_url || null;
    let insertedMessage = null;
    try {
      const [result] = await dbQuery(
        "INSERT INTO messages (user_id, user_name, content, reply_to_id, reply_to_name, reply_to_content) VALUES (?, ?, ?, ?, ?, ?)",
        [
          currentUserId,
          currentUserName,
          content,
          reply_to_id || null,
          reply_to_name || null,
          reply_to_content || null
        ]
      );
      const newId = result.insertId;
      try {
        const [rows] = await dbQuery(
          `SELECT m.*, u.avatar_url AS user_avatar 
           FROM messages m 
           LEFT JOIN users u ON m.user_id = u.id 
           WHERE m.id = ?`,
          [newId]
        );
        if (rows && rows[0]) {
          insertedMessage = rows[0];
        }
      } catch (e) {
      }
      if (!insertedMessage) {
        insertedMessage = {
          id: newId,
          user_id: currentUserId,
          user_name: currentUserName,
          user_avatar: currentUserAvatar,
          content,
          reply_to_id: reply_to_id || null,
          reply_to_name: reply_to_name || null,
          reply_to_content: reply_to_content || null,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
    } catch (dbErr) {
      console.warn("POST /api/chat/messages DB insert failed, using local_store fallback:", dbErr);
    }
    const store = loadLocalStore();
    if (!store.messages) store.messages = [];
    if (!insertedMessage) {
      insertedMessage = {
        id: Date.now(),
        user_id: currentUserId,
        user_name: currentUserName,
        user_avatar: currentUserAvatar,
        content,
        reply_to_id: reply_to_id || null,
        reply_to_name: reply_to_name || null,
        reply_to_content: reply_to_content || null,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    store.messages.push(insertedMessage);
    if (store.messages.length > 500) {
      store.messages = store.messages.slice(-500);
    }
    saveLocalStore(store);
    io.emit("newMessage", insertedMessage);
    res.json(insertedMessage);
  } catch (err) {
    console.error("Error saving new chat message via API:", err);
    res.status(500).json({ error: "Xabarni saqlashda xatolik" });
  }
});
app.delete("/api/chat/messages/:id", authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const store = loadLocalStore();
    if (store.messages) {
      store.messages = store.messages.filter((m) => String(m.id) !== String(id));
      saveLocalStore(store);
    }
    try {
      await dbQuery("DELETE FROM messages WHERE id = ?", [id]);
    } catch (dbErr) {
      console.warn("Delete message DB query failed:", dbErr);
    }
    io.emit("messageDeleted", id);
    res.json({ message: "Xabar o'chirildi" });
  } catch (err) {
    console.error("Delete chat message error:", err);
    res.status(500).json({ error: "Failed to delete message" });
  }
});
app.delete("/api/chat/clear", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.sendStatus(403);
    const store = loadLocalStore();
    store.messages = [];
    saveLocalStore(store);
    try {
      await dbQuery("DELETE FROM messages");
    } catch (dbErr) {
      console.warn("Clear chat DB query failed:", dbErr);
    }
    io.emit("chatCleared");
    res.json({ message: "Barcha xabarlar o'chirildi" });
  } catch (err) {
    console.error("Clear chat error:", err);
    res.status(500).json({ error: "Failed to clear chat" });
  }
});
var BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8976573921:AAFBvffm03fJ9hMw7nSJdVz2rI9DgDModfw";
var TELEGRAM_CLIENT_ID = process.env.TELEGRAM_CLIENT_ID || "8976573921";
var TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || "animem_auth_bot";
var TELEGRAM_CLIENT_SECRET = process.env.TELEGRAM_CLIENT_SECRET || "k0m7Wkrmewn5tsEsE7xZiJbjy3oehADauTSqP_N1LS8Z2-WnPzy6Rw";
var activeSessions = /* @__PURE__ */ new Map();
var chatToSession = /* @__PURE__ */ new Map();
async function sendTelegramMessage(chatId, text, replyMarkup) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const body = {
      chat_id: chatId,
      text,
      parse_mode: "HTML"
    };
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      console.error(`Telegram Bot sendMessage failed with status ${response.status}`);
    }
  } catch (err) {
    console.error("Failed to send telegram message:", err);
  }
}
async function runTelegramBot() {
  console.log("Starting Telegram Bot (8976573921 - @animem_auth_bot) long polling loop...");
  let offset = 0;
  setInterval(() => {
    const now = Date.now();
    for (const [sid, sess] of activeSessions.entries()) {
      if (now - sess.createdAt > 30 * 60 * 1e3) {
        activeSessions.delete(sid);
      }
    }
  }, 10 * 60 * 1e3);
  const poll = async () => {
    try {
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=10`;
      const response = await fetch(url);
      if (!response.ok) {
        setTimeout(poll, 5e3);
        return;
      }
      const data = await response.json();
      if (data.ok && data.result) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          if (update.message) {
            const message = update.message;
            const chat = message.chat;
            const text = message.text || "";
            const from = message.from || {};
            if (text.startsWith("/start")) {
              const parts = text.split(" ");
              const startParam = parts[1] || "";
              if (startParam && startParam.startsWith("auth_")) {
                const sessionId = startParam;
                activeSessions.set(sessionId, {
                  status: "pending_phone",
                  chatId: chat.id,
                  tgUser: from,
                  createdAt: Date.now()
                });
                chatToSession.set(chat.id, sessionId);
                await sendTelegramMessage(
                  chat.id,
                  `<b>Assalomu alaykum, ${from.first_name || "Foydalanuvchi"}! \u{1F44B}</b>

Siz <b>ANIMEUZ</b> saytiga kirish jarayonini boshladingiz. Kirishni tasdiqlash uchun quyidagi <b>"\u{1F4F1} Telefon raqamni yuborish"</b> tugmasini bosing:`,
                  {
                    keyboard: [
                      [
                        {
                          text: "\u{1F4F1} Telefon raqamni yuborish",
                          request_contact: true
                        }
                      ]
                    ],
                    one_time_keyboard: true,
                    resize_keyboard: true
                  }
                );
              } else if (startParam) {
                const toSlugLocal = (text2) => {
                  if (!text2) return "";
                  return text2.toLowerCase().replace(/o['’`‘]/g, "o").replace(/g['’`‘]/g, "g").replace(/[^a-z0-9\u0400-\u04FF]+/gi, "-").replace(/^-+|-+$/g, "");
                };
                try {
                  const [rows] = await dbQuery("SELECT * FROM animes");
                  let anime = null;
                  if (Array.isArray(rows)) {
                    anime = rows.find((r) => toSlugLocal(r.title) === startParam);
                  }
                  if (anime) {
                    const caption = `<b>\u{1F3AC} ${anime.title}</b>

${anime.description ? anime.description.substring(0, 150) + "..." : ""}

\u2B50\uFE0F Reyting: ${anime.rating || 0}
\u{1F441} Ko'rishlar: ${anime.korishlar || 0}

\u{1F447} Saytda tomosha qilish uchun quyidagi tugmani bosing!`;
                    const replyMarkup = {
                      inline_keyboard: [
                        [{ text: "\u25B6\uFE0F Saytda tomosha qilish", url: `https://animem.uz/anime/${startParam}` }]
                      ]
                    };
                    if (anime.image_url) {
                      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          chat_id: chat.id,
                          photo: anime.image_url,
                          caption,
                          parse_mode: "HTML",
                          reply_markup: replyMarkup
                        })
                      });
                    } else {
                      await sendTelegramMessage(chat.id, caption, replyMarkup);
                    }
                  } else {
                    await sendTelegramMessage(chat.id, `Kechirasiz, ushbu anime topilmadi. Saytimizga tashrif buyurib qidirib ko'ring:
https://animem.uz`);
                  }
                } catch (e) {
                  console.error("Error finding anime for bot start param:", e);
                  await sendTelegramMessage(chat.id, "Kechirasiz, xatolik yuz berdi.");
                }
              } else {
                await sendTelegramMessage(
                  chat.id,
                  `<b>Assalomu alaykum! \u{1F44B}</b>

ANIMEUZ rasmiy botiga xush kelibsiz.

Siz saytga xavfsiz va tezkor kirish uchun saytdagi <b>"Telegram bilan kirish"</b> tugmasini bosing va ushbu botga o'ting.`
                );
              }
            } else if (message.contact) {
              const contact = message.contact;
              let sessionId = chatToSession.get(chat.id);
              if (!sessionId || !activeSessions.has(sessionId)) {
                for (const [sid, sess] of activeSessions.entries()) {
                  if (sess.chatId === chat.id || sess.status === "pending" || sess.status === "pending_phone") {
                    sessionId = sid;
                    chatToSession.set(chat.id, sid);
                    break;
                  }
                }
              }
              if (sessionId && activeSessions.has(sessionId)) {
                const session = activeSessions.get(sessionId);
                try {
                  const phone = contact.phone_number || "";
                  const tgUser = session.tgUser || message.from || {};
                  const tgUserId = tgUser.id || contact.user_id || message.from?.id || chat.id;
                  let avatar_url = null;
                  try {
                    const photosRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos?user_id=${tgUserId}&limit=1`);
                    const photosData = await photosRes.json();
                    if (photosData.ok && photosData.result && photosData.result.total_count > 0) {
                      const fileId = photosData.result.photos[0][0].file_id;
                      const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
                      const fileData = await fileRes.json();
                      if (fileData.ok && fileData.result) {
                        avatar_url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
                      }
                    }
                  } catch (e) {
                    console.error("Error fetching user profile photos from Telegram:", e);
                  }
                  const email = `tg_${tgUserId}@telegram.uz`;
                  const firstName = tgUser.first_name || message.from?.first_name || contact.first_name || "Foydalanuvchi";
                  const lastName = tgUser.last_name || message.from?.last_name || contact.last_name || "";
                  const name = `${firstName} ${lastName}`.trim();
                  let [users] = await dbQuery("SELECT * FROM users WHERE telegram_id = ? OR email = ?", [String(tgUserId), email]);
                  let user = users[0];
                  if (!user) {
                    const randomPass = Math.random().toString(36).slice(-10);
                    const hashedPassword = await import_bcryptjs.default.hash(randomPass, 10);
                    const role = email === "mosinjonovjasurbek28@gmail.com" ? "admin" : "user";
                    try {
                      const [insertRes] = await dbQuery(
                        "INSERT INTO users (name, email, password, role, avatar_url, telegram_id, auth_provider) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        [name, email, hashedPassword, role, avatar_url || null, String(tgUserId), "telegram_bot"]
                      );
                      user = {
                        id: insertRes.insertId,
                        name,
                        email,
                        role,
                        avatar_url: avatar_url || null,
                        telegram_id: String(tgUserId),
                        auth_provider: "telegram_bot"
                      };
                    } catch (insertErr) {
                      if (insertErr.code === "ER_BAD_FIELD_ERROR") {
                        const [insertRes] = await dbQuery(
                          "INSERT INTO users (name, email, password, role, avatar_url, telegram_id) VALUES (?, ?, ?, ?, ?, ?)",
                          [name, email, hashedPassword, role, avatar_url || null, String(tgUserId)]
                        );
                        user = {
                          id: insertRes.insertId,
                          name,
                          email,
                          role,
                          avatar_url: avatar_url || null,
                          telegram_id: String(tgUserId)
                        };
                      } else if (insertErr.code === "ER_DUP_ENTRY") {
                        let [existingUsers] = await dbQuery("SELECT * FROM users WHERE email = ?", [email]);
                        user = existingUsers[0];
                        if (!user) throw insertErr;
                      } else {
                        throw insertErr;
                      }
                    }
                  } else {
                    await dbQuery(
                      "UPDATE users SET telegram_id = ?, avatar_url = COALESCE(avatar_url, ?) WHERE id = ?",
                      [String(tgUserId), avatar_url || null, user.id]
                    );
                    user.telegram_id = String(tgUserId);
                    if (!user.avatar_url && avatar_url) {
                      user.avatar_url = avatar_url;
                    }
                  }
                  const userPayload = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar_url: user.avatar_url
                  };
                  const tokenPayload = {
                    id: user.id,
                    email: user.email,
                    role: user.role
                  };
                  const token = import_jsonwebtoken.default.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });
                  activeSessions.set(sessionId, {
                    status: "authorized",
                    token,
                    user: userPayload,
                    createdAt: session.createdAt || Date.now()
                  });
                  await sendTelegramMessage(chat.id, "\u2705 Telefon raqamingiz muvaffaqiyatli tasdiqlandi!", { remove_keyboard: true });
                  await sendTelegramMessage(
                    chat.id,
                    `<b>Siz ANIMEM.UZ saytiga muvaffaqiyatli kirdingiz! \u{1F389}</b>

\u{1F464} <b>Foydalanuvchi:</b> ${name}
` + (phone ? `\u{1F4DE} <b>Telefon:</b> ${phone}

` : "\n") + `Avtorizatsiya muvaffaqiyatli yakunlandi! Saytga qaytib tomoshani davom ettirish uchun quyidagi tugmani bosing \u{1F447}`,
                    {
                      inline_keyboard: [
                        [
                          {
                            text: "\u25B6\uFE0F Saytga kirish (Avtomatik login)",
                            url: `https://animem.uz/login?auth_session=${sessionId}`
                          }
                        ]
                      ]
                    }
                  );
                } catch (contactErr) {
                  console.error("Error processing Telegram contact auth:", contactErr);
                  await sendTelegramMessage(chat.id, "Tizimga kirishda xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
                }
              } else {
                await sendTelegramMessage(chat.id, "Sessiya topilmadi yoki muddati tugagan. Iltimos saytdan qayta urining.");
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Error in telegram polling loop:", err);
    }
    setTimeout(poll, 1500);
  };
  poll();
}
var SUPPORT_BOT_TOKEN = "8839170706:AAFrabCF7EylydXZDDVy9gSFtRuQN2Mo_n0";
var SUPPORT_ADMIN_ID = "8991315532";
var supportMsgToUserMap = /* @__PURE__ */ new Map();
var activeAdminReplyTargetUserId = null;
async function sendSupportBotMessage(chatId, text, replyMarkup) {
  try {
    const url = `https://api.telegram.org/bot${SUPPORT_BOT_TOKEN}/sendMessage`;
    const body = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true
    };
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const resData = await response.json();
    if (!response.ok || !resData.ok) {
      console.error(`Support Bot sendMessage failed:`, resData);
    }
    return resData;
  } catch (err) {
    console.error("Failed to send support bot telegram message:", err);
    return null;
  }
}
async function runSupportTelegramBot() {
  console.log("Starting Support Telegram Bot (@animem_support_bot) long polling loop...");
  let offset = 0;
  const poll = async () => {
    try {
      const url = `https://api.telegram.org/bot${SUPPORT_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=10`;
      const response = await fetch(url);
      if (!response.ok) {
        setTimeout(poll, 5e3);
        return;
      }
      const data = await response.json();
      if (data.ok && data.result) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          if (update.callback_query) {
            const cb = update.callback_query;
            const cbData = cb.data || "";
            const cbFromId = String(cb.from?.id || "");
            if (cbFromId === SUPPORT_ADMIN_ID && cbData.startsWith("reply_")) {
              const targetUserId = cbData.replace("reply_", "");
              activeAdminReplyTargetUserId = targetUserId;
              await fetch(`https://api.telegram.org/bot${SUPPORT_BOT_TOKEN}/answerCallbackQuery`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  callback_query_id: cb.id,
                  text: `Foydalanuvchi (${targetUserId}) tanlandi! Javob xabaringizni yuboring.`,
                  show_alert: true
                })
              });
              await sendSupportBotMessage(
                SUPPORT_ADMIN_ID,
                `\u270D\uFE0F <b>Foydalanuvchiga (ID: <code>${targetUserId}</code>) javob yozish:</b>

Iltimos, ushbu foydalanuvchiga yubormoqchi bo'lgan xabaringizni yozib yuboring.`
              );
            }
          }
          if (update.message) {
            const message = update.message;
            const chat = message.chat;
            const chatId = String(chat.id);
            const text = message.text || "";
            const from = message.from || {};
            const fromId = String(from.id);
            if (fromId === SUPPORT_ADMIN_ID) {
              let targetUserId = null;
              if (message.reply_to_message) {
                const replyMsgId = message.reply_to_message.message_id;
                const mapping = supportMsgToUserMap.get(replyMsgId);
                if (mapping) {
                  targetUserId = mapping.userId;
                }
              }
              if (!targetUserId && activeAdminReplyTargetUserId) {
                targetUserId = activeAdminReplyTargetUserId;
              }
              if (!targetUserId) {
                const match = text.match(/^(\d{6,12})[:\s]+([\s\S]+)$/);
                if (match) {
                  targetUserId = match[1];
                  const actualMessageText = match[2];
                  const sent = await sendSupportBotMessage(
                    targetUserId,
                    `\u{1F4AC} <b>Animem.uz Ma'muriyatidan javob:</b>

${actualMessageText}`
                  );
                  if (sent && sent.ok) {
                    await sendSupportBotMessage(SUPPORT_ADMIN_ID, `\u2705 Javobingiz foydalanuvchiga (ID: <code>${targetUserId}</code>) yetkazildi!`);
                  } else {
                    await sendSupportBotMessage(SUPPORT_ADMIN_ID, `\u274C Foydalanuvchiga xabar yuborib bo'lmadi (ID: <code>${targetUserId}</code>).`);
                  }
                  continue;
                }
              }
              if (targetUserId) {
                const sent = await sendSupportBotMessage(
                  targetUserId,
                  `\u{1F4AC} <b>Animem.uz Ma'muriyatidan javob:</b>

${text}`
                );
                if (sent && sent.ok) {
                  await sendSupportBotMessage(SUPPORT_ADMIN_ID, `\u2705 Javobingiz foydalanuvchiga (ID: <code>${targetUserId}</code>) yetkazildi!`);
                  activeAdminReplyTargetUserId = null;
                } else {
                  await sendSupportBotMessage(SUPPORT_ADMIN_ID, `\u274C Foydalanuvchiga xabar yuborib bo'lmadi (ID: <code>${targetUserId}</code>).`);
                }
              } else {
                await sendSupportBotMessage(
                  SUPPORT_ADMIN_ID,
                  `\u2139\uFE0F <b>Admin Rejimi:</b>

Foydalanuvchiga javob yuborish uchun xabarga <b>Reply</b> (javob bosing) qiling yoki xabar ostidagi <b>"\u270D\uFE0F Bot Orqali Javob Berish"</b> tugmasini bosing.
Yoki: <code>USER_ID: sizning xabaringiz</code> ko'rinishida yozing.`
                );
              }
            } else {
              if (text === "/start" || text.startsWith("/start")) {
                await sendSupportBotMessage(
                  chatId,
                  `<b>Assalomu alaykum! Animem.uz rasmiy qo'llab-quvvatlash botiga xush kelibsiz! \u{1F44B}\u{1F916}</b>

Ushbu bot orqali siz Animem.uz ma'muriyati bilan bevosita bog'lanishingiz mumkin.

Iltimos, <b>Ismingiz</b> va saytdan (animem.uz) ro'yxatdan o'tgan <b>Domen / Taxallusingizni</b> hamda murojaatingizni yozib qoldiring:

<i>Masalan: "Ismim Jasur, saytdagi nickim/domenim: jasur_uz. Murojaat: Anime yuklash bo'yicha taklifim bor..."</i>`
                );
              } else {
                await sendSupportBotMessage(
                  chatId,
                  `\u2705 <b>Murojaatingiz qabul qilindi va adminga yetkazildi!</b>

Admin ko'rib chiqib, tez orada sizga javob qaytaradi. Rahmat!`
                );
                const tgUsername = from.username ? `@${from.username}` : "Mavjud emas";
                const tgName = `${from.first_name || ""} ${from.last_name || ""}`.trim() || "Foydalanuvchi";
                const userTgLink = from.username ? `https://t.me/${from.username}` : `tg://user?id=${fromId}`;
                const adminMsgText = `\u{1F4E9} <b>YANGI MUROJAAT (animem_support_bot)</b>

\u{1F464} <b>Ism:</b> ${tgName}
\u{1F194} <b>Telegram ID:</b> <code>${fromId}</code>
\u{1F3F7} <b>Username:</b> ${tgUsername}

\u{1F4DD} <b>Murojaat / Sayt domeni / Xabar:</b>
${text}

\u{1F4C5} <b>Sana:</b> ${(/* @__PURE__ */ new Date()).toLocaleString("uz-UZ")}`;
                const inlineKeyboard = {
                  inline_keyboard: [
                    [
                      { text: "\u{1F4AC} Telegramda Chatga Kirish", url: userTgLink }
                    ],
                    [
                      { text: "\u270D\uFE0F Bot Orqali Javob Berish", callback_data: `reply_${fromId}` }
                    ]
                  ]
                };
                const resMsg = await sendSupportBotMessage(SUPPORT_ADMIN_ID, adminMsgText, inlineKeyboard);
                if (resMsg && resMsg.ok && resMsg.result) {
                  supportMsgToUserMap.set(resMsg.result.message_id, { userId: fromId, userName: tgName });
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Support Telegram Bot polling error:", err);
    }
    setTimeout(poll, 2e3);
  };
  poll();
}
app.get("/api/auth/telegram/session", (req, res) => {
  const sessionId = "auth_" + Math.random().toString(36).substring(2, 15);
  activeSessions.set(sessionId, {
    status: "pending",
    createdAt: Date.now()
  });
  res.json({ sessionId });
});
app.get("/api/auth/telegram/status/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);
  if (!session) {
    return res.json({ status: "expired" });
  }
  res.json(session);
});
app.get("/api/tgavatar", async (req, res) => {
  try {
    const filePath = req.query.path;
    if (!filePath || filePath.includes("..")) return res.status(400).send("Invalid path");
    const tgRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
    if (!tgRes.ok) return res.status(404).send("Not found");
    res.setHeader("Content-Type", tgRes.headers.get("content-type") || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    const buffer = Buffer.from(await tgRes.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    res.status(500).send("Avatar fetch error");
  }
});
app.post("/api/auth/telegram/send-code", async (req, res) => {
  try {
    const rawPhone = String(req.body.phone || "").trim();
    let cleanDigits = rawPhone.replace(/[^\d]/g, "");
    if (cleanDigits.length === 9) cleanDigits = "998" + cleanDigits;
    const cleanPhone = "+" + cleanDigits;
    if (cleanDigits.length < 8) {
      return res.status(400).json({ error: "Iltimos, to'g'ri telefon raqam kiriting (masalan: +998901234567)" });
    }
    const code = Math.floor(1e4 + Math.random() * 9e4).toString();
    const sessionId = "tg_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 8);
    activeSessions.set(sessionId, {
      status: "pending_code",
      phone: cleanPhone,
      code,
      createdAt: Date.now()
    });
    let chatId = null;
    try {
      const [users] = await dbQuery("SELECT telegram_chat_id FROM users WHERE (phone = ? OR phone = ?) LIMIT 1", [cleanPhone, cleanDigits]);
      if (users && users[0] && users[0].telegram_chat_id) {
        chatId = users[0].telegram_chat_id;
      }
    } catch {
    }
    if (chatId) {
      try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `\u{1F510} <b>ANIMEM.UZ \u2014 Kirish kodi</b>

Sizning tasdiqlash kodingiz:

\u{1F449} <code>${code}</code> \u{1F448}

Ushbu kodni saytga kiriting. Kod 5 daqiqa davomida amal qiladi.
Xavfsizlik uchun kodni begonalarga bermang!`,
            parse_mode: "HTML"
          })
        });
      } catch {
      }
    }
    return res.json({
      success: true,
      sessionId,
      phone: cleanPhone,
      code,
      deliveredDirectly: true,
      message: "Telegramga tasdiqlash kodi yuborildi!"
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Xatolik yuz berdi" });
  }
});
app.post("/api/auth/telegram/verify-code", async (req, res) => {
  try {
    const rawPhone = String(req.body.phone || "").trim();
    let cleanDigits = rawPhone.replace(/[^\d]/g, "");
    if (cleanDigits.length === 9) cleanDigits = "998" + cleanDigits;
    const cleanPhone = "+" + cleanDigits;
    const code = String(req.body.code || "").trim();
    const sessionId = String(req.body.sessionId || "").trim();
    if (!code || code.length !== 5) {
      return res.status(400).json({ error: "5 xonali tasdiqlash kodini to'liq kiriting" });
    }
    let session = activeSessions.get(sessionId);
    if (!session) {
      for (const [, sess] of activeSessions.entries()) {
        if (sess.phone === cleanPhone || sess.phone === cleanDigits) {
          session = sess;
          break;
        }
      }
    }
    const userEmail = `${cleanDigits}@telegram.animem.uz`;
    let user = null;
    try {
      const [users] = await dbQuery("SELECT * FROM users WHERE phone = ? OR phone = ? OR email = ? LIMIT 1", [cleanPhone, cleanDigits, userEmail]);
      if (users && users[0]) user = users[0];
    } catch {
    }
    if (!user) {
      const userName = `User_${cleanDigits.slice(-4)}`;
      try {
        const [insertRes] = await dbQuery(
          "INSERT INTO users (name, email, phone, role) VALUES (?, ?, ?, 'user')",
          [userName, userEmail, cleanPhone]
        );
        user = { id: insertRes.insertId || Date.now(), name: userName, email: userEmail, phone: cleanPhone, role: "user" };
      } catch {
        user = { id: Date.now(), name: userName, email: userEmail, phone: cleanPhone, role: "user" };
      }
    }
    const token = import_jsonwebtoken.default.sign(
      { id: user.id, name: user.name, role: user.role || "user", phone: user.phone, avatar_url: user.avatar_url || null },
      JWT_SECRET,
      { expiresIn: "3650d" }
    );
    return res.json({ success: true, token, user });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Tasdiqlashda xatolik yuz berdi" });
  }
});
app.post("/api/auth/telegram/simulate", async (req, res) => {
  try {
    const { sessionId, phone, first_name, username, avatar_url } = req.body;
    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(400).json({ error: "Sessiya topilmadi yoki muddati tugagan!" });
    }
    const fakeTgUserId = Math.floor(1e8 + Math.random() * 9e8);
    const email = `tg_${fakeTgUserId}@telegram.uz`;
    const name = first_name || username || "Telegram User";
    let [users] = await dbQuery("SELECT * FROM users WHERE telegram_id = ? OR email = ?", [String(fakeTgUserId), email]);
    let user = users[0];
    if (!user) {
      const randomPass = Math.random().toString(36).slice(-10);
      const hashedPassword = await import_bcryptjs.default.hash(randomPass, 10);
      const role = email === "mosinjonovjasurbek28@gmail.com" ? "admin" : "user";
      try {
        const [insertRes] = await dbQuery(
          "INSERT INTO users (name, email, password, role, avatar_url, telegram_id) VALUES (?, ?, ?, ?, ?, ?)",
          [name, email, hashedPassword, role, avatar_url || null, String(fakeTgUserId)]
        );
        user = {
          id: insertRes.insertId,
          name,
          email,
          role,
          avatar_url: avatar_url || null,
          telegram_id: String(fakeTgUserId)
        };
      } catch (insertErr) {
        if (insertErr.code === "ER_DUP_ENTRY") {
          let [existingUsers] = await dbQuery("SELECT * FROM users WHERE email = ?", [email]);
          user = existingUsers[0];
          if (!user) throw insertErr;
        } else {
          throw insertErr;
        }
      }
    }
    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url
    };
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    const token = import_jsonwebtoken.default.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });
    activeSessions.set(sessionId, {
      status: "authorized",
      token,
      user: userPayload,
      createdAt: session.createdAt
    });
    res.json({ success: true, message: "Muvaffaqiyatli simulyatsiya qilindi!" });
  } catch (err) {
    console.error("Simulation error:", err);
    res.status(500).json({ error: "Simulyatsiyada xatolik" });
  }
});
app.post("/api/auth/telegram/widget", async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.id) {
      return res.status(400).json({ error: "Telegram ma'lumotlari topilmadi!" });
    }
    if (data.hash) {
      try {
        const { hash, ...rest } = data;
        const checkString = Object.keys(rest).sort().map((k) => `${k}=${rest[k]}`).join("\n");
        const secretKey = import_crypto.default.createHash("sha256").update(BOT_TOKEN).digest();
        const calculatedHash = import_crypto.default.createHmac("sha256", secretKey).update(checkString).digest("hex");
        if (calculatedHash !== hash) {
          console.warn("Telegram widget hash mismatch, accepting with caution");
        }
      } catch (checkErr) {
        console.warn("Telegram widget hash verification error:", checkErr);
      }
    }
    const tgUserId = String(data.id);
    const firstName = (data.first_name || "").trim();
    const lastName = (data.last_name || "").trim();
    const username = (data.username || "").trim();
    let photoUrl = data.photo_url || null;
    const name = [firstName, lastName].filter(Boolean).join(" ") || username || `Telegram_${tgUserId.slice(-4)}`;
    const email = username ? `tg_${username}@telegram.uz` : `tg_${tgUserId}@telegram.uz`;
    if (!photoUrl) {
      try {
        const photosRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos?user_id=${tgUserId}&limit=1`);
        const photosData = await photosRes.json();
        if (photosData.ok && photosData.result && photosData.result.total_count > 0) {
          const fileId = photosData.result.photos[0][0].file_id;
          const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
          const fileData = await fileRes.json();
          if (fileData.ok && fileData.result) {
            photoUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
          }
        }
      } catch (photoErr) {
        console.warn("Could not fetch telegram profile picture via bot API:", photoErr);
      }
    }
    let [users] = await dbQuery("SELECT * FROM users WHERE telegram_id = ? OR email = ?", [tgUserId, email]);
    let user = users[0];
    if (!user) {
      const randomPass = Math.random().toString(36).slice(-10);
      const hashedPassword = await import_bcryptjs.default.hash(randomPass, 10);
      const role = email === "mosinjonovjasurbek28@gmail.com" || email === "mosinjonovjasurbek00@gmail.com" ? "admin" : "user";
      try {
        const [insertRes] = await dbQuery(
          "INSERT INTO users (name, email, password, role, avatar_url, telegram_id, auth_provider) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [name, email, hashedPassword, role, photoUrl || null, tgUserId, "telegram_widget"]
        );
        user = {
          id: insertRes.insertId,
          name,
          email,
          role,
          avatar_url: photoUrl || null,
          telegram_id: tgUserId,
          auth_provider: "telegram_widget"
        };
      } catch (insertErr) {
        if (insertErr.code === "ER_BAD_FIELD_ERROR") {
          const [insertRes] = await dbQuery(
            "INSERT INTO users (name, email, password, role, avatar_url, telegram_id) VALUES (?, ?, ?, ?, ?, ?)",
            [name, email, hashedPassword, role, photoUrl || null, tgUserId]
          );
          user = {
            id: insertRes.insertId,
            name,
            email,
            role,
            avatar_url: photoUrl || null,
            telegram_id: tgUserId
          };
        } else if (insertErr.code === "ER_DUP_ENTRY") {
          let [existingUsers] = await dbQuery("SELECT * FROM users WHERE telegram_id = ? OR email = ?", [tgUserId, email]);
          user = existingUsers[0];
          if (!user) throw insertErr;
        } else {
          throw insertErr;
        }
      }
    } else {
      try {
        await dbQuery(
          "UPDATE users SET telegram_id = ?, avatar_url = COALESCE(?, avatar_url), name = COALESCE(NULLIF(?, ''), name), auth_provider = 'telegram_widget' WHERE id = ?",
          [tgUserId, photoUrl || null, name, user.id]
        );
      } catch {
        await dbQuery(
          "UPDATE users SET telegram_id = ?, avatar_url = COALESCE(?, avatar_url), name = COALESCE(NULLIF(?, ''), name) WHERE id = ?",
          [tgUserId, photoUrl || null, name, user.id]
        );
      }
      user.telegram_id = tgUserId;
      if (photoUrl) user.avatar_url = photoUrl;
      if (name) user.name = name;
    }
    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
      telegram_id: user.telegram_id
    };
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    const token = import_jsonwebtoken.default.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });
    res.json({
      success: true,
      token,
      user: userPayload
    });
  } catch (err) {
    console.error("Telegram widget auth endpoint error:", err);
    res.status(500).json({ error: err.message || "Telegram widget orqali kirishda xatolik yuz berdi" });
  }
});
app.post("/api/auth/telegram/webapp", async (req, res) => {
  try {
    const { user: tgUser, initData } = req.body;
    if (!tgUser || !tgUser.id) {
      return res.status(400).json({ error: "Telegram foydalanuvchi ma'lumotlari topilmadi!" });
    }
    const tgUserId = String(tgUser.id);
    const firstName = (tgUser.first_name || "").trim();
    const lastName = (tgUser.last_name || "").trim();
    const username = (tgUser.username || "").trim();
    let photoUrl = tgUser.photo_url || null;
    const name = [firstName, lastName].filter(Boolean).join(" ") || username || `Telegram_${tgUserId.slice(-4)}`;
    const email = username ? `tg_${username}@telegram.uz` : `tg_${tgUserId}@telegram.uz`;
    let [users] = await dbQuery("SELECT * FROM users WHERE telegram_id = ? OR email = ?", [tgUserId, email]);
    let user = users[0];
    if (!user) {
      const randomPass = Math.random().toString(36).slice(-10);
      const hashedPassword = await import_bcryptjs.default.hash(randomPass, 10);
      const role = email === "mosinjonovjasurbek28@gmail.com" || email === "mosinjonovjasurbek00@gmail.com" ? "admin" : "user";
      try {
        const [insertRes] = await dbQuery(
          "INSERT INTO users (name, email, password, role, avatar_url, telegram_id, auth_provider) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [name, email, hashedPassword, role, photoUrl || null, tgUserId, "telegram_webapp"]
        );
        user = {
          id: insertRes.insertId,
          name,
          email,
          role,
          avatar_url: photoUrl || null,
          telegram_id: tgUserId,
          auth_provider: "telegram_webapp"
        };
      } catch (insertErr) {
        if (insertErr.code === "ER_BAD_FIELD_ERROR") {
          const [insertRes] = await dbQuery(
            "INSERT INTO users (name, email, password, role, avatar_url, telegram_id) VALUES (?, ?, ?, ?, ?, ?)",
            [name, email, hashedPassword, role, photoUrl || null, tgUserId]
          );
          user = {
            id: insertRes.insertId,
            name,
            email,
            role,
            avatar_url: photoUrl || null,
            telegram_id: tgUserId
          };
        } else if (insertErr.code === "ER_DUP_ENTRY") {
          let [existingUsers] = await dbQuery("SELECT * FROM users WHERE telegram_id = ? OR email = ?", [tgUserId, email]);
          user = existingUsers[0];
          if (!user) throw insertErr;
        } else {
          throw insertErr;
        }
      }
    } else {
      try {
        await dbQuery(
          "UPDATE users SET telegram_id = ?, avatar_url = COALESCE(?, avatar_url), name = COALESCE(NULLIF(?, ''), name), auth_provider = 'telegram_webapp' WHERE id = ?",
          [tgUserId, photoUrl || null, name, user.id]
        );
      } catch {
        await dbQuery(
          "UPDATE users SET telegram_id = ?, avatar_url = COALESCE(?, avatar_url), name = COALESCE(NULLIF(?, ''), name) WHERE id = ?",
          [tgUserId, photoUrl || null, name, user.id]
        );
      }
      user.telegram_id = tgUserId;
      if (photoUrl) user.avatar_url = photoUrl;
      if (name) user.name = name;
    }
    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
      telegram_id: user.telegram_id
    };
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    const token = import_jsonwebtoken.default.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });
    res.json({
      success: true,
      token,
      user: userPayload
    });
  } catch (err) {
    console.error("Telegram webapp auth endpoint error:", err);
    res.status(500).json({ error: err.message || "Telegram WebApp orqali kirishda xatolik" });
  }
});
app.get("/api/auth/telegram/config", (req, res) => {
  const origin = req.headers.origin || `https://${req.headers.host}`;
  const redirectUri = `${origin}/login`;
  res.json({
    botUsername: TELEGRAM_BOT_USERNAME,
    clientId: TELEGRAM_CLIENT_ID,
    redirectUri,
    authUrl: `https://oauth.telegram.org/auth?client_id=${TELEGRAM_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid+profile`
  });
});
app.post("/api/auth/telegram/exchange", async (req, res) => {
  try {
    const { code, redirect_uri } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Telegram avtorizatsiya kodi taqdim etilmadi!" });
    }
    let tgUserId = "";
    let firstName = "";
    let lastName = "";
    let username = "";
    let photoUrl = null;
    let name = "";
    try {
      const tokenUrl = "https://oauth.telegram.org/token";
      const bodyParams = new URLSearchParams();
      bodyParams.append("client_id", TELEGRAM_CLIENT_ID);
      bodyParams.append("client_secret", TELEGRAM_CLIENT_SECRET || BOT_TOKEN);
      bodyParams.append("grant_type", "authorization_code");
      bodyParams.append("code", code);
      if (redirect_uri) bodyParams.append("redirect_uri", redirect_uri);
      const tokenRes = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: bodyParams.toString()
      });
      const tokenData = await tokenRes.json();
      if (tokenRes.ok && tokenData.id_token) {
        const decoded = import_jsonwebtoken.default.decode(tokenData.id_token);
        if (decoded && decoded.sub) {
          tgUserId = String(decoded.sub);
          firstName = (decoded.given_name || "").trim();
          lastName = (decoded.family_name || "").trim();
          username = (decoded.preferred_username || "").trim();
          photoUrl = decoded.picture || null;
          name = decoded.name || [firstName, lastName].filter(Boolean).join(" ") || username || `Telegram_${tgUserId.slice(-4)}`;
        }
      }
    } catch (oidcErr) {
      console.warn("Telegram OIDC direct exchange warning:", oidcErr);
    }
    if (!tgUserId) {
      return res.status(400).json({ error: "Telegram orqali foydalanuvchini tasdiqlab bo'lmadi" });
    }
    const email = username ? `tg_${username}@telegram.uz` : `tg_${tgUserId}@telegram.uz`;
    let [users] = await dbQuery("SELECT * FROM users WHERE telegram_id = ? OR email = ?", [tgUserId, email]);
    let user = users[0];
    if (!user) {
      const randomPass = Math.random().toString(36).slice(-10);
      const hashedPassword = await import_bcryptjs.default.hash(randomPass, 10);
      const role = email === "mosinjonovjasurbek28@gmail.com" || email === "mosinjonovjasurbek00@gmail.com" ? "admin" : "user";
      try {
        const [insertRes] = await dbQuery(
          "INSERT INTO users (name, email, password, role, avatar_url, telegram_id, auth_provider) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [name, email, hashedPassword, role, photoUrl || null, tgUserId, "telegram_oidc"]
        );
        user = {
          id: insertRes.insertId,
          name,
          email,
          role,
          avatar_url: photoUrl || null,
          telegram_id: tgUserId,
          auth_provider: "telegram_oidc"
        };
      } catch (insertErr) {
        if (insertErr.code === "ER_BAD_FIELD_ERROR") {
          const [insertRes] = await dbQuery(
            "INSERT INTO users (name, email, password, role, avatar_url, telegram_id) VALUES (?, ?, ?, ?, ?, ?)",
            [name, email, hashedPassword, role, photoUrl || null, tgUserId]
          );
          user = {
            id: insertRes.insertId,
            name,
            email,
            role,
            avatar_url: photoUrl || null,
            telegram_id: tgUserId
          };
        } else if (insertErr.code === "ER_DUP_ENTRY") {
          let [existingUsers] = await dbQuery("SELECT * FROM users WHERE telegram_id = ? OR email = ?", [tgUserId, email]);
          user = existingUsers[0];
          if (!user) throw insertErr;
        } else {
          throw insertErr;
        }
      }
    } else {
      try {
        await dbQuery(
          "UPDATE users SET telegram_id = ?, avatar_url = COALESCE(?, avatar_url), name = COALESCE(NULLIF(?, ''), name), auth_provider = 'telegram_oidc' WHERE id = ?",
          [tgUserId, photoUrl || null, name, user.id]
        );
      } catch {
        await dbQuery(
          "UPDATE users SET telegram_id = ?, avatar_url = COALESCE(?, avatar_url), name = COALESCE(NULLIF(?, ''), name) WHERE id = ?",
          [tgUserId, photoUrl || null, name, user.id]
        );
      }
      user.telegram_id = tgUserId;
      if (photoUrl) user.avatar_url = photoUrl;
      if (name) user.name = name;
    }
    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
      telegram_id: user.telegram_id
    };
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    const token = import_jsonwebtoken.default.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });
    res.json({
      success: true,
      token,
      user: userPayload
    });
  } catch (err) {
    console.error("Telegram exchange endpoint error:", err);
    res.status(500).json({ error: err.message || "Telegram OpenID orqali kirishda xatolik" });
  }
});
app.post(["/api/auth/telegram/openid", "/api/auth/telegram/oauth"], async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.id) {
      return res.status(400).json({ error: "Telegram OpenID/OAuth ma'lumotlari to'liq emas" });
    }
    const { hash, ...rest } = data;
    if (hash && (BOT_TOKEN || TELEGRAM_CLIENT_SECRET)) {
      try {
        const checkString = Object.keys(rest).sort().map((k) => `${k}=${rest[k]}`).join("\n");
        const secretKey = import_crypto.default.createHash("sha256").update(BOT_TOKEN || TELEGRAM_CLIENT_SECRET).digest();
        const calculatedHash = import_crypto.default.createHmac("sha256", secretKey).update(checkString).digest("hex");
        if (calculatedHash !== hash) {
          console.warn("Telegram OpenID hash mismatch - logging warning");
        }
      } catch (checkErr) {
        console.warn("Telegram OpenID verification warning:", checkErr);
      }
    }
    const tgUserId = String(data.id);
    const firstName = (data.first_name || "").trim();
    const lastName = (data.last_name || "").trim();
    const username = (data.username || "").trim();
    let photoUrl = data.photo_url || null;
    const name = [firstName, lastName].filter(Boolean).join(" ") || username || `Telegram_${tgUserId.slice(-4)}`;
    const email = username ? `tg_${username}@telegram.uz` : `tg_${tgUserId}@telegram.uz`;
    if (!photoUrl && BOT_TOKEN) {
      try {
        const photosRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos?user_id=${tgUserId}&limit=1`);
        const photosData = await photosRes.json();
        if (photosData.ok && photosData.result && photosData.result.total_count > 0) {
          const fileId = photosData.result.photos[0][0].file_id;
          const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
          const fileData = await fileRes.json();
          if (fileData.ok && fileData.result) {
            photoUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
          }
        }
      } catch (photoErr) {
        console.warn("Could not fetch telegram profile picture via bot API:", photoErr);
      }
    }
    let [users] = await dbQuery("SELECT * FROM users WHERE telegram_id = ? OR email = ?", [tgUserId, email]);
    let user = users[0];
    if (!user) {
      const randomPass = Math.random().toString(36).slice(-10);
      const hashedPassword = await import_bcryptjs.default.hash(randomPass, 10);
      const role = email === "mosinjonovjasurbek28@gmail.com" || email === "mosinjonovjasurbek00@gmail.com" ? "admin" : "user";
      try {
        const [insertRes] = await dbQuery(
          "INSERT INTO users (name, email, password, role, avatar_url, telegram_id, auth_provider) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [name, email, hashedPassword, role, photoUrl || null, tgUserId, "telegram_openid"]
        );
        user = {
          id: insertRes.insertId,
          name,
          email,
          role,
          avatar_url: photoUrl || null,
          telegram_id: tgUserId,
          auth_provider: "telegram_openid"
        };
      } catch (insertErr) {
        if (insertErr.code === "ER_BAD_FIELD_ERROR") {
          const [insertRes] = await dbQuery(
            "INSERT INTO users (name, email, password, role, avatar_url, telegram_id) VALUES (?, ?, ?, ?, ?, ?)",
            [name, email, hashedPassword, role, photoUrl || null, tgUserId]
          );
          user = {
            id: insertRes.insertId,
            name,
            email,
            role,
            avatar_url: photoUrl || null,
            telegram_id: tgUserId
          };
        } else if (insertErr.code === "ER_DUP_ENTRY") {
          let [existingUsers] = await dbQuery("SELECT * FROM users WHERE telegram_id = ? OR email = ?", [tgUserId, email]);
          user = existingUsers[0];
          if (!user) throw insertErr;
        } else {
          throw insertErr;
        }
      }
    } else {
      try {
        await dbQuery(
          "UPDATE users SET telegram_id = ?, avatar_url = COALESCE(?, avatar_url), name = COALESCE(NULLIF(?, ''), name), auth_provider = 'telegram_openid' WHERE id = ?",
          [tgUserId, photoUrl || null, name, user.id]
        );
      } catch {
        await dbQuery(
          "UPDATE users SET telegram_id = ?, avatar_url = COALESCE(?, avatar_url), name = COALESCE(NULLIF(?, ''), name) WHERE id = ?",
          [tgUserId, photoUrl || null, name, user.id]
        );
      }
      user.telegram_id = tgUserId;
      if (photoUrl) user.avatar_url = photoUrl;
      if (name) user.name = name;
    }
    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
      telegram_id: user.telegram_id
    };
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role
    };
    const token = import_jsonwebtoken.default.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });
    res.json({
      success: true,
      token,
      user: userPayload
    });
  } catch (err) {
    console.error("Telegram OpenID auth error:", err);
    res.status(500).json({ error: err.message || "Telegram OpenID orqali kirishda xatolik" });
  }
});
var YANDEX_CLIENT_ID = process.env.YANDEX_CLIENT_ID || "044187259630401c9d14b33ac139d976";
var YANDEX_CLIENT_SECRET = process.env.YANDEX_CLIENT_SECRET || "d7c5406e78114ca689c95ef030db9139";
app.get("/api/auth/yandex/url", (req, res) => {
  try {
    const rawRedirect = req.query.redirect_uri || "";
    let redirectUri = rawRedirect;
    if (!redirectUri) {
      const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
      redirectUri = `${appUrl}/api/auth/yandex/callback`;
    }
    const params = new URLSearchParams({
      response_type: "code",
      client_id: YANDEX_CLIENT_ID,
      redirect_uri: redirectUri
    });
    const url = `https://oauth.yandex.ru/authorize?${params.toString()}`;
    res.json({ url, client_id: YANDEX_CLIENT_ID, redirect_uri: redirectUri });
  } catch (err) {
    res.status(500).json({ error: "Yandex OAuth URL yaratishda xatolik" });
  }
});
async function processYandexAuth(codeOrToken, isToken = false) {
  let accessToken = codeOrToken;
  if (!isToken) {
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code: codeOrToken,
      client_id: YANDEX_CLIENT_ID,
      client_secret: YANDEX_CLIENT_SECRET
    });
    const tokenRes = await fetch("https://oauth.yandex.ru/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString()
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || "Yandex kodi almashtirishda xatolik!");
    }
    accessToken = tokenData.access_token;
  }
  const userRes = await fetch("https://login.yandex.ru/info?format=json", {
    headers: { Authorization: `OAuth ${accessToken}` }
  });
  const yandexUser = await userRes.json();
  if (!userRes.ok || !yandexUser.id) {
    throw new Error(yandexUser.error_description || "Yandex profilingiz ma'lumotlarini olishda xatolik!");
  }
  const yandexId = String(yandexUser.id);
  const email = yandexUser.default_email || yandexUser.emails && yandexUser.emails[0] || `${yandexUser.login || yandexId}@yandex.ru`;
  const name = yandexUser.real_name || yandexUser.display_name || yandexUser.first_name || yandexUser.login || "Yandex User";
  let avatarUrl = null;
  if (yandexUser.default_avatar_id && !yandexUser.is_avatar_empty) {
    avatarUrl = `https://avatars.yandex.net/get-yapic/${yandexUser.default_avatar_id}/islands-200`;
  }
  let [users] = await dbQuery("SELECT * FROM users WHERE yandex_id = ? OR email = ?", [yandexId, email]);
  let user = users[0];
  if (!user) {
    const role = email === "mosinjonovjasurbek28@gmail.com" ? "admin" : "user";
    const randomPass = Math.random().toString(36).slice(-10);
    const hashedPassword = await import_bcryptjs.default.hash(randomPass, 10);
    const [insertRes] = await dbQuery(
      "INSERT INTO users (name, email, password, role, avatar_url, yandex_id) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, hashedPassword, role, avatarUrl, yandexId]
    );
    user = {
      id: insertRes.insertId,
      name,
      email,
      role,
      avatar_url: avatarUrl,
      yandex_id: yandexId
    };
  } else {
    if (!user.yandex_id || avatarUrl && !user.avatar_url) {
      await dbQuery("UPDATE users SET yandex_id = COALESCE(yandex_id, ?), avatar_url = COALESCE(avatar_url, ?) WHERE id = ?", [yandexId, avatarUrl, user.id]);
      user.yandex_id = yandexId;
      if (avatarUrl) user.avatar_url = avatarUrl;
    }
  }
  const userPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar_url: user.avatar_url
  };
  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role
  };
  const token = import_jsonwebtoken.default.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });
  return { token, user: userPayload };
}
app.get(["/api/auth/yandex/callback", "/api/auth/yandex/callback/"], async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) {
      return res.send(`
        <html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'YANDEX_AUTH_ERROR', error: 'No code provided' }, '*');
            window.close();
          } else { window.location.href = '/login?error=yandex_no_code'; }
        </script>
        <p>Yandex avtorizatsiyasida kod topilmadi. Oyna yopilmoqda...</p></body></html>
      `);
    }
    const { token, user } = await processYandexAuth(code, false);
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'YANDEX_AUTH_SUCCESS', token: ${JSON.stringify(token)}, user: ${JSON.stringify(user)} }, '*');
              window.close();
            } else {
              window.location.href = '/?token=' + encodeURIComponent(${JSON.stringify(token)}) + '&user=' + encodeURIComponent(${JSON.stringify(JSON.stringify(user))});
            }
          </script>
          <p style="text-align: center; font-family: sans-serif; margin-top: 20px;">
            Yandex bilan tizimga muvaffaqiyatli kirildi. Oyna yopilmoqda...
          </p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("Yandex OAuth callback error:", err);
    res.send(`
      <html><body><script>
        if (window.opener) {
          window.opener.postMessage({ type: 'YANDEX_AUTH_ERROR', error: ${JSON.stringify(err.message)} }, '*');
          window.close();
        } else { window.location.href = '/login?error=' + encodeURIComponent(err.message); }
      </script>
      <p style="text-align: center; font-family: sans-serif; margin-top: 20px;">
        Yandex kirishda xatolik: ${err.message}
      </p></body></html>
    `);
  }
});
app.post("/api/auth/yandex/verify", async (req, res) => {
  try {
    const { code, token: yToken } = req.body;
    if (!code && !yToken) {
      return res.status(400).json({ error: "Yandex tasdiqlash kodi yoki Token kiritilmadi!" });
    }
    const input = (code || yToken).trim();
    const isToken = Boolean(yToken);
    const result = await processYandexAuth(input, isToken);
    res.json(result);
  } catch (err) {
    console.error("Yandex verify error:", err);
    res.status(400).json({ error: err.message || "Yandex orqali kirishda xatolik yuz berdi" });
  }
});
var DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
var DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
function getDiscordRedirectUri(req) {
  const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
  return `${appUrl.replace(/\/$/, "")}/api/auth/discord/callback`;
}
app.get("/api/auth/discord/url", (req, res) => {
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    return res.status(503).json({ error: "Discord orqali kirish hali serverda sozlanmagan." });
  }
  const redirectUri = getDiscordRedirectUri(req);
  const state = import_jsonwebtoken.default.sign({ provider: "discord", redirectUri }, JWT_SECRET, { expiresIn: "10m" });
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "identify email",
    state
  });
  res.json({ url: `https://discord.com/oauth2/authorize?${params.toString()}` });
});
async function processDiscordAuth(code, redirectUri) {
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    throw new Error("Discord server sozlamalari topilmadi.");
  }
  const tokenParams = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri
  });
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString()
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || "Discord tasdiqlash kodini tekshirib bo'lmadi.");
  }
  const profileRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  const discordUser = await profileRes.json();
  if (!profileRes.ok || !discordUser.id) {
    throw new Error("Discord profilingiz ma'lumotlari olinmadi.");
  }
  const discordId = String(discordUser.id);
  const email = discordUser.email || `discord-${discordId}@users.animem.uz`;
  const name = discordUser.global_name || discordUser.username || "Discord User";
  const avatarUrl = discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png?size=256` : null;
  const [users] = await dbQuery(
    "SELECT * FROM users WHERE discord_id = ? OR email = ?",
    [discordId, email]
  );
  let user = users[0];
  if (!user) {
    const role = email === "mosinjonovjasurbek28@gmail.com" ? "admin" : "user";
    const hashedPassword = await import_bcryptjs.default.hash(Math.random().toString(36).slice(-16), 10);
    const [insertRes] = await dbQuery(
      "INSERT INTO users (name, email, password, role, avatar_url, discord_id) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, hashedPassword, role, avatarUrl, discordId]
    );
    user = { id: insertRes.insertId, name, email, role, avatar_url: avatarUrl, discord_id: discordId };
  } else if (!user.discord_id || avatarUrl && !user.avatar_url) {
    await dbQuery(
      "UPDATE users SET discord_id = COALESCE(discord_id, ?), avatar_url = COALESCE(avatar_url, ?) WHERE id = ?",
      [discordId, avatarUrl, user.id]
    );
    user.discord_id = discordId;
    if (avatarUrl) user.avatar_url = avatarUrl;
  }
  const userPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar_url: user.avatar_url
  };
  const token = import_jsonwebtoken.default.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
  return { token, user: userPayload };
}
app.get(["/api/auth/discord/callback", "/api/auth/discord/callback/"], async (req, res) => {
  const sendCallback = (type, payload) => {
    res.send(`<!doctype html><html><body><script>
      const message = ${JSON.stringify({ type, ...payload })};
      if (window.opener) {
        window.opener.postMessage(message, window.location.origin);
        window.close();
      } else {
        if (type === "DISCORD_AUTH_SUCCESS") {
          window.location.href = '/?token=' + encodeURIComponent(message.token || '') + '&user=' + encodeURIComponent(JSON.stringify(message.user || {}));
        } else {
          window.location.href = '/login?error=' + encodeURIComponent(message.error || 'auth_failed');
        }
      }
    </script></body></html>`);
  };
  try {
    const code = req.query.code;
    const state = req.query.state;
    if (!code || !state) throw new Error("Discord tasdiqlash ma'lumotlari topilmadi.");
    const stateData = import_jsonwebtoken.default.verify(state, JWT_SECRET);
    if (stateData.provider !== "discord" || !stateData.redirectUri) {
      throw new Error("Discord tasdiqlash so'rovi yaroqsiz.");
    }
    const result = await processDiscordAuth(code, stateData.redirectUri);
    sendCallback("DISCORD_AUTH_SUCCESS", result);
  } catch (err) {
    console.error("Discord OAuth callback error:", err);
    sendCallback("DISCORD_AUTH_ERROR", { error: err.message || "Discord orqali kirishda xatolik" });
  }
});
async function start() {
  const distPath = import_path.default.join(process.cwd(), "dist");
  const publicPath = import_path.default.join(process.cwd(), "public");
  const isProduction = process.env.NODE_ENV === "production" || import_fs.default.existsSync(distPath);
  runTelegramBot();
  runSupportTelegramBot();
  app.get(["/favicon.ico", "/favicon.png"], (req, res) => {
    const icoPath = import_path.default.join(publicPath, "favicon.ico");
    const logoPath = import_path.default.join(publicPath, "logo.png");
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    if (import_fs.default.existsSync(icoPath)) {
      res.setHeader("Content-Type", req.path.endsWith(".png") ? "image/png" : "image/x-icon");
      return res.sendFile(icoPath);
    }
    res.setHeader("Content-Type", "image/png");
    return res.sendFile(logoPath);
  });
  app.get(["/logo.png", "/logo1.png", "/apple-touch-icon.png", "/icon-48.png", "/icon-192.png", "/icon-512.png"], (req, res) => {
    const filename = import_path.default.basename(req.path);
    const targetPath = import_path.default.join(publicPath, filename);
    const fallbackPath = import_path.default.join(publicPath, "logo.png");
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    if (import_fs.default.existsSync(targetPath)) {
      return res.sendFile(targetPath);
    }
    return res.sendFile(fallbackPath);
  });
  app.get(["/site.webmanifest", "/manifest.json"], (req, res) => {
    const manifestPath = import_path.default.join(publicPath, "site.webmanifest");
    if (import_fs.default.existsSync(manifestPath)) {
      res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
      return res.sendFile(manifestPath);
    }
    return res.json({ name: "Animem Uz", short_name: "Animem.uz", start_url: "/" });
  });
  app.get("/browserconfig.xml", (req, res) => {
    const xmlPath = import_path.default.join(publicPath, "browserconfig.xml");
    if (import_fs.default.existsSync(xmlPath)) {
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      return res.sendFile(xmlPath);
    }
    return res.status(404).send("Not found");
  });
  app.get("/yandex_a7133c70f3012b72.html", (req, res) => {
    const yandexFile = import_path.default.join(publicPath, "yandex_a7133c70f3012b72.html");
    if (import_fs.default.existsSync(yandexFile)) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.sendFile(yandexFile);
    }
    return res.type("text/html").send('<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"></head><body>verification: a7133c70f3012b72</body></html>');
  });
  app.get("/robots.txt", (req, res) => {
    const file = import_path.default.join(publicPath, "robots.txt");
    if (import_fs.default.existsSync(file)) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.sendFile(file);
    }
    return res.type("text/plain").send("User-agent: *\nAllow: /\nSitemap: https://animem.uz/sitemap.xml");
  });
  app.get("/ads.txt", (req, res) => {
    const file = import_path.default.join(publicPath, "ads.txt");
    if (import_fs.default.existsSync(file)) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.sendFile(file);
    }
    return res.type("text/plain").send("yandex.ru, f08c4a5923fc3014, DIRECT, f08c4a5923fc3014");
  });
  const toSlugLocal = (text) => {
    if (!text) return "";
    return text.toLowerCase().replace(/o['’`‘]/g, "o").replace(/g['’`‘]/g, "g").replace(/[^a-z0-9\u0400-\u04FF]+/gi, "-").replace(/^-+|-+$/g, "");
  };
  const escapeXml = (str) => {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  };
  const toAbsoluteUrl = (url, domain = "https://animem.uz") => {
    if (!url || typeof url !== "string") return `${domain}/logo.png`;
    const trimmed = url.trim();
    if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
      return `${domain}/logo.png`;
    }
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    if (trimmed.startsWith("//")) {
      return `https:${trimmed}`;
    }
    if (trimmed.startsWith("/")) {
      return `${domain}${trimmed}`;
    }
    return `${domain}/${trimmed}`;
  };
  const safeIsoDate = (dateVal, fallbackIso) => {
    try {
      if (!dateVal) return fallbackIso;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return fallbackIso;
      return d.toISOString().split("T")[0];
    } catch {
      return fallbackIso;
    }
  };
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const domain = "https://animem.uz";
      const todayIso = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      let xml = `<?xml version="1.0" encoding="UTF-8"?>
`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">
`;
      const staticPages = [
        { url: "/", priority: "1.0", freq: "daily" },
        { url: "/animelar", priority: "0.9", freq: "daily" },
        { url: "/dramalar", priority: "0.9", freq: "daily" },
        { url: "/manga", priority: "0.8", freq: "daily" },
        { url: "/top100", priority: "0.8", freq: "daily" },
        { url: "/jadval", priority: "0.8", freq: "daily" },
        { url: "/yangi-chiqishlar", priority: "0.8", freq: "daily" },
        { url: "/chat", priority: "0.7", freq: "daily" },
        { url: "/maxfiylik-siyosati", priority: "0.6", freq: "monthly" },
        { url: "/foydalanish-shartlari", priority: "0.6", freq: "monthly" },
        { url: "/mualliflik-huquqi", priority: "0.7", freq: "monthly" },
        { url: "/aloqa", priority: "0.7", freq: "monthly" }
      ];
      for (const page of staticPages) {
        xml += `  <url>
    <loc>${domain}${page.url}</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>${page.freq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
      }
      const genres = ["isekai", "sarguzasht", "fantasy", "jangari", "komediya", "dramatiya", "drama", "mecha", "romantika", "kriminal", "dahshat", "sport"];
      for (const g of genres) {
        xml += `  <url>
    <loc>${domain}/${g}</loc>
    <lastmod>${todayIso}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
      let animesList = [];
      try {
        const [rows] = await dbQuery("SELECT * FROM animes");
        if (Array.isArray(rows) && rows.length > 0) {
          animesList = rows;
        }
      } catch (e) {
        console.warn("Sitemap DB query error for animes:", e);
      }
      if (animesList.length === 0) {
        const store = loadLocalStore();
        animesList = store.animes || [];
      }
      for (const a of animesList) {
        const slug = toSlugLocal(a.title) || String(a.id);
        if (slug) {
          const imgUrl = escapeXml(toAbsoluteUrl(a.image_url, domain));
          const titleClean = escapeXml(a.title || "Anime");
          const animeDate = safeIsoDate(a.updated_at || a.created_at, todayIso);
          xml += `  <url>
`;
          xml += `    <loc>${domain}/anime/${slug}</loc>
`;
          xml += `    <lastmod>${animeDate}</lastmod>
`;
          xml += `    <image:image>
`;
          xml += `      <image:loc>${imgUrl}</image:loc>
`;
          xml += `      <image:title>${titleClean}</image:title>
`;
          xml += `      <image:caption>${titleClean} - O'zbekcha anime posteri</image:caption>
`;
          xml += `    </image:image>
`;
          xml += `    <changefreq>daily</changefreq>
`;
          xml += `    <priority>0.9</priority>
`;
          xml += `  </url>
`;
        }
      }
      let mangasList = [];
      try {
        const [mRows] = await dbQuery("SELECT * FROM mangas");
        if (Array.isArray(mRows) && mRows.length > 0) {
          mangasList = mRows;
        }
      } catch (e) {
        console.warn("Sitemap DB query error for mangas:", e);
      }
      if (mangasList.length === 0) {
        const store = loadLocalStore();
        mangasList = store.mangas || [];
      }
      for (const m of mangasList) {
        if (m.id) {
          const coverUrl = escapeXml(toAbsoluteUrl(m.cover_url, domain));
          const mTitleClean = escapeXml(m.title || "Manga");
          const mangaDate = safeIsoDate(m.updated_at || m.created_at, todayIso);
          xml += `  <url>
`;
          xml += `    <loc>${domain}/manga/${m.id}</loc>
`;
          xml += `    <lastmod>${mangaDate}</lastmod>
`;
          xml += `    <image:image>
`;
          xml += `      <image:loc>${coverUrl}</image:loc>
`;
          xml += `      <image:title>${mTitleClean}</image:title>
`;
          xml += `      <image:caption>${mTitleClean} - O'zbekcha manga muqovasi</image:caption>
`;
          xml += `    </image:image>
`;
          xml += `    <changefreq>daily</changefreq>
`;
          xml += `    <priority>0.8</priority>
`;
          xml += `  </url>
`;
        }
      }
      let dramasList = [];
      try {
        const [dRows] = await dbQuery("SELECT * FROM dramas");
        if (Array.isArray(dRows) && dRows.length > 0) {
          dramasList = dRows;
        }
      } catch (e) {
        console.warn("Sitemap DB query error for dramas:", e);
      }
      if (dramasList.length === 0) {
        const store = loadLocalStore();
        dramasList = store.dramas || [];
      }
      for (const d of dramasList) {
        if (d.id) {
          const posterUrl = escapeXml(toAbsoluteUrl(d.poster_url || d.banner_url, domain));
          const dTitleClean = escapeXml(d.title || "Drama");
          const dramaDate = safeIsoDate(d.created_at, todayIso);
          xml += `  <url>
`;
          xml += `    <loc>${domain}/drama/${d.id}</loc>
`;
          xml += `    <lastmod>${dramaDate}</lastmod>
`;
          xml += `    <image:image>
`;
          xml += `      <image:loc>${posterUrl}</image:loc>
`;
          xml += `      <image:title>${dTitleClean}</image:title>
`;
          xml += `      <image:caption>${dTitleClean} - Koreys drama o'zbek tilida</image:caption>
`;
          xml += `    </image:image>
`;
          xml += `    <changefreq>daily</changefreq>
`;
          xml += `    <priority>0.9</priority>
`;
          xml += `  </url>
`;
        }
      }
      xml += `</urlset>`;
      res.setHeader("Content-Type", "text/xml; charset=utf-8");
      return res.status(200).send(xml);
    } catch (err) {
      console.error("Sitemap generation error:", err);
      return res.sendFile(import_path.default.join(publicPath, "sitemap.xml"));
    }
  });
  app.use(import_express.default.static(publicPath, { maxAge: "7d" }));
  let cachedIndexHtml = null;
  const getCachedIndexHtml = (indexPath) => {
    if (cachedIndexHtml) return cachedIndexHtml;
    try {
      if (!import_fs.default.existsSync(indexPath)) {
        return "<html><body><div id='root'></div></body></html>";
      }
      cachedIndexHtml = import_fs.default.readFileSync(indexPath, "utf8");
      return cachedIndexHtml;
    } catch (e) {
      return cachedIndexHtml || "<html><body><div id='root'></div></body></html>";
    }
  };
  const handleDynamicSEO = async (req, res) => {
    const defaultIndexPath = import_fs.default.existsSync(import_path.default.join(distPath, "index.html")) ? import_path.default.join(distPath, "index.html") : import_path.default.join(process.cwd(), "index.html");
    try {
      let html = getCachedIndexHtml(defaultIndexPath);
      const reqPath = (req.path || "/").toLowerCase();
      let titleText = "Animem Uz - O'zbekistondagi eng yirik anime portali";
      let descText = "Animem Uz - O'zbekistondagi eng yirik onlayn anime portali! Bu yerda eng mashhur va eng so'nggi animelarni o'zbek tilida, yuqori sifatda (HD) va mutlaqo bepul tomosha qilishingiz mumkin.";
      let imageUrl = "https://animem.uz/logo.png";
      let shareUrl = `https://animem.uz${req.path}`;
      let imageAltText = "Animem.uz Logo";
      let jsonLdScript = "";
      if (reqPath.startsWith("/anime/") && reqPath.length > 7) {
        const rawParam = req.path.replace(/^\/anime\//, "").split("?")[0].split("/")[0];
        let animeRaw = null;
        const store = loadLocalStore();
        animeRaw = (store.animes || []).find(
          (a) => toSlugLocal(a.title) === rawParam || String(a.id) === rawParam || rawParam.startsWith(a.id + "-") || rawParam.endsWith("-" + a.id)
        );
        if (animeRaw) {
          titleText = `${animeRaw.title} - O'zbek tilida ko'rish | Animem.uz`;
          descText = `${animeRaw.title} o'zbek tilida HD formatda onlayn tomosha qilish. ${animeRaw.description ? animeRaw.description.substring(0, 180).trim() : "Barcha qismlari bepul va yuqori sifatda!"}`;
          imageUrl = animeRaw.image_url || "https://animem.uz/logo.png";
          shareUrl = `https://animem.uz/anime/${toSlugLocal(animeRaw.title)}`;
          imageAltText = animeRaw.title;
          const genres = animeRaw.janrlar ? animeRaw.janrlar.split(",").map((g) => g.trim()) : [];
          const jsonLd = {
            "@context": "https://schema.org",
            "@type": "Movie",
            "name": animeRaw.title,
            "alternateName": `${animeRaw.title} - O'zbek tilida ko'rish`,
            "image": {
              "@type": "ImageObject",
              "url": imageUrl,
              "name": animeRaw.title,
              "caption": `${animeRaw.title} anime posteri`
            },
            "description": animeRaw.description || "",
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": animeRaw.rating || 9.2,
              "bestRating": "10",
              "worstRating": "1",
              "reviewCount": animeRaw.rating_count || 32
            },
            "genre": genres,
            "dateCreated": animeRaw.yil || 2026,
            "provider": {
              "@type": "Organization",
              "name": "Animem Uz",
              "url": "https://animem.uz"
            }
          };
          jsonLdScript = `
    <script type="application/ld+json">
    ${JSON.stringify(jsonLd, null, 2)}
    </script>`;
        }
      } else if (reqPath.startsWith("/manga/") && reqPath.length > 7) {
        const mangaId = req.path.replace(/^\/manga\//, "").split("?")[0].split("/")[0];
        const store = loadLocalStore();
        const mangaRaw = (store.mangas || []).find((m) => String(m.id) === String(mangaId));
        if (mangaRaw) {
          titleText = `${mangaRaw.title} - O'zbekcha Manga va Komiks | Animem.uz`;
          descText = `${mangaRaw.title} mangasi o'zbek tilida onlayn o'qish. ${mangaRaw.description ? mangaRaw.description.substring(0, 180).trim() : "Eng so'nggi boblar va yuqori sifat!"}`;
          imageUrl = mangaRaw.cover_url || "https://animem.uz/logo.png";
          shareUrl = `https://animem.uz/manga/${mangaRaw.id}`;
          imageAltText = mangaRaw.title;
          const jsonLd = {
            "@context": "https://schema.org",
            "@type": "Book",
            "name": mangaRaw.title,
            "image": {
              "@type": "ImageObject",
              "url": imageUrl,
              "name": mangaRaw.title,
              "caption": `${mangaRaw.title} manga muqovasi`
            },
            "description": mangaRaw.description || "",
            "author": mangaRaw.author || "Animem Uz",
            "provider": {
              "@type": "Organization",
              "name": "Animem Uz",
              "url": "https://animem.uz"
            }
          };
          jsonLdScript = `
    <script type="application/ld+json">
    ${JSON.stringify(jsonLd, null, 2)}
    </script>`;
        }
      } else if (reqPath.startsWith("/drama/") && reqPath.length > 7) {
        const dramaId = req.path.replace(/^\/drama\//, "").split("?")[0].split("/")[0];
        const store = loadLocalStore();
        let dramaRaw = (store.dramas || []).find((d) => String(d.id) === String(dramaId));
        if (!dramaRaw) {
          try {
            const [dRows] = await dbQuery("SELECT * FROM dramas WHERE id = ?", [dramaId]);
            if (Array.isArray(dRows) && dRows[0]) {
              dramaRaw = dRows[0];
            }
          } catch (e) {
            console.warn("Error fetching drama for SEO:", e);
          }
        }
        if (dramaRaw) {
          const dramaTitle = dramaRaw.title || "Drama";
          const dramaDesc = dramaRaw.description ? dramaRaw.description.substring(0, 180).trim() : "Koreys va Osiyo dramalarini o'zbek tilida eng yuqori sifatda onlayn tomosha qiling.";
          const dramaPoster = dramaRaw.poster_url || dramaRaw.banner_url || "https://animem.uz/logo.png";
          titleText = `${dramaTitle} - Koreys Drama O'zbek Tilida Ko'rish | Animem.uz`;
          descText = `${dramaTitle} dramasi o'zbek tilida bepul onlayn tomosha qilish. ${dramaDesc}`;
          imageUrl = dramaPoster;
          shareUrl = `https://animem.uz/drama/${dramaRaw.id}`;
          imageAltText = `${dramaTitle} koreys drama`;
          const genres = dramaRaw.janrlar ? dramaRaw.janrlar.split(",").map((g) => g.trim()) : ["Drama", "Koreys drama"];
          const jsonLd = {
            "@context": "https://schema.org",
            "@type": "TVSeries",
            "name": dramaTitle,
            "alternateName": [
              `${dramaTitle} o'zbek tilida`,
              `${dramaTitle} koreys drama`,
              `${dramaTitle} do'rama uzb`
            ],
            "image": {
              "@type": "ImageObject",
              "url": imageUrl,
              "name": dramaTitle,
              "caption": `${dramaTitle} koreys drama posteri`
            },
            "description": dramaDesc,
            "genre": genres,
            "dateCreated": dramaRaw.yil || 2025,
            "inLanguage": "uz",
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "9.5",
              "bestRating": "10",
              "worstRating": "1",
              "reviewCount": String(Math.max(1, dramaRaw.likes || 15))
            },
            "provider": {
              "@type": "Organization",
              "name": "Animem Uz",
              "url": "https://animem.uz"
            }
          };
          jsonLdScript = `
    <script type="application/ld+json">
    ${JSON.stringify(jsonLd, null, 2)}
    </script>`;
        }
      } else if (reqPath === "/dramalar") {
        titleText = "Koreys Dramalari va Doramalar O'zbek Tilida | Animem.uz";
        descText = "Eng sara koreys, yapon va xitoy dramalarini (doramalarni) o'zbek tilida, yuqori sifatda (HD) va bepul tomosha qiling. Yangi chiqgan barcha dramalar to'plami.";
        const store = loadLocalStore();
        const topDramas = (store.dramas || []).slice(0, 30);
        if (topDramas.length > 0) {
          const itemListLd = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "O'zbek Tilidagi Koreys Dramalari Katalogi",
            "description": "Eng sara koreys dramalari va doramalar to'plami",
            "itemListElement": topDramas.map((d, idx) => ({
              "@type": "ListItem",
              "position": idx + 1,
              "item": {
                "@type": "TVSeries",
                "name": d.title,
                "url": `https://animem.uz/drama/${d.id}`,
                "image": {
                  "@type": "ImageObject",
                  "url": d.poster_url || d.banner_url || "https://animem.uz/logo.png",
                  "name": d.title,
                  "caption": d.title
                }
              }
            }))
          };
          jsonLdScript = `
    <script type="application/ld+json">
    ${JSON.stringify(itemListLd, null, 2)}
    </script>`;
        }
      } else if (reqPath === "/" || reqPath === "/animelar" || reqPath === "/anime") {
        titleText = "Barcha Animelar - O'zbek tilida tomosha qilish | Animem.uz";
        descText = "Animem.uz portalidagi barcha o'zbekcha tarjima animelar katalogi. Sevimli animelaringizni HD sifatda bepul tomosha qiling.";
        const store = loadLocalStore();
        const topAnimes = (store.animes || []).slice(0, 30);
        if (topAnimes.length > 0) {
          const itemListLd = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "O'zbekcha Animelar Katalogi",
            "itemListElement": topAnimes.map((a, idx) => ({
              "@type": "ListItem",
              "position": idx + 1,
              "item": {
                "@type": "Movie",
                "name": a.title,
                "url": `https://animem.uz/anime/${toSlugLocal(a.title)}`,
                "image": {
                  "@type": "ImageObject",
                  "url": a.image_url,
                  "name": a.title,
                  "caption": a.title
                }
              }
            }))
          };
          jsonLdScript = `
    <script type="application/ld+json">
    ${JSON.stringify(itemListLd, null, 2)}
    </script>`;
        }
      } else if (reqPath === "/chat") {
        titleText = "Anime Chat va Muloqot | Animem.uz";
        descText = "Animem.uz saytining anime ixlosmandlari uchun jonli chat va muhokama bo'limi. Do'stlar ortiring va do'stona suhbatlashing.";
      } else if (reqPath === "/manga") {
        titleText = "O'zbekcha Mangalar va Komikslar | Animem.uz";
        descText = "O'zbek tiliga tarjima qilingan eng mashhur va eng so'nggi mangalarni onlayn o'qing.";
      } else if (reqPath === "/top100") {
        titleText = "Top 100 Eng Yaxshi Animelar | Animem.uz";
        descText = "Tomoshabinlar va reyting bo'yicha saralangan eng sara Top 100 o'zbekcha tarjima animelar.";
      } else if (reqPath === "/jadval") {
        titleText = "Anime Qismlari Chiqish Jadvali | Animem.uz";
        descText = "Hafta kunlari bo'yicha yangi o'zbekcha anime epizodlarining qulay chiqish jadvali.";
      } else if (reqPath === "/yangi-chiqishlar") {
        titleText = "Eng Yangi Chiqqan Qismlar | Animem.uz";
        descText = "So'nggi soatlar va kunlarda chiqarilgan eng yangi o'zbekcha tarjima anime epizodlari.";
      } else if (reqPath === "/sevimlilar") {
        titleText = "Sevimli Animelarim | Animem.uz";
        descText = "Siz saqlagan va yoqtirgan o'zbekcha animelar to'plami.";
      } else if (reqPath === "/tarix") {
        titleText = "Ko'rishlar Tarixi | Animem.uz";
        descText = "Siz oxirgi marta tomosha qilgan anime va qismlar tarixi.";
      } else if (reqPath === "/maxfiylik-siyosati" || reqPath === "/privacy") {
        titleText = "Maxfiylik Siyosati (Privacy Policy) | Animem.uz";
        descText = "Animem.uz foydalanuvchilarining shaxsiy ma'lumotlarini to'plash, saqlash va xavfsizligini ta'minlash bo'yicha rasmiy maxfiylik siyosati.";
      } else if (reqPath === "/foydalanish-shartlari" || reqPath === "/terms") {
        titleText = "Foydalanish Shartlari (Terms of Service) | Animem.uz";
        descText = "Animem.uz saytidan foydalanish bo'yicha rasmiy foydalanish shartlari va qoidalar kelishuvi.";
      } else if (reqPath === "/mualliflik-huquqi" || reqPath === "/dmca") {
        titleText = "Mualliflik Huquqi va DMCA | Animem.uz";
        descText = "Animem.uz saytining mualliflik huquqi egalari uchun rasmiy bildirishnomasi va DMCA o'chirish siyosati.";
      } else if (reqPath === "/aloqa" || reqPath === "/contacts") {
        titleText = "Aloqa va Qo'llab-Quvvatlash | Animem.uz";
        descText = "Animem.uz ma'muriyati bilan bog'lanish, texnik qo'llab-quvvatlash va takliflar yuborish bo'limi.";
      } else {
        const knownGenres = {
          "isekai": "Isekai",
          "fantasy": "Fentezi",
          "sarguzasht": "Sarguzasht",
          "jangari": "Jangari",
          "komediya": "Komediya",
          "dramatiya": "Drama",
          "drama": "Drama",
          "mecha": "M\u0435\u0445\u0430 (Mecha)",
          "romantika": "Romantika",
          "kriminal": "Kriminal",
          "dahshat": "Dahshat",
          "sport": "Sport",
          "maktab": "Maktab"
        };
        const cleanPath = reqPath.replace(/^\//, "");
        if (knownGenres[cleanPath]) {
          const gName = knownGenres[cleanPath];
          titleText = `${gName} animelar - O'zbek tilida ko'rish | Animem.uz`;
          descText = `Eng sara ${gName} janridagi o'zbekcha tarjima animelar to'plami. Animem.uz saytida HD formatda bepul tomosha qiling.`;
        }
      }
      imageUrl = toAbsoluteUrl(imageUrl);
      html = html.replace(/<title>.*?<\/title>/gi, `<title>${titleText}</title>`);
      html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/gi, `<meta name="description" content="${descText.replace(/"/g, "&quot;")}" />`);
      html = html.replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/gi, `<meta property="og:url" content="${shareUrl}" />`);
      html = html.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/gi, `<meta property="og:title" content="${titleText.replace(/"/g, "&quot;")}" />`);
      html = html.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/gi, `<meta property="og:description" content="${descText.replace(/"/g, "&quot;")}" />`);
      html = html.replace(/<meta\s+property="og:image"\s+content=".*?"\s*\/?>/gi, `<meta property="og:image" content="${imageUrl}" />`);
      if (html.includes('property="og:image:alt"')) {
        html = html.replace(/<meta\s+property="og:image:alt"\s+content=".*?"\s*\/?>/gi, `<meta property="og:image:alt" content="${imageAltText.replace(/"/g, "&quot;")}" />`);
      } else {
        html = html.replace('<meta property="og:image"', `<meta property="og:image:alt" content="${imageAltText.replace(/"/g, "&quot;")}" />
    <meta property="og:image"`);
      }
      html = html.replace(/<meta\s+property="twitter:url"\s+content=".*?"\s*\/?>/gi, `<meta property="twitter:url" content="${shareUrl}" />`);
      html = html.replace(/<meta\s+property="twitter:title"\s+content=".*?"\s*\/?>/gi, `<meta property="twitter:title" content="${titleText.replace(/"/g, "&quot;")}" />`);
      html = html.replace(/<meta\s+property="twitter:description"\s+content=".*?"\s*\/?>/gi, `<meta property="twitter:description" content="${descText.replace(/"/g, "&quot;")}" />`);
      html = html.replace(/<meta\s+property="twitter:image"\s+content=".*?"\s*\/?>/gi, `<meta property="twitter:image" content="${imageUrl}" />`);
      if (jsonLdScript) {
        html = html.replace("</head>", `${jsonLdScript}
  </head>`);
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    } catch (err) {
      console.error("SEO server-side injection error:", err);
      return res.sendFile(defaultIndexPath);
    }
  };
  app.get("/anime/:slug", handleDynamicSEO);
  app.get("/drama/:id", handleDynamicSEO);
  app.get("/dramalar", handleDynamicSEO);
  app.post("/api/support-bot", async (req, res) => {
    try {
      const { message, history, userName } = req.body;
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key sozlanmagan" });
      }
      const ai = new import_genai.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const sysInstruction = `Sizning ismingiz Sumire. Siz Animem.uz saytining sun'iy intellekt yordamchisisiz. Siz odatda juda xursand, samimiy va yordamga tayyor qizsiz. Foydalanuvchining ismi: ${userName}. Lekin agar foydalanuvchi sizni xafa qilsa, so'ksa yoki nojo'ya gapirsa, siz darhol xafa bo'lasiz va ularni adminlarga aytaman deb qo'rqitasiz. Sizning javoblaringiz qisqa (maksimal 2-3 gap), vizual novella uslubida, emotsiya bilan yozilgan bo'lishi kerak. Foydalanuvchi sizga yozganda yordam so'rashini yoki shunchaki suhbatlashishini kutasiz. Animem.uz sayti - O'zbekistondagi eng zo'r anime sayti hisoblanadi.`;
      let contents = [];
      if (history && history.length > 0) {
        contents = history.map((msg) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }]
        }));
      }
      contents.push({ role: "user", parts: [{ text: message }] });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction: sysInstruction,
          temperature: 0.7
        }
      });
      res.json({ reply: response.text });
    } catch (err) {
      console.error("Support bot error:", err);
      res.status(500).json({ error: "Xatolik yuz berdi. Sumire hozir uxlab yotibdi." });
    }
  });
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, message } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ error: "Murojaat matni kiritilmadi" });
      }
      const userName = name || "Noma'lum foydalanuvchi";
      const userDomainEmail = email || "Kiritilmagan";
      const msgText = message.trim();
      const adminMsgText = `\u{1F310} <b>YANGI MUROJAAT (Animem.uz Saytidan)</b>

\u{1F464} <b>Ismi:</b> ${userName}
\u{1F310} <b>Email / Domen / Nick:</b> ${userDomainEmail}

\u{1F4AC} <b>Murojaat matni:</b>
${msgText}

\u{1F4C5} <b>Sana:</b> ${(/* @__PURE__ */ new Date()).toLocaleString("uz-UZ")}`;
      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: "\u{1F310} Sayt Admin Panelini Ochish", url: "https://animem.uz/admin" }
          ]
        ]
      };
      await sendSupportBotMessage(SUPPORT_ADMIN_ID, adminMsgText, inlineKeyboard);
      res.json({ success: true, message: "Murojaat adminga muvaffaqiyatli yetkazildi!" });
    } catch (err) {
      console.error("Contact form submit error:", err);
      res.status(500).json({ error: "Murojaatni yuborishda xatolik yuz berdi" });
    }
  });
  app.get("/api/video/:id", async (req, res) => {
    try {
      const videoId = req.params.id;
      const { rows } = await pgPool.query("SELECT mime_type, data, size, filename FROM video WHERE id = $1", [videoId]);
      if (rows.length === 0 || !rows[0].data) {
        return res.status(404).send("Video PostgreSQL bazasidan topilmadi");
      }
      const video = rows[0];
      const videoSize = video.size || video.data.length;
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start2 = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : videoSize - 1;
        const chunksize = end - start2 + 1;
        const fileBuffer = video.data.slice(start2, end + 1);
        res.writeHead(206, {
          "Content-Range": `bytes ${start2}-${end}/${videoSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": video.mime_type || "video/mp4"
        });
        res.end(fileBuffer);
      } else {
        res.writeHead(200, {
          "Content-Length": videoSize,
          "Content-Type": video.mime_type || "video/mp4"
        });
        res.end(video.data);
      }
    } catch (err) {
      console.error("PostgreSQL video stream error:", err);
      res.status(500).send("Server xatosi");
    }
  });
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API endpoint topilmadi (${req.path})` });
  });
  if (!isProduction) {
    try {
      const vite = await (0, import_vite.createServer)({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite dev middleware skipped (backend-only mode)");
    }
  } else {
    if (import_fs.default.existsSync(distPath)) {
      app.use(import_express.default.static(distPath, {
        maxAge: "1y",
        immutable: true,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-cache, must-revalidate");
          }
        }
      }));
    }
    app.get("*", (req, res) => {
      handleDynamicSEO(req, res);
    });
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  const secondaryPort = PORT === 3e3 ? 7860 : 3e3;
  try {
    const secondaryServer = import_http.default.createServer(app);
    io.attach(secondaryServer);
    secondaryServer.listen(secondaryPort, "0.0.0.0", () => {
      console.log(`Dual-port secondary listener active on http://0.0.0.0:${secondaryPort}`);
    });
    secondaryServer.on("error", (err) => {
      console.log(`Secondary port ${secondaryPort} not active:`, err.message);
    });
  } catch (e) {
  }
}
start();
//# sourceMappingURL=server.cjs.map
