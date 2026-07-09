"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import EvaluationForm from "@/components/forms/EvaluationForm";
import EvaluationResult from "@/components/ui/EvaluationResult";
import type { EvaluationFormData, EvaluationType } from "@/types/seance";
import { exportToPDF, exportToWord } from "@/lib/export";
import { consumeReferentielContext } from "@/lib/referentiel-context";
import PageShell from "@/components/ui/PageShell";

const TYPE_LABELS: Record<EvaluationType, string> = {
  qcm: "QCM",
  exercices: "Exercices pratiques",
  controle: "Contrôle continu",
  examen: "Examen fin de module",
  rattrapage: "Session de rattrapage",
};

export default function EvaluationsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [contenu, setContenu] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typeLabel, setTypeLabel] = useState("");
  const [titre, setTitre] = useState("");
  const [initial, setInitial] = useState<Partial<EvaluationFormData> | undefined>(undefined);

  useEffect(() => {
    const ctx = consumeReferentielContext();
    if (ctx) {
      setInitial({
        filiere: ctx.filiere,
        module: ctx.module,
        codeModule: ctx.codeModule,
        theme: ctx.competence,
        themesCouverts: ctx.objectifs,
      });
    }
  }, []);
  const { data: session } = useSession();
  const formateur = session?.user
    ? { name: session.user.name ?? "Formateur", matricule: session.user.matricule, etablissement: session.user.etablissement }
    : undefined;

  const handleGenerate = async (data: EvaluationFormData) => {
    setIsLoading(true);
    setError(null);
    setContenu(null);
    const label = TYPE_LABELS[data.type];
    setTypeLabel(label);
    setTitre(`${label} — ${data.filiere} — ${data.module}`);

    try {
      const res = await fetch("/api/evaluations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Erreur lors de la génération");
      }
      const json = await res.json();
      setContenu(json.contenu);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de générer l'évaluation. Vérifiez vos clés API.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageShell
      title="Génération d'évaluations"
      subtitle="QCM, exercices pratiques, examens et sessions de rattrapage générés automatiquement"
      icon="☑️"
      breadcrumb={[
        { label: "Accueil", href: "/" },
        { label: "Génération IA" },
        { label: "Évaluation" },
      ]}
      noPadding
    >
      <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

        {/* ── Panneau gauche : formulaire ── */}
        <div style={{
          width: "380px",
          flexShrink: 0,
          background: "#FFFFFF",
          borderRight: "1px solid #E5E7EB",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          <EvaluationForm onGenerate={handleGenerate} isLoading={isLoading} initial={initial} />
        </div>

        {/* ── Panneau droit : résultat ── */}
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
                  {contenu ? `${typeLabel} généré` : isLoading ? "Génération en cours…" : "Résultat de génération"}
                </div>
                <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "1px" }}>
                  {contenu ? "Exportez en PDF ou Word" : isLoading ? "L'IA génère votre évaluation…" : "L'évaluation apparaîtra ici après génération"}
                </div>
              </div>
            </div>
            {contenu && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={() => exportToPDF(contenu, titre, formateur, "Évaluation")}
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
                <p style={{ fontSize: "14px", fontWeight: 500, color: "#374151" }}>Génération en cours…</p>
                <p style={{ fontSize: "12px", color: "#9CA3AF" }}>L'IA rédige votre évaluation avec corrigé</p>
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
                typeLabel={typeLabel}
                onExportPDF={() => exportToPDF(contenu, titre, formateur, "Évaluation")}
                onExportWord={() => exportToWord(contenu, titre)}
                onReset={() => { setContenu(null); setError(null); }}
              />
            )}

            {/* État vide avec cartes types */}
            {!isLoading && !contenu && !error && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0", textAlign: "center" }}>
                <div style={{
                  width: "64px", height: "64px", borderRadius: "50%",
                  background: "#EEF3FB", display: "flex", alignItems: "center",
                  justifyContent: "center", marginBottom: "16px", color: "#0A4DA8",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                    <rect x="9" y="3" width="6" height="4" rx="1"/>
                    <path d="M9 12l2 2 4-4"/>
                  </svg>
                </div>
                <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#111827", marginBottom: "6px" }}>Aucune évaluation générée</h3>
                <p style={{ fontSize: "13px", color: "#6B7280", maxWidth: "260px", lineHeight: 1.6, marginBottom: "28px" }}>
                  Choisissez un type à gauche et lancez la génération.
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", width: "100%", maxWidth: "480px" }}>
                  {[
                    { icon: "☑", title: "QCM", desc: "Questions + Réponses + Corrigé" },
                    { icon: "✏", title: "Exercices", desc: "Exercices pratiques corrigés" },
                    { icon: "📋", title: "Contrôle continu", desc: "Cours + QCM + Application /20" },
                    { icon: "📝", title: "Examen", desc: "Sujet + Corrigé + Barème" },
                    { icon: "🔄", title: "Rattrapage", desc: "Session ciblée sur les essentiels" },
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
