"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import GroupeCard from "@/components/suivi/GroupeCard";
import { GroupeSummary } from "@/types/suivi";
import PageShell from "@/components/ui/PageShell";

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
    <PageShell
      title="Suivi des compétences"
      subtitle="Gérez vos groupes et suivez la progression de chaque stagiaire par compétence"
      icon="📊"
      breadcrumb={[
        { label: "Accueil", href: "/" },
        { label: "Pédagogie" },
        { label: "Suivi des compétences" },
      ]}
      action={{ label: "+ Nouveau groupe", href: "/suivi/nouveau" }}
    >
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#0A4DA8] border-t-transparent rounded-full animate-spin" />
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
            style={{ background: "#0A4DA8", color: "#FFFFFF" }}
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
    </PageShell>
  );
}
