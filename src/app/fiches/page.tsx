"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import FicheForm from "@/components/forms/FicheForm";
import ReactMarkdown from "react-markdown";
import type { FicheFormData } from "@/types/seance";
import { toast } from "sonner";
import { consumeReferentielContext } from "@/lib/referentiel-context";

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
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6 pb-5" style={{ borderBottom: "1px solid #E2E8F0" }}>
        <h1 className="text-2xl font-bold" style={{ color: "#111827" }}>Fiches pédagogiques</h1>
        <p className="text-sm mt-1" style={{ color: "#9CA3AF" }}>Générez une fiche pédagogique complète au format OFPPT</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FicheForm onGenerate={handleGenerate} isLoading={isLoading} defaultValues={defaultValues} />
        <div className="card">
          <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
            <h2 className="text-base font-bold" style={{ color: "#0A4DA8" }}>Fiche générée</h2>
            {ficheId && (
              <button
                onClick={() => router.push(`/fiches/${ficheId}`)}
                className="text-sm hover:underline"
                style={{ color: "#0A4DA8" }}
              >
                Voir le détail →
              </button>
            )}
          </div>
          {contenu ? (
            <div className="prose prose-sm max-w-none prose-invert">
              <ReactMarkdown>{contenu}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-sm" style={{ color: "#4B5563" }}>
              {isLoading ? "Génération en cours…" : "La fiche apparaîtra ici"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FichesPage() {
  return (
    <Suspense>
      <FichesContent />
    </Suspense>
  );
}
