import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Plus, Trash2, Edit2, Check, X, 
  ExternalLink, RefreshCw, Key, Image as ImageIcon,
  DollarSign, Eye, EyeOff, ShieldCheck, Clock, User
} from 'lucide-react';
import ImageUploader from './ImageUploader';
import { ShopItem, ShopOrder } from '../types';

export default function AdminShop() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'items' | 'orders' | 'settings'>('items');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'avatar' | 'frame' | 'banner'>('all');

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'avatar' as 'avatar' | 'frame' | 'banner',
    image_url: '',
    price: 5000,
    is_active: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // TezCheck settings state
  const [tezSettings, setTezSettings] = useState({
    cash_desk_code: 'cdk_qCkJey9k5E3cM9UtyQBsY1nQvq9K',
    api_token: '',
    has_api_token: false
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/shop/items', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/shop/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/shop/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTezSettings(prev => ({
          ...prev,
          cash_desk_code: data.cash_desk_code || 'cdk_qCkJey9k5E3cM9UtyQBsY1nQvq9K',
          has_api_token: data.has_api_token
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchItems(), fetchOrders(), fetchSettings()]).finally(() => {
      setLoading(false);
    });
  }, []);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      category: 'avatar',
      image_url: '',
      price: 5000,
      is_active: true
    });
    setShowModal(true);
    setMsg({ type: '', text: '' });
  };

  const openEditModal = (item: ShopItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      category: item.category,
      image_url: item.image_url,
      price: item.price,
      is_active: Boolean(item.is_active)
    });
    setShowModal(true);
    setMsg({ type: '', text: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setMsg({ type: 'error', text: "Mahsulot nomini kiriting!" });
      return;
    }
    if (!formData.image_url.trim()) {
      setMsg({ type: 'error', text: "Rasm yuklang yoki havolasini kiriting!" });
      return;
    }

    setSubmitting(true);
    setMsg({ type: '', text: '' });

    try {
      const token = localStorage.getItem('token');
      const url = editingItem ? `/api/admin/shop/items/${editingItem.id}` : '/api/admin/shop/items';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Xatolik yuz berdi");
      }

      setMsg({ type: 'success', text: editingItem ? "Mahsulot yangilandi!" : "Mahsulot qo'shildi!" });
      fetchItems();
      setTimeout(() => setShowModal(false), 900);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || "Xatolik yuz berdi" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!window.confirm("Haqiqatan ham bu mahsulotni o'chirmoqchimisiz?")) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/shop/items/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setItems(prev => prev.filter(i => String(i.id) !== String(id)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (item: ShopItem) => {
    try {
      const token = localStorage.getItem('token');
      const updatedActive = !item.is_active;
      const res = await fetch(`/api/admin/shop/items/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: updatedActive })
      });
      if (res.ok) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: updatedActive } : i));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/shop/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cash_desk_code: tezSettings.cash_desk_code,
          api_token: tezSettings.api_token
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert("TezCheck sozlamalari muvaffaqiyatli saqlandi!");
        fetchSettings();
      } else {
        alert(data.error || "Xatolik");
      }
    } catch (e: any) {
      alert("Xatolik: " + e.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (categoryFilter === 'all') return true;
    return item.category === categoryFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#111116] border border-white/10 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#ff006a]/15 text-[#ff006a] border border-[#ff006a]/30 flex items-center justify-center">
            <ShoppingBag size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider">Do'kon Boshqaruvi</h2>
            <p className="text-xs text-white/50">Avatarkalar, neon ramkalar va profil muqovalarini boshqarish</p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 bg-[#08080c] p-1 rounded-lg border border-white/10 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('items')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${activeSubTab === 'items' ? 'bg-[#ff006a] text-white shadow-lg shadow-[#ff006a]/30' : 'text-white/60 hover:text-white'}`}
          >
            Tovarlar ({items.length})
          </button>
          <button
            onClick={() => setActiveSubTab('orders')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${activeSubTab === 'orders' ? 'bg-[#ff006a] text-white shadow-lg shadow-[#ff006a]/30' : 'text-white/60 hover:text-white'}`}
          >
            Buyurtmalar ({orders.length})
          </button>
          <button
            onClick={() => setActiveSubTab('settings')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${activeSubTab === 'settings' ? 'bg-[#ff006a] text-white shadow-lg shadow-[#ff006a]/30' : 'text-white/60 hover:text-white'}`}
          >
            TezCheck Sozlamalari
          </button>
        </div>
      </div>

      {/* ITEMS SUBTAB */}
      {activeSubTab === 'items' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Category filter */}
            <div className="flex items-center gap-1.5 bg-[#111116] p-1 rounded-lg border border-white/10 text-xs">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 rounded cursor-pointer ${categoryFilter === 'all' ? 'bg-white/20 text-white font-bold' : 'text-white/60'}`}
              >
                Barchasi
              </button>
              <button
                onClick={() => setCategoryFilter('avatar')}
                className={`px-2.5 py-1 rounded cursor-pointer ${categoryFilter === 'avatar' ? 'bg-[#ff006a] text-white font-bold' : 'text-white/60'}`}
              >
                Avatarkalar
              </button>
              <button
                onClick={() => setCategoryFilter('frame')}
                className={`px-2.5 py-1 rounded cursor-pointer ${categoryFilter === 'frame' ? 'bg-[#00f0ff] text-black font-bold' : 'text-white/60'}`}
              >
                Ramkalar
              </button>
              <button
                onClick={() => setCategoryFilter('banner')}
                className={`px-2.5 py-1 rounded cursor-pointer ${categoryFilter === 'banner' ? 'bg-[#a855f7] text-white font-bold' : 'text-white/60'}`}
              >
                Banerlar
              </button>
            </div>

            <button
              onClick={openAddModal}
              className="flex items-center gap-2 bg-[#ff006a] hover:bg-[#e6005c] text-white font-bold text-xs px-4 py-2 rounded-lg transition-all shadow-lg shadow-[#ff006a]/20 cursor-pointer"
            >
              <Plus size={15} />
              <span>Yangi Tovar Qo'shish</span>
            </button>
          </div>

          {/* Items Grid */}
          {loading ? (
            <div className="py-12 text-center text-white/50 text-sm">Yuklanmoqda...</div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center bg-[#111116] border border-white/10 rounded-xl text-white/40 text-sm">
              Tovar topilmadi. "Yangi Tovar Qo'shish" tugmasi orqali tovar kiriting.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map(item => (
                <div 
                  key={item.id} 
                  className={`bg-[#111116] border rounded-xl overflow-hidden flex flex-col justify-between transition-all ${item.is_active ? 'border-white/10 hover:border-white/20' : 'border-red-500/20 opacity-60'}`}
                >
                  <div className="p-3">
                    {/* Preview Box */}
                    <div className="relative w-full h-36 bg-[#08080c] rounded-lg overflow-hidden flex items-center justify-center border border-white/5 mb-3">
                      {item.category === 'frame' ? (
                        <div className="relative w-20 h-20 flex items-center justify-center">
                          <img 
                            src="https://files.catbox.moe/54s3e2.jpg" 
                            alt="Mock Avatar" 
                            className="w-16 h-16 rounded-full object-cover"
                          />
                          <img 
                            src={item.image_url} 
                            alt={item.title} 
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]"
                          />
                        </div>
                      ) : item.category === 'avatar' ? (
                        <img 
                          src={item.image_url} 
                          alt={item.title} 
                          className="w-24 h-24 rounded-full object-cover border-2 border-white/20"
                        />
                      ) : (
                        <img 
                          src={item.image_url} 
                          alt={item.title} 
                          className="w-full h-full object-cover"
                        />
                      )}

                      {/* Category Badge */}
                      <span className={`absolute top-2 left-2 text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                        item.category === 'frame' ? 'bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40' :
                        item.category === 'avatar' ? 'bg-[#ff006a]/20 text-[#ff006a] border border-[#ff006a]/40' :
                        'bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/40'
                      }`}>
                        {item.category === 'frame' ? 'Ramka' : item.category === 'avatar' ? 'Avatarka' : 'Baner'}
                      </span>

                      {/* Active Status */}
                      <span className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded ${item.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {item.is_active ? 'Faol' : 'Nofaol'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white line-clamp-1">{item.title}</h4>
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className="text-white/40">Narxi:</span>
                      <span className="font-black text-[#00f0ff]">{Number(item.price).toLocaleString()} so'm</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-2 border-t border-white/5 bg-[#0a0a0f] flex items-center justify-between gap-1">
                    <button
                      onClick={() => handleToggleActive(item)}
                      title={item.is_active ? "Nofaol qilish" : "Faollashtirish"}
                      className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
                    >
                      {item.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        title="Tahrirlash"
                        className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        title="O'chirish"
                        className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ORDERS SUBTAB */}
      {activeSubTab === 'orders' && (
        <div className="bg-[#111116] border border-white/10 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase">Xarid Buyurtmalari</h3>
              <p className="text-xs text-white/40">TezCheck orqali amalga oshirilgan barcha to'lovlar jurnali</p>
            </div>
            <button
              onClick={fetchOrders}
              className="flex items-center gap-1 text-xs text-white/60 hover:text-white bg-white/5 px-2.5 py-1 rounded cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Yangilash</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#08080c] text-white/40 uppercase font-mono border-b border-white/5">
                <tr>
                  <th className="p-3">Buyurtma ID</th>
                  <th className="p-3">Foydalanuvchi</th>
                  <th className="p-3">Tovar</th>
                  <th className="p-3">Summa</th>
                  <th className="p-3">Holat</th>
                  <th className="p-3">Vaqt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-white/40">Hozircha buyurtmalar yo'q</td>
                  </tr>
                ) : (
                  orders.map(order => (
                    <tr key={order.id} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-mono text-white/80">{order.id}</td>
                      <td className="p-3">
                        <span className="font-bold text-white block">{order.user_name || `User #${order.user_id}`}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-white font-medium">{order.item_title || `Item #${order.item_id}`}</span>
                      </td>
                      <td className="p-3 font-bold text-[#00f0ff]">
                        {Number(order.amount_uzs).toLocaleString()} so'm
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          order.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          order.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {order.status === 'paid' ? 'To\'langan' : order.status === 'pending' ? 'Kutilmoqda' : 'Bekor'}
                        </span>
                      </td>
                      <td className="p-3 text-white/40 font-mono">
                        {order.created_at ? new Date(order.created_at).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SETTINGS SUBTAB */}
      {activeSubTab === 'settings' && (
        <div className="bg-[#111116] border border-white/10 rounded-xl p-6 max-w-2xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
            <div className="w-10 h-10 rounded-lg bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30 flex items-center justify-center">
              <Key size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">TezCheck.uz Integratsiya Sozlamalari</h3>
              <p className="text-xs text-white/40">Kassa kodi va API maxfiy kalitini sozlash</p>
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase mb-1.5">
                Kassa Kodi (X-Cash-Desk-Code)
              </label>
              <input
                type="text"
                value={tezSettings.cash_desk_code}
                onChange={e => setTezSettings({ ...tezSettings, cash_desk_code: e.target.value })}
                placeholder="cdk_..."
                className="w-full bg-[#08080c] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-[#ff006a] outline-none"
                required
              />
              <p className="text-[11px] text-white/40 mt-1">
                TezCheck kabinetingizdagi kassa kodi (masalan: <code className="text-white/60">cdk_qCkJey9k5E3cM9UtyQBsY1nQvq9K</code>).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/70 uppercase mb-1.5">
                Maxfiy API Token (Authorization: Bearer)
              </label>
              <input
                type="password"
                value={tezSettings.api_token}
                onChange={e => setTezSettings({ ...tezSettings, api_token: e.target.value })}
                placeholder="aps_... (agar mavjud bo'lsa)"
                className="w-full bg-[#08080c] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:border-[#ff006a] outline-none"
              />
              <p className="text-[11px] text-white/40 mt-1">
                Agar hisobingizda alohida API token (odatda <code className="text-white/60">aps_...</code>) berilgan bo'lsa kiriting. Kiritilmasa, avtomatik ravishda Kassa kodi qo'llaniladi.
              </p>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={savingSettings}
                className="bg-[#00f0ff] hover:bg-[#00d2ff] text-black font-black text-xs px-6 py-2.5 rounded-lg transition-all shadow-lg shadow-[#00f0ff]/20 cursor-pointer flex items-center gap-2"
              >
                {savingSettings ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                <span>Sozlamalarni Saqlash</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111116] border border-white/15 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0a0a0f]">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                {editingItem ? "Tovarni Tahrirlash" : "Yangi Tovar Qo'shish"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/40 hover:text-white p-1 rounded-md cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {msg.text && (
                <div className={`p-3 rounded-lg text-xs font-bold ${msg.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                  {msg.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-white/70 uppercase mb-1">Nomi</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Masalan: Gojo Limitless Neon Ramkasi"
                  className="w-full bg-[#08080c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#ff006a] outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase mb-1">Kategoriya</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-[#08080c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#ff006a] outline-none"
                  >
                    <option value="avatar">Avatarka (PFP)</option>
                    <option value="frame">Ramka (Avatar Frame)</option>
                    <option value="banner">Profil Baneri (Cover)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase mb-1">Narxi (so'mda)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-[#08080c] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#ff006a] outline-none"
                    required
                  />
                </div>
              </div>

              {/* Image Uploader: Device upload OR URL */}
              <div>
                <ImageUploader
                  label="Mahsulot Rasmi (Qurilmadan yuklang yoki URL kiriting)"
                  value={formData.image_url}
                  onChange={(url) => setFormData({ ...formData, image_url: url })}
                  aspectRatio={formData.category === 'banner' ? 'banner' : formData.category === 'frame' ? 'square' : 'square'}
                  placeholder="https://... yoki fayl tanlang"
                  required
                  helpText={formData.category === 'frame' ? "Ramka uchun shaffof fonli (PNG yoki WebP) kvadrat rasm yuklang." : undefined}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 accent-[#ff006a] cursor-pointer rounded"
                />
                <label htmlFor="is_active" className="text-xs font-bold text-white/80 cursor-pointer">
                  Do'konda faol ko'rinsin (sotuvda)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white/60 hover:text-white bg-white/5 transition-all cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg text-xs font-black text-white bg-[#ff006a] hover:bg-[#e6005c] transition-all shadow-lg shadow-[#ff006a]/30 cursor-pointer"
                >
                  {submitting ? "Saqlanmoqda..." : editingItem ? "O'zgarishlarni Saqlash" : "Tovar Qo'shish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
