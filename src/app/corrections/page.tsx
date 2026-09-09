"use client";
// v2
import { useState } from "react";
import { useSession } from "next-auth/react";
import PageShell from "@/components/ui/PageShell";
import CorrectionForm from "@/components/forms/CorrectionForm";
import EvaluationResult from "@/components/ui/EvaluationResult";
import { exportToPDF, exportToWord } from "@/lib/export";
import type { CorrectionFormData } from "@/types/correction";

export default function CorrectionIAPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [contenu, setContenu] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [titre, setTitre] = useState("");

  const { data: session } = useSession();
  const formateur = session?.user
    ? { name: session.user.name ?? "Formateur", matricule: session.user.matricule, etablissement: session.user.etablissement }
    : undefined;

  const handleGenerate = async (data: CorrectionFormData) => {
    setIsLoading(true);
    setError(null);
    setContenu(null);
    const matiereLabel = data.matiere?.trim() || "Correction";
    setTitre(`${matiereLabel}${data.nomStagiaire ? ` — ${data.nomStagiaire}` : ""}`);

    try {
      const res = await fetch("/api/corrections/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Erreur lors de la correction");
      }
      const json = await res.json();
      setContenu(json.contenu);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de corriger. Vérifiez vos clés API.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageShell
      title="Correction IA"
      subtitle="Importez une copie — l'IA la corrige, attribue une note et génère un rapport de feedback détaillé"
      icon="✏️"
      breadcrumb={[
        { label: "Accueil", href: "/" },
        { label: "Génération IA" },
        { label: "Correction IA" },
      ]}
      noPadding
    >
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

        {/* Panneau gauche : formulaire */}
        <div style={{
          width: "380px",
          flexShrink: 0,
          background: "#FFFFFF",
          borderRight: "1px solid #E5E7EB",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          <CorrectionForm onGenerate={handleGenerate} isLoading={isLoading} />
        </div>

        {/* Panneau droit : résultat */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#EEF2F7" }}>

          {/* Barre d'actions */}
          <div style={{
            padding: "10px 24px",
            borderBottom: "1px solid #E5E7EB",
            background: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: contenu ? "#16A34A" : isLoading ? "#F59E0B" : "#D1D5DB",
                transition: "background .3s",
              }} />
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>
                  {contenu ? "Correction générée" : isLoading ? "Correction en cours…" : "Rapport de correction"}
                </div>
                <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "1px" }}>
                  {contenu ? "Exportez en PDF ou Word" : isLoading ? "L'IA analyse la copie…" : "Le rapport apparaîtra ici après correction"}
                </div>
              </div>
            </div>
            {contenu && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={() => exportToPDF(contenu, titre, formateur, "Correction")}
                  style={{
                    padding: "6px 13px", background: "#E8651A", color: "#FFFFFF",
                    border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >PDF</button>
                <button
                  onClick={() => exportToWord(contenu, titre)}
                  style={{
                    padding: "6px 13px", background: "#0A4DA8", color: "#FFFFFF",
                    border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >Word</button>
                <button
                  onClick={() => { setContenu(null); setError(null); }}
                  style={{
                    padding: "6px 13px", background: "transparent",
                    border: "1px solid #E5E7EB", borderRadius: "7px",
                    fontSize: "12px", color: "#6B7280", cursor: "pointer", fontFamily: "inherit",
                  }}
                >Réinitialiser</button>
              </div>
            )}
          </div>

          {/* Corps */}
          <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>

            {/* Spinner */}
            {isLoading && !contenu && (
              <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 32px", gap: "16px" }}>
                <div style={{ width: "40px", height: "40px", border: "4px solid #E5E7EB", borderTopColor: "#0A4DA8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <p style={{ fontSize: "14px", fontWeight: 500, color: "#374151" }}>Correction en cours…</p>
                <p style={{ fontSize: "12px", color: "#9CA3AF" }}>L&apos;IA lit la copie, note et rédige le feedback</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {/* Erreur */}
            {error && !contenu && (
              <div className="card" style={{ borderColor: "#FECACA", background: "#FEF2F2" }}>
                <p style={{ fontSize: "13px", color: "#DC2626" }}>{error}</p>
              </div>
            )}

            {/* Résultat */}
            {contenu && (
              <EvaluationResult
                contenu={contenu}
                typeLabel="Correction IA"
                onExportPDF={() => exportToPDF(contenu, titre, formateur, "Correction")}
                onExportWord={() => exportToWord(contenu, titre)}
                onReset={() => { setContenu(null); setError(null); }}
              />
            )}

            {/* État vide */}
            {!isLoading && !contenu && !error && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0", textAlign: "center" }}>
                <div style={{
                  width: "64px", height: "64px", borderRadius: "50%",
                  background: "#EEF3FB", display: "flex", alignItems: "center",
                  justifyContent: "center", marginBottom: "16px", color: "#0A4DA8",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </div>
                <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#111827", marginBottom: "6px" }}>Aucune correction générée</h3>
                <p style={{ fontSize: "13px", color: "#6B7280", maxWidth: "300px", lineHeight: 1.6, marginBottom: "28px" }}>
                  Remplissez le formulaire à gauche, collez la copie du stagiaire et lancez la correction IA.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", width: "100%", maxWidth: "480px" }}>
                  {[
                    { icon: "🎯", title: "Note /20", desc: "Calculée selon le barème" },
                    { icon: "🔍", title: "Analyse d'erreurs", desc: "Question par question" },
                    { icon: "💬", title: "Feedback personnalisé", desc: "Message au stagiaire" },
                    { icon: "📄", title: "Export PDF / Word", desc: "Rapport téléchargeable" },
                  ].map(card => (
                    <div key={card.title} style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "10px 14px", background: "#FFFFFF",
                      border: "1px solid #E5E7EB", borderRadius: "10px",
                      textAlign: "left", boxShadow: "0 1px 3px rgba(0,0,0,.04)",
                    }}>
                      <span style={{ fontSize: "18px", flexShrink: 0 }}>{card.icon}</span>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#111827" }}>{card.title}</div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{card.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
