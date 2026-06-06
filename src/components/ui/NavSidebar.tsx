"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface NavSidebarProps {
  user: { name?: string | null; email?: string | null };
}

const navItems = [
  { section: "OUTILS", items: [
    { href: "/", label: "Séances", icon: "📝", exact: true },
    { href: "/fiches", label: "Fiches pédag.", icon: "📋", exact: true },
    { href: "/assistant", label: "Assistant IA", icon: "🤖", exact: false },
  ]},
  { section: "HISTORIQUE", items: [
    { href: "/historique", label: "Mes séances", icon: "🕒", exact: false },
    { href: "/fiches/historique", label: "Mes fiches", icon: "📁", exact: false },
  ]},
];

export default function NavSidebar({ user }: NavSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const initials = (user.name ?? user.email ?? "F").charAt(0).toUpperCase();

  return (
    <aside className="w-[190px] flex-shrink-0 bg-[#006633] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-6">
        <div className="w-8 h-8 rounded-full bg-white overflow-hidden flex-shrink-0">
          <Image src="/logo-ofppt.jpg" alt="OFPPT" width={32} height={32} className="object-cover w-full h-full" />
        </div>
        <div>
          <div className="text-white font-bold text-sm leading-tight">Competencia IA</div>
          <div className="text-green-300 text-[10px]">OFPPT</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-5 overflow-y-auto">
        {navItems.map((group) => (
          <div key={group.section}>
            <div className="text-[10px] text-green-300 font-semibold tracking-widest px-2 mb-1.5">
              {group.section}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive(item.href, item.exact)
                      ? "bg-white/20 text-white font-semibold"
                      : "text-green-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-3 pb-4 pt-3 border-t border-white/15">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-full bg-[#C8A84B] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-white text-xs font-semibold truncate">{user.name ?? "Formateur"}</div>
            <div className="text-green-300 text-[10px] truncate">{user.email}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-xs text-green-300 hover:text-white border border-white/20 hover:border-white/40 rounded-lg py-1.5 transition-colors"
        >
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
