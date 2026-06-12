"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginForm({ error }: { error?: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(error ?? null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setLocalError(null);

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setLocalError("Email ou mot de passe incorrect");
      setIsLoading(false);
    } else {
      window.location.href = "/";
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {localError && (
        <div className="p-3 rounded-lg" style={{ background: "#2A1010", border: "1px solid #7F1D1D" }}>
          <p className="text-red-400 text-sm text-center">{localError}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: "#374151" }} htmlFor="email">
          Courriel professionnel
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4B5563]">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <path d="M22 6l-10 7L2 6"/>
            </svg>
          </span>
          <input
            id="email"
            name="email"
            type="email"
            className="w-full rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-[#4B5563] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A4DA8]/30 focus:border-[#0A4DA8]"
            style={{ background: "#1A1A24", border: "1px solid #E2E8F0" }}
            placeholder="vous@entreprise.com"
            required
            autoComplete="email"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1.5" style={{ color: "#374151" }} htmlFor="password">
          Mot de passe
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4B5563]">
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="11" r="3"/>
              <path d="M7.929 7.929A5 5 0 0117 11v1a1 1 0 01-2 0v-1a3 3 0 10-6 0v1a1 1 0 01-2 0v-1a5 5 0 01.929-2.929"/>
              <rect x="3" y="11" width="18" height="11" rx="2"/>
            </svg>
          </span>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            className="w-full rounded-lg pl-10 pr-16 py-3 text-sm text-white placeholder-[#4B5563] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A4DA8]/30 focus:border-[#0A4DA8]"
            style={{ background: "#1A1A24", border: "1px solid #E2E8F0" }}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#4B5563] hover:text-[#9CA3AF] text-xs transition-colors"
          >
            {showPassword ? "Masquer" : "Afficher"}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: "#0A4DA8" }} />
          <span className="text-xs text-[#9CA3AF]">Afficher le mot de passe</span>
        </label>
        <span className="text-xs text-[#9CA3AF] cursor-default">Mot de passe oublié ?</span>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full font-bold py-3 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide flex items-center justify-center gap-2"
        style={{ background: "#0A4DA8", color: "#000000" }}
        onMouseEnter={e => !isLoading && ((e.target as HTMLButtonElement).style.background = "#65A30D")}
        onMouseLeave={e => !isLoading && ((e.target as HTMLButtonElement).style.background = "#0A4DA8")}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Connexion…
          </>
        ) : (
          <>Se connecter <span>›</span></>
        )}
      </button>

    </form>
  );
}
