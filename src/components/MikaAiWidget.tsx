import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Volume2, VolumeX, Maximize2, Minimize2, Trash2, AlertTriangle, Mic, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export type AnimeButton = {
  idOrSlug: string;
  title: string;
};

export type ChatMsg = {
  role: 'user' | 'model';
  content: string;
  isAbusive?: boolean;
  time: string;
  animeButtons?: AnimeButton[];
};

// Har xil yulduzchalar (*, **) va yulduzcha emojilarini (✨, ⭐, 🌟, 💫) tozalovchi va anime tugmalarini ajratib oluvchi funksiya
export const parseMikaReply = (raw: string): { cleanText: string; buttons: AnimeButton[] } => {
  if (!raw) return { cleanText: '', buttons: [] };
  const buttons: AnimeButton[] = [];

  // [ANIME_BUTTON: target | title] yoki [ANIME: target, title] teglarini ajratib olish
  const tagRegex = /\[ANIME(?:_BUTTON)?:\s*([^\|\]\,]+)(?:[\|,]\s*([^\]]+))?\]/gi;
  let cleanText = raw.replace(tagRegex, (_match, p1, p2) => {
    const target = (p1 || '').trim();
    const title = (p2 || target).trim();
    if (target) {
      buttons.push({ idOrSlug: target, title });
    }
    return '';
  });

  // Unicode flag 'u' bilan emoji buzilishini oldini olib, yulduzchalarni tozalash
  cleanText = cleanText
    .replace(/\*+/g, '')
    .replace(/[✨⭐🌟💫]/gu, '')
    .replace(/\uFFFD/g, '')
    .trim();

  return { cleanText, buttons };
};

export const stripStars = (text: string) => {
  if (!text) return '';
  return text
    .replace(/\*+/g, '')
    .replace(/[✨⭐🌟💫]/gu, '')
    .replace(/\uFFFD/g, '')
    .trim();
};

export default function MikaAiWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'model',
      content: "Salom! Men Mika — sizning ko‘p qirrali anime va sun’iy intellekt yordamchingizman 🌸 Menga animelar, manga yoki saytimiz bo‘yicha istalgan savolingizni berishingiz mumkin!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [abuseAlert, setAbuseAlert] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, loading, isOpen]);

  // Text to Speech
  const speakText = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const clean = stripStars(text).slice(0, 200);
      const utter = new SpeechSynthesisUtterance(clean);
      utter.pitch = 1.2;
      utter.rate = 1.0;
      utter.lang = 'uz-UZ';
      window.speechSynthesis.speak(utter);
    } catch {}
  };

  // Speech to Text (Microphone)
  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Brauzeringiz ovozli yozishni qo'llab-quvvatlamaydi.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'uz-UZ';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || loading) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setInput('');
    setAbuseAlert(null);
    setMessages(prev => [...prev, { role: 'user', content: textToSend, time }]);
    setLoading(true);

    try {
      const userProfile = user ? {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        isAdmin: user.role === 'admin'
      } : null;

      const res = await fetch('/api/mika/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token ? { 'Authorization': `Bearer ${user.token}` } : {})
        },
        body: JSON.stringify({
          message: textToSend,
          history: messages,
          userName: user?.name || "Mehmon",
          userProfile
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Xatolik yuz berdi");
      }

      // Javobdan yulduzchalarni tozalaymiz va anime tugmalarini ajratamiz
      const parsed = parseMikaReply(data.reply || "Xabar olindi 🌸");
      const combinedButtons = (Array.isArray(data.animeButtons) && data.animeButtons.length > 0)
        ? data.animeButtons
        : parsed.buttons;
      const isAbusive = Boolean(data.isAbusive);
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setMessages(prev => [...prev, {
        role: 'model',
        content: parsed.cleanText,
        isAbusive,
        time: replyTime,
        animeButtons: combinedButtons
      }]);

      if (isAbusive) {
        setAbuseAlert("🚨 Ushbu xabar Mika tomonidan noo‘rin deb topildi va Admin Panelga jo‘natildi!");
      }

      speakText(parsed.cleanText);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'model',
        content: `Kechirasiz, xatolik: ${err.message} 🌸`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button - O'ng burchakda umumiy chat tugmasining ustida, xalaqit bermaydigan qulay joylashuv */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-36 right-4 sm:bottom-24 sm:right-6 z-50 flex items-center group/btn"
          >
            {/* Tooltip on hover (desktop) */}
            <div className="hidden sm:flex items-center pointer-events-none opacity-0 group-hover/btn:opacity-100 transition-all duration-200 -translate-x-2 group-hover/btn:-translate-x-3 mr-1">
              <span className="bg-[#12121e]/95 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-[#ff006a]/40 shadow-lg whitespace-nowrap flex items-center gap-1">
                Mika AI 🌸
              </span>
            </div>

            <button
              onClick={() => setIsOpen(true)}
              className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#ff006a] via-[#b5179e] to-[#7209b7] hover:from-[#d40058] hover:to-[#5c0694] text-white shadow-[0_0_20px_rgba(255,0,106,0.45)] hover:shadow-[0_0_30px_rgba(255,0,106,0.8)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer border-2 border-white/30 flex items-center justify-center shrink-0"
              title="Mika AI yordamchi bilan suhbat"
            >
              {/* Center icon */}
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/15 flex items-center justify-center overflow-hidden border border-white/30">
                <span className="text-lg select-none">🌸</span>
              </div>

              {/* Online Green Indicator */}
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#09090b] rounded-full animate-pulse shadow-sm" />

              {/* Cute mini "AI" badge */}
              <span className="absolute -top-1 -right-1 bg-gradient-to-r from-[#ff006a] to-[#9333ea] text-[9px] font-black text-white px-1.5 py-0.2 rounded-full border border-white/40 shadow-sm leading-tight">
                AI
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window - O'ng tomonda ochiladi */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`fixed z-50 bg-[#0d0d16]/95 backdrop-blur-xl border border-[#ff006a]/40 shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(255,0,106,0.2)] rounded-2xl flex flex-col overflow-hidden ${
              isExpanded 
                ? 'inset-3 sm:inset-6 md:inset-10 w-auto h-auto' 
                : 'bottom-20 right-3 sm:bottom-6 sm:right-6 w-[94vw] sm:w-[390px] h-[560px] max-h-[85vh]'
            }`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#171725] via-[#1a1226] to-[#171725] border-b border-white/10 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#ff006a] to-[#9333ea] flex items-center justify-center border border-white/20 shadow-[0_0_12px_rgba(255,0,106,0.4)]">
                    <span className="text-base select-none">🌸</span>
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#171725] rounded-full" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Mika 🌸
                    <span className="text-[9px] bg-[#ff006a]/20 text-[#ff006a] border border-[#ff006a]/30 px-1.5 py-0.2 rounded-full font-mono">
                      Qiz bola AI
                    </span>
                    {user?.role === 'admin' && (
                      <span className="text-[9px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-1.5 py-0.2 rounded-full font-mono flex items-center gap-0.5">
                        👑 Admin
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-white/50">Har doim siz bilan • Animem.uz</p>
                </div>
              </div>

              {/* Window Controls */}
              <div className="flex items-center gap-1 text-white/60">
                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className={`p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors ${
                    voiceEnabled ? 'text-[#ff006a]' : ''
                  }`}
                  title={voiceEnabled ? "Ovozli o‘qish yoqilgan" : "Ovozli o‘qish o‘chirilgan"}
                >
                  {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>

                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors hidden sm:block"
                  title={isExpanded ? "Kichraytirish" : "Kattalashtirish"}
                >
                  {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>

                <button
                  onClick={() => {
                    if (window.confirm("Chatni tozalamoqchimisiz?")) {
                      setMessages([{
                        role: 'model',
                        content: "Suhbat tozalandi! Qaytadan boshlaymiz 🌸",
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      }]);
                    }
                  }}
                  className="p-1.5 rounded-lg hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Tarixni tozalash"
                >
                  <Trash2 size={16} />
                </button>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors ml-1"
                  title="Yopish"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Abuse Banner */}
            {abuseAlert && (
              <div className="bg-red-950/90 border-b border-red-500/40 text-red-200 px-3 py-2 text-[11px] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-red-400 shrink-0" />
                  <span>{abuseAlert}</span>
                </div>
                <button onClick={() => setAbuseAlert(null)} className="text-white/60 hover:text-white ml-1 font-bold">
                  ✕
                </button>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3 custom-scrollbar text-xs">
              {messages.map((msg, i) => {
                const isMe = msg.role === 'user';
                const { cleanText, buttons: parsedButtons } = isMe
                  ? { cleanText: msg.content, buttons: [] }
                  : parseMikaReply(msg.content);
                const buttons = (msg.animeButtons && msg.animeButtons.length > 0)
                  ? msg.animeButtons
                  : parsedButtons;

                return (
                  <div
                    key={i}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 leading-relaxed shadow-md ${
                        isMe
                          ? 'bg-gradient-to-r from-[#ff006a] to-[#d40058] text-white rounded-br-none'
                          : msg.isAbusive
                          ? 'bg-red-950/70 border border-red-500/50 text-red-100 rounded-bl-none shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                          : 'bg-[#181824] border border-white/10 text-white/90 rounded-bl-none'
                      }`}
                    >
                      {msg.isAbusive && (
                        <div className="flex items-center gap-1 text-red-400 font-bold mb-1 text-[10px]">
                          <AlertTriangle size={12} />
                          <span>Mika xafa bo‘ldi 😢 (Shikoyat adminga yuborildi)</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{cleanText}</p>

                      {/* Anime Ko'rish Tugmalari */}
                      {!isMe && buttons.length > 0 && (
                        <div className="mt-2.5 flex flex-col gap-1.5 w-full">
                          {buttons.map((btn, bIdx) => (
                            <Link
                              key={bIdx}
                              to={`/anime/${btn.idOrSlug}`}
                              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-[#ff006a]/20 via-[#9333ea]/20 to-[#ff006a]/10 hover:from-[#ff006a]/35 hover:to-[#9333ea]/35 border border-[#ff006a]/40 hover:border-[#ff006a]/70 text-white font-medium text-xs transition-all duration-200 group active:scale-98 shadow-sm hover:shadow-[0_0_15px_rgba(255,0,106,0.3)]"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="p-1.5 rounded-lg bg-gradient-to-tr from-[#ff006a] to-[#9333ea] text-white shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_8px_rgba(255,0,106,0.5)]">
                                  <Play size={11} className="fill-current text-white" />
                                </span>
                                <div className="flex flex-col text-left min-w-0">
                                  <span className="truncate font-bold text-white group-hover:text-pink-200 text-xs">
                                    {btn.title}
                                  </span>
                                  <span className="text-[9px] text-white/50 leading-none">Animem.uz da tomosha qilish</span>
                                </div>
                              </div>
                              <span className="text-[11px] text-[#ff006a] group-hover:text-pink-300 shrink-0 flex items-center gap-1 font-bold">
                                Ko‘rish ➔
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-white/30 mt-1 px-1">{msg.time}</span>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 text-[#ff006a] text-xs py-1 animate-pulse">
                  <span>Mika yozmoqda... 🌸</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            <div className="px-3 py-1.5 border-t border-white/5 flex gap-1.5 overflow-x-auto no-scrollbar bg-[#090910]">
              <button
                onClick={() => handleSend("Mika, eng zo‘r anime qaysi? Tomosha qilishga tavsiya ber")}
                disabled={loading}
                className="text-[10px] bg-white/5 hover:bg-[#ff006a]/20 border border-white/10 text-white/70 hover:text-white px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex items-center gap-1"
              >
                🎬 Anime tavsiya qil
              </button>
              <button
                onClick={() => handleSend("Meni taniysanmi? Men adminmanmi yoqmi?")}
                disabled={loading}
                className="text-[10px] bg-white/5 hover:bg-[#ff006a]/20 border border-white/10 text-white/70 hover:text-white px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex items-center gap-1"
              >
                👑 Men adminmanmi?
              </button>
              <button
                onClick={() => handleSend("Kayfiyatimni ko‘taradigan shirin gap ayt 🌸")}
                disabled={loading}
                className="text-[10px] bg-white/5 hover:bg-[#ff006a]/20 border border-white/10 text-white/70 hover:text-white px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex items-center gap-1"
              >
                💖 Kayfiyat ko‘tar
              </button>
              <button
                onClick={() => handleSend("Saytda qanday qilib manga o‘qiyman?")}
                disabled={loading}
                className="text-[10px] bg-white/5 hover:bg-[#ff006a]/20 border border-white/10 text-white/70 hover:text-white px-2.5 py-1 rounded-full whitespace-nowrap transition-colors flex items-center gap-1"
              >
                📖 Manga o‘qish
              </button>
            </div>

            {/* Input Area */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-2.5 bg-[#12121e] border-t border-white/10 flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-xl border transition-all ${
                  isListening
                    ? 'bg-red-500 text-white border-red-400 animate-pulse'
                    : 'border-white/10 text-white/50 hover:text-white hover:bg-white/5'
                }`}
                title="Ovoz bilan yozish"
              >
                <Mic size={15} />
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                placeholder="Mikaga savol yozing... 🌸"
                className="flex-1 bg-white/5 border border-white/10 focus:border-[#ff006a] rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none transition-colors"
              />

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2 bg-[#ff006a] hover:bg-[#d40058] disabled:opacity-40 text-white rounded-xl transition-all shadow-[0_0_10px_rgba(255,0,106,0.4)] cursor-pointer"
                title="Yuborish"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
