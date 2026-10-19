import React, { useState, useEffect } from 'react';
import { 
  Heart, X, Sparkles, ExternalLink, RefreshCw, 
  CheckCircle2, AlertCircle, MessageSquare, Trophy, 
  ShieldCheck, ArrowRight, User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export interface DonationItem {
  id: number;
  order_id: string;
  donor_name: string;
  donor_avatar?: string | null;
  donor_avatar_frame?: string | null;
  amount: number;
  comment?: string | null;
  payment_method?: string;
  paid_at?: string;
  created_at: string;
}

const PRESET_AMOUNTS = [5000, 10000, 25000, 50000, 100000, 200000];

export default function DonatModal() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'donate' | 'donors'>('donate');

  // Form states
  const [amount, setAmount] = useState<number>(10000);
  const [customAmount, setCustomAmount] = useState<string>('10,000');
  const [donorName, setDonorName] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Payment confirmation state
  const [pendingOrder, setPendingOrder] = useState<{ order_id: string; pay_url: string; amount: number } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Donors list states
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [stats, setStats] = useState({ totalAmount: 0, donorCount: 0 });
  const [isLoadingDonors, setIsLoadingDonors] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  // Listen for global open event
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-donat-modal', handleOpen);
    return () => window.removeEventListener('open-donat-modal', handleOpen);
  }, []);

  // Pre-fill user name if logged in
  useEffect(() => {
    if (user?.name && !donorName) {
      setDonorName(user.name);
    }
  }, [user]);

  // Fetch verified donations
  const fetchDonations = async () => {
    setIsLoadingDonors(true);
    try {
      const res = await fetch(`${API_BASE}/api/donations?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          setDonations(data.donations || []);
          if (data.stats) {
            setStats(data.stats);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to fetch donations:", e);
    } finally {
      setIsLoadingDonors(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDonations();
    }
  }, [isOpen]);

  // Handle preset select
  const handleSelectPreset = (val: number) => {
    setAmount(val);
    setCustomAmount(val.toLocaleString('uz-UZ'));
    setErrorMsg('');
  };

  // Handle custom amount input
  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = parseInt(raw, 10) || 0;
    setAmount(num);
    setCustomAmount(num > 0 ? num.toLocaleString('uz-UZ') : '');
    setErrorMsg('');
  };

  // Create invoice via TezCheck
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
        throw new Error(data.error || "To'lov tizimi bilan bog'lanishda xatolik yuz berdi");
      }

      setPendingOrder({
        order_id: data.order_id,
        pay_url: data.pay_url,
        amount
      });

      // Open TezCheck payment window
      window.open(data.pay_url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setErrorMsg(err.message || "To'lov hisobini yaratib bo'lmadi");
    } finally {
      setIsLoading(false);
    }
  };

  // Poll status for pending order
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
        console.warn("Status check poll error:", err);
      }
    };

    intervalId = setInterval(checkStatus, 4000);
    return () => clearInterval(intervalId);
  }, [pendingOrder, isSuccess]);

  // Manual verify button
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
        alert("To'lov hali amalga oshirilmadi yoki tasdiqlanmadi. Iltimos, to'lovni yakunlang.");
      }
    } catch (err) {
      alert("Tekshirishda xatolik yuz berdi");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setPendingOrder(null);
    setIsSuccess(false);
    setErrorMsg('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg bg-[#0e0e11] border border-white/10 rounded-2xl shadow-2xl shadow-[#ff006a]/20 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Top Glowing Header Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#ff006a] via-purple-600 to-[#ff006a]" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff006a]/20 to-purple-600/20 border border-[#ff006a]/40 flex items-center justify-center text-[#ff006a] shadow-inner">
                  <Heart className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-1.5">
                    Saytni Qo'llab-quvvatlash
                    <Sparkles className="w-4 h-4 text-yellow-400 fill-yellow-400 animate-pulse" />
                  </h3>
                  <p className="text-[11px] text-white/50">
                    O'zbekcha anime va dublyaj rivojiga hissa qo'shing
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 bg-[#09090c] shrink-0 p-1 gap-1">
              <button
                onClick={() => { setActiveTab('donate'); setPendingOrder(null); setIsSuccess(false); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'donate'
                    ? 'bg-[#ff006a] text-white shadow-md shadow-[#ff006a]/30'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Heart size={14} className={activeTab === 'donate' ? 'fill-current' : ''} />
                Donat Qilish
              </button>
              <button
                onClick={() => { setActiveTab('donors'); fetchDonations(); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'donors'
                    ? 'bg-[#ff006a] text-white shadow-md shadow-[#ff006a]/30'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Trophy size={14} />
                Saxiy Otakular ({stats.donorCount})
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 overflow-y-auto space-y-4">
              {activeTab === 'donate' ? (
                <>
                  {isSuccess ? (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="py-8 text-center space-y-4"
                    >
                      <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                        <CheckCircle2 size={36} />
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-white">Katta rahmat! ❤️</h4>
                        <p className="text-xs text-white/70 max-w-sm mx-auto mt-1">
                          Donatingiz muvaffaqiyatli qabul qilindi. Sizning hissangiz sayt va yangi qismlar tarjimasi uchun juda muhim!
                        </p>
                      </div>
                      <button
                        onClick={() => { setIsSuccess(false); setActiveTab('donors'); fetchDonations(); }}
                        className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-black rounded-xl uppercase tracking-wider transition-all shadow-lg cursor-pointer"
                      >
                        Donatorlar ro'yxatini ko'rish
                      </button>
                    </motion.div>
                  ) : pendingOrder ? (
                    <div className="py-6 text-center space-y-5">
                      <div className="w-14 h-14 mx-auto rounded-full bg-[#ff006a]/20 border border-[#ff006a]/40 flex items-center justify-center text-[#ff006a] animate-pulse">
                        <RefreshCw size={28} className="animate-spin" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-black text-white">To'lov kutilmoqda...</h4>
                        <p className="text-xs text-white/60">
                          TezCheck oynasida to'lovni tasdiqlang ({pendingOrder.amount.toLocaleString()} UZS)
                        </p>
                        <p className="text-[11px] text-yellow-400/80">
                          To'lov yakunlangach, ushbu oyna avtomatik yangilanadi.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2.5 max-w-xs mx-auto">
                        <a
                          href={pendingOrder.pay_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <ExternalLink size={14} />
                          To'lov oynasini ochish
                        </a>
                        <button
                          onClick={handleManualCheck}
                          disabled={isVerifying}
                          className="flex-1 py-2.5 bg-gradient-to-r from-[#ff006a] to-purple-600 hover:opacity-90 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw size={14} className={isVerifying ? "animate-spin" : ""} />
                          Tekshirish
                        </button>
                      </div>

                      <button
                        onClick={() => setPendingOrder(null)}
                        className="text-[11px] text-white/40 hover:text-white transition-colors cursor-pointer"
                      >
                        Bekor qilish / Boshqa summa tanlash
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleDonateSubmit} className="space-y-4">
                      {errorMsg && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                          <AlertCircle size={14} className="shrink-0" />
                          <span>{errorMsg}</span>
                        </div>
                      )}

                      {/* Preset amounts */}
                      <div>
                        <label className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-2">
                          Donat miqdorini tanlang:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {PRESET_AMOUNTS.map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handleSelectPreset(val)}
                              className={`py-2 px-1 text-xs font-black rounded-xl border transition-all cursor-pointer ${
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
                        <label className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1.5">
                          Yoki o'zingiz xohlagan summa (UZS):
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={customAmount}
                            onChange={handleCustomAmountChange}
                            placeholder="Masalan: 15 000"
                            className="w-full bg-[#151518] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-black text-white focus:outline-none focus:border-[#ff006a] transition-all placeholder:text-white/20"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#ff006a]">
                            SO'M
                          </span>
                        </div>
                      </div>

                      {/* Donor Name */}
                      <div>
                        <label className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1.5">
                          Ismingiz / Taxallusingiz:
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={donorName}
                            onChange={(e) => setDonorName(e.target.value)}
                            placeholder={user?.name || "Saxiy Otaku"}
                            maxLength={40}
                            className="w-full bg-[#151518] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-[#ff006a] transition-all placeholder:text-white/20"
                          />
                          <UserIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                        </div>
                      </div>

                      {/* Message / Comment */}
                      <div>
                        <label className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-1.5">
                          Donat xabari (barcha foydalanuvchilarga ko'rinadi):
                        </label>
                        <div className="relative">
                          <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={2}
                            maxLength={250}
                            placeholder="Tarjima va dublyaj uchun rahmat! ❤️"
                            className="w-full bg-[#151518] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#ff006a] transition-all placeholder:text-white/20 resize-none"
                          />
                          <span className="absolute right-2.5 bottom-2 text-[10px] text-white/30">
                            {comment.length}/250
                          </span>
                        </div>
                      </div>

                      {/* Payment Providers preview */}
                      <div className="p-3 bg-[#151518] rounded-xl border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={16} className="text-emerald-400" />
                          <span className="text-[11px] text-white/70 font-semibold">
                            TezCheck xavfsiz to'lov shlyuzi
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-white/40 font-bold">
                          <span>Click</span> • <span>Payme</span> • <span>Uzum</span>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <button
                        type="submit"
                        disabled={isLoading || amount < 1000}
                        className="w-full py-3.5 bg-gradient-to-r from-[#ff006a] via-[#e50914] to-purple-600 hover:opacity-95 disabled:opacity-50 text-white font-black text-sm rounded-xl uppercase tracking-wider transition-all shadow-lg shadow-[#ff006a]/25 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            <span>Invoys yaratilmoqda...</span>
                          </>
                        ) : (
                          <>
                            <Heart size={16} className="fill-current" />
                            <span>{amount.toLocaleString('uz-UZ')} UZS Donat Qilish</span>
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </>
              ) : (
                /* Donors list tab */
                <div className="space-y-4">
                  {/* Stats banner */}
                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-gradient-to-br from-[#151518] to-[#1a1a20] rounded-xl border border-white/5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-white/40 block">Jami donatlar:</span>
                      <strong className="text-base sm:text-lg font-black text-[#ff006a]">
                        {stats.totalAmount.toLocaleString('uz-UZ')} UZS
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-white/40 block">Saxiy otakular:</span>
                      <strong className="text-base sm:text-lg font-black text-white">
                        {stats.donorCount} ta
                      </strong>
                    </div>
                  </div>

                  {/* List of donors */}
                  {isLoadingDonors ? (
                    <div className="py-12 text-center text-white/40 text-xs flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin" />
                      Donatlar yuklanmoqda...
                    </div>
                  ) : donations.length === 0 ? (
                    <div className="py-12 text-center space-y-2">
                      <Heart size={32} className="mx-auto text-white/20" />
                      <p className="text-xs text-white/40">Hozircha donatlar mavjud emas.</p>
                      <button
                        onClick={() => setActiveTab('donate')}
                        className="text-xs text-[#ff006a] hover:underline font-bold cursor-pointer"
                      >
                        Birinchi bo'lib donat qiling! 🚀
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                      {donations.map((don, idx) => (
                        <div
                          key={don.id || idx}
                          className="p-3 bg-[#131317] hover:bg-[#18181f] border border-white/5 rounded-xl transition-all space-y-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-white/10 shrink-0 border border-white/10">
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
                                <span className="text-xs font-black text-white truncate block">
                                  {don.donor_name}
                                </span>
                                <span className="text-[10px] text-white/40 block">
                                  {don.created_at ? new Date(don.created_at).toLocaleDateString('uz-UZ') : "Yaqinda"}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md inline-block">
                                +{Number(don.amount).toLocaleString('uz-UZ')} UZS
                              </span>
                            </div>
                          </div>

                          {/* Comment / Message */}
                          {don.comment && (
                            <div className="pl-10 text-[11px] text-white/80 bg-white/[0.02] p-2 rounded-lg border border-white/5 italic">
                              "{don.comment}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer notice */}
            <div className="p-3 border-t border-white/5 bg-[#09090c] text-center text-[10px] text-white/40 shrink-0">
              Barcha to'lovlar TezCheck to'lov tizimi orqali 100% xavfsiz amalga oshiriladi.
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

