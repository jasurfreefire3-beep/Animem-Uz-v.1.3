import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Message } from '../types';
import { io, Socket } from 'socket.io-client';
import { Send, ArrowUp, Sparkles, Trash2, CornerUpLeft, X, Mic, ChevronDown, CheckCheck, ShieldCheck, Palette, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import AudioMessage, { parseMessageContent } from '../components/AudioMessage';
import GifPicker from '../components/GifPicker';
import FormattedContent, { isGifContent } from '../components/FormattedContent';
import UserAvatar from '../components/UserAvatar';
import ChatWallpaperModal from '../components/ChatWallpaperModal';
import { getSavedChatWallpaper, getSavedWallpaperDim } from '../data/chatWallpapers';
import { getSocketUrl } from '../lib/api';

interface TypingUser {
  id: string | number;
  name: string;
  type: 'text' | 'voice';
  expiresAt: number;
}

const MemoizedMessage = memo(({ 
  msg, 
  user, 
  activeMsgId, 
  setActiveMsgId, 
  setReplyingTo, 
  handleDeleteMessage,
  handleContextMenu,
  handleTouchStart,
  handleTouchEnd,
  onJumpToMessage
}: any) => {
  const isMe = String(msg.user_id) === String(user?.id);
  const canDelete = user && (user.role === 'admin' || String(user.id) === String(msg.user_id));
  const avatarSrc = msg.user_avatar || msg.avatar_url || msg.user?.avatar_url || (isMe ? user?.avatar_url : null);
  const displayName = msg.user_name || msg.name || msg.user?.name || (isMe ? (user?.name || 'Men') : 'Foydalanuvchi');
  const frameSrc = msg.user_avatar_frame || msg.avatar_frame_url || msg.user?.avatar_frame_url || (isMe ? user?.avatar_frame_url : null);
  const isActive = activeMsgId === msg.id;
  const parsedContent = parseMessageContent(msg.content);
  const parsedReply = msg.reply_to_content ? parseMessageContent(msg.reply_to_content) : null;
  const hasValidUserId = Boolean(msg.user_id && msg.user_id !== 'undefined' && msg.user_id !== 'null' && Number(msg.user_id) > 0);
  const isAdmin = msg.role === 'admin' || msg.user?.role === 'admin';

  return (
    <div 
      id={`msg-${msg.id}`}
      onClick={() => setActiveMsgId(isActive ? null : msg.id)}
      onContextMenu={(e) => handleContextMenu(e, msg)}
      onTouchStart={() => handleTouchStart(msg)}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      className={`flex items-start gap-2.5 sm:gap-3 group my-2 cursor-pointer select-none transition-all ${
        isMe ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar */}
      {hasValidUserId ? (
        <Link 
          to={isMe ? "/profil" : `/user/${msg.user_id}`} 
          onClick={(e) => e.stopPropagation()} 
          className="shrink-0 mt-0.5 hover:scale-105 transition-transform"
        >
          <UserAvatar
            size="md"
            src={avatarSrc}
            frameUrl={frameSrc}
            name={displayName}
          />
        </Link>
      ) : (
        <div className="shrink-0 mt-0.5">
          <UserAvatar
            size="md"
            src={avatarSrc}
            frameUrl={frameSrc}
            name={displayName}
          />
        </div>
      )}

      {/* Message Body */}
      <div className={`flex-1 min-w-0 max-w-[85%] sm:max-w-[78%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        {/* Name and Meta */}
        <div className={`flex items-center gap-1.5 mb-1 px-1 text-[11px] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          {hasValidUserId ? (
            <Link 
              to={isMe ? "/profil" : `/user/${msg.user_id}`} 
              onClick={(e) => e.stopPropagation()} 
              className={`font-bold hover:underline flex items-center gap-1 ${isMe ? 'text-[#ff006a]' : 'text-cyan-400'}`}
            >
              <span>{displayName}</span>
              {isAdmin && (
                <span title="Admin"><ShieldCheck size={12} className="text-amber-400" /></span>
              )}
            </Link>
          ) : (
            <span className={`font-bold flex items-center gap-1 ${isMe ? 'text-[#ff006a]' : 'text-cyan-400'}`}>
              <span>{displayName}</span>
              {isAdmin && (
                <span title="Admin"><ShieldCheck size={12} className="text-amber-400" /></span>
              )}
            </span>
          )}

          <span className="text-white/40 text-[9px] font-mono">
            {format(new Date(msg.created_at || Date.now()), 'HH:mm')}
          </span>

          {isMe && (
            <CheckCheck size={12} className="text-[#ff006a]/70" />
          )}

          {/* Quick Action buttons - Ultra-comfortable High Contrast Glass Styling */}
          <div className={`flex items-center gap-1.5 ${isMe ? 'mr-auto' : 'ml-auto'}`}>
            {user && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReplyingTo(msg);
                }}
                className={`bg-[#0c0d18]/90 hover:bg-[#ff006a] text-white hover:text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-all border border-white/20 hover:border-[#ff006a] shadow-lg shadow-black/80 backdrop-blur-md cursor-pointer ${
                  isActive ? 'opacity-100 ring-2 ring-[#ff006a]' : 'opacity-80 sm:opacity-0 sm:group-hover:opacity-100'
                }`}
                title="Javob berish (Reply)"
              >
                <CornerUpLeft size={11} className="text-[#ff006a] group-hover:text-white" />
                <span>Reply</span>
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteMessage(msg.id);
                }}
                className={`bg-rose-950/85 hover:bg-rose-600 text-rose-200 hover:text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-all border border-rose-500/40 hover:border-rose-400 shadow-lg shadow-black/80 backdrop-blur-md cursor-pointer ${
                  isActive ? 'opacity-100 ring-2 ring-rose-500' : 'opacity-80 sm:opacity-0 sm:group-hover:opacity-100'
                }`}
                title="O'chirish"
              >
                <Trash2 size={11} />
                <span className="text-[9px]">O'chirish</span>
              </button>
            )}
          </div>
        </div>

        {/* Bubble - Crystal Glassmorphic effect with dynamic wallpaper */}
        <div 
          className={`px-3.5 py-2.5 text-xs inline-block leading-relaxed max-w-full backdrop-blur-md shadow-xl transition-all ${
            isMe 
              ? 'bg-gradient-to-br from-[#ff006a]/75 via-[#8b5cf6]/65 to-[#ff006a]/70 border border-white/25 text-white rounded-2xl rounded-tr-xs shadow-[0_8px_30px_rgba(0,0,0,0.5),0_0_15px_rgba(255,0,106,0.25)]' 
              : 'bg-[#0e0f17]/80 border border-white/15 hover:border-white/30 text-white/95 rounded-2xl rounded-tl-xs shadow-[0_8px_30px_rgba(0,0,0,0.5)]'
          }`}
        >
          {/* Reply Context Block - Click to jump to original message */}
          {msg.reply_to_id && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                if (onJumpToMessage) onJumpToMessage(msg.reply_to_id);
              }}
              className="mb-2 text-[10px] bg-black/55 hover:bg-black/80 border-l-2 border-[#ff006a] px-2.5 py-1.5 rounded-r-lg text-left cursor-pointer transition-all group/reply shadow-inner"
              title="Asl xabarga o'tish"
            >
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="font-bold text-[#ff006a] text-[9px] flex items-center gap-1">
                  <CornerUpLeft size={9} />
                  @{msg.reply_to_name}
                </span>
                <span className="text-[8px] text-white/40 group-hover/reply:text-[#ff006a] transition-colors font-medium">
                  Ko'rish &rarr;
                </span>
              </div>
              <p className="text-white/75 text-[9px] truncate max-w-[220px]">
                {parsedReply?.isVoice ? (
                  <span className="flex items-center gap-1 text-[#ff006a]">
                    <Mic size={10} /> Ovozli xabar
                  </span>
                ) : isGifContent(parsedReply?.text || msg.reply_to_content) ? (
                  <span className="flex items-center gap-1 text-[#ff006a]">
                    <Sparkles size={10} /> GIF Stiker
                  </span>
                ) : (
                  parsedReply?.text || msg.reply_to_content
                )}
              </p>
            </div>
          )}

          {/* Message Content */}
          {parsedContent.isVoice ? (
            <AudioMessage
              src={parsedContent.audioUrl}
              duration={parsedContent.duration}
              isMe={isMe}
            />
          ) : (
            <FormattedContent content={parsedContent.text || msg.content} />
          )}
        </div>
      </div>
    </div>
  );
});

export default function Chat() {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [input, setInput] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeMsgId, setActiveMsgId] = useState<string | number | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);

  // Custom Wallpaper and Dimming state
  const [wallpaperUrl, setWallpaperUrl] = useState<string>(getSavedChatWallpaper);
  const [wallpaperDim, setWallpaperDim] = useState<number>(getSavedWallpaperDim);
  const [showWallpaperModal, setShowWallpaperModal] = useState<boolean>(false);

  // Sync wallpaper across tabs or widgets
  useEffect(() => {
    const handleWpChange = (e: any) => {
      if (e.detail?.url !== undefined) setWallpaperUrl(e.detail.url);
    };
    const handleDimChange = (e: any) => {
      if (e.detail?.dim !== undefined) setWallpaperDim(e.detail.dim);
    };
    window.addEventListener('animem_chat_wallpaper_changed', handleWpChange);
    window.addEventListener('animem_chat_wallpaper_dim_changed', handleDimChange);
    return () => {
      window.removeEventListener('animem_chat_wallpaper_changed', handleWpChange);
      window.removeEventListener('animem_chat_wallpaper_dim_changed', handleDimChange);
    };
  }, []);

  // Listen for sharing watch room link to chat
  useEffect(() => {
    const handleShareToChat = (e: any) => {
      if (e.detail?.text) {
        setInput(e.detail.text);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 200);
      }
    };
    window.addEventListener('animem_share_to_chat', handleShareToChat);
    return () => {
      window.removeEventListener('animem_share_to_chat', handleShareToChat);
    };
  }, []);

  // Jump to replied message smoothly with neon pulse highlight
  const handleJumpToMessage = useCallback((replyId: string | number) => {
    const el = document.getElementById(`msg-${replyId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[#ff006a]', 'bg-[#ff006a]/25', 'rounded-2xl', 'transition-all');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#ff006a]', 'bg-[#ff006a]/25');
      }, 2000);
    } else if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Context menu / Long press state for message actions
  const [selectedMsgForAction, setSelectedMsgForAction] = useState<Message | null>(null);
  const touchTimeoutRef = useRef<any>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingStartTimeRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const recordedMimeTypeRef = useRef<string>('audio/webm');
  const inputRef = useRef<HTMLInputElement>(null);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Real-time typing users state
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 120;
    setShowScrollBottom(isScrolledUp);
  };

  const handleScrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      scrollToBottom();
    }
  };

  const scrollToBottom = (smooth = true) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }, 100);
  };

  // Socket and Initial Messages Load
  useEffect(() => {
    const fetchInitialMessages = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        const res = await fetch(`${API_BASE}/api/chat/messages`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setMessages(data);
          }
        }
      } catch (err) {
        // Handled by socket
      } finally {
        setIsLoading(false);
        scrollToBottom(false);
      }
    };
    fetchInitialMessages();

    // Connect to the socket server
    const socketUrl = getSocketUrl();
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('previousMessages', (prevMsgs: Message[]) => {
      if (Array.isArray(prevMsgs) && prevMsgs.length > 0) {
        setMessages(prevMsgs);
      }
      setIsLoading(false);
      scrollToBottom(false);
    });

    socket.on('newMessage', (newMsg: Message) => {
      setMessages((prev) => {
        const idx = prev.findIndex(m => 
          String(m.id) === String(newMsg.id) ||
          (String(m.id).startsWith('temp_') && String(m.user_id) === String(newMsg.user_id) && m.content === newMsg.content)
        );
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = newMsg;
          return updated;
        }
        return [...prev, newMsg];
      });
      setIsLoading(false);
      scrollToBottom();
    });

    socket.on('messageDeleted', (deletedId: any) => {
      setMessages((prev) => prev.filter(msg => String(msg.id) !== String(deletedId)));
    });

    // Handle incoming typing indicators
    socket.on('userTyping', (data: { id: string | number; name: string; type?: 'text' | 'voice' }) => {
      if (!data || !data.id || String(data.id) === String(user?.id)) return;
      const actType = data.type === 'voice' ? 'voice' : 'text';
      setTypingUsers((prev) => {
        const filtered = prev.filter(u => String(u.id) !== String(data.id));
        return [...filtered, {
          id: data.id,
          name: data.name || "Foydalanuvchi",
          type: actType,
          expiresAt: Date.now() + 4500
        }];
      });
    });

    socket.on('userStoppedTyping', (data: { id: string | number }) => {
      if (!data || !data.id) return;
      setTypingUsers((prev) => prev.filter(u => String(u.id) !== String(data.id)));
    });

    socket.on('chatCleared', () => {
      setMessages([]);
      setIsLoading(false);
    });

    // Cleanup expired typing indicators every 1.5s
    const typingCleaner = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => prev.filter(u => u.expiresAt > now));
    }, 1500);

    // Sync in background for distributed consistency
    const pollInterval = setInterval(() => {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      fetch(`${API_BASE}/api/chat/messages?t=${Date.now()}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setMessages(prev => {
              if (data.length !== prev.length || (data[data.length - 1]?.id !== prev[prev.length - 1]?.id)) {
                return data;
              }
              return prev;
            });
          }
        })
        .catch(() => {});
    }, 4500);

    return () => {
      clearInterval(typingCleaner);
      clearInterval(pollInterval);
      socket.disconnect();
    };
  }, [user?.id]);

  // Broadcast typing event
  const emitTyping = (type: 'text' | 'voice' = 'text') => {
    if (!socketRef.current || !socketRef.current.connected || !user) return;
    socketRef.current.emit('typing', {
      id: user.id,
      name: user.name,
      type
    });
  };

  const emitStopTyping = () => {
    if (!socketRef.current || !socketRef.current.connected || !user) return;
    socketRef.current.emit('stopTyping', {
      id: user.id,
      name: user.name
    });
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    if (!user) return;

    if (val.trim()) {
      emitTyping('text');
      if (typingDebounceTimeoutRef.current) {
        clearTimeout(typingDebounceTimeoutRef.current);
      }
      typingDebounceTimeoutRef.current = setTimeout(() => {
        emitStopTyping();
      }, 2500);
    } else {
      emitStopTyping();
    }
  };

  const sendChatMessage = async (contentToSend: string) => {
    if (!contentToSend || !user) return;

    emitStopTyping();
    if (typingDebounceTimeoutRef.current) {
      clearTimeout(typingDebounceTimeoutRef.current);
    }

    const userAvatar = (user as any).avatar_url || (user as any).avatar || null;
    const userAvatarFrame = (user as any).avatar_frame_url || null;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const optimisticMsg: Message = {
      id: tempId,
      user_id: user.id,
      user_name: user.name,
      user_avatar: userAvatar,
      user_avatar_frame: userAvatarFrame,
      avatar_frame_url: userAvatarFrame,
      content: contentToSend,
      reply_to_id: replyingTo ? String(replyingTo.id) : null,
      reply_to_name: replyingTo ? replyingTo.user_name : null,
      reply_to_content: replyingTo ? replyingTo.content : null,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setIsLoading(false);
    scrollToBottom();

    const payload = {
      user_id: user.id,
      user_name: user.name,
      user_avatar: userAvatar,
      user_avatar_frame: userAvatarFrame,
      avatar_frame_url: userAvatarFrame,
      content: contentToSend,
      reply_to_id: replyingTo ? String(replyingTo.id) : null,
      reply_to_name: replyingTo ? replyingTo.user_name : null,
      reply_to_content: replyingTo ? replyingTo.content : null
    };

    let sent = false;
    if (socketRef.current && socketRef.current.connected) {
      try {
        socketRef.current.emit('sendMessage', payload);
        sent = true;
      } catch (socketErr) {
        console.error("Socket send failed:", socketErr);
      }
    }

    if (!sent) {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        const authToken = token || localStorage.getItem('token') || '';
        const res = await fetch(`${API_BASE}/api/chat/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          sent = true;
        }
      } catch (err) {
        console.warn("REST fallback send failed:", err);
      }
    }

    if (sent) {
      setInput('');
      setReplyingTo(null);
      setShowGifPicker(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    await sendChatMessage(input.trim());
  };

  // Immediate message deletion
  const handleDeleteMessage = useCallback(async (msgId: string | number) => {
    try {
      setMessages((prev) => prev.filter((m) => String(m.id) !== String(msgId)));
      setSelectedMsgForAction(null);
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
      const authToken = token || localStorage.getItem('token') || '';
      await fetch(`${API_BASE}/api/chat/messages/${msgId}`, {
        method: 'DELETE',
        headers: {
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        }
      });
    } catch (e) {
      console.error("Failed to delete message", e);
    }
  }, [token]);

  // Context menu (Right Click) handler
  const handleContextMenu = useCallback((e: React.MouseEvent, msg: Message) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    setSelectedMsgForAction(msg);
  }, [user]);

  // Long press (Touch) handler for mobile
  const handleTouchStart = useCallback((msg: Message) => {
    if (!user) return;
    touchTimeoutRef.current = setTimeout(() => {
      if (navigator.vibrate) {
        try { navigator.vibrate(40); } catch (e) {}
      }
      setSelectedMsgForAction(msg);
    }, 450);
  }, [user]);

  const handleTouchEnd = useCallback(() => {
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }
  }, []);

  // Voice recording handlers (Multi-platform: Safari iOS, Chrome, Android, Desktop)
  const startRecording = async () => {
    if (!user) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Qurilmangizda mikrofondan foydalanish imkoni yo'q yoki xavfsiz (HTTPS) ulanish talab qilinadi.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      // Find best supported audio mime type
      const mimeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
        'audio/ogg;codecs=opus',
        'audio/wav'
      ];
      let supportedType = '';
      for (const t of mimeCandidates) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
          supportedType = t;
          break;
        }
      }
      recordedMimeTypeRef.current = supportedType || 'audio/webm';

      const options = supportedType ? { mimeType: supportedType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);
      setShowGifPicker(false);

      // Emit voice recording indicator
      emitTyping('voice');

      recordingTimerRef.current = setInterval(() => {
        const elapsed = Math.round((Date.now() - recordingStartTimeRef.current) / 1000);
        setRecordingDuration(elapsed);
      }, 500);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      alert("Mikrofondan foydalanishga ruxsat berilmadi yoki xatolik yuz berdi.");
    }
  };

  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    clearInterval(recordingTimerRef.current);
    emitStopTyping();

    const recorder = mediaRecorderRef.current;
    if (recorder.state === 'recording') {
      try {
        recorder.requestData();
      } catch (e) {}
    }

    recorder.onstop = async () => {
      try {
        const finalDuration = Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000));
        const mime = recordedMimeTypeRef.current || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });

        if (audioBlob.size > 0) {
          // 1. Upload to dedicated /api/chat/voice for instant cloud persistence
          let uploadedUrl = '';
          try {
            const ext = (mime.includes('mp4') || mime.includes('aac')) ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm';
            const formData = new FormData();
            formData.append('file', audioBlob, `voice_${Date.now()}.${ext}`);
            formData.append('duration', String(finalDuration));

            const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
            const authToken = token || localStorage.getItem('token') || '';
            const res = await fetch(`${API_BASE}/api/chat/voice`, {
              method: 'POST',
              headers: {
                ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
              },
              body: formData
            });

            if (res.ok) {
              const data = await res.json();
              if (data && data.url) {
                uploadedUrl = data.url;
              }
            }
          } catch (uploadErr) {
            console.warn("API voice upload fallback to base64:", uploadErr);
          }

          if (uploadedUrl) {
            await sendChatMessage(`[voice duration="${finalDuration}"]${uploadedUrl}[/voice]`);
          } else {
            // Fallback to Base64 data URL
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64Audio = reader.result as string;
              await sendChatMessage(`[voice duration="${finalDuration}"]${base64Audio}[/voice]`);
            };
            reader.readAsDataURL(audioBlob);
          }
        }
      } catch (e) {
        console.error("Error processing voice message:", e);
      } finally {
        if (recorder.stream) {
          recorder.stream.getTracks().forEach(t => t.stop());
        }
        setIsRecording(false);
        setRecordingDuration(0);
        audioChunksRef.current = [];
      }
    };

    recorder.stop();
  };

  const cancelRecording = () => {
    clearInterval(recordingTimerRef.current);
    emitStopTyping();

    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const handleSelectGif = async (gifUrl: string) => {
    setShowGifPicker(false);
    await sendChatMessage(`[gif]${gifUrl}[/gif]`);
  };

  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleClearChat = async () => {
    if (window.confirm("Haqiqatan ham barcha xabarlarni o'chirmoqchimisiz?")) {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
        await fetch(`${API_BASE}/api/chat/clear`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (e) {
        console.error("Failed to clear chat", e);
      }
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#030303] flex items-center justify-center p-4">
        <div className="bg-[#0b0b10] border border-white/10 p-8 rounded-2xl max-w-md w-full text-center space-y-5 shadow-2xl backdrop-blur-xl">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#ff006a] to-[#a855f7] flex items-center justify-center mx-auto text-white shadow-lg shadow-[#ff006a]/30">
            <Sparkles size={28} />
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-wide">Animem Umumiy Chat</h2>
          <p className="text-xs text-white/60 leading-relaxed">
            Jonli suhbatda ishtirok etish, ovozli xabarlar va Giphy stikerlar yuborish uchun profilingizga kiring.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              to="/login"
              className="px-6 py-2.5 bg-gradient-to-r from-[#ff0055] to-[#ff006a] hover:opacity-90 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-[#ff006a]/30"
            >
              Kirish
            </Link>
            <Link
              to="/register"
              className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-xl transition-all border border-white/10"
            >
              Ro'yxatdan o'tish
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col pt-16 pb-4 sm:pb-6">
      <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col px-2 sm:px-4">
        {/* Chat Container Card */}
        <div className="bg-[#09090e]/95 border border-white/10 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-2xl h-[calc(100vh-95px)] relative">
          
          {/* Header */}
          <div className="p-3 sm:p-4 bg-[#0c0c14]/95 border-b border-white/10 flex items-center justify-between shrink-0 backdrop-blur-md">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ff006a] to-[#a855f7] flex items-center justify-center text-white shadow-md shadow-[#ff006a]/30">
                <MessageCircle size={18} />
              </div>
              <div>
                <h1 className="font-extrabold text-sm sm:text-base text-white tracking-wide flex items-center gap-2">
                  <span>Animem Chat</span>
                  <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-[#ff006a]/15 text-[#ff006a] font-bold border border-[#ff006a]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff006a] animate-pulse" />
                    Jonli
                  </span>
                </h1>
                <p className="text-[10px] text-white/50 hidden sm:block">
                  Ovozli va matnli xabarlar, Giphy anime stikerlar
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Wallpaper settings button */}
              <button
                type="button"
                onClick={() => setShowWallpaperModal(true)}
                className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Orqa fonni almashtirish"
              >
                <Palette size={14} className="text-[#ff006a]" />
                <span className="hidden sm:inline">Fon</span>
              </button>

              {user.role === 'admin' && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Barcha xabarlarni o'chirish"
                >
                  <Trash2 size={13} />
                  <span className="hidden sm:inline">Tozalash</span>
                </button>
              )}
            </div>
          </div>

          {/* Messages Container with FIXED Wallpaper & SCROLLING Content */}
          <div className="flex-1 relative overflow-hidden flex flex-col">
            {/* Fixed Background Image - Does NOT move during scrolling */}
            {wallpaperUrl ? (
              <div 
                className="absolute inset-0 pointer-events-none bg-cover bg-center transition-all duration-700 ease-in-out"
                style={{ backgroundImage: `url("${wallpaperUrl}")` }}
              />
            ) : (
              <div className="absolute inset-0 pointer-events-none bg-[#09090e]" />
            )}

            {/* Tint Overlay for optimal contrast and readability */}
            <div 
              className="absolute inset-0 pointer-events-none transition-colors duration-500"
              style={{ backgroundColor: `rgba(9, 9, 14, ${wallpaperDim})` }}
            />

            {/* Only this layer scrolls */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="relative z-10 flex-1 overflow-y-auto p-3 sm:p-5 space-y-2.5 custom-scrollbar"
            >
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-3">
                  <div className="w-9 h-9 border-2 border-[#ff006a] border-t-transparent rounded-full animate-spin shadow-lg shadow-[#ff006a]/20"></div>
                  <span className="text-white/80 text-xs font-semibold animate-pulse tracking-wide">
                    Xabarlar yuklanmoqda...
                  </span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-28 text-white/50 text-xs font-medium space-y-2">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-white/30">
                    <MessageCircle size={22} />
                  </div>
                  <p>Chat hozircha bo'sh. Birinchi xabarni siz yozing!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <MemoizedMessage
                    key={msg.id}
                    msg={msg}
                    user={user}
                    activeMsgId={activeMsgId}
                    setActiveMsgId={setActiveMsgId}
                    setReplyingTo={setReplyingTo}
                    handleDeleteMessage={handleDeleteMessage}
                    handleContextMenu={handleContextMenu}
                    handleTouchStart={handleTouchStart}
                    handleTouchEnd={handleTouchEnd}
                    onJumpToMessage={handleJumpToMessage}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Replying Preview Banner */}
          <AnimatePresence>
            {replyingTo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 py-2 bg-[#0c0c14] border-t border-white/10 flex items-center justify-between text-xs shrink-0"
              >
                <div className="flex items-center space-x-2 border-l-2 border-[#ff006a] pl-2.5 truncate">
                  <CornerUpLeft size={13} className="text-[#ff006a] shrink-0" />
                  <div className="truncate">
                    <span className="font-bold text-[#ff006a]">@{replyingTo.user_name}</span>
                    <span className="text-white/60 ml-2 truncate max-w-xs inline-block align-middle">
                      {parseMessageContent(replyingTo.content).isVoice ? '🎤 Ovozli xabar' : replyingTo.content}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="p-1 text-white/40 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
                  title="Bekor qilish"
                >
                  <X size={15} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Real-time Typing / Voice Recording Notification Bar */}
          <AnimatePresence>
            {typingUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 4, height: 0 }}
                className="px-4 py-1.5 bg-[#09090e]/95 border-t border-white/5 flex items-center gap-2 text-xs shrink-0 backdrop-blur-md overflow-hidden"
              >
                {typingUsers.some(u => u.type === 'voice') ? (
                  <div className="flex items-center gap-2 text-rose-400 font-semibold animate-pulse">
                    <Mic size={14} className="text-[#ff006a] animate-bounce" />
                    <span>
                      {typingUsers.filter(u => u.type === 'voice').map(u => u.name).join(', ')} ovozli xabar yozmoqda...
                    </span>
                    <span className="flex gap-1 ml-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-bounce [animation-delay:300ms]" />
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-cyan-400 font-medium">
                    <span>
                      {typingUsers.map(u => u.name).join(', ')} yozmoqda
                    </span>
                    <span className="flex items-center gap-1 ml-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Context Action Menu Modal (Long-press & Right-Click) */}
          <AnimatePresence>
            {selectedMsgForAction && (
              <div 
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
                onClick={() => setSelectedMsgForAction(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-black/85 backdrop-blur-2xl border border-white/20 rounded-3xl p-4 w-80 shadow-[0_20px_50px_rgba(0,0,0,0.9)] space-y-3"
                >
                  <div className="border-b border-white/10 pb-2">
                    <p className="text-[11px] text-white/50">Xabar amallari</p>
                    <p className="text-xs font-bold text-white truncate">
                      {selectedMsgForAction.user_name}: {parseMessageContent(selectedMsgForAction.content).isVoice ? '🎤 Ovozli xabar' : selectedMsgForAction.content}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    {(user.role === 'admin' || String(user.id) === String(selectedMsgForAction.user_id)) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(selectedMsgForAction.id)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl transition-colors cursor-pointer border border-rose-500/20"
                      >
                        <Trash2 size={15} />
                        <span>Xabarni o'chirish</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setReplyingTo(selectedMsgForAction);
                        setSelectedMsgForAction(null);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-white/90 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                    >
                      <CornerUpLeft size={15} className="text-[#ff006a]" />
                      <span>Javob berish</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedMsgForAction(null)}
                      className="w-full py-1.5 text-xs text-white/40 hover:text-white transition-colors text-center"
                    >
                      Bekor qilish
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* GIPHY Picker Popover */}
          <AnimatePresence>
            {showGifPicker && (
              <div className="absolute bottom-20 left-2 sm:left-4 z-50">
                <GifPicker
                  onSelectGif={handleSelectGif}
                  onClose={() => setShowGifPicker(false)}
                />
              </div>
            )}
          </AnimatePresence>

          {/* Scroll To Bottom Button */}
          <AnimatePresence>
            {showScrollBottom && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.7, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.7, y: 10 }}
                onClick={handleScrollToBottom}
                className="absolute right-4 sm:right-6 bottom-20 z-40 p-2.5 bg-[#12121c]/95 hover:bg-[#ff006a] text-[#ff006a] hover:text-white border border-[#ff006a]/40 hover:border-[#ff006a] rounded-full shadow-2xl backdrop-blur-md transition-all duration-200 cursor-pointer flex items-center justify-center group"
                title="Pastga tushish"
              >
                <ChevronDown className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Input Area */}
          <div className="p-2.5 sm:p-3.5 bg-[#0a0a10] border-t border-white/10 relative shrink-0">
            {isRecording ? (
              /* Voice Recording Active Bar */
              <div className="flex items-center justify-between bg-gradient-to-r from-[#1c0b14] via-[#150a12] to-[#1c0b14] border border-[#ff006a]/50 rounded-2xl px-4 py-2 shadow-lg shadow-[#ff006a]/15">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs sm:text-sm font-mono font-bold text-white tracking-wide">
                    {formatRecordingTime(recordingDuration)}
                  </span>
                  <span className="text-xs text-[#ff006a] font-semibold hidden sm:inline flex items-center gap-1">
                    <Mic size={14} className="animate-pulse" />
                    Ovozli xabar yozilmoqda...
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="p-2 text-white/50 hover:text-rose-400 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                    title="Bekor qilish"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={stopAndSendRecording}
                    className="px-4 py-1.5 bg-gradient-to-r from-[#ff006a] to-[#d40058] hover:opacity-90 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#ff006a]/30 transition-all cursor-pointer"
                    title="Yuborish"
                  >
                    <Send size={13} />
                    <span>Yuborish</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Standard Message Input Bar */
              <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
                {/* GIPHY Trigger Button */}
                <button
                  type="button"
                  onClick={() => setShowGifPicker(!showGifPicker)}
                  className={`px-3 py-2 rounded-xl text-xs font-black tracking-wider transition-all cursor-pointer border shrink-0 flex items-center gap-1 ${
                    showGifPicker
                      ? 'text-white bg-gradient-to-r from-[#ff006a] to-[#a855f7] border-[#ff006a] shadow-md shadow-[#ff006a]/40 scale-105'
                      : 'text-[#ff006a] bg-[#ff006a]/10 border-[#ff006a]/30 hover:bg-[#ff006a] hover:text-white hover:border-[#ff006a]'
                  }`}
                  title="Giphy Anime GIF Stikerlar"
                >
                  <Sparkles size={13} />
                  <span>GIF</span>
                </button>

                <div className="flex-1 relative flex items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder={replyingTo ? "Javob yozing..." : "Xabaringizni yozing..."}
                    className="w-full bg-[#12121a] border border-white/10 focus:border-[#ff006a]/60 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-white/35 focus:outline-none transition-colors shadow-inner"
                  />
                </div>

                {input.trim() ? (
                  <button
                    type="submit"
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl text-white bg-gradient-to-r from-[#ff0055] to-[#ff006a] hover:opacity-90 transition-all flex items-center justify-center shadow-lg shadow-[#ff006a]/30 cursor-pointer shrink-0"
                    title="Yuborish"
                  >
                    <ArrowUp className="w-5 h-5 stroke-[2.5]" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="p-2.5 sm:p-3 text-white/70 hover:text-white bg-[#14141c] hover:bg-[#ff006a] rounded-2xl transition-all flex items-center justify-center border border-white/10 hover:border-[#ff006a] cursor-pointer shrink-0 shadow-md"
                    title="Ovozli xabar yozish"
                  >
                    <Mic className="w-4 h-4 text-[#ff006a] hover:text-white" />
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Wallpaper Selection Modal */}
      <ChatWallpaperModal
        isOpen={showWallpaperModal}
        onClose={() => setShowWallpaperModal(false)}
        currentWallpaper={wallpaperUrl}
        currentDim={wallpaperDim}
        onSelectWallpaper={(url) => setWallpaperUrl(url)}
        onSelectDim={(dim) => setWallpaperDim(dim)}
      />
    </div>
  );
}
