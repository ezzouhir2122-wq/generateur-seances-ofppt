"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiliereOption, SecteurGroup } from "@/types/suivi";
import CompetenceSelector, { CompetenceModuleGroup } from "@/components/suivi/CompetenceSelector";

const ANNEES = ["2024-2025", "2025-2026", "2026-2027", "2027-2028"];

export default function GroupeForm() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [filiereId, setFiliereId] = useState("");
  const [annee, setAnnee] = useState(ANNEES[1]);
  const [filieres, setFilieres] = useState<FiliereOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sélection des compétences
  const [compGroups, setCompGroups] = useState<CompetenceModuleGroup[]>([]);
  const [compLoading, setCompLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/referentiel")
      .then((r) => r.json())
      .then((secteurs: SecteurGroup[]) => {
        const opts: FiliereOption[] = secteurs.flatMap((s) =>
          s.filieres.map((f) => ({ id: f.id, nom: f.nom, secteurNom: s.nom }))
        );
        setFilieres(opts);
      })
      .catch(() => {});
  }, []);

  // Charger les compétences de la filière choisie (tout sélectionné par défaut)
  useEffect(() => {
    if (!filiereId) { setCompGroups([]); setSelected([]); return; }
    setCompLoading(true);
    fetch(`/api/competences?filiereId=${encodeURIComponent(filiereId)}`)
      .then((r) => r.json())
      .then((groups: CompetenceModuleGroup[]) => {
        setCompGroups(groups);
        setSelected(groups.flatMap((g) => g.competences.map((c) => c.id)));
      })
      .catch(() => { setCompGroups([]); setSelected([]); })
      .finally(() => setCompLoading(false));
  }, [filiereId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom || !filiereId || !annee) { setError("Tous les champs sont requis"); return; }
    setLoading(true);
    setError("");

    const res = await fetch("/api/groupes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, filiereId, annee, competenceIds: selected }),
    });

    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Erreur lors de la création");
      setLoading(false);
      return;
    }

    const groupe = await res.json();
    router.push(`/suivi/${groupe.id}/stagiaires`);
  };

  const inputStyle = {
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    color: "#111827",
    borderRadius: "12px",
    padding: "10px 14px",
    fontSize: "14px",
    width: "100%",
    outline: "none",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-medium mb-2" style={{ color: "#9CA3AF" }}>Nom du groupe</label>
        <input
          type="text"
          placeholder="ex: G1 TS Dev Digital"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-2" style={{ color: "#9CA3AF" }}>Filière</label>
        {filieres.length === 0 ? (
          <p className="text-xs" style={{ color: "#EF4444" }}>
            Aucune filière dans le référentiel. Importez d&apos;abord un référentiel via Modules &amp; Paramètres.
          </p>
        ) : (
          <select
            value={filiereId}
            onChange={(e) => setFiliereId(e.target.value)}
            style={{ ...inputStyle, appearance: "none" }}
          >
            <option value="">Choisir une filière</option>
            {filieres.map((f) => (
              <option key={f.id} value={f.id}>{f.nom} — {f.secteurNom}</option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium mb-2" style={{ color: "#9CA3AF" }}>Année scolaire</label>
        <select
          value={annee}
          onChange={(e) => setAnnee(e.target.value)}
          style={{ ...inputStyle, appearance: "none" }}
        >
          {ANNEES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {filiereId && (
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: "#9CA3AF" }}>
            Compétences à évaluer
          </label>
          <CompetenceSelector
            groups={compGroups}
            selected={selected}
            onChange={setSelected}
            loading={compLoading}
          />
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-2.5 text-sm rounded-xl transition-colors"
          style={{ border: "1px solid #E2E8F0", color: "#9CA3AF" }}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors"
          style={{ background: loading ? "#4B5563" : "#0A4DA8", color: "#FFFFFF" }}
        >
          {loading ? "Création…" : "Créer le groupe"}
        </button>
      </div>
    </form>
  );
}
