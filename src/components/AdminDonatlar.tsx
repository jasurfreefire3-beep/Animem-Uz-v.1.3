import React, { useState, useEffect } from 'react';
import { Heart, RefreshCw, Trash2, CheckCircle2, Clock, MessageSquare, AlertCircle } from 'lucide-react';

interface DonationRecord {
  id: number;
  order_id: string;
  donor_name: string;
  donor_avatar?: string | null;
  amount: number;
  comment?: string | null;
  payment_method?: string;
  status: string;
  paid_at?: string | null;
  created_at: string;
}

export default function AdminDonatlar() {
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const getAdminHeaders = (extraHeaders: Record<string, string> = {}) => {
    const token = localStorage.getItem('token') || '';
    const passcode = sessionStorage.getItem('animem_admin_passcode') || '1213234';
    return {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      'x-admin-passcode': passcode,
      ...extraHeaders
    };
  };

  const fetchAdminDonations = async () => {
    setIsLoading(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await fetch(`${API_BASE}/api/admin/donations`, {
        headers: getAdminHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setDonations(Array.isArray(data) ? data : []);
      } else {
        // Fallback to public list
        const pubRes = await fetch(`${API_BASE}/api/donations`);
        if (pubRes.ok) {
          const pubData = await pubRes.json();
          setDonations(pubData.donations || []);
        }
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || "Yuklashda xatolik" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminDonations();
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/donate/update-status`, {
        method: 'POST',
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ order_id: orderId, status: newStatus })
      });
      if (res.ok) {
        setMsg({ type: 'success', text: "Maqom muvaffaqiyatli yangilandi!" });
        fetchAdminDonations();
      }
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || "Xatolik" });
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!window.confirm("Rostdan ham ushbu donat yozuvini o'chirmoqchimisiz?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/donate/${id}`, {
        method: 'DELETE',
        headers: getAdminHeaders()
      });
      if (res.ok) {
        setMsg({ type: 'success', text: "Donat yozuvi o'chirildi!" });
        setDonations(prev => prev.filter(d => d.id !== id && d.order_id !== String(id)));
      }
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message || "O'chirishda xatolik" });
    }
  };

  const totalPaid = donations
    .filter(d => d.status === 'paid')
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#111114] p-5 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#ff006a]/20 border border-[#ff006a]/40 flex items-center justify-center text-[#ff006a]">
            <Heart size={24} className="fill-current" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Donatlar Boshqaruvi</h2>
            <p className="text-xs text-white/50">TezCheck orqali tushgan barcha xayriyalar</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="bg-[#18181d] px-4 py-2 rounded-xl border border-white/5 text-right flex-1 sm:flex-initial">
            <span className="text-[10px] uppercase font-bold text-white/40 block">Jami Tushum:</span>
            <strong className="text-base font-black text-emerald-400">
              {totalPaid.toLocaleString('uz-UZ')} UZS
            </strong>
          </div>
          <button
            onClick={fetchAdminDonations}
            disabled={isLoading}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Yangilash"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
          msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#111114] border border-white/5 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-white/40 text-xs flex items-center justify-center gap-2">
            <RefreshCw size={16} className="animate-spin" />
            Yuklanmoqda...
          </div>
        ) : donations.length === 0 ? (
          <div className="py-20 text-center text-white/30 text-xs">
            Hozircha donat yozuvlari topilmadi.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#16161a] text-white/50 text-[10px] uppercase tracking-wider border-b border-white/5">
                <tr>
                  <th className="py-3 px-4">Buyurtma / ID</th>
                  <th className="py-3 px-4">Donator</th>
                  <th className="py-3 px-4">Miqdor</th>
                  <th className="py-3 px-4">Xabar (Izoh)</th>
                  <th className="py-3 px-4">Holat</th>
                  <th className="py-3 px-4">Vaqt</th>
                  <th className="py-3 px-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {donations.map((don) => (
                  <tr key={don.id || don.order_id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-white/60">
                      #{don.order_id || don.id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={don.donor_avatar || "/logo.png"}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover bg-white/10"
                          onError={(e: any) => { e.target.src = "/logo.png"; }}
                        />
                        <span className="font-bold text-white truncate max-w-[120px]">
                          {don.donor_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-black text-emerald-400">
                      {Number(don.amount).toLocaleString('uz-UZ')} UZS
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-white/70 italic">
                      {don.comment ? `"${don.comment}"` : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        don.status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : don.status === 'pending'
                          ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {don.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white/40 text-[11px]">
                      {don.created_at ? new Date(don.created_at).toLocaleString('uz-UZ') : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {don.status !== 'paid' && (
                          <button
                            onClick={() => handleUpdateStatus(don.order_id, 'paid')}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                            title="To'langan deb belgilash"
                          >
                            Tasdiqlash
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(don.id || don.order_id)}
                          className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                          title="O'chirish"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
