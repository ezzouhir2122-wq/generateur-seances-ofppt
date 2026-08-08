import React from "react";

/* ─── SVG Icons ─── */
const DashboardIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const SeanceIcon = () => (
  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);
const FicheIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
);
const EvalIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polyline points="9 11 12 14 22 4"/>
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
  </svg>
);
const CorrectionIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const HistoriqueIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
  </svg>
);
const FolderIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
  </svg>
);
const SuiviIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);
const RefIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);
const BiblioIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
  </svg>
);
export const AssistantIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" className="animate-pulse" style={{ overflow: "visible" }}>
    <path
      d="M13 2L4.5 13.5H11L10 22L20.5 10H14L13 2Z"
      style={{ fill: "#22C55E" }}
      strokeLinejoin="round"
    />
  </svg>
);
const SimulatorIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="2" y="6" width="20" height="12" rx="2"/>
    <path d="M12 12h.01M8 12a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z"/>
    <path d="M10 10v4m-2-2h4"/>
  </svg>
);

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact: boolean;
  keepIconColor?: boolean;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    id: "principal",
    label: "Accueil",
    items: [
      { href: "/", label: "Tableau de bord", icon: <DashboardIcon />, exact: true },
    ],
  },
  {
    id: "generation",
    label: "Génération IA",
    items: [
      { href: "/seances", label: "Séance pédagogique", icon: <SeanceIcon />, exact: false },
      { href: "/fiches", label: "Fiche pédagogique", icon: <FicheIcon />, exact: true },
      { href: "/evaluations", label: "Évaluation", icon: <EvalIcon />, exact: false },
      { href: "/corrections", label: "Correction IA", icon: <CorrectionIcon />, exact: false },
    ],
  },
  {
    id: "documents",
    label: "Historique",
    items: [
      { href: "/historique", label: "Historique séances", icon: <HistoriqueIcon />, exact: false },
      { href: "/fiches/historique", label: "Historique fiches", icon: <FolderIcon />, exact: false },
    ],
  },
  {
    id: "pedagogie",
    label: "Pédagogie",
    items: [
      { href: "/referentiel", label: "Référentiel", icon: <RefIcon />, exact: false },
      { href: "/bibliotheque", label: "Bibliothèque", icon: <BiblioIcon />, exact: false },
    ],
  },
  {
    id: "simulator",
    label: "Simulation IA",
    items: [
      { href: "/simulator", label: "Competencia Simulator", icon: <SimulatorIcon />, exact: false },
      { href: "/simulator/new", label: "Nouvelle simulation", icon: <SimulatorIcon />, exact: true },
    ],
  },
  {
    id: "assistant",
    label: "Intelligence Artificielle",
    items: [
      { href: "/assistant", label: "Assistant IA", icon: <AssistantIcon />, exact: false, keepIconColor: true },
    ],
  },
];
