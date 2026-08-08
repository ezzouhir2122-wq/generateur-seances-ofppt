"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { ResourceDetail, TYPE_META } from "@/types/bibliotheque";

interface Props {
  id: string;
  onClose: () => void;
  onChanged: () => void; // pour rafraîchir la liste (likes/suppression)
}

export default function ResourceDetailModal({ id, onClose, onChanged }: Props) {
  const [r, setR] = useState<ResourceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);

  const load = () => {
    fetch(`/api/bibliotheque/${id}`)
      .then((res) => res.json())
      .then((d) => setR(d))
      .catch(() => toast.error("Erreur de chargement"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const toggleLike = async () => {
    if (!r) return;
    const res = await fetch(`/api/bibliotheque/${id}/like`, { method: "POST" });
    if (res.ok) {
      const { liked, likeCount } = await res.json();
      setR({ ...r, likedByMe: liked, likeCount });
      onChanged();
    }
  };

  const addComment = async () => {
    if (!comment.trim() || !r) return;
    setPosting(true);
    const res = await fetch(`/api/bibliotheque/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenu: comment }),
    });
    if (res.ok) {
      const c = await res.json();
      setR({ ...r, comments: [c, ...r.comments], commentCount: r.commentCount + 1 });
      setComment("");
      onChanged();
    } else {
      toast.error("Erreur");
    }
    setPosting(false);
  };

  const remove = async () => {
    if (!confirm("Supprimer définitivement cette ressource ?")) return;
    const res = await fetch(`/api/bibliotheque/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Ressource supprimée");
      onChanged();
      onClose();
    } else {
      toast.error("Suppression impossible");
    }
  };

  const meta = r ? TYPE_META[r.type] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading || !r || !meta ? (
          <div className="p-10 text-center text-sm" style={{ color: "#9CA3AF" }}>Chargement…</div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-4 shrink-0" style={{ borderBottom: "1px solid #E2E8F0" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full mb-2"
                    style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}>
                    <span>{meta.icon}</span> {meta.label}
                  </span>
                  <h2 className="font-bold leading-snug" style={{ color: "#111827" }}>{r.titre}</h2>
                  <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>
                    Par {r.authorName}
                    {r.filiere ? ` · ${r.filiere}` : ""}{r.module ? ` · ${r.module}` : ""}
                  </p>
                </div>
                <button onClick={onClose} className="text-xl leading-none shrink-0" style={{ color: "#9CA3AF" }}>✕</button>
              </div>
            </div>

            {/* Corps */}
            <div className="px-5 py-4 overflow-y-auto space-y-4">
              {r.description && <p className="text-sm" style={{ color: "#4B5563" }}>{r.description}</p>}

              {r.type === "FICHIER" ? (
                <a
                  href={r.fileUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: "#0A4DA810", color: "#0A4DA8", border: "1px solid #0A4DA840" }}
                >
                  📎 Télécharger {r.fileName ?? "le fichier"}
                  {r.fileSize ? <span style={{ color: "#9CA3AF" }}>· {(r.fileSize / 1024).toFixed(0)} Ko</span> : null}
                </a>
              ) : r.contenu ? (
                <div className="prose-ofppt text-sm rounded-xl p-4" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                  <ReactMarkdown>{r.contenu}</ReactMarkdown>
                </div>
              ) : null}

              {/* Barre actions */}
              <div className="flex items-center gap-4 pt-1">
                <button
                  onClick={toggleLike}
                  className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                  style={{ color: r.likedByMe ? "#E8651A" : "#6B7280" }}
                >
                  <span>{r.likedByMe ? "❤" : "🤍"}</span> {r.likeCount} J&apos;aime
                </button>
                <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "#6B7280" }}>
                  💬 {r.commentCount} commentaire{r.commentCount > 1 ? "s" : ""}
                </span>
                {r.isMine && (
                  <button
                    onClick={remove}
                    className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#EF4444"; (e.currentTarget as HTMLButtonElement).style.color = "#FFFFFF"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#FEF2F2"; (e.currentTarget as HTMLButtonElement).style.color = "#EF4444"; }}
                  >
                    🗑 Supprimer
                  </button>
                )}
              </div>

              {/* Commentaires */}
              <div className="space-y-3 pt-2" style={{ borderTop: "1px solid #F3F4F6" }}>
                <div className="flex gap-2 pt-3">
                  <input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addComment(); }}
                    placeholder="Ajouter un commentaire…"
                    className="flex-1"
                    style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#111827", borderRadius: "10px", padding: "9px 12px", fontSize: "13px", outline: "none" }}
                  />
                  <button
                    onClick={addComment}
                    disabled={posting || !comment.trim()}
                    className="px-4 text-sm font-medium rounded-xl disabled:opacity-50"
                    style={{ background: "#0A4DA8", color: "#FFFFFF" }}
                  >
                    Envoyer
                  </button>
                </div>

                {r.comments.length === 0 ? (
                  <p className="text-xs text-center py-3" style={{ color: "#9CA3AF" }}>Aucun commentaire pour l&apos;instant.</p>
                ) : (
                  r.comments.map((c) => (
                    <div key={c.id} className="rounded-xl px-3 py-2" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold" style={{ color: "#111827" }}>{c.authorName}{c.isMine ? " (moi)" : ""}</span>
                        <span className="text-[10px]" style={{ color: "#9CA3AF" }}>
                          {new Date(c.createdAt).toLocaleDateString("fr-MA", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: "#4B5563" }}>{c.contenu}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
