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
  xs: { box: 'w-7 h-7', text: 'text-[10px]', rounded: 'rounded-md' },
  sm: { box: 'w-9 h-9', text: 'text-xs', rounded: 'rounded-lg' },
  md: { box: 'w-12 h-12', text: 'text-sm', rounded: 'rounded-xl' },
  lg: { box: 'w-16 h-16', text: 'text-base', rounded: 'rounded-xl' },
  xl: { box: 'w-24 h-24', text: 'text-2xl', rounded: 'rounded-2xl' },
  '2xl': { box: 'w-28 h-28 sm:w-36 sm:h-36', text: 'text-4xl sm:text-5xl', rounded: 'rounded-2xl' },
  custom: { box: '', text: 'text-sm', rounded: 'rounded-xl' }
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
    <div className={`relative shrink-0 aspect-square flex items-center justify-center ${currentSize.box} ${className}`}>
      {/* Square avatar container fitting the frame completely */}
      <div 
        className={`w-full h-full aspect-square ${currentSize.rounded} overflow-hidden bg-[#18181c] border border-white/10 flex items-center justify-center shadow-md relative ${avatarClassName}`}
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

      {/* Frame overlay around square avatar - perfectly concentric and centered on all 4 sides */}
      {frameUrl && (
        isFrameVideo ? (
          <video
            src={frameUrl}
            autoPlay
            loop
            muted
            playsInline
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[122%] h-[122%] max-w-none max-h-none pointer-events-none object-contain z-10 drop-shadow-[0_0_12px_rgba(255,0,106,0.6)] ${frameClassName}`}
          />
        ) : (
          <img
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            src={frameUrl}
            alt="Frame"
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[122%] h-[122%] max-w-none max-h-none pointer-events-none object-contain z-10 drop-shadow-[0_0_12px_rgba(255,0,106,0.6)] ${frameClassName}`}
          />
        )
      )}
    </div>
  );
}
