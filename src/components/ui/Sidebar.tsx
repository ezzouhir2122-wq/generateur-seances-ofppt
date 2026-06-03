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

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  user: { name?: string | null; email?: string | null };
  claudeKey: boolean;
  openaiKey: boolean;
}

export default function Sidebar({ open, onClose, user, claudeKey, openaiKey }: SidebarProps) {
  const [stats, setStats] = useState<Stats>({ seancesCount: 0, modulesCount: 0, filieresCount: 0 });
  const [preview, setPreview] = useState<{ rows: number; data: { groupe: string; module: string; mhg: number }[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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
        const data = raw
          .map((r) => {
            const keys = Object.keys(r);
            return {
              groupe: String(r[keys[0]] ?? "").trim(),
              module: String(r[keys[1]] ?? "").trim(),
              mhg: Number(r[keys[2]] ?? 0),
            };
          })
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

          {/* Import Excel */}
          <section className="px-5 py-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">📂 Paramétrage Modules</h3>

            {stats.modulesCount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3 text-sm text-green-800">
                <span className="font-semibold">{stats.modulesCount} modules</span> chargés —{" "}
                <span className="font-semibold">{stats.filieresCount} groupes</span>
              </div>
            )}

            {!preview ? (
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer btn-primary text-sm justify-center py-2.5">
                  <span>📥</span> Importer fichier Excel
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
                </label>
                <p className="text-xs text-gray-400 text-center">Format : Groupe | Module | MH.G</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <p className="font-semibold">{preview.rows} lignes détectées</p>
                  <p className="text-xs mt-1 text-blue-600">Confirmer l'import ?</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={confirmImport}
                    disabled={importing}
                    className="flex-1 btn-primary text-sm py-2"
                  >
                    {importing ? "Import..." : "✅ Confirmer"}
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

            {stats.modulesCount > 0 && !preview && (
              <button
                onClick={resetModules}
                className="mt-3 text-xs text-red-500 hover:text-red-700 transition-colors w-full text-center"
              >
                🗑 Réinitialiser les modules
              </button>
            )}
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
