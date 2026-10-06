import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, Check, ExternalLink, Loader2, Sparkles, 
  ShieldCheck, AlertCircle, RefreshCw, User as UserIcon,
  Image as ImageIcon, Zap, Layers, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ShopItem, ShopPurchase } from '../types';
import UserAvatar, { isVideoMedia } from '../components/UserAvatar';

export default function Shop() {
  const { user, token, login } = useAuth();
  const { getLocalizedPath } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [items, setItems] = useState<ShopItem[]>([]);
  const [myPurchases, setMyPurchases] = useState<ShopPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<'all' | 'avatar' | 'frame' | 'banner'>('all');
  const [showOnlyOwned, setShowOnlyOwned] = useState(false);

  // Checkout modal state
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Equipping state
  const [equippingId, setEquippingId] = useState<number | string | null>(null);

  // Verification modal state (upon returning from TezCheck)
  const [verifyingOrder, setVerifyingOrder] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    show: boolean;
    success: boolean;
    message: string;
  }>({ show: false, success: false, message: '' });

  // Fetch items & inventory
  const loadData = async () => {
    setLoading(true);
    try {
      const itemsRes = await fetch('/api/shop/items');
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setItems(itemsData);
      }

      if (token) {
        const invRes = await fetch('/api/shop/my-inventory', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (invRes.ok) {
          const invData = await invRes.json();
          setMyPurchases(invData);
        }
      }
    } catch (err) {
      console.error("Do'kon ma'lumotlarini yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Handle return from TezCheck with ?order_id=...
  useEffect(() => {
    const orderId = searchParams.get('order_id');
    if (orderId) {
      setVerifyingOrder(true);
      fetch(`/api/shop/verify-order/${orderId}`)
        .then(res => res.json())
        .then(data => {
          setVerifyingOrder(false);
          if (data.status === 'paid' || data.success) {
            setVerifyResult({
              show: true,
              success: true,
              message: data.message || "To'lov muvaffaqiyatli amalga oshirildi! Mahsulot profilingizga qo'shildi."
            });
            // Reload inventory
            loadData();
          } else {
            setVerifyResult({
              show: true,
              success: false,
              message: data.message || "To'lov tasdiqlanmadi yoki bekor qilingan."
            });
          }
          // Remove order_id from URL without refreshing
          searchParams.delete('order_id');
          setSearchParams(searchParams, { replace: true });
        })
        .catch(err => {
          console.error("Order verification error:", err);
          setVerifyingOrder(false);
          setVerifyResult({
            show: true,
            success: false,
            message: "To'lov holatini tekshirishda xatolik yuz berdi."
          });
        });
    }
  }, [searchParams]);

  // Initiate purchase with TezCheck
  const handleStartCheckout = (item: ShopItem) => {
    if (!user || !token) {
      navigate(getLocalizedPath('/login'));
      return;
    }
    setSelectedItem(item);
    setCheckoutError('');
  };

  const handleConfirmPurchase = async () => {
    if (!selectedItem || !token) return;
    setCheckingOut(true);
    setCheckoutError('');

    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ item_id: selectedItem.id })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "To'lov hisobini shakllantirib bo'lmadi");
      }

      if (data.payment_url) {
        // Redirect user to TezCheck payment page
        window.location.href = data.payment_url;
      } else {
        throw new Error("To'lov havolasi olinmadi");
      }
    } catch (err: any) {
      setCheckoutError(err.message || "To'lov jarayonida kutilmagan xatolik");
      setCheckingOut(false);
    }
  };

  // Sinov tariqasida (bepul/test rejimida) xarid qilish
  const handleTestPurchase = async () => {
    if (!selectedItem || !token) return;
    setCheckingOut(true);
    setCheckoutError('');

    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ item_id: selectedItem.id, is_test: true })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Sinov xaridini amalga oshirib bo'lmadi");
      }

      setSelectedItem(null);
      setVerifyResult({
        show: true,
        success: true,
        message: data.message || "Mahsulot muvaffaqiyatli xarid qilindi va profilingizga qo'shildi!"
      });
      loadData();
    } catch (err: any) {
      setCheckoutError(err.message || "Sinov xaridida xatolik");
    } finally {
      setCheckingOut(false);
    }
  };

  // Equip / un-equip item
  const handleEquip = async (item: ShopItem, equip: boolean) => {
    if (!token || !user) return;
    setEquippingId(item.id);

    try {
      const res = await fetch('/api/shop/equip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ item_id: item.id, equip })
      });

      const data = await res.json();
      if (res.ok) {
        // Update user auth context immediately with DB updated data if present
        if (data.user) {
          login(token, data.user);
        } else {
          const updatedUser = { ...user };
          if (item.category === 'frame') {
            updatedUser.avatar_frame_url = equip ? item.image_url : undefined;
          } else if (item.category === 'avatar') {
            if (equip) updatedUser.avatar_url = item.image_url;
          } else if (item.category === 'banner') {
            updatedUser.banner_url = equip ? item.image_url : undefined;
          }
          login(token, updatedUser);
        }

        // Update local purchase state
        setMyPurchases(prev => prev.map(p => {
          if (String(p.item_id) === String(item.id)) {
            return { ...p, is_equipped: equip ? 1 : 0 };
          }
          if (equip && p.item?.category === item.category) {
            return { ...p, is_equipped: 0 };
          }
          return p;
        }));
      } else {
        alert(data.error || "O'rnatishda xatolik");
      }
    } catch (err) {
      console.error(err);
      alert("Aloqa xatosi");
    } finally {
      setEquippingId(null);
    }
  };

  // Helper check if item is owned
  const isItemOwned = (itemId: number | string) => {
    return myPurchases.some(p => String(p.item_id) === String(itemId));
  };

  // Helper check if item is equipped
  const isItemEquipped = (itemId: number | string) => {
    const purchase = myPurchases.find(p => String(p.item_id) === String(itemId));
    return Boolean(purchase && (purchase.is_equipped === true || purchase.is_equipped === 1));
  };

  // Filter items
  const filteredItems = items.filter(item => {
    if (activeCategory !== 'all' && item.category !== activeCategory) {
      return false;
    }
    if (showOnlyOwned) {
      return isItemOwned(item.id);
    }
    return true;
  });

  const getCategoryTitle = (cat: string) => {
    switch (cat) {
      case 'avatar': return 'Avatarka';
      case 'frame': return 'Neon Ramka';
      case 'banner': return 'Profil Baneri';
      default: return cat;
    }
  };

  return (
    <div className="min-h-screen text-white pb-20">
      {/* Header Banner */}
      <div className="relative rounded-2xl overflow-hidden mb-8 border border-white/10 bg-gradient-to-br from-[#121216] via-[#0d0d10] to-[#070709] p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#ff006a]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff006a]/10 border border-[#ff006a]/20 text-[#ff006a] text-xs font-semibold uppercase tracking-wider mb-3">
              <ShoppingBag size={13} />
              Animem Do'kon
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white mb-2">
              Profilni Bezatish & Maxsus Elementlar
            </h1>
            <p className="text-white/60 text-sm sm:text-base max-w-2xl leading-relaxed">
              O'zingiz yoqtirgan anime uslubidagi avatarkalar, profil atrofiga aylanuvchi zamonaviy neon ramkalar va keng formatli muqova banerlarini xarid qiling.
            </p>
          </div>

          {/* User profile quick glance */}
          {user && (
            <div className="flex items-center gap-4 bg-white/[0.03] border border-white/10 rounded-xl p-3 sm:p-4 backdrop-blur-md shrink-0">
              <UserAvatar 
                size="lg" 
                src={user.avatar_url} 
                frameUrl={user.avatar_frame_url} 
                name={user.name} 
              />
              <div>
                <p className="text-sm font-bold text-white leading-tight">{user.name}</p>
                <p className="text-xs text-white/50 mt-0.5">
                  Inventar: <span className="text-white font-semibold">{myPurchases.length} ta buyum</span>
                </p>
                <Link 
                  to={getLocalizedPath('/profil')} 
                  className="text-xs text-[#ff006a] hover:underline font-medium inline-flex items-center gap-1 mt-1"
                >
                  Profilga o'tish <ArrowUpRight size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* TezCheck badge */}
        <div className="relative z-10 mt-6 pt-5 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-emerald-400" />
            <span>Xavfsiz to'lovlar <strong>TezCheck.uz</strong> orqali (Uzum, Payme, Click, Bank kartalari)</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-amber-400" />
            <span>To'lov amalga oshishi bilan mahsulot darhol profilingizga qo'shiladi</span>
          </div>
        </div>
      </div>

      {/* Navigation / Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 p-1 bg-[#121215] border border-white/10 rounded-xl overflow-x-auto">
          <button
            onClick={() => { setActiveCategory('all'); setShowOnlyOwned(false); }}
            className={`px-3.5 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeCategory === 'all' && !showOnlyOwned
                ? 'bg-[#ff006a] text-white shadow-lg shadow-[#ff006a]/20'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            Barchasi
          </button>
          <button
            onClick={() => { setActiveCategory('avatar'); setShowOnlyOwned(false); }}
            className={`px-3.5 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeCategory === 'avatar' && !showOnlyOwned
                ? 'bg-[#ff006a] text-white shadow-lg shadow-[#ff006a]/20'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <UserIcon size={14} />
            Avatarkalar
          </button>
          <button
            onClick={() => { setActiveCategory('frame'); setShowOnlyOwned(false); }}
            className={`px-3.5 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeCategory === 'frame' && !showOnlyOwned
                ? 'bg-[#ff006a] text-white shadow-lg shadow-[#ff006a]/20'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles size={14} />
            Neon Ramkalar
          </button>
          <button
            onClick={() => { setActiveCategory('banner'); setShowOnlyOwned(false); }}
            className={`px-3.5 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeCategory === 'banner' && !showOnlyOwned
                ? 'bg-[#ff006a] text-white shadow-lg shadow-[#ff006a]/20'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <ImageIcon size={14} />
            Profil Banerlari
          </button>
        </div>

        {/* Owned Filter toggle */}
        {user && (
          <button
            onClick={() => setShowOnlyOwned(!showOnlyOwned)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${
              showOnlyOwned
                ? 'bg-white/10 border-white/30 text-white'
                : 'bg-[#121215] border-white/10 text-white/60 hover:text-white hover:border-white/20'
            }`}
          >
            <Layers size={15} />
            <span>Mening inventarim ({myPurchases.length})</span>
          </button>
        )}
      </div>

      {/* Verification in progress notification */}
      {verifyingOrder && (
        <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center gap-3">
          <Loader2 size={18} className="animate-spin text-blue-400 shrink-0" />
          <span className="text-sm font-medium">To'lov tekshirilmoqda, iltimos kuting...</span>
        </div>
      )}

      {/* Items Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-white/50">
          <Loader2 size={36} className="animate-spin text-[#ff006a] mb-3" />
          <p className="text-sm font-medium">Do'kon yuklanmoqda...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl bg-[#0c0c0e]">
          <ShoppingBag size={48} className="mx-auto text-white/20 mb-3" />
          <h3 className="text-base font-bold text-white mb-1">Hozircha mahsulotlar topilmadi</h3>
          <p className="text-xs text-white/50 max-w-sm mx-auto">
            {showOnlyOwned 
              ? "Siz hali ushbu toifada biror mahsulot xarid qilmadingiz." 
              : "Bu bo'limda tovarlar tez orada joylanadi."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map(item => {
            const owned = isItemOwned(item.id);
            const equipped = isItemEquipped(item.id);

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`relative flex flex-col justify-between rounded-xl bg-[#111114] border transition-all overflow-hidden group ${
                  equipped 
                    ? 'border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.15)]' 
                    : owned 
                      ? 'border-[#ff006a]/40' 
                      : 'border-white/10 hover:border-white/25 hover:shadow-xl'
                }`}
              >
                {/* Status Badges */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-white/80 border border-white/10">
                    {getCategoryTitle(item.category)}
                  </span>
                  {equipped && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500 text-white flex items-center gap-1 shadow-lg shadow-emerald-500/20">
                      <Check size={11} strokeWidth={3} /> Faol
                    </span>
                  )}
                  {owned && !equipped && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#ff006a]/20 text-[#ff006a] border border-[#ff006a]/30">
                      Xarid qilingan
                    </span>
                  )}
                </div>

                {/* Preview Visual Stage - Asl Katta Ramkalar va Kvadrat Avatarlar */}
                <div className="relative w-full h-44 sm:h-48 bg-gradient-to-b from-[#18181c] to-[#0d0d10] flex items-center justify-center p-4 overflow-hidden">
                  {/* Subtle ambient lighting */}
                  <div className="absolute inset-0 bg-radial-gradient from-white/5 to-transparent pointer-events-none" />

                  {/* 1. Ramka (Frame) Preview - ASL KATTA O'LCHAMI */}
                  {item.category === 'frame' && (
                    <div className="relative w-28 h-28 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                      {/* Avatar base inside frame - To'rtburchak va ramkani to'ldirib turadi */}
                      <div className="w-20 h-20 rounded-2xl bg-[#202026] overflow-hidden flex items-center justify-center border-2 border-white/10 shadow-lg">
                        {user?.avatar_url ? (
                          isVideoMedia(user.avatar_url) ? (
                            <video src={user.avatar_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                          ) : (
                            <img src={user.avatar_url} alt="You" className="w-full h-full object-cover" />
                          )
                        ) : (
                          <span className="text-2xl font-black text-[#ff006a] uppercase">AN</span>
                        )}
                      </div>
                      {/* Animated/Glowing Frame overlay - ASL HOLI */}
                      {isVideoMedia(item.image_url) ? (
                        <video
                          src={item.image_url}
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="absolute inset-0 w-full h-full object-contain pointer-events-none scale-120 drop-shadow-[0_0_15px_rgba(255,0,106,0.6)]"
                        />
                      ) : (
                        <img 
                          src={item.image_url} 
                          alt={item.title} 
                          className="absolute inset-0 w-full h-full object-contain pointer-events-none scale-120 drop-shadow-[0_0_15px_rgba(255,0,106,0.6)]"
                        />
                      )}
                    </div>
                  )}

                  {/* 2. Avatarka (Avatar) Preview */}
                  {item.category === 'avatar' && (
                    <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl transition-transform duration-300 group-hover:scale-105 flex items-center justify-center bg-[#1c1c1e]">
                      {isVideoMedia(item.image_url) ? (
                        <video 
                          src={item.image_url} 
                          autoPlay 
                          loop 
                          muted 
                          playsInline 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <img 
                          src={item.image_url} 
                          alt={item.title} 
                          className="w-full h-full object-cover" 
                        />
                      )}
                    </div>
                  )}

                  {/* 3. Baner (Banner) Preview */}
                  {item.category === 'banner' && (
                    <div className="relative w-full h-28 max-w-[260px] rounded-lg overflow-hidden border border-white/20 shadow-xl transition-transform duration-300 group-hover:scale-105">
                      {isVideoMedia(item.image_url) ? (
                        <video 
                          src={item.image_url} 
                          autoPlay 
                          loop 
                          muted 
                          playsInline 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <img 
                          src={item.image_url} 
                          alt={item.title} 
                          className="w-full h-full object-cover" 
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2 pointer-events-none">
                        <span className="text-[10px] text-white/70 font-medium">Profil foni namunasi</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Details & Action */}
                <div className="p-4 bg-[#111114] flex flex-col flex-1 justify-between gap-3 border-t border-white/5">
                  <div>
                    <h3 className="font-bold text-white text-sm line-clamp-1 group-hover:text-[#ff006a] transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-base font-black text-white">
                        {item.price.toLocaleString('uz-UZ')}
                      </span>
                      <span className="text-xs font-semibold text-white/50">so'm</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2">
                    {owned ? (
                      <div className="flex items-center gap-2">
                        {equipped ? (
                          <button
                            onClick={() => handleEquip(item, false)}
                            disabled={equippingId === item.id}
                            className="w-full py-2.5 px-3 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {equippingId === item.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Check size={13} strokeWidth={3} />
                            )}
                            O'rnatilgan (Yechish)
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEquip(item, true)}
                            disabled={equippingId === item.id}
                            className="w-full py-2.5 px-3 rounded-lg text-xs font-bold bg-white/10 hover:bg-[#ff006a] text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {equippingId === item.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Zap size={13} />
                            )}
                            Profilga o'rnatish
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartCheckout(item)}
                        className="w-full py-2.5 px-3 rounded-lg text-xs font-bold bg-[#ff006a] hover:bg-[#d40058] text-white shadow-lg shadow-[#ff006a]/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer group-hover:brightness-110 active:scale-98"
                      >
                        <ShoppingBag size={13} />
                        Sotib olish
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Confirmation & Checkout Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#131317] border border-white/15 rounded-2xl p-6 shadow-2xl text-white"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#ff006a] tracking-wider">
                    Xaridni tasdiqlash
                  </span>
                  <h3 className="text-xl font-bold text-white mt-0.5">{selectedItem.title}</h3>
                </div>
                <button
                  onClick={() => { setSelectedItem(null); setCheckoutError(''); }}
                  className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Item preview in modal */}
              <div className="relative w-full h-44 bg-[#0d0d10] border border-white/10 rounded-xl overflow-hidden flex items-center justify-center mb-5">
                {selectedItem.category === 'frame' ? (
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-2xl bg-[#202026] overflow-hidden flex items-center justify-center border-2 border-white/10 shadow-lg">
                      {user?.avatar_url ? (
                        isVideoMedia(user.avatar_url) ? (
                          <video src={user.avatar_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                        ) : (
                          <img src={user.avatar_url} alt="You" className="w-full h-full object-cover" />
                        )
                      ) : (
                        <span className="text-2xl font-black text-[#ff006a] uppercase">AN</span>
                      )}
                    </div>
                    {isVideoMedia(selectedItem.image_url) ? (
                      <video 
                        src={selectedItem.image_url} 
                        autoPlay 
                        loop 
                        muted 
                        playsInline 
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none scale-120 drop-shadow-[0_0_15px_rgba(255,0,106,0.6)]" 
                      />
                    ) : (
                      <img 
                        src={selectedItem.image_url} 
                        alt={selectedItem.title} 
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none scale-120 drop-shadow-[0_0_15px_rgba(255,0,106,0.6)]" 
                      />
                    )}
                  </div>
                ) : selectedItem.category === 'avatar' ? (
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl flex items-center justify-center bg-[#1c1c1e]">
                    {isVideoMedia(selectedItem.image_url) ? (
                      <video 
                        src={selectedItem.image_url} 
                        autoPlay 
                        loop 
                        muted 
                        playsInline 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <img 
                        src={selectedItem.image_url} 
                        alt={selectedItem.title} 
                        className="w-full h-full object-cover" 
                      />
                    )}
                  </div>
                ) : (
                  <div className="relative w-full h-full p-2 flex items-center justify-center">
                    {isVideoMedia(selectedItem.image_url) ? (
                      <video 
                        src={selectedItem.image_url} 
                        autoPlay 
                        loop 
                        muted 
                        playsInline 
                        className="max-h-32 w-auto rounded-lg object-cover" 
                      />
                    ) : (
                      <img 
                        src={selectedItem.image_url} 
                        alt={selectedItem.title} 
                        className="max-h-32 object-contain rounded-lg" 
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Price details */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 mb-5 space-y-2 text-xs">
                <div className="flex justify-between text-white/60">
                  <span>Toifa:</span>
                  <span className="text-white font-medium capitalize">{getCategoryTitle(selectedItem.category)}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>To'lov usuli:</span>
                  <span className="text-emerald-400 font-medium">TezCheck.uz (Uzum / Payme / Click)</span>
                </div>
                <div className="border-t border-white/5 pt-2 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-white">Jami summa:</span>
                  <span className="text-lg font-black text-[#ff006a]">
                    {selectedItem.price.toLocaleString('uz-UZ')} so'm
                  </span>
                </div>
              </div>

              {checkoutError && (
                <div className="mb-4 space-y-2">
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{checkoutError}</span>
                  </div>
                  <button
                    onClick={handleTestPurchase}
                    disabled={checkingOut}
                    className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Zap size={14} />
                    <span>Sinov tariqasida xarid qilish (Hisobdan pulsiz olish)</span>
                  </button>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setSelectedItem(null); setCheckoutError(''); }}
                  disabled={checkingOut}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleConfirmPurchase}
                  disabled={checkingOut}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#ff006a] hover:bg-[#d40058] shadow-lg shadow-[#ff006a]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {checkingOut ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Tayyorlanmoqda...</span>
                    </>
                  ) : (
                    <>
                      <span>To'lovga o'tish</span>
                      <ExternalLink size={13} />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Verification Result Modal */}
      <AnimatePresence>
        {verifyResult.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#131317] border border-white/15 rounded-2xl p-6 shadow-2xl text-center text-white"
            >
              <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4 ${
                verifyResult.success ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {verifyResult.success ? <Check size={28} strokeWidth={3} /> : <AlertCircle size={28} />}
              </div>

              <h3 className="text-xl font-bold mb-2">
                {verifyResult.success ? "To'lov muvaffaqiyatli!" : "To'lov amalga oshmadi"}
              </h3>
              <p className="text-xs text-white/60 leading-relaxed mb-6">
                {verifyResult.message}
              </p>

              <button
                onClick={() => setVerifyResult({ show: false, success: false, message: '' })}
                className="w-full py-3 rounded-xl text-xs font-bold text-white bg-[#ff006a] hover:bg-[#d40058] shadow-lg shadow-[#ff006a]/25 transition-all"
              >
                Tushunarli
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
