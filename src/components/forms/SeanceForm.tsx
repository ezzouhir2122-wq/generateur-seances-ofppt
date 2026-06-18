"use client";

import { useState, useEffect } from "react";
import { SeanceFormData } from "@/types/seance";

interface Props {
  onGenerate: (data: SeanceFormData) => void;
  isLoading: boolean;
  initial?: Partial<SeanceFormData>;
  forceReferentiel?: boolean;
}

interface RefModule { id: string; nom: string; code: string | null; mhg: number | null; }
interface RefFiliere { id: string; nom: string; modules: RefModule[]; }
interface RefSecteur { id: string; nom: string; filieres: RefFiliere[]; }
interface ReferentielStructure { secteurs: RefSecteur[]; }

function deriveAnnee(filiereNom: string): string {
  if (/2/u.test(filiereNom)) return "2eme-annee";
  if (/3/u.test(filiereNom)) return "3eme-annee";
  return "1ere-annee";
}

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

  // ── Référentiel (Secteur → Filière → Module) ──
  const [referentiel, setReferentiel] = useState<ReferentielStructure | null>(null);
  const [selectedSecteurId, setSelectedSecteurId] = useState("");
  const [selectedFiliereId, setSelectedFiliereId] = useState("");

  // ── Fallback UserModule (ancien système Excel) ──
  const [groupes, setGroupes] = useState<string[]>([]);
  const [legacyModules, setLegacyModules] = useState<{ module: string; mhg: number; codeModule?: string }[]>([]);
  const [selectedGroupe, setSelectedGroupe] = useState("");
  const [hasImport, setHasImport] = useState(false);

  const [showList, setShowList] = useState(false);
  const [refCompetences, setRefCompetences] = useState<{ id: string; titre: string; objectifs: string[] }[]>([]);

  // ── Charger le référentiel ──
  useEffect(() => {
    fetch("/api/referentiel/structure")
      .then((r) => r.json())
      .then((data: ReferentielStructure) => {
        if (data?.secteurs?.length > 0) setReferentiel(data);
      })
      .catch(() => {});
  }, []);

  // ── Fallback : charger les groupes UserModule si pas de référentiel ──
  useEffect(() => {
    if (referentiel) return;
    fetch("/api/modules?distinct=groupe")
      .then((r) => r.json())
      .then((data: string[]) => {
        if (Array.isArray(data) && data.length > 0) { setGroupes(data); setHasImport(true); }
      })
      .catch(() => {});
  }, [referentiel]);

  // ── Modules legacy selon groupe sélectionné ──
  useEffect(() => {
    if (referentiel || !selectedGroupe) { setLegacyModules([]); setShowList(false); return; }
    fetch(`/api/modules?groupe=${encodeURIComponent(selectedGroupe)}`)
      .then((r) => r.json())
      .then((data) => setLegacyModules(Array.isArray(data) ? data : []))
      .catch(() => {});
    setShowList(false);
  }, [selectedGroupe, referentiel]);

  // ── Données dérivées du référentiel ──
  const secteurs = referentiel?.secteurs ?? [];
  const filieres = secteurs.find((s) => s.id === selectedSecteurId)?.filieres ?? [];
  const refModules = filieres.find((f) => f.id === selectedFiliereId)?.modules ?? [];

  // ── Compétences du module sélectionné ──
  useEffect(() => {
    const code = form.codeModule?.trim();
    const nom = form.module?.trim();
    if (!code && !nom) { setRefCompetences([]); return; }
    const param = code ? `code=${encodeURIComponent(code)}` : `nom=${encodeURIComponent(nom!)}`;
    fetch(`/api/referentiel/competences?${param}`)
      .then((r) => r.json())
      .then((data) => setRefCompetences(Array.isArray(data) ? data : []))
      .catch(() => setRefCompetences([]));
  }, [form.codeModule, form.module]);

  // ── Handlers référentiel ──
  const handleSecteurChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const nom = secteurs.find((s) => s.id === id)?.nom ?? "";
    setSelectedSecteurId(id);
    setSelectedFiliereId("");
    setForm((prev) => ({ ...prev, filiere: nom, module: "", codeModule: "", competence: "" }));
    setRefCompetences([]);
  };

  const handleFiliereChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const f = filieres.find((fi) => fi.id === id);
    setSelectedFiliereId(id);
    setForm((prev) => ({
      ...prev,
      module: "",
      codeModule: "",
      annee: f ? deriveAnnee(f.nom) : prev.annee,
      competence: "",
    }));
    setRefCompetences([]);
  };

  const handleRefModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const m = refModules.find((mod) => mod.id === id);
    setForm((prev) => ({
      ...prev,
      module: m?.nom ?? "",
      codeModule: m?.code ?? "",
      mhg: m?.mhg ?? undefined,
      competence: "",
    }));
    setRefCompetences([]);
  };

  // ── Handlers legacy ──
  const handleGroupeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const g = e.target.value;
    setSelectedGroupe(g);
    setForm((prev) => ({ ...prev, filiere: g, module: "", codeModule: "" }));
    setLegacyModules([]);
  };

  const handleLegacyModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const moduleName = e.target.value;
    const found = legacyModules.find((m) => m.module === moduleName);
    setForm((prev) => ({ ...prev, module: moduleName, codeModule: found?.codeModule ?? "", mhg: found?.mhg }));
  };

  const selectFromList = (m: { module: string; mhg: number; codeModule?: string }) => {
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

  function compLetter(titre: string, idx: number): string {
    const m = titre.match(/^([A-Za-z])\.\s*/);
    return m ? m[1].toUpperCase() : String.fromCharCode(65 + idx);
  }
  function compText(titre: string): string {
    return titre.replace(/^[A-Za-z]\.\s*/, "").trim();
  }

  const hasReferentiel = (referentiel?.secteurs.length ?? 0) > 0;

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      <h2 className="text-base font-bold pb-4" style={{ color: "#0A4DA8", borderBottom: "1px solid #E2E8F0" }}>
        Paramètres de la séance
      </h2>

      {/* ── MODE RÉFÉRENTIEL ── */}
      {hasReferentiel && !forceReferentiel ? (
        <>
          {/* Filière (= Secteur) */}
          <div>
            <label className="label">Filière *</label>
            <select className="input-field" value={selectedSecteurId} onChange={handleSecteurChange} required>
              <option value="">— Choisir une filière —</option>
              {secteurs.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          </div>

          {/* Niveau de formation (= Filière) */}
          {selectedSecteurId && (
            <div>
              <label className="label">Niveau de formation *</label>
              <select className="input-field" value={selectedFiliereId} onChange={handleFiliereChange} required disabled={!selectedSecteurId}>
                <option value="">— Choisir un niveau —</option>
                {filieres.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
            </div>
          )}

          {/* Bouton Lister + tableau */}
          {selectedFiliereId && refModules.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowList((s) => !s)}
                className="flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-1.5 transition-colors"
                style={{ color: "#0A4DA8", border: "1px solid #0A4DA840", background: "#0A4DA810" }}
              >
                <span>📋</span>
                <span>Lister les modules ({refModules.length})</span>
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
                      {refModules.map((m) => (
                        <tr
                          key={m.id}
                          onClick={() => {
                            setForm((prev) => ({ ...prev, module: m.nom, codeModule: m.code ?? "", mhg: m.mhg ?? undefined, competence: "" }));
                            setShowList(false);
                          }}
                          className="cursor-pointer transition-colors"
                          style={
                            form.codeModule === m.code && form.module === m.nom
                              ? { background: "#0A4DA814", color: "#0A4DA8" }
                              : { borderBottom: "1px solid #E2E8F0" }
                          }
                        >
                          <td className="px-3 py-2 font-mono text-xs" style={{ color: "#4B5563" }}>{m.code || "—"}</td>
                          <td className="px-3 py-2 font-medium" style={{ color: "#111827" }}>{m.nom}</td>
                          <td className="px-3 py-2 text-right font-semibold" style={{ color: "#0A4DA8" }}>{m.mhg ? `${m.mhg}h` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Code module + Intitulé module */}
          {selectedFiliereId && (
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
                  value={refModules.find((m) => m.nom === form.module)?.id ?? ""}
                  onChange={handleRefModuleChange}
                  required
                  disabled={!selectedFiliereId}
                >
                  <option value="">— Choisir un module —</option>
                  {refModules.map((m) => (
                    <option key={m.id} value={m.id}>{m.code ? `${m.code} — ` : ""}{m.nom}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </>

      ) : hasImport && !forceReferentiel ? (
        /* ── MODE LEGACY UserModule ── */
        <>
          <div>
            <label className="label">Filière *</label>
            <select className="input-field" value={selectedGroupe} onChange={handleGroupeChange} required>
              <option value="">— Choisir une filière —</option>
              {groupes.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {selectedGroupe && legacyModules.length > 0 && (
            <div>
              <button type="button" onClick={() => setShowList((s) => !s)}
                className="flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-1.5 transition-colors"
                style={{ color: "#0A4DA8", border: "1px solid #0A4DA840", background: "#0A4DA810" }}
              >
                <span>📋</span><span>Lister les modules ({legacyModules.length})</span>
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
                      {legacyModules.map((m) => (
                        <tr key={m.module} onClick={() => selectFromList(m)} className="cursor-pointer transition-colors"
                          style={form.module === m.module ? { background: "#0A4DA814", color: "#0A4DA8" } : { borderBottom: "1px solid #E2E8F0" }}>
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

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Code module</label>
              <input type="text" className="input-field font-mono text-sm tracking-wide"
                style={{ background: "#F3F4F6", color: "#4B5563" }} value={form.codeModule ?? ""} readOnly placeholder="—" />
            </div>
            <div className="col-span-2">
              <label className="label">Intitulé module *</label>
              <select className="input-field" value={form.module} onChange={handleLegacyModuleChange} required disabled={!selectedGroupe}>
                <option value="">— Choisir un module —</option>
                {legacyModules.map((m) => <option key={m.module} value={m.module}>{m.module}</option>)}
              </select>
            </div>
          </div>
        </>

      ) : (
        /* ── MODE TEXTE LIBRE ── */
        <>
          <div>
            <label className="label">Filière *</label>
            <input type="text" className="input-field" placeholder="Ex: Gestion des Entreprises"
              value={form.filiere} onChange={set("filiere")} required />
          </div>
          <div>
            <label className="label">Intitulé module *</label>
            <input type="text" className="input-field" placeholder="Ex: M201 — Développement web"
              value={form.module} onChange={set("module")} required />
          </div>
          <p className="text-xs rounded-lg p-2" style={{ color: "#F59E0B", background: "#F59E0B14", border: "1px solid #F59E0B30" }}>
            💡 Importez votre référentiel via <span className="font-medium">⚙ Référentiel</span> pour activer les listes automatiques.
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
            <label key={t.value} className="flex-1 rounded-lg px-3 py-2.5 text-sm text-center cursor-pointer transition-colors"
              style={form.type === t.value
                ? { border: "1px solid #0A4DA840", background: "#0A4DA814", color: "#0A4DA8", fontWeight: 600 }
                : { border: "1px solid #E2E8F0", color: "#9CA3AF" }}>
              <input type="radio" name="type" value={t.value} className="hidden" checked={form.type === t.value} onChange={set("type")} />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      {/* Compétences du référentiel */}
      {refCompetences.length > 0 && (
        <div className="rounded-xl p-3" style={{ background: "#0A4DA808", border: "1px solid #0A4DA830" }}>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#0A4DA8" }}>
            Compétences pédagogiques du module
          </p>
          <div className="space-y-1">
            {refCompetences.map((c, i) => (
              <button key={c.id} type="button"
                onClick={() => setForm((prev) => ({ ...prev, competence: c.titre }))}
                className="w-full flex items-start gap-2 text-left px-3 py-2 rounded-lg transition-colors text-xs"
                style={form.competence === c.titre
                  ? { background: "#0A4DA8", color: "#FFFFFF" }
                  : { background: "#FFFFFF", color: "#374151", border: "1px solid #E2E8F0" }}>
                <span className="flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5"
                  style={form.competence === c.titre ? { background: "#FFFFFF30", color: "#FFFFFF" } : { background: "#0A4DA8", color: "#FFFFFF" }}>
                  {compLetter(c.titre, i)}
                </span>
                <span className="flex-1">{compText(c.titre)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Thème / Compétence */}
      <div>
        <label className="label">
          {refCompetences.length > 0 ? "Compétence sélectionnée / thème libre" : "Thème ou compétence du cours"}
        </label>
        <textarea className="input-field resize-none" rows={2}
          placeholder="Ex: Le bilan comptable et son équilibre selon les normes SYSCOA"
          value={form.competence ?? ""} onChange={set("competence")} />
        <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>
          {refCompetences.length > 0
            ? "Sélectionnez une compétence ci-dessus ou saisissez un thème libre."
            : "Précisez le thème pour cibler le cours détaillé."}
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
            <label key={n.value} className="flex-1 rounded-lg px-3 py-2.5 text-sm text-center cursor-pointer transition-colors"
              style={form.niveauApprentissage === n.value
                ? { border: "1px solid #0A4DA840", background: "#0A4DA814", color: "#0A4DA8", fontWeight: 600 }
                : { border: "1px solid #E2E8F0", color: "#9CA3AF" }}>
              <input type="radio" name="niveauApprentissage" value={n.value} className="hidden"
                checked={form.niveauApprentissage === n.value} onChange={set("niveauApprentissage")} />
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
            <label key={m.value} className="flex-1 rounded-lg px-3 py-2.5 text-sm text-center cursor-pointer transition-colors"
              style={form.mode === m.value
                ? { border: "1px solid #0A4DA840", background: "#0A4DA814", color: "#0A4DA8", fontWeight: 600 }
                : { border: "1px solid #E2E8F0", color: "#9CA3AF" }}>
              <input type="radio" name="mode" value={m.value} className="hidden" checked={form.mode === m.value} onChange={set("mode")} />
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
