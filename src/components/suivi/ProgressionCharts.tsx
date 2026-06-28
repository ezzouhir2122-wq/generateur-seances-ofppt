"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import { CompetenceItem, StagiaireItem } from "@/types/suivi";

interface Props {
  competences: CompetenceItem[];
  stagiaires: StagiaireItem[];
  selectedStagiaireId: string | null;
}

const tooltipStyle = {
  contentStyle: { background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#374151", fontSize: 12, borderRadius: 8 },
  cursor: { fill: "#0A4DA810" },
};

function pctColor(v: number): string {
  return v >= 75 ? "#0A4DA8" : v >= 50 ? "#F59E0B" : "#EF4444";
}

function shortLabel(titre: string, max = 14): string {
  return titre.length > max ? titre.slice(0, max) + "…" : titre;
}

export default function ProgressionCharts({ competences, stagiaires, selectedStagiaireId }: Props) {
  const [tab, setTab] = useState<"groupe" | "profil">("groupe");

  // BarChart data: moyenne par compétence
  const barData = competences.map((c) => {
    const vals = stagiaires
      .map((s) => s.progressions.find((p) => p.competenceId === c.id)?.pourcentage ?? null)
      .filter((v): v is number => v !== null);
    return {
      name: shortLabel(c.titre),
      moyenne: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0,
    };
  });

  // RadarChart data: profil stagiaire sélectionné
  const selectedStagiaire = stagiaires.find((s) => s.id === selectedStagiaireId);
  const radarData = competences.map((c) => ({
    competence: shortLabel(c.titre, 12),
    score: selectedStagiaire?.progressions.find((p) => p.competenceId === c.id)?.pourcentage ?? 0,
  }));

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
    >
      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {(["groupe", "profil"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-1.5 text-xs rounded-lg font-medium transition-colors"
            style={
              tab === t
                ? { background: "#0A4DA818", color: "#0A4DA8", border: "1px solid #0A4DA830" }
                : { border: "1px solid #E2E8F0", color: "#6B7280" }
            }
          >
            {t === "groupe" ? "Moyenne groupe" : "Profil stagiaire"}
          </button>
        ))}
      </div>

      {tab === "groupe" && (
        <>
          <p className="text-xs mb-3" style={{ color: "#6B7280" }}>Moyenne de progression par compétence</p>
          {barData.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: "#4B5563" }}>
              Aucune compétence référentiel pour cette filière
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 5, right: 10, bottom: 30, left: 0 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#6B7280", fontSize: 10 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis domain={[0, 100]} tick={{ fill: "#6B7280", fontSize: 10 }} unit="%" />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v as number}%`, "Moyenne"]} />
                <Bar dataKey="moyenne" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={pctColor(entry.moyenne)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </>
      )}

      {tab === "profil" && (
        <>
          {!selectedStagiaire ? (
            <p className="text-xs text-center py-8" style={{ color: "#4B5563" }}>
              Cliquez sur un stagiaire dans le tableau pour voir son profil
            </p>
          ) : (
            <>
              <p className="text-xs mb-3" style={{ color: "#6B7280" }}>
                Profil de <span className="font-medium" style={{ color: "#0A4DA8" }}>{selectedStagiaire.prenom} {selectedStagiaire.nom}</span>
              </p>
              <ResponsiveContainer width="100%" height={230}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="competence" tick={{ fill: "#6B7280", fontSize: 9 }} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [`${v as number}%`, "Score"]} />
                  <Radar dataKey="score" stroke="#0A4DA8" fill="#0A4DA8" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </>
          )}
        </>
      )}
    </div>
  );
}
