"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/ui/Sidebar";
import NavSidebar from "@/components/ui/NavSidebar";
import { Toaster } from "sonner";

interface AppShellProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    matricule?: string | null;
    etablissement?: string | null;
  } | null;
  claudeKey: boolean;
  openaiKey: boolean;
}

function AssistantFAB() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);

  if (pathname?.startsWith("/assistant")) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "28px",
        right: "28px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "10px",
        pointerEvents: "none",
      }}
    >
      {/* Tooltip */}
      <div
        style={{
          pointerEvents: "none",
          userSelect: "none",
          opacity: hovered ? 1 : 0,
          transform: hovered ? "translateY(0) scale(1)" : "translateY(8px) scale(0.95)",
          transition: "opacity 0.18s ease, transform 0.18s ease",
        }}
      >
        <div
          style={{
            background: "#111116",
            border: "1px solid #84CC1640",
            borderRadius: "10px",
            padding: "8px 14px",
            whiteSpace: "nowrap",
            boxShadow: "0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(132,204,22,0.1)",
          }}
        >
          <p style={{ color: "#F9FAFB", fontSize: "12px", fontWeight: 600, margin: 0 }}>Assistant IA</p>
          <p style={{ color: "#84CC16", fontSize: "10px", fontWeight: 400, margin: "2px 0 0" }}>Posez vos questions pédagogiques</p>
        </div>
        {/* Arrow */}
        <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: "24px" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              background: "#111116",
              border: "1px solid #84CC1640",
              borderTop: "none",
              borderLeft: "none",
              transform: "rotate(45deg)",
              marginTop: "-5px",
            }}
          />
        </div>
      </div>

      {/* FAB button */}
      <Link
        href="/assistant"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Assistant IA"
        style={{
          pointerEvents: "auto",
          position: "relative",
          width: "56px",
          height: "56px",
          borderRadius: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#84CC16",
          boxShadow: hovered
            ? "0 0 0 4px rgba(132,204,22,0.25), 0 12px 32px rgba(132,204,22,0.5)"
            : "0 0 0 3px rgba(132,204,22,0.15), 0 6px 20px rgba(132,204,22,0.35)",
          transform: hovered ? "scale(1.1) translateY(-3px)" : "scale(1)",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          textDecoration: "none",
        }}
      >
        {/* Pulse ring */}
        {!hovered && (
          <span
            className="animate-ping"
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "16px",
              background: "rgba(132,204,22,0.35)",
              animationDuration: "2s",
            }}
          />
        )}
        {/* Icon */}
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ position: "relative", zIndex: 1, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
        >
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          <circle cx="9" cy="12" r="1" fill="white" stroke="none" />
          <circle cx="12" cy="12" r="1" fill="white" stroke="none" />
          <circle cx="15" cy="12" r="1" fill="white" stroke="none" />
        </svg>
      </Link>
    </div>
  );
}

export default function AppShell({ children, user, claudeKey, openaiKey }: AppShellProps) {
  const [dashOpen, setDashOpen] = useState(false);

  if (!user) return <>{children}</>;

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="flex h-screen overflow-hidden">
        <NavSidebar user={user} onSettingsClick={() => setDashOpen(true)} />
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <main className="flex-1 overflow-y-auto" style={{ background: "#0A0A0F" }}>
            {children}
          </main>
        </div>
      </div>

      <AssistantFAB />

      <Sidebar
        open={dashOpen}
        onClose={() => setDashOpen(false)}
        user={user}
        claudeKey={claudeKey}
        openaiKey={openaiKey}
      />
    </>
  );
}
