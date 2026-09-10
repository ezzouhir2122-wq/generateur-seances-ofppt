"use client";

import { useState } from "react";
import { usePWA } from "./PWAContext";

export default function InstallBanner() {
  const { canInstall, isInstalled, isIOS, install } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (isInstalled || dismissed) return null;
  if (!canInstall && !isIOS) return null;

  const handleInstall = async () => {
    setInstalling(true);
    await install();
    setInstalling(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: "linear-gradient(135deg, #003087 0%, #004DB3 100%)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: "16px",
        padding: "14px 20px",
        boxShadow: "0 8px 32px rgba(0,48,135,0.45), 0 0 0 1px rgba(255,255,255,0.08)",
        maxWidth: "calc(100vw - 40px)",
        width: "420px",
        backdropFilter: "blur(12px)",
        animation: "slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)     scale(1);    }
        }
      `}</style>

      {/* Icône */}
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "12px",
          background: "#16A34A",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(22,163,74,0.4)",
        }}
      >
        {isIOS ? (
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        ) : (
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
      </div>

      {/* Texte */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "14px", lineHeight: "1.3" }}>
          Installer Competencia IA
        </div>
        {isIOS ? (
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px", marginTop: "2px", lineHeight: "1.4" }}>
            Appuyez sur <strong style={{ color: "#16A34A" }}>Partager</strong> puis{" "}
            <strong style={{ color: "#16A34A" }}>Sur l'écran d'accueil</strong>
          </div>
        ) : (
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "11px", marginTop: "2px" }}>
            Accès rapide · Fonctionne hors ligne
          </div>
        )}
      </div>

      {/* Bouton installer */}
      {!isIOS && (
        <button
          onClick={handleInstall}
          disabled={installing}
          style={{
            flexShrink: 0,
            background: installing ? "#15803D" : "#16A34A",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "10px",
            padding: "9px 18px",
            fontWeight: 700,
            fontSize: "13px",
            cursor: installing ? "default" : "pointer",
            whiteSpace: "nowrap",
            boxShadow: "0 3px 10px rgba(22,163,74,0.4)",
            transition: "transform 0.1s, opacity 0.1s",
            opacity: installing ? 0.8 : 1,
          }}
          onMouseEnter={e => { if (!installing) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        >
          {installing ? "..." : "Installer"}
        </button>
      )}

      {/* Fermer */}
      <button
        onClick={() => setDismissed(true)}
        title="Fermer"
        style={{
          flexShrink: 0,
          background: "rgba(255,255,255,0.1)",
          border: "none",
          borderRadius: "8px",
          width: "28px",
          height: "28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "rgba(255,255,255,0.6)",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.2)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)"; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
