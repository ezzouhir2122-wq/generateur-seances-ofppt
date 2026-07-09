import LoginTabs from "@/components/forms/LoginTabs";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen flex" style={{ background: "#F5F7FA" }}>

      {/* Côté gauche — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 px-16 py-16" style={{ background: "#003087" }}>

        {/* Logo + titre + badge en haut */}
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-ofppt.jpg"
            alt="OFPPT"
            style={{ width: "90px", height: "90px", borderRadius: "50%", objectFit: "cover", display: "block", flexShrink: 0 }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "17px" }}>OFPPT</span>
              <span style={{ color: "rgba(255,255,255,0.40)", fontSize: "15px" }}>·</span>
              <span style={{ color: "#16A34A", fontWeight: 600, fontSize: "17px" }}>Compétencia</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1" style={{ border: "1px solid rgba(255,255,255,0.20)", background: "rgba(255,255,255,0.08)", alignSelf: "flex-start" }}>
              <span style={{ color: "#16A34A", fontSize: "12px" }}>✦</span>
              <span style={{ fontSize: "11px", fontWeight: 500, color: "rgba(255,255,255,0.80)" }}>Génération pédagogique</span>
            </div>
          </div>
        </div>

        <div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Transformez vos séances<br />
            <span style={{ color: "#16A34A" }}>pédagogiques</span> dans<br />
            quelques secondes.
          </h1>
          <p className="text-base leading-relaxed max-w-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
            Décrivez votre module. L&apos;IA génère une séance pédagogique complète conforme au format OFPPT, prête à être exportée.
          </p>

          <div className="flex gap-10 mt-10">
            <div>
              <p className="text-3xl font-bold text-white">100%</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.50)" }}>Format OFPPT standard</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">&#60; 30s</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.50)" }}>Temps de génération moyen</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">PDF · Word</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.50)" }}>Export immédiat</p>
            </div>
          </div>
        </div>

        <p className="text-xs" style={{ color: "rgba(255,255,255,0.30)" }}>
          © {new Date().getFullYear()} OFPPT — Développé par Mr EZZOUIR Elmustapha
        </p>
      </div>

      {/* Côté droit — formulaire */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">

          {/* Header mobile */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-ofppt.jpg"
              alt="OFPPT"
              style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", border: "2px solid #E5E7EB" }}
            />
            <span className="font-bold" style={{ color: "#111827" }}>OFPPT · Compétencia</span>
          </div>

          <LoginTabs error={params.error} />

          <p className="text-center text-[#4B5563] text-xs mt-8 lg:hidden">
            © {new Date().getFullYear()} OFPPT — Accès réservé aux formateurs
          </p>
        </div>
      </div>

    </div>
  );
}
