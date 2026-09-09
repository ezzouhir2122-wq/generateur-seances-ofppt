"use client";

import { useState, useRef } from "react";
import type { CorrectionFormData, CorrectionInputMode } from "@/types/correction";

interface Props {
  onGenerate: (data: CorrectionFormData) => void;
  isLoading: boolean;
}

const TYPES: { value: CorrectionFormData["type"]; label: string; sublabel: string; icon: string }[] = [
  { value: "copie",  label: "Copie d'examen", sublabel: "CC, EFM, Rattrapage", icon: "📋" },
  { value: "devoir", label: "Devoir / TP",    sublabel: "Exercice, Projet",     icon: "✏️" },
];

const INPUT_MODES: { value: CorrectionInputMode; label: string; icon: string }[] = [
  { value: "texte", label: "Texte", icon: "✏️" },
  { value: "pdf",   label: "PDF",   icon: "📄" },
  { value: "image", label: "Image", icon: "🖼️" },
];

const ACCEPTED: Record<CorrectionInputMode, string> = {
  texte: "",
  pdf:   "application/pdf",
  image: "image/jpeg,image/png,image/webp,image/gif",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 700,
  color: "#374151",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: "6px",
};

const OPTIONAL_BADGE: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 600,
  color: "#9CA3AF",
  background: "#F3F4F6",
  padding: "1px 5px",
  borderRadius: "4px",
  marginLeft: "6px",
  textTransform: "none",
  letterSpacing: 0,
  verticalAlign: "middle",
};

export default function CorrectionForm({ onGenerate, isLoading }: Props) {
  const [form, setForm] = useState<CorrectionFormData>({
    type: "copie",
    matiere: "",
    noteSur: 20,
    sujet: "",
    bareme: "",
    corrigeType: "",
    copieEtudiant: "",
    nomStagiaire: "",
    inputMode: "texte",
  });

  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (field: keyof CorrectionFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleModeChange = (mode: CorrectionInputMode) => {
    setForm(prev => ({
      ...prev,
      inputMode: mode,
      copieEtudiant: "",
      fichierBase64: undefined,
      fichierMimeType: undefined,
      fichierNom: undefined,
    }));
    setPreviewUrl(null);
  };

  const handleFile = async (file: File) => {
    const base64 = await fileToBase64(file);
    setForm(prev => ({
      ...prev,
      fichierBase64: base64,
      fichierMimeType: file.type,
      fichierNom: file.name,
    }));
    setPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(form);
  };

  const hasFile = !!form.fichierBase64;
  const canSubmit = form.inputMode === "texte"
    ? form.copieEtudiant.trim().length > 20
    : hasFile;

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

        {/* 1 — Type */}
        <div>
          <label style={LABEL_STYLE}>Type de travail *</label>
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

        {/* 2 — Matière + Nom stagiaire */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={LABEL_STYLE}>
              Matière
              <span style={OPTIONAL_BADGE}>optionnel</span>
            </label>
            <input
              className="input-field"
              placeholder="Ex : Comptabilité"
              value={form.matiere ?? ""}
              onChange={set("matiere")}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>
              Stagiaire
              <span style={OPTIONAL_BADGE}>optionnel</span>
            </label>
            <input
              className="input-field"
              placeholder="Ex : M. Alami"
              value={form.nomStagiaire ?? ""}
              onChange={set("nomStagiaire")}
            />
          </div>
        </div>

        {/* 3 — Note sur + Barème */}
        <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: "10px" }}>
          <div>
            <label style={LABEL_STYLE}>Note sur</label>
            <input
              className="input-field"
              type="number"
              min={1}
              max={200}
              value={form.noteSur ?? 20}
              onChange={e => setForm(prev => ({ ...prev, noteSur: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>
              Barème
              <span style={OPTIONAL_BADGE}>optionnel</span>
            </label>
            <input
              className="input-field"
              placeholder="Ex : Q1 /4, Q2 /6, Q3 /10"
              value={form.bareme ?? ""}
              onChange={set("bareme")}
            />
          </div>
        </div>

        {/* 4 — Sujet / Énoncé */}
        <div>
          <label style={LABEL_STYLE}>
            Sujet / Énoncé
            <span style={OPTIONAL_BADGE}>optionnel</span>
          </label>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="Collez ici les questions posées aux stagiaires…"
            value={form.sujet ?? ""}
            onChange={set("sujet")}
          />
        </div>

        {/* 5 — Corrigé type */}
        <div>
          <label style={LABEL_STYLE}>
            Corrigé type / Réponses attendues
            <span style={OPTIONAL_BADGE}>optionnel</span>
          </label>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="Collez ici le corrigé officiel — améliore la précision de la note…"
            value={form.corrigeType ?? ""}
            onChange={set("corrigeType")}
          />
        </div>

        {/* 6 — Copie du stagiaire */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <label style={{ ...LABEL_STYLE, marginBottom: 0, color: "#0A4DA8" }}>
              Copie du stagiaire *
            </label>
            {/* Mode tabs */}
            <div style={{
              display: "flex", gap: "2px",
              background: "#F3F4F6", borderRadius: "8px", padding: "2px",
            }}>
              {INPUT_MODES.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => handleModeChange(m.value)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                    background: form.inputMode === m.value ? "#FFFFFF" : "transparent",
                    color: form.inputMode === m.value ? "#0A4DA8" : "#6B7280",
                    boxShadow: form.inputMode === m.value ? "0 1px 3px rgba(0,0,0,.1)" : "none",
                  }}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Texte */}
          {form.inputMode === "texte" && (
            <>
              <textarea
                className="input-field resize-none"
                rows={9}
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
            </>
          )}

          {/* PDF / Image */}
          {(form.inputMode === "pdf" || form.inputMode === "image") && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "#0A4DA8" : hasFile ? "#16A34A" : "#D1D5DB"}`,
                borderRadius: "12px",
                background: dragOver ? "#EEF3FB" : hasFile ? "#F0FDF4" : "#F9FAFB",
                padding: "24px 16px",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                textAlign: "center",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED[form.inputMode]}
                style={{ display: "none" }}
                onChange={handleFileInput}
              />
              {previewUrl && form.inputMode === "image" && (
                <img
                  src={previewUrl}
                  alt="Aperçu"
                  style={{ maxHeight: "160px", maxWidth: "100%", borderRadius: "8px", objectFit: "contain", border: "1px solid #E5E7EB" }}
                />
              )}
              {!previewUrl && (
                <div style={{ fontSize: "32px" }}>
                  {form.inputMode === "pdf" ? "📄" : "🖼️"}
                </div>
              )}
              {hasFile ? (
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#16A34A", margin: 0 }}>
                    ✓ {form.fichierNom}
                  </p>
                  <p style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px" }}>
                    Cliquez pour changer de fichier
                  </p>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#374151", margin: 0 }}>
                    {form.inputMode === "pdf"
                      ? "Déposez le PDF ou cliquez pour choisir"
                      : "Déposez l'image ou cliquez pour choisir"}
                  </p>
                  <p style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px" }}>
                    {form.inputMode === "pdf"
                      ? "Fichier PDF uniquement"
                      : "JPG, PNG, WEBP — L'IA lit l'écriture manuscrite"}
                  </p>
                </div>
              )}
            </div>
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
