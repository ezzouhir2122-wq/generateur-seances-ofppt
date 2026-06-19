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
interface RefCompetence { id: string; titre: string; objectifs: string[]; }

function deriveAnnee(filiereNom: string): "1ere-annee" | "2eme-annee" | "3eme-annee" {
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
    competences: [],
    niveauApprentissage: "intermediaire",
    mode: "presentiel",
    ...initial,
  });

  const [referentiel, setReferentiel] = useState<ReferentielStructure | null>(null);
  const [selectedSecteurId, setSelectedSecteurId] = useState("");
  const [selectedFiliereId, setSelectedFiliereId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");

  const [groupes, setGroupes] = useState<string[]>([]);
  const [legacyModules, setLegacyModules] = useState<{ module: string; mhg: number; codeModule?: string }[]>([]);
  const [selectedGroupe, setSelectedGroupe] = useState("");
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
    if (referentiel || !selectedGroupe) { setLegacyModules([]); return; }
    fetch(`/api/modules?groupe=${encodeURIComponent(selectedGroupe)}`)
      .then((r) => r.json())
      .then((data) => setLegacyModules(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [selectedGroupe, referentiel]);

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

  const handleSecteurChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const nom = secteurs.find((s) => s.id === id)?.nom ?? "";
    setSelectedSecteurId(id);
    setSelectedFiliereId("");
    setSelectedModuleId("");
    setSelectedCompetences([]);
    setRefCompetences([]);
    setForm((prev) => ({ ...prev, filiere: nom, module: "", codeModule: "", competence: "", competences: [] }));
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

  const handleGroupeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const g = e.target.value;
    setSelectedGroupe(g);
    setForm((prev) => ({ ...prev, filiere: g, module: "", codeModule: "", mhg: undefined }));
    setLegacyModules([]);
  };

  const handleLegacyModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const moduleName = e.target.value;
    const found = legacyModules.find((m) => m.module === moduleName);
    setForm((prev) => ({ ...prev, module: moduleName, codeModule: found?.codeModule ?? "", mhg: found?.mhg }));
  };

  const set = (field: keyof SeanceFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.module) return;
    onGenerate(form);
  };

  const hasReferentiel = (referentiel?.secteurs.length ?? 0) > 0;

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="text-base font-bold pb-3" style={{ color: "#0A4DA8", borderBottom: "1px solid #E2E8F0" }}>
        Paramètres de la séance
      </h2>

      {hasReferentiel && !forceReferentiel ? (
        <>
          {/* ── Case 1 : Filière ── */}
          <div>
            <CaseLabel num={1} label="Filière" />
            <select className="input-field" value={selectedSecteurId} onChange={handleSecteurChange} required>
              <option value="">— Choisir une filière —</option>
              {secteurs.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
            </select>
          </div>

          {/* ── Case 2 : Niveau de formation ── */}
          {selectedSecteurId && (
            <div>
              <CaseLabel num={2} label="Niveau de formation" />
              <select className="input-field" value={selectedFiliereId} onChange={handleFiliereChange} required>
                <option value="">— Choisir un niveau —</option>
                {filieres.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
            </div>
          )}

          {/* ── Cases 3 + 4 : N° Module + Intitulé ── */}
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

          {/* ── Case 5 : Masse horaire ── */}
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

          {/* ── Case 6 : Compétences Pédagogiques ── */}
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

      ) : hasImport && !forceReferentiel ? (
        /* ── MODE LEGACY UserModule ── */
        <>
          <div>
            <CaseLabel num={1} label="Filière" />
            <select className="input-field" value={selectedGroupe} onChange={handleGroupeChange} required>
              <option value="">— Choisir une filière —</option>
              {groupes.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {selectedGroupe && (
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
                  disabled={!selectedGroupe}
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
            <CaseLabel num={4} label="Intitulé module" />
            <input
              type="text"
              className="input-field"
              placeholder="Ex: M201 — Développement web"
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
              placeholder="Ex: Le bilan comptable et son équilibre selon les normes SYSCOA"
              value={form.competence ?? ""}
              onChange={set("competence")}
            />
          </div>
          <p className="text-xs rounded-lg p-2" style={{ color: "#F59E0B", background: "#F59E0B14", border: "1px solid #F59E0B30" }}>
            Importez votre référentiel via ⚙ Référentiel pour activer les listes automatiques.
          </p>
        </>
      )}

      {/* ── Paramètres séance ── */}
      <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: "12px" }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>
          Paramètres séance
        </p>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="label">Durée</label>
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

        <div className="mb-3">
          <label className="label">Type de séance</label>
          <div className="flex gap-2">
            {[
              { value: "theorique", label: "Cours théorique" },
              { value: "tp", label: "Travaux Pratiques" },
              { value: "ta", label: "Travaux d'Application" },
            ].map((t) => (
              <label
                key={t.value}
                className="flex-1 rounded-lg px-2 py-2 text-xs text-center cursor-pointer transition-colors"
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

        <div className="mb-3">
          <label className="label">Niveau d&apos;apprentissage</label>
          <div className="flex gap-2">
            {[
              { value: "debutant", label: "Débutant", icon: "○" },
              { value: "intermediaire", label: "Intermédiaire", icon: "◑" },
              { value: "avance", label: "Avancé", icon: "●" },
            ].map((n) => (
              <label
                key={n.value}
                className="flex-1 rounded-lg px-2 py-2 text-xs text-center cursor-pointer transition-colors"
                style={
                  form.niveauApprentissage === n.value
                    ? { border: "1px solid #0A4DA840", background: "#0A4DA814", color: "#0A4DA8", fontWeight: 600 }
                    : { border: "1px solid #E2E8F0", color: "#9CA3AF" }
                }
              >
                <input type="radio" name="niveauApprentissage" value={n.value} className="hidden"
                  checked={form.niveauApprentissage === n.value} onChange={set("niveauApprentissage")} />
                <span className="mr-1">{n.icon}</span>{n.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Mode de formation</label>
          <div className="flex gap-2">
            {[
              { value: "presentiel", label: "Présentiel" },
              { value: "distanciel", label: "Distanciel" },
              { value: "hybride", label: "Hybride" },
            ].map((m) => (
              <label
                key={m.value}
                className="flex-1 rounded-lg px-2 py-2 text-xs text-center cursor-pointer transition-colors"
                style={
                  form.mode === m.value
                    ? { border: "1px solid #0A4DA840", background: "#0A4DA814", color: "#0A4DA8", fontWeight: 600 }
                    : { border: "1px solid #E2E8F0", color: "#9CA3AF" }
                }
              >
                <input type="radio" name="mode" value={m.value} className="hidden" checked={form.mode === m.value} onChange={set("mode")} />
                {m.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <button type="submit" className="btn-primary w-full" disabled={isLoading}>
        {isLoading ? "Génération en cours..." : "Générer la séance"}
      </button>
    </form>
  );
}
