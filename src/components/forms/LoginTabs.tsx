"use client";

import { useState } from "react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

export default function LoginTabs({ error }: { error?: string }) {
  const [tab, setTab] = useState<"login" | "register">("login");

  return (
    <>
      {/* Tabs */}
      <div className="flex rounded-xl mb-8 p-1" style={{ background: "#F3F4F6", border: "1px solid #E2E8F0" }}>
        <button
          onClick={() => setTab("login")}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          style={tab === "login"
            ? { background: "#F8FAFC", color: "#111827", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
            : { color: "#9CA3AF" }
          }
        >
          Se connecter
        </button>
        <button
          onClick={() => setTab("register")}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          style={tab === "register"
            ? { background: "#F8FAFC", color: "#111827", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
            : { color: "#9CA3AF" }
          }
        >
          Créer un compte
        </button>
      </div>

      {tab === "login" ? (
        <>
          <h2 className="text-2xl font-bold mb-1" style={{ color: "#111827" }}>Content de te revoir</h2>
          <p className="text-[#9CA3AF] text-sm mb-7">
            Connectez-vous pour accéder à votre espace formateur.
          </p>
          <LoginForm error={error} />
        </>
      ) : (
        <>
          <h2 className="text-2xl font-bold mb-1" style={{ color: "#111827" }}>Créer un compte</h2>
          <p className="text-[#9CA3AF] text-sm mb-7">
            Rejoignez l&apos;espace formateur OFPPT.
          </p>
          <RegisterForm onSwitchToLogin={() => setTab("login")} />
        </>
      )}
    </>
  );
}
