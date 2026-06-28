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
  contentStyle: {
    background: "#0D1117",
    border: "1px solid rgba(255,255,255,0.07)",
    color: "#F1F5F9",
    fontSize: 11,
    borderRadius: 8,
  },
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
      <div style={{
        background: "#131922",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "16px",
        padding: "32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
      }}>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.60)" }}>Suivi des Compétences</p>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.30)" }}>Aucun groupe créé</p>
        <Link href="/suivi/nouveau" style={{ fontSize: "12px", fontWeight: 600, color: "#4B8EE8" }}>
          Créer un groupe →
        </Link>
      </div>
    );
  }

  return (
    <div style={{
      background: "#131922",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "16px",
      padding: "24px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#4B8EE8" }}>
            PROGRESSION
          </span>
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "9px" }}>·</span>
          <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.35)" }}>
            PAR COMPÉTENCE
          </span>
        </div>
        <Link href="/suivi" style={{ fontSize: "11px", fontWeight: 600, color: "#4B8EE8" }}>Voir tout →</Link>
      </div>

      <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.40)" }}>
          <span style={{ fontWeight: 700, color: "#4B8EE8" }}>{groupesCount}</span> groupe{groupesCount > 1 ? "s" : ""}
        </span>
        <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.40)" }}>
          <span style={{ fontWeight: 700, color: "#4B8EE8" }}>{stagiaires.length}</span> stagiaires
        </span>
      </div>

      {barData.length > 0 ? (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={barData} margin={{ top: 0, right: 5, bottom: 28, left: -20 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9 }}
              angle={-30}
              textAnchor="end"
              interval={0}
              axisLine={{ stroke: "rgba(255,255,255,0.07)" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9 }}
              unit="%"
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              {...tooltipStyle}
              formatter={(v) => [`${v as number}%`, "Moy."]}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Bar dataKey="val" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {barData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.val >= 75 ? "#4ADE80" : entry.val >= 50 ? "#FBBF24" : "#EF4444"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p style={{ fontSize: "12px", textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.30)" }}>
          Aucune donnée de progression saisie
        </p>
      )}

      {/* Légende */}
      <div style={{ display: "flex", gap: "20px", marginTop: "8px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {[
          { color: "#4ADE80", label: "≥ 75% — Maîtrisé" },
          { color: "#FBBF24", label: "≥ 50% — En cours" },
          { color: "#EF4444", label: "< 50% — À renforcer" },
        ].map((item) => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
