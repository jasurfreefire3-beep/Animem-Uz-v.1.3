import React, { useState } from 'react';
import { X, Play, CheckCircle2, LayoutGrid, List } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md transition-opacity">
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer content */}
      <div className="w-full max-w-md mx-auto bg-[#0f1016] border-t border-white/10 rounded-t-3xl p-5 max-h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Qismlar ro'yxati</span>
              <span className="text-xs bg-[#ff006a]/20 text-[#ff006a] px-2.5 py-0.5 rounded-full font-black border border-[#ff006a]/30">
                {episodes.length} ta
              </span>
            </h3>
            {animeTitle && <p className="text-xs text-white/50 truncate max-w-[220px]">{animeTitle}</p>}
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-[#ff006a] text-white' : 'text-white/40 hover:text-white'
                }`}
                title="Ro'yxat ko'rinishi"
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-[#ff006a] text-white' : 'text-white/40 hover:text-white'
                }`}
                title="Kataklar ko'rinishi"
              >
                <LayoutGrid size={14} />
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Episodes List / Grid */}
        <div className="overflow-y-auto no-scrollbar py-3 flex-1">
          {viewMode === 'grid' ? (
            /* Grid layout: clean numbered buttons */
            <div className="grid grid-cols-5 gap-2">
              {episodes.map((ep) => {
                const isCurrent = Number(ep.episode_number) === Number(currentEpisodeNumber);
                return (
                  <button
                    key={ep.episode_number}
                    onClick={() => {
                      onSelectEpisode(Number(ep.episode_number));
                      onClose();
                    }}
                    className={`py-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90 ${
                      isCurrent
                        ? 'bg-[#ff006a] text-white shadow-[0_0_12px_#ff006a]'
                        : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/5'
                    }`}
                  >
                    <span>{ep.episode_number}</span>
                    <span className="text-[9px] opacity-60 font-normal">qism</span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Detailed List layout */
            <div className="space-y-2">
              {episodes.map((ep) => {
                const isCurrent = Number(ep.episode_number) === Number(currentEpisodeNumber);
                const durationText = ep.duration || ep.duration_formatted || "24:00";
                const serverBadge = ep.server_name || "TAS-IX Ultra (1080p FHD)";

                return (
                  <div
                    key={ep.episode_number}
                    onClick={() => {
                      onSelectEpisode(Number(ep.episode_number));
                      onClose();
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${
                      isCurrent
                        ? 'bg-gradient-to-r from-[#ff006a]/25 to-[#7928ca]/25 border border-[#ff006a]/50 text-white shadow-[0_0_15px_rgba(255,0,106,0.2)]'
                        : 'bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-black ${
                          isCurrent ? 'bg-[#ff006a] text-white shadow-[0_0_10px_#ff006a]' : 'bg-black/50 text-white/60 border border-white/5'
                        }`}
                      >
                        {isCurrent ? <Play size={13} className="fill-white ml-0.5" /> : ep.episode_number}
                      </div>
                      <div className="truncate">
                        <h4 className={`text-xs font-bold truncate ${isCurrent ? 'text-white' : 'text-white/90'}`}>
                          {ep.episode_number}-qism
                          {ep.title && <span className="font-normal text-white/50 ml-1.5">— {ep.title}</span>}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono mt-0.5">
                          <span>{durationText}</span>
                          <span>•</span>
                          <span className="text-[#00dfd8] truncate max-w-[120px]">{serverBadge}</span>
                        </div>
                      </div>
                    </div>

                    {isCurrent && (
                      <span className="text-[10px] text-[#00dfd8] font-black uppercase flex items-center gap-1 shrink-0 ml-2">
                        <CheckCircle2 size={13} />
                        Hozirgi
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
