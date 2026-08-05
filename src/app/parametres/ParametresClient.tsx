"use client";

import { useState } from "react";
import ProfilTab from "@/components/parametres/ProfilTab";
import ApiTab from "@/components/parametres/ApiTab";
import ReferentielTab from "@/components/parametres/ReferentielTab";
import CompteTab from "@/components/parametres/CompteTab";

type Tab = "profil" | "api" | "referentiel" | "compte";

interface Props {
  initialUser: {
    name: string;
    email: string;
    matricule: string | null;
    etablissement: string | null;
  };
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "profil",      label: "Profil",              icon: "👤" },
  { id: "api",         label: "Clés API & Modèle IA", icon: "🔑" },
  { id: "referentiel", label: "Référentiel",          icon: "📚" },
  { id: "compte",      label: "Compte & Sécurité",    icon: "🔒" },
];

export default function ParametresClient({ initialUser }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("profil");

  return (
    <div className="min-h-screen" style={{ background: "#F8FAFC" }}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: "#111827" }}>
            Paramètres
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
            Gérez votre profil, vos clés API, votre référentiel et votre compte.
          </p>
        </div>

        <div
          className="flex gap-1 mb-6 p-1 rounded-xl"
          style={{ background: "#F3F4F6", border: "1px solid #E2E8F0" }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center"
              style={
                activeTab === tab.id
                  ? { background: "#FFFFFF", color: "#003087", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                  : { color: "#6B7280" }
              }
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === "profil"      && <ProfilTab initialUser={initialUser} />}
        {activeTab === "api"         && <ApiTab />}
        {activeTab === "referentiel" && <ReferentielTab />}
        {activeTab === "compte"      && <CompteTab email={initialUser.email} />}
      </div>
    </div>
  );
}
