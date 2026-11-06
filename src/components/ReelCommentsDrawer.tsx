import React, { useState, useEffect, useRef } from "react";
import { X, Send, Trash2, MessageCircle, Loader2 } from "lucide-react";
import { ReelComment } from "../types";

interface ReelCommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  reelId: string;
  currentUser: any;
  onCommentCountChange?: (newCount: number) => void;
}

export const ReelCommentsDrawer: React.FC<ReelCommentsDrawerProps> = ({
  isOpen,
  onClose,
  reelId,
  currentUser,
  onCommentCountChange,
}) => {
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && reelId) {
      loadComments();
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, reelId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reels/${reelId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        if (onCommentCountChange && data.comments) {
          onCommentCountChange(data.comments.length);
        }
      }
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitting) return;

    if (!currentUser) {
      alert("Izoh qoldirish uchun tizimga kiring!");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/reels/${reelId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment: trimmed }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.comment) {
          setComments((prev) => {
            const updated = [...prev, data.comment];
            if (onCommentCountChange) onCommentCountChange(updated.length);
            return updated;
          });
          setText("");
          setTimeout(() => {
            commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
      } else {
        const err = await res.json();
        alert(err.error || "Izoh yuborishda xatolik yuz berdi");
      }
    } catch (err) {
      console.error("Error sending comment:", err);
      alert("Tarmoq xatosi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string | number) => {
    if (!confirm("Haqiqatan ham bu izohni o'chirmoqchimisiz?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/reels/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setComments((prev) => {
          const updated = prev.filter((c) => String(c.id) !== String(commentId));
          if (onCommentCountChange) onCommentCountChange(updated.length);
          return updated;
        });
      }
    } catch (err) {
      console.error("Delete comment error:", err);
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      const diff = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diff < 60) return "Hozirgina";
      if (diff < 3600) return `${Math.floor(diff / 60)} daq.`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} soat`;
      return `${Math.floor(diff / 86400)} kun`;
    } catch {
      return "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex justify-center items-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-zinc-950/95 border-t border-zinc-800 rounded-t-3xl shadow-2xl flex flex-col max-h-[75vh] h-[65vh] animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-850">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-indigo-400" />
            <h3 className="text-white font-bold text-base">
              Izohlar ({comments.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-zinc-500">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <p className="text-xs">Izohlar yuklanmoqda...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-zinc-500 gap-2">
              <MessageCircle className="w-12 h-12 opacity-30 stroke-1" />
              <p className="text-sm font-medium">Hozircha hech qanday izoh yo'q</p>
              <p className="text-xs text-zinc-600">Birinchi bo'lib fikr bildiring!</p>
            </div>
          ) : (
            comments.map((c) => {
              const isOwner = currentUser && String(currentUser.id) === String(c.user_id);
              const isAdmin = currentUser && currentUser.role === "admin";
              return (
                <div key={c.id} className="flex gap-3 items-start group">
                  <img
                    src={c.user_avatar || "https://image.animem.uz/logo.png"}
                    alt={c.user_name}
                    className="w-9 h-9 rounded-full object-cover border border-zinc-700/60 flex-shrink-0"
                    onError={(e: any) => {
                      e.target.src = "https://image.animem.uz/logo.png";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-200 truncate">
                        {c.user_name || "Foydalanuvchi"}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {formatTime(c.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300 break-words mt-0.5 leading-relaxed">
                      {c.comment}
                    </p>
                  </div>
                  {(isOwner || isAdmin) && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-500 hover:text-red-400 rounded transition"
                      title="O'chirish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Input area */}
        <form
          onSubmit={handleSend}
          className="p-3 border-t border-zinc-800 bg-zinc-900/90 flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              currentUser
                ? "Fikringizni qoldiring..."
                : "Izoh yozish uchun kiring..."
            }
            disabled={!currentUser || submitting}
            className="flex-1 bg-zinc-800/80 text-white placeholder-zinc-500 text-sm px-4 py-2.5 rounded-full border border-zinc-700/60 focus:outline-none focus:border-indigo-500 transition"
          />
          <button
            type="submit"
            disabled={!text.trim() || submitting || !currentUser}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-full transition shadow-lg shadow-indigo-600/30 flex items-center justify-center flex-shrink-0"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
