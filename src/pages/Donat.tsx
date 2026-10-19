import React, { useState, useEffect } from 'react';
import { 
  Heart, Sparkles, ExternalLink, RefreshCw, 
  CheckCircle2, AlertCircle, Trophy, ShieldCheck, 
  ArrowRight, User as UserIcon, MessageSquare 
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { DonationItem } from '../components/DonatModal';

const PRESET_AMOUNTS = [5000, 10000, 25000, 50000, 100000, 200000];

export default function Donat() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [amount, setAmount] = useState<number>(10000);
  const [customAmount, setCustomAmount] = useState<string>('10,000');
  const [donorName, setDonorName] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [pendingOrder, setPendingOrder] = useState<{ order_id: string; pay_url: string; amount: number } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [stats, setStats] = useState({ totalAmount: 0, donorCount: 0 });
  const [isLoadingDonors, setIsLoadingDonors] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  useEffect(() => {
    if (user?.name && !donorName) {
      setDonorName(user.name);
    }
  }, [user]);

  const fetchDonations = async () => {
    setIsLoadingDonors(true);
    try {
      const res = await fetch(`${API_BASE}/api/donations?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          setDonations(data.donations || []);
          if (data.stats) setStats(data.stats);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch donations:", e);
    } finally {
      setIsLoadingDonors(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const handleSelectPreset = (val: number) => {
    setAmount(val);
    setCustomAmount(val.toLocaleString('uz-UZ'));
    setErrorMsg('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = parseInt(raw, 10) || 0;
    setAmount(num);
    setCustomAmount(num > 0 ? num.toLocaleString('uz-UZ') : '');
    setErrorMsg('');
  };

  const handleDonateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 1000) {
      setErrorMsg("Donat miqdori kamida 1,000 so'm bo'lishi kerak");
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/donate/create-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          amount,
          donor_name: donorName.trim() || user?.name || "Saxiy Otaku",
          comment: comment.trim() || "Anime va dublyaj rivoji uchun donat ❤️",
          payment_method: "Tezcheck (Click / Payme / Uzum)"
        })
      });

      const data = await res.json();
      if (!res.ok || !data.ok || !data.pay_url) {
        throw new Error(data.error || "To'lov hisobi yaratilmadi");
      }

      setPendingOrder({
        order_id: data.order_id,
        pay_url: data.pay_url,
        amount
      });

      window.open(data.pay_url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setErrorMsg(err.message || "To'lov hisobini ochishda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!pendingOrder || isSuccess) return;

    let intervalId: any = null;
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/donate/check-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: pendingOrder.order_id })
        });
        const data = await res.json();
        if (data.ok && (data.isPaid || data.status === 'paid' || data.status === 'succeeded')) {
          setIsSuccess(true);
          setPendingOrder(null);
          fetchDonations();
          clearInterval(intervalId);
        }
      } catch (err) {
        console.warn("Status check error:", err);
      }
    };

    intervalId = setInterval(checkStatus, 4000);
    return () => clearInterval(intervalId);
  }, [pendingOrder, isSuccess]);

  const handleManualCheck = async () => {
    if (!pendingOrder) return;
    setIsVerifying(true);
    try {
      const res = await fetch(`${API_BASE}/api/donate/check-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: pendingOrder.order_id })
      });
      const data = await res.json();
      if (data.ok && (data.isPaid || data.status === 'paid' || data.status === 'succeeded')) {
        setIsSuccess(true);
        setPendingOrder(null);
        fetchDonations();
      } else {
        alert("To'lov hali amalga oshirilmadi. Iltimos, TezCheck orqali to'lovni tasdiqlang.");
      }
    } catch (err) {
      alert("Holatni tekshirishda xatolik yuz berdi");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* Hero Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ff006a]/15 border border-[#ff006a]/30 text-[#ff006a] text-xs font-black uppercase tracking-wider shadow-sm">
            <Heart size={14} className="fill-current animate-pulse" />
            <span>Animem.uz Loyihasini Qo'llab-quvvatlash</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Sayt va O'zbekcha Dublyaj Rivojiga Hissa Qo'shing
          </h1>
          <p className="text-sm sm:text-base text-white/60">
            Sizning har bir donatingiz yangi server xarajatlari, professional ovoz yozish studiyasi va sevimli animelaringizning yangi qismlarini tezroq taqdim etishga sarflanadi.
          </p>

          {/* Live Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 max-w-md mx-auto">
            <div className="p-4 bg-[#121215] border border-white/5 rounded-2xl">
              <span className="text-xs text-white/40 font-bold uppercase block mb-1">Jami Yig'ildi</span>
              <strong className="text-xl sm:text-2xl font-black text-[#ff006a]">
                {stats.totalAmount.toLocaleString('uz-UZ')} UZS
              </strong>
            </div>
            <div className="p-4 bg-[#121215] border border-white/5 rounded-2xl">
              <span className="text-xs text-white/40 font-bold uppercase block mb-1">Saxiy Otakular</span>
              <strong className="text-xl sm:text-2xl font-black text-white">
                {stats.donorCount} ta
              </strong>
            </div>
          </div>
        </div>

        {/* 2-Column Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Donation Form */}
          <div className="lg:col-span-6 bg-[#101013] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff006a] via-purple-600 to-[#ff006a]" />

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#ff006a]/20 border border-[#ff006a]/40 flex items-center justify-center text-[#ff006a]">
                <Heart size={20} className="fill-current" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Donat Yuborish</h3>
                <p className="text-xs text-white/50">Ixtiyoriy miqdorni tanlang</p>
              </div>
            </div>

            {isSuccess ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="py-10 text-center space-y-4"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 size={36} />
                </div>
                <h4 className="text-2xl font-black text-white">Katta rahmat! ❤️</h4>
                <p className="text-xs text-white/70 max-w-sm mx-auto">
                  Donatingiz muvaffaqiyatli qabul qilindi va saxiy otakular ro'yxatida aks etdi!
                </p>
                <button
                  onClick={() => setIsSuccess(false)}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#ff006a] to-purple-600 text-white text-xs font-black rounded-xl uppercase tracking-wider transition-all shadow-lg cursor-pointer"
                >
                  Yana donat qilish
                </button>
              </motion.div>
            ) : pendingOrder ? (
              <div className="py-8 text-center space-y-5">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#ff006a]/20 border border-[#ff006a]/40 flex items-center justify-center text-[#ff006a] animate-pulse">
                  <RefreshCw size={28} className="animate-spin" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-white">To'lov kutilmoqda...</h4>
                  <p className="text-xs text-white/60">
                    Ochilgan oynada to'lovni tasdiqlang: <strong className="text-[#ff006a]">{pendingOrder.amount.toLocaleString()} UZS</strong>
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 max-w-xs mx-auto">
                  <a
                    href={pendingOrder.pay_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ExternalLink size={14} />
                    To'lov oynasini ochish
                  </a>
                  <button
                    onClick={handleManualCheck}
                    disabled={isVerifying}
                    className="py-3 bg-gradient-to-r from-[#ff006a] to-purple-600 hover:opacity-90 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw size={14} className={isVerifying ? "animate-spin" : ""} />
                    To'lovni tekshirish
                  </button>
                  <button
                    onClick={() => setPendingOrder(null)}
                    className="text-xs text-white/40 hover:text-white transition-colors cursor-pointer mt-2"
                  >
                    Bekor qilish
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDonateSubmit} className="space-y-5">
                {errorMsg && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Preset amounts */}
                <div>
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-2">
                    Donat miqdori:
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {PRESET_AMOUNTS.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleSelectPreset(val)}
                        className={`py-2.5 px-1 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                          amount === val
                            ? 'bg-[#ff006a]/20 border-[#ff006a] text-white shadow-sm shadow-[#ff006a]/20'
                            : 'bg-[#151518] border-white/5 text-white/70 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {val.toLocaleString('uz-UZ')} UZS
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount */}
                <div>
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1.5">
                    Yoki boshqa summa:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                      placeholder="10 000"
                      className="w-full bg-[#151518] border border-white/10 rounded-xl px-4 py-3 text-sm font-black text-white focus:outline-none focus:border-[#ff006a] transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#ff006a]">
                      SO'M
                    </span>
                  </div>
                </div>

                {/* Donor Name */}
                <div>
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1.5">
                    Ismingiz / Nik:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      placeholder={user?.name || "Saxiy Otaku"}
                      maxLength={40}
                      className="w-full bg-[#151518] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-[#ff006a] transition-all"
                    />
                    <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-1.5">
                    Xabaringiz (saytda ko'rinadi):
                  </label>
                  <div className="relative">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      maxLength={250}
                      placeholder="Dublyaj uchun rahmat! ❤️"
                      className="w-full bg-[#151518] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#ff006a] transition-all resize-none"
                    />
                    <span className="absolute right-3 bottom-2.5 text-[10px] text-white/30">
                      {comment.length}/250
                    </span>
                  </div>
                </div>

                {/* Payment Gateway Info */}
                <div className="p-3 bg-[#151518] rounded-xl border border-white/5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span className="text-white/70 font-semibold">TezCheck orqali to'lov</span>
                  </div>
                  <span className="text-[11px] text-white/40 font-bold">Click • Payme • Uzum</span>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading || amount < 1000}
                  className="w-full py-4 bg-gradient-to-r from-[#ff006a] via-[#e50914] to-purple-600 hover:opacity-95 disabled:opacity-50 text-white font-black text-sm rounded-xl uppercase tracking-wider transition-all shadow-xl shadow-[#ff006a]/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Invoys yaratilmoqda...</span>
                    </>
                  ) : (
                    <>
                      <Heart size={18} className="fill-current" />
                      <span>{amount.toLocaleString('uz-UZ')} UZS Donat Qilish</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Donors Leaderboard & Messages */}
          <div className="lg:col-span-6 bg-[#101013] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Trophy size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Saxiy Otakular</h3>
                  <p className="text-xs text-white/50">So'nggi donatlar va xabarlar</p>
                </div>
              </div>
              <button
                onClick={fetchDonations}
                disabled={isLoadingDonors}
                className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                title="Yangilash"
              >
                <RefreshCw size={16} className={isLoadingDonors ? "animate-spin" : ""} />
              </button>
            </div>

            {isLoadingDonors ? (
              <div className="py-20 text-center text-white/40 text-xs flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin" />
                Donatlar yuklanmoqda...
              </div>
            ) : donations.length === 0 ? (
              <div className="py-20 text-center space-y-2">
                <Heart size={36} className="mx-auto text-white/20" />
                <p className="text-sm text-white/40">Hozircha donat yozuvlari mavjud emas.</p>
                <p className="text-xs text-[#ff006a]">Birinchi bo'lib qo'llab-quvvatlang! 🚀</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {donations.map((don, idx) => (
                  <div
                    key={don.id || idx}
                    className="p-4 bg-[#141418] hover:bg-[#191920] border border-white/5 rounded-2xl transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white/10 shrink-0 border border-white/10">
                          <img
                            src={don.donor_avatar || "/logo.png"}
                            alt={don.donor_name}
                            className="w-full h-full object-cover"
                            onError={(e: any) => { e.target.src = "/logo.png"; }}
                          />
                          {don.donor_avatar_frame && (
                            <img
                              src={don.donor_avatar_frame}
                              alt="frame"
                              className="absolute inset-0 w-full h-full pointer-events-none scale-110"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-black text-white truncate block">
                            {don.donor_name}
                          </span>
                          <span className="text-[11px] text-white/40 block">
                            {don.created_at ? new Date(don.created_at).toLocaleDateString('uz-UZ') : "Yaqinda"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs sm:text-sm font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg inline-block">
                          +{Number(don.amount).toLocaleString('uz-UZ')} UZS
                        </span>
                      </div>
                    </div>

                    {/* Donor's Message */}
                    {don.comment && (
                      <div className="pl-12 text-xs text-white/80 bg-white/[0.02] p-2.5 rounded-xl border border-white/5 italic">
                        "{don.comment}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
