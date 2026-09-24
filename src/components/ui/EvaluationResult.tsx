"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  contenu: string;
  typeLabel: string;
  onExportPDF: () => void;
  onExportWord: () => void;
  onReset: () => void;
  onEdit?: (newContenu: string) => void;
}

export default function EvaluationResult({ contenu, typeLabel, onExportPDF, onExportWord, onReset, onEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const startEdit = () => { setDraft(contenu); setEditing(true); };
  const saveEdit = () => { onEdit?.(draft); setEditing(false); };
  const cancelEdit = () => setEditing(false);

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between pb-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
        <h2 className="text-base font-bold" style={{ color: "#0A4DA8" }}>{typeLabel} généré</h2>
        <div className="flex gap-2 flex-wrap">
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
              {onEdit && (
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
              <button
                onClick={onExportPDF}
                className="px-3 py-1.5 text-xs rounded-lg transition-colors font-medium"
                style={{ border: "1px solid #0A4DA840", color: "#0A4DA8", background: "#0A4DA810" }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "#0A4DA820")}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "#0A4DA810")}
              >
                Exporter PDF
              </button>
              <button
                onClick={onExportWord}
                className="px-3 py-1.5 text-xs rounded-lg transition-colors font-medium"
                style={{ border: "1px solid #3B82F640", color: "#3B82F6", background: "#3B82F610" }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "#3B82F620")}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "#3B82F610")}
              >
                Exporter Word
              </button>
              <button
                onClick={onReset}
                className="px-3 py-1.5 text-xs rounded-lg transition-colors"
                style={{ border: "1px solid #E2E8F0", color: "#9CA3AF" }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = "#0A4DA840")}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = "#E2E8F0")}
              >
                Nouvelle évaluation
              </button>
            </>
          )}
        </div>
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
          id="evaluation-content"
          className="prose prose-sm max-w-none prose-invert prose-headings:text-[#0A4DA8] prose-table:text-sm"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{contenu}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
