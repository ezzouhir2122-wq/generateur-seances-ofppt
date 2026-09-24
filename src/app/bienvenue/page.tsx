import type { Metadata } from "next";
import InstallButton from "@/components/pwa/InstallButton";

export const metadata: Metadata = {
  title: "Installer Compétencia IA",
  description: "Installez l'application Compétencia IA sur votre mobile en un tap.",
};

export default function BienvenuePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
        background: "linear-gradient(160deg, #003087 0%, #00206B 55%, #001A57 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#FFFFFF",
          borderRadius: "24px",
          padding: "32px 24px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.30)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          textAlign: "center",
        }}
      >
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-ofppt.jpg"
          alt="OFPPT"
          style={{ width: "84px", height: "84px", borderRadius: "50%", objectFit: "cover", boxShadow: "0 6px 18px rgba(0,48,135,0.25)" }}
        />

        {/* Badge */}
        <div
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            borderRadius: "999px", padding: "5px 12px",
            background: "rgba(22,163,74,0.10)", border: "1px solid rgba(22,163,74,0.25)",
          }}
        >
          <span style={{ color: "#16A34A", fontSize: "12px" }}>✦</span>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#15803D" }}>Espace formateur OFPPT</span>
        </div>

        {/* Titre */}
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#111827", lineHeight: 1.25, margin: 0 }}>
            Installez <span style={{ color: "#003087" }}>Compétencia</span> <span style={{ color: "#16A34A" }}>IA</span>
            <br />sur votre mobile
          </h1>
          <p style={{ color: "#4B5563", fontSize: "14px", marginTop: "10px", lineHeight: 1.6 }}>
            Générez vos séances pédagogiques conformes au format OFPPT, directement depuis votre téléphone.
          </p>
        </div>

        {/* Bouton d'installation adaptatif */}
        <InstallButton />
      </div>

      <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px", marginTop: "24px", textAlign: "center" }}>
        © {new Date().getFullYear()} OFPPT — Compétencia IA
      </p>
    </div>
  );
}
