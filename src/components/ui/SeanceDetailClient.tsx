"use client";

import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { exportToPDF, exportToWord, exportToPPT } from "@/lib/export";

interface Seance {
  id: string;
  title: string;
  filiere: string;
  module: string;
  duree: string;
  niveau: string;
  type: string;
  objectifs: string;
  contenu: string;
  createdAt: Date;
}

export default function SeanceDetailClient({ seance }: { seance: Seance }) {
  const { data: session } = useSession();
  const formateur = session?.user
    ? { name: session.user.name ?? "Formateur", matricule: session.user.matricule, etablissement: session.user.etablissement }
    : undefined;

  const typeLabel: Record<string, string> = {
    theorique: "Cours théorique",
    tp: "Travaux Pratiques",
    ta: "Travaux d'Application",
  };

  return (
    <div className="card space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-xl font-bold text-ofppt-green">{seance.title}</h1>
          <div className="flex flex-wrap gap-3 mt-2">
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
              {typeLabel[seance.type] ?? seance.type}
            </span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
              {seance.duree}
            </span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
              {seance.niveau === "1ere-annee" ? "1ère année" : "2ème année"}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(seance.createdAt).toLocaleDateString("fr-MA", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => exportToPDF(seance.contenu, seance.title, formateur)}
            className="px-4 py-2 text-sm border border-ofppt-green text-ofppt-green rounded-lg hover:bg-ofppt-green hover:text-white transition-colors font-medium"
          >
            PDF
          </button>
          <button
            onClick={() => exportToWord(seance.contenu, seance.title)}
            className="px-4 py-2 text-sm border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors font-medium"
          >
            Word
          </button>
          <button
            onClick={() => exportToPPT(seance.contenu, seance.title)}
            className="px-4 py-2 text-sm border border-amber-500 text-amber-500 rounded-lg hover:bg-amber-500 hover:text-white transition-colors font-medium"
          >
            PPT
          </button>
          <Link
            href={`/fiches?from=${seance.id}`}
            className="text-sm border border-[#006633] text-[#006633] hover:bg-[#006633] hover:text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            📋 Créer une fiche
          </Link>
        </div>
      </div>

      {/* Contenu */}
      <div className="prose prose-sm max-w-none prose-headings:text-ofppt-green prose-table:text-sm">
        <ReactMarkdown>{seance.contenu}</ReactMarkdown>
      </div>
    </div>
  );
}
