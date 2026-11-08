import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Trash2,
  CornerUpLeft,
  X,
  MessageCircle,
  Loader2,
  Users,
  Smile,
  Shield,
  Clock
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../services/api';

interface ChatMessage {
  id: string | number;
  user_id?: string | number;
  user_name: string;
  user_avatar?: string;
  user_avatar_frame?: string;
  avatar_frame_url?: string;
  content: string;
  reply_to_id?: string | number;
  reply_to_name?: string;
  reply_to_content?: string;
  created_at?: string;
  role?: string;
}

export const ChatScreen: React.FC = () => {
  const { user, token, openAuthModal } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // 1. Fetch initial message history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/chat/messages`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setMessages(data);
            setTimeout(() => scrollToBottom(false), 200);
          }
        }
      } catch (err) {
        console.warn("Chat xabarlarini yuklashda xatolik:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // 2. Connect to Socket.io
  useEffect(() => {
    const socketUrl = API_BASE || (typeof window !== 'undefined' ? window.location.origin : 'https://ss-test.wasmer.app');
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // connected
    });

    socket.on('newMessage', (msg: ChatMessage) => {
      setMessages((prev) => {
        // Prevent duplicate messages
        if (prev.some((m) => String(m.id) === String(msg.id))) return prev;
        return [...prev, msg];
      });
      setTimeout(() => scrollToBottom(true), 100);
    });

    socket.on('messageDeleted', (deletedId: any) => {
      setMessages((prev) => prev.filter((m) => String(m.id) !== String(deletedId)));
    });

    socket.on('userTyping', (data: { name: string }) => {
      if (data?.name && data.name !== user?.name) {
        setTypingUsers((prev) => Array.from(new Set([...prev, data.name])));
      }
    });

    socket.on('userStoppedTyping', (data: { name: string }) => {
      if (data?.name) {
        setTypingUsers((prev) => prev.filter((n) => n !== data.name));
      }
    });

    socket.on('onlineCount', (count: number) => {
      if (typeof count === 'number') setOnlineCount(count);
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.name]);

  // Handle typing debounce
  const typingTimerRef = useRef<any>(null);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!socketRef.current || !user) return;

    socketRef.current.emit('typing', { name: user.name || 'Foydalanuvchi' });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('stopTyping', { name: user?.name || 'Foydalanuvchi' });
    }, 2000);
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    // Prompt login if user is guest and wants to chat
    if (!user) {
      openAuthModal();
      return;
    }

    const payload = {
      user_id: user.id,
      user_name: user.name || 'Animem Foydalanuvchisi',
      user_avatar: user.avatar_url || null,
      user_avatar_frame: user.avatar_frame_url || null,
      content: text,
      reply_to_id: replyingTo?.id || null,
      reply_to_name: replyingTo?.user_name || null,
      reply_to_content: replyingTo?.content ? replyingTo.content.substring(0, 100) : null,
      created_at: new Date().toISOString(),
    };

    setInputText('');
    setReplyingTo(null);
    setShowEmojiPicker(false);

    // Send via socket first (0ms latency)
    if (socketRef.current?.connected) {
      socketRef.current.emit('sendMessage', payload);
    } else {
      // Fallback via HTTP API
      try {
        await fetch(`${API_BASE}/api/chat/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn("Xabar yuborishda xatolik:", err);
      }
    }
  };

  const handleDeleteMessage = async (msgId: string | number) => {
    if (!token) return;
    if (!window.confirm("Xabarni o'chirishni tasdiqlaysizmi?")) return;

    try {
      await fetch(`${API_BASE}/api/chat/messages/${msgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages((prev) => prev.filter((m) => String(m.id) !== String(msgId)));
    } catch (e) {}
  };

  const EMOJIS = ['❤️', '🔥', '✨', '😂', '😍', '👏', '🎉', '🍿', '🌸', '👑', '⚡', '💯'];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-md mx-auto relative bg-[#07070a]">
      {/* Top Header Bar */}
      <div className="px-4 py-2.5 bg-[#0f1016]/90 backdrop-blur-xl border-b border-white/10 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#ff006a] to-[#7928ca] p-0.5 flex items-center justify-center">
            <div className="w-full h-full bg-[#0f1016] rounded-[10px] flex items-center justify-center text-[#ff006a]">
              <MessageCircle size={16} />
            </div>
          </div>
          <div>
            <h3 className="font-display font-black text-sm text-white flex items-center gap-1.5">
              <span>Jonli Hamjamiyat Chati</span>
              <Sparkles size={12} className="text-[#00dfd8]" />
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-white/50">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Sayt bilan sinxron</span>
              </span>
            </div>
          </div>
        </div>

        {/* Live indicator badge */}
        <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5 text-xs font-bold text-white/80">
          <Users size={12} className="text-[#00dfd8]" />
          <span>{onlineCount || 1} online</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-2 py-20">
            <Loader2 size={32} className="text-[#ff006a] animate-spin" />
            <span className="text-xs text-white/40">Sinxron xabarlar yuklanmoqda...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-2 py-20">
            <MessageCircle size={40} className="text-white/20 mx-auto" />
            <p className="text-sm font-bold text-white">Chatda hali xabarlar yo'q</p>
            <p className="text-xs text-white/40">Birinchi bo'lib fikr bildiring!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = String(msg.user_id) === String(user?.id);
            const canDelete = user && (user.role === 'admin' || isMe);

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/20 bg-white/5">
                  {msg.user_avatar ? (
                    <img src={msg.user_avatar} alt={msg.user_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-xs text-[#ff006a] bg-[#141522]">
                      {msg.user_name?.charAt(0) || 'U'}
                    </div>
                  )}

                  {/* Frame */}
                  {(msg.user_avatar_frame || msg.avatar_frame_url) && (
                    <img
                      src={msg.user_avatar_frame || msg.avatar_frame_url}
                      alt="frame"
                      className="absolute inset-0 w-full h-full pointer-events-none scale-125"
                    />
                  )}
                </div>

                {/* Message Bubble Container */}
                <div className={`max-w-[78%] space-y-1 ${isMe ? 'items-end text-right' : 'items-start text-left'}`}>
                  {/* Sender Name */}
                  <div className={`flex items-center gap-1.5 text-[11px] ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span className="font-bold text-white/80">
                      {isMe ? 'Siz' : msg.user_name}
                    </span>
                    {msg.role === 'admin' && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                        Admin
                      </span>
                    )}
                  </div>

                  {/* Reply Reference Bubble */}
                  {msg.reply_to_content && (
                    <div className="text-[10px] text-white/60 bg-black/40 border-l-2 border-[#ff006a] px-2 py-1 rounded-r-lg truncate mb-1">
                      <span className="font-bold text-[#ff006a] mr-1">{msg.reply_to_name}:</span>
                      <span>{msg.reply_to_content}</span>
                    </div>
                  )}

                  {/* Text Content */}
                  <div
                    className={`relative p-3 rounded-2xl text-xs leading-relaxed group transition-all ${
                      isMe
                        ? 'bg-gradient-to-br from-[#ff006a] to-[#7928ca] text-white rounded-tr-none shadow-[0_4px_16px_rgba(255,0,106,0.25)]'
                        : 'bg-[#141522] border border-white/10 text-white/90 rounded-tl-none shadow-lg'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                    {/* Action buttons on hover / tap */}
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="p-1 rounded bg-black/60 text-white/70 hover:text-white"
                        title="Javob qaytarish"
                      >
                        <CornerUpLeft size={11} />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1 rounded bg-black/60 text-red-400 hover:text-red-300"
                          title="O'chirish"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  {msg.created_at && (
                    <span className="text-[9px] text-white/35 font-mono px-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-[11px] text-[#00dfd8] italic flex items-center gap-1.5 animate-pulse shrink-0">
          <span>{typingUsers.join(', ')} yozmoqda...</span>
        </div>
      )}

      {/* Replying Banner */}
      {replyingTo && (
        <div className="px-4 py-1.5 bg-[#141522] border-t border-white/10 flex items-center justify-between text-xs text-white/80 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <CornerUpLeft size={13} className="text-[#ff006a]" />
            <span className="font-bold text-[#ff006a]">{replyingTo.user_name} ga javob:</span>
            <span className="text-white/50 truncate max-w-[200px]">{replyingTo.content}</span>
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-white/50 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Quick Emoji Bar */}
      {showEmojiPicker && (
        <div className="px-3 py-2 bg-[#12131e] border-t border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setInputText((prev) => prev + emoji);
                inputRef.current?.focus();
              }}
              className="text-base p-1.5 hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Message Input Box */}
      <div className="p-3 bg-[#0f1016]/95 backdrop-blur-xl border-t border-white/10 shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all active:scale-95"
          >
            <Smile size={18} />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={user ? "Xabar yozing..." : "Chatda yozish uchun kiring..."}
            className="flex-1 bg-[#161726] border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#ff006a] transition-all"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ff006a] to-[#7928ca] text-white flex items-center justify-center transition-all disabled:opacity-40 active:scale-95 shadow-[0_0_15px_rgba(255,0,106,0.3)] shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
