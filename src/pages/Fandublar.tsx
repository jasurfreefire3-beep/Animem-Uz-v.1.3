import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Mic,
  Users,
  Film,
  Search,
  CheckCircle2,
  Bell,
  BellOff,
  ExternalLink,
  Send,
  Instagram,
  Globe,
  Loader2,
  X,
  ChevronLeft,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Fandub, Anime } from '../types';
import { useAuth } from '../context/AuthContext';
import AnimeCard from '../components/AnimeCard';

export default function Fandublar() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [fandubs, setFandubs] = useState<Fandub[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Fandub for Modal / Detail View
  const [selectedFandub, setSelectedFandub] = useState<Fandub | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [subscribingId, setSubscribingId] = useState<string | number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const getAuthHeaders = () => {
    const currentToken = token || localStorage.getItem('token') || '';
    return currentToken ? { Authorization: `Bearer ${currentToken}` } : {};
  };

  // Fetch all fandubs
  const loadFandubs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fandubs?t=${Date.now()}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setFandubs(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to load fandubs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFandubs();
    document.title = "Fandub Jamoalari - Animem.uz";
  }, [user]);

  // Load single fandub details if slug is provided
  const loadFandubDetail = async (identifier: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/fandubs/${identifier}?t=${Date.now()}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedFandub(data);
      }
    } catch (e) {
      console.error('Failed to load fandub detail:', e);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (slug) {
      loadFandubDetail(slug);
    } else {
      setSelectedFandub(null);
    }
  }, [slug]);

  // Toggle Subscription
  const handleToggleSubscribe = async (fandub: Fandub, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!user) {
      showToast("Obuna bo'lish uchun iltimos, saytga kiring!");
      return;
    }

    setSubscribingId(fandub.id);
    try {
      const res = await fetch(`/api/fandubs/${fandub.id}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        }
      });

      const data = await res.json();
      if (res.ok) {
        const isSubbed = data.subscribed;
        const newCount = data.subscribers_count;

        // Update list
        setFandubs(prev =>
          prev.map(f =>
            String(f.id) === String(fandub.id)
              ? { ...f, is_subscribed: isSubbed, subscribers_count: newCount }
              : f
          )
        );

        // Update selected modal
        if (selectedFandub && String(selectedFandub.id) === String(fandub.id)) {
          setSelectedFandub(prev =>
            prev ? { ...prev, is_subscribed: isSubbed, subscribers_count: newCount } : null
          );
        }

        showToast(
          isSubbed
            ? `"${fandub.name}" jamoasiga obuna bo'ldingiz! 🎉`
            : `"${fandub.name}" obunasi bekor qilindi`
        );
      } else {
        showToast(data.error || "Obunani yangilashda xatolik");
      }
    } catch (err: any) {
      showToast("Xatolik: " + err.message);
    } finally {
      setSubscribingId(null);
    }
  };

  const handleOpenFandub = (f: Fandub) => {
    setSelectedFandub(f);
    loadFandubDetail(f.slug || String(f.id));
    window.history.pushState(null, '', `/fandub/${f.slug || f.id}`);
  };

  const handleCloseModal = () => {
    setSelectedFandub(null);
    if (slug) {
      navigate('/fandublar');
    } else {
      window.history.pushState(null, '', '/fandublar');
    }
  };

  const filteredFandubs = fandubs.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen pb-20 pt-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-black/85 border border-[#ff006a]/40 text-white font-bold text-xs sm:text-sm backdrop-blur-2xl shadow-[0_10px_35px_rgba(255,0,106,0.35)] flex items-center gap-2"
          >
            <Sparkles size={16} className="text-[#ff006a]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Header (iOS Liquid Glass aesthetic) */}
      <div className="relative rounded-[32px] overflow-hidden p-6 sm:p-10 bg-gradient-to-br from-purple-950/40 via-black/80 to-[#ff006a]/20 border border-white/12 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-[#ff006a]/30 to-purple-600/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-[11px] font-black uppercase tracking-wider text-purple-300">
              <Mic size={14} className="text-[#ff006a]" />
              <span>O'zbek Anime Fandublari</span>
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
              Fandub Jamoalari 🎙️
            </h1>
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed">
              O'zbekistondagi eng sara anime ovozlashtirish va tarjima guruhlari. Sevimli ijodiy jamoalaringizga obuna bo'ling, ularning yangi epizodlarini kuzating va qo'llab-quvvatlang!
            </p>
          </div>

          {/* Quick Counter Card */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/[0.06] border border-white/12 backdrop-blur-2xl shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#ff006a] to-purple-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(255,0,106,0.4)]">
              <Users size={24} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-white/50 block uppercase tracking-wider">
                Jami Jamoalar
              </span>
              <span className="text-2xl font-black text-white font-mono">
                {fandubs.length} ta
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mt-6 pt-6 border-t border-white/10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input
            type="text"
            placeholder="Fandub guruhi nomi yoki tavsifi bo'yicha qidirish..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/[0.06] border border-white/12 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#ff006a] focus:bg-white/[0.1] transition-all backdrop-blur-xl shadow-inner"
          />
        </div>
      </div>

      {/* Fandubs Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-white/50 space-y-3">
          <Loader2 size={36} className="animate-spin text-[#ff006a]" />
          <span className="text-sm font-semibold">Fandublar yuklanmoqda...</span>
        </div>
      ) : filteredFandubs.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-3xl bg-white/[0.03] border border-white/5 backdrop-blur-xl space-y-3">
          <Mic size={48} className="mx-auto text-white/20" />
          <h3 className="text-base font-bold text-white/80">Fandub jamoasi topilmadi</h3>
          <p className="text-xs text-white/50 max-w-sm mx-auto">
            {searchQuery
              ? `"${searchQuery}" bo'yicha hech qanday natija chiqmadi`
              : "Hozircha fandub jamoalari mavjud emas"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFandubs.map(fandub => {
            const isSubbed = Boolean(fandub.is_subscribed);
            const isBusy = subscribingId === fandub.id;

            return (
              <motion.div
                key={fandub.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                onClick={() => handleOpenFandub(fandub)}
                className="group relative rounded-[28px] bg-gradient-to-b from-white/[0.08] to-white/[0.03] hover:from-white/[0.12] hover:to-white/[0.05] border border-white/12 hover:border-purple-500/40 backdrop-blur-2xl overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.5)] transition-all cursor-pointer flex flex-col"
              >
                {/* Banner preview */}
                <div className="h-32 w-full relative bg-gradient-to-tr from-purple-900/60 to-pink-900/40 overflow-hidden">
                  {fandub.banner_url ? (
                    <img
                      src={fandub.banner_url}
                      alt={fandub.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-25">
                      <Mic size={40} className="text-white" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Slug Pill */}
                  <span className="absolute top-3 right-3 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white/80 border border-white/15">
                    @{fandub.slug || 'dub'}
                  </span>
                </div>

                {/* Avatar & Content */}
                <div className="p-6 pt-0 relative flex-1 flex flex-col">
                  {/* Floating Circular Avatar */}
                  <div className="flex items-end justify-between -mt-12 mb-4">
                    <div className="w-20 h-20 rounded-2xl p-1 bg-black/80 backdrop-blur-xl border border-white/20 shadow-[0_10px_25px_rgba(0,0,0,0.8)] relative">
                      {fandub.avatar_url ? (
                        <img
                          src={fandub.avatar_url}
                          alt={fandub.name}
                          className="w-full h-full object-cover rounded-xl"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full rounded-xl bg-gradient-to-tr from-[#ff006a] to-purple-600 flex items-center justify-center text-white font-black text-xl">
                          {fandub.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center" title="Faol fandub">
                        <CheckCircle2 size={11} className="text-white" />
                      </div>
                    </div>

                    {/* Quick Subscribe Button */}
                    <button
                      onClick={e => handleToggleSubscribe(fandub, e)}
                      disabled={isBusy}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer ${
                        isSubbed
                          ? 'bg-white/10 hover:bg-white/15 text-white/80 border border-white/15'
                          : 'bg-gradient-to-r from-[#ff006a] to-[#a855f7] hover:brightness-110 text-white shadow-[#ff006a]/30'
                      }`}
                    >
                      {isBusy ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : isSubbed ? (
                        <>
                          <CheckCircle2 size={14} className="text-emerald-400" />
                          <span>Obunadasiz</span>
                        </>
                      ) : (
                        <>
                          <Bell size={14} />
                          <span>Obuna</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-xl font-black text-white group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                    <span>{fandub.name}</span>
                  </h3>

                  <p className="text-xs text-white/60 line-clamp-2 mt-2 flex-1 min-h-[34px]">
                    {fandub.description || "O'zbek anime ovozlashtirish va tarjima jamoasi."}
                  </p>

                  {/* Stats Counter */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/8 text-xs">
                    <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/6 flex items-center gap-2">
                      <Users size={16} className="text-[#ff006a] shrink-0" />
                      <div>
                        <span className="text-[10px] text-white/40 block font-medium">Obunachilar</span>
                        <span className="font-black text-white font-mono">{fandub.subscribers_count || 0}</span>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/6 flex items-center gap-2">
                      <Film size={16} className="text-purple-400 shrink-0" />
                      <div>
                        <span className="text-[10px] text-white/40 block font-medium">Animelar</span>
                        <span className="font-black text-white font-mono">{fandub.animes_count || 0} ta</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Link */}
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-bold text-white/50 group-hover:text-purple-300 transition-colors">
                    <span>Animelarni ko'rish</span>
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ==================== FANDUB DETAIL MODAL ==================== */}
      <AnimatePresence>
        {selectedFandub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-2xl animate-fade-in overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              className="relative w-full max-w-4xl bg-[#11121d] border border-white/20 rounded-[32px] shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden max-h-[92vh] flex flex-col my-auto"
            >
              {/* Close Button */}
              <button
                onClick={handleCloseModal}
                className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 backdrop-blur-xl flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer shadow-lg active:scale-90"
                title="Yopish"
              >
                <X size={20} />
              </button>

              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Banner & Cover */}
                <div className="relative h-48 sm:h-64 w-full bg-gradient-to-tr from-purple-950 via-slate-900 to-[#ff006a]/40 overflow-hidden">
                  {selectedFandub.banner_url ? (
                    <img
                      src={selectedFandub.banner_url}
                      alt={selectedFandub.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-25">
                      <Mic size={64} className="text-white" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#11121d] via-black/30 to-black/30" />
                </div>

                {/* Profile Header */}
                <div className="px-6 sm:px-8 pb-6 relative">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-6">
                    {/* Big Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl p-1.5 bg-[#11121d] border-2 border-white/20 shadow-[0_15px_35px_rgba(0,0,0,0.9)]">
                        {selectedFandub.avatar_url ? (
                          <img
                            src={selectedFandub.avatar_url}
                            alt={selectedFandub.name}
                            className="w-full h-full object-cover rounded-2xl"
                          />
                        ) : (
                          <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-[#ff006a] to-purple-600 flex items-center justify-center text-white font-black text-3xl">
                            {selectedFandub.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-1 right-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#ff006a] to-purple-600 border border-white/20 text-[10px] font-black uppercase text-white tracking-wider shadow-md">
                        DUB
                      </div>
                    </div>

                    {/* Subscribe & Social Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Social Pills */}
                      {selectedFandub.telegram_url && (
                        <a
                          href={selectedFandub.telegram_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <Send size={14} />
                          <span>Telegram</span>
                        </a>
                      )}
                      {selectedFandub.instagram_url && (
                        <a
                          href={selectedFandub.instagram_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <Instagram size={14} />
                          <span>Instagram</span>
                        </a>
                      )}
                      {selectedFandub.website_url && (
                        <a
                          href={selectedFandub.website_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <Globe size={14} />
                          <span>Veb-sayt</span>
                        </a>
                      )}

                      {/* Subscribe Button */}
                      <button
                        onClick={() => handleToggleSubscribe(selectedFandub)}
                        disabled={subscribingId === selectedFandub.id}
                        className={`px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer ${
                          selectedFandub.is_subscribed
                            ? 'bg-white/10 hover:bg-white/15 text-white border border-white/20'
                            : 'bg-gradient-to-r from-[#ff006a] to-[#a855f7] hover:brightness-110 text-white shadow-[#ff006a]/40'
                        }`}
                      >
                        {subscribingId === selectedFandub.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : selectedFandub.is_subscribed ? (
                          <>
                            <CheckCircle2 size={16} className="text-emerald-400" />
                            <span>Obunadasiz</span>
                          </>
                        ) : (
                          <>
                            <Bell size={16} />
                            <span>Obuna bo'lish</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Title & Info */}
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                        {selectedFandub.name}
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white/70 font-mono font-medium">
                          @{selectedFandub.slug}
                        </span>
                      </h2>
                      <p className="text-sm text-white/70 mt-2 leading-relaxed max-w-3xl">
                        {selectedFandub.description || "Ushbu jamoa o'zbek tiliga eng sifatli va qiziqarli animelarni professional tarzda dublyaj qiladi."}
                      </p>
                    </div>

                    {/* Stats Badges */}
                    <div className="flex flex-wrap gap-3 pt-2">
                      <div className="px-4 py-2 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center gap-2">
                        <Users size={16} className="text-[#ff006a]" />
                        <span className="text-xs font-bold text-white/80">
                          <strong className="text-white font-mono text-sm mr-1">
                            {selectedFandub.subscribers_count || 0}
                          </strong>
                          Obunachilar
                        </span>
                      </div>
                      <div className="px-4 py-2 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center gap-2">
                        <Film size={16} className="text-purple-400" />
                        <span className="text-xs font-bold text-white/80">
                          <strong className="text-white font-mono text-sm mr-1">
                            {selectedFandub.animes?.length || selectedFandub.animes_count || 0}
                          </strong>
                          Ovoz berilgan animelar
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section: Translated Animes */}
                  <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                        <Film className="text-[#ff006a]" size={20} />
                        <span>Jamoa Ovozlashtirgan Animelar</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white/70 font-mono">
                          {selectedFandub.animes?.length || 0} ta
                        </span>
                      </h3>
                    </div>

                    {loadingDetail ? (
                      <div className="flex items-center justify-center py-16 text-white/40">
                        <Loader2 size={24} className="animate-spin text-[#ff006a] mr-2" />
                        <span className="text-xs font-semibold">Animelar yuklanmoqda...</span>
                      </div>
                    ) : !selectedFandub.animes || selectedFandub.animes.length === 0 ? (
                      <div className="text-center py-12 px-4 rounded-2xl bg-white/[0.03] border border-white/5">
                        <Film size={36} className="mx-auto text-white/20 mb-2" />
                        <p className="text-xs text-white/50">
                          Hozircha ushbu jamoaga biriktirilgan animelar mavjud emas
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
                        {selectedFandub.animes.map(anime => (
                          <AnimeCard key={`fandub-anime-${anime.id}`} anime={anime} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
