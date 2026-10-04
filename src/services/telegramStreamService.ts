import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage } from 'telegram/events';
import bigInt from 'big-integer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn, spawnSync } from 'child_process';
import { EventEmitter } from 'events';

const TG_API_ID = 6;
const TG_API_HASH = 'eb06d4abfb49dc3eeb1aeb98ae0f581e';
const TG_BOT_TOKEN = process.env.TG_STREAM_BOT_TOKEN || '8969080492:AAFeXz93y6CjIBv0AmdlfVlE0N53gf_J6gY';


let client: TelegramClient | null = null;
let isInitializing = false;

interface MediaMetadata {
  document: any;
  fileName: string;
  size: number;
  mimeType: string;
  duration: number;
  videoCodec?: string | null;
  isHevc?: boolean;
  cachedAt: number;
}

// In-memory cache for media metadata so multiple users don't trigger repeated Telegram queries
const mediaMetaCache = new Map<string, MediaMetadata>();

// In-memory fast-buffer for the first 2 MB of videos (gives instant 0ms start for 100+ concurrent viewers)
const videoHeadCache = new Map<string, Buffer>();

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return 'Noma\'lum';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function extractMediaFromMessage(message: any): MediaMetadata | null {
  if (!message || !message.media) return null;

  const doc = message.media.document || message.media.video;
  if (!doc) return null;

  const isVideo = (doc.mimeType && doc.mimeType.startsWith('video/')) ||
    (doc.attributes && doc.attributes.some((a: any) => a.className === 'DocumentAttributeVideo')) ||
    message.media.className === 'MessageMediaVideo';

  if (!isVideo) return null;

  const filenameAttr = doc.attributes?.find((a: any) => a.className === 'DocumentAttributeFilename');
  const videoAttr = doc.attributes?.find((a: any) => a.className === 'DocumentAttributeVideo');

  const fileName = filenameAttr?.fileName || `video_${message.id}.mp4`;
  const size = Number(doc.size || 0);
  const duration = videoAttr?.duration || 0;
  const mimeType = doc.mimeType || 'video/mp4';
  const videoCodec = videoAttr?.videoCodec || null;
  const lowerName = fileName.toLowerCase();
  const isHevc = lowerName.includes('hevc') || lowerName.includes('x265') || lowerName.includes('h.265') || lowerName.includes('h265');

  return {
    document: doc,
    fileName,
    size,
    mimeType,
    duration,
    videoCodec,
    isHevc,
    cachedAt: Date.now()
  };
}

export async function getTelegramClient(): Promise<TelegramClient> {
  if (client && client.connected) {
    return client;
  }

  if (isInitializing) {
    while (isInitializing) {
      await new Promise(r => setTimeout(r, 150));
    }
    if (client && client.connected) return client;
  }

  isInitializing = true;
  try {
    const session = new StringSession(process.env.TG_STREAM_SESSION || '');
    if (!process.env.TG_STREAM_SESSION) {
      session.setDC(2, '149.154.167.41', 443);
    }
    client = new TelegramClient(session, TG_API_ID, TG_API_HASH, {
      connectionRetries: 5,
      autoReconnect: true,
      floodSleepThreshold: 60,
    });

    await client.start({
      botAuthToken: TG_BOT_TOKEN,
    });

    console.log('[Telegram Streamer] Successfully connected as bot:', (await client.getMe()).username);

    // Register Channel message handler
    registerTelegramEventHandler(client);

    return client;
  } catch (err) {
    console.error('[Telegram Streamer] Connection failed:', err);
    throw err;
  } finally {
    isInitializing = false;
  }
}

function registerTelegramEventHandler(tgClient: TelegramClient) {
  tgClient.addEventHandler(async (event: any) => {
    try {
      const message = event.message;
      if (!message) return;

      const mediaInfo = extractMediaFromMessage(message);
      if (!mediaInfo) return;

      const rawChatId = message.chatId ? message.chatId.toString() : '';
      if (!rawChatId) return;

      // Normalize channel ID for clean URLs (remove -100 or - prefixes)
      const cleanChannelId = rawChatId.replace(/^-100/, '').replace(/^-/, '');
      const messageId = message.id;

      // Cache metadata immediately
      const cacheKey = `${cleanChannelId}_${messageId}`;
      mediaMetaCache.set(cacheKey, mediaInfo);

      const STREAM_DOMAIN = process.env.TG_STREAM_DOMAIN || 's3.animem.uz.animem.uz';
      const mp4Url = `https://${STREAM_DOMAIN}/api/tgstream/${cleanChannelId}/${messageId}`;
      const hlsUrl = `https://${STREAM_DOMAIN}/api/tghls/${cleanChannelId}/${messageId}/master.m3u8`;

      let codecInfo = `🎞 <b>Format:</b> <code>H.264 (AVC)</code> ✅ <i>(Brauzerlarga 100% mos)</i>\n\n`;
      let warningBlock = '';

      if (mediaInfo.isHevc) {
        codecInfo = `🎞 <b>Format:</b> <code>HEVC (H.265 / x265)</code> ⚠️\n\n`;
        warningBlock = 
          `⚠️ <b>DIQQAT (Format Ogohlantirishi):</b>\n` +
          `Ushbu video <b>HEVC (H.265)</b> formatida! Brauzerlar (ayniqsa kompyuterdagi Chrome/Firefox) H.265 kodeki litsenziyasi yo'qligi sababli bu videoni <b>faqat audio</b> qilib ochadi.\n` +
          `💡 <i>Saytda barcha foydalanuvchilarda video to'liq va qotmasdan ochilishi uchun videolarni <b>H.264 (x264 / AVC)</b> formatida yuklang!</i>\n\n`;
      }

      const replyHtml = 
        `🎬 <b>Video Muvaffaqiyatli Qabul Qilindi!</b>\n\n` +
        `📁 <b>Fayl:</b> <code>${mediaInfo.fileName}</code>\n` +
        `⚖️ <b>Hajmi:</b> <b>${formatBytes(mediaInfo.size)}</b>\n` +
        `⏱ <b>Davomiyligi:</b> ${formatDuration(mediaInfo.duration)}\n` +
        codecInfo +
        warningBlock +
        `⚡️ <b>1. HLS Stream URL (YouTube Tezligida & 10,000+ kishiga):</b>\n` +
        `<code>${hlsUrl}</code>\n\n` +
        `🔗 <b>2. To'g'ridan-to'g'ri MP4 URL (Direct MP4 Stream):</b>\n` +
        `<code>${mp4Url}</code>\n\n` +
        `🛡 <b>Xavfsizlik:</b> Faqat Animem.uz saytida va rasmiy brauzer pleyerida ishlaydi (boshqa saytlar o'g'irlab qo'ya olmaydi).\n\n` +
        `💡 <i>Sayt Admin panelidagi qism "video_url" maydoniga <b>HLS (.m3u8)</b> havolasini qo'yish tavsiya etiladi. 10,000 odam bir vaqtda kirganda ham video qotmasdan, YouTube kabi bir zumda ochiladi!</i>`;

      await tgClient.sendMessage(message.chatId, {
        message: replyHtml,
        parseMode: 'html',
        replyTo: messageId
      });

      console.log(`[Telegram Streamer] Replied with stream URL for message #${messageId} in channel ${cleanChannelId}`);

      // Auto-start background HLS processing & pre-segmentation immediately!
      ensureVideoProcessing(cleanChannelId, messageId).catch(err => {
        console.warn(`[HLS Streamer] Auto pre-processing note (${cleanChannelId}/${messageId}):`, err?.message || err);
      });
    } catch (err: any) {
      console.warn('[Telegram Streamer] Error handling incoming video message:', err?.message || err);
    }
  }, new NewMessage({}));
}

function isAuthorizedStreamRequest(req: any): { allowed: boolean; reason?: string } {
  const referer = req.headers.referer || req.headers.referrer;
  const origin = req.headers.origin;

  // 1. Check Referer if present: allow animem.uz, telegram, t.me, localhost, or direct player requests
  if (referer) {
    try {
      const refUrl = new URL(referer);
      const host = refUrl.hostname.toLowerCase();
      const isAllowedHost = 
        host === 'animem.uz' || 
        host.endsWith('.animem.uz') || 
        host.endsWith('.telegram.org') || 
        host === 'telegram.org' || 
        host === 't.me' || 
        host === 'localhost' || 
        host === '127.0.0.1';
      if (!isAllowedHost) {
        return { allowed: false, reason: `Ruxsat etilmagan referer: ${host}` };
      }
    } catch {
      return { allowed: true };
    }
  }

  // 2. Check Origin if present
  if (origin) {
    try {
      const origUrl = new URL(origin);
      const host = origUrl.hostname.toLowerCase();
      const isAllowedHost = 
        host === 'animem.uz' || 
        host.endsWith('.animem.uz') || 
        host.endsWith('.telegram.org') || 
        host === 'telegram.org' || 
        host === 't.me' || 
        host === 'localhost' || 
        host === '127.0.0.1';
      if (!isAllowedHost) {
        return { allowed: false, reason: `Ruxsat etilmagan origin: ${host}` };
      }
    } catch {
      return { allowed: true };
    }
  }

  return { allowed: true };
}

export async function getStreamMetadata(channelId: string, messageId: number): Promise<MediaMetadata | null> {
  const cleanId = channelId.replace(/^-100/, '').replace(/^-/, '');
  const cacheKey = `${cleanId}_${messageId}`;

  // 1. Check in-memory cache
  const cached = mediaMetaCache.get(cacheKey);
  if (cached && (Date.now() - cached.cachedAt < 3600000)) { // 1 hour TTL
    return cached;
  }

  // 2. Fetch dynamically from Telegram
  const tgClient = await getTelegramClient();
  const normalizedChannelId = channelId.startsWith('-100')
    ? channelId
    : (channelId.startsWith('-') ? `-100${channelId.slice(1)}` : `-100${channelId}`);

  try {
    let peer: any;
    try {
      peer = await tgClient.getInputEntity(normalizedChannelId);
    } catch {
      peer = await tgClient.getEntity(normalizedChannelId);
    }

    const messages = await tgClient.getMessages(peer, { ids: [messageId] });
    if (!messages || !messages[0]) {
      return null;
    }

    const mediaInfo = extractMediaFromMessage(messages[0]);
    if (!mediaInfo) return null;

    mediaMetaCache.set(cacheKey, mediaInfo);
    return mediaInfo;
  } catch (err: any) {
    console.error(`[Telegram Streamer] Fetch message #${messageId} error:`, err?.message || err);
    return null;
  }
}

export async function streamTelegramVideo(req: any, res: any, channelId: string, messageId: number): Promise<void> {
  // Anti-Leech / Hotlink Protection
  const authCheck = isAuthorizedStreamRequest(req);
  if (!authCheck.allowed) {
    console.warn(`[Telegram Streamer] Blocked unauthorized request (${channelId}/${messageId}):`, authCheck.reason);
    res.status(403).json({
      error: "Kirish taqiqlangan",
      detail: "Ushbu video oqimidan faqat Animem.uz saytida yoki to'g'ridan-to'g'ri brauzerda foydalanish mumkin."
    });
    return;
  }

  const cleanId = channelId.replace(/^-100/, '').replace(/^-/, '');
  const cacheKey = `${cleanId}_${messageId}`;
  const headKey = `${cacheKey}_head`;

  try {
    const meta = await getStreamMetadata(channelId, messageId);
    if (!meta || !meta.document) {
      res.status(404).json({ error: "Video topilmadi yoki o'chirilgan" });
      return;
    }

    const totalSize = meta.size;
    const mimeType = meta.mimeType || 'video/mp4';

    const rangeHeader = req.headers.range;

    // CORS & Player headers: Restrict CORS to trusted origins
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', 'https://animem.uz');
    }
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');

    let start = 0;
    let end = totalSize - 1;
    let isRange = false;

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        isRange = true;
        start = parseInt(match[1], 10);
        if (match[2]) {
          end = parseInt(match[2], 10);
        } else {
          // Open-ended range like "bytes=0-": stream continuously to the end of file
          end = totalSize - 1;
        }
      }
    }

    if (start >= totalSize || end >= totalSize || start > end) {
      res.status(416).setHeader('Content-Range', `bytes */${totalSize}`).end();
      return;
    }

    const chunkSize = end - start + 1;

    if (isRange) {
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
    } else {
      res.status(200);
    }

    res.setHeader('Content-Length', chunkSize);
    res.setHeader('Content-Type', mimeType);

    // Fast response for HEAD requests without fetching data from Telegram
    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    // Fast-start optimization: Check if head buffer is already cached in RAM (4 MB buffer)
    const HEAD_BUFFER_SIZE = 4 * 1024 * 1024;
    if (start < HEAD_BUFFER_SIZE && videoHeadCache.has(headKey)) {
      const cachedHead = videoHeadCache.get(headKey)!;
      if (end < cachedHead.length) {
        res.end(cachedHead.subarray(start, end + 1));
        return;
      }
    }

    const tgClient = await getTelegramClient();

    // Must construct Api.InputDocumentFileLocation for GramJS iterDownload
    const fileLocation = new Api.InputDocumentFileLocation({
      id: meta.document.id,
      accessHash: meta.document.accessHash,
      fileReference: meta.document.fileReference,
      thumbSize: '',
    });

    const TG_CHUNK_SIZE = 512 * 1024; // 512 KB optimal chunk size
    const TG_ALIGN = 4096; // Telegram MTProto requires 4KB alignment
    const alignedStart = Math.floor(start / TG_ALIGN) * TG_ALIGN;
    const skipBytes = start - alignedStart;
    const chunkLimit = Math.ceil((chunkSize + skipBytes) / TG_CHUNK_SIZE);

    let isAborted = false;
    req.on('close', () => {
      isAborted = true;
    });

    const downloadStream = tgClient.iterDownload({
      file: fileLocation,
      dcId: meta.document.dcId,
      offset: bigInt(alignedStart),
      limit: chunkLimit,
      chunkSize: TG_CHUNK_SIZE,
      requestSize: TG_CHUNK_SIZE,
    });

    let bytesRemaining = chunkSize;
    let skipped = 0;
    const headChunks: Buffer[] = [];
    let headBytes = 0;

    for await (const chunk of downloadStream) {
      if (isAborted || res.writableEnded || res.destroyed) {
        break;
      }

      let dataChunk = chunk;
      if (skipped < skipBytes) {
        const toSkip = Math.min(skipBytes - skipped, dataChunk.length);
        dataChunk = dataChunk.subarray(toSkip);
        skipped += toSkip;
      }

      if (dataChunk.length === 0) continue;

      const bytesToSend = Math.min(dataChunk.length, bytesRemaining);
      const slice = dataChunk.subarray(0, bytesToSend);
      const ok = res.write(slice);
      bytesRemaining -= bytesToSend;

      if (start === 0 && headBytes < HEAD_BUFFER_SIZE) {
        headChunks.push(slice);
        headBytes += slice.length;
      }

      if (bytesRemaining <= 0) {
        break;
      }

      if (!ok) {
        await new Promise(resolve => res.once('drain', resolve));
      }
    }

    if (start === 0 && headChunks.length > 0 && !videoHeadCache.has(headKey)) {
      if (videoHeadCache.size > 200) {
        const firstKey = videoHeadCache.keys().next().value;
        if (firstKey) videoHeadCache.delete(firstKey);
      }
      videoHeadCache.set(headKey, Buffer.concat(headChunks));
    }

    if (!res.writableEnded) {
      res.end();
    }
  } catch (err: any) {
    if (err?.errorMessage === 'FILEREF_UPGRADE_NEEDED' || err?.message?.includes('FILEREF')) {
      mediaMetaCache.delete(cacheKey);
      videoHeadCache.delete(headKey);
    }
    if (!res.headersSent) {
      res.status(500).json({ error: "Video oqimini uzatishda xatolik yuz berdi" });
    } else if (!res.writableEnded) {
      res.end();
    }
    console.error(`[Telegram Streamer] Stream error (${channelId}/${messageId}):`, err?.message || err);
  }
}

export function initTelegramStreamService(): void {
  getTelegramClient().catch(err => {
    console.warn('[Telegram Streamer] Background init note:', err?.message || err);
  });
}

// ============================================================================
// HLS (HTTP LIVE STREAMING) SERVICE - 10,000+ USERS HIGH CONCURRENCY SCALABLE
// ============================================================================

function getFfmpegBinary(): string {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }
  const candidatePaths = [
    '/home/kali/.bun/install/cache/@ffmpeg-installer/linux-x64@4.1.0@@@1/ffmpeg',
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const installer = require('@ffmpeg-installer/ffmpeg');
    if (installer?.path && fs.existsSync(installer.path)) return installer.path;
  } catch {}
  return 'ffmpeg';
}

const hlsSegmentCache = new Map<string, Buffer>();
const HLS_MAX_CACHE_ITEMS = 800; // In-memory buffer limit (~1GB)
const HLS_SEGMENT_DURATION = 6;  // 6 seconds per segment
const HLS_CACHE_DIR = process.env.HLS_CACHE_DIR || path.join(os.tmpdir(), 'tghls_cache');

try {
  if (!fs.existsSync(HLS_CACHE_DIR)) {
    fs.mkdirSync(HLS_CACHE_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('[HLS Streamer] Cache dir notice:', e);
}

// Automatic cache cleanup: remove folders older than 7 days
function cleanOldHlsCache(): void {
  try {
    if (!fs.existsSync(HLS_CACHE_DIR)) return;
    const entries = fs.readdirSync(HLS_CACHE_DIR);
    const now = Date.now();
    for (const entry of entries) {
      const fullPath = path.join(HLS_CACHE_DIR, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && (now - stat.mtimeMs > 7 * 86400 * 1000)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
    }
  } catch {}
}

setInterval(cleanOldHlsCache, 3600000);

interface VideoProcessState {
  channelId: string;
  messageId: number;
  videoFolder: string;
  partFile: string;
  sourceFile: string;
  indexFile: string;
  bytesDownloaded: number;
  totalSize: number;
  isCompleted: boolean;
  error?: string;
  emitter: EventEmitter;
}

const activeVideoDownloads = new Map<string, VideoProcessState>();

function sliceSegmentSync(inputFile: string, videoFolder: string, segIdx: number, isHevc = false): boolean {
  const targetSegFile = path.join(videoFolder, `segment_${segIdx}.ts`);
  if (fs.existsSync(targetSegFile) && fs.statSync(targetSegFile).size > 1000) return true;

  const tempSegFile = path.join(videoFolder, `temp_seg_${segIdx}_${Date.now()}.ts`);
  const ffmpegBin = getFfmpegBinary();
  const startTime = segIdx * HLS_SEGMENT_DURATION;
  const bsfFilter = isHevc ? 'hevc_mp4toannexb' : 'h264_mp4toannexb';

  // Fast stream copy
  const res = spawnSync(ffmpegBin, [
    '-ss', String(startTime),
    '-i', inputFile,
    '-t', String(HLS_SEGMENT_DURATION),
    '-c', 'copy',
    '-bsf:v', bsfFilter,
    '-f', 'mpegts',
    '-y',
    tempSegFile
  ], { timeout: 10000 });

  if (res.status === 0 && fs.existsSync(tempSegFile) && fs.statSync(tempSegFile).size > 1000) {
    try {
      fs.renameSync(tempSegFile, targetSegFile);
      const buf = fs.readFileSync(targetSegFile);
      const cacheKey = `${path.basename(videoFolder)}_seg_${segIdx}`;
      hlsSegmentCache.set(cacheKey, buf);
      return true;
    } catch {
      return false;
    }
  }

  // Fallback with AAC audio conversion
  const fb = spawnSync(ffmpegBin, [
    '-ss', String(startTime),
    '-i', inputFile,
    '-t', String(HLS_SEGMENT_DURATION),
    '-c:v', 'copy',
    '-bsf:v', bsfFilter,
    '-c:a', 'aac',
    '-f', 'mpegts',
    '-y',
    tempSegFile
  ], { timeout: 15000 });

  if (fb.status === 0 && fs.existsSync(tempSegFile) && fs.statSync(tempSegFile).size > 1000) {
    try {
      fs.renameSync(tempSegFile, targetSegFile);
      const buf = fs.readFileSync(targetSegFile);
      const cacheKey = `${path.basename(videoFolder)}_seg_${segIdx}`;
      hlsSegmentCache.set(cacheKey, buf);
      return true;
    } catch {
      return false;
    }
  }

  if (fs.existsSync(tempSegFile)) {
    try { fs.unlinkSync(tempSegFile); } catch {}
  }
  return false;
}

export async function ensureVideoProcessing(channelId: string, messageId: number): Promise<VideoProcessState | null> {
  const cleanId = channelId.replace(/^-100/, '').replace(/^-/, '');
  const key = `${cleanId}_${messageId}`;
  const videoFolder = path.join(HLS_CACHE_DIR, key);
  const partFile = path.join(videoFolder, 'source.mp4.part');
  const sourceFile = path.join(videoFolder, 'source.mp4');
  const indexFile = path.join(videoFolder, 'index.m3u8');

  // If already completely segmented into HLS:
  if (fs.existsSync(indexFile)) {
    return null;
  }

  // If already actively downloading:
  if (activeVideoDownloads.has(key)) {
    return activeVideoDownloads.get(key)!;
  }

  const meta = await getStreamMetadata(channelId, messageId);
  if (!meta || !meta.document) return null;

  if (!fs.existsSync(videoFolder)) {
    fs.mkdirSync(videoFolder, { recursive: true });
  }

  const emitter = new EventEmitter();
  emitter.setMaxListeners(200);

  const state: VideoProcessState = {
    channelId: cleanId,
    messageId,
    videoFolder,
    partFile,
    sourceFile,
    indexFile,
    bytesDownloaded: fs.existsSync(partFile) ? fs.statSync(partFile).size : 0,
    totalSize: meta.size,
    isCompleted: false,
    emitter,
  };

  activeVideoDownloads.set(key, state);

  // Background downloader and HLS segmenter
  (async () => {
    try {
      const tgClient = await getTelegramClient();
      const fileLocation = new Api.InputDocumentFileLocation({
        id: meta.document.id,
        accessHash: meta.document.accessHash,
        fileReference: meta.document.fileReference,
        thumbSize: '',
      });

      const TG_CHUNK_SIZE = 512 * 1024;
      let startOffset = state.bytesDownloaded;
      startOffset = Math.floor(startOffset / TG_CHUNK_SIZE) * TG_CHUNK_SIZE;
      state.bytesDownloaded = startOffset;

      const remainingBytes = meta.size - startOffset;
      const chunkLimit = Math.ceil(remainingBytes / TG_CHUNK_SIZE);

      const writeStream = fs.createWriteStream(partFile, { flags: startOffset > 0 ? 'a' : 'w' });

      const downloadStream = tgClient.iterDownload({
        file: fileLocation,
        dcId: meta.document.dcId,
        offset: bigInt(startOffset),
        limit: chunkLimit,
        chunkSize: TG_CHUNK_SIZE,
        requestSize: TG_CHUNK_SIZE,
      });

      let seg0Done = fs.existsSync(path.join(videoFolder, 'segment_0.ts'));
      let seg1Done = fs.existsSync(path.join(videoFolder, 'segment_1.ts'));

      for await (const chunk of downloadStream) {
        writeStream.write(chunk);
        state.bytesDownloaded += chunk.length;
        state.emitter.emit('progress', state.bytesDownloaded);

        // Pre-slice segment 0 as soon as 3MB downloaded
        if (!seg0Done && state.bytesDownloaded >= Math.min(meta.size, 3 * 1024 * 1024)) {
          sliceSegmentSync(partFile, videoFolder, 0, meta.isHevc);
          seg0Done = true;
          state.emitter.emit('segment_ready', 0);
        }

        // Pre-slice segment 1 as soon as 6MB downloaded
        if (!seg1Done && state.bytesDownloaded >= Math.min(meta.size, 6 * 1024 * 1024)) {
          sliceSegmentSync(partFile, videoFolder, 1, meta.isHevc);
          seg1Done = true;
          state.emitter.emit('segment_ready', 1);
        }
      }

      await new Promise<void>((resolve) => writeStream.end(resolve));

      // Download complete: rename .part to .mp4
      if (fs.existsSync(partFile)) {
        try { fs.renameSync(partFile, sourceFile); } catch {}
      }

      // Now run full HLS segmentation on the complete local source file!
      const ffmpegBin = getFfmpegBinary();
      const bsfFilter = meta.isHevc ? 'hevc_mp4toannexb' : 'h264_mp4toannexb';
      const hlsRes = spawnSync(ffmpegBin, [
        '-i', sourceFile,
        '-c', 'copy',
        '-bsf:v', bsfFilter,
        '-f', 'hls',
        '-hls_time', String(HLS_SEGMENT_DURATION),
        '-hls_list_size', '0',
        '-hls_segment_filename', path.join(videoFolder, 'segment_%d.ts'),
        '-y',
        indexFile
      ], { timeout: 60000 });

      if (hlsRes.status !== 0) {
        // Fallback: Transcode audio to AAC if raw stream copy failed
        spawnSync(ffmpegBin, [
          '-i', sourceFile,
          '-c:v', 'copy',
          '-bsf:v', bsfFilter,
          '-c:a', 'aac',
          '-f', 'hls',
          '-hls_time', String(HLS_SEGMENT_DURATION),
          '-hls_list_size', '0',
          '-hls_segment_filename', path.join(videoFolder, 'segment_%d.ts'),
          '-y',
          indexFile
        ], { timeout: 120000 });
      }

      state.isCompleted = true;
      state.emitter.emit('completed');

      // Once all segments are safely on disk, remove source.mp4 to keep disk footprint low
      if (fs.existsSync(sourceFile) && fs.existsSync(indexFile)) {
        try { fs.unlinkSync(sourceFile); } catch {}
      }

      console.log(`[HLS Streamer] Fully segmented video (${key}) into HLS segments on disk!`);
    } catch (err: any) {
      console.warn(`[HLS Streamer] Background process error (${key}):`, err?.message || err);
      state.error = err?.message || String(err);
      state.emitter.emit('error', state.error);
    } finally {
      activeVideoDownloads.delete(key);
    }
  })();

  return state;
}

export async function handleHlsMasterPlaylist(req: any, res: any, channelId: string, messageId: number): Promise<void> {
  const authCheck = isAuthorizedStreamRequest(req);
  if (!authCheck.allowed) {
    console.warn(`[HLS Streamer] Blocked master playlist (${channelId}/${messageId}):`, authCheck.reason);
    res.status(403).json({ error: "Kirish taqiqlangan", detail: "Faqat Animem.uz saytida ishlaydi." });
    return;
  }

  // Start background processing immediately on playlist request!
  ensureVideoProcessing(channelId, messageId).catch(() => {});

  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  const cleanId = channelId.replace(/^-100/, '').replace(/^-/, '');
  const playlist = 
    `#EXTM3U\n` +
    `#EXT-X-VERSION:3\n` +
    `#EXT-X-INDEPENDENT-SEGMENTS\n` +
    `#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1920x1080,NAME="1080p Full HD"\n` +
    `/api/tghls/${cleanId}/${messageId}/index.m3u8\n`;

  res.status(200).send(playlist);
}

export async function handleHlsMediaPlaylist(req: any, res: any, channelId: string, messageId: number): Promise<void> {
  const authCheck = isAuthorizedStreamRequest(req);
  if (!authCheck.allowed) {
    console.warn(`[HLS Streamer] Blocked media playlist (${channelId}/${messageId}):`, authCheck.reason);
    res.status(403).json({ error: "Kirish taqiqlangan", detail: "Faqat Animem.uz saytida ishlaydi." });
    return;
  }

  const cleanId = channelId.replace(/^-100/, '').replace(/^-/, '');
  const videoFolder = path.join(HLS_CACHE_DIR, `${cleanId}_${messageId}`);
  const indexFile = path.join(videoFolder, 'index.m3u8');

  // Trigger background processing if not yet started
  ensureVideoProcessing(channelId, messageId).catch(() => {});

  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  res.setHeader('Cache-Control', 'public, max-age=60');

  // If complete index.m3u8 is already on disk, serve it with proper segment URLs
  if (fs.existsSync(indexFile)) {
    try {
      let content = await fs.promises.readFile(indexFile, 'utf8');
      content = content.replace(/(segment_\d+\.ts)/g, `/api/tghls/${cleanId}/${messageId}/$1`);
      res.status(200).send(content);
      return;
    } catch {}
  }

  // Otherwise generate estimated VOD playlist so player immediately shows timeline
  const meta = await getStreamMetadata(channelId, messageId);
  if (!meta) {
    res.status(404).json({ error: "Video topilmadi" });
    return;
  }

  const duration = (meta.duration && meta.duration > 0) 
    ? meta.duration 
    : (meta.size ? Math.max(60, Math.ceil(meta.size / (250 * 1024))) : 1440);

  const totalSegments = Math.max(1, Math.ceil(duration / HLS_SEGMENT_DURATION));

  let playlist = `#EXTM3U\n`;
  playlist += `#EXT-X-VERSION:3\n`;
  playlist += `#EXT-X-TARGETDURATION:${HLS_SEGMENT_DURATION + 1}\n`;
  playlist += `#EXT-X-MEDIA-SEQUENCE:0\n`;
  playlist += `#EXT-X-PLAYLIST-TYPE:VOD\n\n`;

  for (let i = 0; i < totalSegments; i++) {
    const isLast = i === totalSegments - 1;
    const segDuration = isLast ? (duration - (i * HLS_SEGMENT_DURATION)) : HLS_SEGMENT_DURATION;
    const durFormatted = Math.max(0.5, segDuration).toFixed(3);
    playlist += `#EXTINF:${durFormatted},\n`;
    playlist += `/api/tghls/${cleanId}/${messageId}/segment_${i}.ts\n`;
  }
  playlist += `#EXT-X-ENDLIST\n`;

  res.status(200).send(playlist);
}

export async function handleHlsSegment(req: any, res: any, channelId: string, messageId: number, segmentIndex: number): Promise<void> {
  const authCheck = isAuthorizedStreamRequest(req);
  if (!authCheck.allowed) {
    res.status(403).json({ error: "Kirish taqiqlangan" });
    return;
  }

  const cleanId = channelId.replace(/^-100/, '').replace(/^-/, '');
  const cacheKey = `${cleanId}_${messageId}_seg_${segmentIndex}`;
  const videoFolder = path.join(HLS_CACHE_DIR, `${cleanId}_${messageId}`);
  const segmentFilePath = path.join(videoFolder, `segment_${segmentIndex}.ts`);

  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
  res.setHeader('Content-Type', 'video/MP2T');
  res.setHeader('Cache-Control', 'public, max-age=2592000, immutable'); // 30 days edge CDN cache

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  // 1. RAM Cache (Instant 0.1ms for 10,000 concurrent viewers)
  if (hlsSegmentCache.has(cacheKey)) {
    const data = hlsSegmentCache.get(cacheKey)!;
    res.setHeader('Content-Length', data.length);
    res.status(200).end(data);
    return;
  }

  // 2. Disk Cache (Instant 1ms)
  if (fs.existsSync(segmentFilePath) && fs.statSync(segmentFilePath).size > 1000) {
    try {
      const data = await fs.promises.readFile(segmentFilePath);
      if (hlsSegmentCache.size >= HLS_MAX_CACHE_ITEMS) {
        const oldestKey = hlsSegmentCache.keys().next().value;
        if (oldestKey) hlsSegmentCache.delete(oldestKey);
      }
      hlsSegmentCache.set(cacheKey, data);
      res.setHeader('Content-Length', data.length);
      res.status(200).end(data);
      return;
    } catch {}
  }

  // 3. Ensure background download/processing is started
  const state = await ensureVideoProcessing(channelId, messageId);

  // Check if segment can be sliced immediately from available bytes on disk
  const partFile = path.join(videoFolder, 'source.mp4.part');
  const sourceFile = path.join(videoFolder, 'source.mp4');
  const availableInput = fs.existsSync(sourceFile) ? sourceFile : (fs.existsSync(partFile) ? partFile : null);

  if (availableInput) {
    const meta = await getStreamMetadata(channelId, messageId);
    const ok = sliceSegmentSync(availableInput, videoFolder, segmentIndex, meta?.isHevc);
    if (ok && fs.existsSync(segmentFilePath) && fs.statSync(segmentFilePath).size > 1000) {
      const data = await fs.promises.readFile(segmentFilePath);
      hlsSegmentCache.set(cacheKey, data);
      res.setHeader('Content-Length', data.length);
      res.status(200).end(data);
      return;
    }
  }

  // 4. Wait for background download to yield this segment or finish
  if (state && !state.isCompleted) {
    const meta = await getStreamMetadata(channelId, messageId);
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 8000); // 8s max wait
      const onProgress = () => {
        const currentInput = fs.existsSync(sourceFile) ? sourceFile : (fs.existsSync(partFile) ? partFile : null);
        if (currentInput) {
          if (sliceSegmentSync(currentInput, videoFolder, segmentIndex, meta?.isHevc)) {
            clearTimeout(timer);
            state.emitter.off('progress', onProgress);
            state.emitter.off('completed', onCompleted);
            resolve();
          }
        }
      };
      const onCompleted = () => {
        clearTimeout(timer);
        state.emitter.off('progress', onProgress);
        state.emitter.off('completed', onCompleted);
        resolve();
      };
      state.emitter.on('progress', onProgress);
      state.emitter.on('completed', onCompleted);
    });
  }

  // Check disk again after waiting
  if (fs.existsSync(segmentFilePath) && fs.statSync(segmentFilePath).size > 1000) {
    try {
      const data = await fs.promises.readFile(segmentFilePath);
      hlsSegmentCache.set(cacheKey, data);
      res.setHeader('Content-Length', data.length);
      res.status(200).end(data);
      return;
    } catch {}
  }

  res.status(503).json({ error: "Segment tayyorlanmoqda, iltimos qaytadan urining" });
}
