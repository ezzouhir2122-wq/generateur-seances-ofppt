"use client";

import { useState, useEffect } from "react";
import { SeanceFormData, FILIERES_OFPPT } from "@/types/seance";

interface Props {
  onGenerate: (data: SeanceFormData) => void;
  isLoading: boolean;
}

interface ModuleItem { module: string; mhg: number; codeModule?: string; }

export default function SeanceForm({ onGenerate, isLoading }: Props) {
  const [form, setForm] = useState<SeanceFormData>({
    filiere: "",
    module: "",
    codeModule: "",
    duree: "2h30",
    niveau: "TS",
    annee: "1ere-annee",
    type: "theorique",
    objectifs: "",
  });

  const [groupes, setGroupes] = useState<string[]>([]);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [selectedGroupe, setSelectedGroupe] = useState("");
  const [hasImport, setHasImport] = useState(false);
  const [showList, setShowList] = useState(false);

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

  useEffect(() => {
    if (!selectedGroupe) { setModules([]); setShowList(false); return; }
    fetch(`/api/modules?groupe=${encodeURIComponent(selectedGroupe)}`)
      .then((r) => r.json())
      .then((data: ModuleItem[]) => setModules(Array.isArray(data) ? data : []))
      .catch(() => {});
    setShowList(false);
  }, [selectedGroupe]);

  const handleGroupeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const g = e.target.value;
    setSelectedGroupe(g);
    setForm((prev) => ({ ...prev, filiere: g, module: "", codeModule: "" }));
    setModules([]);
  };

  const handleModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const moduleName = e.target.value;
    const found = modules.find((m) => m.module === moduleName);
    setForm((prev) => ({
      ...prev,
      module: moduleName,
      codeModule: found?.codeModule ?? "",
    }));
  };

  const selectModuleFromList = (m: ModuleItem) => {
    setForm((prev) => ({ ...prev, module: m.module, codeModule: m.codeModule ?? "" }));
    setShowList(false);
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

      {hasImport ? (
        <>
          {/* Filière */}
          <div>
            <label className="label">Filière *</label>
            <select className="input-field" value={selectedGroupe} onChange={handleGroupeChange} required>
              <option value="">— Choisir une filière —</option>
              {groupes.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* Bouton Lister + tableau des modules */}
          {selectedGroupe && modules.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowList((s) => !s)}
                className="flex items-center gap-2 text-sm font-medium text-ofppt-green border border-ofppt-green/40 bg-ofppt-green/5 hover:bg-ofppt-green/10 rounded-lg px-3 py-1.5 transition-colors"
              >
                <span>📋</span>
                <span>Lister les modules ({modules.length})</span>
                <span className="text-xs ml-1">{showList ? "▲" : "▼"}</span>
              </button>

              {showList && (
                <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Code</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Intitulé module</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">M.H.G</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {modules.map((m) => (
                        <tr
                          key={m.module}
                          onClick={() => selectModuleFromList(m)}
                          className={`cursor-pointer transition-colors ${
                            form.module === m.module
                              ? "bg-ofppt-green/10 text-ofppt-green"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <td className="px-3 py-2 font-mono text-xs text-gray-500">{m.codeModule || "—"}</td>
                          <td className="px-3 py-2 font-medium">{m.module}</td>
                          <td className="px-3 py-2 text-right font-semibold text-ofppt-green">{m.mhg}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Code module + Intitulé module */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Code module</label>
              <input
                type="text"
                className="input-field bg-gray-50 font-mono text-sm tracking-wide"
                value={form.codeModule ?? ""}
                readOnly
                placeholder="—"
              />
            </div>
            <div className="col-span-2">
              <label className="label">Intitulé module *</label>
              <select
                className="input-field"
                value={form.module}
                onChange={handleModuleChange}
                required
                disabled={!selectedGroupe}
              >
                <option value="">— Choisir un module —</option>
                {modules.map((m) => (
                  <option key={m.module} value={m.module}>
                    {m.module}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="label">Filière *</label>
            <select className="input-field" value={form.filiere} onChange={set("filiere")} required>
              <option value="">— Choisir une filière —</option>
              {FILIERES_OFPPT.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Intitulé module *</label>
            <input
              type="text"
              className="input-field"
              placeholder="Ex: M201 — Développement web"
              value={form.module}
              onChange={set("module")}
              required
            />
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
            💡 Importez votre fichier Excel via <span className="font-medium">⚙ Paramètres</span> pour remplir automatiquement filières et modules.
          </p>
        </>
      )}

      {/* Durée + Niveau + Année */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Durée séance</label>
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

      {/* Type de séance */}
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
