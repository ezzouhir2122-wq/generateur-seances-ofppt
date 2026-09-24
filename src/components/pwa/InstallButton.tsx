"use client";

import { useEffect, useState } from "react";
import { usePWA } from "./PWAContext";

/**
 * Gros bouton d'installation pour la page /bienvenue (technique WAp).
 * Le bouton s'adapte à l'environnement :
 *  - Navigateur intégré WhatsApp/in-app → « Ouvrir dans le navigateur » (l'install PWA y est impossible)
 *  - Android + Chrome → vraie installation 1 tap (beforeinstallprompt)
 *  - iPhone + Safari → instructions Partager → Sur l'écran d'accueil
 *  - Déjà installée → « Ouvrir l'application »
 */
export default function InstallButton() {
  const { canInstall, isInstalled, isIOS, install } = usePWA();
  const [isInApp, setIsInApp] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    // Navigateurs intégrés qui NE peuvent PAS installer une PWA
    const inApp =
      /WhatsApp/i.test(ua) ||
      /FBAN|FBAV|Instagram|Line\/|Messenger/i.test(ua) ||
      // WebView Android génériques ("wv") hors navigateur complet
      (/Android/i.test(ua) && /; wv\)/i.test(ua));
    setIsInApp(inApp);
    setIsAndroid(/Android/i.test(ua));
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    await install();
    setInstalling(false);
  };

  const openInBrowser = () => {
    const { host, pathname, search } = window.location;
    if (/Android/i.test(navigator.userAgent)) {
      // Ouvre Chrome directement via une intent Android
      window.location.href =
        `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;end`;
    }
    // iOS : pas d'ouverture programmable — les instructions guident l'utilisateur.
  };

  /* ── Déjà installée ── */
  if (isInstalled) {
    return (
      <div style={wrap}>
        <a href="/login" style={{ ...bigBtn, background: "#16A34A" }}>
          <IconCheck /> Ouvrir Compétencia
        </a>
        <p style={hint}>L&apos;application est déjà installée sur cet appareil.</p>
      </div>
    );
  }

  /* ── Navigateur intégré (WhatsApp, etc.) ── */
  if (isInApp) {
    return (
      <div style={wrap}>
        <button onClick={openInBrowser} style={{ ...bigBtn, background: "#003087" }}>
          <IconBrowser /> Ouvrir dans le navigateur
        </button>
        <div style={stepsBox}>
          <p style={stepsTitle}>Pour installer l&apos;application :</p>
          {isAndroid ? (
            <ol style={stepsList}>
              <li>Touchez le bouton ci-dessus (ou le menu <strong>⋮</strong> en haut à droite)</li>
              <li>Choisissez <strong style={{ color: "#16A34A" }}>Ouvrir dans Chrome</strong></li>
              <li>Le bouton <strong>Installer</strong> apparaîtra dans Chrome</li>
            </ol>
          ) : (
            <ol style={stepsList}>
              <li>Touchez l&apos;icône <strong>Partager</strong> ou <strong>⋯</strong> en bas</li>
              <li>Choisissez <strong style={{ color: "#16A34A" }}>Ouvrir dans Safari</strong></li>
              <li>Puis <strong>Partager → Sur l&apos;écran d&apos;accueil</strong></li>
            </ol>
          )}
        </div>
      </div>
    );
  }

  /* ── Android / Chrome : vraie install 1 tap ── */
  if (canInstall) {
    return (
      <div style={wrap}>
        <button onClick={handleInstall} disabled={installing} style={{ ...bigBtn, background: "#16A34A" }}>
          <IconDownload /> {installing ? "Installation…" : "Installer l'application"}
        </button>
        <p style={hint}>Accès rapide depuis l&apos;écran d&apos;accueil · Fonctionne hors ligne</p>
        <a href="/login" style={ghostLink}>J&apos;ai déjà l&apos;app → Se connecter</a>
      </div>
    );
  }

  /* ── iPhone / Safari : instructions manuelles ── */
  if (isIOS) {
    return (
      <div style={wrap}>
        <button onClick={() => setShowIOSSteps((v) => !v)} style={{ ...bigBtn, background: "#16A34A" }}>
          <IconDownload /> Installer sur iPhone
        </button>
        {showIOSSteps && (
          <div style={stepsBox}>
            <ol style={stepsList}>
              <li>Touchez <strong style={{ color: "#16A34A" }}>Partager</strong> (carré avec flèche ↑) en bas de Safari</li>
              <li>Faites défiler et choisissez <strong style={{ color: "#16A34A" }}>Sur l&apos;écran d&apos;accueil</strong></li>
              <li>Touchez <strong>Ajouter</strong> — l&apos;icône Compétencia apparaît</li>
            </ol>
          </div>
        )}
        <a href="/login" style={ghostLink}>J&apos;ai déjà l&apos;app → Se connecter</a>
      </div>
    );
  }

  /* ── Fallback (desktop ou navigateur sans prompt) ── */
  return (
    <div style={wrap}>
      <a href="/login" style={{ ...bigBtn, background: "#16A34A" }}>
        <IconBrowser /> Accéder à Compétencia
      </a>
      <p style={hint}>
        Sur mobile : ouvrez ce lien dans <strong>Chrome</strong> (Android) ou <strong>Safari</strong> (iPhone)
        puis utilisez <strong>Ajouter à l&apos;écran d&apos;accueil</strong>.
      </p>
    </div>
  );
}

/* ── Styles ── */
const wrap: React.CSSProperties = {
  display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", width: "100%",
};
const bigBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "10px",
  width: "100%", maxWidth: "340px", padding: "16px 24px",
  color: "#FFFFFF", fontWeight: 700, fontSize: "16px",
  border: "none", borderRadius: "14px", cursor: "pointer",
  boxShadow: "0 8px 24px rgba(22,163,74,0.35)", textDecoration: "none",
};
const hint: React.CSSProperties = {
  color: "#4B5563", fontSize: "13px", textAlign: "center", maxWidth: "340px", lineHeight: 1.5,
};
const ghostLink: React.CSSProperties = {
  color: "#003087", fontSize: "13px", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: "3px",
};
const stepsBox: React.CSSProperties = {
  background: "#F5F7FA", border: "1px solid #E5E7EB", borderRadius: "12px",
  padding: "14px 16px", maxWidth: "340px", width: "100%",
};
const stepsTitle: React.CSSProperties = { fontWeight: 700, fontSize: "13px", color: "#111827", marginBottom: "8px" };
const stepsList: React.CSSProperties = {
  margin: 0, paddingLeft: "18px", color: "#374151", fontSize: "13px", lineHeight: 1.7,
  display: "flex", flexDirection: "column", gap: "4px",
};

/* ── Icônes ── */
function IconDownload() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}
function IconBrowser() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
      <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
    </svg>
  );
}
