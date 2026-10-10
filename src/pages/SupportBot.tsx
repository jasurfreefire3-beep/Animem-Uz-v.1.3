import React, { useState, useEffect, useRef } from 'react';
import { Send, CornerUpLeft, MessageCircle, Volume2, VolumeX, AlertTriangle, Trash2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

type BotMessage = {
  role: 'user' | 'model';
  content: string;
  isAbusive?: boolean;
};

const stripStars = (text: string) => {
  if (!text) return '';
  return text.replace(/[*✨⭐🌟💫]/g, '').trim();
};

const MIKA_MODES = [
  { id: 'default', label: '🌸 Anime Do‘sti', desc: 'Samimiy suhbat va kayfiyat' },
  { id: 'anime_expert', label: '🎬 Anime & Manga', desc: 'Tavsiyalar va syujetlar' },
  { id: 'site_guide', label: '🌐 Sayt Yordamchisi', desc: 'Pleyer va xizmatlar' },
  { id: 'creative', label: '✍️ Ijod & Matn', desc: 'Hikoyalar va arizalar' },
  { id: 'expert', label: '🧠 Aqlli Ekspert', desc: 'Keng qamrovli tahlil' },
];

const QUICK_PROMPTS = [
  "🌸 Mika, o‘zing haqingda aytib ber!",
  "🎬 Bugun qaysi qiziqarli animeni ko‘rishni tavsiya qilasan?",
  "📌 Animem.uz saytida sevimli ro‘yxatimni qanday yarataman?",
  "✍️ Anime mavzusida chiroyli she’r yoki post yozib ber",
  "💡 Naruto yoki Attack on Titan ga o‘xshash anime bormi?"
];

export default function SupportBot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<BotMessage[]>([
    { 
      role: 'model', 
      content: "Assalomu alaykum! Men Mika — sizning ko‘p qirrali anime yordamchingiz va samimiy dugonangizman 🌸 Saytimiz, animelar, manga yoki istalgan mavzuda bemalol so‘rashingiz mumkin! Sizga qanday yordam bera olaman?" 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState('default');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [lastAbuseAlert, setLastAbuseAlert] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Text-to-Speech (Web Speech API)
  const speakText = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const clean = stripStars(text).slice(0, 200);
      const utter = new SpeechSynthesisUtterance(clean);
      utter.rate = 1.0;
      utter.pitch = 1.2;
      utter.lang = 'uz-UZ';
      window.speechSynthesis.speak(utter);
    } catch (e) {}
  };

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || loading) return;

    setInput('');
    setLastAbuseAlert(null);
    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
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
          userName: user?.name || "Mehmon",
          mode: activeMode
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Mika bilan bog‘lanishda xatolik yuz berdi");
      }

      const replyContent = stripStars(data.reply || "Xabar qabul qilindi 🌸");
      const isAbusive = Boolean(data.isAbusive);

      setMessages(prev => [...prev, { role: 'model', content: replyContent, isAbusive }]);

      if (isAbusive) {
        setLastAbuseAlert("🚨 Sizning xabaringiz Mika tomonidan noo‘rin deb topildi va Admin Panelga shikoyat sifatida qayd etildi!");
      }

      speakText(replyContent);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'model', content: `Kechirasiz, xatolik: ${err.message} 🌸` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Suhbat tarixini tozalashni xohlaysizmi?")) {
      setMessages([
        { 
          role: 'model', 
          content: "Suhbat tozalandi! Qaytadan boshlaymiz 🌸 Sizga qanday yordam bera olaman?" 
        }
      ]);
      setLastAbuseAlert(null);
    }
  };

  const latestMessage = messages[messages.length - 1];
  const isMikaUpset = Boolean(latestMessage?.isAbusive);

  return (
    <div className="min-h-screen bg-[#06060c] text-white flex flex-col relative overflow-hidden font-sans">
      {/* Background Anime Neon Glow */}
      <div 
        className="absolute inset-0 z-0 opacity-25 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 30%, #ff006a 0%, #7928ca 40%, transparent 75%)',
        }}
      />
      <div 
        className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
        style={{
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '35px 35px'
        }}
      />

      {/* Top Header */}
      <header className="z-20 border-b border-white/10 bg-[#0c0c14]/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-white/60 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
            <ArrowLeft size={20} />
          </Link>
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-2 border-[#ff006a] overflow-hidden bg-gradient-to-tr from-[#ff006a] to-[#9333ea] flex items-center justify-center shadow-[0_0_15px_rgba(255,0,106,0.5)]">
              <span className="text-xl select-none">🌸</span>
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#0c0c14] rounded-full"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-white flex items-center gap-1.5">
                Mika AI
                <span className="text-[10px] bg-[#ff006a]/20 text-[#ff006a] border border-[#ff006a]/40 px-2 py-0.5 rounded-full font-mono">
                  Gemini 3.8
                </span>
              </h1>
            </div>
            <p className="text-xs text-white/50">Animem.uz rasmiy ko‘p qirrali anime qiz assistenti</p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded-lg text-xs flex items-center gap-1.5 transition-all border ${
              voiceEnabled 
                ? 'bg-[#ff006a]/20 border-[#ff006a] text-[#ff006a] shadow-[0_0_10px_rgba(255,0,106,0.3)]' 
                : 'border-white/10 text-white/50 hover:bg-white/5'
            }`}
            title={voiceEnabled ? "Ovozli o‘qish yoqilgan" : "Ovozli o‘qish o‘chirilgan"}
          >
            {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span className="hidden sm:inline">{voiceEnabled ? 'Ovoz yoqilgan' : 'Ovoz'}</span>
          </button>

          <button 
            onClick={handleClearHistory}
            className="p-2 rounded-lg text-xs border border-white/10 text-white/50 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-all flex items-center gap-1"
            title="Tarixni tozalash"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">Tozalash</span>
          </button>
        </div>
      </header>

      {/* Mode Selector Tabs */}
      <div className="z-10 bg-[#0a0a10]/60 backdrop-blur border-b border-white/5 px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {MIKA_MODES.map(mode => (
          <button
            key={mode.id}
            onClick={() => setActiveMode(mode.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border ${
              activeMode === mode.id
                ? 'bg-gradient-to-r from-[#ff006a] to-[#7928ca] text-white border-transparent shadow-[0_0_12px_rgba(255,0,106,0.4)]'
                : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>{mode.label}</span>
          </button>
        ))}
      </div>

      {/* Abuse Alert Banner */}
      <AnimatePresence>
        {lastAbuseAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="z-20 bg-red-950/80 border-b border-red-500/40 text-red-200 px-4 py-2.5 text-xs flex items-center justify-between backdrop-blur-md"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400 shrink-0" />
              <span>{lastAbuseAlert}</span>
            </div>
            <button 
              onClick={() => setLastAbuseAlert(null)}
              className="text-white/60 hover:text-white ml-2 text-sm font-bold"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-end pb-6 z-10 w-full max-w-4xl mx-auto px-4 overflow-hidden">
        
        {/* Visual Novel Character Sprite */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative mb-2 w-full max-w-[280px] md:max-w-[340px] aspect-square flex items-end justify-center drop-shadow-[0_0_25px_rgba(255,0,106,0.35)]"
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <img 
              src="https://api.dicebear.com/7.x/lorelei/svg?seed=MikaAnimeGirl&backgroundColor=ff006a,9333ea&mouth=happy01,smile01&eyes=happy01,wink" 
              alt="Mika" 
              className={`w-64 h-64 object-contain rounded-2xl transition-transform duration-300 ${
                isMikaUpset ? 'filter hue-rotate-180 brightness-90 animate-pulse' : 'hover:scale-105'
              }`}
            />
            {/* Emotion Badge */}
            <div className="absolute top-2 right-4 bg-[#0c0c14]/90 border border-white/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg">
              {isMikaUpset ? (
                <span className="text-red-400">😢 Xafa bo‘ldi</span>
              ) : (
                <span className="text-[#ff006a]">🌸 Kayfiyati a’lo</span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Visual Novel Dialogue Box */}
        <div className="w-full">
          <div className={`bg-[#0f0f18]/95 backdrop-blur-md border ${
            isMikaUpset ? 'border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.25)]' : 'border-[#ff006a]/40 shadow-[0_0_20px_rgba(255,0,106,0.15)]'
          } p-5 md:p-6 rounded-2xl relative min-h-[140px] max-h-[300px] overflow-y-auto flex flex-col justify-between transition-colors custom-scrollbar`}>
            
            {/* Name Tag */}
            <div className="absolute -top-3.5 left-5 bg-gradient-to-r from-[#ff006a] to-[#7928ca] text-white px-4 py-0.5 rounded-full text-xs font-bold tracking-wider uppercase shadow-[0_0_12px_rgba(255,0,106,0.5)] flex items-center gap-1.5">
              <span>{latestMessage?.role === 'model' ? 'MIKA 🌸' : (user?.name || 'Siz')}</span>
              {latestMessage?.role === 'model' && (
                <span className="text-[10px] opacity-80 lowercase font-normal">AI yordamchi</span>
              )}
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div 
                key={messages.length + (loading ? '_loading' : '')}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm md:text-base text-white/95 leading-relaxed font-sans whitespace-pre-wrap mt-2"
              >
                {loading ? (
                  <div className="flex items-center gap-2 text-[#ff006a] font-mono animate-pulse">
                    <span>Mika o‘ylamoqda va javob tayyorlamoqda... 🌸</span>
                  </div>
                ) : (
                  stripStars(latestMessage?.content || '')
                )}
              </motion.div>
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar py-1">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="text-xs bg-white/5 hover:bg-[#ff006a]/20 border border-white/10 hover:border-[#ff006a]/40 text-white/70 hover:text-white px-3 py-1.5 rounded-full whitespace-nowrap transition-all shrink-0 cursor-pointer disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="mt-3 flex gap-2">
            <div className="flex-1 bg-[#0f0f18]/90 backdrop-blur-md border border-white/15 focus-within:border-[#ff006a] rounded-xl px-4 py-2 flex items-center shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all">
              <span className="text-[#ff006a] mr-2 font-bold select-none">💬</span>
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={loading}
                placeholder="Mikaga savolingizni yozing... (so‘kinmang, u xafa bo‘ladi 😊)"
                className="w-full bg-transparent border-none outline-none text-white text-sm placeholder:text-white/30 disabled:opacity-50"
              />
            </div>
            <button 
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-[#ff006a] to-[#7928ca] hover:from-[#d40058] hover:to-[#601fa6] disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all shadow-[0_0_15px_rgba(255,0,106,0.3)] flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>Yuborish</span>
              <Send size={15} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}