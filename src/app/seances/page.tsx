"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import SeanceForm from "@/components/forms/SeanceForm";
import SeanceResult from "@/components/ui/SeanceResult";
import { SeanceFormData } from "@/types/seance";
import { exportToPDF, exportToWord, exportToPPT } from "@/lib/export";
import { consumeReferentielContext } from "@/lib/referentiel-context";
import PageShell from "@/components/ui/PageShell";

export default function SeancesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [contenu, setContenu] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [titre, setTitre] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [initial, setInitial] = useState<Partial<SeanceFormData> | undefined>(undefined);

  useEffect(() => {
    const ctx = consumeReferentielContext();
    if (ctx) {
      setInitial({
        filiere: ctx.filiere,
        module: ctx.module,
        codeModule: ctx.codeModule,
        competence: ctx.competence,
        objectifs: ctx.objectifs,
      });
    }
  }, []);

  const { data: session } = useSession();
  const formateur = session?.user
    ? { name: session.user.name ?? "Formateur", matricule: session.user.matricule, etablissement: session.user.etablissement }
    : undefined;

  const handleGenerate = async (data: SeanceFormData) => {
    setIsLoading(true);
    setError(null);
    setContenu(null);
    setTitre(`Séance — ${data.filiere} — ${data.module}`);
    setElapsed(0);

    const ticker = setInterval(() => setElapsed((s) => s + 1), 1000);
    const controller = new AbortController();
    const safetyTimeout = setTimeout(() => controller.abort(), 120_000);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(json.error ?? "Erreur lors de la génération");
      }

      const contentType = res.headers.get("content-type") ?? "";

      if (contentType.includes("text/plain") && res.body) {
        // ── Claude streaming path ──────────────────────────────────────────
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finalContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          if (buffer.startsWith("[[ERROR]]")) {
            throw new Error(buffer.slice("[[ERROR]]".length) || "Erreur de génération IA");
          }

          const metaIdx = buffer.indexOf("\n[[META]]");
          if (metaIdx !== -1) {
            finalContent = buffer.slice(0, metaIdx);
            setContenu(finalContent);
            break;
          }

          setContenu(buffer);
          finalContent = buffer;
        }

        if (!finalContent.trim()) {
          throw new Error("Réponse vide — vérifiez votre clé API dans les paramètres ⚙");
        }
      } else {
        // ── JSON path (Google, OpenAI, OpenRouter) ─────────────────────────
        const json = await res.json() as { contenu?: string };
        if (!json.contenu) throw new Error("Réponse vide — vérifiez votre clé API dans les paramètres ⚙");
        setContenu(json.contenu);
      }
    } catch (err) {
      setContenu(null);
      if (err instanceof Error && err.name === "AbortError") {
        setError("La génération a pris trop de temps. Essayez un modèle plus rapide comme Claude Haiku ou Gemini Flash dans les paramètres ⚙.");
      } else {
        const msg = err instanceof Error ? err.message : "Erreur inconnue";
        setError(
          msg.includes("clé") || msg.includes("API") || msg.includes("manquante")
            ? msg
            : `Erreur de génération — ${msg}. Configurez votre clé API dans les paramètres ⚙.`
        );
      }
    } finally {
      clearTimeout(safetyTimeout);
      clearInterval(ticker);
      setIsLoading(false);
    }
  };

  return (
    <PageShell
      title="Séance pédagogique"
      subtitle="Générez un cours complet adapté au référentiel OFPPT en quelques secondes"
      icon="⚡"
      breadcrumb={[
        { label: "Accueil", href: "/" },
        { label: "Génération IA" },
        { label: "Séance pédagogique" },
      ]}
      action={{ label: "📂 Historique", href: "/historique" }}
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
          <SeanceForm onGenerate={handleGenerate} isLoading={isLoading} initial={initial} />
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
                  {contenu ? (titre || "Séance générée") : isLoading ? "Génération en cours…" : "Résultat de génération"}
                </div>
                <div style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "1px" }}>
                  {contenu ? "Exportez ou réinitialisez pour relancer" : isLoading ? `${elapsed}s écoulées` : "La séance apparaîtra ici après génération"}
                </div>
              </div>
            </div>
            {contenu && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={() => exportToPDF(contenu, titre, formateur)}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "6px 13px", background: "#E8651A", color: "#FFFFFF",
                    border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >PDF</button>
                <button
                  onClick={() => exportToWord(contenu, titre)}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
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

            {/* Spinner (avant le premier token) */}
            {isLoading && !contenu && (
              <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 32px", gap: "16px" }}>
                <div style={{ width: "40px", height: "40px", border: "4px solid #E5E7EB", borderTopColor: "#0A4DA8", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <p style={{ fontSize: "14px", fontWeight: 500, color: "#374151" }}>Génération en cours…</p>
                <p style={{ fontSize: "12px", color: "#9CA3AF", textAlign: "center" }}>
                  {elapsed < 10 ? "Connexion à l'IA…"
                    : elapsed < 30 ? `${elapsed}s — l'IA rédige votre cours…`
                    : elapsed < 60 ? `${elapsed}s — cours long, encore quelques secondes…`
                    : `${elapsed}s — presque terminé…`}
                </p>
                {elapsed >= 15 && (
                  <p style={{ fontSize: "11px", color: "#0A4DA8", textAlign: "center", maxWidth: "320px" }}>
                    💡 Pour des réponses plus rapides, sélectionnez <strong>Claude Haiku</strong> ou <strong>Gemini Flash</strong> dans les paramètres ⚙
                  </p>
                )}
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {/* Résultat — live streaming ou final */}
            {contenu && (
              <SeanceResult
                contenu={contenu}
                isStreaming={isLoading}
                onExportPDF={() => exportToPDF(contenu, titre, formateur)}
                onExportWord={() => exportToWord(contenu, titre)}
                onExportPPT={() => exportToPPT(contenu, titre)}
                onReset={() => { setContenu(null); setError(null); }}
              />
            )}

            {/* Erreur */}
            {error && !contenu && (
              <div className="card" style={{ borderColor: "#FECACA", background: "#FEF2F2" }}>
                <p style={{ fontSize: "13px", color: "#DC2626" }}>{error}</p>
              </div>
            )}

            {/* État vide */}
            {!isLoading && !contenu && !error && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: "0", textAlign: "center" }}>
                <div style={{
                  width: "64px", height: "64px", borderRadius: "50%",
                  background: "#EEF3FB", display: "flex", alignItems: "center",
                  justifyContent: "center", marginBottom: "16px", color: "#0A4DA8",
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#111827", marginBottom: "8px" }}>Aucune séance générée</h3>
                <p style={{ fontSize: "13px", color: "#6B7280", maxWidth: "280px", lineHeight: 1.6 }}>
                  Renseignez les paramètres à gauche, puis cliquez sur <strong>Générer la séance</strong>.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "28px", width: "100%", maxWidth: "320px" }}>
                  {[
                    { icon: "🎯", title: "Sélectionnez filière & niveau", sub: "Pour charger les modules disponibles" },
                    { icon: "📦", title: "Choisissez le module", sub: "N° et intitulé se synchronisent automatiquement" },
                    { icon: "⚡", title: "Lancez la génération IA", sub: "La fiche complète s'affiche ici en quelques secondes" },
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
