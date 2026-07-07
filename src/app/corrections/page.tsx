import PageShell from "@/components/ui/PageShell";

export default function CorrectionIAPage() {
  return (
    <PageShell
      title="Correction IA"
      subtitle="Importez une copie — l'IA la corrige et génère un rapport de feedback détaillé"
      icon="✏️"
      breadcrumb={[
        { label: "Accueil", href: "/" },
        { label: "Génération IA" },
        { label: "Correction IA" },
      ]}
    >
      <div className="flex flex-col items-center justify-center py-20 gap-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "#0A4DA818", border: "1px solid #0A4DA830" }}
        >
          <svg width="32" height="32" fill="none" stroke="#0A4DA8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm max-w-sm" style={{ color: "#6B7280" }}>
            Importez une copie (PDF, DOCX ou image) — l&apos;IA la corrige, attribue une note et génère un rapport de feedback détaillé.
          </p>
        </div>
        <div
          className="text-xs font-semibold px-3 py-1.5 rounded-full"
          style={{ background: "#E2E8F0", color: "#0A4DA8", border: "1px solid #0A4DA840" }}
        >
          Bientôt disponible
        </div>
      </div>
    </PageShell>
  );
}
