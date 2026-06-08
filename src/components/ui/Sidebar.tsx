"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
import { read, utils } from "xlsx";
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

interface ModuleRow {
  groupe: string;
  codeModule: string;
  module: string;
  mhg: number;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  user: { name?: string | null; email?: string | null };
  claudeKey: boolean;
  openaiKey: boolean;
}

export default function Sidebar({ open, onClose, user, claudeKey, openaiKey }: SidebarProps) {
  const [stats, setStats] = useState<Stats>({ seancesCount: 0, modulesCount: 0, filieresCount: 0 });
  const [preview, setPreview] = useState<{ rows: number; data: ModuleRow[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Référentiel pédagogique state
  const [refFile, setRefFile] = useState<File | null>(null);
  const [refUploading, setRefUploading] = useState(false);
  const [refResult, setRefResult] = useState<ReferentielStats | null>(null);
  const [refError, setRefError] = useState<string | null>(null);
  const refFileRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) setStats(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    if (open) loadStats();
  }, [open, loadStats]);

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
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur inconnue");
      setRefResult(json);
      setRefFile(null);
      if (refFileRef.current) refFileRef.current.value = "";
      toast.success("Référentiel importé avec succès");
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
    toast.success("Référentiel réinitialisé");
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
        className={`fixed top-0 right-0 h-full w-[380px] bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="bg-ofppt-green text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Image src="/logo-ofppt.jpg" alt="OFPPT" width={32} height={32} className="rounded-full object-cover" />
            <span className="font-semibold">Tableau de bord</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl leading-none">✕</button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">

          {/* Profil */}
          <section className="px-5 py-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">👤 Profil</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-ofppt-green/10 flex items-center justify-center text-ofppt-green font-bold text-lg">
                {user.name?.[0]?.toUpperCase() ?? "F"}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{user.name ?? "Formateur"}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => { signOut({ callbackUrl: "/login" }); }}
              className="mt-3 text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              Déconnexion
            </button>
          </section>

          {/* Import Excel — en haut pour accès rapide */}
          <section className="px-5 py-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">📋 Affectation des modules</h3>
            <p className="text-xs text-gray-400 mb-3">Importez le tableau Excel d'affectation pour préremplir automatiquement les formulaires.</p>

            {stats.modulesCount > 0 && !preview && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3 flex items-center justify-between">
                <span className="text-sm text-green-800">
                  <span className="font-semibold">{stats.modulesCount} modules</span> — <span className="font-semibold">{stats.filieresCount} groupes</span>
                </span>
                <button onClick={resetModules} className="text-xs text-red-500 hover:text-red-700">🗑 Vider</button>
              </div>
            )}

            {!preview ? (
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer w-full justify-center bg-[#0B6B72] hover:bg-[#084F57] text-white text-sm py-2.5 rounded-lg transition-colors">
                  <span>📥</span> Importer fichier Excel (.xlsx)
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
                </label>
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
                  <p className="font-semibold text-gray-600">Format accepté :</p>
                  <p>Colonnes détectées automatiquement par nom d'en-tête.</p>
                  <p>Colonnes attendues :</p>
                  <div className="font-mono bg-white border rounded px-2 py-1.5 mt-1 text-[10px] text-gray-600 space-y-0.5">
                    <p>• <span className="text-[#0B6B72] font-semibold">Filière</span></p>
                    <p>• <span className="text-[#0B6B72] font-semibold">Code Module</span></p>
                    <p>• <span className="text-[#0B6B72] font-semibold">Intitulé module</span></p>
                    <p>• <span className="text-[#0B6B72] font-semibold">Masse horaire</span></p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <p className="text-sm font-semibold text-blue-800">{preview.rows} ligne{preview.rows > 1 ? "s" : ""} détectée{preview.rows > 1 ? "s" : ""}</p>
                  <p className="text-xs text-blue-600 mt-0.5">Aperçu des 5 premières lignes :</p>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-600 whitespace-nowrap">Filière</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-600 whitespace-nowrap">Code</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-gray-600 whitespace-nowrap">Intitulé module</th>
                        <th className="px-2 py-1.5 text-right font-semibold text-gray-600 whitespace-nowrap">M.H</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.data.slice(0, 5).map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-2 py-1 text-gray-700 font-medium whitespace-nowrap">{row.groupe}</td>
                          <td className="px-2 py-1 text-gray-500 whitespace-nowrap">{row.codeModule}</td>
                          <td className="px-2 py-1 text-gray-600 max-w-[110px] truncate">{row.module}</td>
                          <td className="px-2 py-1 text-right text-gray-500 whitespace-nowrap">{row.mhg}h</td>
                        </tr>
                      ))}
                      {preview.rows > 5 && (
                        <tr><td colSpan={4} className="px-2 py-1 text-center text-gray-400 italic">… et {preview.rows - 5} autres lignes</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={confirmImport}
                    disabled={importing}
                    className="flex-1 bg-[#0B6B72] hover:bg-[#084F57] text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {importing ? "Import en cours…" : "✅ Confirmer l'import"}
                  </button>
                  <button
                    onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                    className="flex-1 border border-gray-300 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Référentiel Pédagogique */}
          <section className="px-5 py-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">📚 Référentiel Pédagogique OFPPT</h3>
            <p className="text-xs text-gray-400 mb-3">Importez un référentiel (PDF, DOCX, Excel) — l'IA extrait automatiquement filières, modules, compétences, objectifs et critères.</p>

            {refResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                <p className="text-sm font-semibold text-green-800">✅ Importé avec succès</p>
                <p className="text-xs text-green-700 mt-0.5">
                  <span className="font-medium">{refResult.filiere}</span> · {refResult.secteur}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {refResult.stats.modulesCreated} modules · {refResult.stats.competencesCreated} compétences · {refResult.stats.objectifsCreated} objectifs · {refResult.stats.criteresCreated} critères
                </p>
                <button onClick={resetReferentiel} className="text-xs text-red-500 hover:text-red-700 mt-1.5">🗑 Vider le référentiel</button>
              </div>
            )}

            {refError && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                <p className="text-xs text-red-700">{refError}</p>
              </div>
            )}

            {!refFile ? (
              <label className="flex items-center gap-2 cursor-pointer w-full justify-center bg-[#1B3A6E] hover:bg-[#152e5a] text-white text-sm py-2.5 rounded-lg transition-colors">
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
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <p className="text-xs font-semibold text-blue-800 truncate">📄 {refFile.name}</p>
                  <p className="text-[10px] text-blue-600">{(refFile.size / 1024).toFixed(0)} Ko</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={uploadReferentiel}
                    disabled={refUploading}
                    className="flex-1 bg-[#1B3A6E] hover:bg-[#152e5a] text-white text-sm py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {refUploading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Extraction IA…
                      </>
                    ) : "🤖 Extraire & Importer"}
                  </button>
                  <button
                    onClick={() => { setRefFile(null); if (refFileRef.current) refFileRef.current.value = ""; }}
                    className="px-3 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
                  >
                    ✕
                  </button>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-amber-700">L'extraction IA peut prendre 15–30 secondes selon la taille du document.</p>
                </div>
              </div>
            )}

            <div className="mt-3 bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
              <p className="font-semibold text-gray-600">Formats acceptés :</p>
              <div className="flex gap-2 flex-wrap mt-1">
                {["PDF", "DOCX", "Excel", "MD"].map((f) => (
                  <span key={f} className="bg-white border border-gray-200 rounded px-2 py-0.5 font-mono text-[10px] text-[#0B6B72]">{f}</span>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">L'IA extrait : Filière · Module · Compétence · Objectif · Critères de performance</p>
            </div>
          </section>

          {/* Stats */}
          <section className="px-5 py-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">📊 Statistiques</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Séances", value: stats.seancesCount },
                { label: "Modules", value: stats.modulesCount },
                { label: "Groupes", value: stats.filieresCount },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-ofppt-green">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Paramètres API */}
          <section className="px-5 py-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">🔑 Paramètres API</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Claude API</span>
                <span className={claudeKey ? "text-green-600 font-medium" : "text-red-500"}>
                  {claudeKey ? "✅ Configuré" : "❌ Manquant"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">OpenAI API</span>
                <span className={openaiKey ? "text-green-600 font-medium" : "text-red-500"}>
                  {openaiKey ? "✅ Configuré" : "❌ Manquant"}
                </span>
              </div>
              {(!claudeKey && !openaiKey) && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 mt-2">
                  Ajoutez vos clés API dans le fichier <code>.env</code> pour activer la génération.
                </p>
              )}
            </div>
          </section>

          {/* Navigation */}
          <section className="px-5 py-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">🧭 Navigation</h3>
            <div className="space-y-1">
              <Link href="/" onClick={onClose} className="flex items-center gap-2 text-sm text-gray-700 hover:text-ofppt-green hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors">
                <span>📝</span> Nouvelle séance
              </Link>
              <Link href="/historique" onClick={onClose} className="flex items-center gap-2 text-sm text-gray-700 hover:text-ofppt-green hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors">
                <span>📂</span> Mes séances
              </Link>
            </div>
          </section>

          {/* À venir */}
          <section className="px-5 py-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">🚀 À venir</h3>
            <div className="space-y-2">
              {[
                "Génération de séquences pédagogiques",
                "Templates personnalisés par filière",
                "Export groupé (plusieurs séances)",
                "Planification annuelle automatique",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-gray-200 shrink-0" />
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
