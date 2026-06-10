export default function CorrectionIAPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "#39C84A18", border: "1px solid #39C84A30" }}
      >
        <svg width="32" height="32" fill="none" stroke="#39C84A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Correction IA</h1>
        <p className="text-sm max-w-sm" style={{ color: "#6B7280" }}>
          Importez une copie (PDF, DOCX ou image) — l&apos;IA la corrige, attribue une note et génère un rapport de feedback détaillé.
        </p>
      </div>
      <div
        className="text-xs font-semibold px-3 py-1.5 rounded-full"
        style={{ background: "#1E1E2C", color: "#39C84A", border: "1px solid #39C84A40" }}
      >
        Bientôt disponible
      </div>
    </div>
  );
}
