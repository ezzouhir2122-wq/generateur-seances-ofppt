"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import EvaluationForm from "@/components/forms/EvaluationForm";
import EvaluationResult from "@/components/ui/EvaluationResult";
import type { EvaluationFormData, EvaluationType } from "@/types/seance";
import { exportToPDF, exportToWord } from "@/lib/export";

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
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Génération d&apos;évaluations</h1>
        <p className="mt-1" style={{ color: "#9CA3AF" }}>
          QCM, exercices pratiques, examens et sessions de rattrapage générés automatiquement
        </p>
      </div>

      <div className={`grid gap-8 ${contenu ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-5"}`}>
        {!contenu && (
          <div className="lg:col-span-2">
            <EvaluationForm onGenerate={handleGenerate} isLoading={isLoading} />
          </div>
        )}

        <div className={contenu ? "col-span-1" : "lg:col-span-3"}>
          {isLoading && (
            <div className="card flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-[#E8651A] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm" style={{ color: "#9CA3AF" }}>Génération de l&apos;évaluation en cours…</p>
            </div>
          )}

          {error && (
            <div className="card" style={{ borderColor: "#7F1D1D", background: "#2A1010" }}>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {contenu && (
            <EvaluationResult
              contenu={contenu}
              typeLabel={typeLabel}
              onExportPDF={() => exportToPDF(contenu, titre, formateur, "Évaluation")}
              onExportWord={() => exportToWord(contenu, titre)}
              onReset={() => { setContenu(null); setError(null); }}
            />
          )}

          {!isLoading && !contenu && !error && (
            <div className="space-y-3">
              {/* Info cards */}
              {[
                { icon: "☑", title: "QCM", desc: "Questions à choix multiples avec corrigé automatique. Idéal pour l'évaluation formative rapide." },
                { icon: "✏", title: "Exercices pratiques", desc: "Exercices d'application sur le module avec correction détaillée et barème." },
                { icon: "📋", title: "Contrôle continu", desc: "Évaluation intermédiaire : questions de cours + QCM + application. Corrigé et barème /20 inclus." },
                { icon: "📝", title: "Examen fin de module", desc: "Sujet complet d'examen avec corrigé et grille de notation sur 20." },
                { icon: "🔄", title: "Session de rattrapage", desc: "Sujet de rattrapage ciblant les compétences essentielles, avec corrigé." },
              ].map(card => (
                <div key={card.title} className="flex items-start gap-4 p-4 rounded-xl"
                  style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                  <span className="text-2xl mt-0.5">{card.icon}</span>
                  <div>
                    <p className="font-semibold text-sm text-white">{card.title}</p>
                    <p className="text-xs mt-1" style={{ color: "#4B5563" }}>{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
