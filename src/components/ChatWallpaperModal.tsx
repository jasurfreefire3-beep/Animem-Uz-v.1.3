import React, { useState } from 'react';
import { X, Check, Image, Sliders, Palette, RefreshCw, Sparkles, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CHAT_WALLPAPERS, 
  DEFAULT_WALLPAPER_URL, 
  ChatWallpaper, 
  saveChatWallpaper, 
  saveWallpaperDim 
} from '../data/chatWallpapers';

interface ChatWallpaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWallpaper: string;
  currentDim: number;
  onSelectWallpaper: (url: string) => void;
  onSelectDim: (dim: number) => void;
}

export default function ChatWallpaperModal({
  isOpen,
  onClose,
  currentWallpaper,
  currentDim,
  onSelectWallpaper,
  onSelectDim
}: ChatWallpaperModalProps) {
  const [customUrl, setCustomUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'wallpapers' | 'settings'>('wallpapers');
  const [previewDim, setPreviewDim] = useState<number>(currentDim);

  if (!isOpen) return null;

  const handleApplyWallpaper = (url: string) => {
    saveChatWallpaper(url);
    onSelectWallpaper(url);
  };

  const handleApplyDim = (dim: number) => {
    setPreviewDim(dim);
    saveWallpaperDim(dim);
    onSelectDim(dim);
  };

  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    handleApplyWallpaper(customUrl.trim());
    setCustomUrl('');
  };

  const handleResetToDefault = () => {
    handleApplyWallpaper(DEFAULT_WALLPAPER_URL);
    handleApplyDim(0.72);
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0e0f18] border border-white/15 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl shadow-black/90 overflow-hidden"
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-[#141522] border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#ff006a] to-[#7928ca] flex items-center justify-center text-white shadow-md shadow-[#ff006a]/30">
                <Palette size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                  Chat Orqa Foni
                </h3>
                <p className="text-[11px] text-white/50">
                  O'zingizga yoqqan anime fonini tanlang
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 text-white/60 hover:text-white rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Action Tabs */}
          <div className="px-3.5 sm:px-4 py-2 bg-[#10111a] border-b border-white/5 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('wallpapers')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'wallpapers'
                    ? 'bg-[#ff006a] text-white shadow-md shadow-[#ff006a]/30'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Image size={13} />
                <span>Fonlar ({CHAT_WALLPAPERS.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'settings'
                    ? 'bg-[#ff006a] text-white shadow-md shadow-[#ff006a]/30'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Sliders size={13} />
                <span>Qoraytirish</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetToDefault}
              className="text-[11px] text-white/50 hover:text-[#ff006a] flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer font-medium"
              title="Standart holatga qaytarish"
            >
              <RefreshCw size={11} />
              <span>Standart</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 custom-scrollbar space-y-4">
            {activeTab === 'wallpapers' && (
              <>
                {/* Wallpapers Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {/* Option: Pure Solid Dark Theme */}
                  <div
                    onClick={() => handleApplyWallpaper('')}
                    className={`group relative rounded-xl border p-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all aspect-[16/11] bg-[#07070b] overflow-hidden ${
                      !currentWallpaper
                        ? 'border-[#ff006a] ring-2 ring-[#ff006a]/50 shadow-lg shadow-[#ff006a]/20'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 mb-1.5 group-hover:scale-110 transition-transform">
                      <div className="w-4 h-4 rounded-full bg-black border border-white/20"></div>
                    </div>
                    <span className="text-xs font-bold text-white">To'q Shisha</span>
                    <span className="text-[10px] text-white/40">Rasmsiz minimalist</span>

                    {!currentWallpaper && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#ff006a] text-white flex items-center justify-center shadow-md">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  {/* Pre-defined 11 Anime Wallpapers */}
                  {CHAT_WALLPAPERS.map((wp: ChatWallpaper, idx) => {
                    const isSelected = currentWallpaper === wp.url;
                    return (
                      <div
                        key={wp.id}
                        onClick={() => handleApplyWallpaper(wp.url)}
                        className={`group relative rounded-xl border overflow-hidden cursor-pointer transition-all aspect-[16/11] flex flex-col justify-end p-2.5 bg-black/60 ${
                          isSelected
                            ? 'border-[#ff006a] ring-2 ring-[#ff006a]/60 shadow-lg shadow-[#ff006a]/30'
                            : 'border-white/10 hover:border-white/40 hover:scale-[1.02]'
                        }`}
                      >
                        {/* Background Thumbnail Image */}
                        <img
                          src={wp.thumbnail}
                          alt={wp.name}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />

                        {/* Dark Gradient Overlay for title readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

                        {/* Title and Badge */}
                        <div className="relative z-10 min-w-0">
                          <p className="text-[11px] font-extrabold text-white truncate drop-shadow-md">
                            {idx + 1}. {wp.name}
                          </p>
                          {wp.category && (
                            <span className="text-[9px] text-[#ff006a] font-bold">
                              #{wp.category}
                            </span>
                          )}
                        </div>

                        {/* Active Selection Indicator */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#ff006a] text-white flex items-center justify-center shadow-lg shadow-[#ff006a]/40 animate-pulse">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Custom URL Input Section */}
                <div className="pt-3 border-t border-white/10">
                  <span className="text-xs font-bold text-white/80 block mb-2">
                    Boshqa rasm havolasini qo'yish:
                  </span>
                  <form onSubmit={handleApplyCustomUrl} className="flex gap-2">
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://... rasm havolasini kiriting"
                      className="flex-1 bg-black/50 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#ff006a] transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!customUrl.trim()}
                      className="px-4 py-2 bg-gradient-to-r from-[#ff006a] to-[#7928ca] hover:opacity-95 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#ff006a]/20 flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Plus size={14} />
                      <span>Qo'yish</span>
                    </button>
                  </form>
                </div>
              </>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div className="bg-[#121320] border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Fonni Qoraytirish Darajasi</h4>
                      <p className="text-[11px] text-white/50">
                        Xabarlar orqa fon ustida tiniq va chiroyli o'qilishi uchun qorayish darajasi
                      </p>
                    </div>
                    <span className="text-xs font-extrabold text-[#ff006a] font-mono">
                      {Math.round(previewDim * 100)}%
                    </span>
                  </div>

                  {/* Preset Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {[
                      { label: "Yengil", value: 0.50, desc: "Rasm yorqinroq" },
                      { label: "O'rtacha", value: 0.72, desc: "Tavsiya etiladi" },
                      { label: "Kuchli", value: 0.88, desc: "Xabarlar juda tiniq" }
                    ].map((preset) => {
                      const isActive = Math.abs(previewDim - preset.value) < 0.05;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleApplyDim(preset.value)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#ff006a]/20 border-[#ff006a] text-white shadow-md shadow-[#ff006a]/20'
                              : 'bg-black/40 border-white/10 hover:border-white/20 text-white/70 hover:text-white'
                          }`}
                        >
                          <span className="block text-xs font-bold">{preset.label}</span>
                          <span className="block text-[10px] text-white/40">{preset.desc}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Slider */}
                  <div className="pt-2">
                    <input
                      type="range"
                      min="0.30"
                      max="0.95"
                      step="0.02"
                      value={previewDim}
                      onChange={(e) => handleApplyDim(parseFloat(e.target.value))}
                      className="w-full accent-[#ff006a] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-white/40 font-mono mt-1">
                      <span>30% (Och)</span>
                      <span>72% (Standart)</span>
                      <span>95% (Qorong'i)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 sm:p-4 bg-[#121320] border-t border-white/10 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-white/50">
              Tanlov qurilmangizda avtomatik saqlanadi.
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-gradient-to-r from-[#ff006a] to-[#7928ca] hover:opacity-95 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-[#ff006a]/30 cursor-pointer"
            >
              Tayyor
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

