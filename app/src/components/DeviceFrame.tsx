import React, { useState } from 'react';
import { Smartphone, Monitor } from 'lucide-react';

interface DeviceFrameProps {
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children }) => {
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'full'>('mobile');

  return (
    <div className="min-h-screen bg-[#030305] flex flex-col items-center justify-start">
      {/* Top Testing Switcher Toolbar (Only visible on wide desktop screens) */}
      <aside aria-label="Desktop Preview Toolbar" className="hidden lg:flex items-center justify-between w-full max-w-4xl px-4 py-2 border-b border-white/5 bg-[#0a0a0f] text-xs text-white/50 z-50">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <span className="font-bold text-white/80">Animem Uz Mobile Preview (Brauzer Ko'rigi)</span>
          <span className="bg-[#ff006a]/15 text-[#ff006a] border border-[#ff006a]/30 px-2 py-0.5 rounded text-[10px] font-black uppercase">
            Vite 5175
          </span>
        </div>

        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setDeviceMode('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs transition-all ${
              deviceMode === 'mobile'
                ? 'bg-[#ff006a] text-white shadow-[0_0_12px_rgba(255,0,106,0.5)]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Smartphone size={13} />
            <span>Mobil Telefon</span>
          </button>
          <button
            onClick={() => setDeviceMode('full')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs transition-all ${
              deviceMode === 'full'
                ? 'bg-[#ff006a] text-white shadow-[0_0_12px_rgba(255,0,106,0.5)]'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Monitor size={13} />
            <span>Keng Ekran</span>
          </button>
        </div>
      </aside>

      {/* Main Viewport Container */}
      <div
        className={`w-full transition-all duration-300 ${
          deviceMode === 'mobile'
            ? 'max-w-[430px] my-0 lg:my-6 min-h-screen lg:min-h-[880px] lg:max-h-[920px] rounded-none lg:rounded-[44px] shadow-none lg:shadow-[0_0_60px_rgba(0,0,0,0.9),0_0_0_12px_#181924,0_0_0_14px_rgba(255,255,255,0.08)] overflow-hidden border-0 lg:border border-white/10 relative bg-[#07070a] flex flex-col'
            : 'max-w-2xl min-h-screen bg-[#07070a] flex flex-col'
        }`}
      >
        {/* Dynamic Island / Notch on desktop mobile preview */}
        {deviceMode === 'mobile' && (
          <div className="hidden lg:flex w-full justify-center pt-2.5 pb-1 shrink-0 bg-[#07070a] z-50 pointer-events-none">
            <div className="w-24 h-4 bg-black rounded-full border border-white/10 flex items-center justify-end px-2">
              <span className="w-2 h-2 rounded-full bg-[#111] border border-white/20" />
            </div>
          </div>
        )}

        {/* The Actual Mobile App Scrollable View */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col pb-20">
          {children}
        </div>
      </div>
    </div>
  );
};

