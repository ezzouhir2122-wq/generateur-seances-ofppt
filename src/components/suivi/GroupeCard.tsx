"use client";

import Link from "next/link";
import { GroupeSummary } from "@/types/suivi";

export default function GroupeCard({ groupe, onDelete }: { groupe: GroupeSummary; onDelete: (id: string) => void }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-white text-sm">{groupe.nom}</h3>
          <p className="text-xs mt-1" style={{ color: "#E8651A" }}>{groupe.filiereNom}</p>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-full font-medium"
          style={{ background: "#E8651A14", color: "#E8651A", border: "1px solid #E8651A30" }}
        >
          {groupe.annee}
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-xs" style={{ color: "#6B7280" }}>
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
        {groupe._count.stagiaires} stagiaire{groupe._count.stagiaires > 1 ? "s" : ""}
      </div>

      <div className="flex gap-2 pt-1">
        <Link
          href={`/suivi/${groupe.id}`}
          className="flex-1 text-center text-xs py-2 rounded-xl font-medium transition-colors"
          style={{ background: "#E8651A18", color: "#E8651A", border: "1px solid #E8651A30" }}
        >
          Voir progression
        </Link>
        <Link
          href={`/suivi/${groupe.id}/stagiaires`}
          className="text-xs py-2 px-3 rounded-xl transition-colors"
          style={{ border: "1px solid #E2E8F0", color: "#9CA3AF" }}
        >
          Stagiaires
        </Link>
        <button
          onClick={() => onDelete(groupe.id)}
          className="text-xs py-2 px-3 rounded-xl transition-colors"
          style={{ border: "1px solid #E2E8F0", color: "#6B7280" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#7F1D1D"; (e.currentTarget as HTMLButtonElement).style.color = "#EF4444"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#E2E8F0"; (e.currentTarget as HTMLButtonElement).style.color = "#6B7280"; }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
