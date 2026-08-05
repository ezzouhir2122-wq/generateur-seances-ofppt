"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  contenu: string;
  isStreaming?: boolean;
  onExportPDF: () => void;
  onExportWord: () => void;
  onExportPPT: () => void;
  onReset: () => void;
}

export default function SeanceResult({ contenu, isStreaming, onExportPDF, onExportWord, onExportPPT, onReset }: Props) {
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
              onClick={onExportPPT}
              className="px-3 py-1.5 text-xs rounded-lg transition-colors font-medium"
              style={{ border: "1px solid #F59E0B40", color: "#F59E0B", background: "#F59E0B10" }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "#F59E0B20")}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "#F59E0B10")}
            >
              Exporter PPT
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
          </div>
        )}
      </div>

      <div
        id="seance-content"
        className="prose prose-sm max-w-none prose-invert prose-headings:text-[#0A4DA8] prose-table:text-sm"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{contenu}</ReactMarkdown>
      </div>
    </div>
  );
}
