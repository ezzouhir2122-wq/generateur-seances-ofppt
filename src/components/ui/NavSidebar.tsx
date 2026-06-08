"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface NavSidebarProps {
  user: { name?: string | null; email?: string | null };
  onSettingsClick: () => void;
}

const HomeIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>
);

const GridIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);

const LightningIcon = () => (
  <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);

const ClipboardIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
  </svg>
);

const ChatIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);

const GearIcon = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);

const navSections = [
  {
    label: "PRINCIPAL",
    items: [
      { href: "/", label: "Tableau de bord", icon: <HomeIcon />, exact: true },
    ],
  },
  {
    label: "GÉNÉRATION IA",
    items: [
      { href: "/seances", label: "Séance pédagogique", icon: <LightningIcon />, exact: false },
      { href: "/fiches", label: "Fiche pédagogique", icon: <ClipboardIcon />, exact: true },
    ],
  },
  {
    label: "HISTORIQUE",
    items: [
      { href: "/historique", label: "Mes séances", icon: <ClockIcon />, exact: false },
      { href: "/fiches/historique", label: "Mes fiches", icon: <GridIcon />, exact: false },
    ],
  },
  {
    label: "ASSISTANT",
    items: [
      { href: "/assistant", label: "Assistant IA", icon: <ChatIcon />, exact: false },
    ],
  },
];

export default function NavSidebar({ user, onSettingsClick }: NavSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const initials = (user.name ?? user.email ?? "F").charAt(0).toUpperCase();

  return (
    <aside
      className="w-[220px] flex-shrink-0 flex flex-col h-screen sticky top-0"
      style={{ background: "#0D0D12", borderRight: "1px solid #1E1E2C" }}
    >
      {/* Logo + App name */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: "1px solid #1E1E2C" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "#17171E", border: "1px solid #1E1E2C" }}>
            <Image src="/logo-ofppt.jpg" alt="OFPPT" width={40} height={40} className="object-cover w-full h-full" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">OFPPT</div>
            <div className="text-[10px] leading-tight" style={{ color: "#84CC16" }}>Compétencia IA</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="text-[9px] font-bold tracking-widest px-2 mb-1.5 uppercase" style={{ color: "#4B5563" }}>
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150"
                    style={
                      active
                        ? { background: "#84CC1618", color: "#84CC16", fontWeight: 600 }
                        : { color: "#9CA3AF" }
                    }
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = "#17171E"; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.background = ""; }}
                  >
                    <span style={{ color: active ? "#84CC16" : "#4B5563" }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Paramètres */}
        <div>
          <div className="text-[9px] font-bold tracking-widest px-2 mb-1.5 uppercase" style={{ color: "#4B5563" }}>SYSTÈME</div>
          <div className="space-y-0.5">
            <button
              onClick={onSettingsClick}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150"
              style={{ color: "#9CA3AF" }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "#17171E")}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "")}
            >
              <span style={{ color: "#4B5563" }}><GearIcon /></span>
              Modules & Paramètres
            </button>
          </div>
        </div>
      </nav>

      {/* User + footer */}
      <div className="px-4 pb-5 pt-3" style={{ borderTop: "1px solid #1E1E2C" }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-black text-xs font-bold flex-shrink-0"
            style={{ background: "#84CC16" }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-white text-xs font-semibold truncate">{user.name ?? "Formateur"}</div>
            <div className="text-[10px] truncate" style={{ color: "#4B5563" }}>{user.email}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-xs rounded-lg py-1.5 transition-colors mb-4"
          style={{ color: "#9CA3AF", border: "1px solid #1E1E2C" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#84CC16"; (e.currentTarget as HTMLButtonElement).style.color = "#84CC16"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#1E1E2C"; (e.currentTarget as HTMLButtonElement).style.color = "#9CA3AF"; }}
        >
          Déconnexion
        </button>
        <div className="text-[9px] leading-relaxed" style={{ color: "#4B5563" }}>
          <span className="font-semibold" style={{ color: "#4B5563" }}>Développé par :</span><br />
          Mr EZZOUIR Elmustapha<br />
          (9559)
        </div>
      </div>
    </aside>
  );
}
