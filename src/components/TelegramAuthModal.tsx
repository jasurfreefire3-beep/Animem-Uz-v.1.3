import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Send, 
  Loader2, 
  CheckCircle2, 
  ExternalLink,
  AlertCircle,
  Smartphone
} from 'lucide-react';

// Official Authentic Telegram Logo SVG
export const TelegramOfficialIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={`fill-current shrink-0 ${className}`} aria-hidden="true">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.197 1.006.128.832.946z" />
  </svg>
);

interface TelegramAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string, user: any) => void;
  botUsername?: string;
}

export default function TelegramAuthModal({
  isOpen,
  onClose,
  onSuccess,
  botUsername = 'animem_auth_bot'
}: TelegramAuthModalProps) {
  // Bot auth states
  const [sessionId, setSessionId] = useState('');
  const [botStatus, setBotStatus] = useState<'pending' | 'pending_phone' | 'authorized' | 'expired' | ''>('');
  const [botProgress, setBotProgress] = useState(1);
  const [botLoading, setBotLoading] = useState(false);

  // Telegram WebApp detection (if in-app browser)
  const [isTelegramWebApp, setIsTelegramWebApp] = useState(false);
  const [webAppUser, setWebAppUser] = useState<any>(null);

  // Success & Error states
  const [error, setError] = useState('');
  const [successUser, setSuccessUser] = useState<any>(null);

  // Detect Telegram WebApp context
  useEffect(() => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
        setIsTelegramWebApp(true);
        setWebAppUser(tg.initDataUnsafe.user);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Initialize bot session when opened
  useEffect(() => {
    if (isOpen) {
      setError('');
      setBotStatus('pending');
      setBotProgress(1);
      setSuccessUser(null);
      setBotLoading(true);

      fetch('/api/auth/telegram/session')
        .then(res => res.json())
        .then(data => {
          if (data.sessionId) {
            setSessionId(data.sessionId);
          }
        })
        .catch(err => {
          console.error("Auto session error:", err);
          setError("Telegram seansini yaratib bo'lmadi. Qaytadan urinib ko'ring.");
        })
        .finally(() => {
          setBotLoading(false);
        });
    }
  }, [isOpen]);

  // Handle Telegram WebApp 1-Click Login
  const handleWebAppLogin = async () => {
    if (!webAppUser) return;
    try {
      setBotLoading(true);
      setError('');
      const tg = (window as any).Telegram?.WebApp;
      const res = await fetch('/api/auth/telegram/webapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: webAppUser,
          initData: tg?.initData || ''
        })
      });

      const data = await res.json();
      if (!res.ok || !data.token || !data.user) {
        throw new Error(data.error || "Telegram hisobidan kirishda xatolik");
      }

      setSuccessUser(data.user);
      setTimeout(() => {
        onSuccess(data.token, data.user);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Telegram hisobidan kirishda xatolik");
    } finally {
      setBotLoading(false);
    }
  };

  // Refresh bot session manually
  const refreshBotSession = async () => {
    try {
      setError('');
      setBotLoading(true);
      setBotProgress(1);
      setBotStatus('pending');

      const res = await fetch('/api/auth/telegram/session');
      const data = await res.json();

      if (data.sessionId) {
        setSessionId(data.sessionId);
      } else {
        throw new Error("Telegram seansini yaratib bo'lmadi");
      }
    } catch (err: any) {
      setError(err.message || 'Telegram bot seansini boshlashda xatolik');
    } finally {
      setBotLoading(false);
    }
  };

  // Poll Bot Session Status
  useEffect(() => {
    if (!sessionId || !isOpen || botStatus === 'authorized') return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/telegram/status/${sessionId}`);
        const data = await res.json();

        if (!isMounted) return;

        if (data.status) {
          setBotStatus(data.status);
          if (data.status === 'pending_phone') {
            setBotProgress(2);
          } else if (data.status === 'authorized') {
            setBotProgress(3);
            setSuccessUser(data.user);
            clearInterval(interval);

            setTimeout(() => {
              onSuccess(data.token, data.user);
              onClose();
            }, 1200);
          } else if (data.status === 'expired') {
            setError('Telegram avtorizatsiya vaqti tugadi. Iltimos qaytadan urining.');
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error('Error polling Telegram session:', err);
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId, isOpen, botStatus, onSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <div id="telegram_auth_modal" className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-md bg-[#0e0e12] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <TelegramOfficialIcon className="w-4 h-4 text-[#0088cc]" />
            <span className="text-[11px] font-black uppercase tracking-wider text-white/80">
              Telegram Bot Orqali Kirish
            </span>
          </div>

          <button
            id="tg_close_btn"
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors p-1.5 bg-white/5 hover:bg-white/10 rounded-full cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7">
          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-start gap-2.5">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success State */}
          {successUser ? (
            <div className="text-center py-6 flex flex-col items-center justify-center">
              <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 bg-emerald-500/20 rounded-full"
                />
                {successUser.avatar_url ? (
                  <img
                    src={successUser.avatar_url}
                    alt={successUser.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-lg shadow-emerald-500/30"
                  />
                ) : (
                  <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400">
                    <CheckCircle2 size={32} className="text-white" />
                  </div>
                )}
              </div>

              <h2 className="text-xl font-black text-white uppercase tracking-wider mb-1">
                Muvaffaqiyatli!
              </h2>
              <p className="text-sm font-bold text-emerald-400 mb-1">
                {successUser.name || 'Telegram Foydalanuvchisi'}
              </p>
              <p className="text-xs text-white/50">
                Siz saytga muvaffaqiyatli kirdingiz. Bosh sahifaga yo'naltirilmoqda...
              </p>
            </div>
          ) : (
            <>
              {/* If opened directly inside Telegram App WebApp */}
              {isTelegramWebApp && webAppUser && (
                <div className="mb-5">
                  <button
                    onClick={handleWebAppLogin}
                    disabled={botLoading}
                    className="w-full text-left p-4 rounded-xl border border-emerald-500/50 bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent hover:border-emerald-400 transition-all duration-300 relative group cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                        {botLoading ? <Loader2 size={20} className="animate-spin" /> : <Smartphone size={20} />}
                      </div>
                      <div>
                        <div className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                          Telegram ilovasi aniqlandi
                        </div>
                        <div className="text-sm font-black text-white">
                          @{webAppUser.username || webAppUser.first_name} sifatida 1 bosishda kirish
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Bot Flow Screen */}
              <div>
                <div className="text-center mb-5">
                  <div className="w-14 h-14 bg-[#0088cc]/10 rounded-2xl flex items-center justify-center mx-auto mb-2.5 border border-[#0088cc]/30 shadow-[0_0_20px_rgba(0,136,204,0.2)]">
                    <Send size={24} className="text-[#0088cc]" />
                  </div>
                  <h3 className="text-base font-black text-white">Telegram Bot orqali kirish</h3>
                  <p className="text-xs text-[#0088cc] font-bold mt-0.5">@{botUsername}</p>
                  <p className="text-[11px] text-white/50 mt-1 max-w-xs mx-auto">
                    Telegram ilovangizda botni oching va bir zumda saytga kiring.
                  </p>
                </div>

                {/* Progress Indicators */}
                <div className="flex justify-center items-center gap-2 mb-5">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                    botProgress === 1 
                      ? 'bg-[#0088cc]/15 border-[#0088cc]/40 text-[#0088cc]' 
                      : 'bg-white/5 border-white/10 text-white/40'
                  }`}>
                    <span className="w-4 h-4 rounded-full bg-[#0088cc] text-white flex items-center justify-center text-[9px] font-black">1</span>
                    Botda START bosing
                  </div>
                  <div className="w-4 h-[1px] bg-white/10"></div>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                    botProgress === 2 
                      ? 'bg-[#0088cc]/15 border-[#0088cc]/40 text-[#0088cc]' 
                      : 'bg-white/5 border-white/10 text-white/40'
                  }`}>
                    <span className="w-4 h-4 rounded-full bg-[#0088cc] text-white flex items-center justify-center text-[9px] font-black">2</span>
                    Tasdiqlash
                  </div>
                </div>

                {botProgress === 1 ? (
                  <div className="space-y-4 text-center">
                    <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl">
                      {botLoading ? (
                        <div className="flex flex-col items-center justify-center py-4 gap-2">
                          <Loader2 size={24} className="animate-spin text-[#0088cc]" />
                          <span className="text-xs text-white/60">Seans tayyorlanmoqda...</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <a
                            id="tg_bot_open_link"
                            href={`https://t.me/${botUsername}?start=${sessionId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-[#0088cc] to-[#00a2ed] hover:from-[#0077b5] hover:to-[#0088cc] text-white font-bold rounded-xl shadow-lg shadow-[#0088cc]/25 transition-all duration-300 hover:scale-[1.02] text-xs uppercase tracking-wider cursor-pointer"
                          >
                            <TelegramOfficialIcon className="w-4 h-4 text-white" />
                            Telegram Botni ochish (@{botUsername})
                            <ExternalLink size={13} className="opacity-70" />
                          </a>

                          <button
                            onClick={refreshBotSession}
                            className="text-[11px] text-white/40 hover:text-white/80 transition-colors underline cursor-pointer"
                          >
                            Yangi seans yaratish
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400/90 rounded-xl text-left flex items-start gap-2">
                      <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                      <span>
                        Botga kirib <strong>START</strong> tugmasini bosishingiz bilan ushbu sahifada avtomatik profilingizga kiriladi.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-center py-3">
                    <p className="text-xs text-white/70 leading-relaxed max-w-xs mx-auto">
                      Botda paydo bo'lgan <strong className="text-emerald-400">"📱 Telefon raqamni yuborish"</strong> tugmasini bosing.
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl text-xs font-bold">
                      <Loader2 size={14} className="animate-spin" />
                      Raqam yuborilishi kutilmoqda...
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
