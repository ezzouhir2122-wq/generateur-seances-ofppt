"use client";

import { useState } from "react";
import type { EvaluationFormData, EvaluationType } from "@/types/seance";
import ReferentielCascade, { ReferentielSelection } from "./ReferentielCascade";

interface Props {
  onGenerate: (data: EvaluationFormData) => void;
  isLoading: boolean;
  initial?: Partial<EvaluationFormData>;
}

const TYPES: { value: EvaluationType; label: string; icon: string; desc: string }[] = [
  { value: "qcm", label: "QCM", icon: "☑", desc: "Questions + Réponses + Corrigé" },
  { value: "exercices", label: "Exercices", icon: "✏", desc: "Exercices pratiques corrigés" },
  { value: "controle", label: "Contrôle continu", icon: "📋", desc: "Cours + QCM + Application" },
  { value: "examen", label: "Examen", icon: "📝", desc: "Sujet + Corrigé + Barème" },
  { value: "rattrapage", label: "Rattrapage", icon: "🔄", desc: "Session de rattrapage" },
];

export default function EvaluationForm({ onGenerate, isLoading, initial }: Props) {
  const [form, setForm] = useState<EvaluationFormData>({
    type: "qcm",
    filiere: "",
    module: "",
    codeModule: "",
    niveau: "TS",
    annee: "1ere-annee",
    theme: "",
    nbQuestions: 10,
    nbExercices: 3,
    dureeExamen: "2h",
    themesCouverts: "",
    ...initial,
  });

  const handleReferentielChange = (sel: ReferentielSelection) => {
    setForm(prev => ({
      ...prev,
      filiere: sel.filiere,
      module: sel.module,
      codeModule: sel.codeModule,
      mhg: sel.mhg,
      annee: sel.annee,
      theme: sel.competence || prev.theme,
      themesCouverts: sel.competences?.join(", ") || prev.themesCouverts,
    }));
  };

  const set = (field: keyof EvaluationFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(form);
  };

  const activeType = TYPES.find(t => t.value === form.type)!;

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}
    >
      {/* ── En-tête ── */}
      <div style={{
        padding: "18px 22px 14px",
        borderBottom: "1px solid #E5E7EB",
        background: "#F9FAFB",
        flexShrink: 0,
      }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0A4DA8", margin: 0, letterSpacing: "-0.01em" }}>
          Paramètres de l&apos;évaluation
        </h2>
        <p style={{ fontSize: "11.5px", color: "#9CA3AF", marginTop: "3px", lineHeight: 1.4 }}>
          Choisissez le type et renseignez le module pour générer votre évaluation.
        </p>
      </div>

      {/* ── Corps scrollable ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Type selector */}
        <div>
          <label className="label">Type d&apos;évaluation *</label>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map(t => (
              <label
                key={t.value}
                className="flex items-start gap-2.5 p-3 rounded-xl cursor-pointer transition-colors"
                style={
                  form.type === t.value
                    ? { border: "1px solid #0A4DA840", background: "#0A4DA814" }
                    : { border: "1px solid #E2E8F0", background: "#F3F4F6" }
                }
              >
                <input type="radio" name="type" value={t.value} className="hidden" checked={form.type === t.value}
                  onChange={() => setForm(prev => ({ ...prev, type: t.value }))} />
                <span className="text-lg leading-none mt-0.5">{t.icon}</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: form.type === t.value ? "#0A4DA8" : "#374151" }}>{t.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#6B7280" }}>{t.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Référentiel cascade (filière → module → compétences) */}
        <ReferentielCascade
          onChange={handleReferentielChange}
          initial={{
            filiere: initial?.filiere,
            codeModule: initial?.codeModule,
            module: initial?.module,
            annee: initial?.annee,
          }}
        />

        {/* Niveau */}
        <div>
          <label className="label">Niveau</label>
          <select className="input-field" value={form.niveau} onChange={set("niveau")}>
            <option value="TS">Technicien Spécialisé</option>
            <option value="T">Technicien</option>
          </select>
        </div>

        {/* Champs spécifiques au type */}
        {form.type === "qcm" && (
          <>
            <div>
              <label className="label">Thème / Chapitre</label>
              <input className="input-field" placeholder="Ex: Les opérations de trésorerie" value={form.theme ?? ""} onChange={set("theme")} />
            </div>
            <div>
              <label className="label">Nombre de questions</label>
              <input
                type="number"
                className="input-field"
                placeholder="Ex: 10, 15, 20…"
                min={1}
                value={form.nbQuestions ?? ""}
                onChange={e => setForm(prev => ({ ...prev, nbQuestions: e.target.value ? parseInt(e.target.value) : undefined }))}
              />
            </div>
          </>
        )}

        {form.type === "exercices" && (
          <>
            <div>
              <label className="label">Thème / Chapitre</label>
              <input className="input-field" placeholder="Ex: Calcul des amortissements" value={form.theme ?? ""} onChange={set("theme")} />
            </div>
            <div>
              <label className="label">Nombre d&apos;exercices</label>
              <div className="flex gap-2">
                {[2, 3, 4, 5].map(n => (
                  <label key={n} className="flex-1 rounded-lg py-2 text-sm text-center cursor-pointer transition-colors"
                    style={
                      form.nbExercices === n
                        ? { border: "1px solid #0A4DA840", background: "#0A4DA814", color: "#0A4DA8", fontWeight: 600 }
                        : { border: "1px solid #E2E8F0", color: "#9CA3AF" }
                    }>
                    <input type="radio" name="nbExercices" className="hidden" checked={form.nbExercices === n}
                      onChange={() => setForm(prev => ({ ...prev, nbExercices: n }))} />
                    {n}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {form.type === "controle" && (
          <>
            <div>
              <label className="label">Thème / Chapitre évalué</label>
              <input className="input-field" placeholder="Ex: Comptabilité des stocks" value={form.theme ?? ""} onChange={set("theme")} />
            </div>
            <div>
              <label className="label">Durée du contrôle</label>
              <input className="input-field" placeholder="Ex: 45min, 1h, 1h30…" value={form.dureeExamen ?? ""} onChange={set("dureeExamen")} />
            </div>
          </>
        )}

        {(form.type === "examen" || form.type === "rattrapage") && (
          <>
            <div>
              <label className="label">Durée de l&apos;examen</label>
              <input className="input-field" placeholder="Ex: 1h30, 2h, 3h…" value={form.dureeExamen ?? ""} onChange={set("dureeExamen")} />
            </div>
            <div>
              <label className="label">Thèmes couverts</label>
              <textarea className="input-field resize-none" rows={2}
                placeholder="Ex: Comptabilité générale, bilan, compte de résultat..."
                value={form.themesCouverts ?? ""} onChange={set("themesCouverts")} />
            </div>
          </>
        )}

      </div>{/* fin corps scrollable */}

      {/* ── Pied de page ── */}
      <div style={{
        padding: "14px 22px 18px",
        borderTop: "1px solid #E5E7EB",
        background: "#FFFFFF",
        flexShrink: 0,
      }}>
        <button
          type="submit"
          className="btn-primary w-full"
          disabled={isLoading}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Génération en cours…
            </>
          ) : `☑ Générer ${activeType.label}`}
        </button>
      </div>
    </form>
  );
}
