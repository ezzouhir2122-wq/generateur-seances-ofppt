"use client";

import ReactMarkdown from "react-markdown";

interface Props {
  contenu: string;
  onExportPDF: () => void;
  onExportWord: () => void;
  onReset: () => void;
}

export default function SeanceResult({ contenu, onExportPDF, onExportWord, onReset }: Props) {
  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-ofppt-green">Séance générée</h2>
        <div className="flex gap-2">
          <button
            onClick={onExportPDF}
            className="px-4 py-2 text-sm border border-ofppt-green text-ofppt-green rounded-lg hover:bg-ofppt-green hover:text-white transition-colors font-medium"
          >
            Exporter PDF
          </button>
          <button
            onClick={onExportWord}
            className="px-4 py-2 text-sm border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors font-medium"
          >
            Exporter Word
          </button>
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Nouvelle séance
          </button>
        </div>
      </div>

      <div
        id="seance-content"
        className="prose prose-sm max-w-none prose-headings:text-ofppt-green prose-table:text-sm"
      >
        <ReactMarkdown>{contenu}</ReactMarkdown>
      </div>
    </div>
  );
}
