import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bookmark, Check, ChevronDown, Trash2, Heart, Tv, Clock, CheckCircle2, XCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Anime, UserListStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  getAnimeListStatus, 
  setUserListStatus, 
  USER_LIST_STATUSES, 
  getStatusConfig 
} from '../services/userListService';

interface PersonalListButtonProps {
  anime: Anime;
  className?: string;
  variant?: 'full' | 'compact' | 'badge';
}

export default function PersonalListButton({ anime, className = '', variant = 'full' }: PersonalListButtonProps) {
  const { user, token } = useAuth();
  const [currentStatus, setCurrentStatus] = useState<UserListStatus | null>(() => getAnimeListStatus(anime.id));
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setCurrentStatus(getAnimeListStatus(anime.id));

    const handleUpdate = (e: any) => {
      if (e.detail?.animeId && String(e.detail.animeId) === String(anime.id)) {
        setCurrentStatus(e.detail.status);
      } else {
        setCurrentStatus(getAnimeListStatus(anime.id));
      }
    };

    window.addEventListener('animem_user_list_updated', handleUpdate);
    return () => window.removeEventListener('animem_user_list_updated', handleUpdate);
  }, [anime.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelectStatus = (status: UserListStatus | null) => {
    setUserListStatus(anime.id, status, anime, token);
    setCurrentStatus(status);
    setIsOpen(false);
  };

  const statusConfig = getStatusConfig(currentStatus);

  const getStatusIcon = (status: UserListStatus) => {
    switch (status) {
      case 'watching': return Tv;
      case 'plan_to_watch': return Clock;
      case 'completed': return CheckCircle2;
      case 'dropped': return XCircle;
      case 'favorite': return Heart;
      default: return Bookmark;
    }
  };

  return (
    <>
      <div className={`relative inline-block shrink-0 ${className}`}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`px-3.5 sm:px-5 py-2.5 sm:py-3 md:py-3.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 border uppercase tracking-wider cursor-pointer select-none hover:scale-105 shrink-0 ${
            currentStatus
              ? 'bg-[#1a1726] border-[#ff006a]/50 text-white shadow-[0_0_15px_rgba(255,0,106,0.2)]'
              : 'bg-[#18181b] border-[#27272a] hover:bg-[#27272a] text-white'
          }`}
          style={currentStatus && statusConfig ? { borderColor: statusConfig.color } : {}}
        >
          {currentStatus && statusConfig ? (
            <>
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]"
                style={{ backgroundColor: statusConfig.dotColor, color: statusConfig.dotColor }}
              />
              <span className="truncate">{statusConfig.label}</span>
            </>
          ) : (
            <>
              <Bookmark className="w-4 h-4 shrink-0 text-[#ff006a]" />
              <span>RO'YXATGA QO'SHISH</span>
            </>
          )}
          <ChevronDown size={14} className={`text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* High z-index portal modal: never clipped by overflow-hidden or hidden behind video players */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-md"
              />

              {/* Modal Dialog Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 15 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="relative w-full max-w-sm bg-[#12121a] border border-white/15 rounded-3xl p-5 shadow-[0_0_50px_rgba(0,0,0,0.85)] z-10"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3 mb-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#ff006a] block mb-0.5">
                      Shaxsiy Ro'yxat
                    </span>
                    <h3 className="text-sm font-bold text-white truncate">
                      {anime.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-white/50 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Status Options */}
                <div className="space-y-1.5">
                  {USER_LIST_STATUSES.map(st => {
                    const Icon = getStatusIcon(st.id);
                    const isSelected = currentStatus === st.id;

                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleSelectStatus(st.id)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all text-left cursor-pointer border ${
                          isSelected
                            ? 'bg-[#ff006a]/15 border-[#ff006a]/50 text-white shadow-md'
                            : 'bg-white/[0.03] border-white/5 text-white/80 hover:text-white hover:bg-white/10 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span 
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]" 
                            style={{ backgroundColor: st.dotColor, color: st.dotColor }}
                          />
                          <Icon size={16} style={{ color: st.color }} />
                          <span className="tracking-wide">{st.label}</span>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#ff006a] flex items-center justify-center text-white shrink-0">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {currentStatus && (
                    <div className="pt-2 mt-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => handleSelectStatus(null)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
                      >
                        <Trash2 size={14} />
                        <span>Ro'yxatdan olib tashlash</span>
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
