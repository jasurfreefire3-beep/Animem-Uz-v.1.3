import React from 'react';
import { Play } from 'lucide-react';

interface FormattedContentProps {
  content: string;
  className?: string;
  imageClassName?: string;
  onTimestampClick?: (seconds: number) => void;
}

// Regex to identify [gif]...[/gif] tags (matches any url or relative path inside)
const GIF_TAG_REGEX = /\[gif\]([\s\S]*?)\[\/gif\]/gi;
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
  if (!content) return false;
  return /\[gif\][\s\S]*?\[\/gif\]/i.test(content) || 
         ANIMEM_IMAGE_REGEX.test(content) ||
         /^\/api\/media\/gif_[a-zA-Z0-9_-]+/i.test(content.trim());
}

export function extractGifs(content: string): string[] {
  if (!content) return [];
  const matches: string[] = [];
  
  let match;
  const tagRegex = /\[gif\]([\s\S]*?)\[\/gif\]/gi;
  while ((match = tagRegex.exec(content)) !== null) {
    const url = match[1]?.trim();
    if (url && !matches.includes(url)) {
      matches.push(url);
    }
  }
  
  const bareRegex = /(https?:\/\/api\.animem\.uz\/i\/[a-zA-Z0-9_-]+)/gi;
  while ((match = bareRegex.exec(content)) !== null) {
    if (!matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }
  
  return matches;
}

interface Segment {
  type: 'text' | 'gif' | 'timestamp';
  value: string;
  seconds?: number;
}

export function parseContentSegments(rawContent: string): Segment[] {
  if (!rawContent) return [];

  const segments: Array<{ type: 'text' | 'gif'; value: string }> = [];
  const gifTagRegex = /\[gif\]([\s\S]*?)\[\/gif\]/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = gifTagRegex.exec(rawContent)) !== null) {
    const textBefore = rawContent.slice(lastIndex, match.index);
    if (textBefore) {
      segments.push({ type: 'text', value: textBefore });
    }
    const gifUrl = match[1]?.trim();
    if (gifUrl) {
      segments.push({ type: 'gif', value: gifUrl });
    }
    lastIndex = match.index + match[0].length;
  }

  const remaining = rawContent.slice(lastIndex);
  if (remaining) {
    segments.push({ type: 'text', value: remaining });
  }

  // Scan text segments for bare media links
  const mediaSplitSegments: Array<{ type: 'text' | 'gif'; value: string }> = [];
  const bareRegex = /(https?:\/\/api\.animem\.uz\/i\/[a-zA-Z0-9_-]+|\/api\/media\/gif_[a-zA-Z0-9_-]+|https?:\/\/[^\s]+\.(?:gif|webp|png|jpg|jpeg)(?:\?[^\s]*)?)/gi;

  for (const seg of segments) {
    if (seg.type === 'gif') {
      mediaSplitSegments.push(seg);
    } else {
      const parts = seg.value.split(bareRegex);
      for (const part of parts) {
        if (!part) continue;
        if (bareRegex.test(part)) {
          mediaSplitSegments.push({ type: 'gif', value: part.trim() });
        } else {
          mediaSplitSegments.push({ type: 'text', value: part });
        }
      }
    }
  }

  // Scan text segments for interactive timestamps (e.g. 05:24, 12:45, 1:05:30)
  const finalSegments: Segment[] = [];
  for (const seg of mediaSplitSegments) {
    if (seg.type === 'gif') {
      finalSegments.push(seg);
    } else {
      const text = seg.value;
      let textIdx = 0;
      let tsMatch: RegExpExecArray | null;
      const tsRegex = /\b(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)\b/g;

      while ((tsMatch = tsRegex.exec(text)) !== null) {
        const textBefore = text.slice(textIdx, tsMatch.index);
        if (textBefore) {
          finalSegments.push({ type: 'text', value: textBefore });
        }
        const tsVal = tsMatch[0];
        finalSegments.push({
          type: 'timestamp',
          value: tsVal,
          seconds: parseTimestampToSeconds(tsVal),
        });
        textIdx = tsMatch.index + tsMatch[0].length;
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
  if (!content) return null;

  const segments = parseContentSegments(content);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {segments.map((seg, index) => {
        if (seg.type === 'gif') {
          return (
            <div key={index} className="my-1.5 inline-block max-w-full">
              <img
                src={seg.value}
                alt="Anime GIF"
                className={`rounded-xl max-h-40 sm:max-h-52 max-w-[200px] sm:max-w-[260px] object-contain border border-[#ff006a]/30 shadow-lg shadow-black/40 bg-black/40 hover:scale-[1.02] transition-transform duration-200 cursor-pointer block ${imageClassName}`}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.display = 'none';
                }}
              />
            </div>
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
  );
}
