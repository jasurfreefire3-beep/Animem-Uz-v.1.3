import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, AlertCircle, RefreshCw } from 'lucide-react';

interface AudioMessageProps {
  src: string;
  duration?: number | string;
  isMe?: boolean;
}

export function parseMessageContent(content: string) {
  if (!content) return { isVoice: false, duration: 0, audioUrl: '', text: '' };
  
  const voiceMatch = content.match(/^\[voice(?:\s+duration="([^"]+)")?\]([\s\S]+?)\[\/voice\]$/);
  if (voiceMatch) {
    return {
      isVoice: true,
      duration: voiceMatch[1] ? parseFloat(voiceMatch[1]) : 0,
      audioUrl: voiceMatch[2]?.trim(),
      text: ''
    };
  }
  
  if (content.startsWith('data:audio/')) {
    return {
      isVoice: true,
      duration: 0,
      audioUrl: content,
      text: ''
    };
  }

  return {
    isVoice: false,
    duration: 0,
    audioUrl: '',
    text: content
  };
}

export default function AudioMessage({ src, duration: initialDuration, isMe }: AudioMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [totalDuration, setTotalDuration] = useState<number>(() => {
    if (typeof initialDuration === 'number' && initialDuration > 0) return initialDuration;
    if (typeof initialDuration === 'string') {
      const parsed = parseFloat(initialDuration);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 0;
  });
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setHasError(false);
    audio.playbackRate = playbackRate;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        setTotalDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      // Don't error out immediately if metadata is still loading
      if (audio.error) {
        setHasError(true);
        setIsPlaying(false);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
    };
  }, [src, playbackRate]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setHasError(false);
      audio.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Audio playback err:", err);
          // If aborted due to user pause, don't show full error
          if (err.name !== 'AbortError') {
            setHasError(true);
          }
          setIsPlaying(false);
        });
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    const dur = totalDuration || audio.duration;
    if (!dur || isNaN(dur) || !isFinite(dur)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percent * dur;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
    if (!isPlaying) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const cyclePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rates = [1, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const newRate = rates[nextIdx];
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHasError(false);
    if (audioRef.current) {
      audioRef.current.load();
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setHasError(true));
    }
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (hasError) {
    return (
      <div className="flex items-center gap-2 text-xs text-rose-400 py-1.5 px-1 bg-red-950/20 rounded-lg">
        <AlertCircle size={14} className="shrink-0" />
        <span className="truncate">Ovozni ochib bo'lmadi</span>
        <button
          type="button"
          onClick={handleRetry}
          className="ml-auto p-1 hover:text-white transition-colors cursor-pointer"
          title="Qayta urinish"
        >
          <RefreshCw size={12} />
        </button>
      </div>
    );
  }

  const effectiveDuration = totalDuration || (currentTime > 0 ? currentTime : 0);
  const progressPercent = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  // Telegram-style waveform bar heights
  const bars = [35, 60, 95, 45, 80, 50, 85, 100, 70, 40, 75, 90, 60, 85, 50, 70, 90, 65, 40, 80];

  return (
    <div className="flex items-center gap-3 min-w-[210px] max-w-[290px] sm:max-w-[340px] py-1 select-none">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-150 active:scale-95 shadow-md cursor-pointer ${
          isMe
            ? 'bg-white text-[#ff006a] hover:bg-white/90 shadow-black/20'
            : 'bg-gradient-to-tr from-[#ff006a] to-[#a855f7] text-white hover:opacity-90 shadow-[#ff006a]/30'
        }`}
        title={isPlaying ? "Pauza" : "Tinglash"}
      >
        {isPlaying ? <Pause size={15} className="fill-current" /> : <Play size={15} className="ml-0.5 fill-current" />}
      </button>

      {/* Progress & Waveform */}
      <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
        {/* Interactive Sound Wave Bars */}
        <div 
          onClick={handleWaveformClick}
          className="flex items-center gap-0.5 sm:gap-1 h-6 cursor-pointer py-1 group/wave"
          title="O'tkazish uchun bosing"
        >
          {bars.map((height, idx) => {
            const barProgress = (idx / bars.length) * 100;
            const isPassed = progressPercent >= barProgress;
            return (
              <div
                key={idx}
                className={`flex-1 min-w-[2px] max-w-[4px] rounded-full transition-all duration-150 ${
                  isPassed
                    ? isMe ? 'bg-white' : 'bg-[#ff006a]'
                    : isMe ? 'bg-white/30' : 'bg-white/20'
                } ${isPlaying ? 'group-hover/wave:opacity-90' : ''}`}
                style={{
                  height: `${isPlaying ? Math.max(25, (height * (1 + (idx % 3) * 0.15)) % 100) : height}%`,
                }}
              />
            );
          })}
        </div>

        {/* Time Info & Speed Button */}
        <div className="flex items-center justify-between text-[10px] text-white/70 font-mono">
          <span>{isPlaying ? formatTime(currentTime) : formatTime(effectiveDuration)}</span>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cyclePlaybackRate}
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                playbackRate > 1
                  ? isMe ? 'bg-white/30 text-white font-extrabold' : 'bg-[#ff006a] text-white font-extrabold'
                  : 'text-white/50 hover:text-white bg-white/5'
              }`}
              title="Tezlikni o'zgartirish"
            >
              {playbackRate}x
            </button>
            <span className="flex items-center gap-0.5 text-[9px] text-white/50">
              <Volume2 size={10} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
