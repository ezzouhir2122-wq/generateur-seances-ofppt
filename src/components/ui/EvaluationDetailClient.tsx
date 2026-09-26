"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { exportToPDF, exportToWord } from "@/lib/export";

interface Evaluation {
  id: string;
  titre: string;
  filiere: string;
  module: string;
  niveau: string;
  type: string;
  theme: string | null;
  contenu: string;
  createdAt: Date;
}

export default function EvaluationDetailClient({ evaluation }: { evaluation: Evaluation }) {
  const { data: session } = useSession();
  const formateur = session?.user
    ? { name: session.user.name ?? "Formateur", matricule: session.user.matricule, etablissement: session.user.etablissement }
    : undefined;
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Supprimer cette évaluation ?")) return;
    const res = await fetch(`/api/evaluations/${evaluation.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Évaluation supprimée");
      router.push("/evaluations/historique");
    }
  }

  function handlePDF() {
    exportToPDF(evaluation.contenu, evaluation.titre, formateur, "Évaluation");
  }

  function handleWord() {
    exportToWord(evaluation.contenu, evaluation.titre);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/evaluations/historique" className="text-sm text-gray-500 hover:text-gray-700">← Mes évaluations</Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{evaluation.titre}</h1>
          <p className="text-sm text-gray-500">{evaluation.filiere} · {evaluation.module} · {new Date(evaluation.createdAt).toLocaleDateString("fr-FR")}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePDF} className="text-sm border border-gray-300 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors">PDF</button>
          <button onClick={handleWord} className="text-sm border border-gray-300 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors">Word</button>
          <button onClick={handleDelete} className="text-sm border border-red-200 text-red-500 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors">Supprimer</button>
        </div>
      </div>
      <div className="card prose prose-sm max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{evaluation.contenu}</ReactMarkdown>
      </div>
    </div>
  );
}
