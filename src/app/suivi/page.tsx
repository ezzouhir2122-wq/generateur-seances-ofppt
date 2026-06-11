"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import GroupeCard from "@/components/suivi/GroupeCard";
import { GroupeSummary } from "@/types/suivi";

export default function SuiviPage() {
  const [groupes, setGroupes] = useState<GroupeSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroupes = useCallback(async () => {
    const res = await fetch("/api/groupes");
    if (res.ok) setGroupes(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchGroupes(); }, [fetchGroupes]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce groupe et tous ses stagiaires ?")) return;
    await fetch(`/api/groupes/${id}`, { method: "DELETE" });
    setGroupes((prev) => prev.filter((g) => g.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#111827" }}>Suivi des Compétences</h1>
          <p className="mt-1 text-sm" style={{ color: "#9CA3AF" }}>Gérez vos groupes et suivez la progression par compétence</p>
        </div>
        <Link
          href="/suivi/nouveau"
          className="px-4 py-2 text-sm font-semibold rounded-xl transition-colors"
          style={{ background: "#E8651A", color: "#0B0B14" }}
        >
          + Nouveau groupe
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#E8651A] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : groupes.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl"
          style={{ border: "1px dashed #E2E8F0" }}
        >
          <div className="text-4xl mb-3">👥</div>
          <p className="font-medium mb-1" style={{ color: "#374151" }}>Aucun groupe créé</p>
          <p className="text-sm mb-4" style={{ color: "#6B7280" }}>Créez votre premier groupe pour commencer le suivi</p>
          <Link
            href="/suivi/nouveau"
            className="px-4 py-2 text-sm font-semibold rounded-xl"
            style={{ background: "#E8651A", color: "#0B0B14" }}
          >
            Créer un groupe
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {groupes.map((g) => (
            <GroupeCard key={g.id} groupe={g} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
