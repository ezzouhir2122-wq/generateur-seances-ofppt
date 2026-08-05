"use client";

import { useState, useEffect, useRef } from "react";

interface RefModule { id: string; nom: string; code: string | null; mhg: number | null; }
interface RefFiliere { id: string; nom: string; modules: RefModule[]; }
interface RefSecteur { id: string; nom: string; filieres: RefFiliere[]; }
interface ReferentielStructure { secteurs: RefSecteur[]; }
interface RefCompetence { id: string; titre: string; objectifs: string[]; }

export interface ReferentielSelection {
  filiere: string;
  niveauFormation?: string;
  codeModule: string;
  module: string;
  mhg?: number;
  competence: string;
  competences: string[];
  annee: "1ere-annee" | "2eme-annee" | "3eme-annee";
}

function deriveAnnee(nom: string): "1ere-annee" | "2eme-annee" | "3eme-annee" {
  if (/2/u.test(nom)) return "2eme-annee";
  if (/3/u.test(nom)) return "3eme-annee";
  return "1ere-annee";
}

function compLetter(titre: string, idx: number): string {
  const m = titre.match(/^([A-Za-z])\.\s*/);
  return m ? m[1].toUpperCase() : String.fromCharCode(65 + idx);
}

function compText(titre: string): string {
  return titre.replace(/^[A-Za-z]\.\s*/, "").trim();
}

export function CaseLabel({ num, label, extra }: { num: number; label: string; extra?: React.ReactNode }) {
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
  onChange: (sel: ReferentielSelection) => void;
  initial?: Partial<ReferentielSelection>;
}

const EMPTY: ReferentielSelection = {
  filiere: "", niveauFormation: "", codeModule: "", module: "",
  mhg: undefined, competence: "", competences: [], annee: "1ere-annee",
};

export default function ReferentielCascade({ onChange, initial }: Props) {
  const [referentiel, setReferentiel] = useState<ReferentielStructure | null>(null);
  const [selectedSecteurId, setSelectedSecteurId] = useState("");
  const [selectedFiliereId, setSelectedFiliereId] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [moduleSearch, setModuleSearch] = useState("");
  const [refCompetences, setRefCompetences] = useState<RefCompetence[]>([]);
  const [selectedCompetences, setSelectedCompetences] = useState<string[]>([]);

  const cleanInitial = Object.fromEntries(Object.entries(initial ?? {}).filter(([, v]) => v !== undefined));
  const [sel, setSel] = useState<ReferentielSelection>({ ...EMPTY, ...cleanInitial });
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    fetch("/api/referentiel/structure")
      .then((r) => r.json())
      .then((data: ReferentielStructure) => {
        if (data?.secteurs?.length > 0) setReferentiel(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const code = sel.codeModule?.trim();
    const nom = sel.module?.trim();
    if (!code && !nom) { setRefCompetences([]); setSelectedCompetences([]); return; }
    const param = code ? `code=${encodeURIComponent(code)}` : `nom=${encodeURIComponent(nom!)}`;
    fetch(`/api/referentiel/competences?${param}`)
      .then((r) => r.json())
      .then((data) => {
        setRefCompetences(Array.isArray(data) ? data : []);
        setSelectedCompetences([]);
      })
      .catch(() => setRefCompetences([]));
  }, [sel.codeModule, sel.module]);

  const emit = (next: ReferentielSelection) => {
    setSel(next);
    onChangeRef.current(next);
  };

  const secteurs = referentiel?.secteurs ?? [];
  const filieres = secteurs.find((s) => s.id === selectedSecteurId)?.filieres ?? [];
  const refModules = filieres.find((f) => f.id === selectedFiliereId)?.modules ?? [];
  const selectedModule = refModules.find((m) => m.id === selectedModuleId);
  const filteredModules = moduleSearch
    ? refModules.filter((m) =>
        (m.code ?? "").toLowerCase().includes(moduleSearch.toLowerCase()) ||
        m.nom.toLowerCase().includes(moduleSearch.toLowerCase())
      )
    : refModules;

  const handleSecteurChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const nom = secteurs.find((s) => s.id === id)?.nom ?? "";
    setSelectedSecteurId(id);
    setSelectedFiliereId("");
    setSelectedModuleId("");
    setSelectedCompetences([]);
    setRefCompetences([]);
    emit({ ...EMPTY, filiere: nom });
  };

  const handleFiliereChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const f = filieres.find((fi) => fi.id === id);
    setSelectedFiliereId(id);
    setSelectedModuleId("");
    setSelectedCompetences([]);
    setRefCompetences([]);
    emit({
      ...EMPTY,
      filiere: sel.filiere,
      niveauFormation: f?.nom ?? "",
      annee: f ? deriveAnnee(f.nom) : sel.annee,
    });
  };

  const handleModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const m = refModules.find((mod) => mod.id === id);
    setSelectedModuleId(id);
    setSelectedCompetences([]);
    setRefCompetences([]);
    emit({
      ...sel,
      codeModule: m?.code ?? "",
      module: m?.nom ?? "",
      mhg: m?.mhg ?? undefined,
      competence: "",
      competences: [],
    });
  };

  const toggleCompetence = (titre: string) => {
    const next = selectedCompetences.includes(titre)
      ? selectedCompetences.filter((t) => t !== titre)
      : [...selectedCompetences, titre];
    setSelectedCompetences(next);
    emit({ ...sel, competence: next.join(" ; "), competences: next });
  };

  const selectAll = () => {
    const all = refCompetences.map((c) => c.titre);
    setSelectedCompetences(all);
    emit({ ...sel, competence: all.join(" ; "), competences: all });
  };

  const clearAll = () => {
    setSelectedCompetences([]);
    emit({ ...sel, competence: "", competences: [] });
  };

  const setFreeField = (field: keyof ReferentielSelection) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      emit({ ...sel, [field]: e.target.value });

  /* ── MODE TEXTE LIBRE (pas de référentiel chargé) ── */
  if (!referentiel) {
    return (
      <div className="space-y-4">
        <div>
          <CaseLabel num={1} label="Filière" />
          <input
            type="text" className="input-field"
            placeholder="Ex: Gestion des Entreprises"
            value={sel.filiere} onChange={setFreeField("filiere")} required
          />
        </div>
        <div>
          <CaseLabel num={2} label="Niveau de formation" />
          <input
            type="text" className="input-field"
            placeholder="Ex: TS Comptabilité — 1ère Année"
            value={sel.niveauFormation ?? ""} onChange={setFreeField("niveauFormation")}
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div>
            <CaseLabel num={3} label="N° Module" />
            <input
              type="text" className="input-field font-mono text-sm text-center"
              placeholder="M201"
              value={sel.codeModule} onChange={setFreeField("codeModule")}
            />
          </div>
          <div className="col-span-3">
            <CaseLabel num={4} label="Intitulé du module" />
            <input
              type="text" className="input-field"
              placeholder="Ex: Développement web"
              value={sel.module} onChange={setFreeField("module")} required
            />
          </div>
        </div>
        <div>
          <CaseLabel num={6} label="Compétence / thème" />
          <textarea
            className="input-field resize-none" rows={2}
            placeholder="Ex: Le bilan comptable et son équilibre selon les normes SYSCOA"
            value={sel.competence}
            onChange={(e) => emit({ ...sel, competence: e.target.value, competences: e.target.value ? [e.target.value] : [] })}
          />
        </div>
        <p className="text-xs rounded-lg p-2" style={{ color: "#F59E0B", background: "#F59E0B14", border: "1px solid #F59E0B30" }}>
          Importez votre référentiel via ⚙ Référentiel pour activer les listes automatiques.
        </p>
      </div>
    );
  }

  /* ── MODE RÉFÉRENTIEL ── */
  return (
    <div className="space-y-4">

      {/* Case 1 — Filière */}
      <div>
        <CaseLabel num={1} label="Filière" />
        <select className="input-field" value={selectedSecteurId} onChange={handleSecteurChange} required>
          <option value="">— Choisir une filière —</option>
          {secteurs.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
        </select>
      </div>

      {/* Case 2 — Niveau de formation */}
      <div>
        <CaseLabel num={2} label="Niveau de formation" />
        <select
          className="input-field"
          value={selectedFiliereId}
          onChange={handleFiliereChange}
          required
          disabled={!selectedSecteurId}
        >
          <option value="">
            {selectedSecteurId ? "— Choisir un niveau —" : "— Sélectionnez d'abord une filière —"}
          </option>
          {filieres.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
        </select>
      </div>

      {/* Cases 3 + 4 — N° Module (filtrable) + Intitulé (auto-rempli) */}
      <div className="space-y-2">
        <div
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
          style={{ background: "#F9FAFB", border: "1px solid #E2E8F0" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: "#374151" }}
            placeholder="Filtrer par N° ou nom de module…"
            value={moduleSearch}
            onChange={(e) => { setModuleSearch(e.target.value); setSelectedModuleId(""); }}
            disabled={!selectedFiliereId}
          />
          {moduleSearch && (
            <button type="button" onClick={() => setModuleSearch("")} className="text-xs leading-none" style={{ color: "#9CA3AF" }}>✕</button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div>
            <CaseLabel num={3} label="N° Module" />
            <select
              className="input-field font-mono text-sm text-center"
              value={selectedModuleId}
              onChange={handleModuleChange}
              required
              disabled={!selectedFiliereId}
            >
              <option value="">—</option>
              {filteredModules.map((m) => (
                <option key={m.id} value={m.id}>{m.code ?? "—"}</option>
              ))}
            </select>
          </div>
          <div className="col-span-3">
            <CaseLabel num={4} label="Intitulé du module" />
            <div
              className="rounded-lg px-3 py-2 text-sm flex items-center truncate"
              style={{
                minHeight: "38px",
                background: selectedModule ? "#FFFFFF" : "#F3F4F6",
                border: `1px solid ${selectedModule ? "#D1D5DB" : "#E2E8F0"}`,
                color: selectedModule ? "#374151" : "#9CA3AF",
              }}
            >
              {selectedModule ? selectedModule.nom : "— sélectionnez un module —"}
            </div>
          </div>
        </div>
      </div>

      {/* Case 5 — Masse horaire */}
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

      {/* Case 6 — Compétences Pédagogiques */}
      <div>
        <CaseLabel
          num={6}
          label="Compétences Pédagogiques"
          extra={
            refCompetences.length > 0 ? (
              <div className="flex gap-1">
                <button
                  type="button" onClick={selectAll}
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: "#0A4DA814", color: "#0A4DA8", border: "1px solid #0A4DA840" }}
                >
                  Tout
                </button>
                <button
                  type="button" onClick={clearAll}
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: "#F3F4F6", color: "#9CA3AF", border: "1px solid #E2E8F0" }}
                >
                  Effacer
                </button>
              </div>
            ) : undefined
          }
        />

        {refCompetences.length > 0 ? (
          <>
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
                    {selected && <span className="flex-shrink-0 mt-0.5 font-bold text-sm">✓</span>}
                  </button>
                );
              })}
            </div>
          </>
        ) : selectedModuleId ? (
          <textarea
            className="input-field resize-none" rows={2}
            placeholder="Décrivez le thème ou la compétence visée"
            value={sel.competence}
            onChange={(e) => emit({ ...sel, competence: e.target.value, competences: e.target.value ? [e.target.value] : [] })}
          />
        ) : (
          <div
            className="rounded-lg px-3 py-2 text-sm"
            style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#9CA3AF", minHeight: "38px" }}
          >
            — sélectionnez un module pour voir les compétences —
          </div>
        )}
      </div>
    </div>
  );
}
