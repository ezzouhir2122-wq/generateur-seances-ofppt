"use client";

import ReactMarkdown from "react-markdown";

interface Props {
  contenu: string;
  typeLabel: string;
  onExportPDF: () => void;
  onExportWord: () => void;
  onReset: () => void;
}

export default function EvaluationResult({ contenu, typeLabel, onExportPDF, onExportWord, onReset }: Props) {
  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between pb-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
        <h2 className="text-base font-bold" style={{ color: "#0A4DA8" }}>{typeLabel} généré</h2>
        <div className="flex gap-2">
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
        </div>
      </div>

      <div
        id="evaluation-content"
        className="prose prose-sm max-w-none prose-invert prose-headings:text-[#0A4DA8] prose-table:text-sm"
      >
        <ReactMarkdown>{contenu}</ReactMarkdown>
      </div>
    </div>
  );
}
