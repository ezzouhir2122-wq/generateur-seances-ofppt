"use client";

import { useState, useEffect } from "react";
import type { FicheFormData } from "@/types/seance";
import ReferentielCascade, { ReferentielSelection } from "./ReferentielCascade";

interface Props {
  onGenerate: (data: FicheFormData) => void;
  isLoading: boolean;
  defaultValues?: Partial<FicheFormData>;
}

export default function FicheForm({ onGenerate, isLoading, defaultValues }: Props) {
  const [form, setForm] = useState<FicheFormData>({
    filiere: "",
    module: "",
    codeModule: "",
    intitule: "",
    formateur: "",
    duree: "2h",
    type: "theorique",
    niveau: "TS",
    annee: "1ere-annee",
    prerequis: "",
    competence: "",
    competences: [],
    ...defaultValues,
  });

  useEffect(() => {
    if (defaultValues) setForm((prev) => ({ ...prev, ...defaultValues }));
  }, [defaultValues]);

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

  const set = (field: keyof FicheFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="text-base font-bold pb-3" style={{ color: "#0A4DA8", borderBottom: "1px solid #E2E8F0" }}>
        Paramètres de la fiche
      </h2>

      <ReferentielCascade
        onChange={handleReferentielChange}
        initial={{
          filiere: defaultValues?.filiere,
          codeModule: defaultValues?.codeModule,
          module: defaultValues?.module,
          mhg: defaultValues?.mhg,
          competence: defaultValues?.competence,
          competences: defaultValues?.competences,
          annee: defaultValues?.annee,
        }}
      />

      {/* ── Informations fiche ── */}
      <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "12px" }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>
          Informations fiche
        </p>

        <div className="space-y-3">
          <div>
            <label className="label">Intitulé de la séance *</label>
            <input
              className="input-field"
              placeholder="Ex: Les opérations de trésorerie"
              value={form.intitule}
              onChange={set("intitule")}
              required
            />
          </div>

          <div>
            <label className="label">Nom du formateur *</label>
            <input
              className="input-field"
              placeholder="Prénom NOM"
              value={form.formateur}
              onChange={set("formateur")}
              required
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="label">Durée</label>
              <select className="input-field" value={form.duree} onChange={set("duree")}>
                {["1h", "2h", "2h30", "3h", "4h", "6h"].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Niveau</label>
              <select className="input-field" value={form.niveau} onChange={set("niveau")}>
                <option value="TS">TS</option>
                <option value="T">T</option>
              </select>
            </div>
            <div>
              <label className="label">Année</label>
              <select className="input-field" value={form.annee} onChange={set("annee")}>
                <option value="1ere-annee">1ère An.</option>
                <option value="2eme-annee">2ème An.</option>
                <option value="3eme-annee">3ème An.</option>
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input-field" value={form.type} onChange={set("type")}>
                <option value="theorique">Théorique</option>
                <option value="tp">TP</option>
                <option value="ta">TA</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg px-3 py-2.5 flex items-start gap-2" style={{ background: "#0A4DA810", border: "1px solid #0A4DA830" }}>
            <span>✨</span>
            <p className="text-xs" style={{ color: "#4B5563" }}>
              Les <strong>objectifs pédagogiques</strong> (Savoir, Savoir-faire, Savoir-être) sont
              générés automatiquement et insérés dans la fiche PDF.
            </p>
          </div>

          <div>
            <label className="label">Prérequis des stagiaires</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="Connaissances préalables requises (optionnel)"
              value={form.prerequis}
              onChange={set("prerequis")}
            />
          </div>
        </div>
      </div>

      <button type="submit" className="btn-primary w-full" disabled={isLoading}>
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Génération en cours…
          </span>
        ) : "Générer la fiche pédagogique"}
      </button>
    </form>
  );
}
