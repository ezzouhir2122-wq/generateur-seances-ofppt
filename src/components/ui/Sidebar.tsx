"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  user: {
    name?: string | null;
    email?: string | null;
    matricule?: string | null;
    etablissement?: string | null;
  };
  claudeKey?: boolean;
  openaiKey?: boolean;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const router = useRouter();

  useEffect(() => {
    if (open) {
      onClose();
      router.push("/parametres");
    }
  }, [open, onClose, router]);

  return null;
}
