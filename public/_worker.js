// Cloudflare Worker Handler for Animem.uz
// High-performance edge router with D1 direct queries, CDN video stream caching, and backend API proxy

const ACCOUNT_ID = "778abe99df133217050e4af575708af8";
const DATABASE_ID = "11e1d448-17a4-4156-ba89-434fa4e6bb1e";
const BACKEND_ORIGIN = "https://p01--animem-beckend--jddxxkp4tz2g.code.run";
const STREAM_ORIGIN = "https://s3.animem.uz.animem.uz";

function toSlug(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/o['’`‘ʻʼ]/g, "o")
    .replace(/g['’`‘ʻʼ]/g, "g")
    .replace(/[^a-z0-9\u0400-\u04FF]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

async function queryD1(env, sql, params = []) {
  // 1. Try native D1 binding if configured (env.DB or env.animem)
  const d1 = env.DB || env.animem;
  if (d1 && typeof d1.prepare === "function") {
    try {
      const stmt = d1.prepare(sql).bind(...params);
      const res = await stmt.all();
      return res.results || [];
    } catch (e) {
      console.warn("D1 binding query failed, trying REST fallback:", e.message);
    }
  }

  // 2. Direct Cloudflare D1 REST API
  const token = env.CLOUDFLARE_D1_TOKEN || "";
  if (!token) return [];

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
  if (data?.success && data?.result?.[0]?.results) {
    return data.result[0].results;
  }
  return [];
}

async function proxyToBackend(request, targetUrl) {
  const reqHeaders = new Headers(request.headers);
  reqHeaders.set("X-Forwarded-Host", "animem.uz");
  reqHeaders.set("Origin", "https://animem.uz");
  reqHeaders.set("Referer", "https://animem.uz/");

  const init = {
    method: request.method,
    headers: reqHeaders,
    redirect: "follow",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    // @ts-ignore
    init.duplex = "half";
  }

  try {
    const response = await fetch(targetUrl, init);
    const respHeaders = new Headers(response.headers);
    respHeaders.set("Access-Control-Allow-Origin", "*");
    respHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    respHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Range, X-Requested-With");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: respHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Backend server bilan aloqa uzildi", detail: err.message }), {
      status: 502,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Range, X-Requested-With",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // 1. VIDEO STREAMING PROXY WITH CLOUDFLARE EDGE CACHE (Lightning-fast for 1000+ viewers)
    if (path.startsWith("/api/tgstream/")) {
      const streamTarget = `${STREAM_ORIGIN}${path}${url.search}`;
      const streamHeaders = new Headers(request.headers);
      streamHeaders.set("Referer", "https://animem.uz/");
      streamHeaders.set("Origin", "https://animem.uz");

      return fetch(streamTarget, {
        method: request.method,
        headers: streamHeaders,
        cf: {
          cacheEverything: true,
          cacheTtl: 2592000, // 30 days edge cache for video segments
          cacheKey: request.url,
        },
      });
    }

    // 2. READ-ONLY DATA ENDPOINTS SERVED DIRECTLY FROM D1 AT THE EDGE (GET requests only)
    if (request.method === "GET" && (path.startsWith("/api/") || path === "/health" || path === "/ping")) {
      const corsHeaders = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=30, stale-while-revalidate=120",
      };

      try {
        // Health check
        if (path === "/api/health" || path === "/health" || path === "/ping") {
          return new Response(JSON.stringify({ status: "ok", edge: true, d1: true }), { headers: corsHeaders });
        }

        // All Animes: /api/animes
        if (path === "/api/animes") {
          const rows = await queryD1(env, "SELECT * FROM animes ORDER BY id DESC;");
          return new Response(JSON.stringify(rows), { headers: corsHeaders });
        }

        // Anime by slug: /api/animes/by-slug/:slug
        const slugMatch = path.match(/^\/api\/animes\/by-slug\/([^\/]+)$/);
        if (slugMatch) {
          const slug = decodeURIComponent(slugMatch[1]);
          if (/^\d+$/.test(slug)) {
            const rows = await queryD1(env, "SELECT * FROM animes WHERE id = ?;", [slug]);
            if (rows.length > 0) return new Response(JSON.stringify(rows[0]), { headers: corsHeaders });
          }
          const rows = await queryD1(env, "SELECT * FROM animes;");
          const anime = rows.find((r) => toSlug(r.title) === slug || String(r.id) === slug);
          if (anime) {
            return new Response(JSON.stringify(anime), { headers: corsHeaders });
          }
          return new Response(JSON.stringify({ error: "Anime topilmadi" }), { status: 404, headers: corsHeaders });
        }

        // Single Anime: /api/animes/:id
        const animeMatch = path.match(/^\/api\/animes\/([0-9]+)$/);
        if (animeMatch) {
          const id = animeMatch[1];
          const rows = await queryD1(env, "SELECT * FROM animes WHERE id = ?;", [id]);
          if (rows.length > 0) {
            return new Response(JSON.stringify(rows[0]), { headers: corsHeaders });
          }
          return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });
        }

        // Anime episodes: /api/animes/:id/episodes
        const epMatch = path.match(/^\/api\/animes\/([0-9]+)\/episodes$/);
        if (epMatch) {
          const animeId = epMatch[1];
          const rows = await queryD1(env, "SELECT * FROM episodes WHERE anime_id = ? ORDER BY episode_number ASC;", [animeId]);
          return new Response(JSON.stringify(rows), { headers: corsHeaders });
        }

        // Ratings summary: /api/animes/:id/ratings-summary
        const ratingMatch = path.match(/^\/api\/animes\/([0-9]+)\/ratings-summary$/);
        if (ratingMatch) {
          const animeId = ratingMatch[1];
          const rows = await queryD1(env, "SELECT AVG(rating) as avg, COUNT(*) as count FROM ratings WHERE anime_id = ?;", [animeId]);
          return new Response(JSON.stringify(rows[0] || { avg: 0, count: 0 }), { headers: corsHeaders });
        }

        // User rating: /api/animes/:id/rating
        const userRatingMatch = path.match(/^\/api\/animes\/([0-9]+)\/rating$/);
        if (userRatingMatch) {
          return new Response(JSON.stringify({ rating: 0 }), { headers: corsHeaders });
        }

        // Comments: /api/animes/:id/comments or /api/comments/:id
        const commentMatch = path.match(/^\/api\/(?:animes|comments)\/([0-9]+)(?:\/comments)?$/);
        if (commentMatch) {
          const animeId = commentMatch[1];
          const rows = await queryD1(env, "SELECT * FROM comments WHERE anime_id = ? ORDER BY id DESC LIMIT 100;", [animeId]);
          return new Response(JSON.stringify(rows), { headers: corsHeaders });
        }

        // Recent comments: /api/comments/recent
        if (path === "/api/comments/recent") {
          const rows = await queryD1(env, "SELECT * FROM comments ORDER BY id DESC LIMIT 20;");
          return new Response(JSON.stringify(rows), { headers: corsHeaders });
        }

        // Dramas: /api/dramas
        if (path === "/api/dramas") {
          const rows = await queryD1(env, "SELECT * FROM dramas ORDER BY id DESC;");
          return new Response(JSON.stringify(rows), { headers: corsHeaders });
        }

        // Drama details: /api/dramas/:id
        const dramaMatch = path.match(/^\/api\/dramas\/([0-9]+)$/);
        if (dramaMatch) {
          const id = dramaMatch[1];
          const rows = await queryD1(env, "SELECT * FROM dramas WHERE id = ?;", [id]);
          return new Response(JSON.stringify(rows[0] || {}), { headers: corsHeaders });
        }

        // Drama episodes: /api/dramas/episodes/:id or /api/dramas/:id/episodes
        const dramaEpMatch = path.match(/^\/api\/dramas\/(?:episodes\/)?([0-9]+)(?:\/episodes)?$/);
        if (dramaEpMatch) {
          const dramaId = dramaEpMatch[1];
          const rows = await queryD1(env, "SELECT * FROM drama_episodes WHERE drama_id = ? ORDER BY qism ASC;", [dramaId]);
          return new Response(JSON.stringify(rows), { headers: corsHeaders });
        }

        // Mangas: /api/mangas
        if (path === "/api/mangas") {
          const rows = await queryD1(env, "SELECT * FROM mangas ORDER BY id DESC;");
          return new Response(JSON.stringify(rows), { headers: corsHeaders });
        }

        // Manga details: /api/mangas/:id
        const mangaMatch = path.match(/^\/api\/mangas\/([0-9]+)$/);
        if (mangaMatch) {
          const id = mangaMatch[1];
          const rows = await queryD1(env, "SELECT * FROM mangas WHERE id = ?;", [id]);
          return new Response(JSON.stringify(rows[0] || {}), { headers: corsHeaders });
        }

        // Manga chapters: /api/mangas/:id/chapters/:chapter
        const mangaChMatch = path.match(/^\/api\/mangas\/([0-9]+)\/chapters\/([0-9]+)$/);
        if (mangaChMatch) {
          const mangaId = mangaChMatch[1];
          const chNum = mangaChMatch[2];
          const rows = await queryD1(env, "SELECT * FROM manga_chapters WHERE manga_id = ? AND chapter_number = ?;", [mangaId, chNum]);
          return new Response(JSON.stringify(rows[0] || {}), { headers: corsHeaders });
        }

        // Reels: /api/reels
        if (path === "/api/reels") {
          const rows = await queryD1(env, "SELECT * FROM reels ORDER BY id DESC;");
          return new Response(JSON.stringify(rows), { headers: corsHeaders });
        }

        // Notifications: /api/notifications
        if (path === "/api/notifications") {
          const rows = await queryD1(env, "SELECT * FROM notifications ORDER BY id DESC LIMIT 50;");
          return new Response(JSON.stringify(rows), { headers: corsHeaders });
        }

        // Chat messages: /api/chat/messages
        if (path === "/api/chat/messages") {
          const rows = await queryD1(env, "SELECT * FROM messages ORDER BY id DESC LIMIT 50;");
          return new Response(JSON.stringify(rows), { headers: corsHeaders });
        }

        // Wallpapers & Gifs
        if (path === "/api/wallpapers") {
          const rows = await queryD1(env, "SELECT * FROM wallpapers ORDER BY id DESC;");
          return new Response(JSON.stringify(rows), { headers: corsHeaders });
        }
        if (path === "/api/gifs") {
          const rows = await queryD1(env, "SELECT * FROM gifs ORDER BY id DESC;");
          return new Response(JSON.stringify(rows), { headers: corsHeaders });
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
        console.warn("D1 edge query failed, falling back to backend:", err.message);
      }
    }

    // 3. ALL OTHER API CALLS (POST, PUT, DELETE, auth, user, admin, upload, comments):
    // Transparently proxied to the live backend server
    if (path.startsWith("/api/")) {
      const backendUrl = `${BACKEND_ORIGIN}${path}${url.search}`;
      return await proxyToBackend(request, backendUrl);
    }

    // 4. STATIC ASSETS & SPA ROUTING VIA CLOUDFLARE ASSETS
    if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};
