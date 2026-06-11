"use client";

import Link from "next/link";

interface Props {
  href: string;
  label: string;
  desc: string;
  accent: string;
  bg: string;
  icon: string;
}

export default function QuickActionLink({ href, label, desc, accent, bg, icon }: Props) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl transition-colors"
      style={{ background: bg, border: "1px solid #E2E8F0" }}
      onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = accent)}
      onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = "#E2E8F0")}
    >
      <span className="text-lg">{icon}</span>
      <div>
        <p className="font-semibold text-sm" style={{ color: accent }}>{label}</p>
        <p className="text-[11px]" style={{ color: "#4B5563" }}>{desc}</p>
      </div>
    </Link>
  );
}
