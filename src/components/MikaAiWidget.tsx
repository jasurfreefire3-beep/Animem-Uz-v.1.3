import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles, Volume2, VolumeX, Maximize2, Minimize2, Trash2, AlertTriangle, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

type ChatMsg = {
  role: 'user' | 'model';
  content: string;
  isAbusive?: boolean;
  time: string;
};

export default function MikaAiWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'model',
      content: "Salom! Men Mika — sizning ko‘p qirrali anime va sun’iy intellekt yordamchingizman 🌸✨ Menga animelar, manga yoki saytimiz bo‘yicha istalgan savolingizni berishingiz mumkin!",
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
      const clean = text.replace(/[*#_`~]/g, '').slice(0, 200);
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
      const res = await fetch('/api/mika/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token ? { 'Authorization': `Bearer ${user.token}` } : {})
        },
        body: JSON.stringify({
          message: textToSend,
          history: messages,
          userName: user?.name || "Mehmon"
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Xatolik yuz berdi");
      }

      const replyContent = data.reply || "Xabar olindi 🌸";
      const isAbusive = Boolean(data.isAbusive);
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setMessages(prev => [...prev, {
        role: 'model',
        content: replyContent,
        isAbusive,
        time: replyTime
      }]);

      if (isAbusive) {
        setAbuseAlert("🚨 Ushbu xabar Mika tomonidan noo‘rin deb topildi va Admin Panelga jo‘natildi!");
      }

      speakText(replyContent);
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
      {/* Floating Launcher Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-2"
          >
            <button
              onClick={() => setIsOpen(true)}
              className="group relative flex items-center gap-2.5 bg-gradient-to-r from-[#ff006a] to-[#9333ea] hover:from-[#d40058] hover:to-[#7e22ce] text-white px-4 py-3 rounded-full shadow-[0_0_25px_rgba(255,0,106,0.5)] hover:shadow-[0_0_35px_rgba(255,0,106,0.8)] transition-all cursor-pointer border border-white/20 active:scale-95"
              title="Mika AI bilan suhbatlashish"
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border border-white/40">
                  <span className="text-base select-none">🌸</span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 border-2 border-[#121212] rounded-full animate-pulse" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-black tracking-wide flex items-center gap-1">
                  Mika AI
                  <Sparkles size={12} className="text-yellow-300 animate-spin" style={{ animationDuration: '4s' }} />
                </span>
                <span className="text-[10px] text-white/80 leading-none">Anime Yordamchi</span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`fixed z-50 bg-[#0d0d16]/95 backdrop-blur-xl border border-[#ff006a]/40 shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(255,0,106,0.2)] rounded-2xl flex flex-col overflow-hidden ${
              isExpanded 
                ? 'inset-4 md:inset-10 w-auto h-auto' 
                : 'bottom-20 right-4 md:bottom-6 md:right-6 w-[94vw] sm:w-[390px] h-[560px] max-h-[85vh]'
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
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <span className="text-[9px] text-white/30 mt-1 px-1">{msg.time}</span>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 text-[#ff006a] text-xs py-1 animate-pulse">
                  <Sparkles size={14} />
                  <span>Mika yozmoqda... 🌸</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            <div className="px-3 py-1.5 border-t border-white/5 flex gap-1.5 overflow-x-auto no-scrollbar bg-[#090910]">
              <button
                onClick={() => handleSend("Mika, eng zo‘r anime qaysi?")}
                disabled={loading}
                className="text-[10px] bg-white/5 hover:bg-[#ff006a]/20 border border-white/10 text-white/70 hover:text-white px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
              >
                🎬 Qaysi anime ko‘ray?
              </button>
              <button
                onClick={() => handleSend("Saytda qanday qilib manga o‘qiyman?")}
                disabled={loading}
                className="text-[10px] bg-white/5 hover:bg-[#ff006a]/20 border border-white/10 text-white/70 hover:text-white px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
              >
                📖 Manga o‘qish
              </button>
              <button
                onClick={() => handleSend("Kayfiyatimni ko‘taradigan gap ayt 🌸")}
                disabled={loading}
                className="text-[10px] bg-white/5 hover:bg-[#ff006a]/20 border border-white/10 text-white/70 hover:text-white px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
              >
                💖 Kayfiyat ko‘tar
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

