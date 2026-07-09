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

        {/* Logo + titre en haut */}
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-ofppt.jpg"
            alt="OFPPT"
            style={{ width: "90px", height: "90px", borderRadius: "50%", objectFit: "cover", display: "block", flexShrink: 0 }}
          />
          <div>
            <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: "18px", lineHeight: 1.2 }}>OFPPT</div>
            <div style={{ color: "#16A34A", fontWeight: 600, fontSize: "14px" }}>Compétencia</div>
          </div>
        </div>

        <div>
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6" style={{ border: "1px solid rgba(255,255,255,0.20)", background: "rgba(255,255,255,0.08)" }}>
            <span style={{ color: "#16A34A", fontSize: "14px" }}>✦</span>
            <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.80)" }}>Génération pédagogique · OFPPT</span>
          </div>

          <h1 className="text-5xl font-bold text-white leading-tight mb-4">
            Transformez vos<br />
            <span style={{ color: "#16A34A" }}>séances en quelques</span><br />
            secondes.
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
