"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const email = (e.currentTarget.elements.namedItem("email") as HTMLInputElement).value.trim();
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      /* réponse générique de toute façon */
    }
    setLoading(false);
    setSent(true);
  }

  return (
    <div style={shell}>
      <div style={card}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-ofppt.jpg" alt="OFPPT" style={logo} />
        <h1 style={title}>Mot de passe oublié</h1>

        {sent ? (
          <>
            <p style={text}>
              Si un compte existe pour cette adresse, un email contenant un lien de réinitialisation
              vient d&apos;être envoyé. Pensez à vérifier vos courriers indésirables.
            </p>
            <Link href="/login" style={linkBtn}>Retour à la connexion</Link>
          </>
        ) : (
          <>
            <p style={text}>
              Saisissez votre courriel professionnel : vous recevrez un lien pour définir un nouveau mot de passe.
            </p>
            <form onSubmit={handleSubmit} style={{ width: "100%" }}>
              <input
                name="email"
                type="email"
                required
                placeholder="vous@ofppt.ma"
                autoComplete="email"
                style={input}
              />
              <button type="submit" disabled={loading} style={submitBtn}>
                {loading ? "Envoi…" : "Envoyer le lien"}
              </button>
            </form>
            <Link href="/login" style={ghost}>Retour à la connexion</Link>
          </>
        )}
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
  width: "100%", borderRadius: 10, border: "1px solid #E2E8F0", padding: "12px 14px",
  fontSize: 14, marginBottom: 12, outline: "none",
};
const submitBtn: React.CSSProperties = {
  width: "100%", background: "#003087", color: "#fff", border: "none", borderRadius: 10,
  padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer",
};
const linkBtn: React.CSSProperties = {
  marginTop: 8, background: "#16A34A", color: "#fff", borderRadius: 10, padding: "10px 20px",
  fontWeight: 700, fontSize: 14, textDecoration: "none",
};
const ghost: React.CSSProperties = { color: "#003087", fontSize: 13, fontWeight: 600, textDecoration: "underline" };
