import LoginForm from "@/components/forms/LoginForm";
import Image from "next/image";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #f0f4f0 0%, #e8f0e8 50%, #f5f5f0 100%)" }}>
      <div className="w-full max-w-sm">

        {/* Card principale */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* En-tête vert */}
          <div className="bg-[#006633] px-8 py-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-md mb-4 overflow-hidden">
              <Image
                src="/logo-ofppt.jpg"
                alt="Logo OFPPT"
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wide">Competencia IA</h1>
            <div className="h-0.5 w-12 bg-[#C8A84B] mx-auto my-2 rounded-full" />
            <p className="text-green-100 text-sm">
              Générateur de Séances Pédagogiques
            </p>
          </div>

          {/* Formulaire */}
          <div className="px-8 py-7">
            <LoginForm error={params.error} />
          </div>

        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-5">
          © {new Date().getFullYear()} OFPPT — Accès réservé aux formateurs
        </p>

      </div>
    </div>
  );
}
