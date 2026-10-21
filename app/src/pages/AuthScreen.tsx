import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  Lock,
  User as UserIcon,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ExternalLink,
  ShieldCheck,
  Send,
  Eye,
  EyeOff,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Official SVG Logos
const TelegramLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0" aria-hidden="true">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.197 1.006.128.832.946z" />
  </svg>
);

const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
    />
    <path
      fill="#4285F4"
      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
    />
    <path
      fill="#FBBC05"
      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z"
    />
    <path
      fill="#34A853"
      d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
    />
  </svg>
);

const DiscordLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current shrink-0" aria-hidden="true">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const GOOGLE_CLIENT_ID = "1045938197563-q078ssunbfut19gl87jti0ti5svighqt.apps.googleusercontent.com";

interface AuthScreenProps {
  onClose?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onClose }) => {
  const { login, continueAsGuest } = useAuth();

  // Mode: 'main' (options) | 'email_code' (OTP to Gmail) | 'password_login' | 'telegram_wait'
  const [viewMode, setViewMode] = useState<'main' | 'email_code' | 'password_login' | 'telegram_wait'>('main');

  // Email OTP states
  const [emailStep, setEmailStep] = useState<'input_email' | 'input_code' | 'input_details'>('input_email');
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Password login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Telegram waiting / session polling state
  const [tgSessionId, setTgSessionId] = useState('');
  const [tgBotUrl, setTgBotUrl] = useState('');

  // General Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 60s countdown for OTP code resend
  useEffect(() => {
    let timer: any;
    if (emailStep === 'input_code' && countdown > 0) {
      setCanResend(false);
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (emailStep === 'input_code' && countdown === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [emailStep, countdown]);

  // Polling for Telegram authentication status
  useEffect(() => {
    if (viewMode !== 'telegram_wait' || !tgSessionId) return;

    let isMounted = true;
    let pollCount = 0;
    const maxPolls = 150; // up to 5 minutes

    const pollTgStatus = async () => {
      try {
        const res = await fetch(`/api/auth/telegram/status/${tgSessionId}`);
        if (!res.ok) return false;
        const data = await res.json();
        if (!isMounted) return true;

        if (data.status === 'authorized' && data.token && data.user) {
          setLoading(false);
          setSuccessMsg("Telegram orqali muvaffaqiyatli kirdingiz!");
          setTimeout(() => {
            login(data.token, data.user);
            if (onClose) onClose();
          }, 800);
          return true;
        } else if (data.status === 'expired') {
          setError("Telegram seansi muddati tugadi. Iltimos, qaytadan urinib ko'ring.");
          setViewMode('main');
          return true;
        }
      } catch (err) {
        console.warn("Telegram poll error:", err);
      }
      return false;
    };

    pollTgStatus();
    const interval = setInterval(async () => {
      pollCount++;
      const finished = await pollTgStatus();
      if (finished || pollCount >= maxPolls) {
        clearInterval(interval);
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [viewMode, tgSessionId, login, onClose]);

  // --- 1. TELEGRAM LOGIN (Browser / Bot) ---
  const handleTelegramLogin = async () => {
    try {
      setError('');
      setLoading(true);

      // Check if session API is available
      let sessionId = 'tg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      localStorage.setItem('animem_tg_session', sessionId);
      setTgSessionId(sessionId);

      // Get official authorization URL
      const res = await fetch('/api/auth/telegram/url');
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setTgBotUrl(data.url);
          setViewMode('telegram_wait');
          // Open official authorization in device browser
          window.open(data.url, '_blank');
          setLoading(false);
          return;
        }
      }

      // Fallback bot link
      const fallbackUrl = `https://t.me/animem_auth_bot?start=auth_${sessionId}`;
      setTgBotUrl(fallbackUrl);
      setViewMode('telegram_wait');
      window.open(fallbackUrl, '_blank');
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Telegram orqali kirishda xatolik yuz berdi");
    }
  };

  // --- 2. GOOGLE LOGIN ---
  const handleGoogleLogin = () => {
    try {
      setError('');
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
        setLoading(true);
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              try {
                const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const profile = await userRes.json();

                const res = await fetch('/api/auth/google', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: profile.email,
                    name: profile.name || profile.given_name || 'Google User',
                    avatar_url: profile.picture,
                    google_id: profile.sub,
                    access_token: tokenResponse.access_token,
                  }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Google orqali kirishda xatolik yuz berdi");

                setSuccessMsg("Google orqali muvaffaqiyatli kirdingiz!");
                setTimeout(() => {
                  login(data.token, data.user);
                  if (onClose) onClose();
                }, 600);
              } catch (err: any) {
                setError(err.message || "Google ma'lumotlarini olishda xatolik");
              } finally {
                setLoading(false);
              }
            } else {
              setLoading(false);
            }
          },
          error_callback: () => {
            setLoading(false);
            setError("Google orqali kirish bekor qilindi yoki xatolik yuz berdi");
          }
        });
        client.requestAccessToken();
      } else {
        // Fallback: Open Google OAuth in browser
        const redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&response_type=token&scope=email%20profile%20openid&redirect_uri=${encodeURIComponent(window.location.origin)}`;
        window.open(redirectUrl, '_blank');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Google xizmatiga ulanib bo'lmadi");
    }
  };

  // --- 3. DISCORD LOGIN ---
  const handleDiscordLogin = async () => {
    try {
      setError('');
      setLoading(true);
      const res = await fetch('/api/auth/discord/url');
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Discord havolasi olinmadi");

      // Open in browser
      window.open(data.url, '_blank');
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Discord orqali kirishda xatolik");
    }
  };

  // --- 4. GMAIL / EMAIL SEND OTP CODE ---
  const handleSendEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError("Iltimos, to'g'ri Gmail yoki email manzilini kiriting!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });

      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch {
        throw new Error("Serverdan kutilmagan javob keldi");
      }

      if (!res.ok) {
        throw new Error(data.error || "Kodni yuborishda xatolik yuz berdi");
      }

      if (data.devCode) {
        setVerificationCode(data.devCode);
      }

      setSuccessMsg("6 xonali tasdiqlash kodi emailingizga yuborildi! Pochtani (va Spam papkasini) tekshiring.");
      setEmailStep('input_code');
      setCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      setError(err.message || "Kodni yuborishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  // Resend code to Gmail
  const handleResendCode = async () => {
    if (!canResend) return;
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kodni qayta yuborib bo'lmadi");

      if (data.devCode) setVerificationCode(data.devCode);
      setSuccessMsg("Yangi 6 xonali tasdiqlash kodi emailingizga qayta yuborildi!");
      setCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      setError(err.message || "Kodni qayta yuborishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  // Verify 6-digit code
  const handleVerifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanCode = verificationCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setError("Iltimos, emailga yuborilgan 6 xonali kodni kiriting!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: cleanCode }),
      });

      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch {
        throw new Error("Serverdan kutilmagan javob keldi");
      }

      if (!res.ok) {
        throw new Error(data.error || "Tasdiqlash kodi xato");
      }

      setSuccessMsg("Kod to'g'ri tasdiqlandi!");
      setEmailStep('input_details');
    } catch (err: any) {
      setError(err.message || "Tasdiqlash kodi xato");
    } finally {
      setLoading(false);
    }
  };

  // Complete Registration with verified code
  const handleCompleteRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError("Iltimos, ismingizni yoki taxallusingizni kiriting!");
      return;
    }

    if (!password || password.length < 6) {
      setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register-verified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          code: verificationCode.trim(),
        }),
      });

      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch {
        throw new Error("Serverdan kutilmagan javob keldi");
      }

      if (!res.ok) {
        throw new Error(data.error || "Ro'yxatdan o'tishda xatolik yuz berdi");
      }

      setSuccessMsg("Hisobingiz muvaffaqiyatli yaratildi!");
      setTimeout(() => {
        login(data.token, data.user);
        if (onClose) onClose();
      }, 700);
    } catch (err: any) {
      setError(err.message || "Ro'yxatdan o'tishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  // --- 5. STANDARD PASSWORD LOGIN ---
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!loginEmail.trim()) {
      setError("Email manzilingizni kiriting!");
      return;
    }
    if (!loginPassword) {
      setError("Parolingizni kiriting!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        }),
      });

      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch {
        throw new Error("Serverdan kutilmagan javob keldi");
      }

      if (!res.ok) {
        throw new Error(data.error || "Email yoki parol xato!");
      }

      setSuccessMsg("Muvaffaqiyatli kirdingiz!");
      setTimeout(() => {
        login(data.token, data.user);
        if (onClose) onClose();
      }, 600);
    } catch (err: any) {
      setError(err.message || "Kirishda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
      <div className="w-full max-w-sm bg-[#0c0d14] border border-white/10 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9)] space-y-5 my-auto animate-in fade-in zoom-in-95 duration-300">
        {/* Top Header Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-[#ff006a] to-[#7928ca] p-0.5 shadow-[0_0_25px_rgba(255,0,106,0.6)] flex items-center justify-center">
            <div className="w-full h-full bg-[#07070a] rounded-[14px] flex items-center justify-center">
              <span className="font-black text-xl text-white tracking-wider">A<span className="text-[#ff006a]">U</span></span>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-wide">Animem Uz</h2>
            <p className="text-xs text-white/50">Hisobingizga kiring yoki ro'yxatdan o'ting</p>
          </div>
        </div>

        {/* Alerts: Error & Success */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 1: MAIN SOCIAL AUTH BUTTONS                               */}
        {/* ============================================================== */}
        {viewMode === 'main' && (
          <div className="space-y-3">
            {/* Telegram Login Button (Primary Web / App OAuth) */}
            <button
              onClick={handleTelegramLogin}
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(0,136,204,0.4)] active:scale-95 transition-all"
            >
              <TelegramLogo />
              <span>Telegram orqali kirish</span>
            </button>

            {/* Google Login Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-white hover:bg-white/90 text-gray-900 font-bold text-xs flex items-center justify-center gap-2.5 shadow-lg active:scale-95 transition-all"
            >
              <GoogleLogo />
              <span>Google bilan kirish</span>
            </button>

            {/* Discord Login Button */}
            <button
              onClick={handleDiscordLogin}
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-[#5865F2] hover:bg-[#4752c4] text-white font-bold text-xs flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(88,101,242,0.4)] active:scale-95 transition-all"
            >
              <DiscordLogo />
              <span>Discord bilan kirish</span>
            </button>

            {/* Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-white/40">
                <span className="bg-[#0c0d14] px-3">Yoki Pochta orqali</span>
              </div>
            </div>

            {/* Gmail OTP Code Button */}
            <button
              onClick={() => {
                setError('');
                setSuccessMsg('');
                setViewMode('email_code');
                setEmailStep('input_email');
              }}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-[#ff006a]/20 to-[#7928ca]/20 hover:from-[#ff006a]/30 hover:to-[#7928ca]/30 border border-[#ff006a]/40 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,0,106,0.2)]"
            >
              <Mail size={16} className="text-[#ff006a]" />
              <span>Gmail ga kod yuborish orqali</span>
            </button>

            {/* Existing Password Login Link */}
            <div className="text-center pt-2">
              <button
                onClick={() => {
                  setError('');
                  setSuccessMsg('');
                  setViewMode('password_login');
                }}
                className="text-xs text-white/60 hover:text-white underline font-medium"
              >
                Parol bilan kirish (Mavjud hisoblar)
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: GMAIL OTP FLOW (Send Code -> Verify -> Details)        */}
        {/* ============================================================== */}
        {viewMode === 'email_code' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setError('');
                  setSuccessMsg('');
                  if (emailStep === 'input_code') setEmailStep('input_email');
                  else if (emailStep === 'input_details') setEmailStep('input_code');
                  else setViewMode('main');
                }}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white"
              >
                <ArrowLeft size={14} />
              </button>
              <h3 className="text-xs font-bold text-white">
                {emailStep === 'input_email' && "Gmail orqali tasdiqlash"}
                {emailStep === 'input_code' && "Kodni kiritish"}
                {emailStep === 'input_details' && "Hisobni to'ldirish"}
              </h3>
            </div>

            {/* Step 1: Input Gmail Address */}
            {emailStep === 'input_email' && (
              <form onSubmit={handleSendEmailCode} className="space-y-3">
                <p className="text-[11px] text-white/60">
                  Gmail manzilingizni kiriting, biz unga 6 xonali tasdiqlash kodini yuboramiz.
                </p>

                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3.5 text-white/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="misol@gmail.com"
                    required
                    className="w-full h-11 bg-[#141520] border border-white/10 focus:border-[#ff006a] rounded-xl pl-10 pr-3.5 text-xs text-white placeholder-white/30 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[#ff006a] to-[#7928ca] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,0,106,0.4)] active:scale-95 transition-all"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                  <span>Tasdiqlash kodini yuborish</span>
                </button>
              </form>
            )}

            {/* Step 2: Input 6-digit Code */}
            {emailStep === 'input_code' && (
              <form onSubmit={handleVerifyEmailCode} className="space-y-3">
                <div className="text-[11px] text-white/60">
                  <span className="font-semibold text-white">{email}</span> manziliga yuborilgan 6 xonali kodni kiriting:
                </div>

                <div className="relative">
                  <KeyRound size={16} className="absolute left-3.5 top-3.5 text-white/40" />
                  <input
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    autoFocus
                    required
                    className="w-full h-12 bg-[#141520] border border-white/15 focus:border-[#ff006a] rounded-xl text-center text-lg font-mono tracking-widest text-white placeholder-white/20 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full h-11 rounded-xl bg-[#ff006a] hover:bg-[#ff006a]/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,0,106,0.4)] active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  <span>Kodni tasdiqlash</span>
                </button>

                <div className="text-center pt-1">
                  {canResend ? (
                    <button
                      type="button"
                      onClick={handleResendCode}
                      className="text-xs text-[#00dfd8] font-bold hover:underline"
                    >
                      Kodni qayta yuborish
                    </button>
                  ) : (
                    <span className="text-[11px] text-white/40">
                      Qayta yuborish: {countdown} soniya
                    </span>
                  )}
                </div>
              </form>
            )}

            {/* Step 3: Enter Name & Password to Complete */}
            {emailStep === 'input_details' && (
              <form onSubmit={handleCompleteRegister} className="space-y-3">
                <p className="text-[11px] text-white/60">
                  Akkauntingiz uchun ism va xavfsiz parol kiriting:
                </p>

                <div className="relative">
                  <UserIcon size={16} className="absolute left-3.5 top-3.5 text-white/40" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ismingiz yoki taxallusingiz"
                    required
                    className="w-full h-11 bg-[#141520] border border-white/10 focus:border-[#ff006a] rounded-xl pl-10 pr-3.5 text-xs text-white placeholder-white/30 focus:outline-none"
                  />
                </div>

                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-white/40" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Parol (kamida 6 ta belgi)"
                    required
                    className="w-full h-11 bg-[#141520] border border-white/10 focus:border-[#ff006a] rounded-xl pl-10 pr-10 text-xs text-white placeholder-white/30 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-white/40 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[#ff006a] to-[#7928ca] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,0,106,0.4)] active:scale-95 transition-all"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  <span>Yakunlash va Ilovaga kirish</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 3: STANDARD PASSWORD LOGIN                                */}
        {/* ============================================================== */}
        {viewMode === 'password_login' && (
          <form onSubmit={handlePasswordLogin} className="space-y-3">
            <div className="flex items-center gap-2 pb-1">
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setViewMode('main');
                }}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white"
              >
                <ArrowLeft size={14} />
              </button>
              <h3 className="text-xs font-bold text-white">Parol bilan kirish</h3>
            </div>

            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-3.5 text-white/40" />
              <input
                type="text"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="Email yoki foydalanuvchi nomi"
                required
                className="w-full h-11 bg-[#141520] border border-white/10 focus:border-[#ff006a] rounded-xl pl-10 pr-3.5 text-xs text-white placeholder-white/30 focus:outline-none"
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-3.5 text-white/40" />
              <input
                type={showLoginPassword ? 'text' : 'password'}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Parolingiz"
                required
                className="w-full h-11 bg-[#141520] border border-white/10 focus:border-[#ff006a] rounded-xl pl-10 pr-10 text-xs text-white placeholder-white/30 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                className="absolute right-3.5 top-3.5 text-white/40 hover:text-white"
              >
                {showLoginPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#ff006a] hover:bg-[#ff006a]/90 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,0,106,0.4)] active:scale-95 transition-all"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              <span>Tizimga kirish</span>
            </button>
          </form>
        )}

        {/* ============================================================== */}
        {/* VIEW 4: TELEGRAM BROWSER WAITING / POLLING                     */}
        {/* ============================================================== */}
        {viewMode === 'telegram_wait' && (
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#0088cc]/20 border border-[#0088cc]/40 flex items-center justify-center text-[#0088cc] animate-pulse">
              <TelegramLogo />
            </div>

            <div>
              <h4 className="text-sm font-bold text-white">Telegramda tasdiqlash</h4>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">
                Qurilmangiz brauzeri yoki Telegram ilovasida hisobingizni tasdiqlang.
                Tasdiqlangach avtomatik ilovaga o'tiladi.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-[#00dfd8] font-bold">
              <Loader2 size={16} className="animate-spin" />
              <span>Tasdiqlash kutilmoqda...</span>
            </div>

            <div className="space-y-2 pt-2">
              {tgBotUrl && (
                <button
                  type="button"
                  onClick={() => window.open(tgBotUrl, '_blank')}
                  className="w-full py-2.5 rounded-xl bg-[#0088cc] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                >
                  <ExternalLink size={14} />
                  <span>Brauzerda qayta ochish</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setViewMode('main')}
                className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold"
              >
                Boshqa usulni tanlash
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* BOTTOM: GUEST ACCESS LINK                                      */}
        {/* ============================================================== */}
        <div className="pt-2 border-t border-white/5 text-center">
          <button
            onClick={() => {
              continueAsGuest();
              if (onClose) onClose();
            }}
            className="text-xs text-white/40 hover:text-white transition-colors"
          >
            Hozircha hisobsiz ko'rish (Mehmon rejimi) →
          </button>
        </div>
      </div>
    </div>
  );
};
