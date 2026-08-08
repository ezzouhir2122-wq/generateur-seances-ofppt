"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  contenu: string;
  isStreaming?: boolean;
  onExportPDF: () => void;
  onExportWord: () => void;
  onExportPPT: () => void;
  onReset: () => void;
  onEdit?: (newContenu: string) => void;
}

export default function SeanceResult({ contenu, isStreaming, onExportPDF, onExportWord, onExportPPT, onReset, onEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEdit = () => { setDraft(contenu); setEditing(true); };
  const saveEdit = () => { onEdit?.(draft); setEditing(false); };
  const cancelEdit = () => setEditing(false);

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between pb-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold" style={{ color: "#0A4DA8" }}>Séance générée</h2>
          {isStreaming && (
            <span
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: "#0A4DA810", color: "#0A4DA8" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#0A4DA8] animate-pulse inline-block" />
              En cours…
            </span>
          )}
        </div>
        {!isStreaming && (
          <div className="flex gap-2 flex-wrap">
            {!editing && onEdit && (
              <button
                onClick={startEdit}
                className="px-3 py-1.5 text-xs rounded-lg transition-colors font-medium"
                style={{ border: "1px solid #16A34A40", color: "#16A34A", background: "#16A34A10" }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "#16A34A20")}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "#16A34A10")}
              >
                ✏️ Modifier
              </button>
            )}
            {editing ? (
              <>
                <button
                  onClick={saveEdit}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium"
                  style={{ background: "#16A34A", color: "#FFFFFF" }}
                >
                  ✓ Terminé
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-3 py-1.5 text-xs rounded-lg"
                  style={{ border: "1px solid #E2E8F0", color: "#9CA3AF" }}
                >
                  Annuler
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onExportPDF}
                  className="px-3 py-1.5 text-xs rounded-lg transition-colors font-medium"
                  style={{ border: "1px solid #0A4DA840", color: "#0A4DA8", background: "#0A4DA810" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "#0A4DA820")}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "#0A4DA810")}
                >
                  PDF
                </button>
                <button
                  onClick={onExportWord}
                  className="px-3 py-1.5 text-xs rounded-lg transition-colors font-medium"
                  style={{ border: "1px solid #3B82F640", color: "#3B82F6", background: "#3B82F610" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "#3B82F620")}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "#3B82F610")}
                >
                  Word
                </button>
                <button
                  onClick={onExportPPT}
                  className="px-3 py-1.5 text-xs rounded-lg transition-colors font-medium"
                  style={{ border: "1px solid #F59E0B40", color: "#F59E0B", background: "#F59E0B10" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "#F59E0B20")}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "#F59E0B10")}
                >
                  PPT
                </button>
                <button
                  onClick={onReset}
                  className="px-3 py-1.5 text-xs rounded-lg transition-colors"
                  style={{ border: "1px solid #E2E8F0", color: "#9CA3AF" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = "#0A4DA840")}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = "#E2E8F0")}
                >
                  Nouvelle séance
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full font-mono text-sm rounded-xl p-4 resize-y"
          style={{ minHeight: "500px", background: "#F8FAFC", border: "1px solid #CBD5E1", color: "#111827", outline: "none", lineHeight: "1.6" }}
          autoFocus
        />
      ) : (
        <div
          id="seance-content"
          className="prose prose-sm max-w-none prose-invert prose-headings:text-[#0A4DA8] prose-table:text-sm"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{contenu}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
