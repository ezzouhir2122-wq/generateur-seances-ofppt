import LoginForm from "@/components/forms/LoginForm";
import Image from "next/image";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen flex" style={{ background: "#F5F7FA" }}>

      {/* Côté gauche — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 px-16 py-16" style={{ background: "#0D0D14" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden">
            <Image src="/logo-ofppt.jpg" alt="OFPPT" width={40} height={40} className="object-cover w-full h-full" />
          </div>
          <span className="text-white font-bold text-sm">Compétencia IA</span>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 border border-[#0A4DA8]/40 rounded-full px-4 py-1.5 mb-6">
            <span className="text-[#0A4DA8] text-xs">✦</span>
            <span className="text-[#0A4DA8] text-xs font-medium">Génération pédagogique · OFPPT</span>
          </div>
          <h1 className="text-5xl font-bold text-white leading-tight mb-4">
            Transformez vos<br />
            <span className="text-[#0A4DA8]">séances en quelques</span><br />
            secondes.
          </h1>
          <p className="text-[#9CA3AF] text-base leading-relaxed max-w-sm">
            Décrivez votre module. L&apos;IA génère une séance pédagogique complète conforme au format OFPPT, prête à être exportée.
          </p>

          <div className="flex gap-10 mt-10">
            <div>
              <p className="text-3xl font-bold text-white">100%</p>
              <p className="text-[#9CA3AF] text-xs mt-1">Format OFPPT standard</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">&#60; 30s</p>
              <p className="text-[#9CA3AF] text-xs mt-1">Temps de génération moyen</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">PDF · Word</p>
              <p className="text-[#9CA3AF] text-xs mt-1">Export immédiat</p>
            </div>
          </div>
        </div>

        <p className="text-[#4B5563] text-xs">
          © {new Date().getFullYear()} OFPPT — Développé par Mr EZZOUIR Elmustapha
        </p>
      </div>

      {/* Côté droit — formulaire */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">

          {/* Header mobile (caché sur grand écran) */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl overflow-hidden">
              <Image src="/logo-ofppt.jpg" alt="OFPPT" width={36} height={36} className="object-cover w-full h-full" />
            </div>
            <span className="font-bold" style={{ color: "#111827" }}>Compétencia IA</span>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl mb-8 p-1" style={{ background: "#F3F4F6", border: "1px solid #E2E8F0" }}>
            <button className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors" style={{ background: "#F8FAFC", color: "#111827" }}>
              Se connecter
            </button>
            <button className="flex-1 py-2.5 rounded-lg text-sm font-medium text-[#9CA3AF] cursor-default">
              Créer un compte
            </button>
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ color: "#111827" }}>Content de te revoir</h2>
          <p className="text-[#9CA3AF] text-sm mb-7">
            Connectez-vous pour accéder à votre espace formateur.
          </p>

          <LoginForm error={params.error} />

          <p className="text-center text-[#4B5563] text-xs mt-8 lg:hidden">
            © {new Date().getFullYear()} OFPPT — Accès réservé aux formateurs
          </p>
        </div>
      </div>

    </div>
  );
}
