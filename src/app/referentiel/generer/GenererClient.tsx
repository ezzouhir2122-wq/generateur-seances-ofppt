"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setReferentielContext } from "@/lib/referentiel-context";

interface Critere { description: string }
interface Objectif { titre: string; criteres: Critere[] }
interface Competence { id: string; titre: string; objectifs: Objectif[] }
interface Sequence { id: string; titre: string; code: string | null; competences: Competence[] }
interface Module { id: string; nom: string; code: string | null; sequences: Sequence[]; competences: Competence[] }
interface Filiere { id: string; nom: string; code: string | null; modules: Module[] }

export default function GenererClient() {
  const router = useRouter();
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [loading, setLoading] = useState(true);
  const [filiereId, setFiliereId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [sequenceId, setSequenceId] = useState("");
  const [competenceId, setCompetenceId] = useState("");

  useEffect(() => {
    fetch("/api/referentiel?mode=cascade")
      .then((r) => r.json())
      .then((data: Filiere[]) => setFilieres(Array.isArray(data) ? data : []))
      .catch(() => setFilieres([]))
      .finally(() => setLoading(false));
  }, []);

  const filiere = useMemo(() => filieres.find((f) => f.id === filiereId), [filieres, filiereId]);
  const selectedModule = useMemo(() => filiere?.modules.find((m) => m.id === moduleId), [filiere, moduleId]);
  const hasSequences = (selectedModule?.sequences.length ?? 0) > 0;
  const sequence = useMemo(() => selectedModule?.sequences.find((s) => s.id === sequenceId), [selectedModule, sequenceId]);

  const competences = useMemo<Competence[]>(() => {
    if (!selectedModule) return [];
    if (hasSequences) return sequence?.competences ?? [];
    return selectedModule.competences;
  }, [selectedModule, hasSequences, sequence]);

  const competence = useMemo(() => competences.find((c) => c.id === competenceId), [competences, competenceId]);

  const objectifsText = useMemo(
    () => (competence?.objectifs ?? []).map((o) => o.titre).join("\n"),
    [competence]
  );
  const criteresText = useMemo(
    () => (competence?.objectifs ?? []).flatMap((o) => o.criteres.map((c) => c.description)).join("\n"),
    [competence]
  );

  function go(target: "/seances" | "/fiches" | "/evaluations") {
    if (!filiere || !selectedModule || !competence) return;
    setReferentielContext({
      filiere: filiere.nom,
      module: selectedModule.nom,
      codeModule: selectedModule.code ?? "",
      sequence: sequence?.titre,
      competence: competence.titre,
      objectifs: objectifsText,
      criteres: criteresText,
    });
    router.push(target);
  }

  const selectStyle = { background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#111827" };

  if (loading) {
    return <div className="max-w-4xl mx-auto px-6 py-20 text-center" style={{ color: "#9CA3AF" }}>Chargement du référentiel…</div>;
  }

  if (filieres.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="text-5xl mb-4">📚</div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: "#374151" }}>Aucun référentiel importé</h2>
        <p className="text-sm mb-6" style={{ color: "#4B5563" }}>Importez un référentiel depuis Paramètres pour utiliser la génération guidée.</p>
        <Link href="/referentiel" className="text-sm px-4 py-2 rounded-lg font-medium text-white" style={{ background: "#0A4DA8" }}>
          Voir le référentiel
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "#111827" }}>Générer depuis le référentiel</h1>
        <p className="mt-1" style={{ color: "#9CA3AF" }}>Choisissez une compétence, puis générez la séance, la fiche ou l&apos;évaluation correspondante.</p>
      </div>

      <div className="card space-y-5">
        <div>
          <label className="label">Filière *</label>
          <select className="input-field" style={selectStyle} value={filiereId}
            onChange={(e) => { setFiliereId(e.target.value); setModuleId(""); setSequenceId(""); setCompetenceId(""); }}>
            <option value="">— Choisir une filière —</option>
            {filieres.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
        </div>

        {filiere && (
          <div>
            <label className="label">Module *</label>
            <select className="input-field" style={selectStyle} value={moduleId}
              onChange={(e) => { setModuleId(e.target.value); setSequenceId(""); setCompetenceId(""); }}>
              <option value="">— Choisir un module —</option>
              {filiere.modules.map((m) => <option key={m.id} value={m.id}>{m.code ? `${m.code} — ` : ""}{m.nom}</option>)}
            </select>
          </div>
        )}

        {selectedModule && hasSequences && (
          <div>
            <label className="label">Séquence *</label>
            <select className="input-field" style={selectStyle} value={sequenceId}
              onChange={(e) => { setSequenceId(e.target.value); setCompetenceId(""); }}>
              <option value="">— Choisir une séquence —</option>
              {selectedModule.sequences.map((s) => <option key={s.id} value={s.id}>{s.code ? `${s.code} — ` : ""}{s.titre}</option>)}
            </select>
          </div>
        )}

        {selectedModule && (!hasSequences || sequence) && (
          <div>
            <label className="label">Compétence *</label>
            <select className="input-field" style={selectStyle} value={competenceId}
              onChange={(e) => setCompetenceId(e.target.value)}>
              <option value="">— Choisir une compétence —</option>
              {competences.map((c) => <option key={c.id} value={c.id}>{c.titre}</option>)}
            </select>
          </div>
        )}

        {competence && (
          <div className="rounded-xl p-4" style={{ background: "#0A4DA80A", border: "1px solid #0A4DA830" }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: "#0A4DA8" }}>{competence.titre}</h3>
            {objectifsText && (
              <div className="mb-3">
                <p className="text-xs font-semibold mb-1" style={{ color: "#4B5563" }}>Objectifs</p>
                <ul className="list-disc list-inside text-xs space-y-0.5" style={{ color: "#374151" }}>
                  {competence.objectifs.map((o, i) => <li key={i}>{o.titre}</li>)}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={() => go("/seances")} className="text-sm px-4 py-2 rounded-lg font-medium text-white" style={{ background: "#0A4DA8" }}>Générer la séance</button>
              <button onClick={() => go("/fiches")} className="text-sm px-4 py-2 rounded-lg font-medium" style={{ background: "#0A4DA814", color: "#0A4DA8", border: "1px solid #0A4DA840" }}>Générer la fiche</button>
              <button onClick={() => go("/evaluations")} className="text-sm px-4 py-2 rounded-lg font-medium" style={{ background: "#0A4DA814", color: "#0A4DA8", border: "1px solid #0A4DA840" }}>Générer l&apos;évaluation</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
