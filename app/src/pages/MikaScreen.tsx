import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, Trash2 } from 'lucide-react';
import { askMikaAI } from '../services/api';

interface Message {
  id: string;
  sender: 'user' | 'mika';
  text: string;
  time: string;
}

const QUICK_PROMPTS = [
  "✨ Bugun nima tomosha qilsam bo'ladi?",
  "🔥 Eng zo'r jangari animelar qaysilar?",
  "🍿 Solo Leveling haqida aytib ber",
  "🌸 Romantik va quvnoq anime tavsiya et"
];

export const MikaScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'mika',
      text: "Salom! Men Mika — Animem Uz ilovasining sun'iy intellekt anime yordamchisiman! 🌸 Sizga qanday anime yoqadi? Yangi durdona topishda bajonidil yordam beraman!",
      time: "Hozirgina"
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputValue;
    if (!text.trim() || isTyping) return;

    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsTyping(true);

    try {
      const history = messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'model', text: m.text }));
      const reply = await askMikaAI(text, history);

      const mikaMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'mika',
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, mikaMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          sender: 'mika',
          text: "Kechirasiz, biroz texnik uzilish bo'ldi. Iltimos qaytadan so'rang! 🌸",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-md mx-auto px-4 pt-2">
      {/* Header Info */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ff006a] to-[#00dfd8] p-0.5 shadow-[0_0_15px_rgba(255,0,106,0.4)]">
            <div className="w-full h-full bg-[#0f1016] rounded-[14px] flex items-center justify-center text-lg">
              🌸
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#07070a] rounded-full animate-pulse shadow-[0_0_8px_#34d399]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              Mika AI <Sparkles size={13} className="text-[#00dfd8]" />
            </h3>
            <p className="text-[10px] text-emerald-400 font-bold">Har doim aloqada (Online)</p>
          </div>
        </div>

        <button
          onClick={() => setMessages([messages[0]])}
          className="text-white/40 hover:text-white p-2"
          title="Chatni tozalash"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-end gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'mika' && (
              <div className="w-6 h-6 rounded-full bg-[#ff006a]/20 border border-[#ff006a]/40 flex items-center justify-center text-xs shrink-0">
                🌸
              </div>
            )}

            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-lg ${
                m.sender === 'user'
                  ? 'bg-gradient-to-r from-[#ff006a] to-[#7928ca] text-white rounded-br-none'
                  : 'bg-[#0f1016] border border-white/10 text-white/90 rounded-bl-none'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.text}</p>
              <span className="block text-[9px] text-white/40 text-right mt-1 font-mono">
                {m.time}
              </span>
            </div>

            {m.sender === 'user' && (
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60 shrink-0">
                <User size={12} />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-white/50 text-xs">
            <div className="w-6 h-6 rounded-full bg-[#ff006a]/20 flex items-center justify-center text-xs">
              🌸
            </div>
            <div className="bg-[#0f1016] border border-white/10 rounded-2xl px-3 py-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff006a] animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff006a] animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff006a] animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2">
        {QUICK_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="shrink-0 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white px-2.5 py-1 rounded-full text-[11px] font-bold active:scale-95 transition-all"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2 pb-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Mikaga savol bering yoki anime so'rang..."
          className="flex-1 bg-[#0f1016] border border-white/10 focus:border-[#ff006a] rounded-2xl px-4 py-3 text-xs text-white placeholder-white/40 focus:outline-none transition-all shadow-inner"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isTyping}
          className="w-11 h-11 rounded-2xl bg-gradient-to-r from-[#ff006a] to-[#7928ca] text-white flex items-center justify-center shadow-[0_0_15px_rgba(255,0,106,0.4)] disabled:opacity-40 active:scale-95 transition-all"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
