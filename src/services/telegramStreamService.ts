// Animem.uz - Telegram Stream Service
// All streaming and bot functionality has been migrated to standalone VPS (https://s3.animem.uz)

export const TG_STREAM_DOMAIN = 's3.animem.uz';

export function getStreamUrl(channelId: string | number, messageId: string | number): string {
  const cleanId = String(channelId).replace(/^-100/, '').replace(/^-/, '');
  return `https://${TG_STREAM_DOMAIN}/api/tghls/${cleanId}/${messageId}/master.m3u8`;
}

export function getMp4Url(channelId: string | number, messageId: string | number): string {
  const cleanId = String(channelId).replace(/^-100/, '').replace(/^-/, '');
  return `https://${TG_STREAM_DOMAIN}/api/tgstream/${cleanId}/${messageId}`;
}
