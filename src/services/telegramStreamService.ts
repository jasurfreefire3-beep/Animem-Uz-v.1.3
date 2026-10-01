import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage } from 'telegram/events';
import bigInt from 'big-integer';

const TG_API_ID = 6;
const TG_API_HASH = 'eb06d4abfb49dc3eeb1aeb98ae0f581e';
const TG_BOT_TOKEN = process.env.TG_STREAM_BOT_TOKEN || '8969080492:AAFeXz93y6CjIBv0AmdlfVlE0N53gf_J6gY';

// Pre-authenticated session for instant DC2 connection without migration delay
const TG_SESSION_STRING = process.env.TG_STREAM_SESSION || '1AgAOMTQ5LjE1NC4xNjcuNDEBu30uNOaBQLU22V0MXKVZoObcNXax7nTKozcB0RlXOOPgo0yxdmYpNvV5lN3qDdtQzhlbQsEYDfy3HAJ3jr4btcM9Ygb2B1gEALErqrInQi3uHKDN+z51q6z3jvD+nbtJtqOc4/vSuiGOGkz5C0LloWicsd9I0LAHyL5wW18UsAuiWBr1FLkXbM+Eq+bhPmEgX/KD5Ofzu2Gr1KAatMAxHKNpl/iGmiVhCfNoJUs1X84eNLYbfQyDh6taDDYslILSWzLM3en66TXkiDCgX+a02C/Ik0bdXMgunjuxXqsrkbpmxAbrUSYwm/Ri1SnDQVvJon0TVwgDbPYHbpxdybjcNwI=';

let client: TelegramClient | null = null;
let isInitializing = false;

interface MediaMetadata {
  document: any;
  fileName: string;
  size: number;
  mimeType: string;
  duration: number;
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

  return {
    document: doc,
    fileName,
    size,
    mimeType,
    duration,
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
    const session = new StringSession(TG_SESSION_STRING);
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

      const streamUrl = `https://animem.uz/api/tgstream/${cleanChannelId}/${messageId}`;

      const replyHtml = 
        `🎬 <b>Video Muvaffaqiyatli Qabul Qilindi!</b>\n\n` +
        `📁 <b>Fayl:</b> <code>${mediaInfo.fileName}</code>\n` +
        `⚖️ <b>Hajmi:</b> <b>${formatBytes(mediaInfo.size)}</b>\n` +
        `⏱ <b>Davomiyligi:</b> ${formatDuration(mediaInfo.duration)}\n\n` +
        `🔗 <b>Sayt uchun Video URL (Direct Stream):</b>\n` +
        `<code>${streamUrl}</code>\n\n` +
        `💡 <i>Ushbu havolani nusxalab, Animem.uz sayti Admin panelidagi qism "video_url" maydoniga qo'yishingiz mumkin. Sayt pleyerida darhol qotmasdan o'ynaydi!</i>`;

      await tgClient.sendMessage(message.chatId, {
        message: replyHtml,
        parseMode: 'html',
        replyTo: messageId
      });

      console.log(`[Telegram Streamer] Replied with stream URL for message #${messageId} in channel ${cleanChannelId}`);
    } catch (err: any) {
      console.warn('[Telegram Streamer] Error handling incoming video message:', err?.message || err);
    }
  }, new NewMessage({}));
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
  try {
    const meta = await getStreamMetadata(channelId, messageId);
    if (!meta || !meta.document) {
      res.status(404).json({ error: "Video topilmadi yoki o'chirilgan" });
      return;
    }

    const totalSize = meta.size;
    const mimeType = meta.mimeType || 'video/mp4';
    const cleanId = channelId.replace(/^-100/, '').replace(/^-/, '');
    const cacheKey = `${cleanId}_${messageId}`;
    const headKey = `${cacheKey}_head`;

    const rangeHeader = req.headers.range;

    // CORS & Player headers
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
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
        }
      }
    }

    if (start >= totalSize || end >= totalSize || start > end) {
      res.status(416).setHeader('Content-Range', `bytes */${totalSize}`).end();
      return;
    }

    // Limit maximum chunk size per HTTP response (e.g. 4 MB) for fast responsiveness and smooth seeking
    const MAX_CHUNK = 4 * 1024 * 1024;
    if (!rangeHeader || !rangeHeader.split('-')[1]) {
      end = Math.min(start + MAX_CHUNK - 1, totalSize - 1);
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

    // Fast-start optimization: Check if head buffer is already cached
    if (start === 0 && end <= 2 * 1024 * 1024 && videoHeadCache.has(headKey)) {
      const cachedHead = videoHeadCache.get(headKey)!;
      if (cachedHead.length >= chunkSize) {
        res.end(cachedHead.subarray(0, chunkSize));
        return;
      }
    }

    const tgClient = await getTelegramClient();

    let isAborted = false;
    req.on('close', () => {
      isAborted = true;
    });

    const downloadStream = tgClient.iterDownload({
      file: meta.document,
      offset: bigInt(start),
      limit: chunkSize,
      chunkSize: 512 * 1024,
      requestSize: 512 * 1024,
    });

    const receivedChunks: Buffer[] = [];

    for await (const chunk of downloadStream) {
      if (isAborted || res.writableEnded || res.destroyed) {
        break;
      }
      res.write(chunk);

      // Cache the first 2 MB head chunk for other users
      if (start === 0 && receivedChunks.reduce((acc, c) => acc + c.length, 0) < 2 * 1024 * 1024) {
        receivedChunks.push(chunk);
      }
    }

    if (start === 0 && receivedChunks.length > 0 && !videoHeadCache.has(headKey)) {
      videoHeadCache.set(headKey, Buffer.concat(receivedChunks));
    }

    if (!res.writableEnded) {
      res.end();
    }
  } catch (err: any) {
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
