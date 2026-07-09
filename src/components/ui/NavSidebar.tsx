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
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
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
      className="group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 relative"
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
      {/* ─ Branding ─ */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.20)" }}
          >
            <Image src="/logo-ofppt.jpg" alt="OFPPT" width={40} height={40} className="object-cover w-full h-full" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm leading-tight tracking-wide" style={{ color: "#FFFFFF" }}>OFPPT</div>
            <div className="text-[11px] font-medium leading-tight" style={{ color: "#16A34A" }}>Compétencia IA</div>
          </div>
        </div>
      </div>

      {/* ─ Navigation ─ */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {navSections.map((section, sIdx) => (
          <div key={section.id}>
            {/* Section label */}
            <div className="flex items-center gap-2 px-2 mb-1.5">
              <span
                className="text-[9px] font-bold tracking-[0.12em] uppercase select-none"
                style={{ color: "rgba(255,255,255,0.40)" }}
              >
                {section.label}
              </span>
              <span
                className="flex-1 h-px"
                style={{ background: "rgba(255,255,255,0.10)" }}
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
            {/* Section divider (except after last) */}
            {sIdx < navSections.length - 1 && (
              <div className="mt-2 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            )}
          </div>
        ))}
      </nav>

      {/* ─ Guide + Paramètres ─ */}
      <div className="px-3 pt-2 pb-1" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
        <Link
          href="/guide"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 mb-0.5"
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
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150"
          style={{ color: "rgba(255,255,255,0.60)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.90)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = ""; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.60)"; }}
        >
          <span style={{ color: "rgba(255,255,255,0.50)", flexShrink: 0 }}><GearIcon /></span>
          Modules & Paramètres
        </button>
      </div>

      {/* ─ User card ─ */}
      <div className="px-3 pb-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-2"
          style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 select-none"
            style={{ background: "#16A34A" }}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold truncate leading-tight" style={{ color: "#FFFFFF" }}>{user.name ?? "Formateur"}</div>
            <div className="text-[10px] truncate leading-tight mt-0.5" style={{ color: "rgba(255,255,255,0.50)" }}>{user.email}</div>
          </div>
        </div>

        {/* Disconnect */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center justify-center gap-2 text-xs rounded-lg py-2 transition-all duration-150 font-medium"
          style={{ color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.15)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#EF4444"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.40)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.55)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.15)"; (e.currentTarget as HTMLButtonElement).style.background = ""; }}
        >
          <LogoutIcon />
          Déconnexion
        </button>

        <div className="mt-3 px-1 text-[9px] leading-relaxed" style={{ color: "rgba(255,255,255,0.30)" }}>
          Développé par EZZOUIR ELMUSTAPHA 9998 · OFPPT ISGI Marrakech
        </div>
      </div>
    </aside>
  );
}
