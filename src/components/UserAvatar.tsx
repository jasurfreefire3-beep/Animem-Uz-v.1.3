import React, { useState, useEffect } from 'react';

export const isVideoMedia = (url?: string | null): boolean => {
  if (!url || typeof url !== 'string') return false;
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
  xs: { box: 'w-7 h-7 min-w-[28px] min-h-[28px]', text: 'text-[10px]', rounded: 'rounded-md' },
  sm: { box: 'w-9 h-9 min-w-[36px] min-h-[36px]', text: 'text-xs', rounded: 'rounded-lg' },
  md: { box: 'w-12 h-12 min-w-[48px] min-h-[48px]', text: 'text-sm', rounded: 'rounded-xl' },
  lg: { box: 'w-16 h-16 min-w-[64px] min-h-[64px]', text: 'text-base', rounded: 'rounded-xl' },
  xl: { box: 'w-24 h-24 min-w-[96px] min-h-[96px]', text: 'text-2xl', rounded: 'rounded-2xl' },
  '2xl': { box: 'w-28 h-28 sm:w-36 sm:h-36 min-w-[112px] min-h-[112px]', text: 'text-4xl sm:text-5xl', rounded: 'rounded-2xl' },
  custom: { box: '', text: 'text-sm', rounded: 'rounded-xl' }
};

// Generates consistent vivid color gradients based on user's name
function getAvatarGradient(name: string): string {
  const gradients = [
    'from-pink-600 via-rose-500 to-amber-500',
    'from-purple-600 via-indigo-500 to-blue-500',
    'from-cyan-500 via-teal-500 to-emerald-500',
    'from-red-600 via-orange-500 to-amber-400',
    'from-fuchsia-600 via-pink-500 to-rose-500',
    'from-violet-600 via-purple-500 to-indigo-500',
    'from-blue-600 via-cyan-500 to-teal-400',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

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
  const initial = (name || 'U').trim().charAt(0).toUpperCase() || 'U';
  const gradientClass = getAvatarGradient(name || 'U');

  // Normalize src
  let cleanSrc: string | null = null;
  if (typeof src === 'string' && src.trim() && src !== 'null' && src !== 'undefined' && src !== '[object Object]') {
    cleanSrc = src.trim();
    if (cleanSrc.startsWith('uploads/')) {
      cleanSrc = '/' + cleanSrc;
    }
  }

  // Normalize frameUrl
  let cleanFrame: string | null = null;
  if (typeof frameUrl === 'string' && frameUrl.trim() && frameUrl !== 'null' && frameUrl !== 'undefined') {
    cleanFrame = frameUrl.trim();
    if (cleanFrame.startsWith('uploads/')) {
      cleanFrame = '/' + cleanFrame;
    }
  }

  const [imgError, setImgError] = useState(false);
  const [frameError, setFrameError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [cleanSrc]);

  useEffect(() => {
    setFrameError(false);
  }, [cleanFrame]);

  const isAvatarVideo = cleanSrc ? isVideoMedia(cleanSrc) : false;
  const isFrameVideo = cleanFrame ? isVideoMedia(cleanFrame) : false;

  return (
    <div className={`relative shrink-0 aspect-square flex items-center justify-center ${currentSize.box} ${className}`}>
      {/* Square avatar container fitting the frame completely */}
      <div 
        className={`w-full h-full aspect-square ${currentSize.rounded} overflow-hidden bg-[#18181c] border border-white/10 flex items-center justify-center shadow-md relative ${avatarClassName}`}
      >
        {cleanSrc && !imgError ? (
          isAvatarVideo ? (
            <video
              src={cleanSrc}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <img
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              src={cleanSrc}
              alt={name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          )
        ) : (
          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-tr ${gradientClass}`}>
            <span className={`font-black text-white uppercase drop-shadow-md select-none ${currentSize.text}`}>
              {initial}
            </span>
          </div>
        )}
      </div>

      {/* Frame overlay around square avatar - perfectly concentric and centered on all 4 sides */}
      {cleanFrame && !frameError && (
        isFrameVideo ? (
          <video
            src={cleanFrame}
            autoPlay
            loop
            muted
            playsInline
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[122%] h-[122%] max-w-none max-h-none pointer-events-none object-contain z-10 drop-shadow-[0_0_12px_rgba(255,0,106,0.6)] ${frameClassName}`}
            onError={() => setFrameError(true)}
          />
        ) : (
          <img
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            src={cleanFrame}
            alt="Frame"
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[122%] h-[122%] max-w-none max-h-none pointer-events-none object-contain z-10 drop-shadow-[0_0_12px_rgba(255,0,106,0.6)] ${frameClassName}`}
            onError={() => setFrameError(true)}
          />
        )
      )}
    </div>
  );
}
