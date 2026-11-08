import React, { useState, useEffect } from 'react';
import {
  Mic,
  Plus,
  Edit2,
  Trash2,
  Users,
  Film,
  ExternalLink,
  Send,
  Instagram,
  Globe,
  Loader2,
  RefreshCw,
  Search,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Fandub } from '../types';
import ImageUploader from './ImageUploader';

export const AdminFandubs: React.FC = () => {
  const [fandubs, setFandubs] = useState<Fandub[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    avatar_url: '',
    banner_url: '',
    telegram_url: '',
    instagram_url: '',
    website_url: ''
  });

  const getAdminHeaders = (extra: Record<string, string> = {}) => {
    const token = localStorage.getItem('token') || '';
    const adminPasscode = sessionStorage.getItem('animem_admin_passcode') || '';
    const adminUsername = sessionStorage.getItem('animem_admin_username') || '';
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(adminPasscode ? { 'x-admin-passcode': adminPasscode } : {}),
      ...(adminUsername ? { 'x-admin-username': adminUsername } : {}),
      ...extra
    };
  };

  const fetchFandubs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fandubs?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setFandubs(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      console.error('Failed to fetch fandubs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFandubs();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      avatar_url: '',
      banner_url: '',
      telegram_url: '',
      instagram_url: '',
      website_url: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (f: Fandub) => {
    setEditingId(f.id);
    setFormData({
      name: f.name || '',
      slug: f.slug || '',
      description: f.description || '',
      avatar_url: f.avatar_url || '',
      banner_url: f.banner_url || '',
      telegram_url: f.telegram_url || '',
      instagram_url: f.instagram_url || '',
      website_url: f.website_url || ''
    });
    setIsModalOpen(true);
  };

  const handleNameChange = (newName: string) => {
    const slug = newName
      .toLowerCase()
      .trim()
      .replace(/o['’`‘ʻʼ]/g, 'o')
      .replace(/g['’`‘ʻʼ]/g, 'g')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    setFormData(prev => ({
      ...prev,
      name: newName,
      slug: editingId ? prev.slug : slug
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Fandub nomi kiritilishi shart!' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const url = editingId ? `/api/admin/fandubs/${editingId}` : '/api/admin/fandubs';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAdminHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(formData)
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Amaliyot bajarilmadi');
      }

      setMessage({
        type: 'success',
        text: editingId ? "Fandub muvaffaqiyatli yangilandi!" : "Yangi fandub jamoasi qo'shildi!"
      });
      setIsModalOpen(false);
      fetchFandubs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Xatolik yuz berdi' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string | number, name: string) => {
    if (!window.confirm(`Haqiqatan ham "${name}" fandub jamoasini o'chirmoqchimisiz?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/fandubs/${id}`, {
        method: 'DELETE',
        headers: getAdminHeaders()
      });

      if (res.ok) {
        setMessage({ type: 'success', text: "Fandub jamoasi o'chirildi!" });
        setFandubs(prev => prev.filter(f => String(f.id) !== String(id)));
      } else {
        const data = await res.json();
        throw new Error(data.error || "O'chirishda xatolik");
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || "O'chirishda xatolik yuz berdi" });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredFandubs = fandubs.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900/30 via-pink-900/20 to-[#ff006a]/20 border border-white/10 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#ff006a] to-[#a855f7] flex items-center justify-center text-white shadow-[0_0_25px_rgba(255,0,106,0.5)] shrink-0">
            <Mic size={28} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
              Fandub Jamoalari
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 font-mono font-bold">
                {fandubs.length} ta
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-white/60 mt-0.5">
              Saytdagi anime ovozlashtirish va tarjima jamoalarini boshqarish
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={fetchFandubs}
            className="p-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-white/80 hover:text-white transition-all active:scale-95 cursor-pointer"
            title="Yangilash"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#ff006a] to-[#a855f7] hover:brightness-110 text-white font-bold text-sm shadow-[0_4px_20px_rgba(255,0,106,0.4)] transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={18} />
            <span>Yangi Fandub Qo'shish</span>
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {message && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-sm font-semibold transition-all ${
            message.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-white/60 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
        <input
          type="text"
          placeholder="Fandub nomini qidirish..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/[0.05] border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#ff006a] focus:bg-white/[0.08] transition-all"
        />
      </div>

      {/* Fandubs Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-white/50">
          <Loader2 size={32} className="animate-spin text-[#ff006a]" />
          <span className="ml-3 font-semibold text-sm">Fandublar yuklanmoqda...</span>
        </div>
      ) : filteredFandubs.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-white/[0.03] border border-white/5 backdrop-blur-xl">
          <Mic size={48} className="mx-auto text-white/20 mb-3" />
          <h3 className="text-base font-bold text-white/80 mb-1">Fandub jamoalari topilmadi</h3>
          <p className="text-xs text-white/50 max-w-sm mx-auto mb-4">
            {searchQuery ? "Qidiruv bo'yicha hech qanday natija chiqmadi" : "Hozircha hech qanday fandub jamoasi qo'shilmagan"}
          </p>
          {!searchQuery && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff006a] hover:bg-[#ff006a]/90 text-white text-xs font-bold transition-all"
            >
              <Plus size={16} /> Fandub qo'shish
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFandubs.map(fandub => (
            <div
              key={fandub.id}
              className="group relative rounded-3xl bg-[#14151f]/80 border border-white/10 hover:border-purple-500/40 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_12px_40px_rgba(168,85,247,0.15)] flex flex-col"
            >
              {/* Banner */}
              <div className="h-28 w-full relative bg-gradient-to-tr from-purple-900/60 to-pink-900/40 overflow-hidden">
                {fandub.banner_url ? (
                  <img
                    src={fandub.banner_url}
                    alt={fandub.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-30">
                    <Mic size={36} className="text-white" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#14151f] via-transparent to-black/30" />

                {/* Slug Badge */}
                <span className="absolute top-3 right-3 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white/70 border border-white/10">
                  /{fandub.slug}
                </span>
              </div>

              {/* Avatar & Info */}
              <div className="p-5 pt-0 relative flex-1 flex flex-col">
                <div className="flex items-end justify-between -mt-10 mb-3">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl p-1 bg-[#14151f] shadow-xl">
                      {fandub.avatar_url ? (
                        <img
                          src={fandub.avatar_url}
                          alt={fandub.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <div className="w-full h-full rounded-xl bg-gradient-to-tr from-[#ff006a] to-purple-600 flex items-center justify-center text-white font-black text-xl">
                          {fandub.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(fandub)}
                      className="p-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-white/80 hover:text-white border border-white/10 transition-all active:scale-95 cursor-pointer"
                      title="Tahrirlash"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(fandub.id, fandub.name)}
                      disabled={deletingId === fandub.id}
                      className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      title="O'chirish"
                    >
                      {deletingId === fandub.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Team Name */}
                <h3 className="text-lg font-black text-white tracking-wide group-hover:text-purple-300 transition-colors">
                  {fandub.name}
                </h3>

                {/* Description */}
                <p className="text-xs text-white/60 line-clamp-2 mt-1.5 flex-1 min-h-[32px]">
                  {fandub.description || "Tavsif kiritilmagan"}
                </p>

                {/* Stats Counters */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5">
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
                    <Users size={16} className="text-[#ff006a] shrink-0" />
                    <div>
                      <span className="text-[10px] text-white/40 block font-medium">Obunachilar</span>
                      <span className="text-xs font-black text-white">{fandub.subscribers_count || 0}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2">
                    <Film size={16} className="text-purple-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-white/40 block font-medium">Animelar</span>
                      <span className="text-xs font-black text-white">{fandub.animes_count || 0} ta</span>
                    </div>
                  </div>
                </div>

                {/* Social Links */}
                {(fandub.telegram_url || fandub.instagram_url || fandub.website_url) && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                    {fandub.telegram_url && (
                      <a
                        href={fandub.telegram_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 transition-colors text-xs flex items-center gap-1"
                        title="Telegram"
                      >
                        <Send size={12} />
                      </a>
                    )}
                    {fandub.instagram_url && (
                      <a
                        href={fandub.instagram_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 transition-colors text-xs flex items-center gap-1"
                        title="Instagram"
                      >
                        <Instagram size={12} />
                      </a>
                    )}
                    {fandub.website_url && (
                      <a
                        href={fandub.website_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors text-xs flex items-center gap-1"
                        title="Veb-sayt"
                      >
                        <Globe size={12} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#14151f] border border-white/15 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.9)] p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ff006a] to-[#a855f7] flex items-center justify-center text-white">
                  <Mic size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {editingId ? "Fandub jamoasini tahrirlash" : "Yangi fandub jamoasi qo'shish"}
                  </h3>
                  <p className="text-xs text-white/50">Fandub profili va tarmoq ma'lumotlarini kiriting</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
                    Fandub Nomi <span className="text-[#ff006a]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => handleNameChange(e.target.value)}
                    placeholder="Masalan: Animavka, AnimeUz Dub"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm focus:outline-none focus:border-[#ff006a] focus:bg-white/[0.08] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
                    Slug (URL manzili)
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={e => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="animavka"
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-[#ff006a] focus:bg-white/[0.08] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
                  Tavsif / Jamoa haqida
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Fandub guruhi, tajribasi, a'zolari yoki faoliyati haqida qisqacha ma'lumot..."
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm focus:outline-none focus:border-[#ff006a] focus:bg-white/[0.08] transition-all resize-none"
                />
              </div>

              {/* Avatar Uploader */}
              <div>
                <ImageUploader
                  label="Avatar / Logo (Qurilmadan yuklang yoki URL kiriting)"
                  value={formData.avatar_url}
                  onChange={url => setFormData({ ...formData, avatar_url: url })}
                  aspectRatio="square"
                  placeholder="https://... yoki fayl tanlang"
                  helpText="Kvadrat shakldagi yuqori sifatli rasm (PNG, JPG, WebP)."
                />
              </div>

              {/* Banner Uploader */}
              <div>
                <ImageUploader
                  label="Keng Banner (Qurilmadan yuklang yoki URL kiriting)"
                  value={formData.banner_url}
                  onChange={url => setFormData({ ...formData, banner_url: url })}
                  aspectRatio="banner"
                  placeholder="https://... yoki fayl tanlang"
                  helpText="Profilning yuqori qismida ko'rinuvchi keng fon rasmi (16:9 yoki 3:1 tavsiya etiladi)."
                />
              </div>

              {/* Social Fields */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider">Ijtimoiy Tarmoqlar</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-white/60 mb-1 flex items-center gap-1">
                      <Send size={12} className="text-sky-400" /> Telegram havola
                    </label>
                    <input
                      type="url"
                      value={formData.telegram_url}
                      onChange={e => setFormData({ ...formData, telegram_url: e.target.value })}
                      placeholder="https://t.me/..."
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs focus:outline-none focus:border-sky-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-white/60 mb-1 flex items-center gap-1">
                      <Instagram size={12} className="text-pink-400" /> Instagram havola
                    </label>
                    <input
                      type="url"
                      value={formData.instagram_url}
                      onChange={e => setFormData({ ...formData, instagram_url: e.target.value })}
                      placeholder="https://instagram.com/..."
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs focus:outline-none focus:border-pink-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-white/60 mb-1 flex items-center gap-1">
                      <Globe size={12} className="text-emerald-400" /> Rasmiy sayt
                    </label>
                    <input
                      type="url"
                      value={formData.website_url}
                      onChange={e => setFormData({ ...formData, website_url: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-400 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white/80 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#ff006a] to-[#a855f7] hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-[#ff006a]/30 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Saqlanmoqda...</span>
                    </>
                  ) : (
                    <span>{editingId ? "Saqlash" : "Qo'shish"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
