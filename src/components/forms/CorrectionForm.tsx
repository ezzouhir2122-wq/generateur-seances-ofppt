"use client";

import { useState } from "react";
import type { CorrectionFormData } from "@/types/correction";
import ReferentielCascade, { ReferentielSelection } from "./ReferentielCascade";

interface Props {
  onGenerate: (data: CorrectionFormData) => void;
  isLoading: boolean;
}

const TYPES: { value: CorrectionFormData["type"]; label: string; sublabel: string; icon: string }[] = [
  { value: "copie",  label: "Copie d'examen", sublabel: "CC, EFM, Rattrapage", icon: "📋" },
  { value: "devoir", label: "Devoir / TP",    sublabel: "Exercice, Projet",     icon: "✏️" },
];

export default function CorrectionForm({ onGenerate, isLoading }: Props) {
  const [form, setForm] = useState<CorrectionFormData>({
    type: "copie",
    filiere: "",
    module: "",
    bareme: "",
    corrigeType: "",
    copieEtudiant: "",
    nomStagiaire: "",
  });

  const handleReferentielChange = (sel: ReferentielSelection) => {
    setForm(prev => ({ ...prev, filiere: sel.filiere, module: sel.module }));
  };

  const set = (field: keyof CorrectionFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(form);
  };

  const canSubmit = form.filiere && form.module && form.copieEtudiant.trim().length > 20;

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}
    >
      {/* Header */}
      <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB", flexShrink: 0 }}>
        <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#0A4DA8", margin: 0 }}>
          Paramètres de la correction
        </h2>
        <p style={{ fontSize: "11.5px", color: "#9CA3AF", marginTop: "3px", lineHeight: 1.4 }}>
          Collez la copie et laissez l&apos;IA noter, analyser et rédiger un feedback.
        </p>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Type */}
        <div>
          <label className="label" style={{ marginBottom: "6px", display: "block", fontSize: "11px", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Type de travail *
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {TYPES.map(t => (
              <label
                key={t.value}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  padding: "14px 10px", borderRadius: "12px", cursor: "pointer", transition: "all 0.15s",
                  border: form.type === t.value ? "2px solid #0A4DA8" : "2px solid #E2E8F0",
                  background: form.type === t.value ? "#0A4DA810" : "#F9FAFB",
                  gap: "4px",
                }}
              >
                <input type="radio" name="type" value={t.value} className="hidden"
                  checked={form.type === t.value}
                  onChange={() => setForm(prev => ({ ...prev, type: t.value }))} />
                <span style={{ fontSize: "22px" }}>{t.icon}</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: form.type === t.value ? "#0A4DA8" : "#374151", textAlign: "center" }}>{t.label}</span>
                <span style={{ fontSize: "10px", color: "#6B7280", textAlign: "center" }}>{t.sublabel}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Référentiel cascade */}
        <ReferentielCascade onChange={handleReferentielChange} />

        {/* Nom stagiaire */}
        <div>
          <label className="label">Nom du stagiaire (optionnel)</label>
          <input
            className="input-field"
            placeholder="Ex : Mohammed Alami"
            value={form.nomStagiaire ?? ""}
            onChange={set("nomStagiaire")}
          />
        </div>

        {/* Barème */}
        <div>
          <label className="label">Barème (optionnel)</label>
          <textarea
            className="input-field resize-none"
            rows={2}
            placeholder={"Ex : Q1 : /4, Q2 : /6, Q3 : /10"}
            value={form.bareme}
            onChange={set("bareme")}
          />
        </div>

        {/* Corrigé type */}
        <div>
          <label className="label">Corrigé type (optionnel)</label>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="Collez ici le corrigé officiel ou la réponse attendue…"
            value={form.corrigeType}
            onChange={set("corrigeType")}
          />
        </div>

        {/* Copie étudiant */}
        <div>
          <label className="label" style={{ color: "#0A4DA8" }}>
            Copie du stagiaire *
          </label>
          <textarea
            className="input-field resize-none"
            rows={8}
            required
            placeholder="Collez ici le texte de la copie à corriger…"
            value={form.copieEtudiant}
            onChange={set("copieEtudiant")}
            style={{ borderColor: form.copieEtudiant.trim().length > 0 ? "#0A4DA840" : undefined }}
          />
          {form.copieEtudiant.trim().length > 0 && form.copieEtudiant.trim().length < 20 && (
            <p style={{ fontSize: "11px", color: "#E8651A", marginTop: "4px" }}>
              La copie semble trop courte pour être corrigée.
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "14px 22px 18px", borderTop: "1px solid #E5E7EB", background: "#FFFFFF", flexShrink: 0 }}>
        <button
          type="submit"
          className="btn-primary w-full"
          disabled={isLoading || !canSubmit}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: canSubmit ? 1 : 0.5 }}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Correction en cours…
            </>
          ) : "Corriger avec l'IA"}
        </button>
      </div>
    </form>
  );
}
