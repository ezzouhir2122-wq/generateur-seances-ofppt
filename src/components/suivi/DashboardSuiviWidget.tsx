"use client";

import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { CompetenceItem, StagiaireItem } from "@/types/suivi";

interface Props {
  competences: CompetenceItem[];
  stagiaires: StagiaireItem[];
  groupesCount: number;
}

const tooltipStyle = {
  contentStyle: { background: "#12121E", border: "1px solid #1E1E2C", color: "#E5E7EB", fontSize: 11, borderRadius: 8 },
};

export default function DashboardSuiviWidget({ competences, stagiaires, groupesCount }: Props) {
  const barData = competences.slice(0, 6).map((c) => {
    const vals = stagiaires
      .map((s) => s.progressions.find((p) => p.competenceId === c.id)?.pourcentage ?? null)
      .filter((v): v is number => v !== null);
    return {
      name: c.titre.length > 12 ? c.titre.slice(0, 12) + "…" : c.titre,
      val: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0,
    };
  });

  if (groupesCount === 0) {
    return (
      <div className="rounded-2xl p-5 flex flex-col items-center justify-center py-10" style={{ background: "#111116", border: "1px solid #1E1E2C" }}>
        <p className="text-sm font-medium text-white mb-1">Suivi des Compétences</p>
        <p className="text-xs mb-3" style={{ color: "#6B7280" }}>Aucun groupe créé</p>
        <Link href="/suivi/nouveau" className="text-xs font-medium" style={{ color: "#39C84A" }}>
          Créer un groupe →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: "#111116", border: "1px solid #1E1E2C" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-white text-sm">Suivi des Compétences</h2>
        <Link href="/suivi" className="text-xs font-medium" style={{ color: "#39C84A" }}>Voir tout →</Link>
      </div>
      <div className="flex gap-4 mb-4 text-xs" style={{ color: "#6B7280" }}>
        <span><span className="text-white font-semibold">{groupesCount}</span> groupe{groupesCount > 1 ? "s" : ""}</span>
        <span><span className="text-white font-semibold">{stagiaires.length}</span> stagiaires</span>
      </div>
      {barData.length > 0 ? (
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={barData} margin={{ top: 0, right: 5, bottom: 25, left: -20 }}>
            <XAxis dataKey="name" tick={{ fill: "#6B7280", fontSize: 9 }} angle={-30} textAnchor="end" interval={0} />
            <YAxis domain={[0, 100]} tick={{ fill: "#6B7280", fontSize: 9 }} unit="%" />
            <Tooltip {...tooltipStyle} formatter={(v) => [`${v as number}%`, "Moy."]} />
            <Bar dataKey="val" radius={[3, 3, 0, 0]} maxBarSize={30}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={entry.val >= 75 ? "#39C84A" : entry.val >= 50 ? "#F59E0B" : "#EF4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-xs text-center py-6" style={{ color: "#4B5563" }}>Aucune donnée de progression saisie</p>
      )}
    </div>
  );
}
