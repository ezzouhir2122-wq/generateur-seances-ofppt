"use client";

import { useState } from "react";
import { SeanceFormData } from "@/types/seance";
import ReferentielCascade, { ReferentielSelection } from "./ReferentielCascade";

interface Props {
  onGenerate: (data: SeanceFormData) => void;
  isLoading: boolean;
  initial?: Partial<SeanceFormData>;
}

export default function SeanceForm({ onGenerate, isLoading, initial }: Props) {
  const [form, setForm] = useState<SeanceFormData>({
    filiere: "",
    module: "",
    codeModule: "",
    duree: "2h30",
    niveau: "TS",
    annee: "1ere-annee",
    type: "theorique",
    competence: "",
    competences: [],
    ...initial,
  });

  const [saisieLibre, setSaisieLibre] = useState("");

  const handleReferentielChange = (sel: ReferentielSelection) => {
    setForm((prev) => ({
      ...prev,
      filiere: sel.filiere,
      module: sel.module,
      codeModule: sel.codeModule,
      mhg: sel.mhg,
      annee: sel.annee,
      competence: sel.competence,
      competences: sel.competences,
    }));
  };

  const handleSaisieLibre = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setSaisieLibre(val);
    setForm((prev) => ({
      ...prev,
      module: val.trim() || prev.module,
      filiere: prev.filiere || "Hors référentiel",
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.module) return;
    onGenerate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="text-base font-bold pb-3" style={{ color: "#0A4DA8", borderBottom: "1px solid #E2E8F0" }}>
        Paramètres de la séance
      </h2>

      <ReferentielCascade
        onChange={handleReferentielChange}
        initial={{
          filiere: initial?.filiere,
          codeModule: initial?.codeModule,
          module: initial?.module,
          mhg: initial?.mhg,
          competence: initial?.competence,
          competences: initial?.competences,
          annee: initial?.annee,
        }}
      />

      {/* ── Séance hors référentiel ── */}
      <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "12px" }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>
          Ou saisir manuellement
        </p>
        <label className="label">Intitulé de la séance (hors référentiel)</label>
        <textarea
          className="input-field resize-none"
          rows={3}
          placeholder="Ex : Les opérations de caisse — Saisie des écritures comptables..."
          value={saisieLibre}
          onChange={handleSaisieLibre}
        />
        <p className="text-[10px] mt-1" style={{ color: "#9CA3AF" }}>
          Remplissez ce champ si la séance n&apos;existe pas encore dans le référentiel.
        </p>
      </div>

      <button type="submit" className="btn-primary w-full" disabled={isLoading || !form.module}>
        {isLoading ? "Génération en cours..." : "Générer la séance"}
      </button>
    </form>
  );
}
