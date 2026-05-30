"use client";

import { useState } from "react";
import { SeanceFormData, FILIERES_OFPPT } from "@/types/seance";

interface Props {
  onGenerate: (data: SeanceFormData) => void;
  isLoading: boolean;
}

export default function SeanceForm({ onGenerate, isLoading }: Props) {
  const [form, setForm] = useState<SeanceFormData>({
    filiere: "",
    module: "",
    duree: "2h",
    niveau: "1ere-annee",
    type: "theorique",
    objectifs: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.filiere || !form.module || !form.objectifs) return;
    onGenerate(form);
  };

  const set = (field: keyof SeanceFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      <h2 className="text-xl font-bold text-ofppt-green border-b border-gray-100 pb-4">
        Paramètres de la séance
      </h2>

      {/* Filière */}
      <div>
        <label className="label">Filière *</label>
        <select className="input-field" value={form.filiere} onChange={set("filiere")} required>
          <option value="">— Choisir une filière —</option>
          {FILIERES_OFPPT.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {/* Module */}
      <div>
        <label className="label">Module *</label>
        <input
          type="text"
          className="input-field"
          placeholder="Ex: M201 — Développement web"
          value={form.module}
          onChange={set("module")}
          required
        />
      </div>

      {/* Durée + Niveau */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Durée</label>
          <select className="input-field" value={form.duree} onChange={set("duree")}>
            <option value="1h">1 heure</option>
            <option value="2h">2 heures</option>
            <option value="3h">3 heures</option>
            <option value="4h">4 heures (demi-journée)</option>
            <option value="6h">6 heures (journée)</option>
          </select>
        </div>
        <div>
          <label className="label">Niveau</label>
          <select className="input-field" value={form.niveau} onChange={set("niveau")}>
            <option value="1ere-annee">1ère année</option>
            <option value="2eme-annee">2ème année</option>
          </select>
        </div>
      </div>

      {/* Type de séance */}
      <div>
        <label className="label">Type de séance</label>
        <div className="flex gap-3">
          {[
            { value: "theorique", label: "Cours théorique" },
            { value: "tp", label: "Travaux Pratiques" },
            { value: "ta", label: "Travaux d'Application" },
          ].map((t) => (
            <label
              key={t.value}
              className={`flex-1 border rounded-lg px-3 py-2.5 text-sm text-center cursor-pointer transition-colors ${
                form.type === t.value
                  ? "border-ofppt-green bg-ofppt-green/5 text-ofppt-green font-medium"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="type"
                value={t.value}
                className="hidden"
                checked={form.type === t.value}
                onChange={set("type")}
              />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      {/* Objectifs */}
      <div>
        <label className="label">Objectifs pédagogiques *</label>
        <textarea
          className="input-field resize-none"
          rows={4}
          placeholder="Ex: À la fin de cette séance, le stagiaire sera capable de créer une page HTML structurée avec les balises sémantiques..."
          value={form.objectifs}
          onChange={set("objectifs")}
          required
        />
      </div>

      <button type="submit" className="btn-primary w-full" disabled={isLoading}>
        {isLoading ? "Génération en cours..." : "Générer la séance"}
      </button>
    </form>
  );
}
