"use client";

import { useState, useEffect } from "react";
import { SeanceFormData, FILIERES_OFPPT } from "@/types/seance";

interface Props {
  onGenerate: (data: SeanceFormData) => void;
  isLoading: boolean;
  initial?: Partial<SeanceFormData>;
  forceReferentiel?: boolean;
}

interface ModuleItem { module: string; mhg: number; codeModule?: string; }

export default function SeanceForm({ onGenerate, isLoading, initial, forceReferentiel }: Props) {
  const [form, setForm] = useState<SeanceFormData>({
    filiere: "",
    module: "",
    codeModule: "",
    duree: "2h30",
    niveau: "TS",
    annee: "1ere-annee",
    type: "theorique",
    competence: "",
    niveauApprentissage: "intermediaire",
    mode: "presentiel",
    ...initial,
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
      mhg: found?.mhg,
    }));
  };

  const selectModuleFromList = (m: ModuleItem) => {
    setForm((prev) => ({ ...prev, module: m.module, codeModule: m.codeModule ?? "", mhg: m.mhg }));
    setShowList(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.module) return;
    onGenerate(form);
  };

  const set = (field: keyof SeanceFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      <h2 className="text-base font-bold pb-4" style={{ color: "#0A4DA8", borderBottom: "1px solid #E2E8F0" }}>
        Paramètres de la séance
      </h2>

      {hasImport && !forceReferentiel ? (
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
                className="flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-1.5 transition-colors"
              style={{ color: "#0A4DA8", border: "1px solid #0A4DA840", background: "#0A4DA810" }}
              >
                <span>📋</span>
                <span>Lister les modules ({modules.length})</span>
                <span className="text-xs ml-1">{showList ? "▲" : "▼"}</span>
              </button>

              {showList && (
                <div className="mt-2 rounded-lg overflow-hidden" style={{ border: "1px solid #E2E8F0" }}>
                  <table className="w-full text-sm">
                    <thead style={{ background: "#F3F4F6", borderBottom: "1px solid #E2E8F0" }}>
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide w-24" style={{ color: "#4B5563" }}>Code</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#4B5563" }}>Intitulé module</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide w-20" style={{ color: "#4B5563" }}>M.H.G</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map((m) => (
                        <tr
                          key={m.module}
                          onClick={() => selectModuleFromList(m)}
                          className="cursor-pointer transition-colors"
                          style={
                            form.module === m.module
                              ? { background: "#0A4DA814", color: "#0A4DA8" }
                              : { borderBottom: "1px solid #E2E8F0" }
                          }
                        >
                          <td className="px-3 py-2 font-mono text-xs" style={{ color: "#4B5563" }}>{m.codeModule || "—"}</td>
                          <td className="px-3 py-2 font-medium" style={{ color: "#111827" }}>{m.module}</td>
                          <td className="px-3 py-2 text-right font-semibold" style={{ color: "#0A4DA8" }}>{m.mhg}h</td>
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
                className="input-field font-mono text-sm tracking-wide"
                style={{ background: "#F3F4F6", color: "#4B5563" }}
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
            <input
              type="text"
              className="input-field"
              placeholder="Ex: Gestion des Entreprises"
              value={form.filiere}
              onChange={set("filiere")}
              required
            />
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
          <p className="text-xs rounded-lg p-2" style={{ color: "#F59E0B", background: "#F59E0B14", border: "1px solid #F59E0B30" }}>
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
              className="flex-1 rounded-lg px-3 py-2.5 text-sm text-center cursor-pointer transition-colors"
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

      {/* Thème / Compétence du cours */}
      <div>
        <label className="label">Thème ou compétence du cours</label>
        <textarea
          className="input-field resize-none"
          rows={2}
          placeholder="Ex: Le bilan comptable et son équilibre selon les normes SYSCOA"
          value={form.competence ?? ""}
          onChange={set("competence")}
        />
        <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>
          Précisez le thème pour cibler le cours détaillé (définition, développement, exemples).
        </p>
      </div>

      {/* Niveau d'apprentissage */}
      <div>
        <label className="label">Niveau d&apos;apprentissage</label>
        <div className="flex gap-3">
          {[
            { value: "debutant", label: "Débutant", icon: "○" },
            { value: "intermediaire", label: "Intermédiaire", icon: "◑" },
            { value: "avance", label: "Avancé", icon: "●" },
          ].map((n) => (
            <label
              key={n.value}
              className="flex-1 rounded-lg px-3 py-2.5 text-sm text-center cursor-pointer transition-colors"
              style={
                form.niveauApprentissage === n.value
                  ? { border: "1px solid #0A4DA840", background: "#0A4DA814", color: "#0A4DA8", fontWeight: 600 }
                  : { border: "1px solid #E2E8F0", color: "#9CA3AF" }
              }
            >
              <input
                type="radio"
                name="niveauApprentissage"
                value={n.value}
                className="hidden"
                checked={form.niveauApprentissage === n.value}
                onChange={set("niveauApprentissage")}
              />
              <span className="mr-1 text-xs">{n.icon}</span>{n.label}
            </label>
          ))}
        </div>
      </div>

      {/* Mode de formation */}
      <div>
        <label className="label">Mode de formation</label>
        <div className="flex gap-3">
          {[
            { value: "presentiel", label: "Présentiel", icon: "🏫" },
            { value: "distanciel", label: "Distanciel", icon: "💻" },
            { value: "hybride", label: "Hybride", icon: "⚡" },
          ].map((m) => (
            <label
              key={m.value}
              className="flex-1 rounded-lg px-3 py-2.5 text-sm text-center cursor-pointer transition-colors"
              style={
                form.mode === m.value
                  ? { border: "1px solid #0A4DA840", background: "#0A4DA814", color: "#0A4DA8", fontWeight: 600 }
                  : { border: "1px solid #E2E8F0", color: "#9CA3AF" }
              }
            >
              <input
                type="radio"
                name="mode"
                value={m.value}
                className="hidden"
                checked={form.mode === m.value}
                onChange={set("mode")}
              />
              <span className="mr-1">{m.icon}</span>{m.label}
            </label>
          ))}
        </div>
      </div>

      <button type="submit" className="btn-primary w-full" disabled={isLoading}>
        {isLoading ? "Génération en cours..." : "Générer la séance"}
      </button>
    </form>
  );
}
