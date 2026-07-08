"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import FicheForm from "@/components/forms/FicheForm";
import ReactMarkdown from "react-markdown";
import type { FicheFormData } from "@/types/seance";
import { toast } from "sonner";
import { consumeReferentielContext } from "@/lib/referentiel-context";
import PageShell from "@/components/ui/PageShell";

function FichesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [contenu, setContenu] = useState("");
  const [ficheId, setFicheId] = useState("");
  const [defaultValues, setDefaultValues] = useState<Partial<FicheFormData>>({});

  useEffect(() => {
    const from = searchParams.get("from");
    if (!from) return;
    fetch(`/api/historique/${from}`)
      .then(r => r.json())
      .then(seance => {
        if (seance) {
          setDefaultValues({
            filiere: seance.filiere,
            module: seance.module,
            duree: seance.duree,
            niveau: seance.niveau,
            type: seance.type,
          });
        }
      })
      .catch(() => {});
  }, [searchParams]);

  useEffect(() => {
    const ctx = consumeReferentielContext();
    if (ctx) {
      setDefaultValues((prev) => ({
        ...prev,
        filiere: ctx.filiere,
        module: ctx.module,
        codeModule: ctx.codeModule,
        intitule: ctx.competence,
        objectifsSavoir: ctx.objectifs,
      }));
    }
  }, []);

  async function handleGenerate(data: FicheFormData) {
    setIsLoading(true);
    setContenu("");
    try {
      const from = searchParams.get("from");
      const res = await fetch("/api/fiches/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, seanceSourceId: from ?? undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setContenu(json.contenu);
      setFicheId(json.id);
      toast.success("Fiche générée et sauvegardée !");
    } catch (err) {
      toast.error((err as Error).message ?? "Erreur lors de la génération");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <PageShell
      title="Fiches pédagogiques"
      subtitle="Générez une fiche pédagogique complète au format OFPPT"
      icon="📋"
      breadcrumb={[
        { label: "Accueil", href: "/" },
        { label: "Génération IA" },
        { label: "Fiche pédagogique" },
      ]}
      action={{ label: "📂 Mes fiches", href: "/fiches/historique" }}
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
          <FicheForm onGenerate={handleGenerate} isLoading={isLoading} defaultValues={defaultValues} />
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
                  {contenu ? "Fiche générée" : isLoading ? "Génération en cours…" : "Résultat de génération"}
                </div>
                <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "1px" }}>
                  {contenu ? "Consultez le détail ou réinitialisez" : isLoading ? "L'IA rédige votre fiche…" : "La fiche apparaîtra ici après génération"}
                </div>
              </div>
            </div>
            {contenu && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {ficheId && (
                  <button
                    onClick={() => router.push(`/fiches/${ficheId}`)}
                    style={{
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "6px 13px", background: "#0A4DA8", color: "#FFFFFF",
                      border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    Voir le détail →
                  </button>
                )}
                <button
                  onClick={() => { setContenu(""); setFicheId(""); }}
                  style={{
                    padding: "6px 13px", background: "transparent",
                    border: "1px solid #E5E7EB", borderRadius: "7px",
                    fontSize: "12px", color: "#6B7280", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Réinitialiser
                </button>
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
                <p style={{ fontSize: "12px", color: "#9CA3AF" }}>L'IA rédige votre fiche pédagogique</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {/* Résultat */}
            {contenu && (
              <div className="card">
                <div className="prose prose-sm max-w-none prose-ofppt">
                  <ReactMarkdown>{contenu}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* État vide */}
            {!isLoading && !contenu && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: "0", textAlign: "center" }}>
                <div style={{
                  width: "64px", height: "64px", borderRadius: "50%",
                  background: "#EEF3FB", display: "flex", alignItems: "center",
                  justifyContent: "center", marginBottom: "16px", color: "#0A4DA8",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
                    <rect x="9" y="3" width="6" height="4" rx="1"/>
                    <line x1="9" y1="12" x2="15" y2="12"/>
                    <line x1="9" y1="16" x2="13" y2="16"/>
                  </svg>
                </div>
                <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#111827", marginBottom: "8px" }}>Aucune fiche générée</h3>
                <p style={{ fontSize: "13px", color: "#6B7280", maxWidth: "280px", lineHeight: 1.6 }}>
                  Renseignez les paramètres à gauche, puis cliquez sur <strong>Générer la fiche pédagogique</strong>.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "28px", width: "100%", maxWidth: "320px" }}>
                  {[
                    { icon: "🎯", title: "Sélectionnez filière & module", sub: "Pour charger les compétences du référentiel" },
                    { icon: "📝", title: "Renseignez les infos fiche", sub: "Intitulé, formateur, durée, type de séance" },
                    { icon: "📋", title: "Générez la fiche OFPPT", sub: "Objectifs pédagogiques inclus automatiquement" },
                  ].map((h) => (
                    <div key={h.title} style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "10px 14px", background: "#FFFFFF",
                      border: "1px solid #E5E7EB", borderRadius: "10px",
                      textAlign: "left", boxShadow: "0 1px 3px rgba(0,0,0,.04)",
                    }}>
                      <div style={{
                        width: "32px", height: "32px", borderRadius: "8px",
                        background: "#EEF3FB", display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: "15px", flexShrink: 0,
                      }}>{h.icon}</div>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#111827" }}>{h.title}</div>
                        <div style={{ fontSize: "11px", color: "#9CA3AF" }}>{h.sub}</div>
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

export default function FichesPage() {
  return (
    <Suspense>
      <FichesContent />
    </Suspense>
  );
}
