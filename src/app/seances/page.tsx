"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import SeanceForm from "@/components/forms/SeanceForm";
import SeanceResult from "@/components/ui/SeanceResult";
import { SeanceFormData } from "@/types/seance";
import { exportToPDF, exportToWord, exportToPPT } from "@/lib/export";
import { consumeReferentielContext } from "@/lib/referentiel-context";

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
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "#111827" }}>Génération de séance</h1>
        <p className="mt-1" style={{ color: "#9CA3AF" }}>Remplissez le formulaire pour générer une séance complète en quelques secondes</p>
      </div>

      <div className={`grid gap-8 ${contenu ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-5"}`}>
        {!contenu && (
          <div className="lg:col-span-2">
            <SeanceForm onGenerate={handleGenerate} isLoading={isLoading} initial={initial} />
          </div>
        )}

        <div className={contenu ? "col-span-1" : "lg:col-span-3"}>
          {/* Spinner initial (avant le premier token Claude) */}
          {isLoading && !contenu && (
            <div className="card flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-[#0A4DA8] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium" style={{ color: "#374151" }}>Génération en cours…</p>
              <p className="text-xs" style={{ color: "#9CA3AF" }}>
                {elapsed < 10
                  ? "Connexion à l'IA…"
                  : elapsed < 30
                  ? `${elapsed}s — l'IA rédige votre cours…`
                  : elapsed < 60
                  ? `${elapsed}s — cours long, encore quelques secondes…`
                  : `${elapsed}s — presque terminé…`}
              </p>
              {elapsed >= 15 && (
                <p className="text-[11px] px-4 text-center" style={{ color: "#0A4DA8" }}>
                  💡 Pour des réponses plus rapides, sélectionnez <strong>Claude Haiku</strong> ou <strong>Gemini Flash</strong> dans les paramètres ⚙
                </p>
              )}
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

          {error && !contenu && (
            <div className="card" style={{ borderColor: "#7F1D1D", background: "#2A1010" }}>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {!isLoading && !contenu && !error && (
            <div className="card flex flex-col items-center justify-center py-20 gap-3" style={{ borderStyle: "dashed", borderColor: "#E2E8F0" }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ background: "#0A4DA814" }}>
                📄
              </div>
              <p className="text-sm" style={{ color: "#4B5563" }}>La séance générée apparaîtra ici</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
