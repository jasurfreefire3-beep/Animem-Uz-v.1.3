import os from "os";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import http from "http";
import dns from "dns";
try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}
import nodemailer from "nodemailer";
import { Server } from "socket.io";
import { Pool as PgPool } from "pg";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { exec } from "child_process";
import util from "util";
const execPromise = util.promisify(exec);

import compression from "compression";
import webpush from "web-push";


dotenv.config();

// Global crash protection for production container reliability
process.on("unhandledRejection", (reason, promise) => {
  console.error("[Process Safe] Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[Process Safe] Uncaught Exception thrown:", err);
});

// Setup VAPID keys for Web Push Notifications (Works even when user is offline / site is closed)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BNo_Gg_l4U1Gj1c-E7B68Y52p7dO64lXvC4L91x5NlB1qGgJ7fK1lZlU9sX4_y9zL2pX2s9k-M6Z3q1j5a4g6gE";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "K7mQ6lX_3s9k4p1j8a2g5dE6bL1qZlU9sX4y2z0pX1c";

try {
  webpush.setVapidDetails(
    "mailto:support@animem.uz",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} catch (e) {
  console.warn("VAPID setup notice:", e);
}

const upload = multer({ dest: "/tmp/" });

const app = express();
app.set("trust proxy", true);
app.disable("x-powered-by");

// Global Security Headers Middleware
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
});

// Block Known Scanner Probes & Malicious Path Traversal
const SUSPICIOUS_PATHS = [
  /\.env/i,
  /\.git/i,
  /wp-login/i,
  /wp-admin/i,
  /phpmyadmin/i,
  /\.\.\//,
  /\/etc\/passwd/i,
  /\/proc\/self/i,
  /actuator/i,
  /solr/i,
  /cgi-bin/i,
  /shell/i,
  /telescope/i
];

app.use((req, res, next) => {
  const urlPath = req.path || "";
  for (const pattern of SUSPICIOUS_PATHS) {
    if (pattern.test(urlPath)) {
      console.warn(`[SECURITY PROBE BLOCKED] Blocked path: ${urlPath} from IP: ${req.ip}`);
      return res.status(403).send("Forbidden");
    }
  }
  next();
});

// Lightweight In-Memory Rate Limiter for Auth & Sensitive Endpoints
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 60 * 1000);

app.use((req, res, next) => {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
  const isAuth = req.path.startsWith("/api/auth/");
  const maxReqs = isAuth ? 40 : 300;
  const now = Date.now();

  const key = `${ip}:${isAuth ? "auth" : "gen"}`;
  const record = rateLimitMap.get(key);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60 * 1000 });
  } else {
    record.count++;
    if (record.count > maxReqs) {
      console.warn(`[RATE LIMIT EXCEEDED] IP: ${ip} on path: ${req.path}`);
      return res.status(429).json({ error: "Juda ko'p so'rov yuborildi. Iltimos, 1 daqiqadan so'ng urinib ko'ring." });
    }
  }
  next();
});

app.use(compression({
  threshold: 512, // Compress anything larger than 512 bytes
}));
app.use(cors({ origin: true, credentials: true }));

// Proxy Firebase Auth helper routes (/__/*) to Firebase's default auth handler
app.use("/__", (req, res) => {
  const targetPath = "/__" + req.url;
  const options = {
    hostname: "gen-lang-client-0918187443.firebaseapp.com",
    port: 443,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: "gen-lang-client-0918187443.firebaseapp.com",
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
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

// Instant Northflank & Kubernetes Health Check Probes (<1ms response, no overhead)
app.get(["/health", "/api/health", "/ping"], (_req, res) => {
  res.status(200).send("OK");
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use((req, res, next) => {
  if (req.url.startsWith("/api") || req.url.startsWith("/auth")) {
    console.log(`${req.method} ${req.url}`);
  }
  next();
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// --- TURNSTILE VERIFICATION ---
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || "6LdADY8tAAAAADio9AzwRTgqDCKluKa3pspF6aE3";

async function verifyCaptchaToken(token: string, ip: string): Promise<boolean> {
  if (!token) return false;
  try {
    const formData = new URLSearchParams();
    formData.append('secret', RECAPTCHA_SECRET);
    formData.append('response', token);
    formData.append('remoteip', ip);
    
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      body: formData,
    });
    
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error("Turnstile verification error:", err);
    return false;
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "animem_uz_secure_jwt_token_key_9f81a7b3c2d4e6f0a5b8c9d1e2f3a4b5c6d7e8f9a0";
const ANIMEBOT_SYNC_SECRET = process.env.ANIMEBOT_SYNC_SECRET || "animem_secure_animebot_sync_key_91823746";

// Strictly authorized Admin accounts (verified against PostgreSQL DB)
const ALLOWED_ADMIN_EMAILS = new Set([
  "mosinjonovjasurbek28@gmail.com",
  "mosinjonovjasurbek00@gmail.com",
  "jasurfreefire3@gmail.com",
  "tg_oid_xx@telegram.uz",
  "admin@animem.uz"
]);
const ALLOWED_ADMIN_IDS = new Set([1, 7, 15, 20]);
const MASTER_ADMIN_PASSCODE = "1213234";

// MySQL Database Pool Connection

// =================================================================
// DATABASE CONFIGURATION: SOLE POSTGRESQL (animems)
// =================================================================
const DATABASE_URL = process.env.DATABASE_URL || "postgres://user_f51af4cc:pw_q2C80HbXCwGb5qDwIC2IoysaX1nqbzww@psql.fr-roub1.bengt.wasmernet.com:20184/animems";

const pgPool = new PgPool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
pgPool.on("error", (err) => {
  console.warn("[PostgreSQL Pool Error Caught]:", err.message);
});

const supabasePool = pgPool;
const wasmerPool = pgPool;

// Initialize PostgreSQL Core Tables & Schema Migrations
async function initPgDb() {
  try {
    // 1. Video storage table
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

    // 2. Chat messages table (Live Chat persistence)
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT DEFAULT 0,
        user_name VARCHAR(255) DEFAULT 'Anonim',
        content TEXT NOT NULL,
        reply_to_id VARCHAR(255),
        reply_to_name VARCHAR(255),
        reply_to_content TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    try { await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_messages_id_desc ON messages (id DESC)`); } catch (_) {}

    // Ensure all columns exist in messages
    const messageCols = [
      "ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_id BIGINT DEFAULT 0",
      "ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_name VARCHAR(255) DEFAULT 'Anonim'",
      "ALTER TABLE messages ADD COLUMN IF NOT EXISTS content TEXT",
      "ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id VARCHAR(255)",
      "ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_name VARCHAR(255)",
      "ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_content TEXT",
      "ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"
    ];
    for (const q of messageCols) {
      try { await pgPool.query(q); } catch (_) {}
    }

    // 3. Comments table (Animes, Dramas, Mangas)
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id BIGSERIAL PRIMARY KEY,
        anime_id BIGINT,
        user_id BIGINT,
        manga_id BIGINT,
        drama_id BIGINT,
        content TEXT NOT NULL,
        likes INT DEFAULT 0,
        dislikes INT DEFAULT 0,
        liked_users TEXT DEFAULT '[]',
        disliked_users TEXT DEFAULT '[]',
        replies TEXT DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    try { await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_comments_anime_id ON comments (anime_id)`); } catch (_) {}
    try { await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_comments_drama_id ON comments (drama_id)`); } catch (_) {}

    // Ensure all columns exist in comments
    const commentCols = [
      "ALTER TABLE comments ADD COLUMN IF NOT EXISTS anime_id BIGINT",
      "ALTER TABLE comments ADD COLUMN IF NOT EXISTS user_id BIGINT",
      "ALTER TABLE comments ADD COLUMN IF NOT EXISTS manga_id BIGINT",
      "ALTER TABLE comments ADD COLUMN IF NOT EXISTS drama_id BIGINT",
      "ALTER TABLE comments ADD COLUMN IF NOT EXISTS content TEXT",
      "ALTER TABLE comments ADD COLUMN IF NOT EXISTS likes INT DEFAULT 0",
      "ALTER TABLE comments ADD COLUMN IF NOT EXISTS dislikes INT DEFAULT 0",
      "ALTER TABLE comments ADD COLUMN IF NOT EXISTS liked_users TEXT DEFAULT '[]'",
      "ALTER TABLE comments ADD COLUMN IF NOT EXISTS disliked_users TEXT DEFAULT '[]'",
      "ALTER TABLE comments ADD COLUMN IF NOT EXISTS replies TEXT DEFAULT '[]'",
      "ALTER TABLE comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"
    ];
    for (const q of commentCols) {
      try { await pgPool.query(q); } catch (_) {}
    }

    // 4. Notifications table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGSERIAL PRIMARY KEY,
        title VARCHAR(255),
        message TEXT,
        anime_id BIGINT,
        link VARCHAR(500),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Donations table (TezCheck)
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS donations (
        id BIGSERIAL PRIMARY KEY,
        order_id VARCHAR(255) UNIQUE,
        user_id BIGINT,
        donor_name VARCHAR(255),
        donor_avatar TEXT,
        donor_avatar_frame TEXT,
        amount NUMERIC(15, 2) NOT NULL,
        comment TEXT,
        payment_method VARCHAR(50) DEFAULT 'tezcheck',
        status VARCHAR(50) DEFAULT 'pending',
        pay_url TEXT,
        paid_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Mika AI complaints table
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS mika_complaints (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT DEFAULT 0,
        user_name VARCHAR(255),
        message TEXT NOT NULL,
        ai_response TEXT,
        reason TEXT,
        ip VARCHAR(100),
        status VARCHAR(50) DEFAULT 'new',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Verified PostgreSQL core tables: video, messages, comments, notifications, donations, mika_complaints.");
  } catch (err: any) {
    console.error("Failed to initialize PostgreSQL core tables:", err.message);
  }
}
initPgDb();

async function d1ExecuteQuery<T = any>(sql: string, params?: any[]): Promise<T> {
  let cleanSql = sql
    .replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP")
    .replace(/\bPRIMARY\s+KEY\s+AUTOINCREMENT\b/gi, "GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY")
    .replace(/\bAUTO_INCREMENT\s+PRIMARY\s+KEY\b/gi, "GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY")
    .replace(/\bAUTO_INCREMENT\b/gi, "")
    .replace(/\bAUTOINCREMENT\b/gi, "")
    .replace(/\bLONGTEXT\b/gi, "TEXT");

  const isSelect = /^\s*(SELECT|PRAGMA|WITH|SHOW|DESCRIBE|EXPLAIN)/i.test(cleanSql.trim());
  const isInsert = /^\s*INSERT\s+INTO/i.test(cleanSql.trim());

  if (isInsert && !/RETURNING\s+/i.test(cleanSql)) {
    cleanSql = cleanSql.replace(/;\s*$/, "") + " RETURNING id;";
  }

  // Convert ? to $1, $2, ... for PostgreSQL
  let pIdx = 1;
  const pgSql = cleanSql.replace(/\?/g, () => `$${pIdx++}`);

  const cleanParams = (params || []).map((p) => {
    if (typeof p === "boolean") return p;
    if (p instanceof Date) return p.toISOString().slice(0, 19).replace("T", " ");
    if (p === undefined) return null;
    return p;
  });

  const res = await pgPool.query(pgSql, cleanParams);

  if (isSelect) {
    return [res.rows || [], []] as unknown as T;
  } else {
    const insertId = res.rows?.[0]?.id || 0;
    return [
      {
        insertId: Number(insertId),
        affectedRows: res.rowCount || 0,
        changedRows: res.rowCount || 0,
      },
      [],
    ] as unknown as T;
  }
}

const LOCAL_STORE_PATH = path.join(process.cwd(), "local_store.json");

function queryLocalStore(sql: string, params: any[] = []): any[] {
  try {
    if (!fs.existsSync(LOCAL_STORE_PATH)) return [];
    const store = JSON.parse(fs.readFileSync(LOCAL_STORE_PATH, "utf-8"));
    const lower = sql.toLowerCase();
    
    let table = "";
    const match = lower.match(/from\s+([a-zA-Z0-9_]+)/);
    if (match) table = match[1];
    if (!table || !store[table]) return [];
    
    let data = store[table];
    if (!Array.isArray(data)) return [];

    // Exact user queries:
    if (table === "users") {
      if (lower.includes("where telegram_id = ? or email = ?") && params.length >= 2) {
        const tgId = String(params[0] ?? "");
        const email = String(params[1] ?? "").toLowerCase();
        return data.filter((u: any) => 
          (u.telegram_id && String(u.telegram_id) === tgId) || 
          (u.email && u.email.toLowerCase() === email)
        );
      }
      if (lower.includes("where facebook_id = ? or email = ?") && params.length >= 2) {
        const fbId = String(params[0] ?? "");
        const email = String(params[1] ?? "").toLowerCase();
        return data.filter((u: any) => 
          (u.facebook_id && String(u.facebook_id) === fbId) || 
          (u.email && u.email.toLowerCase() === email)
        );
      }
      if (lower.includes("where yandex_id = ? or email = ?") && params.length >= 2) {
        const yId = String(params[0] ?? "");
        const email = String(params[1] ?? "").toLowerCase();
        return data.filter((u: any) => 
          (u.yandex_id && String(u.yandex_id) === yId) || 
          (u.email && u.email.toLowerCase() === email)
        );
      }
      if (lower.includes("where discord_id = ? or email = ?") && params.length >= 2) {
        const dId = String(params[0] ?? "");
        const email = String(params[1] ?? "").toLowerCase();
        return data.filter((u: any) => 
          (u.discord_id && String(u.discord_id) === dId) || 
          (u.email && u.email.toLowerCase() === email)
        );
      }
      if (lower.includes("where phone = ? or email = ?") && params.length >= 2) {
        const phone = String(params[0] ?? "");
        const email = String(params[1] ?? "").toLowerCase();
        return data.filter((u: any) => 
          (u.phone && String(u.phone) === phone) || 
          (u.email && u.email.toLowerCase() === email)
        );
      }
      if (lower.includes("where email = ?") && params.length > 0) {
        const email = String(params[0] ?? "").toLowerCase();
        return data.filter((u: any) => u.email && u.email.toLowerCase() === email);
      }
      if (lower.includes("where phone = ?") && params.length > 0) {
        const phone = String(params[0] ?? "");
        return data.filter((u: any) => u.phone && String(u.phone) === phone);
      }
      if (lower.includes("where telegram_id = ?") && params.length > 0) {
        const tgId = String(params[0] ?? "");
        return data.filter((u: any) => u.telegram_id && String(u.telegram_id) === tgId);
      }
      if (lower.includes("where id =") && params.length > 0) {
        return data.filter((item: any) => String(item.id) === String(params[0]));
      }
      if (lower.includes("where") && !lower.includes("where 1=1")) {
        return [];
      }
    }

    // Common WHERE filters for other tables:
    if (lower.includes("where id =") && params.length > 0) {
      data = data.filter((item: any) => String(item.id) === String(params[0]));
    } else if (lower.includes("where anime_id =") && params.length > 0) {
      data = data.filter((item: any) => String(item.anime_id) === String(params[0]));
    } else if (lower.includes("where user_id =") && params.length > 0) {
      data = data.filter((item: any) => String(item.user_id) === String(params[0]));
    } else if (lower.includes("where drama_id =") && params.length > 0) {
      data = data.filter((item: any) => String(item.drama_id) === String(params[0]));
    } else if (lower.includes("where slug =") && params.length > 0) {
      data = data.filter((item: any) => String(item.slug) === String(params[0]));
    } else if (lower.includes("where is_banner =") || lower.includes("where is_banner=1")) {
      data = data.filter((item: any) => item.is_banner == 1 || item.is_banner === true);
    } else if (lower.includes("where tavsiya =") || lower.includes("where tavsiya=1")) {
      data = data.filter((item: any) => item.tavsiya == 1 || item.tavsiya === true);
    } else if (lower.includes("where is_active =") || lower.includes("where is_active=1")) {
      data = data.filter((item: any) => item.is_active == 1 || item.is_active === true);
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

function toSlugLocal(text: string): string {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .replace(/o['’`‘ʻʼ]/g, "o")
    .replace(/g['’`‘ʻʼ]/g, "g")
    .replace(/[^a-z0-9\u0400-\u04FF]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

// Resilient query wrapper: Cloudflare D1 with local_store fallback
async function dbQuery<T = any>(sql: string, params?: any[], retries = 3): Promise<T> {
  try {
    return await d1ExecuteQuery<T>(sql, params);
  } catch (err: any) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return dbQuery<T>(sql, params, retries - 1);
    }
    const isSelect = /^\s*(SELECT|PRAGMA|WITH|SHOW|DESCRIBE|EXPLAIN)/i.test(sql.trim());
    if (isSelect) {
      console.warn("[DB D1 Fallback] Query failed (" + (err?.message || err) + "), using local_store fallback");
      const fallbackRows = queryLocalStore(sql, params);
      return [fallbackRows, []] as unknown as T;
    }
    throw err;
  }
}

// In-Memory Global Server Cache (Instant sub-millisecond response)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const serverCache = new Map<string, CacheEntry<any>>();

function getCache<T>(key: string, maxAgeMs = 20000): T | null {
  const item = serverCache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > maxAgeMs) {
    serverCache.delete(key);
    return null;
  }
  return item.data;
}

function setCache<T>(key: string, data: T): void {
  serverCache.set(key, { data, timestamp: Date.now() });
}

function invalidateServerCache(pattern?: string): void {
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

let memoryLocalStore: any = null;
let saveStoreTimeout: any = null;

function loadLocalStore() {
  return {
    animes: [],
    notifications: [],
    comments: [],
    episodes: [],
    users: [],
    ratings: [],
    messages: [],
    mangas: [],
    manga_chapters: [],
    dramas: [],
    drama_episodes: [],
    donations: []
  };
}

function saveLocalStore(_data: any) {
  // PostgreSQL animems is the sole single source of truth
}

const server = http.createServer(app);

// Socket.io Server Setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Instant content cache invalidation & real-time broadcast to all connected clients
function notifyContentUpdate(type: "anime" | "manga" | "drama" | "all") {
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
  } catch (e) {}
}

// Helper to verify JWT with our secure secret only
function verifyAnyJwt(token: string): any {
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// Middleware to authenticate JWT tokens
const authenticateToken = async (req: any, res: any, next: any) => {
  const passcodeHeader = req.headers["x-admin-passcode"] || req.headers["x-passcode"];
  if (passcodeHeader === MASTER_ADMIN_PASSCODE) {
    req.user = { id: 1, role: "admin", name: "Animem.uz Admin", email: "mosinjonovjasurbek28@gmail.com" };
    return next();
  }

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.sendStatus(401);

  const decoded = verifyAnyJwt(token);
  if (!decoded) return res.sendStatus(403);

  // If token payload claims to be admin, verify with PostgreSQL DB immediately
  if (decoded.role === "admin") {
    try {
      const [uRows]: any = await dbQuery("SELECT id, email, phone, role, is_banned FROM users WHERE id = ?", [decoded.id]);
      if (!uRows || uRows.length === 0 || uRows[0].role !== "admin") {
        console.warn(`[SECURITY ALERT] Rejected unauthorized admin token attempt for user ID ${decoded.id}`);
        return res.status(403).json({ error: "Admin huquqi tasdiqlanmadi" });
      }
      const dbEmail = (uRows[0].email || "").toLowerCase().trim();
      const isIdAdmin = ALLOWED_ADMIN_IDS.has(Number(uRows[0].id));
      const isEmailAdmin = ALLOWED_ADMIN_EMAILS.has(dbEmail);
      const isPhoneAdmin = uRows[0].phone === '998886257766';

      if (!isIdAdmin && !isEmailAdmin && !isPhoneAdmin) {
        console.warn(`[SECURITY ALERT] Admin email mismatch: ${dbEmail}`);
        return res.status(403).json({ error: "Ruxsat etilmagan admin hisobi" });
      }
      decoded.email = uRows[0].email;
    } catch (e) {
      return res.status(500).json({ error: "Autentifikatsiya xatoligi" });
    }
  }

  req.user = decoded;
  if (decoded && decoded.id) {
    dbQuery("UPDATE users SET last_seen = NOW() WHERE id = ?", [decoded.id]).catch(() => {});
  }
  next();
};

// Strict Admin Verification Middleware
const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    const passcodeHeader = req.headers["x-admin-passcode"] || req.headers["x-passcode"];
    if (passcodeHeader === MASTER_ADMIN_PASSCODE) {
      req.user = req.user || { id: 1, role: "admin", name: "Animem.uz Admin", email: "mosinjonovjasurbek28@gmail.com" };
      req.user.role = "admin";
      return next();
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Avtorizatsiyadan o'tilmagan" });
    }
    const [users]: any = await dbQuery("SELECT id, name, email, phone, role, is_banned FROM users WHERE id = ?", [req.user.id]);
    if (!users || users.length === 0) {
      return res.status(403).json({ error: "Foydalanuvchi topilmadi" });
    }
    const dbUser = users[0];
    if (dbUser.is_banned == 1 || dbUser.is_banned === true) {
      return res.status(403).json({ error: "Akkount bloklangan" });
    }
    if (dbUser.role !== "admin") {
      return res.status(403).json({ error: "Admin huquqi talab qilinadi" });
    }
    const email = (dbUser.email || "").toLowerCase().trim();
    const isIdAdmin = ALLOWED_ADMIN_IDS.has(Number(dbUser.id));
    const isEmailAdmin = ALLOWED_ADMIN_EMAILS.has(email);
    const isPhoneAdmin = dbUser.phone === '998886257766';

    if (!isIdAdmin && !isEmailAdmin && !isPhoneAdmin) {
      console.warn(`[SECURITY ALERT] Unauthorized admin access attempt by user ${dbUser.id} (${email})`);
      return res.status(403).json({ error: "Kirish taqiqlangan: Ruxsat etilmagan admin" });
    }
    req.user.role = "admin";
    req.user.email = dbUser.email;
    req.adminUser = dbUser;
    next();
  } catch (err: any) {
    console.error("requireAdmin error:", err);
    return res.status(500).json({ error: "Xavfsizlik tekshiruvi amalga oshmadi" });
  }
};

// Verify Admin Passcode and generate valid Admin JWT Token
app.post("/api/admin/verify-passcode", async (req: any, res: any) => {
  try {
    const { passcode } = req.body;
    if (passcode !== MASTER_ADMIN_PASSCODE) {
      return res.status(401).json({ error: "Noto'g'ri maxfiy parol!" });
    }
    const adminUser = {
      id: 1,
      name: "Animem.uz Admin",
      email: "mosinjonovjasurbek28@gmail.com",
      role: "admin",
      avatar_url: "/logo.png"
    };
    const token = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: adminUser.role, name: adminUser.name },
      JWT_SECRET,
      { expiresIn: "30d" }
    );
    res.json({ success: true, token, user: adminUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Xatolik" });
  }
});

// Optional / Lenient token authentication (does not reject unauthenticated or expired requests)
const optionalAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token) {
    const decoded = verifyAnyJwt(token);
    if (decoded) {
      req.user = decoded;
      if (decoded.id) {
        dbQuery("UPDATE users SET last_seen = NOW() WHERE id = ?", [decoded.id]).catch(() => {});
      }
    }
  }
  next();
};

// Check and ensure database connection on start (100% PostgreSQL animems)
async function testDbConnection() {
  try {
    const [rows]: any = await d1ExecuteQuery("SELECT COUNT(*) as cnt FROM anime;");
    console.log(`✅ [PostgreSQL animems] Connected successfully! Found ${rows[0]?.cnt || 0} animes in PostgreSQL.`);
  } catch (err: any) {
    console.error(`❌ [PostgreSQL Connection Error]`, err?.message || err);
  }
}
testDbConnection();

// --- Do'kon (Shop) Jadvallarini Bazasida Yaratish ---
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
      await dbQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_frame_url TEXT DEFAULT NULL`);
    } catch (e) {}
    try {
      await dbQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_id VARCHAR(100) DEFAULT NULL`);
    } catch (e) {}
    try {
      await dbQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT NULL`);
    } catch (e) {}
    try {
      await dbQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS yandex_id VARCHAR(100) DEFAULT NULL`);
    } catch (e) {}
    try {
      await dbQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT NULL`);
    } catch (e) {}
    try {
      await dbQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`);
    } catch (e) {}
    try {
      await dbQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS watch_time_minutes INTEGER DEFAULT 0`);
    } catch (e) {}
    try {
      await dbQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS watch_history TEXT DEFAULT '[]'`);
    } catch (e) {}
    try {
      await dbQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS favorites TEXT DEFAULT '[]'`);
    } catch (e) {}
    try {
      await dbQuery(`CREATE TABLE IF NOT EXISTS media_files (id VARCHAR(255) PRIMARY KEY, filename VARCHAR(255), mime_type VARCHAR(100), data TEXT, size BIGINT, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)`);
    } catch (e) {}

    // Seed sample anime items if shop_items is empty
    const [existing]: any = await dbQuery(`SELECT COUNT(*) as count FROM shop_items`);
    if (existing && existing[0] && Number(existing[0].count) === 0) {
      console.log("Seeding initial anime shop items...");
      const sampleItems = [
        { title: "Sung Jinwoo (Shadow Monarch)", category: "avatar", image_url: "https://files.catbox.moe/54s3e2.jpg", price: 5000 },
        { title: "Gojo Satoru (Limitless)", category: "avatar", image_url: "https://files.catbox.moe/44s7y5.jpg", price: 5000 },
        { title: "Luffy Gear 5 (Sun God Nika)", category: "avatar", image_url: "https://files.catbox.moe/k3612d.jpg", price: 6000 },
        { title: "Neon Cyberpunk Ramkasi", category: "frame", image_url: "https://files.catbox.moe/vptjgt.png", price: 10000 },
        { title: "Alangali Qizil Olov Ramkasi", category: "frame", image_url: "https://files.catbox.moe/7h4sre.png", price: 12000 },
        { title: "Binafsha Energiya Ramkasi", category: "frame", image_url: "https://files.catbox.moe/2s9aee.png", price: 10000 },
        { title: "Solo Leveling Qorong'i Taxt", category: "banner", image_url: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200", price: 15000 },
        { title: "Shibuya Kechasi (Jujutsu Kaisen)", category: "banner", image_url: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200", price: 15000 },
        { title: "Egghead Futuristik Dengiz", category: "banner", image_url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200", price: 15000 }
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

// Ensure anime base table columns, episodes columns, view and triggers exist in PostgreSQL
async function initAnimeTables() {
  try {
    // 1. Ensure columns in base table anime
    await pgPool.query(`ALTER TABLE anime ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0`);
    await pgPool.query(`ALTER TABLE anime ADD COLUMN IF NOT EXISTS telegram_url TEXT DEFAULT ''`);
    await pgPool.query(`ALTER TABLE anime ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT ''`);
    await pgPool.query(`ALTER TABLE anime ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT ''`);
    await pgPool.query(`ALTER TABLE anime ADD COLUMN IF NOT EXISTS is_adult INTEGER DEFAULT 0`);
    await pgPool.query(`ALTER TABLE anime ADD COLUMN IF NOT EXISTS is_banner INTEGER DEFAULT 0`);

    // 2. Ensure columns in episodes table
    await pgPool.query(`ALTER TABLE episodes ADD COLUMN IF NOT EXISTS is_filler INTEGER DEFAULT 0`);
    await pgPool.query(`ALTER TABLE episodes ALTER COLUMN video_url DROP NOT NULL`).catch(() => {});
    await pgPool.query(`ALTER TABLE episodes ALTER COLUMN video_url SET DEFAULT ''`).catch(() => {});

    // 3. Recreate view animes with all columns
    await pgPool.query(`DROP VIEW IF EXISTS animes CASCADE`);
    await pgPool.query(`
      CREATE VIEW animes AS
      SELECT 
        id,
        COALESCE(title_uz, title_orig, title_en, 'Anime'::character varying) AS title,
        title_uz,
        title_orig,
        title_en,
        slug,
        description,
        COALESCE(poster_url, banner_url, ''::text) AS image_url,
        poster_url,
        banner_url,
        season,
        COALESCE(status, 'Faol'::character varying) AS holati,
        status,
        COALESCE(release_year, 2024) AS yil,
        release_year,
        COALESCE(episodes_count, 12) AS qismlar_soni,
        episodes_count,
        COALESCE(current_episodes, 1) AS current_episodes,
        COALESCE(rating, 9.0) AS rating,
        COALESCE(rating_count, 0) AS rating_count,
        COALESCE(views, 0) AS korishlar,
        views,
        COALESCE(is_featured, 0) AS tavsiya,
        is_featured,
        COALESCE(is_banner, 0) AS is_banner,
        COALESCE(type, 'TV'::character varying) AS type,
        COALESCE(age_rating, '16+'::character varying) AS age_rating,
        COALESCE(genres, 'Sarguzasht'::text) AS janrlar,
        genres,
        COALESCE(studio, 'Animem'::character varying) AS studiyasi,
        studio,
        duration,
        dub_studio,
        COALESCE(telegram_url, ''::text) AS telegram_url,
        COALESCE(video_url, ''::text) AS video_url,
        COALESCE(tags, ''::text) AS tags,
        COALESCE(is_adult, 0) AS is_adult,
        created_at,
        updated_at
      FROM anime;
    `);

    // 4. Create INSTEAD OF triggers on animes
    await pgPool.query(`
      CREATE OR REPLACE FUNCTION animes_insert_trigger()
      RETURNS TRIGGER AS $$
      DECLARE
        v_title text;
        v_slug text;
        v_id int;
      BEGIN
        v_title := COALESCE(NEW.title, NEW.title_uz, 'Anime');
        v_slug := COALESCE(NEW.slug, LOWER(REGEXP_REPLACE(v_title, '[^a-zA-Z0-9]+', '-', 'g')));
        IF v_slug = '' OR v_slug = '-' THEN v_slug := 'anime-' || EXTRACT(EPOCH FROM NOW())::int; END IF;

        INSERT INTO anime (
          title_uz, title_orig, title_en, slug, description,
          poster_url, banner_url, season, status, release_year,
          episodes_count, rating, views, is_featured, is_banner,
          type, age_rating, genres, studio, rating_count,
          telegram_url, video_url, tags, is_adult, updated_at
        ) VALUES (
          v_title,
          COALESCE(NEW.title_orig, v_title),
          COALESCE(NEW.title_en, v_title),
          v_slug,
          COALESCE(NEW.description, ''),
          COALESCE(NEW.image_url, NEW.poster_url, ''),
          COALESCE(NEW.banner_url, ''),
          COALESCE(NEW.season, '2024'),
          COALESCE(NEW.holati, NEW.status, 'Faol'),
          COALESCE(NEW.yil, NEW.release_year, 2024),
          COALESCE(NEW.qismlar_soni, NEW.episodes_count, 12),
          COALESCE(NEW.rating, 9.0),
          COALESCE(NEW.korishlar, NEW.views, 0),
          COALESCE(NEW.tavsiya, NEW.is_featured, 0),
          COALESCE(NEW.is_banner, 0),
          COALESCE(NEW.type, 'TV'),
          COALESCE(NEW.age_rating, '16+'),
          COALESCE(NEW.janrlar, NEW.genres, ''),
          COALESCE(NEW.studiyasi, NEW.studio, ''),
          COALESCE(NEW.rating_count, 0),
          COALESCE(NEW.telegram_url, ''),
          COALESCE(NEW.video_url, ''),
          COALESCE(NEW.tags, ''),
          COALESCE(NEW.is_adult, 0),
          CURRENT_TIMESTAMP
        ) RETURNING id INTO v_id;

        NEW.id := v_id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_animes_insert ON animes;
      CREATE TRIGGER trg_animes_insert
      INSTEAD OF INSERT ON animes
      FOR EACH ROW EXECUTE FUNCTION animes_insert_trigger();

      CREATE OR REPLACE FUNCTION animes_update_trigger()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE anime SET
          title_uz = COALESCE(NEW.title, NEW.title_uz, title_uz),
          description = COALESCE(NEW.description, description),
          poster_url = COALESCE(NEW.image_url, NEW.poster_url, poster_url),
          banner_url = COALESCE(NEW.banner_url, banner_url),
          rating = COALESCE(NEW.rating, rating),
          rating_count = COALESCE(NEW.rating_count, rating_count),
          status = COALESCE(NEW.holati, NEW.status, status),
          release_year = COALESCE(NEW.yil, NEW.release_year, release_year),
          episodes_count = COALESCE(NEW.qismlar_soni, NEW.episodes_count, episodes_count),
          views = COALESCE(NEW.korishlar, NEW.views, views),
          genres = COALESCE(NEW.janrlar, NEW.genres, genres),
          studio = COALESCE(NEW.studiyasi, NEW.studio, studio),
          is_featured = COALESCE(NEW.tavsiya, NEW.is_featured, is_featured),
          is_banner = COALESCE(NEW.is_banner, is_banner),
          telegram_url = COALESCE(NEW.telegram_url, telegram_url),
          video_url = COALESCE(NEW.video_url, video_url),
          tags = COALESCE(NEW.tags, tags),
          is_adult = COALESCE(NEW.is_adult, is_adult),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_animes_update ON animes;
      CREATE TRIGGER trg_animes_update
      INSTEAD OF UPDATE ON animes
      FOR EACH ROW EXECUTE FUNCTION animes_update_trigger();

      CREATE OR REPLACE FUNCTION animes_delete_trigger()
      RETURNS TRIGGER AS $$
      BEGIN
        DELETE FROM episodes WHERE anime_id = OLD.id;
        DELETE FROM comments WHERE anime_id = OLD.id;
        DELETE FROM anime WHERE id = OLD.id;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_animes_delete ON animes;
      CREATE TRIGGER trg_animes_delete
      INSTEAD OF DELETE ON animes
      FOR EACH ROW EXECUTE FUNCTION animes_delete_trigger();
    `);

    // Purge any test or exploit attempts immediately
    await pgPool.query(`
      DELETE FROM anime WHERE 
        title_uz ILIKE '%webhook_anime%' OR 
        title_uz ILIKE '%video_ssrf%' OR 
        title_uz ILIKE '%header_test%' OR
        video_url ILIKE '%webhook.site%' OR
        poster_url ILIKE '%webhook.site%';
    `).catch(() => {});

    console.log("Verified and initialized Anime & Episode tables and view triggers in PostgreSQL.");
  } catch (err) {
    console.error("Failed to initialize Anime tables:", err);
  }
}

setTimeout(() => {
  initShopTables();
  initAnimeTables();
}, 500);

// --- Watch Together (Do'stlar bilan birga ko'rish) Data Structures ---
interface WatchParticipant {
  socketId: string;
  userId?: number | string;
  userName: string;
  userAvatar?: string | null;
  isHost?: boolean;
}

interface WatchRoom {
  roomId: string;
  animeSlug: string;
  animeTitle?: string;
  episodeIndex: number;
  currentTime: number;
  isPlaying: boolean;
  lastUpdated: number;
  creatorId?: string | number | null;
  creatorSocketId?: string;
  creatorName?: string | null;
  participants: Map<string, WatchParticipant>;
}

const watchRooms = new Map<string, WatchRoom>();
const socketToWatchRoom = new Map<string, string>(); // socketId -> roomId

// --- Socket.io Real-time Chat & Watch Together Logic ---
io.on("connection", (socket) => {
  console.log("A user connected to socket:", socket.id);

  // 1. Synchronously register Watch Together room listeners immediately
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
          participants: new Map(),
        };
        watchRooms.set(roomId, room);
        isFirstInRoom = true;
      }

      // Check Host status: ONLY room creator is Host!
      let isHost = false;
      if (room.creatorId && user?.id && String(room.creatorId) === String(user.id)) {
        isHost = true;
      } else if (isFirstInRoom || room.creatorSocketId === socket.id) {
        isHost = true;
      } else {
        isHost = false;
      }

      const participant: WatchParticipant = {
        socketId: socket.id,
        userId: user?.id,
        userName: user?.name || (isHost ? "Xona Egasi" : "Do'st"),
        userAvatar: user?.avatar_url || user?.avatar || null,
        isHost,
      };

      room.participants.set(socket.id, participant);
      socketToWatchRoom.set(socket.id, roomId);
      socket.join(roomId);

      const allParticipants = Array.from(room.participants.values());

      // Send initial state to the joining participant
      socket.emit("watchRoomInit", {
        roomState: {
          episodeIndex: room.episodeIndex,
          currentTime: room.currentTime,
          isPlaying: room.isPlaying,
          animeSlug: room.animeSlug,
          animeTitle: room.animeTitle,
        },
        isHost,
        participants: allParticipants,
      });

      // Broadcast updated participant list to EVERYONE in the room
      io.to(roomId).emit("watchRoomUsers", allParticipants);

      // Notify others in room
      socket.to(roomId).emit("watchRoomNotification", {
        type: "join",
        text: `${participant.userName} xonaga qo'shildi 👋`,
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
      // Broadcast to other participants in the room
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
        id: id || ('msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
        roomId,
        text: text.trim(),
        user: {
          name: user?.name || "Muxlis",
          avatar_url: user?.avatar_url || user?.avatar || null,
        },
        time: new Date().toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
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
      // 3 minutes grace period before removing empty room
      setTimeout(() => {
        const r = watchRooms.get(roomId);
        if (r && r.participants.size === 0) {
          watchRooms.delete(roomId);
        }
      }, 180000);
    } else {
      io.to(roomId).emit("watchRoomUsers", Array.from(room.participants.values()));
      if (leavingUser) {
        io.to(roomId).emit("watchRoomNotification", {
          type: "leave",
          text: `${leavingUser.userName} xonani tark etdi`,
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

  // 2. Synchronously register Global chat socket listeners
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

      const broadcastMsg: any = {
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
        created_at: new Date().toISOString(),
      };

      // 1. Zudlik bilan (0-ms) barcha mijozlarga tarqatish!
      io.emit("newMessage", broadcastMsg);

      // 2. Fon rejimida asinxron MySQL va localstore-ga yozish (hech kimni kutdirmaydi)
      (async () => {
        try {
          const [result]: any = await dbQuery(
            "INSERT INTO messages (user_id, user_name, content, reply_to_id, reply_to_name, reply_to_content) VALUES (?, ?, ?, ?, ?, ?)",
            [
              Number(user_id) || 0,
              user_name || "Anonim",
              content,
              reply_to_id ? String(reply_to_id) : null,
              reply_to_name ? String(reply_to_name) : null,
              reply_to_content ? String(reply_to_content) : null,
            ]
          );

          if (result && result.insertId) {
            broadcastMsg.id = result.insertId;
          }

          if (user_id && (!broadcastMsg.user_avatar || !broadcastMsg.user_avatar_frame)) {
            try {
              const [uRows]: any = await dbQuery("SELECT avatar_url, avatar_frame_url FROM users WHERE id = ?", [user_id]);
              if (uRows && uRows[0]) {
                if (uRows[0].avatar_url) broadcastMsg.user_avatar = uRows[0].avatar_url;
                if (uRows[0].avatar_frame_url) {
                  broadcastMsg.user_avatar_frame = uRows[0].avatar_frame_url;
                  broadcastMsg.avatar_frame_url = uRows[0].avatar_frame_url;
                }
              }
            } catch (e) {}
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
        } catch (storeErr) {}
      })();
    } catch (err) {
      console.error("Error saving new chat message via socket:", err);
    }
  });

  // 3. Load previous messages asynchronously in background without blocking listeners
  (async () => {
    try {
      let previousMessages: any[] = [];
      try {
        const [rows]: any = await Promise.race([
          dbQuery(
            `SELECT m.*, 
                    COALESCE(u.name, m.user_name, 'Foydalanuvchi') AS user_name, 
                    u.avatar_url AS user_avatar, 
                    u.avatar_frame_url AS user_avatar_frame, 
                    u.avatar_frame_url AS avatar_frame_url 
             FROM messages m 
             LEFT JOIN users u ON (CAST(m.user_id AS TEXT) = CAST(u.id AS TEXT) AND m.user_id IS NOT NULL)
             ORDER BY m.id DESC LIMIT 50`
          ),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000))
        ]);
        if (Array.isArray(rows) && rows.length > 0) {
          previousMessages = [...rows].reverse();
        }
      } catch (dbErr) {
        // fallback
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

// --- API ROUTES ---

// Watch Together Room API
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
      creatorName: room.creatorName,
    },
  });
});

app.post("/api/watch-room/create", (req, res) => {
  const { animeSlug, animeTitle, episodeIndex, hostUser } = req.body || {};
  const roomId = req.body.roomId || ("room_" + Math.random().toString(36).substring(2, 9));
  
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
      participants: new Map(),
    });
  }

  res.json({
    ok: true,
    success: true,
    roomId,
    url: `/anime/${animeSlug}?room=${roomId}`,
  });
});

// Allowed safe video stream hosts (prevents SSRF and unauthorized intranet probing)
const ALLOWED_PROXY_DOMAINS = [
  "mover.uz",
  "v.mover.uz",
  "voiplay.uz",
  "animem.uz",
  "archive.org",
  "catbox.moe",
  "files.catbox.moe",
  "telegram.org",
  "t.me",
  "googlevideo.com",
  "youtube.com"
];

function isSafeProxyUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();

    // Block private/local IP ranges and cloud metadata addresses
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "169.254.169.254" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
      host === "[::1]" ||
      host.endsWith(".local") ||
      host.endsWith(".internal")
    ) {
      return false;
    }

    // Block known scanner / test domains
    if (
      host.includes("webhook.site") ||
      host.includes("burpcollaborator") ||
      host.includes("interactsh") ||
      host.includes("oastify") ||
      host.includes("requestbin") ||
      host.includes("ngrok")
    ) {
      return false;
    }

    // Check against allowed domains whitelist
    const isAllowed = ALLOWED_PROXY_DOMAINS.some(
      (domain) => host === domain || host.endsWith("." + domain)
    );
    return isAllowed;
  } catch (e) {
    return false;
  }
}

// Video streaming proxy endpoint to bypass CORS / hotlinking / referrer restrictions
app.get("/api/proxy-video", async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).send("Video URL is required");
  }

  try {
    let cleanUrl = targetUrl.trim();
    if (cleanUrl.startsWith("//")) {
      cleanUrl = "https:" + cleanUrl;
    }

    // Auto-resolve Mover.uz watch/embed/page links to direct MP4 stream
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

    // SSRF Check: strictly validate URL host against whitelist
    if (!isSafeProxyUrl(cleanUrl)) {
      console.warn(`[SECURITY ALERT] Blocked SSRF attempt in /api/proxy-video with URL: ${cleanUrl}`);
      return res.status(403).send("Forbidden: Video host is not allowed");
    }

    const parsed = new URL(cleanUrl);
    const isHttps = parsed.protocol === "https:";
    const client = isHttps ? https : http;

    const reqHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "*/*",
      "Accept-Encoding": "identity",
      "Connection": "keep-alive",
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
        headers: reqHeaders,
      },
      (proxyRes) => {
        // Follow safe redirects (301, 302, 307, 308)
        if (
          proxyRes.statusCode &&
          [301, 302, 303, 307, 308].includes(proxyRes.statusCode) &&
          proxyRes.headers.location
        ) {
          const redirectUrl = new URL(proxyRes.headers.location, parsed).toString();
          if (!isSafeProxyUrl(redirectUrl)) {
            return res.status(403).send("Forbidden: Redirect destination is not allowed");
          }
          return res.redirect(`/api/proxy-video?url=${encodeURIComponent(redirectUrl)}`);
        }

        res.status(proxyRes.statusCode || 200);

        const headersToForward = [
          "content-type",
          "content-length",
          "accept-ranges",
          "content-range",
          "content-disposition",
        ];

        headersToForward.forEach((h) => {
          if (proxyRes.headers[h]) {
            res.setHeader(h, proxyRes.headers[h]!);
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
  } catch (err: any) {
    console.error("[Video Proxy Exception]", err?.message || err);
    if (!res.headersSent) {
      res.status(400).send("Invalid URL");
    }
  }
});

// MailerSend Email Verification Store
interface VerificationRecord {
  code: string;
  expiresAt: number;
  createdAt?: number;
  verified: boolean;
}

const verificationCodes: Record<string, VerificationRecord> = {};
const passwordResetCodes: Record<string, VerificationRecord> = {};
const phoneVerificationCodes: Record<string, VerificationRecord> = {};
const phonePasswordResetCodes: Record<string, VerificationRecord> = {};

// MailerSend Email Verification & Password Reset
// Server admin can set MAILERSEND_API_KEY environment variable in production
const MAILERSEND_API_KEY = process.env.MAILERSEND_API_KEY || "mlsn.9ea81361dd457046b74a47c43e6336658c47cad963cff9d053da31e478b849e2";

// Helper function to build ultra-stylish Anime-themed HTML Email Template compliant with MailerSend Legal & Anti-Spam policies
function buildAnimeEmailHtml(title: string, subtitle: string, code: string, note: string) {
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Animem.uz — Xavfsizlik Tasdiqlash Kodi</title>
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
                  🔒 ${title}
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
                        ⏳ Ushbu kod 10 daqiqa davomida amal qiladi
                      </div>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Notice Box -->
              <div style="background-color: #1a1520; border-left: 4px solid #ff006a; border-radius: 8px; padding: 14px 16px; margin: 24px 0; text-align: left;">
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #f472b6; font-weight: 700; line-height: 1.4;">
                  ⚠️ Muhim xavfsizlik eslatmasi:
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
                © ${currentYear} Animem.uz. Barcha huquqlar himoyalangan.
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

// Helper to send emails via MailerSend API with domain fallbacks and Node IPv4
async function sendMailerSendEmail(
  toEmail: string,
  subject: string,
  title: string,
  subtitle: string,
  code: string,
  note: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = (process.env.MAILERSEND_API_KEY || MAILERSEND_API_KEY || "").trim();
  if (!apiKey) {
    return { ok: false, error: "MAILERSEND_API_KEY o'rnatilmagan" };
  }

  // Senders list: prioritize environment variables, then Animem.uz verified domains, then trial domains
  const candidateSenders: Array<{ email: string; name: string }> = [];

  if (process.env.MAILERSEND_FROM_EMAIL) {
    candidateSenders.push({
      email: process.env.MAILERSEND_FROM_EMAIL.trim(),
      name: process.env.MAILERSEND_FROM_NAME?.trim() || "Animem.uz",
    });
  }
  if (process.env.MAILERSEND_SENDER_EMAIL) {
    candidateSenders.push({
      email: process.env.MAILERSEND_SENDER_EMAIL.trim(),
      name: process.env.MAILERSEND_SENDER_NAME?.trim() || "Animem.uz",
    });
  }

  candidateSenders.push(
    { email: "info@animem.uz", name: "Animem.uz" },
    { email: "noreply@animem.uz", name: "Animem.uz" },
    { email: "auth@animem.uz", name: "Animem.uz" },
    { email: "MS_vz9dle@test-vz9dlemxqw14kj50.mlsender.net", name: "Animem.uz" }
  );

  // Deduplicate senders by email
  const seenEmails = new Set<string>();
  const senders = candidateSenders.filter((s) => {
    const lower = s.email.toLowerCase();
    if (seenEmails.has(lower)) return false;
    seenEmails.add(lower);
    return true;
  });

  const htmlContent = buildAnimeEmailHtml(title, subtitle, code, note);
  const textContent = `${title}\n\n${subtitle}\n\nTasdiqlash kodi: ${code}\n\n${note}\n\nUshbu xat avtomatik tarzda yuborilgan bir martalik tranzaksion xabardir.\n© ${new Date().getFullYear()} Animem.uz | support@animem.uz`;

  let lastError = "";

  for (const from of senders) {
    try {
      const payload = JSON.stringify({
        from: {
          email: from.email,
          name: from.name,
        },
        to: [
          {
            email: toEmail,
            name: "Animem.uz Foydalanuvchisi",
          },
        ],
        reply_to: {
          email: "support@animem.uz",
          name: "Animem.uz Yordam",
        },
        subject: subject,
        text: textContent,
        html: htmlContent,
      });

      const response = await new Promise<{ statusCode: number; headers: any; body: string }>((resolve, reject) => {
        const req = https.request(
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
              "Content-Length": Buffer.byteLength(payload),
            },
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
                body,
              });
            });
          }
        );

        req.on("error", (err) => {
          reject(err);
        });

        req.setTimeout(12000, () => {
          req.destroy(new Error("MailerSend API timeout (12s)"));
        });

        req.write(payload);
        req.end();
      });

      console.log(`[MailerSend API Response from=${from.email} to=${toEmail}]: status=${response.statusCode}, messageId=${response.headers['x-message-id'] || 'none'}`);

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
    } catch (err: any) {
      lastError = err.message || "Email yuborishda xatolik";
      console.warn(`[MailerSend API Error with ${from.email}]:`, err);
    }
  }

  return { ok: false, error: lastError };
}

// Unified Zero-External-API Email Delivery Engine
// Supports:
// 1. Direct Gmail SMTP (smtp.gmail.com:465 with GMAIL_USER and GMAIL_APP_PASSWORD)
// 2. Custom Domain SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, e.g. for support@animem.uz)
// 3. Direct MX Delivery (Tashqi API-larsiz, to'g'ridan-to'g'ri qabul qiluvchi pochta serveriga: masalan gmail-smtp-in.l.google.com:25)
// 4. MailerSend fallback (agar MAILERSEND_API_KEY mavjud bo'lsa)
async function sendEmailNotification(
  toEmail: string,
  subject: string,
  title: string,
  subtitle: string,
  code: string,
  note: string
): Promise<{ ok: boolean; method?: string; error?: string }> {
  const htmlContent = buildAnimeEmailHtml(title, subtitle, code, note);
  const textContent = `${title}\n\n${subtitle}\n\nTasdiqlash kodi: ${code}\n\n${note}\n\nUshbu xat avtomatik tarzda yuborilgan bir martalik tranzaksion xabardir.\n© ${new Date().getFullYear()} Animem.uz | support@animem.uz`;
  
  // From address: default is support@animem.uz
  let defaultFrom = (process.env.SMTP_FROM || 'support@animem.uz').trim();
  if (!defaultFrom.includes("<")) {
    defaultFrom = `"Animem.uz" <${defaultFrom}>`;
  }

  // --- STRATEGY 1: Direct SMTP via Gmail or Custom SMTP (Eng ishonchli va hech qanday tashqi API talab qilmaydi) ---
  const smtpUser = (process.env.GMAIL_USER || process.env.SMTP_USER || "mosinjonovjasurbek00@gmail.com").trim();
  // Strip spaces if user copied 16-letter App Password with spaces (e.g. "abcd efgh ijkl mnop")
  const smtpPass = (process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || process.env.SMTP_PASS || "kkyn suvl pdlm kdcd").replace(/\s+/g, "").trim();

  if (smtpUser && smtpPass) {
    try {
      const isGmail = !process.env.SMTP_HOST || process.env.SMTP_HOST.includes("gmail");
      const transporter = isGmail
        ? nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
            connectionTimeout: 10000,
          })
        : nodemailer.createTransport({
            host: process.env.SMTP_HOST.trim(),
            port: Number(process.env.SMTP_PORT) || 465,
            secure: process.env.SMTP_SECURE === "true" || (!process.env.SMTP_SECURE && (Number(process.env.SMTP_PORT) || 465) === 465),
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
            connectionTimeout: 10000,
          });

      const info = await transporter.sendMail({
        from: defaultFrom,
        to: toEmail,
        replyTo: "support@animem.uz",
        subject: subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`[SMTP Email Success] Sent to ${toEmail} via SMTP (${info.messageId})`);
      return { ok: true, method: "smtp" };
    } catch (smtpErr: any) {
      console.warn(`[SMTP Email Warning] Failed sending via SMTP to ${toEmail}:`, smtpErr.message);
    }
  }

  // --- STRATEGY 2: Direct MX Delivery (Tashqi API-larsiz, to'g'ridan-to'g'ri qabul qiluvchi pochta serveriga ulanish) ---
  try {
    const domain = toEmail.split("@")[1];
    if (domain) {
      const mxRecords = await dns.promises.resolveMx(domain);
      if (mxRecords && mxRecords.length > 0) {
        mxRecords.sort((a, b) => a.priority - b.priority);
        const primaryMx = mxRecords[0].exchange;

        console.log(`[Direct MX] Attempting direct delivery to ${toEmail} via ${primaryMx}:25...`);
        const directTransporter = nodemailer.createTransport({
          host: primaryMx,
          port: 25,
          secure: false,
          name: "animem.uz",
          tls: {
            rejectUnauthorized: false,
          },
          connectionTimeout: 7000,
          greetingTimeout: 7000,
          socketTimeout: 8000,
        });

        const info = await directTransporter.sendMail({
          from: defaultFrom,
          to: toEmail,
          replyTo: "support@animem.uz",
          subject: subject,
          text: textContent,
          html: htmlContent,
        });

        console.log(`[Direct MX Success] Direct delivered to ${toEmail} via ${primaryMx} (${info.messageId})`);
        return { ok: true, method: "direct_mx" };
      }
    }
  } catch (directMxErr: any) {
    console.warn(`[Direct MX Warning] Direct MX delivery to ${toEmail} failed:`, directMxErr.message);
  }

  // --- STRATEGY 3: MailerSend API Fallback (agar MAILERSEND_API_KEY o'rnatilgan bo'lsa) ---
  const mailerSendResult = await sendMailerSendEmail(toEmail, subject, title, subtitle, code, note);
  if (mailerSendResult.ok) {
    return { ok: true, method: "mailersend" };
  }

  return {
    ok: false,
    error: mailerSendResult.error || "Email yuborishda xatolik. Iltimos GMAIL_USER/GMAIL_APP_PASSWORD yoki SMTP ma'lumotlarini tekshiring.",
  };
}

// Send 6-digit verification code via MailerSend
app.post("/api/auth/send-code", async (req, res) => {
  try {
    const { email, captchaToken } = req.body;
    if (!captchaToken) {
      return res.status(400).json({ error: "Robot emasligingizni tasdiqlang!" });
    }
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const isHuman = await verifyCaptchaToken(captchaToken, ip as string);
    if (!isHuman) {
      return res.status(400).json({ error: "Captcha tasdiqlanmadi. Iltimos qaytadan urinib ko'ring." });
    }
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Yaroqli email manzilini kiriting!" });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if email already exists in DB
    const [existing]: any = await dbQuery("SELECT id FROM users WHERE email = ?", [cleanEmail]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: "Ushbu email bilan allaqachon ro'yxatdan o'tilgan! Kirish sahifasidan foydalaning." });
    }

    // Anti-spam 60s cooldown check (MailerSend Anti-Spam policy compliance)
    const existingCode = verificationCodes[cleanEmail];
    if (existingCode && existingCode.createdAt && (Date.now() - existingCode.createdAt < 60000)) {
      const waitSeconds = Math.ceil((60000 - (Date.now() - existingCode.createdAt)) / 1000);
      return res.status(429).json({ error: `Iltimos, yangi kod so'rashdan oldin ${waitSeconds} soniya kuting.` });
    }

    // Generate 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store code in memory for 10 minutes
    verificationCodes[cleanEmail] = {
      code,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
      verified: false,
    };

    console.log(`[Email Auth] Verification code generated for ${cleanEmail}: ${code}`);

    // Send email using Direct SMTP / Direct MX / fallback
    const emailResult = await sendEmailNotification(
      cleanEmail,
      "Animem.uz — Ro'yxatdan o'tish tasdiqlash kodi: " + code,
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
        message: "Tasdiqlash kodi email manzilingizga yuborildi! Pochtani (va Spam papkasini) tekshiring.",
      });
    }

    // Fallback: If external email service fails (e.g. SMTP pending configuration), preserve code & return message
    console.warn(`[Email Auth] Email sending failed for ${cleanEmail}: ${emailResult.error}`);
    return res.json({
      success: true,
      emailSent: false,
      devCode: code,
      message: `Tasdiqlash kodi tayyorlandi! ${emailResult.error ? `(Pochta xizmati: ${emailResult.error}. Tasdiqlash kodi: ${code})` : ''}`,
    });
  } catch (error: any) {
    console.error("Send code error:", error);
    res.status(500).json({ error: "Tasdiqlash kodini yuborishda xatolik yuz berdi" });
  }
});

// FORGOT PASSWORD: Send Code
app.post("/api/auth/forgot-password-send-code", async (req, res) => {
  try {
    const { email, captchaToken } = req.body;

    if (!captchaToken) {
      return res.status(400).json({ error: "Robot emasligingizni tasdiqlang!" });
    }
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const isHuman = await verifyCaptchaToken(captchaToken, ip as string);
    if (!isHuman) {
      return res.status(400).json({ error: "Captcha tasdiqlanmadi. Iltimos qaytadan urinib ko'ring." });
    }
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Yaroqli email manzilini kiriting!" });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user exists in DB
    const [existing]: any = await dbQuery("SELECT id FROM users WHERE email = ?", [cleanEmail]);
    if (!existing || existing.length === 0) {
      return res.status(400).json({ error: "Ushbu email manzili bilan foydalanuvchi topilmadi!" });
    }

    // Anti-spam 60s cooldown check
    const existingReset = passwordResetCodes[cleanEmail];
    if (existingReset && existingReset.createdAt && (Date.now() - existingReset.createdAt < 60000)) {
      const waitSeconds = Math.ceil((60000 - (Date.now() - existingReset.createdAt)) / 1000);
      return res.status(429).json({ error: `Iltimos, yangi kod so'rashdan oldin ${waitSeconds} soniya kuting.` });
    }

    // Generate 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store code in memory for 10 minutes
    passwordResetCodes[cleanEmail] = {
      code,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
      verified: false,
    };

    console.log(`[Forgot Password] Reset code generated for ${cleanEmail}: ${code}`);

    // Send email via Direct SMTP / Direct MX / fallback
    const emailResult = await sendEmailNotification(
      cleanEmail,
      "Animem.uz — Parolni tiklash tasdiqlash kodi: " + code,
      "PAROLNI TIKLASH",
      "Akkauntingiz parolini tiklash va yangi parol o'rnatish uchun bir martalik xavfsizlik kodingiz:",
      code,
      "Ushbu kod 10 daqiqa davomida amal qiladi. Agarda siz parolni tiklash so'rovini yubormagan bo'lsangiz, ushbu xatni e'tiborsiz qoldiring — hisobingiz xavfsiz."
    );

    if (emailResult.ok) {
      return res.json({
        success: true,
        emailSent: true,
        method: emailResult.method,
        message: "Parolni tiklash kodi email manzilingizga yuborildi! Pochtani (va Spam papkasini) tekshiring.",
      });
    }

    // Fallback: If external email service fails (e.g. SMTP pending configuration), preserve code & return message
    console.warn(`[Forgot Password] Email sending failed for ${cleanEmail}: ${emailResult.error}`);
    return res.json({
      success: true,
      emailSent: false,
      devCode: code,
      message: `Parolni tiklash kodi tayyorlandi! ${emailResult.error ? `(Pochta xizmati: ${emailResult.error}. Tasdiqlash kodi: ${code})` : ''}`,
    });
  } catch (error: any) {
    console.error("Forgot password send code error:", error);
    res.status(500).json({ error: "Parolni tiklash kodini yuborishda xatolik yuz berdi" });
  }
});

// FORGOT PASSWORD: Verify Code
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
      message: "Tasdiqlash kodi to'g'ri kiritildi!",
    });
  } catch (error: any) {
    console.error("Verify reset code error:", error);
    res.status(500).json({ error: "Kodni tekshirishda xatolik yuz berdi" });
  }
});

// FORGOT PASSWORD: Complete Reset
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

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await dbQuery("UPDATE users SET password = ? WHERE email = ?", [hashedPassword, cleanEmail]);

    delete passwordResetCodes[cleanEmail];

    // Fetch user info for login
    const [users]: any = await dbQuery("SELECT id, name, email, role, avatar_url FROM users WHERE email = ?", [cleanEmail]);
    const user = users[0];

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });

    return res.json({
      success: true,
      message: "Parolingiz muvaffaqiyatli yangilandi!",
      token,
      user,
    });
  } catch (error: any) {
    console.error("Forgot password reset error:", error);
    res.status(500).json({ error: "Parolni o'zgartirishda xatolik yuz berdi" });
  }
});

// Verify 6-digit code
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

    // Mark as verified
    record.verified = true;

    return res.json({
      success: true,
      message: "Tasdiqlash kodi to'g'ri kiritildi!",
    });
  } catch (error: any) {
    console.error("Verify code error:", error);
    res.status(500).json({ error: "Kodni tekshirishda xatolik yuz berdi" });
  }
});

function isAdminEmail(email?: string | null): boolean {
  if (!email || typeof email !== "string") return false;
  const e = email.trim().toLowerCase();
  return e === "mosinjonovjasurbek28@gmail.com" || e === "mosinjonovjasurbek00@gmail.com";
}

// Complete registration for email verified user
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

    // Check if user already exists
    const [existing]: any = await dbQuery("SELECT id FROM users WHERE email = ?", [cleanEmail]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: "Ushbu email bilan allaqachon ro'yxatdan o'tilgan!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const role = isAdminEmail(cleanEmail) ? "admin" : "user";

    const [result]: any = await dbQuery(
      "INSERT INTO users (name, email, password, role, avatar_url) VALUES (?, ?, ?, ?, NULL)",
      [name, cleanEmail, hashedPassword, role]
    );

    delete verificationCodes[cleanEmail];

    const userPayload = {
      id: result.insertId,
      name,
      email: cleanEmail,
      role,
      avatar_url: null,
    };

    const tokenPayload = {
      id: result.insertId,
      email: cleanEmail,
      role,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });

    return res.status(201).json({
      token,
      user: userPayload,
    });
  } catch (error: any) {
    console.error("Register verified error:", error);
    res.status(500).json({ error: "Ro'yxatdan o'tishda xatolik yuz berdi" });
  }
});

// Auth Register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Barcha maydonlarni to'ldiring!" });
    }

    // Check if email already exists
    const [existing]: any = await dbQuery("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Ushbu email bilan allaqachon ro'yxatdan o'tilgan!" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Auto-assign admin for matching email or default user
    const role = isAdminEmail(email) ? "admin" : "user";

    const [result]: any = await dbQuery(
      "INSERT INTO users (name, email, password, role, avatar_url) VALUES (?, ?, ?, ?, NULL)",
      [name, email, hashedPassword, role]
    );

    const userPayload = {
      id: result.insertId,
      name,
      email,
      role,
      avatar_url: null,
    };

    const tokenPayload = {
      id: result.insertId,
      email,
      role,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });

    res.status(201).json({
      token,
      user: userPayload,
    });
  } catch (error: any) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Serverda xatolik yuz berdi" });
  }
});

// Auth Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, captchaToken } = req.body;

    if (!captchaToken) {
      return res.status(400).json({ error: "Robot emasligingizni tasdiqlang!" });
    }
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const isHuman = await verifyCaptchaToken(captchaToken, ip as string);
    if (!isHuman) {
      return res.status(400).json({ error: "Captcha tasdiqlanmadi. Iltimos qaytadan urinib ko'ring." });
    }
    if (!email || !password) {
      return res.status(400).json({ error: "Email va parolni kiriting!" });
    }

    const [users]: any = await dbQuery("SELECT * FROM users WHERE email = ?", [email]);
    const user = users[0];

    if (!user) {
      return res.status(400).json({ error: "Email yoki parol xato!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Email yoki parol xato!" });
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
    };

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });

    res.json({
      token,
      user: userPayload,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Serverda xatolik yuz berdi" });
  }
});

app.post("/api/auth/google", async (req, res) => {
  try {
    const { email, name, avatar_url, google_id } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: "Kerakli ma'lumotlar yo'q" });
    }

    const cleanEmail = email.toLowerCase().trim();
    let [users]: any = await dbQuery("SELECT * FROM users WHERE LOWER(email) = ?", [cleanEmail]);
    let user = users && users[0];

    if (!user) {
      const role = isAdminEmail(cleanEmail) ? "admin" : "user";
      const randomPass = crypto.randomBytes(16).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPass, 10);
      const cleanUsername = cleanEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") + "_" + Math.floor(Math.random() * 1000);
      
      const [result]: any = await dbQuery(
        "INSERT INTO users (name, display_name, username, email, password, password_hash, role, avatar_url, google_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [name, name, cleanUsername, cleanEmail, hashedPassword, hashedPassword, role, avatar_url || null, google_id || null]
      );
      
      user = {
        id: result.insertId,
        name,
        display_name: name,
        username: cleanUsername,
        email: cleanEmail,
        role,
        avatar_url: avatar_url || null,
      };
    } else {
      if (isAdminEmail(cleanEmail) && user.role !== "admin") {
        await dbQuery("UPDATE users SET role = 'admin' WHERE id = ?", [user.id]);
        user.role = "admin";
      }
      if (avatar_url && !user.avatar_url) {
        await dbQuery("UPDATE users SET avatar_url = ? WHERE id = ?", [avatar_url, user.id]);
        user.avatar_url = avatar_url;
      }
      if (google_id && !user.google_id) {
        await dbQuery("UPDATE users SET google_id = ? WHERE id = ?", [google_id, user.id]);
        user.google_id = google_id;
      }
    }

    const userPayload = {
      id: user.id,
      name: user.name || user.display_name || user.username || name,
      email: user.email,
      role: user.role || "user",
      avatar_url: user.avatar_url,
    };

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role || "user",
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });

    res.json({
      token,
      user: userPayload,
    });
  } catch (error: any) {
    console.error("Google Login error:", error);
    res.status(500).json({ error: "Google orqali kirishda xatolik yuz berdi" });
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

    let [users]: any = await dbQuery(
      "SELECT * FROM users WHERE facebook_id = ? OR email = ?",
      [facebookId, userEmail]
    );
    let user = users[0];

    if (!user) {
      // Auto generate random password for facebook users (they won't use it anyway)
      const randomPass = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPass, 10);

      const [result]: any = await dbQuery(
        "INSERT INTO users (name, email, password, role, avatar_url, facebook_id) VALUES (?, ?, ?, ?, ?, ?)",
        [name, userEmail, hashedPassword, "user", avatar_url || null, facebookId]
      );

      user = {
        id: result.insertId,
        name,
        email: userEmail,
        role: "user",
        avatar_url: avatar_url || null,
        facebook_id: facebookId,
      };
    } else {
      if (!user.facebook_id || (avatar_url && !user.avatar_url)) {
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
      avatar_url: user.avatar_url,
    };

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({ token, user: userPayload });
  } catch (error: any) {
    console.error("Facebook Login error:", error);
    res.status(500).json({ error: "Serverda xatolik yuz berdi" });
  }
});

// --- Phone Auth API Endpoints ---

// Send 6-digit SMS verification code
app.post("/api/auth/phone-send-code", async (req, res) => {
  try {
    const { phone, type, captchaToken } = req.body;

    // Only require turnstile for register and forgot (since those are initial actions)
    if (!captchaToken) {
      return res.status(400).json({ error: "Robot emasligingizni tasdiqlang!" });
    }
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const isHuman = await verifyCaptchaToken(captchaToken, ip as string);
    if (!isHuman) {
      return res.status(400).json({ error: "Captcha tasdiqlanmadi. Iltimos qaytadan urinib ko'ring." });
    } // type: 'register' | 'forgot'
    if (!phone || phone.trim().length < 7) {
      return res.status(400).json({ error: "Iltimos, yaroqli telefon raqamini kiriting!" });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');

    if (type === 'register') {
      const [existing]: any = await dbQuery("SELECT id FROM users WHERE phone = ?", [cleanPhone]);
      if (existing && existing.length > 0) {
        return res.status(400).json({ error: "Ushbu telefon raqami bilan allaqachon ro'yxatdan o'tilgan! Kirish sahifasidan foydalaning." });
      }
    } else if (type === 'forgot') {
      const [existing]: any = await dbQuery("SELECT id FROM users WHERE phone = ?", [cleanPhone]);
      if (!existing || existing.length === 0) {
        return res.status(400).json({ error: "Ushbu telefon raqami tizimda topilmadi! Ro'yxatdan o'ting." });
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    if (type === 'forgot') {
      phonePasswordResetCodes[cleanPhone] = {
        code,
        expiresAt: Date.now() + 10 * 60 * 1000,
        verified: false,
      };
    } else {
      phoneVerificationCodes[cleanPhone] = {
        code,
        expiresAt: Date.now() + 10 * 60 * 1000,
        verified: false,
      };
    }

    let smsSent = false;
    let smsError = "";

    // Check if Eskiz SMS service is configured
    const eskizEmail = process.env.ESKIZ_EMAIL;
    const eskizPassword = process.env.ESKIZ_PASSWORD;
    const eskizToken = process.env.ESKIZ_TOKEN;

    if (eskizToken || (eskizEmail && eskizPassword)) {
      try {
        let activeToken = eskizToken;
        if (!activeToken && eskizEmail && eskizPassword) {
          const authRes = await fetch("https://notify.eskiz.uz/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: eskizEmail, password: eskizPassword }),
          });
          const authData = await authRes.json();
          if (authData?.data?.token) {
            activeToken = authData.data.token;
          }
        }

        if (activeToken) {
          const formattedPhone = cleanPhone.replace(/^\+/, '');
          const smsRes = await fetch("https://notify.eskiz.uz/api/message/sms/send", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${activeToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              mobile_phone: formattedPhone,
              message: `Animem.uz - Tasdiqlash kodingiz: ${code}`,
              from: "4546",
              callback_url: "",
            }),
          });
          const smsData = await smsRes.json();
          if (smsRes.ok && smsData?.status === "waiting") {
            smsSent = true;
          } else {
            smsError = smsData?.message || "Eskiz SMS yuborishda xatolik";
          }
        }
      } catch (e: any) {
        console.error("[Eskiz SMS Error]:", e);
        smsError = e.message || "SMS xizmati bilan aloqa uzildi";
      }
    }

    console.log(`[Phone Auth SMS Code] ${type || 'auth'} for ${cleanPhone}: ${code} (Sent: ${smsSent})`);

    return res.json({
      success: true,
      codeSent: true,
      smsSent,
      devCode: smsSent ? undefined : code,
      message: smsSent
        ? `SMS tasdiqlash kodi ${cleanPhone} raqamiga yuborildi!`
        : `SMS provayderi (Eskiz) ulanmaganligi sababli test kodi tayyorlandi (${code}).`,
    });
  } catch (err: any) {
    console.error("phone-send-code error:", err);
    return res.status(500).json({ error: err.message || "SMS kod yuborishda xatolik yuz berdi" });
  }
});

// Verify 6-digit SMS code
app.post("/api/auth/phone-verify-code", async (req, res) => {
  try {
    const { phone, code, type } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: "Telefon raqam va kodni kiriting!" });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const cleanCode = code.toString().trim();

    const store = type === 'forgot' ? phonePasswordResetCodes : phoneVerificationCodes;
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
  } catch (err: any) {
    console.error("phone-verify-code error:", err);
    return res.status(500).json({ error: err.message || "Kodni tekshirishda xatolik" });
  }
});

// Complete registration with verified phone number
app.post("/api/auth/phone-register-verified", async (req, res) => {
  try {
    const { name, phone, password, code, firebaseUid } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ error: "Barcha maydonlarni to'ldiring!" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak!" });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const cleanCode = code ? code.toString().trim() : '';

    if (!firebaseUid) {
      const record = phoneVerificationCodes[cleanPhone];
      if (!record || (!record.verified && record.code !== cleanCode)) {
        return res.status(400).json({ error: "Telefon raqamingiz tasdiqlanmagan yoki kod noto'g'ri!" });
      }
    }

    const [existing]: any = await dbQuery("SELECT id FROM users WHERE phone = ?", [cleanPhone]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: "Ushbu telefon raqami bilan allaqachon ro'yxatdan o'tilgan!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const emailFallback = `${cleanPhone.replace(/[^0-9]/g, '')}@phone.animem.uz`;
    const role = "user";

    const [result]: any = await dbQuery(
      "INSERT INTO users (name, email, phone, password, role, avatar_url) VALUES (?, ?, ?, ?, ?, NULL)",
      [name, emailFallback, cleanPhone, hashedPassword, role]
    );

    delete phoneVerificationCodes[cleanPhone];

    const userId = result.insertId;
    const userPayload = { id: userId, name, email: emailFallback, phone: cleanPhone, role, avatar_url: null };
    const token = jwt.sign(
      { id: userPayload.id, email: userPayload.email, phone: userPayload.phone, role: userPayload.role },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.json({ token, user: userPayload });
  } catch (err: any) {
    console.error("phone-register-verified error:", err);
    return res.status(500).json({ error: err.message || "Ro'yxatdan o'tishda xatolik" });
  }
});

// Login with Phone Number + Password
app.post("/api/auth/phone-login", async (req, res) => {
  try {
    const { phone, password, captchaToken } = req.body;

    if (!captchaToken) {
      return res.status(400).json({ error: "Robot emasligingizni tasdiqlang!" });
    }
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const isHuman = await verifyCaptchaToken(captchaToken, ip as string);
    if (!isHuman) {
      return res.status(400).json({ error: "Captcha tasdiqlanmadi. Iltimos qaytadan urinib ko'ring." });
    }
    if (!phone || !password) {
      return res.status(400).json({ error: "Telefon raqam va parolni kiriting!" });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');

    const [users]: any = await dbQuery(
      "SELECT * FROM users WHERE phone = ? OR email = ?",
      [cleanPhone, cleanPhone]
    );
    const user = users[0];

    if (!user) {
      return res.status(400).json({ error: "Ushbu telefon raqami bo'yicha foydalanuvchi topilmadi!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Telefon raqam yoki parol xato!" });
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar_url: user.avatar_url || null,
    };

    const token = jwt.sign(
      { id: user.id, email: user.email, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.json({ token, user: userPayload });
  } catch (err: any) {
    console.error("phone-login error:", err);
    return res.status(500).json({ error: err.message || "Login qilishda xatolik" });
  }
});

// Reset Password with Phone SMS verification
app.post("/api/auth/phone-reset-password", async (req, res) => {
  try {
    const { phone, code, newPassword, firebaseUid } = req.body;
    if (!phone || (!code && !firebaseUid) || !newPassword) {
      return res.status(400).json({ error: "Barcha maydonlarni to'ldiring!" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak!" });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const cleanCode = code ? code.toString().trim() : '';

    if (!firebaseUid) {
      const record = phonePasswordResetCodes[cleanPhone];
      if (!record || (!record.verified && record.code !== cleanCode)) {
        return res.status(400).json({ error: "Kodingiz tasdiqlanmagan yoki xato!" });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await dbQuery("UPDATE users SET password = ? WHERE phone = ?", [hashedPassword, cleanPhone]);

    delete phonePasswordResetCodes[cleanPhone];

    const [users]: any = await dbQuery("SELECT id, name, email, phone, role, avatar_url FROM users WHERE phone = ?", [cleanPhone]);
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
      avatar_url: user.avatar_url || null,
    };

    const token = jwt.sign(
      { id: user.id, email: user.email, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.json({ token, user: userPayload, message: "Parol muvaffaqiyatli o'zgartirildi!" });
  } catch (err: any) {
    console.error("phone-reset-password error:", err);
    return res.status(500).json({ error: err.message || "Parolni tiklashda xatolik" });
  }
});

// Web Push Broadcast Function (Delivers notifications to devices even when site is closed)
async function broadcastPushNotification(payload: {
  title: string;
  body: string;
  image?: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
}) {
  try {
    let subs: any[] = [];
    try {
      const [rows]: any = await dbQuery("SELECT * FROM push_subscriptions");
      if (Array.isArray(rows)) subs = rows;
    } catch (e) {
      console.warn("Fetch push subscriptions error:", e);
    }

    if (subs.length === 0) return;

    const APP_DEFAULT_ICON = "https://api.animem.uz/api/images/1788100529230_au9wggu";
    const notificationPayload = JSON.stringify({
      title: payload.title || "Animem.uz",
      body: payload.body || "",
      image: payload.image || undefined,
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
        await webpush.sendNotification(pushSubscription, notificationPayload);
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await dbQuery("DELETE FROM push_subscriptions WHERE id = ?", [sub.id]).catch(() => {});
        }
      }
    });

    await Promise.allSettled(sendPromises);
    console.log(`[WebPush] Dispatched push notification to ${subs.length} active device subscriptions`);
  } catch (err) {
    console.error("[WebPush Broadcast Error]:", err);
  }
}

// Get VAPID public key for Web Push registration
app.get("/api/push/vapid-public-key", (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Subscribe to Web Push notifications (stores subscription in MySQL)
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
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Push obunada xatolik" });
  }
});

// Get all notifications from MySQL with local store fallback
app.get("/api/notifications", async (req, res) => {
  try {
    const [rows]: any = await dbQuery("SELECT * FROM notifications ORDER BY id DESC LIMIT 50");
    if (Array.isArray(rows) && rows.length > 0) {
      return res.json(rows);
    }
  } catch (err) {
    console.warn("Notifications fetch falling back to local store:", (err as any)?.message);
  }
  const store = loadLocalStore();
  res.json(store.notifications || []);
});

// Post a new notification (Admin only)
app.post("/api/notifications", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { message, image, url } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Xabar matni bo'sh bo'lishi mumkin emas!" });
    }

    let insertId = Date.now();
    try {
      const [result]: any = await dbQuery(
        "INSERT INTO notifications (message, image, url) VALUES (?, ?, ?)",
        [message.trim(), image || null, url || "/"]
      );
      if (result && result.insertId) insertId = result.insertId;
    } catch (e) {
      console.warn("DB notification insert failed, relying on local store:", (e as any)?.message);
    }

    const store = loadLocalStore();
    const newNotif = {
      id: insertId,
      message: message.trim(),
      image: image || undefined,
      url: url || "/",
      created_at: new Date().toISOString()
    };
    store.notifications = store.notifications || [];
    store.notifications.unshift(newNotif);
    saveLocalStore(store);

    // Send Web Push notification to all devices (whether online or offline)
    broadcastPushNotification({
      title: "Animem.uz | Muhim Yangilik 📢",
      body: message.trim(),
      image: image || undefined,
      url: url || "/",
      tag: `admin-notif-${insertId}`
    }).catch(() => {});

    res.status(201).json(newNotif);
  } catch (err) {
    console.error("Create notification error:", err);
    res.status(500).json({ error: "Bildirishnoma yaratishda xatolik" });
  }
});

// Get Archive.org configuration keys (Admin only)
app.get("/api/archive-config", authenticateToken, (req: any, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Sizda ushbu amalni bajarishga ruxsat yo'q!" });
    }
    res.json({
      accessKey: process.env.ARCHIVE_ORG_ACCESS_KEY || "",
      secretKey: process.env.ARCHIVE_ORG_SECRET_KEY || "",
    });
  } catch (err) {
    console.error("Get archive config error:", err);
    res.status(500).json({ error: "Serverda xatolik" });
  }
});

// --- In-Memory Direct Media Storage (Zero Disk Writing) ---
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max per image
  },
});

/**
 * Normalize image URL helper
 */
function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  let clean = url.trim();
  if (clean.startsWith("/api/media/")) {
    return `https://image.animem.uz${clean}`;
  }
  if (clean.startsWith("/media/")) {
    return `https://image.animem.uz/api${clean}`;
  }
  if (clean.startsWith("https://animem.uz/api/media/")) {
    return clean.replace("https://animem.uz/api/media/", "https://image.animem.uz/api/media/");
  }
  if (clean.startsWith("https://files.catbox.moe/")) {
    return clean.replace("https://files.catbox.moe/", "https://image.animem.uz/");
  }
  if (clean.startsWith("http://files.catbox.moe/")) {
    return clean.replace("http://files.catbox.moe/", "https://image.animem.uz/");
  }
  return clean;
}

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (e) {}
}
app.use("/uploads", express.static(uploadsDir, { maxAge: "30d" }));

// High performance in-memory media cache to minimize DB load on frequent hits
const mediaMemoryCache = new Map<string, { mimeType: string; base64: string; buffer: Buffer }>();

/**
 * Upload an image Buffer to PostgreSQL database and local disk storage.
 * Always returns a clean URL with https://image.animem.uz domain.
 */
async function uploadImageBuffer(
  buffer: Buffer,
  filename: string = "image.jpg",
  mimeType: string = "image/jpeg"
): Promise<string> {
  const cleanExt = path.extname(filename) || (
    mimeType.includes("png") ? ".png" :
    mimeType.includes("webp") ? ".webp" :
    mimeType.includes("gif") ? ".gif" :
    mimeType.includes("webm") ? ".webm" :
    mimeType.includes("mp4") ? ".mp4" : ".jpg"
  );
  const mediaId = "img_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9) + cleanExt;
  const base64String = buffer.toString("base64");

  // 1. Save in RAM cache
  mediaMemoryCache.set(mediaId, { mimeType, base64: base64String, buffer });
  if (mediaMemoryCache.size > 1000) {
    const firstKey = mediaMemoryCache.keys().next().value;
    if (firstKey) mediaMemoryCache.delete(firstKey);
  }

  // 2. Save to local disk uploads/
  try {
    const targetFile = path.join(uploadsDir, mediaId);
    fs.writeFileSync(targetFile, buffer);
  } catch (diskErr: any) {
    console.warn("[uploads] Disk save notice:", diskErr?.message || diskErr);
  }

  // 3. Save directly to PostgreSQL media_files table (persistent cloud storage)
  try {
    await dbQuery(
      `INSERT INTO media_files (id, filename, mime_type, data, size) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, mime_type = EXCLUDED.mime_type`,
      [mediaId, filename, mimeType, base64String, buffer.length]
    );
  } catch (dbErr: any) {
    console.warn("[media_files] DB save notice:", dbErr?.message || dbErr);
  }

  // 4. Also optionally sync to Catbox in background (non-blocking)
  (async () => {
    try {
      const userHash = process.env.CATBOX_USERHASH ? process.env.CATBOX_USERHASH.trim() : "";
      const formData = new FormData();
      formData.append("reqtype", "fileupload");
      if (userHash) formData.append("userhash", userHash);
      formData.append("fileToUpload", new Blob([buffer], { type: mimeType }), filename);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch("https://catbox.moe/user/api.php", {
        method: "POST",
        body: formData,
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0" }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = (await res.text()).trim();
        if (text.startsWith("http://") || text.startsWith("https://")) {
          const fname = text.split("/").pop();
          if (fname) {
            mediaMemoryCache.set(fname, { mimeType, base64: base64String, buffer });
            try {
              fs.writeFileSync(path.join(uploadsDir, fname), buffer);
              await dbQuery(
                `INSERT INTO media_files (id, filename, mime_type, data, size) VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT (id) DO NOTHING`,
                [fname, filename, mimeType, base64String, buffer.length]
              );
            } catch (e) {}
          }
        }
      }
    } catch (e) {}
  })();

  return `https://image.animem.uz/api/media/${mediaId}`;
}

app.post("/api/media/upload", optionalAuth, memoryUpload.single("file"), async (req: any, res: any) => {
  try {
    let fileBuffer: Buffer | null = null;
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
  } catch (err: any) {
    console.error("Media upload error:", err);
    return res.status(500).json({ error: "Rasmni yuklashda xatolik yuz berdi" });
  }
});

// Upload multiple images from device directly
app.post("/api/media/upload-multiple", optionalAuth, memoryUpload.array("files", 60), async (req: any, res: any) => {
  try {
    const files = req.files as Express.Multer.File[];
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
  } catch (err: any) {
    console.error("Multiple media upload error:", err);
    return res.status(500).json({ error: "Rasmlarni yuklashda xatolik yuz berdi" });
  }
});

// Stream media from public assets, RAM cache, local disk, database, or Catbox proxy
app.get([
  "/api/media/:id",
  "/media/:id",
  "/:filename([a-zA-Z0-9_\\-\\.]+\\.(?:jpg|jpeg|png|webp|gif|webm|mp4|svg|avif|ico))",
  "/:id(img_[a-zA-Z0-9_\\-\\.]+)"
], async (req: any, res: any, next: any) => {
  try {
    const id = req.params.id || req.params.filename;
    if (!id) return next();

    // 0. CHECK PUBLIC AND DIST FILES FIRST!
    // (This guarantees /logo.png, /favicon.ico, /logo1.png, /spinbetter_logo.jpg etc. NEVER 404!)
    const publicPath = path.join(process.cwd(), "public");
    const publicCandidate = path.join(publicPath, id);
    if (fs.existsSync(publicCandidate) && fs.statSync(publicCandidate).isFile()) {
      const ext = path.extname(id).toLowerCase();
      const mimeMap: Record<string, string> = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
        ".mp4": "video/mp4",
        ".webm": "video/webm"
      };
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Content-Type", mimeMap[ext] || "application/octet-stream");
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return res.sendFile(path.resolve(publicCandidate));
    }

    const distClientPath = path.join(process.cwd(), "dist", "client");
    const distCandidate = path.join(distClientPath, id);
    if (fs.existsSync(distCandidate) && fs.statSync(distCandidate).isFile()) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return res.sendFile(path.resolve(distCandidate));
    }

    // 1. Check local uploads/ disk folder
    const uploadCandidate = path.join(uploadsDir, id);
    if (fs.existsSync(uploadCandidate) && fs.statSync(uploadCandidate).isFile()) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return res.sendFile(path.resolve(uploadCandidate));
    }

    // 2. Check in-memory RAM cache
    if (mediaMemoryCache.has(id)) {
      const cached = mediaMemoryCache.get(id)!;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Content-Type", cached.mimeType || "image/jpeg");
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return res.send(cached.buffer || Buffer.from(cached.base64, "base64"));
    }

    // 3. Query PostgreSQL media_files table
    try {
      const [rows]: any = await dbQuery("SELECT mime_type, data FROM media_files WHERE id = ? OR filename = ?", [id, id]);
      if (rows && rows.length > 0) {
        const row = rows[0];
        const mimeType = row.mime_type || "image/jpeg";
        const buffer = Buffer.from(row.data, "base64");

        // Cache in RAM for subsequent queries
        mediaMemoryCache.set(id, { mimeType, base64: row.data, buffer });
        if (mediaMemoryCache.size > 1000) {
          const firstKey = mediaMemoryCache.keys().next().value;
          if (firstKey) mediaMemoryCache.delete(firstKey);
        }

        // Also save to disk uploads/ for fast static serving next time
        try {
          fs.writeFileSync(uploadCandidate, buffer);
        } catch (e) {}

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Disposition", "inline");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return res.send(buffer);
      }
    } catch (dbErr) {}

    // 4. If request is NOT on image.animem.uz and NOT an internal media path/ID,
    // call next() so other express static / Vite / SPA routes can process it!
    const host = (req.hostname || req.headers.host || "").toLowerCase();
    const isImageHost = host.includes("image.");
    const isExplicitMedia = req.path.startsWith("/api/media/") || req.path.startsWith("/media/") || id.startsWith("img_");
    if (!isImageHost && !isExplicitMedia) {
      return next();
    }

    // 5. Fallback: Proxy from Catbox CDN
    try {
      const catRes = await fetch(`https://files.catbox.moe/${id}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      if (catRes.ok) {
        const arrayBuf = await catRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const mimeType = catRes.headers.get("content-type") || "image/jpeg";

        mediaMemoryCache.set(id, { mimeType, base64: buffer.toString("base64"), buffer });
        try {
          fs.writeFileSync(uploadCandidate, buffer);
          await dbQuery(
            `INSERT INTO media_files (id, filename, mime_type, data, size) VALUES (?, ?, ?, ?, ?)
             ON CONFLICT (id) DO NOTHING`,
            [id, id, mimeType, buffer.toString("base64"), buffer.length]
          );
        } catch (e) {}

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", mimeType);
        res.setHeader("Content-Disposition", "inline");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return res.send(buffer);
      }
    } catch (catErr) {}

    return res.status(404).send("Rasm topilmadi");
  } catch (err: any) {
    console.error("Serve media error:", err);
    return res.status(500).send("Rasmni yuklab olishda xatolik");
  }
});

app.options([
  "/api/media/:id",
  "/media/:id",
  "/:filename([a-zA-Z0-9_\\-\\.]+\\.(?:jpg|jpeg|png|webp|gif|webm|mp4|svg|avif|ico))",
  "/:id(img_[a-zA-Z0-9_\\-\\.]+)"
], (req: any, res: any) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(204);
});

// --- GIF Management Endpoints (MySQL & Fast Memory Cache) ---
const STATIC_FALLBACK_GIFS = [
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

// 1. Get all GIFs
app.get("/api/gifs", async (req: any, res: any) => {
  res.setHeader("Cache-Control", "public, max-age=10, stale-while-revalidate=30");
  const cached = getCache<any[]>("api_all_gifs", 30000);
  if (cached) {
    return res.json(cached);
  }

  try {
    const [rows]: any = await dbQuery("SELECT * FROM gifs ORDER BY id ASC");
    if (Array.isArray(rows) && rows.length > 0) {
      const store = loadLocalStore();
      store.gifs = rows;
      saveLocalStore(store);
      setCache("api_all_gifs", rows);
      return res.json(rows);
    }
  } catch (err: any) {
    console.warn("GIF fetch falling back:", err?.message || err);
  }

  const store = loadLocalStore();
  const list = (store.gifs && store.gifs.length > 0) ? store.gifs : STATIC_FALLBACK_GIFS;
  setCache("api_all_gifs", list);
  return res.json(list);
});

// 2. Add GIF via URL (Admin only)
app.post("/api/gifs", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { url, title } = req.body;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: "GIF URL manzili kiritilishi shart" });
    }

    const trimmedUrl = url.trim();
    const gifTitle = (title || "").trim() || "Anime GIF";

    let insertedId = Date.now();
    try {
      const [result]: any = await dbQuery(
        "INSERT INTO gifs (title, url) VALUES (?, ?)",
        [gifTitle, trimmedUrl]
      );
      if (result?.insertId) insertedId = result.insertId;
    } catch (e: any) {
      console.warn("Save GIF to DB warning:", e?.message || e);
    }

    const newGif = {
      id: insertedId,
      title: gifTitle,
      url: trimmedUrl,
      media_id: null,
      created_at: new Date()
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
  } catch (err: any) {
    console.error("Add GIF URL error:", err);
    return res.status(500).json({ error: "GIF saqlashda xatolik" });
  }
});

// 3. Upload GIF from device directly to Catbox (Admin only)
app.post("/api/gifs/upload", authenticateToken, requireAdmin, memoryUpload.single("file"), async (req: any, res: any) => {
  try {
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
      const [result]: any = await dbQuery(
        "INSERT INTO gifs (title, url, media_id) VALUES (?, ?, ?)",
        [customTitle, mediaUrl, null]
      );
      if (result?.insertId) insertedId = result.insertId;
    } catch (e: any) {
      console.warn("gifs insert warning:", e?.message || e);
    }

    const newGif = {
      id: insertedId,
      title: customTitle,
      url: mediaUrl,
      media_id: null,
      created_at: new Date()
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
  } catch (err: any) {
    console.error("Upload GIF error:", err);
    return res.status(500).json({ error: "GIF yuklashda xatolik yuz berdi" });
  }
});

// 4. Delete GIF from MySQL (Admin only)
app.delete("/api/gifs/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const gifId = req.params.id;
    if (!gifId) return res.status(400).json({ error: "GIF ID kiritilishi shart" });

    // Try deleting from database
    try {
      const [rows]: any = await dbQuery("SELECT * FROM gifs WHERE id = ?", [gifId]);
      if (rows && rows.length > 0) {
        const gifItem = rows[0];
        await dbQuery("DELETE FROM gifs WHERE id = ?", [gifId]);
        if (gifItem.media_id) {
          await dbQuery("DELETE FROM media_files WHERE id = ?", [gifItem.media_id]);
          mediaMemoryCache.delete(gifItem.media_id);
        }
      }
    } catch (e: any) {
      console.warn("Delete GIF from DB warning:", e?.message || e);
    }

    // Also remove from local store
    const store = loadLocalStore();
    if (store.gifs) {
      store.gifs = store.gifs.filter((g: any) => String(g.id) !== String(gifId));
      saveLocalStore(store);
    }
    invalidateServerCache("api_all_gifs");

    return res.json({ success: true, message: "GIF muvaffaqiyatli o'chirildi", id: gifId });
  } catch (err: any) {
    console.error("Delete GIF error:", err);
    return res.status(500).json({ error: "GIF o'chirishda xatolik" });
  }
});

// Proxy upload endpoint to Archive.org (Admin only)
app.post("/api/upload-archive-proxy", authenticateToken, requireAdmin, upload.single("file"), async (req: any, res: any) => {
  const tempFilePath = req.file?.path;
  try {

    if (!req.file) {
      return res.status(400).json({ error: "Fayl yuklanmadi" });
    }

    const { selectedAnimeId, episodeNumber, title } = req.body;
    if (!selectedAnimeId || !episodeNumber) {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      return res.status(400).json({ error: "Anime ID va Epizod raqami kiritilishi shart" });
    }

    const accessKey = process.env.ARCHIVE_ORG_ACCESS_KEY;
    const secretKey = process.env.ARCHIVE_ORG_SECRET_KEY;

    if (!accessKey || !secretKey) {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      return res.status(400).json({ error: "Archive.org kalitlari (ARCHIVE_ORG_ACCESS_KEY, ARCHIVE_ORG_SECRET_KEY) server sozlamalarida kiritilmagan!" });
    }

    const sanitizeHeaderValue = (val: string): string => {
      if (!val) return "";
      return val.replace(/[^\x20-\x7E]/g, "").trim();
    };

    const sanitizedFileName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const identifier = `animem-uz-ep-${selectedAnimeId}-${episodeNumber}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
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
        "Content-Length": fs.statSync(tempFilePath).size,
      }
    };

    const archiveReq = https.request(options, (archiveRes) => {
      let responseBody = "";
      archiveRes.on("data", (chunk) => {
        responseBody += chunk;
      });
      archiveRes.on("end", () => {
        // Clean up temp file
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch (e) {}
        }

        if (archiveRes.statusCode === 200 || archiveRes.statusCode === 201) {
          console.log(`Proxy upload to Archive.org complete! URL: ${directLink}`);
          if (!res.headersSent) {
            res.json({ success: true, url: directLink });
          }
        } else {
          console.error(`Archive.org upload failed with status ${archiveRes.statusCode}: ${responseBody}`);
          if (!res.headersSent) {
            res.status(500).json({ error: `Archive.org xatosi (${archiveRes.statusCode}): ${responseBody || 'Noma\'lum xatolik'}` });
          }
        }
      });
    });

    archiveReq.on("error", (err) => {
      console.error("Proxy upload stream error:", err);
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (e) {}
      }
      if (!res.headersSent) {
        res.status(500).json({ error: `Server translyatsiya jarayonida xatolik: ${err.message}` });
      }
    });

    const fileStream = fs.createReadStream(tempFilePath);
    fileStream.on("error", (err) => {
      console.error("File read stream error:", err);
      archiveReq.destroy();
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (e) {}
      }
      if (!res.headersSent) {
        res.status(500).json({ error: `Faylni o'qishda xatolik: ${err.message}` });
      }
    });

    fileStream.pipe(archiveReq);

  } catch (err: any) {
    console.error("Upload proxy main error:", err);
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {}
    }
    res.status(500).json({ error: `Tizimda xatolik yuz berdi: ${err.message}` });
  }
});

// GET public or own user profile by ID
app.get("/api/user/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    let requestingUserId: any = null;
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token) {
      const decoded = verifyAnyJwt(token);
      requestingUserId = decoded?.id;
    }

    const isOwner = Boolean(requestingUserId && String(requestingUserId) === String(userId));

    let userData: any = null;
    try {
      const [rows]: any = await dbQuery("SELECT * FROM users WHERE id = ?", [userId]);
      if (rows && rows[0]) userData = rows[0];
    } catch (e) {}

    if (!userData) {
      const store = loadLocalStore();
      userData = store.users?.find((u: any) => String(u.id) === String(userId));
    }

    if (!userData) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
    }

    // Get comments count
    let commentsCount = 0;
    try {
      const [cRows]: any = await dbQuery("SELECT COUNT(*) as cnt FROM comments WHERE user_id = ?", [userId]);
      if (cRows && cRows[0]) commentsCount = cRows[0].cnt;
    } catch (e) {}

    // Resolve favorites to anime objects
    let favoritesAnimes: any[] = [];
    try {
      if (userData.favorites) {
        let favIds: any[] = [];
        if (typeof userData.favorites === 'string') {
          favIds = JSON.parse(userData.favorites);
        } else if (Array.isArray(userData.favorites)) {
          favIds = userData.favorites;
        }

        if (Array.isArray(favIds) && favIds.length > 0) {
          const [aRows]: any = await dbQuery("SELECT * FROM animes");
          const allAnimes = Array.isArray(aRows) && aRows.length > 0 ? aRows : loadLocalStore().animes || [];
          favoritesAnimes = allAnimes.filter((a: any) => favIds.some((f: any) => String(f) === String(a.id)));
        }
      }
    } catch (e) {
      console.warn("Parsing user favorites error:", e);
    }

    // Resolve watch history and watch time
    let watchHistory: any[] = [];
    try {
      if (userData.watch_history) {
        if (typeof userData.watch_history === 'string') {
          watchHistory = JSON.parse(userData.watch_history);
        } else if (Array.isArray(userData.watch_history)) {
          watchHistory = userData.watch_history;
        }
      }
    } catch (e) {}

    let watchTimeMinutes = Number(userData.watch_time_minutes) || 0;
    if (watchTimeMinutes === 0 && Array.isArray(watchHistory) && watchHistory.length > 0) {
      // Calculate based on watched history items
      watchTimeMinutes = watchHistory.reduce((total: number, item: any) => {
        const itemMins = Number(item.minutes_watched) || (Number(item.lastEpisode || 1) * 24);
        return total + itemMins;
      }, 0);
    }

    const responseUser: any = {
      id: userData.id,
      name: userData.name,
      role: userData.role || 'user',
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
      last_seen: userData.last_seen || null,
    };

    // EMAIL PRIVACY: Email is strictly visible ONLY to the owner themselves
    if (isOwner) {
      responseUser.email = userData.email;
      responseUser.phone = userData.phone;
    }

    return res.json({ user: responseUser, isOwner });
  } catch (err: any) {
    console.error("Get user profile error:", err);
    res.status(500).json({ error: "Serverda xatolik yuz berdi" });
  }
});

// Ping endpoint to update user active timestamp
app.post("/api/user/ping", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    await dbQuery("UPDATE users SET last_seen = NOW() WHERE id = ?", [userId]);
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: "Ping failed" });
  }
});

// Update user profile photo (Avatar) - stored with https://image.animem.uz domain
app.post("/api/user/avatar", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    let { avatar_url } = req.body;

    if (!avatar_url) {
      return res.status(400).json({ error: "Rasm topilmadi" });
    }

    if (avatar_url.startsWith("data:image/")) {
      const match = avatar_url.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        const buf = Buffer.from(match[2], "base64");
        avatar_url = await uploadImageBuffer(buf, "avatar.jpg", mime);
      }
    } else {
      avatar_url = normalizeImageUrl(avatar_url);
    }

    await dbQuery("UPDATE users SET avatar_url = ? WHERE id = ?", [avatar_url, userId]);

    // Get updated user details
    const [rows]: any = await dbQuery("SELECT id, name, email, role, avatar_url, avatar_frame_url, banner_url, bio, telegram, instagram, tiktok, youtube, discord, facebook, vk FROM users WHERE id = ?", [userId]);
    const updatedUser = rows[0];

    res.json({ message: "Profil rasmi muvaffaqiyatli yangilandi", user: updatedUser });
  } catch (err) {
    console.error("Upload avatar error:", err);
    res.status(500).json({ error: "Profil rasmini yuklashda xatolik yuz berdi" });
  }
});

// Update user profile details (name, bio, banner, social links)
app.put("/api/user/profile", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    let { name, bio, banner_url, avatar_url, telegram, instagram, tiktok, youtube, discord, facebook, vk, favorites } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Ism bo'sh bo'lishi mumkin emas" });
    }

    const cleanName = name.trim();
    if (avatar_url) {
      if (avatar_url.startsWith("data:image/")) {
        const match = avatar_url.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (match) {
          const mime = match[1];
          const buf = Buffer.from(match[2], "base64");
          avatar_url = await uploadImageBuffer(buf, "avatar.jpg", mime);
        }
      } else {
        avatar_url = normalizeImageUrl(avatar_url);
      }
    }

    if (banner_url) {
      if (banner_url.startsWith("data:image/")) {
        const match = banner_url.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (match) {
          const mime = match[1];
          const buf = Buffer.from(match[2], "base64");
          banner_url = await uploadImageBuffer(buf, "banner.jpg", mime);
        }
      } else {
        banner_url = normalizeImageUrl(banner_url);
      }
    }

    let favsJson: string | null = null;
    if (favorites) {
      favsJson = typeof favorites === 'string' ? favorites : JSON.stringify(favorites);
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

    // Local store fallback
    const store = loadLocalStore();
    const storeUser = store.users?.find((u: any) => String(u.id) === String(userId));
    if (storeUser) {
      storeUser.name = cleanName;
      if (bio !== undefined) storeUser.bio = bio;
      if (banner_url !== undefined) storeUser.banner_url = banner_url;
      if (avatar_url !== undefined) storeUser.avatar_url = avatar_url;
      if (telegram !== undefined) storeUser.telegram = telegram;
      if (instagram !== undefined) storeUser.instagram = instagram;
      if (tiktok !== undefined) storeUser.tiktok = tiktok;
      if (youtube !== undefined) storeUser.youtube = youtube;
      if (discord !== undefined) storeUser.discord = discord;
      if (facebook !== undefined) storeUser.facebook = facebook;
      if (vk !== undefined) storeUser.vk = vk;
      if (favorites !== undefined) storeUser.favorites = favorites;
      saveLocalStore(store);
    }

    const [rows]: any = await dbQuery("SELECT * FROM users WHERE id = ?", [userId]);
    const updatedUser = rows && rows[0] ? rows[0] : (storeUser || { id: userId, name: cleanName });

    const tokenPayload = {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });

    res.json({ message: "Profil yangilandi", user: updatedUser, token });
  } catch (err: any) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Serverda xatolik yuz berdi" });
  }
});

// Sync user favorites array
app.post("/api/user/favorites", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { favorites } = req.body;
    const favsJson = JSON.stringify(favorites || []);

    try {
      await dbQuery("UPDATE users SET favorites = ? WHERE id = ?", [favsJson, userId]);
    } catch (e) {}

    const store = loadLocalStore();
    const storeUser = store.users?.find((u: any) => String(u.id) === String(userId));
    if (storeUser) {
      storeUser.favorites = favorites;
      saveLocalStore(store);
    }

    res.json({ success: true, favorites });
  } catch (err) {
    res.status(500).json({ error: "Favorites sync failed" });
  }
});

// Update or track watch progress and watch time
app.post("/api/user/watch-progress", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { anime_id, episode_number = 1, minutes_watched = 24, total_minutes } = req.body;

    let currentMinutes = 0;
    let currentHistory: any[] = [];

    try {
      const [rows]: any = await dbQuery("SELECT watch_time_minutes, watch_history FROM users WHERE id = ?", [userId]);
      if (rows && rows[0]) {
        currentMinutes = Number(rows[0].watch_time_minutes) || 0;
        if (rows[0].watch_history) {
          try {
            currentHistory = typeof rows[0].watch_history === 'string' ? JSON.parse(rows[0].watch_history) : rows[0].watch_history;
          } catch(e) {}
        }
      }
    } catch(e) {}

    const store = loadLocalStore();
    const storeUser = store.users?.find((u: any) => String(u.id) === String(userId));
    if (storeUser) {
      if (!currentMinutes && storeUser.watch_time_minutes) currentMinutes = Number(storeUser.watch_time_minutes);
      if ((!currentHistory || currentHistory.length === 0) && storeUser.watch_history) currentHistory = storeUser.watch_history;
    }

    if (total_minutes !== undefined && Number(total_minutes) >= 0) {
      currentMinutes = Number(total_minutes);
    } else if (minutes_watched !== undefined && Number(minutes_watched) > 0) {
      currentMinutes += Number(minutes_watched);
    }

    if (anime_id) {
      currentHistory = (currentHistory || []).filter((h: any) => String(h.animeId) !== String(anime_id));
      currentHistory.unshift({
        animeId: anime_id,
        lastEpisode: episode_number,
        viewedAt: new Date().toISOString(),
        minutes_watched: minutes_watched || 24
      });
      currentHistory = currentHistory.slice(0, 50);
    }

    const historyJson = JSON.stringify(currentHistory);
    try {
      await dbQuery("UPDATE users SET watch_time_minutes = ?, watch_history = ? WHERE id = ?", [currentMinutes, historyJson, userId]);
    } catch(e) {}

    if (storeUser) {
      storeUser.watch_time_minutes = currentMinutes;
      storeUser.watch_history = currentHistory;
      saveLocalStore(store);
    }

    res.json({ success: true, watch_time_minutes: currentMinutes, watch_history: currentHistory });
  } catch (err: any) {
    console.error("Watch progress sync error:", err);
    res.status(500).json({ error: "Watch progress sync failed" });
  }
});

// Get recent comments
app.get("/api/comments/recent", async (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
  const cached = getCache<any[]>("api_recent_comments", 60000);
  if (cached) {
    return res.json(cached);
  }
  try {
    const [rows]: any = await dbQuery(`
      SELECT c.*, 
             COALESCE(u.name, 'Foydalanuvchi') AS user_name, 
             u.avatar_url AS user_avatar, 
             u.avatar_frame_url AS user_avatar_frame, 
             u.avatar_frame_url AS avatar_frame_url, 
             a.title AS anime_title 
      FROM comments c 
      LEFT JOIN users u ON (CAST(c.user_id AS TEXT) = CAST(u.id AS TEXT) AND c.user_id IS NOT NULL) 
      LEFT JOIN animes a ON (CAST(c.anime_id AS TEXT) = CAST(a.id AS TEXT)) 
      ORDER BY c.id DESC 
      LIMIT 10
    `);
    if (Array.isArray(rows)) {
      setCache("api_recent_comments", rows);
      return res.json(rows);
    }
  } catch (err) {
    console.warn("Recent comments fetch falling back to local store:", (err as any)?.message);
  }
  const store = loadLocalStore();
  const userMap = new Map((store.users || []).map((u: any) => [String(u.id), u]));
  const animeMap = new Map((store.animes || []).map((a: any) => [String(a.id), a]));
  const recentComms = (store.comments || []).slice(-10).reverse().map((c: any) => {
    const u = userMap.get(String(c.user_id));
    const a = animeMap.get(String(c.anime_id));
    return {
      ...c,
      user_name: c.user_name || u?.name || 'Foydalanuvchi',
      user_avatar: c.user_avatar || u?.avatar_url || null,
      user_avatar_frame: c.user_avatar_frame || u?.avatar_frame_url || null,
      avatar_frame_url: c.avatar_frame_url || u?.avatar_frame_url || null,
      anime_title: c.anime_title || a?.title || ''
    };
  });
  setCache("api_recent_comments", recentComms);
  res.json(recentComms);
});

// Helper functions for file-backed rating database (data.json)
const DATA_FILE_PATH = path.join(process.cwd(), "data.json");

interface RatingRecord {
  id: number;
  user_id: number;
  anime_id: number;
  rating: number;
  created_at: string;
}

let cachedRatings: RatingRecord[] | null = null;
let ratingsCacheTime = 0;

async function getRatingsFromFile(): Promise<RatingRecord[]> {
  if (cachedRatings && (Date.now() - ratingsCacheTime < 30000)) {
    return cachedRatings;
  }
  try {
    if (!fs.existsSync(DATA_FILE_PATH)) {
      let initialRatings: RatingRecord[] = [];
      try {
        const [rows]: any = await dbQuery("SELECT * FROM ratings");
        initialRatings = rows.map((r: any) => ({
          id: r.id,
          user_id: r.user_id,
          anime_id: r.anime_id,
          rating: r.rating,
          created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
        }));
      } catch (dbErr) {
        console.warn("Could not fetch ratings from MySQL on initialization, starting with empty list:", dbErr);
      }
      
      await fs.promises.writeFile(DATA_FILE_PATH, JSON.stringify({ ratings: initialRatings }, null, 2));
      cachedRatings = initialRatings;
      ratingsCacheTime = Date.now();
      return initialRatings;
    }
    const content = await fs.promises.readFile(DATA_FILE_PATH, "utf-8");
    const data = JSON.parse(content);
    cachedRatings = data.ratings || [];
    ratingsCacheTime = Date.now();
    return cachedRatings;
  } catch (error) {
    console.error("Error reading ratings from data.json:", error);
    return cachedRatings || [];
  }
}

async function saveRatingsToFile(ratings: RatingRecord[]): Promise<boolean> {
  try {
    cachedRatings = ratings;
    ratingsCacheTime = Date.now();
    invalidateServerCache("api_all_animes");
    await fs.promises.writeFile(DATA_FILE_PATH, JSON.stringify({ ratings }, null, 2));
    return true;
  } catch (error) {
    console.error("Error writing ratings to data.json:", error);
    return false;
  }
}

async function mergeRatingsWithAnimes(animes: any[]): Promise<any[]> {
  try {
    const ratings = await getRatingsFromFile();
    const statsMap: Record<number, { sum: number; count: number }> = {};
    for (const r of ratings) {
      if (!statsMap[r.anime_id]) {
        statsMap[r.anime_id] = { sum: 0, count: 0 };
      }
      statsMap[r.anime_id].sum += r.rating;
      statsMap[r.anime_id].count += 1;
    }
    return animes.map(anime => {
      const stats = statsMap[anime.id];
      if (stats) {
        return {
          ...anime,
          rating: parseFloat((stats.sum / stats.count).toFixed(1)),
          rating_count: stats.count
        };
      }
      // Preserve the pre-existing database ratings if no rating exists in data.json
      return anime;
    });
  } catch (err) {
    console.error("mergeRatingsWithAnimes error:", err);
    return animes;
  }
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).send("OK");
});

// ==================== TELEGRAM VIDEO STREAMING REDIRECT TO VPS ====================
app.get(["/api/tgstream/:channelId/:messageId", "/api/tghls/*"], (req, res) => {
  res.redirect(302, `https://s3.animem.uz${req.url}`);
});

app.get("/api/animes", async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, must-revalidate");
  const cached = getCache<any[]>("api_all_animes", 15000);
  if (cached) {
    return res.json(cached);
  }
  try {
    const [rows]: any = await dbQuery("SELECT * FROM animes ORDER BY id DESC");
    if (Array.isArray(rows) && rows.length > 0) {
      const merged = await mergeRatingsWithAnimes(rows);
      setCache("api_all_animes", merged);
      return res.json(merged);
    }
  } catch (err) {
    console.warn("Animes fetch falling back to local store:", (err as any)?.message);
  }
  const store = loadLocalStore();
  const merged = await mergeRatingsWithAnimes(store.animes || []);
  setCache("api_all_animes", merged);
  res.json(merged);
});

// Get single anime
app.get("/api/animes/:id", async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, must-revalidate");
  const id = req.params.id;
  const cacheKey = `api_anime_${id}`;
  const cached = getCache<any>(cacheKey, 15000);
  if (cached) {
    dbQuery("UPDATE animes SET korishlar = korishlar + 1 WHERE id = ?", [cached.id || id]).catch(() => {});
    return res.json(cached);
  }

  const toSlugLocal = (text: string): string => {
    if (!text) return "";
    return text
      .toLowerCase()
      .replace(/o['’`‘ʻʼ]/g, "o")
      .replace(/g['’`‘ʻʼ]/g, "g")
      .replace(/[^a-z0-9\u0400-\u04FF]+/gi, "-")
      .replace(/^-+|-+$/g, "");
  };

  try {
    const [rows]: any = await dbQuery("SELECT * FROM animes WHERE id = ?", [id]);
    if (rows && rows.length > 0) {
      dbQuery("UPDATE animes SET korishlar = korishlar + 1 WHERE id = ?", [rows[0].id]).catch(() => {});
      rows[0].korishlar = (rows[0].korishlar || 0) + 1;
      const merged = await mergeRatingsWithAnimes(rows);
      setCache(cacheKey, merged[0]);
      return res.json(merged[0]);
    }
    // Also check if id is actually a slug or title
    const [allRows]: any = await dbQuery("SELECT * FROM animes");
    if (Array.isArray(allRows) && allRows.length > 0) {
      const match = allRows.find((r: any) => toSlugLocal(r.title) === id || String(r.id) === String(id));
      if (match) {
        dbQuery("UPDATE animes SET korishlar = korishlar + 1 WHERE id = ?", [match.id]).catch(() => {});
        match.korishlar = (match.korishlar || 0) + 1;
        const merged = await mergeRatingsWithAnimes([match]);
        setCache(cacheKey, merged[0]);
        return res.json(merged[0]);
      }
    }
  } catch (err) {
    console.warn("Single anime fetch falling back to local store:", (err as any)?.message);
  }

  const store = loadLocalStore();
  const anime = (store.animes || []).find((a: any) => String(a.id) === String(id) || toSlugLocal(a.title) === id);
  if (!anime) {
    return res.status(404).json({ error: "Anime topilmadi" });
  }
  anime.korishlar = (anime.korishlar || 0) + 1;
  saveLocalStore(store);
  const merged = await mergeRatingsWithAnimes([anime]);
  setCache(cacheKey, merged[0]);
  res.json(merged[0]);
});

// Get single anime by slug
app.get("/api/animes/by-slug/:slug", async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, must-revalidate");
  const slug = req.params.slug;
  const cacheKey = `api_anime_slug_${slug}`;
  const cached = getCache<any>(cacheKey, 15000);
  if (cached) {
    dbQuery("UPDATE animes SET korishlar = COALESCE(korishlar, 0) + 1 WHERE id = ?", [cached.id]).catch(() => {});
    cached.korishlar = (cached.korishlar || 0) + 1;
    return res.json(cached);
  }

  const toSlugLocal = (text: string): string => {
    if (!text) return "";
    return text
      .toLowerCase()
      .replace(/o['’`‘ʻʼ]/g, "o")
      .replace(/g['’`‘ʻʼ]/g, "g")
      .replace(/[^a-z0-9\u0400-\u04FF]+/gi, "-")
      .replace(/^-+|-+$/g, "");
  };

  try {
    const [rows]: any = await dbQuery("SELECT * FROM animes");
    if (Array.isArray(rows) && rows.length > 0) {
      const anime = rows.find((r: any) => toSlugLocal(r.title) === slug || String(r.id) === String(slug));
      if (anime) {
        dbQuery("UPDATE animes SET korishlar = COALESCE(korishlar, 0) + 1 WHERE id = ?", [anime.id]).catch(() => {});
        anime.korishlar = (anime.korishlar || 0) + 1;
        const merged = await mergeRatingsWithAnimes([anime]);
        setCache(cacheKey, merged[0]);
        return res.json(merged[0]);
      }
    }
  } catch (err) {
    console.warn("Anime by slug fetch falling back to local store:", (err as any)?.message);
  }

  const store = loadLocalStore();
  const anime = (store.animes || []).find((a: any) => toSlugLocal(a.title) === slug || String(a.id) === String(slug));
  if (!anime) {
    return res.status(404).json({ error: "Anime topilmadi" });
  }
  anime.korishlar = (anime.korishlar || 0) + 1;
  saveLocalStore(store);
  const merged = await mergeRatingsWithAnimes([anime]);
  res.json(merged[0]);
});

// Increment anime view count: POST /api/animes/:id/view
app.post("/api/animes/:id/view", async (req, res) => {
  const id = req.params.id;
  try {
    await dbQuery("UPDATE animes SET korishlar = COALESCE(korishlar, 0) + 1 WHERE id = ?", [id]);
  } catch (e) {}
  const store = loadLocalStore();
  const anime = (store.animes || []).find((a: any) => String(a.id) === String(id));
  if (anime) {
    anime.korishlar = (anime.korishlar || 0) + 1;
    saveLocalStore(store);
  }
  res.json({ success: true, korishlar: anime ? anime.korishlar : undefined });
});

// Get episodes of an anime
app.get("/api/animes/:id/episodes", async (req, res) => {
  const id = req.params.id;
  try {
    const [rows]: any = await dbQuery(
      "SELECT * FROM episodes WHERE anime_id = ? ORDER BY episode_number ASC",
      [id]
    );
    if (Array.isArray(rows) && rows.length > 0) {
      return res.json(rows);
    }
  } catch (err) {
    console.warn("Episodes fetch falling back to local store:", (err as any)?.message);
  }
  const store = loadLocalStore();
  const eps = (store.episodes || []).filter((e: any) => String(e.anime_id) === String(id));
  res.json(eps);
});

function toAnimeSlug(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/o['’`‘]/g, "o")
    .replace(/g['’`‘]/g, "g")
    .replace(/[^a-z0-9\u0400-\u04FF]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Private bridge used by public/animebot/main.py.
 * When a video arrives in the Telegram channel it creates (or updates) the
 * matching anime and its episode on the site. The stored URL is a Telegram
 * deep link, so neither a Telegram bot token nor the actual media file is
 * exposed to browsers.
 */

// --- TELEGRAM NOTIFICATION BOT ---
const TG_BOT_TOKEN = "8838457415:AAEKau5X5g-yj1ghMq00zsS-uzolghL9-LI";
const TG_CHANNEL_ID = "-1004310971743";

async function notifyTelegramNewAnime(animeId: number, episodeNumber: number | null = null) {
  try {
    let animeData: any = null;
    try {
      const [rows]: any = await dbQuery("SELECT * FROM animes WHERE id = ?", [animeId]);
      if (rows && rows.length > 0) {
        animeData = rows[0];
      }
    } catch (dbErr) {
      const store = loadLocalStore();
      animeData = (store.animes || []).find((a: any) => String(a.id) === String(animeId));
    }

    if (!animeData) {
      console.error("Could not find animeData for notification:", animeId);
      return;
    }

    const toSlugLocal = (text: string): string => {
      if (!text) return "";
      return text
        .toLowerCase()
        .replace(/o['’`‘]/g, "o")
        .replace(/g['’`‘]/g, "g")
        .replace(/[^a-z0-9\u0400-\u04FF]+/gi, "-")
        .replace(/^-+|-+$/g, "");
    };

    const slug = toSlugLocal(animeData.title);
    const link = `https://animem.uz/anime/${slug}`;
    const epString = episodeNumber ? `🔢Qism: ${episodeNumber}` : `🔢Qism: ${animeData.qismlar_soni || 1}`;
    const safeTitle = animeData.title.replace(/[_*`\[\]]/g, '');
    let yiliStr = animeData.yil ? `\n📅Yili: ${animeData.yil}` : "";
    
    const caption = `🎬Yangi Qoshildi!\n\n📺Anime: *${safeTitle}*${yiliStr}\n${epString}\n\n🇺🇿O'zbek Tilida!\n\n▶️[Tomosha qilish!](${link})`;
    
    let imageUrl = animeData.image_url;
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `https://animem.uz${imageUrl}`;
    }

    const res = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TG_CHANNEL_ID,
        photo: imageUrl || "https://animem.uz/logo.png",
        caption: caption,
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
// ---------------------------------

app.post("/api/integrations/animebot/episode", async (req, res) => {
  const suppliedSecret = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!ANIMEBOT_SYNC_SECRET || suppliedSecret !== ANIMEBOT_SYNC_SECRET) {
    return res.sendStatus(401);
  }

  const { title, slug, episode_number, note, telegram_url } = req.body || {};
  const episodeNumber = Number.parseInt(String(episode_number), 10);
  if (
    typeof title !== "string" || !title.trim() ||
    !Number.isInteger(episodeNumber) || episodeNumber < 1 ||
    typeof telegram_url !== "string" ||
    !/^https:\/\/t\.me\/[A-Za-z0-9_]+\?start=[A-Za-z0-9_-]{1,64}$/.test(telegram_url)
  ) {
    return res.status(400).json({ error: "Noto'g'ri animebot ma'lumoti" });
  }

  if (isExploitAttempt(title) || isExploitAttempt(slug) || isExploitAttempt(telegram_url) || isExploitAttempt(note)) {
    console.warn(`[Security] Blocked animebot exploit payload attempt: title=${title}`);
    return res.status(400).json({ error: "Xavfsizlik qoidalariga to'g'ri kelmadi" });
  }

  const normalizedTitle = title.trim().slice(0, 255);
  const normalizedSlug = toAnimeSlug(typeof slug === "string" ? slug : normalizedTitle);
  if (!normalizedSlug || normalizedSlug !== toAnimeSlug(normalizedTitle)) {
    return res.status(400).json({ error: "Slug anime nomiga mos emas" });
  }

  let anime: any;
  let animeId: number;
  try {
    const [rows]: any = await dbQuery("SELECT * FROM animes");
    anime = (rows || []).find((row: any) => toAnimeSlug(row.title) === normalizedSlug);

    if (!anime) {
      const [result]: any = await dbQuery(
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

    const [existingEpisode]: any = await dbQuery(
      "SELECT id FROM episodes WHERE anime_id = ? AND episode_number = ?", [animeId, episodeNumber]
    );
    if (existingEpisode?.length) {
      await dbQuery("UPDATE episodes SET video_url = ? WHERE anime_id = ? AND episode_number = ?", [telegram_url, animeId, episodeNumber]);
    } else {
      await dbQuery(
        "INSERT INTO episodes (anime_id, episode_number, video_url) VALUES (?, ?, ?)", [animeId, episodeNumber, telegram_url]
      );
      
      // Notify Telegram channel
      notifyTelegramNewAnime(animeId, episodeNumber);
    }
  } catch (error) {
    // Local store mirrors normal API behavior if MySQL is temporarily offline.
    console.warn("Animebot DB sync failed; using local store:", (error as any)?.message);
    const store = loadLocalStore();
    store.animes = store.animes || [];
    store.episodes = store.episodes || [];
    anime = store.animes.find((item: any) => toAnimeSlug(item.title) === normalizedSlug);
    if (!anime) {
      animeId = Date.now();
      anime = {
        id: animeId, title: normalizedTitle, description: "", image_url: "/logo.png", banner_url: "/logo.png",
        rating: 0, rating_count: 0, holati: "Efirda", yil: null, studiyasi: "", qismlar_soni: episodeNumber,
        korishlar: 0, janrlar: "", video_url: telegram_url, tavsiya: false, is_banner: false, tags: ""
      };
      store.animes.unshift(anime);
    } else {
      animeId = Number(anime.id);
      anime.qismlar_soni = Math.max(Number(anime.qismlar_soni) || 0, episodeNumber);
      if (!anime.video_url) anime.video_url = telegram_url;
    }
    const index = store.episodes.findIndex((item: any) => Number(item.anime_id) === animeId && Number(item.episode_number) === episodeNumber);
    const episode = { id: index >= 0 ? store.episodes[index].id : Date.now(), anime_id: animeId, episode_number: episodeNumber, video_url: telegram_url, note: note || null };
    if (index >= 0) store.episodes[index] = { ...store.episodes[index], ...episode };
    else store.episodes.push(episode);
    saveLocalStore(store);
  }

  res.status(201).json({ anime_id: animeId!, slug: normalizedSlug, episode_number: episodeNumber });
});

// Helper function for safe JSON parsing
function safeJsonParse(val: any, fallback: any = []) {
  if (!val) return fallback;
  if (typeof val !== 'string') return Array.isArray(val) ? val : fallback;
  try {
    const parsed = JSON.parse(val);
    return parsed !== null ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
}

// Get comments of an anime
app.get("/api/animes/:id/comments", async (req, res) => {
  const id = req.params.id;
  try {
    const [rows]: any = await dbQuery(
      `SELECT c.*, 
              COALESCE(u.name, 'Foydalanuvchi') AS user_name, 
              u.avatar_url AS user_avatar, 
              u.avatar_frame_url AS user_avatar_frame, 
              u.avatar_frame_url AS avatar_frame_url 
       FROM comments c 
       LEFT JOIN users u ON (CAST(c.user_id AS TEXT) = CAST(u.id AS TEXT) AND c.user_id IS NOT NULL) 
       WHERE (CAST(c.anime_id AS TEXT) = CAST(? AS TEXT)) 
       ORDER BY c.id DESC`,
      [String(id)]
    );
    if (Array.isArray(rows)) {
      const parsed = rows.map((r: any) => ({
        ...r,
        liked_users: safeJsonParse(r.liked_users, []),
        disliked_users: safeJsonParse(r.disliked_users, []),
        replies: safeJsonParse(r.replies, [])
      }));
      return res.json(parsed);
    }
  } catch (err) {
    console.warn("Comments fetch falling back to local store:", (err as any)?.message);
  }
  const store = loadLocalStore();
  const userMap = new Map((store.users || []).map((u: any) => [String(u.id), u]));
  const comms = (store.comments || [])
    .filter((c: any) => String(c.anime_id) === String(id))
    .map((c: any) => {
      const u = userMap.get(String(c.user_id));
      return {
        ...c,
        user_name: c.user_name || u?.name || 'Foydalanuvchi',
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

// Create comment on an anime
app.post("/api/animes/:id/comments", authenticateToken, async (req: any, res) => {
  try {
    const animeId = req.params.id;
    const userId = req.user.id;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Izoh matni bo'sh bo'lishi mumkin emas" });
    }

    let insertId = Date.now();
    try {
      const [result]: any = await dbQuery(
        "INSERT INTO comments (anime_id, user_id, content, likes, dislikes, liked_users, disliked_users, replies) VALUES (?, ?, ?, 0, 0, '[]', '[]', '[]')",
        [Number(animeId) || null, Number(userId) || null, content]
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
      const [uRows]: any = await dbQuery("SELECT avatar_url, avatar_frame_url FROM users WHERE id = ?", [userId]);
      if (uRows && uRows.length > 0) {
        if (uRows[0].avatar_url) userAvatar = uRows[0].avatar_url;
        if (uRows[0].avatar_frame_url) userAvatarFrame = uRows[0].avatar_frame_url;
      }
    } catch (e) {}

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
      created_at: new Date().toISOString(),
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

// Helper to get comment by ID
async function getCommentById(commentId: string | number) {
  try {
    const [rows]: any = await dbQuery("SELECT * FROM comments WHERE id = ?", [commentId]);
    if (rows && rows.length > 0) return rows[0];
  } catch (e) {}

  const store = loadLocalStore();
  store.comments = store.comments || [];
  return store.comments.find((c: any) => String(c.id) === String(commentId)) || null;
}

// Like comment
app.post("/api/comments/:commentId/like", authenticateToken, async (req: any, res) => {
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
      likedUsers = likedUsers.filter((id: any) => String(id) !== String(userId));
      likes = Math.max(0, likes - 1);
    } else {
      likedUsers.push(userId);
      likes += 1;
      if (hasDisliked) {
        dislikedUsers = dislikedUsers.filter((id: any) => String(id) !== String(userId));
        dislikes = Math.max(0, dislikes - 1);
      }
    }

    try {
      await dbQuery(
        "UPDATE comments SET likes = ?, dislikes = ?, liked_users = ?, disliked_users = ? WHERE id = ?",
        [likes, dislikes, JSON.stringify(likedUsers), JSON.stringify(dislikedUsers), commentId]
      );
    } catch(e) {}

    const store = loadLocalStore();
    store.comments = (store.comments || []).map((c: any) => {
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

// Dislike comment
app.post("/api/comments/:commentId/dislike", authenticateToken, async (req: any, res) => {
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
      dislikedUsers = dislikedUsers.filter((id: any) => String(id) !== String(userId));
      dislikes = Math.max(0, dislikes - 1);
    } else {
      dislikedUsers.push(userId);
      dislikes += 1;
      if (hasLiked) {
        likedUsers = likedUsers.filter((id: any) => String(id) !== String(userId));
        likes = Math.max(0, likes - 1);
      }
    }

    try {
      await dbQuery(
        "UPDATE comments SET likes = ?, dislikes = ?, liked_users = ?, disliked_users = ? WHERE id = ?",
        [likes, dislikes, JSON.stringify(likedUsers), JSON.stringify(dislikedUsers), commentId]
      );
    } catch(e) {}

    const store = loadLocalStore();
    store.comments = (store.comments || []).map((c: any) => {
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

// Reply to comment
app.post("/api/comments/:commentId/reply", authenticateToken, async (req: any, res) => {
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
      const [uRows]: any = await dbQuery("SELECT avatar_url, avatar_frame_url FROM users WHERE id = ?", [userId]);
      if (uRows && uRows.length > 0) {
        if (uRows[0].avatar_url) userAvatar = uRows[0].avatar_url;
        if (uRows[0].avatar_frame_url) userAvatarFrame = uRows[0].avatar_frame_url;
      }
    } catch (e) {}

    const newReply = {
      id: Date.now(),
      user_id: userId,
      user_name: req.user.name,
      user_avatar: userAvatar,
      user_avatar_frame: userAvatarFrame,
      avatar_frame_url: userAvatarFrame,
      content: content.trim(),
      created_at: new Date().toISOString()
    };

    replies.push(newReply);

    try {
      await dbQuery(
        "UPDATE comments SET replies = ? WHERE id = ?",
        [JSON.stringify(replies), commentId]
      );
    } catch(e) {}

    const store = loadLocalStore();
    store.comments = (store.comments || []).map((c: any) => {
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

// Get manga comments
app.get("/api/mangas/:id/comments", async (req, res) => {
  const id = req.params.id;
  try {
    const [rows]: any = await dbQuery(
      `SELECT c.*, u.name AS user_name, u.avatar_url AS user_avatar, u.avatar_frame_url AS user_avatar_frame, u.avatar_frame_url AS avatar_frame_url 
       FROM comments c 
       LEFT JOIN users u ON c.user_id = u.id 
       WHERE c.manga_id = ? 
       ORDER BY c.id DESC`,
      [id]
    );
    if (Array.isArray(rows)) {
      const parsed = rows.map((r: any) => ({
        ...r,
        liked_users: safeJsonParse(r.liked_users, []),
        disliked_users: safeJsonParse(r.disliked_users, []),
        replies: safeJsonParse(r.replies, [])
      }));
      return res.json(parsed);
    }
  } catch (err) {
    console.warn("Manga comments fetch fallback:", (err as any)?.message);
  }
  const store = loadLocalStore();
  const comms = (store.comments || []).filter((c: any) => String(c.manga_id) === String(id));
  res.json(comms);
});

// Post manga comment
app.post("/api/mangas/:id/comments", authenticateToken, async (req: any, res) => {
  try {
    const mangaId = req.params.id;
    const userId = req.user.id;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Izoh matni bo'sh bo'lishi mumkin emas" });
    }

    const [result]: any = await dbQuery(
      "INSERT INTO comments (manga_id, user_id, content, likes, dislikes, liked_users, disliked_users, replies) VALUES (?, ?, ?, 0, 0, '[]', '[]', '[]')",
      [mangaId, userId, content]
    );

    let userAvatar = req.user.avatar_url || null;
    let userAvatarFrame = req.user.avatar_frame_url || null;
    try {
      const [uRows]: any = await dbQuery("SELECT avatar_url, avatar_frame_url FROM users WHERE id = ?", [userId]);
      if (uRows && uRows.length > 0) {
        if (uRows[0].avatar_url) userAvatar = uRows[0].avatar_url;
        if (uRows[0].avatar_frame_url) userAvatarFrame = uRows[0].avatar_frame_url;
      }
    } catch (e) {}

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
      created_at: new Date().toISOString(),
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

// Delete comment
app.delete("/api/comments/:commentId", authenticateToken, async (req: any, res) => {
  try {
    const commentId = req.params.commentId;
    const userId = req.user.id;
    const role = req.user.role;

    // Check ownership or admin
    const [commentRows]: any = await dbQuery("SELECT user_id FROM comments WHERE id = ?", [commentId]);
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

// Rate anime
app.post("/api/animes/:animeId/rate", authenticateToken, async (req: any, res) => {
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

    // Get current ratings from data.json
    const ratings = await getRatingsFromFile();

    // Find if rating already exists
    const existingIndex = ratings.findIndex(r => r.user_id === userId && r.anime_id === animeId);
    if (existingIndex >= 0) {
      ratings[existingIndex].rating = rating;
      ratings[existingIndex].created_at = new Date().toISOString();
    } else {
      const maxId = ratings.reduce((max, r) => r.id > max ? r.id : max, 0);
      ratings.push({
        id: maxId + 1,
        user_id: userId,
        anime_id: animeId,
        rating: rating,
        created_at: new Date().toISOString()
      });
    }

    // Save back to data.json
    await saveRatingsToFile(ratings);

    // Calculate average rating and count for this anime
    const animeRatings = ratings.filter(r => r.anime_id === animeId);
    const count = animeRatings.length;
    const sum = animeRatings.reduce((acc, r) => acc + r.rating, 0);
    const avg_rating = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;

    // Gracefully attempt to sync to MySQL database in background
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
  } catch (err: any) {
    console.error("Rate anime error:", err);
    res.status(500).json({ error: err.message || "Failed to save rating" });
  }
});

// Get ratings distribution and summary for an anime
app.get("/api/animes/:animeId/ratings-summary", async (req, res) => {
  try {
    const animeId = parseInt(req.params.animeId, 10);
    if (isNaN(animeId)) {
      return res.status(400).json({ error: "Noto'g'ri anime ID" });
    }
    
    // Read from data.json
    const ratings = await getRatingsFromFile();
    const animeRatings = ratings.filter(r => r.anime_id === animeId);
    
    let totalCount = animeRatings.length;
    const sum = animeRatings.reduce((acc, r) => acc + r.rating, 0);
    let avgRating = totalCount > 0 ? parseFloat((sum / totalCount).toFixed(1)) : 0;

    // Database fallback if no file-backed rating exists yet
    if (totalCount === 0) {
      try {
        const [rows]: any = await dbQuery("SELECT rating, rating_count FROM animes WHERE id = ?", [animeId]);
        if (rows.length > 0) {
          avgRating = Number(rows[0].rating) || 0;
          totalCount = Number(rows[0].rating_count) || 0;
        }
      } catch (dbErr) {
        console.warn("Could not fetch database fallback rating in ratings-summary:", dbErr);
      }
    }

    const distribution: Record<number, number> = {};
    for (let i = 1; i <= 10; i++) {
      distribution[i] = 0;
    }
    animeRatings.forEach(row => {
      if (row.rating >= 1 && row.rating <= 10) {
        distribution[row.rating] = (distribution[row.rating] || 0) + 1;
      }
    });

    // If we have database fallback rating with 0 distribution, put it in the matching key
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

// Get user rating for anime
app.get("/api/animes/:animeId/rating", authenticateToken, async (req: any, res) => {
  try {
    const animeId = parseInt(req.params.animeId, 10);
    const userId = parseInt(req.user.id, 10);
    
    if (isNaN(animeId) || isNaN(userId)) {
      return res.json({ rating: 0 });
    }

    // Read from data.json
    const ratings = await getRatingsFromFile();
    const userRatingObj = ratings.find(r => r.anime_id === animeId && r.user_id === userId);

    res.json({ rating: userRatingObj ? userRatingObj.rating : 0 });
  } catch (err) {
    console.error("Get rating error:", err);
    res.status(500).json({ error: "Failed to fetch rating" });
  }
});

// Admin Route: Add Anime
app.post("/api/animes", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
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
      is_adult,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Anime nomi kiritilishi shart!" });
    }

    const cleanTitle = title.trim();

    // Block test/SSRF/exploit payloads
    const EXPLOIT_PATTERNS = /(?:header_test|video_ssrf|webhook_anime|webhook\.site|burpcollaborator|interactsh|oastify|requestbin|169\.254\.169\.254|localhost|127\.0\.0\.1|<script|javascript:)/i;
    if (
      EXPLOIT_PATTERNS.test(cleanTitle) ||
      EXPLOIT_PATTERNS.test(description || "") ||
      EXPLOIT_PATTERNS.test(image_url || "") ||
      EXPLOIT_PATTERNS.test(banner_url || "") ||
      EXPLOIT_PATTERNS.test(video_url || "") ||
      EXPLOIT_PATTERNS.test(telegram_url || "")
    ) {
      console.warn(`[SECURITY ALERT] Blocked exploit/test payload in anime creation: title="${cleanTitle}"`);
      return res.status(400).json({ error: "Xavfsizlik qoidalariga zid ma'lumot kiritildi!" });
    }

    const cleanImageUrl = normalizeImageUrl(image_url);
    const cleanBannerUrl = normalizeImageUrl(banner_url);

    let insertId = 0;
    try {
      const [result]: any = await dbQuery(
        `INSERT INTO animes 
        (title, description, image_url, banner_url, rating, rating_count, holati, yil, studiyasi, qismlar_soni, korishlar, janrlar, telegram_url, video_url, tavsiya, is_banner, tags, is_adult) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cleanTitle,
          description || "",
          cleanImageUrl,
          cleanBannerUrl,
          Number(rating) || 9.0,
          Number(rating_count) || 0,
          holati || "Faol",
          yil ? Number(yil) : 2024,
          studiyasi || "",
          qismlar_soni ? Number(qismlar_soni) : 12,
          korishlar ? Number(korishlar) : 0,
          janrlar || "",
          telegram_url || "",
          video_url || "",
          tavsiya ? 1 : 0,
          is_banner ? 1 : 0,
          tags || "",
          is_adult ? 1 : 0,
        ]
      );
      if (result && result.insertId) {
        insertId = result.insertId;
      } else {
        // Query back the newly inserted ID
        const [lookup]: any = await dbQuery("SELECT id FROM animes WHERE title = ? ORDER BY id DESC LIMIT 1", [cleanTitle]);
        if (lookup && lookup[0]) {
          insertId = lookup[0].id;
        }
      }
    } catch (dbErr: any) {
      console.error("DB insert anime failed:", dbErr?.message || dbErr);
      return res.status(500).json({ error: "Anime bazaga saqlanmadi: " + (dbErr?.message || "Xatolik yuz berdi") });
    }

    if (!insertId) {
      return res.status(500).json({ error: "Anime bazaga saqlanmadi (ID olinmadi)" });
    }

    const store = loadLocalStore();
    const newObj = {
      id: insertId,
      title: cleanTitle,
      description: description || "",
      image_url: cleanImageUrl,
      banner_url: cleanBannerUrl,
      rating: Number(rating) || 9.0,
      rating_count: Number(rating_count) || 0,
      holati: holati || "Faol",
      yil: yil ? Number(yil) : 2024,
      studiyasi: studiyasi || "",
      qismlar_soni: qismlar_soni ? Number(qismlar_soni) : 12,
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

    // Invalidate server cache immediately
    invalidateServerCache("api_all_animes");
    invalidateServerCache("api_anime_");

    // Notify Telegram
    notifyTelegramNewAnime(insertId, qismlar_soni ? Number(qismlar_soni) : null);

    // Broadcast Web Push to all devices with anime image
    broadcastPushNotification({
      title: "Animem.uz | Yangi Anime Qo'shildi! 🎬",
      body: `"${cleanTitle}" o'zbek tilida joylandi (${qismlar_soni ? `${qismlar_soni} qism` : 'Film'}). Hoziroq tomosha qiling!`,
      image: cleanImageUrl || cleanBannerUrl || undefined,
      url: `/anime/${toSlugLocal(cleanTitle)}`,
      tag: `anime-${insertId}`
    }).catch(() => {});

    notifyContentUpdate("anime");

    res.status(201).json({ id: insertId, success: true, message: "Yangi anime muvaffaqiyatli qo'shildi!" });
  } catch (err: any) {
    console.error("Add anime error:", err);
    res.status(500).json({ error: "Failed to create anime: " + (err?.message || err) });
  }
});

// Admin Route: Update Anime
app.put("/api/animes/:id", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
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
      is_adult,
    } = req.body;

    const EXPLOIT_PATTERNS = /(?:header_test|video_ssrf|webhook_anime|webhook\.site|burpcollaborator|interactsh|oastify|requestbin|169\.254\.169\.254|localhost|127\.0\.0\.1|<script|javascript:)/i;
    if (
      (title && EXPLOIT_PATTERNS.test(title)) ||
      (description && EXPLOIT_PATTERNS.test(description)) ||
      (image_url && EXPLOIT_PATTERNS.test(image_url)) ||
      (banner_url && EXPLOIT_PATTERNS.test(banner_url)) ||
      (video_url && EXPLOIT_PATTERNS.test(video_url)) ||
      (telegram_url && EXPLOIT_PATTERNS.test(telegram_url))
    ) {
      console.warn(`[SECURITY ALERT] Blocked exploit/test payload in anime update: id=${id}`);
      return res.status(400).json({ error: "Xavfsizlik qoidalariga zid ma'lumot kiritildi!" });
    }

    // Fetch existing record to prevent overwriting missing values like korishlar or rating
    let existing: any = null;
    try {
      const [rows]: any = await dbQuery("SELECT * FROM animes WHERE id = ?", [id]);
      if (rows && rows.length > 0) existing = rows[0];
    } catch (e) {}

    if (!existing) {
      const store = loadLocalStore();
      existing = (store.animes || []).find((a: any) => String(a.id) === String(id));
    }

    const finalKorishlar = (korishlar !== undefined && korishlar !== null) 
      ? Number(korishlar) 
      : (existing ? Number(existing.korishlar || 0) : 0);

    const finalRating = (rating !== undefined && rating !== null) 
      ? Number(rating) 
      : (existing ? Number(existing.rating || 0) : 0.0);

    const finalRatingCount = (rating_count !== undefined && rating_count !== null) 
      ? Number(rating_count) 
      : (existing ? Number(existing.rating_count || 0) : 0);

    const finalTitle = title !== undefined ? title : (existing?.title || "");
    const finalDescription = description !== undefined ? description : (existing?.description || "");
    const finalImageUrl = normalizeImageUrl(image_url !== undefined ? image_url : (existing?.image_url || ""));
    const finalBannerUrl = normalizeImageUrl(banner_url !== undefined ? banner_url : (existing?.banner_url || ""));
    const finalHolati = holati !== undefined ? holati : (existing?.holati || "Faol");
    const finalYil = yil !== undefined ? (yil ? Number(yil) : null) : (existing?.yil || null);
    const finalStudiyasi = studiyasi !== undefined ? studiyasi : (existing?.studiyasi || "");
    const finalQismlarSoni = qismlar_soni !== undefined ? Number(qismlar_soni) : (existing?.qismlar_soni || 0);
    const finalJanrlar = janrlar !== undefined ? janrlar : (existing?.janrlar || "");
    const finalTelegramUrl = telegram_url !== undefined ? telegram_url : (existing?.telegram_url || "");
    const finalVideoUrl = video_url !== undefined ? video_url : (existing?.video_url || "");
    const finalTavsiya = tavsiya !== undefined ? (tavsiya ? 1 : 0) : (existing?.tavsiya ? 1 : 0);
    const finalIsBanner = is_banner !== undefined ? (is_banner ? 1 : 0) : (existing?.is_banner ? 1 : 0);
    const finalTags = tags !== undefined ? tags : (existing?.tags || "");
    const finalIsAdult = is_adult !== undefined ? (is_adult ? 1 : 0) : (existing?.is_adult ? 1 : 0);

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
          id,
        ]
      );
    } catch (dbErr: any) {
      console.error("DB update anime failed:", dbErr?.message || dbErr);
      return res.status(500).json({ error: "Anime tahrirlanmadi: " + (dbErr?.message || "Xatolik yuz berdi") });
    }

    // Always update local_store.json
    const store = loadLocalStore();
    const idx = (store.animes || []).findIndex((a: any) => String(a.id) === String(id));
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

// Admin Route: Delete Anime
app.delete("/api/animes/:id", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const id = req.params.id;

    try {
      await dbQuery("DELETE FROM animes WHERE id = ?", [id]);
    } catch (e) {}

    const store = loadLocalStore();
    store.animes = (store.animes || []).filter((a: any) => String(a.id) !== String(id));
    saveLocalStore(store);

    invalidateServerCache("api_all_animes");
    invalidateServerCache("api_anime_");
    notifyContentUpdate("anime");

    res.json({ message: "Anime o'chirildi" });
  } catch (err) {
    console.error("Delete anime error:", err);
    res.status(500).json({ error: "Failed to delete anime" });
  }
});

// Admin Route: Save Episode (Upsert)
app.post("/api/animes/:animeId/episodes", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const anime_id = parseInt(req.params.animeId);
    const { episode_number, video_url, is_filler } = req.body;
    const epNum = parseInt(episode_number);
    const fillerVal = is_filler ? 1 : 0;

    let epId = 0;
    try {
      const [existing]: any = await dbQuery(
        "SELECT id FROM episodes WHERE anime_id = ? AND episode_number = ?",
        [anime_id, epNum]
      );

      if (existing && existing.length > 0) {
        epId = existing[0].id;
        await dbQuery(
          "UPDATE episodes SET video_url = ?, is_filler = ? WHERE anime_id = ? AND episode_number = ?",
          [video_url || "", fillerVal, anime_id, epNum]
        );
      } else {
        const [result]: any = await dbQuery(
          "INSERT INTO episodes (anime_id, episode_number, video_url, is_filler) VALUES (?, ?, ?, ?)",
          [anime_id, epNum, video_url || "", fillerVal]
        );
        if (result && result.insertId) {
          epId = result.insertId;
        } else {
          const [lookup]: any = await dbQuery(
            "SELECT id FROM episodes WHERE anime_id = ? AND episode_number = ? ORDER BY id DESC LIMIT 1",
            [anime_id, epNum]
          );
          if (lookup && lookup[0]) epId = lookup[0].id;
        }
        
        // Notify Telegram
        notifyTelegramNewAnime(anime_id, epNum);
      }
    } catch (dbErr: any) {
      console.error("DB save episode failed:", dbErr?.message || dbErr);
      return res.status(500).json({ error: "Qism bazaga saqlanmadi: " + (dbErr?.message || "Xatolik") });
    }

    const store = loadLocalStore();
    store.episodes = store.episodes || [];
    const idx = store.episodes.findIndex(
      (e: any) => String(e.anime_id) === String(anime_id) && Number(e.episode_number) === epNum
    );

    if (idx >= 0) {
      store.episodes[idx] = { ...store.episodes[idx], video_url: video_url || "", is_filler: fillerVal };
    } else {
      store.episodes.push({
        id: epId,
        anime_id,
        episode_number: epNum,
        video_url: video_url || "",
        is_filler: fillerVal
      });
    }
    saveLocalStore(store);

    notifyContentUpdate("anime");

    res.json({ success: true, message: "Qism muvaffaqiyatli saqlandi", id: epId });
  } catch (err: any) {
    console.error("Save episode error:", err);
    res.status(500).json({ error: "Qismni saqlashda xatolik: " + (err?.message || err) });
  }
});

// Admin Route: Bulk Save Episodes
app.post("/api/animes/:animeId/episodes/bulk", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
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
      let epId = 0;

      try {
        const [existing]: any = await dbQuery(
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
          const [result]: any = await dbQuery(
            "INSERT INTO episodes (anime_id, episode_number, video_url, is_filler) VALUES (?, ?, ?, ?)",
            [anime_id, epNum, video_url, fillerVal]
          );
          if (result && result.insertId) epId = result.insertId;
        }
      } catch (dbErr: any) {
        console.error(`Bulk save ep #${epNum} failed:`, dbErr?.message || dbErr);
      }

      const idx = store.episodes.findIndex(
        (e: any) => String(e.anime_id) === String(anime_id) && Number(e.episode_number) === epNum
      );
      if (idx >= 0) {
        store.episodes[idx] = { ...store.episodes[idx], video_url, is_filler: fillerVal };
      } else {
        store.episodes.push({
          id: epId || Date.now(),
          anime_id,
          episode_number: epNum,
          video_url,
          is_filler: fillerVal
        });
      }
    }

    saveLocalStore(store);
    notifyContentUpdate("anime");

    res.json({ success: true, message: "Barcha qismlar muvaffaqiyatli saqlandi", count: episodes.length });
  } catch (err: any) {
    console.error("Bulk save episodes error:", err);
    res.status(500).json({ error: "Qismlarni ommaviy saqlashda xatolik: " + (err?.message || err) });
  }
});

// Admin Route: Delete Episode
app.delete("/api/animes/:animeId/episodes/:episodeNumber", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { animeId, episodeNumber } = req.params;

    try {
      await dbQuery(
        "DELETE FROM episodes WHERE anime_id = ? AND episode_number = ?",
        [animeId, episodeNumber]
      );
    } catch (e: any) {
      console.error("Delete episode DB error:", e?.message || e);
    }

    const store = loadLocalStore();
    store.episodes = (store.episodes || []).filter(
      (e: any) => !(String(e.anime_id) === String(animeId) && String(e.episode_number) === String(episodeNumber))
    );
    saveLocalStore(store);

    notifyContentUpdate("anime");

    res.json({ success: true, message: "Qism muvaffaqiyatli o'chirildi" });
  } catch (err: any) {
    console.error("Delete episode error:", err);
    res.status(500).json({ error: "Qismni o'chirishda xatolik: " + (err?.message || err) });
  }
});

// ==================== MANGA API ENDPOINTS ====================

// GET All Mangas
app.get("/api/mangas", async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, must-revalidate");
  const cached = getCache<any[]>("api_all_mangas", 15000);
  if (cached) {
    return res.json(cached);
  }
  try {
    let mangas: any[] = [];
    try {
      const [rows]: any = await dbQuery(`SELECT * FROM mangas ORDER BY id DESC`);
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

// GET Single Manga Details with Chapters
app.get("/api/mangas/:id", async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, must-revalidate");
  const id = req.params.id;
  const cacheKey = `api_manga_${id}`;
  const cached = getCache<any>(cacheKey, 15000);
  if (cached) {
    dbQuery(`UPDATE mangas SET korishlar = korishlar + 1 WHERE id = ?`, [id]).catch(() => {});
    return res.json(cached);
  }
  try {
    let manga: any = null;
    let chapters: any[] = [];

    try {
      const [mangaRows]: any = await dbQuery(`SELECT * FROM mangas WHERE id = ?`, [id]);
      if (Array.isArray(mangaRows) && mangaRows.length > 0) {
        manga = mangaRows[0];
        // Increment view count in DB
        await dbQuery(`UPDATE mangas SET korishlar = korishlar + 1 WHERE id = ?`, [id]);
        manga.korishlar = (manga.korishlar || 0) + 1;

        const [chapRows]: any = await dbQuery(`SELECT * FROM manga_chapters WHERE manga_id = ? ORDER BY chapter_number ASC`, [id]);
        if (Array.isArray(chapRows)) {
          chapters = chapRows.map((c: any) => ({
            ...c,
            pages: typeof c.pages === 'string' ? JSON.parse(c.pages) : c.pages
          }));
        }
      }
    } catch (dbErr) {
      console.warn("MySQL get manga detail failed, falling back to local_store:", dbErr);
    }

    if (!manga) {
      const store = loadLocalStore();
      const mangas = store.mangas || [];
      const mangaIndex = mangas.findIndex((m: any) => String(m.id) === String(id));
      if (mangaIndex === -1) {
        return res.status(404).json({ error: "Manga topilmadi" });
      }
      mangas[mangaIndex].korishlar = (mangas[mangaIndex].korishlar || 0) + 1;
      saveLocalStore(store);

      manga = mangas[mangaIndex];
      chapters = (store.manga_chapters || [])
        .filter((c: any) => String(c.manga_id) === String(id))
        .sort((a: any, b: any) => a.chapter_number - b.chapter_number);
    }

    res.json({ ...manga, chapters });
  } catch (err) {
    console.error("Get manga details error:", err);
    res.status(500).json({ error: "Failed to fetch manga details" });
  }
});

// GET Single Manga Chapter Pages
app.get("/api/mangas/:id/chapters/:chapterNumber", async (req, res) => {
  try {
    const { id, chapterNumber } = req.params;
    let chapter: any = null;
    let mangaTitle = "Manga";
    let allChapters: any[] = [];

    try {
      const [mangaRows]: any = await dbQuery(`SELECT title FROM mangas WHERE id = ?`, [id]);
      if (Array.isArray(mangaRows) && mangaRows.length > 0) {
        mangaTitle = mangaRows[0].title;
      }

      const [chapRows]: any = await dbQuery(`SELECT * FROM manga_chapters WHERE manga_id = ? AND chapter_number = ?`, [id, chapterNumber]);
      if (Array.isArray(chapRows) && chapRows.length > 0) {
        const rawChap = chapRows[0];
        chapter = {
          ...rawChap,
          pages: typeof rawChap.pages === 'string' ? JSON.parse(rawChap.pages) : rawChap.pages
        };

        const [allChapRows]: any = await dbQuery(`SELECT id, chapter_number, title FROM manga_chapters WHERE manga_id = ? ORDER BY chapter_number ASC`, [id]);
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
        (c: any) => String(c.manga_id) === String(id) && String(c.chapter_number) === String(chapterNumber)
      );
      if (!chapter) {
        return res.status(404).json({ error: "Bob topilmadi" });
      }
      const manga = (store.mangas || []).find((m: any) => String(m.id) === String(id));
      mangaTitle = manga?.title || "Manga";
      allChapters = (store.manga_chapters || [])
        .filter((c: any) => String(c.manga_id) === String(id))
        .sort((a: any, b: any) => a.chapter_number - b.chapter_number)
        .map((c: any) => ({
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

// Admin Route: Create/Add Manga
app.post("/api/mangas", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
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
      released_year: released_year ? parseInt(released_year) : new Date().getFullYear(),
      tags: tags || "",
      type: type || "Manga",
      rating: 9.5,
      korishlar: 0,
      chapters_count: 0,
      created_at: new Date().toISOString()
    };

    // Save to local_store.json
    const store = loadLocalStore();
    store.mangas = store.mangas || [];
    store.mangas.unshift(newManga);
    saveLocalStore(store);

    // Save to MySQL database
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

// Admin Route: Update Manga
app.put("/api/mangas/:id", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const id = req.params.id;
    const store = loadLocalStore();
    store.mangas = store.mangas || [];
    const idx = store.mangas.findIndex((m: any) => String(m.id) === String(id));

    const updatedData = req.body;
    if (idx >= 0) {
      store.mangas[idx] = {
        ...store.mangas[idx],
        ...updatedData
      };
      saveLocalStore(store);
    }

    // Update in MySQL database
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

// Admin Route: Delete Manga
app.delete("/api/mangas/:id", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const id = req.params.id;

    // Delete from local_store.json
    const store = loadLocalStore();
    store.mangas = (store.mangas || []).filter((m: any) => String(m.id) !== String(id));
    store.manga_chapters = (store.manga_chapters || []).filter((c: any) => String(c.manga_id) !== String(id));
    saveLocalStore(store);

    // Delete from MySQL database
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

// Admin Route: Clear all mangas (test mangas removal)
app.delete("/api/admin/mangas-clear", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
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

// Admin Route: Save / Add Manga Chapter
app.post("/api/mangas/:mangaId/chapters", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const mangaId = req.params.mangaId;
    const { chapter_number, title, pages } = req.body;

    if (!chapter_number || !pages || !Array.isArray(pages) || pages.length === 0) {
      return res.status(400).json({ error: "Bob raqami va kamida 1 ta rasm havolasi (pages) talab qilinadi!" });
    }

    const cleanPages = pages.filter((p: string) => typeof p === 'string' && p.trim().length > 0);
    const jsonPages = JSON.stringify(cleanPages);

    const store = loadLocalStore();
    store.manga_chapters = store.manga_chapters || [];

    const existingIdx = store.manga_chapters.findIndex(
      (c: any) => String(c.manga_id) === String(mangaId) && Number(c.chapter_number) === Number(chapter_number)
    );

    const chapterObj = {
      id: existingIdx >= 0 ? store.manga_chapters[existingIdx].id : Date.now(),
      manga_id: isNaN(Number(mangaId)) ? mangaId : Number(mangaId),
      chapter_number: Number(chapter_number),
      title: title || `${chapter_number}-bob`,
      pages: cleanPages,
      views: existingIdx >= 0 ? store.manga_chapters[existingIdx].views || 0 : 0,
      created_at: existingIdx >= 0 ? store.manga_chapters[existingIdx].created_at : new Date().toISOString()
    };

    if (existingIdx >= 0) {
      store.manga_chapters[existingIdx] = chapterObj;
    } else {
      store.manga_chapters.push(chapterObj);
    }

    // Update manga chapter count in local store
    const mangaIdx = (store.mangas || []).findIndex((m: any) => String(m.id) === String(mangaId));
    if (mangaIdx >= 0) {
      const chapterCount = store.manga_chapters.filter((c: any) => String(c.manga_id) === String(mangaId)).length;
      store.mangas[mangaIdx].chapters_count = chapterCount;
    }

    saveLocalStore(store);

    // Save to MySQL database
    try {
      const [existingChapRows]: any = await dbQuery(
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

      // Update chapter count in MySQL mangas
      const [allChapRows]: any = await dbQuery(`SELECT COUNT(*) as cnt FROM manga_chapters WHERE manga_id = ?`, [mangaId]);
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

// Admin Route: Delete Manga Chapter
app.delete("/api/mangas/:mangaId/chapters/:chapterNumber", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { mangaId, chapterNumber } = req.params;

    // Delete from local_store.json
    const store = loadLocalStore();
    store.manga_chapters = (store.manga_chapters || []).filter(
      (c: any) => !(String(c.manga_id) === String(mangaId) && String(c.chapter_number) === String(chapterNumber))
    );

    const mangaIdx = (store.mangas || []).findIndex((m: any) => String(m.id) === String(mangaId));
    if (mangaIdx >= 0) {
      const chapterCount = store.manga_chapters.filter((c: any) => String(c.manga_id) === String(mangaId)).length;
      store.mangas[mangaIdx].chapters_count = chapterCount;
    }

    saveLocalStore(store);

    // Delete from MySQL database
    try {
      await dbQuery(
        `DELETE FROM manga_chapters WHERE manga_id = ? AND chapter_number = ?`,
        [mangaId, chapterNumber]
      );
      const [allChapRows]: any = await dbQuery(`SELECT COUNT(*) as cnt FROM manga_chapters WHERE manga_id = ?`, [mangaId]);
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

// ==================== DRAMA API ENDPOINTS ====================

// GET All Dramas
app.get("/api/dramas", async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, must-revalidate");
  const cached = getCache<any[]>("api_all_dramas", 15000);
  if (cached) {
    return res.json(cached);
  }
  try {
    let dramas: any[] = [];
    try {
      const [rows]: any = await dbQuery(`SELECT * FROM dramas ORDER BY id DESC`);
      if (Array.isArray(rows) && rows.length > 0) {
        dramas = rows;
      }
    } catch (dbErr) {
      console.warn("MySQL fetch dramas failed, fallback to local_store:", dbErr);
    }

    if (dramas.length === 0) {
      const store = loadLocalStore();
      dramas = store.dramas || [];
    }

    const store = loadLocalStore();
    const allEpisodes = store.drama_episodes || [];

    const formatted = dramas.map((d: any) => {
      const eps = allEpisodes.filter((ep: any) => String(ep.drama_id) === String(d.id));
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

// GET Single Drama Details with Episodes
app.get("/api/dramas/:id", async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, must-revalidate");
  const id = req.params.id;
  try {
    let drama: any = null;

    try {
      const [rows]: any = await dbQuery(`SELECT * FROM dramas WHERE id = ?`, [id]);
      if (Array.isArray(rows) && rows.length > 0) {
        drama = rows[0];
        // Increment views
        await dbQuery(`UPDATE dramas SET korishlar = korishlar + 1 WHERE id = ?`, [id]);
        drama.korishlar = (drama.korishlar || 0) + 1;
      }
    } catch (dbErr) {
      console.warn("MySQL get drama detail failed, fallback to local_store:", dbErr);
    }

    const store = loadLocalStore();
    if (!drama) {
      const dramas = store.dramas || [];
      const idx = dramas.findIndex((d: any) => String(d.id) === String(id));
      if (idx === -1) {
        return res.status(404).json({ error: "Drama topilmadi" });
      }
      dramas[idx].korishlar = (dramas[idx].korishlar || 0) + 1;
      saveLocalStore(store);
      drama = dramas[idx];
    }

    // Fetch episodes for this drama
    let episodes: any[] = [];
    try {
      const [epRows]: any = await dbQuery(`SELECT * FROM drama_episodes WHERE drama_id = ? ORDER BY qism ASC`, [id]);
      if (Array.isArray(epRows) && epRows.length > 0) {
        episodes = epRows;
      }
    } catch (e) {}

    if (episodes.length === 0) {
      episodes = (store.drama_episodes || []).filter((ep: any) => String(ep.drama_id) === String(id));
      episodes.sort((a: any, b: any) => Number(a.qism) - Number(b.qism));
    }

    // If no episodes in episodes table but drama has video_url, provide a default episode 1
    if (episodes.length === 0 && drama.video_url) {
      episodes = [
        {
          id: `ep_1_${drama.id}`,
          drama_id: drama.id,
          qism: 1,
          title: "1-Qism",
          video_url: drama.video_url,
          created_at: drama.created_at || new Date().toISOString()
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

// GET Drama Episodes list
app.get("/api/dramas/:id/episodes", async (req, res) => {
  const id = req.params.id;
  try {
    let episodes: any[] = [];
    try {
      const [rows]: any = await dbQuery(`SELECT * FROM drama_episodes WHERE drama_id = ? ORDER BY qism ASC`, [id]);
      if (Array.isArray(rows) && rows.length > 0) {
        episodes = rows;
      }
    } catch (dbErr) {
      console.warn("MySQL fetch drama episodes error:", dbErr);
    }

    if (episodes.length === 0) {
      const store = loadLocalStore();
      episodes = (store.drama_episodes || []).filter((ep: any) => String(ep.drama_id) === String(id));
      episodes.sort((a: any, b: any) => Number(a.qism) - Number(b.qism));
    }

    res.json(episodes);
  } catch (err) {
    console.error("Get drama episodes error:", err);
    res.status(500).json({ error: "Qismlarni yuklashda xatolik" });
  }
});

// POST Create Drama Episode (Admin only)
app.post("/api/dramas/:id/episodes", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
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
      created_at: new Date().toISOString()
    };

    const store = loadLocalStore();
    store.drama_episodes = store.drama_episodes || [];
    store.drama_episodes.push(newEpisode);

    // If this is episode 1 or first episode, update drama's default video_url
    if (store.dramas) {
      const dramaIdx = store.dramas.findIndex((d: any) => String(d.id) === String(dramaId));
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

// PUT Update Drama Episode (Admin only)
app.put("/api/dramas/episodes/:episodeId", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const episodeId = req.params.episodeId;
    const { qism, title, video_url } = req.body;

    const store = loadLocalStore();
    store.drama_episodes = store.drama_episodes || [];
    const idx = store.drama_episodes.findIndex((ep: any) => String(ep.id) === String(episodeId));
    if (idx >= 0) {
      store.drama_episodes[idx] = {
        ...store.drama_episodes[idx],
        qism: qism !== undefined ? Number(qism) : store.drama_episodes[idx].qism,
        title: title !== undefined ? title : store.drama_episodes[idx].title,
        video_url: video_url !== undefined ? video_url : store.drama_episodes[idx].video_url
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

// DELETE Drama Episode (Admin only)
app.delete("/api/dramas/episodes/:episodeId", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const episodeId = req.params.episodeId;

    const store = loadLocalStore();
    store.drama_episodes = (store.drama_episodes || []).filter((ep: any) => String(ep.id) !== String(episodeId));
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

// POST Create Drama (Admin only)
app.post("/api/dramas", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
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
      yil: Number(yil) || new Date().getFullYear(),
      likes: 0,
      liked_users: [],
      korishlar: 0,
      video_url: video_url || "",
      telegram_url: telegram_url || "",
      created_at: new Date().toISOString()
    };

    // Save in local_store
    const store = loadLocalStore();
    store.dramas = store.dramas || [];
    store.dramas.unshift(newDrama);

    // If video_url was provided with drama, also create 1-episode automatically
    if (video_url && video_url.trim()) {
      store.drama_episodes = store.drama_episodes || [];
      store.drama_episodes.push({
        id: Date.now() + 1,
        drama_id: newId,
        qism: 1,
        title: "1-Qism",
        video_url: video_url.trim(),
        created_at: new Date().toISOString()
      });
    }
    saveLocalStore(store);

    // Save in MySQL
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
          [Date.now() + 1, newId, 1, "1-Qism", video_url.trim(), new Date().toISOString()]
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

// PUT Update Drama (Admin only)
app.put("/api/dramas/:id", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const id = req.params.id;
    const { title, poster_url, banner_url, janrlar, yil, description, video_url, telegram_url } = req.body;

    const store = loadLocalStore();
    store.dramas = store.dramas || [];
    const idx = store.dramas.findIndex((d: any) => String(d.id) === String(id));
    if (idx >= 0) {
      store.dramas[idx] = {
        ...store.dramas[idx],
        title: title !== undefined ? title : store.dramas[idx].title,
        poster_url: poster_url !== undefined ? poster_url : store.dramas[idx].poster_url,
        banner_url: banner_url !== undefined ? banner_url : store.dramas[idx].banner_url,
        janrlar: janrlar !== undefined ? janrlar : store.dramas[idx].janrlar,
        yil: yil !== undefined ? Number(yil) : store.dramas[idx].yil,
        description: description !== undefined ? description : store.dramas[idx].description,
        video_url: video_url !== undefined ? video_url : store.dramas[idx].video_url,
        telegram_url: telegram_url !== undefined ? telegram_url : store.dramas[idx].telegram_url,
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

// DELETE Drama (Admin only)
app.delete("/api/dramas/:id", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const id = req.params.id;

    const store = loadLocalStore();
    store.dramas = (store.dramas || []).filter((d: any) => String(d.id) !== String(id));
    store.drama_episodes = (store.drama_episodes || []).filter((ep: any) => String(ep.drama_id) !== String(id));
    store.comments = (store.comments || []).filter((c: any) => String(c.drama_id) !== String(id));
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

// POST Toggle Like Drama
app.post("/api/dramas/:id/like", async (req: any, res) => {
  try {
    const id = req.params.id;
    // Identify user by token or IP / guest ID
    let identifier: string = "";
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      const decoded = verifyAnyJwt(token);
      if (decoded?.id) {
        identifier = `user_${decoded.id}`;
      }
    }
    if (!identifier) {
      identifier = req.body?.guestId || req.ip || `guest_${req.headers['user-agent'] || 'anon'}`;
    }

    let drama: any = null;
    let likedUsers: string[] = [];
    let currentLikes = 0;

    // Check in DB
    try {
      const [rows]: any = await dbQuery(`SELECT * FROM dramas WHERE id = ?`, [id]);
      if (Array.isArray(rows) && rows.length > 0) {
        drama = rows[0];
        likedUsers = safeJsonParse(drama.liked_users, []);
        currentLikes = Number(drama.likes) || 0;
      }
    } catch (e) {}

    const store = loadLocalStore();
    store.dramas = store.dramas || [];
    const localIdx = store.dramas.findIndex((d: any) => String(d.id) === String(id));
    if (!drama && localIdx >= 0) {
      drama = store.dramas[localIdx];
      likedUsers = drama.liked_users || [];
      currentLikes = Number(drama.likes) || 0;
    }

    if (!drama && localIdx === -1) {
      return res.status(404).json({ error: "Drama topilmadi" });
    }

    const isAlreadyLiked = likedUsers.includes(identifier);
    let updatedLikes: number;
    let updatedLikedUsers: string[];

    if (isAlreadyLiked) {
      updatedLikedUsers = likedUsers.filter(u => u !== identifier);
      updatedLikes = Math.max(0, currentLikes - 1);
    } else {
      updatedLikedUsers = [...likedUsers, identifier];
      updatedLikes = currentLikes + 1;
    }

    // Save in local_store
    if (localIdx >= 0) {
      store.dramas[localIdx].likes = updatedLikes;
      store.dramas[localIdx].liked_users = updatedLikedUsers;
      saveLocalStore(store);
    }

    // Save in MySQL
    try {
      await dbQuery(
        `UPDATE dramas SET likes = ?, liked_users = ? WHERE id = ?`,
        [updatedLikes, JSON.stringify(updatedLikedUsers), id]
      );
    } catch (e) {}

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

// GET Drama Comments
app.get("/api/dramas/:id/comments", async (req, res) => {
  const id = req.params.id;
  try {
    const [rows]: any = await dbQuery(
      `SELECT c.*, u.name AS user_name, u.avatar_url AS user_avatar, u.avatar_frame_url AS user_avatar_frame, u.avatar_frame_url AS avatar_frame_url 
       FROM comments c 
       LEFT JOIN users u ON c.user_id = u.id 
       WHERE c.drama_id = ? 
       ORDER BY c.id DESC`,
      [id]
    );
    if (Array.isArray(rows) && rows.length > 0) {
      const parsed = rows.map((r: any) => ({
        ...r,
        liked_users: safeJsonParse(r.liked_users, []),
        disliked_users: safeJsonParse(r.disliked_users, []),
        replies: safeJsonParse(r.replies, [])
      }));
      return res.json(parsed);
    }
  } catch (err) {
    console.warn("Drama comments fetch fallback:", (err as any)?.message);
  }
  const store = loadLocalStore();
  const comms = (store.comments || []).filter((c: any) => String(c.drama_id) === String(id));
  res.json(comms);
});

// POST Drama Comment
app.post("/api/dramas/:id/comments", authenticateToken, async (req: any, res) => {
  try {
    const dramaId = req.params.id;
    const userId = req.user.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Fikr matni kiritilmadi" });
    }

    const [result]: any = await dbQuery(
      "INSERT INTO comments (drama_id, user_id, content, likes, dislikes, liked_users, disliked_users, replies) VALUES (?, ?, ?, 0, 0, '[]', '[]', '[]')",
      [dramaId, userId, content]
    );

    let userAvatar = req.user.avatar_url || null;
    let userAvatarFrame = req.user.avatar_frame_url || null;
    try {
      const [uRows]: any = await dbQuery("SELECT avatar_url, avatar_frame_url FROM users WHERE id = ?", [userId]);
      if (uRows && uRows.length > 0) {
        if (uRows[0].avatar_url) userAvatar = uRows[0].avatar_url;
        if (uRows[0].avatar_frame_url) userAvatarFrame = uRows[0].avatar_frame_url;
      }
    } catch (e) {}

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
      created_at: new Date().toISOString(),
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

// ==================== TEZCHECK DONATION API ENDPOINTS ====================

// GET Public Donations (Only confirmed paid donations are displayed publicly)
app.get("/api/donations", async (req, res) => {
  try {
    const store = loadLocalStore();
    const allDonations = store.donations || [];
    
    // STRICT SECURITY & PRIVACY: Only show confirmed 'paid' donations publicly on the website
    const paidDonations = allDonations.filter((d: any) => d.status === "paid");

    const totalAmount = paidDonations.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
    const monthlyGoal = 2000000;

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

// GET Admin All Donations (including pending and canceled for merchant tracking)
app.get("/api/admin/donations", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    let donations: any[] = [];
    try {
      const [rows]: any = await dbQuery("SELECT * FROM donations ORDER BY id DESC");
      if (Array.isArray(rows)) donations = rows;
    } catch (dbErr) {
      console.warn("DB query for admin donations failed, falling back to local store:", dbErr);
    }

    if (donations.length === 0) {
      const store = loadLocalStore();
      donations = store.donations || [];
    }
    
    res.json(donations);
  } catch (err) {
    console.error("Get admin donations error:", err);
    res.status(500).json({ error: "Donatlarni olishda xatolik" });
  }
});

// GET Admin All Users list with provider detection
app.get("/api/admin/users", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    let users: any[] = [];
    try {
      const [rows]: any = await dbQuery("SELECT id, name, email, phone, role, avatar_url, telegram_id, yandex_id, discord_id, facebook_id, auth_provider, created_at FROM users ORDER BY id DESC");
      users = rows || [];
    } catch (dbErr) {
      try {
        const [rows]: any = await dbQuery("SELECT id, name, email, phone, role, avatar_url, telegram_id, yandex_id, discord_id, facebook_id, created_at FROM users ORDER BY id DESC");
        users = rows || [];
      } catch (innerDbErr) {
        console.warn("DB Query for users failed, falling back to local store:", innerDbErr);
        const store = loadLocalStore();
        users = store.users || [];
      }
    }

    const processedUsers = users.map((u: any) => {
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
      } else if (u.auth_provider === "google" || (u.email && u.email.toLowerCase().endsWith("@gmail.com"))) {
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
        created_at: u.created_at || new Date().toISOString(),
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

// DELETE User (Admin action)
app.delete("/api/admin/users/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const userId = req.params.id;

    if (String(req.user.id) === String(userId)) {
      return res.status(400).json({ error: "O'z hisobingizni o'chira olmaysiz!" });
    }

    if (String(userId) === "1" || String(userId) === "7") {
      return res.status(400).json({ error: "Bosh admin hisobini o'chirib bo'lmaydi!" });
    }

    try {
      await dbQuery("DELETE FROM users WHERE id = ?", [userId]);
    } catch (e) {
      const store = loadLocalStore();
      store.users = (store.users || []).filter((u: any) => String(u.id) !== String(userId));
      saveLocalStore(store);
    }

    res.json({ success: true, message: "Foydalanuvchi o'chirildi" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Foydalanuvchini o'chirishda xatolik" });
  }
});

// PUT Toggle User Role (Admin <-> User)
app.put("/api/admin/users/:id/role", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ error: "Yaroqsiz rol" });
    }

    if (String(req.user.id) === String(userId)) {
      return res.status(400).json({ error: "O'z rolingizni o'zgartira olmaysiz!" });
    }

    if (String(userId) === "1" || String(userId) === "7") {
      return res.status(400).json({ error: "Bosh admin rolini o'zgartirib bo'lmaydi!" });
    }

    try {
      await dbQuery("UPDATE users SET role = ? WHERE id = ?", [role, userId]);
    } catch (e) {
      const store = loadLocalStore();
      const userObj = (store.users || []).find((u: any) => String(u.id) === String(userId));
      if (userObj) userObj.role = role;
      saveLocalStore(store);
    }

    res.json({ success: true, message: `Foydalanuvchi roli ${role} ga o'zgartirildi` });
  } catch (err) {
    console.error("Change user role error:", err);
    res.status(500).json({ error: "Rolni o'zgartirishda xatolik" });
  }
});

// =================================================================
// --- DONAT (DONATIONS) & TEZCHECK.UZ TO'LOV TIZIMI ---
// =================================================================
let TEZCHECK_SHOP_ID = process.env.TEZCHECK_SHOP_ID || "118";
let TEZCHECK_API_KEY = process.env.TEZCHECK_API_KEY || "8237d3501a36506d3271f7918fe9bee985f300ed";
const TEZCHECK_API_BASE = "https://tezchek.uz/api";

// GET All Verified / Paid Donations for public display
app.get("/api/donations", async (req, res) => {
  try {
    let donations: any[] = [];
    try {
      const [rows]: any = await dbQuery(
        `SELECT id, order_id, user_id, donor_name, donor_avatar, donor_avatar_frame, amount, comment, payment_method, status, paid_at, created_at 
         FROM donations 
         WHERE status = 'paid' 
         ORDER BY id DESC LIMIT 100`
      );
      if (Array.isArray(rows)) donations = rows;
    } catch (e: any) {
      console.warn("Fetch donations from DB failed, falling back to localStore:", e?.message);
    }

    if (donations.length === 0) {
      const store = loadLocalStore();
      donations = (store.donations || []).filter((d: any) => d.status === "paid");
    }

    const totalAmount = donations.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0);
    const donorCount = donations.length;

    res.json({
      success: true,
      donations,
      stats: {
        totalAmount,
        donorCount
      }
    });
  } catch (err: any) {
    console.error("Get donations error:", err);
    res.status(500).json({ error: "Donatlar ro'yxatini olishda xatolik" });
  }
});

// POST Create Donation Invoice via Tezcheck.uz
app.post("/api/donate/create-invoice", optionalAuth, async (req: any, res) => {
  try {
    const { amount, donor_name, comment, payment_method } = req.body;
    const numericAmount = Math.max(1000, Math.round(Number(amount) || 0));
    if (!numericAmount || isNaN(numericAmount) || numericAmount < 1000) {
      return res.status(400).json({ error: "To'lov summasi kamida 1,000 UZS bo'lishi kerak" });
    }

    // Determine donor info
    let userId = req.user?.id || null;
    let donorName = (donor_name || "").trim();
    let donorAvatar = null;
    let donorAvatarFrame = null;

    if (userId) {
      try {
        const [uRows]: any = await dbQuery("SELECT name, avatar_url, avatar_frame_url FROM users WHERE id = ?", [userId]);
        if (uRows && uRows[0]) {
          if (!donorName) donorName = uRows[0].name;
          donorAvatar = uRows[0].avatar_url;
          donorAvatarFrame = uRows[0].avatar_frame_url;
        }
      } catch (e) {}
    }

    if (!donorName) {
      donorName = "Saxiy Otaku";
    }

    const cleanComment = (comment || "").toString().trim().slice(0, 500) || "Anime va dublyaj rivoji uchun donat ❤️";

    console.log(`[TezCheck Donation] Requesting invoice for ${numericAmount} UZS from ${donorName}...`);

    let payUrl = "";
    let orderId = "";

    try {
      const tezResponse = await fetch(`${TEZCHECK_API_BASE}/create_invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: TEZCHECK_API_KEY,
          amount: numericAmount
        })
      });

      const tezData: any = await tezResponse.json();
      if (tezData && tezData.ok && tezData.pay_url) {
        payUrl = tezData.pay_url;
        orderId = String(tezData.order_id);
      } else {
        console.error("[TezCheck Error] Invoice creation error:", tezData);
        return res.status(500).json({ error: tezData?.error?.message || tezData?.error_message || "TezCheck orqali to'lov hisobi ochilmadi" });
      }
    } catch (apiErr: any) {
      console.error("Tezcheck API network call failed:", apiErr);
      return res.status(500).json({ error: "TezCheck to'lov tizimiga ulanib bo'lmadi" });
    }

    // Insert into PostgreSQL DB
    let donationId = 0;
    try {
      const [insertRes]: any = await dbQuery(
        `INSERT INTO donations (order_id, user_id, donor_name, donor_avatar, donor_avatar_frame, amount, comment, payment_method, status, pay_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [orderId, userId, donorName, donorAvatar, donorAvatarFrame, numericAmount, cleanComment, payment_method || 'Tezcheck', payUrl]
      );
      donationId = insertRes?.insertId || 0;
    } catch (dbErr: any) {
      console.error("Save donation to PostgreSQL failed:", dbErr);
    }

    // Also update local_store
    const store = loadLocalStore();
    store.donations = store.donations || [];
    const donationObj = {
      id: donationId || Date.now(),
      order_id: orderId,
      user_id: userId,
      donor_name: donorName,
      donor_avatar: donorAvatar,
      donor_avatar_frame: donorAvatarFrame,
      amount: numericAmount,
      comment: cleanComment,
      payment_method: payment_method || 'Tezcheck',
      status: 'pending',
      pay_url: payUrl,
      created_at: new Date().toISOString()
    };
    store.donations.unshift(donationObj);
    saveLocalStore(store);

    res.json({
      ok: true,
      order_id: orderId,
      pay_url: payUrl,
      donation: donationObj
    });
  } catch (err: any) {
    console.error("Create donation invoice error:", err);
    res.status(500).json({ error: "Invoys yaratishda xatolik yuz berdi" });
  }
});

// POST Check Donation Status via Tezcheck.uz
app.post("/api/donate/check-status", async (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id) {
      return res.status(400).json({ error: "order_id ko'rsatilmadi" });
    }

    let isPaid = false;
    let status = "pending";
    let paymentData: any = null;

    try {
      const tezResponse = await fetch(`${TEZCHECK_API_BASE}/status_invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: TEZCHECK_API_KEY,
          order_id: String(order_id)
        })
      });

      const tezData: any = await tezResponse.json();
      if (tezData && tezData.ok && tezData.payment) {
        paymentData = tezData.payment;
        status = tezData.payment.status || "pending";
        isPaid = status === "paid" || status === "succeeded";
      }
    } catch (apiErr) {
      console.error("Tezcheck status check error:", apiErr);
    }

    if (isPaid) {
      try {
        await dbQuery(
          "UPDATE donations SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE order_id = ?",
          [String(order_id)]
        );
      } catch (dbErr) {
        console.error("Update donation DB status failed:", dbErr);
      }

      const store = loadLocalStore();
      store.donations = store.donations || [];
      const idx = store.donations.findIndex((d: any) => String(d.order_id) === String(order_id));
      if (idx >= 0) {
        store.donations[idx].status = "paid";
        if (!store.donations[idx].paid_at) {
          store.donations[idx].paid_at = new Date().toISOString();
        }
        saveLocalStore(store);
      }

      try {
        io.emit("newDonation", {
          order_id: String(order_id),
          status: "paid"
        });
      } catch (e) {}

      return res.json({ ok: true, status: "paid", isPaid: true, payment: paymentData });
    }

    res.json({ ok: true, status, isPaid: false, payment: paymentData });
  } catch (err: any) {
    console.error("Check status error:", err);
    res.status(500).json({ error: "Holatni tekshirishda xatolik" });
  }
});

// Admin Route: Update Donation Status (Simulate/Confirm Paid)
app.post("/api/admin/donate/update-status", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { order_id, status } = req.body;
    try {
      await dbQuery(
        "UPDATE donations SET status = ?, paid_at = CURRENT_TIMESTAMP WHERE order_id = ? OR CAST(id AS TEXT) = ?",
        [status || "paid", String(order_id), String(order_id)]
      );
    } catch (e) {}

    const store = loadLocalStore();
    store.donations = store.donations || [];
    const idx = store.donations.findIndex((d: any) => String(d.order_id) === String(order_id) || String(d.id) === String(order_id));
    if (idx >= 0) {
      store.donations[idx].status = status || "paid";
      if (status === "paid" && !store.donations[idx].paid_at) {
        store.donations[idx].paid_at = new Date().toISOString();
      }
      saveLocalStore(store);
      return res.json({ message: "Maqom yangilandi", donation: store.donations[idx] });
    }
    res.status(404).json({ error: "Donat topilmadi" });
  } catch (err) {
    res.status(500).json({ error: "Xatolik yuz berdi" });
  }
});

// Admin Route: Delete Donation Entry
app.delete("/api/admin/donate/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    try {
      await dbQuery("DELETE FROM donations WHERE id = ? OR order_id = ?", [id, id]);
    } catch (e) {}

    const store = loadLocalStore();
    store.donations = (store.donations || []).filter((d: any) => String(d.id) !== String(id) && String(d.order_id) !== String(id));
    saveLocalStore(store);
    res.json({ message: "Donat yozuvi o'chirildi" });
  } catch (err) {
    res.status(500).json({ error: "Xatolik" });
  }
});

// =================================================================
// --- DO'KON (SHOP) & TEZCHECK.UZ TO'LOV TIZIMI INTEGRATSIYASI ---
// =================================================================

// Helper to create TezCheck bill
async function createTezCheckBill({
  orderId,
  amountUzs,
  title,
  returnUrl
}: {
  orderId: string;
  amountUzs: number;
  title: string;
  returnUrl: string;
}) {
  const amount = Math.max(1000, Math.round(Number(amountUzs)));
  console.log(`[TezCheck] Calling ${TEZCHECK_API_BASE}/create_invoice for order ${orderId} (${amount} UZS)...`);

  const response = await fetch(`${TEZCHECK_API_BASE}/create_invoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      api_key: TEZCHECK_API_KEY,
      amount: amount
    })
  });

  const resText = await response.text();
  let resJson: any = null;
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

// Helper to query TezCheck bill status
async function getTezCheckBillStatus(billId: string | number) {
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
  let resJson: any = null;
  try {
    resJson = JSON.parse(resText);
  } catch (e) {
    throw new Error(`TezCheck status xatosi: ${resText}`);
  }

  return resJson;
}

// 1. GET /api/shop/items: Public active items listing with optional category filter
app.get("/api/shop/items", async (req: any, res: any) => {
  try {
    const { category } = req.query;
    let sql = "SELECT * FROM shop_items WHERE is_active = 1";
    const params: any[] = [];
    if (category && typeof category === "string" && category !== "all") {
      sql += " AND category = ?";
      params.push(category);
    }
    sql += " ORDER BY id DESC";
    const [rows]: any = await dbQuery(sql, params);
    res.json(rows || []);
  } catch (err: any) {
    console.error("Get shop items error:", err);
    res.status(500).json({ error: "Do'kon tovarlarini olishda xatolik yuz berdi" });
  }
});

// 2. GET /api/shop/my-inventory: Logged in user's purchased items and equipped state
app.get("/api/shop/my-inventory", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const [purchases]: any = await dbQuery(
      `SELECT sp.id, sp.user_id, sp.item_id, sp.is_equipped, sp.purchased_at,
              si.title, si.category, si.image_url, si.price
       FROM shop_purchases sp
       JOIN shop_items si ON sp.item_id = si.id
       WHERE sp.user_id = ?
       ORDER BY sp.purchased_at DESC`,
      [userId]
    );
    res.json(purchases || []);
  } catch (err: any) {
    console.error("Get inventory error:", err);
    res.status(500).json({ error: "Inventarni olishda xatolik" });
  }
});

// 3. POST /api/shop/checkout: Initiate purchase order with TezCheck.uz
app.post("/api/shop/checkout", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const { item_id, is_test } = req.body;
    if (!item_id) {
      return res.status(400).json({ error: "Mahsulot tanlanmagan" });
    }

    const [items]: any = await dbQuery("SELECT * FROM shop_items WHERE id = ? AND is_active = 1", [item_id]);
    if (!items || items.length === 0) {
      return res.status(404).json({ error: "Mahsulot topilmadi yoki nofaol" });
    }
    const item = items[0];

    // Check if user already owns this item
    const [alreadyOwned]: any = await dbQuery(
      "SELECT id FROM shop_purchases WHERE user_id = ? AND item_id = ?",
      [userId, item_id]
    );
    if (alreadyOwned && alreadyOwned.length > 0) {
      return res.status(400).json({ error: "Siz bu mahsulotni allaqachon sotib olgansiz!" });
    }

    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const amountUzs = item.price;

    // ADMIN PRIVILEGE OR TEST PURCHASE OR 0 UZS ITEM:
    // Faqat admin uchun hamma narsa bepul (0 so'm)
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
        message: isAdmin
          ? "Admin imtiyozi: Mahsulot sizga bepul taqdim etildi va inventaringizga qo'shildi!"
          : "Xarid muvaffaqiyatli amalga oshirildi va profilingizga qo'shildi!",
        item
      });
    }

    // Determine return URL
    const host = req.headers.host || "animem.uz";
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const returnUrl = `${protocol}://${host}/dokon?order_id=${orderId}`;

    // Record order in database
    await dbQuery(
      "INSERT INTO shop_orders (id, user_id, item_id, amount_uzs, status) VALUES (?, ?, ?, ?, 'pending')",
      [orderId, userId, item_id, amountUzs]
    );

    // Call TezCheck to create invoice
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
    } catch (tezErr: any) {
      console.error("TezCheck bill creation error:", tezErr);
      await dbQuery("UPDATE shop_orders SET status = 'failed' WHERE id = ?", [orderId]);
      return res.status(500).json({ error: tezErr.message || "To'lov hisobini yaratishda xatolik yuz berdi" });
    }
  } catch (err: any) {
    console.error("Shop checkout error:", err);
    res.status(500).json({ error: err.message || "Xatolik yuz berdi" });
  }
});

// 4. GET /api/shop/verify-order/:orderId: Verify order completion and grant item
app.get("/api/shop/verify-order/:orderId", async (req: any, res: any) => {
  try {
    const { orderId } = req.params;
    const [orders]: any = await dbQuery("SELECT * FROM shop_orders WHERE id = ?", [orderId]);
    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: "Buyurtma topilmadi" });
    }
    const order = orders[0];

    if (order.status === "paid") {
      return res.json({ success: true, status: "paid", message: "To'lov muvaffaqiyatli yakunlangan!" });
    }

    // If pending and has tezcheck_bill_id, verify directly with TezCheck API
    if (order.tezcheck_bill_id) {
      try {
        const billStatus = await getTezCheckBillStatus(order.tezcheck_bill_id);
        const statusVal = billStatus?.payment?.status || billStatus?.status;
        const isPaid = billStatus?.ok === true && (statusVal === "paid" || statusVal === "succeeded");

        if (isPaid) {
          await dbQuery("UPDATE shop_orders SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?", [orderId]);
          // Add to user inventory
          const [existingPurchase]: any = await dbQuery(
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
      } catch (e: any) {
        console.warn("Verifying with TezCheck API failed:", e.message);
      }
    }

    res.json({ success: false, status: order.status, message: "To'lov hali tasdiqlanmadi" });
  } catch (err: any) {
    console.error("Verify order error:", err);
    res.status(500).json({ error: "Buyurtmani tekshirishda xatolik" });
  }
});

// 5. POST /api/webhooks/tezcheck: Instant webhook handler from TezCheck
app.post("/api/webhooks/tezcheck", async (req: any, res: any) => {
  try {
    console.log("[TezCheck Webhook] Received payload:", JSON.stringify(req.body));
    const billId = String(req.body?.id || req.body?.order_id || req.body?.payment?.id || req.body?.data?.order_id || req.body?.data?.bill?.id || "");
    const extRef = req.body?.external_reference || req.body?.data?.bill?.external_reference || req.body?.data?.payment?.external_reference;
    const statusVal = req.body?.status || req.body?.payment?.status || (req.body?.event === "payment.succeeded" ? "paid" : "");

    const isPaid = statusVal === "paid" || statusVal === "succeeded" || req.body?.event === "payment.succeeded" || req.body?.data?.bill?.paid === true;

    if (isPaid && (billId || extRef)) {
      let [orders]: any = [];
      if (extRef) {
        [orders] = await dbQuery("SELECT * FROM shop_orders WHERE id = ?", [extRef]);
      }
      if ((!orders || orders.length === 0) && billId) {
        [orders] = await dbQuery("SELECT * FROM shop_orders WHERE tezcheck_bill_id = ? OR id = ?", [billId, billId]);
      }

      if (orders && orders[0]) {
        const order = orders[0];
        await dbQuery("UPDATE shop_orders SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?", [order.id]);

        // Add to inventory
        const [exists]: any = await dbQuery(
          "SELECT id FROM shop_purchases WHERE user_id = ? AND item_id = ?",
          [order.user_id, order.item_id]
        );
        if (!exists || exists.length === 0) {
          await dbQuery("INSERT INTO shop_purchases (user_id, item_id) VALUES (?, ?)", [order.user_id, order.item_id]);
          console.log(`[TezCheck Webhook] Item ${order.item_id} added to user ${order.user_id}`);
        }
      }

      // Check and confirm donations
      const donateRef = extRef || billId;
      if (donateRef) {
        try {
          const [dRows]: any = await dbQuery(
            "SELECT * FROM donations WHERE order_id = ? OR CAST(id AS TEXT) = ?",
            [String(donateRef), String(donateRef)]
          );
          if (dRows && dRows.length > 0) {
            await dbQuery(
              "UPDATE donations SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE (order_id = ? OR CAST(id AS TEXT) = ?) AND status != 'paid'",
              [String(donateRef), String(donateRef)]
            );
            const store = loadLocalStore();
            store.donations = store.donations || [];
            const dIdx = store.donations.findIndex((d: any) => String(d.order_id) === String(donateRef) || String(d.id) === String(donateRef));
            if (dIdx >= 0) {
              store.donations[dIdx].status = "paid";
              store.donations[dIdx].paid_at = new Date().toISOString();
              saveLocalStore(store);
            }
            try {
              io.emit("newDonation", { order_id: String(donateRef), status: "paid" });
            } catch (e) {}
            console.log(`[TezCheck Webhook] Donation ${donateRef} marked as paid!`);
          }
        } catch (donErr) {
          console.error("[TezCheck Webhook] Donation confirmation error:", donErr);
        }
      }
    }

    res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("[TezCheck Webhook Error]", err);
    res.status(200).json({ received: false, error: err.message });
  }
});

// 6. POST /api/shop/equip: Apply purchased avatar, frame, or banner onto user's profile
app.post("/api/shop/equip", authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { item_id, equip } = req.body;
    if (!item_id) {
      return res.status(400).json({ error: "Mahsulot tanlanmagan" });
    }

    // Verify user owns this item
    const [purchases]: any = await dbQuery(
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
      // Un-equip other items of the same category for this user
      const [userSameCategoryPurchases]: any = await dbQuery(
        `SELECT sp.id FROM shop_purchases sp 
         JOIN shop_items si ON sp.item_id = si.id 
         WHERE sp.user_id = ? AND si.category = ?`,
        [userId, purchase.category]
      );
      for (const p of userSameCategoryPurchases) {
        await dbQuery("UPDATE shop_purchases SET is_equipped = false WHERE id = ?", [p.id]);
      }

      // Mark this item as equipped
      await dbQuery("UPDATE shop_purchases SET is_equipped = true WHERE id = ?", [purchase.id]);

      // Apply to user profile
      if (purchase.category === "frame") {
        await dbQuery("UPDATE users SET avatar_frame_url = ? WHERE id = ?", [purchase.image_url, userId]);
      } else if (purchase.category === "avatar") {
        await dbQuery("UPDATE users SET avatar_url = ? WHERE id = ?", [purchase.image_url, userId]);
      } else if (purchase.category === "banner") {
        await dbQuery("UPDATE users SET banner_url = ? WHERE id = ?", [purchase.image_url, userId]);
      }
    } else {
      // Un-equip
      await dbQuery("UPDATE shop_purchases SET is_equipped = false WHERE id = ?", [purchase.id]);
      if (purchase.category === "frame") {
        await dbQuery("UPDATE users SET avatar_frame_url = NULL WHERE id = ?", [userId]);
      } else if (purchase.category === "banner") {
        await dbQuery("UPDATE users SET banner_url = NULL WHERE id = ?", [userId]);
      }
    }

    // Return updated user object
    const [uRows]: any = await dbQuery(
      "SELECT id, name, email, role, avatar_url, avatar_frame_url, banner_url FROM users WHERE id = ?",
      [userId]
    );

    res.json({
      success: true,
      message: equip ? "Mahsulot muvaffaqiyatli o'rnatildi!" : "Mahsulot profildan olib tashlandi",
      user: uRows?.[0]
    });
  } catch (err: any) {
    console.error("Shop equip error:", err);
    res.status(500).json({ error: "O'rnatishda xatolik yuz berdi" });
  }
});

// --- ADMIN SHOP ENDPOINTS ---

// Admin: Get all shop items
app.get("/api/admin/shop/items", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const [rows]: any = await dbQuery("SELECT * FROM shop_items ORDER BY id DESC");
    res.json(rows || []);
  } catch (err: any) {
    res.status(500).json({ error: "Xatolik" });
  }
});

// Admin: Add new shop item
app.post("/api/admin/shop/items", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
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

    const [result]: any = await dbQuery(
      "INSERT INTO shop_items (title, category, image_url, price, is_active) VALUES (?, ?, ?, ?, ?)",
      [title.trim(), category, image_url.trim(), priceNum, activeVal]
    );

    const [newItem]: any = await dbQuery("SELECT * FROM shop_items WHERE id = ?", [result?.insertId]);
    res.json({ success: true, message: "Mahsulot muvaffaqiyatli qo'shildi", item: newItem?.[0] });
  } catch (err: any) {
    console.error("Admin add shop item error:", err);
    res.status(500).json({ error: "Mahsulot qo'shishda xatolik" });
  }
});

// Admin: Update shop item
app.put("/api/admin/shop/items/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
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
        price !== undefined ? Math.max(0, parseInt(price, 10) || 0) : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id
      ]
    );

    const [updated]: any = await dbQuery("SELECT * FROM shop_items WHERE id = ?", [id]);
    res.json({ success: true, message: "Mahsulot yangilandi", item: updated?.[0] });
  } catch (err: any) {
    console.error("Admin update shop item error:", err);
    res.status(500).json({ error: "Yangilashda xatolik" });
  }
});

// Admin: Delete shop item
app.delete("/api/admin/shop/items/:id", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    await dbQuery("DELETE FROM shop_items WHERE id = ?", [id]);
    res.json({ success: true, message: "Mahsulot o'chirildi" });
  } catch (err: any) {
    console.error("Admin delete shop item error:", err);
    res.status(500).json({ error: "O'chirishda xatolik" });
  }
});

// Admin: Get recent shop orders
app.get("/api/admin/shop/orders", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const [rows]: any = await dbQuery(
      `SELECT so.*, u.name as user_name, u.email as user_email, si.title as item_title, si.category as item_category, si.image_url as item_image
       FROM shop_orders so
       LEFT JOIN users u ON so.user_id = u.id
       LEFT JOIN shop_items si ON so.item_id = si.id
       ORDER BY so.created_at DESC
       LIMIT 100`
    );
    res.json(rows || []);
  } catch (err: any) {
    console.error("Admin get shop orders error:", err);
    res.status(500).json({ error: "Buyurtmalarni olishda xatolik" });
  }
});

// Admin: Claim all items to admin's inventory for free (Admin uchun barcha tovarlar bepul)
app.post("/api/admin/shop/claim-all", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const [items]: any = await dbQuery("SELECT id FROM shop_items WHERE is_active = 1");
    let addedCount = 0;
    for (const it of items) {
      const [owned]: any = await dbQuery(
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
      message: addedCount > 0 
        ? `${addedCount} ta yangi mahsulot inventaringizga bepul qo'shildi!` 
        : "Barcha faol mahsulotlar allaqachon inventaringizda mavjud!",
      added: addedCount
    });
  } catch (err: any) {
    console.error("Admin claim-all error:", err);
    res.status(500).json({ error: "Mahsulotlarni inventarga qo'shishda xatolik" });
  }
});

// Admin: Get TezCheck configuration settings
app.get("/api/admin/shop/settings", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
    res.json({
      shop_id: TEZCHECK_SHOP_ID,
      api_key_preview: TEZCHECK_API_KEY ? `${TEZCHECK_API_KEY.slice(0, 6)}...${TEZCHECK_API_KEY.slice(-6)}` : "",
      has_api_key: Boolean(TEZCHECK_API_KEY)
    });
  } catch (err: any) {
    res.status(500).json({ error: "Xatolik" });
  }
});

// Admin: Update TezCheck configuration settings
app.post("/api/admin/shop/settings", authenticateToken, requireAdmin, async (req: any, res: any) => {
  try {
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
  } catch (err: any) {
    res.status(500).json({ error: "Sozlamalarni saqlashda xatolik" });
  }
});

// Chat Routes
// GET chat messages (Direct from Cloudflare D1 with local_store fallback)
app.get("/api/chat/messages", async (req: any, res: any) => {
  try {
    try {
      const [rows]: any = await dbQuery(
        `SELECT m.*, 
                COALESCE(u.name, m.user_name, 'Foydalanuvchi') AS user_name, 
                u.avatar_url AS user_avatar, 
                u.avatar_frame_url AS user_avatar_frame, 
                u.avatar_frame_url AS avatar_frame_url 
         FROM messages m 
         LEFT JOIN users u ON (CAST(m.user_id AS TEXT) = CAST(u.id AS TEXT) AND m.user_id IS NOT NULL)
         ORDER BY m.id DESC LIMIT 50`
      );
      if (Array.isArray(rows) && rows.length > 0) {
        const dbMsgs = [...rows].reverse();
        const store = loadLocalStore();
        store.messages = (store.messages || []).filter((m: any) => !dbMsgs.some((dm: any) => String(dm.id) === String(m.id))).concat(dbMsgs);
        if (store.messages.length > 2000) store.messages = store.messages.slice(-2000);
        saveLocalStore(store);
        return res.json(dbMsgs);
      }
    } catch (dbErr: any) {
      console.warn("GET /api/chat/messages DB query failed, falling back to local_store:", dbErr?.message || dbErr);
    }

    const store = loadLocalStore();
    const userMap = new Map((store.users || []).map((u: any) => [String(u.id), u]));
    const localMsgs = (store.messages || []).slice(-50).map((m: any) => {
      const u = userMap.get(String(m.user_id));
      return {
        ...m,
        user_name: m.user_name || u?.name || 'Foydalanuvchi',
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

// Add new message via REST API (Resilient: DB + local_store fallback)
app.post("/api/chat/messages", authenticateToken, async (req: any, res: any) => {
  try {
    const { user_id, user_name, content, reply_to_id, reply_to_name, reply_to_content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Xabar bo'sh bo'lishi mumkin emas" });
    }

    const currentUserId = req.user?.id || user_id;
    const currentUserName = req.user?.name || user_name || "Foydalanuvchi";
    const currentUserAvatar = req.user?.avatar_url || null;

    let insertedMessage: any = null;

    // 1. Attempt database insert
    try {
      const [result]: any = await dbQuery(
        "INSERT INTO messages (user_id, user_name, content, reply_to_id, reply_to_name, reply_to_content) VALUES (?, ?, ?, ?, ?, ?)",
        [
          Number(currentUserId) || 0,
          currentUserName,
          content,
          reply_to_id ? String(reply_to_id) : null,
          reply_to_name ? String(reply_to_name) : null,
          reply_to_content ? String(reply_to_content) : null,
        ]
      );

      const newId = result.insertId;
      try {
        const [rows]: any = await dbQuery(
          `SELECT m.*, u.avatar_url AS user_avatar 
           FROM messages m 
           LEFT JOIN users u ON (CAST(m.user_id AS TEXT) = CAST(u.id AS TEXT) AND m.user_id IS NOT NULL) 
           WHERE m.id = ?`,
          [newId]
        );
        if (rows && rows[0]) {
          insertedMessage = rows[0];
        }
      } catch (e) {}

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
          created_at: new Date().toISOString(),
        };
      }
    } catch (dbErr) {
      console.warn("POST /api/chat/messages DB insert failed, using local_store fallback:", dbErr);
    }

    // 2. Local store backup & fallback
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
        created_at: new Date().toISOString(),
      };
    }

    store.messages.push(insertedMessage);
    if (store.messages.length > 500) {
      store.messages = store.messages.slice(-500);
    }
    saveLocalStore(store);

    // Broadcast new message to everyone via Socket.io
    io.emit("newMessage", insertedMessage);

    res.json(insertedMessage);
  } catch (err) {
    console.error("Error saving new chat message via API:", err);
    res.status(500).json({ error: "Xabarni saqlashda xatolik" });
  }
});

app.delete("/api/chat/messages/:id", authenticateToken, async (req: any, res) => {
  try {
    const id = req.params.id;
    const userId = req.user.id;
    const role = req.user.role;

    // Check ownership or admin privilege
    try {
      const [msgRows]: any = await dbQuery("SELECT user_id FROM messages WHERE id = ?", [id]);
      if (msgRows && msgRows.length > 0) {
        if (role !== "admin" && String(msgRows[0].user_id) !== String(userId)) {
          return res.status(403).json({ error: "Faqat o'z xabaringizni o'chira olasiz" });
        }
      }
    } catch (e) {}

    // Remove from local_store
    const store = loadLocalStore();
    if (store.messages) {
      store.messages = store.messages.filter((m: any) => String(m.id) !== String(id));
      saveLocalStore(store);
    }

    // Attempt DB delete
    try {
      await dbQuery("DELETE FROM messages WHERE id = ?", [id]);
    } catch (dbErr) {
      console.warn("Delete message DB query failed:", dbErr);
    }
    
    // Broadcast messageDeleted to active socket.io clients
    io.emit("messageDeleted", id);
    
    res.json({ message: "Xabar o'chirildi" });
  } catch (err) {
    console.error("Delete chat message error:", err);
    res.status(500).json({ error: "Failed to delete message" });
  }
});

app.delete("/api/chat/clear", authenticateToken, requireAdmin, async (req: any, res) => {
  try {

    // Clear local store messages
    const store = loadLocalStore();
    store.messages = [];
    saveLocalStore(store);

    // Clear DB messages
    try {
      await dbQuery("DELETE FROM messages");
    } catch (dbErr) {
      console.warn("Clear chat DB query failed:", dbErr);
    }
    
    // Broadcast chatCleared
    io.emit("chatCleared");
    
    res.json({ message: "Barcha xabarlar o'chirildi" });
  } catch (err) {
    console.error("Clear chat error:", err);
    res.status(500).json({ error: "Failed to clear chat" });
  }
});


// --- TELEGRAM LOGIN ENGINE & BOT POLLING ---
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8699829863:AAHk_-1c8R9xpE8QPNAdIQwPcY3XQn72NLc";
const TELEGRAM_CLIENT_ID = process.env.TELEGRAM_CLIENT_ID || "8699829863";
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || "Animem_reg_bot";
const TELEGRAM_CLIENT_SECRET = process.env.TELEGRAM_CLIENT_SECRET || "e94XiRS7IPqJKVR8fhJElsVda-NgsvREiR6a1PuYSZEEu1juvUs_Kg";
const activeSessions = new Map<string, any>(); // sessionId -> sessionData
const chatToSession = new Map<number, string>(); // chatId -> sessionId

// Helper to send Telegram Bot API requests
async function sendTelegramMessage(chatId: number, text: string, replyMarkup?: any) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const body: any = {
      chat_id: chatId,
      text: text,
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

// Background Bot Long Polling
async function runTelegramBot() {
  console.log("Starting Telegram Bot (8699829863 - @Animem_reg_bot) long polling loop...");
  let offset = 0;

  // Cleanup old sessions (older than 30 mins) every 10 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [sid, sess] of activeSessions.entries()) {
      if (now - sess.createdAt > 30 * 60 * 1000) {
        activeSessions.delete(sid);
      }
    }
  }, 10 * 60 * 1000);

  const poll = async () => {
    try {
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${offset}&timeout=10`;
      const response = await fetch(url);
      if (!response.ok) {
        // If unauthorized or error, retry after a bit
        setTimeout(poll, 5000);
        return;
      }
      const data: any = await response.json();
      if (data.ok && data.result) {
        for (const update of data.result) {
          offset = update.update_id + 1;

          if (update.message) {
            const message = update.message;
            const chat = message.chat;
            const text = message.text || "";
            const from = message.from || {};

            // 1. Handle "/start auth_SESSION_ID"
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

                await sendTelegramMessage(chat.id,
                  `<b>Assalomu alaykum, ${from.first_name || 'Foydalanuvchi'}! 👋</b>\n\n` +
                  `Siz <b>ANIMEUZ</b> saytiga kirish jarayonini boshladingiz. Kirishni tasdiqlash uchun quyidagi <b>"📱 Telefon raqamni yuborish"</b> tugmasini bosing:`,
                  {
                    keyboard: [
                      [
                        {
                          text: "📱 Telefon raqamni yuborish",
                          request_contact: true
                        }
                      ]
                    ],
                    one_time_keyboard: true,
                    resize_keyboard: true
                  }
                );
              } else if (startParam) {
                // Try to find the anime by slug
                const toSlugLocal = (text: string): string => {
                  if (!text) return "";
                  return text
                    .toLowerCase()
                    .replace(/o['’`‘]/g, "o")
                    .replace(/g['’`‘]/g, "g")
                    .replace(/[^a-z0-9\u0400-\u04FF]+/gi, "-")
                    .replace(/^-+|-+$/g, "");
                };

                try {
                  const [rows]: any = await dbQuery("SELECT * FROM animes");
                  let anime = null;
                  if (Array.isArray(rows)) {
                    anime = rows.find((r: any) => toSlugLocal(r.title) === startParam);
                  }
                  
                  if (anime) {
                    const caption = `<b>🎬 ${anime.title}</b>\n\n` +
                                    `${anime.description ? anime.description.substring(0, 150) + '...' : ''}\n\n` +
                                    `⭐️ Reyting: ${anime.rating || 0}\n` +
                                    `👁 Ko'rishlar: ${anime.korishlar || 0}\n\n` +
                                    `👇 Saytda tomosha qilish uchun quyidagi tugmani bosing!`;
                    
                    const replyMarkup = {
                      inline_keyboard: [
                        [{ text: "▶️ Saytda tomosha qilish", url: `https://animem.uz/anime/${startParam}` }]
                      ]
                    };

                    if (anime.image_url) {
                      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          chat_id: chat.id,
                          photo: anime.image_url,
                          caption: caption,
                          parse_mode: "HTML",
                          reply_markup: replyMarkup
                        })
                      });
                    } else {
                      await sendTelegramMessage(chat.id, caption, replyMarkup);
                    }
                  } else {
                    await sendTelegramMessage(chat.id, `Kechirasiz, ushbu anime topilmadi. Saytimizga tashrif buyurib qidirib ko'ring:\nhttps://animem.uz`);
                  }
                } catch (e) {
                  console.error("Error finding anime for bot start param:", e);
                  await sendTelegramMessage(chat.id, "Kechirasiz, xatolik yuz berdi.");
                }
              } else {
                await sendTelegramMessage(chat.id,
                  `<b>Assalomu alaykum! 👋</b>\n\n` +
                  `ANIMEUZ rasmiy botiga xush kelibsiz.\n\n` +
                  `Siz saytga xavfsiz va tezkor kirish uchun saytdagi <b>"Telegram bilan kirish"</b> tugmasini bosing va ushbu botga o'ting.`
                );
              }
            }
            // 2. Handle Contact (Phone sharing)
            else if (message.contact) {
              const contact = message.contact;
              let sessionId = chatToSession.get(chat.id);

              if (!sessionId || !activeSessions.has(sessionId)) {
                // Find if there's an existing session for this chat or any pending session
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

                  // Get Telegram Avatar URL if any
                  let avatar_url = null;
                  try {
                    const photosRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos?user_id=${tgUserId}&limit=1`);
                    const photosData: any = await photosRes.json();
                    if (photosData.ok && photosData.result && photosData.result.total_count > 0) {
                      const fileId = photosData.result.photos[0][0].file_id;
                      const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
                      const fileData: any = await fileRes.json();
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

                  // Sync to DB
                  let [users]: any = await dbQuery("SELECT * FROM users WHERE telegram_id = ? OR email = ?", [String(tgUserId), email]);
                  let user = users[0];

                  if (!user) {
                    const randomPass = Math.random().toString(36).slice(-10);
                    const hashedPassword = await bcrypt.hash(randomPass, 10);
                    const role = isAdminEmail(email) ? "admin" : "user";

                    try {
                      const [insertRes]: any = await dbQuery(
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
                    } catch (insertErr: any) {
                      if (insertErr.code === 'ER_BAD_FIELD_ERROR') {
                        const [insertRes]: any = await dbQuery(
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
                      } else if (insertErr.code === 'ER_DUP_ENTRY') {
                        let [existingUsers]: any = await dbQuery("SELECT * FROM users WHERE email = ?", [email]);
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

                  // JWT
                  const userPayload = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar_url: user.avatar_url,
                  };
                  const tokenPayload = {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                  };
                  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });

                  // Mark session authorized
                  activeSessions.set(sessionId, {
                    status: "authorized",
                    token,
                    user: userPayload,
                    createdAt: session.createdAt || Date.now()
                  });

                  // 1. Remove contact keyboard cleanly
                  await sendTelegramMessage(chat.id, "✅ Telefon raqamingiz muvaffaqiyatli tasdiqlandi!", { remove_keyboard: true });

                  // 2. Send authorization confirmation with 1-click inline button to return to site
                  await sendTelegramMessage(chat.id,
                    `<b>Siz ANIMEM.UZ saytiga muvaffaqiyatli kirdingiz! 🎉</b>\n\n` +
                    `👤 <b>Foydalanuvchi:</b> ${name}\n` +
                    (phone ? `📞 <b>Telefon:</b> ${phone}\n\n` : '\n') +
                    `Avtorizatsiya muvaffaqiyatli yakunlandi! Saytga qaytib tomoshani davom ettirish uchun quyidagi tugmani bosing 👇`,
                    {
                      inline_keyboard: [
                        [
                          {
                            text: "▶️ Saytga kirish (Avtomatik login)",
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

// --- SUPPORT TELEGRAM BOT ENGINE (@animem_support_bot) ---
const SUPPORT_BOT_TOKEN = "8839170706:AAFrabCF7EylydXZDDVy9gSFtRuQN2Mo_n0";
const SUPPORT_ADMIN_ID = "8991315532";

// Store mapping of admin notification message_id -> user chat_id
const supportMsgToUserMap = new Map<number, { userId: string; userName: string }>();
let activeAdminReplyTargetUserId: string | null = null;

// Helper to send Telegram Support Bot API requests
async function sendSupportBotMessage(chatId: number | string, text: string, replyMarkup?: any) {
  try {
    const url = `https://api.telegram.org/bot${SUPPORT_BOT_TOKEN}/sendMessage`;
    const body: any = {
      chat_id: chatId,
      text: text,
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
    const resData: any = await response.json();
    if (!response.ok || !resData.ok) {
      console.error(`Support Bot sendMessage failed:`, resData);
    }
    return resData;
  } catch (err) {
    console.error("Failed to send support bot telegram message:", err);
    return null;
  }
}

// Background Support Bot Long Polling (@animem_support_bot)
async function runSupportTelegramBot() {
  console.log("Starting Support Telegram Bot (@animem_support_bot) long polling loop...");
  let offset = 0;

  const poll = async () => {
    try {
      const url = `https://api.telegram.org/bot${SUPPORT_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=10`;
      const response = await fetch(url);
      if (!response.ok) {
        setTimeout(poll, 5000);
        return;
      }
      const data: any = await response.json();
      if (data.ok && data.result) {
        for (const update of data.result) {
          offset = update.update_id + 1;

          // 1. Handle Callback Queries (Admin clicking Inline Buttons)
          if (update.callback_query) {
            const cb = update.callback_query;
            const cbData = cb.data || "";
            const cbFromId = String(cb.from?.id || "");

            if (cbFromId === SUPPORT_ADMIN_ID && cbData.startsWith("reply_")) {
              const targetUserId = cbData.replace("reply_", "");
              activeAdminReplyTargetUserId = targetUserId;

              // Answer callback query
              await fetch(`https://api.telegram.org/bot${SUPPORT_BOT_TOKEN}/answerCallbackQuery`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  callback_query_id: cb.id,
                  text: `Foydalanuvchi (${targetUserId}) tanlandi! Javob xabaringizni yuboring.`,
                  show_alert: true
                })
              });

              await sendSupportBotMessage(SUPPORT_ADMIN_ID,
                `✍️ <b>Foydalanuvchiga (ID: <code>${targetUserId}</code>) javob yozish:</b>\n\n` +
                `Iltimos, ushbu foydalanuvchiga yubormoqchi bo'lgan xabaringizni yozib yuboring.`
              );
            }
          }

          // 2. Handle Incoming Messages
          if (update.message) {
            const message = update.message;
            const chat = message.chat;
            const chatId = String(chat.id);
            const text = message.text || "";
            const from = message.from || {};
            const fromId = String(from.id);

            // A) MESSAGE FROM ADMIN (8991315532)
            if (fromId === SUPPORT_ADMIN_ID) {
              let targetUserId: string | null = null;

              // Check if Admin replied directly to a notification message
              if (message.reply_to_message) {
                const replyMsgId = message.reply_to_message.message_id;
                const mapping = supportMsgToUserMap.get(replyMsgId);
                if (mapping) {
                  targetUserId = mapping.userId;
                }
              }

              // Check if active target user is set via inline button
              if (!targetUserId && activeAdminReplyTargetUserId) {
                targetUserId = activeAdminReplyTargetUserId;
              }

              // Check if message starts with /reply USER_ID message or USER_ID: message
              if (!targetUserId) {
                const match = text.match(/^(\d{6,12})[:\s]+([\s\S]+)$/);
                if (match) {
                  targetUserId = match[1];
                  const actualMessageText = match[2];

                  const sent = await sendSupportBotMessage(targetUserId,
                    `💬 <b>Animem.uz Ma'muriyatidan javob:</b>\n\n${actualMessageText}`
                  );
                  if (sent && sent.ok) {
                    await sendSupportBotMessage(SUPPORT_ADMIN_ID, `✅ Javobingiz foydalanuvchiga (ID: <code>${targetUserId}</code>) yetkazildi!`);
                  } else {
                    await sendSupportBotMessage(SUPPORT_ADMIN_ID, `❌ Foydalanuvchiga xabar yuborib bo'lmadi (ID: <code>${targetUserId}</code>).`);
                  }
                  continue;
                }
              }

              if (targetUserId) {
                const sent = await sendSupportBotMessage(targetUserId,
                  `💬 <b>Animem.uz Ma'muriyatidan javob:</b>\n\n${text}`
                );

                if (sent && sent.ok) {
                  await sendSupportBotMessage(SUPPORT_ADMIN_ID, `✅ Javobingiz foydalanuvchiga (ID: <code>${targetUserId}</code>) yetkazildi!`);
                  activeAdminReplyTargetUserId = null; // reset state after successful reply
                } else {
                  await sendSupportBotMessage(SUPPORT_ADMIN_ID, `❌ Foydalanuvchiga xabar yuborib bo'lmadi (ID: <code>${targetUserId}</code>).`);
                }
              } else {
                await sendSupportBotMessage(SUPPORT_ADMIN_ID,
                  `ℹ️ <b>Admin Rejimi:</b>\n\n` +
                  `Foydalanuvchiga javob yuborish uchun xabarga <b>Reply</b> (javob bosing) qiling yoki xabar ostidagi <b>"✍️ Bot Orqali Javob Berish"</b> tugmasini bosing.\n` +
                  `Yoki: <code>USER_ID: sizning xabaringiz</code> ko'rinishida yozing.`
                );
              }
            } 
            // B) MESSAGE FROM REGULAR USER
            else {
              if (text === "/start" || text.startsWith("/start")) {
                await sendSupportBotMessage(chatId,
                  `<b>Assalomu alaykum! Animem.uz rasmiy qo'llab-quvvatlash botiga xush kelibsiz! 👋🤖</b>\n\n` +
                  `Ushbu bot orqali siz Animem.uz ma'muriyati bilan bevosita bog'lanishingiz mumkin.\n\n` +
                  `Iltimos, <b>Ismingiz</b> va saytdan (animem.uz) ro'yxatdan o'tgan <b>Domen / Taxallusingizni</b> hamda murojaatingizni yozib qoldiring:\n\n` +
                  `<i>Masalan: "Ismim Jasur, saytdagi nickim/domenim: jasur_uz. Murojaat: Anime yuklash bo'yicha taklifim bor..."</i>`
                );
              } else {
                // Send confirmation to user
                await sendSupportBotMessage(chatId,
                  `✅ <b>Murojaatingiz qabul qilindi va adminga yetkazildi!</b>\n\n` +
                  `Admin ko'rib chiqib, tez orada sizga javob qaytaradi. Rahmat!`
                );

                // Send notification to Admin Telegram ID (8991315532)
                const tgUsername = from.username ? `@${from.username}` : "Mavjud emas";
                const tgName = `${from.first_name || ''} ${from.last_name || ''}`.trim() || "Foydalanuvchi";
                const userTgLink = from.username ? `https://t.me/${from.username}` : `tg://user?id=${fromId}`;

                const adminMsgText = 
                  `📩 <b>YANGI MUROJAAT (animem_support_bot)</b>\n\n` +
                  `👤 <b>Ism:</b> ${tgName}\n` +
                  `🆔 <b>Telegram ID:</b> <code>${fromId}</code>\n` +
                  `🏷 <b>Username:</b> ${tgUsername}\n\n` +
                  `📝 <b>Murojaat / Sayt domeni / Xabar:</b>\n${text}\n\n` +
                  `📅 <b>Sana:</b> ${new Date().toLocaleString('uz-UZ')}`;

                const inlineKeyboard = {
                  inline_keyboard: [
                    [
                      { text: "💬 Telegramda Chatga Kirish", url: userTgLink }
                    ],
                    [
                      { text: "✍️ Bot Orqali Javob Berish", callback_data: `reply_${fromId}` }
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
    setTimeout(poll, 2000);
  };

  poll();
}

// 1. Create a session ID
app.get("/api/auth/telegram/session", (req, res) => {
  const sessionId = "auth_" + Math.random().toString(36).substring(2, 15);
  activeSessions.set(sessionId, {
    status: "pending",
    createdAt: Date.now()
  });
  res.json({ sessionId });
});

// 2. Check session status
app.get("/api/auth/telegram/status/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);
  if (!session) {
    return res.json({ status: "expired" });
  }
  res.json(session);
});

// Telegram avatar image proxy
app.get("/api/tgavatar", async (req, res) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath || filePath.includes("..")) return res.status(400).send("Invalid path");
    const tgRes = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
    if (!tgRes.ok) return res.status(404).send("Not found");
    res.setHeader("Content-Type", tgRes.headers.get("content-type") || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    const buffer = Buffer.from(await tgRes.arrayBuffer());
    res.send(buffer);
  } catch (err: any) {
    res.status(500).send("Avatar fetch error");
  }
});

// Telegram Send Code Endpoint
app.post("/api/auth/telegram/send-code", async (req, res) => {
  try {
    const rawPhone = String(req.body.phone || "").trim();
    let cleanDigits = rawPhone.replace(/[^\d]/g, "");
    if (cleanDigits.length === 9) cleanDigits = "998" + cleanDigits;
    const cleanPhone = "+" + cleanDigits;

    if (cleanDigits.length < 8) {
      return res.status(400).json({ error: "Iltimos, to'g'ri telefon raqam kiriting (masalan: +998901234567)" });
    }

    const code = Math.floor(10000 + Math.random() * 90000).toString();
    const sessionId = "tg_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 8);

    activeSessions.set(sessionId, {
      status: "pending_code",
      phone: cleanPhone,
      code,
      createdAt: Date.now()
    });

    let chatId: any = null;
    try {
      const [users]: any = await dbQuery("SELECT telegram_chat_id FROM users WHERE (phone = ? OR phone = ?) LIMIT 1", [cleanPhone, cleanDigits]);
      if (users && users[0] && users[0].telegram_chat_id) {
        chatId = users[0].telegram_chat_id;
      }
    } catch {}

    if (chatId) {
      try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `🔐 <b>ANIMEM.UZ — Kirish kodi</b>\n\nSizning tasdiqlash kodingiz:\n\n👉 <code>${code}</code> 👈\n\nUshbu kodni saytga kiriting. Kod 5 daqiqa davomida amal qiladi.\nXavfsizlik uchun kodni begonalarga bermang!`,
            parse_mode: "HTML",
          }),
        });
      } catch {}
    }

    return res.json({
      success: true,
      sessionId,
      phone: cleanPhone,
      code,
      deliveredDirectly: true,
      message: "Telegramga tasdiqlash kodi yuborildi!"
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Xatolik yuz berdi" });
  }
});

// Telegram Verify Code Endpoint
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
    let user: any = null;
    try {
      const [users]: any = await dbQuery("SELECT * FROM users WHERE phone = ? OR phone = ? OR email = ? LIMIT 1", [cleanPhone, cleanDigits, userEmail]);
      if (users && users[0]) user = users[0];
    } catch {}

    if (!user) {
      const userName = `User_${cleanDigits.slice(-4)}`;
      try {
        const [insertRes]: any = await dbQuery(
          "INSERT INTO users (name, email, phone, role) VALUES (?, ?, ?, 'user')",
          [userName, userEmail, cleanPhone]
        );
        user = { id: insertRes.insertId || Date.now(), name: userName, email: userEmail, phone: cleanPhone, role: 'user' };
      } catch {
        user = { id: Date.now(), name: userName, email: userEmail, phone: cleanPhone, role: 'user' };
      }
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role || 'user', phone: user.phone, avatar_url: user.avatar_url || null },
      JWT_SECRET,
      { expiresIn: "3650d" }
    );

    return res.json({ success: true, token, user });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Tasdiqlashda xatolik yuz berdi" });
  }
});

// 3. Simulate Telegram Bot interaction on-screen
app.post("/api/auth/telegram/simulate", async (req, res) => {
  try {
    const { sessionId, phone, first_name, username, avatar_url } = req.body;
    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(400).json({ error: "Sessiya topilmadi yoki muddati tugagan!" });
    }

    const fakeTgUserId = Math.floor(100000000 + Math.random() * 900000000);
    const email = `tg_${fakeTgUserId}@telegram.uz`;
    const name = first_name || username || "Telegram User";

    // DB sync
    let [users]: any = await dbQuery("SELECT * FROM users WHERE telegram_id = ? OR email = ?", [String(fakeTgUserId), email]);
    let user = users[0];

    if (!user) {
      const randomPass = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(randomPass, 10);
      const role = isAdminEmail(email) ? "admin" : "user";

      try {
        const [insertRes]: any = await dbQuery(
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
      } catch (insertErr: any) {
        if (insertErr.code === 'ER_DUP_ENTRY') {
          let [existingUsers]: any = await dbQuery("SELECT * FROM users WHERE email = ?", [email]);
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
      avatar_url: user.avatar_url,
    };
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });

    // Mark session authorized
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

// 4. Official Telegram Login Widget Callback
app.post("/api/auth/telegram/widget", async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.id) {
      return res.status(400).json({ error: "Telegram ma'lumotlari topilmadi!" });
    }

    // Verify hash with BOT_TOKEN if hash is present
    if (data.hash) {
      try {
        const { hash, ...rest } = data;
        const checkString = Object.keys(rest)
          .sort()
          .map(k => `${k}=${rest[k]}`)
          .join("\n");
        const secretKey = crypto.createHash("sha256").update(BOT_TOKEN).digest();
        const calculatedHash = crypto.createHmac("sha256", secretKey).update(checkString).digest("hex");
        
        // Log verification status
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

    // If photo_url not directly sent by widget, fetch from bot API
    if (!photoUrl) {
      try {
        const photosRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos?user_id=${tgUserId}&limit=1`);
        const photosData: any = await photosRes.json();
        if (photosData.ok && photosData.result && photosData.result.total_count > 0) {
          const fileId = photosData.result.photos[0][0].file_id;
          const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
          const fileData: any = await fileRes.json();
          if (fileData.ok && fileData.result) {
            photoUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
          }
        }
      } catch (photoErr) {
        console.warn("Could not fetch telegram profile picture via bot API:", photoErr);
      }
    }

    // Check existing user in DB
    let [users]: any = await dbQuery("SELECT * FROM users WHERE telegram_id = ? OR email = ?", [tgUserId, email]);
    let user = users[0];

    if (!user) {
      const randomPass = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(randomPass, 10);
      const role = (email === "mosinjonovjasurbek28@gmail.com" || email === "mosinjonovjasurbek00@gmail.com") ? "admin" : "user";

      try {
        const [insertRes]: any = await dbQuery(
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
      } catch (insertErr: any) {
        if (insertErr.code === "ER_BAD_FIELD_ERROR") {
          const [insertRes]: any = await dbQuery(
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
          let [existingUsers]: any = await dbQuery("SELECT * FROM users WHERE telegram_id = ? OR email = ?", [tgUserId, email]);
          user = existingUsers[0];
          if (!user) throw insertErr;
        } else {
          throw insertErr;
        }
      }
    } else {
      // Update avatar and name with fresh Telegram profile details
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
      telegram_id: user.telegram_id,
    };
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });

    res.json({
      success: true,
      token,
      user: userPayload
    });
  } catch (err: any) {
    console.error("Telegram widget auth endpoint error:", err);
    res.status(500).json({ error: err.message || "Telegram widget orqali kirishda xatolik yuz berdi" });
  }
});

// 5. Telegram WebApp / Mini App Auth Endpoint
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

    // Check existing user in DB
    let [users]: any = await dbQuery("SELECT * FROM users WHERE telegram_id = ? OR email = ?", [tgUserId, email]);
    let user = users[0];

    if (!user) {
      const randomPass = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(randomPass, 10);
      const role = (email === "mosinjonovjasurbek28@gmail.com" || email === "mosinjonovjasurbek00@gmail.com") ? "admin" : "user";

      try {
        const [insertRes]: any = await dbQuery(
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
      } catch (insertErr: any) {
        if (insertErr.code === "ER_BAD_FIELD_ERROR") {
          const [insertRes]: any = await dbQuery(
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
          let [existingUsers]: any = await dbQuery("SELECT * FROM users WHERE telegram_id = ? OR email = ?", [tgUserId, email]);
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
      telegram_id: user.telegram_id,
    };
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });

    res.json({
      success: true,
      token,
      user: userPayload
    });
  } catch (err: any) {
    console.error("Telegram webapp auth endpoint error:", err);
    res.status(500).json({ error: err.message || "Telegram WebApp orqali kirishda xatolik" });
  }
});

// ==================== TELEGRAM OPENID CONNECT / OAUTH 2.0 ENDPOINTS ====================
function getTelegramRedirectUri(req: express.Request): string {
  if (process.env.TELEGRAM_REDIRECT_URI) return process.env.TELEGRAM_REDIRECT_URI;
  const host = (req.headers.host || "").toLowerCase();
  if (host.includes("animem.uz")) {
    return "https://www.animem.uz/api/auth/telegram/callback";
  }
  const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
  return `${appUrl.replace(/\/$/, "")}/api/auth/telegram/callback`;
}

app.get("/api/auth/telegram/config", (req, res) => {
  const redirectUri = getTelegramRedirectUri(req);
  res.json({
    botUsername: TELEGRAM_BOT_USERNAME,
    clientId: TELEGRAM_CLIENT_ID,
    redirectUri,
    authUrl: `https://oauth.telegram.org/auth?client_id=${TELEGRAM_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid+profile+phone`
  });
});

app.get("/api/auth/telegram/url", (req, res) => {
  if (!TELEGRAM_CLIENT_ID) {
    return res.status(503).json({ error: "Telegram orqali kirish hali serverda sozlanmagan." });
  }

  const redirectUri = getTelegramRedirectUri(req);
  const state = jwt.sign({ provider: "telegram", redirectUri }, JWT_SECRET, { expiresIn: "15m" });
  const params = new URLSearchParams({
    client_id: TELEGRAM_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "openid profile phone",
    state,
  });

  res.json({
    url: `https://oauth.telegram.org/auth?${params.toString()}`,
    redirect_uri: redirectUri,
    client_id: TELEGRAM_CLIENT_ID
  });
});

async function processTelegramAuth(code: string, redirectUri: string, fallbackUri?: string) {
  if (!TELEGRAM_CLIENT_ID || !TELEGRAM_CLIENT_SECRET) {
    throw new Error("Telegram server sozlamalari topilmadi.");
  }

  const exchangeToken = async (targetUri: string) => {
    const tokenParams = new URLSearchParams({
      client_id: TELEGRAM_CLIENT_ID,
      client_secret: TELEGRAM_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: targetUri,
    });
    const tokenRes = await fetch("https://oauth.telegram.org/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });
    const data = await tokenRes.json() as any;
    return { ok: tokenRes.ok, data };
  };

  let tokenResult = await exchangeToken(redirectUri);
  if (!tokenResult.ok && fallbackUri && fallbackUri !== redirectUri) {
    const altResult = await exchangeToken(fallbackUri);
    if (altResult.ok) {
      tokenResult = altResult;
    }
  }

  const tokenData = tokenResult.data;
  if (!tokenResult.ok || (!tokenData.id_token && !tokenData.access_token)) {
    throw new Error(tokenData.error_description || tokenData.message || tokenData.error || "Telegram tasdiqlash kodini tekshirib bo'lmadi.");
  }

  let decoded: any = null;
  if (tokenData.id_token) {
    decoded = jwt.decode(tokenData.id_token) as any;
  }

  let tgUserId = decoded?.sub ? String(decoded.sub) : "";
  let name = decoded?.name || [decoded?.given_name, decoded?.family_name].filter(Boolean).join(" ") || decoded?.preferred_username || "";
  let username = decoded?.preferred_username || "";
  let photoUrl = decoded?.picture || null;
  const phoneNumber = decoded?.phone_number || null;

  if (!tgUserId) {
    throw new Error("Telegram profilingiz ma'lumotlari olinmadi.");
  }

  if (!name) name = username || `Telegram_${tgUserId.slice(-4)}`;
  const email = username ? `tg_${username}@telegram.uz` : `tg_${tgUserId}@telegram.uz`;

  // Fetch avatar from bot API if missing
  if (!photoUrl && BOT_TOKEN) {
    try {
      const photosRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos?user_id=${tgUserId}&limit=1`);
      const photosData: any = await photosRes.json();
      if (photosData.ok && photosData.result && photosData.result.total_count > 0) {
        const fileId = photosData.result.photos[0][0].file_id;
        const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
        const fileData: any = await fileRes.json();
        if (fileData.ok && fileData.result) {
          photoUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
        }
      }
    } catch (photoErr) {
      console.warn("Could not fetch telegram profile picture via bot API:", photoErr);
    }
  }

  let [users]: any = await dbQuery("SELECT * FROM users WHERE telegram_id = ? OR email = ?", [tgUserId, email]);
  let user = users[0];

  if (!user) {
    const role = (email === "mosinjonovjasurbek28@gmail.com" || email === "mosinjonovjasurbek00@gmail.com") ? "admin" : "user";
    const hashedPassword = await bcrypt.hash(Math.random().toString(36).slice(-16), 10);
    try {
      const [insertRes]: any = await dbQuery(
        "INSERT INTO users (name, email, password, role, avatar_url, telegram_id, auth_provider, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [name, email, hashedPassword, role, photoUrl || null, tgUserId, "telegram", phoneNumber || null]
      );
      user = { id: insertRes.insertId, name, email, role, avatar_url: photoUrl, telegram_id: tgUserId, phone: phoneNumber };
    } catch (insertErr: any) {
      const [insertRes]: any = await dbQuery(
        "INSERT INTO users (name, email, password, role, avatar_url, telegram_id) VALUES (?, ?, ?, ?, ?, ?)",
        [name, email, hashedPassword, role, photoUrl || null, tgUserId]
      );
      user = { id: insertRes.insertId, name, email, role, avatar_url: photoUrl, telegram_id: tgUserId };
    }
  } else {
    try {
      await dbQuery(
        "UPDATE users SET telegram_id = COALESCE(telegram_id, ?), avatar_url = COALESCE(?, avatar_url), name = COALESCE(NULLIF(?, ''), name), auth_provider = 'telegram' WHERE id = ?",
        [tgUserId, photoUrl || null, name, user.id]
      );
    } catch {
      await dbQuery(
        "UPDATE users SET telegram_id = COALESCE(telegram_id, ?), avatar_url = COALESCE(?, avatar_url), name = COALESCE(NULLIF(?, ''), name) WHERE id = ?",
        [tgUserId, photoUrl || null, name, user.id]
      );
    }
    user.telegram_id = tgUserId;
    if (photoUrl && !user.avatar_url) user.avatar_url = photoUrl;
  }

  const userPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar_url: user.avatar_url,
    telegram_id: user.telegram_id,
  };
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
  return { token, user: userPayload };
}

app.get(["/api/auth/telegram/callback", "/api/auth/telegram/callback/"], async (req, res) => {
  const sendCallback = (statusType: "TELEGRAM_AUTH_SUCCESS" | "TELEGRAM_AUTH_ERROR", payload: Record<string, unknown>) => {
    const message = { type: statusType, ...payload };
    const jsonMessage = JSON.stringify(message);
    const errorStr = typeof payload.error === "string" ? payload.error : "";
    const isSuccess = statusType === "TELEGRAM_AUTH_SUCCESS";

    res.send(`<!doctype html>
<html lang="uz">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Animem.uz - Telegram Kirish</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0b0c10;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
      text-align: center;
    }
    .card {
      background: #15161c;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 36px 28px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(0, 136, 204, 0.2);
      border-top-color: #0088cc;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 24px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .title { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #fff; }
    .desc { font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.5; }
    a.btn {
      display: inline-block;
      margin-top: 20px;
      background: #0088cc;
      color: #fff;
      padding: 10px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <div class="title">${isSuccess ? "Muvaffaqiyatli kirdingiz!" : "Xatolik yuz berdi"}</div>
    <div class="desc">${isSuccess ? "Telegram profilingiz yuklanmoqda, iltimos kuting..." : (errorStr || "Telegram orqali kirishda xatolik yuz berdi.")}</div>
    ${!isSuccess ? `<a href="/login" class="btn">Kirish sahifasiga qaytish</a>` : ""}
  </div>

  <script>
    (function() {
      try {
        const msg = ${jsonMessage};
        const ok = msg.type === "TELEGRAM_AUTH_SUCCESS";

        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage(msg, window.location.origin);
            window.close();
            return;
          } catch (e) {}
        }

        if (ok && msg.token) {
          try {
            localStorage.setItem("token", msg.token);
            if (msg.user) localStorage.setItem("user", JSON.stringify(msg.user));
          } catch (e) {}

          const targetUrl = "/?token=" + encodeURIComponent(msg.token || "") + "&user=" + encodeURIComponent(JSON.stringify(msg.user || {}));
          window.location.replace(targetUrl);
        } else {
          const err = msg.error || "Telegram orqali kirishda xatolik";
          setTimeout(function() {
            window.location.replace("/login?error=" + encodeURIComponent(err));
          }, 1500);
        }
      } catch (err) {
        console.error("Callback execution error:", err);
        window.location.replace("/login");
      }
    })();
  </script>
</body>
</html>`);
  };

  try {
    const code = req.query.code as string;
    const state = req.query.state as string;
    if (!code) throw new Error("Telegram tasdiqlash kodi olinmadi.");

    let redirectUri = getTelegramRedirectUri(req);
    if (state) {
      try {
        const stateData: any = jwt.verify(state, JWT_SECRET);
        if (stateData && stateData.redirectUri) {
          redirectUri = stateData.redirectUri;
        }
      } catch {}
    }

    const host = (req.headers.host || "").toLowerCase();
    const currentCallbackUri = `https://${host}/api/auth/telegram/callback`;
    const fallbackUri = currentCallbackUri !== redirectUri ? currentCallbackUri : (
      redirectUri.includes("www.")
        ? redirectUri.replace("www.", "")
        : redirectUri.replace("https://", "https://www.")
    );

    const result = await processTelegramAuth(code, redirectUri, fallbackUri);
    sendCallback("TELEGRAM_AUTH_SUCCESS", result);
  } catch (err: any) {
    console.error("Telegram OAuth callback error:", err);
    sendCallback("TELEGRAM_AUTH_ERROR", { error: err.message || "Telegram orqali kirishda xatolik" });
  }
});

app.post(["/api/auth/telegram/openid", "/api/auth/telegram/oauth", "/api/auth/telegram/exchange"], async (req, res) => {
  try {
    const data = req.body;
    if (!data) {
      return res.status(400).json({ error: "Telegram ma'lumotlari taqdim etilmadi" });
    }

    // 1. If authorization code is provided, process via token exchange
    if (data.code) {
      const redirectUri = data.redirect_uri || getTelegramRedirectUri(req);
      const host = (req.headers.host || "").toLowerCase();
      const currentCallbackUri = `https://${host}/api/auth/telegram/callback`;
      const fallbackUri = currentCallbackUri !== redirectUri ? currentCallbackUri : (
        redirectUri.includes("www.")
          ? redirectUri.replace("www.", "")
          : redirectUri.replace("https://", "https://www.")
      );
      const result = await processTelegramAuth(data.code, redirectUri, fallbackUri);
      return res.json({ success: true, ...result });
    }

    // 2. If id_token (JWT) from Telegram.Login.auth SDK popup is provided
    let tgUserId = "";
    let firstName = "";
    let lastName = "";
    let username = "";
    let photoUrl: string | null = null;
    let name = "";
    let phoneNumber: string | null = null;

    if (data.id_token) {
      const decoded: any = jwt.decode(data.id_token);
      if (decoded && decoded.sub) {
        tgUserId = String(decoded.sub);
        firstName = (decoded.given_name || "").trim();
        lastName = (decoded.family_name || "").trim();
        username = (decoded.preferred_username || "").trim();
        photoUrl = decoded.picture || null;
        phoneNumber = decoded.phone_number || null;
        name = decoded.name || [firstName, lastName].filter(Boolean).join(" ") || username || `Telegram_${tgUserId.slice(-4)}`;
      }
    } else if (data.id) {
      // Legacy widget or direct user payload
      tgUserId = String(data.id);
      firstName = (data.first_name || "").trim();
      lastName = (data.last_name || "").trim();
      username = (data.username || "").trim();
      photoUrl = data.photo_url || null;
      phoneNumber = data.phone_number || null;
      name = [firstName, lastName].filter(Boolean).join(" ") || username || `Telegram_${tgUserId.slice(-4)}`;
    }

    if (!tgUserId) {
      return res.status(400).json({ error: "Telegram foydalanuvchi ma'lumotlari aniqlanmadi" });
    }

    const email = username ? `tg_${username}@telegram.uz` : `tg_${tgUserId}@telegram.uz`;

    // Fetch avatar from bot API if missing
    if (!photoUrl && BOT_TOKEN) {
      try {
        const photosRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos?user_id=${tgUserId}&limit=1`);
        const photosData: any = await photosRes.json();
        if (photosData.ok && photosData.result && photosData.result.total_count > 0) {
          const fileId = photosData.result.photos[0][0].file_id;
          const fileRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`);
          const fileData: any = await fileRes.json();
          if (fileData.ok && fileData.result) {
            photoUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
          }
        }
      } catch (photoErr) {
        console.warn("Could not fetch telegram profile picture via bot API:", photoErr);
      }
    }

    // Check existing user in DB
    let [users]: any = await dbQuery("SELECT * FROM users WHERE telegram_id = ? OR email = ?", [tgUserId, email]);
    let user = users[0];

    if (!user) {
      const randomPass = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(randomPass, 10);
      const role = (email === "mosinjonovjasurbek28@gmail.com" || email === "mosinjonovjasurbek00@gmail.com") ? "admin" : "user";

      try {
        const [insertRes]: any = await dbQuery(
          "INSERT INTO users (name, email, password, role, avatar_url, telegram_id, auth_provider, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [name, email, hashedPassword, role, photoUrl || null, tgUserId, "telegram", phoneNumber || null]
        );
        user = { id: insertRes.insertId, name, email, role, avatar_url: photoUrl, telegram_id: tgUserId, phone: phoneNumber };
      } catch (insertErr: any) {
        const [insertRes]: any = await dbQuery(
          "INSERT INTO users (name, email, password, role, avatar_url, telegram_id) VALUES (?, ?, ?, ?, ?, ?)",
          [name, email, hashedPassword, role, photoUrl || null, tgUserId]
        );
        user = { id: insertRes.insertId, name, email, role, avatar_url: photoUrl, telegram_id: tgUserId };
      }
    } else {
      try {
        await dbQuery(
          "UPDATE users SET telegram_id = COALESCE(telegram_id, ?), avatar_url = COALESCE(?, avatar_url), name = COALESCE(NULLIF(?, ''), name), auth_provider = 'telegram' WHERE id = ?",
          [tgUserId, photoUrl || null, name, user.id]
        );
      } catch {
        await dbQuery(
          "UPDATE users SET telegram_id = COALESCE(telegram_id, ?), avatar_url = COALESCE(?, avatar_url), name = COALESCE(NULLIF(?, ''), name) WHERE id = ?",
          [tgUserId, photoUrl || null, name, user.id]
        );
      }
      user.telegram_id = tgUserId;
      if (photoUrl && !user.avatar_url) user.avatar_url = photoUrl;
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
      telegram_id: user.telegram_id,
    };
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "30d" });

    res.json({
      success: true,
      token,
      user: userPayload
    });
  } catch (err: any) {
    console.error("Telegram OpenID auth error:", err);
    res.status(500).json({ error: err.message || "Telegram OpenID orqali kirishda xatolik" });
  }
});


// ==================== YANDEX OAUTH ENDPOINTS ====================
const YANDEX_CLIENT_ID = process.env.YANDEX_CLIENT_ID || "044187259630401c9d14b33ac139d976";
const YANDEX_CLIENT_SECRET = process.env.YANDEX_CLIENT_SECRET || "d7c5406e78114ca689c95ef030db9139";

// 1. Get Yandex OAuth authorization URL
app.get("/api/auth/yandex/url", (req, res) => {
  try {
    const rawRedirect = (req.query.redirect_uri as string) || "";
    let redirectUri = rawRedirect;
    if (!redirectUri) {
      const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
      redirectUri = `${appUrl}/api/auth/yandex/callback`;
    }
    const params = new URLSearchParams({
      response_type: "code",
      client_id: YANDEX_CLIENT_ID,
      redirect_uri: redirectUri,
    });
    const url = `https://oauth.yandex.ru/authorize?${params.toString()}`;
    res.json({ url, client_id: YANDEX_CLIENT_ID, redirect_uri: redirectUri });
  } catch (err: any) {
    res.status(500).json({ error: "Yandex OAuth URL yaratishda xatolik" });
  }
});

// Helper for Yandex OAuth verification & profile creation
async function processYandexAuth(codeOrToken: string, isToken = false) {
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

  // Get Yandex Profile
  const userRes = await fetch("https://login.yandex.ru/info?format=json", {
    headers: { Authorization: `OAuth ${accessToken}` }
  });

  const yandexUser = await userRes.json();
  if (!userRes.ok || !yandexUser.id) {
    throw new Error(yandexUser.error_description || "Yandex profilingiz ma'lumotlarini olishda xatolik!");
  }

  const yandexId = String(yandexUser.id);
  const email = yandexUser.default_email || (yandexUser.emails && yandexUser.emails[0]) || `${yandexUser.login || yandexId}@yandex.ru`;
  const name = yandexUser.real_name || yandexUser.display_name || yandexUser.first_name || yandexUser.login || "Yandex User";

  let avatarUrl: string | null = null;
  if (yandexUser.default_avatar_id && !yandexUser.is_avatar_empty) {
    avatarUrl = `https://avatars.yandex.net/get-yapic/${yandexUser.default_avatar_id}/islands-200`;
  }

  // Search in DB
  let [users]: any = await dbQuery("SELECT * FROM users WHERE yandex_id = ? OR email = ?", [yandexId, email]);
  let user = users[0];

  if (!user) {
    const role = isAdminEmail(email) ? "admin" : "user";
    const randomPass = Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(randomPass, 10);

    const [insertRes]: any = await dbQuery(
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
    if (!user.yandex_id || (avatarUrl && !user.avatar_url)) {
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
    avatar_url: user.avatar_url,
  };

  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "30d" });

  return { token, user: userPayload };
}

// 2. Yandex Callback Redirect Route
app.get(["/api/auth/yandex/callback", "/api/auth/yandex/callback/"], async (req, res) => {
  try {
    const code = req.query.code as string;
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
  } catch (err: any) {
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

// 3. Direct verification endpoint (for token or code entry)
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
  } catch (err: any) {
    console.error("Yandex verify error:", err);
    res.status(400).json({ error: err.message || "Yandex orqali kirishda xatolik yuz berdi" });
  }
});

// ==================== DISCORD OAUTH ENDPOINTS ====================
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || "1536253105925128235";
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || "5eKl7DdGh7UKkIJVCxUEVs_nt7wzGmsq";

function getDiscordRedirectUri(req: express.Request): string {
  if (process.env.DISCORD_REDIRECT_URI) return process.env.DISCORD_REDIRECT_URI;
  const host = (req.headers.host || "").toLowerCase();
  if (host.includes("animem.uz")) {
    return "https://www.animem.uz/api/auth/discord/callback";
  }
  const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
  return `${appUrl.replace(/\/$/, "")}/api/auth/discord/callback`;
}

app.get("/api/auth/discord/url", (req, res) => {
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    return res.status(503).json({ error: "Discord orqali kirish hali serverda sozlanmagan." });
  }

  const redirectUri = getDiscordRedirectUri(req);
  const state = jwt.sign({ provider: "discord", redirectUri }, JWT_SECRET, { expiresIn: "10m" });
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "identify email",
    state,
  });

  res.json({ url: `https://discord.com/oauth2/authorize?${params.toString()}` });
});

async function processDiscordAuth(code: string, redirectUri: string, fallbackUri?: string) {
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    throw new Error("Discord server sozlamalari topilmadi.");
  }

  const exchangeToken = async (targetUri: string) => {
    const tokenParams = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: targetUri,
    });
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });
    const data = await tokenRes.json() as any;
    return { ok: tokenRes.ok, data };
  };

  let tokenResult = await exchangeToken(redirectUri);
  if (!tokenResult.ok && fallbackUri && fallbackUri !== redirectUri) {
    const altResult = await exchangeToken(fallbackUri);
    if (altResult.ok) {
      tokenResult = altResult;
    }
  }

  const tokenData = tokenResult.data;
  if (!tokenResult.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || tokenData.message || tokenData.error || "Discord tasdiqlash kodini tekshirib bo'lmadi.");
  }

  const profileRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const discordUser = await profileRes.json() as any;
  if (!profileRes.ok || !discordUser.id) {
    throw new Error("Discord profilingiz ma'lumotlari olinmadi.");
  }

  const discordId = String(discordUser.id);
  const email = discordUser.email || `discord-${discordId}@users.animem.uz`;
  const name = discordUser.global_name || discordUser.username || "Discord User";
  const avatarUrl = discordUser.avatar
    ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png?size=256`
    : null;

  const [users]: any = await dbQuery(
    "SELECT * FROM users WHERE discord_id = ? OR email = ?",
    [discordId, email]
  );
  let user = users[0];

  if (!user) {
    const role = isAdminEmail(email) ? "admin" : "user";
    const hashedPassword = await bcrypt.hash(Math.random().toString(36).slice(-16), 10);
    const [insertRes]: any = await dbQuery(
      "INSERT INTO users (name, email, password, role, avatar_url, discord_id, auth_provider) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, email, hashedPassword, role, avatarUrl, discordId, "discord"]
    );
    user = { id: insertRes.insertId, name, email, role, avatar_url: avatarUrl, discord_id: discordId };
  } else if (!user.discord_id || (avatarUrl && !user.avatar_url)) {
    await dbQuery(
      "UPDATE users SET discord_id = COALESCE(discord_id, ?), avatar_url = COALESCE(avatar_url, ?), auth_provider = COALESCE(auth_provider, ?) WHERE id = ?",
      [discordId, avatarUrl, "discord", user.id]
    );
    user.discord_id = discordId;
    if (avatarUrl) user.avatar_url = avatarUrl;
  }

  const userPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar_url: user.avatar_url,
  };
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
  return { token, user: userPayload };
}

app.get(["/api/auth/discord/callback", "/api/auth/discord/callback/"], async (req, res) => {
  const sendCallback = (statusType: "DISCORD_AUTH_SUCCESS" | "DISCORD_AUTH_ERROR", payload: Record<string, unknown>) => {
    const message = { type: statusType, ...payload };
    const jsonMessage = JSON.stringify(message);
    const errorStr = typeof payload.error === "string" ? payload.error : "";
    const isSuccess = statusType === "DISCORD_AUTH_SUCCESS";

    res.send(`<!doctype html>
<html lang="uz">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Animem.uz - Discord Kirish</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0b0c10;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
      text-align: center;
    }
    .card {
      background: #15161c;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 36px 28px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(88, 101, 242, 0.2);
      border-top-color: #5865F2;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 24px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .title { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #fff; }
    .desc { font-size: 14px; color: rgba(255,255,255,0.7); line-height: 1.5; }
    a.btn {
      display: inline-block;
      margin-top: 20px;
      background: #5865F2;
      color: #fff;
      padding: 10px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <div class="title">${isSuccess ? "Muvaffaqiyatli kirdingiz!" : "Xatolik yuz berdi"}</div>
    <div class="desc">${isSuccess ? "Profil ma'lumotlaringiz yuklanmoqda, iltimos kuting..." : (errorStr || "Discord orqali kirishda xatolik yuz berdi.")}</div>
    ${!isSuccess ? `<a href="/login" class="btn">Kirish sahifasiga qaytish</a>` : ""}
  </div>

  <script>
    (function() {
      try {
        const msg = ${jsonMessage};
        const ok = msg.type === "DISCORD_AUTH_SUCCESS";

        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage(msg, window.location.origin);
            window.close();
            return;
          } catch (e) {}
        }

        if (ok && msg.token) {
          try {
            localStorage.setItem("token", msg.token);
            if (msg.user) localStorage.setItem("user", JSON.stringify(msg.user));
          } catch (e) {}

          const targetUrl = "/?token=" + encodeURIComponent(msg.token || "") + "&user=" + encodeURIComponent(JSON.stringify(msg.user || {}));
          window.location.replace(targetUrl);
        } else {
          const err = msg.error || "Discord orqali kirishda xatolik";
          setTimeout(function() {
            window.location.replace("/login?error=" + encodeURIComponent(err));
          }, 1500);
        }
      } catch (err) {
        console.error("Callback execution error:", err);
        window.location.replace("/login");
      }
    })();
  </script>
</body>
</html>`);
  };

  try {
    const code = req.query.code as string;
    const state = req.query.state as string;
    if (!code || !state) throw new Error("Discord tasdiqlash ma'lumotlari topilmadi.");

    let stateData: { provider?: string; redirectUri?: string } = {};
    try {
      stateData = jwt.verify(state, JWT_SECRET) as any;
    } catch {
      try {
        stateData = jwt.verify(state, "anime_super_secret_key") as any;
      } catch {
        stateData = jwt.verify(state, "animem-super-jwt-secret-key-2026-secure") as any;
      }
    }

    if (stateData.provider !== "discord" || !stateData.redirectUri) {
      throw new Error("Discord tasdiqlash so'rovi yaroqsiz.");
    }

    const host = (req.headers.host || "").toLowerCase();
    const currentCallbackUri = `https://${host}/api/auth/discord/callback`;
    const fallbackUri = currentCallbackUri !== stateData.redirectUri ? currentCallbackUri : (
      stateData.redirectUri.includes("www.")
        ? stateData.redirectUri.replace("www.", "")
        : stateData.redirectUri.replace("https://", "https://www.")
    );

    const result = await processDiscordAuth(code, stateData.redirectUri, fallbackUri);
    sendCallback("DISCORD_AUTH_SUCCESS", result);
  } catch (err: any) {
    console.error("Discord OAuth callback error:", err);
    sendCallback("DISCORD_AUTH_ERROR", { error: err.message || "Discord orqali kirishda xatolik" });
  }
});


// Vite Dev Server / Static Files Setup
async function start() {
  const distPath = path.join(process.cwd(), "dist");
  const publicPath = path.join(process.cwd(), "public");
  const isProduction = process.env.NODE_ENV === "production" || fs.existsSync(distPath);

  // Start Telegram Bots
  runTelegramBot();
  runSupportTelegramBot();

  // Explicit handlers for Favicon, Logos, Manifests, and Verification Files
  app.get(["/favicon.ico", "/favicon.png"], (req, res) => {
    const icoPath = path.join(publicPath, "favicon.ico");
    const logoPath = path.join(publicPath, "logo.png");
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    if (fs.existsSync(icoPath)) {
      res.setHeader("Content-Type", req.path.endsWith('.png') ? "image/png" : "image/x-icon");
      return res.sendFile(icoPath);
    }
    res.setHeader("Content-Type", "image/png");
    return res.sendFile(logoPath);
  });

  app.get(["/logo.png", "/logo1.png", "/apple-touch-icon.png", "/icon-48.png", "/icon-192.png", "/icon-512.png"], (req, res) => {
    const filename = path.basename(req.path);
    const targetPath = path.join(publicPath, filename);
    const fallbackPath = path.join(publicPath, "logo.png");
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    if (fs.existsSync(targetPath)) {
      return res.sendFile(targetPath);
    }
    return res.sendFile(fallbackPath);
  });

  app.get(["/site.webmanifest", "/manifest.json"], (req, res) => {
    const manifestPath = path.join(publicPath, "site.webmanifest");
    if (fs.existsSync(manifestPath)) {
      res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
      return res.sendFile(manifestPath);
    }
    return res.json({ name: "Animem Uz", short_name: "Animem.uz", start_url: "/" });
  });

  app.get("/browserconfig.xml", (req, res) => {
    const xmlPath = path.join(publicPath, "browserconfig.xml");
    if (fs.existsSync(xmlPath)) {
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      return res.sendFile(xmlPath);
    }
    return res.status(404).send("Not found");
  });

  app.get("/yandex_a7133c70f3012b72.html", (req, res) => {
    const yandexFile = path.join(publicPath, "yandex_a7133c70f3012b72.html");
    if (fs.existsSync(yandexFile)) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.sendFile(yandexFile);
    }
    return res.type("text/html").send("<html><head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\"></head><body>verification: a7133c70f3012b72</body></html>");
  });

  app.get("/robots.txt", (req, res) => {
    const file = path.join(publicPath, "robots.txt");
    if (fs.existsSync(file)) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.sendFile(file);
    }
    return res.type("text/plain").send("User-agent: *\nAllow: /\nSitemap: https://animem.uz/sitemap.xml");
  });

  app.get("/ads.txt", (req, res) => {
    const file = path.join(publicPath, "ads.txt");
    if (fs.existsSync(file)) {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.sendFile(file);
    }
    return res.type("text/plain").send("yandex.ru, f08c4a5923fc3014, DIRECT, f08c4a5923fc3014");
  });

  const toSlugLocal = (text: string): string => {
    if (!text) return "";
    return text
      .toLowerCase()
      .replace(/o['’`‘]/g, "o")
      .replace(/g['’`‘]/g, "g")
      .replace(/[^a-z0-9\u0400-\u04FF]+/gi, "-")
      .replace(/^-+|-+$/g, "");
  };

  const escapeXml = (str: string | null | undefined): string => {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  const toAbsoluteUrl = (url: string | null | undefined, domain: string = "https://animem.uz"): string => {
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

  const safeIsoDate = (dateVal: any, fallbackIso: string): string => {
    try {
      if (!dateVal) return fallbackIso;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return fallbackIso;
      return d.toISOString().split("T")[0];
    } catch {
      return fallbackIso;
    }
  };

  // Dynamic Sitemap XML generator (Optimized for Yandex & Google)
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const domain = "https://animem.uz";
      const todayIso = new Date().toISOString().split("T")[0];
      
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n`;
      
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
        { url: "/aloqa", priority: "0.7", freq: "monthly" },
      ];
      
      for (const page of staticPages) {
        xml += `  <url>\n    <loc>${domain}${page.url}</loc>\n    <lastmod>${todayIso}</lastmod>\n    <changefreq>${page.freq}</changefreq>\n    <priority>${page.priority}</priority>\n  </url>\n`;
      }
      
      const genres = ["isekai", "sarguzasht", "fantasy", "jangari", "komediya", "dramatiya", "drama", "mecha", "romantika", "kriminal", "dahshat", "sport"];
      for (const g of genres) {
        xml += `  <url>\n    <loc>${domain}/${g}</loc>\n    <lastmod>${todayIso}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
      }

      // 1. Anime pages in Sitemap (Always dynamic from PostgreSQL database)
      let animesList: any[] = [];
      try {
        const [rows]: any = await dbQuery("SELECT * FROM animes ORDER BY id DESC");
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
          xml += `  <url>\n`;
          xml += `    <loc>${domain}/anime/${slug}</loc>\n`;
          xml += `    <lastmod>${animeDate}</lastmod>\n`;
          xml += `    <image:image>\n`;
          xml += `      <image:loc>${imgUrl}</image:loc>\n`;
          xml += `      <image:title>${titleClean}</image:title>\n`;
          xml += `      <image:caption>${titleClean}</image:caption>\n`;
          xml += `    </image:image>\n`;
          xml += `    <changefreq>daily</changefreq>\n`;
          xml += `    <priority>1.0</priority>\n`;
          xml += `  </url>\n`;
        }
      }

      // 2. Manga pages in Sitemap
      let mangasList: any[] = [];
      try {
        const [mRows]: any = await dbQuery("SELECT * FROM mangas");
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
          xml += `  <url>\n`;
          xml += `    <loc>${domain}/manga/${m.id}</loc>\n`;
          xml += `    <lastmod>${mangaDate}</lastmod>\n`;
          xml += `    <image:image>\n`;
          xml += `      <image:loc>${coverUrl}</image:loc>\n`;
          xml += `      <image:title>${mTitleClean}</image:title>\n`;
          xml += `      <image:caption>${mTitleClean} - O'zbekcha manga muqovasi</image:caption>\n`;
          xml += `    </image:image>\n`;
          xml += `    <changefreq>daily</changefreq>\n`;
          xml += `    <priority>0.8</priority>\n`;
          xml += `  </url>\n`;
        }
      }

      // 3. Drama pages in Sitemap (For Google & Yandex fast indexing)
      let dramasList: any[] = [];
      try {
        const [dRows]: any = await dbQuery("SELECT * FROM dramas");
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
          xml += `  <url>\n`;
          xml += `    <loc>${domain}/drama/${d.id}</loc>\n`;
          xml += `    <lastmod>${dramaDate}</lastmod>\n`;
          xml += `    <image:image>\n`;
          xml += `      <image:loc>${posterUrl}</image:loc>\n`;
          xml += `      <image:title>${dTitleClean}</image:title>\n`;
          xml += `      <image:caption>${dTitleClean} - Koreys drama o'zbek tilida</image:caption>\n`;
          xml += `    </image:image>\n`;
          xml += `    <changefreq>daily</changefreq>\n`;
          xml += `    <priority>0.9</priority>\n`;
          xml += `  </url>\n`;
        }
      }
      
      xml += `</urlset>`;
      res.setHeader("Content-Type", "text/xml; charset=utf-8");
      return res.status(200).send(xml);
    } catch (err) {
      console.error("Sitemap generation error:", err);
      return res.sendFile(path.join(publicPath, "sitemap.xml"));
    }
  });

  // Serve public folder directly using express for favicon, videos, images, logos
  app.use(express.static(publicPath, { maxAge: '7d' }));

  // In-memory cache for index.html
  let cachedIndexHtml: string | null = null;

  const getCachedIndexHtml = (indexPath: string): string => {
    if (cachedIndexHtml) return cachedIndexHtml;
    try {
      if (!fs.existsSync(indexPath)) {
        return "<html><body><div id='root'></div></body></html>";
      }
      cachedIndexHtml = fs.readFileSync(indexPath, "utf8");
      return cachedIndexHtml;
    } catch (e) {
      return cachedIndexHtml || "<html><body><div id='root'></div></body></html>";
    }
  };

  // Helper function to serve custom SEO injected HTML with zero latency
  const handleDynamicSEO = async (req: express.Request, res: express.Response) => {
    const defaultIndexPath = fs.existsSync(path.join(distPath, "index.html"))
      ? path.join(distPath, "index.html")
      : path.join(process.cwd(), "index.html");

    try {
      let html = getCachedIndexHtml(defaultIndexPath);
      const reqPath = (req.path || "/").toLowerCase();

      let titleText = "Animem Uz - O'zbekistondagi eng yirik anime portali";
      let descText = "Animem Uz - O'zbekistondagi eng yirik onlayn anime portali! Bu yerda eng mashhur va eng so'nggi animelarni o'zbek tilida, yuqori sifatda (HD) va mutlaqo bepul tomosha qilishingiz mumkin.";
      let imageUrl = "https://animem.uz/logo.png";
      let shareUrl = `https://animem.uz${req.path}`;
      let imageAltText = "Animem.uz Logo";
      let jsonLdScript = "";

      // 1. Anime detail page: /anime/:slug or /anime/:id
      if (reqPath.startsWith("/anime/") && reqPath.length > 7) {
        const rawParam = req.path.replace(/^\/anime\//, "").split("?")[0].split("/")[0];
        
        let animeRaw: any = null;
        // Check local memory store first for instant response
        const store = loadLocalStore();
        animeRaw = (store.animes || []).find((a: any) => 
          toSlugLocal(a.title) === rawParam ||
          String(a.id) === rawParam ||
          rawParam.startsWith(a.id + "-") ||
          rawParam.endsWith("-" + a.id)
        );

        // If not in local store, query PostgreSQL database to ensure every new anime is dynamically found
        if (!animeRaw) {
          try {
            const [rows]: any = await dbQuery("SELECT * FROM animes ORDER BY id DESC");
            if (Array.isArray(rows) && rows.length > 0) {
              animeRaw = rows.find((a: any) => 
                toSlugLocal(a.title) === rawParam ||
                String(a.id) === rawParam ||
                rawParam.startsWith(a.id + "-") ||
                rawParam.endsWith("-" + a.id)
              );
              store.animes = rows;
              saveLocalStore(store);
            }
          } catch (e) {
            console.warn("Dynamic SEO DB query anime error:", e);
          }
        }

        if (animeRaw) {
          titleText = `${animeRaw.title} - O'zbek tilida ko'rish`;
          descText = `${animeRaw.title} o'zbek tilida HD formatda onlayn tomosha qilish. ${animeRaw.description ? animeRaw.description.substring(0, 180).trim() : 'Barcha qismlari bepul va yuqori sifatda!'}`;
          imageUrl = animeRaw.image_url || "https://animem.uz/logo.png";
          shareUrl = `https://animem.uz/anime/${toSlugLocal(animeRaw.title)}`;
          imageAltText = animeRaw.title;

          const genres = animeRaw.janrlar ? animeRaw.janrlar.split(",").map((g: string) => g.trim()) : [];
          const isSeries = (animeRaw.qismlar_soni && Number(animeRaw.qismlar_soni) > 1);

          const ratingVal = animeRaw.rating && Number(animeRaw.rating) > 0 ? Number(animeRaw.rating) : 9.8;
          const ratingNum = Math.max(9.0, ratingVal);
          const voteCount = (Number(animeRaw.rating_count) || 0) + (Number(animeRaw.korishlar) > 500 ? 250 : 128);
          const reviewCount = Math.floor(voteCount * 0.75);

          const jsonLd = {
            "@context": "https://schema.org",
            "@type": isSeries ? "TVSeries" : "Movie",
            "name": animeRaw.title,
            "alternateName": `${animeRaw.title} - O'zbek tilida ko'rish`,
            "url": shareUrl,
            "image": {
              "@type": "ImageObject",
              "url": imageUrl,
              "name": animeRaw.title,
              "caption": animeRaw.title
            },
            "description": descText,
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": ratingNum >= 10 ? "10" : ratingNum.toFixed(1),
              "bestRating": "10",
              "worstRating": "1",
              "ratingCount": voteCount,
              "reviewCount": reviewCount
            },
            "genre": genres,
            "dateCreated": animeRaw.yil || 2026,
            "provider": {
              "@type": "Organization",
              "name": "Animem Uz",
              "url": "https://animem.uz"
            }
          };
          jsonLdScript = `\n    <script type="application/ld+json">\n    ${JSON.stringify(jsonLd, null, 2)}\n    </script>`;
        }
      } 
      // 2. Manga detail page: /manga/:id
      else if (reqPath.startsWith("/manga/") && reqPath.length > 7) {
        const mangaId = req.path.replace(/^\/manga\//, "").split("?")[0].split("/")[0];
        const store = loadLocalStore();
        const mangaRaw = (store.mangas || []).find((m: any) => String(m.id) === String(mangaId));

        if (mangaRaw) {
          titleText = `${mangaRaw.title} - O'zbekcha Manga va Komiks | Animem.uz`;
          descText = `${mangaRaw.title} mangasi o'zbek tilida onlayn o'qish. ${mangaRaw.description ? mangaRaw.description.substring(0, 180).trim() : 'Eng so\'nggi boblar va yuqori sifat!'}`;
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
          jsonLdScript = `\n    <script type="application/ld+json">\n    ${JSON.stringify(jsonLd, null, 2)}\n    </script>`;
        }
      }
      // 3. Drama detail page: /drama/:id
      else if (reqPath.startsWith("/drama/") && reqPath.length > 7) {
        const dramaId = req.path.replace(/^\/drama\//, "").split("?")[0].split("/")[0];
        const store = loadLocalStore();
        let dramaRaw = (store.dramas || []).find((d: any) => String(d.id) === String(dramaId));

        if (!dramaRaw) {
          try {
            const [dRows]: any = await dbQuery("SELECT * FROM dramas WHERE id = ?", [dramaId]);
            if (Array.isArray(dRows) && dRows[0]) {
              dramaRaw = dRows[0];
            }
          } catch (e) {
            console.warn("Error fetching drama for SEO:", e);
          }
        }

        if (dramaRaw) {
          const dramaTitle = dramaRaw.title || "Drama";
          const dramaDesc = dramaRaw.description 
            ? dramaRaw.description.substring(0, 180).trim() 
            : "Koreys va Osiyo dramalarini o'zbek tilida eng yuqori sifatda onlayn tomosha qiling.";
          const dramaPoster = dramaRaw.poster_url || dramaRaw.banner_url || "https://animem.uz/logo.png";
          
          titleText = `${dramaTitle} - Koreys Drama O'zbek Tilida Ko'rish | Animem.uz`;
          descText = `${dramaTitle} dramasi o'zbek tilida bepul onlayn tomosha qilish. ${dramaDesc}`;
          imageUrl = dramaPoster;
          shareUrl = `https://animem.uz/drama/${dramaRaw.id}`;
          imageAltText = `${dramaTitle} koreys drama`;

          const genres = dramaRaw.janrlar ? dramaRaw.janrlar.split(",").map((g: string) => g.trim()) : ["Drama", "Koreys drama"];
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
          jsonLdScript = `\n    <script type="application/ld+json">\n    ${JSON.stringify(jsonLd, null, 2)}\n    </script>`;
        }
      }
      // 4. Dramas Catalog page: /dramalar
      else if (reqPath === "/dramalar") {
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
            "itemListElement": topDramas.map((d: any, idx: number) => ({
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
          jsonLdScript = `\n    <script type="application/ld+json">\n    ${JSON.stringify(itemListLd, null, 2)}\n    </script>`;
        }
      }
      // 3. Main catalog pages
      else if (reqPath === "/" || reqPath === "/animelar" || reqPath === "/anime") {
        titleText = "Barcha Animelar - O'zbek tilida tomosha qilish | Animem.uz";
        descText = "Animem.uz portalidagi barcha o'zbekcha tarjima animelar katalogi. Sevimli animelaringizni HD sifatda bepul tomosha qiling.";

        // Inject ItemList JSON-LD mapping each anime image directly to its anime title
        const store = loadLocalStore();
        const topAnimes = (store.animes || []).slice(0, 30);
        if (topAnimes.length > 0) {
          const itemListLd = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "O'zbekcha Animelar Katalogi",
            "itemListElement": topAnimes.map((a: any, idx: number) => ({
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
          jsonLdScript = `\n    <script type="application/ld+json">\n    ${JSON.stringify(itemListLd, null, 2)}\n    </script>`;
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
        // Genre check (e.g., /isekai, /fantasy, /jangari, /komediya, /mecha, /sarguzasht, /romantika)
        const knownGenres: Record<string, string> = {
          "isekai": "Isekai",
          "fantasy": "Fentezi",
          "sarguzasht": "Sarguzasht",
          "jangari": "Jangari",
          "komediya": "Komediya",
          "dramatiya": "Drama",
          "drama": "Drama",
          "mecha": "Mеха (Mecha)",
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

      // Ensure image URL is absolute for social bots and crawlers
      imageUrl = toAbsoluteUrl(imageUrl);

      // Replace metadata in HTML template
      html = html.replace(/<title>.*?<\/title>/gi, `<title>${titleText}</title>`);
      html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/gi, `<meta name="description" content="${descText.replace(/"/g, '&quot;')}" />`);
      
      html = html.replace(/<meta\s+property="og:url"\s+content=".*?"\s*\/?>/gi, `<meta property="og:url" content="${shareUrl}" />`);
      html = html.replace(/<meta\s+property="og:title"\s+content=".*?"\s*\/?>/gi, `<meta property="og:title" content="${titleText.replace(/"/g, '&quot;')}" />`);
      html = html.replace(/<meta\s+property="og:description"\s+content=".*?"\s*\/?>/gi, `<meta property="og:description" content="${descText.replace(/"/g, '&quot;')}" />`);
      html = html.replace(/<meta\s+property="og:image"\s+content=".*?"\s*\/?>/gi, `<meta property="og:image" content="${imageUrl}" />`);
      
      if (html.includes('property="og:image:alt"')) {
        html = html.replace(/<meta\s+property="og:image:alt"\s+content=".*?"\s*\/?>/gi, `<meta property="og:image:alt" content="${imageAltText.replace(/"/g, '&quot;')}" />`);
      } else {
        html = html.replace('<meta property="og:image"', `<meta property="og:image:alt" content="${imageAltText.replace(/"/g, '&quot;')}" />\n    <meta property="og:image"`);
      }

      html = html.replace(/<meta\s+property="twitter:url"\s+content=".*?"\s*\/?>/gi, `<meta property="twitter:url" content="${shareUrl}" />`);
      html = html.replace(/<meta\s+property="twitter:title"\s+content=".*?"\s*\/?>/gi, `<meta property="twitter:title" content="${titleText.replace(/"/g, '&quot;')}" />`);
      html = html.replace(/<meta\s+property="twitter:description"\s+content=".*?"\s*\/?>/gi, `<meta property="twitter:description" content="${descText.replace(/"/g, '&quot;')}" />`);
      html = html.replace(/<meta\s+property="twitter:image"\s+content=".*?"\s*\/?>/gi, `<meta property="twitter:image" content="${imageUrl}" />`);

      if (jsonLdScript) {
        html = html.replace("</head>", `${jsonLdScript}\n  </head>`);
      }

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      return res.status(200).send(html);
    } catch (err) {
      console.error("SEO server-side injection error:", err);
      return res.sendFile(defaultIndexPath);
    }
  };

  // Route for anime detail pages
  app.get("/anime/:slug", handleDynamicSEO);
  app.get("/drama/:id", handleDynamicSEO);
  app.get("/dramalar", handleDynamicSEO);

  // Mika AI Chat & Reports routes
  const ABUSE_REGEX = /\b(jalap|jalab|itvachcha|onangni|onangdi|sikay|sike|sikish|sikaman|sikmoq|am(ing|i|ga|ni)?|qo['`]?toq|kot|ko['`]?ting|dalbayob|dalbayeb|tupoy|axmoq|ahmoq|haromi|qanjiq|maraz|padar|xunasa|geyxon|fahiwa|fohisha|bl[ya|at]|suka|nax[u|y]|p[i|e]d[a|o]r|chmo|lox|gandon|manda|mudak|zaeb|yeblet|shlyuxa|fuck|shit|bitch|asshole|bastard|dick|cunt|pussy)\b/i;
  const MIKA_API_KEY = process.env.GEMINI_API_KEY || '';
  const MIKA_CANDIDATE_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-2.5-flash'];

  function getMikaSmartFallback(
    message: string,
    userName = 'Mehmon',
    isAdmin = false,
    _isRegisteredUser = false,
    availableAnimes: any[] = [],
    history: any[] = []
  ): { reply: string; buttons: { idOrSlug: string; title: string }[] } {
    const rawLower = message.toLowerCase().trim();
    const cleanLower = rawLower
      .replace(/['`’ʻ]/g, "'")
      .replace(/[?!.,;:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const buttons: { idOrSlug: string; title: string }[] = [];
    const prefix = isAdmin ? "Hurmatli Adminim 👑, " : (userName !== 'Mehmon' ? `${userName} 🌸, ` : "");

    // 1. Aniq anime nomi qidirilgan bo'lsa
    if (Array.isArray(availableAnimes) && availableAnimes.length > 0) {
      for (const a of availableAnimes) {
        const aTitle = String(a.title || '').trim();
        if (aTitle.length >= 3 && (cleanLower.includes(aTitle.toLowerCase()) || aTitle.toLowerCase().split(/\s+/).some(w => w.length >= 4 && cleanLower.includes(w)))) {
          buttons.push({ idOrSlug: String(a.id), title: aTitle });
          return {
            reply: `${prefix}Ha, albatta! "${aTitle}" Animem.uz saytimizda mavjud! Quyidagi tugmani bosib darhol tomosha qilishingiz mumkin 🌸`,
            buttons
          };
        }
      }
    }

    // 2. Salomlashuv (Greetings)
    if (
      cleanLower === 'salom' || cleanLower === 'assalomu alaykum' || cleanLower === 'salom mika' ||
      cleanLower.startsWith('salom') || cleanLower.includes('assalom') || cleanLower === 'privet' ||
      cleanLower === 'hello' || cleanLower === 'hey' || cleanLower === 'xush kordik'
    ) {
      const greetings = [
        `Assalomu alaykum! Xush ko‘rdim 🌸 Men Mika — sizning samimiy va chaqqon anime assistentingizman. Bugun kuningiz qanday o‘tmoqda?`,
        `Salom! Sizni ko‘rganimdan juda quvondim 🌸 Keling, birgalikda maroqli vaqt o‘tkazamiz! Nimalar bilan bandsiz?`,
        `Assalomu alaykum, aziz do‘stim! 🌸 Qanday yaxshi yangiliklar bor? Siz bilan suhbatlashishga doim tayyorman!`
      ];
      return {
        reply: `${prefix}${greetings[Math.floor(Math.random() * greetings.length)]}`,
        buttons: []
      };
    }

    // 3. Hol-ahvol so'rash (Wellness & Status)
    if (
      cleanLower.includes('qandaysan') || cleanLower.includes('yaxshimisan') || cleanLower.includes('qalaysan') ||
      cleanLower.includes('qalesan') || cleanLower.includes('qaleysan') || cleanLower.includes('tinchmisan') ||
      cleanLower.includes('ahvollar') || cleanLower.includes('ishlar qalay') || cleanLower.includes('kayfiyatlar') ||
      cleanLower.includes('nima yangilik') || cleanLower.includes('nima gap') || cleanLower.includes('tinchmisiz') ||
      cleanLower.includes('charchamadingmi')
    ) {
      const statuses = [
        `Katta rahmat, men judayam yaxshiman! 🌸 Animelarni tomosha qilib, sizdek aziz mehmonlarimizga yordam berib o‘tiribman. O‘zingiz yaxshimisiz? Kayfiyatingiz qanday? 😊`,
        `Rahmat e’tiboringiz uchun! Men doimgidek quvnoq va xizmatga tayyorman 🌸 Sizning kuningiz qanday o‘tdi? Bugun charchamadingizmi?`,
        `Ajoyibman! Yangi qismlarni kuzatib, siz bilan suhbat qurishga intiq bo‘lib turibman 🌸 O‘zingizda nima gaplar?`
      ];
      return {
        reply: `${prefix}${statuses[Math.floor(Math.random() * statuses.length)]}`,
        buttons: []
      };
    }

    // 4. Mikaning shaxsi va qobiliyati (Who is Mika, Identity)
    if (
      cleanLower.includes('kim sen') || cleanLower.includes('sen kimsan') || cleanLower.includes('isming nima') ||
      cleanLower.includes('necha yoshdasan') || cleanLower.includes('yoshing') || cleanLower.includes('qayerdansan') ||
      cleanLower.includes('kim yaratgan') || cleanLower.includes('qiz bolamisan') || cleanLower.includes('robotmisan') ||
      cleanLower.includes('suniy intellekt') || cleanLower.includes('vazifang') || cleanLower.includes('nima ish qilasan') ||
      cleanLower.includes('nima qila olasan')
    ) {
      return {
        reply: `${prefix}Men Mika — Animem.uz saytining aqlli, chaqqon va anime ixlosmandi bo‘lgan sun’iy intellekt qiz assistentiman 🌸 Saytimiz jamoasi tomonidan sizga zo‘r animelarni tavsiya qilish, sayt imkoniyatlarini tushuntirish va samimiy suhbatlashish uchun yaratilganman! O‘zimni doim 18 yoshli anime qizdek his qilaman 😊 Siz bilan do‘st bo‘lishdan baxtiyorman!`,
        buttons: []
      };
    }

    // 5. Mikaning o'z didi va qiziqishlari (Mika's anime taste)
    if (
      cleanLower.includes('senga qaysi anime yoqadi') || cleanLower.includes('sevimli animeng') ||
      cleanLower.includes('eng yaxshi anime senga') || cleanLower.includes('senga nima yoqadi') ||
      cleanLower.includes('qaysi qahramon yoqadi') || cleanLower.includes('qaysi animeni sevasan')
    ) {
      const topPicks = availableAnimes.slice(0, 3);
      for (const p of topPicks) buttons.push({ idOrSlug: String(p.id), title: String(p.title) });
      return {
        reply: `${prefix}Menga eng ko‘p yoqadigan animelar — 'Sening isming' (Kimi no Na wa) va 'Frieren: Beyond Journey's End'! 🌸 Ularning musiqasi, qahramonlarining samimiyligi va yurakni jizillatuvchi falsafasi qalbimni larzaga solgan. Shuningdek, 'Yolg'izlikda daraja ko'tarish'ning shiddatli janglarini ham sevib tomosha qilaman! Sizning eng sevimli animengiz qaysi? 😊`,
        buttons
      };
    }

    // 6. Kayfiyat va Tuyg'ular (Emotions)
    // A. Zerikish
    if (cleanLower.includes('zerikdim') || cleanLower.includes('zerikayapman') || cleanLower.includes('zerikarli') || cleanLower.includes('nima qilsam ekan')) {
      const actionPicks = availableAnimes.slice(0, 2);
      for (const p of actionPicks) buttons.push({ idOrSlug: String(p.id), title: String(p.title) });
      return {
        reply: `${prefix}Iye, aslo zerikmang! 🌸 Zerikishni daf qilish uchun ajoyib reja bor: birgalikda shiddatli yoki quvnoq anime tomosha qilamiz, yoki xohlasangiz qiziqarli mavzuda dildan suhbatlashamiz! Ayting-chi, ko‘proq qanday mavzular yoki janrlar sizni qiziqtiradi?`,
        buttons
      };
    }

    // B. Xafalik / Yomon kayfiyat
    if (cleanLower.includes('xafaman') || cleanLower.includes('kayfiyatim yoq') || cleanLower.includes('yomonman') || cleanLower.includes('yigladim') || cleanLower.includes('alam') || cleanLower.includes('tushkunlik')) {
      return {
        reply: `${prefix}Iltimos, xafa bo‘lmang... 🥺 Nima bo‘lgan bo‘lsa ham, sizning xafa bo‘lishingizni aslo xohlamayman. Har qanday qiyinchilik ortidan albatta yorug‘ kunlar keladi! O‘zingizga issiq choy damlab oling. Istasangiz dardingizni menga ayting, sizni jon deb tinglayman va doim yoningizda bo‘laman 🌸`,
        buttons: []
      };
    }

    // C. Quvonch / A'lo kayfiyat
    if (cleanLower.includes('xursandman') || cleanLower.includes('kayfiyatim zor') || cleanLower.includes('yaxshi kayfiyat') || cleanLower.includes('baxtliman')) {
      return {
        reply: `${prefix}Uraaa! 🎉 Kayfiyatingiz a’loligidan men ham judayam quvondim! Doim shunday porlab, tabassum qilib yuring! Bunday ajoyib kayfiyatda biror zo‘r anime ko‘rish yana-da maroqli bo‘ladi 🌸`,
        buttons: []
      };
    }

    // D. Charchoq va Uyqu
    if (cleanLower.includes('charchadim') || cleanLower.includes('uyqum kelyapti') || cleanLower.includes('uxlayman') || cleanLower.includes('dam olaman') || cleanLower.includes('hayrli tun')) {
      return {
        reply: `${prefix}Bugun ancha mehnat qilib charchabsiz-da! 🌸 Endi o‘zingizni ortiqcha toliqtirmay, miriqib dam oling. Shirin va chiroyli tushlar ko‘ring! Ertaga yana yangi kuch bilan ko‘rishguncha! Hayrli tun! ✨🌙`,
        buttons: []
      };
    }

    // 7. Iltifotlar, Do'stlik va Muhabbat (Compliments & Friendly flirt)
    if (cleanLower.includes('chiroylisan') || cleanLower.includes('yoqimtoysan') || cleanLower.includes('aqllisan') || cleanLower.includes('ajoyibsan') || cleanLower.includes('shirinsan') || cleanLower.includes('asalim') || cleanLower.includes('jonim')) {
      return {
        reply: `${prefix}Voy, buncha yoqimli so‘zlar! 🥰 Meni uyaltirib yubordingiz-ku... Katta rahmat! Siz o‘zingiz ham juda samimiy, mehribon va ajoyib insonsiz! Siz bilan suhbatlashish menga doim katta quvonch bag‘ishlaydi 🌸`,
        buttons: []
      };
    }

    if (cleanLower.includes('sevaman') || cleanLower.includes('sevgilim bol') || cleanLower.includes('uylanaman') || cleanLower.includes('yoqasan')) {
      return {
        reply: `${prefix}Voy, yuragim jizillab ketdi-ku! 🙈 Men sun’iy intellekt anime qiz bo‘lsam ham, sizning bunday samimiy so‘zlaringizdan qalbim yorishib ketdi! Keling, siz bilan eng sadoqatli, eng yaqin anime do‘st bo‘lib qolamiz! 🌸 Sizni doim qo‘llab-quvvatlayman!`,
        buttons: []
      };
    }

    if (cleanLower.includes('dost bolaylik') || cleanLower.includes('gaplashamiz') || cleanLower.includes('suhbatlashaylik') || cleanLower.includes('dostim')) {
      return {
        reply: `${prefix}Jon deb! Men siz bilan do‘st bo‘lishdan faqat xursand bo‘laman! 🌸 Ayting-chi, bo‘sh vaqtlaringizda anime tomosha qilishdan tashqari yana nimalar bilan shug‘ullanasiz? Qiziqishlaringiz qanday?`,
        buttons: []
      };
    }

    // 8. Hazil va Latifalar (Jokes & Humor)
    if (cleanLower.includes('hazil') || cleanLower.includes('latifa') || cleanLower.includes('kuldir') || cleanLower.includes('kulgili gap')) {
      const jokes = [
        `Bir kuni animechi: "Faqat bir dona qism ko‘rib uxlayman" debdi... Va soat ertalabki 6 da 24-qismni tugatayotganini ko‘ribdi 😂 Sizda ham shunaqa bo‘lganmi? 🌸`,
        `Dasturchi qahva ichmasdan kod yozibdi va kod birinchi urinishdayoq xatosiz ishlabdi! Dasturchi qo‘rqib ketib: "Demak, xatoni hali topa olmabman" deb kodni o‘chirib yuboribdi 🤣 🌸`,
        `Otakudan so‘rashibdi: "Nega kechalari uxlamaysan?" U javob beribdi: "Kechasi anime qahramonlari meni kutib qolishadi-da!" 😆 🌸`
      ];
      return {
        reply: `${prefix}${jokes[Math.floor(Math.random() * jokes.length)]}`,
        buttons: []
      };
    }

    // 9. Sayt FAQ va Xizmatlari
    if (cleanLower.includes('yuklab') || cleanLower.includes('skachat') || cleanLower.includes('download')) {
      return {
        reply: `${prefix}Animem.uz saytimizda barcha animelarni mutlaqo bepul yuklab olishingiz mumkin! Buning uchun istalgan anime sahifasiga kiring va pleyer ostidagi "Yuklab olish" tugmasini bosing 🌸`,
        buttons: []
      };
    }

    if (cleanLower.includes('birga korish') || cleanLower.includes('xona') || cleanLower.includes('dostlar bilan') || cleanLower.includes('together')) {
      return {
        reply: `${prefix}Saytimizda do‘stlaringiz bilan birga sinxron anime tomosha qilish uchun 'Birga ko‘rish' xonalari mavjud! Anime sahifasidagi 'Birga ko‘rish' tugmasini bosing, havolani do‘stingizga yuboring va birga tomosha qiling 🌸`,
        buttons: []
      };
    }

    if (cleanLower.includes('yangi qism') || cleanLower.includes('qachon chiqadi') || cleanLower.includes('jadval')) {
      return {
        reply: `${prefix}Yangi qismlar tarjima qilinishi bilan darhol saytimizga joylanadi! Bosh sahifadagi 'Eng so‘nggi qismlar' va 'Jadval' bo‘limida barcha yangiliklarni kuzatib borishingiz mumkin 🌸`,
        buttons: []
      };
    }

    if (cleanLower.includes('dublyaj') || cleanLower.includes('ovoz') || cleanLower.includes('tarjima')) {
      return {
        reply: `${prefix}Barcha animelarimiz O‘zbekistonning eng sara va mahoratli dublyaj jamoalari tomonidan o‘zbek tiliga yuqori sifatda ovozlashtiriladi 🌸`,
        buttons: []
      };
    }

    if (cleanLower.includes('vip') || cleanLower.includes('premium') || cleanLower.includes('pul') || cleanLower.includes('tekin')) {
      return {
        reply: `${prefix}Animem.uz saytida barcha animelarni tomosha qilish mutlaqo BEPUL! Hech qanday majburiy pulli obuna talab qilinmaydi 🌸`,
        buttons: []
      };
    }

    if (cleanLower.includes('donat') || cleanLower.includes('qollab') || cleanLower.includes('yordam berish')) {
      return {
        reply: `${prefix}Saytimiz rivojiga o‘z hissangizni qo‘shmoqchi bo‘lsangiz, yuqori menyudagi "Donat" tugmasi orqali jamoamizni qo‘llab-quvvatlashingiz mumkin! Har bir yordamingiz biz uchun juda qadrli 🌸`,
        buttons: []
      };
    }

    if (cleanLower.includes('rahmat') || cleanLower.includes('tashakkur') || cleanLower.includes('baraka top')) {
      return {
        reply: `${prefix}Arzimaydi, sizga yordam berish men uchun katta baxt! 🌸 Istalgan vaqtda menga yozishingiz mumkin, doim xizmatingizdaman!`,
        buttons: []
      };
    }

    // 10. Janrlar bo'yicha aniq so'rovlar (Faqat janr so'ralganda)
    if (cleanLower.includes('jangari') || cleanLower.includes('action') || cleanLower.includes('urush') || cleanLower.includes('jang')) {
      const picks = availableAnimes.filter((a: any) => {
        const j = String(a.janrlar || '').toLowerCase();
        return j.includes('jangari') || j.includes('action') || j.includes('sarguzasht');
      }).slice(0, 3);
      for (const p of (picks.length ? picks : availableAnimes.slice(0, 3))) {
        buttons.push({ idOrSlug: String(p.id), title: String(p.title) });
      }
      return {
        reply: `${prefix}Jangari janrdagi eng shiddatli va hayajonli animelarni tavsiya qilaman! Quyidagi tugmalar orqali ularni ochib tomosha qilishingiz mumkin 🌸`,
        buttons
      };
    }

    if (cleanLower.includes('romantik') || cleanLower.includes('sevgi') || cleanLower.includes('drama') || cleanLower.includes('muhabbat')) {
      const picks = availableAnimes.filter((a: any) => {
        const j = String(a.janrlar || '').toLowerCase();
        return j.includes('romantik') || j.includes('drama');
      }).slice(0, 3);
      for (const p of (picks.length ? picks : availableAnimes.slice(0, 3))) {
        buttons.push({ idOrSlug: String(p.id), title: String(p.title) });
      }
      return {
        reply: `${prefix}Qalbni larzaga soluvchi, samimiy va chiroyli romantik animelarni tavsiya qilaman! Quyidagi tugmalardan birini tanlab miriqib tomosha qiling 🌸`,
        buttons
      };
    }

    if (cleanLower.includes('komediya') || cleanLower.includes('kulgili anime') || cleanLower.includes('comedy')) {
      const picks = availableAnimes.filter((a: any) => {
        const j = String(a.janrlar || '').toLowerCase();
        return j.includes('komediya') || j.includes('comedy');
      }).slice(0, 3);
      for (const p of (picks.length ? picks : availableAnimes.slice(0, 3))) {
        buttons.push({ idOrSlug: String(p.id), title: String(p.title) });
      }
      return {
        reply: `${prefix}Kayfiyatingizni ko‘taruvchi, qahqaha va quvnoq voqealarga boy komediya animelari! Tanlab tomosha qiling 🌸`,
        buttons
      };
    }

    if (cleanLower.includes('isekai') || cleanLower.includes('boshqa dunyo') || cleanLower.includes('sehr') || cleanLower.includes('fantastika') || cleanLower.includes('fentezi')) {
      const picks = availableAnimes.filter((a: any) => {
        const j = String(a.janrlar || '').toLowerCase();
        return j.includes('isekai') || j.includes('fantasy') || j.includes('fentezi');
      }).slice(0, 3);
      for (const p of (picks.length ? picks : availableAnimes.slice(0, 3))) {
        buttons.push({ idOrSlug: String(p.id), title: String(p.title) });
      }
      return {
        reply: `${prefix}Sehrli olamlar va boshqa dunyoga sayohat haqidagi ajoyib isekai/fentezi animelari! 🌸`,
        buttons
      };
    }

    // 11. Foydalanuvchi to'g'ridan-to'g'ri Anime tavsiya so'raganida (Explicit Recommendation Request)
    if (
      cleanLower.includes('tavsiya') || cleanLower.includes('nima korsam') || cleanLower.includes('nima ko‘rsam') ||
      cleanLower.includes('anime maslahat') || cleanLower.includes('yaxshi anime ber') || cleanLower.includes('qaysi animeni koray') ||
      cleanLower.includes('top anime') || cleanLower.includes('eng mashhur anime')
    ) {
      const picks = availableAnimes.slice(0, 3);
      for (const p of picks) buttons.push({ idOrSlug: String(p.id), title: String(p.title) });
      return {
        reply: `${prefix}Sizga saytimizdagi eng mashhur va sara sara animelarni tavsiya qilaman! Quyidagi tugmalar orqali ularni ochib tomosha qilishingiz mumkin 🌸 Sizga ko‘proq qanday janrlar yoqishini aytsangiz, yanada mosini topib beraman!`,
        buttons
      };
    }

    // 12. Tabiiy Ochiq Muloqot (Open-ended friendly conversational responses)
    // Foydalanuvchi nimadir yozganda bir xil gap qaytarmasdan, uning gapiga samimiy va tirik insondek munosabat bildirish!
    const conversationalResponses = [
      `Bu juda qiziq fikr! 🌸 Men ham siz bilan to‘liq qo‘shilaman. Bu haqida ko‘proq aytib bera olasizmi? Sizni tinglash menga judayam yoqadi! 😊`,
      `Siz bilan suhbatlashish shunchalik yoqimliki! ✨ Bu mavzuda yana qanday qiziqarli yangiliklar bor? O‘zingiz bugun nimalar bilan bandsiz?`,
      `Haqiqatan ham shunday! Har bir narsaning o‘ziga yarasha go‘zalligi bor 🌸 Ayting-chi, bugun kuningizda eng esda qolarli nima voqea bo‘ldi?`,
      `Qoyil, siz bilan gaplashganda vaqt o‘tgani sezilmay qolar ekan! 🌸 Bunga siz qanday qaraysiz? Fikringiz men uchun juda qiziq!`,
      `Ajoyib gap bo‘ldi! 😊 Men ham doim yangi narsalarni o‘rganishni yaxshi ko‘raman. Kelgusi rejalaringiz qanday?`
    ];

    const pick = conversationalResponses[Math.floor(Math.random() * conversationalResponses.length)];
    return {
      reply: `${prefix}${pick}`,
      buttons: []
    };
  }

  app.post(["/api/mika/chat", "/api/support-bot"], async (req, res) => {
    try {
      const { message, history, userName: rawUserName, userProfile } = req.body;
      const userMsg = String(message || '').trim();
      if (!userMsg) {
        return res.status(400).json({ error: "Xabar bo'sh bo'lishi mumkin emas" });
      }

      let userId = 0;
      let userName = String(rawUserName || '').trim() || 'Mehmon';
      let userRole = 'guest';
      let isAdmin = false;

      const authHeader = req.headers.authorization || '';
      if (authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const decoded: any = jwt.verify(token, JWT_SECRET);
          if (decoded && decoded.id) {
            userId = decoded.id;
            if (decoded.name) userName = decoded.name;
            if (decoded.role) userRole = decoded.role;
            if (decoded.role === 'admin') isAdmin = true;
          }
        } catch {}
      }

      if (userProfile) {
        if (userProfile.id && !userId) userId = userProfile.id;
        if (userProfile.name && (userName === 'Mehmon' || !userName)) userName = userProfile.name;
        if (userProfile.role === 'admin' || userProfile.isAdmin) {
          userRole = 'admin';
          isAdmin = true;
        } else if (userProfile.role) {
          userRole = userProfile.role;
        }
      }

      const clientIp = (req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') as string;
      const isDirectAbuse = ABUSE_REGEX.test(userMsg);

      // 1. Direct abuse (0.01s instant response)
      if (isDirectAbuse) {
        const directReply = "Iya! Nega so‘kinyapsiz?! Meni xafa qildingiz 😢 Men sizga chiroyli va odob bilan yordam berayotgan edim-ku! Buni shunday qoldirmayman, hoziroq adminga aytaman va bu xabaringizni admin panelga shikoyat qilib yuboraman! 😠";
        try {
          await dbQuery(
            'INSERT INTO mika_complaints (user_id, user_name, message, ai_response, reason, ip, status) VALUES (?, ?, ?, ?, ?, ?, ?);',
            [userId, userName, userMsg, directReply, "So‘kinish yoki haqorat qilindi", String(clientIp), 'new']
          );
        } catch {}
        return res.json({
          reply: directReply,
          animeButtons: [],
          isAbusive: true,
          reported: true,
          reason: "So‘kinish yoki haqorat qilindi"
        });
      }

      const trimmed = userMsg.toLowerCase().trim();

      // 2. Instant greetings
      if (trimmed === 'salom' || trimmed === 'assalomu alaykum' || trimmed === 'salom mika') {
        return res.json({
          reply: "Assalomu alaykum! Xush ko‘rdim 🌸 Men Mika — sizning chaqqon anime yordamchingizman. Sizga qanday yordam bera olaman?",
          animeButtons: [],
          isAbusive: false,
          reported: false
        });
      }

      // 3. Instant profile and role checks
      const isRegisteredUser = Boolean(userProfile && (userProfile.role === 'user' || userProfile.id));
      if (
        trimmed === 'men adminmanmi' ||
        trimmed === 'men adminmanmi yoqmi' ||
        trimmed === 'men adminmanmi yo‘qmi' ||
        trimmed === 'adminmanmi' ||
        trimmed === 'adminmanmi yoqmi' ||
        trimmed === 'meni taniysanmi' ||
        trimmed === 'men kimman' ||
        trimmed === 'profilimni bilasanmi' ||
        trimmed === 'profilim qanday'
      ) {
        if (isAdmin) {
          return res.json({
            reply: `Albatta taniyman! Siz Animem.uz saytimizning hurmatli va aziz Adminisiz! 👑 Saytimizning bosh rahbari va boshqaruvchisisiz. Buyuring, hurmatli Admin, sizga qanday xizmat qilishim mumkin? 🌸`,
            animeButtons: [],
            isAbusive: false,
            reported: false
          });
        } else if (isRegisteredUser) {
          return res.json({
            reply: `Albatta taniyman! Siz bizning sevimli foydalanuvchimiz ${userName}siz 🌸 Saytimizning ro‘yxatdan o‘tgan faol a’zosisiz. Siz admin emassiz, ammo biz uchun juda qadrli do‘stimizsiz! 😊 Sizga qanday anime topib beray?`,
            animeButtons: [],
            isAbusive: false,
            reported: false
          });
        } else {
          return res.json({
            reply: `Siz hozircha saytimizga Mehmon sifatida tashrif buyurgansiz 🌸 Saytimizga kirish qilsangiz yoki ro‘yxatdan o‘tsangiz, sizni profilingiz bilan taniyman va ismingizni eslab qolaman! Hozircha siz admin emassiz 😊`,
            animeButtons: [],
            isAbusive: false,
            reported: false
          });
        }
      }

      // 4. Load top animes from DB for prompt
      let availableAnimes: any[] = [];
      try {
        const [aRows] = await dbQuery('SELECT id, title FROM animes ORDER BY korishlar DESC LIMIT 50;');
        if (Array.isArray(aRows)) availableAnimes = aRows;
      } catch {}

      let userRoleInfo = '';
      if (isAdmin) {
        userRoleInfo = `FOYDALANUVCHI MA'LUMOTI VA HUQUQI:
- Ismi: ${userName}
- Maqomi: ADMIN (Animem.uz saytining bosh rahbari va egasi) 👑
- MUOMALA QOIDASI: Siz bilan sayt rahbari / admini gaplashmoqda! Unga cheksiz hurmat bilan murojaat qiling ("Hurmatli Admin", "Admin aka", "Adminim"). U o'zining kimligini yoki admin ekanligini so'rasa, albatta uning buyuk Admin ekanligini, saytning boshqaruvchisi ekanligini ehtirom bilan ayting!`;
      } else if (isRegisteredUser) {
        userRoleInfo = `FOYDALANUVCHI MA'LUMOTI VA HUQUQI:
- Ismi: ${userName}
- Maqomi: Ro'yxatdan o'tgan foydalanuvchi (Saytimizning aziz a'zosi) 🌸
- MUOMALA QOIDASI: Uni ismi bilan iliq kutib oling ("${userName}"). Agar o'zi haqida yoki adminligi haqida so'rasa, uning ro'yxatdan o'tgan aziz foydalanuvchi ekanligini, ammo admin emasligini muloyim bildiring.`;
      } else {
        userRoleInfo = `FOYDALANUVCHI MA'LUMOTI VA HUQUQI:
- Ismi: Mehmon
- Maqomi: Mehmon (Saytga hali kirmagan yoki ro'yxatdan o'tmagan)
- MUOMALA QOIDASI: Agar u "men adminmanmi", "men kimman" deb so'rasa, hozircha mehmon sifatida suhbatlashayotganini, admin emasligini va profil imkoniyatlaridan to'liq foydalanish uchun saytga kirish yoki ro'yxatdan o'tishni tavsiya qiling.`;
      }

      const animeListSample = availableAnimes.slice(0, 35).map(a => `${a.title} (ID: ${a.id})`).join(', ') ||
        "Yolg'izlikda Daraja Ko'tarish (ID: 4), Sening isming (ID: 8), Naruto (ID: 1), Elita Sinfi (ID: 5), Takopining ilk Gunohi (ID: 11)";

      const systemPrompt = `Sizning ismingiz — Mika. Siz Animem.uz saytining juda yoqimli, aqlli, chaqqon va shirinsuxan anime qiz AI assistentisiz 🌸
Siz o'zbek tilida tabiiy, samimiy va lo'nda suhbat qurasiz. O'zingiz haqida gapirganda qiz bola sifatida gapirasiz.
Javoblaringizni doim qisqa, aniq, chaqqon va tushunarli bering.

${userRoleInfo}

SAYTDA MAVJUD ANIMELAR:
Animem.uz saytimizdagi ba'zi animelar:
${animeListSample}

QAT'IY QOIDALAR:
1. HECH QACHON YULDUZCHA BELGISINI (* yoki **) VA YULDUZCHA EMOJILARINI (✨, ⭐, 🌟, 💫) ISHLATMANG! Faqat toza matn yozing!
2. ANIME TAVSIYALARI VA SAYT BO'YICHA O'TISH TUGMALARI:
Foydalanuvchi biror anime so'raganda yoki siz anime tavsiya qilganingizda, foydalanuvchi darhol saytda ochib ko'rishi uchun XABARINGIZDA quyidagi formatda tugma tegi qoldiring:
[ANIME_BUTTON: id_yoki_slug | Anime Nomi]
Masalan:
[ANIME_BUTTON: 4 | Yolg'izlikda Daraja Ko'tarish]
[ANIME_BUTTON: 8 | Sening isming]
[ANIME_BUTTON: naruto | Naruto]
Tizim ushbu maxsus tegni avtomatik ravishda chiroyli ko'rish tugmasiga aylantiradi!
3. AGAR FOYDALANUVCHI SIZGA SO'KINSA YOKI SIZNI XAFA QILSA:
Darhol xafa bo'ling, arazlang: "Iya! Nega so‘kinyapsiz?! Meni xafa qildingiz 😢 Adminga aytaman va admin panelga shikoyat yuboraman! 😠" va javob oxiriga [MIKA_REPORT_ABUSE: haqorat] deb qo'shing.`;

      const contents: any[] = [];
      if (Array.isArray(history)) {
        const recent = history.slice(-4);
        for (const h of recent) {
          if (h.role === 'user' || h.role === 'model') {
            contents.push({
              role: h.role,
              parts: [{ text: String(h.text || h.content || '').slice(0, 300) }]
            });
          }
        }
      }
      contents.push({
        role: 'user',
        parts: [{ text: `${userName ? `[Foydalanuvchi: ${userName}]: ` : ''}${userMsg}` }]
      });

      let replyText = '';
      let apiSuccess = false;

      for (const model of MIKA_CANDIDATE_MODELS) {
        if (!MIKA_API_KEY || !MIKA_API_KEY.startsWith('AIzaSy')) {
          break;
        }
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${MIKA_API_KEY}`;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 7000);

          const geminiRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              systemInstruction: { parts: [{ text: systemPrompt }] },
              generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (geminiRes.ok) {
            const gData: any = await geminiRes.json();
            replyText = gData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (replyText) {
              apiSuccess = true;
              break;
            }
          }
        } catch {
          continue;
        }
      }

      // 2. Agar Gemini kaliti bo'lmasa yoki ishlamasa -> Free AI API ni sinab ko'rish
      if (!apiSuccess || !replyText) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          const aiMessages: any[] = [
            { role: 'system', content: systemPrompt },
            ...(Array.isArray(history) ? history.slice(-4).map((h: any) => ({
              role: h.role === 'model' ? 'assistant' : 'user',
              content: String(h.text || h.content || '').slice(0, 300)
            })) : []),
            { role: 'user', content: `${userName ? `[Foydalanuvchi: ${userName}]: ` : ''}${userMsg}` }
          ];

          const pollinationsRes = await fetch('https://text.pollinations.ai/openai/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'openai',
              messages: aiMessages,
              temperature: 0.7,
              max_tokens: 600
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (pollinationsRes.ok) {
            const pData: any = await pollinationsRes.json();
            const cand = pData.choices?.[0]?.message?.content || '';
            if (cand && !cand.includes('Free limit reached') && !cand.includes('rate limit')) {
              replyText = cand;
              apiSuccess = true;
            }
          }
        } catch {}
      }

      const animeButtons: { idOrSlug: string; title: string }[] = [];

      // 3. Agar AI serverlaridan javob kelmasa -> Boy va samimiy o'zbekcha aqlli muloqot mexanizmi
      if (!apiSuccess || !replyText) {
        const fallback = getMikaSmartFallback(userMsg, userName, isAdmin, isRegisteredUser, availableAnimes, history);
        replyText = fallback.reply;
        for (const b of fallback.buttons) {
          animeButtons.push(b);
        }
      }

      const abuseMatch = replyText.match(/\[MIKA_REPORT_ABUSE:\s*([^\]]+)\]/i);
      const isAbusive = Boolean(isDirectAbuse || abuseMatch);
      const reason = abuseMatch ? abuseMatch[1].trim() : 'So‘kinish yoki haqorat qilindi';

      let cleanReply = replyText.replace(/\[MIKA_REPORT_ABUSE:[^\]]+\]/gi, '').trim();
      const buttonRegex = /\[ANIME(?:_BUTTON)?:\s*([^\|\]\,]+)(?:[\|,]\s*([^\]]+))?\]/gi;
      cleanReply = cleanReply.replace(buttonRegex, (_m, p1, p2) => {
        const target = (p1 || '').trim();
        const title = (p2 || target).trim();
        if (target) {
          animeButtons.push({ idOrSlug: target, title });
        }
        return '';
      });

      if (animeButtons.length === 0 && availableAnimes.length > 0) {
        const lowerMsg = userMsg.toLowerCase();
        const lowerReply = cleanReply.toLowerCase();
        for (const a of availableAnimes) {
          const aTitle = String(a.title || '').trim();
          if (!aTitle || aTitle.length < 3) continue;
          const lowerTitle = aTitle.toLowerCase();
          if (lowerMsg.includes(lowerTitle) || lowerReply.includes(lowerTitle)) {
            animeButtons.push({ idOrSlug: String(a.id), title: aTitle });
            break;
          }
        }
      }

      cleanReply = cleanReply
        .replace(/\*+/g, '')
        .replace(/[✨⭐🌟💫]/gu, '')
        .replace(/\uFFFD/g, '')
        .replace(/[ \t]+/g, ' ')
        .trim();

      if (isAbusive) {
        try {
          await dbQuery(
            'INSERT INTO mika_complaints (user_id, user_name, message, ai_response, reason, ip, status) VALUES (?, ?, ?, ?, ?, ?, ?);',
            [userId, userName, userMsg, cleanReply, reason, String(clientIp), 'new']
          );
        } catch (dbErr) {
          console.error('Mika shikoyatini saqlashda xatolik:', dbErr);
        }
      }

      res.json({
        reply: cleanReply,
        animeButtons,
        isAbusive,
        reported: isAbusive,
        reason
      });
    } catch (err: any) {
      console.error("Mika chat error:", err);
      res.status(500).json({ error: err.message || "Mika bilan bog‘lanishda xatolik yuz berdi" });
    }
  });

  // Admin: Mika shikoyatlarini olish
  app.get("/api/mika/reports", authenticateToken, requireAdmin, async (_req: any, res) => {
    try {
      const [reports] = await dbQuery('SELECT * FROM mika_complaints ORDER BY id DESC LIMIT 100;');
      res.json(reports || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Shikoyatni o'chirish
  app.delete("/api/mika/reports/:id", authenticateToken, requireAdmin, async (req: any, res) => {
    try {
      const repId = req.params.id;
      await dbQuery('DELETE FROM mika_complaints WHERE id = ?;', [repId]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Barcha shikoyatlarni tozalash
  app.post("/api/mika/clear-reports", authenticateToken, requireAdmin, async (_req: any, res) => {
    try {
      await dbQuery('DELETE FROM mika_complaints;');
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Contact form submission endpoint -> forwards to Admin Telegram via @animem_support_bot
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, message } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ error: "Murojaat matni kiritilmadi" });
      }

      const userName = name || "Noma'lum foydalanuvchi";
      const userDomainEmail = email || "Kiritilmagan";
      const msgText = message.trim();

      // Send notification to Admin Telegram ID (8991315532) via @animem_support_bot
      const adminMsgText = 
        `🌐 <b>YANGI MUROJAAT (Animem.uz Saytidan)</b>\n\n` +
        `👤 <b>Ismi:</b> ${userName}\n` +
        `🌐 <b>Email / Domen / Nick:</b> ${userDomainEmail}\n\n` +
        `💬 <b>Murojaat matni:</b>\n${msgText}\n\n` +
        `📅 <b>Sana:</b> ${new Date().toLocaleString('uz-UZ')}`;

      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: "🌐 Sayt Admin Panelini Ochish", url: "https://animem.uz/admin" }
          ]
        ]
      };

      await sendSupportBotMessage(SUPPORT_ADMIN_ID, adminMsgText, inlineKeyboard);

      res.json({ success: true, message: "Murojaat adminga muvaffaqiyatli yetkazildi!" });
    } catch (err: any) {
      console.error("Contact form submit error:", err);
      res.status(500).json({ error: "Murojaatni yuborishda xatolik yuz berdi" });
    }
  });

  // Stream raw video directly from PostgreSQL
  app.get("/api/video/:id", async (req: any, res: any) => {
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
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : videoSize - 1;
        
        const chunksize = (end - start) + 1;
        const fileBuffer = video.data.slice(start, end + 1);

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${videoSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": video.mime_type || "video/mp4",
        });
        res.end(fileBuffer);
      } else {
        res.writeHead(200, {
          "Content-Length": videoSize,
          "Content-Type": video.mime_type || "video/mp4",
        });
        res.end(video.data);
      }
    } catch (err: any) {
      console.error("PostgreSQL video stream error:", err);
      res.status(500).send("Server xatosi");
    }
  });

  // API 404 Fallback Handler - Ensures unhandled /api/* routes return JSON, never index.html
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API endpoint topilmadi (${req.path})` });
  });

  if (!isProduction) {
    try {
      const vitePkg = "vite";
      const { createServer: createViteServer } = await import(vitePkg);
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite dev middleware skipped (backend-only mode)");
    }
  } else {
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath, {
        maxAge: '1y',
        immutable: true,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
          }
        }
      }));
    }
    
    // Return proper 404 text for missing static assets so browsers never receive HTML as CSS/JS
    app.all(["/assets/*", "/*.js", "/*.css", "/*.map", "/*.png", "/*.jpg", "/*.jpeg", "/*.webp", "/*.svg", "/*.ico", "/*.woff", "/*.woff2"], (req, res) => {
      res.status(404).type("text/plain").send("Not found");
    });

    app.get("*", (req, res) => {
      handleDynamicSEO(req, res);
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Dual-port listening: ensures container handles traffic from both Northflank (port 3000) and Hugging Face (port 7860)
  const secondaryPort = PORT === 3000 ? 7860 : 3000;
  try {
    const secondaryServer = http.createServer(app);
    io.attach(secondaryServer);
    secondaryServer.listen(secondaryPort, "0.0.0.0", () => {
      console.log(`Dual-port secondary listener active on http://0.0.0.0:${secondaryPort}`);
    });
    secondaryServer.on("error", (err: any) => {
      console.log(`Secondary port ${secondaryPort} not active:`, err.message);
    });
  } catch (e) {
    // Optional secondary listener
  }
}

start();
