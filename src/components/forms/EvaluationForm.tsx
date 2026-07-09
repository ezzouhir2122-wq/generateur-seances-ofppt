"use client";

import { useState } from "react";
import type { EvaluationFormData, EvaluationType } from "@/types/seance";
import ReferentielCascade, { ReferentielSelection } from "./ReferentielCascade";

interface Props {
  onGenerate: (data: EvaluationFormData) => void;
  isLoading: boolean;
  initial?: Partial<EvaluationFormData>;
}

const TYPES_OFFICIELS: { value: EvaluationType; label: string; sublabel: string; icon: string; color: string }[] = [
  { value: "cc",  label: "CC",  sublabel: "Contrôle Continu",       icon: "📋", color: "#0A4DA8" },
  { value: "efm", label: "EFM", sublabel: "Examen de Fin de Module", icon: "📝", color: "#E8651A" },
];

const TYPES_AUTRES: { value: EvaluationType; label: string; icon: string; desc: string }[] = [
  { value: "qcm",       label: "QCM",        icon: "☑",  desc: "Questions + Corrigé" },
  { value: "exercices", label: "Exercices",   icon: "✏",  desc: "Exercices corrigés"  },
  { value: "rattrapage",label: "Rattrapage",  icon: "🔄", desc: "Session de rattrapage" },
];

export default function EvaluationForm({ onGenerate, isLoading, initial }: Props) {
  const [form, setForm] = useState<EvaluationFormData>({
    type: "efm",
    filiere: "",
    module: "",
    codeModule: "",
    niveau: "TS",
    annee: "2eme-annee",
    anneePromo: "2A",
    baremeTotal: 40,
    partieTheoriePts: 20,
    partiePratiquePts: 20,
    dureeExamen: "2h",
    etablissement: "",
    groupe: "",
    dateExamen: "",
    themesCouverts: "",
    theme: "",
    nbQuestions: 10,
    nbExercices: 3,
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

  const setNum = (field: keyof EvaluationFormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value ? parseInt(e.target.value) : undefined }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(form);
  };

  const isOfficial = form.type === "cc" || form.type === "efm";

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}
    >
      {/* ── En-tête ── */}
      <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB", flexShrink: 0 }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0A4DA8", margin: 0 }}>
          Paramètres de l&apos;évaluation
        </h2>
        <p style={{ fontSize: "11.5px", color: "#9CA3AF", marginTop: "3px", lineHeight: 1.4 }}>
          Choisissez CC ou EFM pour générer selon le canevas officiel OFPPT.
        </p>
      </div>

      {/* ── Corps scrollable ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* ─ Types officiels CC / EFM ─ */}
        <div>
          <label className="label" style={{ marginBottom: "6px", display: "block", fontSize: "11px", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Type officiel OFPPT *
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
            {TYPES_OFFICIELS.map(t => (
              <label
                key={t.value}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  padding: "14px 10px", borderRadius: "12px", cursor: "pointer", transition: "all 0.15s",
                  border: form.type === t.value ? `2px solid ${t.color}` : "2px solid #E2E8F0",
                  background: form.type === t.value ? `${t.color}10` : "#F9FAFB",
                  gap: "4px",
                }}
              >
                <input type="radio" name="type" value={t.value} className="hidden"
                  checked={form.type === t.value}
                  onChange={() => setForm(prev => ({ ...prev, type: t.value }))} />
                <span style={{ fontSize: "22px" }}>{t.icon}</span>
                <span style={{ fontSize: "16px", fontWeight: 800, color: form.type === t.value ? t.color : "#374151" }}>{t.label}</span>
                <span style={{ fontSize: "10px", color: "#6B7280", textAlign: "center", lineHeight: 1.3 }}>{t.sublabel}</span>
              </label>
            ))}
          </div>

          {/* Séparateur + Autres types */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "8px 0 6px" }}>
            <div style={{ flex: 1, height: "1px", background: "#E5E7EB" }} />
            <span style={{ fontSize: "10px", color: "#9CA3AF", fontWeight: 500 }}>Autres types</span>
            <div style={{ flex: 1, height: "1px", background: "#E5E7EB" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
            {TYPES_AUTRES.map(t => (
              <label key={t.value}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 6px",
                  borderRadius: "10px", cursor: "pointer", gap: "2px",
                  border: form.type === t.value ? "1.5px solid #0A4DA860" : "1.5px solid #E2E8F0",
                  background: form.type === t.value ? "#0A4DA810" : "#F3F4F6",
                }}
              >
                <input type="radio" name="type" value={t.value} className="hidden"
                  checked={form.type === t.value}
                  onChange={() => setForm(prev => ({ ...prev, type: t.value }))} />
                <span style={{ fontSize: "16px" }}>{t.icon}</span>
                <span style={{ fontSize: "10px", fontWeight: 600, color: form.type === t.value ? "#0A4DA8" : "#374151" }}>{t.label}</span>
                <span style={{ fontSize: "9px", color: "#9CA3AF", textAlign: "center" }}>{t.desc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* ─ Référentiel cascade ─ */}
        <ReferentielCascade
          onChange={handleReferentielChange}
          initial={{ filiere: initial?.filiere, codeModule: initial?.codeModule, module: initial?.module, annee: initial?.annee }}
        />

        {/* ─ Niveau ─ */}
        <div>
          <label className="label">Niveau</label>
          <select className="input-field" value={form.niveau} onChange={set("niveau")}>
            <option value="TS">Technicien Spécialisé</option>
            <option value="T">Technicien</option>
          </select>
        </div>

        {/* ─ Champs canevas officiel CC / EFM ─ */}
        {isOfficial && (
          <>
            <div style={{ padding: "12px 14px", borderRadius: "10px", background: "#EEF3FB", border: "1px solid #0A4DA820" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#0A4DA8", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                📋 En-tête canevas officiel
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div>
                  <label className="label">Établissement</label>
                  <input className="input-field" placeholder="Ex: ISGI Marrakech" value={form.etablissement ?? ""} onChange={set("etablissement")} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label className="label">Groupe</label>
                    <input className="input-field" placeholder="Ex: G101" value={form.groupe ?? ""} onChange={set("groupe")} />
                  </div>
                  <div>
                    <label className="label">Année</label>
                    <select className="input-field" value={form.anneePromo ?? "2A"}
                      onChange={e => setForm(prev => ({ ...prev, anneePromo: e.target.value as "1A" | "2A" }))}>
                      <option value="1A">1ère Année</option>
                      <option value="2A">2ème Année</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label className="label">Durée</label>
                    <input className="input-field" placeholder="Ex: 2h, 1h30" value={form.dureeExamen ?? ""} onChange={set("dureeExamen")} />
                  </div>
                  <div>
                    <label className="label">Date</label>
                    <input className="input-field" type="date" value={form.dateExamen ?? ""} onChange={set("dateExamen")} />
                  </div>
                </div>
                <div>
                  <label className="label">Barème total</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                    {[20, 40, 60].map(n => (
                      <label key={n}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: "7px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "13px",
                          border: form.baremeTotal === n ? "2px solid #0A4DA8" : "2px solid #E2E8F0",
                          background: form.baremeTotal === n ? "#0A4DA810" : "#F9FAFB",
                          color: form.baremeTotal === n ? "#0A4DA8" : "#6B7280",
                        }}>
                        <input type="radio" name="bareme" className="hidden" checked={form.baremeTotal === n}
                          onChange={() => setForm(prev => ({ ...prev, baremeTotal: n }))} />
                        /{n}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label className="label">Pts Théorie</label>
                    <input className="input-field" type="number" min={0}
                      placeholder={`Ex: ${(form.baremeTotal ?? 40) / 2}`}
                      value={form.partieTheoriePts ?? ""}
                      onChange={setNum("partieTheoriePts")} />
                  </div>
                  <div>
                    <label className="label">Pts Pratique</label>
                    <input className="input-field" type="number" min={0}
                      placeholder={`Ex: ${(form.baremeTotal ?? 40) / 2}`}
                      value={form.partiePratiquePts ?? ""}
                      onChange={setNum("partiePratiquePts")} />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="label">Thèmes / Chapitres couverts</label>
              <textarea className="input-field resize-none" rows={2}
                placeholder="Ex: Comptabilité générale, bilan, compte de résultat..."
                value={form.themesCouverts ?? ""} onChange={set("themesCouverts")} />
            </div>
          </>
        )}

        {/* ─ Champs types autres ─ */}
        {form.type === "qcm" && (
          <>
            <div>
              <label className="label">Thème / Chapitre</label>
              <input className="input-field" placeholder="Ex: Les opérations de trésorerie" value={form.theme ?? ""} onChange={set("theme")} />
            </div>
            <div>
              <label className="label">Nombre de questions</label>
              <input type="number" className="input-field" placeholder="Ex: 10, 15, 20…" min={1}
                value={form.nbQuestions ?? ""} onChange={setNum("nbQuestions")} />
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
                  <label key={n} className="flex-1 rounded-lg py-2 text-sm text-center cursor-pointer"
                    style={form.nbExercices === n
                      ? { border: "1px solid #0A4DA840", background: "#0A4DA814", color: "#0A4DA8", fontWeight: 600 }
                      : { border: "1px solid #E2E8F0", color: "#9CA3AF" }}>
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
              <label className="label">Thème évalué</label>
              <input className="input-field" placeholder="Ex: Comptabilité des stocks" value={form.theme ?? ""} onChange={set("theme")} />
            </div>
            <div>
              <label className="label">Durée</label>
              <input className="input-field" placeholder="Ex: 45min, 1h, 1h30…" value={form.dureeExamen ?? ""} onChange={set("dureeExamen")} />
            </div>
          </>
        )}

        {(form.type === "examen" || form.type === "rattrapage") && (
          <>
            <div>
              <label className="label">Durée</label>
              <input className="input-field" placeholder="Ex: 1h30, 2h, 3h…" value={form.dureeExamen ?? ""} onChange={set("dureeExamen")} />
            </div>
            <div>
              <label className="label">Thèmes couverts</label>
              <textarea className="input-field resize-none" rows={2}
                placeholder="Ex: Comptabilité générale, bilan..."
                value={form.themesCouverts ?? ""} onChange={set("themesCouverts")} />
            </div>
          </>
        )}

      </div>

      {/* ── Pied de page ── */}
      <div style={{ padding: "14px 22px 18px", borderTop: "1px solid #E5E7EB", background: "#FFFFFF", flexShrink: 0 }}>
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
          ) : `Générer ${form.type === "efm" ? "l'EFM" : form.type === "cc" ? "le CC" : "l'évaluation"}`}
        </button>
      </div>
    </form>
  );
}
