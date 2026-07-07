"use client";

import { useCallback, useEffect, useState } from "react";
import { ResourceListItem, ResourceType, TYPE_META } from "@/types/bibliotheque";
import ResourceCard from "./ResourceCard";
import PublishModal from "./PublishModal";
import ResourceDetailModal from "./ResourceDetailModal";

export default function BibliothequeClient() {
  const [resources, setResources] = useState<ResourceListItem[]>([]);
  const [filters, setFilters] = useState<{ filieres: string[]; modules: string[] }>({ filieres: [], modules: [] });
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [type, setType] = useState<ResourceType | "">("");
  const [filiere, setFiliere] = useState("");
  const [moduleNom, setModuleNom] = useState("");
  const [sort, setSort] = useState<"recent" | "popular">("recent");

  const [showPublish, setShowPublish] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    if (filiere) params.set("filiere", filiere);
    if (moduleNom) params.set("module", moduleNom);
    params.set("sort", sort);
    try {
      const res = await fetch(`/api/bibliotheque?${params.toString()}`);
      const data = await res.json();
      setResources(data.resources ?? []);
      setFilters(data.filters ?? { filieres: [], modules: [] });
    } catch {
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, [q, type, filiere, moduleNom, sort]);

  // Debounce sur la recherche, immédiat sur les filtres
  useEffect(() => {
    const t = setTimeout(fetchData, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchData, q]);

  const likeFromCard = async (id: string) => {
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, likedByMe: !r.likedByMe, likeCount: r.likeCount + (r.likedByMe ? -1 : 1) } : r))
    );
    await fetch(`/api/bibliotheque/${id}/like`, { method: "POST" });
  };

  const selectStyle: React.CSSProperties = {
    background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#111827",
    borderRadius: "10px", padding: "8px 12px", fontSize: "13px", outline: "none", appearance: "none",
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Barre recherche + filtres */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setShowPublish(true)}
          className="px-4 py-2.5 text-sm font-semibold rounded-xl"
          style={{ background: "#16A34A", color: "#FFFFFF" }}
        >
          + Publier
        </button>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Rechercher par titre, module, auteur…"
          className="flex-1 min-w-[220px]"
          style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#111827", borderRadius: "10px", padding: "8px 14px", fontSize: "13px", outline: "none" }}
        />
        <select value={type} onChange={(e) => setType(e.target.value as ResourceType | "")} style={selectStyle}>
          <option value="">Tous les types</option>
          {(Object.keys(TYPE_META) as ResourceType[]).map((t) => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
        </select>
        <select value={filiere} onChange={(e) => setFiliere(e.target.value)} style={selectStyle}>
          <option value="">Toutes les filières</option>
          {filters.filieres.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={moduleNom} onChange={(e) => setModuleNom(e.target.value)} style={selectStyle}>
          <option value="">Tous les modules</option>
          {filters.modules.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as "recent" | "popular")} style={selectStyle}>
          <option value="recent">Plus récents</option>
          <option value="popular">Plus populaires</option>
        </select>
      </div>

      {/* Grille */}
      {loading ? (
        <p className="text-sm text-center py-16" style={{ color: "#9CA3AF" }}>Chargement…</p>
      ) : resources.length === 0 ? (
        <div className="flex flex-col items-center py-16 rounded-2xl" style={{ border: "1px dashed #E2E8F0" }}>
          <p className="text-sm" style={{ color: "#374151" }}>Aucune ressource pour l&apos;instant</p>
          <p className="text-xs mt-1" style={{ color: "#6B7280" }}>Sois le premier à partager une ressource avec la communauté !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((r) => (
            <ResourceCard key={r.id} resource={r} onOpen={() => setDetailId(r.id)} onLike={() => likeFromCard(r.id)} />
          ))}
        </div>
      )}

      {showPublish && (
        <PublishModal
          onClose={() => setShowPublish(false)}
          onPublished={() => { setShowPublish(false); fetchData(); }}
        />
      )}
      {detailId && (
        <ResourceDetailModal id={detailId} onClose={() => setDetailId(null)} onChanged={fetchData} />
      )}
    </div>
  );
}
