import { useEffect, useRef, useState } from 'react';
import './VideoPlayer.css';

interface VideoPlayerProps {
  url: string;
  poster?: string;
  animeTitle?: string;
}

function parseEmbedUrl(rawUrl: string): { isEmbed: boolean; embedUrl: string } {
  if (!rawUrl || typeof rawUrl !== 'string') return { isEmbed: false, embedUrl: '' };

  const trimmed = rawUrl.trim();
  const lowerUrl = trimmed.toLowerCase();

  if (lowerUrl.includes('<iframe')) {
    const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
    if (srcMatch) {
      return { isEmbed: true, embedUrl: srcMatch[1].startsWith('//') ? `https:${srcMatch[1]}` : srcMatch[1] };
    }
  }

  const embedTransforms: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
    [/ok\.ru\/(?:video|videoembed)\/(\d+)/i, match => `https://ok.ru/videoembed/${match[1]}`],
    [/mover\.uz\/(?:watch|video\/embed|video)\/([A-Za-z0-9_-]+)/i, match => `https://mover.uz/video/embed/${match[1].replace(/\.mp4$/i, '')}`],
    [/vk\.com\/video(-?\d+)_(\d+)/i, match => `https://vk.com/video_ext.php?oid=${match[1]}&id=${match[2]}`],
    [/rutube\.ru\/(?:video|play\/embed)\/([A-Za-z0-9_-]+)/i, match => `https://rutube.ru/play/embed/${match[1]}`],
    [/vimeo\.com\/(?:video\/)?(\d+)/i, match => `https://player.vimeo.com/video/${match[1]}`],
  ];

  for (const [pattern, makeUrl] of embedTransforms) {
    const match = trimmed.match(pattern);
    if (match) return { isEmbed: true, embedUrl: makeUrl(match) };
  }

  const youtubeMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([^&\s?]+)/i);
  if (youtubeMatch) {
    return { isEmbed: true, embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=0&rel=0` };
  }

  const embedHosts = ['player.vimeo.com', 'sibnet.ru', 'myvi.tv', 'myvi.ru', 'ok.ru', 'vk.com', 'yandex.ru/video/preview', 'rutube.ru', 'drive.google.com', 'kodik.', 'allplay.uz/embed', 'mover.uz'];
  if (embedHosts.some(host => lowerUrl.includes(host)) || lowerUrl.includes('/embed/') || lowerUrl.includes('/video/embed/')) {
    return { isEmbed: true, embedUrl: trimmed.startsWith('//') ? `https:${trimmed}` : trimmed };
  }

  return { isEmbed: false, embedUrl: '' };
}

export default function VideoPlayer({ url, poster, animeTitle }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  const resolveSource = (raw: string): string => {
    if (!raw || typeof raw !== 'string') return '/assets/sample/video.mp4';
    const trimmed = raw.trim();

    // HLS havolalarini avtomatik to'g'ridan-to'g'ri o'ta tezkor MP4 oqimiga aylantirish
    const tgHlsMatch = trimmed.match(/\/api\/tghls\/([^\/]+)\/([0-9]+)/i);
    if (tgHlsMatch) {
      return `https://s3.animem.uz/api/tgstream/${tgHlsMatch[1]}/${tgHlsMatch[2]}`;
    }

    if (trimmed.includes('/api/tgstream/')) {
      const tgPath = trimmed.substring(trimmed.indexOf('/api/tgstream/'));
      return `https://s3.animem.uz${tgPath}`;
    }

    return trimmed;
  };

  const { isEmbed, embedUrl } = parseEmbedUrl(url);
  const source = resolveSource(url);

  useEffect(() => {
    setHasError(false);
    if (isEmbed) {
      setIsIframeLoading(true);
      const timer = setTimeout(() => {
        setIsIframeLoading(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [embedUrl, isEmbed, source]);

  // Support interactive seeking (e.g. comment timestamps & Watch Together sync)
  useEffect(() => {
    const handleSeek = (e: any) => {
      const time = e.detail?.time;
      if (typeof time === 'number' && !isNaN(time) && videoRef.current) {
        try {
          videoRef.current.currentTime = time;
          videoRef.current.play().catch(() => {});
        } catch (err) {
          console.warn("Seek error:", err);
        }
        const stage = document.querySelector('.animem-player-shell');
        stage?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    const handleSync = (e: any) => {
      const { action, time } = e.detail || {};
      if (videoRef.current) {
        try {
          if (typeof time === 'number') videoRef.current.currentTime = time;
          if (action === 'play') {
            videoRef.current.play().catch(() => {});
          } else if (action === 'pause') {
            videoRef.current.pause();
          }
        } catch (err) {
          console.warn("Watch sync error:", err);
        }
      }
    };

    (window as any).getAnimemPlayerTime = () => {
      return videoRef.current?.currentTime || 0;
    };

    window.addEventListener('animem-seek-to', handleSeek);
    window.addEventListener('animem-watch-sync', handleSync);

    return () => {
      window.removeEventListener('animem-seek-to', handleSeek);
      window.removeEventListener('animem-watch-sync', handleSync);
      delete (window as any).getAnimemPlayerTime;
    };
  }, []);

  return (
    <div className="animem-player-shell group">
      <div className="animem-player-stage">
        {isEmbed ? (
          <>
            {isIframeLoading && (
              <div className="animem-player-loading-overlay">
                {poster && (
                  <img
                    src={poster}
                    alt={animeTitle || 'Poster'}
                    className="animem-player-loading-bg"
                  />
                )}
                <div className="animem-player-loading-content">
                  <div className="animem-player-spinner" />
                  <span className="animem-player-loading-text">Video yuklanmoqda...</span>
                  <span className="animem-player-loading-subtext">{animeTitle || 'Animem.uz player'}</span>
                </div>
              </div>
            )}
            <iframe
              src={embedUrl}
              title={animeTitle || 'Video Player'}
              className={`animem-player-embed transition-opacity duration-300 ${isIframeLoading ? 'opacity-0' : 'opacity-100'}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              onLoad={() => setIsIframeLoading(false)}
            />
          </>
        ) : (
          <video
            ref={videoRef}
            src={source}
            poster={poster}
            controls
            playsInline
            preload="metadata"
            className="animem-player-native-video"
            onError={() => setHasError(true)}
          />
        )}

        {hasError && (
          <div className="animem-player-error">
            <strong>Video ochilmadi</strong>
            <span>Internet aloqasini tekshiring yoki sahifani qayta yuklang.</span>
            <button type="button" onClick={() => window.location.reload()}>Qayta yuklash</button>
          </div>
        )}
      </div>

      <div className="animem-player-footer">
        <span>{isEmbed ? 'Tashqi player orqali tomosha qilinmoqda' : 'Ultra-tezkor to\'g\'ridan-to\'g\'ri brauzer oqimi ⚡'}</span>
      </div>
    </div>
  );
}
