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
    <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2">
      {/* Tooltip */}
      <div
        className="pointer-events-none select-none transition-all duration-200"
        style={{
          opacity: hovered ? 1 : 0,
          transform: hovered ? "translateY(0) scale(1)" : "translateY(6px) scale(0.95)",
        }}
      >
        <div
          className="text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap"
          style={{
            background: "#17171E",
            border: "1px solid #1E1E2C",
            color: "#E5E7EB",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          Assistant IA
          <span
            className="block text-[10px] font-normal mt-0.5"
            style={{ color: "#84CC16" }}
          >
            Posez vos questions pédagogiques
          </span>
        </div>
        {/* Arrow */}
        <div className="flex justify-end pr-[22px]">
          <div
            className="w-2 h-2 rotate-45"
            style={{ background: "#1E1E2C", marginTop: "-5px" }}
          />
        </div>
      </div>

      {/* FAB button */}
      <Link
        href="/assistant"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200"
        style={{
          background: hovered
            ? "linear-gradient(135deg, #84CC16, #65a30d)"
            : "linear-gradient(135deg, #6aab0d, #4d8a08)",
          boxShadow: hovered
            ? "0 8px 32px rgba(132, 204, 22, 0.45), 0 2px 8px rgba(0,0,0,0.4)"
            : "0 4px 20px rgba(132, 204, 22, 0.25), 0 2px 6px rgba(0,0,0,0.3)",
          transform: hovered ? "scale(1.08) translateY(-2px)" : "scale(1)",
        }}
        aria-label="Ouvrir l'assistant IA"
      >
        {/* Pulse ring */}
        {!hovered && (
          <span
            className="absolute inset-0 rounded-2xl animate-ping"
            style={{ background: "rgba(132, 204, 22, 0.2)", animationDuration: "2.5s" }}
          />
        )}

        {/* Icon */}
        <svg
          width="24"
          height="24"
          fill="none"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
          style={{ position: "relative", zIndex: 1 }}
        >
          <path d="M12 2a9 9 0 016.364 15.364L20 22l-4.636-1.636A9 9 0 1112 2z" />
          <circle cx="8.5" cy="12" r="1" fill="white" stroke="none" />
          <circle cx="12" cy="12" r="1" fill="white" stroke="none" />
          <circle cx="15.5" cy="12" r="1" fill="white" stroke="none" />
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
