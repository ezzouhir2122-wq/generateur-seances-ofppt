"use client";

import { useState } from "react";
import Sidebar from "@/components/ui/Sidebar";
import { Toaster } from "sonner";

interface AppShellProps {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null } | null;
  claudeKey: boolean;
  openaiKey: boolean;
}

export default function AppShell({ children, user, claudeKey, openaiKey }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <Toaster position="top-right" richColors />
      {user && (
        <>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir le tableau de bord"
            className="fixed top-3 right-4 z-30 w-9 h-9 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors text-lg"
          >
            ⚙
          </button>
          <Sidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            user={user}
            claudeKey={claudeKey}
            openaiKey={openaiKey}
          />
        </>
      )}
      {children}
    </>
  );
}
