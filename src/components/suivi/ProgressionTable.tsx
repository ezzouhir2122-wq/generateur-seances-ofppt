"use client";

import React, { useState, useCallback } from "react";
import { CompetenceItem, StagiaireItem } from "@/types/suivi";
import ProgressionCharts from "./ProgressionCharts";
import { exportProgressionExcel, exportProgressionPDF } from "@/lib/export";

interface Props {
  groupeId: string;
  groupeNom: string;
  filiereNom: string;
  annee: string;
  initialStagiaires: StagiaireItem[];
  competences: CompetenceItem[];
}

function pctBadgeStyle(v: number | undefined): React.CSSProperties {
  if (v === undefined) return { color: "#4B5563", background: "#12121E" };
  if (v >= 75) return { color: "#84CC16", background: "#84CC1614" };
  if (v >= 50) return { color: "#F59E0B", background: "#F59E0B14" };
  return { color: "#EF4444", background: "#EF444414" };
}

export default function ProgressionTable({
  groupeId, groupeNom, filiereNom, annee,
  initialStagiaires, competences,
}: Props) {
  const [stagiaires, setStagiaires] = useState(initialStagiaires);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  const handleCellBlur = useCallback(
    async (stagiaireId: string, competenceId: string, value: string) => {
      const pourcentage = parseInt(value, 10);
      if (isNaN(pourcentage) || pourcentage < 0 || pourcentage > 100) return;

      setStagiaires((prev) =>
        prev.map((s) =>
          s.id !== stagiaireId
            ? s
            : {
                ...s,
                progressions: [
                  ...s.progressions.filter((p) => p.competenceId !== competenceId),
                  { competenceId, pourcentage, source: "manuel" },
                ],
              }
        )
      );

      await fetch("/api/progressions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stagiaireId, competenceId, pourcentage }),
      });
    },
    []
  );

  const handleImportNotes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/progressions/import-notes/${groupeId}`, { method: "POST", body: form });
    const json = await res.json();
    if (res.ok) {
      const refreshRes = await fetch(`/api/groupes/${groupeId}`);
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setStagiaires(data.stagiaires);
      }
      setImportMsg(`✓ ${json.imported} progression(s) importée(s)`);
    } else {
      setImportMsg(`Erreur : ${json.error}`);
    }
    setImporting(false);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => exportProgressionExcel(groupeNom, competences, stagiaires)}
          className="px-3 py-2 text-xs font-medium rounded-xl transition-colors"
          style={{ border: "1px solid #84CC1640", color: "#84CC16", background: "#84CC1610" }}
        >
          Export Excel
        </button>
        <button
          onClick={() => exportProgressionPDF(groupeNom, filiereNom, annee, competences, stagiaires)}
          className="px-3 py-2 text-xs font-medium rounded-xl transition-colors"
          style={{ border: "1px solid #84CC1640", color: "#84CC16", background: "#84CC1610" }}
        >
          Export PDF
        </button>
        <label
          className="px-3 py-2 text-xs font-medium rounded-xl cursor-pointer transition-colors"
          style={{ border: "1px solid #F59E0B40", color: "#F59E0B", background: "#F59E0B10" }}
        >
          {importing ? "Import…" : "Importer notes"}
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportNotes} disabled={importing} />
        </label>
        <a
          href={`/api/progressions/template/${groupeId}`}
          download
          className="px-3 py-2 text-xs rounded-xl transition-colors"
          style={{ border: "1px solid #1E1E2C", color: "#9CA3AF" }}
        >
          ↓ Template notes
        </a>
        {importMsg && (
          <span
            className="text-xs px-3 py-2 rounded-xl"
            style={{
              background: importMsg.startsWith("✓") ? "#84CC1614" : "#7F1D1D20",
              color: importMsg.startsWith("✓") ? "#84CC16" : "#EF4444",
              border: `1px solid ${importMsg.startsWith("✓") ? "#84CC1630" : "#7F1D1D40"}`,
            }}
          >
            {importMsg}
          </span>
        )}
      </div>

      {/* Layout 2 colonnes */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Tableau — 3/5 */}
        <div className="xl:col-span-3">
          {competences.length === 0 ? (
            <div
              className="flex flex-col items-center py-16 rounded-2xl"
              style={{ border: "1px dashed #1E1E2C" }}
            >
              <p className="text-sm mb-1 text-white">Aucune compétence référentiel</p>
              <p className="text-xs" style={{ color: "#6B7280" }}>
                Importez le référentiel de cette filière via Modules &amp; Paramètres
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid #1E1E2C" }}>
              <table className="text-xs min-w-full">
                <thead>
                  <tr style={{ background: "#12121E", borderBottom: "1px solid #1E1E2C" }}>
                    <th className="px-4 py-3 text-left font-semibold sticky left-0 z-10" style={{ color: "#6B7280", background: "#12121E", minWidth: 140 }}>
                      Stagiaire
                    </th>
                    {competences.map((c) => (
                      <th
                        key={c.id}
                        className="px-2 py-3 text-center font-semibold"
                        style={{ color: "#6B7280", minWidth: 80, maxWidth: 120 }}
                        title={`${c.titre} — ${c.moduleNom}`}
                      >
                        <span className="block truncate max-w-[100px]">{c.titre}</span>
                        <span className="block text-[9px] truncate max-w-[100px]" style={{ color: "#4B5563" }}>{c.moduleNom}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stagiaires.length === 0 ? (
                    <tr>
                      <td colSpan={competences.length + 1} className="text-center py-10" style={{ color: "#4B5563" }}>
                        Aucun stagiaire. <a href={`/suivi/${groupeId}/stagiaires`} className="underline" style={{ color: "#84CC16" }}>Ajouter des stagiaires →</a>
                      </td>
                    </tr>
                  ) : (
                    stagiaires.map((s, i) => (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedId(s.id === selectedId ? null : s.id)}
                        className="cursor-pointer transition-colors"
                        style={{
                          background: s.id === selectedId ? "#84CC1610" : i % 2 === 0 ? "#0D0D12" : "#111116",
                          borderBottom: "1px solid #1E1E2C",
                          outline: s.id === selectedId ? "1px solid #84CC1630" : "none",
                        }}
                      >
                        <td className="px-4 py-2.5 font-medium sticky left-0 z-10" style={{ background: "inherit", color: s.id === selectedId ? "#84CC16" : "#E5E7EB" }}>
                          {s.prenom} {s.nom}
                        </td>
                        {competences.map((c) => {
                          const prog = s.progressions.find((p) => p.competenceId === c.id);
                          return (
                            <td key={c.id} className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                defaultValue={prog?.pourcentage ?? ""}
                                placeholder="—"
                                onBlur={(e) => handleCellBlur(s.id, c.id, e.target.value)}
                                className="w-14 text-center rounded-lg py-1 text-xs font-semibold transition-colors"
                                style={{
                                  border: "1px solid #1E1E2C",
                                  outline: "none",
                                  ...pctBadgeStyle(prog?.pourcentage),
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Charts — 2/5 */}
        <div className="xl:col-span-2">
          <ProgressionCharts
            competences={competences}
            stagiaires={stagiaires}
            selectedStagiaireId={selectedId}
          />
        </div>
      </div>
    </div>
  );
}
