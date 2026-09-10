"use client";

import { useState, useEffect } from "react";
import { usePWA } from "./PWAContext";

export default function InstallBanner() {
  const { canInstall, isInstalled, isIOS, install } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isMobileAndroid, setIsMobileAndroid] = useState(false);

  useEffect(() => {
    const android = /android/i.test(navigator.userAgent);
    setIsMobileAndroid(android);

    // Restore dismissed state from sessionStorage
    if (sessionStorage.getItem("pwa-banner-dismissed") === "1") {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("pwa-banner-dismissed", "1");
  };

  const handleInstall = async () => {
    setInstalling(true);
    await install();
    setInstalling(false);
  };

  // Ne rien afficher si : déjà installé, déjà fermé
  if (isInstalled || dismissed) return null;

  // Afficher si : iOS, Android (avec ou sans prompt natif)
  const shouldShow = isIOS || canInstall || isMobileAndroid;
  if (!shouldShow) return null;

  // Mode iOS : instructions manuelles
  if (isIOS) {
    return (
      <Banner onDismiss={handleDismiss}>
        <IconShare />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={titleStyle}>Installer Competencia IA</div>
          <div style={subStyle}>
            Appuyez sur <strong style={{ color: "#22C55E" }}>Partager</strong>{" "}
            puis <strong style={{ color: "#22C55E" }}>Sur l'écran d'accueil</strong>
          </div>
        </div>
      </Banner>
    );
  }

  // Mode Android avec prompt natif
  if (canInstall) {
    return (
      <Banner onDismiss={handleDismiss}>
        <IconDownload />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={titleStyle}>Installer Competencia IA</div>
          <div style={subStyle}>Accès rapide · Fonctionne hors ligne</div>
        </div>
        <button
          onClick={handleInstall}
          disabled={installing}
          style={btnStyle(installing)}
        >
          {installing ? "…" : "Installer"}
        </button>
      </Banner>
    );
  }

  // Mode Android sans prompt natif → instructions Chrome
  return (
    <Banner onDismiss={handleDismiss}>
      <IconDownload />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={titleStyle}>Installer Competencia IA</div>
        <div style={subStyle}>
          Menu Chrome <strong style={{ color: "#22C55E" }}>⋮</strong>{" "}
          → <strong style={{ color: "#22C55E" }}>Ajouter à l'écran d'accueil</strong>
        </div>
      </div>
    </Banner>
  );
}

/* ── Composant conteneur ── */
function Banner({ children, onDismiss }: { children: React.ReactNode; onDismiss: () => void }) {
  return (
    <div style={{
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
      padding: "14px 16px",
      boxShadow: "0 8px 32px rgba(0,48,135,0.45)",
      maxWidth: "calc(100vw - 32px)",
      width: "420px",
      backdropFilter: "blur(12px)",
      animation: "slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
    }}>
      <style>{`
        @keyframes slideUp {
          from { opacity:0; transform:translateX(-50%) translateY(20px) scale(0.95); }
          to   { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
        }
      `}</style>
      {children}
      <button
        onClick={onDismiss}
        title="Fermer"
        style={{
          flexShrink: 0,
          background: "rgba(255,255,255,0.12)",
          border: "none",
          borderRadius: "8px",
          width: "28px",
          height: "28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "rgba(255,255,255,0.7)",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/* ── Icônes ── */
function IconBase({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: "42px", height: "42px", borderRadius: "11px",
      background: "#16A34A", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 4px 12px rgba(22,163,74,0.4)",
    }}>
      {children}
    </div>
  );
}
function IconDownload() {
  return (
    <IconBase>
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </IconBase>
  );
}
function IconShare() {
  return (
    <IconBase>
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    </IconBase>
  );
}

/* ── Styles ── */
const titleStyle: React.CSSProperties = {
  color: "#FFFFFF", fontWeight: 700, fontSize: "13px", lineHeight: "1.3",
};
const subStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.72)", fontSize: "11px", marginTop: "2px", lineHeight: "1.4",
};
const btnStyle = (disabled: boolean): React.CSSProperties => ({
  flexShrink: 0,
  background: disabled ? "#15803D" : "#16A34A",
  color: "#FFFFFF",
  border: "none",
  borderRadius: "10px",
  padding: "9px 16px",
  fontWeight: 700,
  fontSize: "13px",
  cursor: disabled ? "default" : "pointer",
  whiteSpace: "nowrap",
  boxShadow: "0 3px 10px rgba(22,163,74,0.4)",
  opacity: disabled ? 0.8 : 1,
});
