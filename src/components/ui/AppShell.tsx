"use client";

import { useState } from "react";
import Sidebar from "@/components/ui/Sidebar";
import NavSidebar from "@/components/ui/NavSidebar";
import { Toaster } from "sonner";

interface AppShellProps {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null } | null;
  claudeKey: boolean;
  openaiKey: boolean;
}

export default function AppShell({ children, user, claudeKey, openaiKey }: AppShellProps) {
  const [dashOpen, setDashOpen] = useState(false);

  if (!user) return <>{children}</>;

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="flex h-screen overflow-hidden">
        <NavSidebar user={user} />
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <button
            onClick={() => setDashOpen(true)}
            aria-label="Ouvrir le tableau de bord"
            className="absolute top-3 right-4 z-30 w-9 h-9 flex items-center justify-center rounded-lg bg-[#006633] hover:bg-[#005528] text-white transition-colors text-lg shadow-sm"
          >
            ⚙
          </button>
          <main className="flex-1 overflow-y-auto bg-gray-50">
            {children}
          </main>
        </div>
      </div>
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
