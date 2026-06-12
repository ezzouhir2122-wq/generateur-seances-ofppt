"use client";

import { ResourceListItem, TYPE_META } from "@/types/bibliotheque";

interface Props {
  resource: ResourceListItem;
  onOpen: () => void;
  onLike: () => void;
}

export default function ResourceCard({ resource: r, onOpen, onLike }: Props) {
  const meta = TYPE_META[r.type];

  return (
    <div
      onClick={onOpen}
      className="card-hover flex flex-col gap-3"
      style={{ cursor: "pointer" }}
    >
      {/* Type + auteur */}
      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}
        >
          <span>{meta.icon}</span> {meta.label}
        </span>
        {r.isMine && (
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#F3F4F6", color: "#6B7280" }}>
            Moi
          </span>
        )}
      </div>

      {/* Titre + description */}
      <div>
        <h3 className="text-sm font-bold leading-snug line-clamp-2" style={{ color: "#111827" }}>{r.titre}</h3>
        {r.description && (
          <p className="text-xs mt-1 line-clamp-2" style={{ color: "#6B7280" }}>{r.description}</p>
        )}
      </div>

      {/* Métadonnées */}
      <div className="flex flex-wrap gap-1.5">
        {r.filiere && (
          <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "#F8FAFC", color: "#6B7280", border: "1px solid #E2E8F0" }}>
            {r.filiere}
          </span>
        )}
        {r.module && (
          <span className="text-[10px] px-2 py-0.5 rounded truncate max-w-[160px]" style={{ background: "#F8FAFC", color: "#6B7280", border: "1px solid #E2E8F0" }} title={r.module}>
            {r.module}
          </span>
        )}
      </div>

      {/* Pied : auteur + likes + commentaires */}
      <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: "1px solid #F3F4F6" }}>
        <span className="text-[11px] truncate max-w-[120px]" style={{ color: "#9CA3AF" }}>
          {r.authorName}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onLike(); }}
            className="inline-flex items-center gap-1 text-xs transition-colors"
            style={{ color: r.likedByMe ? "#E8651A" : "#9CA3AF" }}
            aria-label="J'aime"
          >
            <span>{r.likedByMe ? "❤" : "🤍"}</span> {r.likeCount}
          </button>
          <span className="inline-flex items-center gap-1 text-xs" style={{ color: "#9CA3AF" }}>
            💬 {r.commentCount}
          </span>
        </div>
      </div>
    </div>
  );
}
