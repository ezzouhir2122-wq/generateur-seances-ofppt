"use client";

import React from "react";

export interface CompetenceModuleGroup {
  moduleId: string;
  moduleNom: string;
  moduleCode: string | null;
  competences: { id: string; titre: string }[];
}

interface Props {
  groups: CompetenceModuleGroup[];
  selected: string[];
  onChange: (ids: string[]) => void;
  loading?: boolean;
}

export default function CompetenceSelector({ groups, selected, onChange, loading }: Props) {
  const selectedSet = new Set(selected);
  const allIds = groups.flatMap((g) => g.competences.map((c) => c.id));
  const allChecked = allIds.length > 0 && allIds.every((id) => selectedSet.has(id));

  const toggle = (id: string) => {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  const toggleModule = (g: CompetenceModuleGroup) => {
    const ids = g.competences.map((c) => c.id);
    const allModChecked = ids.every((id) => selectedSet.has(id));
    const next = new Set(selectedSet);
    if (allModChecked) ids.forEach((id) => next.delete(id));
    else ids.forEach((id) => next.add(id));
    onChange([...next]);
  };

  const toggleAll = () => onChange(allChecked ? [] : allIds);

  if (loading) {
    return (
      <div className="rounded-xl px-4 py-6 text-center text-sm" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#9CA3AF" }}>
        Chargement des compétences…
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-xl px-4 py-6 text-center" style={{ background: "#F8FAFC", border: "1px dashed #E2E8F0" }}>
        <p className="text-sm" style={{ color: "#374151" }}>Aucune compétence dans le référentiel de cette filière</p>
        <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
          Importez un référentiel détaillé (avec compétences) via Modules &amp; Paramètres
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Barre globale */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium" style={{ color: "#6B7280" }}>
          {selected.length} / {allIds.length} compétence{allIds.length > 1 ? "s" : ""} sélectionnée{selected.length > 1 ? "s" : ""}
        </span>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs font-medium transition-colors"
          style={{ color: "#0A4DA8" }}
        >
          {allChecked ? "Tout désélectionner" : "Tout sélectionner"}
        </button>
      </div>

      {/* Modules */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {groups.map((g) => {
          const ids = g.competences.map((c) => c.id);
          const modChecked = ids.every((id) => selectedSet.has(id));
          const modPartial = !modChecked && ids.some((id) => selectedSet.has(id));
          return (
            <div key={g.moduleId} className="rounded-xl overflow-hidden" style={{ border: "1px solid #E2E8F0" }}>
              <button
                type="button"
                onClick={() => toggleModule(g)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                style={{ background: "#F3F4F6" }}
              >
                <span
                  className="w-4 h-4 rounded flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
                  style={{
                    background: modChecked ? "#0A4DA8" : modPartial ? "#0A4DA880" : "#FFFFFF",
                    border: `1px solid ${modChecked || modPartial ? "#0A4DA8" : "#CBD5E1"}`,
                  }}
                >
                  {modChecked ? "✓" : modPartial ? "–" : ""}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold truncate" style={{ color: "#111827" }}>
                    {g.moduleCode ? <span className="font-mono mr-1.5" style={{ color: "#6B7280" }}>{g.moduleCode}</span> : null}
                    {g.moduleNom}
                  </span>
                  <span className="block text-[10px]" style={{ color: "#6B7280" }}>
                    {g.competences.length} compétence{g.competences.length > 1 ? "s" : ""}
                  </span>
                </span>
              </button>

              <div style={{ borderTop: "1px solid #E2E8F0" }}>
                {g.competences.map((c, idx) => {
                  const checked = selectedSet.has(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors"
                      style={{ borderTop: idx > 0 ? "1px solid #F3F4F6" : undefined, background: "#FFFFFF" }}
                    >
                      <span
                        className="w-4 h-4 rounded flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
                        style={{
                          background: checked ? "#0A4DA8" : "#FFFFFF",
                          border: `1px solid ${checked ? "#0A4DA8" : "#CBD5E1"}`,
                        }}
                      >
                        {checked ? "✓" : ""}
                      </span>
                      <input type="checkbox" className="hidden" checked={checked} onChange={() => toggle(c.id)} />
                      <span className="text-xs" style={{ color: checked ? "#111827" : "#6B7280" }}>{c.titre}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
