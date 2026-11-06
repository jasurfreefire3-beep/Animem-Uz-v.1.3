import React, { useState } from "react";
import { X, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

interface ReelReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reelId: string;
}

const REPORT_REASONS = [
  "Spam yoki reklama",
  "Nomaqbul yoki behayo mazmun",
  "Zo'ravonlik yoki xavfli xatti-harakatlar",
  "Mualliflik huquqi buzilishi",
  "Haqorat yoki nafrat uyg'otuvchi so'zlar",
  "Boshqa sabab",
];

export const ReelReportModal: React.FC<ReelReportModalProps> = ({
  isOpen,
  onClose,
  reelId,
}) => {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const fullReason = details.trim()
        ? `${selectedReason}: ${details.trim()}`
        : selectedReason;

      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/reels/${reelId}/report`, {
        method: "POST",
        headers,
        body: JSON.stringify({ reason: fullReason }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setDetails("");
          onClose();
        }, 1800);
      } else {
        const err = await res.json();
        alert(err.error || "Shikoyat yuborishda xatolik yuz berdi");
      }
    } catch (err) {
      console.error("Report submit error:", err);
      alert("Tarmoq xatosi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-in zoom-in" />
            <h3 className="text-lg font-bold text-white">Shikoyat qabul qilindi</h3>
            <p className="text-sm text-zinc-400 max-w-xs">
              Murojaatingiz uchun rahmat. Adminlar ushbu videoni tez orada ko'rib chiqadi.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2.5 text-amber-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="text-lg font-bold text-white">Shikoyat qilish</h3>
            </div>
            <p className="text-xs text-zinc-400">
              Ushbu reelda qanday qoidabuzarlikni sezdingiz?
            </p>

            <div className="space-y-2 mt-3 max-h-56 overflow-y-auto pr-1">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-sm cursor-pointer transition ${
                    selectedReason === r
                      ? "border-red-500/60 bg-red-500/10 text-white font-medium"
                      : "border-zinc-800 bg-zinc-800/40 text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="report_reason"
                    checked={selectedReason === r}
                    onChange={() => setSelectedReason(r)}
                    className="accent-red-500 w-4 h-4"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>

            <div className="space-y-1.5 mt-2">
              <label className="text-xs text-zinc-400 font-medium">
                Qo'shimcha izoh (ixtiyoriy)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Vaziyatni qisqacha tushuntiring..."
                rows={2}
                className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition resize-none"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 active:scale-95 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Yuborish"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
