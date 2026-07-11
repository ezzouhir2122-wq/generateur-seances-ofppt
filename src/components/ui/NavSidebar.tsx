"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { navSections } from "./nav-config";

interface NavSidebarProps {
  user: { name?: string | null; email?: string | null };
  onSettingsClick: () => void;
}

const GearIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);
const GuideIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const LogoutIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

function NavItem({ href, label, icon, active, keepIconColor }: { href: string; label: string; icon: React.ReactNode; active: boolean; keepIconColor?: boolean }) {
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
      <span style={{ color: keepIconColor ? "transparent" : (active ? "#16A34A" : "rgba(255,255,255,0.50)"), flexShrink: 0 }}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

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
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
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

      <nav className="flex-1 overflow-y-auto px-3 py-1.5 space-y-1">
        {navSections.map((section) => (
          <div key={section.id}>
            <div className="flex items-center gap-2 px-2 mb-0.5 mt-1">
              <span
                className="text-[9px] font-bold tracking-[0.12em] uppercase select-none whitespace-nowrap"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                {section.label}
              </span>
              <span className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(item.href, item.exact)}
                  keepIconColor={item.keepIconColor}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

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
        <div className="mt-2 px-1 text-[9px] leading-snug text-center font-bold" style={{ color: "#16A34A" }}>
          Développé par Ezzouhir Elmustapha<br />9998 · OFPPT / ISGI Marrakech
        </div>
      </div>
    </aside>
  );
}
