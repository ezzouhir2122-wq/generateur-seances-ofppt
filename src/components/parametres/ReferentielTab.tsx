"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { utils, writeFile } from "xlsx";

interface ReferentielFiliere {
  id: string;
  nom: string;
  code: string | null;
  modules: { id: string; nom: string; code: string | null; mhg?: number | null }[];
}

interface ReferentielSecteur {
  id: string;
  nom: string;
  filieres: ReferentielFiliere[];
}

interface ImportStats {
  modulesCreated: number;
  competencesCreated: number;
  objectifsCreated: number;
  criteresCreated: number;
}

export default function ReferentielTab() {
  const [secteurs, setSecteurs]                     = useState<ReferentielSecteur[]>([]);
  const [loadingList, setLoadingList]               = useState(true);
  const [listError, setListError]                   = useState(false);
  const [expandedId, setExpandedId]                 = useState<string | null>(null);
  const [uploading, setUploading]                   = useState(false);
  const [templateUploading, setTemplateUploading]   = useState(false);
  const [importResult, setImportResult]             = useState<{ filiere: string; secteur: string; stats: ImportStats } | null>(null);
  const [importError, setImportError]               = useState<string | null>(null);
  const fileRef         = useRef<HTMLInputElement>(null);
  const templateFileRef = useRef<HTMLInputElement>(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setListError(false);
    try {
      const res = await fetch("/api/referentiel?mode=list");
      if (!res.ok) throw new Error();
      setSecteurs(await res.json());
    } catch {
      setListError(true);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const handleAiImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImportResult(null);
    setImportError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/referentiel", { method: "POST", body: fd });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let json: any = {};
      try { json = await res.json(); } catch { /* empty */ }
      if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
      setImportResult(json);
      toast.success("Référentiel importé avec succès");
      loadList();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Erreur lors de l'import");
    } finally {
      setUploading(false);
    }
  };

  const handleTemplateImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setTemplateUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/referentiel", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `Erreur ${res.status}`);
      toast.success(`✅ Importé — ${(json as { stats?: { modulesCreated?: number } }).stats?.modulesCreated ?? 0} modules`);
      loadList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur import");
    } finally {
      setTemplateUploading(false);
    }
  };

  const deleteSecteur = async (id: string, nom: string) => {
    if (!confirm(`Supprimer « ${nom} » et toutes ses filières / modules ?`)) return;
    await fetch(`/api/referentiel?secteurId=${encodeURIComponent(id)}`, { method: "DELETE" });
    setSecteurs((prev) => prev.filter((s) => s.id !== id));
    toast.success(`« ${nom} » supprimé`);
  };

  const exportExcel = (secteur: ReferentielSecteur) => {
    const rows = secteur.filieres.flatMap((f) =>
      f.modules.map((m) => ({
        "Secteur":         secteur.nom,
        "Filière":         f.nom,
        "N° Module":       m.code ?? "",
        "Intitulé Module": m.nom,
        "MHG (h)":         m.mhg ?? "",
      }))
    );
    if (rows.length === 0) { toast.error("Aucun module à exporter"); return; }
    const ws = utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 22 }, { wch: 30 }, { wch: 12 }, { wch: 50 }, { wch: 10 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Référentiel");
    const safe = secteur.nom.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").toLowerCase();
    writeFile(wb, `referentiel-${safe}.xlsx`);
  };

  return (
    <div className="lg:grid lg:grid-cols-2 gap-6">
      <div className="space-y-4 mb-6 lg:mb-0">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
          <h2 className="text-base font-semibold mb-1" style={{ color: "#111827" }}>Import IA</h2>
          <p className="text-xs mb-4" style={{ color: "#6B7280" }}>
            L&apos;IA extrait automatiquement filières, modules, compétences et objectifs.
          </p>

          {importResult && (
            <div className="rounded-lg px-3 py-2 mb-3" style={{ background: "#E8F5E9", border: "1px solid #A5D6A7" }}>
              <p className="text-sm font-semibold" style={{ color: "#2E7D32" }}>✅ Importé avec succès</p>
              <p className="text-xs mt-0.5" style={{ color: "#4B5563" }}>
                <strong>{importResult.filiere}</strong> · {importResult.secteur}
              </p>
              <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
                {importResult.stats.modulesCreated} modules · {importResult.stats.competencesCreated} compétences
              </p>
            </div>
          )}

          {importError && (
            <div className="rounded-lg px-3 py-2 mb-3" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
              <p className="text-xs" style={{ color: "#DC2626" }}>{importError}</p>
            </div>
          )}

          <label className="flex items-center justify-center gap-2 cursor-pointer w-full text-white text-sm py-2.5 rounded-lg font-medium transition-opacity" style={{ background: "#003087", opacity: uploading ? 0.7 : 1 }}>
            {uploading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Extraction IA… (15-30 sec)
              </>
            ) : (
              <>📥 Importer un référentiel</>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.md,.markdown"
              className="hidden"
              onChange={handleAiImport}
              disabled={uploading}
            />
          </label>

          <div className="flex gap-1 flex-wrap mt-3">
            {["PDF", "DOCX", "Excel", "CSV", "MD"].map((fmt) => (
              <span key={fmt} className="rounded px-2 py-0.5 font-mono text-[10px]" style={{ background: "#F5F7FA", border: "1px solid #003087", color: "#003087" }}>
                {fmt}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5" style={{ borderColor: "#A5D6A7", background: "#F0FFF4" }}>
          <h2 className="text-sm font-semibold mb-1" style={{ color: "#2E7D32" }}>⚡ Import sans IA (instantané)</h2>
          <p className="text-xs mb-3" style={{ color: "#388E3C" }}>
            Remplissez le modèle Excel et importez-le — aucune clé API requise.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => templateFileRef.current?.click()}
              disabled={templateUploading}
              className="rounded px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              style={{ background: "#2E7D32", color: "#fff" }}
            >
              {templateUploading ? "Import…" : "📂 Importer mon fichier Excel"}
            </button>
            <a
              href="/api/referentiel?mode=template"
              download="modele-referentiel-ofppt.xlsx"
              className="inline-block rounded px-3 py-1.5 text-xs font-semibold"
              style={{ background: "#FFFFFF", color: "#2E7D32", border: "1px solid #A5D6A7" }}
            >
              📥 Télécharger le modèle
            </a>
          </div>
          <input ref={templateFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleTemplateImport} />
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: "#111827" }}>Référentiels importés</h2>
          <button onClick={loadList} className="text-xs" style={{ color: "#9CA3AF" }}>↺ Actualiser</button>
        </div>

        {loadingList ? (
          <div className="flex items-center justify-center py-10">
            <span className="w-5 h-5 border-2 border-[#003087] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : listError ? (
          <div className="rounded-lg p-3 text-center" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
            <p className="text-xs" style={{ color: "#DC2626" }}>Impossible de charger les référentiels</p>
            <button onClick={loadList} className="text-[10px] mt-1" style={{ color: "#9CA3AF" }}>↺ Réessayer</button>
          </div>
        ) : secteurs.length === 0 ? (
          <div className="rounded-lg p-6 text-center" style={{ background: "#F3F4F6", border: "1px solid #E2E8F0" }}>
            <p className="text-2xl mb-2">📭</p>
            <p className="text-sm font-medium" style={{ color: "#6B7280" }}>Aucun référentiel importé</p>
            <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>Importez un référentiel via la section ci-contre</p>
          </div>
        ) : (
          <div className="space-y-2">
            {secteurs.map((s) => {
              const totalModules = s.filieres.reduce((acc, f) => acc + f.modules.length, 0);
              const isExpanded   = expandedId === s.id;
              return (
                <div key={s.id} className="rounded-lg overflow-hidden" style={{ border: "1px solid #E2E8F0" }}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors"
                    style={{ background: "#F9FAFB" }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] transition-transform duration-200" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block", color: "#6B7280" }}>▶</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: "#111827" }}>{s.nom}</p>
                        <p className="text-[10px]" style={{ color: "#6B7280" }}>
                          {s.filieres.length} filière{s.filieres.length > 1 ? "s" : ""} · {totalModules} module{totalModules > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); exportExcel(s); }}
                        className="text-[10px] px-2 py-0.5 rounded font-medium"
                        style={{ color: "#003087" }}
                      >
                        ↓ Excel
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSecteur(s.id, s.nom); }}
                        className="text-[10px] px-2 py-0.5 rounded font-medium"
                        style={{ color: "#EF4444" }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </button>

                  {isExpanded && (
                    <div style={{ borderTop: "1px solid #E2E8F0" }}>
                      {s.filieres.map((f, idx) => (
                        <div
                          key={f.id}
                          className="px-3 py-2"
                          style={{ borderTop: idx > 0 ? "1px solid #F3F4F6" : undefined, background: "#FAFAFA" }}
                        >
                          <p className="text-xs font-medium" style={{ color: "#003087" }}>
                            {f.code ? <span className="font-mono text-[10px] mr-1" style={{ color: "#6B7280" }}>{f.code}</span> : null}
                            {f.nom}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {f.modules.map((m) => (
                              <span
                                key={m.id}
                                className="text-[9px] px-1.5 py-0.5 rounded"
                                style={{ background: "#F3F4F6", color: "#6B7280", border: "1px solid #E2E8F0" }}
                                title={m.nom}
                              >
                                {m.code ? `${m.code} · ` : ""}{m.nom.length > 28 ? m.nom.slice(0, 28) + "…" : m.nom}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
