"use client";

import { useState, useEffect } from "react";
import { SeanceFormData, FILIERES_OFPPT } from "@/types/seance";

interface Props {
  onGenerate: (data: SeanceFormData) => void;
  isLoading: boolean;
}

interface ModuleItem { module: string; mhg: number; }

export default function SeanceForm({ onGenerate, isLoading }: Props) {
  const [form, setForm] = useState<SeanceFormData>({
    filiere: "",
    module: "",
    duree: "2h",
    niveau: "1ere-annee",
    type: "theorique",
    objectifs: "",
  });

  const [groupes, setGroupes] = useState<string[]>([]);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [selectedGroupe, setSelectedGroupe] = useState("");
  const [hasImport, setHasImport] = useState(false);

  // Charger les groupes importés au montage
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

  // Charger les modules quand un groupe est sélectionné
  useEffect(() => {
    if (!selectedGroupe) { setModules([]); return; }
    fetch(`/api/modules?groupe=${encodeURIComponent(selectedGroupe)}`)
      .then((r) => r.json())
      .then((data: ModuleItem[]) => setModules(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [selectedGroupe]);

  const handleGroupeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const g = e.target.value;
    setSelectedGroupe(g);
    setForm((prev) => ({ ...prev, filiere: g, module: "", duree: "2h" }));
    setModules([]);
  };

  const handleModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const moduleName = e.target.value;
    const found = modules.find((m) => m.module === moduleName);
    setForm((prev) => ({
      ...prev,
      module: moduleName,
      duree: found ? `${found.mhg}h` : prev.duree,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.module || !form.objectifs) return;
    onGenerate(form);
  };

  const set = (field: keyof SeanceFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      <h2 className="text-xl font-bold text-ofppt-green border-b border-gray-100 pb-4">
        Paramètres de la séance
      </h2>

      {/* Mode avec import Excel */}
      {hasImport ? (
        <>
          <div>
            <label className="label">Groupe *</label>
            <select className="input-field" value={selectedGroupe} onChange={handleGroupeChange} required>
              <option value="">— Choisir un groupe —</option>
              {groupes.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Module *</label>
            <select
              className="input-field"
              value={form.module}
              onChange={handleModuleChange}
              required
              disabled={!selectedGroupe}
            >
              <option value="">— Choisir un module —</option>
              {modules.map((m) => (
                <option key={m.module} value={m.module}>{m.module}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Masse horaire (auto)</label>
              <input type="text" className="input-field bg-gray-50" value={form.duree} readOnly />
            </div>
            <div>
              <label className="label">Niveau</label>
              <select className="input-field" value={form.niveau} onChange={set("niveau")}>
                <option value="1ere-annee">1ère année</option>
                <option value="2eme-annee">2ème année</option>
              </select>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Mode sans import — champs texte libre */}
          <div>
            <label className="label">Filière *</label>
            <select className="input-field" value={form.filiere} onChange={set("filiere")} required>
              <option value="">— Choisir une filière —</option>
              {FILIERES_OFPPT.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Module *</label>
            <input type="text" className="input-field" placeholder="Ex: M201 — Développement web" value={form.module} onChange={set("module")} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Durée</label>
              <select className="input-field" value={form.duree} onChange={set("duree")}>
                <option value="1h">1 heure</option>
                <option value="2h">2 heures</option>
                <option value="3h">3 heures</option>
                <option value="4h">4 heures</option>
                <option value="6h">6 heures</option>
              </select>
            </div>
            <div>
              <label className="label">Niveau</label>
              <select className="input-field" value={form.niveau} onChange={set("niveau")}>
                <option value="1ere-annee">1ère année</option>
                <option value="2eme-annee">2ème année</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
            💡 Importez votre fichier Excel via le tableau de bord <span className="font-medium">⚙</span> pour remplir automatiquement groupes et modules.
          </p>
        </>
      )}

      {/* Type de séance — commun */}
      <div>
        <label className="label">Type de séance</label>
        <div className="flex gap-3">
          {[
            { value: "theorique", label: "Cours théorique" },
            { value: "tp", label: "Travaux Pratiques" },
            { value: "ta", label: "Travaux d'Application" },
          ].map((t) => (
            <label
              key={t.value}
              className={`flex-1 border rounded-lg px-3 py-2.5 text-sm text-center cursor-pointer transition-colors ${
                form.type === t.value
                  ? "border-ofppt-green bg-ofppt-green/5 text-ofppt-green font-medium"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input type="radio" name="type" value={t.value} className="hidden" checked={form.type === t.value} onChange={set("type")} />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      {/* Objectifs */}
      <div>
        <label className="label">Objectifs pédagogiques *</label>
        <textarea
          className="input-field resize-none"
          rows={4}
          placeholder="Ex: À la fin de cette séance, le stagiaire sera capable de..."
          value={form.objectifs}
          onChange={set("objectifs")}
          required
        />
      </div>

      <button type="submit" className="btn-primary w-full" disabled={isLoading}>
        {isLoading ? "Génération en cours..." : "Générer la séance"}
      </button>
    </form>
  );
}
