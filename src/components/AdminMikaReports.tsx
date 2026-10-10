import React, { useState, useEffect } from 'react';
import { ShieldAlert, Trash2, RefreshCw, AlertTriangle, MessageSquare, Clock, User, CheckCircle2, Shield } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminMikaReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const fetchReports = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch('/api/mika/reports');
      const data = await res.json();
      if (res.ok && data.reports) {
        setReports(data.reports);
      } else {
        setReports([]);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `Shikoyatlarni yuklashda xatolik: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Haqiqatan ham ushbu shikoyatni o‘chirmoqchimisiz?")) return;
    try {
      const res = await fetch(`/api/mika/reports/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setReports(prev => prev.filter(r => r.id !== id));
        setMessage({ type: 'success', text: "Shikoyat o‘chirildi." });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `O‘chirishda xatolik: ${err.message}` });
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Barcha shikoyatlarni tozalamoqchimisiz? Ushbu amalni qaytarib bo‘lmaydi!")) return;
    try {
      const res = await fetch('/api/mika/clear-reports', { method: 'POST' });
      if (res.ok) {
        setReports([]);
        setMessage({ type: 'success', text: "Barcha shikoyatlar tozalandi." });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `Tozalashda xatolik: ${err.message}` });
    }
  };

  const filteredReports = reports.filter(r => 
    (r.message || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.ip || '').includes(searchTerm)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#111] border border-[#222] rounded-sm p-5 sm:p-8 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#222] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-red-500" />
            </div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Mika AI Shikoyatlar Paneli
              <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-mono font-normal">
                {reports.length} ta qayd
              </span>
            </h2>
          </div>
          <p className="text-xs text-white/50 mt-1">
            Foydalanuvchilar tomonidan Mikaga nisbatan qilingan so‘kinish, haqorat va nojo‘ya xabarlar jurnali.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={fetchReports}
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-[#222] hover:bg-[#333] text-white px-3 py-2 rounded-sm text-xs font-bold transition-colors cursor-pointer"
            title="Yangilash"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Yangilash</span>
          </button>

          {reports.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/30 px-3 py-2 rounded-sm text-xs font-bold transition-colors cursor-pointer"
              title="Barchasini tozalash"
            >
              <Trash2 size={14} />
              <span>Barchasini tozalash</span>
            </button>
          )}
        </div>
      </div>

      {/* Message Notifications */}
      {message.text && (
        <div className={`p-3 rounded-sm text-xs font-bold flex items-center gap-2 ${
          message.type === 'error'
            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
            : 'bg-green-500/10 text-green-400 border border-green-500/20'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${message.type === 'error' ? 'bg-red-400' : 'bg-green-400'}`} />
          <span>{message.text}</span>
        </div>
      )}

      {/* Search Input */}
      {reports.length > 0 && (
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Shikoyatlar orasidan qidirish (xabar, foydalanuvchi, IP)..."
            className="w-full bg-[#181818] border border-[#2a2a2a] focus:border-[#ff006a] rounded-sm px-4 py-2.5 text-xs text-white placeholder:text-white/30 outline-none transition-colors"
          />
        </div>
      )}

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-white font-bold text-sm">Shikoyatlar mavjud emas</h3>
          <p className="text-white/40 text-xs max-w-sm mx-auto">
            Hozircha hech kim Mikani xafa qilmagan va so‘kinmagan. Tizim toza va xavfsiz ishlamoqda! 🌸
          </p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="py-12 text-center text-white/40 text-xs">
          Qidiruv bo‘yicha hech qanday shikoyat topilmadi.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-[#16161c] border border-red-500/30 hover:border-red-500/50 rounded-sm p-4 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)] relative group"
            >
              {/* Top metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5 mb-3 text-[11px]">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                    ID #{report.id}
                  </span>
                  <span className="flex items-center gap-1 text-white/70">
                    <User size={12} className="text-white/40" />
                    <strong>{report.user_name || 'Mehmon'}</strong>
                  </span>
                  {report.ip && (
                    <span className="text-white/40 font-mono text-[10px]">
                      IP: {report.ip}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-white/40 text-[10px]">
                    <Clock size={12} />
                    {report.created_at || 'Yaqinda'}
                  </span>
                  <button
                    onClick={() => handleDelete(report.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/20 p-1.5 rounded transition-colors cursor-pointer"
                    title="O‘chirish"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Bad Words / Abusive Message */}
              <div className="space-y-2">
                <div>
                  <div className="text-[10px] uppercase font-bold text-red-400 tracking-wider flex items-center gap-1 mb-1">
                    <AlertTriangle size={12} />
                    <span>Foydalanuvchi yozgan so‘z (Haqorat):</span>
                  </div>
                  <div className="bg-red-950/40 border border-red-500/40 text-red-200 px-3.5 py-2.5 rounded text-xs font-mono select-all">
                    "{report.message}"
                  </div>
                </div>

                {/* Mika's Response */}
                {report.ai_response && (
                  <div>
                    <div className="text-[10px] uppercase font-bold text-[#ff006a] tracking-wider flex items-center gap-1 mb-1 mt-2">
                      <MessageSquare size={12} />
                      <span>Mikanning bergan javobi (Arazlagan):</span>
                    </div>
                    <div className="bg-[#1e1726]/60 border border-[#ff006a]/20 text-white/80 px-3.5 py-2.5 rounded text-xs leading-relaxed whitespace-pre-wrap">
                      {report.ai_response}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

