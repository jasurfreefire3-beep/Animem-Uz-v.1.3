import React from 'react';

export const isVideoMedia = (url?: string | null): boolean => {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return clean.endsWith('.webm') || clean.endsWith('.mp4') || clean.endsWith('.mov') || url.includes('.webm') || url.includes('.mp4');
};

interface UserAvatarProps {
  src?: string | null;
  frameUrl?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'custom';
  className?: string;
  avatarClassName?: string;
  frameClassName?: string;
}

const sizeMap = {
  xs: { box: 'w-7 h-7', text: 'text-[10px]', rounded: 'rounded-md', frameOffset: '-inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)]' },
  sm: { box: 'w-9 h-9', text: 'text-xs', rounded: 'rounded-lg', frameOffset: '-inset-1.5 w-[calc(100%+12px)] h-[calc(100%+12px)]' },
  md: { box: 'w-12 h-12', text: 'text-sm', rounded: 'rounded-xl', frameOffset: '-inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)]' },
  lg: { box: 'w-14 h-14', text: 'text-base', rounded: 'rounded-xl', frameOffset: '-inset-2.5 w-[calc(100%+20px)] h-[calc(100%+20px)]' },
  xl: { box: 'w-20 h-20', text: 'text-xl', rounded: 'rounded-2xl', frameOffset: '-inset-3.5 w-[calc(100%+28px)] h-[calc(100%+28px)]' },
  '2xl': { box: 'w-28 h-28 sm:w-36 sm:h-36', text: 'text-4xl sm:text-5xl', rounded: 'rounded-2xl', frameOffset: '-inset-3.5 sm:-inset-5 w-[calc(100%+28px)] sm:w-[calc(100%+40px)] h-[calc(100%+28px)] sm:h-[calc(100%+40px)]' },
  custom: { box: '', text: 'text-sm', rounded: 'rounded-xl', frameOffset: '-inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)]' }
};

export default function UserAvatar({
  src,
  frameUrl,
  name = 'U',
  size = 'md',
  className = '',
  avatarClassName = '',
  frameClassName = ''
}: UserAvatarProps) {
  const currentSize = sizeMap[size] || sizeMap.md;
  const isAvatarVideo = isVideoMedia(src);
  const isFrameVideo = isVideoMedia(frameUrl);
  const initial = (name || 'U').charAt(0).toUpperCase();

  return (
    <div className={`relative shrink-0 flex items-center justify-center ${currentSize.box} ${className}`}>
      {/* Square avatar container fitting the frame completely */}
      <div 
        className={`w-full h-full ${currentSize.rounded} overflow-hidden bg-[#18181c] border border-white/10 flex items-center justify-center shadow-md relative ${avatarClassName}`}
      >
        {src ? (
          isAvatarVideo ? (
            <video
              src={src}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              src={src}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // If failed as image and might be video or fallback
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )
        ) : (
          <span className={`font-black text-[#ff006a] uppercase ${currentSize.text}`}>
            {initial}
          </span>
        )}
      </div>

      {/* Frame overlay around square avatar */}
      {frameUrl && (
        isFrameVideo ? (
          <video
            src={frameUrl}
            autoPlay
            loop
            muted
            playsInline
            className={`absolute ${currentSize.frameOffset} pointer-events-none object-contain z-10 scale-110 drop-shadow-[0_0_12px_rgba(255,0,106,0.6)] ${frameClassName}`}
          />
        ) : (
          <img
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            src={frameUrl}
            alt="Frame"
            className={`absolute ${currentSize.frameOffset} pointer-events-none object-contain z-10 scale-110 drop-shadow-[0_0_12px_rgba(255,0,106,0.6)] ${frameClassName}`}
          />
        )
      )}
    </div>
  );
}
