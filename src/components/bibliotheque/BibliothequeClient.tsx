"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ResourceListItem, ResourceType, TYPE_META, MyOwnResources } from "@/types/bibliotheque";
import ResourceCard from "./ResourceCard";
import PublishModal from "./PublishModal";
import ResourceDetailModal from "./ResourceDetailModal";

export default function BibliothequeClient() {
  const [resources, setResources] = useState<ResourceListItem[]>([]);
  const [filters, setFilters] = useState<{ filieres: string[]; modules: string[]; etablissements: string[] }>({ filieres: [], modules: [], etablissements: [] });
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [type, setType] = useState<ResourceType | "">("");
  const [filiere, setFiliere] = useState("");
  const [moduleNom, setModuleNom] = useState("");
  const [sort, setSort] = useState<"recent" | "popular">("recent");

  const [showPublish, setShowPublish] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"communaute" | "mes-ressources">("mes-ressources");
  const [etablissement, setEtablissement] = useState("");
  const [myResources, setMyResources] = useState<MyOwnResources>({ seances: [], fiches: [] });
  const [myLoading, setMyLoading] = useState(false);
  const [publishDefaults, setPublishDefaults] = useState<{ sourceId?: string; type?: ResourceType }>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    if (filiere) params.set("filiere", filiere);
    if (moduleNom) params.set("module", moduleNom);
    if (etablissement) params.set("etablissement", etablissement);
    params.set("sort", sort);
    try {
      const res = await fetch(`/api/bibliotheque?${params.toString()}`);
      const data = await res.json();
      setResources(data.resources ?? []);
      setFilters(data.filters ?? { filieres: [], modules: [], etablissements: [] });
    } catch {
      setResources([]);
    } finally {
      setLoading(false);
    }
  }, [q, type, filiere, moduleNom, sort, etablissement]);

  // Debounce sur la recherche, immédiat sur les filtres
  useEffect(() => {
    const t = setTimeout(fetchData, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchData, q]);

  const fetchMyResources = useCallback(() => {
    setMyLoading(true);
    fetch("/api/bibliotheque/mes-ressources")
      .then((r) => r.json())
      .then((d) => setMyResources(d))
      .catch(() => {})
      .finally(() => setMyLoading(false));
  }, []);

  useEffect(() => {
    fetchMyResources();
  }, [fetchMyResources]);

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
      {/* Onglets */}
      <div className="flex gap-1 mb-5 border-b" style={{ borderColor: "#E2E8F0" }}>
        {[
          { key: "communaute", label: "Communauté" },
          { key: "mes-ressources", label: "Mes séances & fiches" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as "communaute" | "mes-ressources")}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={{
              color: activeTab === tab.key ? "#003087" : "#9CA3AF",
              borderBottom: activeTab === tab.key ? "2px solid #003087" : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "communaute" && (
        <>
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
            {filters.etablissements.length > 0 && (
              <select value={etablissement} onChange={(e) => setEtablissement(e.target.value)} style={selectStyle}>
                <option value="">Tous les établissements</option>
                {filters.etablissements.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            )}
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
        </>
      )}

      {activeTab === "mes-ressources" && (
        <div>
          {/* Barre d'actions */}
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm" style={{ color: "#6B7280" }}>
              {myLoading ? "Chargement…" : `${myResources.seances.length + myResources.fiches.length} ressource${myResources.seances.length + myResources.fiches.length !== 1 ? "s" : ""}`}
            </p>
            <button
              onClick={() => setShowPublish(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-opacity hover:opacity-90"
              style={{ background: "#16A34A", color: "#FFFFFF" }}
            >
              <span>⚡</span> Partage rapide
            </button>
          </div>

          {myLoading ? (
            <p className="text-sm text-center py-16" style={{ color: "#9CA3AF" }}>Chargement…</p>
          ) : (
            <>
              {/* Séances */}
              {myResources.seances.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#6B7280" }}>
                    Séances pédagogiques ({myResources.seances.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myResources.seances.map((s) => (
                      <div key={s.id} className="card-hover flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: "#0A4DA814", color: "#0A4DA8", border: "1px solid #0A4DA830" }}>
                            ⚡ Séance
                          </span>
                          {s.isPublished && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{ background: "#D1FAE5", color: "#065F46" }}>
                              Publié ✓
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold leading-snug line-clamp-2" style={{ color: "#111827" }}>{s.titre}</h3>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {s.filiere && <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "#F8FAFC", color: "#6B7280", border: "1px solid #E2E8F0" }}>{s.filiere}</span>}
                            {s.module && <span className="text-[10px] px-2 py-0.5 rounded truncate max-w-[160px]" style={{ background: "#F8FAFC", color: "#6B7280", border: "1px solid #E2E8F0" }}>{s.module}</span>}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: "1px solid #F3F4F6" }}>
                          <span className="text-[10px]" style={{ color: "#C4C9D4" }}>
                            {new Date(s.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                          {!s.isPublished && (
                            <button
                              onClick={() => { setPublishDefaults({ sourceId: s.id, type: "SEANCE" }); setShowPublish(true); }}
                              className="text-[11px] font-semibold px-3 py-1 rounded-lg transition-colors"
                              style={{ background: "#16A34A", color: "#FFFFFF" }}
                            >
                              Partager
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fiches */}
              {myResources.fiches.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#6B7280" }}>
                    Fiches pédagogiques ({myResources.fiches.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myResources.fiches.map((f) => (
                      <div key={f.id} className="card-hover flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: "#00308714", color: "#003087", border: "1px solid #00308730" }}>
                            📋 Fiche
                          </span>
                          {f.isPublished && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{ background: "#D1FAE5", color: "#065F46" }}>
                              Publié ✓
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold leading-snug line-clamp-2" style={{ color: "#111827" }}>{f.titre}</h3>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {f.filiere && <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "#F8FAFC", color: "#6B7280", border: "1px solid #E2E8F0" }}>{f.filiere}</span>}
                            {f.module && <span className="text-[10px] px-2 py-0.5 rounded truncate max-w-[160px]" style={{ background: "#F8FAFC", color: "#6B7280", border: "1px solid #E2E8F0" }}>{f.module}</span>}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-2" style={{ borderTop: "1px solid #F3F4F6" }}>
                          <span className="text-[10px]" style={{ color: "#C4C9D4" }}>
                            {new Date(f.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                          {!f.isPublished && (
                            <button
                              onClick={() => { setPublishDefaults({ sourceId: f.id, type: "FICHE" }); setShowPublish(true); }}
                              className="text-[11px] font-semibold px-3 py-1 rounded-lg transition-colors"
                              style={{ background: "#16A34A", color: "#FFFFFF" }}
                            >
                              Partager
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {myResources.seances.length === 0 && myResources.fiches.length === 0 && (
                <div className="flex flex-col items-center py-16 rounded-2xl gap-3" style={{ border: "1px dashed #E2E8F0" }}>
                  <div className="text-4xl">📚</div>
                  <p className="text-sm font-medium" style={{ color: "#374151" }}>Aucune séance ou fiche générée</p>
                  <p className="text-xs" style={{ color: "#6B7280" }}>Génère des séances et fiches pédagogiques pour les partager ici.</p>
                  <div className="flex gap-2 mt-2">
                    <Link href="/seances" className="px-4 py-2 text-xs font-semibold rounded-xl" style={{ background: "#0A4DA8", color: "#FFFFFF" }}>
                      ⚡ Générer une séance
                    </Link>
                    <Link href="/fiches" className="px-4 py-2 text-xs font-semibold rounded-xl" style={{ background: "#003087", color: "#FFFFFF" }}>
                      📋 Générer une fiche
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {showPublish && (
        <PublishModal
          onClose={() => { setShowPublish(false); setPublishDefaults({}); }}
          onPublished={() => {
            setShowPublish(false);
            setPublishDefaults({});
            fetchData();
            fetchMyResources();
          }}
          defaultSourceId={publishDefaults.sourceId}
          defaultType={publishDefaults.type}
        />
      )}
      {detailId && (
        <ResourceDetailModal id={detailId} onClose={() => setDetailId(null)} onChanged={fetchData} />
      )}
    </div>
  );
}
