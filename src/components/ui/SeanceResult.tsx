"use client";

import ReactMarkdown from "react-markdown";

interface Props {
  contenu: string;
  onExportPDF: () => void;
  onExportWord: () => void;
  onExportPPT: () => void;
  onReset: () => void;
}

export default function SeanceResult({ contenu, onExportPDF, onExportWord, onExportPPT, onReset }: Props) {
  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between pb-4" style={{ borderBottom: "1px solid #1E1E2C" }}>
        <h2 className="text-base font-bold" style={{ color: "#39C84A" }}>Séance générée</h2>
        <div className="flex gap-2">
          <button
            onClick={onExportPDF}
            className="px-3 py-1.5 text-xs rounded-lg transition-colors font-medium"
            style={{ border: "1px solid #39C84A40", color: "#39C84A", background: "#39C84A10" }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "#39C84A20")}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "#39C84A10")}
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
            style={{ border: "1px solid #1E1E2C", color: "#9CA3AF" }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = "#39C84A40")}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = "#1E1E2C")}
          >
            Nouvelle séance
          </button>
        </div>
      </div>

      <div
        id="seance-content"
        className="prose prose-sm max-w-none prose-invert prose-headings:text-[#39C84A] prose-table:text-sm"
      >
        <ReactMarkdown>{contenu}</ReactMarkdown>
      </div>
    </div>
  );
}
