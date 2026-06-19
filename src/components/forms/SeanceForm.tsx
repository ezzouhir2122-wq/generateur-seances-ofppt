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
    niveauApprentissage: "intermediaire",
    mode: "presentiel",
    ...initial,
  });

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

  const set = (field: keyof SeanceFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

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

      {/* ── Paramètres séance ── */}
      <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "12px" }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>
          Paramètres séance
        </p>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="label">Durée</label>
            <select className="input-field" value={form.duree} onChange={set("duree")}>
              <option value="2h30">2h30</option>
              <option value="5h">5h</option>
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
              <option value="1ere-annee">1ère Année</option>
              <option value="2eme-annee">2ème Année</option>
              <option value="3eme-annee">3ème Année</option>
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label className="label">Type de séance</label>
          <div className="flex gap-2">
            {[
              { value: "theorique", label: "Cours théorique" },
              { value: "tp", label: "Travaux Pratiques" },
              { value: "ta", label: "Travaux d'Application" },
            ].map((t) => (
              <label
                key={t.value}
                className="flex-1 rounded-lg px-2 py-2 text-xs text-center cursor-pointer transition-colors"
                style={
                  form.type === t.value
                    ? { border: "1px solid #0A4DA840", background: "#0A4DA814", color: "#0A4DA8", fontWeight: 600 }
                    : { border: "1px solid #E2E8F0", color: "#9CA3AF" }
                }
              >
                <input type="radio" name="type" value={t.value} className="hidden" checked={form.type === t.value} onChange={set("type")} />
                {t.label}
              </label>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label className="label">Niveau d&apos;apprentissage</label>
          <div className="flex gap-2">
            {[
              { value: "debutant", label: "Débutant", icon: "○" },
              { value: "intermediaire", label: "Intermédiaire", icon: "◑" },
              { value: "avance", label: "Avancé", icon: "●" },
            ].map((n) => (
              <label
                key={n.value}
                className="flex-1 rounded-lg px-2 py-2 text-xs text-center cursor-pointer transition-colors"
                style={
                  form.niveauApprentissage === n.value
                    ? { border: "1px solid #0A4DA840", background: "#0A4DA814", color: "#0A4DA8", fontWeight: 600 }
                    : { border: "1px solid #E2E8F0", color: "#9CA3AF" }
                }
              >
                <input type="radio" name="niveauApprentissage" value={n.value} className="hidden"
                  checked={form.niveauApprentissage === n.value} onChange={set("niveauApprentissage")} />
                <span className="mr-1">{n.icon}</span>{n.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Mode de formation</label>
          <div className="flex gap-2">
            {[
              { value: "presentiel", label: "Présentiel" },
              { value: "distanciel", label: "Distanciel" },
              { value: "hybride", label: "Hybride" },
            ].map((m) => (
              <label
                key={m.value}
                className="flex-1 rounded-lg px-2 py-2 text-xs text-center cursor-pointer transition-colors"
                style={
                  form.mode === m.value
                    ? { border: "1px solid #0A4DA840", background: "#0A4DA814", color: "#0A4DA8", fontWeight: 600 }
                    : { border: "1px solid #E2E8F0", color: "#9CA3AF" }
                }
              >
                <input type="radio" name="mode" value={m.value} className="hidden" checked={form.mode === m.value} onChange={set("mode")} />
                {m.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <button type="submit" className="btn-primary w-full" disabled={isLoading}>
        {isLoading ? "Génération en cours..." : "Générer la séance"}
      </button>
    </form>
  );
}
