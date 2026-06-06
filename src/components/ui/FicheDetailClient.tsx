"use client";

import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { exportFichePDF, exportFicheWord } from "@/lib/export";

interface Fiche {
  id: string;
  titre: string;
  filiere: string;
  module: string;
  formateur: string;
  duree: string;
  niveau: string;
  type: string;
  contenu: string;
  createdAt: Date;
}

export default function FicheDetailClient({ fiche }: { fiche: Fiche }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Supprimer cette fiche ?")) return;
    const res = await fetch(`/api/fiches/${fiche.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Fiche supprimée");
      router.push("/fiches/historique");
    }
  }

  function handlePDF() {
    exportFichePDF(fiche.contenu, fiche.titre);
  }

  function handleWord() {
    exportFicheWord(fiche.contenu, fiche.titre);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/fiches/historique" className="text-sm text-gray-500 hover:text-gray-700">← Mes fiches</Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{fiche.titre}</h1>
          <p className="text-sm text-gray-500">{fiche.filiere} · {fiche.duree} · {new Date(fiche.createdAt).toLocaleDateString("fr-FR")}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePDF} className="text-sm border border-gray-300 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors">PDF</button>
          <button onClick={handleWord} className="text-sm border border-gray-300 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors">Word</button>
          <button onClick={handleDelete} className="text-sm border border-red-200 text-red-500 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors">Supprimer</button>
        </div>
      </div>
      <div className="card prose prose-sm max-w-none">
        <ReactMarkdown>{fiche.contenu}</ReactMarkdown>
      </div>
    </div>
  );
}
