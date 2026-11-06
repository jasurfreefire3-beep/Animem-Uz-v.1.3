import React, { useState, useEffect } from "react";
import {
  Film,
  AlertTriangle,
  Trash2,
  CheckCircle,
  Eye,
  RefreshCw,
  Loader2,
  ExternalLink,
  Play,
  Heart,
  MessageCircle,
} from "lucide-react";
import { Reel } from "../types";

interface ReelReportItem {
  id: string | number;
  reel_id: string;
  reporter_id: string | number;
  reporter_name: string;
  reason: string;
  status: string;
  created_at: string;
  caption?: string;
  video_url?: string;
  reel_author?: string;
  anime_title?: string;
}

export const AdminReels: React.FC = () => {
  const [subTab, setSubTab] = useState<"reports" | "all_reels">("reports");
  const [reports, setReports] = useState<ReelReportItem[]>([]);
  const [allReels, setAllReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [subTab]);

  const loadData = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      if (subTab === "reports") {
        const res = await fetch("/api/admin/reel-reports", { headers });
        if (res.ok) {
          const data = await res.json();
          setReports(data.reports || []);
        }
      } else {
        const res = await fetch("/api/reels?limit=50", { headers });
        if (res.ok) {
          const data = await res.json();
          setAllReels(data.reels || []);
        }
      }
    } catch (err) {
      console.error("Admin reels load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    if (!confirm("Haqiqatan ham bu reelni butunlay o'chirmoqchimisiz? Cloudflare R2 dagi video ham o'chiriladi!")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/reels/${reelId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        alert("Reel muvaffaqiyatli o'chirildi!");
        // Update local state
        setReports((prev) => prev.filter((r) => r.reel_id !== reelId));
        setAllReels((prev) => prev.filter((r) => r.id !== reelId));
      } else {
        const err = await res.json();
        alert(err.error || "O'chirishda xatolik");
      }
    } catch (err) {
      alert("Tarmoq xatosi");
    }
  };

  const handleDismissReport = async (reportId: string | number) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/admin/reel-reports/${reportId}/dismiss`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId ? { ...r, status: "dismissed" } : r
          )
        );
      }
    } catch (err) {
      alert("Xatolik yuz berdi");
    }
  };

  const pendingReports = reports.filter((r) => r.status === "pending");

  return (
    <div className="space-y-6">
      {/* Top Bar with Subtabs & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab("reports")}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 ${
              subTab === "reports"
                ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Shikoyatlar</span>
            {pendingReports.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-white text-red-600 text-[10px] font-black">
                {pendingReports.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab("all_reels")}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 ${
              subTab === "all_reels"
                ? "bg-[#ff006a] text-white shadow-lg shadow-[#ff006a]/30"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Barcha Reels</span>
          </button>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition disabled:opacity-50"
          title="Yangilash"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Video Preview Modal */}
      {previewVideoUrl && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setPreviewVideoUrl(null)}
        >
          <div
            className="relative max-w-sm w-full bg-black rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={previewVideoUrl}
              controls
              autoPlay
              className="w-full max-h-[80vh] object-contain"
            />
            <button
              onClick={() => setPreviewVideoUrl(null)}
              className="absolute top-3 right-3 px-3 py-1 bg-black/70 hover:bg-black text-white rounded-full text-xs font-bold backdrop-blur-md"
            >
              Yopish
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
          <p className="text-sm font-medium">Reels ma'lumotlari yuklanmoqda...</p>
        </div>
      ) : subTab === "reports" ? (
        /* REPORTS TAB */
        reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3 text-center p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <CheckCircle className="w-12 h-12 text-emerald-500/50" />
            <h4 className="text-white font-bold text-base">Hech qanday shikoyat yo'q</h4>
            <p className="text-xs text-zinc-400">Barcha Reels videolari tekshirilgan va qoidabuzarliklar yo'q.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((rep) => {
              const isPending = rep.status === "pending";
              return (
                <div
                  key={rep.id}
                  className={`p-5 rounded-2xl border transition flex flex-col justify-between ${
                    isPending
                      ? "bg-zinc-900 border-red-500/40 shadow-lg shadow-red-500/5"
                      : "bg-zinc-900/50 border-zinc-800 opacity-70"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isPending
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {isPending ? "Ko'rib chiqilmoqda" : "Rad etilgan"}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {new Date(rep.created_at).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-400 font-mono">
                        ID: {rep.reel_id}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-850 space-y-1">
                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">
                        Shikoyat sababi:
                      </span>
                      <p className="text-sm font-semibold text-white">
                        {rep.reason}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        Yuboruvchi: <span className="text-zinc-200">{rep.reporter_name}</span>
                      </p>
                    </div>

                    {rep.caption && (
                      <p className="text-xs text-zinc-300 italic line-clamp-2">
                        "{rep.caption}"
                      </p>
                    )}

                    <div className="text-xs text-zinc-400">
                      Muallif: <span className="text-white font-medium">{rep.reel_author || "Noma'lum"}</span>
                      {rep.anime_title && (
                        <span className="ml-2 text-indigo-400">({rep.anime_title})</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 mt-3 border-t border-zinc-800">
                    {rep.video_url && (
                      <button
                        onClick={() => setPreviewVideoUrl(rep.video_url || null)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Videoni ko'rish</span>
                      </button>
                    )}

                    <a
                      href={`/reels/${rep.reel_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                      title="Yangi oynada ochish"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <div className="flex-1" />

                    {isPending && (
                      <button
                        onClick={() => handleDismissReport(rep.id)}
                        className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition"
                      >
                        Rad etish
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteReel(rep.reel_id)}
                      className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reelni o'chirish</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ALL REELS TAB */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {allReels.map((reel) => (
            <div
              key={reel.id}
              className="group relative aspect-[9/15] rounded-2xl overflow-hidden bg-black border border-zinc-800 hover:border-pink-500/60 shadow-lg flex flex-col justify-between p-3"
            >
              <video
                src={reel.video_url}
                preload="metadata"
                muted
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

              {/* Top Bar */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] text-zinc-300 font-semibold flex items-center gap-1">
                  <Play className="w-2.5 h-2.5 fill-current" /> {reel.views_count || 0}
                </span>

                <button
                  onClick={() => handleDeleteReel(reel.id)}
                  className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-md transition shadow"
                  title="O'chirish"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Center Play button */}
              <button
                onClick={() => setPreviewVideoUrl(reel.video_url)}
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-10"
              >
                <div className="p-3 rounded-full bg-pink-600/80 backdrop-blur-md text-white shadow-xl">
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                </div>
              </button>

              {/* Bottom Info */}
              <div className="relative z-10 space-y-1">
                <p className="text-white text-xs font-semibold truncate">
                  @{reel.user_name}
                </p>
                {reel.caption && (
                  <p className="text-[11px] text-zinc-300 line-clamp-1 leading-tight">
                    {reel.caption}
                  </p>
                )}
                <div className="flex items-center gap-2 text-[10px] text-zinc-400 pt-0.5">
                  <span className="flex items-center gap-0.5 text-red-400">
                    <Heart className="w-2.5 h-2.5 fill-current" /> {reel.likes_count || 0}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <MessageCircle className="w-2.5 h-2.5" /> {reel.comments_count || 0}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
