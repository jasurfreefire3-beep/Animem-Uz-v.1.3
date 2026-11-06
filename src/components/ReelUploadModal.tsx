import React, { useState, useRef } from "react";
import { X, Upload, Video, Film, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Reel } from "../types";

interface ReelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newReel: Reel) => void;
  currentUser: any;
}

export const ReelUploadModal: React.FC<ReelUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUser,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [animeTitle, setAnimeTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Check size limit: 60MB
    const maxBytes = 60 * 1024 * 1024;
    if (selected.size > maxBytes) {
      setError(`Video hajmi 60 MB dan oshmasligi kerak! (Tanlangan: ${(selected.size / (1024 * 1024)).toFixed(1)} MB)`);
      return;
    }

    if (!selected.type.startsWith("video/")) {
      setError("Faqat video formatdagi fayllarni yuklashingiz mumkin (MP4, WebM, MOV va b.)");
      return;
    }

    setError(null);
    setFile(selected);
    const url = URL.createObjectURL(selected);
    setVideoPreviewUrl(url);
  };

  const resetState = () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setFile(null);
    setVideoPreviewUrl(null);
    setCaption("");
    setAnimeTitle("");
    setProgress(0);
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    if (uploading) {
      if (!confirm("Yuklash jarayoni davom etmoqda. Rostdan ham chiqmoqchimisiz?")) return;
    }
    resetState();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Iltimos, video faylni tanlang");
      return;
    }

    if (!currentUser) {
      setError("Reel yuklash uchun tizimga kirishingiz lozim");
      return;
    }

    setUploading(true);
    setProgress(10);
    setError(null);

    const formData = new FormData();
    formData.append("video", file);
    formData.append("caption", caption.trim());
    if (animeTitle.trim()) {
      formData.append("anime_title", animeTitle.trim());
    }

    const token = localStorage.getItem("token");

    // Use XMLHttpRequest for accurate upload progress tracking
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/reels/upload");
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const percent = Math.round((evt.loaded / evt.total) * 90);
        setProgress(Math.max(10, percent));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          setProgress(100);
          setSuccess(true);
          setTimeout(() => {
            if (res.reel) onSuccess(res.reel);
            resetState();
            onClose();
          }, 1500);
        } catch (e) {
          setError("Javobni qayta ishlashda xatolik");
          setUploading(false);
        }
      } else {
        try {
          const res = JSON.parse(xhr.responseText);
          setError(res.error || "Video yuklashda xatolik yuz berdi");
        } catch {
          setError("Yuklashda xatolik: status " + xhr.status);
        }
        setUploading(false);
      }
    };

    xhr.onerror = () => {
      setError("Tarmoq xatosi. Aloqani tekshiring.");
      setUploading(false);
    };

    xhr.send(formData);
  };

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-pink-500/20 to-indigo-500/20 text-pink-400 border border-pink-500/30">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">
                Yangi Reel yuklash
              </h2>
              <p className="text-xs text-zinc-400">
                Cloudflare R2 yuqori tezlikdagi serverga saqlanadi (60 MB gacha)
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {success ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-in zoom-in" />
              <h3 className="text-xl font-bold text-white">Reel muvaffaqiyatli yuklandi!</h3>
              <p className="text-sm text-zinc-400">
                Videongiz endi Animem Reels oqimida va profilingizda ko'rinadi.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Video upload area / Preview */}
              {!videoPreviewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-700 hover:border-indigo-500/70 bg-zinc-900/60 hover:bg-zinc-900 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="p-4 rounded-2xl bg-zinc-800 text-indigo-400 group-hover:scale-110 transition group-hover:bg-indigo-600 group-hover:text-white">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h4 className="text-white font-semibold mt-3 text-sm">
                    Videoni tanlang yoki shu yerga tashlang
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    MP4, WebM formatlari tavsiya etiladi (Maksimal 60 MB)
                  </p>
                  <span className="mt-3 px-3 py-1 bg-zinc-800 text-zinc-300 text-[11px] rounded-full border border-zinc-700">
                    Qurilmadan yuklash
                  </span>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/14] max-h-72 mx-auto flex items-center justify-center border border-zinc-800">
                  <video
                    src={videoPreviewUrl}
                    controls
                    className="h-full w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
                      setFile(null);
                      setVideoPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-full transition backdrop-blur-md"
                    title="Boshqa video tanlash"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/70 rounded-md text-[11px] text-zinc-300 backdrop-blur-md">
                    {file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : ""}
                  </div>
                </div>
              )}

              {/* Caption */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex justify-between">
                  <span>Tavsif (Caption)</span>
                  <span className="text-zinc-500 font-normal">
                    {caption.length}/300
                  </span>
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value.slice(0, 300))}
                  placeholder="Reelingiz haqida qisqacha yozing yoki heshteglar qo'shing (#anime #amv #naruto)..."
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition resize-none"
                />
              </div>

              {/* Related anime title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Tegishli anime nomi (ixtiyoriy)
                </label>
                <input
                  type="text"
                  value={animeTitle}
                  onChange={(e) => setAnimeTitle(e.target.value)}
                  placeholder="Masalan: Naruto, Attack on Titan, Jujutsu Kaisen..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                />
                <p className="text-[11px] text-zinc-500">
                  Tomoshabinlar ushbu animeni tez topishi uchun yordam beradi
                </p>
              </div>

              {/* Progress Bar */}
              {uploading && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-zinc-300">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                      {progress < 90 ? "Cloudflare R2 ga yuklanmoqda..." : "Videoni saqlash..."}
                    </span>
                    <span className="font-bold text-indigo-400">{progress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={uploading}
                  className="flex-1 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-sm font-medium transition"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={!file || uploading}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 active:scale-95 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Yuklanmoqda...</span>
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      <span>Reelni chiqarish</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
