"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import CompetenceSelector, { CompetenceModuleGroup } from "@/components/suivi/CompetenceSelector";

interface Props {
  groupeId: string;
  groups: CompetenceModuleGroup[];
  initialSelected: string[];
}

export default function CompetenceManager({ groupeId, groups, initialSelected }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/groupes/${groupeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competenceIds: selected }),
      });
      if (!res.ok) throw new Error();
      toast.success("Compétences mises à jour");
      router.push(`/suivi/${groupeId}`);
      router.refresh();
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-5" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
        <CompetenceSelector groups={groups} selected={selected} onChange={setSelected} />
      </div>

      {groups.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: "#6B7280" }}>
            Si aucune compétence n&apos;est sélectionnée, le suivi affiche toutes les compétences de la filière.
          </p>
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
            style={{ background: "#0A4DA8", color: "#FFFFFF" }}
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      )}
    </div>
  );
}
