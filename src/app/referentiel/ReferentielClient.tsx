"use client";

import { useState, useMemo } from "react";
import { utils, writeFile } from "xlsx";
import Link from "next/link";

interface ModuleData {
  id: string;
  nom: string;
  code: string | null;
  mhg: number | null;
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

function exportExcel(secteurs: SecteurData[], filename = "referentiel-ofppt.xlsx") {
  const rows = secteurs.flatMap((s) =>
    s.filieres.flatMap((f) =>
      f.modules.map((m, idx) => ({
        "Secteur": idx === 0 ? s.nom : "",
        "Filière": idx === 0 ? f.nom : "",
        "N°": m.code ?? "",
        "Intitulé Module": m.nom,
        "MHG (h)": m.mhg ?? "",
      }))
    )
  );

  if (rows.length === 0) return;

  const ws = utils.json_to_sheet(rows);

  // Column widths
  ws["!cols"] = [
    { wch: 22 }, // Secteur
    { wch: 30 }, // Filière
    { wch: 12 }, // N°
    { wch: 50 }, // Intitulé
    { wch: 10 }, // MHG
  ];

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Référentiel");
  writeFile(wb, filename);
}

export default function ReferentielClient({ secteurs }: Props) {
  const [selectedSecteur, setSelectedSecteur] = useState<string>("all");
  const [search, setSearch] = useState("");

  const allModules = useMemo(() => {
    return secteurs.flatMap((s) =>
      s.filieres.flatMap((f) =>
        f.modules.map((m) => ({ ...m, filiere: f.nom, filiereCode: f.code, secteur: s.nom, secteurId: s.id }))
      )
    );
  }, [secteurs]);

  const filtered = useMemo(() => {
    let rows = allModules;
    if (selectedSecteur !== "all") rows = rows.filter((r) => r.secteurId === selectedSecteur);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.nom.toLowerCase().includes(q) ||
          (r.code ?? "").toLowerCase().includes(q) ||
          r.filiere.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [allModules, selectedSecteur, search]);

  const totalModules = allModules.length;
  const totalMhg = allModules.reduce((acc, m) => acc + (m.mhg ?? 0), 0);
  const totalFilieres = secteurs.reduce((acc, s) => acc + s.filieres.length, 0);

  const exportFiltered = () => {
    const byFiliereAndSecteur = new Map<string, { secteur: string; filiereNom: string; filiereCode: string | null; modules: ModuleData[] }>();
    filtered.forEach((r) => {
      const key = `${r.secteur}__${r.filiere}`;
      if (!byFiliereAndSecteur.has(key)) {
        byFiliereAndSecteur.set(key, { secteur: r.secteur, filiereNom: r.filiere, filiereCode: r.filiereCode, modules: [] });
      }
      byFiliereAndSecteur.get(key)!.modules.push({ id: r.id, nom: r.nom, code: r.code, mhg: r.mhg });
    });

    const tempSecteurs: SecteurData[] = [];
    byFiliereAndSecteur.forEach((v) => {
      const existing = tempSecteurs.find((s) => s.nom === v.secteur);
      const fil = { id: "", nom: v.filiereNom, code: v.filiereCode, modules: v.modules };
      if (existing) {
        existing.filieres.push(fil);
      } else {
        tempSecteurs.push({ id: "", nom: v.secteur, code: null, filieres: [fil] });
      }
    });

    exportExcel(tempSecteurs, "referentiel-ofppt.xlsx");
  };

  if (secteurs.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#F5F7FA", color: "#9CA3AF" }}>
        <div className="text-5xl mb-4">📚</div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: "#374151" }}>Aucun référentiel importé</h2>
        <p className="text-sm mb-6" style={{ color: "#4B5563" }}>Importez un référentiel depuis le panneau Paramètres</p>
        <Link href="/" className="text-sm px-4 py-2 rounded-lg font-medium text-black" style={{ background: "#0A4DA8" }}>
          ← Retour au tableau de bord
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F5F7FA" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-6 py-4 flex items-center justify-between" style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
        <div>
          <h1 className="text-lg font-bold" style={{ color: "#111827" }}>Référentiel pédagogique</h1>
          <p className="text-xs mt-0.5" style={{ color: "#4B5563" }}>
            {totalFilieres} filière{totalFilieres > 1 ? "s" : ""} · {totalModules} module{totalModules > 1 ? "s" : ""} · {totalMhg}h total
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            style={{ background: "#0A4DA814", color: "#0A4DA8", border: "1px solid #0A4DA840" }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Exporter Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 flex items-center gap-3 flex-wrap" style={{ borderBottom: "1px solid #E2E8F0" }}>
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2" width="13" height="13" fill="none" stroke="#4B5563" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Rechercher un module…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg outline-none"
            style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#E5E7EB", width: "220px" }}
          />
        </div>

        {/* Secteur tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setSelectedSecteur("all")}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={selectedSecteur === "all"
              ? { background: "#0A4DA814", color: "#0A4DA8", border: "1px solid #0A4DA840" }
              : { color: "#6B7280", border: "1px solid transparent" }}
          >
            Tous
          </button>
          {secteurs.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSecteur(s.id)}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={selectedSecteur === s.id
                ? { background: "#0A4DA814", color: "#0A4DA8", border: "1px solid #0A4DA840" }
                : { color: "#6B7280", border: "1px solid transparent" }}
            >
              {s.nom}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs" style={{ color: "#4B5563" }}>
          {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="px-6 py-4">
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #E2E8F0" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#4B5563", width: "22%" }}>Filière</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#4B5563", width: "12%" }}>N° Module</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#4B5563" }}>Intitulé du module</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: "#4B5563", width: "100px" }}>MHG (h)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: "#4B5563" }}>
                    Aucun résultat pour cette recherche
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => (
                  <tr
                    key={row.id}
                    style={{ borderBottom: "1px solid #E5E7EB", background: i % 2 === 0 ? "#FFFFFF" : "#F8FAFC" }}
                  >
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-medium" style={{ color: "#0A4DA8" }}>{row.filiere}</span>
                      {row.filiereCode && (
                        <span className="ml-1.5 text-[10px] font-mono" style={{ color: "#4B5563" }}>{row.filiereCode}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs" style={{ color: "#6B7280" }}>{row.code ?? "—"}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs" style={{ color: "#374151" }}>{row.nom}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {row.mhg != null ? (
                        <span className="text-xs font-semibold" style={{ color: "#0A4DA8" }}>{row.mhg}h</span>
                      ) : (
                        <span className="text-xs" style={{ color: "#374151" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MHG total par filière visible */}
        {filtered.length > 0 && (
          <div className="mt-3 flex items-center justify-end gap-2">
            <span className="text-xs" style={{ color: "#4B5563" }}>Total MHG affiché :</span>
            <span className="text-xs font-semibold" style={{ color: "#0A4DA8" }}>
              {filtered.reduce((acc, r) => acc + (r.mhg ?? 0), 0)}h
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
