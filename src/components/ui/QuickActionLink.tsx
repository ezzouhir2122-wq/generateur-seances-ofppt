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
      className="flex items-center gap-3 p-3 rounded-xl transition-all"
      style={{ background: bg, border: `1px solid rgba(255,255,255,0.07)` }}
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = accent; (e.currentTarget as HTMLAnchorElement).style.background = bg; }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.07)"; }}
    >
      <span className="text-lg">{icon}</span>
      <div>
        <p className="font-semibold text-sm" style={{ color: accent }}>{label}</p>
        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>{desc}</p>
      </div>
    </Link>
  );
}
