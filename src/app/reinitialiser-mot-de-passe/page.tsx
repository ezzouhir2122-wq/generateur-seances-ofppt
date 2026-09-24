"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirm = (form.elements.namedItem("confirm") as HTMLInputElement).value;
    if (password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    if (password !== confirm) return setError("Les deux mots de passe ne correspondent pas.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Lien invalide ou expiré.");
        setLoading(false);
        return;
      }
      router.push("/login?reset=ok");
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <>
        <p style={text}>Lien invalide : jeton manquant.</p>
        <Link href="/mot-de-passe-oublie" style={ghost}>Demander un nouveau lien</Link>
      </>
    );
  }

  return (
    <>
      <p style={text}>Choisissez votre nouveau mot de passe.</p>
      {error && (
        <div style={{ width: "100%", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 12px" }}>
          <p style={{ color: "#B91C1C", fontSize: 13, margin: 0, textAlign: "center" }}>{error}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} style={{ width: "100%" }}>
        <div style={{ position: "relative", marginBottom: 12 }}>
          <input name="password" type={show ? "text" : "password"} required minLength={8}
            placeholder="Nouveau mot de passe" autoComplete="new-password" style={input} />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Masquer" : "Afficher"}
            style={eyeBtn}>{show ? "🙈" : "👁"}</button>
        </div>
        <input name="confirm" type={show ? "text" : "password"} required minLength={8}
          placeholder="Confirmer le mot de passe" autoComplete="new-password" style={{ ...input, marginBottom: 12 }} />
        <button type="submit" disabled={loading} style={submitBtn}>
          {loading ? "Enregistrement…" : "Réinitialiser mon mot de passe"}
        </button>
      </form>
      <Link href="/login" style={ghost}>Retour à la connexion</Link>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={shell}>
      <div style={card}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-ofppt.jpg" alt="OFPPT" style={logo} />
        <h1 style={title}>Réinitialisation</h1>
        <Suspense fallback={<p style={text}>Chargement…</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}

const shell: React.CSSProperties = {
  minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
  padding: "24px", background: "#F5F7FA",
};
const card: React.CSSProperties = {
  width: "100%", maxWidth: 400, background: "#fff", borderRadius: 20, padding: "36px 28px",
  boxShadow: "0 12px 40px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column",
  alignItems: "center", gap: 14, textAlign: "center",
};
const logo: React.CSSProperties = { width: 64, height: 64, borderRadius: "50%", objectFit: "cover" };
const title: React.CSSProperties = { fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 };
const text: React.CSSProperties = { color: "#6B7280", fontSize: 14, lineHeight: 1.6, margin: 0 };
const input: React.CSSProperties = {
  width: "100%", borderRadius: 10, border: "1px solid #E2E8F0", padding: "12px 44px 12px 14px",
  fontSize: 14, outline: "none",
};
const eyeBtn: React.CSSProperties = {
  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
  background: "none", border: "none", cursor: "pointer", fontSize: 16,
};
const submitBtn: React.CSSProperties = {
  width: "100%", background: "#003087", color: "#fff", border: "none", borderRadius: 10,
  padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer",
};
const ghost: React.CSSProperties = { color: "#003087", fontSize: 13, fontWeight: 600, textDecoration: "underline" };
