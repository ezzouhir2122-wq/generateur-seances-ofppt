"use client";

import { useState } from "react";
import SeanceForm from "@/components/forms/SeanceForm";
import SeanceResult from "@/components/ui/SeanceResult";
import { SeanceFormData } from "@/types/seance";
import { exportToPDF, exportToWord } from "@/lib/export";

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [contenu, setContenu] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [titre, setTitre] = useState("");

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
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Competencia IA
        </h1>
        <p className="text-gray-500 mt-1">
          Remplissez le formulaire pour générer une séance complète en quelques secondes
        </p>
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
              <div className="w-10 h-10 border-4 border-ofppt-green border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">Génération de la séance en cours...</p>
            </div>
          )}

          {error && (
            <div className="card border-red-200 bg-red-50">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {contenu && (
            <SeanceResult
              contenu={contenu}
              onExportPDF={() => exportToPDF(contenu, titre)}
              onExportWord={() => exportToWord(contenu, titre)}
              onReset={() => { setContenu(null); setError(null); }}
            />
          )}

          {!isLoading && !contenu && !error && (
            <div className="card border-dashed border-2 border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-12 h-12 rounded-full bg-ofppt-green/10 flex items-center justify-center text-2xl">
                📄
              </div>
              <p className="text-gray-400 text-sm">La séance générée apparaîtra ici</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
