"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { utils, writeFile } from "xlsx";
import Link from "next/link";
import { setReferentielContext } from "@/lib/referentiel-context";
import { toast } from "sonner";

interface CompetenceItem {
  id: string;
  titre: string;
  objectifs: string[];
}

interface ModuleData {
  id: string;
  nom: string;
  code: string | null;
  mhg: number | null;
  competences: CompetenceItem[];
}

interface FiliereData {
  id: string;
  nom: string;
  code: string | null;
  modules: ModuleData[];
}

interface SecteurData {
  id: string;
  nom: string;
  code: string | null;
  filieres: FiliereData[];
}

interface Props {
  secteurs: SecteurData[];
}

// Extrait la lettre préfixe (A., B.) ou génère A, B, C par index
function compLetter(titre: string, idx: number): string {
  const m = titre.match(/^([A-Za-z])\.\s*/);
  return m ? m[1].toUpperCase() : String.fromCharCode(65 + idx);
}

function compText(titre: string): string {
  return titre.replace(/^[A-Za-z]\.\s*/, "").trim();
}

function exportExcel(
  secteurs: SecteurData[],
  filename = "referentiel-ofppt.xlsx"
) {
  const rows = secteurs.flatMap((s) =>
    s.filieres.flatMap((f) =>
      f.modules.map((m, idx) => ({
        "Filière": idx === 0 ? s.nom : "",
        "Niveau de formation": idx === 0 ? f.nom : "",
        "N° Module": m.code ?? "",
        "Intitulé du module": m.nom,
        "Masse horaire (h)": m.mhg ?? "",
        "Compétences Pedagogiques": m.competences
          .map((c, i) => `${compLetter(c.titre, i)}. ${compText(c.titre)}`)
          .join(" | "),
      }))
    )
  );

  if (rows.length === 0) return;
  const ws = utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 20 },
    { wch: 26 },
    { wch: 12 },
    { wch: 50 },
    { wch: 12 },
    { wch: 80 },
  ];
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Référentiel");
  writeFile(wb, filename);
}

export default function ReferentielClient({ secteurs }: Props) {
  const router = useRouter();
  const [selectedSecteur, setSelectedSecteur] = useState<string>("all");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/referentiel", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Erreur ${res.status}`);
      toast.success(`✅ Référentiel importé — ${json.stats?.modulesCreated ?? 0} modules`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'import");
    } finally {
      setUploading(false);
    }
  }, [router]);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [view, setView] = useState<"modules" | "competences">("modules");

  const allModules = useMemo(() => {
    return secteurs.flatMap((s) =>
      s.filieres.flatMap((f) =>
        f.modules.map((m) => ({
          ...m,
          filiere: f.nom,
          filiereCode: f.code,
          filiereId: f.id,
          secteur: s.nom,
          secteurId: s.id,
        }))
      )
    );
  }, [secteurs]);

  const filtered = useMemo(() => {
    let rows = allModules;
    if (selectedSecteur !== "all")
      rows = rows.filter((r) => r.secteurId === selectedSecteur);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.nom.toLowerCase().includes(q) ||
          (r.code ?? "").toLowerCase().includes(q) ||
          r.filiere.toLowerCase().includes(q) ||
          r.secteur.toLowerCase().includes(q) ||
          r.competences.some((c) => c.titre.toLowerCase().includes(q))
      );
    }
    return rows;
  }, [allModules, selectedSecteur, search]);

  const totalModules = allModules.length;
  const totalMhg = allModules.reduce((acc, m) => acc + (m.mhg ?? 0), 0);
  const totalFilieres = secteurs.reduce((acc, s) => acc + s.filieres.length, 0);
  const totalCompetences = allModules.reduce(
    (acc, m) => acc + m.competences.length,
    0
  );

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = () =>
    setExpanded(new Set(filtered.map((m) => m.id)));
  const collapseAll = () => setExpanded(new Set());

  function genererSeance(
    row: (typeof allModules)[number],
    comp: CompetenceItem
  ) {
    setReferentielContext({
      filiere: row.filiere,
      module: row.nom,
      codeModule: row.code ?? "",
      competence: comp.titre,
      objectifs: comp.objectifs.join("\n"),
      criteres: "",
    });
    router.push("/seances");
  }

  function genererFiche(
    row: (typeof allModules)[number],
    comp: CompetenceItem
  ) {
    setReferentielContext({
      filiere: row.filiere,
      module: row.nom,
      codeModule: row.code ?? "",
      competence: comp.titre,
      objectifs: comp.objectifs.join("\n"),
      criteres: "",
    });
    router.push("/fiches");
  }

  const exportFiltered = () => {
    const byKey = new Map<
      string,
      { secteur: string; filiereNom: string; filiereCode: string | null; modules: ModuleData[] }
    >();
    filtered.forEach((r) => {
      const key = `${r.secteur}__${r.filiere}`;
      if (!byKey.has(key))
        byKey.set(key, {
          secteur: r.secteur,
          filiereNom: r.filiere,
          filiereCode: r.filiereCode,
          modules: [],
        });
      byKey.get(key)!.modules.push({
        id: r.id,
        nom: r.nom,
        code: r.code,
        mhg: r.mhg,
        competences: r.competences,
      });
    });

    const tempSecteurs: SecteurData[] = [];
    byKey.forEach((v) => {
      const existing = tempSecteurs.find((s) => s.nom === v.secteur);
      const fil = { id: "", nom: v.filiereNom, code: v.filiereCode, modules: v.modules };
      if (existing) existing.filieres.push(fil);
      else tempSecteurs.push({ id: "", nom: v.secteur, code: null, filieres: [fil] });
    });

    exportExcel(tempSecteurs, "referentiel-ofppt.xlsx");
  };

  if (secteurs.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#F5F7FA" }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv,.pdf,.docx,.doc,.md"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
        />

        <div className="w-full max-w-xl">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">📚</div>
            <h2 className="text-xl font-bold mb-1" style={{ color: "#111827" }}>Référentiel pédagogique</h2>
            <p className="text-sm" style={{ color: "#6B7280" }}>Importez votre fichier Excel ou CSV pour commencer</p>
          </div>

          {/* Drop zone */}
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) uploadFile(f);
            }}
            className="rounded-2xl p-10 text-center cursor-pointer transition-all"
            style={{
              border: `2px dashed ${dragOver ? "#0A4DA8" : "#D1D5DB"}`,
              background: dragOver ? "#0A4DA808" : "#FFFFFF",
            }}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <span className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin block" />
                <p className="text-sm font-medium" style={{ color: "#0A4DA8" }}>Import en cours…</p>
              </div>
            ) : (
              <>
                <div className="text-3xl mb-3">📥</div>
                <p className="text-sm font-semibold mb-1" style={{ color: "#111827" }}>
                  Glissez votre fichier ici ou cliquez pour sélectionner
                </p>
                <p className="text-xs" style={{ color: "#9CA3AF" }}>Excel (.xlsx), CSV, PDF, DOCX acceptés</p>
              </>
            )}
          </div>

          {/* Columns info */}
          <div className="mt-4 rounded-xl p-4" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "#374151" }}>Colonnes attendues (Excel/CSV) :</p>
            <div className="flex flex-wrap gap-1.5">
              {["Niveau de formation", "N° Module", "Intitulé du module", "Masse horaire (h)", "Sous-élément", "Apprentissage de base"].map(col => (
                <span key={col} className="text-[11px] px-2 py-0.5 rounded font-mono" style={{ background: "#F0F4FF", color: "#0A4DA8", border: "1px solid #0A4DA820" }}>{col}</span>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <button
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                disabled={uploading}
                className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: "#16A34A", color: "#fff" }}
              >
                {uploading ? "Import en cours…" : "📂 Importer mon fichier Excel"}
              </button>
              <a
                href="/api/referentiel?mode=template"
                download="modele-referentiel-ofppt.xlsx"
                className="inline-block text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: "#0A4DA8", color: "#fff" }}
                onClick={e => e.stopPropagation()}
              >
                📥 Télécharger le modèle
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F5F7FA" }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.pdf,.docx,.doc,.md"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }}
      />

      {/* Header */}
      <div
        className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between"
        style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}
      >
        <div>
          <h1 className="text-lg font-bold" style={{ color: "#111827" }}>
            Référentiel pédagogique
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#4B5563" }}>
            {totalFilieres} filière{totalFilieres > 1 ? "s" : ""} ·{" "}
            {totalModules} module{totalModules > 1 ? "s" : ""} ·{" "}
            {totalCompetences} compétence{totalCompetences > 1 ? "s" : ""} ·{" "}
            {totalMhg}h total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: "#E8F5E9", color: "#2E7D32", border: "1px solid #A5D6A7" }}
          >
            {uploading
              ? <><span className="w-3 h-3 border-2 border-green-300 border-t-green-700 rounded-full animate-spin" />Import…</>
              : <>📥 Importer</>}
          </button>
          <Link
            href="/referentiel/generer"
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "#0A4DA8" }}
          >
            ✨ Générer depuis le référentiel
          </Link>
          <button
            onClick={exportFiltered}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
            style={{
              background: "#0A4DA814",
              color: "#0A4DA8",
              border: "1px solid #0A4DA840",
            }}
          >
            <svg
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Exporter Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        className="px-6 py-3 flex items-center gap-3 flex-wrap"
        style={{ borderBottom: "1px solid #E2E8F0", background: "#FFFFFF" }}
      >
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            width="13"
            height="13"
            fill="none"
            stroke="#4B5563"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher module ou compétence…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg outline-none"
            style={{
              background: "#F3F4F6",
              border: "1px solid #E2E8F0",
              color: "#111827",
              width: "240px",
            }}
          />
        </div>

        {/* View toggle */}
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{ border: "1px solid #E2E8F0" }}
        >
          <button
            onClick={() => setView("modules")}
            className="text-xs px-3 py-1.5 transition-colors"
            style={
              view === "modules"
                ? { background: "#0A4DA8", color: "#FFFFFF" }
                : { color: "#6B7280", background: "#FFFFFF" }
            }
          >
            Vue modules
          </button>
          <button
            onClick={() => setView("competences")}
            className="text-xs px-3 py-1.5 transition-colors"
            style={
              view === "competences"
                ? { background: "#0A4DA8", color: "#FFFFFF" }
                : { color: "#6B7280", background: "#FFFFFF" }
            }
          >
            Vue compétences
          </button>
        </div>

        {/* Secteur tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setSelectedSecteur("all")}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={
              selectedSecteur === "all"
                ? {
                    background: "#0A4DA814",
                    color: "#0A4DA8",
                    border: "1px solid #0A4DA840",
                  }
                : { color: "#6B7280", border: "1px solid transparent" }
            }
          >
            Tous
          </button>
          {secteurs.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSecteur(s.id)}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={
                selectedSecteur === s.id
                  ? {
                      background: "#0A4DA814",
                      color: "#0A4DA8",
                      border: "1px solid #0A4DA840",
                    }
                  : { color: "#6B7280", border: "1px solid transparent" }
              }
            >
              {s.nom}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {view === "modules" && (
            <>
              <button
                onClick={expandAll}
                className="text-xs px-2 py-1 rounded transition-colors"
                style={{ color: "#0A4DA8", background: "#0A4DA808" }}
              >
                Tout développer
              </button>
              <button
                onClick={collapseAll}
                className="text-xs px-2 py-1 rounded transition-colors"
                style={{ color: "#6B7280" }}
              >
                Réduire
              </button>
            </>
          )}
          <span className="text-xs" style={{ color: "#4B5563" }}>
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="px-6 py-4">
        {view === "modules" ? (
          /* ── Vue Modules (tableau expandable) ── */
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid #E2E8F0" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    background: "#F8FAFC",
                    borderBottom: "1px solid #E2E8F0",
                  }}
                >
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "#4B5563", width: "14%" }}
                  >
                    Filière
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "#4B5563", width: "18%" }}
                  >
                    Niveau de formation
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "#4B5563", width: "90px" }}
                  >
                    N° Module
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "#4B5563" }}
                  >
                    Intitulé du module
                  </th>
                  <th
                    className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "#4B5563", width: "90px" }}
                  >
                    Masse horaire (h)
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "#4B5563", width: "140px" }}
                  >
                    Compétences Pedagogiques
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-sm"
                      style={{ color: "#4B5563" }}
                    >
                      Aucun résultat pour cette recherche
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, i) => {
                    const isExpanded = expanded.has(row.id);
                    const hasComps = row.competences.length > 0;
                    return (
                      <>
                        {/* Module row */}
                        <tr
                          key={row.id}
                          onClick={() => hasComps && toggleExpand(row.id)}
                          style={{
                            borderBottom: isExpanded
                              ? "none"
                              : "1px solid #E5E7EB",
                            background:
                              i % 2 === 0 ? "#FFFFFF" : "#F8FAFC",
                            cursor: hasComps ? "pointer" : "default",
                          }}
                          className={hasComps ? "hover:bg-blue-50 transition-colors" : ""}
                        >
                          <td className="px-4 py-2.5">
                            <span
                              className="text-xs font-medium"
                              style={{ color: "#0A4DA8" }}
                            >
                              {row.secteur}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className="text-xs font-medium"
                              style={{ color: "#374151" }}
                            >
                              {row.filiere}
                            </span>
                            {row.filiereCode && (
                              <span
                                className="ml-1.5 text-[10px] font-mono"
                                style={{ color: "#9CA3AF" }}
                              >
                                {row.filiereCode}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className="font-mono text-xs font-semibold"
                              style={{ color: "#0A4DA8" }}
                            >
                              {row.code ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className="text-xs font-medium"
                              style={{ color: "#111827" }}
                            >
                              {row.nom}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {row.mhg != null ? (
                              <span
                                className="text-xs font-semibold"
                                style={{ color: "#374151" }}
                              >
                                {row.mhg}h
                              </span>
                            ) : (
                              <span
                                className="text-xs"
                                style={{ color: "#9CA3AF" }}
                              >
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {hasComps ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(row.id);
                                }}
                                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
                                style={
                                  isExpanded
                                    ? {
                                        background: "#0A4DA8",
                                        color: "#FFFFFF",
                                      }
                                    : {
                                        background: "#0A4DA814",
                                        color: "#0A4DA8",
                                        border: "1px solid #0A4DA830",
                                      }
                                }
                              >
                                {row.competences.length} comp.
                                <svg
                                  width="10"
                                  height="10"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  viewBox="0 0 24 24"
                                  style={{
                                    transform: isExpanded
                                      ? "rotate(180deg)"
                                      : "none",
                                    transition: "transform 0.2s",
                                  }}
                                >
                                  <path d="M6 9l6 6 6-6" />
                                </svg>
                              </button>
                            ) : (
                              <span
                                className="text-xs"
                                style={{ color: "#9CA3AF" }}
                              >
                                —
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Expanded competences sub-row */}
                        {isExpanded && (
                          <tr
                            key={`${row.id}-comp`}
                            style={{
                              background:
                                i % 2 === 0 ? "#F0F4FF" : "#EBF0FC",
                              borderBottom: "1px solid #E5E7EB",
                            }}
                          >
                            <td colSpan={5} className="px-4 pb-4 pt-2">
                              <div className="space-y-1.5">
                                <p
                                  className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                                  style={{ color: "#0A4DA8" }}
                                >
                                  Éléments de la compétence — {row.code} {row.nom}
                                </p>
                                {row.competences.map((comp, ci) => {
                                  const letter = compLetter(comp.titre, ci);
                                  const text = compText(comp.titre);
                                  return (
                                    <div
                                      key={comp.id}
                                      className="flex items-start gap-3 group"
                                    >
                                      <span
                                        className="flex-shrink-0 w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5"
                                        style={{
                                          background: "#0A4DA8",
                                          color: "#FFFFFF",
                                        }}
                                      >
                                        {letter}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p
                                          className="text-xs font-medium"
                                          style={{ color: "#1E3A6E" }}
                                        >
                                          {text}
                                        </p>
                                        {comp.objectifs.length > 0 && (
                                          <ul className="mt-0.5 space-y-0.5">
                                            {comp.objectifs.map((obj, oi) => (
                                              <li
                                                key={oi}
                                                className="text-[11px] flex items-start gap-1"
                                                style={{ color: "#4B5563" }}
                                              >
                                                <span style={{ color: "#9CA3AF" }}>
                                                  •
                                                </span>
                                                {obj}
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                      </div>
                                      {/* Quick actions */}
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                        <button
                                          onClick={() => genererSeance(row, comp)}
                                          className="text-[10px] px-2 py-0.5 rounded font-medium"
                                          style={{
                                            background: "#0A4DA8",
                                            color: "#FFFFFF",
                                          }}
                                        >
                                          Séance
                                        </button>
                                        <button
                                          onClick={() => genererFiche(row, comp)}
                                          className="text-[10px] px-2 py-0.5 rounded font-medium"
                                          style={{
                                            background: "#0A4DA814",
                                            color: "#0A4DA8",
                                            border: "1px solid #0A4DA840",
                                          }}
                                        >
                                          Fiche
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── Vue Compétences (cartes par module) ── */
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-sm" style={{ color: "#9CA3AF" }}>
                Aucun résultat pour cette recherche
              </p>
            ) : (
              filtered.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl overflow-hidden"
                  style={{
                    border: "1px solid #E2E8F0",
                    background: "#FFFFFF",
                  }}
                >
                  {/* Module header */}
                  <div
                    className="px-5 py-3 flex items-center justify-between"
                    style={{
                      background: "#0A4DA8",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {row.code && (
                        <span
                          className="font-mono text-xs font-bold px-2 py-0.5 rounded"
                          style={{ background: "#FFFFFF30", color: "#FFFFFF" }}
                        >
                          {row.code}
                        </span>
                      )}
                      <span className="text-sm font-semibold text-white">
                        {row.nom}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className="text-[11px] font-medium"
                        style={{ color: "#FFFFFF99" }}
                      >
                        {row.secteur}{row.filiere && row.filiere !== row.secteur ? ` · ${row.filiere}` : ""}
                      </span>
                      {row.mhg && (
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded"
                          style={{ background: "#FFFFFF20", color: "#FFFFFF" }}
                        >
                          {row.mhg}h
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Competences list */}
                  {row.competences.length === 0 ? (
                    <p
                      className="px-5 py-3 text-xs italic"
                      style={{ color: "#9CA3AF" }}
                    >
                      Aucune compétence enregistrée pour ce module
                    </p>
                  ) : (
                    <div className="divide-y" style={{ borderColor: "#F3F4F6" }}>
                      {row.competences.map((comp, ci) => {
                        const letter = compLetter(comp.titre, ci);
                        const text = compText(comp.titre);
                        return (
                          <div
                            key={comp.id}
                            className="px-5 py-3 flex items-start gap-4 group hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex-shrink-0 flex flex-col items-center gap-1">
                              <span
                                className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center"
                                style={{
                                  background: "#0A4DA8",
                                  color: "#FFFFFF",
                                }}
                              >
                                {letter}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className="text-sm font-medium"
                                style={{ color: "#111827" }}
                              >
                                {text}
                              </p>
                              {comp.objectifs.length > 0 && (
                                <ul className="mt-1 space-y-0.5">
                                  {comp.objectifs.map((obj, oi) => (
                                    <li
                                      key={oi}
                                      className="text-xs flex items-start gap-1.5"
                                      style={{ color: "#6B7280" }}
                                    >
                                      <span
                                        className="mt-1 w-1 h-1 rounded-full flex-shrink-0"
                                        style={{ background: "#9CA3AF" }}
                                      />
                                      {obj}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 pt-0.5">
                              <button
                                onClick={() => genererSeance(row, comp)}
                                className="text-xs px-3 py-1 rounded-lg font-medium"
                                style={{
                                  background: "#0A4DA8",
                                  color: "#FFFFFF",
                                }}
                              >
                                → Séance
                              </button>
                              <button
                                onClick={() => genererFiche(row, comp)}
                                className="text-xs px-3 py-1 rounded-lg font-medium"
                                style={{
                                  background: "#0A4DA814",
                                  color: "#0A4DA8",
                                  border: "1px solid #0A4DA840",
                                }}
                              >
                                → Fiche
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Totals footer */}
        {filtered.length > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs" style={{ color: "#9CA3AF" }}>
              {filtered.reduce((acc, r) => acc + r.competences.length, 0)}{" "}
              compétences au total
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "#4B5563" }}>
                Total Masse horaire :
              </span>
              <span
                className="text-xs font-semibold"
                style={{ color: "#0A4DA8" }}
              >
                {filtered.reduce((acc, r) => acc + (r.mhg ?? 0), 0)}h
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
