"use client";

import { useState } from "react";
import { toast } from "sonner";

interface Props {
  initialUser: {
    name: string;
    email: string;
    matricule: string | null;
    etablissement: string | null;
  };
}

export default function ProfilTab({ initialUser }: Props) {
  const [matricule, setMatricule] = useState(initialUser.matricule ?? "");
  const [etablissement, setEtablissement] = useState(initialUser.etablissement ?? "");
  const [saving, setSaving] = useState(false);

  const initials = (initialUser.name || initialUser.email || "F").charAt(0).toUpperCase();

  const saveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricule: matricule.trim(),
          etablissement: etablissement.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Profil mis à jour");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
        <h2 className="text-base font-semibold mb-5" style={{ color: "#111827" }}>
          Informations du profil
        </h2>

        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[#E2E8F0]">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
            style={{ background: "#003087" }}
          >
            {initials}
          </div>
          <div>
            <p className="font-semibold text-base" style={{ color: "#111827" }}>
              {initialUser.name || "Formateur"}
            </p>
            <p className="text-sm mt-0.5" style={{ color: "#6B7280" }}>
              {initialUser.email}
            </p>
            <p className="text-xs mt-1 px-2 py-0.5 rounded-full inline-block" style={{ background: "#003087", color: "#FFFFFF" }}>
              Formateur OFPPT
            </p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
              Nom complet
            </label>
            <div
              className="w-full text-sm px-3 py-2.5 rounded-lg"
              style={{ background: "#F9FAFB", border: "1px solid #E2E8F0", color: "#6B7280" }}
            >
              {initialUser.name || "—"}
            </div>
            <p className="text-[10px] mt-1" style={{ color: "#9CA3AF" }}>
              Modifiable via l&apos;administrateur système
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
              Email
            </label>
            <div
              className="w-full text-sm px-3 py-2.5 rounded-lg"
              style={{ background: "#F9FAFB", border: "1px solid #E2E8F0", color: "#6B7280" }}
            >
              {initialUser.email}
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#374151" }}>
            Informations pour les exports PDF
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
                Matricule
              </label>
              <input
                type="text"
                placeholder="Ex: 9559"
                value={matricule}
                onChange={(e) => setMatricule(e.target.value)}
                maxLength={20}
                className="w-full text-sm px-3 py-2.5 rounded-lg outline-none transition-all"
                style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#111827" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#003087")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
                Établissement
              </label>
              <input
                type="text"
                placeholder="Ex: ISTA Hay Riad"
                value={etablissement}
                onChange={(e) => setEtablissement(e.target.value)}
                maxLength={100}
                className="w-full text-sm px-3 py-2.5 rounded-lg outline-none transition-all"
                style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#111827" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#003087")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
              />
            </div>
          </div>
        </div>

        <button
          onClick={saveProfile}
          disabled={saving}
          className="mt-5 w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ background: "#003087" }}
        >
          {saving ? "Sauvegarde…" : "Sauvegarder le profil"}
        </button>
      </div>
    </div>
  );
}
