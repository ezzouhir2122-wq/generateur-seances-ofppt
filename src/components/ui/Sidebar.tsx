"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { read, utils, writeFile } from "xlsx";
import { toast } from "sonner";

interface Stats {
  seancesCount: number;
  modulesCount: number;
  filieresCount: number;
}

interface ReferentielStats {
  secteur: string;
  filiere: string;
  stats: { modulesCreated: number; competencesCreated: number; objectifsCreated: number; criteresCreated: number };
}

interface ReferentielItem {
  id: string;
  nom: string;
  code: string | null;
  filieres: {
    id: string;
    nom: string;
    code: string | null;
    modules: { id: string; nom: string; code: string | null; mhg?: number | null }[];
  }[];
}

interface ModuleRow {
  groupe: string;
  codeModule: string;
  module: string;
  mhg: number;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  user: {
    name?: string | null;
    email?: string | null;
    matricule?: string | null;
    etablissement?: string | null;
  };
  claudeKey?: boolean;
  openaiKey?: boolean;
}

export default function Sidebar({ open, onClose, user }: SidebarProps) {
  const [stats, setStats] = useState<Stats>({ seancesCount: 0, modulesCount: 0, filieresCount: 0 });
  const [preview, setPreview] = useState<{ rows: number; data: ModuleRow[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importingFromRef, setImportingFromRef] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Référentiel pédagogique state
  const [refFile, setRefFile] = useState<File | null>(null);
  const [refUploading, setRefUploading] = useState(false);
  const [refResult, setRefResult] = useState<ReferentielStats | null>(null);
  const [refError, setRefError] = useState<string | null>(null);
  const refFileRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [matricule, setMatricule] = useState(user.matricule ?? "");
  const [etablissement, setEtablissement] = useState(user.etablissement ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // API Settings
  const [claudeKey, setClaudeKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [preferredModel, setPreferredModel] = useState("claude-sonnet-4-6");
  const [savingApi, setSavingApi] = useState(false);
  const [hasClaudeKey, setHasClaudeKey] = useState(false);
  const [hasOpenaiKey, setHasOpenaiKey] = useState(false);
  const [hasOpenrouterKey, setHasOpenrouterKey] = useState(false);
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showOpenrouterKey, setShowOpenrouterKey] = useState(false);
  const [apiProvider, setApiProvider] = useState<"anthropic" | "openai" | "openrouter">("anthropic");

  const [referentiels, setReferentiels] = useState<ReferentielItem[]>([]);
  const [expandedSecteur, setExpandedSecteur] = useState<string | null>(null);
  const [refListLoading, setRefListLoading] = useState(false);
  const [refListError, setRefListError] = useState(false);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricule: matricule.trim(), etablissement: etablissement.trim() }),
      });
      if (!res.ok) throw new Error("Erreur");
      toast.success("Profil sauvegardé");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingProfile(false);
    }
  };

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) setStats(await res.json());
    } catch {}
  }, []);

  const loadReferentiels = useCallback(async () => {
    setRefListLoading(true);
    setRefListError(false);
    try {
      const res = await fetch("/api/referentiel");
      if (res.ok) {
        setReferentiels(await res.json());
      } else {
        setRefListError(true);
      }
    } catch {
      setRefListError(true);
    } finally {
      setRefListLoading(false);
    }
  }, []);

  const loadApiSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/user/api-settings");
      if (res.ok) {
        const data = await res.json();
        setPreferredModel(data.preferredModel ?? "claude-sonnet-4-6");
        setHasClaudeKey(data.hasClaudeKey);
        setHasOpenaiKey(data.hasOpenaiKey);
        setHasOpenrouterKey(data.hasOpenrouterKey ?? false);
        if (data.claudeApiKey) setClaudeKey(data.claudeApiKey);
        if (data.openaiApiKey) setOpenaiKey(data.openaiApiKey);
        if (data.openrouterApiKey) setOpenrouterKey(data.openrouterApiKey);
        // Auto-select tab based on preferredModel
        const m = data.preferredModel ?? "";
        if (m.startsWith("gpt") || m.startsWith("o1") || m.startsWith("o3")) setApiProvider("openai");
        else if (m.startsWith("openrouter/") || m.includes("/")) setApiProvider("openrouter");
        else setApiProvider("anthropic");
      }
    } catch {}
  }, []);

  const saveApiSettings = async () => {
    setSavingApi(true);
    try {
      const res = await fetch("/api/user/api-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claudeApiKey: claudeKey, openaiApiKey: openaiKey, openrouterApiKey: openrouterKey, preferredModel }),
      });
      if (!res.ok) throw new Error();
      toast.success("Paramètres API sauvegardés");
      await loadApiSettings();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingApi(false);
    }
  };

  useEffect(() => {
    if (open) { loadStats(); loadReferentiels(); loadApiSettings(); }
  }, [open, loadStats, loadReferentiels, loadApiSettings]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = read(ev.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
        if (raw.length === 0) { toast.error("Fichier vide ou non reconnu"); return; }

        // Détection des colonnes par nom d'en-tête (format OFPPT)
        const headers = Object.keys(raw[0]);
        const matched = new Set<string>();
        const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s._-]/g, "");
        const find = (keywords: string[]) => {
          const h = headers.find((h) => !matched.has(h) && keywords.some((k) => norm(h).includes(norm(k)))) ?? "";
          if (h) matched.add(h);
          return h;
        };

        const colFiliere = find(["filiere", "filière", "groupe", "group", "section"]);
        const colCode    = find(["code module", "codemodule", "code_module", "code"]);
        const colIntitule = find(["intitule module", "intitulé module", "intituledumodule", "intitule du module", "intitule", "intitulé", "libelle", "libellé", "matiere", "designation"]);
        const colMhg    = find(["masse horaire", "massehoraire", "mhg", "mh.g", "charge horaire", "chargehoraire", "horaire", "volume", "heure"]);

        const data = raw
          .map((r) => ({
            groupe: String(r[colFiliere] ?? "").trim(),
            codeModule: String(r[colCode] ?? "").trim(),
            module: String(r[colIntitule] ?? "").trim(),
            mhg: Number(String(r[colMhg] ?? "0").replace(/[^0-9.]/g, "")) || 0,
          }))
          .filter((r) => r.groupe && r.module);

        setPreview({ rows: data.length, data });
      } catch {
        toast.error("Impossible de lire le fichier Excel");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      const res = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules: preview.data }),
      });
      const json = await res.json();
      toast.success(`✅ ${json.count} modules importés avec succès`);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      loadStats();
    } catch {
      toast.error("Erreur lors de l'import");
    } finally {
      setImporting(false);
    }
  };

  const resetModules = async () => {
    if (!confirm("Supprimer tous les modules importés ?")) return;
    await fetch("/api/modules", { method: "DELETE" });
    toast.success("Modules réinitialisés");
    loadStats();
  };

  const importFromReferentiel = async () => {
    setImportingFromRef(true);
    try {
      const res = await fetch("/api/referentiel?mode=summary");
      if (!res.ok) throw new Error("Impossible de charger le référentiel");
      const filieres: { id: string; nom: string; code: string | null; modules: { id: string; nom: string; code: string | null; mhg: number | null }[] }[] = await res.json();

      if (filieres.length === 0) {
        toast.error("Aucun référentiel importé — importez d'abord un référentiel pédagogique");
        return;
      }

      const modules = filieres.flatMap((f) =>
        f.modules.map((m) => ({
          groupe: f.nom,
          codeModule: m.code ?? "",
          module: m.nom,
          mhg: m.mhg ?? 0,
        }))
      );

      const postRes = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules }),
      });
      const json = await postRes.json();
      toast.success(`✅ ${json.count} modules synchronisés depuis le référentiel`);
      loadStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la synchronisation");
    } finally {
      setImportingFromRef(false);
    }
  };

  const handleRefFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRefFile(file);
    setRefResult(null);
    setRefError(null);
  };

  const uploadReferentiel = async () => {
    if (!refFile) return;
    setRefUploading(true);
    setRefError(null);
    try {
      const fd = new FormData();
      fd.append("file", refFile);
      const res = await fetch("/api/referentiel", { method: "POST", body: fd });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let json: any = {};
      try { json = await res.json(); } catch {
        if (!res.ok) throw new Error(`Erreur serveur (${res.status}) — le fichier est peut-être trop volumineux. Réessayez.`);
      }
      if (!res.ok) throw new Error(json.error ?? "Erreur inconnue");
      setRefResult(json);
      setRefFile(null);
      if (refFileRef.current) refFileRef.current.value = "";
      toast.success("Référentiel importé avec succès");
      loadReferentiels();
    } catch (err) {
      setRefError(err instanceof Error ? err.message : "Erreur lors de l'import");
    } finally {
      setRefUploading(false);
    }
  };

  const resetReferentiel = async () => {
    if (!confirm("Supprimer tout le référentiel importé ?")) return;
    await fetch("/api/referentiel", { method: "DELETE" });
    setRefResult(null);
    setReferentiels([]);
    toast.success("Référentiel réinitialisé");
  };

  const deleteSecteur = async (secteurId: string, nom: string) => {
    if (!confirm(`Supprimer le secteur « ${nom} » et toutes ses filières ?`)) return;
    await fetch(`/api/referentiel?secteurId=${secteurId}`, { method: "DELETE" });
    setReferentiels(prev => prev.filter(s => s.id !== secteurId));
    toast.success(`Secteur « ${nom} » supprimé`);
  };

  const exportSecteurExcel = (secteur: ReferentielItem) => {
    const rows = secteur.filieres.flatMap((f) =>
      f.modules.map((m) => ({
        "Secteur": secteur.nom,
        "Filière": f.nom,
        "N° Module": m.code ?? "",
        "Intitulé Module": m.nom,
        "MHG (h)": m.mhg ?? "",
      }))
    );
    if (rows.length === 0) { toast.error("Aucun module à exporter"); return; }
    const ws = utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 22 }, { wch: 30 }, { wch: 12 }, { wch: 50 }, { wch: 10 }];
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Référentiel");
    writeFile(wb, `referentiel-${secteur.nom.replace(/\s+/g, "-").toLowerCase()}.xlsx`);
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panneau */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full w-[380px] shadow-2xl z-50 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "#F8FAFC", borderRight: "1px solid #E2E8F0" }}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid #E2E8F0", background: "#FFFFFF" }}>
          <div className="flex items-center gap-3">
            <Image src="/logo-ofppt.jpg" alt="OFPPT" width={32} height={32} className="rounded-full object-cover" />
            <span className="font-semibold" style={{ color: "#111827" }}>Paramètres & Modules</span>
          </div>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-gray-900 text-xl leading-none">✕</button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto" style={{ borderTop: "none" }}>

          {/* Profil */}
          <section className="px-5 py-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#4B5563" }}>👤 Profil</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg text-black" style={{ background: "#0A4DA8" }}>
                {user.name?.[0]?.toUpperCase() ?? "F"}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "#111827" }}>{user.name ?? "Formateur"}</p>
                <p className="text-xs" style={{ color: "#9CA3AF" }}>{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => { signOut({ callbackUrl: "/login" }); }}
              className="mt-3 text-xs transition-colors"
              style={{ color: "#EF4444" }}
            >
              Déconnexion
            </button>
            {/* Infos PDF */}
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#4B5563" }}>Infos pour les PDF</p>
              <input
                type="text"
                placeholder="Matricule (ex: 9559)"
                value={matricule}
                onChange={e => setMatricule(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg outline-none"
                style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#E5E7EB" }}
              />
              <input
                type="text"
                placeholder="Établissement (ex: ISTA Hay Riad)"
                value={etablissement}
                onChange={e => setEtablissement(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg outline-none"
                style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#E5E7EB" }}
              />
              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="w-full text-xs py-2 rounded-lg font-medium text-black disabled:opacity-50 transition-colors"
                style={{ background: "#0A4DA8" }}
              >
                {savingProfile ? "Sauvegarde…" : "Sauvegarder le profil"}
              </button>
            </div>
          </section>

          {/* Import Excel — en haut pour accès rapide */}
          <section className="px-5 py-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#4B5563" }}>📋 Affectation des modules</h3>
            <p className="text-xs mb-3" style={{ color: "#4B5563" }}>Préremplissez automatiquement les formulaires via le référentiel ou un fichier Excel.</p>

            {stats.modulesCount > 0 && !preview && (
              <div className="rounded-lg px-3 py-2 mb-3 flex items-center justify-between" style={{ background: "#0A4DA814", border: "1px solid #0A4DA830" }}>
                <span className="text-sm" style={{ color: "#0A4DA8" }}>
                  <span className="font-semibold">{stats.modulesCount} modules</span> — <span className="font-semibold">{stats.filieresCount} groupes</span>
                </span>
                <button onClick={resetModules} className="text-xs" style={{ color: "#EF4444" }}>🗑 Vider</button>
              </div>
            )}

            {!preview ? (
              <div className="space-y-2">
                {/* Sync depuis référentiel */}
                <button
                  onClick={importFromReferentiel}
                  disabled={importingFromRef}
                  className="flex items-center gap-2 w-full justify-center text-white text-sm py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50"
                  style={{ background: "#1F5DDB" }}
                >
                  {importingFromRef ? (
                    <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Synchronisation…</>
                  ) : (
                    <><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Synchroniser depuis le référentiel</>
                  )}
                </button>
                <div className="rounded-lg px-3 py-2 text-[10px]" style={{ background: "#1F5DDB0D", border: "1px solid #1F5DDB30", color: "#6B9FEF" }}>
                  Utilise automatiquement les filières et modules du référentiel importé
                </div>

                {/* Séparateur */}
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-px" style={{ background: "#E2E8F0" }} />
                  <span className="text-[10px]" style={{ color: "#374151" }}>ou</span>
                  <div className="flex-1 h-px" style={{ background: "#E2E8F0" }} />
                </div>

                <label className="flex items-center gap-2 cursor-pointer w-full justify-center text-black text-sm py-2.5 rounded-lg transition-colors font-medium" style={{ background: "#0A4DA8" }}>
                  <span>📥</span> Importer fichier Excel (.xlsx)
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
                </label>
                <div className="rounded-lg p-3 text-xs space-y-1" style={{ background: "#F3F4F6", border: "1px solid #E2E8F0" }}>
                  <p className="font-semibold" style={{ color: "#374151" }}>Format accepté :</p>
                  <p style={{ color: "#9CA3AF" }}>Colonnes détectées automatiquement par nom d&apos;en-tête.</p>
                  <p style={{ color: "#9CA3AF" }}>Colonnes attendues :</p>
                  <div className="font-mono rounded px-2 py-1.5 mt-1 text-[10px] space-y-0.5" style={{ background: "#F5F7FA", border: "1px solid #E2E8F0", color: "#9CA3AF" }}>
                    <p>• <span className="font-semibold" style={{ color: "#0A4DA8" }}>Filière</span></p>
                    <p>• <span className="font-semibold" style={{ color: "#0A4DA8" }}>Code Module</span></p>
                    <p>• <span className="font-semibold" style={{ color: "#0A4DA8" }}>Intitulé module</span></p>
                    <p>• <span className="font-semibold" style={{ color: "#0A4DA8" }}>Masse horaire</span></p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg p-3" style={{ background: "#0A4DA814", border: "1px solid #0A4DA830" }}>
                  <p className="text-sm font-semibold" style={{ color: "#0A4DA8" }}>{preview.rows} ligne{preview.rows > 1 ? "s" : ""} détectée{preview.rows > 1 ? "s" : ""}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Aperçu des 5 premières lignes :</p>
                </div>
                <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid #E2E8F0" }}>
                  <table className="w-full text-xs">
                    <thead style={{ background: "#F3F4F6", borderBottom: "1px solid #E2E8F0" }}>
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap" style={{ color: "#4B5563" }}>Filière</th>
                        <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap" style={{ color: "#4B5563" }}>Code</th>
                        <th className="px-2 py-1.5 text-left font-semibold whitespace-nowrap" style={{ color: "#4B5563" }}>Intitulé module</th>
                        <th className="px-2 py-1.5 text-right font-semibold whitespace-nowrap" style={{ color: "#4B5563" }}>M.H</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.data.slice(0, 5).map((row, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #E2E8F0", background: i % 2 === 0 ? "#F8FAFC" : "#F3F4F6" }}>
                          <td className="px-2 py-1 font-medium whitespace-nowrap" style={{ color: "#111827" }}>{row.groupe}</td>
                          <td className="px-2 py-1 whitespace-nowrap" style={{ color: "#9CA3AF" }}>{row.codeModule}</td>
                          <td className="px-2 py-1 max-w-[110px] truncate" style={{ color: "#9CA3AF" }}>{row.module}</td>
                          <td className="px-2 py-1 text-right whitespace-nowrap" style={{ color: "#0A4DA8" }}>{row.mhg}h</td>
                        </tr>
                      ))}
                      {preview.rows > 5 && (
                        <tr><td colSpan={4} className="px-2 py-1 text-center italic" style={{ color: "#4B5563" }}>… et {preview.rows - 5} autres lignes</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={confirmImport}
                    disabled={importing}
                    className="flex-1 text-black text-sm py-2 rounded-lg transition-colors disabled:opacity-50 font-medium"
                    style={{ background: "#0A4DA8" }}
                  >
                    {importing ? "Import en cours…" : "✅ Confirmer l'import"}
                  </button>
                  <button
                    onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                    className="flex-1 text-sm py-2 rounded-lg transition-colors"
                    style={{ border: "1px solid #E2E8F0", color: "#9CA3AF" }}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Référentiel Pédagogique */}
          <section className="px-5 py-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#4B5563" }}>📚 Référentiel Pédagogique OFPPT</h3>
            <p className="text-xs mb-3" style={{ color: "#4B5563" }}>Importez un référentiel (PDF, DOCX, Excel) — l&apos;IA extrait automatiquement filières, modules, compétences, objectifs et critères.</p>

            {refResult && (
              <div className="rounded-lg px-3 py-2 mb-3" style={{ background: "#0A4DA814", border: "1px solid #0A4DA830" }}>
                <p className="text-sm font-semibold" style={{ color: "#0A4DA8" }}>✅ Importé avec succès</p>
                <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                  <span className="font-medium">{refResult.filiere}</span> · {refResult.secteur}
                </p>
                <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>
                  {refResult.stats.modulesCreated} modules · {refResult.stats.competencesCreated} compétences · {refResult.stats.objectifsCreated} objectifs · {refResult.stats.criteresCreated} critères
                </p>
                <button onClick={resetReferentiel} className="text-xs mt-1.5" style={{ color: "#EF4444" }}>🗑 Vider le référentiel</button>
              </div>
            )}

            {refError && (
              <div className="rounded-lg px-3 py-2 mb-3" style={{ background: "#2A1010", border: "1px solid #7F1D1D" }}>
                <p className="text-xs text-red-400">{refError}</p>
              </div>
            )}

            {!refFile ? (
              <label className="flex items-center gap-2 cursor-pointer w-full justify-center text-black text-sm py-2.5 rounded-lg transition-colors font-medium" style={{ background: "#0A4DA8" }}>
                <span>📥</span> Importer un référentiel
                <input
                  ref={refFileRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.md,.markdown"
                  className="hidden"
                  onChange={handleRefFile}
                />
              </label>
            ) : (
              <div className="space-y-2">
                <div className="rounded-lg px-3 py-2" style={{ background: "#F3F4F6", border: "1px solid #E2E8F0" }}>
                  <p className="text-xs font-semibold truncate" style={{ color: "#111827" }}>📄 {refFile.name}</p>
                  <p className="text-[10px]" style={{ color: "#9CA3AF" }}>{(refFile.size / 1024).toFixed(0)} Ko</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={uploadReferentiel}
                    disabled={refUploading}
                    className="flex-1 text-black text-sm py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                    style={{ background: "#0A4DA8" }}
                  >
                    {refUploading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        Extraction IA…
                      </>
                    ) : "🤖 Extraire & Importer"}
                  </button>
                  <button
                    onClick={() => { setRefFile(null); if (refFileRef.current) refFileRef.current.value = ""; }}
                    className="px-3 text-sm rounded-lg transition-colors"
                    style={{ border: "1px solid #E2E8F0", color: "#9CA3AF" }}
                  >
                    ✕
                  </button>
                </div>
                <div className="rounded-lg px-3 py-2" style={{ background: "#F59E0B14", border: "1px solid #F59E0B30" }}>
                  <p className="text-[10px]" style={{ color: "#F59E0B" }}>L&apos;extraction IA peut prendre 15–30 secondes selon la taille du document.</p>
                </div>
              </div>
            )}

            <div className="mt-3 rounded-lg p-3 text-xs space-y-1" style={{ background: "#F3F4F6", border: "1px solid #E2E8F0" }}>
              <p className="font-semibold" style={{ color: "#374151" }}>Formats acceptés :</p>
              <div className="flex gap-2 flex-wrap mt-1">
                {["PDF", "DOCX", "Excel", "MD"].map((f) => (
                  <span key={f} className="rounded px-2 py-0.5 font-mono text-[10px]" style={{ background: "#F5F7FA", border: "1px solid #0A4DA840", color: "#0A4DA8" }}>{f}</span>
                ))}
              </div>
              <p className="text-[10px] mt-1" style={{ color: "#4B5563" }}>L&apos;IA extrait : Filière · Module · Compétence · Objectif · Critères de performance</p>
            </div>
          </section>

          {/* Référentiels importés */}
          <section className="px-5 py-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9CA3AF" }}>
              🗂️ Référentiels importés
            </h3>

            {refListLoading ? (
              <div className="rounded-lg px-3 py-3 text-center" style={{ background: "#F3F4F6", border: "1px solid #E2E8F0" }}>
                <p className="text-xs" style={{ color: "#9CA3AF" }}>Chargement…</p>
              </div>
            ) : refListError ? (
              <div className="rounded-lg px-3 py-3 text-center" style={{ background: "#2A1010", border: "1px solid #7F1D1D" }}>
                <p className="text-xs text-red-400">Impossible de charger les référentiels</p>
                <button onClick={loadReferentiels} className="text-[10px] mt-1" style={{ color: "#9CA3AF" }}>↺ Réessayer</button>
              </div>
            ) : referentiels.length === 0 ? (
              <div className="rounded-lg px-3 py-3 text-center" style={{ background: "#F3F4F6", border: "1px solid #E2E8F0" }}>
                <p className="text-xs" style={{ color: "#9CA3AF" }}>Aucun référentiel importé</p>
                <p className="text-[10px] mt-1" style={{ color: "#4B5563" }}>Importez un référentiel via la section ci-dessus</p>
              </div>
            ) : (
              <div className="space-y-2">
                {referentiels.map(secteur => {
                  const totalModules = secteur.filieres.reduce((acc, f) => acc + f.modules.length, 0);
                  const isExpanded = expandedSecteur === secteur.id;
                  return (
                    <div key={secteur.id} className="rounded-lg overflow-hidden" style={{ border: "1px solid #E2E8F0" }}>
                      {/* Secteur header */}
                      <button
                        onClick={() => setExpandedSecteur(isExpanded ? null : secteur.id)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors"
                        style={{ background: "#F3F4F6" }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "#E2E8F0"}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "#F3F4F6"}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] transition-transform duration-200" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block", color: "#4B5563" }}>▶</span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: "#111827" }}>{secteur.nom}</p>
                            <p className="text-[10px]" style={{ color: "#4B5563" }}>
                              {secteur.filieres.length} filière{secteur.filieres.length > 1 ? "s" : ""} · {totalModules} module{totalModules > 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          <button
                            onClick={e => { e.stopPropagation(); exportSecteurExcel(secteur); }}
                            className="text-[10px] px-2 py-0.5 rounded transition-colors"
                            style={{ color: "#0A4DA8", border: "1px solid transparent" }}
                            title="Exporter Excel"
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#0A4DA830"; (e.currentTarget as HTMLButtonElement).style.background = "#0A4DA810"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.background = ""; }}
                          >
                            ↓
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); deleteSecteur(secteur.id, secteur.nom); }}
                            className="text-[10px] px-2 py-0.5 rounded transition-colors"
                            style={{ color: "#EF4444", border: "1px solid transparent" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#EF444430"; (e.currentTarget as HTMLButtonElement).style.background = "#EF444410"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent"; (e.currentTarget as HTMLButtonElement).style.background = ""; }}
                          >
                            🗑
                          </button>
                        </div>
                      </button>

                      {/* Filières list */}
                      {isExpanded && (
                        <div style={{ borderTop: "1px solid #E2E8F0" }}>
                          {secteur.filieres.map((filiere, idx) => (
                            <div
                              key={filiere.id}
                              className="px-3 py-2"
                              style={{
                                borderTop: idx > 0 ? "1px solid #F3F4F6" : undefined,
                                background: "#F8FAFC",
                              }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate" style={{ color: "#0A4DA8" }}>
                                    {filiere.code ? <span className="font-mono text-[10px] mr-1.5" style={{ color: "#4B5563" }}>{filiere.code}</span> : null}
                                    {filiere.nom}
                                  </p>
                                  <p className="text-[10px] mt-0.5" style={{ color: "#4B5563" }}>
                                    {filiere.modules.length} module{filiere.modules.length > 1 ? "s" : ""}
                                  </p>
                                  {/* Module names */}
                                  {filiere.modules.length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      {filiere.modules.map(mod => (
                                        <span
                                          key={mod.id}
                                          className="text-[9px] px-1.5 py-0.5 rounded"
                                          style={{ background: "#F3F4F6", color: "#6B7280", border: "1px solid #E2E8F0", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                          title={mod.nom}
                                        >
                                          {mod.code ? `${mod.code} · ` : ""}{mod.nom.length > 28 ? mod.nom.slice(0, 28) + "…" : mod.nom}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
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
          </section>

          {/* Stats */}
          <section className="px-5 py-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#4B5563" }}>📊 Statistiques</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Séances", value: stats.seancesCount },
                { label: "Modules", value: stats.modulesCount },
                { label: "Groupes", value: stats.filieresCount },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "#F3F4F6", border: "1px solid #E2E8F0" }}>
                  <p className="text-2xl font-bold" style={{ color: "#0A4DA8" }}>{s.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Paramètres API */}
          <section className="px-5 py-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#4B5563" }}>🔑 Paramètres API & Modèle IA</h3>
            <p className="text-xs mb-4" style={{ color: "#6B7280" }}>Sélectionnez votre fournisseur, choisissez un modèle et saisissez votre clé API.</p>

            {/* Onglets fournisseur */}
            <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: "#F3F4F6", border: "1px solid #E2E8F0" }}>
              {([
                { id: "anthropic", label: "Anthropic", dot: "#E8651A", badge: hasClaudeKey },
                { id: "openai",    label: "OpenAI",    dot: "#10A37F", badge: hasOpenaiKey },
                { id: "openrouter",label: "OpenRouter", dot: "#6366F1", badge: hasOpenrouterKey },
              ] as const).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setApiProvider(p.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all relative"
                  style={
                    apiProvider === p.id
                      ? { background: "#FFFFFF", color: "#111827", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                      : { color: "#6B7280" }
                  }
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.dot }} />
                  {p.label}
                  {p.badge && (
                    <span className="w-1.5 h-1.5 rounded-full absolute top-1.5 right-1.5" style={{ background: p.dot }} />
                  )}
                </button>
              ))}
            </div>

            {/* Modèles selon fournisseur */}
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "#6B7280" }}>Modèle IA</p>
              <div className="space-y-1.5">
                {(apiProvider === "anthropic" ? [
                  { id: "claude-opus-4-8",           label: "Claude Opus 4.8",   sub: "Meilleur", color: "#E8651A" },
                  { id: "claude-sonnet-4-6",         label: "Claude Sonnet 4.6", sub: "Équilibré", color: "#E8651A" },
                  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5",  sub: "Rapide",   color: "#E8651A" },
                ] : apiProvider === "openai" ? [
                  { id: "gpt-4o",       label: "GPT-4o",      sub: "Meilleur",  color: "#10A37F" },
                  { id: "gpt-4o-mini",  label: "GPT-4o Mini", sub: "Rapide",    color: "#10A37F" },
                  { id: "o3-mini",      label: "o3-mini",     sub: "Raisonnement", color: "#10A37F" },
                ] : [
                  { id: "openrouter/google/gemini-2.5-pro",         label: "Gemini 2.5 Pro",     sub: "Google · Meilleur",  color: "#6366F1" },
                  { id: "openrouter/anthropic/claude-sonnet-4-5",   label: "Claude Sonnet 4.5",  sub: "Anthropic via OR",   color: "#6366F1" },
                  { id: "openrouter/meta-llama/llama-4-maverick",   label: "Llama 4 Maverick",   sub: "Meta · Gratuit",     color: "#6366F1" },
                  { id: "openrouter/mistralai/mistral-large",       label: "Mistral Large",      sub: "Mistral AI",         color: "#6366F1" },
                  { id: "openrouter/deepseek/deepseek-r1",          label: "DeepSeek R1",        sub: "Raisonnement",       color: "#6366F1" },
                ]).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPreferredModel(m.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                    style={{
                      background: preferredModel === m.id ? `${m.color}12` : "#F3F4F6",
                      border: `1px solid ${preferredModel === m.id ? m.color + "50" : "#E2E8F0"}`,
                    }}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center"
                      style={{ background: preferredModel === m.id ? m.color : "transparent", border: `2px solid ${preferredModel === m.id ? m.color : "#D1D5DB"}` }}
                    >
                      {preferredModel === m.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <div>
                      <p className="text-xs font-semibold leading-tight" style={{ color: preferredModel === m.id ? m.color : "#111827" }}>{m.label}</p>
                      <p className="text-[10px] leading-tight mt-0.5" style={{ color: "#9CA3AF" }}>{m.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Clé API selon fournisseur */}
            {apiProvider === "anthropic" && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#6B7280" }}>Clé API Anthropic</p>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: hasClaudeKey ? "#E8651A14" : "#F3F4F6", color: hasClaudeKey ? "#E8651A" : "#9CA3AF" }}>
                    {hasClaudeKey ? "✓ Active" : "Non configurée"}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showClaudeKey ? "text" : "password"}
                    placeholder={hasClaudeKey ? "••••••••••••••••••••••" : "sk-ant-api03-..."}
                    value={claudeKey}
                    onChange={e => setClaudeKey(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-lg pr-14 outline-none font-mono"
                    style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#111827" }}
                  />
                  <button type="button" onClick={() => setShowClaudeKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: "#9CA3AF" }}>
                    {showClaudeKey ? "Cacher" : "Voir"}
                  </button>
                </div>
              </div>
            )}

            {apiProvider === "openai" && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#6B7280" }}>Clé API OpenAI</p>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: hasOpenaiKey ? "#10A37F14" : "#F3F4F6", color: hasOpenaiKey ? "#10A37F" : "#9CA3AF" }}>
                    {hasOpenaiKey ? "✓ Active" : "Non configurée"}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showOpenaiKey ? "text" : "password"}
                    placeholder={hasOpenaiKey ? "••••••••••••••••••••••" : "sk-proj-..."}
                    value={openaiKey}
                    onChange={e => setOpenaiKey(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-lg pr-14 outline-none font-mono"
                    style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#111827" }}
                  />
                  <button type="button" onClick={() => setShowOpenaiKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: "#9CA3AF" }}>
                    {showOpenaiKey ? "Cacher" : "Voir"}
                  </button>
                </div>
              </div>
            )}

            {apiProvider === "openrouter" && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#6B7280" }}>Clé API OpenRouter</p>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: hasOpenrouterKey ? "#6366F114" : "#F3F4F6", color: hasOpenrouterKey ? "#6366F1" : "#9CA3AF" }}>
                    {hasOpenrouterKey ? "✓ Active" : "Non configurée"}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showOpenrouterKey ? "text" : "password"}
                    placeholder={hasOpenrouterKey ? "••••••••••••••••••••••" : "sk-or-v1-..."}
                    value={openrouterKey}
                    onChange={e => setOpenrouterKey(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-lg pr-14 outline-none font-mono"
                    style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#111827" }}
                  />
                  <button type="button" onClick={() => setShowOpenrouterKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: "#9CA3AF" }}>
                    {showOpenrouterKey ? "Cacher" : "Voir"}
                  </button>
                </div>
                <p className="text-[10px] mt-1.5 rounded-lg px-2 py-1.5" style={{ background: "#6366F10D", color: "#6366F1", border: "1px solid #6366F130" }}>
                  Obtenez une clé gratuite sur <span className="font-mono">openrouter.ai</span> — accès à +200 modèles
                </p>
              </div>
            )}

            <button
              onClick={saveApiSettings}
              disabled={savingApi}
              className="w-full text-xs py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
              style={{ background: apiProvider === "openrouter" ? "#6366F1" : apiProvider === "openai" ? "#10A37F" : "#E8651A", color: "#fff" }}
            >
              {savingApi ? "Sauvegarde…" : "💾 Sauvegarder les paramètres"}
            </button>

            <p className="text-[10px] mt-2 text-center" style={{ color: "#9CA3AF" }}>
              Vos clés sont chiffrées et stockées en sécurité.
            </p>
          </section>

          {/* Navigation */}
          <section className="px-5 py-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#4B5563" }}>🧭 Navigation</h3>
            <div className="space-y-1">
              <Link href="/" onClick={onClose} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors" style={{ color: "#9CA3AF" }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#0A4DA8"; (e.currentTarget as HTMLAnchorElement).style.background = "#84CC1410"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#9CA3AF"; (e.currentTarget as HTMLAnchorElement).style.background = ""; }}
              >
                <span>📝</span> Nouvelle séance
              </Link>
              <Link href="/historique" onClick={onClose} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors" style={{ color: "#9CA3AF" }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#0A4DA8"; (e.currentTarget as HTMLAnchorElement).style.background = "#84CC1410"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#9CA3AF"; (e.currentTarget as HTMLAnchorElement).style.background = ""; }}
              >
                <span>📂</span> Mes séances
              </Link>
            </div>
          </section>

          {/* À venir */}
          <section className="px-5 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#4B5563" }}>🚀 À venir</h3>
            <div className="space-y-2">
              {[
                "Génération de séquences pédagogiques",
                "Templates personnalisés par filière",
                "Export groupé (plusieurs séances)",
                "Planification annuelle automatique",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm" style={{ color: "#4B5563" }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#E2E8F0" }} />
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
