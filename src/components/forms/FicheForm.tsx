"use client";

import { useState, useEffect } from "react";
import type { FicheFormData } from "@/types/seance";
import { FILIERES_OFPPT } from "@/types/seance";

interface ModuleItem {
  module: string;
  mhg: number;
  codeModule?: string;
}

interface Props {
  onGenerate: (data: FicheFormData) => void;
  isLoading: boolean;
  defaultValues?: Partial<FicheFormData>;
}

export default function FicheForm({ onGenerate, isLoading, defaultValues }: Props) {
  const [form, setForm] = useState<FicheFormData>({
    filiere: "",
    module: "",
    intitule: "",
    formateur: "",
    duree: "2h",
    type: "theorique",
    niveau: "1ere-annee",
    objectifsSavoir: "",
    objectifsSavoirFaire: "",
    objectifsSavoirEtre: "",
    prerequis: "",
    ...defaultValues,
  });

  const [groupes, setGroupes] = useState<string[]>([]);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [hasImport, setHasImport] = useState(false);
  const [mhgInfo, setMhgInfo] = useState<number | null>(null);

  // Charger les filières depuis l'import Excel
  useEffect(() => {
    fetch("/api/modules?distinct=groupe")
      .then((r) => r.json())
      .then((data: string[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setGroupes(data);
          setHasImport(true);
        }
      })
      .catch(() => {});
  }, []);

  // Charger les modules de la filière sélectionnée
  useEffect(() => {
    if (!form.filiere || !hasImport) { setModules([]); setMhgInfo(null); return; }
    fetch(`/api/modules?groupe=${encodeURIComponent(form.filiere)}`)
      .then((r) => r.json())
      .then((data: ModuleItem[]) => setModules(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [form.filiere, hasImport]);

  useEffect(() => {
    if (defaultValues) setForm((prev) => ({ ...prev, ...defaultValues }));
  }, [defaultValues]);

  const set = (field: keyof FicheFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleFiliereChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, filiere: e.target.value, module: "" }));
    setMhgInfo(null);
  };

  const handleModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const moduleName = e.target.value;
    const found = modules.find((m) => m.module === moduleName);
    setMhgInfo(found ? found.mhg : null);
    setForm((prev) => ({ ...prev, module: moduleName }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      <h2 className="text-xl font-bold text-ofppt-green border-b border-gray-100 pb-4">
        Paramètres de la fiche
      </h2>

      {/* Filière + Module */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Filière *</label>
          {hasImport ? (
            <select className="input-field" value={form.filiere} onChange={handleFiliereChange} required>
              <option value="">— Choisir —</option>
              {groupes.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          ) : (
            <select className="input-field" value={form.filiere} onChange={set("filiere")} required>
              <option value="">— Choisir —</option>
              {FILIERES_OFPPT.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          )}
        </div>

        <div>
          <label className="label flex items-center justify-between">
            <span>Module *</span>
            {mhgInfo !== null && (
              <span className="text-[10px] font-normal bg-ofppt-green/10 text-ofppt-green px-2 py-0.5 rounded-full">
                M.H.G : {mhgInfo}h
              </span>
            )}
          </label>
          {hasImport && form.filiere ? (
            <select className="input-field" value={form.module} onChange={handleModuleChange} required>
              <option value="">— Choisir —</option>
              {modules.map((m) => (
                <option key={m.module} value={m.module}>
                  {m.codeModule ? `${m.codeModule} — ${m.module}` : m.module}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="input-field"
              placeholder={hasImport ? "Sélectionnez d'abord une filière" : "Ex: M201 — Comptabilité générale"}
              value={form.module}
              onChange={set("module")}
              disabled={hasImport && !form.filiere}
              required
            />
          )}
        </div>
      </div>

      {/* Hint import si pas de données */}
      {!hasImport && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Importez votre tableau Excel dans <strong>Paramètres → Affectation des modules</strong> pour activer les listes automatiques.
        </p>
      )}

      <div>
        <label className="label">Intitulé de la séance *</label>
        <input className="input-field" placeholder="Ex: Les opérations de trésorerie" value={form.intitule} onChange={set("intitule")} required />
      </div>

      <div>
        <label className="label">Nom du formateur *</label>
        <input className="input-field" placeholder="Prénom NOM" value={form.formateur} onChange={set("formateur")} required />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Durée séance</label>
          <select className="input-field" value={form.duree} onChange={set("duree")}>
            {["1h", "2h", "3h", "4h", "6h"].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Niveau</label>
          <select className="input-field" value={form.niveau} onChange={set("niveau")}>
            <option value="1ere-annee">1ère année</option>
            <option value="2eme-annee">2ème année</option>
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

      <div>
        <label className="label">Objectif — Savoir *</label>
        <textarea className="input-field resize-none" rows={2} placeholder="Connaissances théoriques à acquérir" value={form.objectifsSavoir} onChange={set("objectifsSavoir")} required />
      </div>
      <div>
        <label className="label">Objectif — Savoir-faire *</label>
        <textarea className="input-field resize-none" rows={2} placeholder="Compétences pratiques à développer" value={form.objectifsSavoirFaire} onChange={set("objectifsSavoirFaire")} required />
      </div>
      <div>
        <label className="label">Objectif — Savoir-être</label>
        <textarea className="input-field resize-none" rows={2} placeholder="Attitudes et comportements professionnels (optionnel)" value={form.objectifsSavoirEtre} onChange={set("objectifsSavoirEtre")} />
      </div>
      <div>
        <label className="label">Prérequis des stagiaires</label>
        <textarea className="input-field resize-none" rows={2} placeholder="Connaissances préalables requises (optionnel)" value={form.prerequis} onChange={set("prerequis")} />
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
