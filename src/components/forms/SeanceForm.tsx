"use client";

import { useState } from "react";
import { SeanceFormData } from "@/types/seance";
import ReferentielCascade, { ReferentielSelection } from "./ReferentielCascade";

interface Props {
  onGenerate: (data: SeanceFormData) => void;
  isLoading: boolean;
  initial?: Partial<SeanceFormData>;
}

export default function SeanceForm({ onGenerate, isLoading, initial }: Props) {
  const [form, setForm] = useState<SeanceFormData>({
    filiere: "",
    module: "",
    codeModule: "",
    duree: "2h30",
    niveau: "TS",
    annee: "1ere-annee",
    type: "theorique",
    competence: "",
    competences: [],
    ...initial,
  });

  const [saisieLibre, setSaisieLibre] = useState("");

  const handleReferentielChange = (sel: ReferentielSelection) => {
    setForm((prev) => ({
      ...prev,
      filiere: sel.filiere,
      module: sel.module,
      codeModule: sel.codeModule,
      mhg: sel.mhg,
      annee: sel.annee,
      competence: sel.competence,
      competences: sel.competences,
    }));
  };

  const handleSaisieLibre = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setSaisieLibre(val);
    setForm((prev) => ({
      ...prev,
      module: val.trim() || prev.module,
      filiere: prev.filiere || "Hors référentiel",
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.module) return;
    onGenerate(form);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}
    >
      {/* ── En-tête ── */}
      <div style={{
        padding: "18px 22px 14px",
        borderBottom: "1px solid #E5E7EB",
        background: "#F9FAFB",
        flexShrink: 0,
      }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0A4DA8", margin: 0, letterSpacing: "-0.01em" }}>
          Paramètres de la séance
        </h2>
        <p style={{ fontSize: "11.5px", color: "#9CA3AF", marginTop: "3px", lineHeight: 1.4 }}>
          Renseignez les informations du module pour générer la fiche.
        </p>
      </div>

      {/* ── Corps scrollable ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: "16px" }}>

        <ReferentielCascade
          onChange={handleReferentielChange}
          initial={{
            filiere: initial?.filiere,
            codeModule: initial?.codeModule,
            module: initial?.module,
            mhg: initial?.mhg,
            competence: initial?.competence,
            competences: initial?.competences,
            annee: initial?.annee,
          }}
        />

        {/* ── Séance hors référentiel ── */}
        <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: "14px" }}>
          <p style={{ fontSize: "10.5px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: "#9CA3AF", marginBottom: "8px" }}>
            Ou saisir manuellement
          </p>
          <label className="label">Intitulé (hors référentiel)</label>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="Ex : Les opérations de caisse — Saisie des écritures comptables..."
            value={saisieLibre}
            onChange={handleSaisieLibre}
          />
          <p style={{ fontSize: "10px", color: "#9CA3AF", marginTop: "4px" }}>
            Remplissez si la séance n&apos;existe pas encore dans le référentiel.
          </p>
        </div>
      </div>

      {/* ── Pied de page (boutons) ── */}
      <div style={{
        padding: "14px 22px 18px",
        borderTop: "1px solid #E5E7EB",
        background: "#FFFFFF",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}>
        <button
          type="submit"
          className="btn-primary w-full"
          disabled={isLoading || !form.module}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
        >
          {isLoading ? (
            <>
              <span style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,.4)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
              Génération en cours…
            </>
          ) : (
            <>⚡ Générer la séance</>
          )}
        </button>
        {form.module && !isLoading && (
          <button
            type="button"
            onClick={() => {
              setForm({ filiere: "", module: "", codeModule: "", duree: "2h30", niveau: "TS", annee: "1ere-annee", type: "theorique", competence: "", competences: [] });
              setSaisieLibre("");
            }}
            style={{
              width: "100%", padding: "7px", background: "transparent",
              border: "1px solid #E5E7EB", borderRadius: "7px",
              fontSize: "12px", color: "#9CA3AF", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Réinitialiser
          </button>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </form>
  );
}
