"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CompteTab({ email }: { email: string }) {
  const router = useRouter();
  const [currentPwd, setCurrentPwd]       = useState("");
  const [newPwd, setNewPwd]               = useState("");
  const [confirmPwd, setConfirmPwd]       = useState("");
  const [savingPwd, setSavingPwd]         = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const changePassword = async () => {
    if (newPwd !== confirmPwd) {
      toast.error("Les deux nouveaux mots de passe ne correspondent pas");
      return;
    }
    if (newPwd.length < 8) {
      toast.error("Le mot de passe doit faire au moins 8 caractères");
      return;
    }
    setSavingPwd(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      toast.success("Mot de passe mis à jour");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du changement");
    } finally {
      setSavingPwd(false);
    }
  };

  const deleteAccount = async () => {
    const confirmed = confirm(
      "⚠️ Cette action est irréversible.\n\nToutes vos données (séances, fiches, évaluations, référentiels, groupes…) seront définitivement supprimées.\n\nConfirmer la suppression de votre compte ?"
    );
    if (!confirmed) return;
    setDeletingAccount(true);
    try {
      const res = await fetch("/api/user/account", { method: "DELETE" });
      if (!res.ok) throw new Error();
      await signOut({ redirect: false });
      router.push("/login");
    } catch {
      toast.error("Erreur lors de la suppression");
      setDeletingAccount(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
        <h2 className="text-base font-semibold mb-3" style={{ color: "#111827" }}>Session active</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm" style={{ color: "#374151" }}>{email}</p>
            <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Connecté en tant que formateur OFPPT</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm px-4 py-2 rounded-lg font-medium transition-all"
            style={{ border: "1px solid #E2E8F0", color: "#EF4444" }}
          >
            Se déconnecter
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
        <h2 className="text-base font-semibold mb-4" style={{ color: "#111827" }}>Changer le mot de passe</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
              Mot de passe actuel
            </label>
            <input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-lg outline-none"
              style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#111827" }}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-lg outline-none"
              style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#111827" }}
              placeholder="Minimum 8 caractères"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
              Confirmer le nouveau mot de passe
            </label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              className="w-full text-sm px-3 py-2.5 rounded-lg outline-none"
              style={{ background: "#F3F4F6", border: "1px solid #E2E8F0", color: "#111827" }}
              placeholder="••••••••"
            />
          </div>
          <button
            onClick={changePassword}
            disabled={savingPwd || !currentPwd || !newPwd || !confirmPwd}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: "#003087" }}
          >
            {savingPwd ? "Mise à jour…" : "Mettre à jour le mot de passe"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5" style={{ border: "1px solid #FECACA" }}>
        <h2 className="text-base font-semibold mb-1" style={{ color: "#DC2626" }}>⚠️ Zone dangereuse</h2>
        <p className="text-xs mb-4" style={{ color: "#6B7280" }}>
          La suppression de votre compte est irréversible. Toutes vos données seront définitivement effacées.
        </p>
        <button
          onClick={deleteAccount}
          disabled={deletingAccount}
          className="text-sm px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
          style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}
        >
          {deletingAccount ? "Suppression…" : "Supprimer mon compte"}
        </button>
      </div>
    </div>
  );
}
