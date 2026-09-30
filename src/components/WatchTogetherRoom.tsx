import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Users, 
  Share2, 
  Copy, 
  Check, 
  Send, 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  X, 
  Crown, 
  MessageSquare,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Anime, toSlug } from '../types';
import { useAuth } from '../context/AuthContext';

interface WatchParticipant {
  socketId: string;
  userId?: number | string;
  userName: string;
  userAvatar?: string | null;
  isHost?: boolean;
}

interface ChatMessage {
  id: string | number;
  text: string;
  user: {
    name: string;
    avatar_url?: string | null;
  };
  time: string;
}

interface WatchTogetherRoomProps {
  roomId: string;
  anime: Anime;
  currentEpisode: number;
  onEpisodeChange: (episodeIndex: number) => void;
  onClose: () => void;
}

export default function WatchTogetherRoom({
  roomId,
  anime,
  currentEpisode,
  onEpisodeChange,
  onClose,
}: WatchTogetherRoomProps) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  const [participants, setParticipants] = useState<WatchParticipant[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [notification, setNotification] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'members'>('chat');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const roomUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/anime/${toSlug(anime.title)}?room=${roomId}`
    : '';

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Connect socket and join room
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_BASE_URL || 
      (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') 
        ? 'https://p01--animem-beckend--jddxxkp4tz2g.code.run' 
        : window.location.origin);

    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinWatchRoom', {
        roomId,
        animeSlug: toSlug(anime.title),
        animeTitle: anime.title,
        episodeIndex: currentEpisode,
        user: user ? { id: user.id, name: user.name, avatar_url: user.avatar_url } : null,
      });
    });

    socket.on('watchRoomInit', (data) => {
      if (data.isHost !== undefined) setIsHost(data.isHost);
      if (data.participants) setParticipants(data.participants);
      if (data.roomState) {
        setIsPlaying(data.roomState.isPlaying || false);
        if (data.roomState.currentTime) {
          window.dispatchEvent(new CustomEvent('animem-watch-sync', {
            detail: { action: data.roomState.isPlaying ? 'play' : 'pause', time: data.roomState.currentTime }
          }));
        }
      }
    });

    socket.on('watchRoomUsers', (users: WatchParticipant[]) => {
      setParticipants(users);
      // If current user is host
      const me = users.find(u => u.socketId === socket.id);
      if (me && me.isHost) setIsHost(true);
    });

    socket.on('watchRoomNotification', (notif: { type: string; text: string }) => {
      setNotification(notif.text);
      setTimeout(() => setNotification(null), 4000);
    });

    socket.on('watchSyncAction', (data: { action: string; time: number; episodeIndex?: number; senderName?: string }) => {
      // Trigger sync in local video player
      window.dispatchEvent(new CustomEvent('animem-watch-sync', {
        detail: { action: data.action, time: data.time }
      }));

      if (data.action === 'play') {
        setIsPlaying(true);
        setNotification(`${data.senderName || 'Do\'stingiz'} videoni davom ettirdi`);
      } else if (data.action === 'pause') {
        setIsPlaying(false);
        setNotification(`${data.senderName || 'Do\'stingiz'} videoni to'xtatdi`);
      } else if (data.action === 'seek') {
        const m = Math.floor(data.time / 60);
        const s = Math.floor(data.time % 60);
        const timeStr = `${m}:${s < 10 ? '0' : ''}${s}`;
        setNotification(`${data.senderName || 'Do\'stingiz'} ${timeStr} ga o'tkazdi`);
      } else if (data.action === 'changeEpisode' && typeof data.episodeIndex === 'number') {
        onEpisodeChange(data.episodeIndex);
        setNotification(`${data.senderName || 'Do\'stingiz'} ${data.episodeIndex + 1}-qismni qo'ydi`);
      }

      setTimeout(() => setNotification(null), 3500);
    });

    socket.on('watchRoomMessage', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.emit('leaveWatchRoom');
      socket.disconnect();
    };
  }, [roomId, anime, user]);

  // Sync actions
  const sendSyncAction = (action: 'play' | 'pause' | 'seek' | 'changeEpisode', time?: number, episodeIndex?: number) => {
    if (!socketRef.current) return;

    let targetTime = time;
    if (targetTime === undefined) {
      targetTime = (window as any).getAnimemPlayerTime ? (window as any).getAnimemPlayerTime() : 0;
    }

    const payload = {
      roomId,
      action,
      time: targetTime,
      episodeIndex,
      senderName: user?.name || 'Muxlis',
    };

    socketRef.current.emit('watchSyncAction', payload);

    // Apply locally
    window.dispatchEvent(new CustomEvent('animem-watch-sync', {
      detail: { action, time: targetTime }
    }));

    if (action === 'play') setIsPlaying(true);
    if (action === 'pause') setIsPlaying(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socketRef.current) return;

    socketRef.current.emit('watchRoomChatMessage', {
      roomId,
      text: inputText.trim(),
      user: {
        name: user?.name || 'Muxlis',
        avatar_url: user?.avatar_url || null,
      },
    });

    setInputText('');
  };

  const shareTelegramUrl = `https://t.me/share/url?url=${encodeURIComponent(roomUrl)}&text=${encodeURIComponent(`🎬 "${anime.title}" animesini men bilan birga jonli tomosha qiling!`)}`;

  return (
    <div className="w-full bg-[#0c0d14] border border-[#ff006a]/30 rounded-2xl overflow-hidden shadow-2xl shadow-black/80 flex flex-col my-4">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#ff006a]/20 via-[#161726] to-[#0c0d14] border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#ff006a] flex items-center justify-center shadow-lg shadow-[#ff006a]/30">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white uppercase tracking-wider">
                Watch Together
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Jonli Sinxron
              </span>
            </div>
            <div className="text-[10px] text-white/50 font-mono">
              Xona: #{roomId.slice(0, 8)} • {participants.length} kishi
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-white/40 hover:text-white p-1.5 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          title="Xonadan chiqish"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Sync Notification Toast */}
      {notification && (
        <div className="bg-[#ff006a]/20 border-b border-[#ff006a]/30 text-[#ff3b88] text-xs font-bold px-4 py-1.5 text-center animate-fade-in flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 animate-spin" />
          <span>{notification}</span>
        </div>
      )}

      {/* Share / Invite Bar */}
      <div className="p-3 bg-[#11121d] border-b border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-white/70 font-medium flex items-center gap-1.5">
          <Share2 className="w-3.5 h-3.5 text-[#ff006a]" />
          Do'stlarni xonaga taklif qiling:
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-[11px] transition-all cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Nusxalandi!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-white/70" />
                <span>Havolani nusxalash</span>
              </>
            )}
          </button>

          <a
            href={shareTelegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-lg font-bold text-[11px] transition-all shadow-md shadow-[#0088cc]/20"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.197 1.006.128.832.946z" />
            </svg>
            <span>Telegramda ulashish</span>
          </a>
        </div>
      </div>

      {/* Sync Control Bar */}
      <div className="p-3 bg-[#0e0f18] border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => sendSyncAction(isPlaying ? 'pause' : 'play')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              isPlaying 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30' 
                : 'bg-[#ff006a] hover:bg-[#d40058] text-white shadow-lg shadow-[#ff006a]/30'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Barchaga Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                <span>Barchaga Play</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              const cur = (window as any).getAnimemPlayerTime ? (window as any).getAnimemPlayerTime() : 0;
              sendSyncAction('seek', Math.max(0, cur - 10));
            }}
            className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors cursor-pointer"
            title="Barchaga 10 soniya orqaga"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              const cur = (window as any).getAnimemPlayerTime ? (window as any).getAnimemPlayerTime() : 0;
              sendSyncAction('seek', cur + 10);
            }}
            className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors cursor-pointer"
            title="Barchaga 10 soniya oldinga"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-[#ff006a] text-white shadow-md shadow-[#ff006a]/20'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            <span>Chat ({messages.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'members'
                ? 'bg-[#ff006a] text-white shadow-md shadow-[#ff006a]/20'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Users className="w-3 h-3" />
            <span>A'zolar ({participants.length})</span>
          </button>
        </div>
      </div>

      {/* Main Tab Area */}
      <div className="h-64 sm:h-72 overflow-y-auto p-4 space-y-3 bg-[#0a0a10]">
        {activeTab === 'chat' ? (
          <>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-white/40 text-xs">
                <MessageSquare className="w-8 h-8 mb-2 text-white/20" />
                <p className="font-bold text-white/60">Xona chati bo'sh</p>
                <p className="text-[11px] mt-0.5">Do'stlaringiz bilan video davomida fikr almashing!</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className="flex items-start gap-2.5 text-xs animate-fade-in">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#ff006a] to-purple-600 flex items-center justify-center text-white font-black text-[11px] shrink-0 overflow-hidden shadow-md">
                    {msg.user.avatar_url ? (
                      <img src={msg.user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      msg.user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 bg-white/[0.04] border border-white/5 rounded-xl px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-white/90 text-[11px]">
                        {msg.user.name}
                      </span>
                      <span className="text-[9px] text-white/40 font-mono">{msg.time}</span>
                    </div>
                    <p className="text-white/80 text-[11.5px] leading-relaxed break-words">
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-2">
              Xonadagi tomoshabinlar
            </div>
            {participants.map(p => (
              <div
                key={p.socketId}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-[#1e2030] border border-white/10 flex items-center justify-center text-white font-black text-xs overflow-hidden">
                      {p.userAvatar ? (
                        <img src={p.userAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        p.userName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0a0a10]"></span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {p.userName}
                    </span>
                    <span className="text-[10px] text-white/40 font-mono">
                      {p.isHost ? 'Xona egasi (Host)' : 'Tomoshabin'}
                    </span>
                  </div>
                </div>

                {p.isHost && (
                  <span className="flex items-center gap-1 text-[10px] font-black text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 rounded-full uppercase">
                    <Crown className="w-3 h-3 fill-current" />
                    Host
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Input Bar */}
      {activeTab === 'chat' && (
        <form onSubmit={handleSendMessage} className="p-2.5 bg-[#121320] border-t border-white/5 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Do'stlaringizga yozing..."
            className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#ff006a] transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-3.5 py-2 bg-[#ff006a] hover:bg-[#d40058] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#ff006a]/20 cursor-pointer flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
}
