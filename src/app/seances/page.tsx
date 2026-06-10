"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import SeanceForm from "@/components/forms/SeanceForm";
import SeanceResult from "@/components/ui/SeanceResult";
import { SeanceFormData } from "@/types/seance";
import { exportToPDF, exportToWord, exportToPPT } from "@/lib/export";

export default function SeancesPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [contenu, setContenu] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [titre, setTitre] = useState("");
  const { data: session } = useSession();
  const formateur = session?.user
    ? { name: session.user.name ?? "Formateur", matricule: session.user.matricule, etablissement: session.user.etablissement }
    : undefined;

  const handleGenerate = async (data: SeanceFormData) => {
    setIsLoading(true);
    setError(null);
    setContenu(null);
    setTitre(`Séance — ${data.filiere} — ${data.module}`);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Erreur lors de la génération");
      const json = await res.json();
      setContenu(json.contenu);
    } catch {
      setError("Impossible de générer la séance. Vérifiez vos clés API dans .env");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Génération de séance</h1>
        <p className="mt-1" style={{ color: "#9CA3AF" }}>Remplissez le formulaire pour générer une séance complète en quelques secondes</p>
      </div>

      <div className={`grid gap-8 ${contenu ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-5"}`}>
        {!contenu && (
          <div className="lg:col-span-2">
            <SeanceForm onGenerate={handleGenerate} isLoading={isLoading} />
          </div>
        )}

        <div className={contenu ? "col-span-1" : "lg:col-span-3"}>
          {isLoading && (
            <div className="card flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-[#39C84A] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm" style={{ color: "#9CA3AF" }}>Génération de la séance en cours...</p>
            </div>
          )}

          {error && (
            <div className="card" style={{ borderColor: "#7F1D1D", background: "#2A1010" }}>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {contenu && (
            <SeanceResult
              contenu={contenu}
              onExportPDF={() => exportToPDF(contenu, titre, formateur)}
              onExportWord={() => exportToWord(contenu, titre)}
              onExportPPT={() => exportToPPT(contenu, titre)}
              onReset={() => { setContenu(null); setError(null); }}
            />
          )}

          {!isLoading && !contenu && !error && (
            <div className="card flex flex-col items-center justify-center py-20 gap-3" style={{ borderStyle: "dashed", borderColor: "#1E1E2C" }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ background: "#39C84A14" }}>
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
