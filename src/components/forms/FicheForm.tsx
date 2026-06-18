"use client";

import { useState, useEffect } from "react";
import type { FicheFormData } from "@/types/seance";
import { FILIERES_OFPPT } from "@/types/seance";

interface RefModule { id: string; nom: string; code: string | null; mhg: number | null; }
interface RefFiliere { id: string; nom: string; modules: RefModule[]; }
interface RefSecteur { id: string; nom: string; filieres: RefFiliere[]; }
interface ReferentielStructure { secteurs: RefSecteur[]; }

function deriveAnnee(filiereNom: string): string {
  if (/2/u.test(filiereNom)) return "2eme-annee";
  if (/3/u.test(filiereNom)) return "3eme-annee";
  return "1ere-annee";
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
    codeModule: "",
    intitule: "",
    formateur: "",
    duree: "2h",
    type: "theorique",
    niveau: "TS",
    annee: "1ere-annee",
    prerequis: "",
    ...defaultValues,
  });

  // ── Référentiel (Secteur → Filière → Module) ──
  const [referentiel, setReferentiel] = useState<ReferentielStructure | null>(null);
  const [selectedSecteurId, setSelectedSecteurId] = useState("");
  const [selectedFiliereId, setSelectedFiliereId] = useState("");

  // ── Fallback UserModule ──
  const [groupes, setGroupes] = useState<string[]>([]);
  const [legacyModules, setLegacyModules] = useState<{ module: string; mhg: number; codeModule?: string }[]>([]);
  const [hasImport, setHasImport] = useState(false);
  const [mhgInfo, setMhgInfo] = useState<number | null>(null);
  const [showList, setShowList] = useState(false);

  // ── Charger le référentiel ──
  useEffect(() => {
    fetch("/api/referentiel/structure")
      .then((r) => r.json())
      .then((data: ReferentielStructure) => {
        if (data?.secteurs?.length > 0) setReferentiel(data);
      })
      .catch(() => {});
  }, []);

  // ── Fallback UserModule si pas de référentiel ──
  useEffect(() => {
    if (referentiel) return;
    fetch("/api/modules?distinct=groupe")
      .then((r) => r.json())
      .then((data: string[]) => {
        if (Array.isArray(data) && data.length > 0) { setGroupes(data); setHasImport(true); }
      })
      .catch(() => {});
  }, [referentiel]);

  useEffect(() => {
    if (referentiel || !form.filiere || !hasImport) { setLegacyModules([]); setMhgInfo(null); setShowList(false); return; }
    fetch(`/api/modules?groupe=${encodeURIComponent(form.filiere)}`)
      .then((r) => r.json())
      .then((data) => setLegacyModules(Array.isArray(data) ? data : []))
      .catch(() => {});
    setShowList(false);
  }, [form.filiere, hasImport, referentiel]);

  useEffect(() => {
    if (defaultValues) setForm((prev) => ({ ...prev, ...defaultValues }));
  }, [defaultValues]);

  // ── Données dérivées du référentiel ──
  const secteurs = referentiel?.secteurs ?? [];
  const filieres = secteurs.find((s) => s.id === selectedSecteurId)?.filieres ?? [];
  const refModules = filieres.find((f) => f.id === selectedFiliereId)?.modules ?? [];

  const set = (field: keyof FicheFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // ── Handlers référentiel ──
  const handleSecteurChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const nom = secteurs.find((s) => s.id === id)?.nom ?? "";
    setSelectedSecteurId(id);
    setSelectedFiliereId("");
    setMhgInfo(null);
    setForm((prev) => ({ ...prev, filiere: nom, module: "", codeModule: "" }));
  };

  const handleFiliereChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const f = filieres.find((fi) => fi.id === id);
    setSelectedFiliereId(id);
    setMhgInfo(null);
    setForm((prev) => ({
      ...prev,
      module: "",
      codeModule: "",
      annee: f ? deriveAnnee(f.nom) : prev.annee,
    }));
  };

  const handleRefModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const m = refModules.find((mod) => mod.id === id);
    setMhgInfo(m?.mhg ?? null);
    setForm((prev) => ({ ...prev, module: m?.nom ?? "", codeModule: m?.code ?? "" }));
  };

  // ── Handlers legacy ──
  const handleFiliereChangeLegacy = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, filiere: e.target.value, module: "", codeModule: "" }));
    setMhgInfo(null);
  };

  const handleLegacyModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const moduleName = e.target.value;
    const found = legacyModules.find((m) => m.module === moduleName);
    setMhgInfo(found ? found.mhg : null);
    setForm((prev) => ({ ...prev, module: moduleName, codeModule: found?.codeModule ?? "" }));
  };

  const selectFromList = (m: { module: string; mhg: number; codeModule?: string }) => {
    setMhgInfo(m.mhg);
    setForm((prev) => ({ ...prev, module: m.module, codeModule: m.codeModule ?? "" }));
    setShowList(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(form);
  };

  const hasReferentiel = (referentiel?.secteurs.length ?? 0) > 0;

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      <h2 className="text-base font-bold pb-4" style={{ color: "#0A4DA8", borderBottom: "1px solid #E2E8F0" }}>
        Paramètres de la fiche
      </h2>

      {/* ── MODE RÉFÉRENTIEL ── */}
      {hasReferentiel ? (
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
              <button type="button" onClick={() => setShowList((s) => !s)}
                className="flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-1.5 transition-colors"
                style={{ color: "#0A4DA8", border: "1px solid #0A4DA840", background: "#0A4DA810" }}>
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
                        <tr key={m.id}
                          onClick={() => {
                            setMhgInfo(m.mhg);
                            setForm((prev) => ({ ...prev, module: m.nom, codeModule: m.code ?? "" }));
                            setShowList(false);
                          }}
                          className="cursor-pointer transition-colors"
                          style={form.module === m.nom
                            ? { background: "#0A4DA814", color: "#0A4DA8" }
                            : { borderBottom: "1px solid #E2E8F0" }}>
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
                <input type="text" className="input-field font-mono text-sm tracking-wide"
                  style={{ background: "#F3F4F6", color: "#4B5563" }}
                  value={form.codeModule ?? ""} readOnly placeholder="—" />
              </div>
              <div className="col-span-2">
                <label className="label flex items-center justify-between">
                  <span>Intitulé module *</span>
                  {mhgInfo !== null && (
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full" style={{ background: "#0A4DA814", color: "#0A4DA8" }}>
                      M.H.G : {mhgInfo}h
                    </span>
                  )}
                </label>
                <select className="input-field"
                  value={refModules.find((m) => m.nom === form.module)?.id ?? ""}
                  onChange={handleRefModuleChange} required disabled={!selectedFiliereId}>
                  <option value="">— Choisir un module —</option>
                  {refModules.map((m) => (
                    <option key={m.id} value={m.id}>{m.code ? `${m.code} — ` : ""}{m.nom}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </>

      ) : hasImport ? (
        /* ── MODE LEGACY UserModule ── */
        <>
          <div>
            <label className="label">Filière *</label>
            <select className="input-field" value={form.filiere} onChange={handleFiliereChangeLegacy} required>
              <option value="">— Choisir une filière —</option>
              {groupes.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {form.filiere && legacyModules.length > 0 && (
            <div>
              <button type="button" onClick={() => setShowList((s) => !s)}
                className="flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-1.5 transition-colors"
                style={{ color: "#0A4DA8", border: "1px solid #0A4DA840", background: "#0A4DA810" }}>
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
              <label className="label flex items-center justify-between">
                <span>Intitulé module *</span>
                {mhgInfo !== null && (
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded-full" style={{ background: "#0A4DA814", color: "#0A4DA8" }}>
                    M.H.G : {mhgInfo}h
                  </span>
                )}
              </label>
              <select className="input-field" value={form.module} onChange={handleLegacyModuleChange} required disabled={!form.filiere}>
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
            <select className="input-field" value={form.filiere} onChange={set("filiere")} required>
              <option value="">— Choisir une filière —</option>
              {FILIERES_OFPPT.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Intitulé module *</label>
            <input className="input-field" placeholder="Ex: M201 — Comptabilité générale"
              value={form.module} onChange={set("module")} required />
          </div>
          <p className="text-xs rounded-lg px-3 py-2" style={{ color: "#F59E0B", background: "#F59E0B14", border: "1px solid #F59E0B30" }}>
            Importez votre référentiel dans <strong>Référentiel</strong> pour activer les listes automatiques.
          </p>
        </>
      )}

      {/* Intitulé séance */}
      <div>
        <label className="label">Intitulé de la séance *</label>
        <input className="input-field" placeholder="Ex: Les opérations de trésorerie" value={form.intitule} onChange={set("intitule")} required />
      </div>

      {/* Formateur */}
      <div>
        <label className="label">Nom du formateur *</label>
        <input className="input-field" placeholder="Prénom NOM" value={form.formateur} onChange={set("formateur")} required />
      </div>

      {/* Durée + Niveau + Année + Type */}
      <div className="grid grid-cols-4 gap-4">
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
            <option value="1ere-annee">1ère Année</option>
            <option value="2eme-annee">2ème Année</option>
            <option value="3eme-annee">3ème Année</option>
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

      {/* Objectifs auto */}
      <div className="rounded-lg px-3 py-2.5 flex items-start gap-2" style={{ background: "#0A4DA810", border: "1px solid #0A4DA830" }}>
        <span>✨</span>
        <p className="text-xs" style={{ color: "#4B5563" }}>
          Les <strong>objectifs pédagogiques</strong> (Savoir, Savoir-faire, Savoir-être) sont
          générés automatiquement et insérés dans la fiche PDF.
        </p>
      </div>

      <div>
        <label className="label">Prérequis des stagiaires</label>
        <textarea className="input-field resize-none" rows={2}
          placeholder="Connaissances préalables requises (optionnel)"
          value={form.prerequis} onChange={set("prerequis")} />
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
