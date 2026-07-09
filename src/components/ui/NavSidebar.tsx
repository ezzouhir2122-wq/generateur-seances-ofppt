"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface NavSidebarProps {
  user: { name?: string | null; email?: string | null };
  onSettingsClick: () => void;
}

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
const AssistantIcon = () => (
  <span className="relative inline-flex items-center justify-center w-4 h-4">
    {/* Anneau ping vert */}
    <span
      className="absolute inline-flex w-4 h-4 rounded-full animate-ping"
      style={{ background: "#22C55E", opacity: 0.4 }}
    />
    {/* Éclair central */}
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="relative z-10">
      <path
        d="M13 2L4.5 13.5H11L10 22L20.5 10H14L13 2Z"
        fill="#22C55E"
        stroke="#16A34A"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  </span>
);
const GuideIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const GearIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);
const LogoutIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

/* ─── Navigation structure ─── */
const navSections = [
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
    label: "Mes Documents",
    items: [
      { href: "/historique", label: "Mes séances", icon: <HistoriqueIcon />, exact: false },
      { href: "/fiches/historique", label: "Mes fiches", icon: <FolderIcon />, exact: false },
    ],
  },
  {
    id: "pedagogie",
    label: "Pédagogie",
    items: [
      { href: "/referentiel", label: "Référentiel", icon: <RefIcon />, exact: false },
      { href: "/suivi", label: "Suivi des compétences", icon: <SuiviIcon />, exact: false },
      { href: "/bibliotheque", label: "Bibliothèque", icon: <BiblioIcon />, exact: false },
    ],
  },
  {
    id: "assistant",
    label: "Intelligence Artificielle",
    items: [
      { href: "/assistant", label: "Assistant IA", icon: <AssistantIcon />, exact: false },
    ],
  },
];

/* ─── NavItem component ─── */
function NavItem({ href, label, icon, active }: { href: string; label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 relative"
      style={active
        ? { background: "rgba(255,255,255,0.15)", color: "#FFFFFF" }
        : { color: "rgba(255,255,255,0.60)" }
      }
      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.90)"; } }}
      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLAnchorElement).style.background = ""; (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.60)"; } }}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
          style={{ background: "#16A34A" }}
        />
      )}
      <span style={{ color: active ? "#16A34A" : "rgba(255,255,255,0.50)", flexShrink: 0 }}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

/* ─── Main component ─── */
export default function NavSidebar({ user, onSettingsClick }: NavSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  const initials = (user.name ?? user.email ?? "F").charAt(0).toUpperCase();

  return (
    <aside
      className="w-[240px] flex-shrink-0 flex flex-col h-screen sticky top-0"
      style={{ background: "#003087", borderRight: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* ─ Header : Branding + Utilisateur ─ */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
        {/* Branding */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-ofppt.jpg"
            alt="OFPPT"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              objectFit: "cover",
              flexShrink: 0,
              border: "2px solid rgba(255,255,255,0.40)",
            }}
          />
          <div>
            <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "13px", letterSpacing: "0.01em", lineHeight: "1.2" }}>
              OFPPT · Compétencia
            </div>
            <div style={{ color: "#16A34A", fontSize: "10px", fontWeight: 500, marginTop: "2px" }}>
              Génération pédagogique
            </div>
          </div>
        </div>

        {/* Utilisateur compact */}
        <div
          className="mx-3 mb-2.5 flex items-center gap-2 px-2.5 py-2 rounded-lg"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 select-none"
            style={{ background: "#16A34A" }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold truncate leading-tight" style={{ color: "#FFFFFF" }}>
              {user.name ?? "Formateur"}
            </div>
            <div className="text-[9px] truncate leading-tight" style={{ color: "rgba(255,255,255,0.45)" }}>
              {user.email}
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Déconnexion"
            className="flex-shrink-0 p-1 rounded transition-all duration-150"
            style={{ color: "rgba(255,255,255,0.40)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#EF4444"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.15)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.40)"; (e.currentTarget as HTMLButtonElement).style.background = ""; }}
          >
            <LogoutIcon />
          </button>
        </div>
      </div>

      {/* ─ Navigation ─ */}
      <nav className="flex-1 overflow-y-auto px-3 py-1.5 space-y-1">
        {navSections.map((section) => (
          <div key={section.id}>
            {/* Section label */}
            <div className="flex items-center gap-2 px-2 mb-0.5 mt-1">
              <span
                className="text-[9px] font-bold tracking-[0.12em] uppercase select-none whitespace-nowrap"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                {section.label}
              </span>
              <span
                className="flex-1 h-px"
                style={{ background: "rgba(255,255,255,0.08)" }}
              />
            </div>
            {/* Items */}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(item.href, item.exact)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ─ Footer : Guide + Paramètres ─ */}
      <div className="px-3 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
        <Link
          href="/guide"
          className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 mb-0.5"
          style={{
            color: isActive("/guide", false) ? "#FFFFFF" : "rgba(255,255,255,0.60)",
            background: isActive("/guide", false) ? "rgba(255,255,255,0.15)" : undefined,
          }}
          onMouseEnter={e => { if (!isActive("/guide", false)) { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.90)"; } }}
          onMouseLeave={e => { if (!isActive("/guide", false)) { (e.currentTarget as HTMLAnchorElement).style.background = ""; (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.60)"; } }}
        >
          <span style={{ color: isActive("/guide", false) ? "#16A34A" : "rgba(255,255,255,0.50)", flexShrink: 0 }}><GuideIcon /></span>
          Guide application
        </Link>
        <button
          onClick={onSettingsClick}
          className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150"
          style={{ color: "rgba(255,255,255,0.60)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.90)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ""; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.60)"; }}
        >
          <span style={{ color: "rgba(255,255,255,0.50)", flexShrink: 0 }}><GearIcon /></span>
          Modules & Paramètres
        </button>
        <div className="mt-2 px-1 text-[9px] leading-tight" style={{ color: "rgba(255,255,255,0.25)" }}>
          Développé par EZZOUIR ELMUSTAPHA 9998 · OFPPT ISGI Marrakech
        </div>
      </div>
    </aside>
  );
}
