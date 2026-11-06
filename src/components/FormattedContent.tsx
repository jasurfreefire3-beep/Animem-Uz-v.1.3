import React, { useState } from 'react';
import { Play, Users, ExternalLink, X, ZoomIn } from 'lucide-react';

interface FormattedContentProps {
  content: string;
  className?: string;
  imageClassName?: string;
  onTimestampClick?: (seconds: number) => void;
}

// Regex to identify [gif]...[/gif] and [img]...[/img] tags
const MEDIA_TAG_REGEX = /\[(gif|img)\]([\s\S]*?)\[\/\1\]/gi;
const ANIMEM_IMAGE_REGEX = /(https?:\/\/api\.animem\.uz\/i\/[a-zA-Z0-9_-]+)/gi;

// Timestamp parser to seconds (e.g. 01:23 -> 83, 1:15:30 -> 4530)
export function parseTimestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

export function isGifContent(content: string): boolean {
  if (!content || typeof content !== 'string') return false;
  return /\[(gif|img)\][\s\S]*?\[\/\1\]/i.test(content) || 
         ANIMEM_IMAGE_REGEX.test(content) ||
         /https?:\/\/files\.catbox\.moe\/[a-zA-Z0-9_.-]+/i.test(content) ||
         /^\/api\/media\/(?:gif_|img_)[a-zA-Z0-9_-]+/i.test(content.trim()) ||
         /\.(?:gif|webp|png|jpe?g)(?:\?|$)/i.test(content.trim());
}

export function extractGifs(content: string): string[] {
  if (!content || typeof content !== 'string') return [];
  const matches: string[] = [];
  
  let match;
  const tagRegex = /\[(gif|img)\]([\s\S]*?)\[\/\1\]/gi;
  while ((match = tagRegex.exec(content)) !== null) {
    const url = match[2]?.trim();
    if (url && !matches.includes(url)) {
      matches.push(url);
    }
  }
  
  const bareRegex = /(https?:\/\/api\.animem\.uz\/i\/[a-zA-Z0-9_-]+|https?:\/\/files\.catbox\.moe\/[a-zA-Z0-9_.-]+|\/api\/media\/(?:img_|gif_)[a-zA-Z0-9_-]+|https?:\/\/[^\s]+\.(?:gif|webp|png|jpe?g)(?:\?[^\s]*)?)/gi;
  while ((match = bareRegex.exec(content)) !== null) {
    if (!matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }
  
  return matches;
}

export function isWatchRoomUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return /[\?&]room=[a-zA-Z0-9_-]+/i.test(url) || 
         /\/room\/[a-zA-Z0-9_-]+/i.test(url) ||
         /\/watch-room\//i.test(url);
}

interface Segment {
  type: 'text' | 'gif' | 'image' | 'timestamp' | 'link' | 'room_link';
  value: string;
  seconds?: number;
}

export function parseContentSegments(rawContent: string): Segment[] {
  if (!rawContent || typeof rawContent !== 'string') return [];

  // 1. Split by [gif]...[/gif] and [img]...[/img] tags
  const segments: Array<{ type: 'text' | 'gif' | 'image'; value: string }> = [];
  const mediaTagRegex = /\[(gif|img)\]([\s\S]*?)\[\/\1\]/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mediaTagRegex.exec(rawContent)) !== null) {
    const textBefore = rawContent.slice(lastIndex, match.index);
    if (textBefore) {
      segments.push({ type: 'text', value: textBefore });
    }
    const tagType = match[1].toLowerCase() === 'gif' ? 'gif' : 'image';
    const mediaUrl = match[2]?.trim();
    if (mediaUrl) {
      segments.push({ type: tagType, value: mediaUrl });
    }
    lastIndex = match.index + match[0].length;
  }

  const remaining = rawContent.slice(lastIndex);
  if (remaining) {
    segments.push({ type: 'text', value: remaining });
  }

  // 2. Scan text segments for bare media links (catbox, /api/media, .jpg, .png, .gif, .webp)
  const mediaSplitSegments: Array<{ type: 'text' | 'gif' | 'image'; value: string }> = [];
  const bareRegex = /(https?:\/\/api\.animem\.uz\/i\/[a-zA-Z0-9_-]+|https?:\/\/files\.catbox\.moe\/[a-zA-Z0-9_.-]+|\/api\/media\/(?:img_|gif_)[a-zA-Z0-9_.-]+|https?:\/\/[^\s]+\.(?:gif|webp|png|jpe?g)(?:\?[^\s]*)?)/gi;

  for (const seg of segments) {
    if (seg.type === 'gif' || seg.type === 'image') {
      mediaSplitSegments.push(seg);
    } else {
      const parts = seg.value.split(bareRegex);
      for (const part of parts) {
        if (!part) continue;
        if (bareRegex.test(part)) {
          const isGif = part.toLowerCase().includes('.gif') || part.includes('gif_');
          mediaSplitSegments.push({ type: isGif ? 'gif' : 'image', value: part.trim() });
        } else {
          mediaSplitSegments.push({ type: 'text', value: part });
        }
      }
    }
  }

  // 3. Scan text segments for interactive timestamps (e.g. 05:24, 12:45, 1:05:30)
  const timestampSegments: Array<{ type: 'text' | 'gif' | 'image' | 'timestamp'; value: string; seconds?: number }> = [];
  for (const seg of mediaSplitSegments) {
    if (seg.type === 'gif' || seg.type === 'image') {
      timestampSegments.push(seg);
    } else {
      const text = seg.value;
      let textIdx = 0;
      let tsMatch: RegExpExecArray | null;
      const tsRegex = /\b(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)\b/g;

      while ((tsMatch = tsRegex.exec(text)) !== null) {
        const textBefore = text.slice(textIdx, tsMatch.index);
        if (textBefore) {
          timestampSegments.push({ type: 'text', value: textBefore });
        }
        const tsVal = tsMatch[0];
        timestampSegments.push({
          type: 'timestamp',
          value: tsVal,
          seconds: parseTimestampToSeconds(tsVal),
        });
        textIdx = tsMatch.index + tsMatch[0].length;
      }

      const rest = text.slice(textIdx);
      if (rest) {
        timestampSegments.push({ type: 'text', value: rest });
      }
    }
  }

  // 4. Scan remaining text segments for URLs & Watch Room invites
  const finalSegments: Segment[] = [];
  const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

  for (const seg of timestampSegments) {
    if (seg.type !== 'text') {
      finalSegments.push(seg as Segment);
    } else {
      const text = seg.value;
      let textIdx = 0;
      let urlMatch: RegExpExecArray | null;

      while ((urlMatch = urlRegex.exec(text)) !== null) {
        const textBefore = text.slice(textIdx, urlMatch.index);
        if (textBefore) {
          finalSegments.push({ type: 'text', value: textBefore });
        }

        const matchedUrl = urlMatch[0];
        if (isWatchRoomUrl(matchedUrl)) {
          finalSegments.push({
            type: 'room_link',
            value: matchedUrl,
          });
        } else {
          finalSegments.push({
            type: 'link',
            value: matchedUrl,
          });
        }

        textIdx = urlMatch.index + matchedUrl.length;
      }

      const rest = text.slice(textIdx);
      if (rest) {
        finalSegments.push({ type: 'text', value: rest });
      }
    }
  }

  return finalSegments;
}

export default function FormattedContent({
  content,
  className = '',
  imageClassName = '',
  onTimestampClick,
}: FormattedContentProps) {
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  if (!content) return null;

  const segments = parseContentSegments(content);

  return (
    <>
      <div className={`space-y-1.5 ${className}`}>
        {segments.map((seg, index) => {
          if (seg.type === 'gif' || seg.type === 'image') {
            return (
              <div key={index} className="my-2 inline-block max-w-full">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxImg(seg.value);
                  }}
                  className="group relative block rounded-2xl overflow-hidden border border-white/10 hover:border-[#ff006a]/50 shadow-md transition-all duration-200 bg-black/40 text-left cursor-pointer"
                  title="Kattalashtirish"
                >
                  <img
                    src={seg.value}
                    alt="Chat media"
                    className={`rounded-2xl max-h-56 sm:max-h-72 max-w-[240px] sm:max-w-[320px] object-cover group-hover:scale-[1.02] transition-transform duration-200 block ${imageClassName}`}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLElement;
                      target.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <div className="p-2 rounded-full bg-black/60 text-white backdrop-blur-sm">
                      <ZoomIn size={18} />
                    </div>
                  </div>
                </button>
              </div>
            );
          }

          if (seg.type === 'room_link') {
            const fullUrl = seg.value.startsWith('http') ? seg.value : `https://${seg.value}`;
            return (
              <div key={index} className="my-2 block max-w-full">
                <a
                  href={fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-3 rounded-2xl bg-gradient-to-r from-[#ff006a]/25 via-[#7928ca]/20 to-[#0e0f18]/90 border border-[#ff006a]/40 hover:border-[#ff006a] hover:shadow-[0_0_25px_rgba(255,0,106,0.35)] flex items-center gap-3 transition-all duration-300 group/card text-left no-underline block"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ff006a] to-[#7928ca] flex items-center justify-center text-white shrink-0 shadow-lg shadow-[#ff006a]/30 group-hover/card:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-extrabold text-white text-xs tracking-wide">
                        Birgalikda Tomosha Xonasi
                      </span>
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 animate-pulse">
                        JONLI
                      </span>
                    </div>
                    <p className="text-[11px] text-white/75 truncate flex items-center gap-1">
                      <span>Xonaga qo'shilish uchun bosing</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#ff006a] shrink-0" />
                    </p>
                  </div>
                </a>
              </div>
            );
          }

          if (seg.type === 'link') {
            const fullUrl = seg.value.startsWith('http') ? seg.value : `https://${seg.value}`;
            return (
              <a
                key={index}
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 break-all hover:bg-cyan-500/10 px-1 py-0.5 rounded transition-all inline-flex items-center gap-1 font-medium cursor-pointer"
                title={seg.value}
              >
                <span>{seg.value}</span>
                <ExternalLink size={10} className="opacity-70 shrink-0 inline" />
              </a>
            );
          }

          if (seg.type === 'timestamp') {
            return (
              <button
                key={index}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onTimestampClick && seg.seconds !== undefined) {
                    onTimestampClick(seg.seconds);
                  }
                  window.dispatchEvent(new CustomEvent('animem-seek-to', { detail: { time: seg.seconds } }));
                }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded bg-[#ff006a]/15 text-[#ff006a] hover:bg-[#ff006a] hover:text-white border border-[#ff006a]/30 font-mono text-[11px] font-bold transition-all cursor-pointer select-none align-middle shadow-sm group/ts"
                title={`${seg.value} daqiqasiga o'tish`}
              >
                <Play className="w-2.5 h-2.5 fill-current transition-transform group-hover/ts:scale-110" />
                <span>{seg.value}</span>
              </button>
            );
          }

          return (
            <span key={index} className="leading-relaxed whitespace-pre-wrap break-words">
              {seg.value}
            </span>
          );
        })}
      </div>

      {/* Lightbox Preview Modal */}
      {lightboxImg && (
        <div 
          className="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setLightboxImg(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImg(null)}
            className="absolute top-5 right-5 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X size={22} />
          </button>
          <img
            src={lightboxImg}
            alt="Full size"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
