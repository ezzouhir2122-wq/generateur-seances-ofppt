"use client";

import { useState, useEffect } from "react";
import type { EvaluationFormData, EvaluationType } from "@/types/seance";
import { FILIERES_OFPPT } from "@/types/seance";

interface ModuleItem { module: string; mhg: number; codeModule?: string; }

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

  const [groupes, setGroupes] = useState<string[]>([]);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [hasImport, setHasImport] = useState(false);

  useEffect(() => {
    fetch("/api/modules?distinct=groupe")
      .then(r => r.json())
      .then((data: string[]) => { if (Array.isArray(data) && data.length > 0) { setGroupes(data); setHasImport(true); } })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.filiere || !hasImport) { setModules([]); return; }
    fetch(`/api/modules?groupe=${encodeURIComponent(form.filiere)}`)
      .then(r => r.json())
      .then((data: ModuleItem[]) => setModules(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [form.filiere, hasImport]);

  const set = (field: keyof EvaluationFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleFiliereChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, filiere: e.target.value, module: "", codeModule: "" }));
  };

  const handleModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = modules.find(m => m.module === e.target.value);
    setForm(prev => ({ ...prev, module: e.target.value, codeModule: found?.codeModule ?? "" }));
  };

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

      {/* Filière */}
      <div>
        <label className="label">Filière *</label>
        {hasImport ? (
          <select className="input-field" value={form.filiere} onChange={handleFiliereChange} required>
            <option value="">— Choisir une filière —</option>
            {groupes.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        ) : (
          <select className="input-field" value={form.filiere} onChange={set("filiere")} required>
            <option value="">— Choisir une filière —</option>
            {FILIERES_OFPPT.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        )}
      </div>

      {/* Module */}
      {hasImport ? (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Code module</label>
            <input type="text" className="input-field font-mono text-sm" style={{ background: "#F3F4F6", color: "#4B5563" }}
              value={form.codeModule ?? ""} readOnly placeholder="—" />
          </div>
          <div className="col-span-2">
            <label className="label">Module *</label>
            <select className="input-field" value={form.module} onChange={handleModuleChange} required disabled={!form.filiere}>
              <option value="">— Choisir un module —</option>
              {modules.map(m => <option key={m.module} value={m.module}>{m.module}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div>
          <label className="label">Module *</label>
          <input className="input-field" placeholder="Ex: M201 — Comptabilité générale" value={form.module} onChange={set("module")} required />
        </div>
      )}

      {/* Niveau + Année */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Niveau</label>
          <select className="input-field" value={form.niveau} onChange={set("niveau")}>
            <option value="TS">Technicien Spécialisé</option>
            <option value="T">Technicien</option>
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
