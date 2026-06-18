"use client";

import { useState, useEffect } from "react";
import type { FicheFormData } from "@/types/seance";
import { FILIERES_OFPPT } from "@/types/seance";

interface RefModule { id: string; nom: string; code: string | null; mhg: number | null; }
interface RefFiliere { id: string; nom: string; modules: RefModule[]; }
interface RefSecteur { id: string; nom: string; filieres: RefFiliere[]; }
interface ReferentielStructure { secteurs: RefSecteur[]; }
interface RefCompetence { id: string; titre: string; objectifs: string[]; }

function deriveAnnee(filiereNom: string): string {
  if (/2/u.test(filiereNom)) return "2eme-annee";
  if (/3/u.test(filiereNom)) return "3eme-annee";
  return "1ere-annee";
}

function compLetter(titre: string, idx: number): string {
  const m = titre.match(/^([A-Za-z])\.\s*/);
  return m ? m[1].toUpperCase() : String.fromCharCode(65 + idx);
}

function compText(titre: string): string {
  return titre.replace(/^[A-Za-z]\.\s*/, "").trim();
}

function CaseLabel({ num, label, extra }: { num: number; label: string; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span
        className="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0"
        style={{ background: "#0A4DA8", color: "white" }}
      >
        {num}
      </span>
      <span className="flex-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "#374151" }}>{label}</span>
      {extra}
    </div>
  );
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
    competence: "",
    competences: [],
    ...defaultValues,
  });

  const [referentiel, setReferentiel] = useState<ReferentielStructure | null>(null);
  const [selectedSecteurId, setSelectedSecteurId] = useState("");
  const [selectedFiliereId, setSelectedFiliereId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");

  const [groupes, setGroupes] = useState<string[]>([]);
  const [legacyModules, setLegacyModules] = useState<{ module: string; mhg: number; codeModule?: string }[]>([]);
  const [hasImport, setHasImport] = useState(false);

  const [refCompetences, setRefCompetences] = useState<RefCompetence[]>([]);
  const [selectedCompetences, setSelectedCompetences] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/referentiel/structure")
      .then((r) => r.json())
      .then((data: ReferentielStructure) => {
        if (data?.secteurs?.length > 0) setReferentiel(data);
      })
      .catch(() => {});
  }, []);

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
    if (referentiel || !form.filiere || !hasImport) { setLegacyModules([]); return; }
    fetch(`/api/modules?groupe=${encodeURIComponent(form.filiere)}`)
      .then((r) => r.json())
      .then((data) => setLegacyModules(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [form.filiere, hasImport, referentiel]);

  useEffect(() => {
    if (defaultValues) setForm((prev) => ({ ...prev, ...defaultValues }));
  }, [defaultValues]);

  useEffect(() => {
    const code = form.codeModule?.trim();
    const nom = form.module?.trim();
    if (!code && !nom) { setRefCompetences([]); setSelectedCompetences([]); return; }
    const param = code ? `code=${encodeURIComponent(code)}` : `nom=${encodeURIComponent(nom!)}`;
    fetch(`/api/referentiel/competences?${param}`)
      .then((r) => r.json())
      .then((data) => {
        setRefCompetences(Array.isArray(data) ? data : []);
        setSelectedCompetences([]);
        setForm((f) => ({ ...f, competence: "", competences: [] }));
      })
      .catch(() => setRefCompetences([]));
  }, [form.codeModule, form.module]);

  const secteurs = referentiel?.secteurs ?? [];
  const filieres = secteurs.find((s) => s.id === selectedSecteurId)?.filieres ?? [];
  const refModules = filieres.find((f) => f.id === selectedFiliereId)?.modules ?? [];
  const selectedModule = refModules.find((m) => m.id === selectedModuleId);

  const set = (field: keyof FicheFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSecteurChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const nom = secteurs.find((s) => s.id === id)?.nom ?? "";
    setSelectedSecteurId(id);
    setSelectedFiliereId("");
    setSelectedModuleId("");
    setSelectedCompetences([]);
    setRefCompetences([]);
    setForm((prev) => ({ ...prev, filiere: nom, module: "", codeModule: "", mhg: undefined, competence: "", competences: [] }));
  };

  const handleFiliereChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const f = filieres.find((fi) => fi.id === id);
    setSelectedFiliereId(id);
    setSelectedModuleId("");
    setSelectedCompetences([]);
    setRefCompetences([]);
    setForm((prev) => ({
      ...prev,
      module: "",
      codeModule: "",
      mhg: undefined,
      annee: f ? deriveAnnee(f.nom) : prev.annee,
      competence: "",
      competences: [],
    }));
  };

  const handleRefModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const m = refModules.find((mod) => mod.id === id);
    setSelectedModuleId(id);
    setSelectedCompetences([]);
    setRefCompetences([]);
    setForm((prev) => ({
      ...prev,
      module: m?.nom ?? "",
      codeModule: m?.code ?? "",
      mhg: m?.mhg ?? undefined,
      competence: "",
      competences: [],
    }));
  };

  const toggleCompetence = (titre: string) => {
    setSelectedCompetences((prev) => {
      const next = prev.includes(titre) ? prev.filter((t) => t !== titre) : [...prev, titre];
      setForm((f) => ({ ...f, competence: next.join(" ; "), competences: next }));
      return next;
    });
  };

  const selectAllCompetences = () => {
    const all = refCompetences.map((c) => c.titre);
    setSelectedCompetences(all);
    setForm((f) => ({ ...f, competence: all.join(" ; "), competences: all }));
  };

  const clearCompetences = () => {
    setSelectedCompetences([]);
    setForm((f) => ({ ...f, competence: "", competences: [] }));
  };

  const handleFiliereChangeLegacy = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, filiere: e.target.value, module: "", codeModule: "", mhg: undefined }));
  };

  const handleLegacyModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const moduleName = e.target.value;
    const found = legacyModules.find((m) => m.module === moduleName);
    setForm((prev) => ({ ...prev, module: moduleName, codeModule: found?.codeModule ?? "", mhg: found?.mhg }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(form);
  };

  const hasReferentiel = (referentiel?.secteurs.length ?? 0) > 0;

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="text-base font-bold pb-3" style={{ color: "#0A4DA8", borderBottom: "1px solid #E2E8F0" }}>
        Paramètres de la fiche
      </h2>

      {/* ── MODE RÉFÉRENTIEL ── */}
      {hasReferentiel ? (
        <>
          {/* Case 1 — Filière */}
          <div>
            <CaseLabel num={1} label="Filière" />
            <select className="input-field" value={selectedSecteurId} onChange={handleSecteurChange} required>
              <option value="">— Choisir une filière —</option>
              {secteurs.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          </div>

          {/* Case 2 — Niveau de formation */}
          {selectedSecteurId && (
            <div>
              <CaseLabel num={2} label="Niveau de formation" />
              <select className="input-field" value={selectedFiliereId} onChange={handleFiliereChange} required>
                <option value="">— Choisir un niveau —</option>
                {filieres.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
            </div>
          )}

          {/* Cases 3 + 4 — N° Module + Intitulé */}
          {selectedFiliereId && (
            <div className="grid grid-cols-4 gap-2">
              <div>
                <CaseLabel num={3} label="N° Module" />
                <input
                  type="text"
                  className="input-field font-mono text-sm text-center"
                  style={{ background: "#F3F4F6", color: "#4B5563" }}
                  value={form.codeModule ?? ""}
                  readOnly
                  placeholder="—"
                />
              </div>
              <div className="col-span-3">
                <CaseLabel num={4} label="Intitulé du module" />
                <select
                  className="input-field"
                  value={selectedModuleId}
                  onChange={handleRefModuleChange}
                  required
                >
                  <option value="">— Choisir un module —</option>
                  {refModules.map((m) => (
                    <option key={m.id} value={m.id}>{m.code ? `${m.code} — ` : ""}{m.nom}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Case 5 — Masse horaire */}
          {selectedFiliereId && (
            <div>
              <CaseLabel num={5} label="Masse horaire (h)" />
              <div
                className="rounded-lg px-3 py-2 text-sm font-semibold flex items-center"
                style={{
                  minHeight: "38px",
                  background: selectedModule?.mhg ? "#0A4DA810" : "#F3F4F6",
                  border: `1px solid ${selectedModule?.mhg ? "#0A4DA830" : "#E2E8F0"}`,
                  color: selectedModule?.mhg ? "#0A4DA8" : "#9CA3AF",
                }}
              >
                {selectedModule?.mhg ? `${selectedModule.mhg} h` : "— sélectionnez un module —"}
              </div>
            </div>
          )}

          {/* Case 6 — Compétences Pédagogiques */}
          {refCompetences.length > 0 && (
            <div>
              <CaseLabel
                num={6}
                label="Compétences Pédagogiques"
                extra={
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={selectAllCompetences}
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: "#0A4DA814", color: "#0A4DA8", border: "1px solid #0A4DA840" }}
                    >
                      Tout
                    </button>
                    <button
                      type="button"
                      onClick={clearCompetences}
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: "#F3F4F6", color: "#9CA3AF", border: "1px solid #E2E8F0" }}
                    >
                      Effacer
                    </button>
                  </div>
                }
              />

              {selectedCompetences.length > 0 && (
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ background: "#0A4DA8", color: "white" }}
                  >
                    {selectedCompetences.length} sélectionnée{selectedCompetences.length > 1 ? "s" : ""}
                  </span>
                  {selectedCompetences.length > 1 && (
                    <span className="text-[11px]" style={{ color: "#6B7280" }}>
                      → générées dans le même document
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                {refCompetences.map((c, i) => {
                  const selected = selectedCompetences.includes(c.titre);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCompetence(c.titre)}
                      className="w-full flex items-start gap-2 text-left px-3 py-2 rounded-lg transition-colors text-xs"
                      style={
                        selected
                          ? { background: "#0A4DA8", color: "#FFFFFF", border: "1px solid #0A4DA8" }
                          : { background: "#FFFFFF", color: "#374151", border: "1px solid #E2E8F0" }
                      }
                    >
                      <span
                        className="flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5"
                        style={
                          selected
                            ? { background: "rgba(255,255,255,0.25)", color: "#FFFFFF" }
                            : { background: "#0A4DA8", color: "#FFFFFF" }
                        }
                      >
                        {compLetter(c.titre, i)}
                      </span>
                      <span className="flex-1 leading-relaxed">{compText(c.titre)}</span>
                      {selected && (
                        <span className="flex-shrink-0 mt-0.5 font-bold text-sm">✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Compétence libre si aucune dans le référentiel */}
          {selectedModuleId && refCompetences.length === 0 && (
            <div>
              <CaseLabel num={6} label="Compétence / thème libre" />
              <textarea
                className="input-field resize-none"
                rows={2}
                placeholder="Décrivez le thème ou la compétence visée"
                value={form.competence ?? ""}
                onChange={set("competence")}
              />
            </div>
          )}
        </>

      ) : hasImport ? (
        /* ── MODE LEGACY UserModule ── */
        <>
          <div>
            <CaseLabel num={1} label="Filière" />
            <select className="input-field" value={form.filiere} onChange={handleFiliereChangeLegacy} required>
              <option value="">— Choisir une filière —</option>
              {groupes.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {form.filiere && (
            <div className="grid grid-cols-4 gap-2">
              <div>
                <CaseLabel num={3} label="N° Module" />
                <input
                  type="text"
                  className="input-field font-mono text-sm text-center"
                  style={{ background: "#F3F4F6", color: "#4B5563" }}
                  value={form.codeModule ?? ""}
                  readOnly
                  placeholder="—"
                />
              </div>
              <div className="col-span-3">
                <CaseLabel num={4} label="Intitulé du module" />
                <select
                  className="input-field"
                  value={form.module}
                  onChange={handleLegacyModuleChange}
                  required
                  disabled={!form.filiere}
                >
                  <option value="">— Choisir un module —</option>
                  {legacyModules.map((m) => <option key={m.module} value={m.module}>{m.module}</option>)}
                </select>
              </div>
            </div>
          )}

          {form.mhg && (
            <div>
              <CaseLabel num={5} label="Masse horaire (h)" />
              <div
                className="rounded-lg px-3 py-2 text-sm font-semibold flex items-center"
                style={{ background: "#0A4DA810", border: "1px solid #0A4DA830", color: "#0A4DA8", minHeight: "38px" }}
              >
                {form.mhg} h
              </div>
            </div>
          )}

          <div>
            <CaseLabel num={6} label="Compétence / thème" />
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="Ex: Le bilan comptable et son équilibre"
              value={form.competence ?? ""}
              onChange={set("competence")}
            />
          </div>
        </>

      ) : (
        /* ── MODE TEXTE LIBRE ── */
        <>
          <div>
            <CaseLabel num={1} label="Filière" />
            <select className="input-field" value={form.filiere} onChange={set("filiere")} required>
              <option value="">— Choisir une filière —</option>
              {FILIERES_OFPPT.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <CaseLabel num={4} label="Intitulé module" />
            <input
              className="input-field"
              placeholder="Ex: M201 — Comptabilité générale"
              value={form.module}
              onChange={set("module")}
              required
            />
          </div>
          <div>
            <CaseLabel num={6} label="Compétence / thème" />
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="Ex: Les opérations de trésorerie"
              value={form.competence ?? ""}
              onChange={set("competence")}
            />
          </div>
          <p className="text-xs rounded-lg px-3 py-2" style={{ color: "#F59E0B", background: "#F59E0B14", border: "1px solid #F59E0B30" }}>
            Importez votre référentiel dans <strong>Référentiel</strong> pour activer les listes automatiques.
          </p>
        </>
      )}

      {/* ── Informations fiche ── */}
      <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "12px" }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>
          Informations fiche
        </p>

        <div className="space-y-3">
          <div>
            <label className="label">Intitulé de la séance *</label>
            <input
              className="input-field"
              placeholder="Ex: Les opérations de trésorerie"
              value={form.intitule}
              onChange={set("intitule")}
              required
            />
          </div>

          <div>
            <label className="label">Nom du formateur *</label>
            <input
              className="input-field"
              placeholder="Prénom NOM"
              value={form.formateur}
              onChange={set("formateur")}
              required
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
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
                <option value="1ere-annee">1ère An.</option>
                <option value="2eme-annee">2ème An.</option>
                <option value="3eme-annee">3ème An.</option>
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

          <div className="rounded-lg px-3 py-2.5 flex items-start gap-2" style={{ background: "#0A4DA810", border: "1px solid #0A4DA830" }}>
            <span>✨</span>
            <p className="text-xs" style={{ color: "#4B5563" }}>
              Les <strong>objectifs pédagogiques</strong> (Savoir, Savoir-faire, Savoir-être) sont
              générés automatiquement et insérés dans la fiche PDF.
            </p>
          </div>

          <div>
            <label className="label">Prérequis des stagiaires</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              placeholder="Connaissances préalables requises (optionnel)"
              value={form.prerequis}
              onChange={set("prerequis")}
            />
          </div>
        </div>
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
