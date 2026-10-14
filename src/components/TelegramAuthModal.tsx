import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Send, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Smartphone,
  KeyRound,
  ArrowLeft,
  RotateCcw
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
  // Steps: 'phone' -> 'code' -> 'success'
  const [step, setStep] = useState<'phone' | 'code' | 'success'>('phone');
  const [phone, setPhone] = useState('+998');
  const [code, setCode] = useState('');
  const [sessionId, setSessionId] = useState('');

  // Loading & Error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successUser, setSuccessUser] = useState<any>(null);

  // Countdown timer for resending code
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const codeInputRef = useRef<HTMLInputElement>(null);

  // Reset modal when opened
  useEffect(() => {
    if (isOpen) {
      setStep('phone');
      setPhone('+998');
      setCode('');
      setSessionId('');
      setError('');
      setSuccessUser(null);
      setLoading(false);
    }
  }, [isOpen]);

  // Handle countdown for resending code
  useEffect(() => {
    let timer: any;
    if (step === 'code' && countdown > 0) {
      setCanResend(false);
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (step === 'code' && countdown === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  // Focus code input when step switches to 'code'
  useEffect(() => {
    if (step === 'code') {
      setTimeout(() => {
        codeInputRef.current?.focus();
      }, 120);
    }
  }, [step]);

  // Poll for background authorization (if verified elsewhere)
  useEffect(() => {
    if (!sessionId || !isOpen || step === 'success') return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/telegram/status/${sessionId}`);
        const text = await res.text();
        let data: any = {};
        try { data = JSON.parse(text); } catch { return; }

        if (!isMounted) return;

        if (data.status === 'authorized' && data.token && data.user) {
          clearInterval(interval);
          setSuccessUser(data.user);
          setStep('success');

          setTimeout(() => {
            onSuccess(data.token, data.user);
            onClose();
          }, 1200);
        }
      } catch (err) {
        // Silently ignore background poll errors
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [sessionId, isOpen, step, onSuccess, onClose]);

  // Format phone number as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith('+')) {
      val = '+' + val.replace(/[^\d]/g, '');
    } else {
      val = '+' + val.slice(1).replace(/[^\d]/g, '');
    }
    setPhone(val);
  };

  // Step 1: Send verification code to Telegram
  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    const clean = phone.replace(/[^\d+]/g, '');
    if (clean.length < 9) {
      setError("Iltimos, to'liq telefon raqamingizni kiriting (masalan: +998901234567)");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/telegram/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean })
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Serverdan kutilmagan javob keldi. Iltimos qaytadan urinib ko'ring.");
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Kodni yuborishda xatolik yuz berdi");
      }

      setSessionId(data.sessionId);
      setStep('code');
      setCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      setError(err.message || "Telegram kodini yuborib bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code and login
  const handleVerifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    const cleanCode = code.trim();
    if (cleanCode.length !== 5) {
      setError("Iltimos, 5 xonali tasdiqlash kodini to'liq kiriting");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/telegram/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          phone,
          code: cleanCode
        })
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Serverdan kutilmagan javob keldi. Iltimos qaytadan urinib ko'ring.");
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Tasdiqlash kodi noto'g'ri");
      }

      setSuccessUser(data.user);
      setStep('success');

      setTimeout(() => {
        onSuccess(data.token, data.user);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Kodni tasdiqlashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit code when 5 digits are filled
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^\d]/g, '').slice(0, 5);
    setCode(val);
    if (val.length === 5) {
      setTimeout(() => {
        const submitBtn = document.getElementById('tg_verify_btn');
        if (submitBtn) submitBtn.click();
      }, 50);
    }
  };

  if (!isOpen) return null;

  return (
    <div id="telegram_auth_modal" className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-md bg-[#0e0e12] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <TelegramOfficialIcon className="w-5 h-5 text-[#0088cc]" />
            <span className="text-xs font-black uppercase tracking-wider text-white/90">
              Telegram Orqali Kirish
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

        {/* Modal Content */}
        <div className="p-6 sm:p-7">
          {/* Error Banner */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }} 
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-start gap-2.5"
            >
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* STEP: SUCCESS */}
          {step === 'success' && successUser && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6 flex flex-col items-center justify-center"
            >
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
                Xush kelibsiz!
              </h2>
              <p className="text-base font-bold text-emerald-400 mb-1">
                {successUser.name || 'Telegram Foydalanuvchisi'}
              </p>
              <p className="text-xs text-white/50">
                Profilingiz muvaffaqiyatli yuklandi. Yo'naltirilmoqda...
              </p>
            </motion.div>
          )}

          {/* STEP 1: PHONE NUMBER INPUT */}
          {step === 'phone' && (
            <motion.form 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleSendCode} 
              className="space-y-4"
            >
              <div className="text-center mb-5">
                <div className="w-14 h-14 bg-[#0088cc]/10 rounded-2xl flex items-center justify-center mx-auto mb-2.5 border border-[#0088cc]/30 shadow-[0_0_20px_rgba(0,136,204,0.2)]">
                  <Smartphone size={24} className="text-[#0088cc]" />
                </div>
                <h3 className="text-base font-black text-white">Telegram raqamingizni kiriting</h3>
                <p className="text-xs text-white/50 mt-1 max-w-xs mx-auto">
                  Telefon raqamingizni kiriting, botimiz sizga 5 xonali tasdiqlash kodini yuboradi.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-1.5">
                  Telegram Telefon Raqam
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-sm">
                    📱
                  </span>
                  <input
                    type="tel"
                    id="tg_phone_input"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="+998 90 123 45 67"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-[#0088cc] focus:ring-1 focus:ring-[#0088cc] transition-all font-mono tracking-wider"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-[#0088cc] to-[#00a2ed] hover:from-[#0077b5] hover:to-[#0088cc] text-white font-extrabold rounded-xl shadow-lg shadow-[#0088cc]/25 transition-all duration-300 hover:scale-[1.01] text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Yuborilmoqda...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Kodni yuborish</span>
                  </>
                )}
              </button>
            </motion.form>
          )}

          {/* STEP 2: CODE VERIFICATION (NO BOT BUTTON - DIRECT CODE ENTRY) */}
          {step === 'code' && (
            <motion.form 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleVerifyCode} 
              className="space-y-4"
            >
              <div className="text-center mb-3">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <KeyRound size={24} className="text-emerald-400" />
                </div>
                <h3 className="text-base font-black text-white">Tasdiqlash kodi</h3>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-xs text-white/60 font-mono">{phone}</span>
                  <button
                    type="button"
                    onClick={() => setStep('phone')}
                    className="text-[11px] text-[#0088cc] hover:underline font-bold cursor-pointer"
                  >
                    O'zgartirish
                  </button>
                </div>
              </div>

              {/* Confirmation Banner */}
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 size={16} />
                  <span>Telegramga kod yuborildi!</span>
                </div>
                <p className="text-[11px] text-white/60">
                  Iltimos, Telegramingizga kelgan 5 xonali kodni kiriting
                </p>
              </div>

              <div>
                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={5}
                  value={code}
                  onChange={handleCodeChange}
                  placeholder="• • • • •"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white text-center text-2xl font-black font-mono tracking-[0.5em] focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>

              <button
                id="tg_verify_btn"
                type="submit"
                disabled={loading || code.length !== 5}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:scale-[1.01] text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Tekshirilmoqda...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Tasdiqlash va Kirish</span>
                  </>
                )}
              </button>

              {/* Resend code */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="inline-flex items-center gap-1 text-white/40 hover:text-white transition-colors cursor-pointer text-[11px]"
                >
                  <ArrowLeft size={12} />
                  <span>Ortga</span>
                </button>

                {canResend ? (
                  <button
                    type="button"
                    onClick={() => handleSendCode()}
                    className="inline-flex items-center gap-1 text-[#0088cc] hover:underline font-bold cursor-pointer text-[11px]"
                  >
                    <RotateCcw size={12} />
                    <span>Kodni qayta yuborish</span>
                  </button>
                ) : (
                  <span className="text-white/40 text-[11px]">
                    Qayta yuborish ({countdown}s)
                  </span>
                )}
              </div>
            </motion.form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
