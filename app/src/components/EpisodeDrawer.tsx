import React from 'react';
import { X, Play, CheckCircle2 } from 'lucide-react';
import { Episode } from '../types';

interface EpisodeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  episodes: Episode[];
  currentEpisodeNumber: number;
  onSelectEpisode: (epNum: number) => void;
  animeTitle?: string;
}

export const EpisodeDrawer: React.FC<EpisodeDrawerProps> = ({
  isOpen,
  onClose,
  episodes,
  currentEpisodeNumber,
  onSelectEpisode,
  animeTitle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md transition-opacity">
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer content */}
      <div className="w-full max-w-md mx-auto bg-[#0f1016] border-t border-white/10 rounded-t-3xl p-5 max-h-[75vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Qismlar ro'yxati</span>
              <span className="text-xs bg-[#ff006a]/20 text-[#ff006a] px-2 py-0.5 rounded-full font-black">
                {episodes.length} ta
              </span>
            </h3>
            {animeTitle && <p className="text-xs text-white/40 truncate max-w-[260px]">{animeTitle}</p>}
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Episodes Grid/List */}
        <div className="overflow-y-auto no-scrollbar py-3 space-y-2 flex-1">
          {episodes.map((ep) => {
            const isCurrent = ep.episode_number === currentEpisodeNumber;

            return (
              <div
                key={ep.episode_number}
                onClick={() => {
                  onSelectEpisode(ep.episode_number);
                  onClose();
                }}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${
                  isCurrent
                    ? 'bg-gradient-to-r from-[#ff006a]/25 to-[#7928ca]/25 border border-[#ff006a]/50 text-white shadow-[0_0_15px_rgba(255,0,106,0.2)]'
                    : 'bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                      isCurrent ? 'bg-[#ff006a] text-white shadow-[0_0_10px_#ff006a]' : 'bg-black/50 text-white/50'
                    }`}
                  >
                    {isCurrent ? <Play size={13} className="fill-white ml-0.5" /> : ep.episode_number}
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${isCurrent ? 'text-white' : 'text-white/80'}`}>
                      {ep.episode_number}-qism
                      {ep.title && <span className="font-normal text-white/50 ml-1.5">— {ep.title}</span>}
                    </h4>
                    <span className="text-[10px] text-white/40 font-mono">
                      {ep.duration_formatted || "24:00 daqiqa"}
                    </span>
                  </div>
                </div>

                {isCurrent && (
                  <span className="text-[10px] text-[#00dfd8] font-black uppercase flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    Hozirgi
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
