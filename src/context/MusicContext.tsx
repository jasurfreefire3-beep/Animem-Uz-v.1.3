import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Song } from '../types';
import initialSongsData from '../data/initialSongs.json';

interface MusicContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  playlist: Song[];
  currentIndex: number;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'none' | 'all' | 'one';
  isExpanded: boolean;
  isPlayerBarDismissed: boolean;
  showQueue: boolean;
  showLyrics: boolean;
  likedSongIds: Set<string | number>;
  playSong: (song: Song, newPlaylist?: Song[]) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  nextSong: () => void;
  prevSong: () => void;
  seekTo: (time: number) => void;
  setVolumeLevel: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleLike: (songId: string | number) => void;
  setIsExpanded: (expanded: boolean) => void;
  dismissPlayerBar: () => void;
  restorePlayerBar: () => void;
  closePlayer: () => void;
  setShowQueue: (show: boolean) => void;
  setShowLyrics: (show: boolean) => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setPlaylist: (list: Song[]) => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

const LOCAL_LIKES_KEY = 'animem_music_likes';
const LOCAL_VOLUME_KEY = 'animem_music_volume';

export function MusicProvider({ children }: { children: ReactNode }) {
  const [playlist, setPlaylist] = useState<Song[]>(() => {
    return initialSongsData as Song[];
  });
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem(LOCAL_VOLUME_KEY);
    return saved !== null ? parseFloat(saved) : 0.8;
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('none');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isPlayerBarDismissed, setIsPlayerBarDismissed] = useState<boolean>(false);
  const [showQueue, setShowQueue] = useState<boolean>(false);
  const [showLyrics, setShowLyrics] = useState<boolean>(false);

  const [likedSongIds, setLikedSongIds] = useState<Set<string | number>>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_LIKES_KEY);
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch (e) {}
    return new Set();
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleEnded = () => {
      // Handle repeat mode
      setRepeatMode((currentRepeat) => {
        if (currentRepeat === 'one') {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        } else {
          // Trigger next
          handleNextSong();
        }
        return currentRepeat;
      });
    };

    const handleError = (e: any) => {
      console.warn("Audio playback/load error:", e);
      // Auto-recover by moving to next track if audio fails to play
      setTimeout(() => {
        handleNextSong();
      }, 1200);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
    };
  }, []);

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    localStorage.setItem(LOCAL_VOLUME_KEY, String(volume));
  }, [volume, isMuted]);

  // Media Session API for Lockscreen and System Media Controls
  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.anime_title || 'Animem Music',
        artwork: [
          { src: currentSong.cover_url, sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => resume());
      navigator.mediaSession.setActionHandler('pause', () => pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => prevSong());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextSong());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seekTo(details.seekTime);
        }
      });
    }
  }, [currentSong]);

  const currentIndex = playlist.findIndex((s) => String(s.id) === String(currentSong?.id));

  const playSong = (song: Song, newPlaylist?: Song[]) => {
    if (!audioRef.current) return;

    if (newPlaylist && newPlaylist.length > 0) {
      setPlaylist(newPlaylist);
    }

    setCurrentSong(song);
    setIsPlayerBarDismissed(false);

    try {
      audioRef.current.pause();
    } catch {}

    audioRef.current.src = song.audio_url;
    audioRef.current.currentTime = 0;
    audioRef.current.load();

    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        setIsPlaying(true);
        // Increment play count asynchronously
        fetch(`/api/music/${song.id}/play`, { method: 'POST' }).catch(() => {});
      }).catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn("Auto-play blocked or audio load error:", err.message);
        }
      });
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (!currentSong && playlist.length > 0) {
      playSong(playlist[0]);
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          if (err.name !== 'AbortError') {
            console.warn("Play error:", err.message);
          }
        });
      }
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resume = () => {
    if (audioRef.current && currentSong) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {});
    }
  };

  const handleNextSong = () => {
    if (playlist.length === 0) return;
    const currentIdx = playlist.findIndex((s) => String(s.id) === String(currentSong?.id));

    if (isShuffle) {
      const candidates = playlist.map((_, i) => i).filter(i => i !== currentIdx);
      const randomIdx = candidates.length > 0 
        ? candidates[Math.floor(Math.random() * candidates.length)] 
        : 0;
      playSong(playlist[randomIdx]);
      return;
    }

    const nextIndex = currentIdx === -1 ? 0 : (currentIdx + 1) % playlist.length;
    playSong(playlist[nextIndex]);
  };

  const nextSong = () => {
    handleNextSong();
  };

  const prevSong = () => {
    if (playlist.length === 0) return;
    const currentIdx = playlist.findIndex((s) => String(s.id) === String(currentSong?.id));

    // If more than 3 seconds in, restart track
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      return;
    }

    const prevIndex = currentIdx <= 0 ? playlist.length - 1 : currentIdx - 1;
    playSong(playlist[prevIndex]);
  };

  const seekTo = (time: number) => {
    if (audioRef.current && isFinite(time)) {
      const clamped = Math.max(0, Math.min(time, duration || audioRef.current.duration || 0));
      audioRef.current.currentTime = clamped;
      setCurrentTime(clamped);
    }
  };

  const setVolumeLevel = (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolume(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleShuffle = () => {
    setIsShuffle(!isShuffle);
  };

  const toggleRepeat = () => {
    setRepeatMode((curr) => {
      if (curr === 'none') return 'all';
      if (curr === 'all') return 'one';
      return 'none';
    });
  };

  const toggleLike = (songId: string | number) => {
    setLikedSongIds((prev) => {
      const next = new Set(prev);
      const isCurrentlyLiked = next.has(songId);
      if (isCurrentlyLiked) {
        next.delete(songId);
      } else {
        next.add(songId);
      }
      try {
        localStorage.setItem(LOCAL_LIKES_KEY, JSON.stringify(Array.from(next)));
      } catch (e) {}

      // Notify backend API
      fetch(`/api/music/${songId}/like`, { method: 'POST' }).catch(() => {});

      return next;
    });
  };

  const addToQueue = (song: Song) => {
    setPlaylist((prev) => [...prev, song]);
  };

  const removeFromQueue = (index: number) => {
    setPlaylist((prev) => prev.filter((_, i) => i !== index));
  };

  const clearQueue = () => {
    if (currentSong) {
      setPlaylist([currentSong]);
    } else {
      setPlaylist([]);
    }
  };

  const dismissPlayerBar = () => {
    setIsPlayerBarDismissed(true);
  };

  const restorePlayerBar = () => {
    setIsPlayerBarDismissed(false);
  };

  const closePlayer = () => {
    pause();
    setCurrentSong(null);
    setIsPlayerBarDismissed(true);
  };

  return (
    <MusicContext.Provider
      value={{
        currentSong,
        isPlaying,
        playlist,
        currentIndex,
        currentTime,
        duration,
        volume,
        isMuted,
        isShuffle,
        repeatMode,
        isExpanded,
        isPlayerBarDismissed,
        showQueue,
        showLyrics,
        likedSongIds,
        playSong,
        togglePlay,
        pause,
        resume,
        nextSong,
        prevSong,
        seekTo,
        setVolumeLevel,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
        toggleLike,
        setIsExpanded,
        dismissPlayerBar,
        restorePlayerBar,
        closePlayer,
        setShowQueue,
        setShowLyrics,
        addToQueue,
        removeFromQueue,
        clearQueue,
        setPlaylist
      }}
    >
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}

