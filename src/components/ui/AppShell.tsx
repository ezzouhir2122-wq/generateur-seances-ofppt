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
        <NavSidebar user={user} onSettingsClick={() => setDashOpen(true)} />
        <div className="flex-1 flex flex-col overflow-hidden relative">
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
